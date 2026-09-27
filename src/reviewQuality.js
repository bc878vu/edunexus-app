// Lightweight client-side hygiene; Firestore rules, authenticated ownership,
// user reporting and administrator review remain the real authorization layer.
// Do not silently rewrite user feedback or treat passing this check as "verified".
const LINK = /(?:https?:\/\/|www\.)\S+/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const REPEATED = /(.)\1{24,}/;
export function countWords(raw) {
  const text = String(raw || '').trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}
export function reviewQualityMessage(raw) {
  const text=String(raw||'').trim();
  if(!text)return 'Please write your review before publishing.';
  if(countWords(text)>50)return 'Please keep your review to 50 words or fewer.';
  if(LINK.test(text)||EMAIL.test(text))return 'Do not include URLs or email addresses in a public file review.';
  if(REPEATED.test(text))return 'Please remove repeated filler characters and submit a meaningful review.';
  return '';
}
