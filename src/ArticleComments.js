import React, { useState, useEffect } from 'react';
import { listComments, addComment, deleteComment, subscribeComments } from './db/articles';
import { MessageCircle, Send, Trash2 } from 'lucide-react';

// Facebook-style comments for articles
export default function ArticleComments({ articleId, user, sessionUid, isAdmin, theme, showToast }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [showAll, setShowAll] = useState(false);
  // Supabase RLS requires user_id == auth.uid() (the Supabase session uid),
  // but the app's `user` prop comes from Firebase auth only. The page prepares
  // a Supabase (anon) session and passes its uid down; fall back to the
  // Firebase uid only when no session exists.
  const uid = sessionUid || user?.uid || null;

  useEffect(() => {
    if (!articleId) return;
    let alive = true;
    const refresh = async () => {
      try {
        const items = await listComments(articleId);
        if (alive) setComments(items);
      } catch (err) {
        console.log('Comments sync skipped', err);
      }
    };
    refresh();
    const unsub = subscribeComments(articleId, { onInvalidate: refresh });
    const onChanged = (event) => {
      if (!event?.detail?.articleId || event.detail.articleId === articleId) refresh();
    };
    window.addEventListener('edunexus:article-comment-changed', onChanged);
    return () => { alive = false; unsub(); window.removeEventListener('edunexus:article-comment-changed', onChanged); };
  }, [articleId]);

  const handlePost = async () => {
    const text = newComment.trim();
    if (!text) return;
    if (!user) {
      showToast('Please sign in to comment', 'error');
      return;
    }
    setPosting(true);
    try {
      const saved = await addComment(articleId, {
        userId: uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Student',
        text: text.slice(0, 1000),
      });
      if (saved?.id) {
        setComments(prev => prev.some(item => item.id === saved.id) ? prev : [...prev, saved]);
        window.dispatchEvent(new CustomEvent('edunexus:article-comment-changed', { detail: { articleId } }));
      }
      setNewComment('');
      showToast('Comment posted', 'success');
    } catch (e) {
      console.log('Comment post failed', e);
      showToast('Could not post comment', 'error');
    }
    setPosting(false);
  };

  const handleDelete = async (comment) => {
    if (!user) return;
    const canDelete = isAdmin || comment.userId === uid;
    if (!canDelete) return;
    try {
      await deleteComment(articleId, comment.id);
      showToast('Comment deleted', 'success');
    } catch (e) {
      showToast('Could not delete comment', 'error');
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    // Firestore Timestamp on the Firebase branch, ISO string / Date on Supabase.
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString();
  };

  const visibleComments = showAll ? comments : comments.slice(0, 3);

  return (
    <div className={`mt-4 pt-4 border-t ${theme.border}`}>
      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-3 mb-4">
          {visibleComments.map(c => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">
                  {(c.userName || 'S')[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className={`rounded-2xl px-3 py-2 ${theme.input || 'bg-slate-100 dark:bg-slate-800'}`}>
                  <p className={`text-xs font-bold ${theme.text}`}>{c.userName || 'Student'}</p>
                  <p className={`text-sm ${theme.text} break-words`} style={{overflowWrap: 'anywhere'}}>{c.text}</p>
                </div>
                <div className="flex items-center gap-3 mt-1 ml-1">
                  <span className={`text-[11px] ${theme.textMuted}`}>{formatTime(c.createdAt)}</span>
                  {(isAdmin || (uid && c.userId === uid)) && (
                    <button
                      onClick={() => handleDelete(c)}
                      className="text-[11px] text-red-500 hover:underline font-semibold flex items-center gap-1"
                    >
                      <Trash2 size={11} /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {comments.length > 3 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs font-bold text-indigo-500 hover:underline ml-11"
            >
              {showAll ? 'Show less' : `View all ${comments.length} comments`}
            </button>
          )}
        </div>
      )}

      {/* Comment input */}
      {user ? (
        <div className="flex gap-2 items-center">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">
              {((user.displayName || user.email || 'S')[0] || 'S').toUpperCase()}
            </span>
          </div>
          <input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handlePost()}
            placeholder="Write a comment..."
            maxLength={1000}
            className={`flex-1 ${theme.input} rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500`}
            disabled={posting}
          />
          <button
            onClick={handlePost}
            disabled={posting || !newComment.trim()}
            className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Post comment"
          >
            <Send size={16} />
          </button>
        </div>
      ) : (
        <p className={`text-xs ${theme.textMuted} text-center py-2`}>
          <MessageCircle size={12} className="inline mr-1" />
          Sign in to join the discussion
        </p>
      )}
    </div>
  );
}

// Export comment count hook for article cards
export function useCommentCount(articleId) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!articleId) return;
    let alive = true;
    const refresh = async () => {
      try {
        const items = await listComments(articleId);
        if (alive) setCount(items.length);
      } catch (_) {}
    };
    refresh();
    const unsub = subscribeComments(articleId, { onInvalidate: refresh });
    const onChanged = (event) => {
      if (!event?.detail?.articleId || event.detail.articleId === articleId) refresh();
    };
    window.addEventListener('edunexus:article-comment-changed', onChanged);
    return () => {
      alive = false;
      unsub();
      window.removeEventListener('edunexus:article-comment-changed', onChanged);
    };
  }, [articleId]);
  return count;
}
