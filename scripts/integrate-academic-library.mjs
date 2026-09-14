import fs from 'node:fs';

const file = 'src/App.js';
let source = fs.readFileSync(file, 'utf8');
const marker = 'AcademicLibraryPage';

if (!source.includes(marker)) {
  const importLine = "import AcademicLibraryPage from './AcademicLibraryPage';\n";
  source = importLine + source;
}

const academicPattern = /<AcademicHub\b[\s\S]*?\/>/m;
if (academicPattern.test(source)) {
  source = source.replace(
    academicPattern,
    '<AcademicLibraryPage user={user} isAdmin={isAdminMode} theme={theme} showToast={showToast} db={db} appId={appId} storage={storage} />'
  );
} else if (!source.includes('<AcademicLibraryPage')) {
  throw new Error('Academic Hub render target not found; refusing to mutate App.js.');
}

// Keep floating/global AI styling synchronized with EduNexus' saved light/dark theme.
// This is deliberately injected by a small deterministic build step so the source stays maintainable.
const themeMarker = '// EDX_THEME_BRIDGE';
if (!source.includes(themeMarker)) {
  const anchor = 'const useTheme = () => {';
  const bridge = `const useTheme = () => {\n  ${themeMarker}\n  useEffect(() => {\n    const syncEduNexusTheme = () => {\n      const isDarkTheme = localStorage.getItem('theme') === 'dark';\n      document.documentElement.dataset.theme = isDarkTheme ? 'dark' : 'light';\n      document.documentElement.classList.toggle('dark', isDarkTheme);\n    };\n    syncEduNexusTheme();\n    window.addEventListener('edunexus:theme-change', syncEduNexusTheme);\n    const timer = window.setInterval(syncEduNexusTheme, 500);\n    return () => {\n      window.removeEventListener('edunexus:theme-change', syncEduNexusTheme);\n      window.clearInterval(timer);\n    };\n  }, []);`;
  if (!source.includes(anchor)) throw new Error('useTheme anchor not found; refusing to mutate App.js.');
  source = source.replace(anchor, bridge);
}

fs.writeFileSync(file, source, 'utf8');
console.log('Academic Library + theme bridge integration applied safely.');
