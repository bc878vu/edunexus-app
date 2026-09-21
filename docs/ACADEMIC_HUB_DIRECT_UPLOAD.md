# Academic Hub V2: direct uploads and downloads

The updated Academic Hub at \`/?page=academic\` preserves the existing Firebase file collection, existing admin upload page, Cloudinary uploads, Drive links, exam preparation and resource review flow. It adds a verified-administrator workspace directly on the Academic Hub page, optional sorting and format filters, accessible responsive upload controls and a preview panel near the library toolbar.

## Administrator direct file upload

1. Sign in with the **verified Firebase administrator account** using the site's existing login. Open Academic Hub and select **Upload file** in the administrator workspace. The workspace does not appear for students or anonymous users.
2. Choose or drag a supported PDF, Word, PowerPoint, Excel, TXT, CSV, JPG, PNG or WEBP file under 14 MiB. Provide a title, select a subject, optionally add a description and choose **Upload & publish file**.
3. The page uploads the bytes to Firebase Storage under \`academic-hub/{adminUid}/{uniqueId}/{filename}\`. The uploaded object's \`Content-Disposition\` metadata is set to **attachment** so a normal storage download link requests download rather than in-browser navigation.
4. Once uploaded, the page records the URL, storage path, file extension, size, description and subject in the **existing** \`artifacts/edunexus-live/public/data/files\` collection. The normal resource list updates through its existing realtime listener; students can download the new file via its file card. If saving the new metadata fails, only the newly uploaded binary is cleaned up, not any existing resource or user data.
5. Cancel interrupts a transfer in progress. The new form cannot cancel while the database record is being published. Existing admin-upload flows are untouched.

**Deployment prerequisites:** The connected Firebase project must have Firebase Storage enabled and the deployed Storage rules must permit the verified administrator to upload/read the new object. The checked-in \`storage.rules\` already allow admin writes below 15 MiB and public reads, and the existing \`firestore.rules\` allow admin writes to the files collection. If the live rules differ, back them up and carefully merge the required permissions before deploying from Firebase Console. Deploying Vercel does **not** publish Firebase Storage/Firestore rules, and GitHub changes do not themselves create a Storage bucket or enable billing.

**Direct downloads:** Newly uploaded objects use the Firebase Storage download URL with the \`attachment\` response metadata. The original external/Google Drive/Cloudinary links retain their provider-specific handling; permissions, large-file confirmation and cross-origin browser restrictions are still controlled by those providers. The native \`download\` HTML attribute alone cannot force a download from an unrelated host.

**Inline preview:** For newly uploaded PDFs/images the browser attempts to retrieve the bytes through the Firebase Storage SDK and creates a short-lived blob URL for viewing inside the page. This requires Storage CORS to allow the web origin. If preview is unavailable, the page explains the problem and preserves the direct download link. Preview URLs are revoked when the panel closes or changes files.

**Existing file deletion:** The existing Academic Hub delete control removes the Firestore file record. It does **not** erase pre-existing Cloudinary objects, Google Drive files, or other remote uploads. This update does not remove or migrate any legacy file.

## Performance and user-experience improvements

- The initial library query remains capped at 60 documents with extra pages loaded only when requested. The screen displays a limited number of cards at a time, while deferred local search, type filtering and sorting operate over the loaded collection.
- On subject selection, the folder grid collapses so the user reaches the resources faster; the **Browse folders** control expands it again.
- File previews and reviews appear directly below the search/filter bar rather than below a long grid of cards.
- File upload form handles invalid formats, empty files, oversized files, metadata-save failures, progress and cancellation explicitly. New styles are scoped to the Academic Hub with mobile breakpoints and reduced-motion support.

## Manual live verification checklist

- Confirm Home, existing admin panel, Academic Hub folders, Exam Prep and other pages render as before; try the Academic Hub on a narrow mobile viewport and with keyboard navigation.
- With the verified administrator signed in, upload a small PDF and an image from a device. Confirm both documents appear in the correct subject with matching titles, and that **Download** produces the uploaded bytes and a meaningful filename. Test progress, cancel and an invalid or too-large file.
- Check whether each uploaded PDF/image previews inside the page. If it fails while downloads succeed, investigate bucket CORS and any restrictive browser settings, not Firestore record reads.
- Verify a normal student cannot see the admin upload controls or write to Firebase Storage; confirm the existing resource review approval flow still works if the nested Firestore review rules have already been published.
- Test sorting, format filtering, searching, folder collapse, browser back/forward and loading older file batches.

Automated build checks can validate that the React project compiles; they do not establish live Firebase bucket rules, provider download behavior or mobile browser performance.
