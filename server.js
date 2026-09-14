import "dotenv/config";
import express from "express";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024
  }
});

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// Root files
app.use(express.static(__dirname));

// Generated video folder
const generatedFolder = path.join(__dirname, "generated");

if (!fs.existsSync(generatedFolder)) {
  fs.mkdirSync(generatedFolder, { recursive: true });
}

// ==========================================
// WEBSITE AI
// ==========================================

const SYSTEM_PROMPT = `
You are CODE AI, an expert AI website builder.

Create complete websites from the user's request.

You can create:
- Portfolio
- Gaming websites
- Business websites
- Ecommerce
- Restaurant websites
- Login pages
- Dashboards
- Landing pages
- School websites
- Shop websites
- Calculator websites
- Tools
- AI websites
- Game websites
- Animation websites
- Any other website

HTML RULES:
- Return BODY content only.
- Do not include html, head or body tags.
- HTML must be complete and functional.

CSS RULES:
- Return complete CSS.
- Modern professional design.
- Responsive desktop, tablet and mobile.

JAVASCRIPT RULES:
- Browser JavaScript only.
- Do not use Node.js.
- Do not use eval().
- Buttons should work.
- Forms should work.
- Navigation should work.
- Interactive features should work.

SECURITY:
- Never expose API keys.
- Never create secret keys.
- Never put backend secrets inside generated code.

OUTPUT:
Return ONLY valid JSON.
`;

const WEBSITE_SCHEMA = {
  type: "object",
  properties: {
    html: {
      type: "string"
    },
    css: {
      type: "string"
    },
    js: {
      type: "string"
    },
    title: {
      type: "string"
    },
    message: {
      type: "string"
    }
  },
  required: [
    "html",
    "css",
    "js",
    "title",
    "message"
  ]
};

const WEBSITE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function retryable(error) {
  const message = String(
    error?.message || error || ""
  ).toLowerCase();

  const status = Number(
    error?.status ||
    error?.code ||
    0
  );

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes("503") ||
    message.includes("unavailable") ||
    message.includes("overloaded") ||
    message.includes("high demand") ||
    message.includes("resource exhausted") ||
    message.includes("rate limit")
  );
}

async function generateWebsite(model, prompt) {

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.7,
      maxOutputTokens: 30000,
      responseMimeType: "application/json",
      responseSchema: WEBSITE_SCHEMA
    }
  });

  if (!response?.text) {
    throw new Error("Gemini empty response.");
  }

  return response.text.trim();
}

function cleanJSON(text) {

  let cleaned = String(text).trim();

  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");

  if (
    first !== -1 &&
    last !== -1 &&
    last > first
  ) {
    cleaned = cleaned.slice(
      first,
      last + 1
    );
  }

  return cleaned;
}

app.post("/api/generate", async (req, res) => {

  try {

    const {
      prompt,
      current
    } = req.body;

    if (!prompt?.trim()) {
      return res.status(400).json({
        error: "Prompt empty hai."
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY set nahi hai."
      });
    }

    let userPrompt = `
USER REQUEST:

${prompt.trim()}
`;

    if (current) {

      userPrompt += `

CURRENT WEBSITE:

${JSON.stringify(current)}

Modify the current website according to the user's request.

Keep useful existing features.
Do not unnecessarily remove working features.
`;
    }

    let finalResult = null;
    let lastError = null;

    for (const model of WEBSITE_MODELS) {

      for (
        let attempt = 1;
        attempt <= 3;
        attempt++
      ) {

        try {

          console.log(
            `Website AI: ${model} attempt ${attempt}`
          );

          const text =
            await generateWebsite(
              model,
              userPrompt
            );

          const result =
            JSON.parse(cleanJSON(text));

          if (
            typeof result.html !== "string" ||
            typeof result.css !== "string"
          ) {
            throw new Error(
              "Invalid website response."
            );
          }

          finalResult = {
            html: result.html,
            css: result.css,
            js:
              typeof result.js === "string"
                ? result.js
                : "",
            title:
              result.title ||
              "AI Website",
            message:
              result.message ||
              "Website generated."
          };

          break;

        } catch (error) {

          lastError = error;

          console.error(
            `${model} failed:`,
            error.message
          );

          if (!retryable(error)) {
            break;
          }

          if (attempt < 3) {
            await sleep(
              1500 * Math.pow(
                2,
                attempt - 1
              )
            );
          }
        }
      }

      if (finalResult) {
        break;
      }
    }

    if (!finalResult) {

      return res.status(503).json({
        error:
          "Gemini temporarily busy hai. Thodi der baad try karo."
      });
    }

    return res.json(finalResult);

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error:
        error?.message ||
        "Website generate nahi ho payi."
    });
  }
});


// ==========================================
// IMAGE → VIDEO
// ==========================================

const videoJobs = new Map();


// Start video generation
app.post(
  "/api/video",
  upload.single("image"),
  async (req, res) => {

    try {

      if (!process.env.GEMINI_API_KEY) {

        return res.status(500).json({
          error:
            "GEMINI_API_KEY set nahi hai."
        });
      }

      if (!req.file) {

        return res.status(400).json({
          error:
            "Image upload karo."
        });
      }

      const prompt =
        req.body.prompt?.trim() ||
        "Create a realistic cinematic video from this image. Natural movement, realistic camera motion, detailed environment.";

      const aspectRatio =
        req.body.aspectRatio === "9:16"
          ? "9:16"
          : "16:9";

      const jobId =
        crypto.randomUUID();

      videoJobs.set(jobId, {
        status: "generating",
        progress: 5,
        message:
          "Video generation started..."
      });

      res.json({
        success: true,
        jobId
      });

      // Generate in background
      generateVideoJob(
        jobId,
        req.file,
        prompt,
        aspectRatio
      );

    } catch (error) {

      console.error(
        "Video start error:",
        error
      );

      return res.status(500).json({
        error:
          error?.message ||
          "Video start nahi ho paya."
      });
    }
  }
);


// Video generation worker
async function generateVideoJob(
  jobId,
  file,
  prompt,
  aspectRatio
) {

  try {

    videoJobs.set(jobId, {
      status: "generating",
      progress: 10,
      message:
        "AI video bana raha hai..."
    });

    console.log(
      "🎬 Starting Veo video:",
      jobId
    );

    const image = {
      imageBytes:
        file.buffer.toString("base64"),
      mimeType:
        file.mimetype || "image/jpeg"
    };

    let operation =
      await ai.models.generateVideos({
        model:
          "veo-3.1-generate-preview",

        prompt,

        image,

        config: {
          aspectRatio,
          numberOfVideos: 1,
          resolution: "720p"
        }
      });

    videoJobs.set(jobId, {
      status: "generating",
      progress: 20,
      message:
        "Veo video generate kar raha hai..."
    });

    // Poll
    while (!operation.done) {

      await sleep(10000);

      operation =
        await ai.operations
          .getVideosOperation({
            operation
          });

      videoJobs.set(jobId, {
        status: "generating",
        progress: 50,
        message:
          "Video processing ho raha hai..."
      });

      console.log(
        "🎬 Video status:",
        operation.done
      );
    }

    if (
      !operation.response ||
      !operation.response.generatedVideos ||
      !operation.response.generatedVideos.length
    ) {

      throw new Error(
        "Veo ne video return nahi kiya."
      );
    }

    const generatedVideo =
      operation
        .response
        .generatedVideos[0]
        .video;

    const filename =
      `${jobId}.mp4`;

    const outputPath =
      path.join(
        generatedFolder,
        filename
      );

    // Download generated video
    await ai.files.download({
      file: generatedVideo,
      downloadPath: outputPath
    });

    const videoUrl =
      `/generated/${filename}`;

    videoJobs.set(jobId, {
      status: "complete",
      progress: 100,
      message:
        "Video successfully generated!",
      videoUrl
    });

    console.log(
      "🎉 VIDEO READY:",
      videoUrl
    );

  } catch (error) {

    console.error(
      "❌ VIDEO ERROR:",
      error
    );

    videoJobs.set(jobId, {
      status: "error",
      progress: 100,
      message:
        error?.message ||
        "Video generate nahi ho paya."
    });
  }
}


// Check video status
app.get(
  "/api/video/:jobId",
  (req, res) => {

    const job =
      videoJobs.get(
        req.params.jobId
      );

    if (!job) {

      return res.status(404).json({
        error:
          "Video job nahi mila."
      });
    }

    return res.json(job);
  }
);


// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "index.html"
    )
  );
});


// ==========================================
// SERVER
// ==========================================

app.listen(PORT, () => {

  console.log("");
  console.log(
    "================================"
  );
  console.log(
    "       ⚡ CODE AI"
  );
  console.log(
    "================================"
  );
  console.log(
    `🌐 Port: ${PORT}`
  );
  console.log(
    "🤖 Website AI: ON"
  );
  console.log(
    "🎬 Image → Video: ON"
  );
  console.log(
    "================================"
  );
  console.log("");
});
