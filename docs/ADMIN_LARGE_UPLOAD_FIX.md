# Admin Academic Upload — large-file fix and deployment checklist

## Root cause

The former Admin Panel Academic upload used a legacy Cloudinary `auto/upload` request. The reported response `File size too large. Got 15390564. Maximum is 10485760` is a 10 MiB upload cap from that upload path, **not a Vercel React compilation error**. The separate Academic Hub uploader also previously stopped files above 14 MiB, while the checked-in broad Firebase Storage rule had a 15 MiB limit.

This update makes both the Admin Panel's Academic tab and the public Academic Hub's verified-admin upload workspace use the **same Firebase Storage `uploadBytesResumable` flow**. New upload records are still created in the **existing Firestore files collection** so existing subject pages and file links remain intact. The Admin Panel also retains the external URL/Google Drive link form and all original folder records. Old Cloudinary resources are not deleted or migrated.

## What changes in the admin workflow

- Open **Admin Panel → Academic**. Use **Upload a resource directly** to drag/select an allowed PDF, Office, text or image file up to **100 MiB**. Choose a folder, title and optional description; watch upload progress or cancel mid-transfer.
- The browser uploads bytes to `academic-hub/{adminUid}/{uniqueId}/{sanitizedFileName}` in Firebase Storage, rather than sending the large file through the previous Cloudinary path or a Vercel function. A successful upload creates one public Firestore file record with attachment download URL, storagePath, size and metadata.
- Admins can continue adding external Google Drive/Cloudinary/HTTP(S) resource URLs in the adjacent **Add an external resource link** form. All original records remain available, including previously uploaded Cloudinary files.
- **Manage study files** now offers search, limited rows per render, open/download, title and subject editing, and a confirm-before-remove action. Removing a **listing** does not delete any underlying Storage or third-party file, avoiding unexpected loss of original bytes.
- Existing folders are retained. When an administrator uploads into a new folder, that folder is added to the existing folder menu.

## REQUIRED: publish the new Firebase Storage rules

**Vercel deployment does not publish Firebase Storage rules.** Without this step, the new 100 MiB frontend validation may succeed but large uploads will still fail with `storage/unauthorized` or `storage/retry-limit-exceeded`.

1. Open the Firebase Console for project `edunexus-live-e0b84`, select **Storage → Rules** and back up the currently published rules.
2. Compare them with the repository's `storage.rules`. If production has changes not in this repository, merge them carefully rather than overwriting production permissions.
3. Publish the merged Storage rules. The new `academic-hub/{userId}/{uploadId}/{fileName}` rule allows **verified-admin creation up to 100 MiB** with recognized document/image MIME types; the original tutorials/video and general 15 MiB Storage rules remain unchanged.
4. Firestore's existing `files` admin-write rule must also be published and Firebase Storage must be enabled for the configured bucket `edunexus-live-e0b84.firebasestorage.app`.
5. Reopen the website, sign in with the email-verified admin Firebase account, upload the 15,390,564-byte test file and confirm a new record is visible in Admin → Manage Files and Academic Hub. Click Download to verify the saved file. Existing old files should still open.

CLI deployment option, when authenticated to the correct project and after inspecting the live rules:

```bash
firebase deploy --only storage --project edunexus-live-e0b84
```

The tracked `firebase.json` must contain a Storage rules entry to use that exact CLI command. If it is absent, publish from Firebase Console or add the corresponding Storage config first.

## Validation boundaries

The connected GitHub CI/Vercel preview build validates React compilation. A build cannot validate the live Firebase bucket permissions, administrator identity, network/CORS behavior, file download from every external host or actual binary upload. Test the real 15 MB file after publishing Storage rules. If an upload fails, keep the browser's exact error code and confirm the configured bucket and authenticated user.
