import fs from 'node:fs';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const exists = (file) => fs.existsSync(file);
const failures = [];

const pkg = readJson('package.json');
const lock = readJson('package-lock.json');

if (pkg.dependencies?.['@testing-library/user-event'] !== '^13.5.0') {
  failures.push('package.json must use the published @testing-library/user-event range ^13.5.0.');
}
if (lock.packages?.['']?.dependencies?.['@testing-library/user-event'] !== '^13.5.0') {
  failures.push('package-lock.json root dependency must stay aligned with package.json for @testing-library/user-event.');
}

const requiredFiles = [
  'src/App.js',
  'src/LegalContactPages.js',
  'src/ProfessionalAIAssistantV2.js',
  'src/responsive-hardening.css',
  'src/ui-layer-fix.css',
  'src/firebase-console.js',
  'scripts/secure-production-build.mjs',
  'api/gemini.mjs',
  'public/sw.js',
  'firestore.rules',
  'storage.rules',
  'vercel.json',
];
for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`Required production file is missing: ${file}`);
}

const geminiApi = fs.readFileSync('api/gemini.mjs', 'utf8');
if (/process\.env\.REACT_APP_GEMINI_API_KEY/.test(geminiApi)) {
  failures.push('api/gemini.mjs must not accept a REACT_APP_GEMINI_API_KEY fallback; Gemini credentials must remain server-side.');
}
if (!/process\.env\.GEMINI_API_KEY/.test(geminiApi)) {
  failures.push('api/gemini.mjs must read GEMINI_API_KEY server-side.');
}
if (!geminiApi.includes('GEMINI_NOT_CONFIGURED')) {
  failures.push('api/gemini.mjs must return a distinct configuration status when GEMINI_API_KEY is missing.');
}

const legal = fs.readFileSync('src/LegalContactPages.js', 'utf8');
for (const required of ['a.m.a63425@gmail.com', '0309-8851445', 'https://mail.google.com/mail/?view=cm']) {
  if (!legal.includes(required)) failures.push(`Legal/contact pages are missing required support detail: ${required}`);
}

const rules = fs.readFileSync('firestore.rules', 'utf8');
if (!rules.includes("request.auth.token.email_verified == true")) {
  failures.push('Firestore rules must require verified admin email for privileged writes.');
}

const sw = fs.readFileSync('public/sw.js', 'utf8');
if (!sw.includes("edunexus-static-v3") || !sw.includes('Network-first prevents an old CRA bundle')) {
  failures.push('public/sw.js must use the current cache version and network-first asset strategy.');
}

const buildScript = fs.readFileSync('scripts/secure-production-build.mjs', 'utf8');
if (!buildScript.includes("getFirestore,collection,getDocs")) {
  failures.push('Production build hardening must patch the global AI assistant to reuse the shared Firestore instance.');
}
if (!buildScript.includes('const aiFile =')) {
  failures.push('Production build hardening must include the global AI lifecycle patch.');
}

if (failures.length) {
  console.error('EduNexus production preflight FAILED:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('EduNexus production preflight passed: dependency, security, legal/contact, AI lifecycle and cache checks are aligned.');
