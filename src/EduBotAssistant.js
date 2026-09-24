import React, { useEffect, useRef, useState } from 'react';
import { Bot, BookOpen, ExternalLink, Loader2, Maximize2, MessageCircle, Mic, MicOff, Minimize2, Move, Send, Volume2, VolumeX, X } from 'lucide-react';
import { assemblePublicKnowledge, EDUNEXUS_GROUP, fetchRelevantPublicKnowledge, makeEduBotPrompt, resourceSuggestions, verifiedResourceUrls, SITE_GUIDE } from './edubotKnowledge';
import { cleanEduBotText, plainSpeechText, renderableLinks } from './edubotPresentation';
import './edubot-assistant.css';

const HELLO = { role: 'ai', text: 'Assalam-o-Alaikum! CS101 ki files, quiz, exam prep ya EduNexus ke kisi feature ke baare mein pooch sakte hain. Roman Urdu, Urdu aur English samajhta hoon. Microphone se bol kar bhi question bhej sakte hain.' };
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
  const [availableVoices, setAvailableVoices] = useState([]);
  const [speakingId, setSpeakingId] = useState(null);
  const speechTokenRef = useRef(0);
  const [expanded, setExpanded] = useState(false);
  const [panelBox, setPanelBox] = useState(null);
  const gestureRef = useRef(null);
  const panelRef = useRef(null);
  const speechRef = useRef(null);
  const requestRef = useRef(null);
  const bottomRef = useRef(null);
  const openRef = useRef(open);
  openRef.current = open;
  const canListen = Boolean(speechApi());
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
  useEffect(() => {
    if (!canSpeak) return undefined;
    const refreshVoices = () => setAvailableVoices(window.speechSynthesis.getVoices());
    refreshVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', refreshVoices);
  }, [canSpeak]);
  const detectSpeechLanguage = value => {
    if (/[\u0600-\u06FF]/.test(value)) return 'ur-PK';
    if (/\b(hai|hain|kya|kaise|mujhe|aap|ap|mera|meri|nahi|nahin|batao|btao|karo|kro|chahiye|raha|rha|theek|acha)\b/i.test(value)) return 'hi-IN';
    return 'en-US';
  };
  const pickVoice = lang => {
    const voices = availableVoices.filter(voice => voice.lang.toLowerCase().split('-')[0] === lang.split('-')[0].toLowerCase());
    return voices.find(voice => /female|zira|samantha|jenny|aria|sara|heera|ayesha|neerja|susan|hazel|natasha/i.test(voice.name)) || voices.find(voice => voice.default) || voices[0] || null;
  };

  const stopSpeech = () => {
    speechTokenRef.current += 1;
    if (canSpeak) window.speechSynthesis.cancel();
    setSpeakingId(null);
  };
  const stopListening = () => {
    if (speechRef.current) {
      try { speechRef.current.abort(); } catch (_) {}
      speechRef.current = null;
    }
    setListening(false);
    setInterim('');
  };
  const speak = (text, messageId) => {
    if (!canSpeak) { setVoiceError('Speech output is not supported by this browser.'); return; }
    stopSpeech();
    const token = speechTokenRef.current;
    const speechText = plainSpeechText(text).trim();
    if (!speechText) return;
    const utterance = new window.SpeechSynthesisUtterance(speechText);
    const detectedLanguage = detectSpeechLanguage(speechText);
    const voice = pickVoice(detectedLanguage);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || detectedLanguage;
    utterance.rate = 0.92;
    utterance.pitch = 1.05;
    utterance.onstart = () => { if (speechTokenRef.current === token) setSpeakingId(messageId); };
    utterance.onend = utterance.onerror = () => { if (speechTokenRef.current === token) setSpeakingId(null); };
    setSpeakingId(messageId);
    try { window.speechSynthesis.speak(utterance); }
    catch (_) { if (speechTokenRef.current === token) setSpeakingId(null); setVoiceError('Speech output is unavailable on this device.'); }
  };

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, busy, open]);
  useEffect(() => {
    if (!open) {
      if (speechRef.current) { try { speechRef.current.abort(); } catch (_) {} speechRef.current = null; }
      if (canSpeak) window.speechSynthesis.cancel();
      speechTokenRef.current += 1;
      setSpeakingId(null);
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

  const startPointer = (event, kind) => {
    if (event.button !== 0 || expanded || !panelRef.current) return;
    if (kind === 'drag' && event.target.closest('button, a, input, select')) return;
    const rect = panelRef.current.getBoundingClientRect();
    gestureRef.current = { kind, x: event.clientX, y: event.clientY,
      left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };
  const movePointer = event => {
    const start = gestureRef.current;
    if (!start || expanded) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (start.kind === 'drag') {
      setPanelBox({ left: Math.max(8, Math.min(window.innerWidth - start.width - 8, start.left + dx)),
        top: Math.max(8, Math.min(window.innerHeight - start.height - 8, start.top + dy)),
        width: start.width, height: start.height });
    } else {
      setPanelBox({ left: start.left, top: start.top,
        width: Math.max(300, Math.min(window.innerWidth - start.left - 8, start.width + dx)),
        height: Math.max(320, Math.min(window.innerHeight - start.top - 8, start.height + dy)) });
    }
  };
  const endPointer = event => {
    if (!gestureRef.current) return;
    gestureRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  useEffect(() => {
    const clampPanel = () => setPanelBox(current => current ? {
      width: Math.min(current.width, window.innerWidth - 16),
      height: Math.min(current.height, window.innerHeight - 16),
      left: Math.max(8, Math.min(current.left, window.innerWidth - Math.min(current.width, window.innerWidth - 16) - 8)),
      top: Math.max(8, Math.min(current.top, window.innerHeight - Math.min(current.height, window.innerHeight - 16) - 8))
    } : null);
    window.addEventListener('resize', clampPanel);
    return () => window.removeEventListener('resize', clampPanel);
  }, []);
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
      const records = await fetchRelevantPublicKnowledge(question);
      const knowledge = assemblePublicKnowledge(records, question, pageName());
      const allowed = verifiedResourceUrls(records);
      const suggestions = resourceSuggestions(records, question);
      const response = await fetch('/api/gemini', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: makeEduBotPrompt(question, next, knowledge) }),
        signal: controller.signal
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'AI service returned HTTP ' + response.status + '.');
      if (typeof body.text !== 'string' || !body.text.trim()) throw new Error('No answer was returned. Try again.');
      const reply = cleanEduBotText(body.text.slice(0, 4500));
      if (!controller.signal.aborted) {
        setMessages(prev => [...prev.slice(-(MAX_MESSAGES - 1)), { role: 'ai', text: reply, approvedUrls: allowed, suggestions }]);
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
    {open && <section ref={panelRef} id="edx-bot-chat" className={'edx-bot-panel' + (expanded ? ' edx-bot-expanded' : '')} role="dialog" aria-label="EduBot study assistant" style={!expanded && panelBox ? { left: panelBox.left, top: panelBox.top, width: panelBox.width, height: panelBox.height, right: 'auto', bottom: 'auto' } : undefined}>
      <header className="edx-bot-heading" onPointerDown={e => startPointer(e, 'drag')} onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={endPointer} title="Drag to move EduBot">
        <div><strong><Bot size={19}/> EduBot AI <Move size={14} aria-hidden="true"/></strong><span>EduNexus guide · drag this header to move</span></div>
        <div className="edx-bot-heading-actions">
          <button type="button" onClick={() => { gestureRef.current = null; setExpanded(v => !v); }} aria-label={expanded ? "Restore chat size" : "Expand chat"} title={expanded ? "Restore" : "Expand"}>{expanded ? <Minimize2 size={19}/> : <Maximize2 size={19}/>}</button>
          <button type="button" onClick={() => { stopListening(); stopSpeech(); setOpen(false); }} aria-label="Close chat"><X size={20}/></button>
        </div>
      </header>
      <nav className="edx-bot-shortcuts" aria-label="EduNexus quick links">
        <a href="/?page=academic"><BookOpen size={14}/> Academic Hub</a>
        <a href="/?page=exam-prep">Exam Prep</a>
        <a href={EDUNEXUS_GROUP} target="_blank" rel="noopener noreferrer">WhatsApp <ExternalLink size={13}/></a>
      </nav>
      <div className="edx-bot-conversation" role="log" aria-live="polite" aria-relevant="additions text">
        {messages.map((message, index) => <div key={index} className={'edx-bot-message ' + message.role}>
          <p>{renderableLinks(message.text, message.approvedUrls || []).map((chunk, part) => chunk.url ? <a key={part} href={chunk.url} target="_blank" rel="noopener noreferrer">{chunk.text}<ExternalLink size={12} aria-hidden="true"/></a> : <React.Fragment key={part}>{chunk.text}</React.Fragment>)}</p>
          {message.suggestions?.length > 0 && <div className="edx-bot-resources" aria-label="Verified public study resources"><strong>Available public resources</strong>{message.suggestions.map((file, i) => <a key={file.url + i} href={file.url} target="_blank" rel="noopener noreferrer"><BookOpen size={14}/>{file.title || file.subject || 'Study resource'} <ExternalLink size={13}/></a>)}</div>}
          {message.role === 'ai' && canSpeak && <button type="button" className="edx-bot-speak"
            onClick={() => speakingId === index ? stopSpeech() : speak(message.text, index)}
            title={speakingId === index ? 'Stop this response' : 'Read this response aloud'} aria-label={speakingId === index ? 'Stop this response' : 'Read this response aloud'} aria-pressed={speakingId === index}>
            {speakingId === index ? <VolumeX size={15}/> : <Volume2 size={15}/>} {speakingId === index ? 'Stop' : 'Listen'}
          </button>}
        </div>)}
        {messages.length === 1 && !busy && <div className="edx-bot-example" aria-label="Suggested questions">
          {['CS101 ki study files dhoondo', 'Quiz aur Finalterm ki tayari kaise karun?', 'EduNexus WhatsApp group link do', 'Mere liye study plan suggest karo'].map(q => (
            <button type="button" key={q} onClick={() => void send(q)}>{q}</button>
          ))}
        </div>}
        {busy && <p className="edx-bot-thinking" role="status"><Loader2 size={15}/> Finding an answer…</p>}
        <div ref={bottomRef}/>
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
      <p className="edx-bot-disclaimer">Verified public resources only. Group messages are private. Browser voice needs permission and support.</p>
      {!expanded && <div className="edx-bot-resize" role="separator" aria-label="Drag to resize EduBot" title="Drag to resize EduBot" onPointerDown={e => startPointer(e, 'resize')} onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={endPointer} />}
    </section>}
  </div>;
}
