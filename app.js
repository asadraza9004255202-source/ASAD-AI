let websiteData = {
  html: "",
  css: "",
  js: ""
};

let currentCodeType = "html";


// ==========================================
// TAB SYSTEM
// ==========================================

const websiteTab =
  document.getElementById("websiteTab");

const videoTab =
  document.getElementById("videoTab");

const websiteSection =
  document.getElementById(
    "websiteSection"
  );

const videoSection =
  document.getElementById(
    "videoSection"
  );

websiteTab.onclick = () => {

  websiteSection.classList.remove(
    "hidden"
  );

  videoSection.classList.add(
    "hidden"
  );

  websiteTab.classList.add(
    "active"
  );

  videoTab.classList.remove(
    "active"
  );
};

videoTab.onclick = () => {

  websiteSection.classList.add(
    "hidden"
  );

  videoSection.classList.remove(
    "hidden"
  );

  websiteTab.classList.remove(
    "active"
  );

  videoTab.classList.add(
    "active"
  );
};


// ==========================================
// WEBSITE AI
// ==========================================

const promptInput =
  document.getElementById(
    "prompt"
  );

const generateBtn =
  document.getElementById(
    "generateBtn"
  );

const chat =
  document.getElementById(
    "chat"
  );

const preview =
  document.getElementById(
    "preview"
  );

const codeOutput =
  document.getElementById(
    "codeOutput"
  );


function addMessage(
  text,
  type
) {

  const div =
    document.createElement(
      "div"
    );

  div.className =
    type === "user"
      ? "user-message"
      : "ai-message";

  div.textContent = text;

  chat.appendChild(div);

  chat.scrollTop =
    chat.scrollHeight;
}


function updateCode() {

  if (
    currentCodeType === "html"
  ) {

    codeOutput.textContent =
      websiteData.html ||
      "No HTML generated.";

  }

  else if (
    currentCodeType === "css"
  ) {

    codeOutput.textContent =
      websiteData.css ||
      "No CSS generated.";

  }

  else {

    codeOutput.textContent =
      websiteData.js ||
      "No JavaScript generated.";
  }
}


function showPreview() {

  const documentContent = `
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1.0"
>

<style>

${websiteData.css}

</style>

</head>

<body>

${websiteData.html}

<script>

${websiteData.js}

<\/script>

</body>

</html>
`;

  preview.srcdoc =
    documentContent;
}


generateBtn.onclick =
  async () => {

    const prompt =
      promptInput.value.trim();

    if (!prompt) {

      alert(
        "Pehle website request likho."
      );

      return;
    }

    addMessage(
      prompt,
      "user"
    );

    generateBtn.disabled =
      true;

    generateBtn.textContent =
      "⏳ Generating...";

    addMessage(
      "🤖 AI website bana raha hai...",
      "ai"
    );

    try {

      const response =
        await fetch(
          "/api/generate",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              prompt,

              current:
                websiteData.html
                  ? websiteData
                  : null
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data.error ||
          "Website generate nahi hui."
        );
      }

      websiteData = {
        html: data.html || "",
        css: data.css || "",
        js: data.js || ""
      };

      showPreview();

      updateCode();

      addMessage(
        "✅ Website successfully generate ho gayi!",
        "ai"
      );

      promptInput.value = "";

    } catch (error) {

      addMessage(
        "❌ " + error.message,
        "ai"
      );

      alert(
        "Website generate nahi hui:\n\n" +
        error.message
      );

    } finally {

      generateBtn.disabled =
        false;

      generateBtn.textContent =
        "🚀 Generate Website";
    }
  };


// Enter shortcut
promptInput.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      generateBtn.click();
    }
  }
);


// Code tabs
document
  .querySelectorAll(".code-tab")
  .forEach(button => {

    button.onclick = () => {

      document
        .querySelectorAll(
          ".code-tab"
        )
        .forEach(btn =>
          btn.classList.remove(
            "active"
          )
        );

      button.classList.add(
        "active"
      );

      currentCodeType =
        button.dataset.code;

      updateCode();
    };

  });


// ==========================================
// IMAGE UPLOAD
// ==========================================

const dropArea =
  document.getElementById(
    "dropArea"
  );

const imageInput =
  document.getElementById(
    "imageInput"
  );

const imagePreview =
  document.getElementById(
    "imagePreview"
  );

let selectedImage = null;


dropArea.onclick = () => {
  imageInput.click();
};


imageInput.onchange = () => {

  if (
    imageInput.files &&
    imageInput.files[0]
  ) {

    selectedImage =
      imageInput.files[0];

    showImagePreview(
      selectedImage
    );
  }
};


function showImagePreview(
  file
) {

  const url =
    URL.createObjectURL(file);

  imagePreview.src = url;

  imagePreview.classList.remove(
    "hidden"
  );

  document.getElementById(
    "uploadText"
  ).textContent =
    "✅ Image selected: " +
    file.name;
}


// Drag and drop
dropArea.addEventListener(
  "dragover",
  event => {

    event.preventDefault();

    dropArea.style.borderColor =
      "#7565ff";
  }
);


dropArea.addEventListener(
  "dragleave",
  () => {

    dropArea.style.borderColor =
      "";
  }
);


dropArea.addEventListener(
  "drop",
  event => {

    event.preventDefault();

    dropArea.style.borderColor =
      "";

    const file =
      event.dataTransfer.files[0];

    if (
      file &&
      file.type.startsWith(
        "image/"
      )
    ) {

      selectedImage = file;

      showImagePreview(
        file
      );
    }
  }
);


// ==========================================
// IMAGE → VIDEO
// ==========================================

const videoBtn =
  document.getElementById(
    "videoBtn"
  );

const videoPrompt =
  document.getElementById(
    "videoPrompt"
  );

const aspectRatio =
  document.getElementById(
    "aspectRatio"
  );

const videoStatus =
  document.getElementById(
    "videoStatus"
  );

const videoResult =
  document.getElementById(
    "videoResult"
  );


videoBtn.onclick =
  async () => {

    if (!selectedImage) {

      alert(
        "Pehle image upload karo."
      );

      return;
    }

    const prompt =
      videoPrompt.value.trim() ||
      "Create a realistic cinematic video from this image with natural movement and smooth camera motion.";

    const formData =
      new FormData();

    formData.append(
      "image",
      selectedImage
    );

    formData.append(
      "prompt",
      prompt
    );

    formData.append(
      "aspectRatio",
      aspectRatio.value
    );

    videoBtn.disabled =
      true;

    videoBtn.textContent =
      "⏳ Starting...";

    videoStatus.textContent =
      "🚀 Video generation start ho rahi hai...";

    videoResult.textContent =
      "⏳ AI video bana raha hai...";

    try {

      const response =
        await fetch(
          "/api/video",
          {
            method: "POST",
            body: formData
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data.error ||
          "Video start nahi hua."
        );
      }

      const jobId =
        data.jobId;

      videoStatus.textContent =
        "🎬 Video generate ho raha hai...";

      await checkVideoJob(
        jobId
      );

    } catch (error) {

      videoStatus.textContent =
        "❌ " +
        error.message;

      videoResult.textContent =
        "Video generate nahi ho paya.";

    } finally {

      videoBtn.disabled =
        false;

      videoBtn.textContent =
        "🚀 Generate Video";
    }
  };


// Check status
async function checkVideoJob(
  jobId
) {

  const response =
    await fetch(
      `/api/video/${jobId}`
    );

  const data =
    await response.json();

  if (data.status === "complete") {

    videoStatus.textContent =
      "🎉 Video successfully ready!";

    videoResult.innerHTML = `
      <div style="width:100%;text-align:center;">

        <video
          controls
          autoplay
          playsinline
          src="${data.videoUrl}"
        ></video>

        <br>

        <a
          class="download-video"
          href="${data.videoUrl}"
          download="code-ai-video.mp4"
        >
          ⬇️ Download Video
        </a>

      </div>
    `;

    return;
  }


  if (data.status === "error") {

    throw new Error(
      data.message ||
      "Video generation failed."
    );
  }


  videoStatus.textContent =
    "⏳ " +
    (data.message ||
      "AI video bana raha hai...");


  // Check again after 10 seconds
  await new Promise(
    resolve =>
      setTimeout(
        resolve,
        10000
      )
  );


  return checkVideoJob(
    jobId
  );
}
