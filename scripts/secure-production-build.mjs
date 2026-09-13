import fs from 'node:fs';

const file = 'src/App.js';
let source = fs.readFileSync(file, 'utf8');

source = source.replace("import { initializeApp } from 'firebase/app';", "import { getApp, getApps, initializeApp } from 'firebase/app';");
source = source.replace("getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot,", "initializeFirestore, collection, addDoc, query, orderBy, limit, onSnapshot,");
source = source.replace('const app = initializeApp(firebaseConfig);', "const app = getApps().length ? getApp() : initializeApp(firebaseConfig);");
source = source.replace('const db = getFirestore(app);', "const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true, useFetchStreams: false });");

source = source.replace(/const apiKey = process\.env\.REACT_APP_GEMINI_API_KEY[^\n]*\n/g, '');
source = source.replace(/const ADMIN_PASSWORD =\s*process\.env\.REACT_APP_ADMIN_PASSWORD \|\|\s*[^;]+;\s*\n?/g, '');
source = source.replace(/const ADMIN_EMAIL =\s*process\.env\.REACT_APP_ADMIN_EMAIL \|\|\s*"veducator4@gmail\.com";/g, 'const ADMIN_EMAIL = "veducator4@gmail.com";');
source = source.replace('if (u?.email === ADMIN_EMAIL) setIsAdminMode(true);', 'if (u?.email === ADMIN_EMAIL && u?.emailVerified === true) setIsAdminMode(true);');

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
      if (!credential.user.emailVerified) {
        await signOut(auth);
        await signInAnonymously(auth);
        throw new Error("Admin email must be verified before access is granted.");
      }
      setIsAdminMode(true);
      setPage("admin");
      showToast("Admin mode enabled securely.", "success");
      onClose();
    } catch (error) {
      showToast(error?.message || "Invalid admin credentials.", "error");
    } finally {
      setLoading(false);
    }
  };

`;
    source = source.slice(0, handlerStart) + newHandler + source.slice(returnStart);
  }
}

if (!source.includes("./LegalContactPages")) {
  source = source.replace("import React, { useState, useEffect, useRef, useMemo } from 'react';", "import React, { useState, useEffect, useRef, useMemo } from 'react';\nimport { AboutUs, ContactUs, PrivacyPage, TermsPage } from './LegalContactPages';");
}
source = source.replace('const AboutUs =', 'const AboutUsLegacy =');
source = source.replace('const ContactUs =', 'const ContactUsLegacy =');
source = source.replace('const PrivacyPage =', 'const PrivacyPageLegacy =');
source = source.replace('const TermsPage =', 'const TermsPageLegacy =');
source = source.replace(/support@edunexus\.app/g, 'a.m.a63425@gmail.com');

fs.writeFileSync(file, source);

// Harden the globally mounted AI assistant without changing its feature set.
// App.js already initializes Firestore with the transport settings, so the AI
// component must reuse that instance instead of initializing Firestore twice.
const aiFile = 'src/ProfessionalAIAssistantV2.js';
if (fs.existsSync(aiFile)) {
  let ai = fs.readFileSync(aiFile, 'utf8');
  ai = ai.replace(
    "import {initializeFirestore,collection,getDocs,limit,orderBy,query,doc,getDoc,setDoc,serverTimestamp} from 'firebase/firestore';",
    "import {getFirestore,collection,getDocs,limit,orderBy,query,doc,getDoc,setDoc,serverTimestamp} from 'firebase/firestore';"
  );
  ai = ai.replace(
    "db=initializeFirestore(app,{experimentalAutoDetectLongPolling:true,useFetchStreams:false});",
    "db=getFirestore(app);"
  );
  ai = ai.replace(
    "const [messages,setMessages]=useState([{role:'ai',text:'Hi! I’m EduNexus AI. I can help you study, navigate EduNexus and plan your work.'}]),end=useRef(null);const key=useMemo",
    "const [messages,setMessages]=useState([{role:'ai',text:'Hi! I’m EduNexus AI. I can help you study, navigate EduNexus and plan your work.'}]),end=useRef(null),mounted=useRef(true);const key=useMemo"
  );
  ai = ai.replace(
    "useEffect(()=>onAuthStateChanged(auth,async u=>{setUser(u);if(u){const c=await contextFor(u);setCtx(c);try{const old=JSON.parse(localStorage.getItem(`edx-ai-context-${u.uid}`)||'null');if(old?.messages?.length)setMessages(old.messages.slice(-30))}catch(e){}}}),[]);",
    "useEffect(()=>{mounted.current=true;const unsubscribe=onAuthStateChanged(auth,u=>{if(!mounted.current)return;setUser(u);if(!u)return;contextFor(u).then(c=>{if(!mounted.current)return;setCtx(c);try{const old=JSON.parse(localStorage.getItem(`edx-ai-context-${u.uid}`)||'null');if(old?.messages?.length)setMessages(old.messages.slice(-30))}catch(e){}}).catch(()=>{})});return()=>{mounted.current=false;unsubscribe()}},[]);"
  );
  fs.writeFileSync(aiFile, ai);
}

console.log('EduNexus production security, page and AI lifecycle hardening applied.');
