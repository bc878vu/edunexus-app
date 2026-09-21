# Academic Hub upgrade

The `/?page=academic` route now mounts `src/AcademicHubPro.js` on demand. The previous `AcademicHub` and `FileItem` code is preserved in `src/App.js` as a rollback reference; the existing administrator file upload/folder management flow remains unchanged.

## How the updated library works

- The newest 60 documents from the existing `artifacts/edunexus-live/public/data/files` collection are watched in real time; the rest load in 60-file batches when requested.
- Subject folders still come from defaults, the existing `meta/folders` document and loaded file metadata.
- Search and folder counters intentionally cover **loaded** resources; Firestore is not a full-text search engine. Additional documents are discoverable via **Load next 60 resources**.
- Preview renders images, PDFs and recognized Google Drive/Docs documents inside the page if the host permits embedding. The original-source action remains available for unsupported types.
- Google Drive file links use the provider's export/download endpoint and Cloudinary uploads use the provider's attachment-delivery transformation. A different external file host might display a document instead of downloading, and private Google Drive files may request permission. There is no misleading promise that any arbitrary external URL supports forced downloads.
- Reviews live under each file document's `reviews/{uid}` subcollection. A Firebase-authenticated student can submit one pending review per file; only a verified administrator can approve it. The page reads only approved reviews publicly and provides a moderation queue to the existing admin on the selected file.
- Descriptive study material is educational guidance; this change does not import copyrighted material or invent counts of uploaded files.

## Firebase deployment required

The new review feature needs the additional nested subcollection rule in the repo's `firestore.rules`. Publishing the React frontend to Vercel does not publish database rules. Before updating the live rules, back up the currently published Firebase rules and merge any independent production-only changes. Then deploy via the Firebase Console's Firestore Database > Rules or `firebase deploy --only firestore:rules --project edunexus-live-e0b84`.

Without publishing this additional rule, the existing **file listing and downloads remain available**, but the review panel may display a permission-denied message.

## Suggested smoke tests

1. Load Academic Hub and compare existing subject folders and file titles with the old page. Search by a real file title, open a subject, switch to all subjects, and load the next batch.
2. Preview a public PDF, Cloudinary upload and Google Drive document. Confirm unsupported formats still offer an original-source link. Try Download for both Cloudinary and Drive, noting host permissions.
3. Submit a review with a student account; verify it remains private. Sign in as the verified admin, open that file's review panel, approve the review and confirm it is then publicly visible. Test that non-admin users cannot publish reviews directly.
4. Check desktop/mobile sizes and existing Home, Admin, Articles, Exam Prep and AI pages. Legacy source and data are not removed.

No existing Firestore documents are deleted or migrated by this feature or by publishing its rules.
