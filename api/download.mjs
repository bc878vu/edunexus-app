const ALLOWED_HOSTS = new Set([
  "drive.google.com",
  "docs.google.com",
  "res.cloudinary.com",
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
]);

function safeName(value) {
  const name = String(value || "EduNexus-resource.pdf").replace(/[\\/:*?"<>|]/g, "_").trim();
  return name || "EduNexus-resource.pdf";
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const raw = String(req.query?.url || "");
    const target = new URL(raw);
    if (!/^https?:$/.test(target.protocol) || !ALLOWED_HOSTS.has(target.hostname)) {
      return res.status(400).json({ error: "Unsupported download source" });
    }
    const response = await fetch(target.toString(), { redirect: "follow" });
    if (!response.ok || !response.body) return res.status(response.status || 502).json({ error: "Source file could not be fetched" });
    const name = safeName(req.query?.filename || "EduNexus-resource.pdf");
    res.statusCode = 200;
    res.setHeader("Content-Type", response.headers.get("content-type") || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`);
    const length = response.headers.get("content-length");
    if (length) res.setHeader("Content-Length", length);
    if (response.headers.get("etag")) res.setHeader("ETag", response.headers.get("etag"));
    const buffer = Buffer.from(await response.arrayBuffer());
    return res.end(buffer);
  } catch (error) {
    console.error("Academic download error", error);
    return res.status(400).json({ error: "Invalid download request" });
  }
}
