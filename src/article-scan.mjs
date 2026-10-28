// src/article-scan.mjs — pre-upload content scan for EduNexus articles.
// Pure function, no network, no database. Used by the public article form
// AND by comments, before anything becomes public.
// Policy (user-approved 2026-10-28): clean => publish immediately,
// flagged => admin approval queue (never auto-rejected, never auto-published).
// Media itself is checked here only for type/size/filename; image CONTENT
// is reviewed by the admin in the approval queue (no silent AI-vision claim).
//
// Categories (keys are stable; admin UI shows these):
//   islamophobia, sexual, irrelevant, anti-country, anti-army,
//   political, personal-attack
//
// Matching is phrase-based on purpose: a bare word like "Pakistan" or
// "army" alone never flags — only hostile phrases do. This keeps legitimate
// study material (including Islamic content, which is explicitly allowed)
// from being flagged. The political category is intentionally broad per
// site policy (party/election/campaign content) — the admin can approve
// anything the scan flags in error, which is why flagged items are queued
// instead of rejected.

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const PHRASES = {
  islamophobia: [
    'islam is terrorism', 'islam is terrorist', 'muslims are terrorists',
    'quran is fake', 'prophet is fake', 'islam murdabad', 'islam ko khatam',
    'muslim murdabad', 'deen ka mazak', 'islam dushman',
  ],
  sexual: [
    'porn', 'pornography', 'sex video', 'xxx video', 'nude photo',
    'sexy video', 'adult video', 'fahash', 'behaya video',
  ],
  'anti-country': [
    'pakistan murdabad', 'pakistan ko tor', 'pakistan ko khatam',
    'down with pakistan', 'pakistan dushman', 'mulk dushman',
    'pakistan na manzoor',
  ],
  'anti-army': [
    'army murdabad', 'fauj murdabad', 'pak army murdabad',
    'down with pak army', 'army ko khatam', 'fauj dushman',
    'isi murdabad',
  ],
  political: [
    'vote for pti', 'vote for pmln', 'vote for ppp', 'vote for mqm',
    'election campaign', 'dharna', 'long march', 'pti zindabad',
    'pmln zindabad', 'ppp zindabad', 'imran khan zindabad',
    'nawaz sharif zindabad', 'bilawal zindabad',
  ],
  'personal-attack': [
    'lanat ho', 'beghairat', 'kutta', 'harami', 'chutiya',
    'teri maa', 'teri behn', 'sharam karo tum',
  ],
};

const SPAM_HINTS = [
  /(.)\1{9,}/, // long repeated-character runs
  /https?:\/\/\S+\s+https?:\/\/\S+\s+https?:\/\/\S+/, // link dumping
];

const ALLOWED_IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_IMAGE_BYTES = 1024 * 1024; // 1 MB, same as the admin cover limit

export function scanArticleContent({ title = '', body = '', imageName = '', imageBytes = 0 } = {}) {
  const text = norm(`${title} ${body}`);
  const categories = [];
  const matched = [];
  for (const [cat, phrases] of Object.entries(PHRASES)) {
    for (const p of phrases) {
      if (text.includes(p)) {
        if (!categories.includes(cat)) categories.push(cat);
        matched.push(p);
      }
    }
  }
  // Irrelevant / spam: extremely short body, or link-dump / gibberish runs.
  const plainLen = text.length;
  if ((plainLen > 0 && plainLen < 30) || SPAM_HINTS.some((re) => re.test(text))) {
    if (!categories.includes('irrelevant')) categories.push('irrelevant');
  }
  // Media checks.
  const mediaIssues = [];
  if (imageName) {
    const ext = String(imageName).split('.').pop().toLowerCase();
    if (!ALLOWED_IMAGE_EXT.includes(ext)) mediaIssues.push('unsupported image type');
    if (imageBytes > MAX_IMAGE_BYTES) mediaIssues.push('image over 1 MB');
    const fileNorm = norm(imageName);
    for (const [cat, phrases] of Object.entries(PHRASES)) {
      if (phrases.some((p) => fileNorm.includes(p)) && !categories.includes(cat)) {
        categories.push(cat);
      }
    }
  }
  return {
    status: categories.length || mediaIssues.length ? 'flagged' : 'clean',
    categories,
    matched: [...new Set(matched)],
    mediaIssues,
  };
}

export function scanCommentText(text = '') {
  return scanArticleContent({ body: text });
}
