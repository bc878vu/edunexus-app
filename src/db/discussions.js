// src/db/discussions.js — forum discussions adapter.
//
// Firestore today:  discussions/{id}  (+ discussions/{id}/reports/{uid})
// Postgres target:  discussions, discussion_reports (plan §1 tables 10-11).
//
// Field note: today's Firestore field is `content`; plan §1 names the column
// `body`. The adapter maps content <-> body on the Supabase branch.

import {
  collection, doc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit, serverTimestamp, getCountFromServer,
  supabase, USE_SUPABASE, db,
  nowIso, newId, toRow, fromRow, invertSpec, fbItem,
  cachedList, clearCachedPrefix,
} from './_common.js';
import { subscribeTable } from './realtime.js';

const DISCUSSIONS = () => collection(db, 'artifacts', 'edunexus-live', 'public', 'data', 'discussions');
const reportCol = (id) => collection(DISCUSSIONS(), id, 'reports');

const CACHE_PREFIX = 'discussions_';

const DISCUSSION_SPEC = {
  content: 'body',
  body: 'body',
  title: 'title',
  userId: 'user_id',
  userName: 'user_name',
  isActive: 'is_active',
  pinned: 'pinned',
  adminReply: 'admin_reply',
  createdAt: { col: 'created_at', ts: true },
  updatedAt: { col: 'updated_at', ts: true },
  // TODO(schema): plan §1 has no columns for `userEmail` (always '' in today's
  // writes — safe to drop) and `adminReplyAt` (write-only; no component reads
  // it). Extend the table if either must survive migration.
  userEmail: null,
  adminReplyAt: null,
};
const DISCUSSION_REV = invertSpec(DISCUSSION_SPEC);
const toDiscussionRow = (data) => toRow(data, DISCUSSION_SPEC);
const toDiscussion = (row) => fromRow(row, DISCUSSION_REV, (out, r) => {
  out.content = r.body ?? out.content;
});

const REPORT_SPEC = {
  reporterUid: 'reporter_uid',
  reason: 'reason',
  createdAt: { col: 'created_at', ts: true },
};
const REPORT_REV = invertSpec(REPORT_SPEC);
const toReport = (row) => fromRow(row, REPORT_REV, (out, r) => { out.discussionId = r.discussion_id; });

/** List discussions, newest first. includeHidden=true for the admin panel. */
export async function listDiscussions({ includeHidden = false, limit: max = 200 } = {}) {
  const key = CACHE_PREFIX + (includeHidden ? 'all' : 'public') + '|' + max;
  return cachedList(key, async () => {
    if (USE_SUPABASE) {
      let q = supabase.from('discussions').select('*');
      if (!includeHidden) q = q.eq('is_active', true);
      const { data, error } = await q.order('created_at', { ascending: false }).limit(max);
      if (error) throw error;
      return (data || []).map(toDiscussion);
    }
    const snap = await getDocs(query(DISCUSSIONS(), orderBy('createdAt', 'desc'), limit(max)));
    let items = snap.docs.map(fbItem);
    if (!includeHidden) items = items.filter((p) => p.isActive !== false);
    return items;
  });
}

/** Post a discussion. Returns the id. */
export async function addDiscussion({ userId, userName, content }) {
  if (!String(content || '').trim()) throw new Error('Discussion content is required');
  clearCachedPrefix(CACHE_PREFIX);
  if (USE_SUPABASE) {
    const id = newId();
    const { error } = await supabase.from('discussions').insert({
      id,
      body: String(content).trim(),
      user_id: userId || null,
      user_name: userName || 'Student',
      created_at: nowIso(),
    });
    if (error) throw error;
    return id;
  }
  const ref = await addDoc(DISCUSSIONS(), {
    content: String(content).trim(),
    createdAt: serverTimestamp(),
    userId: userId || null,
    userName: userName || 'Student',
    userEmail: '', // Do not reveal account email in public posts.
  });
  return ref.id;
}

export async function updateDiscussion(id, data) {
  clearCachedPrefix(CACHE_PREFIX);
  if (USE_SUPABASE) {
    const row = toDiscussionRow(data);
    row.updated_at = nowIso();
    const { error } = await supabase.from('discussions').update(row).eq('id', id);
    if (error) throw error;
    return;
  }
  await updateDoc(doc(DISCUSSIONS(), id), { ...data });
}

export async function deleteDiscussion(id) {
  clearCachedPrefix(CACHE_PREFIX);
  if (USE_SUPABASE) {
    const { error } = await supabase.from('discussions').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  await deleteDoc(doc(DISCUSSIONS(), id));
}

/** Admin: pin/unpin a post to the top. */
export async function setPinned(id, pinned) {
  clearCachedPrefix(CACHE_PREFIX);
  if (USE_SUPABASE) {
    const { error } = await supabase.from('discussions')
      .update({ pinned: !!pinned, updated_at: nowIso() }).eq('id', id);
    if (error) throw error;
    return;
  }
  await updateDoc(doc(DISCUSSIONS(), id), { pinned: !!pinned, updatedAt: serverTimestamp() });
}

/** Admin: save or clear the admin reply. Empty text clears it. */
export async function setAdminReply(id, text) {
  clearCachedPrefix(CACHE_PREFIX);
  const reply = String(text || '').trim();
  if (USE_SUPABASE) {
    const { error } = await supabase.from('discussions').update({
      admin_reply: reply || null,
      // adminReplyAt has no Postgres column (write-only in Firestore); updated_at carries the change.
      updated_at: nowIso(),
    }).eq('id', id);
    if (error) throw error;
    return;
  }
  if (!reply) {
    await updateDoc(doc(DISCUSSIONS(), id), { adminReply: '', adminReplyAt: null });
    return;
  }
  await updateDoc(doc(DISCUSSIONS(), id), { adminReply: reply, adminReplyAt: serverTimestamp() });
}

/** Admin: hide/show a post. */
export async function setDiscussionActive(id, active) {
  clearCachedPrefix(CACHE_PREFIX);
  if (USE_SUPABASE) {
    const { error } = await supabase.from('discussions')
      .update({ is_active: !!active, updated_at: nowIso() }).eq('id', id);
    if (error) throw error;
    return;
  }
  await updateDoc(doc(DISCUSSIONS(), id), { isActive: !!active, updatedAt: serverTimestamp() });
}

/** Private report on a post (one per reporter; doc id == reporter uid). */
export async function reportDiscussion(id, reporterUid, reason) {
  if (USE_SUPABASE) {
    const { error } = await supabase.from('discussion_reports').upsert({
      discussion_id: id, reporter_uid: reporterUid, reason, created_at: nowIso(),
    }, { onConflict: 'discussion_id,reporter_uid' });
    if (error) throw error;
    return;
  }
  await setDoc(doc(reportCol(id), reporterUid), {
    reporterUid, reason, createdAt: serverTimestamp(),
  });
}

/** Admin: list private reports on a post. */
export async function listDiscussionReports(id) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('discussion_reports').select('*')
      .eq('discussion_id', id).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(toReport);
  }
  const snap = await getDocs(reportCol(id));
  return snap.docs.map((s) => ({ id: s.id, ...s.data() }));
}

export function subscribeDiscussions({ includeHidden = false, onInvalidate }) {
  const invalidate = () => { clearCachedPrefix(CACHE_PREFIX); try { onInvalidate(); } catch (_) {} };
  return subscribeTable({
    table: 'discussions',
    onInvalidate: invalidate,
    firebaseQuery: query(DISCUSSIONS(), orderBy('createdAt', 'desc')),
  });
}

/** Exact count of discussions (dashboard stats). */
export async function countDiscussions() {
  if (USE_SUPABASE) {
    const { count, error } = await supabase.from('discussions').select('id', { count: 'exact', head: true });
    if (error) throw error;
    return Number(count) || 0;
  }
  const snap = await getCountFromServer(query(DISCUSSIONS()));
  return Number(snap.data().count) || 0;
}
