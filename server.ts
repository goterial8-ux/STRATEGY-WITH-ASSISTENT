import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json({ limit: '10mb' }));

  app.post('/rpc/stream', async (req, res) => {
    try {
      const { prompt, usePro } = req.body;
      const projectId = process.env.GOOGLE_CLOUD_PROJECT;
      const location = process.env.GOOGLE_CLOUD_LOCATION || "global";

      if (!projectId) {
        throw new Error("Missing GOOGLE_CLOUD_PROJECT or GOOGLE_CLOUD_LOCATION for Vertex AI.");
      }

      const ai = new GoogleGenAI({
        vertexai: true,
        project: projectId,
        location: location,
      });

      const primaryModel = "gemini-3.1-pro-preview";
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');

      try {
        const responseStream = await ai.models.generateContentStream({
          model: primaryModel,
          contents: prompt,
          config: { 
            thinkingConfig: { thinkingLevel: "HIGH" } as any,
            maxOutputTokens: 8192
          }
        });

        for await (const chunk of responseStream) {
          if (chunk.text) {
            res.write(chunk.text);
          }
        }
        res.end();
      } catch (streamErr: any) {
        console.warn(`[Vertex AI] Stream failed:`, streamErr.message);
        res.write(`\n\n[API_ERROR] ${streamErr.message}`);
        res.end();
      }
    } catch (error: any) {
      console.error("[Vertex AI] Generation failed:", error);
      res.status(500).write(`[API_ERROR] ${error.message}`);
      res.end();
    }
  });

  app.post('/rpc', async (req, res) => {
    try {
      const { prompt, usePro } = req.body;
      const projectId = process.env.GOOGLE_CLOUD_PROJECT;
      const location = process.env.GOOGLE_CLOUD_LOCATION || "global";

      if (!projectId) {
        throw new Error("Missing GOOGLE_CLOUD_PROJECT or GOOGLE_CLOUD_LOCATION for Vertex AI.");
      }

      const ai = new GoogleGenAI({
        vertexai: true,
        project: projectId,
        location: location,
      });

      const primaryModel = "gemini-3.1-pro-preview";
      const fallbackModel = "gemini-2.5-pro";

      let resultText = "";
      
      try {
        const response = await ai.models.generateContent({
          model: primaryModel,
          contents: prompt,
          config: { 
            thinkingConfig: { thinkingLevel: "HIGH" } as any,
            maxOutputTokens: 8192
          }
        });
        resultText = response.text || "";
      } catch (err: any) {
        console.warn(`[Vertex AI] Primary model ${primaryModel} failed:`, err.message);
        const responseFallback = await ai.models.generateContent({
          model: fallbackModel,
          contents: prompt,
          config: { maxOutputTokens: 8192 }
        });
        resultText = responseFallback.text || "";
      }

      res.json({ success: true, text: resultText });

    } catch (error: any) {
      console.error("[Vertex AI] Generation failed:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Generation failed"
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
