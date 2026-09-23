# EduNexus AdSense readiness and editorial audit — 24 September 2026

This file records **what code can improve** versus **what only a site owner, Google or a human rights-holder can verify**. No implementation or word count can guarantee Google AdSense approval, indexing, search ranking, copyright compliance, or traffic quality.

## Already implemented on the PR branch

| Area | Code change | Verification needed |
|---|---|---|
| Original course education | Six standalone, manually drafted conceptual guides with worked examples and HTML first response. Subject match links appear on relevant uploaded file pages and inside Academic Hub. | Editor should fact-check and extend to further subjects using current course curricula. Never claim uploaded files were checked merely because a guide mentions their subject. |
| Existing files | Related file links and honest source/rights notes on resource landing pages; no record or binary deletion. | Check each legacy document's actual publisher, licence and permission. |
| Copyright of new uploads | Upload form requires an explicit and stored rights-basis declaration. | Signed-in administrator must really check the exact work, including third-party illustrations/embedded materials. |
| Copyright of old uploads | Admin > Academic has an opt-in rights-audit selector that records a declaration only after manual inspection. Unverified legacy files remain in place. | Inspect originals; if a document cannot be legally shared, make a deliberate removal/access decision. This audit cannot certify the contents of an unseen PDF. |
| Original article publishing | New articles require 450+ meaningful characters and administrator assertion of originality/rights; old articles remain editable. | Word count does not prove content quality. Review content for plagiarism, fabricated claims and accuracy before publication. |
| Public article SEO | Server-rendered article URLs, escaped public text, unique canonical/title and a dynamic sitemap; older short articles remain accessible but are noindexed instead of deleted. | Use Search Console to confirm actual Google indexing and review which articles should be expanded rather than auto-publishing filler. |
| Accessibility | Existing main website preserved; standalone pages have server-rendered links and responsive navbar; non-JS visitors get guide links instead of an empty app message. | Manually test browser/mobile, auth state, broken links and uploaded file download links. The React SPA still requires JS for interactive features and is not fully server-rendered. |
| Student reviews and forum | Immediate genuine review publishing preserved, obvious user-entered URL/email/filler checks, private one-report-per-account review/forum reporting with admin inspection and admin delete/edit controls. Forum hides previously exposed participant email from public display without deleting stored data. | Publish Firestore rules separately. Manual moderation required; client checks can be bypassed. Anonymous Firebase accounts are not unique real-world identities. |
| Ads | ads.txt and existing verification metadata remain. Standalone article/file/guide pages include an AdSense loader only when Vercel env `ADSENSE_SITE_APPROVED=true` is set **after** Google approval; ad slots are not automatically inserted near download buttons. | Account and site must be approved. Check browser ad-blockers, Google auto-ads settings, Google Publisher Policies, actual ad placements and privacy/consent requirements where applicable. |

## Release sequence

1. Merge this PR after GitHub Actions and Vercel preview checks succeed; no force-push, record deletion or database migration is required.
2. Review and publish repository `firestore.rules` to the intended Firebase project (`edunexus-live-e0b84`). Vercel does **not** deploy Firebase security rules.
3. Test as a real public/non-admin user: submit a genuine resource review (must appear immediately), report a different user's review, report a forum post, then sign in as a verified admin to inspect those private reports and remove inappropriate content. Do not assume reporting is live before the rules deploy.
4. Open Admin > Academic and audit every legacy file one by one. For files owned by third parties, identify the actual licence/permission before recording rights. Add sources and worked examples to more course guides after human editorial review.
5. Verify `/sitemap.xml`, `/resource-sitemap.xml`, `/articles-sitemap.xml`, all six `/learning/<course>/<slug>` pages and a real `/articles/read/<id>/<slug>` page. The new article sitemap lists up to 2,000 records; if the database grows larger, add sitemap pagination instead of pretending complete coverage. Existing file sitemap also has a bounded page count.
6. In Google Search Console, inspect a few guide/article/file URLs, verify rendered HTML, check coverage/canonical and submit the three sitemap URLs. A sitemap is a discovery aid, **not** proof a page has been indexed.
7. Reconcile live-site content, rights, reviews, forum moderation, navigation, Google site approval requirements and traffic sources **before** deciding to resubmit AdSense.
8. **Only after** the AdSense account and site show approved/ready status, optionally set `ADSENSE_SITE_APPROVED=true` in Vercel Production and redeploy. Google may show no ads until its own configuration/review is complete. If uncertain, leave this flag unset.

## Known limitations and non-claims

- Site owner controls content and rights; code cannot establish licences of old university handouts/past papers, or guarantee originality and quality of unseen Firestore articles.
- Google alone decides AdSense acceptance, ad serving, URL indexing and ranking.
- Review/forum report queues are reactive: an inappropriate comment might appear until the administrator handles it. Browser-side spam checks do not defend against direct Firestore API calls. For strong automated moderation, use authenticated server-side validation, abuse-rate limits and App Check or equivalent protection in a separately planned release.
- This does not redesign every route in the existing React single-page application. The interactive app remains intact; high-value independent guides, source-backed articles and per-file pages receive SSR.
- Search Console/Analytics/AdSense account statuses, Google re-review and legal/rights determination are outside the GitHub repository and cannot be truthfully marked as complete by a CI pass.
