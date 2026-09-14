import fs from 'node:fs';

const path = 'scripts/patch-academic-browser.mjs';
let s = fs.readFileSync(path, 'utf8');

// Keep the V2 patcher as a raw template. The old normalizer changed String.raw
// into a normal template literal and caused App.js to receive malformed JS.
// These targeted edits improve the generated component without touching its
// template escaping.
s = s.replaceAll('query(filesRef, orderBy("createdAt", "desc"))', 'filesRef');
s = s.replaceAll('<Grid3X3 size={16}/>', '<Layers size={16}/>');
s = s.replaceAll('<List size={16}/>', '<FileText size={16}/>');

// Make generated Cloudinary links request an attachment using the original
// filename where possible. Firebase/other URLs still use the native download
// attribute supplied by the component.
s = s.replace(
  'return raw.includes("/upload/") ? raw.replace("/upload/", "/upload/fl_attachment/") : raw;',
  'if (raw.includes("res.cloudinary.com") && raw.includes("/upload/")) { const n = String(file?.name || "download").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.[^.]+$/, ""); return raw.replace("/upload/", `/upload/fl_attachment:${encodeURIComponent(n)}/`); }\n  return raw;'
);

// Firebase Storage download URLs accept response-content-disposition on the
// Google storage download endpoint. Add the original name when the URL is a
// Firebase/Google storage URL and it does not already specify disposition.
s = s.replace(
  'return raw;\n};\n`;',
  'if (/firebasestorage.googleapis.com|storage.googleapis.com/.test(raw)) { try { const u = new URL(raw); if (!u.searchParams.has("response-content-disposition")) { const n = String(file?.name || "download").replace(/[\\\\/:*?"<>|]/g, "_"); u.searchParams.set("response-content-disposition", `attachment; filename="${n}"`); } return u.toString(); } catch {} }\n  return raw;\n};\n`;'
);

fs.writeFileSync(path, s, 'utf8');
console.log('Academic browser patcher prepared safely.');
