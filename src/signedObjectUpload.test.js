import { uploadToSignedObject } from './signedObjectUpload';

const SIGNED_URL = 'https://example.supabase.co/storage/v1/object/upload/sign/edunexus-public-files/admin/random/notes.pdf?token=header.payload.signature';
const signed = { uploadUrl: SIGNED_URL, contentType: 'application/pdf' };

class MockXHR {
  constructor() {
    this.upload = {};
    this.headers = {};
    this.status = 201;
    this.responseText = '{"Key":"edunexus-public-files/admin/random/notes.pdf"}';
    MockXHR.latest = this;
  }
  open(method, url, async) { this.method = method; this.url = url; this.async = async; }
  setRequestHeader(name, value) { this.headers[name] = value; }
  send(body) { this.body = body; }
  abort() { if (this.onabort) this.onabort(); }
}

beforeEach(() => { global.XMLHttpRequest = MockXHR; MockXHR.latest = null; });

test('uploads to the signed object URL without sending a bearer token or TUS signature', async () => {
  const file = new File(['CS620 notes'], 'notes.pdf', { type: 'application/pdf' });
  const progress = jest.fn();
  const task = jest.fn();
  const promise = uploadToSignedObject(file, signed, progress, task);
  const xhr = MockXHR.latest;
  expect(xhr.method).toBe('PUT');
  expect(xhr.async).toBe(true);
  expect(xhr.url).toBe(SIGNED_URL);
  expect(xhr.headers).toEqual({ 'x-upsert': 'false' });
  expect(xhr.body.get('cacheControl')).toBe('3600');
  expect(xhr.body.get('')).toBeInstanceOf(File);
  expect(task).toHaveBeenCalledWith(xhr);
  xhr.upload.onprogress({ lengthComputable: true, loaded: 11, total: 22 });
  expect(progress).toHaveBeenCalledWith(50);
  xhr.onload();
  await expect(promise).resolves.toBeUndefined();
});

test('reports a storage rejection without exposing the signed upload token', async () => {
  const file = new File(['CS620 notes'], 'notes.pdf', { type: 'application/pdf' });
  const promise = uploadToSignedObject(file, signed, () => {}, () => {});
  const xhr = MockXHR.latest;
  xhr.status = 403;
  xhr.responseText = '{"message":"Invalid Compact JWS"}';
  xhr.onload();
  await expect(promise).rejects.toThrow('signed upload URL was rejected');
});

test('an interrupted upload can be aborted', async () => {
  const file = new File(['CS620 notes'], 'notes.pdf', { type: 'application/pdf' });
  let request;
  const promise = uploadToSignedObject(file, signed, () => {}, (xhr) => { request = xhr; });
  request.abort();
  await expect(promise).rejects.toThrow('Upload cancelled');
});
