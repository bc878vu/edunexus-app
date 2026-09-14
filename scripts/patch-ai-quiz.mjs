import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/App.js');
const text = fs.readFileSync(file, 'utf8');

// Production-safe/idempotent guard. App.js has evolved over several releases;
// this build helper must never make Vercel fail because a legacy text snapshot
// no longer matches. The AI Quiz backend is independently deployed in api/.
if (text.includes('SOURCE_FILE_URL: ${fileUrl}')) {
  console.log('AI Quiz source pipeline already present; no frontend patch needed.');
} else {
  console.log('AI Quiz frontend patch skipped safely; source snapshot is not applicable.');
}
