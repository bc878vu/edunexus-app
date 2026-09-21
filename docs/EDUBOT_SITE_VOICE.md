# EduBot AI — site-aware chat, language and optional voice

## Scope implemented

This change replaces the basic floating EduBot UI **without changing** the website's pages, Firestore rules, files, subject folders, exams, WhatsApp button or Firebase authentication.

- Guided navigation to existing public EduNexus pages: Academic Hub, Quiz/Midterm/Finalterm practice, CGPA, tutorials, articles, discussion, AI Quiz, flashcards, planner, portfolio, contact, privacy and terms.
- Small, cached, on-demand reads of explicitly **public** Firestore announcements, articles, highlights, tutorials, files and publicly posted exam reviews. Each reply receives only a bounded, relevance-ranked excerpt. Missing or stale data is described as such. This is **not a complete index** of all website assets or a live WhatsApp API.
- The publicly displayed EduNexus WhatsApp **join invitation** and a direct group button are available. Chat contents, WhatsApp member lists, closed-group messages and the group's current state **cannot be accessed** without a separate, authorized, consent-based integration. Do not imply otherwise.
- Roman Urdu, Urdu and English conversational responses via the existing \`/api/gemini\` server endpoint. No AI key in React; existing server-side \`GEMINI_API_KEY\` must be configured, have provider quota and respond normally.
- Optional browser-native speech recognition (microphone button, browser permission required) and optional speech synthesis (Listen per answer or explicit “Read replies aloud” toggle). Microphone does not auto-send: student reviews/edit transcript and presses Send. Speech recognition/voice availability and Urdu voices vary by browser, device and installed language packs. A browser speech service **may process audio** under its own privacy rules; EduNexus does not store raw recordings.
- The site's existing permission policy blocked the microphone globally (\`microphone=()\`). Only the same origin is now permitted to request microphone access (\`microphone=(self)\`), subject to user approval. Camera and geolocation stay disallowed.
- Message history exists only in component state for the current open session; it is not written to Firestore, localStorage or WhatsApp.
- Resource URL filtering removes auth-like query parameters before including public links in AI prompt context. Student identity and private Firestore collections are never fetched for the prompt.

## Live verification checklist

1. Deploy latest GitHub \`main\` commit to Vercel when builds are available. A passing GitHub build **does not mean Vercel production has updated**.
2. Open the EduBot button. Ask “CS620 ka quiz kahan hai?”, “Academic Hub ki files kaise download karun?”, and “EduNexus WhatsApp group link do”. Expect relevant website navigation and invite link, not invented group posts.
3. Ask about an existing public article/resource title, and then ask about a deliberately nonexistent resource. Expect an answer grounded in the available snapshot, or honest uncertainty.
4. In a browser that supports SpeechRecognition, press microphone, grant browser permission, speak Urdu/Roman Urdu/English and check transcript before sending. Test deny permission and unsupported browsers.
5. Press Listen on an assistant reply, then Stop. Enable/disable automatic reading; verify voice stops when the window closes.
6. Check desktop/mobile, keyboard navigation and reduced-motion mode. Confirm the existing WhatsApp floating button works.
7. Confirm the server-side Gemini API key is configured, accessible to production functions, and its rate/quota supports intended traffic. Without that, a visible, helpful “AI unavailable” message should appear; no false answer is generated.

**Limits**: this is a public, bounded knowledge assistant, not omniscient and not an authorized WhatsApp group reader. Audio recognition is browser/provider-dependent; browser microphone permission is always the user's choice.
