import { examReviewText, formatExamDate, formatExamTime, whatsAppReviewUrl, EXAM_REVIEW_URL, EDUNEXUS_WHATSAPP_GROUP } from './examReviewFormat';

const example = {
  subject: 'CS101', term: 'finalterm', semester: 'Spring 2026',
  examDate: '2026-07-29', examTime: '12:30',
  sharedBy: 'Hifza', summary: 'I revised the handouts and found the general preparation useful.'
};

test('formats a student review with EduNexus branding and WhatsApp group link', () => {
  const text = examReviewText(example);
  expect(text).toContain('📖 *Course Code:* CS101');
  expect(text).toContain('📚 *Exam:* Finalterm (Spring 2026)');
  expect(text).toContain('📅 *Date:* 29-07-2026');
  expect(text).toContain('🕐 *Time:* 12:30 PM');
  expect(text).toContain('👤 *Shared by:* Hifza');
  expect(text).toContain('*Paper Content:*');
  expect(text).toContain('> EduNexus');
  expect(text).toContain(EXAM_REVIEW_URL);
  expect(text).toContain(EDUNEXUS_WHATSAPP_GROUP);
  expect(text.indexOf('Paper Content')).toBeLessThan(text.indexOf('Share Your Paper Review Here'));
});

test('legacy approved reviews without semester or time do not invent values', () => {
  const text = examReviewText({subject:'CS201', term:'midterm', examDate:'2025-12-09', summary:'Previous review text'});
  expect(text).toContain('📚 *Exam:* Midterm');
  expect(text).toContain('👤 *Shared by:* Student');
  expect(text).not.toContain('*Time:*');
  expect(text).not.toContain('undefined');
});

test('date and time convert for display with noon, midnight and leading zeros', () => {
  expect(formatExamDate('2026-07-29')).toBe('29-07-2026');
  expect(formatExamTime('00:05')).toBe('12:05 AM');
  expect(formatExamTime('12:30')).toBe('12:30 PM');
  expect(formatExamTime('23:09')).toBe('11:09 PM');
  expect(formatExamTime('12:70')).toBe('');
});

test('WhatsApp URL safely encodes the same exact copy text', () => {
  const url = whatsAppReviewUrl({...example, summary:'Topics & handouts #1'});
  expect(url.startsWith('https://api.whatsapp.com/send?text=')).toBe(true);
  expect(decodeURIComponent(url.split('?text=')[1])).toBe(examReviewText({...example, summary:'Topics & handouts #1'}));
});
