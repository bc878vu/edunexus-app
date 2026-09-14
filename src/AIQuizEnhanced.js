import React, { useEffect, useState } from "react";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import {
  ArrowLeft, ArrowRight, Brain, CheckSquare, Clock, FileText, Loader,
  PlayCircle, RotateCcw, Sparkles, Trophy, Upload, ShieldCheck, BookOpen,
  XCircle, Download, Target,
} from "lucide-react";

const MAX_UPLOAD = 8 * 1024 * 1024;
const ACCEPT = ".pdf,.txt,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.md";

const cleanQuiz = (value) => {
  try {
    const raw = Array.isArray(value) ? value : JSON.parse(String(value || "").replace(/```json/gi, "").replace(/```/g, "").trim());
    if (!Array.isArray(raw)) return [];
    return raw.filter((q) => q && typeof q.q === "string" && Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(Number(q.ans)) && Number(q.ans) >= 0 && Number(q.ans) < 4)
      .map((q, i) => ({ ...q, id: q.id || i + 1, ans: Number(q.ans), selected: null }));
  } catch (_) { return []; }
};

export default function AIQuizEnhanced({ theme, user, showToast, storage }) {
  const [topic, setTopic] = useState("");
  const [course, setCourse] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [sourceFile, setSourceFile] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [current, setCurrent] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90);
  const [sources, setSources] = useState([]);

  const selectFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_UPLOAD) {
      showToast?.("Please use a source file up to 8 MB.", "error");
      return;
    }
    setSourceFile(file);
    setUploadedUrl("");
    setUploading(true);
    try {
      if (!storage || !user?.uid) throw new Error("Please sign in before uploading a source file.");
      const safe = file.name.replace(/[\\/:*?"<>|]/g, "_");
      const path = `ai-quiz-sources/${user.uid}/${Date.now()}-${safe}`;
      const snap = await uploadBytes(storageRef(storage, path), file, { contentType: file.type || "application/octet-stream" });
      const url = await getDownloadURL(snap.ref);
      setUploadedUrl(url);
      if (!course.trim()) {
        const code = (file.name.match(/\b(?:CS|MGT|MTH|PHY|ENG|ISL|PAK|IT|SE|STA|ECO|ACC|FIN|HRM|PSY|BIO|CHE|EDU)\s*[-]?\s*\d{3}\b/i) || [])[0];
        if (code) setCourse(code.replace(/\s+/g, "").replace("-", "").toUpperCase());
      }
      showToast?.("Source file is ready for the AI quiz engine.", "success");
    } catch (error) {
      setSourceFile(null); setUploadedUrl("");
      showToast?.(error?.message || "Could not upload source file.", "error");
    } finally { setUploading(false); }
  };

  useEffect(() => {
    if (!quiz || finished) return undefined;
    if (timeLeft <= 0) { setFinished(true); return undefined; }
    const timer = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [quiz, finished, timeLeft]);

  const generateQuiz = async () => {
    const selectedCourse = course.trim().toUpperCase().replace(/\s+/g, "");
    const requestTopic = topic.trim() || selectedCourse;
    if (!requestTopic && !uploadedUrl) {
      showToast?.("Enter a course/topic or upload a source file.", "error");
      return;
    }
    setLoading(true); setQuiz(null); setFinished(false); setCurrent(0); setSources([]);
    try {
      const limit = Math.min(Math.max(Number(questionCount) || 10, 1), 50);
      const sourceLine = uploadedUrl
        ? `\nSOURCE_FILE_URL: ${uploadedUrl}\nSOURCE_FILE_NAME: ${sourceFile?.name || "uploaded-source"}\nSOURCE_FILE_MIME: ${sourceFile?.type || "application/octet-stream"}`
        : "";
      const courseLine = selectedCourse ? `\nHARD COURSE BOUNDARY: ${selectedCourse}` : "";
      const prompt = `Generate exactly ${limit} multiple choice questions for EduNexus.${courseLine}${sourceLine}\nUSER TOPIC: ${requestTopic || "Use the uploaded source as the only topic."}\n\nSOURCE-GROUNDED REQUIREMENTS:\n- If an uploaded/source document already contains MCQs, extract those exact questions first. Preserve exact wording, exact A-D options, exact order and source-supported answer. Do not paraphrase existing MCQs.\n- If there are not enough existing MCQs, create additional exam-likely MCQs only from explicit facts/concepts in the supplied source material.\n- If a course code is present, never use another course. CS620 must never become CS101 or any unrelated course.\n- Use all relevant matching course files when the backend supplies them, prioritizing repeated questions/concepts, past papers, quizzes, definitions and emphasized material.\n- Exactly four options and one correct answer.\n- Return ONLY JSON array with q, options, ans, explanation and source.`;
      const response = await fetch("/api/gemini-quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Quiz service error (${response.status})`);
      const parsed = cleanQuiz(data.text);
      if (!parsed.length) throw new Error("The AI returned no valid four-option questions from the selected source.");
      setQuiz(parsed); setSources(Array.isArray(data.sources) ? data.sources : []); setTimeLeft(90);
      showToast?.(`Generated ${parsed.length} source-grounded questions.`, "success");
    } catch (error) {
      console.error("AI Quiz:", error);
      showToast?.(error?.message || "AI quiz generation failed.", "error");
    } finally { setLoading(false); }
  };

  const answer = (option) => {
    if (!quiz || finished || quiz[current]?.selected !== null) return;
    setQuiz((items) => items.map((q, i) => i === current ? { ...q, selected: option } : q));
  };
  const score = quiz ? quiz.reduce((n, q) => n + (q.selected === q.ans ? 1 : 0), 0) : 0;
  const reset = () => { setQuiz(null); setFinished(false); setCurrent(0); setSources([]); setTimeLeft(90); };
  const removeFile = () => { setSourceFile(null); setUploadedUrl(""); };

  if (quiz && finished) return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in px-2">
      <div className={`${theme.card} p-8 md:p-12 rounded-3xl border ${theme.border} shadow-xl text-center`}>
        <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
        <p className={`text-sm font-bold ${theme.textMuted}`}>SOURCE-GROUNDED AI QUIZ</p>
        <h2 className={`text-3xl md:text-4xl font-black ${theme.text} mt-2`}>Quiz Completed</h2>
        <div className="text-5xl font-black text-indigo-500 my-6">{score} / {quiz.length}</div>
        <p className={`${theme.textMuted} mb-7`}>Your answers were checked against the validated answer index returned by the quiz engine.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold flex items-center gap-2"><RotateCcw size={18}/> Create Another</button>
          <button onClick={() => setFinished(false)} className={`px-6 py-3 rounded-xl border ${theme.border} ${theme.text} font-bold`}>Review Answers</button>
        </div>
      </div>
    </div>
  );

  if (quiz) {
    const q = quiz[current];
    return (
      <div className="max-w-4xl mx-auto space-y-5 animate-fade-in px-2">
        <div className={`${theme.card} rounded-3xl border ${theme.border} shadow-xl overflow-hidden`}>
          <div className="p-5 md:p-7 border-b ${theme.border}">
            <div className="flex flex-wrap justify-between gap-3 items-center">
              <span className={`text-sm font-black ${theme.text}`}>Question {current + 1} / {quiz.length}</span>
              <span className={`flex items-center gap-1 font-mono font-bold ${timeLeft < 15 ? "text-red-500" : "text-indigo-500"}`}><Clock size={16}/> 00:{String(timeLeft).padStart(2, "0")}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-indigo-600 transition-all" style={{ width: `${((current + 1) / quiz.length) * 100}%` }} /></div>
          </div>
          <div className="p-5 md:p-8">
            <div className="flex gap-3 items-start mb-6"><div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-500"><Target size={20}/></div><h3 className={`text-xl md:text-2xl font-black leading-relaxed ${theme.text}`}>{q.q}</h3></div>
            <div className="grid gap-3">
              {q.options.map((option, index) => {
                const selected = q.selected !== null;
                const right = index === q.ans;
                let cls = `${theme.card} ${theme.border} ${theme.text}`;
                if (selected && right) cls = "bg-green-500/10 border-green-500 text-green-600 dark:text-green-300";
                else if (selected && q.selected === index) cls = "bg-red-500/10 border-red-500 text-red-600 dark:text-red-300";
                else if (selected) cls = "opacity-60";
                return <button key={index} onClick={() => answer(index)} disabled={selected || timeLeft <= 0} className={`w-full text-left p-4 md:p-5 rounded-2xl border font-semibold transition-all ${cls}`}><span className="inline-flex h-7 w-7 rounded-full border items-center justify-center mr-3 text-xs">{String.fromCharCode(65 + index)}</span>{option}</button>;
              })}
            </div>
            {q.selected !== null && <div className="mt-5 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20"><p className="font-bold text-indigo-500 flex gap-2 items-center"><Sparkles size={16}/> Explanation</p><p className={`mt-1 text-sm ${theme.textMuted}`}>{q.explanation || "Source-supported answer."}</p>{q.source && <p className={`mt-2 text-xs ${theme.textMuted}`}>Source: {q.source}</p>}</div>}
            <div className="mt-7 flex justify-between gap-3">
              <button onClick={() => setCurrent((v) => Math.max(0, v - 1))} disabled={current === 0} className={`px-4 py-3 rounded-xl border ${theme.border} ${theme.text} font-bold disabled:opacity-30 flex items-center gap-2`}><ArrowLeft size={17}/> Previous</button>
              {current === quiz.length - 1 ? <button onClick={() => setFinished(true)} className="px-6 py-3 rounded-xl bg-red-600 text-white font-bold flex items-center gap-2">Finish <CheckSquare size={17}/></button> : <button onClick={() => setCurrent((v) => Math.min(quiz.length - 1, v + 1))} className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold flex items-center gap-2">Next <ArrowRight size={17}/></button>}
            </div>
          </div>
        </div>
        {sources.length > 0 && <div className={`${theme.card} rounded-2xl border ${theme.border} p-4`}><p className={`text-xs font-black ${theme.text} mb-2 flex items-center gap-2`}><ShieldCheck size={15} className="text-green-500"/> Sources used</p><div className="flex flex-wrap gap-2">{sources.map((s, i) => <span key={`${s.title}-${i}`} className="text-[11px] rounded-full px-3 py-1.5 bg-indigo-500/10 text-indigo-500">{s.title}</span>)}</div></div>}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in px-2 pb-10">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-black"><Brain size={17}/> EduNexus Source-Grounded AI</div>
        <h1 className={`text-3xl md:text-5xl font-black ${theme.text}`}>AI Quiz Generator</h1>
        <p className={`max-w-3xl mx-auto text-sm md:text-base ${theme.textMuted}`}>Upload a real course PDF or enter a course code. EduNexus sends the selected source to the protected quiz engine so questions stay inside the requested course material.</p>
      </div>
      <div className={`${theme.card} rounded-3xl border ${theme.border} shadow-xl p-5 md:p-8`}>
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className={`block text-xs font-black uppercase tracking-wide ${theme.textMuted} mb-2`}>Course code</label><input value={course} onChange={(e) => setCourse(e.target.value)} placeholder="e.g. CS620" className={`w-full ${theme.input} rounded-2xl p-4 outline-none font-bold`} /></div>
          <div><label className={`block text-xs font-black uppercase tracking-wide ${theme.textMuted} mb-2`}>Topic (optional)</label><input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Operational Analysis" className={`w-full ${theme.input} rounded-2xl p-4 outline-none`} /></div>
        </div>
        <div className="mt-4 grid md:grid-cols-[1fr_auto] gap-4 items-end">
          <div><label className={`block text-xs font-black uppercase tracking-wide ${theme.textMuted} mb-2`}>Number of questions</label><select value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} className={`w-full ${theme.input} rounded-2xl p-4 outline-none`}><option value={5}>5 questions</option><option value={10}>10 questions</option><option value={15}>15 questions</option><option value={20}>20 questions</option><option value={30}>30 questions</option><option value={50}>50 questions</option></select></div>
          <div className={`flex items-center gap-2 text-xs ${theme.textMuted} pb-3`}><ShieldCheck size={16} className="text-green-500"/> Course boundary enforced</div>
        </div>
        <div className="mt-5 border-2 border-dashed border-indigo-400/40 rounded-3xl p-6 text-center relative hover:border-indigo-500 transition-colors">
          <input type="file" accept={ACCEPT} onChange={selectFile} className="absolute inset-0 opacity-0 cursor-pointer" disabled={uploading} />
          <div className="flex flex-col items-center gap-2 pointer-events-none"><div className="h-14 w-14 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">{uploading ? <Loader className="animate-spin"/> : <Upload/>}</div><p className={`font-black ${theme.text}`}>{uploading ? "Uploading source…" : sourceFile ? sourceFile.name : "Upload PDF / Word / PowerPoint / Excel / Text"}</p><p className={`text-xs ${theme.textMuted}`}>{sourceFile ? "Uploaded successfully. This exact file is now the primary source." : "Maximum 8 MB. Existing MCQs are preserved exactly when present."}</p></div>
          {sourceFile && <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFile(); }} className="absolute top-3 right-3 p-2 rounded-full bg-red-500/10 text-red-500" title="Remove source"><XCircle size={18}/></button>}
        </div>
        <button onClick={generateQuiz} disabled={loading || uploading || (!course.trim() && !topic.trim() && !uploadedUrl)} className="mt-5 w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-black shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-all">{loading ? <Loader className="animate-spin" size={20}/> : <PlayCircle size={20}/>} {loading ? "Reading source & generating…" : "Start AI Quiz"}</button>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className={`${theme.card} border ${theme.border} rounded-2xl p-5`}><BookOpen className="text-indigo-500 mb-3"/><h3 className={`font-black ${theme.text}`}>Exact source first</h3><p className={`text-xs leading-5 mt-1 ${theme.textMuted}`}>If your PDF already has MCQs, the engine extracts those questions and keeps their wording and four options.</p></div>
        <div className={`${theme.card} border ${theme.border} rounded-2xl p-5`}><ShieldCheck className="text-green-500 mb-3"/><h3 className={`font-black ${theme.text}`}>No unrelated courses</h3><p className={`text-xs leading-5 mt-1 ${theme.textMuted}`}>A requested course code is treated as a hard boundary. CS620 is never silently replaced by CS101.</p></div>
        <div className={`${theme.card} border ${theme.border} rounded-2xl p-5`}><Sparkles className="text-cyan-500 mb-3"/><h3 className={`font-black ${theme.text}`}>Exam-focused</h3><p className={`text-xs leading-5 mt-1 ${theme.textMuted}`}>When new questions are needed, they are created from explicit source concepts, repeated material and exam-relevant sections.</p></div>
      </div>
    </div>
  );
}
