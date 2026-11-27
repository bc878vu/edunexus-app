import { SITE, escapeHtml } from './resource-data.mjs';

// Static subject list (all 8 semesters of the BS-SE scheme). Quota-proof:
// unlike the resource sitemap, this never touches Firestore, so Googlebot
// always gets a full sitemap even during quota outages.
// Subject URLs use the course code — the Academic Hub resolves it to the
// merged subject card via extractCourseCode().
export const SUBJECTS = [
  // Semester 1
  'CS101', 'ENG101', 'MTH101', 'PAK301', 'PHY101', 'CS001', 'ECO401', 'MGT211',
  // Semester 2
  'CS201', 'ENG201', 'MTH202', 'MTH501', 'ISL202', 'MGT301', 'MGT503', 'ETH202',
  // Semester 3
  'CS301', 'CS304', 'CS601', 'CS625', 'MGT201', 'MGT501',
  // Semester 4
  'CS403', 'CS504', 'CS604', 'CS610', 'STA301',
  // Semester 5
  'CS401', 'CS408', 'CS510', 'CS511', 'MCM301', 'MTH601',
  // Semester 6
  'CS205', 'CS603', 'CS620', 'CS202', 'IT430',
  // Semester 7
  'CS619', 'CS611', 'CS615', 'MGT101', 'SE601', 'CS311', 'CS435',
  // Semester 8
  'CS636', 'SE602', 'CS508', 'CS609',
  // Other subjects with published content
  'MTH301', 'HRM613',
  'EDU301', 'EDU402', 'EDU406', 'EDU430', 'EDU601', 'EDU602',
];

function normalizeSitemapUrl(value) {
  const parsed = new URL(value);
  if (parsed.pathname !== '/test-papers') return value;
  const subject = String(parsed.searchParams.get('subject') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  const termRaw = String(parsed.searchParams.get('term') || '').toLowerCase().replace(/[^a-z]/g, '');
  const term = termRaw === 'midterm' ? 'Midterm' : termRaw === 'finalterm' ? 'Finalterm' : '';
  const lectures = [...new Set(String(parsed.searchParams.get('lectures') || '').split(',')
    .map((item) => item.trim()).filter((item) => /^\d{1,4}$/.test(item))
    .map(Number).filter((item) => item >= 1 && item <= 1000))].sort((x, y) => x - y);
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (term) params.set('term', term);
  if (lectures.length) params.set('lectures', lectures.join(','));
  return parsed.origin + parsed.pathname + (params.toString() ? '?' + params.toString() : '');
}

function buildXml(urls) {
  const uniqueUrls = [...new Set(urls.map(normalizeSitemapUrl))];
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    uniqueUrls.map((url) => '<url><loc>' + escapeHtml(url) + '</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>').join('\n') +
    '\n</urlset>';
}

export default async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).end();
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'HEAD') return res.status(200).end();
  const urls = SUBJECTS.map((code) => SITE + '/academic/' + encodeURIComponent(code));
  // Curated full-range pattern URLs for published test-paper banks. Each URL
  // records its subject, term, and exact lecture/topic range so a
  // Finalterm bank never resolves as Midterm. Pattern links build the
  // paper from the verified bank. Regenerate when banks change.
  urls.push(SITE + '/test-papers', SITE + '/test-papers/phy101-lec1-9');
  urls.push(SITE + '/test-papers?subject=ACC501&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ACC501&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=BIO202&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=BNK610&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=BT401&term=Midterm&lectures=1,2,3,4,5&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=BT501&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=BT512&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=BT601&term=Midterm&lectures=1,2&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS001&term=Midterm&lectures=1,2,3,4,5,6&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS001&term=Finalterm&lectures=1,2,3,4,5,6,7&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS101&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS101&term=Finalterm&lectures=1,2,3,4,5,6,7,8,9,10,11,13&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS201&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS201&term=Finalterm&lectures=1,2,3,4,5,7,8,9,10,11,12,13,14,16,18,19,20,21,22,23,24,25&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS201P&term=Midterm&lectures=1,2,3,4,5,6,7&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS202&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS205&term=Midterm&lectures=1,6,7,8,9,11,13,14,15,17,18,24,25,26,28,32,40,42,48,58,59,66,67,68,69,70,72,88,109,110,113,114,115,118,122,126,127,129,139,146,148,152,153,154,155,236&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS205&term=Finalterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS301&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS301&term=Finalterm&lectures=1,2,3,4,5,6,7,8,9,10&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS302&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS304&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS304&term=Finalterm&lectures=23,24,25,26,27,28,31,32,33,34,36,37,38,40,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS306&term=Midterm&lectures=1&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS311&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS311&term=Finalterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS314&term=Midterm&lectures=1,2,3&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS401&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS401&term=Finalterm&lectures=1,2,3,4,5,6,7,8,9,10,11&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS402&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS402&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,41,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS403&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS407&term=Midterm&lectures=1,2&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS408&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS408&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS411&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS411&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS435&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS435&term=Finalterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS502&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS502&term=Finalterm&lectures=1,2,3,4,5,6,7,8,9,10&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS504&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS504&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS506&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS506&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS507&term=Midterm&lectures=1,2&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS508&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS508&term=Finalterm&lectures=1,2,3,4,5,6,7,8,9,10&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS510&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS510&term=Finalterm&lectures=1,2,3,4,5,6&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS511&term=Midterm&lectures=1,2,3,4,5,6,7,8,9&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS511&term=Finalterm&lectures=1,2,3,4,5,6,7,8&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS525&term=Midterm&lectures=1,2&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS601&term=Midterm&lectures=1,2,3,4,5,6,7&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS601&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS603&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS604&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS604&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS605&term=Midterm&lectures=1,2&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS606&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS609&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS609&term=Finalterm&lectures=1,2,3,4,5,6,7,8,9&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS610&term=Midterm&lectures=1,2,3,4,5,6&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS610&term=Finalterm&lectures=23,24,25,26,27,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS611&term=Midterm&lectures=1,2,3,4,5&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS611&term=Finalterm&lectures=1,2,3,4,5&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS614&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS614&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,41,44&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS615&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS615&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,34,35,36,37,38,39,40,41,42&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS620&term=Midterm&lectures=1,2,3,4,5,6&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS620&term=Finalterm&lectures=1,2,3,4,5,6,7,8&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS625&term=Midterm&lectures=1,2,3,4,5,6,7,8&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS625&term=Finalterm&lectures=9,10,11,12,13,14,15,16&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS636&term=Midterm&lectures=1,2,3,4,5,6,7,8&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=CS636&term=Finalterm&lectures=1,2,3,4,5,6&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ECE302&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ECO302&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ECO302&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ECO401&term=Midterm&lectures=1,2,3,4,5,6,7&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ECO401&term=Finalterm&lectures=1,2,3,4,5,6,7,8,9,10,11&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ECO403&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ECO404&term=Finalterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ECO610&term=Midterm&lectures=1,2&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=EDU301&term=Midterm&lectures=1,2,3,4,5,6,7&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=EDU301&term=Finalterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=EDU303&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=EDU401&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=EDU402&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,14,16,18,19,20,21&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=EDU402&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=EDU405&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=EDU406&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=EDU430&term=Midterm&lectures=1,2,3,4,5,6&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=EDU431&term=Midterm&lectures=1,2&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=EDU433&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=EDU512&term=Midterm&lectures=1,2&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=EDU601&term=Midterm&lectures=1,2&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=EDU601&term=Finalterm&lectures=1,2,3,4,5,6,7,8,9,10&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=EDU602&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=EDU602&term=Finalterm&lectures=1,2,3,4,5,6,7,8,9,10,11&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=EDU654&term=Midterm&lectures=1,2,3&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=EDUA430&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=EDUA516&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ENG101&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ENG101&term=Finalterm&lectures=1,2,3,4,5,6&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ENG201&term=Midterm&lectures=1,2,3,4,5,6,7,8&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ENG201&term=Finalterm&lectures=1,2,3,4,5,6,7&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ENG202&term=Midterm&lectures=1,2&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ENG301&term=Midterm&lectures=1,2,3,4,5,6,7,8&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ENG301&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,40,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ENG504&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ENG504&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,34,35,36,37,38,39,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ENG591&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ETH100&term=Midterm&lectures=1,2,3,4,5,6,7&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ETH202&term=Midterm&lectures=1,2,3,4,5,6,7&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=FIN611&term=Midterm&lectures=1&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=FIN621&term=Midterm&lectures=1&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=FIN702&term=Midterm&lectures=1,2&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=HRM613&term=Midterm&lectures=1,2,3,4,5,6,7,8&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=HRM613&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=HRM617&term=Midterm&lectures=1,2,3,4,5,6,7,8,9&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=HRM617&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=HRM626&term=Midterm&lectures=1,2,3,4,5,6,7,8&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=HRM626&term=Finalterm&lectures=29,30,31,32&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ISL201&term=Midterm&lectures=1,2,3,4,5,6,7&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ISL202&term=Midterm&lectures=1,2,3,4,5,6,7&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=IT430&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=IT430&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=IT602&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MB501&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MB504&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MCM301&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MCM301&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MCM401&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MCM501&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MCM511&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MCM511&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MCM516&term=Midterm&lectures=1,2,3&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MCM604&term=Midterm&lectures=1,2&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MCM610&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MCMP531&term=Midterm&lectures=1&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGMT622&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGMT628&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT101&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT101&term=Finalterm&lectures=1,2,3,4,5,6&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT111&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT201&term=Midterm&lectures=1,2,3,4,5,6&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT201&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT211&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT211&term=Finalterm&lectures=1,2,3,4,5&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT301&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT301&term=Finalterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT402&term=Midterm&lectures=1,2,3,4,5,6&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT411&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT411&term=Finalterm&lectures=1,2,3,4,5,6&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT501&term=Midterm&lectures=1,2,3,4,5,6,7&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT501&term=Finalterm&lectures=1,2,3,4,5,6,7,8,9,10&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT502&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT502&term=Finalterm&lectures=23,24,25,26,27,30,31,32,33,34,35,36,37,38,39,40,42,43,44&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT503&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT503&term=Finalterm&lectures=1,2,3,4,5,6,7,8,9,10,11&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT510&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT513&term=Midterm&lectures=1,2,3&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT522&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT522&term=Finalterm&lectures=112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT602&term=Midterm&lectures=1,2,3,4,5,6,7&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT603&term=Midterm&lectures=1,2,3,4,5&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT603&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT604&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT610&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT610&term=Finalterm&lectures=23,24,26,27,29,30,32,33,34,35,36,37,38,40,41,42,43,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT611&term=Midterm&lectures=1,2,3,4,5,6,7,8,9&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT611&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT613&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MGT713&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MKT501&term=Midterm&lectures=1,2,3&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MKT530&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MTH101&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MTH101&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MTH201&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MTH201&term=Finalterm&lectures=23,24,25,27,28,29,30,31,33,34,36,37,38,39&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MTH202&term=Midterm&lectures=1,2,3,4,5,6,7,8,9&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MTH202&term=Finalterm&lectures=1,2,3,4,5&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MTH301&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MTH301&term=Finalterm&lectures=23,24,27,28,29,30,31,32,33,34,35&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MTH303&term=Midterm&lectures=1,2,3,4,5,6,7,8&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MTH501&term=Midterm&lectures=1,2,3,4,5,6,7,8&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MTH501&term=Finalterm&lectures=23,24,25,27,28,29,30,35,38,39,40,42&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MTH601&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MTH601&term=Finalterm&lectures=4,5,6,7,8,9,10&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MTH603&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MTH642&term=Midterm&lectures=1,2,3&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=MTH645&term=Midterm&lectures=1&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=PAK301&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=PAK301&term=Finalterm&lectures=1,2,3,4,5,6,7,8&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=PAK522&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=PAY406&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=PHY101&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,21&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=PHY101&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=PSC201&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=PSC401&term=Midterm&lectures=1,2&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=PSY101&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=PSY101&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=PSY404&term=Finalterm&lectures=23,24,25,26,27,28,31,32,33,34,35,40,41,43&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=PSY515&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=PSY516&term=Midterm&lectures=1,2&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=PSY611&term=Midterm&lectures=1,2,3&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=PSY632&term=Midterm&lectures=1,2&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=SE601&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=SE601&term=Finalterm&lectures=1,2,3,4,5,6,7,8,9,10&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=SE601P&term=Finalterm&lectures=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=SE602&term=Midterm&lectures=1,2,3,4,5,6,7,8,9,10&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=SE602&term=Finalterm&lectures=1,2,3,4,5&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=SOC101&term=Midterm&lectures=1,2,3,4,5,6,7&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=SOC301&term=Midterm&lectures=1,2&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=SOC302&term=Midterm&lectures=1,2,3&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=SOC404&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=SOC617&term=Midterm&lectures=1,2,3&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=STA301&term=Midterm&lectures=1,2,3,4,5,6,7,8,9&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=STA301&term=Finalterm&lectures=23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=STA302&term=Midterm&lectures=1&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=STA630&term=Midterm&lectures=1,2,3,4,5,6,7,8,9&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=STA642&term=Midterm&lectures=1,2,3,4,5,6,7,8&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=STA642&term=Finalterm&lectures=1,2,3,4,5,6&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ZOO512&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  urls.push(SITE + '/test-papers?subject=ZOO516&term=Midterm&lectures=1,2,3,4&mcqs=20&shorts=3&longs=3');
  return res.status(200).send(buildXml(urls));
}
