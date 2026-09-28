import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Send, X, Sparkles, Loader2, BookOpen } from 'lucide-react';
import { onAuthChange } from './db/auth';
import { getUserProfile, saveUserProfile } from './db/userProfiles';
import { listArticles } from './db/articles';
import { listHighlights } from './db/highlights';
import { listTutorials } from './db/tutorials';

const safe = (v, n = 900) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, n);

async function contextFor(user) {
  const c = { name: user?.displayName || '', page: window.location.pathname, articles: [], highlights: [], tutorials: [] };
  if (!user) return c;
  try {
    const profile = await getUserProfile(user.uid);
    if (profile) Object.assign(c, profile);
    const n = safe(c.name || c.fullName || c.displayName, 80);
    if (n) {
      c.name = n;
      await saveUserProfile(user.uid, { displayName: n, email: user.email || '' });
    }
  } catch (e) {}
  const loaders = [
    ['articles', listArticles],
    ['highlights', listHighlights],
    ['tutorials', listTutorials],
  ];
  for (const [name, load] of loaders) {
    try {
      const items = await load({ limit: 8 });
      c[name] = items.map((d) => ({
        title: safe(d.title || d.name, 140),
        description: safe(d.description || d.content || d.text, 360),
      }));
    } catch (e) {}
  }
  return c;
}

function prompt(q, c, h) {
  const k = ['articles', 'highlights', 'tutorials'].map((x) => `${x}: ${JSON.stringify(c[x] || [])}`).join('\n');
  return `You are EduNexus AI, the concise and reliable study assistant inside EduNexus. Answer first, then give practical steps when useful. Be accurate and never invent app data. You understand the whole public EduNexus feature set. Use the supplied app knowledge when relevant. Keep answers short unless detail is requested. Never expose passwords, API keys, tokens or another user's private information.\nStudent name: ${safe(c.name || 'Student', 80)}\nCurrent page: ${safe(c.page, 160)}\nPublic app knowledge:\n${k}\nRecent chat:\n${h.map((m) => `${m.role}: ${safe(m.text, 700)}`).join('\n')}\nUser: ${safe(q, 3000)}\nReturn only the helpful answer.`;
}

export default function ProfessionalAIAssistantV2() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [ctx, setCtx] = useState({ name: '', articles: [], highlights: [], tutorials: [] });
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hi! I’m EduNexus AI. I can help you study, navigate EduNexus and plan your work.' },
  ]);
  const end = useRef(null);
  const key = useMemo(() => `edx-ai-chat-${user?.uid || 'guest'}`, [user]);

  useEffect(() => {
    let alive = true;
    let unsubscribe = () => {};
    const handleAuth = async (u) => {
      if (!alive) return;
      setUser(u);
      if (!u) return;
      try {
        const c = await contextFor(u);
        if (!alive) return;
        setCtx(c);
        try {
          const old = JSON.parse(localStorage.getItem(`edx-ai-context-${u.uid}`) || 'null');
          if (old?.messages?.length) setMessages(old.messages.slice(-30));
        } catch (e) {}
      } catch (e) {}
    };
    try {
      const maybeUnsubscribe = onAuthChange((u) => { void handleAuth(u); });
      if (typeof maybeUnsubscribe === 'function') unsubscribe = maybeUnsubscribe;
    } catch (e) {}
    return () => {
      alive = false;
      try { unsubscribe(); } catch (e) {}
    };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(messages.slice(-30))); } catch (e) {}
  }, [key, messages]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const name = ctx.name || user?.displayName || 'Student';

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    const next = [...messages, { role: 'user', text: q }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt(q, ctx, next.slice(-8)) }),
      });
      let data = {};
      try { data = await res.json(); } catch (e) {}
      if (!res.ok) throw new Error(data.error || `AI service returned ${res.status}`);
      setMessages((v) => [...v, { role: 'ai', text: data.text || 'I could not generate an answer right now.' }]);
    } catch (e) {
      setMessages((v) => [...v, { role: 'ai', text: `AI is unavailable right now. ${safe(e?.message || 'Please try again shortly.', 180)}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`edx-pro-ai ${open ? 'is-open' : ''}`}>
      {open && (
        <section className='edx-pro-ai-panel' aria-label='EduNexus AI assistant'>
          <header className='edx-pro-ai-head'>
            <div>
              <strong><Sparkles size={16} /> EduNexus AI</strong>
              <span>{name !== 'Student' ? `Personalized for ${name}` : 'Study assistant'}</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label='Close AI'><X size={18} /></button>
          </header>
          <div className='edx-pro-ai-context'><BookOpen size={15} /> App-aware • concise • remembers your chat</div>
          <div className='edx-pro-ai-messages'>
            {messages.map((m, i) => (
              <div className={`edx-pro-msg ${m.role}`} key={i}>
                {m.role === 'ai' && <Bot size={15} />}
                <span>{m.text}</span>
              </div>
            ))}
            {loading && (
              <div className='edx-pro-msg ai'><Loader2 size={15} className='edx-spin' /><span>Thinking…</span></div>
            )}
            <div ref={end} />
          </div>
          <div className='edx-pro-ai-input'>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
              placeholder={`Ask EduNexus AI${name !== 'Student' ? `, ${name}` : ''}…`}
              maxLength={3000}
            />
            <button onClick={() => void send()} disabled={!input.trim() || loading} aria-label='Send'><Send size={17} /></button>
          </div>
        </section>
      )}
      <button className='edx-pro-ai-toggle' onClick={() => setOpen((v) => !v)} aria-label='Open EduNexus AI'>
        <span className='edx-ai-pulse' />
        <Bot size={25} />
        {!open && <span className='edx-ai-label'>AI</span>}
      </button>
    </div>
  );
}
