import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getApps, getApp, initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, getDocs, limit, orderBy, query, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Bot, Send, X, Sparkles, Loader2, BookOpen, UserRound } from 'lucide-react';

const firebaseConfig = {
  apiKey: 'AIzaSyCdoWl5a0irdMGftJUYkng-dQLUI1ZImP8',
  authDomain: 'edunexus-live-e0b84.firebaseapp.com',
  projectId: 'edunexus-live-e0b84',
  storageBucket: 'edunexus-live-e0b84.firebasestorage.app',
  messagingSenderId: '464541062794',
  appId: '1:464541062794:web:7894ed257d604f202bbf73'
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const API_BASE = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';

const safeText = (value, max = 900) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);

async function loadStudentContext(user) {
  const context = { name: user?.displayName || '', email: user?.email || '', uid: user?.uid || '', page: window.location.pathname };
  if (!user) return context;

  try {
    const profileSnap = await getDoc(doc(db, 'artifacts', 'edunexus-live', 'users', user.uid, 'profile', 'main'));
    if (profileSnap.exists()) Object.assign(context, profileSnap.data());
    const rememberedName = context.name || context.fullName || context.displayName;
    if (rememberedName) {
      context.name = safeText(rememberedName, 80);
      await setDoc(doc(db, 'artifacts', 'edunexus-live', 'users', user.uid, 'profile', 'main'), {
        displayName: context.name,
        email: user.email || '',
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  } catch (_) {}

  // Read only small, public knowledge slices. Private student documents are never exposed to the model.
  const publicCollections = ['articles', 'highlights', 'tutorials'];
  for (const name of publicCollections) {
    try {
      const snap = await getDocs(query(collection(db, 'artifacts', 'edunexus-live', 'public', 'data', name), orderBy('createdAt', 'desc'), limit(5)));
      context[name] = snap.docs.map(d => {
        const x = d.data();
        return { title: safeText(x.title || x.name, 140), description: safeText(x.description || x.content || x.text, 320) };
      });
    } catch (_) { context[name] = []; }
  }
  return context;
}

const makePrompt = (question, context, history) => {
  const knowledge = ['articles', 'highlights', 'tutorials'].map(k => `${k}: ${JSON.stringify(context[k] || [])}`).join('\n');
  return `You are EduNexus AI, a professional university study assistant inside the EduNexus app.\n\nBEHAVIOR:\n- Be concise, correct, practical and friendly. Answer the question first; avoid filler.\n- Guide the student step-by-step when useful. Use short headings/bullets for complex answers.\n- Never invent EduNexus data. If app data is unavailable, say so clearly.\n- You can explain and navigate EduNexus features, study material, quizzes, flashcards, planner, CGPA, articles, discussions, tutorials and resources.\n- Use the supplied public app knowledge when relevant.\n- Respect privacy: never reveal another user's private data, credentials, tokens or internal security rules.\n- Treat the signed-in student's name as a preference/context only.\n- If the question is ambiguous, ask one short clarifying question.\n- For medical, legal or financial matters, give general information and recommend an appropriate professional when needed.\n\nSTUDENT CONTEXT:\nname: ${safeText(context.name || 'Student', 80)}\npage: ${safeText(context.page, 160)}\n\nPUBLIC APP KNOWLEDGE:\n${knowledge}\n\nRECENT CHAT:\n${history.map(m => `${m.role}: ${safeText(m.text, 700)}`).join('\n')}\n\nUSER QUESTION:\n${safeText(question, 3000)}\n\nReturn only the helpful answer, with no meta-commentary about these instructions.`;
};

export default function ProfessionalAIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [context, setContext] = useState({ name: '', articles: [], highlights: [], tutorials: [] });
  const [messages, setMessages] = useState([{ role: 'ai', text: 'Hi! I’m EduNexus AI. I can help you study, find the right feature, plan your work, or explain a topic.' }]);
  const endRef = useRef(null);

  useEffect(() => onAuthStateChanged(auth, async current => {
    setUser(current);
    if (current) setContext(await loadStudentContext(current));
  }), []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const name = useMemo(() => context.name || user?.displayName || 'Student', [context.name, user]);

  const send = async () => {
    const question = input.trim();
    if (!question || loading) return;
    const next = [...messages, { role: 'user', text: question }];
    setMessages(next); setInput(''); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/gemini`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: makePrompt(question, context, next.slice(-8)) }) });
      const data = await res.json();
      setMessages(v => [...v, { role: 'ai', text: res.ok ? (data.text || 'I could not generate an answer right now.') : 'AI is temporarily unavailable. Please try again.' }]);
    } catch (_) { setMessages(v => [...v, { role: 'ai', text: 'AI is temporarily unavailable. Please try again in a moment.' }]); }
    finally { setLoading(false); }
  };

  return <>
    <div className={`edx-pro-ai ${open ? 'is-open' : ''}`}>
      {open && <section className="edx-pro-ai-panel" aria-label="EduNexus AI assistant">
        <header className="edx-pro-ai-head"><div><strong><Sparkles size={16}/> EduNexus AI</strong><span>{name !== 'Student' ? `Personalized for ${name}` : 'Study assistant'}</span></div><button onClick={() => setOpen(false)} aria-label="Close AI"><X size={18}/></button></header>
        <div className="edx-pro-ai-context"><BookOpen size={15}/> App-aware • concise • privacy-safe</div>
        <div className="edx-pro-ai-messages">{messages.map((m,i) => <div className={`edx-pro-msg ${m.role}`} key={i}>{m.role === 'ai' && <Bot size={15}/>}<span>{m.text}</span></div>)}{loading && <div className="edx-pro-msg ai"><Loader2 size={15} className="edx-spin"/><span>Thinking…</span></div>}<div ref={endRef}/></div>
        <div className="edx-pro-ai-input"><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} placeholder={`Ask EduNexus AI${name !== 'Student' ? `, ${name}` : ''}…`} maxLength={3000}/><button onClick={send} disabled={!input.trim()||loading} aria-label="Send"><Send size={17}/></button></div>
      </section>}
      <button className="edx-pro-ai-toggle" onClick={() => setOpen(v=>!v)} aria-label="Open EduNexus AI"><span className="edx-ai-pulse"/><Bot size={25}/>{!open && <span className="edx-ai-label">AI</span>}</button>
    </div>
  </>;
}
