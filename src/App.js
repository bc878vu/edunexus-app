import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, BookOpen, MessageSquare, Briefcase, User, LogOut, LogIn, Menu,
  X, Send, Search, Download, Upload, ExternalLink, Sparkles, Heart, Share2, 
  CheckCircle, Database, Code, Cpu, GraduationCap, Shield, FileText,
  Bell, Trash2, Edit3, Edit, Github, Linkedin, Mail, Phone, Lightbulb, Brain, 
  CheckSquare, MessageCircle, XCircle, PlayCircle, Folder, ChevronRight, 
  Lock, AlertCircle, File, Bot, Zap, Sun, Moon, ThumbsUp, 
  MessageCircle as CommentIcon, Megaphone, Star, Trophy, Info, MapPin,
  HelpCircle, FileOutput, UserPlus, Quote, Target, Camera, Newspaper, 
  Calendar, Plus, FolderPlus, Inbox, XOctagon, Loader, Layers, Volume2, 
  StopCircle, ArrowRight, ArrowLeft, Activity, LayoutDashboard, 
  Image as ImageIcon, Clock, Save, RefreshCw, ToggleLeft, ToggleRight, 
   Eye, EyeOff, Move, Maximize2,  Copy, FileDown
  } from 'lucide-react';

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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "edunexus-live"; // Static App ID for your live site
const apiKey = "AIzaSyDNufOZFcW0cV1hsQ_nb5fAsHT8b4RUrmY"; // Add your Gemini API Key here if you have one, otherwise leave empty

// --- Constants ---
const WHATSAPP_LINK = "https://chat.whatsapp.com/D6KjNsaW4aK0dMnxzodSYW";
const ADMIN_EMAIL = "admin@edunexus.com";
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
// ✅ BACKEND BASED GEMINI CALL (SAFE)
const callGemini = async (prompt) => {
  try {
    const res = await fetch("http://localhost:5000/api/gemini", {
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
  const [isDark, setIsDark] = useState(true);
  const themeClass = {
    bg: isDark ? 'bg-slate-950' : 'bg-slate-50',
    card: isDark ? 'bg-slate-900' : 'bg-white',
    text: isDark ? 'text-slate-200' : 'text-slate-800',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
    border: isDark ? 'border-slate-800' : 'border-slate-200',
    input: isDark ? 'bg-slate-950 border border-slate-700 focus:border-indigo-500 text-white placeholder-slate-400' : 'bg-white border border-slate-300 focus:border-indigo-500 text-slate-900 placeholder-slate-500',
    nav: isDark ? 'bg-slate-950/95' : 'bg-white/95',
    accent: 'text-indigo-500',
    accentBg: 'bg-indigo-600',
    chatInput: isDark ? 'bg-slate-800 text-white placeholder-slate-400' : 'bg-slate-100 text-slate-900 placeholder-slate-500'
  };
  return { isDark, setIsDark, theme: themeClass };
};

// --- Components ---

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000); 
    return () => clearTimeout(timer);
  }, [onClose]);
  
  const bgColors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-indigo-600' };
  
  return (
    <div className={`fixed top-4 right-4 z-[100] ${bgColors[type] || bgColors.info} text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-down`}>
      {type === 'success' ? <CheckCircle size={20}/> : type === 'error' ? <AlertCircle size={20}/> : <Info size={20}/>}
      <span className="font-bold text-sm">{String(message)}</span>
      <button onClick={onClose}><X size={16} className="opacity-80 hover:opacity-100"/></button>
    </div>
  );
};

// 1. Navbar
const Navbar = ({ page, setPage, user, isAdmin, isDark, setIsDark, theme, toggleMenu, isMenuOpen }) => {
  const items = [
    {id: 'home', label: 'Home', icon: Home},
    {id: 'articles', label: 'Articles', icon: Newspaper},
    {id: 'academic', label: 'Academic Hub', icon: Folder},
    {id: 'planner', label: 'Study Planner', icon: Calendar},
    {id: 'flashcards', label: 'Flashcards', icon: Layers},
    {id: 'forum', label: 'Discussion', icon: MessageSquare},
    {id: 'aiquiz', label: 'AI Quiz', icon: Brain},
    {id: 'portfolio', label: 'Portfolio', icon: User},
    {id: 'about', label: 'About', icon: Info},
    {id: 'contact', label: 'Contact', icon: Mail},
    ...(isAdmin ? [{id: 'admin', label: 'Admin Panel', icon: Shield}] : [])
  ];

  return (
    <nav className={`${theme.nav} backdrop-blur-md border-b ${theme.border} sticky top-0 z-40 transition-colors shadow-sm`}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={()=>setPage('home')}>
          <div className="bg-indigo-600 p-1.5 rounded-lg"><Cpu className="text-white h-5 w-5" /></div>
          <span className={`font-bold text-xl ${theme.text}`}>EduNexus</span>
        </div>
        <div className="hidden xl:flex items-center gap-1 mx-4">
          {items.map(i => (
            <button key={i.id} onClick={()=>setPage(i.id)} className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${page===i.id ? 'bg-indigo-600 text-white' : `${theme.textMuted} hover:${theme.text} hover:bg-slate-100 dark:hover:bg-slate-800`}`}>
              <i.icon size={16}/> {i.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={()=>setIsDark(!isDark)} className={`p-2 rounded-full ${theme.text} hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors`}>
            {isDark ? <Sun size={18}/> : <Moon size={18}/>}
          </button>
          {isAdmin && <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold animate-pulse">ADMIN MODE</span>}
          <button className="xl:hidden" onClick={toggleMenu}><Menu className={theme.text}/></button>
        </div>
      </div>
      {isMenuOpen && (
        <div className={`xl:hidden p-4 border-t ${theme.border} ${theme.bg} animate-slide-down`}>
          <div className="grid grid-cols-2 gap-2">
            {items.map(i => (
              <button key={i.id} onClick={()=>{setPage(i.id);toggleMenu()}} className={`text-left p-3 ${theme.card} rounded-lg border ${theme.border} ${theme.text} flex items-center gap-3 active:scale-95 transition-transform`}>
                <i.icon size={16} className="text-indigo-500"/> <span className="text-sm font-bold">{i.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

// 2. Announcements
const Announcements = ({ user }) => {
  const [news, setNews] = useState([]);
  
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, s => setNews(s.docs.map(d => d.data())), err => console.log("Announcements sync skipped"));
    return () => unsubscribe();
  }, [user]);

  if (news.length === 0) return null;
  
  return (
    <div className="bg-indigo-600 text-white text-xs font-bold py-2 overflow-hidden whitespace-nowrap relative z-30">
      <div className="inline-block animate-marquee pl-[100vw]">
        {news.map((n, i) => <span key={i} className="mx-8 uppercase tracking-wide">📢 {String(n.title)}: {String(n.content)}</span>)}
      </div>
    </div>
  );
};

// 3. Articles
const ArticlesPage = ({ user, isAdmin, theme, showToast }) => {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'articles'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, s => setArticles(s.docs.map(d => ({id: d.id, ...d.data()}))), err => console.log("Articles sync skipped"));
    return () => unsubscribe();
  }, [user]);

  const handleLike = async (art) => {
    if (!user) return;
    if (art.likedBy && art.likedBy.includes(user.uid)) {
      showToast("You have already liked this article.", "info");
      return;
    }
    
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'articles', art.id), { 
      likes: increment(1),
      likedBy: arrayUnion(user.uid)
    });
    showToast("Liked!", "success");
  };

  const handleShare = async (art) => {
    const shareData = {
      title: art.title,
      text: art.content.substring(0, 100) + '...',
      url: window.location.href 
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
        document.execCommand('copy');
        showToast("Article content copied to clipboard!", "success");
      } catch (err) {
        showToast("Failed to copy content", "error");
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className={`text-4xl font-extrabold ${theme.text} mb-2`}>Knowledge Base</h1>
        <p className={theme.textMuted}>Official articles, news, and updates from EduNexus.</p>
      </div>
      <div className="space-y-6">
        {articles.map(art => (
          <div key={art.id} className={`${theme.card} p-8 rounded-2xl border ${theme.border} hover:shadow-lg transition-shadow relative group`}>
            {art.imageUrl && (
              <div className="mb-6 rounded-xl overflow-hidden w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-center">
                <img src={art.imageUrl} alt={art.title} className="w-full h-auto max-h-[600px] object-contain transition-transform duration-500" />
              </div>
            )}
            <div className="flex justify-between items-start mb-2">
              <h2 className={`text-2xl font-bold ${theme.text}`}>{String(art.title)}</h2>
            </div>
            <div className={`flex items-center gap-2 text-xs ${theme.textMuted} mb-4`}>
              <span className="bg-red-500 text-white px-2 py-0.5 rounded font-bold">OFFICIAL</span>
              <span>• {formatDate(art.createdAt)}</span>
            </div>
            <p className={`${theme.text} leading-relaxed whitespace-pre-wrap mb-6`}>{String(art.content)}</p>
            <div className={`flex items-center gap-6 border-t ${theme.border} pt-4`}>
              <button onClick={()=>handleLike(art)} className={`flex items-center gap-2 transition-colors ${art.likedBy?.includes(user?.uid) ? 'text-red-500 cursor-default' : `${theme.textMuted} hover:text-red-500`}`}>
                <Heart size={20} className={art.likedBy?.includes(user?.uid) ? "fill-current" : ""}/> {art.likes} Likes
              </button>
              <button onClick={()=>handleShare(art)} className={`flex items-center gap-2 ${theme.textMuted} hover:text-green-500 transition-colors`}><Share2 size={20}/> Share</button>
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


// 5. Academic Hub
const AcademicHub = ({ user, isAdmin, theme, showToast }) => {
  const [view, setView] = useState('subjects');
  const [files, setFiles] = useState([]);
  const [subjects, setSubjects] = useState(DEFAULT_FOLDERS);
  const [currentSubject, setCurrentSubject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const s = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'folders'));
        if(s.exists()) {
          const dbFolders = s.data().list || [];
          setSubjects([...new Set([...DEFAULT_FOLDERS, ...dbFolders])]);
        }
      } catch(e) { console.log("Folders sync: No custom folders yet"); }
    };
    if (user) fetchFolders();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'files'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, s => setFiles(s.docs.map(d => ({id: d.id, ...d.data()}))), err => console.log("Files sync skipped"));
    return () => unsubscribe();
  }, [user]);
    // Mobile/Browser back button: pehle folders view par le jao
  useEffect(() => {
    const handlePopState = () => {
      setView('subjects');
      setCurrentSubject('');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);


  const filtered = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const subjectFiles = files.filter(f => f.subject === currentSubject);
  // 📂 Open subject / folder (with history support for mobile back)
const openSubject = (subject) => {
  setCurrentSubject(subject);
  setView('files');

  // 🔹 Browser history me ek fake page add
  window.history.pushState(
    { page: 'files', subject },
    '',
    `#subject-${subject}`
  );
};
// 📱 Handle mobile BACK button (WhatsApp / browser issue fix)
useEffect(() => {
  const handlePopState = () => {
    // Agar files view open hai to sirf folder close karo
    if (view === 'files') {
      setView('subjects');
      setCurrentSubject('');
    }
    // warna browser normal back karega (WhatsApp, etc.)
  };

  window.addEventListener('popstate', handlePopState);

  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
}, [view]);

  return (
    <div className={`max-w-6xl mx-auto space-y-8 animate-fade-in`}>
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className={`text-3xl font-bold ${theme.text} flex items-center gap-2`}><BookOpen className="text-indigo-500 h-8 w-8"/> Academic Hub</h2>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search all files..." className={`w-full ${theme.input} pl-10 p-3 rounded-xl outline-none ${theme.text}`} />
        </div>
      </div>
          {searchTerm && (
      <p className={theme.textMuted}>
        Search "{searchTerm}" ke results yahan baad me dikhayenge.
      </p>
    )}

      {!searchTerm && view === 'subjects' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {subjects.map(sub => (
            <div key={sub} onClick={() => {
  setCurrentSubject(sub);
  setView('files');

  // history me ek step add karo taa ke back se is view se bahar aa saken
  window.history.pushState(
    { page: 'academic', view: 'files', subject: sub },
    '',
    `#${encodeURIComponent(sub)}`
  );
}}
 className={`${theme.card} p-8 rounded-2xl border ${theme.border} hover:border-indigo-500 cursor-pointer transition-all hover:-translate-y-1 shadow-sm text-center group`}>
              <Folder className="h-12 w-12 text-yellow-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h3 className={`text-xl font-bold ${theme.text}`}>{String(sub)}</h3>
              <p className={`text-xs ${theme.textMuted} mt-2`}>{files.filter(f=>f.subject===sub).length} Files</p>
            </div>
          ))}
        </div>
      )}
      {!searchTerm && view === 'files' && (
        <div className="space-y-6 animate-slide-up">
          <div className="flex justify-between items-center">
            <button
              onClick={() => {
                // React state pehle subjects view pe
                setView('subjects');
                setCurrentSubject('');

                // agar history me state hai to ek step peeche jao
                if (window.history.state) {
                  window.history.back();
                }
              }}
              className={`flex items-center gap-2 ${theme.textMuted} hover:${theme.text} font-bold`}
            >
              <ChevronRight className="rotate-180" size={16}/> Back to Folders
            </button>

          </div>
          <h3 className={`text-2xl font-bold ${theme.text} flex items-center gap-2`}><Folder className="text-yellow-500" /> {currentSubject} Files</h3>
          <div className="grid gap-3">
            {subjectFiles.length > 0 ? subjectFiles.map(file => <FileItem key={file.id} file={file} theme={theme} isAdmin={isAdmin} onDelete={()=>{}} />) : <div className={`text-center py-12 ${theme.card} rounded-xl border ${theme.border} border-dashed`}><p className={theme.textMuted}>No files in this folder.</p></div>}
          </div>
        </div>
      )}
    </div>
  );
};

// Single file card (Academic Hub downloads)
const FileItem = ({ file, theme, isAdmin, onDelete }) => {
  const handleFileDownload = async () => {
    try {
      if (!file?.url) return;

      const response = await fetch(file.url);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;

      const safeName =
        (file.name && String(file.name).trim()) || "downloaded_file";

      link.download = safeName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      alert("Download failed on this device. Please try again.");
    }
  };

  return (
    <div
      className={`${theme.card} p-5 rounded-xl border ${theme.border} flex items-center justify-between gap-4 hover:shadow-md transition-shadow relative group`}
    >
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600 font-bold">
          PDF
        </div>
        <div>
          <h4 className={`font-bold ${theme.text}`}>{String(file.name)}</h4>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
            {String(file.subject)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* MAIN DOWNLOAD BUTTON */}
        <button
          type="button"
          onClick={handleFileDownload}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          <Download size={18} /> Download
        </button>

        {/* DRIVE LINK BUTTON – sirf jab driveLink ho */}
        {file.driveLink && file.driveLink.trim() !== "" && (
          <a
            href={file.driveLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border border-indigo-400 text-indigo-500 hover:bg-indigo-50 transition-colors"
          >
            <ExternalLink size={16} /> Open Link
          </a>
        )}
      </div>
    </div>
  );
};




/// PORTFOLIO PAGE – PROFILE + AI PROJECT IDEAS GENERATOR
const Portfolio = ({ user, isAdmin, theme }) => {
  // Profile fields
  const [picUrl, setPicUrl] = useState(
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Asad1&backgroundColor=1e293b"
  );
  const [fullName, setFullName] = useState("Asad Amanat Ali");
  const [title, setTitle] = useState(
    "Software Engineer | Web Developer | Network Specialist"
  );
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
          <img
            src={picUrl}
            alt="Portfolio Avatar"
            className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border-4 border-indigo-500 shadow-xl"
          />
          <span className="absolute -bottom-2 -right-2 bg-indigo-600 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
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
        <div className="flex gap-4 mb-8">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Enter topic..." className={`flex-1 ${theme.input} p-3 rounded-xl outline-none ${theme.text}`} onKeyPress={(e) => e.key === 'Enter' && generateCards()} />
          <button onClick={generateCards} disabled={loading || !topic.trim()} className="bg-pink-600 hover:bg-pink-700 text-white px-6 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 transition-colors">{loading ? <Loader className="animate-spin" size={20}/> : <Sparkles size={20}/>} Generate ✨</button>
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      if (file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setInput(ev.target.result.substring(0, 5000)); // Limit to 5000 chars for prompt safety
        };
        reader.readAsText(file);
      } else {
        setInput(`Create a quiz about ${file.name}`);
      }
    }
  };

  useEffect(() => {
    if (!quizData || showResult) return;
    setTimeLeft(90); 
  }, [currentQ, quizData, showResult]);

  useEffect(() => {
    if (!quizData || showResult || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, quizData, showResult]);

  const generateQuiz = async () => {
    if (!input.trim()) return;
    const limit = Math.min(Math.max(parseInt(qLimit) || 5, 1), 50);
    setLoading(true); setQuizData(null); setShowResult(false); setCurrentQ(0);
    
    const prompt = `Generate a valid JSON array of ${limit} multiple choice questions based on the following text or topic: "${input.substring(0, 2000)}". 
    Style: Short, conceptual questions similar to Virtual University (VU) exam pattern.
    Format: [{"id": 1, "q": "Question text?", "options": ["Option A", "Option B", "Option C", "Option D"], "ans": 0, "explanation": "Short summary explanation."}]. 
    Return ONLY the raw JSON array. No markdown.`;
    
    try {
      const txt = await callGemini(prompt);
      const cleaned = txt.replace(/```json/g, '').replace(/```/g, '').trim();
      const jsonStart = cleaned.indexOf('[');
      const jsonEnd = cleaned.lastIndexOf(']');
      const jsonString = (jsonStart !== -1 && jsonEnd !== -1) ? cleaned.substring(jsonStart, jsonEnd + 1) : cleaned;
      
      const data = JSON.parse(jsonString);
      if (Array.isArray(data)) { 
        setQuizData(data.map(q => ({...q, selected: null}))); 
        showToast(`Generated ${data.length} Questions!`, "success"); 
      }
      else throw new Error("Invalid format");
    } catch (e) { 
      console.error("Quiz Error:", e);
      showToast("AI generation failed. Try simpler text.", "error"); 
    }
    setLoading(false);
  };

  const handleAnswer = (idx) => { 
    if (quizData[currentQ].selected !== null || timeLeft <= 0) return;
    const newData = [...quizData];
    newData[currentQ].selected = idx;
    setQuizData(newData);
  };

  const nextQ = () => { if (currentQ < quizData.length - 1) setCurrentQ(currentQ + 1); };
  const prevQ = () => { if (currentQ > 0) setCurrentQ(currentQ - 1); };
  const finishQuiz = () => setShowResult(true);

  const calculateScore = () => quizData.reduce((acc, q) => acc + (q.selected === q.ans ? 1 : 0), 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center mb-8"><h2 className={`text-3xl font-bold ${theme.text} flex items-center justify-center gap-2`}><Brain className="h-8 w-8 text-cyan-400" /> AI Quiz Generator</h2></div>
      {!quizData ? (
        <div className={`${theme.card} p-8 rounded-2xl border ${theme.border} shadow-xl`}>
          <div className="space-y-4">
            <div className="flex gap-4">
              <input value={input} onChange={e => setInput(e.target.value)} className={`flex-1 ${theme.input} rounded-xl p-4 ${theme.text} outline-none`} placeholder="e.g. 'CS101' or paste text..." />
              <input type="number" min="1" max="50" value={qLimit} onChange={e => setQLimit(e.target.value)} className={`w-24 ${theme.input} rounded-xl p-4 ${theme.text} outline-none text-center`} placeholder="Qty" title="Number of Questions" />
            </div>
            <div className={`border-2 border-dashed ${theme.border} rounded-xl p-4 text-center cursor-pointer relative hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors`}>
              <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept=".txt,.pdf,.doc,.docx" />
              <div className="flex flex-col items-center gap-2">
                <Upload className="text-indigo-500" />
                <span className={theme.textMuted}>{fileName || "Click to Upload File (Text/PDF)"}</span>
              </div>
            </div>
            <button onClick={generateQuiz} disabled={loading || !input.trim()} className="w-full bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-xl">{loading ? <Loader className="animate-spin h-5 w-5" /> : <PlayCircle className="h-5 w-5" />} {loading ? "Generating Quiz..." : "Start AI Quiz"}</button>
          </div>
        </div>
      ) : showResult ? (
        <div className={`${theme.card} p-8 rounded-2xl text-center animate-slide-up border ${theme.border}`}>
          <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-4" /><h3 className={`text-2xl font-bold ${theme.text} mb-2`}>Quiz Completed!</h3><p className="text-4xl font-bold text-green-400 mb-6">{calculateScore()} / {quizData.length}</p><button onClick={() => setQuizData(null)} className="px-8 py-3 bg-indigo-600 rounded-xl text-white font-bold hover:bg-indigo-700 transition-colors">Create Another</button>
        </div>
      ) : (
        <div className={`${theme.card} p-6 rounded-2xl border ${theme.border}`}>
          <div className={`flex justify-between items-center mb-4 text-sm ${theme.textMuted}`}>
            <span>Q {currentQ + 1} / {quizData.length}</span>
            <span className={`flex items-center gap-1 font-mono ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-indigo-500'}`}><Clock size={16}/> 00:{timeLeft.toString().padStart(2, '0')}</span>
          </div>
          <h3 className={`text-xl font-bold ${theme.text} mb-6`}>{String(quizData[currentQ].q)}</h3>
          <div className="space-y-3 mb-6">
            {quizData[currentQ].options.map((opt, idx) => {
              const isSelected = quizData[currentQ].selected === idx;
              const isCorrect = idx === quizData[currentQ].ans;
              const showStatus = quizData[currentQ].selected !== null;
              
              let btnClass = `${theme.bg} ${theme.border} ${theme.text}`;
              if (showStatus) {
                if (isSelected && isCorrect) btnClass = 'bg-green-600/20 border-green-500 text-green-600 dark:text-green-400';
                else if (isSelected && !isCorrect) btnClass = 'bg-red-600/20 border-red-500 text-red-600 dark:text-red-400';
                else if (isCorrect) btnClass = 'bg-green-600/10 border-green-500/50 text-green-600/70'; // Show correct answer nicely if wrong selected
                else btnClass = 'opacity-50';
              }
              return (
                <button key={idx} onClick={() => handleAnswer(idx)} disabled={showStatus || timeLeft <= 0} className={`w-full text-left p-4 rounded-xl border transition-all ${btnClass}`}>
                  {String(opt)}
                </button>
              );
            })}
          </div>
          {quizData[currentQ].selected !== null && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl mb-6 text-sm text-indigo-600 dark:text-indigo-300 animate-fade-in flex gap-2">
              <Sparkles size={16} className="shrink-0 mt-0.5"/>
              <div><strong>Explanation:</strong> {String(quizData[currentQ].explanation)}</div>
            </div>
          )}
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button onClick={prevQ} disabled={currentQ === 0} className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><ArrowLeft size={16}/> Previous</button>
            {currentQ === quizData.length - 1 ? (
              <button onClick={finishQuiz} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center gap-2">Finish <CheckSquare size={16}/></button>
            ) : (
              <button onClick={nextQ} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2">Next <ArrowRight size={16}/></button>
            )}
          </div>
          <div className="text-center mt-2">
            <button onClick={finishQuiz} className="text-xs text-red-400 hover:text-red-500 hover:underline">Stop & Finish Quiz</button>
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

  useEffect(() => {
    if (!user) return;

    const unsubConfig = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'highlightsConfig'), (docSnap) => {
        if (docSnap.exists()) {
            setShowSection(docSnap.data().isVisible !== false);
        }
    }, (error) => console.log("Highlights Config Error", error));

    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'highlights'), orderBy('createdAt', 'desc'));
    const unsubList = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
        setHighlights(items);
    }, (error) => console.log("Highlights List Error", error));

    return () => { unsubConfig(); unsubList(); };
  }, [user]);

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
          <a href="https://vulms.vu.edu.pk/" target="_blank" className="inline-flex items-center gap-2 text-indigo-500 hover:underline font-bold text-lg">
            <GraduationCap size={24} /> Go to VU LMS
          </a>
        </div>
      </div>

      {showSection && highlights.length > 0 && (
        <div className="max-w-6xl mx-auto px-4">
            <h2 className={`text-2xl font-bold ${theme.text} mb-6 flex items-center gap-2`}><Megaphone className="text-red-500"/> Campus Highlights</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {highlights.map((post) => {
                const IconComponent = ICON_MAP[post.iconName] || Calendar;
                const CardContent = (
                    <>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${post.color || "bg-blue-100 text-blue-700"}`}>
                            <IconComponent size={24} />
                        </div>
                        <h3 className={`font-bold ${theme.text} mb-2`}>{post.title}</h3>
                        <p className={`text-sm ${theme.textMuted}`}>{post.desc}</p>
                        {post.link && <div className="mt-4 flex items-center gap-1 text-xs font-bold text-indigo-500 group-hover:underline">Visit Link <ExternalLink size={12}/></div>}
                    </>
                );

                return (
                    post.link ? (
                        <a key={post.id} href={post.link} target="_blank" rel="noopener noreferrer" className={`${theme.card} p-6 rounded-2xl border ${theme.border} hover:-translate-y-1 transition-transform shadow-sm cursor-pointer group block`}>
                            {CardContent}
                        </a>
                    ) : (
                        <div key={post.id} className={`${theme.card} p-6 rounded-2xl border ${theme.border} hover:-translate-y-1 transition-transform shadow-sm`}>
                            {CardContent}
                        </div>
                    )
                );
            })}
            </div>
        </div>
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
      const prompt = `You are EduBot, an advanced, polite, and highly intelligent academic AI assistant for University students. Your goal is to provide the best possible explanations, detailed answers, and helpful guidance. Be encouraging and formal yet friendly. Student Query: ${userMsg}`;
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
    getDoc(doc(db, "artifacts", appId, "public", "data", "meta", "folders")).then(
      (s) => {
        if (s.exists()) {
          const dbFolders = s.data().list || [];
          setSubjects([...new Set([...DEFAULT_FOLDERS, ...dbFolders])]);
        }
      }
    );

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

  const handleUpload = async () => {
    if (!uName) return;

    const fakeUrl = uFile ? URL.createObjectURL(uFile) : uDriveLink || "#";

    await addDoc(
      collection(db, "artifacts", appId, "public", "data", "files"),
      {
        name: uName,
        subject: selSubject,
        url: fakeUrl,
        type: uFile?.type || (uDriveLink ? "link" : "unknown"),
        uploadedBy: "Admin",
        createdAt: serverTimestamp(),
      }
    );

    showToast("File Uploaded", "success");
    setUName("");
    setUFile(null);
    setUDriveLink("");
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
            onClick={handleUpload}
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
                    doc(db, "artifacts", appId, "public", "data", "files", f.id)
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

// 16. Admin Login
const AdminLogin = ({ onClose, setPage, setIsAdminMode, showToast }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e) => { 
    e.preventDefault();
    setLoading(true); setError('');
    if (email.toLowerCase() === ADMIN_EMAIL && pass.length >= 6) {
      setIsAdminMode(true); onClose(); setPage('admin'); showToast("Welcome back, Admin!", "success");
    } else {
      setError("Invalid Credentials.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] animate-fade-in backdrop-blur-sm">
      <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 w-96 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-red-400"><X size={20}/></button>
        <div className="text-center mb-6"><Shield className="h-12 w-12 text-red-500 mx-auto mb-2" /><h2 className="text-xl font-bold text-white">Admin Access</h2></div>
        {error && <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded mb-4 text-sm text-center">{error}</div>}
        <form onSubmit={handleAuth} className="space-y-4">
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full bg-slate-800 border border-slate-600 p-3 rounded-lg text-white outline-none focus:border-red-500 placeholder-slate-400" required />
          <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Password" className="w-full bg-slate-800 border border-slate-600 p-3 rounded-lg text-white outline-none focus:border-red-500 placeholder-slate-400" required />
          <button disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold disabled:opacity-50">Login</button>
        </form>
      </div>
    </div>
  );
};

// 17. Exam Prep Placeholder
const ExamPrep = ({ theme }) => (
  <div className={`max-w-4xl mx-auto ${theme.card} p-8 rounded-2xl border ${theme.border} text-center`}><h2 className={`text-2xl font-bold ${theme.text}`}>PHY101 Prep</h2><p className={theme.textMuted}>Modules loaded.</p><button className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors">Start</button></div>
);

// Main App
const App = () => {
  const [page, setPage] = useState('home');
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [secretClicks, setSecretClicks] = useState(0);
  const [toast, setToast] = useState(null);
  const { isDark, setIsDark, theme } = useTheme();

  useEffect(() => {
    const initAuth = async () => {
      // Local Auth Logic (Standard)
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, u => {
      setUser(u);
      if(u?.email === ADMIN_EMAIL) setIsAdminMode(true);
    });
  }, []);

  const showToast = (message, type = 'info') => setToast({ message, type });

  const handleFooterClick = () => {
    setSecretClicks(prev => prev + 1);
    if (secretClicks + 1 === 5) { setShowAdminLogin(true); setSecretClicks(0); }
  };

  const handleLogoutAdmin = () => {
    setIsAdminMode(false);
    setPage('home');
    showToast("Admin Session Ended", "info");
  };

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300 font-sans flex flex-col`}>
      <style>{customStyles}</style>
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <Navbar page={page} setPage={setPage} user={user} isAdmin={isAdminMode} isDark={isDark} setIsDark={setIsDark} theme={theme} toggleMenu={()=>setIsMenuOpen(!isMenuOpen)} isMenuOpen={isMenuOpen} />
      <Announcements user={user} />
      
      <main className="max-w-7xl mx-auto px-4 py-8 pb-24 w-full flex-grow">
        {page === 'home' && <HomePage setPage={setPage} theme={theme} showToast={showToast} user={user} />}
        {page === 'academic' && <AcademicHub user={user} isAdmin={isAdminMode} theme={theme} showToast={showToast} />}
        {page === 'exam' && <ExamPrep theme={theme} />}
        {page === 'aiquiz' && <QuizGenerator theme={theme} user={user} showToast={showToast} />}
        {page === 'flashcards' && <FlashcardGenerator theme={theme} showToast={showToast} />}
        {page === 'planner' && <StudyPlanner theme={theme} showToast={showToast} />}
        {page === 'portfolio' && <Portfolio user={user} isAdmin={isAdminMode} theme={theme} />}
        {page === 'forum' && <Forum user={user} isAdmin={isAdminMode} theme={theme} showToast={showToast} />}
        {page === 'articles' && <ArticlesPage user={user} isAdmin={isAdminMode} theme={theme} showToast={showToast} />}
        {page === 'about' && <AboutUs theme={theme} />}
        {page === 'contact' && <ContactUs theme={theme} />}
        {page === 'admin' && isAdminMode && <AdminPanel theme={theme} user={user} showToast={showToast} />}
      </main>

      <FloatingAIChat theme={theme} />
      
      <footer className={`border-t ${theme.border} py-8 ${theme.card} mt-auto`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          {/* Secret Trigger Area */}
          <p className={`${theme.textMuted} cursor-default select-none transition-colors hover:text-indigo-500`} onClick={handleFooterClick}>
            © 2026 EduNexus | Developed by Asad Amanat Ali.
          </p>
          <div className="flex items-center gap-4">
            {isAdminMode && (
              <button onClick={handleLogoutAdmin} className="text-red-500 font-bold flex items-center gap-1 hover:underline">
                <LogOut size={14}/> Exit Admin
              </button>
            )}
            <a href="#" className={`${theme.textMuted} hover:${theme.text}`}>Privacy Policy</a>
            <a href="#" className={`${theme.textMuted} hover:${theme.text}`}>Terms of Service</a>
          </div>
        </div>
      </footer>

      {showAdminLogin && <AdminLogin onClose={() => setShowAdminLogin(false)} setPage={setPage} setIsAdminMode={setIsAdminMode} showToast={showToast} />}
    </div>
  );
};

export default App;

