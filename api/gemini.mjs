// edunexus-app/api/gemini.mjs

const MAX_PROMPT_LENGTH = 12000;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

// Best-effort protection for a serverless instance.
const requestLog = new Map();

function getClientKey(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  return String(forwarded || req.headers?.["x-real-ip"] || "unknown")
    .split(",")[0]
    .trim()
    .slice(0, 100);
}

function isRateLimited(key) {
  const now = Date.now();
  const previous = requestLog.get(key) || [];
  const recent = previous.filter((time) => now - time < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    requestLog.set(key, recent);
    return true;
  }

  recent.push(now);
  requestLog.set(key, recent);
  return false;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const clientKey = getClientKey(req);
  if (isRateLimited(clientKey)) {
    return res.status(429).json({
      error: "Too many requests. Please try again shortly.",
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not configured");
    return res.status(500).json({ error: "AI service is not configured." });
  }

  const prompt = req.body?.prompt;
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ error: "A non-empty prompt is required." });
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(413).json({
      error: `Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer.`,
    });
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
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt.trim() }] }],
        }),
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok || data?.error) {
      console.error("Gemini provider request failed", {
        status: response.status,
        providerStatus: data?.error?.status,
      });
      return res.status(502).json({
        error: "The AI provider could not complete the request.",
      });
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part) => (typeof part?.text === "string" ? part.text : ""))
      .filter(Boolean)
      .join("\n")
      .trim();

    if (!text) {
      console.error("Gemini returned no text content");
      return res.status(502).json({ error: "The AI provider returned no text." });
    }

    return res.status(200).json({ text });
  } catch (error) {
    const message = error?.name === "AbortError"
      ? "The AI request timed out."
      : "The AI request failed on the server.";
    console.error("Gemini handler error", { name: error?.name });
    return res.status(error?.name === "AbortError" ? 504 : 500).json({
      error: message,
    });
  } finally {
    clearTimeout(timeout);
  }
}
