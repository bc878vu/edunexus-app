// A UI gate only: real write authorization is enforced by deployed Firebase
// Firestore/Storage rules against the verified account's signed ID token.
// This tab marker is deliberately NOT a credential and cannot authorize writes.
export const ADMIN_EMAIL = 'veducator4@gmail.com';
export const ADMIN_TAB_KEY = 'edunexus:admin:tab:v1';
export const ADMIN_LOGOUT_KEY = 'edunexus:admin:logout:v1';

let loginPending = false;
export function adminLoginStarted() { loginPending = true; }
export function adminLoginFinished() { loginPending = false; }
export function isAdminLoginPending() { return loginPending; }
export function verifiedAdmin(user) {
  return Boolean(user && user.email === ADMIN_EMAIL && user.emailVerified === true && !user.isAnonymous);
}
const session = () => {
  try { return window.sessionStorage; } catch (_) { return null; }
};
export function grantAdminTab(user) {
  if (!verifiedAdmin(user)) return false;
  try { session()?.setItem(ADMIN_TAB_KEY, user.uid); return session()?.getItem(ADMIN_TAB_KEY) === user.uid; }
  catch (_) { return false; }
}
export function clearAdminTab() {
  try { session()?.removeItem(ADMIN_TAB_KEY); } catch (_) {}
}
export function adminTabIsActive(user) {
  if (!verifiedAdmin(user)) return false;
  try { return session()?.getItem(ADMIN_TAB_KEY) === user.uid; }
  catch (_) { return false; }
}
export function currentPageIsAdmin() {
  try { return new URLSearchParams(window.location.search).get('page') === 'admin'; }
  catch (_) { return false; }
}
export function adminPanelAccess(user) {
  return adminTabIsActive(user) && currentPageIsAdmin();
}
export function broadcastAdminLogout() {
  try { window.localStorage.setItem(ADMIN_LOGOUT_KEY, String(Date.now()) + ':' + Math.random().toString(36).slice(2)); }
  catch (_) {}
}

const ADMIN_SESSION_KEY = 'edunexus:admin:session:v1';
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export function touchAdminSession() {
  try { session()?.setItem(ADMIN_SESSION_KEY, String(Date.now())); }
  catch (_) {}
}

export function adminSessionAlive() {
  try {
    const ts = Number(session()?.getItem(ADMIN_SESSION_KEY) || 0);
    return ts > 0 && (Date.now() - ts) < ADMIN_SESSION_TTL_MS;
  } catch (_) { return false; }
}
