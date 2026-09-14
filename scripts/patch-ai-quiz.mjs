import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/App.js');
let text = fs.readFileSync(file, 'utf8');

// Safe/idempotent patch: never fail a production build because App.js formatting changed.
if (text.includes('SOURCE_FILE_URL: ${fileUrl}')) {
  console.log('AI Quiz source pipeline already present; skipping patch.');
  process.exit(0);
}

const marker = "  const [fileName, setFileName] = useState('');";
const pos = text.indexOf(marker);
if (pos >= 0 && !text.includes("const [fileUrl, setFileUrl] = useState('');")) {
  const handlePos = text.indexOf('handleFileUpload', pos);
  const blockEnd = handlePos >= 0 ? text.indexOf('\n  };', handlePos) : -1;
  if (handlePos >= 0 && blockEnd >= 0) {
    const end = blockEnd + 5;
    const oldBlock = text.slice(pos, end);
    const newBlock = `  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileMimeType, setFileMimeType] = useState('');
  const [fileUploading, setFileUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    const allowed = /\\.(txt|md|csv|pdf|doc|docx|ppt|pptx|xls|xlsx)$/i.test(selectedFile.name);
    if (!allowed) { showToast('Unsupported file type.', 'error'); return; }
    if (selectedFile.size > 8 * 1024 * 1024) { showToast('File is too large. Maximum is 8 MB.', 'error'); return; }
    setFileName(selectedFile.name);
    setFileMimeType(selectedFile.type || 'application/octet-stream');
    setFileUploading(true);
    try {
      const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const objectRef = storageRef(storage, \`ai-quiz-sources/\${user?.uid || 'anonymous'}/\${Date.now()}-\${safeName}\`);
      await uploadBytes(objectRef, selectedFile, { contentType: selectedFile.type || undefined });
      setFileUrl(await getDownloadURL(objectRef));
      if (selectedFile.type === 'text/plain' || /\\.(txt|md|csv)$/i.test(selectedFile.name)) {
        const reader = new FileReader();
        reader.onload = (ev) => setInput(String(ev.target?.result || '').slice(0, 12000));
        reader.readAsText(selectedFile);
      }
      showToast('File attached — AI will read the actual source.', 'success');
    } catch (error) {
      console.error('AI Quiz file upload error:', error);
      setFileUrl('');
      showToast('Could not upload the quiz source. Check Firebase Storage permissions.', 'error');
    } finally { setFileUploading(false); }
  };`;
    text = text.replace(oldBlock, newBlock, 1);
  }
}

// Keep API errors structured instead of returning an error string that later gets JSON.parse()d.
text = text.replace(
`    const data = await res.json();

    if (!res.ok) {
      console.error("Backend error:", data);
      return "AI request failed. " + (data.error || "");
    }

    return data.text || "AI did not return a valid response.";`,
`    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Backend error:", data);
      throw new Error(data.error || data.code || \`AI request failed (HTTP \${res.status})\`);
    }
    if (!data.text) throw new Error("AI did not return a valid response.");
    return data.text;`
);

fs.writeFileSync(file, text, 'utf8');
console.log('AI Quiz source patch completed safely.');
