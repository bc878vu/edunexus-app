import React, { useEffect, useMemo, useState } from "react";
import {
  collection, deleteDoc, doc, onSnapshot, serverTimestamp, addDoc,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import {
  ArrowLeft, BookOpen, CheckCircle, Clipboard, Copy, Download, ExternalLink,
  File, FileDown, FileText, Folder, Grid3X3, Info, Layers, List, Loader,
  Plus, Search, ShieldCheck, Sparkles, Trash2, Upload, X, Zap, BarChart3,
  Presentation, FlaskConical, FileSpreadsheet, GraduationCap, ClipboardList,
} from "lucide-react";

const DEFAULT_COURSES = ["PHY101", "CS101", "MGT101", "ENG101", "CS201", "MTH101", "ISL201", "PAK301"];
const CATEGORIES = [
  ["all", "All Material", "Complete academic collection", Layers],
  ["handouts", "Handouts & Notes", "Lectures, summaries and study notes", BookOpen],
  ["past-papers", "Past Papers", "Midterm, final-term and previous papers", FileText],
  ["quizzes", "Quizzes & MCQs", "MCQs, quizzes and question banks", ClipboardList],
  ["assignments", "Assignments", "Assignments, GDBs and graded work", Clipboard],
  ["presentations", "Presentations", "PPT, slides and presentation material", Presentation],
  ["practical", "Practicals & Labs", "Labs, practicals and viva material", FlaskConical],
  ["books", "Books & Guides", "Books, guides and solution resources", BookOpen],
  ["spreadsheets", "Sheets & Data", "Excel, CSV and data resources", FileSpreadsheet],
  ["other", "Other Resources", "Everything else in the library", File],
];

function categoryFor(file) {
  const explicit = String(file?.category || "").toLowerCase().trim();
  if (CATEGORIES.some(([id]) => id === explicit)) return explicit;
  const text = `${file?.name || ""} ${file?.fileName || ""} ${file?.title || ""} ${file?.ext || ""}`.toLowerCase();
  if (/past.?paper|mid.?term|midterm|final.?term|finalterm|paper/.test(text)) return "past-papers";
  if (/quiz|mcq|question.?bank|objective/.test(text)) return "quizzes";
  if (/assignment|gdb|graded/.test(text)) return "assignments";
  if (/ppt|pptx|presentation|slide/.test(text)) return "presentations";
  if (/practical|lab|viva/.test(text)) return "practical";
  if (/book|textbook|guide|solution/.test(text)) return "books";
  if (/xls|xlsx|csv|sheet|excel/.test(text)) return "spreadsheets";
  if (/handout|note|summary|study.?material|lecture/.test(text)) return "handouts";
  return "other";
}

function fileUrl(file) {
  return String(file?.downloadUrl || file?.downloadURL || file?.url || file?.link || "").trim();
}
function safeFilename(name) {
  return String(name || "EduNexus-resource.pdf").replace(/[\\/:*?"<>|]/g, "_").trim() || "EduNexus-resource.pdf";
}
function directDownload(file) {
  const raw = fileUrl(file);
  if (!raw) return "";
  const drive = raw.match(/(?:drive\.google\.com|docs\.google\.com)[^\n]*\/file\/d\/([A-Za-z0-9_-]+)/);
  if (drive) return `https://drive.google.com/uc?export=download&id=${drive[1]}`;
  if (/res\.cloudinary\.com/.test(raw) && raw.includes("/upload/")) {
    const name = safeFilename(file?.name || file?.fileName || "download").replace(/\.[^.]+$/, "");
    return raw.replace("/upload/", `/upload/fl_attachment:${encodeURIComponent(name)}/`);
  }
  if (/firebasestorage\.googleapis\.com|storage\.googleapis\.com/.test(raw)) {
    try {
      const u = new URL(raw);
      const name = safeFilename(file?.name || file?.fileName || "download");
      if (!u.searchParams.has("response-content-disposition")) u.searchParams.set("response-content-disposition", `attachment; filename="${name}"`);
      return u.toString();
    } catch (_) {}
  }
  return raw;
}
function dateValue(v) {
  if (!v) return 0;
  if (typeof v?.toMillis === "function") return v.toMillis();
  if (typeof v?.seconds === "number") return v.seconds * 1000;
  const n = Date.parse(v);
  return Number.isFinite(n) ? n : 0;
}
function prettyBytes(value) {
  const n = Number(value);
  if (!n || n < 1) return "Size not specified";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0; let x = n;
  while (x >= 1024 && i < units.length - 1) { x /= 1024; i += 1; }
  return `${x.toFixed(x >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
function categoryInfo(id) { return CATEGORIES.find((x) => x[0] === id) || CATEGORIES[CATEGORIES.length - 1]; }

function ResourceCard({ file, theme, isAdmin, onDelete, onCopy, compact = false }) {
  const url = fileUrl(file);
  const direct = directDownload(file);
  const cat = categoryInfo(categoryFor(file));
  const Icon = cat[3];
  const name = String(file?.name || file?.fileName || file?.title || "Untitled resource");
  const subject = String(file?.subject || file?.course || "");
  const description = String(file?.description || "");
  return (
    <article className={`${theme.card} border ${theme.border} rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-xl transition-all duration-200 group`}>
      <div className="flex gap-4">
        <div className="h-12 w-12 shrink-0 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center"><Icon size={23} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {subject && <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{subject}</span>}
            <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">{cat[1]}</span>
          </div>
          <h3 className={`mt-2 font-black ${theme.text} ${compact ? "text-sm" : "text-base md:text-lg"} break-words leading-6`}>{name}</h3>
          <p className={`mt-2 text-xs ${theme.textMuted} leading-5`}>{description || `${cat[2]}. This resource is available through the EduNexus academic library for quick study, revision and exam preparation.`}</p>
        </div>
      </div>
      <div className={`mt-4 grid ${compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"} gap-2 text-[11px] ${theme.textMuted}`}>
        <span className="rounded-xl bg-slate-50 dark:bg-slate-800/70 px-3 py-2">Type: <b>{String(file?.ext || "FILE").replace(".", "").toUpperCase()}</b></span>
        <span className="rounded-xl bg-slate-50 dark:bg-slate-800/70 px-3 py-2">Size: <b>{prettyBytes(file?.size)}</b></span>
        <span className="rounded-xl bg-slate-50 dark:bg-slate-800/70 px-3 py-2">Source: <b>{file?.isLinkOnly ? "External" : "EduNexus"}</b></span>
        {!compact && <span className="rounded-xl bg-slate-50 dark:bg-slate-800/70 px-3 py-2">Updated: <b>{dateValue(file?.updatedAt || file?.createdAt) ? new Date(dateValue(file?.updatedAt || file?.createdAt)).toLocaleDateString() : "Recently"}</b></span>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-indigo-500 text-indigo-600 dark:text-indigo-300 text-xs font-extrabold hover:bg-indigo-50 dark:hover:bg-indigo-500/10"><ExternalLink size={15} /> View / Open</a>}
        {direct && <a href={direct} download={safeFilename(name)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-extrabold hover:bg-indigo-700"><Download size={15} /> Direct Download</a>}
        {direct && <button onClick={() => onCopy(file)} className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border ${theme.border} ${theme.text} text-xs font-extrabold`}><Copy size={15} /> Copy Link</button>}
        {isAdmin && <button onClick={() => onDelete(file)} className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-red-200 text-red-600 text-xs font-extrabold"><Trash2 size={15} /> Delete</button>}
      </div>
    </article>
  );
}

export default function AcademicLibraryPage({ user, isAdmin, theme, showToast, db, appId, storage }) {
  const [files, setFiles] = useState(() => {
    try { return JSON.parse(localStorage.getItem("edunexus_academic_files_v3") || "[]"); } catch (_) { return []; }
  });
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [course, setCourse] = useState("");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState("grid");
  const [copied, setCopied] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", category: "handouts", description: "", url: "", file: null });
  const [selected, setSelected] = useState(null);
  const pathSubject = decodeURIComponent((window.location.pathname.match(/^\/academic\/(.+)$/) || [])[1] || "");
  const currentCourse = course || pathSubject;

  useEffect(() => {
    if (!db || !appId) return undefined;
    const ref = collection(db, "artifacts", appId, "public", "data", "files");
    setLoading(files.length === 0);
    const unsubscribe = onSnapshot(ref, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => dateValue(b.createdAt || b.updatedAt) - dateValue(a.createdAt || a.updatedAt));
      setFiles(list);
      setLoading(false);
      try { localStorage.setItem("edunexus_academic_files_v3", JSON.stringify(list)); } catch (_) {}
    }, (error) => { console.error("Academic library sync", error); setLoading(false); showToast?.("Academic library is temporarily offline; cached resources are shown.", "info"); });
    return () => unsubscribe();
  }, [db, appId]);

  useEffect(() => {
    if (!db || !appId) return undefined;
    const ref = doc(db, "artifacts", appId, "public", "data", "meta", "folders");
    return onSnapshot(ref, (snap) => setFolders(snap.exists() ? (snap.data()?.list || []) : []), () => setFolders([]));
  }, [db, appId]);

  const courses = useMemo(() => Array.from(new Set([...DEFAULT_COURSES, ...folders, ...files.map((f) => f.subject || f.course).filter(Boolean)])).sort((a, b) => String(a).localeCompare(String(b))), [files, folders]);
  const counts = useMemo(() => CATEGORIES.reduce((out, [id]) => { out[id] = id === "all" ? files.length : files.filter((f) => categoryFor(f) === id).length; return out; }, {}), [files]);
  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = files.filter((f) => {
      const hay = `${f.name || ""} ${f.fileName || ""} ${f.subject || f.course || ""} ${f.category || ""} ${f.description || ""} ${f.ext || ""}`.toLowerCase();
      return (!q || hay.includes(q)) && (!currentCourse || String(f.subject || f.course || "") === currentCourse) && (category === "all" || categoryFor(f) === category);
    });
    return filtered.sort((a, b) => sort === "name" ? String(a.name || a.fileName || "").localeCompare(String(b.name || b.fileName || "")) : sort === "oldest" ? dateValue(a.createdAt) - dateValue(b.createdAt) : dateValue(b.createdAt || b.updatedAt) - dateValue(a.createdAt || a.updatedAt));
  }, [files, search, currentCourse, category, sort]);

  const copyLink = async (file) => {
    const url = directDownload(file); if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(file.id); setTimeout(() => setCopied(""), 1600); } catch (_) { showToast?.("Copy failed. Please copy the link from the browser.", "error"); }
  };
  const resetFilters = () => { setSearch(""); setCategory("all"); setCourse(""); if (pathSubject) window.history.pushState({}, "", "/academic"); };
  const openCourse = (name) => { setCourse(name); window.history.pushState({ page: "academic", subject: name }, "", `/academic/${encodeURIComponent(name)}`); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const backToLibrary = () => { setCourse(""); window.history.pushState({ page: "academic" }, "", "/academic"); window.scrollTo({ top: 0, behavior: "smooth" }); };

  useEffect(() => {
    const pop = () => setCourse(decodeURIComponent((window.location.pathname.match(/^\/academic\/(.+)$/) || [])[1] || ""));
    window.addEventListener("popstate", pop); return () => window.removeEventListener("popstate", pop);
  }, []);

  const deleteFile = async (file) => {
    if (!isAdmin || !window.confirm(`Delete “${file?.name || file?.fileName || "this resource"}”?`)) return;
    try {
      await deleteDoc(doc(db, "artifacts", appId, "public", "data", "files", file.id));
      if (storage && file.storagePath) await deleteObject(storageRef(storage, file.storagePath)).catch(() => {});
      showToast?.("Resource deleted successfully", "success");
    } catch (error) { showToast?.(error?.message || "Delete failed", "error"); }
  };

  const saveResource = async (event) => {
    event.preventDefault(); if (!isAdmin) return;
    setUploading(true);
    try {
      let url = form.url.trim(); let storagePath = ""; let isLinkOnly = true; let originalName = form.name.trim();
      if (form.file) {
        if (form.file.size > 25 * 1024 * 1024) throw new Error("File must be 25 MB or smaller.");
        originalName = originalName || form.file.name;
        const safe = safeFilename(form.file.name);
        storagePath = `academic-library/${user?.uid || "admin"}/${Date.now()}-${safe}`;
        const uploaded = await uploadBytes(storageRef(storage, storagePath), form.file, { contentType: form.file.type || undefined });
        url = await getDownloadURL(uploaded.ref); isLinkOnly = false;
      }
      if (!url) throw new Error("Select a file or enter a resource URL.");
      await addDoc(collection(db, "artifacts", appId, "public", "data", "files"), {
        name: originalName || "Academic Resource", fileName: originalName || "Academic Resource", subject: form.subject.trim() || "General",
        category: form.category, description: form.description.trim(), url, downloadUrl: url, storagePath, isLinkOnly,
        ext: (originalName.match(/\.([^.]+)$/)?.[1] || "file").toLowerCase(), size: form.file?.size || 0,
        uploadedBy: user?.email || "EduNexus Admin", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setForm({ name: "", subject: form.subject, category: form.category, description: "", url: "", file: null });
      showToast?.("Academic resource published successfully", "success");
    } catch (error) { console.error(error); showToast?.(error?.message || "Resource upload failed", "error"); }
    finally { setUploading(false); }
  };

  const heading = currentCourse ? `${currentCourse} — Complete Study Library` : "Academic Hub";
  return (
    <section className="space-y-8 animate-fade-in">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-700 via-violet-700 to-slate-950 text-white p-6 md:p-10 shadow-2xl">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-20 -bottom-32 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative max-w-4xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-black"><GraduationCap size={15}/> EduNexus Academic Library</span>
          <h1 className="mt-5 text-3xl md:text-5xl font-black leading-tight">{heading}</h1>
          <p className="mt-4 text-sm md:text-base leading-7 text-indigo-100">EduNexus Academic Hub brings your VU study resources into one organized, searchable library. Students can move from a course folder to the exact resource they need, compare material categories, open source files, copy a direct link, or download a document without hunting through long folder lists. The library is designed for daily study, revision, assignment work and exam preparation while keeping the original resource name visible.</p>
          <div className="mt-7 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl">
            <div className="rounded-2xl bg-white/10 border border-white/10 p-4"><b className="text-2xl">{files.length}</b><p className="text-xs text-indigo-100 mt-1">Total resources</p></div>
            <div className="rounded-2xl bg-white/10 border border-white/10 p-4"><b className="text-2xl">{courses.length}</b><p className="text-xs text-indigo-100 mt-1">Courses / folders</p></div>
            <div className="rounded-2xl bg-white/10 border border-white/10 p-4"><b className="text-2xl">9</b><p className="text-xs text-indigo-100 mt-1">Resource categories</p></div>
            <div className="rounded-2xl bg-white/10 border border-white/10 p-4"><b className="text-2xl">24/7</b><p className="text-xs text-indigo-100 mt-1">Student access</p></div>
          </div>
        </div>
      </div>

      {currentCourse && <div className={`${theme.card} border ${theme.border} rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3`}><button onClick={backToLibrary} className="inline-flex items-center gap-2 text-indigo-600 font-extrabold text-sm"><ArrowLeft size={17}/> Back to all courses</button><span className={`text-sm font-black ${theme.text}`}>{currentCourse} · {results.length} resources</span></div>}

      <div className={`${theme.card} border ${theme.border} rounded-3xl p-4 md:p-5 shadow-lg sticky top-2 z-20`}>
        <div className="flex items-center gap-3"><Search size={20} className={theme.textMuted}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search file name, course, quiz, past paper, notes..." className={`flex-1 min-w-0 bg-transparent outline-none ${theme.text} text-sm md:text-base`} />{search && <button onClick={() => setSearch("")}><X size={17} className={theme.textMuted}/></button>}</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4"><select value={course} onChange={(e) => e.target.value ? openCourse(e.target.value) : backToLibrary()} className={`${theme.input} rounded-xl p-3 text-sm`}><option value="">{currentCourse ? currentCourse : "All Courses / Folders"}</option>{courses.map((c) => <option value={c} key={c}>{c}</option>)}</select><select value={category} onChange={(e) => setCategory(e.target.value)} className={`${theme.input} rounded-xl p-3 text-sm`}>{CATEGORIES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><select value={sort} onChange={(e) => setSort(e.target.value)} className={`${theme.input} rounded-xl p-3 text-sm`}><option value="newest">Newest First</option><option value="oldest">Oldest First</option><option value="name">Name A–Z</option></select></div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">{CATEGORIES.slice(1).map(([id, label, desc, Icon]) => <button key={id} onClick={() => setCategory(id)} className={`${theme.card} border ${category === id ? "border-indigo-500 ring-2 ring-indigo-500/10" : theme.border} rounded-2xl p-4 text-left hover:-translate-y-0.5 hover:shadow-lg transition-all`}><div className="flex items-center justify-between"><span className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center"><Icon size={18}/></span><b className={`text-xs ${theme.text}`}>{counts[id] || 0}</b></div><b className={`block mt-3 text-xs ${theme.text}`}>{label}</b><span className={`block mt-1 text-[10px] ${theme.textMuted}`}>{desc}</span></button>)}</div>

      {!currentCourse && <div><div className="flex items-end justify-between gap-3 mb-4"><div><h2 className={`text-2xl md:text-3xl font-black ${theme.text}`}>Browse by Course</h2><p className={`mt-1 text-sm ${theme.textMuted}`}>Every course folder is a starting point. Open a course to see its resources, categories and detailed study guidance.</p></div><button onClick={resetFilters} className="text-xs font-extrabold text-indigo-600">Reset filters</button></div><div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{courses.map((c) => { const n = files.filter((f) => String(f.subject || f.course || "") === c).length; return <button key={c} onClick={() => openCourse(c)} className={`${theme.card} border ${theme.border} rounded-3xl p-5 text-left hover:shadow-xl hover:-translate-y-1 transition-all`}><div className="flex items-center justify-between"><span className="h-11 w-11 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center"><Folder size={22}/></span><span className="text-[11px] font-black px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">{n} files</span></div><h3 className={`mt-4 text-lg font-black ${theme.text}`}>{c}</h3><p className={`mt-2 text-xs leading-5 ${theme.textMuted}`}>Open this course library for handouts, past papers, quizzes, assignments, presentations and other available study resources.</p><span className="inline-flex items-center gap-1 mt-4 text-xs font-black text-indigo-600">Open course <ExternalLink size={13}/></span></button>; })}</div></div>}

      {currentCourse && <div className={`${theme.card} border ${theme.border} rounded-3xl p-6 md:p-8`}><div className="flex gap-4"><div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0"><ShieldCheck/></div><div><h2 className={`text-xl md:text-2xl font-black ${theme.text}`}>About the {currentCourse} resource collection</h2><p className={`mt-3 text-sm leading-7 ${theme.textMuted}`}>This course page is designed to be more than a file list. Use the resources below according to your study stage: start with handouts and lecture notes to understand the course material, move to past papers and quizzes to identify repeated exam patterns, use assignments and practical material for applied practice, and keep books or guides for deeper revision. The category and search controls remain available so you can narrow the collection without leaving the course page.</p><p className={`mt-3 text-sm leading-7 ${theme.textMuted}`}>When a resource is available as a downloadable file, the Direct Download action is provided alongside View and Copy Link. The original filename is retained for downloads wherever the storage provider supports a response filename. External Drive resources continue to open through their source while Google Drive file links are converted to a direct download form when possible.</p></div></div></div>}

      <div><div className="flex flex-wrap items-end justify-between gap-3 mb-4"><div><h2 className={`text-2xl md:text-3xl font-black ${theme.text}`}>{currentCourse ? `${currentCourse} Resources` : "All Academic Resources"}</h2><p className={`mt-1 text-sm ${theme.textMuted}`}>{results.length} matching resource{results.length === 1 ? "" : "s"}. {loading ? "Syncing the latest library changes…" : "Library is live and synchronized."}</p></div><div className="flex items-center gap-2"><button onClick={() => setView("grid")} className={`p-2.5 rounded-xl ${view === "grid" ? "bg-indigo-600 text-white" : theme.textMuted}`}><Grid3X3 size={17}/></button><button onClick={() => setView("list")} className={`p-2.5 rounded-xl ${view === "list" ? "bg-indigo-600 text-white" : theme.textMuted}`}><List size={17}/></button>{isAdmin && <button onClick={() => setShowAdmin(!showAdmin)} className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black"><Plus size={15}/> {showAdmin ? "Close Admin" : "Manage Library"}</button>}</div></div>
        {loading && files.length === 0 ? <div className="py-16 text-center"><Loader className="animate-spin mx-auto text-indigo-500"/><p className={`mt-3 text-sm ${theme.textMuted}`}>Loading cached + live academic resources…</p></div> : results.length === 0 ? <div className={`${theme.card} border ${theme.border} rounded-3xl p-10 text-center`}><FileText size={44} className={`mx-auto ${theme.textMuted}`}/><h3 className={`mt-4 text-xl font-black ${theme.text}`}>No matching resources</h3><p className={`mt-2 text-sm ${theme.textMuted}`}>Try another course, category or search phrase. If this is a newly uploaded resource, wait for the live Firebase sync to complete.</p><button onClick={resetFilters} className="mt-5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-black">Show all resources</button></div> : <div className={view === "grid" ? "grid md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-3"}>{results.map((file) => <ResourceCard key={file.id} file={file} theme={theme} isAdmin={isAdmin} onDelete={deleteFile} onCopy={copyLink}/>)}</div>}
      </div>

      <div className={`${theme.card} border ${theme.border} rounded-3xl p-6 md:p-8`}><div className="grid md:grid-cols-3 gap-6"><div><div className="h-11 w-11 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center"><Zap/></div><h3 className={`mt-4 font-black ${theme.text}`}>Fast library access</h3><p className={`mt-2 text-sm leading-6 ${theme.textMuted}`}>The page restores a local cache immediately, then synchronizes the latest Firestore collection in the background. This avoids a blank academic page while live data is loading.</p></div><div><div className="h-11 w-11 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><BarChart3/></div><h3 className={`mt-4 font-black ${theme.text}`}>Organized for exams</h3><p className={`mt-2 text-sm leading-6 ${theme.textMuted}`}>Categories make it easier to separate learning material from exam material. Past papers, quizzes and repeated question resources can be reached without scanning every file in a folder.</p></div><div><div className="h-11 w-11 rounded-2xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 flex items-center justify-center"><Info/></div><h3 className={`mt-4 font-black ${theme.text}`}>Original files preserved</h3><p className={`mt-2 text-sm leading-6 ${theme.textMuted}`}>EduNexus displays the uploaded resource name and metadata instead of renaming it for students. Download actions use the original filename where the storage service permits it.</p></div></div></div>

      {showAdmin && isAdmin && <div className={`${theme.card} border ${theme.border} rounded-3xl p-6 md:p-8`}><div className="flex items-start justify-between gap-4"><div><span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Admin library manager</span><h2 className={`mt-2 text-2xl font-black ${theme.text}`}>Publish a new academic resource</h2><p className={`mt-2 text-sm leading-6 ${theme.textMuted}`}>Upload a file or save an external/Google Drive resource. Course, category and description are stored with the resource so the user-facing library can organize it automatically.</p></div><ShieldCheck className="text-emerald-500 shrink-0"/></div><form onSubmit={saveResource} className="mt-6 space-y-4"><div className="grid md:grid-cols-3 gap-3"><label className={`text-xs font-bold ${theme.text}`}>Resource name<input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="e.g. CS620 Midterm Past Papers" className={`${theme.input} mt-1 w-full rounded-xl p-3 text-sm`}/></label><label className={`text-xs font-bold ${theme.text}`}>Course / folder<input value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})} placeholder="CS620" className={`${theme.input} mt-1 w-full rounded-xl p-3 text-sm`}/></label><label className={`text-xs font-bold ${theme.text}`}>Category<select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className={`${theme.input} mt-1 w-full rounded-xl p-3 text-sm`}>{CATEGORIES.slice(1).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label></div><div className="grid md:grid-cols-2 gap-3"><label className={`text-xs font-bold ${theme.text}`}>Upload file (max 25 MB)<input type="file" onChange={(e) => setForm({...form, file: e.target.files?.[0] || null})} className={`${theme.input} mt-1 w-full rounded-xl p-3 text-sm`}/></label><label className={`text-xs font-bold ${theme.text}`}>Or external / Drive URL<input value={form.url} onChange={(e) => setForm({...form, url: e.target.value})} placeholder="https://drive.google.com/..." className={`${theme.input} mt-1 w-full rounded-xl p-3 text-sm`}/></label></div><label className={`text-xs font-bold ${theme.text}`}>Description<textarea rows="4" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Explain what this resource contains and how students can use it." className={`${theme.input} mt-1 w-full rounded-xl p-3 text-sm`}/></label><div className="flex flex-wrap gap-2"><button type="submit" disabled={uploading} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-black disabled:opacity-60">{uploading ? <Loader size={17} className="animate-spin"/> : <Upload size={17}/>} {uploading ? "Publishing…" : "Publish resource"}</button><button type="button" onClick={() => setForm({name:"",subject:form.subject,category:form.category,description:"",url:"",file:null})} className={`px-5 py-3 rounded-xl border ${theme.border} ${theme.text} text-sm font-black`}>Clear</button></div></form></div>}

      {selected && <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={() => setSelected(null)}><div className={`${theme.card} max-w-2xl w-full rounded-3xl p-6 shadow-2xl`} onClick={(e) => e.stopPropagation()}><div className="flex justify-between gap-4"><div><span className="text-xs font-black text-indigo-600">Resource details</span><h2 className={`mt-2 text-2xl font-black ${theme.text}`}>{selected.name || selected.fileName}</h2></div><button onClick={() => setSelected(null)}><X className={theme.textMuted}/></button></div><p className={`mt-4 text-sm leading-7 ${theme.textMuted}`}>{selected.description || "This resource is part of the EduNexus academic collection. Use View to open the original source or Direct Download to save the original file when the storage provider supports it."}</p><div className="mt-5"><ResourceCard file={selected} theme={theme} isAdmin={isAdmin} onDelete={deleteFile} onCopy={copyLink}/></div></div></div>}
      {copied && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] rounded-full bg-slate-950 text-white px-4 py-2 text-xs font-black shadow-xl inline-flex items-center gap-2"><CheckCircle size={15}/> Direct link copied</div>}
    </section>
  );
}
