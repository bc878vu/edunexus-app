// edunexus-app/api/gemini.mjs

export default async function handler(req, res) {
  // Sirf POST allow karein
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY missing on Vercel");
      return res
        .status(500)
        .json({ error: "Server misconfigured: GEMINI_API_KEY not set." });
    }

    const { prompt } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
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

    // ✅ Sab ok → frontend ko text bhejo
    return res.status(200).json({ text });
  } catch (err) {
    console.error("Gemini handler crash:", err);
    return res.status(500).json({ error: "AI request failed on server" });
  }
}
