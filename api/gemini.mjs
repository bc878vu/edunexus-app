// edunexus-app/api/gemini.mjs
export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_PROMPT_LENGTH = 50000;
const WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 20;
const MAX_FILE_CANDIDATES = 40;
const MAX_SOURCE_FILES = 2;
const MAX_SOURCE_BYTES = 6500000;
const requestLog = new Map();

const PROJECT_ID = 'edunexus-live-e0b84';
const FILES_PATH = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/artifacts/edunexus-live/public/data/files?pageSize=${MAX_FILE_CANDIDATES}`;

function getClientKey(req) {
  return String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'unknown')
    .split(',')[0].trim().slice(0, 100);
}

function isRateLimited(key) {
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

function fitPrompt(value) {
  const prompt = String(value || '').trim();
  if (prompt.length <= MAX_PROMPT_LENGTH) return prompt;
  return `${prompt.slice(0, 39000)}\n\n[Context trimmed safely by EduNexus AI]\n\n${prompt.slice(-10500)}`;
}

function typedValue(v) {
  if (!v || typeof v !== 'object') return '';
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('referenceValue' in v) return v.referenceValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(typedValue);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, typedValue(x)]));
  return '';
}

function decodeFirestoreDoc(doc) {
  const fields = doc?.fields || {};
  const out = {};
  for (const [key, value] of Object.entries(fields)) out[key] = typedValue(value);
  return out;
}

function sourceUrl(x) {
  return String(x?.url || x?.downloadURL || x?.downloadUrl || x?.fileUrl || x?.href || x?.link || '').trim();
}

function sourceTitle(x) {
  return String(x?.title || x?.name || x?.fileName || x?.subject || x?.course || 'Untitled file').trim();
}

function normalizeTerms(prompt) {
  return String(prompt || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((x) => x.length > 1);
}

function scoreFile(file, prompt) {
  const hay = [file.title, file.name, file.fileName, file.subject, file.course, file.code, file.category, file.description, file.text, file.storagePath]
    .map((v) => String(v || '').toLowerCase()).join(' ');
  const terms = normalizeTerms(prompt);
  let score = 0;
  for (const term of terms) {
    if (hay.includes(term)) score += term.length >= 4 ? 2 : 1;
  }
  const p = String(prompt || '').toLowerCase();
  if (p.includes(String(file.course || file.subject || '').toLowerCase())) score += 8;
  if (/handout|notes|lecture|pdf|file|document/.test(hay)) score += 1;
  return score;
}

async function fetchLiveFiles() {
  try {
    const r = await fetch(FILES_PATH, { headers: { Accept: 'application/json' } });
    if (!r.ok) return [];
    const data = await r.json();
    return (data.documents || []).map((d) => {
      const x = decodeFirestoreDoc(d);
      return {
        id: d.name?.split('/').pop() || '',
        title: sourceTitle(x),
        name: x.name || '',
        fileName: x.fileName || '',
        subject: x.subject || '',
        course: x.course || '',
        code: x.code || '',
        category: x.category || '',
        description: x.description || '',
        text: x.text || x.content || '',
        contentType: x.contentType || x.mimeType || '',
        url: sourceUrl(x),
        storagePath: x.storagePath || ''
      };
    }).filter((x) => x.title || x.url);
  } catch (e) {
    console.warn('Live files lookup failed', e?.message || e);
    return [];
  }
}

function isGroundedMode(prompt) {
  return /flashcard|flash cards|multiple choice|mcq|quiz|question bank|generate.*questions/i.test(String(prompt || ''));
}

function sourceInstruction(prompt) {
  if (/flashcard|flash cards/i.test(prompt)) {
    return `\n\nSOURCE-GROUNDED FLASHCARDS\n- Create the requested flashcards ONLY from the supplied EduNexus source documents below.\n- Do not use general model knowledge to fill gaps. If the sources do not support enough cards, make fewer cards rather than inventing facts.\n- Return ONLY valid JSON: [{"front":"...","back":"...","source":"filename or source title"}].\n- Make cards useful for exams: definitions, concepts, distinctions, formulas/examples only when explicitly present in the source.\n`;
  }
  if (/multiple choice|mcq|quiz|question bank|generate.*questions/i.test(prompt)) {
    return `\n\nSOURCE-GROUNDED AI QUIZ\n- Build questions ONLY from the supplied EduNexus source documents below.\n- Never inject outside facts. If a requested question count is larger than the evidence supports, return fewer high-quality questions.\n- Every question must have exactly 4 options and exactly one correct option.\n- Return ONLY valid JSON array with objects shaped exactly like {"id":1,"q":"Question?","options":["A","B","C","D"],"ans":0,"explanation":"Why the answer is correct.","source":"filename or source title"}.\n- Avoid duplicates and avoid questions whose answer is not clearly supported by the source.\n`;
  }
  return '';
}

async function buildSources(prompt) {
  const files = await fetchLiveFiles();
  const ranked = files.map((file) => ({ file, score: scoreFile(file, prompt) })).sort((a, b) => b.score - a.score);
  const selected = ranked.filter((x) => x.score > 0).slice(0, MAX_SOURCE_FILES);
  if (!selected.length && isGroundedMode(prompt)) return { selected: [], parts: [] };
  const fallback = selected.length ? selected : ranked.slice(0, 2);
  const parts = [];
  for (const { file } of fallback) {
    const header = `SOURCE DOCUMENT: ${file.title}\nCourse/Subject: ${file.course || file.subject || file.code || 'N/A'}\nURL: ${file.url || 'N/A'}\n`;
    const inlineText = String(file.text || file.description || '').trim();
    if (inlineText) {
      parts.push({ text: `${header}\nSOURCE TEXT:\n${inlineText.slice(0, 50000)}` });
      continue;
    }
    if (!file.url) {
      parts.push({ text: header });
      continue;
    }
    try {
      const r = await fetch(file.url, { signal: AbortSignal.timeout(9000) });
      if (!r.ok) throw new Error(`source ${r.status}`);
      const contentType = String(r.headers.get('content-type') || file.contentType || '').toLowerCase();
      const buf = await r.arrayBuffer();
      if (buf.byteLength > MAX_SOURCE_BYTES) {
        parts.push({ text: `${header}\nThe source file is larger than the safe AI ingestion limit; use its metadata only and do not invent content.` });
        continue;
      }
      if (contentType.includes('pdf') || /\.pdf(?:$|\?)/i.test(file.url)) {
        parts.push({ text: header });
        parts.push({ inlineData: { mimeType: 'application/pdf', data: Buffer.from(buf).toString('base64') } });
      } else if (contentType.startsWith('text/') || /json|csv|xml|html|markdown/i.test(contentType) || /\.(txt|csv|json|md|html?)(?:$|\?)/i.test(file.url)) {
        const text = Buffer.from(buf).toString('utf8').slice(0, 50000);
        parts.push({ text: `${header}\nSOURCE TEXT:\n${text}` });
      } else {
        parts.push({ text: `${header}\nThe uploaded file type is ${contentType || 'unknown'} and could not be safely extracted in this request. Do not invent its contents.` });
      }
    } catch (e) {
      parts.push({ text: `${header}\nThe live source could not be downloaded in this request. Do not invent its contents.` });
    }
  }
  return { selected: fallback.map(({ file, score }) => ({ title: file.title, course: file.course || file.subject, url: file.url, score })), parts };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (isRateLimited(getClientKey(req))) return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ code: 'GEMINI_NOT_CONFIGURED', error: 'AI service is not configured yet. The site owner must add GEMINI_API_KEY to the Vercel project and redeploy.' });
  }

  const rawPrompt = req.body?.prompt;
  if (typeof rawPrompt !== 'string' || !rawPrompt.trim()) return res.status(400).json({ error: 'A non-empty prompt is required.' });
  const prompt = fitPrompt(rawPrompt);
  const grounded = isGroundedMode(prompt);
  const sources = await buildSources(prompt);

  if (grounded && !sources.selected.length) {
    return res.status(422).json({ error: 'No matching uploaded EduNexus handout/file was found for this topic. Please choose an uploaded course/file or use a topic that exists in the website files.' });
  }

  const sourceText = sources.parts.length
    ? `\n\nLIVE UPLOADED EDU-NEXUS SOURCES\n${sources.parts.map((_, i) => `[Source ${i + 1}]`).join(' ')}\nUse the source document parts that follow as authoritative evidence.`
    : '';
  const system = `You are EduNexus AI. Be accurate, helpful and natural. When source documents are supplied, treat them as authoritative for source-grounded tasks. Never fabricate source content. ${sourceInstruction(prompt)}`;

  const contents = [{ role: 'user', parts: [{ text: `${system}\n\n${prompt}${sourceText}` }, ...sources.parts] }];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 29000);

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents, generationConfig: grounded ? { temperature: 0.25, responseMimeType: 'application/json' } : { temperature: 0.45 } })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.error) {
      console.error('Gemini provider request failed', { status: response.status, providerStatus: data?.error?.status });
      return res.status(502).json({ error: 'The AI provider could not complete the request. Check the Gemini API key, billing/quota and model access.' });
    }
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => typeof p?.text === 'string' ? p.text : '').filter(Boolean).join('\n').trim();
    if (!text) return res.status(502).json({ error: 'The AI provider returned no text.' });
    return res.status(200).json({ text, sources: sources.selected });
  } catch (error) {
    return res.status(error?.name === 'AbortError' ? 504 : 500).json({ error: error?.name === 'AbortError' ? 'The AI request timed out.' : 'The AI request failed on the server.' });
  } finally {
    clearTimeout(timeout);
  }
}
