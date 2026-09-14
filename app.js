// ========================================
// CODE AI WEBSITE BUILDER
// ========================================

let project = {

  html: "",

  css: "",

  js: "",

  title: "AI Website"

};


// ========================================
// ELEMENTS
// ========================================

const promptInput =
  document.getElementById("prompt");

const generateBtn =
  document.getElementById("generateBtn");

const newBtn =
  document.getElementById("newBtn");

const downloadBtn =
  document.getElementById("downloadBtn");

const preview =
  document.getElementById("preview");

const code =
  document.getElementById("code");

const messages =
  document.getElementById("messages");

const status =
  document.getElementById("status");


// ========================================
// ADD CHAT MESSAGE
// ========================================

function addMessage(type, text) {

  const div =
    document.createElement("div");

  div.className =
    `message ${type}`;

  div.innerHTML = `

    <div class="messageTitle">
      ${type === "ai" ? "🤖 CODE AI" : "👤 You"}
    </div>

    <p>${escapeHTML(text)}</p>

  `;

  messages.appendChild(div);

  messages.scrollTop =
    messages.scrollHeight;

}


// ========================================
// ESCAPE HTML
// ========================================

function escapeHTML(text) {

  return String(text)

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#039;");

}


// ========================================
// UPDATE STATUS
// ========================================

function setStatus(text) {

  if (status) {

    status.textContent = text;

  }

}


// ========================================
// CREATE PREVIEW
// ========================================

function renderPreview() {

  const fullPage = `

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width, initial-scale=1.0">

<title>${escapeHTML(project.title)}</title>

<style>

${project.css}

</style>

</head>

<body>

${project.html}

<script>

${project.js}

<\/script>

</body>

</html>

`;


  preview.srcdoc =
    fullPage;

}


// ========================================
// SHOW CODE
// ========================================

function showCode(tab) {

  let text = "";


  if (tab === "html") {

    text = project.html;

  }


  if (tab === "css") {

    text = project.css;

  }


  if (tab === "js") {

    text = project.js;

  }


  code.innerHTML =
    escapeHTML(text || "No code generated yet.");

}


// ========================================
// GENERATE WEBSITE
// ========================================

async function generateWebsite() {

  const prompt =
    promptInput.value.trim();


  if (!prompt) {

    alert(
      "Bhai pehle website ka prompt likho."
    );

    promptInput.focus();

    return;

  }


  // Disable button

  generateBtn.disabled = true;

  generateBtn.textContent =
    "⏳ Generating...";


  setStatus(
    "Gemini AI website bana raha hai..."
  );


  addMessage(
    "user",
    prompt
  );


  try {

    const response =
      await fetch("/api/generate", {

        method: "POST",

        headers: {

          "Content-Type":
            "application/json"

        },

        body: JSON.stringify({

          prompt: prompt,

          current: project.html
            ? project
            : null

        })

      });


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Server error"
      );

    }


    // ========================================
    // SAVE PROJECT
    // ========================================

    project.html =
      data.html || "";

    project.css =
      data.css || "";

    project.js =
      data.js || "";

    project.title =
      data.title ||
      "AI Website";


    // ========================================
    // RENDER
    // ========================================

    renderPreview();

    showCode("html");


    // ========================================
    // MESSAGE
    // ========================================

    addMessage(

      "ai",

      data.message ||
      "Website successfully generated! 🚀"

    );


    setStatus(
      "✅ Website ready"
    );


    // Clear prompt

    promptInput.value = "";


  } catch (error) {

    console.error(error);


    addMessage(

      "ai",

      "❌ Error: " +
      error.message

    );


    setStatus(
      "❌ " + error.message
    );


    alert(
      "Website generate nahi hui:\n\n" +
      error.message
    );


  } finally {

    generateBtn.disabled =
      false;

    generateBtn.textContent =
      "✨ Generate Website";

  }

}


// ========================================
// GENERATE BUTTON
// ========================================

generateBtn.addEventListener(
  "click",
  generateWebsite
);


// ========================================
// ENTER KEY
// ========================================

promptInput.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      generateWebsite();

    }

  }
);


// ========================================
// NEW PROJECT
// ========================================

newBtn.addEventListener(
  "click",
  () => {

    project = {

      html: "",

      css: "",

      js: "",

      title: "AI Website"

    };


    preview.srcdoc = "";

    showCode("html");


    messages.innerHTML = `

      <div class="message ai">

        <div class="messageTitle">
          🤖 CODE AI
        </div>

        <p>
          New project ready 🚀
        </p>

        <p>
          Batao kya website banani hai.
        </p>

      </div>

    `;


    promptInput.value = "";

    setStatus("Ready");

  }

);


// ========================================
// DOWNLOAD WEBSITE
// ========================================

downloadBtn.addEventListener(
  "click",
  () => {

    if (!project.html) {

      alert(
        "Pehle website generate karo."
      );

      return;

    }


    const finalHTML = `

<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width, initial-scale=1.0">

<title>${escapeHTML(project.title)}</title>

<style>

${project.css}

</style>

</head>

<body>

${project.html}

<script>

${project.js}

<\/script>

</body>

</html>

`;


    const blob =
      new Blob(

        [finalHTML],

        {
          type:
            "text/html"
        }

      );


    const url =
      URL.createObjectURL(blob);


    const a =
      document.createElement("a");


    a.href = url;

    a.download =
      "ai-website.html";


    document.body.appendChild(a);

    a.click();

    a.remove();


    URL.revokeObjectURL(url);

  }

);


// ========================================
// CODE TABS
// ========================================

document
  .querySelectorAll(".tab")
  .forEach((tab) => {

    tab.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".tab")
          .forEach((item) => {

            item.classList.remove(
              "active"
            );

          });


        tab.classList.add(
          "active"
        );


        showCode(
          tab.dataset.tab
        );

      }
    );

  });


// ========================================
// DEVICE PREVIEW
// ========================================

document
  .querySelectorAll(".device")
  .forEach((device) => {

    device.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".device")
          .forEach((item) => {

            item.classList.remove(
              "active"
            );

          });


        device.classList.add(
          "active"
        );


        preview.style.width =
          device.dataset.width;

      }

    );

  });


// ========================================
// INITIAL STATE
// ========================================

showCode("html");

setStatus("Ready");