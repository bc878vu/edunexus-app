// edunexus-app/api/gemini.mjs
export const runtime = 'nodejs';
export const maxDuration = 25;

const MAX_PROMPT_LENGTH = 17000;
const WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 20;
const requestLog = new Map();

function getClientKey(req) {
  return String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'unknown')
    .split(',')[0]
    .trim()
    .slice(0, 100);
}

function isRateLimited(key) {
  const now = Date.now();
  const previous = requestLog.get(key) || [];
  const recent = previous.filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    requestLog.set(key, recent);
    return true;
  }
  recent.push(now);
  requestLog.set(key, recent);
  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (isRateLimited(getClientKey(req))) {
    return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
  }

  // Never accept the old REACT_APP_* Gemini credential. That prefix is intended
  // for browser-exposed variables in React builds and must not be used for secrets.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Gemini API credential is not configured');
    return res.status(503).json({
      code: 'GEMINI_NOT_CONFIGURED',
      error: 'AI service is not configured yet. The site owner must add GEMINI_API_KEY to the Vercel project and redeploy.',
    });
  }

  const prompt = req.body?.prompt;
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'A non-empty prompt is required.' });
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(413).json({ error: `Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer.` });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 17000);

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      // Google Search grounding: the model may search the live web for
      // general/current questions. Grounding sources are returned separately
      // so the client can show real source links (never invented ones).
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt.trim() }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 900, temperature: 0.35 } }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || data?.error) {
      console.error('Gemini provider request failed', {
        status: response.status,
        providerStatus: data?.error?.status,
      });
      return res.status(response.status === 429 ? 429 : 502).json({
        error: response.status === 429 ? 'AI service is busy or has reached its quota. Please try again shortly.' : 'The AI provider could not complete the request. Check the Gemini API key, billing/quota and model access.',
      });
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .filter(Boolean)
      .join('\n')
      .trim();

    if (!text) return res.status(502).json({ error: 'The AI provider returned no text.' });
    const sources = (data?.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
      .map((chunk) => chunk?.web)
      .filter((web) => web && typeof web.uri === 'string' && web.uri.startsWith('https://'))
      .map((web) => ({ title: String(web.title || web.uri).slice(0, 160), uri: web.uri }))
      .filter((source, index, all) => all.findIndex((other) => other.uri === source.uri) === index)
      .slice(0, 5);
    return res.status(200).json({ text, ...(sources.length ? { sources } : {}) });
  } catch (error) {
    return res.status(error?.name === 'AbortError' ? 504 : 500).json({
      error: error?.name === 'AbortError'
        ? 'The AI request timed out.'
        : 'The AI request failed on the server.',
    });
  } finally {
    clearTimeout(timeout);
  }
}
