# Academic Hub reviews, download URLs and per-file SEO — rollout

This change **does not delete existing resource records, old reviews, or the original static sitemap**.

## Required release order

1. Review `firestore.rules` in the PR. Publish it in the existing Firebase project `edunexus-live-e0b84` **before or promptly after** merging the website code.
   - In Firebase Console: Firestore Database → Rules → paste/review the repository's full `firestore.rules` → Publish.
   - Alternatively from the repository root, after authenticating to the correct Firebase account: `npx firebase-tools deploy --only firestore:rules --project edunexus-live-e0b84`.
   - Do **not** deploy unrelated Storage rules or replace the entire database.
   - If the frontend deploys first, old <=800-character reviews still fall back to the prior pending-approval policy; newer long-form/instant publishing needs the new rules. Once rules publish, new reviews are public immediately.
2. Merge the PR and confirm the Vercel production deployment is green. Inspect an actual resource, submit a review as a non-admin anonymous/signed-in user, refresh the page, verify it appears to other visitors, and confirm the administrator alone can edit/delete it.
3. Test a recent Supabase-uploaded file's same-site Download button, a Firebase file preview, a legacy Google Drive link and older public reviews. The Supabase download endpoint streams binary data and is intended only for the **public** bucket; legacy external providers retain their existing direct links.
4. Visit `/resource-sitemap.xml`, open a file-page URL such as `/vu-notes/file/<document-id>/<title-slug>`, inspect HTML source for the file's own heading, description, canonical URL and safe JSON-LD, and confirm pages are served with HTTP 200. This resource sitemap lists up to 10,000 documents by design; if the library grows past that, implement sitemap pagination before relying on complete coverage.
5. Submit both `/sitemap.xml` and `/resource-sitemap.xml` in Google Search Console, inspect individual file URLs and request indexing as needed. Search engines decide independently which pages to index and how to rank them.

## Security and authenticity limits

- Firebase web app identifiers/API keys are client-facing configuration, **not secrets**. Firestore/Storage security is enforced through deployed rules, upload authorization, and least-privilege admin sessions. No public website can conceal the existence of a publicly retrievable file from browser developer tools.
- New review creation requires a Firebase-authenticated UID, permits one review per UID per file, and stores `originalComment` unchanged after administrator corrections. Anonymous users can create multiple new accounts, so this is not a guaranteed person-identity or anti-spam system. Review text is escaped; user opinions are never represented as verified facts.
- Reviews are capped at 50,000 characters to bound document storage and abuse. Firestore has per-document size limits and cannot store truly unlimited text. Earlier pending reviews remain historical records.
- Resource pages index file metadata and public comments; they do **not** guarantee that Google will index every PDF's internal text or produce top search-result placement. Public uploaded PDF downloads remain accessible under a same-site URL, while legacy external links remain on their original hosting domains.
- If a URL route errors, inspect the Vercel serverless function logs; if reviews return `permission-denied`, confirm the published Firebase rules match the repository. Running only the GitHub/Vercel build **does not deploy Firestore rules**.
