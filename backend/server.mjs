// backend/server.mjs

import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 Gemini proxy endpoint
app.post("/api/gemini", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
        const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );


    const data = await response.json();

    // 🔴 Google ne error bheja ho to
    if (!response.ok || data.error) {
      console.error("Gemini API error:", data);

      const message =
        data?.error?.message ||
        data?.error?.status ||
        `HTTP ${response.status}`;

      return res
        .status(500)
        .json({ error: message || "Gemini API returned an error" });
    }

    // 🔹 Text nikaalo
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .join("\n");

    if (!text) {
      console.error("Gemini empty response:", data);
      return res
        .status(500)
        .json({ error: "Gemini returned no text content" });
    }

    return res.json({ text });
  } catch (error) {
    console.error("Gemini backend crash:", error);
    return res.status(500).json({ error: "AI request failed on server" });
  }
});

// 🔹 Server ko start karo
app.listen(5000, () => {
  console.log("✅ Gemini backend running at http://localhost:5000");
});
