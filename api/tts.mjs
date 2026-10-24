// Text-to-speech proxy for EduBot's Listen button. Browser speechSynthesis on
// phones only offers the device's own (often robotic) voices, so Listen first
// tries a genuinely human-like female voice from Gemini's TTS model and falls
// back to on-device speech when this endpoint is unavailable. The client never
// sees the API key; audio is returned as base64 PCM and wrapped into a WAV by
// the browser before playback.
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 20;
const hits = new Map();
const cleanText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((time) => now - time < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (recent.length > RATE_MAX) return res.status(429).json({ error: 'Too many voice requests. Please try again shortly.' });

  const text = cleanText(req.body?.text).slice(0, 1200);
  if (!text) return res.status(400).json({ error: 'Text is required.' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: 'Voice service is not configured.' });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          },
        }),
        signal: controller.signal,
      }
    ).finally(() => clearTimeout(timer));
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.error) {
      return res.status(response.status === 429 ? 429 : 502).json({ error: 'Voice service could not generate audio.' });
    }
    const part = data?.candidates?.[0]?.content?.parts?.find((entry) => entry?.inlineData?.data);
    if (!part?.inlineData?.data) return res.status(502).json({ error: 'Voice service returned no audio.' });
    return res.status(200).json({ audio: part.inlineData.data, sampleRate: 24000 });
  } catch (error) {
    return res.status(502).json({ error: 'Voice service is temporarily unavailable.' });
  }
}
