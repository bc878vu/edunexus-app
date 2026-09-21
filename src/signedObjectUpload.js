// Supabase's documented uploadToSignedUrl protocol: signed object-upload URL,
// multipart PUT, no Supabase service key or Firebase token on the storage request.
// XHR provides real upload progress and cancellation for a 45 MiB free-plan file.
// TUS x-signature rejected valid user attempts with "Invalid Compact JWS";
// do not silently retry the same failed resumable request.
export function uploadToSignedObject(file, signed, onProgress, onTask) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve();
    };
    xhr.open('PUT', signed.uploadUrl, true);
    xhr.timeout = 120000;
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round(event.loaded / event.total * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return finish();
      let message = '';
      try {
        const payload = JSON.parse(xhr.responseText || '{}');
        message = [payload.message, payload.error_description, payload.error]
          .find((value) => typeof value === 'string') || '';
      } catch (_) { /* Only expose a safe, short diagnostic. */ }
      const invalidSignature = /Invalid Compact JWS|invalid.*(jwt|signature)/i.test(message);
      finish(new Error(invalidSignature
        ? 'The Supabase signed upload URL was rejected. Check the Edge Function signing configuration.'
        : 'Supabase upload failed (HTTP ' + xhr.status + ')' +
          (message ? ': ' + message.slice(0, 160) : '. Check bucket settings and your connection.')));
    };
    xhr.onerror = () => finish(new Error('The signed upload request failed. Check your connection or browser extensions.'));
    xhr.ontimeout = () => finish(new Error('The signed upload timed out. Please retry.'));
    xhr.onabort = () => finish(new Error('Upload cancelled.'));
    const data = new FormData();
    data.append('cacheControl', '3600');
    // An explicit MIME type avoids mismatches for Office files on some browsers.
    const part = file.type === signed.contentType ? file :
      new File([file], file.name, { type: signed.contentType, lastModified: file.lastModified });
    data.append('', part, file.name);
    onTask(xhr);
    try { xhr.send(data); } catch (error) { finish(error); }
  });
}

