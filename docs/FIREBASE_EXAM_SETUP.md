# EduNexus Exam Prep: Firestore access setup

## Why the MCQ bank displayed an error

The previous commit included a corrupted `firestore.rules` file: several expressions were split by duplicated deny-all blocks. That file could not be deployed as valid Firebase rules. The website may also still be using its older, live rules, which have no permission for the new `examMcqs`, `examReviews`, or `examReviewSubmissions` collections.

A Vercel frontend deployment **does not deploy Firebase Security Rules**. Updating the GitHub source or redeploying Vercel alone is insufficient.

## Publish the repaired rules

Firebase project ID (from `src/firebase-client.js`): `edunexus-live-e0b84`.

1. Sign in to the Firebase Console with an account authorized to manage this project. Open **Firestore Database → Rules**. Back up the currently published rules before changing anything.
2. Compare the live rules with this repository's [firestore.rules](../firestore.rules). If production contains additional collection permissions not represented in the repository, merge them carefully before publishing: deploying these rules replaces the currently active entire Firestore ruleset.
3. Publish the final combined, valid rules in the Firebase Console **or** use the Firebase CLI from the project root:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules --project edunexus-live-e0b84
```

The repository's `firebase.json` config points to `firestore.rules`; the command deploys **Firestore rules only**. It does not deploy Firebase Storage rules, clear collections, create question records, or deploy the Vercel website. Firebase may take a short time to apply the published rules.

## Verify the website

1. Reload [Exam Prep](https://edunexus-app.vercel.app/?page=exam-prep) in a regular browser session and select `CS101` → `Finalterm`. The former database-permission error should no longer appear. The **No published MCQs yet** state is expected when the collection has not been populated.
2. Sign in through EduNexus's existing admin flow with the verified Firebase administrator account. Open **Exam Prep → Admin tools**; publish a small, original, appropriately licensed CS101 question with four options and an explanation.
3. Return to the MCQ Bank tab; confirm that the new question appears, that choosing an option reveals feedback, and that the score updates.
4. Test **Paper Reviews** using a student account: submit a completed-exam experience, then confirm that it is invisible publicly until the administrator approves it. Test rejection separately.

## If the error persists

- In browser developer tools, inspect the failed Firestore request and its exact error code. `permission-denied` usually indicates the live rules or project path still do not authorize the request; `unavailable` suggests a network/backend connection problem. A missing collection by itself should return an empty result when reads are allowed.
- Confirm that the published Firebase project is `edunexus-live-e0b84`, not a different Firebase project, and that the rules include the `artifacts/edunexus-live/public/data/examMcqs/{questionId}` match.
- Avoid changing rules to `allow read, write: if true` as a workaround. Public **read** of published practice content is intended; publishing and moderation remain restricted to the verified administrator.

## Existing website preserved

This feature uses isolated exam collections. The original announcements, articles, files, tutorials, profiles, discussions, and user-specific Firestore paths remain in the rules. Exam Prep is code-split and its moving resource orb is hidden only on that page; existing pages retain their layout and floating controls.
