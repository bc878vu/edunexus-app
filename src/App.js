import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Home,
  MessageSquare,
  MessageCircle,
  Briefcase,
  LogOut,
  LogIn,
  HelpCircle,
  Menu,
  X,
  Lock,
  Send,
  Search,
  Download,
  Upload,
  ExternalLink,
  Sparkles,
  CheckCircle,
  Trash2,
  Edit,
  Github,
  Linkedin,
  Mail,
  Phone,
  Brain,
  Megaphone,
  Calendar,
  Plus,
  Folder,
  File,
  FileText,
  Loader,
  Layers,
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
  Eye,
  EyeOff,

  // 🔹 extra icons used in JSX
  Code,
  Trophy,
  Star,
  Info,
  AlertCircle,
  PlayCircle,
  Shield,
  Cpu,
  Sun,
  Moon,
  Heart,
  Share2,
  Newspaper,
  Lightbulb,
  Bot,
  GraduationCap,
  Inbox,
  Activity,
  Camera,
  LayoutDashboard,
  RefreshCw,
  Save,
  Copy,
  FileDown,
  Edit3,
  Target,
  Zap,
  CheckSquare,
  Clock,
  Minus,
} from "lucide-react";



import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, 
  updateProfile, signOut, createUserWithEmailAndPassword, 
  signInWithEmailAndPassword
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot,
  serverTimestamp, doc,  increment, deleteDoc, where, updateDoc,
  getDoc, setDoc, arrayUnion
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

// --- Configuration (YOUR KEYS) ---
const firebaseConfig = {
  apiKey: "AIzaSyCdoWl5a0irdMGftJUYkng-dQLUI1ZImP8",
  authDomain: "edunexus-live-e0b84.firebaseapp.com",
  projectId: "edunexus-live-e0b84",
  storageBucket: "edunexus-live-e0b84.firebasestorage.app",
  messagingSenderId: "464541062794",
  appId: "1:464541062794:web:7894ed257d604f202bbf73"
};

// --- Initialize Firebase ---
const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
console.log("CLOUDINARY ENV:", CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); 
const appId = "edunexus-live"; // Static App ID for your live site
const apiKey = process.env.REACT_APP_GEMINI_API_KEY;// Add your Gemini API Key here if you have one, otherwise leave empty

// --- Constants ---
const WHATSAPP_LINK = "https://chat.whatsapp.com/D6KjNsaW4aK0dMnxzodSYW";
// 🔐 Admin credentials (email + password)
const ADMIN_EMAIL =
  process.env.REACT_APP_ADMIN_EMAIL || "veducator4@gmail.com";

const ADMIN_PASSWORD =
  process.env.REACT_APP_ADMIN_PASSWORD || "Asad0099@.";

const DEFAULT_FOLDERS = ['PHY101', 'CS101', 'MGT101', 'ENG101', 'CS201', 'MTH101', 'ISL201', 'PAK301'];

// --- Icon Map for Dynamic Rendering ---
const ICON_MAP = {
  Calendar: Calendar,
  Code: Code,
  Trophy: Trophy,
  Star: Star,
  Megaphone: Megaphone,
  Info: Info,
  AlertCircle: AlertCircle,
  FileText: FileText,
  PlayCircle: PlayCircle,
  ExternalLink: ExternalLink
};

const COLOR_OPTIONS = [
  { label: 'Blue', value: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100" },
  { label: 'Green', value: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100" },
  { label: 'Purple', value: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-100" },
  { label: 'Yellow', value: "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-100" },
  { label: 'Red', value: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100" },
];

// --- CSS Styles for Animations ---
const customStyles = `
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
.animate-fade-in { animation: fadeIn 0.5s ease-out; }
.animate-slide-up { animation: slideUp 0.5s ease-out; }
.animate-slide-down { animation: slideDown 0.3s ease-out; }
.animate-marquee { animation: marquee 20s linear infinite; }
.perspective-1000 { perspective: 1000px; }
.transform-style-3d { transform-style: preserve-3d; }
.backface-hidden { backface-visibility: hidden; }
.rotate-y-180 { transform: rotateY(180deg); }
.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20px;
  height: 20px;
  cursor: nwse-resize;
  z-index: 10;
}
`;

// --- Helpers ---
const formatDate = (timestamp) => {
  if (!timestamp) return 'Just now';
  const date = timestamp.toDate ? timestamp.toDate() : new Date();
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  }).format(date);
};

// ❌ FRONTEND GEMINI CALL (BLOCKED BY GOOGLE)
/*
const callGemini = async (prompt) => {
  if (!apiKey) return "AI features require an API Key.";

  try {
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    return "AI request failed";
  }
};
*/
// helper: backend ka base URL (local vs production)
const API_BASE =
  process.env.NODE_ENV === "production"
    ? ""                          // production = same domain (Vercel) → /api/gemini
    : "http://localhost:5000";    // local development

// ✅ BACKEND BASED GEMINI CALL (SAFE + works on live)
const callGemini = async (prompt) => {
  try {
    const res = await fetch(`${API_BASE}/api/gemini`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Backend error:", data);
      return "AI request failed. " + (data.error || "");
    }

    return data.text || "AI did not return a valid response.";
  } catch (error) {
    console.error("Frontend fetch error:", error);
    return "AI request failed";
  }
};





const useTheme = () => {
  // 🌞 Default LIGHT mode
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "dark"; // agar user ne dark select kiya ho
  });

  // 💾 User choice remember rakho
  useEffect(() => {
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const themeClass = {
    bg: isDark ? 'bg-slate-950' : 'bg-slate-50',
    card: isDark ? 'bg-slate-900' : 'bg-white',
    text: isDark ? 'text-slate-200' : 'text-slate-800',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
    border: isDark ? 'border-slate-800' : 'border-slate-200',

    input: isDark
      ? 'bg-slate-950 border border-slate-700 focus:border-indigo-500 text-white placeholder-slate-400'
      : 'bg-white border border-slate-300 focus:border-indigo-500 text-slate-900 placeholder-slate-500',

    nav: isDark ? 'bg-slate-950/95' : 'bg-white/95',

    accent: 'text-indigo-500',
    accentBg: 'bg-indigo-600',

    chatInput: isDark
      ? 'bg-slate-800 text-white placeholder-slate-400'
      : 'bg-slate-100 text-slate-900 placeholder-slate-500',
  };

  return { isDark, setIsDark, theme: themeClass };
};

// Modern + Safe Navbar (PC Header Fix)
const Navbar = ({
  page,
  setPage,
  user,
  isAdmin,
  theme,
  toggleMenu,
  isMenuOpen,
}) => {
  // ✅ Yahan "Portfolio" add kiya hai taake PC Header par show ho
  const MAIN_ITEMS = [
    { id: "home",      label: "Home" },
    { id: "academic",  label: "Academic Hub" },
    { id: "cgpa",      label: "CGPA Calc" },
    { id: "articles",  label: "Articles" },
    { id: "forum",     label: "Discussion" },
    { id: "portfolio", label: "Portfolio" }, // 👈 Added specifically for Top Navbar
    { id: "about",     label: "About" },
    { id: "contact",   label: "Contact" },
  ];

  const ALL_ITEMS = [
    { id: "home",      label: "Home" },
    { id: "academic",  label: "Academic Hub" },
    { id: "cgpa",      label: "CGPA Calc" },
    { id: "articles",  label: "Articles" },
    { id: "planner",   label: "Study Planner" },
    { id: "flashcards",label: "AI Flashcards" },
    { id: "aiquiz",    label: "AI Quiz" },
    { id: "forum",     label: "Discussion" },
    { id: "portfolio", label: "Portfolio" },
    { id: "about",     label: "About" },
    { id: "contact",   label: "Contact" },
  ];

  const handleNavClick = (targetPage) => {
    setPage(targetPage);
    if (isMenuOpen) toggleMenu();
  };

  const isActive = (id) => page === id;

  return (
    <>
      {/* 🔹 Top header / navbar */}
      <header
        className="
          sticky top-0 z-50
          border-b border-slate-800
          bg-slate-950/90
          backdrop-blur
          text-white
        "
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          {/* Brand */}
          <button
            onClick={() => handleNavClick("home")}
            className="flex items-center gap-3 group"
          >
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg">
              <GraduationCap className="h-6 w-6" />
            </div>

            <div className="flex flex-col items-start">
              <span
                className="
                  text-lg md:text-xl font-extrabold tracking-tight
                  bg-gradient-to-r from-indigo-400 via-sky-400 to-violet-500
                  bg-clip-text text-transparent
                "
              >
                EduNexus
              </span>
              <span className="hidden sm:block text-[11px] md:text-xs text-slate-300">
                Study Material • Mock Tests • AI Tools
              </span>
            </div>
          </button>

          {/* Desktop links (PC HEADER) */}
          <nav className="hidden lg:flex items-center gap-1">
            {MAIN_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`
                  px-4 py-2.5 rounded-full
                  text-[15px] font-semibold tracking-wide
                  transition-all
                  ${
                    isActive(item.id)
                      ? "bg-indigo-500 text-white shadow-md"
                      : "text-slate-200 hover:bg-slate-800/80"
                  }
                `}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right side desktop */}
          <div className="hidden lg:flex items-center gap-3">
            {isAdmin && (
              <span className="text-[11px] px-2 py-1 rounded-full border border-emerald-400/70 text-emerald-300 bg-emerald-500/10">
                Admin mode
              </span>
            )}
            {user && (
              <span className="text-xs text-slate-200">
                Hi, {user.displayName || "Dear"}
              </span>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={toggleMenu}
            className="
              lg:hidden inline-flex items-center justify-center
              h-9 w-9 rounded-full border
              border-slate-600 bg-slate-900/90 text-slate-100
              shadow-sm
            "
            aria-label="Toggle navigation"
          >
            {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* 🔹 Mobile drawer */}
      <div
        className={`
          lg:hidden fixed inset-0
          z-50
          transition-opacity duration-200
          ${isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
      >
        {/* Dark overlay */}
        <div
          className="absolute inset-0 bg-black/45"
          onClick={toggleMenu}
        />

        {/* Drawer panel */}
        <div
          className={`
            absolute inset-y-0 left-0
            w-72 max-w-[80vw]
            bg-slate-950 text-slate-100
            border-r border-slate-800
            shadow-2xl
            transform transition-transform duration-200
            ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}
            flex flex-col
          `}
        >
          {/* Drawer header */}
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-base">
                E
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">EduNexus</span>
                <span className="text-[11px] text-slate-400">
                  Quick navigation
                </span>
              </div>
            </div>
            <button
              onClick={toggleMenu}
              className="
                h-8 w-8 rounded-full flex items-center justify-center
                border border-slate-700 text-slate-300
              "
            >
              <X size={16} />
            </button>
          </div>

          {/* Drawer links */}
          <nav className="flex-1 overflow-y-auto mt-2 pb-2">
            {ALL_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`
                  w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left
                  ${
                    isActive(item.id)
                      ? "bg-indigo-600 text-white"
                      : "text-slate-100 hover:bg-slate-800"
                  }
                `}
              >
                <span
                  className={`
                    h-6 w-6 rounded-full border text-[11px]
                    flex items-center justify-center
                    ${
                      isActive(item.id)
                        ? "border-white/80"
                        : "border-slate-600 text-slate-400"
                    }
                  `}
                >
                  {item.label.charAt(0)}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Drawer footer */}
          <div className="px-4 py-3 border-t border-slate-800 text-[11px] text-slate-500">
            Made for students · EduNexus
          </div>
        </div>
      </div>
    </>
  );
};
// ===============================
//  🚫 Ads Removed Temporarily (No Gap)
// ===============================
const AdBanner = () => {
  return null; // Ads bilkul show nahi honge, zero space
};
// 2. Announcements
const Announcements = ({ user }) => {
  const [news, setNews] = useState([]);
  
    useEffect(() => {
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'announcements'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (s) => setNews(s.docs.map((d) => d.data())),
      (err) => console.log('Announcements sync skipped', err)
    );

    return () => unsubscribe();
  }, []); // 🔁 user dependency hata di

  
  return (
    <div className="bg-indigo-600 text-white text-xs font-bold py-2 overflow-hidden whitespace-nowrap relative z-30">
      <div className="inline-block animate-marquee pl-[100vw]">
        {news.map((n, i) => <span key={i} className="mx-8 uppercase tracking-wide">📢 {String(n.title)}: {String(n.content)}</span>)}
      </div>
    </div>
  );
};

// ✅ Cloudinary image optimize helper (ArticlesPage se bilkul upar rakhna hai)
const optimizeImageUrl = (url) => {
  if (!url || !url.includes("/upload/")) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto,w_800/");
};

// 3. Articles
const ArticlesPage = ({ user, isAdmin, theme, showToast }) => {
  // 🔹 Pehli dafa component load hote hi localStorage se data lene ki koshish
  const [articles, setArticles] = useState(() => {
    try {
      const cached = localStorage.getItem("edunexus_articles");
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      console.log("Articles cache read error", e);
      return [];
    }
  });

  // 🔹 Agar cache khali hai to hi loading true hoga
  const [loading, setLoading] = useState(articles.length === 0); // ✅ skeleton control

  useEffect(() => {
    const q = query(
      collection(db, "artifacts", appId, "public", "data", "articles"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (s) => {
        const newArticles = s.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        // state update
        setArticles(newArticles);

        // 🔹 cache update
        try {
          localStorage.setItem(
            "edunexus_articles",
            JSON.stringify(newArticles)
          );
        } catch (e) {
          console.log("Articles cache save error", e);
        }

        setLoading(false); // ✅ data aate hi skeleton band
      },
      (err) => {
        console.log("Articles sync skipped", err);
        setLoading(false); // ✅ error pe bhi band
      }
    );

    return () => unsubscribe();
  }, []);


  const handleLike = async (art) => {
    if (!user) return;
    if (art.likedBy && art.likedBy.includes(user.uid)) {
      showToast("You have already liked this article.", "info");
      return;
    }

    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "articles", art.id),
      {
        likes: increment(1),
        likedBy: arrayUnion(user.uid),
      }
    );
    showToast("Liked!", "success");
  };

  const handleShare = async (art) => {
    const shareData = {
      title: art.title,
      text: art.content.substring(0, 100) + "...",
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showToast("Shared successfully!", "success");
      } catch (err) {}
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = `${art.title}\n${art.content}`;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        showToast("Article content copied to clipboard!", "success");
      } catch (err) {
        showToast("Failed to copy content", "error");
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Heading */}
      <div className="text-center mb-8">
        <h1 className={`text-4xl font-extrabold ${theme.text} mb-2`}>
          Knowledge Base
        </h1>
        <p className={theme.textMuted}>
          Official articles, news, and updates from EduNexus.
        </p>
      </div>

      {/* ✅ Yahi jagah hai jahan skeleton + real cards aayenge */}
      <div className="space-y-6">
        
        {/* 🔹 Skeletons jab tak Firestore se data aa raha hai */}
        {loading && (
          <>
            {[1, 2].map((i) => (
              <div
                key={i}
                className={`${theme.card} p-8 rounded-2xl border ${theme.border} animate-pulse space-y-4`}
              >
                <div className="h-40 rounded-xl bg-slate-800/40" />
                <div className="h-5 bg-slate-800/60 rounded w-3/4" />
                <div className="h-4 bg-slate-800/40 rounded w-full" />
                <div className="h-4 bg-slate-800/40 rounded w-5/6" />
              </div>
            ))}
          </>
        )}

        {/* 🔹 Real articles jab loading false ho */}
        {!loading &&
          articles.map((art, idx) => (
            <div
              key={art.id}
              className={`${theme.card} p-8 rounded-2xl border ${theme.border} hover:shadow-lg transition-shadow relative group`}
            >
              {/* IMAGE TOP – no white frame */}
              {art.imageUrl && (
  <div className="mt-6 flex justify-center">
    <img
      src={optimizeImageUrl(art.imageUrl)}
      alt={art.title}
      // 🔹 First article = eager + high priority
      loading={idx === 0 ? "eager" : "lazy"}
      fetchpriority={idx === 0 ? "high" : "low"}
      decoding="async"
      className="
        w-full
        max-w-3xl mx-auto
        aspect-[16/9]
        object-contain
        rounded-xl
        bg-slate-900/30
      "
    />
  </div>
)}


              {/* TITLE */}
              <div className="flex justify-between items-start mb-2">
                <h2 className={`text-2xl font-bold ${theme.text}`}>
                  {String(art.title)}
                </h2>
              </div>

              {/* META */}
              <div
                className={`flex items-center gap-2 text-xs ${theme.textMuted} mb-4`}
              >
                <span className="bg-red-500 text-white px-2 py-0.5 rounded font-bold">
                  OFFICIAL
                </span>
                <span>• {formatDate(art.createdAt)}</span>
              </div>

              {/* DESCRIPTION */}
              <p
                className={`${theme.text} leading-relaxed whitespace-pre-wrap mb-6`}
              >
                {String(art.content)}
              </p>

              {/* ACTIONS */}
              <div
                className={`flex items-center gap-6 border-t ${theme.border} pt-4 mt-2`}
              >
                <button
                  onClick={() => handleLike(art)}
                  className={`flex items-center gap-2 transition-colors ${
                    art.likedBy?.includes(user?.uid)
                      ? "text-red-500 cursor-default"
                      : `${theme.textMuted} hover:text-red-500`
                  }`}
                >
                  <Heart
                    size={20}
                    className={
                      art.likedBy?.includes(user?.uid) ? "fill-current" : ""
                    }
                  />
                  {art.likes} Likes
                </button>

                <button
                  onClick={() => handleShare(art)}
                  className={`flex items-center gap-2 ${theme.textMuted} hover:text-green-500 transition-colors`}
                >
                  <Share2 size={20} /> Share
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};


// 6. Discussion Forum (Student side)

const Forum = ({ user, theme, showToast }) => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // sab ko posts dikh sakti hain (anon user bhi), is liye user check optional hai
    const q = query(
      collection(db, "artifacts", appId, "public", "data", "discussions"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (s) =>
      setPosts(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    return () => unsub();
  }, []);

  const handlePost = async () => {
    if (!user) {
      showToast("Login required to post in discussion.", "error");
      return;
    }

    if (!newPost.trim()) return;

    try {
      setLoading(true);
      await addDoc(
        collection(db, "artifacts", appId, "public", "data", "discussions"),
        {
          content: newPost.trim(),
          createdAt: serverTimestamp(),
          userId: user.uid || null,
          userName: user.displayName || "Student",
          userEmail: user.email || "",
        }
      );
      setNewPost("");
      showToast("Post added to discussion!", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to post. Try again.", "error");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-extrabold ${theme.text}`}>
            Discussion Forum
          </h1>
          <p className={theme.textMuted}>
            Ask questions, discuss concepts, and see admin replies.
          </p>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs">
          <MessageSquare className="text-indigo-500" size={18} />
          <span className={theme.textMuted}>
            Be respectful • No spam • Study related only
          </span>
        </div>
      </div>

      {/* New Post Box */}
      <div className={`${theme.card} p-4 rounded-2xl border ${theme.border}`}>
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          rows={3}
          placeholder={
            user
              ? "Start a new discussion or ask a question..."
              : "Login to start a discussion..."
          }
          className={`w-full ${theme.input} p-3 rounded mb-3`}
        />

        <div className="flex justify-between items-center gap-3">
          <span className={`text-xs ${theme.textMuted}`}>
            Tips: Mention subject code, lesson, or topic for better replies.
          </span>
          <button
            onClick={handlePost}
            disabled={loading || !newPost.trim()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-40"
          >
            {loading ? "Posting..." : "Post"}
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {posts.length === 0 && (
          <div
            className={`text-center py-8 border-2 border-dashed ${theme.border} rounded-xl ${theme.textMuted}`}
          >
            No discussions yet. Be the first to post!
          </div>
        )}

        {posts.map((p) => (
          <div
            key={p.id}
            className={`${theme.card} p-4 rounded-2xl border ${theme.border} space-y-3`}
          >
            <div className="flex justify-between gap-3">
              <div>
                <p className={`font-semibold ${theme.text}`}>
                  {String(p.userName || "Student")}
                </p>
                <p className={`text-xs ${theme.textMuted}`}>
                  {p.userEmail ? String(p.userEmail) + " • " : ""}
                  {p.createdAt?.toDate
                    ? p.createdAt.toDate().toLocaleString()
                    : ""}
                </p>
              </div>
            </div>

            <p className={theme.text}>{String(p.content)}</p>

            {/* Admin reply agar available ho */}
            {p.adminReply && (
              <div className="mt-3 border-l-4 border-emerald-500 pl-3 bg-emerald-500/5 rounded">
                <p className="text-xs font-bold text-emerald-500 flex items-center gap-1 mb-1">
                  <Shield size={12} /> Admin Reply
                </p>
                <p className={`text-sm ${theme.text}`}>
                  {String(p.adminReply)}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};


// ================= AcademicHub (user side) =================
const AcademicHub = ({ user, isAdmin, theme, showToast }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSubject, setCurrentSubject] = useState("");
  const [view, setView] = useState("subjects"); // "subjects" | "files"
  const [searchTerm, setSearchTerm] = useState("");
  const [customFolders, setCustomFolders] = useState([]);

  // 🔹 Firestore se files + folders dono ko realtime load karo
  useEffect(() => {
    // 1) Files
    const filesCol = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "files"
    );
    const qFiles = query(filesCol, orderBy("createdAt", "desc"));

    const unsubFiles = onSnapshot(
      qFiles,
      (snap) => {
        const list = [];
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setFiles(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
        showToast && showToast("Failed to load files", "error");
      }
    );

    // 2) Custom folders (meta/folders)
    const foldersRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "meta",
      "folders"
    );
    const unsubFolders = onSnapshot(
      foldersRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setCustomFolders(docSnap.data().list || []);
        } else {
          setCustomFolders([]);
        }
      },
      (err) => {
        console.error("folders meta error:", err);
      }
    );

    return () => {
      unsubFiles();
      unsubFolders();
    };
  }, [showToast]);

  // 🔹 Subjects (folders) = DEFAULT_FOLDERS + custom + jin files ka subject hai
  const subjectsFromFiles = Array.from(
    new Set(files.map((f) => f.subject).filter(Boolean))
  );

  const subjects = Array.from(
    new Set([...DEFAULT_FOLDERS, ...customFolders, ...subjectsFromFiles])
  ).sort();

  const normalizedSearch = searchTerm.trim().toLowerCase();

  // Current subject ke files
  const subjectFiles = files.filter((f) =>
    currentSubject ? f.subject === currentSubject : true
  );

  // Search results (all files)
  const searchResults = normalizedSearch
    ? files.filter((f) => {
        const name = (f.name || "").toLowerCase();
        const subject = (f.subject || "").toLowerCase();
        return (
          name.includes(normalizedSearch) || subject.includes(normalizedSearch)
        );
      })
    : [];

  const openSubject = (sub) => {
    setCurrentSubject(sub);
    setView("files");
        window.history.pushState(
      { page: "academic", subject: sub },
      "",
      `/academic/${encodeURIComponent(sub)}`
    );

  };

  const goBackToFolders = () => {
    setView("subjects");
    setCurrentSubject("");
  };

  // Mobile back button ka basic handler (optional)
  useEffect(() => {
    const handlePop = (event) => {
      const st = event.state;
      if (st && st.subject && st.page === "academic") {
        setView("files");
        setCurrentSubject(st.subject);
      } else {
        setView("subjects");
        setCurrentSubject("");
      }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const handleDelete = async (fileId) => {
    if (!isAdmin) return;
    if (!window.confirm("Delete this file?")) return;
    try {
      const ref = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "files",
        fileId
      );
      await deleteDoc(ref);
      showToast && showToast("File deleted", "info");
    } catch (e) {
      console.error(e);
      showToast && showToast("Delete failed", "error");
    }
  };

  return (
    <section>
      <h1 className={`text-3xl font-extrabold mb-4 ${theme.text}`}>
        Academic Hub
      </h1>

      <p className={`mb-4 ${theme.textMuted}`}>
        Find and download study material for all your courses.
      </p>

      {/* Search Bar */}
      <div className="mb-6">
        <div
          className={`flex items-center gap-3 ${theme.card} border ${theme.border} rounded-2xl px-4 py-2`}
        >
          <Search size={18} className={theme.textMuted} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search all files..."
            className={`flex-1 bg-transparent outline-none ${theme.text}`}
          />
        </div>
        {normalizedSearch && (
          <p className={`mt-1 text-xs ${theme.textMuted}`}>
            Search "{searchTerm}" Your file is HERE.....
          </p>
        )}
      </div>

      {loading ? (
        <p className={theme.textMuted}>Loading files...</p>
      ) : files.length === 0 && subjects.length === 0 ? (
        <p className={theme.textMuted}>No files or folders yet.</p>
      ) : normalizedSearch ? (
        // 🔎 Search view
        <div className="space-y-4">
          <h3 className={`text-xl font-bold ${theme.text}`}>
            Search Results
          </h3>
          {searchResults.length > 0 ? (
            searchResults.map((file) => (
              <FileItem
                key={file.id}
                file={file}
                theme={theme}
                isAdmin={isAdmin}
                onDelete={() => handleDelete(file.id)}
              />
            ))
          ) : (
            <p className={theme.textMuted}>No files found.</p>
          )}
        </div>
      ) : view === "subjects" ? (
        // 📁 Folders view
        <div className="space-y-4">
          <h3 className={`text-xl font-bold ${theme.text}`}>Folders</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {subjects.map((sub) => (
              <button
                key={sub}
                onClick={() => openSubject(sub)}
                className={`${theme.card} border ${theme.border} rounded-xl p-4 flex items-center gap-3 hover:shadow-md transition-shadow`}
              >
                <Folder size={24} className="text-indigo-400" />
                <div className="text-left">
                  <p className={`font-semibold ${theme.text}`}>{sub}</p>
                  <p className={`text-xs ${theme.textMuted}`}>
                    {
                      files.filter((f) => f.subject === sub).length
                    }{" "}
                    files
                  </p>
                </div>
              </button>
            ))}
          </div>

        </div>
           ) : (
        // 📂 Files in current subject
        <div className="space-y-4">
          {/* ✅ Top bar: back + folder name */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={goBackToFolders}
              className={`flex items-center gap-2 text-xs md:text-sm ${theme.textMuted} hover:${theme.text}`}
            >
              ← Back to Folders
            </button>
            <span className={`text-sm md:text-base font-semibold ${theme.text}`}>
              {currentSubject || "All Files"}
            </span>
          </div>

          {subjectFiles.length > 0 ? (
            subjectFiles.map((file) => (
              <FileItem
                key={file.id}
                file={file}
                theme={theme}
                isAdmin={isAdmin}
                onDelete={() => handleDelete(file.id)}
              />
            ))
          ) : (
            <p className={theme.textMuted}>No files in this folder.</p>
          )}
        </div>
      )}

    </section>
  );
};
const FileItem = ({ file, theme, isAdmin, onDelete }) => {
  const url = file?.url || "";

  // Google Drive / Docs detect
  const isDriveLink =
    url.includes("drive.google.com") || url.includes("docs.google.com");

  // Firestore ka flag + domain check
  const isLinkOnly = file?.isLinkOnly === true || isDriveLink;

  // badge text
  const badgeText =
    (file?.ext || file?.name?.split(".").pop() || "").toUpperCase() ||
    (isLinkOnly ? "LINK" : "FILE");

  return (
    <div
      className={`${theme.card} p-5 rounded-xl border ${theme.border} flex justify-between items-center hover:shadow-md transition-shadow`}
    >
      {/* Left side: icon + name */}
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs">
          {badgeText}
        </div>
        <div>
          <h4 className={`font-bold ${theme.text}`}>
            {String(file.name || "Untitled file")}
          </h4>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {file.subject && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                {String(file.subject)}
              </span>
            )}
            {file.uploadedBy && (
              <span className={`text-[10px] ${theme.textMuted}`}>
                by {file.uploadedBy}
              </span>
            )}
          </div>
        </div>
      </div>

            {/* Right side: actions */}
      <div className="flex items-center gap-3">
        {url ? (
          isLinkOnly ? (
            // 🔗 Sirf link (Drive etc.) → Visit Drive
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-indigo-500 text-indigo-500 hover:bg-indigo-50 transition-colors"
            >
              <ExternalLink size={18} /> Visit Drive
            </a>
          ) : (
            // 📄 Normal file → View + Download
            <>
              {/* View (sirf open kare, browser me) */}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-indigo-500 text-indigo-500 hover:bg-indigo-50 transition-colors"
              >
                <ExternalLink size={18} /> View
              </a>

              {/* Direct download same name/extension ke sath */}
              <a
                href={url}
                download
                className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                <Download size={18} /> Download
              </a>
            </>
          )
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-slate-400 text-slate-400 cursor-not-allowed"
          >
            <Download size={18} /> No link
          </button>
        )}

        {isAdmin && (
          <button
            onClick={onDelete}
            className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
          >
            <Trash2 size={16} /> Delete
          </button>
        )}
      </div>

    </div>
  );
};

/// PORTFOLIO PAGE – PROFILE + AI PROJECT IDEAS GENERATOR
const Portfolio = ({ user, isAdmin, theme }) => {
  // ✅ NEW: picUrl ab empty se start hoga (sirf real photo use hogi)
  const [picUrl, setPicUrl] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false); // ✅ NEW state

  // baaki tumhari states same rahengi:
  const [fullName, setFullName] = useState("Asad Amanat Ali");
  const [title, setTitle] = useState(
    "Software Engineer | Web Developer | Network Specialist"
  );
  // ...

  const [about, setAbout] = useState(
    "I love building AI-powered tools, learning platforms, and automation systems that make student life easier."
  );
  const [contactEmail, setContactEmail] = useState("a.m.a63425@gmail.com");
  const [contactPhone, setContactPhone] = useState("0309-8851445");

  // AI ideas generator state
  const [techStack, setTechStack] = useState("");
  const [ideas, setIdeas] = useState("");
  const [loadingIdeas, setLoadingIdeas] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const snap = await getDoc(
          doc(db, "artifacts", appId, "public", "data", "profile", "main")
        );
        if (snap.exists()) {
          const data = snap.data();
          if (data.picUrl) setPicUrl(data.picUrl);
          if (data.fullName) setFullName(data.fullName);
          if (data.title) setTitle(data.title);
          if (data.about) setAbout(data.about);
          if (data.contactEmail) setContactEmail(data.contactEmail);
          if (data.contactPhone) setContactPhone(data.contactPhone);
        }
      } catch (e) {
        console.error("Profile fetch error", e);
      }
    };
    fetchProfile();
  }, []);

  const handleGenerateIdeas = async () => {
    if (!techStack.trim()) return;
    setLoadingIdeas(true);
    try {
      const prompt = `
You are an expert project mentor. Based on the following skills or interests:

"${techStack}"

Generate 3–5 unique, practical project ideas that a university student can build. 
For each idea, include:
- Project title
- 2–3 line description
- Mention key technologies.

Return the answer in bullet list.
`;
      const resText = await callGemini(prompt);
      setIdeas(resText);
    } catch (e) {
      console.error(e);
      setIdeas("AI request failed.");
    } finally {
      setLoadingIdeas(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-in">
      {/* Top Profile Card */}
      <div className={`${theme.card} p-6 md:p-8 rounded-2xl border ${theme.border} grid md:grid-cols-[auto,1fr] gap-6 items-center`}>
        <div className="relative">
  {/* Skeleton loader – jab tak image load nahi hoti */}
  {!imageLoaded && (
    <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-indigo-500 shadow-xl bg-slate-700 animate-pulse" />
  )}

  {/* Real profile photo with fade-in */}
  {picUrl && (
    <img
      src={picUrl}
      alt="Portfolio Avatar"
      onLoad={() => setImageLoaded(true)}
      className={`w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border-4 border-indigo-500 shadow-xl transition-opacity duration-500 ${
        imageLoaded ? "opacity-100" : "opacity-0"
      }`}
    />
  )}

  <span className="absolute -bottom-2 -right-2 bg-indigo-500 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
    <Sparkles size={14} /> Live
  </span>
</div>


        <div>
          <h1 className={`text-2xl md:text-3xl font-extrabold ${theme.text}`}>
            {fullName}
          </h1>
          <p className="mt-1 text-sm md:text-base font-semibold text-indigo-500">
            {title}
          </p>
          <p className={`mt-2 text-xs md:text-sm ${theme.textMuted}`}>
            {about}
          </p>

          <div className="mt-4 flex flex-wrap gap-3 text-xs md:text-sm">
            <a
              href={`mailto:${contactEmail}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500 hover:text-white transition-colors"
            >
              <Mail size={14} />
              {contactEmail}
            </a>
            <a
              href={`https://wa.me/${contactPhone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white transition-colors"
            >
              <Phone size={14} />
              {contactPhone}
            </a>
          </div>
        </div>
      </div>

      {/* Skills & Experience */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className={`${theme.card} p-5 rounded-2xl border ${theme.border}`}>
          <h3 className={`font-bold mb-2 flex items-center gap-2 ${theme.text}`}>
            <Brain size={18} /> Core Skills
          </h3>
          <ul className={`text-xs md:text-sm space-y-1 ${theme.textMuted}`}>
            <li>• React, Tailwind CSS, Firebase (Firestore & Auth)</li>
            <li>• REST APIs, AI Integration, Prompt Engineering</li>
            <li>• Networking Basics, OSI Model, Subnetting</li>
            <li>• UI/UX for dashboards & education platforms</li>
          </ul>
        </div>

        <div className={`${theme.card} p-5 rounded-2xl border ${theme.border}`}>
          <h3 className={`font-bold mb-2 flex items-center gap-2 ${theme.text}`}>
            <Cpu size={18} /> Tech Stack
          </h3>
          <ul className={`text-xs md:text-sm space-y-1 ${theme.textMuted}`}>
            <li>• JavaScript (ES6+), React</li>
            <li>• Firebase, Firestore, Auth</li>
            <li>• Tailwind CSS</li>
            <li>• Git & GitHub</li>
          </ul>
        </div>

        <div className={`${theme.card} p-5 rounded-2xl border ${theme.border}`}>
          <h3 className={`font-bold mb-2 flex items-center gap-2 ${theme.text}`}>
            <Briefcase size={18} /> Experience
          </h3>
          <ul className={`text-xs md:text-sm space-y-1 ${theme.textMuted}`}>
            <li>• EduNexus – AI-powered student portal</li>
            <li>• AI Quiz & Study Planner tools</li>
            <li>• File management & academic resource systems</li>
          </ul>
        </div>
      </div>

      {/* AI PROJECT IDEAS GENERATOR (old wali functionality wapis) */}
      <div className={`${theme.card} p-6 rounded-2xl border ${theme.border}`}>
        <div className="flex items-center gap-3 mb-3">
          <Lightbulb size={22} className="text-yellow-400" />
          <h3 className={`text-lg md:text-xl font-bold ${theme.text}`}>
            AI Project Advisor – Ideas Generator
          </h3>
        </div>

        <p className={`${theme.textMuted} text-xs md:text-sm mb-4`}>
          Apni skills ya interest likho (e.g. <strong>React + Firebase</strong>,{" "}
          <strong>Networking</strong>, <strong>AI + Education</strong>) aur AI
          aap ke liye project ideas suggest karega.
        </p>

        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <input
            value={techStack}
            onChange={(e) => setTechStack(e.target.value)}
            placeholder="e.g. React, Firebase, Tailwind, AI chatbot..."
            className={`flex-1 ${theme.input} p-3 rounded-lg text-sm`}
          />
          <button
            onClick={handleGenerateIdeas}
            disabled={loadingIdeas}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-60"
          >
            {loadingIdeas ? "Thinking..." : "Generate Ideas"}
          </button>
        </div>

        {ideas && (
          <div className="mt-3 text-xs md:text-sm whitespace-pre-wrap bg-slate-900/40 border border-slate-700 rounded-xl p-4">
            {ideas}
          </div>
        )}
      </div>
    </div>
  );
};


// 7. Flashcards
const FlashcardGenerator = ({ theme, showToast }) => {
  const [topic, setTopic] = useState('');
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const generateCards = async () => {
    if(!topic.trim()) return;
    setLoading(true); setCards([]); setCurrentCardIndex(0); setIsFlipped(false);
    try {
      const prompt = `Generate 5 flashcards for the topic "${topic}" in valid JSON format: [{"front": "Question/Term", "back": "Answer/Definition"}]. Do not include markdown.`;
      const text = await callGemini(prompt);
      const data = JSON.parse(text.replace(/```json|```/g, '').trim());
      if(Array.isArray(data)) { setCards(data); showToast("Flashcards generated!", "success"); }
      else throw new Error("Invalid format");
    } catch (e) { 
      console.error(e);
      showToast("Failed to generate cards.", "error"); 
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center"><h2 className={`text-3xl font-bold ${theme.text} flex items-center justify-center gap-2`}><Layers className="h-8 w-8 text-pink-500" /> AI Flashcards</h2><p className={theme.textMuted}>Master any subject.</p></div>
      <div className={`${theme.card} p-8 rounded-2xl border ${theme.border} shadow-lg`}>
              <div className="flex flex-col md:flex-row gap-3 mb-8">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter topic..."
          className={`flex-1 ${theme.input} p-3 rounded-xl outline-none ${theme.text}`}
          onKeyPress={(e) => e.key === "Enter" && generateCards()}
        />

        <button
          onClick={generateCards}
          disabled={loading || !topic.trim()}
          className="w-full md:w-auto bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader className="animate-spin" size={20} /> : <Sparkles size={20} />}
          {loading ? "Generating..." : "Generate ✨"}
        </button>
      </div>

        {cards.length > 0 ? (
          <div className="flex flex-col items-center">
            <div className="w-full h-64 relative perspective-1000 cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
              <div className={`w-full h-full relative transform-style-3d transition-transform duration-500 ${isFlipped ? 'rotate-y-180' : ''}`}>
                <div className={`absolute w-full h-full ${theme.card} border ${theme.border} rounded-2xl p-8 flex items-center justify-center text-center backface-hidden shadow-xl`}><div><h3 className={`text-sm uppercase tracking-wider text-pink-500 font-bold mb-4`}>Question</h3><p className={`text-2xl font-bold ${theme.text}`}>{String(cards[currentCardIndex].front)}</p><p className={`text-xs ${theme.textMuted} mt-8`}>Tap to reveal</p></div></div>
                <div className={`absolute w-full h-full bg-indigo-600 text-white rounded-2xl p-8 flex items-center justify-center text-center backface-hidden rotate-y-180 shadow-xl`}><div><h3 className={`text-sm uppercase tracking-wider text-indigo-200 font-bold mb-4`}>Answer</h3><p className={`text-xl font-medium leading-relaxed`}>{String(cards[currentCardIndex].back)}</p></div></div>
              </div>
            </div>
            <div className="flex items-center gap-6 mt-8">
              <button onClick={() => {setIsFlipped(false); setTimeout(() => setCurrentCardIndex((prev) => (prev - 1 + cards.length) % cards.length), 150)}} className={`p-3 rounded-full ${theme.card} border ${theme.border} ${theme.text} hover:scale-110 transition-transform shadow-md`}><ArrowLeft size={20}/></button>
              <span className={`font-bold ${theme.text}`}>{currentCardIndex + 1} / {cards.length}</span>
              <button onClick={() => {setIsFlipped(false); setTimeout(() => setCurrentCardIndex((prev) => (prev + 1) % cards.length), 150)}} className={`p-3 rounded-full ${theme.card} border ${theme.border} ${theme.text} hover:scale-110 transition-transform shadow-md`}><ArrowRight size={20}/></button>
            </div>
          </div>
        ) : !loading && <div className={`text-center py-12 border-2 border-dashed ${theme.border} rounded-xl opacity-50`}><Layers className={`mx-auto h-12 w-12 mb-2 ${theme.textMuted}`} /><p className={theme.textMuted}>Enter a topic to generate cards</p></div>}
      </div>
    </div>
  );
};

// 8. AI Quiz
const QuizGenerator = ({ theme, user, showToast }) => {
  const [input, setInput] = useState('');
  const [qLimit, setQLimit] = useState(5);
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90);
  const [fileName, setFileName] = useState('');
  const [fileLoading, setFileLoading] = useState(false);

  const MAX_SOURCE_CHARS = 30000;

  const readTextFile = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read text file.'));
      reader.readAsText(file);
    });

  const readPdfFile = async (file) => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdfData = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
    const chunks = [];
    let charCount = 0;

    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => (typeof item.str === 'string' ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (pageText) {
        chunks.push(pageText);
        charCount += pageText.length + 1;
      }
      if (charCount >= MAX_SOURCE_CHARS) break;
    }

    return chunks.join('\n');
  };

  const readDocxFile = async (file) => {
    const mammoth = await import('mammoth/mammoth.browser');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return String(result.value || '');
  };

  const extractFileText = async (file) => {
    const ext = (file.name.split('.').pop() || '').toLowerCase();

    if (file.type === 'text/plain' || ['txt', 'md', 'csv'].includes(ext)) {
      return readTextFile(file);
    }

    if (file.type === 'application/pdf' || ext === 'pdf') {
      return readPdfFile(file);
    }

    if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === 'docx'
    ) {
      return readDocxFile(file);
    }

    if (ext === 'doc' || file.type === 'application/msword') {
      throw new Error('Old .doc files are not supported. Save the file as .docx or PDF.');
    }

    throw new Error('Unsupported file type. Upload TXT, PDF, or DOCX.');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setFileName(file.name);
    setFileLoading(true);

    try {
      const text = (await extractFileText(file)).replace(/\u0000/g, '').trim();

      if (!text) {
        throw new Error('No readable text was found in this file.');
      }

      setInput(text.substring(0, MAX_SOURCE_CHARS));

      showToast(
        text.length > MAX_SOURCE_CHARS
          ? 'File loaded. Large document was trimmed for faster quiz generation.'
          : 'File content loaded successfully.',
        'success'
      );
    } catch (error) {
      console.error('Quiz file extraction error:', error);
      setInput('');
      showToast(error?.message || 'Could not read this file.', 'error');
    } finally {
      setFileLoading(false);
    }
  };

  useEffect(() => {
    if (!quizData || showResult) return;
    setTimeLeft(90);
  }, [currentQ, quizData, showResult]);

  useEffect(() => {
    if (!quizData || showResult || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, quizData, showResult]);

  const parseQuizJson = (raw) => {
    const cleaned = String(raw || '')
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const jsonStart = cleaned.indexOf('[');
    const jsonEnd = cleaned.lastIndexOf(']');

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      throw new Error('AI returned an invalid quiz format.');
    }

    return JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1));
  };

  const validateQuiz = (data, limit) => {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('AI did not return valid quiz questions.');
    }

    const normalized = data
      .slice(0, limit)
      .map((q, index) => {
        const options = Array.isArray(q?.options)
          ? q.options.map((value) => String(value).trim()).filter(Boolean).slice(0, 4)
          : [];

        let ans = Number.isInteger(q?.ans) ? q.ans : Number(q?.ans);
        if (!Number.isInteger(ans) || ans < 0 || ans > 3) ans = 0;

        while (options.length < 4) {
          options.push(`Option ${String.fromCharCode(65 + options.length)}`);
        }

        return {
          id: q?.id ?? index + 1,
          q: String(q?.q || '').trim(),
          options,
          ans,
          explanation: String(
            q?.explanation || 'Review the relevant concept in the study material.'
          ).trim(),
          selected: null,
        };
      })
      .filter((q) => q.q);

    if (!normalized.length) {
      throw new Error('No usable quiz questions were generated.');
    }

    return normalized;
  };

  const generateQuiz = async () => {
    const source = input.trim();

    if (!source) {
      showToast('Please paste study text or upload a readable file first.', 'error');
      return;
    }

    const limit = Math.min(Math.max(parseInt(qLimit, 10) || 5, 1), 50);

    setLoading(true);
    setQuizData(null);
    setShowResult(false);
    setCurrentQ(0);

    const prompt = `
You are an expert university exam question writer for EduNexus.

Create exactly ${limit} high-quality multiple-choice questions using ONLY the study material below.
Do not use outside facts. Do not invent information that is not supported by the material.

Requirements:
- Questions should be concise, conceptual, and suitable for university exam practice.
- Each question must have exactly 4 distinct options.
- Exactly one option must be correct.
- "ans" must be the zero-based index (0, 1, 2, or 3) of the correct option.
- Include a short explanation grounded in the study material.
- Avoid duplicate questions and duplicate options.
- Return ONLY a raw JSON array. No Markdown, no commentary.

Required schema:
[
  {
    "id": 1,
    "q": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "ans": 0,
    "explanation": "Short explanation."
  }
]

STUDY MATERIAL:
${source.substring(0, MAX_SOURCE_CHARS)}
`;

    try {
      const txt = await callGemini(prompt);

      if (!txt || txt.startsWith('AI request failed')) {
        throw new Error(txt || 'AI request failed.');
      }

      const data = validateQuiz(parseQuizJson(txt), limit);
      setQuizData(data);
      showToast(`Generated ${data.length} Questions!`, 'success');
    } catch (e) {
      console.error('Quiz Error:', e);
      showToast(
        e?.message || 'AI generation failed. Please try the file again.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (idx) => {
    if (quizData[currentQ].selected !== null || timeLeft <= 0) return;
    const newData = [...quizData];
    newData[currentQ] = { ...newData[currentQ], selected: idx };
    setQuizData(newData);
  };

  const nextQ = () => {
    if (currentQ < quizData.length - 1) setCurrentQ((value) => value + 1);
  };

  const prevQ = () => {
    if (currentQ > 0) setCurrentQ((value) => value - 1);
  };

  const finishQuiz = () => setShowResult(true);

  const calculateScore = () =>
    quizData.reduce((acc, q) => acc + (q.selected === q.ans ? 1 : 0), 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className={`text-3xl font-bold ${theme.text} flex items-center justify-center gap-2`}>
          <Brain className="h-8 w-8 text-cyan-400" /> AI Quiz Generator
        </h2>
      </div>

      {!quizData ? (
        <div className={`${theme.card} p-8 rounded-2xl border ${theme.border} shadow-xl`}>
          <div className="space-y-4">
            <div className="flex gap-4">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className={`flex-1 ${theme.input} rounded-xl p-4 ${theme.text} outline-none`}
                placeholder="e.g. 'CS101' or paste text..."
              />
              <input
                type="number"
                min="1"
                max="50"
                value={qLimit}
                onChange={(e) => setQLimit(e.target.value)}
                className={`w-24 ${theme.input} rounded-xl p-4 ${theme.text} outline-none text-center`}
                placeholder="Qty"
                title="Number of Questions"
              />
            </div>

            <div className={`border-2 border-dashed ${theme.border} rounded-xl p-4 text-center cursor-pointer relative hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors`}>
              <input
                type="file"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept=".txt,.md,.csv,.pdf,.docx,.doc,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                disabled={fileLoading || loading}
              />
              <div className="flex flex-col items-center gap-2">
                {fileLoading ? (
                  <Loader className="text-indigo-500 animate-spin" />
                ) : (
                  <Upload className="text-indigo-500" />
                )}

                <span className={theme.textMuted}>
                  {fileLoading
                    ? `Reading ${fileName}...`
                    : fileName || 'Click to Upload File (TXT/PDF/DOCX)'}
                </span>

                <span className={`text-[11px] ${theme.textMuted}`}>
                  PDF text, DOCX text, TXT/MD/CSV
                </span>
              </div>
            </div>

            <button
              onClick={generateQuiz}
              disabled={loading || fileLoading || !input.trim()}
              className="w-full bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-xl"
            >
              {loading ? (
                <Loader className="animate-spin h-5 w-5" />
              ) : (
                <PlayCircle className="h-5 w-5" />
              )}
              {loading ? 'Generating Quiz...' : 'Start AI Quiz'}
            </button>
          </div>
        </div>
      ) : showResult ? (
        <div className={`${theme.card} p-8 rounded-2xl text-center animate-slide-up border ${theme.border}`}>
          <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
          <h3 className={`text-2xl font-bold ${theme.text} mb-2`}>Quiz Completed!</h3>
          <p className="text-4xl font-bold text-green-400 mb-6">
            {calculateScore()} / {quizData.length}
          </p>
          <button
            onClick={() => {
              setQuizData(null);
              setCurrentQ(0);
              setShowResult(false);
            }}
            className="px-8 py-3 bg-indigo-600 rounded-xl text-white font-bold hover:bg-indigo-700 transition-colors"
          >
            Create Another
          </button>
        </div>
      ) : (
        <div className={`${theme.card} p-6 rounded-2xl border ${theme.border}`}>
          <div className={`flex justify-between items-center mb-4 text-sm ${theme.textMuted}`}>
            <span>Q {currentQ + 1} / {quizData.length}</span>
            <span className={`flex items-center gap-1 font-mono ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-indigo-500'}`}>
              <Clock size={16} /> 00:{timeLeft.toString().padStart(2, '0')}
            </span>
          </div>

          <h3 className={`text-xl font-bold ${theme.text} mb-6`}>
            {String(quizData[currentQ].q)}
          </h3>

          <div className="space-y-3 mb-6">
            {quizData[currentQ].options.map((opt, idx) => {
              const isSelected = quizData[currentQ].selected === idx;
              const isCorrect = idx === quizData[currentQ].ans;
              const showStatus = quizData[currentQ].selected !== null;

              let btnClass = `${theme.bg} ${theme.border} ${theme.text}`;

              if (showStatus) {
                if (isSelected && isCorrect) {
                  btnClass = 'bg-green-600/20 border-green-500 text-green-600 dark:text-green-400';
                } else if (isSelected && !isCorrect) {
                  btnClass = 'bg-red-600/20 border-red-500 text-red-600 dark:text-red-400';
                } else if (isCorrect) {
                  btnClass = 'bg-green-600/10 border-green-500/50 text-green-600/70';
                } else {
                  btnClass = 'opacity-50';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={showStatus || timeLeft <= 0}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${btnClass}`}
                >
                  {String(opt)}
                </button>
              );
            })}
          </div>

          {quizData[currentQ].selected !== null && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl mb-6 text-sm text-indigo-600 dark:text-indigo-300 animate-fade-in flex gap-2">
              <Sparkles size={16} className="shrink-0 mt-0.5" />
              <div>
                <strong>Explanation:</strong> {String(quizData[currentQ].explanation)}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={prevQ}
              disabled={currentQ === 0}
              className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft size={16} /> Previous
            </button>

            {currentQ === quizData.length - 1 ? (
              <button
                onClick={finishQuiz}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                Finish <CheckSquare size={16} />
              </button>
            ) : (
              <button
                onClick={nextQ}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                Next <ArrowRight size={16} />
              </button>
            )}
          </div>

          <div className="text-center mt-2">
            <button
              onClick={finishQuiz}
              className="text-xs text-red-400 hover:text-red-500 hover:underline"
            >
              Stop & Finish Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// 9. Study Planner
const StudyPlanner = ({ theme, showToast }) => {
  const [subject, setSubject] = useState('');
  const [hours, setHours] = useState('');
  const [planData, setPlanData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      if (file.type === "text/plain" || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setFileContent(ev.target.result);
          showToast("File content loaded!", "success");
        };
        reader.readAsText(file);
      } else {
        setFileContent(`(File Attached: ${file.name})`);
        showToast("File attached. Enter Subject for better results.", "info");
      }
    }
  };

  const generatePlan = async () => {
    if ((!subject && !fileName) || !hours) {
      showToast("Please enter a subject or upload a file.", "error");
      return;
    }
    setLoading(true); setPlanData([]);
    try {
      const context = fileContent.length > 5000 ? fileContent.substring(0, 5000) + "..." : fileContent;
      // Updated prompt for simplicity and clarity
      const prompt = `Act as an expert academic advisor. Create a very simple, clear, and actionable study plan table for: "${subject} ${fileName ? `(File: ${fileName})` : ''}".
      Constraints:
      - Daily Study Time: ${hours} hours
      - Goal: Exam preparation / Mastery.
      - Context from file: ${context}
      
      Output Format:
      Return ONLY a valid JSON array of objects. Do NOT use Markdown code blocks. Just the raw JSON.
      Structure: [{"day": "Phase/Day", "topic": "Topic Name", "tasks": "Very brief actionable tasks (max 10 words)", "time": "Duration"}]
      
      Example: [{"day": "Phase 1", "topic": "Basics", "tasks": "Read Chapter 1, Learn definitions", "time": "2 hrs"}]
      
      Keep tasks extremely concise and easy to understand.`;

      const res = await callGemini(prompt);
      const cleaned = res.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          setPlanData(parsed);
          showToast("Plan Generated Successfully!", "success");
        } else {
          throw new Error("Invalid format");
        }
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        showToast("AI format error. Please try again.", "error");
      }
    } catch(e) {
      console.error(e);
      showToast("Network or API error.", "error");
    }
    setLoading(false);
  };

  const handleCellChange = (index, field, value) => {
    const newData = [...planData];
    newData[index][field] = value;
    setPlanData(newData);
  };

  const addRow = () => {
    setPlanData([...planData, { day: "Next Phase", topic: "New Topic", tasks: "Enter tasks here...", time: `${hours} hours` }]);
  };

  const deleteRow = (index) => {
    const newData = planData.filter((_, i) => i !== index);
    setPlanData(newData);
  };

  const handleReset = () => {
    setPlanData([]); setSubject(''); setHours(''); setFileName(''); setFileContent(''); setIsEditing(false);
    showToast("Ready for a new plan!", "info");
  };

  const handleCopy = () => {
    if (planData.length === 0) return;
    const text = planData.map(row => `${row.day} | ${row.topic} | ${row.tasks} | ${row.time}`).join('\n');
    
    // Fallback using textarea for clipboard copy in restricted environments
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast("Plan copied to clipboard!", "success");
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      showToast("Failed to copy", "error");
    }
    document.body.removeChild(textArea);
  };

  const handleDownload = () => {
    if (planData.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," 
        + "Day,Topic,Tasks,Time\n" 
        + planData.map(e => `"${e.day}","${e.topic}","${e.tasks}","${e.time}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `study_plan_${subject || "generated"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Plan downloaded as CSV!", "success");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center"><h1 className={`text-4xl font-extrabold ${theme.text} mb-4`}>AI Study Planner</h1></div>
      {planData.length === 0 && (
        <div className={`${theme.card} p-8 rounded-2xl border ${theme.border} shadow-lg animate-slide-down`}>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className={`block text-sm font-bold ${theme.text} mb-2`}>Subject / Topic (Required)</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. CS101, Physics, Python" className={`w-full ${theme.input} p-3 rounded-xl outline-none ${theme.text}`} />
            </div>
            <div>
              <label className={`block text-sm font-bold ${theme.text} mb-2`}>Daily Hours</label>
              <input type="number" value={hours} onChange={e => setHours(e.target.value)} placeholder="e.g. 2" className={`w-full ${theme.input} p-3 rounded-xl outline-none ${theme.text}`} />
            </div>
          </div>
          <div className={`border-2 border-dashed ${theme.border} rounded-xl p-6 text-center cursor-pointer relative hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors mb-6 group`}>
            <input type="file" onChange={handleFileUpload} onClick={(e) => e.target.value = null} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
            <div className="flex flex-col items-center gap-2 group-hover:scale-105 transition-transform">
              <Upload className={`h-8 w-8 ${fileName ? 'text-green-500' : 'text-indigo-500'}`} />
              <span className={`font-bold ${theme.text}`}>{fileName || "Upload Syllabus / Handout (Optional)"}</span>
              <span className={`text-xs ${theme.textMuted}`}>{fileName ? "File Attached (Click to change)" : "Supports PDF, Doc, Txt (File name used for context)"}</span>
            </div>
          </div>
          <button onClick={generatePlan} disabled={loading || (!subject && !fileName) || !hours} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">{loading ? <Loader className="animate-spin" /> : <Calendar />} {loading ? "Creating Detailed Table..." : "Generate Study Table"}</button>
        </div>
      )}
      {planData.length > 0 && (
        <div className={`${theme.card} rounded-2xl border ${theme.border} overflow-hidden animate-slide-up shadow-xl`}>
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center bg-indigo-50 dark:bg-slate-900/50 gap-4">
            <h3 className={`text-xl font-bold ${theme.text} flex items-center gap-2`}><CheckCircle className="text-green-500" /> {subject || fileName} Plan</h3>
            <div className="flex flex-wrap gap-2 items-center">
              <button onClick={handleCopy} className="p-2 text-indigo-500 hover:bg-indigo-100 rounded-lg transition-colors" title="Copy to Clipboard">
                 <Copy size={20} />
              </button>
              <button onClick={handleDownload} className="p-2 text-indigo-500 hover:bg-indigo-100 rounded-lg transition-colors" title="Download CSV">
                 <FileDown size={20} />
              </button>
              <div className="h-8 w-px bg-slate-300 dark:bg-slate-700 mx-2 hidden md:block"></div>
              <button onClick={handleReset} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-md">
                <RefreshCw size={16}/> New Plan
              </button>
              <div className="h-8 w-px bg-slate-300 dark:bg-slate-700 mx-2 hidden md:block"></div>
              <button onClick={addRow} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-green-700 shadow-sm"><Plus size={16}/> Add Phase</button>
              <button onClick={() => setIsEditing(!isEditing)} className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors shadow-sm ${isEditing ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700'}`}>
                {isEditing ? <Save size={16}/> : <Edit3 size={16}/>} {isEditing ? 'Save Changes' : 'Edit Table'}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm uppercase tracking-wider">
                  <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-700 w-1/6">Phase / Day</th>
                  <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-700 w-1/5">Focus Topic</th>
                  <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-700">Actionable Tasks</th>
                  <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-700 w-1/12">Time</th>
                  <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-700 w-12"></th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-slate-200 dark:divide-slate-700 ${theme.text}`}>
                {planData.map((row, idx) => (
                  <tr key={idx} className="group">
                    <td className="p-4 align-top">
                      {isEditing ? <input value={row.day} onChange={e => handleCellChange(idx, 'day', e.target.value)} className={`w-full bg-slate-100 dark:bg-slate-800 border-b border-indigo-500 outline-none px-2 py-1 rounded ${theme.text}`} /> : <span className="font-bold text-indigo-500">{String(row.day)}</span>}
                    </td>
                    <td className="p-4 align-top">
                      {isEditing ? <input value={row.topic} onChange={e => handleCellChange(idx, 'topic', e.target.value)} className={`w-full bg-slate-100 dark:bg-slate-800 border-b border-indigo-500 outline-none px-2 py-1 rounded ${theme.text}`} /> : <span className="font-medium">{String(row.topic)}</span>}
                    </td>
                    <td className="p-4 align-top">
                      {isEditing ? <textarea value={row.tasks} onChange={e => handleCellChange(idx, 'tasks', e.target.value)} className={`w-full bg-slate-100 dark:bg-slate-800 border-b border-indigo-500 outline-none px-2 py-1 rounded ${theme.text} min-h-[60px]`} /> : <span className={`${theme.textMuted}`}>{String(row.tasks)}</span>}
                    </td>
                    <td className="p-4 align-top">
                      {isEditing ? <input value={row.time} onChange={e => handleCellChange(idx, 'time', e.target.value)} className={`w-full bg-slate-100 dark:bg-slate-800 border-b border-indigo-500 outline-none px-2 py-1 rounded ${theme.text}`} /> : <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded whitespace-nowrap">{String(row.time)}</span>}
                    </td>
                    <td className="p-4 align-top text-center">
                      {isEditing && <button onClick={() => deleteRow(idx)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// 10. Feedback
const Feedback = ({ theme, showToast }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  const send = async () => {
    if(!msg.trim() || !name.trim() || !email.trim()) {
      showToast("Please fill in all fields (Name, Email, Message)", "error");
      return;
    }
    
    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast("Please enter a valid email address", "error");
      return;
    }

    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'feedback'), { name, email, msg, createdAt: serverTimestamp() });
    showToast('Feedback Sent! We will contact you soon.', 'success');
    setMsg(''); setName(''); setEmail('');
  };

  return (
    <div className="max-w-2xl mx-auto text-center space-y-6">
      <div className={`${theme.card} p-8 rounded-2xl border ${theme.border} shadow-lg`}>
        <h2 className={`text-2xl font-bold ${theme.text} mb-4`}>Submit Your Query</h2>
        <div className="flex flex-col gap-4">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your Name" className={`w-full ${theme.input} p-3 rounded-xl outline-none ${theme.text}`} />
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Your Email (Required)" className={`w-full ${theme.input} p-3 rounded-xl outline-none ${theme.text}`} />
          <textarea value={msg} onChange={e=>setMsg(e.target.value)} placeholder="How can we help you?" className={`w-full ${theme.input} p-4 rounded-xl h-32 outline-none ${theme.text}`} />
          <button onClick={send} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold w-full hover:bg-indigo-700 transition-colors">Submit Feedback</button>
        </div>
      </div>
    </div>
  );
};

// 11. About Us
const AboutUs = ({ theme }) => (
  <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
    <div className="text-center space-y-4"><h1 className={`text-4xl font-extrabold ${theme.text}`}>About EduNexus</h1><p className={`text-xl ${theme.textMuted}`}>Empowering the next generation of Virtual University students.</p></div>
    <div className="grid md:grid-cols-2 gap-8">
      <div className={`${theme.card} p-8 rounded-2xl border ${theme.border}`}><h2 className={`text-2xl font-bold ${theme.text} mb-4 flex items-center gap-2`}><Target className="text-indigo-500"/> Our Mission</h2><p className={`${theme.text} leading-relaxed`}>To provide a centralized, intelligent, and collaborative platform where students can access high-quality resources, prepare for exams efficiently with AI, and connect with peers seamlessly.</p></div>
      <div className={`${theme.card} p-8 rounded-2xl border ${theme.border}`}><h2 className={`text-2xl font-bold ${theme.text} mb-4 flex items-center gap-2`}><Zap className="text-yellow-500"/> Our Vision</h2><p className={`${theme.text} leading-relaxed`}>To become the #1 Academic Portal for VU students, integrating cutting-edge AI technology like Gemini to make learning personalized and accessible for everyone.</p></div>
    </div>
  </div>
);

// 12. Contact Us
const ContactUs = ({ theme }) => (
  <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
    <div className="text-center"><h1 className={`text-4xl font-extrabold ${theme.text} mb-4`}>Contact Us</h1><p className={theme.textMuted}>Have questions or suggestions? We'd love to hear from you.</p></div>
    <div className="grid md:grid-cols-2 gap-6">
      <div className={`${theme.card} p-6 rounded-2xl border ${theme.border} flex items-center gap-4`}><div className="bg-indigo-100 p-3 rounded-full text-indigo-600"><Mail size={24}/></div><div><h3 className={`font-bold ${theme.text}`}>Email Us</h3><p className={theme.textMuted}>a.m.a63425@gmail.com</p></div></div>
      <div className={`${theme.card} p-6 rounded-2xl border ${theme.border} flex items-center gap-4`}><div className="bg-green-100 p-3 rounded-full text-green-600"><Phone size={24}/></div><div><h3 className={`font-bold ${theme.text}`}>Call Us</h3><p className={theme.textMuted}>0309-8851445</p></div></div>
    </div>
  </div>
);

// 13. Home Page
const HomePage = ({setPage, theme, showToast, user}) => {
  const [highlights, setHighlights] = useState([]);
  const [showSection, setShowSection] = useState(true);
    const renderHighlightDesc = (desc) => {
    if (!desc) return null;

    // lines ko split karo (ENTER se jo tum admin panel me likhte ho)
    const lines = desc
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    // agar sirf ek line ho → normal paragraph
    if (lines.length <= 1) {
      return (
        <p
          className={`text-sm ${theme.textMuted} leading-relaxed whitespace-pre-line`}
        >
          {desc}
        </p>
      );
    }

    // check: kya har line list jesi hai? (-, •, 1. , 1) se start)
    const looksLikeList = lines.every((line) =>
      /^[-•]/.test(line) || /^\d+[\.\)]/.test(line)
    );

    if (looksLikeList) {
      // ✅ Proper bullets / numbering
      return (
        <ul
          className={`text-sm ${theme.textMuted} leading-relaxed list-disc pl-5 space-y-1`}
        >
          {lines.map((line, idx) => (
            <li
              key={idx}
            >
              {line
                .replace(/^[-•]\s*/, '')
                .replace(/^\d+[\.\)]\s*/, '')}
            </li>
          ))}
        </ul>
      );
    }

    // warna multi-line paragraph
    return (
      <p
        className={`text-sm ${theme.textMuted} leading-relaxed whitespace-pre-line`}
      >
        {desc}
      </p>
    );
  };


    useEffect(() => {
    const unsubConfig = onSnapshot(
      doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'highlightsConfig'),
      (docSnap) => {
        if (docSnap.exists()) {
          setShowSection(docSnap.data().isVisible !== false);
        }
      },
      (error) => console.log('Highlights Config Error', error)
    );

    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'highlights'),
      orderBy('createdAt', 'desc')
    );

    const unsubList = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setHighlights(items);
      },
      (error) => console.log('Highlights List Error', error)
    );

    return () => {
      unsubConfig();
      unsubList();
    };
  }, []); // 🔁 user dependency remove


  return (
    <div className="animate-fade-in space-y-16">
      <div className="text-center py-16 space-y-8">
        <h1 className={`text-5xl md:text-6xl font-extrabold ${theme.text}`}>Welcome to <span className="text-indigo-500">EduNexus</span></h1>
        <p className={`text-xl max-w-2xl mx-auto ${theme.textMuted}`}>The ultimate student portal. Access resources, prepare for exams with AI, and connect with peers.</p>
        <div className="relative max-w-2xl mx-auto group">
          <Search className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input type="text" placeholder="Search files, quizzes, or forums..." className={`w-full ${theme.input} pl-12 pr-4 py-4 rounded-full text-lg shadow-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all`} onClick={()=>setPage('academic')} />
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <button onClick={()=>setPage('academic')} className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"><Folder/> Browse Files</button>
          <button onClick={()=>setPage('aiquiz')} className="bg-green-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"><CheckSquare/> Start Quiz</button>
          <button onClick={()=>setPage('flashcards')} className="bg-pink-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"><Layers/> AI Flashcards ✨</button>
          <button onClick={()=>setPage('planner')} className="bg-purple-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"><Calendar/> Plan Study</button>
        </div>
        
        <div className="mt-8">
          <a href="https://vulms.vu.edu.pk/" target="_blank" className="inline-flex items-center gap-3 text-indigo-600 hover:text-indigo-700 font-extrabold text-xl md:text-2xl hover:underline">
            <GraduationCap size={36} /> Go to VU LMS
          </a>
        </div>
      </div>
        {/* 🔹 Home Hero Ad – search + buttons ke neeche */}
    
            {showSection && highlights.length > 0 && (
  <>
    <div className="max-w-6xl mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <h2
          className={`text-2xl font-bold flex items-center gap-2 ${theme.text}`}
        >
          <Megaphone className="text-red-500" />
          Campus Highlights
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {highlights.map((post) => {
          const IconComponent = ICON_MAP[post.iconName] || Calendar;

          const CardInner = (
            <div className="flex flex-col h-full">
              {/* Icon */}
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                  post.color || "bg-indigo-100 text-indigo-700"
                }`}
              >
                <IconComponent size={24} />
              </div>

              {/* Title */}
              <h3
                className={`font-semibold text-base md:text-lg mb-3 ${theme.text}`}
              >
                {post.title}
              </h3>

              {/* Description / bullets */}
              <div className="flex-1">
                {renderHighlightDesc(post.desc)}
              </div>

              {/* Visit link */}
              {post.link && (
                <div className="mt-4">
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-indigo-400 group-hover:text-indigo-300 group-hover:underline">
                    Visit Link
                    <ExternalLink size={12} />
                  </span>
                </div>
              )}
            </div>
          );

          const cardClasses = `${theme.card} border ${theme.border} rounded-2xl p-5 shadow-sm hover:shadow-md transition-transform hover:-translate-y-1 group`;

          return post.link ? (
            <a
              key={post.id}
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              className={cardClasses}
            >
              {CardInner}
            </a>
          ) : (
            <div key={post.id} className={cardClasses}>
              {CardInner}
            </div>
          );
        })}
      </div>
    </div>

    {/* 🔹 Home Mid Content Ad – highlights ke neeche */}
    
  </>
)}



      <Feedback theme={theme} showToast={showToast} />
    </div>
  );
};

// 14. Floating AI Chat (Updated: Draggable & Resizable)
const FloatingAIChat = ({ theme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'ai', text: "Hello! I'm EduBot. Ask me anything!" }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Draggable & Resizable State
  const [position, setPosition] = useState({ x: 0, y: 0 }); // Initialize at 0,0
  const [size, setSize] = useState({ width: 320, height: 450 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const chatRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, isOpen]);

  // Safety check on open: Reposition if off-screen or uninitialized
  useEffect(() => {
      if (isOpen) {
          const screenW = window.innerWidth;
          const screenH = window.innerHeight;
          
          setPosition(prev => {
             let nextX = prev.x;
             let nextY = prev.y;

             // If not yet set (0,0) or completely off screen, reset to bottom-right default
             if ((prev.x === 0 && prev.y === 0) || nextX > screenW - 50 || nextY > screenH - 50) {
                 nextX = Math.max(20, screenW - size.width - 20);
                 nextY = Math.max(20, screenH - size.height - 100); // Above button
             }
             
             // Ensure inside bounds if window resized
             if (nextX + size.width > screenW) nextX = Math.max(0, screenW - size.width);
             if (nextY + size.height > screenH) nextY = Math.max(0, screenH - size.height);
             
             return { x: nextX, y: nextY };
          });
      }
  }, [isOpen]);

  // Drag Handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.resize-handle') || e.target.closest('button')) return;
    setIsDragging(true);
    const rect = chatRef.current.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  // Resize Handlers
  const handleResizeStart = (e) => {
    e.stopPropagation();
    setIsResizing(true);
  };

  // Global Mouse Events for Drag/Resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      } else if (isResizing) {
        if (!chatRef.current) return;
        const rect = chatRef.current.getBoundingClientRect();
        setSize({
          width: Math.max(280, e.clientX - rect.left),
          height: Math.max(350, e.clientY - rect.top)
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput(''); setLoading(true);
    try {
      const prompt = `You are EduBot, an academic assistant for university students.

Rules:
- Answer in maximum 5 – 6 short lines.
- Reply only to what the student asks, no extra info.
- No long  conclusions.

Student question: ${userMsg}`;
      const reply = await callGemini(prompt, true);
      setMessages(prev => [...prev, { role: 'ai', text: reply }]);
    } catch(e) {
      setMessages(prev => [...prev, { role: 'ai', text: "I apologize, but I encountered a temporary error. Please try again." }]);
    }
    setLoading(false);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-xl transition-transform hover:scale-110 flex items-center justify-center mb-1"><MessageCircle size={28} /></a>
        
        {/* Toggle Button */}
        <button onClick={() => setIsOpen(!isOpen)} className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center">
            {isOpen ? <X size={28} /> : <Bot size={28} />}
        </button>
      </div>

      {isOpen && (
        <div 
            ref={chatRef}
            style={{ 
                left: position.x, 
                top: position.y, 
                width: size.width, 
                height: size.height 
            }}
            className={`fixed z-[60] flex flex-col rounded-2xl shadow-2xl overflow-hidden border ${theme.border} ${theme.card}`}
        >
          {/* Header (Draggable) */}
          <div 
            onMouseDown={handleMouseDown}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 text-white font-bold flex justify-between items-center shadow-md cursor-move select-none"
          >
            <span className="flex items-center gap-2 pointer-events-none"><Bot size={18}/> EduBot AI</span>
            <div className="flex items-center gap-2">
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={18}/></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-opacity-50" ref={scrollRef}>
            {messages.map((m, i) => (
                <div key={i} className={`p-3 rounded-xl text-sm leading-relaxed max-w-[85%] shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white ml-auto rounded-tr-none' : `${theme.bg} ${theme.text} mr-auto rounded-tl-none border ${theme.border} font-normal`}`}>
                    {m.text}
                </div>
            ))}
            {loading && <div className="text-xs text-indigo-500 animate-pulse ml-2">EduBot is thinking...</div>}
          </div>

          {/* Input */}
          <div className={`p-3 border-t ${theme.border} flex gap-2 ${theme.bg}`}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyPress={e=>e.key==='Enter'&&handleSend()} className={`flex-1 ${theme.chatInput} rounded-lg px-3 py-2 text-sm outline-none border border-transparent focus:border-indigo-500 transition-colors`} placeholder="Type here..." />
            <button onClick={handleSend} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700"><Send size={16}/></button>
          </div>

          {/* Resize Handle */}
          <div 
            onMouseDown={handleResizeStart}
            className="resize-handle"
          >
             <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-400 absolute bottom-1 right-1 opacity-50"><path fill="currentColor" d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22Z" /></svg>
          </div>
        </div>
      )}
    </>
  );
};

// 15. ADMIN PANEL
const AdminPanel = ({ theme, user, showToast }) => { 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [feedbacks, setFeedbacks] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  

  useEffect(() => {
    if (!user) return;
    const qF = query(collection(db, 'artifacts', appId, 'public', 'data', 'feedback'), orderBy('createdAt', 'desc'));
    const unsubF = onSnapshot(qF, s => setFeedbacks(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const qA = query(collection(db, 'artifacts', appId, 'public', 'data', 'files'), orderBy('createdAt', 'desc'), limit(3));
    const unsubA = onSnapshot(qA, s => {
      const files = s.docs.map(d => ({type: 'file', msg: `Uploaded file: ${d.data().name}`, ...d.data()}));
      setRecentActivity(prev => [...files, ...prev].slice(0, 10));
    });
    return () => { unsubF(); unsubA(); };
  }, [user]);

  const DashboardTab = () => (
    <div className="grid md:grid-cols-2 gap-6">
      <div className={`${theme.card} p-6 rounded-2xl border ${theme.border}`}>
        <h3 className={`text-xl font-bold ${theme.text} mb-4 flex items-center gap-2`}><Activity className="text-indigo-500"/> Recent Activity</h3>
        <div className="space-y-4">{recentActivity.length > 0 ? recentActivity.map((act, i) => (<div key={i} className={`p-3 rounded-lg border ${theme.border} bg-slate-50 dark:bg-slate-900 text-sm`}><p className={`${theme.text}`}>{String(act.msg)}</p><p className={`text-xs ${theme.textMuted}`}>{formatDate(act.createdAt)}</p></div>)) : <p className={theme.textMuted}>No recent system activity.</p>}</div>
      </div>
      <div className={`${theme.card} p-6 rounded-2xl border ${theme.border}`}>
        <h3 className={`text-xl font-bold ${theme.text} mb-4 flex items-center gap-2`}><Inbox className="text-green-500"/> Inbox ({feedbacks.length})</h3>
        <div className="h-64 overflow-y-auto space-y-2">{feedbacks.map(msg => (<div key={msg.id} className={`p-3 rounded-lg border ${theme.border} bg-slate-50 dark:bg-slate-900 relative group`}><button onClick={()=>deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'feedback', msg.id))} className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 size={16}/></button><p className={`text-xs font-bold ${theme.text}`}>{String(msg.name)} <span className="text-indigo-500">&lt;{String(msg.email)}&gt;</span></p><p className={`text-sm ${theme.textMuted} mt-1`}>{String(msg.msg)}</p></div>))}{feedbacks.length === 0 && <p className={theme.textMuted}>No messages.</p>}</div>
      </div>
    </div>
  );

  const HighlightsTab = () => {
    const [highlights, setHighlights] = useState([]);
    const [masterVisible, setMasterVisible] = useState(true);
    const [hTitle, setHTitle] = useState('');
    const [hDesc, setHDesc] = useState('');
    const [hLink, setHLink] = useState('');
    const [hIcon, setHIcon] = useState('Calendar');
    const [hColor, setHColor] = useState(COLOR_OPTIONS[0].value);
    const [editHId, setEditHId] = useState(null);

    useEffect(() => {
        const unsubConfig = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'highlightsConfig'), (docSnap) => {
            if (docSnap.exists()) {
                setMasterVisible(docSnap.data().isVisible !== false);
            }
        });

        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'highlights'), orderBy('createdAt', 'desc'));
        const unsubList = onSnapshot(q, (snapshot) => {
            setHighlights(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
        });

        return () => { unsubConfig(); unsubList(); };
    }, []);

    const toggleMasterVisibility = async () => {
        const newValue = !masterVisible;
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'highlightsConfig'), { isVisible: newValue });
        showToast(newValue ? "Highlights Section Visible" : "Highlights Section Hidden", "info");
    };

    const handleSaveHighlight = async () => {
        if (!hTitle || !hDesc) {
            showToast("Title and Description are required", "error");
            return;
        }

        const data = {
            title: hTitle,
            desc: hDesc,
            link: hLink,
            iconName: hIcon,
            color: hColor,
            createdAt: serverTimestamp()
        };

        if (editHId) {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'highlights', editHId), data);
            showToast("Highlight Updated", "success");
        } else {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'highlights'), data);
            showToast("Highlight Added", "success");
        }

        setHTitle(''); setHDesc(''); setHLink(''); setEditHId(null);
    };

    const handleLoadDefaults = async () => {
      if (highlights.length > 0) {
        if (!window.confirm("You already have highlights. Add duplicates?")) return;
      }
      
      const defaults = [
        {
          title: "Mid-Term Datesheet Released",
          desc: "The official datesheet for Fall 2025 mid-term exams is now available on VULMS. Plan your study schedule!",
          iconName: "Calendar",
          color: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100",
          link: "https://vulms.vu.edu.pk",
          createdAt: serverTimestamp()
        },
        {
          title: "CS101 Assignment Help",
          desc: "New resource file uploaded in the Academic Hub specifically for Assignment 2. Check it out now.",
          iconName: "Code",
          color: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100",
          link: "",
          createdAt: serverTimestamp()
        },
        {
          title: "Gaming Tournament",
          desc: "Registrations are open for the annual E-Sports Gala. Join the 'Gamers' forum thread to form your team!",
          iconName: "Trophy",
          color: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-100",
          link: "",
          createdAt: serverTimestamp()
        },
        {
          title: "Scholarship Deadline",
          desc: "Need-based scholarship applications extended by one week. Submit documents via LMS.",
          iconName: "Star",
          color: "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-100",
          link: "",
          createdAt: serverTimestamp()
        }
      ];

      try {
        const batchPromises = defaults.map(item => addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'highlights'), item));
        await Promise.all(batchPromises);
        showToast("Default highlights added successfully!", "success");
      } catch (error) {
        console.error("Error adding defaults: ", error);
        showToast("Failed to add defaults", "error");
      }
    };

    const handleEditStart = (item) => {
        setHTitle(item.title);
        setHDesc(item.desc);
        setHLink(item.link || '');
        setHIcon(item.iconName || 'Calendar');
        setHColor(item.color || COLOR_OPTIONS[0].value);
        setEditHId(item.id);
    };

    const handleDeleteHighlight = async (id) => {
        if (window.confirm("Delete this highlight?")) {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'highlights', id));
            showToast("Highlight Deleted", "success");
        }
    };

    return (
        <div className="space-y-6">
            <div className={`${theme.card} p-6 rounded-2xl border ${theme.border} flex flex-col md:flex-row justify-between items-center shadow-sm gap-4`}>
                <div>
                    <h3 className={`font-bold ${theme.text} text-lg`}>Highlights Section Visibility</h3>
                    <p className={`text-sm ${theme.textMuted}`}>Control visibility or load default data.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleLoadDefaults} className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all bg-indigo-100 text-indigo-700 hover:bg-indigo-200`}>
                        <RefreshCw size={20}/> Load Defaults
                    </button>
                    <button onClick={toggleMasterVisibility} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${masterVisible ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                        {masterVisible ? <Eye size={20}/> : <EyeOff size={20}/>} {masterVisible ? 'Active' : 'Hidden'}
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Form */}
                <div className={`${theme.card} p-6 rounded-2xl border ${theme.border}`}>
                    <h3 className={`font-bold ${theme.text} mb-4`}>{editHId ? 'Edit Highlight' : 'Add New Highlight'}</h3>
                    <div className="space-y-3">
                        <input value={hTitle} onChange={e=>setHTitle(e.target.value)} placeholder="Title (e.g. Mid-Terms)" className={`w-full ${theme.input} p-3 rounded-lg`} />
                        <textarea value={hDesc} onChange={e=>setHDesc(e.target.value)} placeholder="Description..." className={`w-full ${theme.input} p-3 rounded-lg h-24`} />
                        <input value={hLink} onChange={e=>setHLink(e.target.value)} placeholder="Link URL (Optional)" className={`w-full ${theme.input} p-3 rounded-lg`} />
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={`block text-xs font-bold ${theme.textMuted} mb-1`}>Icon</label>
                                <select value={hIcon} onChange={e=>setHIcon(e.target.value)} className={`w-full ${theme.input} p-2 rounded-lg`}>
                                    {Object.keys(ICON_MAP).map(key => <option key={key} value={key}>{key}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={`block text-xs font-bold ${theme.textMuted} mb-1`}>Color Theme</label>
                                <select value={hColor} onChange={e=>setHColor(e.target.value)} className={`w-full ${theme.input} p-2 rounded-lg`}>
                                    {COLOR_OPTIONS.map((opt, i) => <option key={i} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                            <button onClick={handleSaveHighlight} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700">{editHId ? 'Update' : 'Add'}</button>
                            {editHId && <button onClick={() => {setEditHId(null); setHTitle(''); setHDesc(''); setHLink('');}} className="px-4 bg-slate-500 text-white rounded-lg">Cancel</button>}
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className={`${theme.card} p-6 rounded-2xl border ${theme.border} h-[500px] overflow-y-auto`}>
                    <h3 className={`font-bold ${theme.text} mb-4`}>Current Highlights ({highlights.length})</h3>
                    <div className="space-y-3">
                        {highlights.map(h => {
                            const IconC = ICON_MAP[h.iconName] || Calendar;
                            return (
                                <div key={h.id} className="p-4 border rounded-xl relative group bg-slate-50 dark:bg-slate-800/50">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-full ${h.color || "bg-slate-200"}`}><IconC size={16}/></div>
                                        <div className="flex-1">
                                            <h4 className={`font-bold text-sm ${theme.text}`}>{h.title}</h4>
                                            <p className={`text-xs ${theme.textMuted} line-clamp-2`}>{h.desc}</p>
                                            {h.link && <p className="text-xs text-indigo-500 mt-1 truncate">{h.link}</p>}
                                        </div>
                                    </div>
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditStart(h)} className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"><Edit3 size={14}/></button>
                                        <button onClick={() => handleDeleteHighlight(h.id)} className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            );
                        })}
                        {highlights.length === 0 && <p className={`text-center ${theme.textMuted} py-10`}>No highlights added yet.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
  };

  const AcademicTab = () => {
  const [uName, setUName] = useState("");
  const [uFile, setUFile] = useState(null);
  const [uDriveLink, setUDriveLink] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [subjects, setSubjects] = useState(DEFAULT_FOLDERS);
  const [selSubject, setSelSubject] = useState("General");
  const [files, setFiles] = useState([]);

  const [editingFolder, setEditingFolder] = useState(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    // folders meta load
    getDoc(
      doc(db, "artifacts", appId, "public", "data", "meta", "folders")
    ).then((s) => {
      if (s.exists()) {
        const dbFolders = s.data().list || [];
        setSubjects([...new Set([...DEFAULT_FOLDERS, ...dbFolders])]);
      }
    });

    // files list load
    const q = query(
      collection(db, "artifacts", appId, "public", "data", "files"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (s) =>
      setFiles(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, []);

  const saveFoldersToDb = async (updatedSubjects) => {
    // sirf custom folders ko db me rakho
    const custom = updatedSubjects.filter(
      (f) => !DEFAULT_FOLDERS.includes(f)
    );
    await setDoc(
      doc(db, "artifacts", appId, "public", "data", "meta", "folders"),
      { list: custom }
    );
  };

        // ✅ Cloudinary-based upload (raw files + drive links)
  const handleUploadFile = async () => {
    console.log("UPLOAD CLICKED", { selSubject, uFile, uDriveLink, uName });

    // folder + file ya link required
    if (!selSubject || (!uFile && !uDriveLink.trim())) {
      showToast(
        "Please select a folder and either choose a file or paste a link",
        "error"
      );
      return;
    }

    try {
      let fileUrl = uDriveLink.trim();
      let finalName = uName;
      let ext = "";
      let isLinkOnly = false;

      // 1) Agar admin ne actual file select ki hai → Cloudinary pe upload
      if (uFile) {
        console.log("Using Cloudinary:", CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET);

        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
          alert("Cloudinary env variables missing");
          throw new Error("Cloudinary env missing");
        }

        // extension nikaalo (pdf, docx, etc.)
        ext = uFile.name.split(".").pop().toLowerCase();

        const formData = new FormData();
          formData.append("file", uFile);
          formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

          const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

          const res = await fetch(uploadUrl, {
            method: "POST",
            body: formData,
          });


        const data = await res.json();
        console.log("Cloudinary response:", data);

        if (!res.ok || data.error) {
          throw new Error(
            data.error?.message || "Cloudinary upload failed"
          );
        }

        fileUrl = data.secure_url;
        if (!fileUrl) {
          throw new Error("No URL returned from Cloudinary");
        }

        if (!finalName)
          finalName = data.original_filename || uFile.name;

        if (!ext)
          ext =
            (data.format || "").toLowerCase() ||
            uFile.name.split(".").pop().toLowerCase();

        isLinkOnly = false; // ye actual file upload hai
      } else {
        // 2) Sirf Drive ya koi bhi external link
        isLinkOnly = true;
        if (!finalName) finalName = "Drive link";
      }

      if (!fileUrl) {
        showToast("Please paste a valid link", "error");
        return;
      }

      const filesCol = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "files"
      );

      await addDoc(filesCol, {
        name: finalName,
        subject: selSubject,
        url: fileUrl,
        ext,
        isLinkOnly,
        uploadedBy: "Admin",
        createdAt: serverTimestamp(),
      });

      showToast("File saved successfully", "success");

      setUName("");
      setUFile(null);
      setUDriveLink("");

      console.log("UPLOAD DONE");
    } catch (error) {
      console.error("Upload error:", error);
      showToast("Upload failed. Please try again.", "error");
      alert("Upload failed: " + (error.message || error));
    }
  };




  const handleAddFolder = async () => {
    if (!newFolder.trim()) return;
    const folderName = newFolder.trim();

    const newList = [...new Set([...subjects, folderName])];
    setSubjects(newList);
    await saveFoldersToDb(newList);
    setNewFolder("");
    showToast("Folder Added", "success");
  };

  const startRenameFolder = (name) => {
    if (DEFAULT_FOLDERS.includes(name)) {
      showToast("Default folders ko rename nahi kar sakte", "error");
      return;
    }
    setEditingFolder(name);
    setEditingName(name);
  };

  const handleRenameFolder = async () => {
    if (!editingFolder || !editingName.trim()) return;
    const newName = editingName.trim();

    const updated = subjects.map((s) => (s === editingFolder ? newName : s));
    setSubjects(updated);
    await saveFoldersToDb(updated);
    showToast("Folder renamed", "success");
    setEditingFolder(null);
    setEditingName("");
  };

  const handleDeleteFolder = async (name) => {
    if (DEFAULT_FOLDERS.includes(name)) {
      showToast("Default folders ko delete nahi kar sakte", "error");
      return;
    }
    const updated = subjects.filter((s) => s !== name);
    setSubjects(updated);
    await saveFoldersToDb(updated);
    showToast("Folder deleted", "success");

    if (selSubject === name) {
      setSelSubject("General");
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload + Folder controls */}
      <div className={`${theme.card} p-6 rounded-2xl border ${theme.border}`}>
        <h3 className={`font-bold ${theme.text} mb-4`}>Upload & Folders</h3>

        {/* New folder add */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            value={newFolder}
            onChange={(e) => setNewFolder(e.target.value)}
            placeholder="New Folder Name"
            className={`${theme.input} p-2 rounded flex-1`}
          />
          <button
            onClick={handleAddFolder}
            className="bg-indigo-600 text-white px-4 py-2 rounded font-bold"
          >
            Add Folder
          </button>
        </div>

        {/* Folder list with rename/delete */}
        <div className="mb-4">
          <h4 className={`text-sm font-bold mb-2 ${theme.text}`}>
            Folders (rename / delete)
          </h4>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <div
                key={s}
                className="flex items-center gap-2 px-3 py-1 rounded-full border text-xs bg-slate-50 dark:bg-slate-800"
              >
                <span className={theme.text}>{String(s)}</span>

                {!DEFAULT_FOLDERS.includes(s) && (
                  <>
                    <button
                      className="text-xs text-blue-500 hover:underline"
                      onClick={() => startRenameFolder(s)}
                    >
                      Rename
                    </button>
                    <button
                      className="text-xs text-red-500 hover:underline"
                      onClick={() => handleDeleteFolder(s)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {editingFolder && (
            <div className="mt-3 flex gap-2 items-center">
              <input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className={`${theme.input} p-2 rounded flex-1`}
                placeholder="New folder name"
              />
              <button
                onClick={handleRenameFolder}
                className="bg-green-600 text-white px-3 py-2 rounded text-xs font-bold"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingFolder(null);
                  setEditingName("");
                }}
                className="px-3 py-2 rounded text-xs border"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

               {/* Upload form */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <select
            value={selSubject}
            onChange={(e) => setSelSubject(e.target.value)}
            className={`${theme.input} p-2 rounded text-slate-800 dark:text-slate-200`}
          >
            <option>General</option>
            {subjects.map((s) => (
              <option key={s}>{String(s)}</option>
            ))}
          </select>

          <input
            value={uName}
            onChange={(e) => setUName(e.target.value)}
            placeholder="File Name"
            className={`${theme.input} p-2 rounded flex-1`}
          />

          <div className="relative">
            <input
              type="file"
              onChange={(e) => setUFile(e.target.files[0])}
              className="hidden"
              id="adminFile"
            />
            <label
              htmlFor="adminFile"
              className="bg-slate-700 text-white px-4 py-2 rounded cursor-pointer block text-sm"
            >
              {uFile ? "File Selected" : "Choose File"}
            </label>
          </div>

          <input
            value={uDriveLink}
            onChange={(e) => setUDriveLink(e.target.value)}
            placeholder="OR Google Drive / Any Link"
            className={`${theme.input} p-2 rounded flex-1`}
          />

          <button
            type="button"               // 👈 IMPORTANT: submit nahi, sirf normal button
            onClick={handleUploadFile}  // 👈 yahan function bind hai
            className="bg-green-600 text-white px-4 py-2 rounded font-bold"
          >
            Upload
          </button>
        </div>
      </div>

      {/* Files list */}
      <div className={`${theme.card} p-6 rounded-2xl border ${theme.border}`}>
        <h3 className={`font-bold ${theme.text} mb-4`}>Manage Files</h3>
        <div className="h-64 overflow-y-auto space-y-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex justify-between items-center p-3 border rounded"
            >
              <div>
                <p className={`font-bold ${theme.text}`}>{String(f.name)}</p>
                <p className={`text-xs ${theme.textMuted}`}>
                  {String(f.subject)}
                </p>
              </div>
              <button
                onClick={() =>
                  deleteDoc(
                    doc(
                      db,
                      "artifacts",
                      appId,
                      "public",
                      "data",
                      "files",
                      f.id
                    )
                  )
                }
                className="text-red-500 hover:bg-red-100 p-2 rounded"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};




  const BlogTab = () => {
    const [arts, setArts] = useState([]);
    const [editId, setEditId] = useState(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    useEffect(() => {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'articles'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, s => setArts(s.docs.map(d => ({id: d.id, ...d.data()}))));
      return () => unsub();
    }, []);

    const handleSubmit = async () => {
      if(!title || !content) return;
      if(editId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'articles', editId), { title, content, imageUrl });
        showToast("Article Updated", "success");
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'articles'), { 
          title, content, imageUrl, author: 'Admin', likes: 0, likedBy: [], createdAt: serverTimestamp() 
        });
        showToast("Article Published", "success");
      }
      setEditId(null); setTitle(''); setContent(''); setImageUrl('');
    };

    const handleEdit = (art) => { setEditId(art.id); setTitle(art.title); setContent(art.content); setImageUrl(art.imageUrl || ''); };

    const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 1000000) { showToast("File too large (Max 1MB)", "error"); return; }
        const reader = new FileReader();
        reader.onloadend = () => { setImageUrl(reader.result); };
        reader.readAsDataURL(file);
      }
    };

    return (
      <div className="grid md:grid-cols-2 gap-6">
        <div className={`${theme.card} p-6 rounded-2xl border ${theme.border}`}>
          <h3 className={`font-bold ${theme.text} mb-4`}>{editId ? 'Edit Article' : 'New Article'}</h3>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" className={`w-full ${theme.input} p-2 rounded mb-2`} />
          
          <div className="mb-2">
             <label className={`block text-xs font-bold ${theme.textMuted} mb-1`}>Cover Image</label>
             <div className="flex gap-2 mb-2">
              <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="Image URL (or upload below)" className={`flex-1 ${theme.input} p-2 rounded`} />
            </div>
             <div className="relative group cursor-pointer bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 rounded p-2 text-center hover:bg-slate-200">
              <input type="file" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
              <span className={`text-xs ${theme.textMuted} flex items-center justify-center gap-1`}><Upload size={12}/> Upload Image File (Max 1MB)</span>
            </div>
             {imageUrl && <div className="mt-2 h-20 w-full overflow-hidden rounded bg-slate-100"><img src={imageUrl} alt="Preview" className="h-full w-full object-cover opacity-80" /></div>}
          </div>

          <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Content" className={`w-full ${theme.input} p-2 rounded h-48 mb-2`} />
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold flex-1">{editId ? 'Update' : 'Publish'}</button>
            {editId && <button onClick={()=>{setEditId(null);setTitle('');setContent('');setImageUrl('')}} className="bg-slate-500 text-white px-4 py-2 rounded font-bold">Cancel</button>}
          </div>
        </div>
        <div className={`${theme.card} p-6 rounded-2xl border ${theme.border} h-96 overflow-y-auto`}>
          <h3 className={`font-bold ${theme.text} mb-4`}>Existing Articles</h3>
          <div className="space-y-3">{arts.map(a => (<div key={a.id} className="p-3 border rounded relative group"><p className={`font-bold ${theme.text}`}>{String(a.title)}</p><p className={`text-xs ${theme.textMuted}`}>{formatDate(a.createdAt)}</p><div className="flex gap-2 mt-2"><button onClick={()=>handleEdit(a)} className="text-indigo-500 text-xs font-bold flex items-center gap-1"><Edit size={12}/> Edit</button><button onClick={()=>deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'articles', a.id))} className="text-red-500 text-xs font-bold flex items-center gap-1"><Trash2 size={12}/> Delete</button></div></div>))}</div>
        </div>
      </div>
    );
  };

  // ADMIN PANEL – DISCUSSION MODERATION WITH REPLY ADD / EDIT / DELETE
const ForumTab = ({ theme, showToast }) => {
  const [posts, setPosts] = useState([]);
  const [editId, setEditId] = useState(null);     // jis post ka reply edit ho raha hai
  const [replyText, setReplyText] = useState(""); // current reply text
  const [saving, setSaving] = useState(false);

  // Live discussions sync
  useEffect(() => {
    const qRef = query(
      collection(db, "artifacts", appId, "public", "data", "discussions"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(qRef, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, []);

  // Post delete (user ka message delete)
  const handleDeletePost = async (id) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await deleteDoc(
        doc(db, "artifacts", appId, "public", "data", "discussions", id)
      );
      showToast("Post deleted", "info");
    } catch (e) {
      console.error(e);
      showToast("Failed to delete post", "error");
    }
  };

  // Reply edit start
  const startEdit = (post) => {
    setEditId(post.id);
    setReplyText(post.adminReply || "");
  };

  // Edit cancel
  const cancelEdit = () => {
    setEditId(null);
    setReplyText("");
  };

  // Reply delete (sirf adminReply remove hoga)
  const handleDeleteReply = async (id) => {
    setSaving(true);
    try {
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "discussions", id),
        {
          adminReply: "",
          adminReplyAt: null,
        }
      );
      showToast("Reply deleted", "info");
      if (editId === id) {
        setEditId(null);
        setReplyText("");
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to delete reply", "error");
    } finally {
      setSaving(false);
    }
  };

  // Reply save (add / update)
  const handleSaveReply = async () => {
    if (!editId) return;

    // agar reply empty hai to delete treat kar do
    if (!replyText.trim()) {
      await handleDeleteReply(editId);
      return;
    }

    setSaving(true);
    try {
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "discussions", editId),
        {
          adminReply: replyText.trim(),
          adminReplyAt: serverTimestamp(),
        }
      );
      showToast("Reply saved", "success");
      setEditId(null);
      setReplyText("");
    } catch (e) {
      console.error(e);
      showToast("Failed to save reply", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${theme.card} p-6 rounded-2xl border ${theme.border}`}>
      <h3 className={`font-bold text-lg mb-4 ${theme.text}`}>
        Moderate Discussions
      </h3>

      {posts.length === 0 && (
        <div className="text-sm text-slate-500 py-8 text-center border border-dashed rounded-xl">
          No posts yet.
        </div>
      )}

      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {posts.map((p) => (
          <div
            key={p.id}
            className="border rounded-xl p-4 flex flex-col gap-2 bg-slate-900/10"
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className={`text-xs ${theme.textMuted}`}>
                  {formatDate(p.createdAt)}
                </p>
                <p className={`${theme.text} mt-1 whitespace-pre-wrap`}>
                  {String(p.content)}
                </p>
              </div>

              <button
                onClick={() => handleDeletePost(p.id)}
                className="text-red-500 text-xs font-bold hover:underline"
              >
                Delete
              </button>
            </div>

            {/* Admin reply (user side pe bhi yahi field use hoti hai) */}
            {p.adminReply && editId !== p.id && (
              <div className="mt-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 text-xs">
                <p className="font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                  <Shield size={12} /> Admin Reply
                </p>
                <p className="whitespace-pre-wrap">{String(p.adminReply)}</p>
              </div>
            )}

            {/* EDIT MODE */}
            {editId === p.id ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type admin reply..."
                  className={`w-full ${theme.input} p-2 rounded text-sm`}
                  rows={3}
                />
                <div className="flex gap-2 justify-end flex-wrap">
                  <button
                    onClick={handleSaveReply}
                    disabled={saving}
                    className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-bold"
                  >
                    {saving ? "Saving..." : "Save reply"}
                  </button>

                  <button
                    onClick={() => handleDeleteReply(p.id)}
                    disabled={saving}
                    className="text-xs px-3 py-1 rounded border border-red-500 text-red-500"
                  >
                    Delete reply
                  </button>

                  <button
                    onClick={cancelEdit}
                    className="text-xs px-3 py-1 rounded border border-slate-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => startEdit(p)}
                className="self-end text-xs text-indigo-400 hover:underline mt-1"
              >
                {p.adminReply ? "Edit reply" : "Add reply"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};



/// 15. Admin Panel – Profile / Portfolio Manager (FULL PROFILE)

const ProfileTab = ({ theme, user, showToast }) => {
  const [currUrl, setCurrUrl] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // full profile fields
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [about, setAbout] = useState("");

  const defaultUrl =
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Asad1&backgroundColor=1e293b";

  // profile doc path
  const profileRef = doc(
    db,
    "artifacts",
    appId,
    "public",
    "data",
    "profile",
    "main"
  );

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const snap = await getDoc(profileRef);
        if (snap.exists()) {
          const data = snap.data();
          setCurrUrl(data.picUrl || "");
          setFullName(data.fullName || "");
          setTitle(data.title || "");
          setTagline(data.tagline || "");
          setContactEmail(data.contactEmail || user?.email || "");
          setContactPhone(data.contactPhone || "");
          setAbout(data.about || "");
        } else {
          setContactEmail(user?.email || "");
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchProfile();
  }, [user]);

  const saveProfile = async (overrides = {}) => {
    try {
      const payload = {
        picUrl: overrides.picUrl ?? (currUrl || defaultUrl),
        fullName,
        title,
        tagline,
        contactEmail,
        contactPhone,
        about,
      };

      await setDoc(profileRef, payload);
      showToast("Profile updated", "success");
    } catch (e) {
      console.error(e);
      showToast("Profile save error", "error");
    }
  };

  const handleSavePictureFromUrl = async () => {
    if (!newUrl) return;
    setCurrUrl(newUrl);
    await saveProfile({ picUrl: newUrl });
    setNewUrl("");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      showToast("File too large (Max 1MB)", "error");
      return;
    }

    const reader = new FileReader();
    setUploading(true);
    reader.onloadend = async () => {
      const dataUrl = reader.result;
      setCurrUrl(dataUrl);
      await saveProfile({ picUrl: dataUrl });
      setUploading(false);
      showToast("Profile picture updated", "success");
    };
    reader.readAsDataURL(file);
  };

  const handleReset = async () => {
    try {
      // basically delete / reset profile
      await setDoc(profileRef, {
        picUrl: defaultUrl,
        fullName: "",
        title: "",
        tagline: "",
        contactEmail: user?.email || "",
        contactPhone: "",
        about: "",
      });
      setCurrUrl("");
      setFullName("");
      setTitle("");
      setTagline("");
      setContactEmail(user?.email || "");
      setContactPhone("");
      setAbout("");
      setNewUrl("");
      showToast("Profile reset to default", "success");
    } catch (e) {
      console.error(e);
      showToast("Reset failed", "error");
    }
  };

  const displayName = user?.displayName || "EduNexus Admin";
  const email = user?.email || contactEmail || "admin@example.com";
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const previewUrl = currUrl || defaultUrl;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* LEFT – Picture */}
      <div className={`${theme.card} p-6 rounded-2xl border ${theme.border}`}>
        <h3 className={`font-bold text-lg mb-1 ${theme.text}`}>
          Portfolio Picture Manager
        </h3>
        <p className={`text-xs mb-4 ${theme.textMuted}`}>
          Ye image <strong>Portfolio page</strong> pe bhi use ho rahi hai.
        </p>

        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <img
              src={previewUrl}
              alt="Admin Avatar"
              className="w-20 h-20 rounded-full object-cover border-4 border-indigo-500 shadow-lg"
            />
            <span className="absolute -bottom-2 -right-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Camera size={12} /> Pic
            </span>
          </div>
          <div>
            <p className={`font-bold ${theme.text}`}>{displayName}</p>
            <p className={`text-xs ${theme.textMuted}`}>{email}</p>
            <p className="text-[10px] text-indigo-500 mt-1">
              Profile image + text sab yahan se control hoga.
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Option 1 */}
          <div>
            <h4 className={`font-bold ${theme.text} mb-2`}>
              Option 1: Upload from Device
            </h4>
            <label className="inline-flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg cursor-pointer text-sm font-semibold hover:bg-slate-700">
              <Upload size={16} />
              <span>{uploading ? "Uploading..." : "Choose Image"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {/* Option 2 */}
          <div>
            <h4 className={`font-bold ${theme.text} mb-2`}>
              Option 2: Image URL
            </h4>
            <div className="flex flex-col gap-3">
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://example.com/image.png"
                className={`${theme.input} p-3 rounded-lg`}
              />
              <button
                onClick={handleSavePictureFromUrl}
                className="bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
              >
                Update from URL
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleReset}
            className="text-red-500 flex items-center gap-2 mx-auto hover:bg-red-50 dark:hover:bg-slate-800 px-4 py-2 rounded-lg transition-colors font-bold"
          >
            <Trash2 size={18} /> Remove / Reset Full Profile
          </button>
        </div>
      </div>

      {/* RIGHT – Full profile text fields */}
      <div className={`${theme.card} p-6 rounded-2xl border ${theme.border}`}>
        <h3 className={`font-bold text-lg mb-4 ${theme.text}`}>
          Full Portfolio Profile
        </h3>

        <div className="space-y-3 text-sm">
          <div>
            <label className={`block text-xs mb-1 ${theme.textMuted}`}>
              Full Name
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={`${theme.input} p-2 rounded w-full`}
              placeholder="e.g. Asad Amanat Ali"
            />
          </div>

          <div>
            <label className={`block text-xs mb-1 ${theme.textMuted}`}>
              Title / Role
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`${theme.input} p-2 rounded w-full`}
              placeholder="Software Engineer | Web Developer | Network Specialist"
            />
          </div>

          <div>
            <label className={`block text-xs mb-1 ${theme.textMuted}`}>
              Short Tagline
            </label>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className={`${theme.input} p-2 rounded w-full`}
              placeholder="Building smart tools for smart students."
            />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs mb-1 ${theme.textMuted}`}>
                Contact Email
              </label>
              <input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className={`${theme.input} p-2 rounded w-full`}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className={`block text-xs mb-1 ${theme.textMuted}`}>
                WhatsApp / Phone
              </label>
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className={`${theme.input} p-2 rounded w-full`}
                placeholder="0300-0000000"
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs mb-1 ${theme.textMuted}`}>
              Short About / Bio
            </label>
            <textarea
              rows={4}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              className={`${theme.input} p-2 rounded w-full`}
              placeholder="2–3 lines about your skills, focus and vision."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={() => {
              // just revert local without touching DB
              setFullName("");
              setTitle("");
              setTagline("");
              setContactPhone("");
              setAbout("");
            }}
            className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-600"
          >
            Clear Fields
          </button>

          <button
            onClick={() => saveProfile()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
          >
            Save Full Profile
          </button>
        </div>

        <div className={`${theme.card} mt-6 p-4 rounded-xl border ${theme.border}`}>
          <h4 className={`font-bold ${theme.text} mb-2 flex items-center gap-2`}>
            <Info size={16} /> Tips
          </h4>
          <ul className={`text-xs space-y-1 ${theme.textMuted}`}>
            <li>• Ye data Portfolio page pe use ho raha hai.</li>
            <li>• Agar doc empty ho to static default text show hoga.</li>
            <li>• Reset button ka matlab delete / default par wapas.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// 👆 YAHAN tak naya ProfileTab component



  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'highlights', label: 'Highlights', icon: Megaphone },
    { id: 'academic', label: 'Academic', icon: Folder },
    { id: 'blog', label: 'Blog', icon: FileText },
    { id: 'forum', label: 'Forum', icon: MessageSquare },
    { id: 'profile', label: 'Profile', icon: ImageIcon },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className={`text-3xl font-bold ${theme.text}`}>Admin Panel</h2>
        <div className="flex gap-2 bg-slate-200 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto max-w-full">
          {tabs.map(t => (
            <button key={t.id} onClick={()=>setActiveTab(t.id)} className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-bold transition-all ${activeTab === t.id ? 'bg-indigo-600 text-white shadow' : `${theme.textMuted} hover:${theme.text}`}`}>
              <t.icon size={16}/> {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="animate-slide-up">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'highlights' && <HighlightsTab />}
        {activeTab === 'academic' && <AcademicTab />}
        {activeTab === 'blog' && <BlogTab />}
       {activeTab === 'forum' && (
  <ForumTab theme={theme} showToast={showToast} />
)}



        {activeTab === 'profile' && (
  <ProfileTab theme={theme} user={user} showToast={showToast} />
)}

      </div>
    </div>
  );
};

// 🔐 Admin login modal – email + password required
const AdminLogin = ({ onClose, setPage, setIsAdminMode, showToast }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      showToast("Email and password required.", "error");
      return;
    }

    setLoading(true);

    const enteredEmail = email.trim().toLowerCase();

    // ✅ Sirf tumhara email + password
    if (
      enteredEmail === ADMIN_EMAIL.toLowerCase() &&
      password === ADMIN_PASSWORD
    ) {
      setIsAdminMode(true);
      setPage("admin");
      showToast("Admin mode enabled.", "success");
      onClose();
    } else {
      showToast("Invalid admin credentials.", "error");
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl shadow-2xl border border-slate-700/50 bg-slate-900 text-slate-100 relative overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-indigo-400" />
            <span className="font-semibold text-sm">EduNexus Admin Login</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <p className="text-xs text-slate-400">
            Restricted area. Only the site owner can access the admin panel
            using the registered admin email and secret password.
          </p>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Admin Email
            </label>
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700 focus-within:border-indigo-500">
              <Mail size={14} className="text-slate-400" />
              <input
                type="email"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
                placeholder="Enter admin Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Admin Password
            </label>
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700 focus-within:border-indigo-500">
              <Lock size={14} className="text-slate-400" />
              <input
                type="password"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

        

          {/* Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader size={14} className="animate-spin" />
                  Checking…
                </>
              ) : (
                <>
                  <LogIn size={14} />
                  Enter Admin Panel
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 17. Exam Prep Placeholder
const ExamPrep = ({ theme }) => (
  <div className={`max-w-4xl mx-auto ${theme.card} p-8 rounded-2xl border ${theme.border} text-center`}><h2 className={`text-2xl font-bold ${theme.text}`}>PHY101 Prep</h2><p className={theme.textMuted}>Modules loaded.</p><button className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors">Start</button></div>
);
// CGPACalculator.jsx (ya jahan bhi tum ne CGPA component rakha hai)

// 🔐 VU-style grading helper
const getGradeInfo = (score) => {
  const s = Number.isFinite(score) ? score : 0;

  if (s >= 90)
    return { grade: "A+", gpa: 4.0, tone: "good", range: "90–100%" };
  if (s >= 85)
    return { grade: "A", gpa: 4.0, tone: "good", range: "85–89%" };
  if (s >= 80)
    return { grade: "A-", gpa: 3.8, tone: "good", range: "80–84%" };
  if (s >= 75)
    return { grade: "B+", gpa: 3.5, tone: "ok", range: "75–79%" };
  if (s >= 71)
    return { grade: "B", gpa: 3.15, tone: "ok", range: "71–74%" };
  if (s >= 68)
    return { grade: "B-", gpa: 2.8, tone: "ok", range: "68–70%" };
  if (s >= 61)
    return { grade: "C", gpa: 2.3, tone: "warn", range: "61–67%" };
  if (s >= 50)
    return { grade: "D", gpa: 1.3, tone: "warn", range: "50–60%" };
  return { grade: "F", gpa: 0.0, tone: "bad", range: "< 50%" };
};

// 🔊 Overall status (short message)
const getStatus = (cgpa, hasFail) => {
  if (!cgpa || cgpa <= 0) {
    return { tone: "neutral", label: "Start planning 📚" };
  }
  if (hasFail) {
    return { tone: "bad", label: "Bounce back 💪" };
  }
  if (cgpa >= 3.5) {
    return { tone: "good", label: "On fire 🔥" };
  }
  if (cgpa >= 3.0) {
    return { tone: "good", label: "Great going 🎓" };
  }
  if (cgpa >= 2.5) {
    return { tone: "ok", label: "On track 👍" };
  }
  if (cgpa >= 2.0) {
    return { tone: "warn", label: "Careful edge ⚠️" };
  }
  return { tone: "bad", label: "Needs rescue 🚑" };
};

// Status banner colors (light / dark)
const STATUS_CLASSES = {
  good: {
    light: "bg-emerald-50 border-emerald-200 text-emerald-800",
    dark: "bg-emerald-900/25 border-emerald-500/40 text-emerald-100",
  },
  ok: {
    light: "bg-sky-50 border-sky-200 text-sky-800",
    dark: "bg-sky-900/25 border-sky-500/40 text-sky-100",
  },
  warn: {
    light: "bg-amber-50 border-amber-200 text-amber-800",
    dark: "bg-amber-900/25 border-amber-500/40 text-amber-100",
  },
  bad: {
    light: "bg-rose-50 border-rose-200 text-rose-800",
    dark: "bg-rose-900/25 border-rose-500/40 text-rose-100",
  },
  neutral: {
    light: "bg-slate-50 border-slate-200 text-slate-700",
    dark: "bg-slate-900/40 border-slate-600/60 text-slate-100",
  },
};

// Grade badge colors
const GRADE_BADGE_CLASSES = {
  good: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40",
  ok: "bg-sky-500/10 text-sky-300 border border-sky-500/40",
  warn: "bg-amber-500/10 text-amber-300 border border-amber-500/40",
  bad: "bg-rose-500/10 text-rose-300 border border-rose-500/40",
};

// CGPA Calculator – clean + VU-style grades (A+, A, A-, ...)

const gradeBands = [
  { min: 90, label: "A+", gpa: 4.0, range: "90–100%" },
  { min: 85, label: "A",  gpa: 4.0, range: "85–89%" },
  { min: 80, label: "A-", gpa: 3.8, range: "80–84%" },
  { min: 75, label: "B+", gpa: 3.5, range: "75–79%" },
  { min: 71, label: "B",  gpa: 3.15, range: "71–74%" },
  { min: 68, label: "B-", gpa: 2.8, range: "68–70%" },
  { min: 61, label: "C",  gpa: 2.3, range: "61–67%" },
  { min: 50, label: "D",  gpa: 1.3, range: "50–60%" },
  { min: 0,  label: "F",  gpa: 0.0, range: "< 50%" },
];

const getBandForScore = (score) => {
  const s = Number.isFinite(score) ? score : 0;
  return gradeBands.find((b) => s >= b.min) ?? gradeBands[gradeBands.length - 1];
};

const CGPACalculator = ({ theme, isDark }) => {
  const [subjects, setSubjects] = React.useState([
    { name: "CS101", credits: 3, score: 0 },
  ]);
    const [studentName, setStudentName] = React.useState("");
  const [studentId, setStudentId] = React.useState("");
  const [program, setProgram] = React.useState("BS (Computer Science)");
  const [semester, setSemester] = React.useState("");

  // 🔹 Subject change helper (clamps values)
  const handleSubjectChange = (index, field, rawValue) => {
    setSubjects((prev) =>
      prev.map((sub, i) => {
        if (i !== index) return sub;
        const updated = { ...sub };

        if (field === "name") {
          updated.name = rawValue;
        } else if (field === "credits") {
          let v = parseInt(rawValue, 10);
          if (isNaN(v)) v = 0;
          v = Math.max(1, Math.min(3, v)); // 1–3 credits
          updated.credits = v;
        } else if (field === "score") {
          let v = parseInt(rawValue, 10);
          if (isNaN(v)) v = 0;
          v = Math.max(0, Math.min(100, v)); // 0–100 marks
          updated.score = v;
        }

        return updated;
      })
    );
  };

  const addSubject = () => {
    setSubjects((prev) => [
      ...prev,
      { name: "", credits: 3, score: 0 },
    ]);
  };

  const removeSubject = (index) => {
    setSubjects((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
    );
  };

  const handlePrint = () => {
    if (!studentName || !studentId) {
      alert("Please enter your Name and Student ID first.");
      return;
    }
    if (!subjects || subjects.length === 0) {
      alert("Please add at least one subject.");
      return;
    }
    window.print();
  };

  // 🔹 Overall CGPA / percentage / credits
  const { overallGPA, overallPercent, totalCredits, failedCount } =
    React.useMemo(() => {
      let creditSum = 0;
      let gpaWeighted = 0;
      let percentWeighted = 0;
      let fails = 0;

      subjects.forEach((sub) => {
        const c = Number(sub.credits) || 0;
        const s = Number(sub.score) || 0;
        if (c <= 0) return;

        const band = getBandForScore(s);
        creditSum += c;
        gpaWeighted += band.gpa * c;
        percentWeighted += s * c;
        if (band.label === "F") fails += 1;
      });

      const gpa =
        creditSum > 0 ? parseFloat((gpaWeighted / creditSum).toFixed(2)) : 0;
      const perc =
        creditSum > 0 ? parseFloat((percentWeighted / creditSum).toFixed(1)) : 0;

      return {
        overallGPA: gpa,
        overallPercent: perc,
        totalCredits: creditSum,
        failedCount: fails,
      };
    }, [subjects]);

  // 🔹 Short result message (top center)
  let resultTitle = "Start planning 📚";
  let resultSub = "Add your courses to see CGPA and percentage.";

  if (totalCredits > 0) {
    if (overallGPA >= 3.3 && failedCount === 0) {
      resultTitle = "Great going 🎓";
      resultSub = "Strong CGPA – keep this momentum for distinction!";
    } else if (overallGPA >= 2.5 && failedCount === 0) {
      resultTitle = "On track ✨";
      resultSub =
        "Decent performance – a little more effort and you’ll shine.";
    } else if (failedCount === 0) {
      resultTitle = "Keep pushing 💪";
      resultSub =
        "You’re passing – focus on weak areas for a better CGPA.";
    } else {
      resultTitle = "Stay hopeful 💡";
      resultSub =
        "Some courses are below passing range. Fix weak spots and plan a fresh attempt.";
    }
  }

  const infoCardBase =
    "rounded-2xl p-5 flex flex-col justify-between border";
  const infoCardBg = isDark
    ? "bg-slate-900/70 border-slate-700"
    : "bg-white border-slate-200";

  const inputBase =
    "rounded-xl px-3 py-2 text-sm outline-none border transition-colors";
  const inputBg = isDark
    ? "bg-slate-900/70 border-slate-700 text-slate-100 placeholder:text-slate-500"
    : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400";

  const chipBg = isDark
    ? "bg-slate-900/70 border-slate-700 text-slate-100"
    : "bg-white border-slate-300 text-slate-900";

  return (
    <section className="space-y-8">
      {/* 🔹 SCREEN ONLY – full CGPA UI */}
      <div className="space-y-8 print:hidden">
        {/* 🔹 Top result message */}
        <div
          className={`max-w-3xl mx-auto text-center rounded-2xl px-5 py-4 ${
            isDark
              ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-200"
              : "bg-emerald-50 border border-emerald-200 text-emerald-800"
          }`}
        >
          <h2 className="text-sm md:text-base font-semibold">
            {resultTitle}
          </h2>
          <p className="text-xs md:text-sm mt-1 opacity-80">
            {resultSub}
          </p>
        </div>

        {/* 🔹 Intro text */}
        <p className={`text-xs md:text-sm ${theme.textMuted}`}>
          Add all subjects with credit hours and marks (0–100). We approximate
          CGPA on a 4.0 scale using VU-style letter grades. Always confirm with
          your official grade book.
        </p>

        {/* 🔹 Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className={`${infoCardBase} ${infoCardBg}`}>
            <div>
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                CGPA (approx)
              </p>
              <p className="mt-2 text-3xl font-bold text-emerald-400">
                {overallGPA.toFixed(2)}
              </p>
            </div>
            <p className={`mt-3 text-xs ${theme.textMuted}`}>
              out of 4.00 — weighted average of all subject grade points.
            </p>
          </div>

          <div className={`${infoCardBase} ${infoCardBg}`}>
            <div>
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">
                Overall percentage
              </p>
              <p className="mt-2 text-3xl font-bold text-indigo-400">
                {overallPercent.toFixed(1)}%
              </p>
            </div>
            <p className={`mt-3 text-xs ${theme.textMuted}`}>
              Credit-weighted average of all subject marks.
            </p>
          </div>

          <div className={`${infoCardBase} ${infoCardBg}`}>
            <div>
              <p className="text-xs font-semibold text-sky-400 uppercase tracking-wide">
                Total credits
              </p>
              <p className="mt-2 text-3xl font-bold text-sky-400">
                {totalCredits}
              </p>
            </div>
            <p className={`mt-3 text-xs ${theme.textMuted}`}>
              Sum of all entered credit hours.
            </p>
          </div>
        </div>

                {/* 🔹 Student details + Print button */}
        <div
          className={`max-w-3xl mx-auto rounded-2xl px-4 py-3 mt-2 ${
            isDark
              ? "bg-slate-900/70 border border-slate-800"
              : "bg-white border border-slate-200"
          }`}
        >
          {/* Top row: basic info */}
          <div className="grid gap-3 md:grid-cols-4">
            {/* Name */}
            <div>
              <label className="block text-[11px] font-medium mb-1">
                Student Name
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter name"
                className={`${inputBase} ${inputBg} w-full py-1.5 text-xs`}
              />
            </div>

            {/* ID */}
            <div>
              <label className="block text-[11px] font-medium mb-1">
                Student ID
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. BC230123456"
                className={`${inputBase} ${inputBg} w-full py-1.5 text-xs`}
              />
            </div>

            {/* Program */}
            <div>
              <label className="block text-[11px] font-medium mb-1">
                Program
              </label>
              <input
                type="text"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                placeholder="e.g. BS (Computer Science)"
                className={`${inputBase} ${inputBg} w-full py-1.5 text-xs`}
              />
            </div>

            {/* Semester */}
            <div>
              <label className="block text-[11px] font-medium mb-1">
                Semester
              </label>
              <input
                type="text"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="e.g. 4th / Fall 2025"
                className={`${inputBase} ${inputBg} w-full py-1.5 text-xs`}
              />
            </div>
          </div>

          {/* Bottom row: Print button */}
          <div className="mt-3 flex md:justify-end">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors w-full md:w-auto justify-center"
            >
              Print Result
            </button>
          </div>
        </div>

        {/* 🔹 Subjects table */}
        <div
          className={`${
            isDark ? "bg-slate-900/70" : "bg-white"
          } rounded-2xl border ${
            isDark ? "border-slate-800" : "border-slate-200"
          } overflow-hidden`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40">
            <h3 className="text-sm font-semibold">Subjects / Courses</h3>
            <button
              type="button"
              onClick={addSubject}
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <span className="text-lg leading-none">＋</span>
              Add subject
            </button>
          </div>

          {/* Subjects table – single row per subject, all devices */}
          <div className="px-4 py-4 space-y-3">
            {/* Header row */}
            <div
              className={`
                grid
                grid-cols-[0.3fr_1.4fr_0.7fr_0.8fr_1.6fr_auto]
                gap-2
                text-[10px]
                sm:text-[11px]
                uppercase
                tracking-wide
                ${isDark ? "text-slate-300" : "text-slate-700"}
              `}
            >
              <span className="text-center">#</span>
              <span>Course / Subject</span>
              <span className="text-center">Credit hours</span>
              <span className="text-center">Score (0–100)</span>
              <span className="text-center">Grade / GPA / %</span>
              <span className="text-right">Remove</span>
            </div>

            {subjects.map((sub, idx) => {
              const band = getBandForScore(sub.score);
              const isFail = band.label === "F";

              const gradeColor = isFail
                ? isDark
                  ? "border-rose-500/60 bg-rose-500/10 text-rose-200"
                  : "border-rose-500 bg-rose-50 text-rose-700"
                : band.gpa >= 3.5
                ? isDark
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                  : "border-emerald-500 bg-emerald-50 text-emerald-700"
                : band.gpa >= 2.3
                ? isDark
                  ? "border-sky-500/60 bg-sky-500/10 text-sky-200"
                  : "border-sky-500 bg-sky-50 text-sky-700"
                : isDark
                ? "border-amber-500/60 bg-amber-500/10 text-amber-200"
                : "border-amber-500 bg-amber-50 text-amber-700";

              return (
                <div
                  key={idx}
                  className="
                    grid
                    grid-cols-[0.3fr_1.4fr_0.7fr_0.8fr_1.6fr_auto]
                    gap-2
                    items-center
                    text-[10px]
                    sm:text-xs
                    md:text-sm
                  "
                >
                  {/* Row number */}
                  <div className="min-w-0 flex justify-center">
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] sm:text-xs ${
                        isDark
                          ? "bg-slate-800/70 text-slate-100"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </div>

                  {/* Course / Subject */}
                  <div className="min-w-0">
                    <input
                      type="text"
                      value={sub.name}
                      onChange={(e) =>
                        handleSubjectChange(idx, "name", e.target.value)
                      }
                      className={`${inputBase} ${inputBg} w-full py-1.5 text-xs sm:text-sm`}
                      placeholder="CS101"
                    />
                  </div>

                  {/* Credit hours */}
                  <div className="min-w-0">
                    <input
                      type="number"
                      min={1}
                      max={3}
                      step={1}
                      value={sub.credits}
                      onChange={(e) =>
                        handleSubjectChange(idx, "credits", e.target.value)
                      }
                      className={`${inputBase} ${inputBg} w-full py-1.5 text-center text-xs sm:text-sm`}
                    />
                  </div>

                  {/* Score */}
                  <div className="min-w-0">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={sub.score}
                      onChange={(e) =>
                        handleSubjectChange(idx, "score", e.target.value)
                      }
                      className={`${inputBase} ${inputBg} w-full py-1.5 text-center text-xs sm:text-sm`}
                    />
                  </div>

                  {/* Grade / GPA / % chips */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center justify-center gap-1">
                      {/* Grade */}
                      <div
                        className={`px-2 py-0.5 rounded-md border text-[9px] ${gradeColor}`}
                      >
                        <span className="font-semibold">Grade {band.label}</span>
                      </div>

                      {/* Exact GPA for this subject */}
                      <div
                        className={`px-2 py-0.5 rounded-md border text-[9px] ${gradeColor}`}
                      >
                        <span>GPA {band.gpa.toFixed(2)}</span>
                      </div>

                      {/* Exact percentage (entered marks) */}
                      <div
                        className={`px-2 py-0.5 rounded-md border text-[9px] ${gradeColor}`}
                      >
                        <span>{(Number(sub.score) || 0).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Remove button */}
                  <div className="min-w-0 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeSubject(idx)}
                      className="text-[10px] sm:text-[11px] text-rose-400 hover:text-rose-500 flex items-center gap-1 whitespace-nowrap"
                    >
                      <span>✕</span>
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom tip */}
          <div
            className={`px-4 py-3 text-[11px] border-t ${
              isDark
                ? "border-slate-800 text-slate-500"
                : "border-slate-200 text-slate-500"
            }`}
          >
            Tip: This tool is only an estimate. Universities (including VU) may
            use slightly different mappings for letter grades and CGPA. Always
            rely on your official transcript / grade book for final results.
          </div>
        </div>
      </div>

      {/* 🔹 PRINT ONLY – VU style marksheet */}
      <div
  id="cgpa-print-sheet"
  className="print-only"
>
  <div className="max-w-3xl mx-auto my-4 bg-white text-black border border-black p-6">
          {/* Header */}
          <div className="text-center mb-4 border-b border-black pb-3">
            <h1 className="text-lg font-extrabold tracking-wide">
              VIRTUAL UNIVERSITY OF PAKISTAN
            </h1>
            <p className="text-xs mt-1">
              Unofficial CGPA / Result Summary (Generated via EduNexus)
            </p>
          </div>

                    {/* Student info */}
          <div className="text-xs mb-4 space-y-1">
            <div className="flex justify-between">
              <span className="font-semibold">Student Name:</span>
              <span>{studentName || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Student ID:</span>
              <span>{studentId || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Program:</span>
              <span>{program || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Semester:</span>
              <span>{semester || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Date:</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {/* Overall summary */}
          <div className="grid grid-cols-3 gap-3 text-xs mb-4">
            <div className="border border-black py-2 px-3 text-center">
              <p className="font-semibold">CGPA (approx)</p>
              <p className="text-xl font-extrabold mt-1">
                {overallGPA.toFixed(2)}
              </p>
            </div>
            <div className="border border-black py-2 px-3 text-center">
              <p className="font-semibold">Percentage</p>
              <p className="text-xl font-extrabold mt-1">
                {overallPercent.toFixed(1)}%
              </p>
            </div>
            <div className="border border-black py-2 px-3 text-center">
              <p className="font-semibold">Total Credits</p>
              <p className="text-xl font-extrabold mt-1">
                {totalCredits}
              </p>
            </div>
          </div>

          {/* Subjects table (print style) */}
          <table className="w-full text-[10px] border border-black border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-black px-1 py-1 text-left">#</th>
                <th className="border border-black px-1 py-1 text-left">
                  Course / Subject
                </th>
                <th className="border border-black px-1 py-1 text-center">
                  Credit Hrs
                </th>
                <th className="border border-black px-1 py-1 text-center">
                  Score
                </th>
                <th className="border border-black px-1 py-1 text-center">
                  Grade
                </th>
                <th className="border border-black px-1 py-1 text-center">
                  GPA
                </th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((sub, idx) => {
                const band = getBandForScore(sub.score);
                return (
                  <tr key={idx}>
                    <td className="border border-black px-1 py-1 text-center">
                      {idx + 1}
                    </td>
                    <td className="border border-black px-1 py-1">
                      {sub.name || "-"}
                    </td>
                    <td className="border border-black px-1 py-1 text-center">
                      {sub.credits}
                    </td>
                    <td className="border border-black px-1 py-1 text-center">
                      {sub.score}
                    </td>
                    <td className="border border-black px-1 py-1 text-center">
                      {band.label}
                    </td>
                    <td className="border border-black px-1 py-1 text-center">
                      {band.gpa.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Signature area */}
          <div className="mt-8 flex justify-between text-[10px]">
            <div>
              <p>__________________________</p>
              <p className="mt-1">Student Signature</p>
            </div>
            <div className="text-right">
              <p>__________________________</p>
              <p className="mt-1">System Generated (EduNexus)</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// 🔆 Floating theme toggle – copy this full component
const ThemeFloatingToggle = ({ isDark, setIsDark }) => {
  const handleToggle = () => setIsDark(!isDark);

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`
        fixed 
        top-[88px]    /* Navbar ke thoda neeche */
        right-4
        z-[60]        /* mobile menu se upar */
        inline-flex items-center justify-center
        h-10 w-10 rounded-full shadow-lg border
        transition-all duration-200
        ${isDark
          ? "bg-amber-400/10 border-amber-300/40 text-amber-200 hover:bg-amber-400/20"
          : "bg-slate-900 text-amber-300 border-slate-900 hover:bg-slate-800"
        }
      `}
      aria-label="Toggle dark / light mode"
    >
      {isDark ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
};
// =================== TOAST COMPONENT ===================
// ⚠️ MUST BE ABOVE function App()

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-indigo-600",
  };

  return (
    <div className={`fixed top-4 right-4 z-[100] ${colors[type] || colors.info} text-white px-6 py-3 rounded-xl flex items-center gap-3`}>
      <span className="font-bold text-sm">{message}</span>
      <button onClick={onClose}>✖</button>
    </div>
  );
};

// ===== Static Pages: Privacy & Terms (simple text, Adsense safe) =====

const PrivacyPage = ({ theme }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
      <h1 className={`text-3xl font-extrabold ${theme.text}`}>Privacy Policy</h1>
      <p className={theme.textMuted}>
        EduNexus is an independent study platform made for students. We do not sell your
        personal information.
      </p>
      <p className={theme.text}>
        We only collect basic usage data to keep the website secure, improve features and
        fix bugs. Some pages may show Google AdSense ads to support free study resources.
        Google may use cookies and similar technologies to show relevant adverts. You can
        manage ad personalisation in your Google account settings.
      </p>
      <p className={theme.text}>
        If you upload files or write posts, they are stored securely in our database and
        are used only to provide EduNexus features (notes, discussions, etc.).
      </p>
      <p className={theme.text}>
        For any privacy questions, you can always contact us at{" "}
        <span className="font-semibold">support@edunexus.app</span>.
      </p>
    </div>
  );
};

const TermsPage = ({ theme }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
      <h1 className={`text-3xl font-extrabold ${theme.text}`}>Terms of Service</h1>
      <p className={theme.textMuted}>
        Please read these terms carefully before using EduNexus.
      </p>
      <p className={theme.text}>
        EduNexus is a study helper created for Virtual University and online students.
        This website is <span className="font-semibold">not officially affiliated</span>{" "}
        with Virtual University (VU). All study material is shared only for learning
        purposes.
      </p>
      <p className={theme.text}>
        You agree not to upload copyrighted material without permission, not to share
        login credentials, and not to use EduNexus for cheating in exams or assignments.
      </p>
      <p className={theme.text}>
        We try our best to keep content accurate, but we do not give any guarantee of
        100% correctness. Use the material at your own responsibility.
      </p>
      <p className={theme.text}>
        By continuing to use EduNexus you accept these terms. If you do not agree, please
        stop using the website.
      </p>
    </div>
  );
};


// Main App
const App = () => {
  const [page, setPage] = useState('home');
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [footerClicks, setFooterClicks] = useState(0);
  const [toast, setToast] = useState(null);
  const { isDark, setIsDark, theme } = useTheme();
  const currentYear = new Date().getFullYear();

  /// ✅ saare pages ki list (routing + URL ke liye)
const PAGES = [
  'home',
  'academic',
  'articles',
  'aiquiz',
  'flashcards',
  'planner',
  'cgpa',
  'forum',
  'portfolio',
  'about',
  'contact',
   "privacy",   // ✅ NEW
  "terms",  
  'admin',
];

// Navbar items agar kahin aur chahiye hon to isi list ko reuse karein
const NAV_ITEMS = PAGES;


  // ✅ NEW: page-wise SEO titles
  const PAGE_TITLES = {
    home: 'EduNexus – Study Material, Mock Tests & AI Tools',
    articles: "EduNexus Articles & Guides – Virtual University Study Tips",
    academic: "VU Notes, Handouts & Past Papers – EduNexus Academic Hub",
    planner: "Study Planner – Create AI Study Plan | EduNexus",
    flashcards: "AI Flashcards – Learn VU Subjects Fast | EduNexus",
    forum: "Discussion Forum – Ask Virtual University Questions | EduNexus",
    aiquiz: "AI Quiz Generator – Virtual University MCQs Practice | EduNexus",
    cgpa: "CGPA & GPA Calculator – Virtual University | EduNexus",
    portfolio: "Asad Amanat Ali – Software Engineer Portfolio | EduNexus",
    about: "About EduNexus – Independent Virtual University Study Hub",
    contact: "Contact EduNexus – Support for VU Students",
    privacy: "Privacy Policy - EduNexus",
  terms: "Terms of Service - EduNexus",
    admin: "EduNexus Admin Panel"
  };

  // ✅ NEW: page-wise meta descriptions
  const PAGE_DESCRIPTIONS = {
    home: "EduNexus is a smart study hub for Virtual University (VU) students. Access VU notes, handouts, past papers, quizzes, mock tests, CGPA calculator and AI study tools in one place.",
    articles: "Read official EduNexus articles: exam tips, VU updates, technical guides and student success stories for Virtual University students.",
    academic: "Download Virtual University notes, handouts, files and past papers for CS101, MTH101, ENG101, PHY101 and many more VU subjects.",
    planner: "Generate a personalized study plan with AI based on your Virtual University subjects, uploaded files and available study hours.",
    flashcards: "Create interactive AI flashcards for any topic and revise Virtual University subjects quickly and effectively with EduNexus.",
    forum: "Ask questions, discuss assignments and get admin replies in the EduNexus discussion forum designed for Virtual University students.",
    aiquiz: "Generate MCQ quizzes with AI from your text or files and practice like real Virtual University exams with instant feedback.",
    cgpa: "Calculate your CGPA and GPA using VU-style grading. Track your academic performance with the EduNexus CGPA calculator.",
    portfolio: "View the developer portfolio of Asad Amanat Ali, creator of EduNexus and AI powered learning tools for Virtual University students.",
    about: "Learn what EduNexus is, how it helps Virtual University students and why it is an independent, student-focused study hub.",
    contact: "Need help with notes, quizzes, AI tools or portal issues? Contact the EduNexus support team using this page.",
    privacy: "Read how EduNexus handles your data, cookies and Google AdSense usage.",
  terms: "Read the terms and conditions for using EduNexus study tools.",
    admin: "Admin area of EduNexus to manage highlights, files, announcements, articles and other study resources."
  };
  // ✅ Update <title> + <meta description> on page change
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  const title = PAGE_TITLES[page] || PAGE_TITLES.home;
  document.title = title;

  const metaDesc = document.querySelector("meta[name='description']");
  if (metaDesc) {
    metaDesc.setAttribute(
      "content",
      PAGE_DESCRIPTIONS[page] || PAGE_DESCRIPTIONS.home
    );
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}, [page]);

    // ✅ central navigation function (har jagah isi ko use karna hai)
  const navigate = (targetPage) => {
    if (!PAGES.includes(targetPage)) targetPage = 'home';

    setPage(targetPage);
    setIsMenuOpen(false); // mobile menu close

    // 🔹 base path (normally "/")
    const basePath = window.location.pathname || '/';

    // 🔹 URL me ab hash nahi hoga:
    // home => "/" , baaki => "/?page=cgpa" etc.
    const newUrl =
      targetPage === 'home'
        ? basePath
        : `${basePath}?page=${targetPage}`;

    // browser history me page push karo → back button work karega
    window.history.pushState(
      { page: targetPage },
      '',
      newUrl
    );
  };

  // ✅ back button & direct link (clean URL: /?page=cgpa) handle
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('page') || '';

  const initialPage = PAGES.includes(fromQuery) ? fromQuery : 'home';
  setPage(initialPage);

  const basePath = window.location.pathname || '/';
  const initialUrl =
    initialPage === 'home'
      ? basePath
      : `${basePath}?page=${initialPage}`;

  window.history.replaceState(
    { page: initialPage },
    '',
    initialUrl
  );
}, []);


  // ✅ auth wala effect
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, u => {
      setUser(u);
      if (u?.email === ADMIN_EMAIL) setIsAdminMode(true);
    });
  }, []);

  // ✅ GA4 page view tracking – har page change par event
  useEffect(() => {
    if (window.gtag) {
      window.gtag("event", "page_view", {
        page_path: window.location.pathname + window.location.hash,
      });
    }
  }, [page]);

  const showToast = (message, type = 'info') => setToast({ message, type });

  const handleFooterClick = () => {
  setFooterClicks((prev) => {
    const next = prev + 1;
    if (next >= 5) {
      setShowAdminLogin(true);
      return 0;
    }
    return next;
  });
};

useEffect(() => {
  if (!footerClicks) return;
  const t = setTimeout(() => setFooterClicks(0), 5000);
  return () => clearTimeout(t);
}, [footerClicks]);



  const handleLogoutAdmin = () => {
    setIsAdminMode(false);
    navigate('home');
    showToast("Admin Session Ended", "info");
  };

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300 font-sans flex flex-col`}>
      <style>{customStyles}</style>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <Navbar
  page={page}
  setPage={navigate}
  user={user}
  isAdmin={isAdminMode}
  theme={theme}
  toggleMenu={() => setIsMenuOpen(!isMenuOpen)}
  isMenuOpen={isMenuOpen}
/>

      {/* 🔆 Global theme toggle – top right, har page par */}
    <ThemeFloatingToggle isDark={isDark} setIsDark={setIsDark} />

        {/* <Announcements user={user} /> */}

  <main className="max-w-7xl mx-auto px-4 py-8 pb-24 w-full flex-grow">

        {page === 'home' && (
          <HomePage
            setPage={navigate}
            theme={theme}
            showToast={showToast}
            user={user}
          />
        )}
        {page === 'academic' && (
          <AcademicHub
            user={user}
            isAdmin={isAdminMode}
            theme={theme}
            showToast={showToast}
          />
        )}
        {page === 'exam' && <ExamPrep theme={theme} />}
        {page === 'aiquiz' && (
          <QuizGenerator
            theme={theme}
            user={user}
            showToast={showToast}
          />
        )}
        {page === 'cgpa' && (
        <CGPACalculator theme={theme} isDark={isDark} />
      )}

           {page === 'flashcards' && (
          <FlashcardGenerator
            theme={theme}
            showToast={showToast}
          />
        )}
        {page === 'planner' && (
          <StudyPlanner
            theme={theme}
            showToast={showToast}
          />
        )}
        {page === 'portfolio' && (
          <Portfolio
            user={user}
            isAdmin={isAdminMode}
            theme={theme}
          />
        )}
        {page === 'forum' && (
          <Forum
            user={user}
            isAdmin={isAdminMode}
            theme={theme}
            showToast={showToast}
          />
        )}
        {page === 'articles' && (
          <ArticlesPage
            user={user}
            isAdmin={isAdminMode}
            theme={theme}
            showToast={showToast}
          />
        )}
        {page === 'about' && <AboutUs theme={theme} />}
        {page === 'contact' && <ContactUs theme={theme} />}
          {/* ✅ NEW STATIC PAGES */}
        {page === 'privacy' && <PrivacyPage theme={theme} />}
        {page === 'terms' && <TermsPage theme={theme} />}
        {page === 'admin' && isAdminMode && (
          <AdminPanel
            theme={theme}
            user={user}
            showToast={showToast}
          />
        )}
      </main>

      <FloatingAIChat theme={theme} />

           <footer
  className={`mt-auto border-t ${theme.border} ${
    isDark ? "bg-slate-950/95" : "bg-slate-50"
  }`}
>
  <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
    {/* Top strip / CTA */}
    <div
      className={`rounded-2xl px-5 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        isDark ? "bg-indigo-500/15" : "bg-indigo-50"
      } border border-indigo-500/30`}
    >
      <div className="space-y-1">
        <p className={`text-sm font-semibold ${theme.text}`}>
          Study updates & bug report?
        </p>
        <p className={`text-xs md:text-sm ${theme.textMuted}`}>
          If you find any issue in notes, quizzes or AI tools, just email us –
          we improve EduNexus continuously so Google AdSense & students both
          stay happy. 🙂
        </p>
      </div>
            <a
        href="https://mail.google.com/mail/u/0/?view=cm&fs=1&to=a.m.a63425@gmail.com&su=EduNexus%20Support%20Request"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
      >
        <Mail size={16} />
        Contact Support
      </a>



    </div>

    {/* Main footer grid */}
    <div
      className={`grid gap-8 md:grid-cols-4 ${
        isDark ? "text-slate-200" : "text-slate-800"
      }`}
    >
      {/* Brand / description */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-xl text-white">
            <Cpu size={18} />
          </div>
          <span className="font-bold text-lg">EduNexus</span>
        </div>
        <p className={`text-sm leading-relaxed ${theme.textMuted}`}>
          Smart study hub for Virtual University students  notes, quizzes,
          files, and AI tools in one place. EduNexus is an independent platform
          and is <span className="font-semibold">not officially affiliated</span> with VU.
        </p>

        {/* Socials */}
        <div className="flex items-center gap-3 pt-2">
          <a
            href="https://github.com/Asad2327"
            target="_blank"
            rel="noreferrer"
            className="h-9 w-9 rounded-full border border-slate-500/40 flex items-center justify-center hover:bg-slate-700/40 hover:text-white transition-colors"
          >
            <Github size={16} />
          </a>
          <a
            href="https://www.linkedin.com"
            target="_blank"
            rel="noreferrer"
            className="h-9 w-9 rounded-full border border-slate-500/40 flex items-center justify-center hover:bg-slate-700/40 hover:text-white transition-colors"
          >
            <Linkedin size={16} />
          </a>
        </div>
      </div>
      
      {/* Quick links */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold tracking-wide">Quick Links</h3>
        <ul className="space-y-2 text-sm">
          <li>
            <button
              onClick={() => navigate("home")}
              className="hover:text-indigo-500 transition-colors"
            >
              Home
            </button>
          </li>
          <li>
            <button
              onClick={() => navigate("academic")}
              className="hover:text-indigo-500 transition-colors"
            >
              Academic Hub
            </button>
          </li>
          <li>
            <button
              onClick={() => navigate("articles")}
              className="hover:text-indigo-500 transition-colors"
            >
              Articles
            </button>
          </li>
            <li>
          <button
            onClick={() => navigate("cgpa")}
            className="hover:text-indigo-500 transition-colors"
          >
            CGPA Calculator
          </button>
        </li>

        </ul>
      </div>

      {/* Study tools */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold tracking-wide">Study Tools</h3>
        <ul className="space-y-2 text-sm">
          <li>
            <button
              onClick={() => navigate("flashcards")}
              className="hover:text-indigo-500 transition-colors"
            >
              AI Flashcards
            </button>
          </li>
          <li>
            <button
              onClick={() => navigate("planner")}
              className="hover:text-indigo-500 transition-colors"
            >
              Study Planner
            </button>
          </li>
          <li>
            <button
              onClick={() => navigate("aiquiz")}
              className="hover:text-indigo-500 transition-colors"
            >
              AI Quiz Generator
            </button>
          </li>
        </ul>
      </div>

      {/* Contact + AdSense note */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold tracking-wide">
          Contact & Support
        </h3>
        <div className="space-y-2 text-sm">
          <p className="flex items-center gap-2">
            <Mail size={14} />
          <a
          href="https://mail.google.com/mail/u/0/?view=cm&fs=1&to=a.m.a63425@gmail.com&su=EduNexus%20Support%20Request"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-indigo-500 transition-colors"
        >
          support@edunexus.app
        </a>

          </p>
          <p className="flex items-center gap-2">
            <HelpCircle size={14} />
            <span>For study help only (no official VU support).</span>
          </p>
        </div>
        <p className={`text-xs ${theme.textMuted} leading-relaxed pt-2`}>
          This site may display Google AdSense ads to support free study
          resources. We avoid deceptive placements, misleading clicks, and
          auto-downloads to stay compliant with Google policies.
        </p>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="border-t border-slate-700/40 pt-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
      {/* 🔐 Secret admin trigger area */}
      <p
        className={`cursor-pointer select-none transition-colors ${
          theme.textMuted
        } hover:text-indigo-500`}
        onClick={handleFooterClick}
      >
          © {currentYear} EduNexus · Developed by Asad Amanat Ali.
      </p>

            <div className="flex flex-wrap items-center gap-4">
        {isAdminMode && (
          <button
            onClick={handleLogoutAdmin}
            className="text-red-500 font-semibold flex items-center gap-1 hover:underline"
          >
            <LogOut size={12} /> Exit Admin
          </button>
        )}

        {/* ✅ Footer links now navigate to pages */}
        <button
          type="button"
          onClick={() => navigate('privacy')}
          className={`${theme.textMuted} hover:text-indigo-500`}
        >
          Privacy Policy
        </button>

        <button
          type="button"
          onClick={() => navigate('terms')}
          className={`${theme.textMuted} hover:text-indigo-500`}
        >
          Terms of Service
        </button>

        <span className={`${theme.textMuted}`}>
          Made for students · Light & Dark mode supported
        </span>
      </div>

        </div>
        </div>
        </footer>

      {showAdminLogin && (
        <AdminLogin
          onClose={() => setShowAdminLogin(false)}
          setPage={navigate}
          setIsAdminMode={setIsAdminMode}
          showToast={showToast}
        />
      )}
    </div>
  );
};

export default App;
