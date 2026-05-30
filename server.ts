import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Start the main server execution container
async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for JSON parsing with safety limit
  app.use(express.json({ limit: "50mb" }));

  // Health check endpoint
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "ok", hasApiKey: !!process.env.GEMINI_API_KEY });
  });

  // Translate API route employing Gemini models dynamically
  app.post("/api/translate", async (req: Request, res: Response): Promise<any> => {
    try {
      const { texts, targetLanguageCode, targetLanguageName, temperature, systemInstruction, model } = req.body;

      if (!texts || !Array.isArray(texts) || texts.length === 0) {
        return res.status(400).json({ error: "Missing or invalid 'texts' field." });
      }

      if (!targetLanguageName) {
        return res.status(400).json({ error: "Missing 'targetLanguageName' field." });
      }

      const activeApiKey = process.env.GEMINI_API_KEY;
      const isPlaceholder = !activeApiKey || 
        activeApiKey.trim() === "" || 
        activeApiKey.trim() === "PLACEHOLDER_API_KEY" || 
        activeApiKey.trim() === "YOUR_API_KEY_HERE";

      if (isPlaceholder) {
        console.error("GEMINI_API_KEY is missing or contains template placeholder.");
        return res.status(400).json({
          error: "کلید API جمینای تنظیم نشده یا نامعتبر است.",
          details: "لطفاً از منوی تنظیمات بالا سمت راست (Settings > Secrets)، مقدار واقعی کلید خود را جایگزین GEMINI_API_KEY کنید."
        });
      }

      // Initialize Gemini client securely on the server (lazy loading)
      const ai = new GoogleGenAI({
        apiKey: activeApiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      // Prepare Gemini translation prompt with JSON guidance
      const prompt = `Translate the following list of subtitle text strings accurately and naturally into ${targetLanguageName} (${targetLanguageCode}).
Make sure to:
1. Preserve the exact meaning, nuance, and emotional tone of each line.
2. Return exactly the same number of translation elements as the input array.
3. Keep translations concise and perfectly formatted for on-screen subtitle display.

Here are the text lines to translate:
${JSON.stringify(texts)}`;

      const sysInstruction = systemInstruction || 
        `You are an expert subtitle translator. Translate each string in the input array into ${targetLanguageName} neutrally and fluently. Keep the translations natural and properly fitted for subtitle viewing.`;

      // Determine model to use, default to gemini-3.5-flash
      const selectedModel = model || "gemini-3.5-flash";

      // Call Gemini API securely on the server
      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: prompt,
        config: {
          systemInstruction: sysInstruction,
          temperature: temperature !== undefined ? Number(temperature) : 0.4,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              translatedTexts: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
                description: "The translated texts matching the exact same order and length of the inputs."
              }
            },
            required: ["translatedTexts"]
          }
        }
      });

      const jsonText = response.text?.trim() || "{}";
      const resultObj = JSON.parse(jsonText);

      let translatedTexts = resultObj.translatedTexts || [];
      if (!Array.isArray(translatedTexts) || translatedTexts.length !== texts.length) {
        console.warn("Gemini output size mismatch or invalid formatting. Falling back safely.", translatedTexts);
        translatedTexts = texts.map((originalText, index) => {
          if (translatedTexts && translatedTexts[index] !== undefined) {
            return String(translatedTexts[index]);
          }
          return originalText;
        });
      }

      return res.json({ translatedTexts });
    } catch (error: any) {
      console.error("Gemini Translation API server-side error:", error);
      return res.status(500).json({
        error: "Translation failed on the server.",
        details: error?.message || String(error)
      });
    }
  });

  // Serve Vite client app
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Server startup crashed:", error);
});
