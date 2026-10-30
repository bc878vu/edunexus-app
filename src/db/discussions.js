// src/db/discussions.js — forum discussions adapter.
//
// Postgres: discussions, discussion_reports (plan §1 tables 10-11).
// Supabase-only (Phase 2: the Firebase fallback was removed; the Supabase
// path below is unchanged from the withFallback version).
//
// Field note: today's Firestore field is `content`; plan §1 names the column
// `body`. The adapter maps content <-> body on the Supabase branch.

import {
  collection, query, orderBy,
  supabase, db,
  nowIso, newId, toRow, fromRow, invertSpec,
  cachedList, clearCachedPrefix,
} from './_common.js';
import { subscribeTable } from './realtime.js';

const DISCUSSIONS = () => collection(db, 'artifacts', 'edunexus-live', 'public', 'data', 'discussions');

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
  // Dropped on the Supabase branch (pre-existing): `userEmail` (always '' in
  // today's writes) and `adminReplyAt` (write-only; no component reads it).
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
    let q = supabase.from('discussions').select('*');
    if (!includeHidden) q = q.eq('is_active', true);
    const { data, error } = await q.order('created_at', { ascending: false }).limit(max);
    if (error) throw error;
    return (data || []).map(toDiscussion);
  });
}

/** Post a discussion. Returns the id. */
export async function addDiscussion({ userId, userName, content }) {
  if (!String(content || '').trim()) throw new Error('Discussion content is required');
  clearCachedPrefix(CACHE_PREFIX);
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

export async function updateDiscussion(id, data) {
  clearCachedPrefix(CACHE_PREFIX);
  const row = toDiscussionRow(data);
  row.updated_at = nowIso();
  const { error } = await supabase.from('discussions').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteDiscussion(id) {
  clearCachedPrefix(CACHE_PREFIX);
  const { error } = await supabase.from('discussions').delete().eq('id', id);
  if (error) throw error;
}

/** Admin: pin/unpin a post to the top. */
export async function setPinned(id, pinned) {
  clearCachedPrefix(CACHE_PREFIX);
  const { error } = await supabase.from('discussions')
    .update({ pinned: !!pinned, updated_at: nowIso() }).eq('id', id);
  if (error) throw error;
}

/** Admin: save or clear the admin reply. Empty text clears it. */
export async function setAdminReply(id, text) {
  clearCachedPrefix(CACHE_PREFIX);
  const reply = String(text || '').trim();
  const { error } = await supabase.from('discussions').update({
    admin_reply: reply || null,
    // adminReplyAt has no Postgres column (write-only in Firestore); updated_at carries the change.
    updated_at: nowIso(),
  }).eq('id', id);
  if (error) throw error;
}

/** Admin: hide/show a post. */
export async function setDiscussionActive(id, active) {
  clearCachedPrefix(CACHE_PREFIX);
  const { error } = await supabase.from('discussions')
    .update({ is_active: !!active, updated_at: nowIso() }).eq('id', id);
  if (error) throw error;
}

/** Private report on a post (one per reporter; doc id == reporter uid). */
export async function reportDiscussion(id, reporterUid, reason) {
  const { error } = await supabase.from('discussion_reports').upsert({
    discussion_id: id, reporter_uid: reporterUid, reason, created_at: nowIso(),
  }, { onConflict: 'discussion_id,reporter_uid' });
  if (error) throw error;
}

/** Admin: list private reports on a post. */
export async function listDiscussionReports(id) {
  const { data, error } = await supabase.from('discussion_reports').select('*')
    .eq('discussion_id', id).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toReport);
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
  const { count, error } = await supabase.from('discussions').select('id', { count: 'exact', head: true });
  if (error) throw error;
  return Number(count) || 0;
}
