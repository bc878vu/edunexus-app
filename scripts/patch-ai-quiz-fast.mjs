import fs from 'node:fs';

// AIQuizEnhanced now contains the hardened source-grounded implementation directly.
// Do not mutate it during every Vercel build; keeping builds deterministic prevents
// stale snapshot replacements from reintroducing regressions.
const file = 'src/AIQuizEnhanced.js';
if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
const source = fs.readFileSync(file, 'utf8');
if (!source.includes('LECTURE RANGE') || !source.includes('/api/gemini-quiz')) {
  throw new Error('Hardened AI Quiz implementation is incomplete; refusing to build.');
}
console.log('AI Quiz hardening check passed.');
