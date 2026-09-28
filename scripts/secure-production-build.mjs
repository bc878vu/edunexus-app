import fs from 'node:fs';

const file = 'src/App.js';
let source = fs.readFileSync(file, 'utf8');

// Firebase must be initialized once, and Firestore should use a transport that
// is reliable in restricted/mobile/Vercel browser environments.
source = source.replace(/import\s*\{\s*initializeApp\s*\}\s*from\s*['"]firebase\/app['"];?/m, "import { getApp, getApps, initializeApp } from 'firebase/app';");
source = source.replace(/const app\s*=\s*initializeApp\(firebaseConfig\);/m, "const app = getApps().length ? getApp() : initializeApp(firebaseConfig);");
// Reuse the Firestore instance initialized in firebase-client, imported by ExamPrepHub.

// Gemini credentials must never be bundled into the browser.
source = source.replace(/^[ \t]*const apiKey\s*=\s*process\.env\.REACT_APP_GEMINI_API_KEY[^\n]*\n?/gm, '');
source = source.replace(/^[ \t]*const ADMIN_PASSWORD\s*=\s*process\.env\.REACT_APP_ADMIN_PASSWORD\s*\|\|\s*[^;]+;\s*\n?/gm, '');





// Authentication is maintained in src/App.js and adminSession.js. Never
// regenerate AdminLogin during a build: rewriting it would silently undo the
// actual Firebase signOut, cross-tab logout and verified-session safeguards.

if (!source.includes("from './LegalContactPages'")) {
  source = source.replace("import React, { useState, useEffect, useRef, useMemo } from 'react';", "import React, { useState, useEffect, useRef, useMemo } from 'react';\nimport { AboutUs, ContactUs, PrivacyPage, TermsPage } from './LegalContactPages';");
}
source = source.replace('const AboutUs =', 'const AboutUsLegacy =');
source = source.replace('const ContactUs =', 'const ContactUsLegacy =');
source = source.replace('const PrivacyPage =', 'const PrivacyPageLegacy =');
source = source.replace('const TermsPage =', 'const TermsPageLegacy =');
source = source.replace(/support@edunexus\.app/g, 'a.m.a63425@gmail.com');
fs.writeFileSync(file, source);

// The AI assistant is mounted globally alongside App.js. It must reuse the same
// Firestore instance instead of calling initializeFirestore() a second time.
const aiFile = 'src/ProfessionalAIAssistantV2.js';
if (fs.existsSync(aiFile)) {
  let ai = fs.readFileSync(aiFile, 'utf8');
  ai = ai.replace(/initializeFirestore,\s*/g, 'getFirestore, ');
  ai = ai.replace(/db=initializeFirestore\(app,\{experimentalAutoDetectLongPolling:true,useFetchStreams:false\}\)/g, 'db=getFirestore(app)');
  ai = ai.replace(/useEffect\(\(\)=>onAuthStateChanged\(auth,async u=>\{setUser\(u\);if\(u\)\{const c=await contextFor\(u\);setCtx\(c\);try\{const old=JSON\.parse\(localStorage\.getItem\(`edx-ai-context-\$\{u\.uid\}`\)\|\|'null'\);if\(old\?\.messages\?\.length\)setMessages\(old\.messages\.slice\(-30\)\)\}catch\(e\)\{\}\}\}\),\[\]\);/g, "useEffect(()=>{let alive=true;const unsubscribe=onAuthStateChanged(auth,u=>{setUser(u);if(!u)return;contextFor(u).then(c=>{if(!alive)return;setCtx(c);try{const old=JSON.parse(localStorage.getItem(`edx-ai-context-${u.uid}`)||'null');if(old?.messages?.length)setMessages(old.messages.slice(-30))}catch(e){}}).catch(()=>{})});return()=>{alive=false;unsubscribe()}},[]);");
  fs.writeFileSync(aiFile, ai);
}

// Post-mutation production safeguards. The app now routes data/auth through
// the adapter layer (src/db/*), so these checks validate the safeguards
// across App.js, the auth adapter and the Firebase client — not just App.js.
const authAdapter = fs.existsSync('src/db/auth.js') ? fs.readFileSync('src/db/auth.js', 'utf8') : '';
const firebaseClient = fs.existsSync('src/firebase-client.js') ? fs.readFileSync('src/firebase-client.js', 'utf8') : '';
const combined = source + '\n' + authAdapter + '\n' + firebaseClient;
const checks = [
  [/getApps\(\)\.length \? getApp\(\) : initializeApp\(firebaseConfig\)/, 'Firebase singleton initialization'],
  [/from ['"]\.\/firebase-client['"]/, 'shared Firebase client (db/auth)'],
  [/signInWithEmailAndPassword\(auth,/, 'Firebase admin authentication'],
  [/adminPanelAccess\(\w+\)/, 'verified admin session scoped to the active panel'],
  [/browserSessionPersistence/, 'tab-scoped Firebase auth persistence'],
  [/fbSignOut\(auth\)|await signOut\(auth\)/, 'real Firebase sign-out'],
  [/broadcastAdminLogout\(\)/, 'cross-tab admin logout'],
  [/sendEmailVerification\(/, 'admin email verification flow'],
  [/from ['"]\.\/LegalContactPages['"]/, 'detailed legal/contact pages'],
];
const failures = checks.filter(([pattern]) => !pattern.test(combined)).map(([, label]) => label);
if (/const handleLogoutAdmin\s*=\s*\(\)\s*=>\s*\{\s*setIsAdminMode\(false\)/.test(source)) failures.push('legacy React-only logout returned');
if (/setIsAdminMode\(true\);\s*setPage\("admin"\)/.test(source)) failures.push('legacy unguarded admin login returned');

if (/REACT_APP_GEMINI_API_KEY/.test(source) || /ADMIN_PASSWORD/.test(source)) failures.push('browser-exposed admin/Gemini secrets');
if (failures.length) {
  console.error(`EduNexus production hardening FAILED: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('EduNexus production Firebase, admin-auth, email-verification, AI lifecycle and legal-page hardening applied.');
