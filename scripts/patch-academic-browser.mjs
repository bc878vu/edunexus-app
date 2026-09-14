import fs from "fs";
const path = "src/App.js";
let source = fs.readFileSync(path, "utf8");
if (source.includes("__EDUNEXUS_ACADEMIC_BROWSER_V2__")) process.exit(0);

const helper = String.raw`
// __EDUNEXUS_ACADEMIC_BROWSER_V2__
const ACADEMIC_CATEGORIES_V2 = [
  ["all", "All Material"], ["handouts", "Handouts & Notes"], ["past-papers", "Past Papers"],
  ["quizzes", "Quizzes & MCQs"], ["assignments", "Assignments"], ["presentations", "Presentations"],
  ["practical", "Practicals & Labs"], ["books", "Books & Guides"], ["spreadsheets", "Sheets & Data"], ["other", "Other Resources"]
];
const academicCategoryV2 = (file) => {
  if (file?.category && ACADEMIC_CATEGORIES_V2.some(([id]) => id === file.category)) return file.category;
  const s = String(file?.name || "").toLowerCase();
  if (/past.?paper|mid.?term|midterm|final.?term|finalterm/.test(s)) return "past-papers";
  if (/quiz|mcq|question.?bank|objective/.test(s)) return "quizzes";
  if (/assignment|gdb|graded/.test(s)) return "assignments";
  if (/ppt|pptx|presentation|slides/.test(s)) return "presentations";
  if (/practical|lab|viva/.test(s)) return "practical";
  if (/book|textbook|guide|solution/.test(s)) return "books";
  if (/xls|xlsx|csv|sheet/.test(s)) return "spreadsheets";
  if (/handout|notes?|summary|study.?material/.test(s)) return "handouts";
  return "other";
};
const directAcademicDownloadV2 = (file) => {
  const raw = String(file?.downloadUrl || file?.url || "");
  if (!raw) return "";
  const drive = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (drive) return \`https://drive.google.com/uc?export=download&id=\${drive[1]}\`;
  return raw.includes("/upload/") ? raw.replace("/upload/", "/upload/fl_attachment/") : raw;
};
`;
source = source.replace('const DEFAULT_FOLDERS = [', helper + '\nconst DEFAULT_FOLDERS = [');

const enhancedHub = String.raw`
// ================= AcademicHub V2 =================
const AcademicHubV2 = ({ user, isAdmin, theme, showToast }) => {
  const [files, setFiles] = useState([]);
  const [customFolders, setCustomFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [layout, setLayout] = useState("grid");
  const [copied, setCopied] = useState("");
  useEffect(() => {
    const filesRef = collection(db, "artifacts", appId, "public", "data", "files");
    const unsubFiles = onSnapshot(query(filesRef, orderBy("createdAt", "desc")), (snap) => { setFiles(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); }, (err) => { console.error(err); setLoading(false); showToast && showToast("Failed to load academic files", "error"); });
    const folderRef = doc(db, "artifacts", appId, "public", "data", "meta", "folders");
    const unsubFolders = onSnapshot(folderRef, (snap) => setCustomFolders(snap.exists() ? (snap.data().list || []) : []));
    return () => { unsubFiles(); unsubFolders(); };
  }, [showToast]);
  const subjects = useMemo(() => Array.from(new Set([...DEFAULT_FOLDERS, ...customFolders, ...files.map((f) => f.subject).filter(Boolean)])).sort(), [customFolders, files]);
  const counts = useMemo(() => { const out = { all: files.length }; ACADEMIC_CATEGORIES_V2.slice(1).forEach(([id]) => out[id] = files.filter((f) => academicCategoryV2(f) === id).length); return out; }, [files]);
  const results = useMemo(() => { const q = search.trim().toLowerCase(); const list = files.filter((f) => { const hay = String(\`\${f.name || ""} \${f.subject || ""} \${f.category || ""} \${f.ext || ""}\`).toLowerCase(); return (!q || hay.includes(q)) && (!subject || f.subject === subject) && (category === "all" || academicCategoryV2(f) === category); }); return list.sort((a,b) => sort === "name" ? String(a.name || "").localeCompare(String(b.name || "")) : sort === "oldest" ? (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0) : (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)); }, [files, search, subject, category, sort]);
  const copyDirect = async (file) => { const url = directAcademicDownloadV2(file); if (!url) return; try { await navigator.clipboard.writeText(url); setCopied(file.id); setTimeout(() => setCopied(""), 1500); } catch {} };
  const reset = () => { setSearch(""); setSubject(""); setCategory("all"); };
  return <section className="space-y-7 animate-fade-in">
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-violet-700 to-slate-950 text-white p-6 md:p-10 shadow-2xl"><div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"/><div className="relative"><div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-bold"><GraduationCap size={15}/> EduNexus Academic Library</div><h1 className="mt-4 text-3xl md:text-5xl font-black leading-tight">Your complete VU study material library</h1><p className="mt-3 max-w-3xl text-sm md:text-base leading-7 text-indigo-100">Browse course-wise resources or jump directly to Handouts & Notes, Past Papers, Quizzes & MCQs, Assignments, Presentations, Practicals, Books and other study resources. Search is live and updates automatically when admin uploads new material.</p><div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl"><div className="rounded-2xl bg-white/10 p-3"><b className="text-2xl">{files.length}</b><p className="text-xs text-indigo-100">Resources</p></div><div className="rounded-2xl bg-white/10 p-3"><b className="text-2xl">{subjects.length}</b><p className="text-xs text-indigo-100">Courses</p></div><div className="rounded-2xl bg-white/10 p-3"><b className="text-2xl">9</b><p className="text-xs text-indigo-100">Categories</p></div><div className="rounded-2xl bg-white/10 p-3"><b className="text-2xl">24/7</b><p className="text-xs text-indigo-100">Access</p></div></div></div></div>
    <div className={\`\${theme.card} border \${theme.border} rounded-2xl p-3 md:p-4 sticky top-2 z-30 shadow-lg\`}><div className="flex items-center gap-2"><Search size={19} className={theme.textMuted}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search file name, course, past paper, quiz..." className={\`flex-1 min-w-0 bg-transparent outline-none \${theme.text} text-sm md:text-base\`}/>{search && <button onClick={() => setSearch("")} className={theme.textMuted}><X size={17}/></button>}</div><div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3"><select value={subject} onChange={(e) => setSubject(e.target.value)} className={\`\${theme.input} rounded-xl p-2.5 text-sm\`}><option value="">All Courses</option>{subjects.map((s) => <option key={s}>{s}</option>)}</select><select value={category} onChange={(e) => setCategory(e.target.value)} className={\`\${theme.input} rounded-xl p-2.5 text-sm\`}>{ACADEMIC_CATEGORIES_V2.map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select><select value={sort} onChange={(e) => setSort(e.target.value)} className={\`\${theme.input} rounded-xl p-2.5 text-sm\`}><option value="newest">Newest First</option><option value="oldest">Oldest First</option><option value="name">Name A–Z</option></select></div></div>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">{ACADEMIC_CATEGORIES_V2.map(([id,label]) => <button key={id} onClick={() => setCategory(id)} className={\`\${theme.card} border \${category === id ? "border-indigo-500 ring-2 ring-indigo-500/20" : theme.border} rounded-2xl p-3 text-left hover:shadow-md transition-all\`}><div className="flex items-center justify-between"><span className={\`h-9 w-9 rounded-xl \${category === id ? "bg-indigo-600 text-white" : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500"} flex items-center justify-center\`}><Layers size={17}/></span><b className={\`text-xs \${theme.text}\`}>{counts[id] || 0}</b></div><p className={\`mt-2 text-xs font-bold \${theme.text}\`}>{label}</p></button>)}</div>
    <div><div className="flex items-center justify-between mb-3"><div><h2 className={\`text-xl md:text-2xl font-black \${theme.text}\`}>Browse by Course</h2><p className={\`text-xs mt-1 \${theme.textMuted}\`}>Choose a subject to see only its material.</p></div><button onClick={reset} className="text-xs font-bold text-indigo-500">Reset</button></div><div className="flex gap-3 overflow-x-auto pb-2">{subjects.map((s) => { const active = subject === s; const count = files.filter((f) => f.subject === s).length; return <button key={s} onClick={() => setSubject(active ? "" : s)} className={\`shrink-0 w-36 \${theme.card} border \${active ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10" : theme.border} rounded-2xl p-3 text-left\`}><Folder size={20} className="text-indigo-500"/><b className={\`block mt-3 \${theme.text}\`}>{s}</b><span className={\`text-[11px] \${theme.textMuted}\`}>{count} resource{count === 1 ? "" : "s"}</span></button>; })}</div></div>
    <div><div className="flex flex-wrap items-end justify-between gap-3 mb-4"><div><h2 className={\`text-xl md:text-2xl font-black \${theme.text}\`}>{subject || (category === "all" ? "All Resources" : ACADEMIC_CATEGORIES_V2.find(([id]) => id === category)?.[1])}</h2><p className={\`text-xs mt-1 \${theme.textMuted}\`}>{results.length} matching resource{results.length === 1 ? "" : "s"}</p></div><div className="flex gap-1"><button onClick={() => setLayout("grid")} className={\`p-2 rounded-lg \${layout === "grid" ? "bg-indigo-600 text-white" : theme.textMuted}\`}><Grid3X3 size={16}/></button><button onClick={() => setLayout("list")} className={\`p-2 rounded-lg \${layout === "list" ? "bg-indigo-600 text-white" : theme.textMuted}\`}><List size={16}/></button></div></div>{loading ? <div className={\`py-16 text-center \${theme.textMuted}\`}><Loader className="animate-spin mx-auto mb-2"/><p>Loading academic library...</p></div> : results.length === 0 ? <div className={\`\${theme.card} border \${theme.border} rounded-3xl p-10 text-center\`}><FileText size={42} className={\`mx-auto \${theme.textMuted}\`}/><h3 className={\`mt-3 font-black \${theme.text}\`}>No material found</h3><p className={\`text-sm mt-1 \${theme.textMuted}\`}>Try another course, category or search phrase.</p><button onClick={reset} className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold">Show all material</button></div> : <div className={layout === "grid" ? "grid sm:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-3"}>{results.map((file) => { const direct = directAcademicDownloadV2(file); const cat = ACADEMIC_CATEGORIES_V2.find(([id]) => id === academicCategoryV2(file))?.[1] || "Other"; return <div key={file.id} className={\`\${theme.card} border \${theme.border} rounded-2xl p-4 md:p-5 hover:shadow-xl transition-all\`}><div className="flex gap-3"><div className="h-11 w-11 shrink-0 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center"><FileText size={21}/></div><div className="min-w-0 flex-1"><h3 className={\`font-bold \${theme.text} break-words\`}>{String(file.name || "Untitled resource")}</h3><div className="flex flex-wrap gap-1.5 mt-2"><span className="text-[10px] font-bold px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">{cat}</span><span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">{String(file.ext || "FILE").toUpperCase()}</span>{file.subject && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600">{String(file.subject)}</span>}</div></div></div><p className={\`text-xs mt-3 \${theme.textMuted}\`}>{file.uploadedBy ? \`Uploaded by \${file.uploadedBy}\` : "Academic resource"}</p><div className="flex flex-wrap gap-2 mt-3">{file.url && <a href={file.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-500 text-indigo-600 dark:text-indigo-300 text-xs font-bold"><ExternalLink size={14}/> {file.isLinkOnly ? "Open Link" : "View"}</a>}{direct && <a href={direct} target="_blank" rel="noopener noreferrer" download={!file.isLinkOnly} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"><Download size={14}/> Direct Download</a>}{direct && <button onClick={() => copyDirect(file)} className={\`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border \${theme.border} \${theme.text} text-xs font-bold\`}><Copy size={14}/> {copied === file.id ? "Copied" : "Copy Link"}</button>}</div></div>; })}</div>}</div>
    <div className={\`\${theme.card} border \${theme.border} rounded-3xl p-6 md:p-8\`}><div className="flex items-start gap-4"><div className="h-12 w-12 shrink-0 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><CheckCircle/></div><div><h2 className={\`text-lg font-black \${theme.text}\`}>How to use the Academic Hub</h2><p className={\`text-sm leading-7 mt-2 \${theme.textMuted}\`}>Search by file name or course, filter by material type, open a course folder, and use Direct Download for files that provide a downloadable URL. The library is connected to the live EduNexus database, so newly published material appears automatically without manually refreshing the page.</p></div></div></div>
  </section>;
};
`;

const academicStart = source.indexOf('// ================= AcademicHub (user side) =================');
const portfolioStart = source.indexOf('/// PORTFOLIO PAGE', academicStart);
if (academicStart < 0 || portfolioStart < 0) throw new Error('AcademicHub boundaries not found');
source = source.slice(0, academicStart) + enhancedHub + '\n\n' + source.slice(portfolioStart);
source = source.replace(/<AcademicHub\s+user=\{user\}\s+isAdmin=\{isAdminMode\}\s+theme=\{theme\}\s+showToast=\{showToast\}\s*\/>/, '<AcademicHubV2 user={user} isAdmin={isAdminMode} theme={theme} showToast={showToast} />');
source = source.replace(/await addDoc\(filesCol, \{\n\s*name: finalName,\n\s*subject: selSubject,\n\s*url: fileUrl,\n\s*ext,\n\s*isLinkOnly,\n\s*uploadedBy: "Admin",\n\s*createdAt: serverTimestamp\(\),\n\s*\}\);/, 'await addDoc(filesCol, {\n        name: finalName, subject: selSubject, url: fileUrl,\n        downloadUrl: fileUrl.includes("/upload/") ? fileUrl.replace("/upload/", "/upload/fl_attachment/") : fileUrl,\n        ext, category: academicCategoryV2({ name: finalName, ext }), isLinkOnly, uploadedBy: "Admin", createdAt: serverTimestamp(),\n      });');
fs.writeFileSync(path, source);
console.log('Academic browser V2 build patch applied');
