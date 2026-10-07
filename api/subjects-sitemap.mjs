import { SITE, escapeHtml } from './resource-data.mjs';

// Static subject list (all 8 semesters of the BS-SE scheme). Quota-proof:
// unlike the resource sitemap, this never touches Firestore, so Googlebot
// always gets a full sitemap even during quota outages.
// Subject URLs use the course code — the Academic Hub resolves it to the
// merged subject card via extractCourseCode().
export const SUBJECTS = [
  // Semester 1
  'CS101', 'ENG101', 'MTH101', 'PAK301', 'PHY101', 'VU001', 'ECO401', 'MGT211',
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
  'MTH301',
];

function buildXml(urls) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((url) => '<url><loc>' + escapeHtml(url) + '</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>').join('\n') +
    '\n</urlset>';
}

export default async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).end();
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'HEAD') return res.status(200).end();
  const urls = SUBJECTS.map((code) => SITE + '/academic/' + encodeURIComponent(code));
  return res.status(200).send(buildXml(urls));
}
