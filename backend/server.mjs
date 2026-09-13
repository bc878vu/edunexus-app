import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const PORT = process.env.PORT || 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const MAX_PROMPT_LENGTH = 12000;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const requestLog = new Map();

const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: ALLOWED_ORIGIN, credentials: false }));
app.use(express.json({ limit: "20kb" }));

function rateLimited(key) {
  const now = Date.now();
  const recent = (requestLog.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    requestLog.set(key, recent);
    return true;
  }
  recent.push(now);
  requestLog.set(key, recent);
  return false;
}

function clientKey(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown")
    .split(",")[0]
    .trim()
    .slice(0, 100);
}

app.get("/", (_req, res) => {
  res.status(200).json({ ok: true, service: "edunexus-gemini" });
});

app.post("/api/gemini", async (req, res) => {
  if (rateLimited(clientKey(req))) {
    return res.status(429).json({ error: "Too many requests. Please try again shortly." });
  }

  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not configured");
    return res.status(500).json({ error: "AI service is not configured." });
  }

  const prompt = req.body?.prompt;
  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "A non-empty prompt is required." });
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(413).json({ error: `Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer.` });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt.trim() }] }] }),
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok || data?.error) {
      console.error("Gemini provider error", {
        status: response.status,
        providerStatus: data?.error?.status,
      });
      return res.status(502).json({ error: "The AI provider could not complete the request." });
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part) => (typeof part?.text === "string" ? part.text : ""))
      .filter(Boolean)
      .join("\n")
      .trim();

    if (!text) {
      return res.status(502).json({ error: "The AI provider returned no text." });
    }

    return res.status(200).json({ text });
  } catch (error) {
    console.error("Gemini request failed", { name: error?.name });
    return res.status(error?.name === "AbortError" ? 504 : 500).json({
      error: error?.name === "AbortError" ? "The AI request timed out." : "AI request failed on server.",
    });
  } finally {
    clearTimeout(timeout);
  }
});

app.use((_err, _req, res, _next) => {
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`EduNexus Gemini backend listening on port ${PORT}`);
});
