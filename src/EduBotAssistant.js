import React, { useEffect, useRef, useState } from 'react';
import { Bot, BookOpen, ExternalLink, Loader2, MessageCircle, Mic, MicOff, Send, Volume2, VolumeX, X } from 'lucide-react';
import { assemblePublicKnowledge, EDUNEXUS_GROUP, fetchPublicKnowledge, makeEduBotPrompt, SITE_GUIDE } from './edubotKnowledge';
import './edubot-assistant.css';

const HELLO = { role: 'ai', text: 'Assalam-o-Alaikum! I am EduBot. Ask me about EduNexus, study resources, quizzes, or how to join our WhatsApp group. Roman Urdu, Urdu and English are welcome. You can also use the microphone if your browser supports it.' };
const MAX_MESSAGES = 24;
const speechApi = () => typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
const pageName = () => {
  try {
    const page = new URLSearchParams(window.location.search).get('page') || 'home';
    return SITE_GUIDE.find(item => item.url.endsWith('page=' + page))?.name || page;
  } catch (_) { return 'unknown'; }
};
const humanError = (error) => error?.name === 'AbortError'
  ? 'The AI request timed out. Please try again.'
  : /Failed to fetch|NetworkError/i.test(error?.message || '') ? 'Cannot connect to the EduNexus AI service. Check your connection.'
    : String(error?.message || 'AI is temporarily unavailable.').slice(0, 240);

export default function EduBotAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [interim, setInterim] = useState('');
  const [messages, setMessages] = useState([HELLO]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [language, setLanguage] = useState('ur-PK');
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const speechRef = useRef(null);
  const requestRef = useRef(null);
  const bottomRef = useRef(null);
  const openRef = useRef(open);
  openRef.current = open;
  const canListen = Boolean(speechApi());
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stopSpeech = () => {
    if (canSpeak) window.speechSynthesis.cancel();
    setSpeaking(false);
  };
  const stopListening = () => {
    if (speechRef.current) {
      try { speechRef.current.abort(); } catch (_) {}
      speechRef.current = null;
    }
    setListening(false);
    setInterim('');
  };
  const speak = (text) => {
    if (!canSpeak) { setVoiceError('Speech output is not supported by this browser.'); return; }
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(String(text || '').slice(0, 2500));
    utterance.lang = language;
    utterance.rate = 0.95;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = utterance.onerror = () => setSpeaking(false);
    try { window.speechSynthesis.speak(utterance); }
    catch (_) { setVoiceError('Speech output is unavailable on this device.'); }
  };

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, busy, open]);
  useEffect(() => {
    if (!open) {
      if (speechRef.current) { try { speechRef.current.abort(); } catch (_) {} speechRef.current = null; }
      if (canSpeak) window.speechSynthesis.cancel();
    }
  }, [open, canSpeak]);
  useEffect(() => () => {
    if (requestRef.current) requestRef.current.abort();
    if (speechRef.current) { try { speechRef.current.abort(); } catch (_) {} }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const toggleListening = () => {
    setVoiceError('');
    if (listening) { stopListening(); return; }
    const Recognition = speechApi();
    if (!Recognition) { setVoiceError('Your browser does not support speech recognition. Please type your question or try Chrome.'); return; }
    // Must be triggered by a user gesture. Browser permission is requested by
    // the browser itself; audio is not saved or uploaded by EduNexus.
    const recognition = new Recognition();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let finalText = '', partial = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript || '';
        if (result.isFinal) finalText += text + ' ';
        else partial += text + ' ';
      }
      if (finalText.trim()) setInput(prev => (prev.trim() + ' ' + finalText.trim()).trim().slice(0, 1800));
      setInterim(partial.trim());
    };
    recognition.onerror = (event) => {
      const messages = {
        'not-allowed': 'Microphone permission was denied. Allow microphone access in your browser and try again.',
        'no-speech': 'No speech detected. Please try speaking again.',
        'audio-capture': 'No microphone detected on this device.',
        'network': 'Speech recognition could not connect. Type your question or retry.'
      };
      setVoiceError(messages[event.error] || 'Voice input stopped. Please try again.');
      setListening(false); setInterim('');
    };
    recognition.onend = () => { if (speechRef.current === recognition) speechRef.current = null; setListening(false); setInterim(''); };
    speechRef.current = recognition;
    try { recognition.start(); setListening(true); }
    catch (_) { speechRef.current = null; setListening(false); setVoiceError('Microphone could not start. Try again or type your question.'); }
  };

  const send = async (textOverride) => {
    const question = String(textOverride || input).trim().slice(0, 1800);
    if (!question || busy) return;
    stopListening(); stopSpeech(); setVoiceError('');
    const next = [...messages.slice(-(MAX_MESSAGES - 2)), { role: 'user', text: question }];
    setMessages(next);
    setInput(''); setInterim(''); setBusy(true);
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 26000);
    try {
      // Deliberately fetch ONLY explicitly public Firestore collections.
      // WhatsApp group messages, private student data and admin records are
      // not available to this assistant.
      const records = await fetchPublicKnowledge();
      const knowledge = assemblePublicKnowledge(records, question, pageName());
      const response = await fetch('/api/gemini', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: makeEduBotPrompt(question, next, knowledge) }),
        signal: controller.signal
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'AI service returned HTTP ' + response.status + '.');
      if (typeof body.text !== 'string' || !body.text.trim()) throw new Error('No answer was returned. Try again.');
      const reply = body.text.slice(0, 4500);
      if (!controller.signal.aborted) {
        setMessages(prev => [...prev.slice(-(MAX_MESSAGES - 1)), { role: 'ai', text: reply }]);
        if (autoSpeak && openRef.current) speak(reply);
      }
    } catch (error) {
      if (!controller.signal.aborted || error?.name === 'AbortError') {
        setMessages(prev => [...prev.slice(-(MAX_MESSAGES - 1)), { role: 'ai', text: humanError(error) }]);
      }
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) requestRef.current = null;
      setBusy(false);
    }
  };

  return <div className="edx-bot-root">
    <div className="edx-bot-fab">
      <a href={EDUNEXUS_GROUP} target="_blank" rel="noopener noreferrer"
        className="edx-bot-group-button" aria-label="Open the EduNexus WhatsApp group" title="EduNexus WhatsApp group"><MessageCircle size={25}/></a>
      <button type="button" className="edx-bot-open-button" onClick={() => setOpen(v => !v)}
        aria-expanded={open} aria-controls="edx-bot-chat" aria-label={open ? 'Close EduBot' : 'Open EduBot'}><Bot size={24}/></button>
    </div>
    {open && <section id="edx-bot-chat" className="edx-bot-panel" role="dialog" aria-label="EduBot study assistant">
      <header className="edx-bot-heading">
        <div><strong><Bot size={19}/> EduBot AI</strong><span>EduNexus guide · text and optional voice</span></div>
        <button type="button" onClick={() => { stopListening(); stopSpeech(); setOpen(false); }} aria-label="Close chat"><X size={20}/></button>
      </header>
      <nav className="edx-bot-shortcuts" aria-label="EduNexus quick links">
        <a href="/?page=academic"><BookOpen size={14}/> Academic Hub</a>
        <a href="/?page=exam-prep">Exam Prep</a>
        <a href={EDUNEXUS_GROUP} target="_blank" rel="noopener noreferrer">WhatsApp <ExternalLink size={13}/></a>
      </nav>
      <div className="edx-bot-conversation" role="log" aria-live="polite" aria-relevant="additions text">
        {messages.map((message, index) => <div key={index} className={'edx-bot-message ' + message.role}>
          <p>{message.text}</p>
          {message.role === 'ai' && canSpeak && <button type="button" className="edx-bot-speak"
            onClick={() => speaking ? stopSpeech() : speak(message.text)}
            title={speaking ? 'Stop speaking' : 'Read aloud'} aria-label={speaking ? 'Stop speaking' : 'Read response aloud'}>
            {speaking ? <VolumeX size={15}/> : <Volume2 size={15}/>} {speaking ? 'Stop' : 'Listen'}
          </button>}
        </div>)}
        {busy && <p className="edx-bot-thinking" role="status"><Loader2 size={15}/> Finding an answer…</p>}
        <div ref={bottomRef}/>
      </div>
      <div className="edx-bot-tools">
        <label>Voice language <select value={language} onChange={(e) => { stopListening(); stopSpeech(); setLanguage(e.target.value); }}>
          <option value="ur-PK">Urdu (Pakistan)</option><option value="en-US">English</option><option value="hi-IN">Hindi</option>
        </select></label>
        <label className="edx-bot-autospeak"><input type="checkbox" checked={autoSpeak} onChange={e => { setAutoSpeak(e.target.checked); if (!e.target.checked) stopSpeech(); }} disabled={!canSpeak}/> Read replies aloud</label>
      </div>
      {(interim || voiceError) && <p className={'edx-bot-voice-hint' + (voiceError ? ' error' : '')} role="status">{voiceError || ('Listening: ' + interim)}</p>}
      <form className="edx-bot-compose" onSubmit={e => { e.preventDefault(); void send(); }}>
        <button type="button" aria-label={listening ? 'Stop listening' : 'Speak your question'} title={listening ? 'Stop microphone' : 'Speak your question'}
          disabled={!canListen || busy} className={'edx-bot-mic ' + (listening ? 'active' : '')} onClick={toggleListening}>
          {listening ? <MicOff size={19}/> : <Mic size={19}/>}
        </button>
        <textarea aria-label="Message EduBot" placeholder="Ask in English, Urdu or Roman Urdu…" rows={2}
          value={input} maxLength={1800} disabled={busy}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}/>
        <button type="submit" className="edx-bot-send" disabled={!input.trim() || busy} aria-label="Send message"><Send size={18}/></button>
      </form>
      <p className="edx-bot-disclaimer">Website answers use limited public data. Private WhatsApp group chats are not accessible. Voice depends on browser permissions and support.</p>
    </section>}
  </div>;
}
