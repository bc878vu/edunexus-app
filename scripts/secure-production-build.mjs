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
source = source.replace(/const ADMIN_EMAIL\s*=\s*process\.env\.REACT_APP_ADMIN_EMAIL\s*\|\|\s*["']veducator4@gmail\.com["'];/m, 'const ADMIN_EMAIL = "veducator4@gmail.com";');
source = source.replace(/if\s*\(u\?\.email\s*===\s*ADMIN_EMAIL\)\s*setIsAdminMode\(true\);/, 'if (u?.email === ADMIN_EMAIL && u?.emailVerified === true) setIsAdminMode(true);');

// Add verification helpers to the existing Firebase Auth import.
source = source.replace(/signInWithEmailAndPassword\s*\n?\s*\}/m, 'signInWithEmailAndPassword, sendEmailVerification\n}');

// Replace the legacy client-side password comparison with Firebase Auth.
const adminStart = source.indexOf('const AdminLogin =');
if (adminStart !== -1) {
  const handlerStart = source.indexOf('  const handleSubmit =', adminStart);
  const returnStart = source.indexOf('  return (', handlerStart);
  if (handlerStart !== -1 && returnStart !== -1) {
    const newHandler = `  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      showToast("Email and password required.", "error");
      return;
    }
    setLoading(true);
    try {
      const enteredEmail = email.trim().toLowerCase();
      if (enteredEmail !== ADMIN_EMAIL.toLowerCase()) throw new Error("Invalid admin credentials.");
      const credential = await signInWithEmailAndPassword(auth, enteredEmail, password);
      await credential.user.reload();
      if (!credential.user.emailVerified) {
        await sendEmailVerification(credential.user);
        await signOut(auth);
        await signInAnonymously(auth);
        throw new Error("Verification email sent to the admin address. Open it, verify your email, then sign in again.");
      }
      setIsAdminMode(true);
      setPage("admin");
      showToast("Admin mode enabled securely.", "success");
      onClose();
    } catch (error) {
      const code = error?.code || "";
      const message = code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found"
        ? "Invalid admin email or password."
        : (error?.message || "Admin login failed.");
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

`;
    source = source.slice(0, handlerStart) + newHandler + source.slice(returnStart);
  }
}

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

const checks = [
  [/const db = getFirestore\(app\)/, 'shared Firestore instance'],
  [/getApps\(\)\.length \? getApp\(\) : initializeApp\(firebaseConfig\)/, 'Firebase singleton initialization'],
  [/signInWithEmailAndPassword\(auth, enteredEmail, password\)/, 'Firebase admin authentication'],
  [/u\?\.emailVerified === true/, 'verified admin session'],
  [/sendEmailVerification\(credential\.user\)/, 'admin email verification flow'],
  [/from ['"]\.\/LegalContactPages['"]/, 'detailed legal/contact pages'],
];
const failures = checks.filter(([pattern]) => !pattern.test(source)).map(([, label]) => label);
if (/REACT_APP_GEMINI_API_KEY/.test(source) || /ADMIN_PASSWORD/.test(source)) failures.push('browser-exposed admin/Gemini secrets');
if (failures.length) {
  console.error(`EduNexus production hardening FAILED: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('EduNexus production Firebase, admin-auth, email-verification, AI lifecycle and legal-page hardening applied.');
