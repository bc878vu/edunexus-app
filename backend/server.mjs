// backend/server.mjs

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

// 🔹 .env load karo (backend/.env se)
dotenv.config();

// 🔹 Env variables
const PORT = process.env.PORT || 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Debug: check karo key load ho rahi hai ya nahi
console.log(
  "GEMINI_API_KEY prefix:",
  GEMINI_API_KEY ? GEMINI_API_KEY.slice(0, 8) : "undefined"
);

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY missing! backend/.env check karo.");
}

const app = express();

// 🔹 Middlewares
app.use(
  cors({
    origin: "http://localhost:3000", // tumhara React app
    credentials: true,
  })
);
app.use(express.json());

// 🔹 Health check (optional)
app.get("/", (req, res) => {
  res.send("✅ Gemini backend is running.");
});

// 🔹 Main Gemini proxy endpoint
app.post("/api/gemini", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Server misconfigured: GEMINI_API_KEY not set.",
      });
    }

    const url =
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent" +
      `?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();

    // 🔴 Agar Google ne error bheja
    if (!response.ok || data.error) {
      console.error("Gemini API error:", JSON.stringify(data, null, 2));

      const statusCode = data?.error?.code || response.status || 500;
      const message =
        data?.error?.message ||
        data?.error?.status ||
        `HTTP ${response.status}`;

      return res.status(statusCode).json({
        error: message || "Gemini API returned an error",
        raw: data,
      });
    }

    // 🔹 Response se text nikaalo
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .join("\n") || "";

    if (!text) {
      console.error("Gemini empty response:", JSON.stringify(data, null, 2));
      return res
        .status(500)
        .json({ error: "Gemini returned no text content" });
    }

    // ✅ Frontend ko text bhej do
    return res.json({ text });
  } catch (err) {
    console.error("Gemini backend crash:", err);
    return res.status(500).json({ error: "AI request failed on server" });
  }
});

// 🔹 Global error handler (optional)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// 🔹 Server start
app.listen(PORT, () => {
  console.log(`✅ Gemini backend running at http://localhost:${PORT}`);
});
