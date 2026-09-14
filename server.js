import "dotenv/config";
import express from "express";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// GEMINI
// ========================================

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY missing.");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// ========================================
// EXPRESS
// ========================================

app.use(express.json({ limit: "5mb" }));

// IMPORTANT:
// Your index.html, style.css and app.js
// are in the ROOT folder.
app.use(express.static(__dirname));

// ========================================
// AI SYSTEM PROMPT
// ========================================

const SYSTEM_PROMPT = `
You are CODE AI, an expert AI website builder.

Create complete websites from the user's request.

You can create:
- Portfolio websites
- Gaming websites
- Business websites
- Ecommerce websites
- Restaurant websites
- Login pages
- Dashboards
- Landing pages
- School websites
- Shop websites
- Calculator websites
- Tools websites
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
- Make the website modern and professional.
- Make it responsive on desktop, tablet and mobile.

JAVASCRIPT RULES:
- Browser JavaScript only.
- Do not use Node.js.
- Do not use eval().
- Buttons should work.
- Forms should work where possible.
- Navigation should work.
- Interactive features should work.

DESIGN:
- Modern UI.
- Professional layout.
- Good spacing.
- Good typography.
- Smooth animations where useful.
- Responsive design.
- Attractive colors.
- Good mobile layout.

SECURITY:
- Never expose API keys.
- Never create secret keys.
- Never put backend secrets inside generated code.

If the user asks to modify an existing website:
- Keep useful existing features.
- Modify according to the new request.
- Do not unnecessarily remove working features.

OUTPUT:
Return ONLY valid JSON.
Do not return Markdown.
Do not return code fences.
Do not add explanations outside JSON.
`;

// ========================================
// JSON SCHEMA
// ========================================

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

// ========================================
// GEMINI MODELS
// ========================================

const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
];

// ========================================
// WAIT
// ========================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========================================
// RETRYABLE ERROR
// ========================================

function isRetryableError(error) {
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
    message.includes("temporarily") ||
    message.includes("resource exhausted") ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  );
}

// ========================================
// GEMINI REQUEST
// ========================================

async function generateWithModel(model, userPrompt) {
  console.log(`🤖 Trying: ${model}`);

  const response =
    await ai.models.generateContent({
      model: model,

      contents: userPrompt,

      config: {
        systemInstruction: SYSTEM_PROMPT,

        temperature: 0.7,

        maxOutputTokens: 30000,

        responseMimeType:
          "application/json",

        responseSchema:
          WEBSITE_SCHEMA
      }
    });

  const text = response?.text;

  if (!text) {
    throw new Error(
      "Gemini ne empty response diya."
    );
  }

  return text.trim();
}

// ========================================
// CLEAN JSON
// ========================================

function cleanJSON(text) {
  let cleaned = String(text).trim();

  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstBrace =
    cleaned.indexOf("{");

  const lastBrace =
    cleaned.lastIndexOf("}");

  if (
    firstBrace !== -1 &&
    lastBrace !== -1 &&
    lastBrace > firstBrace
  ) {
    cleaned = cleaned.slice(
      firstBrace,
      lastBrace + 1
    );
  }

  return cleaned;
}

// ========================================
// PARSE JSON
// ========================================

function parseWebsite(text) {
  const cleaned = cleanJSON(text);

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("❌ JSON ERROR:");
    console.error(error.message);
    console.error("RAW RESPONSE:");
    console.error(cleaned);

    throw new Error(
      "Gemini ne valid JSON return nahi kiya."
    );
  }
}

// ========================================
// VALIDATE
// ========================================

function validateWebsite(result) {
  if (!result) {
    throw new Error(
      "Gemini response empty hai."
    );
  }

  if (typeof result.html !== "string") {
    throw new Error(
      "Gemini ne HTML generate nahi kiya."
    );
  }

  if (typeof result.css !== "string") {
    throw new Error(
      "Gemini ne CSS generate nahi kiya."
    );
  }

  if (typeof result.js !== "string") {
    result.js = "";
  }

  if (typeof result.title !== "string") {
    result.title = "AI Website";
  }

  if (typeof result.message !== "string") {
    result.message =
      "Website successfully generated.";
  }

  return result;
}

// ========================================
// GENERATE WEBSITE
// ========================================

app.post("/api/generate", async (req, res) => {
  try {
    const {
      prompt,
      current
    } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        error: "Prompt empty hai."
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error:
          "GEMINI_API_KEY set nahi hai."
      });
    }

    let userPrompt = `
USER REQUEST:

${prompt.trim()}
`;

    // Existing project
    if (current) {
      userPrompt += `

CURRENT WEBSITE:

${JSON.stringify(current)}

The user wants to modify the current website.

Keep useful existing features.

Modify the website according to the new request.

Do not unnecessarily remove working features.
`;
    }

    console.log("");
    console.log(
      "======================================"
    );
    console.log(
      "🚀 WEBSITE GENERATION STARTED"
    );
    console.log(
      "======================================"
    );

    let finalResult = null;
    let successfulModel = null;
    let lastError = null;

    // ====================================
    // TRY ALL MODELS
    // ====================================

    for (const model of MODELS) {

      let success = false;

      for (let attempt = 1; attempt <= 3; attempt++) {

        try {
          console.log(
            `🤖 ${model} | Attempt ${attempt}/3`
          );

          const text =
            await generateWithModel(
              model,
              userPrompt
            );

          const result =
            parseWebsite(text);

          finalResult =
            validateWebsite(result);

          successfulModel =
            model;

          success = true;

          break;

        } catch (error) {

          lastError = error;

          console.error(
            `❌ ${model} failed:`,
            error?.message || error
          );

          // Don't retry permanent errors
          if (!isRetryableError(error)) {
            break;
          }

          if (attempt < 3) {

            const delay =
              1500 *
              Math.pow(2, attempt - 1);

            const jitter =
              Math.floor(
                Math.random() * 500
              );

            console.log(
              `⏳ Retrying in ${
                delay + jitter
              }ms...`
            );

            await sleep(
              delay + jitter
            );
          }
        }
      }

      if (success) {
        break;
      }

      console.log(
        `⚠️ ${model} unavailable.`
      );

      console.log(
        "➡️ Trying next model..."
      );
    }

    // ====================================
    // ALL FAILED
    // ====================================

    if (!finalResult) {

      console.error(
        "❌ ALL GEMINI MODELS FAILED"
      );

      return res.status(503).json({
        error:
          "Gemini temporarily busy hai. Please thodi der baad try karo.\n\n" +
          (lastError?.message || "")
      });
    }

    // ====================================
    // SUCCESS
    // ====================================

    console.log("");
    console.log(
      "======================================"
    );
    console.log(
      "🎉 WEBSITE GENERATED"
    );
    console.log(
      `🤖 Model: ${successfulModel}`
    );
    console.log(
      `HTML: ${finalResult.html.length}`
    );
    console.log(
      `CSS: ${finalResult.css.length}`
    );
    console.log(
      `JS: ${finalResult.js.length}`
    );
    console.log(
      "======================================"
    );
    console.log("");

    return res.json({
      html: finalResult.html,
      css: finalResult.css,
      js: finalResult.js,
      title: finalResult.title,
      message: finalResult.message
    });

  } catch (error) {

    console.error("");
    console.error(
      "❌ SERVER ERROR"
    );
    console.error(
      error
    );
    console.error("");

    return res.status(500).json({
      error:
        error?.message ||
        "Website generate nahi ho payi."
    });
  }
});

// ========================================
// HOME PAGE
// ========================================

app.get("/", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "index.html"
    )
  );
});

// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {

  console.log("");
  console.log(
    "======================================"
  );
  console.log(
    "          ⚡ CODE AI STARTED"
  );
  console.log(
    "======================================"
  );
  console.log(
    `🌐 Port: ${PORT}`
  );
  console.log(
    "🤖 Gemini AI Ready"
  );
  console.log(
    "🔄 Automatic Retry: ON"
  );
  console.log(
    "🔀 Model Fallback: ON"
  );
  console.log(
    "======================================"
  );
  console.log("");
});
