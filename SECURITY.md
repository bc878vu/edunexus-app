# EduNexus security notes

## Required before production

1. Rotate the Firebase/Gemini credentials if any secret was ever committed to Git history.
2. Do not put admin passwords, Gemini API keys, or other secrets in `src/` or any `REACT_APP_*` variable.
3. Keep `GEMINI_API_KEY` server-side only (Vercel Environment Variables / backend environment).
4. Configure the Firebase Authentication admin account with a verified email. Firestore admin writes are restricted by `firestore.rules`.
5. Deploy the Firestore rules before relying on the admin UI for privileged writes.
6. Remove the already-committed `backend/node_modules` directory from Git history/repository and let the deployment install dependencies from `package.json`.

## Current protections

- Gemini endpoint validates prompt input and limits prompt size.
- Gemini endpoint has a simple per-IP rate limit.
- Provider errors are sanitized before returning to clients.
- Gemini API key is no longer logged by the backend.
- Production security headers are defined in `vercel.json`.
- Firestore uses default-deny rules with explicit public-read/admin-write rules for announcements and articles.
