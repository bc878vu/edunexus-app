# EduNexus free hybrid academic file storage

## Connected services verified

- Firebase Authentication and the existing Firestore \`artifacts/edunexus-live/public/data/files\` collection remain the system of record for users, categories, file metadata and resource reviews.
- The existing \`edunexus-app\` Supabase project is active in a Free organization. A dedicated **public** \`edunexus-public-files\` bucket was added with a **45 MiB** per-file limit and the listed PDF/Office/text/image MIME types. The unrelated private \`ai-quiz-sources\` bucket and its policies were not altered.
- The existing Google Drive account is connected in ChatGPT. The EduNexus website **does not inherit that connection's OAuth authorization**. Drive is integrated through the site's existing admin file-link form; direct-to-Drive uploads from the website would require a separate Google OAuth consent and Drive API integration.

## Architecture and permissions

1. An email-verified EduNexus administrator picks a supported local file under 45 MiB in **Admin → Academic** or **Academic Hub → Upload file**.
2. The browser refreshes the Firebase ID token and sends it to \`edunexus-sign-upload\` on the same Supabase project. This custom-authenticated Edge Function verifies Google's Firebase ID-token signature and validates the expected Firebase issuer/audience, user ID, administrator email and email verification. It accepts calls only from the production EduNexus origin (plus local development).
3. The server-side function uses Supabase's automatically provisioned service-role secret to generate an expiring **single-object signed upload token**. The private secret is never sent to the browser, committed to GitHub or stored in the React app. Function gateway JWT verification is disabled *only* because its body verifies the separate Firebase token using Google's public keys. An arbitrary user or Supabase public API key cannot mint upload tokens.
4. The browser uses the signed token as \`x-signature\` for Supabase's official TUS resumable-upload endpoint, uploading 6 MiB chunks with retry and progress reporting. The browser cannot overwrite another file because each authorized upload gets a random object path.
5. On successful upload, the administrator's existing Firestore permissions add one file document with \`sourceType: 'supabase-storage'\`, public URL, storage path, title, subject, extension, filename and size. All old Firebase Storage, Drive and Cloudinary documents remain untouched. This feature does not delete data or remove any older uploader source history.
6. The public Academic Hub previews supported PDFs/images through the Supabase public URL and downloads through the provider's \`?download=filename\` response. Old providers retain their existing behavior and resource reviews.
7. Larger files use **Admin → Academic → Google Drive**: manually upload the file to Drive, choose the appropriate sharing permission (e.g. anyone with link / viewer when public sharing is authorized), paste the Drive link and save it to the existing Firestore category. This does not require Firebase Storage billing.

Do not upload private credentials or personal student records to the **public** academic file bucket. This bucket is intended exclusively for redistributable, public study material. Free-plan storage and bandwidth quotas still apply; uploading a file does not grant permission to redistribute third-party copyrighted content.

## Production validation

The Supabase project and Free organization, existing Firebase client configuration and Drive connection were checked before changes. The new bucket creation and Edge Function deployment were confirmed by Supabase. GitHub CI and Vercel production build validate the frontend compilation but **cannot impersonate the administrator, supply a real 15 MiB file or verify the final browser upload and download**.

Manual test once the production frontend is deployed:
- In the verified admin account, open Admin → Academic. Existing subjects including CS620 should be present.
- Upload the 15,390,564-byte CS620 PDF. Look for an upload progress percentage, completion message, and a new file card in Manage Files and Academic Hub.
- Open its preview and use its Download button. Confirm the downloaded bytes match the original.
- In a normal student session, verify the file is readable/downloadable but upload controls are hidden.
- Add an external Drive link for a different file; verify the old and new files coexist under the correct subject.
- If signing fails, check the Edge Function error, Firebase user token and function status; if the resumable transfer fails, inspect its network error. If Firestore publishing fails after successful binary upload, use the public object URL shown in the error before retrying; the file may already exist.

**No one should copy a Supabase service-role key, Firebase private key, or Google OAuth refresh token into React, GitHub, chat, or a public environment variable.**
