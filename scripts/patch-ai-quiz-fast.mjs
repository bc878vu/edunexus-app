import fs from 'node:fs';

const file = 'src/AIQuizEnhanced.js';
let source = fs.readFileSync(file, 'utf8');

if (!source.includes("CACHE_KEY = 'edunexus_ai_quiz_source_v4'")) {
  source = source.replace(
    'const ACCEPT = ".pdf,.txt,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.md";',
    'const ACCEPT = ".pdf,.txt,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.md";\nconst CACHE_KEY = \'edunexus_ai_quiz_source_v4\';\nconst COURSE_RE = /\\b(?:CS|MGT|MTH|PHY|ENG|ISL|PAK|IT|SE|STA|ECO|ACC|FIN|HRM|PSY|BIO|CHE|EDU)\\s*[-]?\\s*\\d{3}\\b/i;'
  );
  source = source.replace('import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";', 'import { getDownloadURL, ref as storageRef, uploadBytesResumable } from "firebase/storage";');
}

const start = source.indexOf('  const selectFile = async (event) => {');
const end = source.indexOf('\n\n  useEffect(() => {', start);
if (start >= 0 && end > start && !source.includes('Cached source is ready instantly.')) {
  const replacement = `  const selectFile = async (event) => {\n    const file = event.target.files?.[0];\n    event.target.value = \"\";\n    if (!file) return;\n    if (file.size > MAX_UPLOAD) { showToast?.(\"Please use a source file up to 8 MB.\", \"error\"); return; }\n    setSourceFile(file); setUploadedUrl(\"\"); setUploading(true);\n    try {\n      if (!storage || !user?.uid) throw new Error(\"Please sign in before uploading a source file.\");\n      const code = (file.name.match(COURSE_RE) || [])[0];\n      if (!course.trim() && code) setCourse(code.replace(/\\s+/g, \"\").replace(\"-\", \"\").toUpperCase());\n      const cacheId = [file.name, file.size, file.lastModified, user.uid].join(\"::\");\n      try { const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || \"null\"); if (cached?.cacheId === cacheId && cached?.url) { setUploadedUrl(cached.url); setUploading(false); showToast?.(\"Cached source is ready instantly.\", \"success\"); return; } } catch {}\n      const safe = file.name.replace(/[\\\\/:*?\"<>|]/g, \"_\");\n      const path = \\`ai-quiz-sources/\\${user.uid}/\\${Date.now()}-\\${safe}\\`;\n      const task = uploadBytesResumable(storageRef(storage, path), file, { contentType: file.type || \"application/octet-stream\" });\n      await new Promise((resolve, reject) => task.on(\"state_changed\", () => {}, reject, resolve));\n      const url = await getDownloadURL(task.snapshot.ref);\n      setUploadedUrl(url);\n      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ cacheId, url, name:file.name, type:file.type, size:file.size, savedAt:Date.now() })); } catch {}\n      showToast?.(\"Source file is ready for the AI quiz engine.\", \"success\");\n    } catch (error) { setSourceFile(null); setUploadedUrl(\"\"); showToast?.(error?.message || \"Could not upload source file.\", \"error\"); }\n    finally { setUploading(false); }\n  };\n`;
  source = source.slice(0, start) + replacement + source.slice(end);
}

source = source.replaceAll('/api/gemini-quiz', '/api/gemini-quiz-fast');
source = source.replace('className="p-5 md:p-7 border-b ${theme.border}"', 'className={`p-5 md:p-7 border-b ${theme.border}`}');
fs.writeFileSync(file, source, 'utf8');
console.log('Fast source upload + quiz endpoint integration applied safely.');
