import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { trustedPreviewUrl, previewSandbox } from '../src/academic-preview.mjs';
import { inspectAcademicHeader, validateAcademicFileHeader } from '../src/academic-upload-validation.mjs';
import { youtubeId, safeYouTubeId } from '../src/youtube-video.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const bytes = (...values) => new Uint8Array(values);
const supa = 'https://cprpndovdfnkvekewstv.supabase.co/storage/v1/object/public/edunexus-public-files/admin/a.pdf';
const google = 'https://drive.google.com/file/d/ABC012_-xyz/preview';

test('only known cross-origin document hosts can enter the iframe', () => {
  assert.equal(trustedPreviewUrl({kind:'drive'}, google),google);
  assert.equal(trustedPreviewUrl({kind:'document'},'https://docs.google.com/document/d/abc012/preview'),'https://docs.google.com/document/d/abc012/preview');
  assert.equal(trustedPreviewUrl({kind:'pdf'},supa),supa);
  assert.equal(trustedPreviewUrl({kind:'pdf'},'https://res.cloudinary.com/demo/raw/upload/v1/book.pdf'),
    'https://res.cloudinary.com/demo/raw/upload/v1/book.pdf');
  assert.equal(trustedPreviewUrl({kind:'firebase'},'', 'blob:https://edunexus.dpdns.org/abc'),
    'blob:https://edunexus.dpdns.org/abc');
  // Direct-URL PDFs are served to the iframe as same-origin blobs (Chrome
  // blocks its PDF viewer in ANY sandboxed iframe; verified blobs render
  // with the sandbox attribute omitted — see the sandbox test below).
  assert.equal(trustedPreviewUrl({kind:'pdf'},supa,'blob:https://edunexus-app.vercel.app/abc'),
    'blob:https://edunexus-app.vercel.app/abc');
  for (const source of [
    'https://drive.google.com.attacker.test/file/d/ABC012_-xyz/preview',
    'https://evil.test/x.pdf',
    'javascript:alert(1)',
    'http://drive.google.com/file/d/ABC012_-xyz/preview',
    'https://docs.google.com.evil.test/document/d/a/preview'
  ]) assert.equal(trustedPreviewUrl({kind:'drive'},source),'',source);
  assert.equal(trustedPreviewUrl({kind:'pdf'},'https://cprpndovdfnkvekewstv.supabase.co/storage/v1/object/public/private/file.pdf'),'');
  assert.equal(trustedPreviewUrl({kind:'pdf'},'https://res.cloudinary.com/demo/bad/book.pdf'),'');
  assert.equal(trustedPreviewUrl({kind:'external'},'https://trusted.example.com/book.pdf'),'');
});

test('preview sandbox isolates PDF and restricts Google document navigation', () => {
  const pdf = previewSandbox('pdf');
  const drive = previewSandbox('drive');
  assert.ok(pdf.includes('allow-downloads'));
  // Chrome's built-in PDF viewer is blocked inside ANY sandboxed iframe
  // ("This page has been blocked by Chromium") — verified live with
  // sandbox="allow-scripts allow-same-origin" for both direct and blob: URLs.
  // Verified PDF blobs therefore render with the sandbox attribute omitted,
  // but only after the fetched bytes are checked for the %PDF- signature
  // (verifyPdfBlob) so a blob: URL (our origin) can never frame non-PDF
  // content. Every other preview kind keeps the sandbox.
  assert.ok(pdf.includes('allow-scripts'));
  assert.ok(drive.includes('allow-scripts'));
  for (const value of [pdf,drive]) {
    assert.ok(!value.includes('allow-top-navigation'));
    assert.ok(!value.includes('allow-storage-access-by-user-activation'));
  }
  const component = read('src/AcademicHubPro.js');
  assert.match(component,/sandbox=\{isVerifiedPdfBlob \? undefined : previewSandbox\(links\.kind\)\}/);
  assert.match(component,/function verifyPdfBlob/);
  assert.match(component,/%PDF-/);
  assert.match(component,/src=\{frameUrl\}/);
  assert.match(component,/trustedPreviewUrl\(links, links\.preview, localUrl\)/);
  assert.doesNotMatch(component,/['"]GIF['"], ['"]SVG['"]/);
});

test('mismatched PDF, Office, PNG, JPG and WEBP headers are blocked before signing', async () => {
  assert.equal(inspectAcademicHeader('pdf',bytes(0x25,0x50,0x44,0x46,0x2d,0x31)),'');
  assert.notEqual(inspectAcademicHeader('pdf',bytes(0x3c,0x68,0x74,0x6d,0x6c)),'');
  assert.equal(inspectAcademicHeader('docx',bytes(0x50,0x4b,0x03,0x04,0)),'');
  assert.notEqual(inspectAcademicHeader('docx',bytes(0x4d,0x5a,0x90,0)),'');
  assert.equal(inspectAcademicHeader('doc',bytes(0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1)),'');
  assert.equal(inspectAcademicHeader('png',bytes(0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a)),'');
  assert.equal(inspectAcademicHeader('jpeg',bytes(0xff,0xd8,0xff)),'');
  assert.equal(inspectAcademicHeader('webp',bytes(0x52,0x49,0x46,0x46,1,2,3,4,0x57,0x45,0x42,0x50)),'');
  assert.notEqual(inspectAcademicHeader('webp',bytes(0x52,0x49,0x46,0x46,1,2,3,4,0x57,0x45,0x42,0x58)),'');
  const sample = new Uint8Array([0x25,0x50,0x44,0x46,0x2d,0x31]);
  const file = {name:'lecture.pdf',slice:()=>({arrayBuffer:async()=>sample.buffer})};
  assert.equal(await validateAcademicFileHeader(file),'');
  assert.notEqual(await validateAcademicFileHeader({...file,name:'lecture.png'}),'');
  const uploader = read('src/AcademicAdminUploader.js');
  assert.ok(uploader.indexOf('await validateAcademicFileHeader(file)') < uploader.indexOf('const signed = await signUpload(user, file)'));
});

test('human-readable text remains usable but binary renamed as text is refused', () => {
  assert.equal(inspectAcademicHeader('txt',bytes(72,101,108,108,111,10)),'');
  assert.equal(inspectAcademicHeader('csv',bytes(0xff,0xfe,97,0,44,0)),'');
  assert.notEqual(inspectAcademicHeader('txt',bytes(77,90,0,0,0)),'');
  assert.notEqual(inspectAcademicHeader('exe',bytes(77,90)),'');
});

test('app CSP protects embedding, form target and active code with existing integrations kept', () => {
  const v = JSON.parse(read('vercel.json'));
  const h = v.headers.find(r=>r.source==='/(.*)').headers;
  const csp = h.find(x=>x.key==='Content-Security-Policy')?.value;
  assert.ok(csp);
  for(const directive of ["default-src 'self'","base-uri 'self'","object-src 'none'",
    "frame-ancestors 'none'","form-action 'self'","script-src-attr 'none'",
    'https://drive.google.com','https://docs.google.com','https://www.youtube.com',
    'https://*.googleapis.com','https://*.supabase.co',"upgrade-insecure-requests"]) {
    assert.ok(csp.includes(directive), directive);
  }
  assert.ok(v.rewrites.some(x=>x.source==='/vu-notes'&&x.destination==='/index.html'));
  assert.ok(v.rewrites.some(x=>x.source==='/tutorials'&&x.destination==='/index.html'));
  assert.ok(h.find(x=>x.key==='Strict-Transport-Security'));
  assert.ok(h.find(x=>x.key==='X-Content-Type-Options'));
});

test('YouTube tutorials permit only exact HTTPS hosts and 11-character video IDs', () => {
  const id = 'pFOw-5vzVtU';
  assert.equal(youtubeId('https://www.youtube.com/watch?v=' + id), id);
  assert.equal(youtubeId('https://youtu.be/' + id), id);
  assert.equal(youtubeId('https://www.youtube.com/embed/' + id), id);
  assert.equal(safeYouTubeId(id), id);
  for (const url of [
    'https://youtube.com.attacker.test/watch?v=' + id,
    'http://www.youtube.com/watch?v=' + id,
    'https://evil-youtu.be/' + id,
    'https://www.youtube.com/watch?v=../../private',
    'https://youtu.be/' + id + '/unexpected',
    'javascript:alert(1)'
  ]) assert.equal(youtubeId(url),'',url);
  assert.equal(safeYouTubeId('javascript:alert(1)'),'');
  const component = read('src/TutorialHub.js');
  assert.match(component,/safeYouTubeId\(video\.videoId\)/);
  assert.match(component,/sandbox='allow-scripts allow-same-origin allow-presentation allow-popups'/);
});
