import fs from 'node:fs';

const file = 'src/App.js';
let source = fs.readFileSync(file, 'utf8');

if (!source.includes('getCountFromServer')) {
  source = source.replace(
    /getDoc, setDoc, arrayUnion/,
    'getDoc, setDoc, arrayUnion, getCountFromServer'
  );
}
if (!source.includes('ArrowUpRight')) {
  source = source.replace(
    /Clock,\n  Minus,/,
    'Clock,\n  Minus,\n  ArrowUpRight,'
  );
}

const start = source.indexOf('const HomePage = ');
const end = source.indexOf('// 14. Floating AI Chat', start);
if (start < 0 || end < 0) throw new Error('Dashboard patch target not found');

const dashboard = fs.readFileSync('scripts/dashboard.patch.txt', 'utf8');

source = source.slice(0, start) + dashboard + '\n\n' + source.slice(end);
fs.writeFileSync(file, source, 'utf8');
console.log('EduNexus responsive dashboard upgrade applied.');
