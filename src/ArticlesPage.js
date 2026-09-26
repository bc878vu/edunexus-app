import React, { useState, useEffect } from 'react';
import { db } from './firebase-client';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, increment, arrayUnion } from 'firebase/firestore';
import { Heart, BookOpen, Share2, MessageCircle, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import RichContent from './RichContent';
import ArticleComments, { useCommentCount } from './ArticleComments';
const appId = 'edunexus-live';

// Local date formatter (matches App.js formatDate)
const formatDate = (timestamp) => {
  if (!timestamp) return 'Just now';
  const date = timestamp.toDate ? timestamp.toDate() : new Date();
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date);
};

// Cloudinary image optimize helper
const optimizeImageUrl = (url) => {
  if (!url || !url.includes("/upload/")) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto,w_800/");
};

const articlePublicPath = (article) => {
  const id = String(article.id || '');
  const slug = String(article.title || 'article').normalize('NFKD').toLowerCase()
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80) || 'article';
  return '/articles/read/' + encodeURIComponent(id) + '/' + slug;
};

// Strip HTML tags for excerpt
const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim();
};

const getExcerpt = (content, maxLen = 280) => {
  const plain = stripHtml(content);
  if (plain.length <= maxLen) return plain;
  const cut = plain.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > maxLen * 0.7 ? cut.slice(0, lastSpace) : cut).trim() + '...';
};

// Single article card with excerpt, expand, like, share, comments
const ArticleCard = ({ art, idx, user, isAdmin, theme, showToast }) => {
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const commentCount = useCommentCount(art.id);
  const excerpt = getExcerpt(art.content);
  const isLong = stripHtml(art.content).length > 280;
  const hasLiked = art.likedBy?.includes(user?.uid);

  const handleLike = async () => {
    if (!user) {
      showToast("Please sign in to like", "error");
      return;
    }
    if (hasLiked) return;
    try {
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "articles", art.id),
        { likes: increment(1), likedBy: arrayUnion(user.uid) }
      );
      showToast("Liked!", "success");
    } catch (e) {
      showToast("Could not like", "error");
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: art.title,
      text: getExcerpt(art.content, 100),
      url: window.location.origin + articlePublicPath(art),
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showToast("Shared successfully!", "success");
      } catch (err) {}
    } else {
      try {
        await navigator.clipboard.writeText(`${art.title}\n${window.location.origin + articlePublicPath(art)}`);
        showToast("Link copied to clipboard!", "success");
      } catch (err) {
        showToast("Failed to copy link", "error");
      }
    }
  };

  return (
    <article className={`${theme.card} rounded-2xl border ${theme.border} overflow-hidden hover:shadow-xl transition-all duration-300 group`}>
      {/* Cover image */}
      {art.imageUrl && (
        <div className="relative overflow-hidden bg-slate-100 dark:bg-slate-800">
          <a href={articlePublicPath(art)} aria-label={`Read: ${art.title}`}>
            <img
              src={optimizeImageUrl(art.imageUrl)}
              alt={art.title}
              loading={idx === 0 ? "eager" : "lazy"}
              fetchpriority={idx === 0 ? "high" : "low"}
              decoding="async"
              className="w-full max-h-[320px] object-cover group-hover:scale-[1.02] transition-transform duration-500"
            />
          </a>
        </div>
      )}

      <div className="p-6 md:p-8">
        {/* Meta row */}
        <div className={`flex flex-wrap items-center gap-2 text-xs ${theme.textMuted} mb-3`}>
          <span className="bg-gradient-to-r from-red-500 to-rose-500 text-white px-2.5 py-1 rounded-full font-bold text-[10px] tracking-wide uppercase">
            Official
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} /> {formatDate(art.createdAt)}
          </span>
          {art.author && art.author !== 'Admin' && (
            <span>• By {art.author}</span>
          )}
        </div>

        {/* Title */}
        <h2 className={`text-xl md:text-2xl font-bold ${theme.text} mb-3 leading-snug`}>
          <a href={articlePublicPath(art)} className="hover:text-indigo-500 transition-colors">
            {String(art.title)}
          </a>
        </h2>

        {/* Excerpt or full content */}
        <div className={`${theme.text} leading-relaxed mb-4 ${theme.textMuted && !expanded ? '' : ''}`}>
          {expanded ? (
            <div className="whitespace-pre-wrap">
              <RichContent value={art.content} />
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{excerpt}</p>
          )}
        </div>

        {/* Read more / Show less */}
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 text-sm font-bold text-indigo-500 hover:text-indigo-600 mb-4 transition-colors"
          >
            {expanded ? (
              <>Show less <ChevronUp size={16} /></>
            ) : (
              <>Read more <ChevronDown size={16} /></>
            )}
          </button>
        )}

        {/* Action bar - Facebook style */}
        <div className={`flex items-center gap-1 md:gap-2 border-t ${theme.border} pt-3`}>
          <button
            onClick={handleLike}
            disabled={hasLiked}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              hasLiked
                ? "text-red-500 cursor-default"
                : `${theme.textMuted} hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500`
            }`}
          >
            <Heart size={18} className={hasLiked ? "fill-current" : ""} />
            <span>{art.likes || 0}</span>
            <span className="hidden sm:inline">Like</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              showComments
                ? "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                : `${theme.textMuted} hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-500`
            }`}
          >
            <MessageCircle size={18} />
            <span>{commentCount}</span>
            <span className="hidden sm:inline">Comments</span>
          </button>

          <button
            onClick={handleShare}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${theme.textMuted} hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-500 transition-colors`}
          >
            <Share2 size={18} />
            <span className="hidden sm:inline">Share</span>
          </button>

          <a
            href={articlePublicPath(art)}
            className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors`}
          >
            <BookOpen size={16} />
            <span className="hidden sm:inline">Full Article</span>
            <span className="sm:hidden">Read</span>
          </a>
        </div>

        {/* Comments section */}
        {showComments && (
          <ArticleComments
            articleId={art.id}
            user={user}
            isAdmin={isAdmin}
            theme={theme}
            showToast={showToast}
          />
        )}
      </div>
    </article>
  );
};

const ArticlesPage = ({ user, isAdmin, theme, showToast }) => {
  const [articles, setArticles] = useState(() => {
    try {
      const cached = localStorage.getItem("edunexus_articles");
      const parsed = cached ? JSON.parse(cached) : [];
      return parsed.filter(a => a.isActive !== false);
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(articles.length === 0);
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    const q = query(
      collection(db, "artifacts", appId, "public", "data", "articles"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (s) => {
      const all = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Hide disabled articles from public
      const visible = all.filter(a => a.isActive !== false);
      setArticles(visible);
      try {
        localStorage.setItem("edunexus_articles", JSON.stringify(visible));
      } catch (e) {}
      setLoading(false);
    }, (err) => {
      console.log("Articles sync skipped", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const visibleArticles = articles.slice(0, visibleCount);
  const hasMore = visibleCount < articles.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4">
      {/* Heading */}
      <div className="text-center mb-8 pt-4">
        <h1 className={`text-3xl md:text-4xl font-extrabold ${theme.text} mb-2`}>
          Knowledge Base
        </h1>
        <p className={`${theme.textMuted} text-sm md:text-base`}>
          Official articles, news, and updates from EduNexus.
        </p>
        {!loading && articles.length > 0 && (
          <p className={`text-xs ${theme.textMuted} mt-2`}>
            {articles.length} article{articles.length !== 1 ? 's' : ''} published
          </p>
        )}
      </div>

      {/* Skeletons */}
      {loading && (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`${theme.card} rounded-2xl border ${theme.border} overflow-hidden animate-pulse`}>
              <div className="h-48 bg-slate-200 dark:bg-slate-700" />
              <div className="p-6 space-y-3">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Articles */}
      {!loading && (
        <div className="space-y-6">
          {visibleArticles.map((art, idx) => (
            <ArticleCard
              key={art.id}
              art={art}
              idx={idx}
              user={user}
              isAdmin={isAdmin}
              theme={theme}
              showToast={showToast}
            />
          ))}

          {articles.length === 0 && (
            <div className={`${theme.card} p-12 rounded-2xl border ${theme.border} text-center`}>
              <BookOpen size={48} className={`mx-auto mb-4 ${theme.textMuted} opacity-40`} />
              <p className={`${theme.textMuted}`}>No articles published yet. Check back soon!</p>
            </div>
          )}

          {/* Load more */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={() => setVisibleCount(c => c + 10)}
                className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-lg"
              >
                Load More Articles ({articles.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ArticlesPage;
export { articlePublicPath };
