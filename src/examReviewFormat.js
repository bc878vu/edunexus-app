export const EXAM_REVIEW_URL = 'https://edunexus-app.vercel.app/?page=exam-prep';
export const EDUNEXUS_WHATSAPP_GROUP = 'https://chat.whatsapp.com/D6KjNsaW4aK0dMnxzodSYW';

export const formatExamDate = (iso) => {
  const match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? match[3] + '-' + match[2] + '-' + match[1] : 'Not provided';
};

export const formatExamTime = (value) => {
  const match = String(value || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return '';
  const hour = Number(match[1]);
  return String(hour % 12 || 12) + ':' + match[2] + (hour >= 12 ? ' PM' : ' AM');
};

// Only link to a hosted paper file in the EduNexus Firebase Storage bucket.
export const safePaperUrl = (review) => {
  if (!String(review?.paperPath || '').startsWith('exam-papers/')) return '';
  try {
    const url = new URL(review?.paperUrl || '');
    return url.protocol === 'https:' && url.hostname === 'firebasestorage.googleapis.com' &&
      url.pathname.startsWith('/v0/b/edunexus-live-e0b84.firebasestorage.app/o/') ? url.href : '';
  } catch (_) { return ''; }
};

export const examReviewText = (review) => {
  const course = String(review.subject || '').trim().toUpperCase() || 'Not provided';
  const term = review.term === 'midterm' ? 'Midterm' : review.term === 'finalterm' ? 'Finalterm' : 'Exam';
  const semester = String(review.semester || '').trim();
  const name = String(review.sharedBy || '').trim() || 'Student';
  const time = formatExamTime(review.examTime);
  const body = String(review.summary || '').trim() || 'No experience provided.';
  const topics = String(review.topics || '').trim();
  return [
    '📖 *Course Code:* ' + course,
    '',
    '📚 *Exam:* ' + term + (semester ? ' (' + semester + ')' : ''),
    '📅 *Date:* ' + formatExamDate(review.examDate),
    ...(time ? ['🕐 *Time:* ' + time] : []),
    '👤 *Shared by:* ' + name,
    '',
    '*Paper Content:*',
    '> EduNexus',
    ...(topics ? ['*Main Topics:* ' + topics] : []),
    body,
    ...(safePaperUrl(review) ? ['', '*Shared paper:*', safePaperUrl(review)] : []),
    '> EduNexus',
    '',
    'Share Your Paper Review Here 👇',
    EXAM_REVIEW_URL,
    '',
    'Follow EduNexus for more Papers 👇',
    EDUNEXUS_WHATSAPP_GROUP
  ].join('\n');
};

export const whatsAppReviewUrl = (review) =>
  'https://api.whatsapp.com/send?text=' + encodeURIComponent(examReviewText(review));
