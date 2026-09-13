import fs from 'node:fs';

const file = 'src/App.js';
let source = fs.readFileSync(file, 'utf8');

source = source.replace(
  "import { initializeApp } from 'firebase/app';",
  "import { getApp, getApps, initializeApp } from 'firebase/app';"
);
source = source.replace(
  "getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot,",
  "initializeFirestore, collection, addDoc, query, orderBy, limit, onSnapshot,"
);
source = source.replace(
  'const app = initializeApp(firebaseConfig);',
  "const app = getApps().length ? getApp() : initializeApp(firebaseConfig);"
);
source = source.replace(
  'const db = getFirestore(app);',
  "const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true, useFetchStreams: false });"
);
source = source.replace(/const apiKey = process\.env\.REACT_APP_GEMINI_API_KEY[^\n]*\n/g, '');
source = source.replace(/const ADMIN_PASSWORD =\s*process\.env\.REACT_APP_ADMIN_PASSWORD \|\|\s*[^;]+;\s*\n?/g, '');
source = source.replace(/const ADMIN_EMAIL =\s*process\.env\.REACT_APP_ADMIN_EMAIL \|\|\s*"veducator4@gmail\.com";/g, 'const ADMIN_EMAIL = "veducator4@gmail.com";');
source = source.replace('if (u?.email === ADMIN_EMAIL) setIsAdminMode(true);', 'if (u?.email === ADMIN_EMAIL && u?.emailVerified === true) setIsAdminMode(true);');
source = source.replace('''  const handleLogoutAdmin = () => {\n    setIsAdminMode(false);\n    navigate('home');\n    showToast("Admin Session Ended", "info");\n  };''', '''  const handleLogoutAdmin = async () => {\n    setIsAdminMode(false);\n    try { await signOut(auth); await signInAnonymously(auth); } catch (_) {}\n    navigate('home');\n    showToast("Admin session ended securely.", "info");\n  };''');

const oldHandler = /  const handleSubmit = \(e\) => \{[\s\S]*?\n  \};\n\n  return \(\n    <div className="fixed inset-0 z-50/;
const newHandler = `  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      showToast("Email and password required.", "error");
      return;
    }
    setLoading(true);
    try {
      const enteredEmail = email.trim().toLowerCase();
      if (enteredEmail !== ADMIN_EMAIL.toLowerCase()) throw new Error("Invalid admin credentials.");
      const credential = await signInWithEmailAndPassword(auth, enteredEmail, password);
      if (!credential.user.emailVerified) {
        await signOut(auth);
        await signInAnonymously(auth);
        throw new Error("Admin email must be verified before access is granted.");
      }
      setIsAdminMode(true);
      setPage("admin");
      showToast("Admin mode enabled securely.", "success");
      onClose();
    } catch (error) {
      showToast(error?.message || "Invalid admin credentials.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50`;
if (oldHandler.test(source)) source = source.replace(oldHandler, newHandler);

fs.writeFileSync(file, source);
console.log('EduNexus production security patch applied.');
