// A UI gate only: real write authorization is enforced by deployed Firebase
// Firestore/Storage rules against the verified account's signed ID token.
// This tab marker is deliberately NOT a credential and cannot authorize writes.
export const ADMIN_EMAIL = 'veducator4@gmail.com';
export const ADMIN_TAB_KEY = 'edunexus:admin:tab:v1';
export const ADMIN_LOGOUT_KEY = 'edunexus:admin:logout:v1';
// Admin session lifetime: 30 minutes of inactivity, rolling. Any admin
// activity (login, navigation, clicks, key presses) refreshes the timer.
// When it lapses the tab marker is cleared and the next auth check signs out.
export const ADMIN_SESSION_KEY = 'edunexus:admin:session:v1';
export const ADMIN_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

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
  try {
    session()?.setItem(ADMIN_TAB_KEY, user.uid);
    stampAdminSession();
    return session()?.getItem(ADMIN_TAB_KEY) === user.uid;
  }
  catch (_) { return false; }
}
export function clearAdminTab() {
  try { session()?.removeItem(ADMIN_TAB_KEY); } catch (_) {}
  clearAdminSession();
}
// --- 30-minute rolling admin session -------------------------------------
// Stored in sessionStorage, so it is still scoped to this tab: closing the
// tab always ends the session, exactly like before.
export function stampAdminSession() {
  try {
    const now = Date.now();
    session()?.setItem(ADMIN_SESSION_KEY, JSON.stringify({ loginAt: now, lastActiveAt: now }));
    return true;
  } catch (_) { return false; }
}
export function touchAdminSession() {
  try {
    const raw = session()?.getItem(ADMIN_SESSION_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) || {};
    if (!data.lastActiveAt || Date.now() - data.lastActiveAt > ADMIN_SESSION_TIMEOUT_MS) return false;
    data.lastActiveAt = Date.now();
    session()?.setItem(ADMIN_SESSION_KEY, JSON.stringify(data));
    return true;
  } catch (_) { return false; }
}
export function clearAdminSession() {
  try { session()?.removeItem(ADMIN_SESSION_KEY); } catch (_) {}
}
export function adminSessionAlive() {
  try {
    const raw = session()?.getItem(ADMIN_SESSION_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) || {};
    if (!data.lastActiveAt || Date.now() - data.lastActiveAt > ADMIN_SESSION_TIMEOUT_MS) {
      clearAdminSession();
      return false;
    }
    return true;
  } catch (_) { return false; }
}
export function adminTabIsActive(user) {
  if (!verifiedAdmin(user)) return false;
  if (!adminSessionAlive()) return false;
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
