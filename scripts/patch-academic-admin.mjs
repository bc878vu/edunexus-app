import fs from "fs";
const path = "src/App.js";
let source = fs.readFileSync(path, "utf8");
if (source.includes("__EDUNEXUS_ACADEMIC_ADMIN_V2__")) process.exit(0);
const marker = `\n// __EDUNEXUS_ACADEMIC_ADMIN_V2__\n`;
source = source.replace('const DEFAULT_FOLDERS = [', marker + 'const DEFAULT_FOLDERS = [');
source = source.replace('const [selSubject, setSelSubject] = useState("General");', 'const [selSubject, setSelSubject] = useState("General");\n  const [uCategory, setUCategory] = useState("handouts");\n  const [adminCategoryFilter, setAdminCategoryFilter] = useState("all");');
source = source.replace('category: academicCategoryV2({ name: finalName, ext }),', 'category: uCategory || academicCategoryV2({ name: finalName, ext }),');
const start = source.indexOf('      {/* Files list */}');
const end = source.indexOf('\n    </div>\n  );\n};\n\n\n\n\n  const BlogTab', start);
if (start < 0 || end < 0) throw new Error('Academic admin list boundaries not found');
const replacement = `      {/* __EDUNEXUS_ACADEMIC_ADMIN_V2__ files list */}
      <div className={\`${'${theme.card}'} p-6 rounded-2xl border ${'${theme.border}'}\`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div><h3 className={\`font-bold ${'${theme.text}'}\`}>Manage Files ({files.length})</h3><p className={\`text-xs ${'${theme.textMuted}'}\`}>Review, filter, open, copy or download every academic resource.</p></div>
          <select value={adminCategoryFilter} onChange={(e) => setAdminCategoryFilter(e.target.value)} className={\`${'${theme.input}'} p-2 rounded-lg text-sm\`}>
            <option value="all">All categories</option>
            {ACADEMIC_CATEGORIES_V2.slice(1).map(([id,label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {ACADEMIC_CATEGORIES_V2.slice(1).slice(0,4).map(([id,label]) => <div key={id} className="border rounded-xl p-3"><p className={\`text-lg font-black ${'${theme.text}'}\`}>{files.filter((f) => academicCategoryV2(f) === id).length}</p><p className={\`text-[11px] ${'${theme.textMuted}'}\`}>{label}</p></div>)}
        </div>
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          {files.filter((f) => adminCategoryFilter === "all" || academicCategoryV2(f) === adminCategoryFilter).map((f) => {
            const direct = directAcademicDownloadV2(f);
            return <div key={f.id} className="border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="min-w-0"><p className={\`font-bold ${'${theme.text}'} break-words\`}>{String(f.name || "Untitled resource")}</p><div className="flex flex-wrap gap-1.5 mt-2"><span className="text-[10px] font-bold px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">{String(f.subject || "General")}</span><span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100">{ACADEMIC_CATEGORIES_V2.find(([id]) => id === academicCategoryV2(f))?.[1] || "Other"}</span><span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100">{String(f.ext || "FILE").toUpperCase()}</span></div></div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {f.url && <a href={f.url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-xl border border-indigo-500 text-indigo-500 text-xs font-bold">View</a>}
                {direct && <a href={direct} target="_blank" rel="noopener noreferrer" download={!f.isLinkOnly} className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">Direct Download</a>}
                {direct && <button onClick={async () => { try { await navigator.clipboard.writeText(direct); showToast("Direct link copied", "success"); } catch { showToast("Could not copy link", "error"); } }} className="px-3 py-2 rounded-xl border text-xs font-bold">Copy Link</button>}
                <button onClick={() => deleteDoc(doc(db, "artifacts", appId, "public", "data", "files", f.id))} className="px-3 py-2 rounded-xl border border-red-500 text-red-500 text-xs font-bold">Delete</button>
              </div>
            </div>;
          })}
          {files.length === 0 && <p className={\`text-center py-10 ${'${theme.textMuted}'}\`}>No academic files uploaded yet.</p>}
        </div>
      </div>`;
source = source.slice(0, start) + replacement + source.slice(end);
const close = `          </select>\n\n          <input\n            value={uName}`;
if (source.includes(close)) source = source.replace(close, `          </select>\n\n          <select\n            value={uCategory}\n            onChange={(e) => setUCategory(e.target.value)}\n            className={\`${'${theme.input}'} p-2 rounded text-slate-800 dark:text-slate-200\`}\n          >\n            {ACADEMIC_CATEGORIES_V2.slice(1).map(([id, label]) => <option key={id} value={id}>{label}</option>)}\n          </select>\n\n          <input\n            value={uName}`);
fs.writeFileSync(path, source);
console.log('Academic admin V2 build patch applied');
