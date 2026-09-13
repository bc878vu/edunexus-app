// edunexus-app/api/gemini.mjs
export const runtime = 'nodejs';
export const maxDuration = 30;

// The previous 12,000-character app limit was an artificial bottleneck and
// caused valid app-aware prompts to fail before Gemini was even called.
// Gemini 2.5 Flash supports a much larger context, so keep a generous server
// safety ceiling while still preventing accidentally enormous requests.
const MAX_PROMPT_LENGTH = 50000;
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

function fitPrompt(value) {
  const prompt = String(value || '').trim();
  if (prompt.length <= MAX_PROMPT_LENGTH) return prompt;

  // Preserve the beginning (instructions/app knowledge) and the tail
  // (recent chat + the user's actual question) rather than hard-failing.
  const head = 39000;
  const tail = 10500;
  return `${prompt.slice(0, head)}\n\n[Context trimmed safely by EduNexus AI]\n\n${prompt.slice(-tail)}`;
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

  const rawPrompt = req.body?.prompt;
  if (typeof rawPrompt !== 'string' || !rawPrompt.trim()) {
    return res.status(400).json({ error: 'A non-empty prompt is required.' });
  }

  const prompt = fitPrompt(rawPrompt);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || data?.error) {
      console.error('Gemini provider request failed', {
        status: response.status,
        providerStatus: data?.error?.status,
      });
      return res.status(502).json({
        error: 'The AI provider could not complete the request. Check the Gemini API key, billing/quota and model access.',
      });
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .filter(Boolean)
      .join('\n')
      .trim();

    if (!text) return res.status(502).json({ error: 'The AI provider returned no text.' });
    return res.status(200).json({ text });
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
