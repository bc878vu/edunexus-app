import fs from 'node:fs';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const exists = (file) => fs.existsSync(file);

const pkg = readJson('package.json');
const lock = readJson('package-lock.json');
const failures = [];

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

const legal = fs.readFileSync('src/LegalContactPages.js', 'utf8');
for (const required of ['a.m.a63425@gmail.com', '0309-8851445', 'https://mail.google.com/mail/?view=cm']) {
  if (!legal.includes(required)) failures.push(`Legal/contact pages are missing required support detail: ${required}`);
}

const rules = fs.readFileSync('firestore.rules', 'utf8');
if (!rules.includes("request.auth.token.email_verified == true")) {
  failures.push('Firestore rules must require verified admin email for privileged writes.');
}

if (failures.length) {
  console.error('EduNexus production preflight FAILED:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('EduNexus production preflight passed: dependency, security, legal/contact and required-file checks are aligned.');
