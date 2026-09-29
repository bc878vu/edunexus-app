// Denormalized exam-catalogue counts.
//
// The public ExamPrepHub reads the single meta/examCatalog document instead of
// scanning up to EXAM_SUBJECT_LIMIT MCQ documents on every visit. Admin write
// paths (McqBulkImporter after import, ExamMcqAdminManager after edit / move /
// delete) call refreshExamCatalogCounts with the affected subjects; each
// subject is recomputed with cheap count() aggregations — never
// blind-incremented — so the document cannot drift from the collection.
//
// The per (subject, term) count queries need the composite index declared in
// firestore.indexes.json. When a count fails (for example the index is not
// deployed yet), that subject keeps its previous counts and the error is
// swallowed: ExamPrepHub falls back to the legacy document scan while the
// counts document is missing or stale.
import { collection, count, doc, getCountFromServer, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from './firebase-client';
import { EXAM_CATEGORIES } from './examCatalog';

export const EXAM_CATALOG_DOC = ['artifacts', 'edunexus-live', 'public', 'data', 'meta', 'examCatalog'];
const COURSE = /^[A-Z]{2,5}[0-9]{3}[A-Z]?$/;
const MCQS = collection(db, 'artifacts', 'edunexus-live', 'public', 'data', 'examMcqs');

export async function refreshExamCatalogCounts(subjects) {
  const list = [...new Set((Array.isArray(subjects) ? subjects : [subjects])
    .map((value) => String(value || '').trim().toUpperCase())
    .filter((value) => COURSE.test(value)))];
  if (!list.length) return;
  const updates = {};
  for (const subject of list) {
    const counts = {};
    let complete = true;
    for (const category of EXAM_CATEGORIES) {
      try {
        const snapshot = await getCountFromServer(
          query(MCQS, where('subject', '==', subject), where('term', '==', category)));
        counts[category] = Number(snapshot.data().count) || 0;
      } catch (_) { complete = false; break; }
    }
    if (complete) updates[subject] = counts;
  }
  if (!Object.keys(updates).length) return;
  await setDoc(doc(db, ...EXAM_CATALOG_DOC),
    { bySubject: updates, updatedAt: serverTimestamp() }, { merge: true });
}
