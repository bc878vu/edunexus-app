// First-layer browser validation before requesting a signed upload URL.
// This catches mislabeled files and avoids publishing misleading previews.
// It is NOT antivirus or server-side verification: upload tokens and metadata
// must also be restricted by the storage provider and verified after upload.
const PDF = [0x25,0x50,0x44,0x46,0x2d];
const PNG = [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a];
const JPEG = [0xff,0xd8,0xff];
const OLE = [0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1];
const ZIP = [0x50,0x4b,0x03,0x04];
const exact = (bytes, prefix, offset = 0) => prefix.every((b, index) => bytes[offset + index] === b);
const kindForExtension = Object.freeze({
  pdf:'pdf', doc:'ole', ppt:'ole', xls:'ole',
  docx:'zip', pptx:'zip', xlsx:'zip',
  jpg:'jpeg', jpeg:'jpeg', png:'png', webp:'webp',
  txt:'text', csv:'text'
});

export function inspectAcademicHeader(extension, bytes) {
  const kind = kindForExtension[String(extension || '').toLowerCase()];
  if (!kind || !bytes || !bytes.length) return 'Unsupported or empty file.';
  const valid = kind === 'pdf' ? exact(bytes,PDF)
    : kind === 'png' ? exact(bytes,PNG)
    : kind === 'jpeg' ? exact(bytes,JPEG)
    : kind === 'ole' ? exact(bytes,OLE)
    : kind === 'zip' ? exact(bytes,ZIP)
    : kind === 'webp' ? exact(bytes,[0x52,0x49,0x46,0x46])
      && exact(bytes,[0x57,0x45,0x42,0x50],8)
    : kind === 'text' ? (
      // UTF-16 BOM is valid text; otherwise NUL bytes suggest a renamed binary.
      (exact(bytes,[0xff,0xfe]) || exact(bytes,[0xfe,0xff]))
      || !bytes.some(value => value === 0)
    ) : false;
  return valid ? '' : 'The file contents do not match the selected file extension. Choose the original document or export it again before uploading.';
}

export async function validateAcademicFileHeader(file) {
  if (!file || typeof file.name !== 'string' || typeof file.slice !== 'function') {
    return 'Select a valid file.';
  }
  const extension = file.name.match(/\.([a-z0-9]{2,5})$/i)?.[1] || '';
  try {
    // Inspect only 512 bytes; do not read a 45 MiB upload into JS memory.
    const bytes = new Uint8Array(await file.slice(0,512).arrayBuffer());
    return inspectAcademicHeader(extension, bytes);
  } catch {
    return 'Could not inspect this file. Please choose it again.';
  }
}
