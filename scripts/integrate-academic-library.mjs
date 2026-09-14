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

fs.writeFileSync(file, source, 'utf8');
console.log('Academic Library integration applied safely.');
