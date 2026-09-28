import {
 ADMIN_EMAIL, ADMIN_LOGOUT_KEY, ADMIN_TAB_KEY, ADMIN_SESSION_KEY, ADMIN_SESSION_TIMEOUT_MS,
 adminLoginFinished, adminLoginStarted, isAdminLoginPending,
 adminPanelAccess, adminTabIsActive, broadcastAdminLogout,
 clearAdminTab, currentPageIsAdmin, grantAdminTab, verifiedAdmin,
 stampAdminSession, touchAdminSession, adminSessionAlive, clearAdminSession
} from './adminSession';

const verified = { uid: 'admin-firebase-uid', email: ADMIN_EMAIL, emailVerified: true, isAnonymous: false };
const unverified = { ...verified, emailVerified: false };
const student = { uid: 'another-uid', email: 'student@example.com', emailVerified: true, isAnonymous: false };

beforeEach(() => {
 clearAdminTab(); adminLoginFinished();
 window.history.replaceState({}, '', '/?page=home');
 window.localStorage.removeItem(ADMIN_LOGOUT_KEY);
});
afterEach(() => { clearAdminTab(); adminLoginFinished(); window.history.replaceState({}, '', '/'); });

test('email verification and exact Firebase identity are required independently of any browser flag', () => {
 expect(verifiedAdmin(verified)).toBe(true);
 expect(verifiedAdmin(unverified)).toBe(false);
 expect(verifiedAdmin(student)).toBe(false);
 expect(verifiedAdmin({ ...verified, isAnonymous: true })).toBe(false);
 window.sessionStorage.setItem(ADMIN_TAB_KEY, verified.uid);
 expect(adminPanelAccess(unverified)).toBe(false);
 expect(adminPanelAccess(student)).toBe(false);
});

test('admin privileges are restricted to the active Admin Panel tab and vanish upon exit', () => {
 expect(grantAdminTab(verified)).toBe(true);
 expect(adminTabIsActive(verified)).toBe(true);
 expect(adminPanelAccess(verified)).toBe(false); // cannot open admin tools from Exam Prep/home
 window.history.replaceState({}, '', '/?page=admin');
 expect(currentPageIsAdmin()).toBe(true);
 expect(adminPanelAccess(verified)).toBe(true);
 window.history.replaceState({}, '', '/?page=exam-prep');
 expect(adminPanelAccess(verified)).toBe(false); // even with a previously verified Firebase user
 clearAdminTab();
 window.history.replaceState({}, '', '/?page=admin');
 expect(adminTabIsActive(verified)).toBe(false);
 expect(adminPanelAccess(verified)).toBe(false); // refresh or browser Back cannot re-enable admin
});

test('a valid admin token alone is not enough; the tab marker is bound to the same UID', () => {
 expect(grantAdminTab(verified)).toBe(true);
 expect(adminTabIsActive({ ...verified, uid: 'another-admin-uid' })).toBe(false);
 expect(grantAdminTab(unverified)).toBe(false);
});

test('logout produces a cross-tab storage signal and never writes an administrator password', () => {
 expect(window.localStorage.getItem(ADMIN_LOGOUT_KEY)).toBeNull();
 broadcastAdminLogout();
 expect(window.localStorage.getItem(ADMIN_LOGOUT_KEY)).toMatch(/^[0-9]+:/);
 expect(window.localStorage.getItem(ADMIN_LOGOUT_KEY)).not.toContain(verified.email);
});

test('admin login transition never doubles as a security credential', () => {
 adminLoginStarted(); expect(isAdminLoginPending()).toBe(true);
 expect(adminTabIsActive(verified)).toBe(false);
 adminLoginFinished(); expect(isAdminLoginPending()).toBe(false);
});

test('admin session timeout is 30 minutes', () => {
 expect(ADMIN_SESSION_TIMEOUT_MS).toBe(30 * 60 * 1000);
});

test('granting the admin tab starts a live 30-minute session', () => {
 expect(adminSessionAlive()).toBe(false);
 expect(grantAdminTab(verified)).toBe(true);
 expect(adminSessionAlive()).toBe(true);
 expect(adminTabIsActive(verified)).toBe(true);
 expect(window.sessionStorage.getItem(ADMIN_SESSION_KEY)).toMatch(/"lastActiveAt":[0-9]+/);
});

test('an expired session is dead and deactivates the tab', () => {
 expect(grantAdminTab(verified)).toBe(true);
 const expired = Date.now() - ADMIN_SESSION_TIMEOUT_MS - 1000;
 window.sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ loginAt: expired, lastActiveAt: expired }));
 expect(adminSessionAlive()).toBe(false);
 expect(adminTabIsActive(verified)).toBe(false);
 // expiry cleans up its own storage
 expect(window.sessionStorage.getItem(ADMIN_SESSION_KEY)).toBeNull();
});

test('touch refreshes an aging session but cannot revive an expired one', () => {
 expect(grantAdminTab(verified)).toBe(true);
 const aging = Date.now() - ADMIN_SESSION_TIMEOUT_MS + 60000; // 1 minute left
 window.sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ loginAt: aging, lastActiveAt: aging }));
 expect(touchAdminSession()).toBe(true);
 const refreshed = JSON.parse(window.sessionStorage.getItem(ADMIN_SESSION_KEY)).lastActiveAt;
 expect(Date.now() - refreshed).toBeLessThan(5000);
 const expired = Date.now() - ADMIN_SESSION_TIMEOUT_MS - 1000;
 window.sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ loginAt: expired, lastActiveAt: expired }));
 expect(touchAdminSession()).toBe(false);
 expect(adminSessionAlive()).toBe(false);
});

test('clearing the admin tab also clears the session', () => {
 expect(grantAdminTab(verified)).toBe(true);
 expect(adminSessionAlive()).toBe(true);
 clearAdminTab();
 expect(adminSessionAlive()).toBe(false);
 expect(window.sessionStorage.getItem(ADMIN_SESSION_KEY)).toBeNull();
 expect(window.sessionStorage.getItem(ADMIN_TAB_KEY)).toBeNull();
});

test('stamp and clear work standalone without a tab grant', () => {
 expect(stampAdminSession()).toBe(true);
 expect(adminSessionAlive()).toBe(true);
 clearAdminSession();
 expect(adminSessionAlive()).toBe(false);
});
