// src/db/articles.js — articles + comments + likes adapter.
//
// Firestore today:  articles/{id}  (+ articles/{id}/comments subcollection,
// likedBy array on the article).
// Postgres target:  articles, article_comments, article_likes (plan §1).

import {
  collection, col, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit, serverTimestamp, getCountFromServer,
  supabase, USE_SUPABASE, db,
  nowIso, newId, toRow, fromRow, invertSpec, fbItem,
  cachedList, clearCachedPrefix,
  withFallback,
} from './_common.js';
import { subscribeTable, subscribeRow } from './realtime.js';
import { increment, arrayUnion } from 'firebase/firestore';
import { auth } from '../firebase-client.js';

const ARTICLES = () => col('articles');
// Firestore subcollection reference (Firebase branch only).
const commentCol = (articleId) =>
  collection(db, 'artifacts', 'edunexus-live', 'public', 'data', 'articles', articleId, 'comments');
const commentDoc = (articleId, commentId) => doc(commentCol(articleId), commentId);

const CACHE_PREFIX = 'articles_';
const COMMENT_PREFIX = 'article_comments_';

// Firestore camelCase -> Postgres snake_case (plan §1 table 2).
const ARTICLE_SPEC = {
  title: 'title',
  content: 'body',          // sanitized HTML
  imageUrl: 'cover_url',
  author: 'author',
  likes: 'likes',
  createdAt: { col: 'created_at', ts: true },
  updatedAt: { col: 'updated_at', ts: true },
  // TODO(schema): plan §1 has no columns for these Firestore fields —
  // keywords, hiddenLinks, isActive, rightsConfirmed, originalContentConfirmed,
  // excerpt (derivable), likedBy (replaced by article_likes). Extend the table
  // (e.g. an `extra` jsonb) before cutover if any must survive migration.
  keywords: null,
  hiddenLinks: null,
  isActive: null,
  rightsConfirmed: null,
  originalContentConfirmed: null,
  likedBy: null,
};
const ARTICLE_REV = invertSpec(ARTICLE_SPEC);
const toArticleRow = (data) => toRow(data, ARTICLE_SPEC);
const toArticle = (row) => fromRow(row, ARTICLE_REV, (out, r) => {
  out.content = r.body ?? out.content;
  out.imageUrl = r.cover_url ?? out.imageUrl;
  out.likedBy = []; // TODO: populate from article_likes when a component needs it; use hasLiked() meanwhile.
});

const COMMENT_SPEC = {
  userId: 'user_id',
  userName: 'user_name',
  text: 'text',
  createdAt: { col: 'created_at', ts: true },
  updatedAt: { col: 'updated_at', ts: true },
};
const COMMENT_REV = invertSpec(COMMENT_SPEC);
const toCommentRow = (data) => toRow(data, COMMENT_SPEC);
const toComment = (row) => fromRow(row, COMMENT_REV, (out, r) => { out.articleId = r.article_id; });

export async function listArticles({ limit: max = 100 } = {}) {
  const key = CACHE_PREFIX + 'all|' + max;
  return cachedList(key, async () => {
    return withFallback(
      async () => {
        const { data, error } = await supabase.from('articles').select('*')
          .order('created_at', { ascending: false }).limit(max);
        if (error) throw error;
        return (data || []).map(toArticle);
      },
      async () => {
        const snap = await getDocs(query(ARTICLES(), orderBy('createdAt', 'desc'), limit(max)));
        return snap.docs.map(fbItem);
      },
      { cacheKeys: ['articles_'] }
    );});
}

export async function getArticle(id) {
  return withFallback(
    async () => {
      const { data, error } = await supabase.from('articles').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return toArticle(data);
    },
    async () => {
      const snap = await getDoc(doc(ARTICLES(), id));
      return snap.exists() ? fbItem(snap) : null;
    },
    { cacheKeys: ['articles_'] }
  );
}

export async function createArticle(data) {
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const id = data.id || newId();
      const row = { id, ...toArticleRow(data) };
      if (row.likes === undefined) row.likes = 0;
      if (!row.author) row.author = 'EduNexus';
      if (!row.created_at) row.created_at = nowIso();
      const { error } = await supabase.from('articles').insert(row);
      if (error) throw error;
      return id;
    },
    async () => {
      const { id: _drop, ...rest } = data;
      const ref = _drop ? doc(ARTICLES(), _drop) : await addDoc(ARTICLES(), { ...rest });
      if (_drop) await setDoc(ref, { ...rest });
      return ref.id;
    },
    { cacheKeys: ['articles_'] }
  );
}

export async function updateArticle(id, data) {
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const row = toArticleRow(data);
      row.updated_at = nowIso();
      const { error } = await supabase.from('articles').update(row).eq('id', id);
      if (error) throw error;
      return;
    },
    async () => {
      const { id: _drop, ...rest } = data;
      await updateDoc(doc(ARTICLES(), id), { ...rest });
    },
    { cacheKeys: ['articles_'] }
  );
}

export async function deleteArticle(id) {
  clearCachedPrefix(CACHE_PREFIX);
  return withFallback(
    async () => {
      const { error } = await supabase.from('articles').delete().eq('id', id);
      if (error) throw error;
      return;
    },
    async () => {
      await deleteDoc(doc(ARTICLES(), id));
    },
    { cacheKeys: ['articles_'] }
  );
}

/**
 * Like an article (one like per user).
 * Firebase branch: updateDoc { likes: increment(1), likedBy: arrayUnion(uid) } — verbatim.
 * Supabase branch: insert into article_likes; the DB trigger bumps articles.likes.
 * Returns { liked } — false when the user had already liked.
 */
export async function toggleLike(articleId, userId) {
  if (!articleId || !userId) throw new Error('articleId and userId are required');
  const current = auth.currentUser;
  if (!current || current.uid !== userId) throw new Error('Authenticated user required');
  const token = await current.getIdToken();
  const { data, error } = await supabase.functions.invoke('article-social', {
    headers: { Authorization: 'Bearer ' + token },
    body: { action: 'like', articleId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  clearCachedPrefix(CACHE_PREFIX);
  return { liked: !!data?.liked, likes: Number(data?.likes) || undefined };
}

/** Whether userId already liked articleId (drives the hasLiked UI state). */
export async function hasLiked(articleId, userId) {
  if (!articleId || !userId) return false;
  return withFallback(
    async () => {
      const { data, error } = await supabase.from('article_likes').select('article_id')
        .eq('article_id', articleId).eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return !!data;
    },
    async () => {
      const snap = await getDoc(doc(ARTICLES(), articleId));
      const likedBy = snap.exists() ? snap.data().likedBy : null;
      return Array.isArray(likedBy) && likedBy.includes(userId);
    },
    { cacheKeys: ['articles_'] }
  );
}

// ---- comments ----

export async function listComments(articleId) {
  const key = COMMENT_PREFIX + articleId;
  return cachedList(key, async () => {
    // During the data migration older comments can live in Supabase while new
    // Firebase-authenticated comments live in Firestore. Read both stores and
    // merge them so neither generation disappears from the article UI.
    let sbItems = [];
    try {
      const { data, error } = await supabase.from('article_comments').select('*')
        .eq('article_id', articleId).order('created_at', { ascending: true });
      if (error) throw error;
      sbItems = (data || []).map(row => ({ ...toComment(row), _backend: 'supabase' }));
    } catch (_) { /* Firestore comments can still load below. */ }
    let fbItems = [];
    try {
      const snap = await getDocs(query(commentCol(articleId), orderBy('createdAt', 'asc')));
      fbItems = snap.docs.map(s => ({ ...fbItem(s), _backend: 'firebase' }));
    } catch (_) { /* Preserve any Supabase comments already loaded. */ }
    const merged = new Map();
    [...sbItems, ...fbItems].forEach(item => merged.set(String(item.id), item));
    return [...merged.values()].sort((a, b) => {
      const av = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : Date.parse(a.createdAt || 0) || 0;
      const bv = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : Date.parse(b.createdAt || 0) || 0;
      return av - bv;
    });
  });
}

export async function addComment(articleId, { userId, userName, text }) {
  clearCachedPrefix(COMMENT_PREFIX + articleId);
  const cleanText = String(text || '').trim();
  if (!cleanText) throw new Error('Comment text is required');
  const current = auth.currentUser;
  if (!current || current.uid !== userId) throw new Error('Authenticated user required');
  const token = await current.getIdToken();
  const { data, error } = await supabase.functions.invoke('article-social', {
    headers: { Authorization: 'Bearer ' + token },
    body: {
      action: 'comment',
      articleId,
      userName: userName || 'Student',
      text: cleanText.slice(0, 1000),
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.id;
}

export async function updateComment(articleId, commentId, data) {
  clearCachedPrefix(COMMENT_PREFIX + articleId);
  return withFallback(
    async () => {
      const row = toCommentRow(data);
      row.updated_at = nowIso();
      const { error } = await supabase.from('article_comments').update(row).eq('id', commentId);
      if (error) throw error;
      return;
    },
    async () => {
      await updateDoc(commentDoc(articleId, commentId), { ...data });
    },
    { cacheKeys: ['article_comments_'] }
  );
}

export async function deleteComment(articleId, commentId) {
  clearCachedPrefix(COMMENT_PREFIX + articleId);
  return withFallback(
    async () => {
      const { error } = await supabase.from('article_comments').delete().eq('id', commentId);
      if (error) throw error;
      return;
    },
    async () => {
      await deleteDoc(commentDoc(articleId, commentId));
    },
    { cacheKeys: ['article_comments_'] }
  );
}

// ---- realtime (onInvalidate only, per plan §7) ----

export function subscribeArticles({ onInvalidate }) {
  const invalidate = () => { clearCachedPrefix(CACHE_PREFIX); try { onInvalidate(); } catch (_) {} };
  return subscribeTable({
    table: 'articles',
    onInvalidate: invalidate,
    firebaseQuery: query(ARTICLES(), orderBy('createdAt', 'desc')),
  });
}

export function subscribeArticle(id, { onInvalidate }) {
  const invalidate = () => { clearCachedPrefix(CACHE_PREFIX); try { onInvalidate(); } catch (_) {} };
  return subscribeRow({
    table: 'articles', id, onInvalidate: invalidate, firebaseDocRef: doc(ARTICLES(), id),
  });
}

export function subscribeComments(articleId, { onInvalidate }) {
  const invalidate = () => { clearCachedPrefix(COMMENT_PREFIX + articleId); try { onInvalidate(); } catch (_) {} };
  return subscribeTable({
    table: 'article_comments',
    filter: `article_id=eq.${articleId}`,
    onInvalidate: invalidate,
    firebaseQuery: query(commentCol(articleId), orderBy('createdAt', 'asc')),
  });
}

/** Exact count of articles (dashboard stats). */
export async function countArticles() {
  return withFallback(
    async () => {
      const { count, error } = await supabase.from('articles').select('id', { count: 'exact', head: true });
      if (error) throw error;
      return Number(count) || 0;
    },
    async () => {
      const snap = await getCountFromServer(query(ARTICLES()));
      return Number(snap.data().count) || 0;
    },
    { cacheKeys: ['articles_'] }
  );
}
