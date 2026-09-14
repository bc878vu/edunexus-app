import fs from 'node:fs';

const file = 'src/App.js';
let source = fs.readFileSync(file, 'utf8');

if (!source.includes("./AIQuizEnhanced")) {
  source = "import AIQuizEnhanced from './AIQuizEnhanced';\n" + source;
}

const usage = /<QuizGenerator\b[\s\S]*?\/>/m;
const replacement = '<AIQuizEnhanced theme={theme} user={user} showToast={showToast} storage={storage} />';

if (usage.test(source)) {
  source = source.replace(usage, replacement);
} else if (!source.includes('<AIQuizEnhanced')) {
  throw new Error('AI Quiz render target not found; refusing to mutate App.js.');
}

fs.writeFileSync(file, source, 'utf8');
console.log('Source-grounded AI Quiz integration applied safely.');
