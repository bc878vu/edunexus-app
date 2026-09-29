import React, { useState, useEffect } from 'react';
import { listArticles, toggleLike, subscribeArticles } from './db/articles';
import { Heart, BookOpen, Share2, MessageCircle, ChevronDown, ChevronUp, Clock, Maximize2, X } from 'lucide-react';
import { sanitizeArticleHtml, articlePlainText, articleExcerpt } from './article-sanitize.mjs';
import ArticleComments, { useCommentCount } from './ArticleComments';

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

// Excerpt + plain-text helpers (shared sanitizer understands the stored HTML)
const getExcerpt = (content, maxLen = 280) => articleExcerpt(content, maxLen);
const stripHtml = (html) => articlePlainText(html);

// Single article card with excerpt, expand, like, share, comments
const ArticleCard = ({ art, idx, user, isAdmin, theme, showToast }) => {
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const commentCount = useCommentCount(art.id);
  const excerpt = getExcerpt(art.content);
  const isLong = stripHtml(art.content).length > 280;
  // likedNow: the Supabase branch returns likedBy: [] on reads (likes live in
  // article_likes), so flip the heart locally on a successful toggle.
  const [likedNow, setLikedNow] = useState(false);
  const [likeCount, setLikeCount] = useState(Number(art.likes) || 0);
  const hasLiked = likedNow || art.likedBy?.includes(user?.uid);

  useEffect(() => {
    setLikeCount(Number(art.likes) || 0);
    setLikedNow(false);
  }, [art.id, art.likes]);

  const handleLike = async () => {
    if (!user) {
      showToast("Please sign in to like", "error");
      return;
    }
    if (hasLiked) return;
    try {
      const res = await toggleLike(art.id, user.uid);
      if (res && res.liked === false) {
        showToast("Already liked", "error");
        return;
      }
      setLikedNow(true);
      setLikeCount(Number.isFinite(Number(res?.likes)) && Number(res.likes) > 0 ? Number(res.likes) : count => count + 1);
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
    <article
      className={`${theme.card} rounded-2xl border ${theme.border} overflow-hidden hover:shadow-2xl transition-all duration-300 group animate-fade-in`}
      style={{ animationDelay: `${Math.min(idx * 80, 400)}ms` }}
    >
      {/* Cover image - full visible, click for fullscreen */}
      {art.imageUrl && (
        <div className="relative bg-slate-100 dark:bg-slate-800">
          <img
            src={optimizeImageUrl(art.imageUrl)}
            alt={art.title}
            loading={idx === 0 ? "eager" : "lazy"}
            fetchpriority={idx === 0 ? "high" : "low"}
            decoding="async"
            onClick={() => setLightboxOpen(true)}
            className="w-full h-auto cursor-zoom-in hover:opacity-95 transition-opacity"
            style={{ display: 'block' }}
          />
          <button
            onClick={() => setLightboxOpen(true)}
            className="absolute bottom-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
            aria-label="View full image"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      )}

      {/* Fullscreen lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
          >
            <X size={20} />
          </button>
          <img
            src={art.imageUrl}
            alt={art.title}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
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
            <div
              className="edx-article-body"
              dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(art.content) }}
            />
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
            <span>{likeCount}</span>
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
    let alive = true;
    const load = async () => {
      try {
        const all = await listArticles({ limit: 100 });
        if (!alive) return;
        // Hide disabled articles from public
        const visible = all.filter(a => a.isActive !== false);
        setArticles(visible);
        try {
          localStorage.setItem("edunexus_articles", JSON.stringify(visible));
        } catch (e) {}
        setLoading(false);
      } catch (err) {
        console.log("Articles sync skipped", err);
        if (alive) setLoading(false);
      }
    };
    load();
    const unsubscribe = subscribeArticles({ onInvalidate: load });
    return () => { alive = false; unsubscribe(); };
  }, []);

  const visibleArticles = articles.slice(0, visibleCount);
  const hasMore = visibleCount < articles.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 pb-12">
      {/* Modern hero heading */}
      <div className="relative overflow-hidden rounded-3xl mb-8 mt-2">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 opacity-95" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="relative px-6 py-10 md:py-14 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4">
            <BookOpen size={14} className="text-white" />
            <span className="text-white text-xs font-bold tracking-wide uppercase">EduNexus Official</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-3 tracking-tight">
            Knowledge Base
          </h1>
          <p className="text-white/85 text-sm md:text-lg max-w-xl mx-auto">
            Official articles, news, and updates from EduNexus.
          </p>
          {!loading && articles.length > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5">
              <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
              <span className="text-white text-xs font-semibold">
                {articles.length} article{articles.length !== 1 ? 's' : ''} published
              </span>
            </div>
          )}
        </div>
        {/* Decorative wave */}
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 40" preserveAspectRatio="none" style={{height: '24px'}}>
          <path fill="currentColor" className="text-white dark:text-slate-900" d="M0,20 C360,40 1080,0 1440,20 L1440,40 L0,40 Z" opacity="0.15" />
        </svg>
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
