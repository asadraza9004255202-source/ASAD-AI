import "dotenv/config";
import express from "express";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";


// ========================================
// BASIC SETUP
// ========================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 3000;


// ========================================
// GEMINI CLIENT
// ========================================

if (!process.env.GEMINI_API_KEY) {
  console.error("");
  console.error("❌ GEMINI_API_KEY missing!");
  console.error("Check your .env file.");
  console.error("");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});


// ========================================
// EXPRESS
// ========================================

app.use(
  express.json({
    limit: "5mb"
  })
);

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);


// ========================================
// SYSTEM PROMPT
// ========================================

const SYSTEM_PROMPT = `
You are CODE AI, an expert AI website builder.

Your job is to create complete websites from the user's request.

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
- Tool websites
- AI websites
- Game websites
- Animation websites
- Any other website

IMPORTANT:

HTML:
- Return body content only.
- Do not include html, head or body tags.
- HTML must be complete and working.

CSS:
- Return complete CSS.
- Make the design modern and professional.
- Make it responsive.

JAVASCRIPT:
- Return browser JavaScript only.
- Do not use Node.js.
- Do not use eval().
- Make buttons work.
- Make forms work where possible.
- Make navigation work.
- Add useful interactions.

DESIGN:
- Modern UI.
- Beautiful spacing.
- Good typography.
- Professional layout.
- Smooth animations when useful.
- Desktop responsive.
- Tablet responsive.
- Mobile responsive.

SECURITY:
- Never expose API keys.
- Never create secret keys.
- Never put backend secrets inside generated code.

EXTERNAL RESOURCES:
- Avoid unnecessary external dependencies.
- If images are required, use safe image URLs or CSS gradients.

MODIFICATION:
If the user provides an existing website:
- Keep useful existing features.
- Modify the existing website according to the new request.
- Do not unnecessarily remove working features.

OUTPUT:
Return ONLY valid JSON matching the requested schema.
Do not return Markdown.
Do not return code fences.
Do not add explanations outside JSON.
`;


// ========================================
// WEBSITE JSON SCHEMA
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
// MODELS
// ========================================
//
// First try latest powerful model.
// If it is temporarily unavailable,
// automatically try backup models.
//

const MODELS = [

  "gemini-3.8-flash",

  "gemini-3.7-flash",

  "gemini-2.5-flash",

  "gemini-2.5-flash-lite"

];


// ========================================
// WAIT FUNCTION
// ========================================

function sleep(ms) {

  return new Promise(
    resolve => setTimeout(resolve, ms)
  );

}


// ========================================
// CHECK RETRYABLE ERROR
// ========================================

function isRetryableError(error) {

  const message =
    String(
      error?.message || error || ""
    ).toLowerCase();

  const status =
    Number(
      error?.status ||
      error?.code ||
      0
    );


  // HTTP temporary errors

  if (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {

    return true;

  }


  // Error message checks

  return (

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
// GENERATE WITH ONE MODEL
// ========================================

async function generateWithModel(
  model,
  userPrompt
) {

  console.log("");
  console.log(
    `🤖 Trying model: ${model}`
  );


  const response =
    await ai.models.generateContent({

      model,

      contents: userPrompt,

      config: {

        systemInstruction:
          SYSTEM_PROMPT,

        temperature: 0.7,

        maxOutputTokens: 30000,

        responseMimeType:
          "application/json",

        responseSchema:
          WEBSITE_SCHEMA

      }

    });


  const text =
    response?.text;


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

  let cleaned =
    String(text).trim();


  // Remove ```json

  if (
    cleaned.startsWith("```json")
  ) {

    cleaned =
      cleaned.replace(
        /^```json\s*/i,
        ""
      );

  }


  // Remove ```javascript etc.

  else if (
    cleaned.startsWith("```")
  ) {

    cleaned =
      cleaned.replace(
        /^```\w*\s*/i,
        ""
      );

  }


  // Remove ending ```

  cleaned =
    cleaned.replace(
      /\s*```$/i,
      ""
    );


  // Sometimes model adds text before JSON.
  // Try to extract the JSON object.

  const firstBrace =
    cleaned.indexOf("{");

  const lastBrace =
    cleaned.lastIndexOf("}");


  if (
    firstBrace !== -1 &&
    lastBrace !== -1 &&
    lastBrace > firstBrace
  ) {

    cleaned =
      cleaned.slice(
        firstBrace,
        lastBrace + 1
      );

  }


  return cleaned.trim();

}


// ========================================
// PARSE WEBSITE
// ========================================

function parseWebsiteJSON(text) {

  const cleaned =
    cleanJSON(text);


  try {

    return JSON.parse(
      cleaned
    );

  } catch (error) {

    console.error("");
    console.error(
      "❌ JSON PARSE ERROR"
    );

    console.error(
      error.message
    );

    console.error("");
    console.error(
      "RAW RESPONSE:"
    );

    console.error(
      cleaned
    );

    console.error("");


    throw new Error(
      "Gemini ne valid website JSON return nahi kiya."
    );

  }

}


// ========================================
// VALIDATE WEBSITE
// ========================================

function validateWebsite(result) {

  if (!result) {

    throw new Error(
      "Gemini response empty hai."
    );

  }


  if (
    typeof result.html !== "string"
  ) {

    throw new Error(
      "Gemini ne HTML generate nahi kiya."
    );

  }


  if (
    typeof result.css !== "string"
  ) {

    throw new Error(
      "Gemini ne CSS generate nahi kiya."
    );

  }


  if (
    typeof result.js !== "string"
  ) {

    result.js = "";

  }


  if (
    typeof result.title !== "string"
  ) {

    result.title =
      "AI Website";

  }


  if (
    typeof result.message !== "string"
  ) {

    result.message =
      "Website successfully generated.";

  }


  return result;

}


// ========================================
// GENERATE WEBSITE API
// ========================================

app.post(
  "/api/generate",
  async (req, res) => {

    try {

      const {
        prompt,
        current
      } = req.body;


      // ------------------------------------
      // PROMPT CHECK
      // ------------------------------------

      if (
        !prompt ||
        !prompt.trim()
      ) {

        return res.status(400).json({

          error:
            "Prompt empty hai."

        });

      }


      // ------------------------------------
      // API KEY CHECK
      // ------------------------------------

      if (
        !process.env.GEMINI_API_KEY
      ) {

        return res.status(500).json({

          error:
            "GEMINI_API_KEY .env file me nahi mila."

        });

      }


      // ------------------------------------
      // BUILD USER PROMPT
      // ------------------------------------

      let userPrompt = `

USER REQUEST:

${prompt.trim()}

`;


      // ------------------------------------
      // EXISTING WEBSITE
      // ------------------------------------

      if (current) {

        userPrompt += `

CURRENT WEBSITE:

${JSON.stringify(current)}

The user wants to modify this existing website.

Keep the useful existing features.

Modify the website according to the user's new request.

Do not unnecessarily remove working features.

`;

      }


      console.log("");
      console.log(
        "========================================"
      );

      console.log(
        "🚀 WEBSITE GENERATION STARTED"
      );

      console.log(
        "========================================"
      );


      let lastError =
        null;

      let finalResult =
        null;

      let successfulModel =
        null;


      // ====================================
      // TRY MODELS
      // ====================================

      for (
        const model of MODELS
      ) {

        let modelSucceeded =
          false;


        // --------------------------------
        // RETRY SAME MODEL
        // --------------------------------

        for (
          let attempt = 1;
          attempt <= 3;
          attempt++
        ) {

          try {

            console.log(
              `Attempt ${attempt}/3`
            );


            const text =
              await generateWithModel(
                model,
                userPrompt
              );


            const result =
              parseWebsiteJSON(text);


            finalResult =
              validateWebsite(result);


            successfulModel =
              model;


            modelSucceeded =
              true;


            break;

          } catch (error) {

            lastError =
              error;


            console.error("");

            console.error(
              `❌ ${model} attempt ${attempt} failed`
            );

            console.error(
              error?.message ||
              error
            );


            // If not retryable,
            // don't waste attempts.

            if (
              !isRetryableError(
                error
              )
            ) {

              console.error(
                "Non-retryable error."
              );

              break;

            }


            // Exponential backoff:
            //
            // attempt 1 -> 1.5 sec
            // attempt 2 -> 3 sec
            // attempt 3 -> then next model

            if (
              attempt < 3
            ) {

              const delay =
                1500 *
                Math.pow(
                  2,
                  attempt - 1
                );


              // Small random jitter

              const jitter =
                Math.floor(
                  Math.random() * 700
                );


              console.log(
                `⏳ Waiting ${
                  delay + jitter
                }ms before retry...`
              );


              await sleep(
                delay + jitter
              );

            }

          }

        }


        // --------------------------------
        // STOP IF SUCCESS
        // --------------------------------

        if (
          modelSucceeded
        ) {

          break;

        }


        console.log("");

        console.log(
          `⚠️ ${model} unavailable.`
        );

        console.log(
          "➡️ Trying next model..."
        );

      }


      // ====================================
      // ALL MODELS FAILED
      // ====================================

      if (
        !finalResult
      ) {

        console.error("");
        console.error(
          "========================================"
        );

        console.error(
          "❌ ALL GEMINI MODELS FAILED"
        );

        console.error(
          "========================================"
        );


        const errorMessage =
          lastError?.message ||
          "Gemini se website generate nahi ho payi.";


        return res.status(503).json({

          error:
            `Gemini temporarily busy hai. Please thodi der baad try karo.\n\nDetails: ${errorMessage}`

        });

      }


      // ====================================
      // SUCCESS
      // ====================================

      console.log("");

      console.log(
        "========================================"
      );

      console.log(
        "🎉 WEBSITE GENERATED!"
      );

      console.log(
        `🤖 Model: ${successfulModel}`
      );

      console.log(
        `HTML: ${finalResult.html.length} chars`
      );

      console.log(
        `CSS: ${finalResult.css.length} chars`
      );

      console.log(
        `JS: ${finalResult.js.length} chars`
      );

      console.log(
        "========================================"
      );

      console.log("");


      // ====================================
      // SEND TO FRONTEND
      // ====================================

      return res.json({

        html:
          finalResult.html,

        css:
          finalResult.css,

        js:
          finalResult.js,

        title:
          finalResult.title,

        message:
          finalResult.message

      });


    } catch (error) {

      console.error("");

      console.error(
        "========================================"
      );

      console.error(
        "❌ SERVER ERROR"
      );

      console.error(
        "========================================"
      );

      console.error(
        error
      );

      console.error(
        "========================================"
      );


      return res.status(500).json({

        error:
          error?.message ||
          "Website generate nahi ho payi."

      });

    }

  }
);


// ========================================
// HOME PAGE
// ========================================

app.get(
  "/",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "public",
        "index.html"
      )
    );

  }
);


// ========================================
// START SERVER
// ========================================

app.listen(
  PORT,
  () => {

    console.log("");

    console.log(
      "========================================"
    );

    console.log(
      "        ⚡ CODE AI STARTED"
    );

    console.log(
      "========================================"
    );

    console.log(
      `🌐 http://localhost:${PORT}`
    );

    console.log(
      "🤖 Gemini AI Ready"
    );

    console.log(
      "🔄 Automatic retry enabled"
    );

    console.log(
      "🔀 Automatic model fallback enabled"
    );

    console.log(
      "========================================"
    );

    console.log("");

  }
);