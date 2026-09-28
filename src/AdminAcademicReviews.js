import React, { useEffect, useState } from 'react';
import { adminPanelAccess } from './adminSession';
import { useConfirm } from './ConfirmDialog';
import './admin-academic-reviews.css';
import { listFiles, updateFile } from './db/files';
import { listReviews, updateReview, deleteReview, subscribeReviews } from './db/reviews';

// createdAt arrives as a Firestore Timestamp on the Firebase branch and as an
// ISO string on the Supabase branch — normalize both to epoch millis.
const tsMillis = (v) => {
  if (!v) return 0;
  if (typeof v === 'object') {
    if (typeof v.toMillis === 'function') { try { return v.toMillis(); } catch (_) { return 0; } }
    if (typeof v.toDate === 'function') { try { return v.toDate().getTime(); } catch (_) { return 0; } }
    if (v instanceof Date) return v.getTime();
  }
  const ms = new Date(v).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

export default function AdminAcademicReviews({ user }) {
  const [files, setFiles] = useState([]);
  const [fileCursor, setFileCursor] = useState(null);
  const [hasMoreFiles, setHasMoreFiles] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [filter, setFilter] = useState('');
  const [reviews, setReviews] = useState([]);
  const [editingId, setEditingId] = useState('');
  const [editText, setEditText] = useState('');
  const [editRating, setEditRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [rightsFile, setRightsFile] = useState('');
  const [rightsBasis, setRightsBasis] = useState('');
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const permitted = adminPanelAccess(user);
  const { requestConfirm, ConfirmUI } = useConfirm();

  useEffect(() => {
    if (!permitted) return;
    let active = true;
    listFiles({ limit: 100, activeOnly: false }).then(({ items, cursor, hasMore }) => {
      if (!active) return;
      setFiles(items);
      setFileCursor(cursor);
      setHasMoreFiles(hasMore);
    }).catch(() => { if (active) setNotice('Could not load file records. Check admin permissions.'); });
    return () => { active = false; };
  }, [permitted]);

  useEffect(() => {
    if (!permitted || !selectedId) { setReviews([]); return; }
    setEditingId(''); setReviews([]);
    let active = true;
    // The adapter returns the full review list (no pagination); the legacy
    // 100-per-page "load more" pager is retired — every review loads at once.
    const refresh = async () => {
      try {
        const items = await listReviews(selectedId, { status: 'all' });
        if (!active) return;
        setReviews([...items].sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt)));
      } catch (_) {
        if (active) setNotice('Could not load reviews. Check published Firestore rules.');
      }
    };
    refresh();
    const unsub = subscribeReviews(selectedId, { status: 'all', onInvalidate: refresh });
    return () => { active = false; unsub(); };
  }, [permitted, selectedId]);

  const moreFiles = async () => {
    if (!fileCursor || busy) return;
    setBusy(true);
    try {
      const { items, cursor, hasMore } = await listFiles({ limit: 100, cursor: fileCursor, activeOnly: false });
      setFiles((prev) => [...prev, ...items]);
      setFileCursor(cursor);
      setHasMoreFiles(hasMore);
    } catch (_) { setNotice('Unable to load more files.'); } finally { setBusy(false); }
  };
  const begin = (review) => { setEditingId(review.id); setEditText(String(review.comment || '')); setEditRating(Number(review.rating || 5)); setNotice(''); };
  const save = async (review) => {
    if (!permitted || busy || editText.trim().length < 20 || editText.trim().length > 50000) return;
    setBusy(true); setNotice('');
    try {
      await updateReview(selectedId, review.id, {
        comment: editText.trim(), rating: Number(editRating), editedAt: new Date()
      });
      setEditingId(''); setNotice('Review saved. The original author text is retained in the review record.');
    } catch (_) { setNotice('Could not save review. Check admin permissions.'); } finally { setBusy(false); }
  };
  const remove = async (review) => {
    if (!permitted || busy) return;
    requestConfirm({
      message: 'Permanently delete this review?',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        setBusy(true); setNotice('');
        try { await deleteReview(selectedId, review.id); setNotice('Review deleted.'); }
        catch (_) { setNotice('Could not delete review.'); } finally { setBusy(false); }
      },
    });
  };
  const toggleHidden = async (review) => {
    if (!permitted || busy) return;
    const next = review.isActive === false ? true : false;
    requestConfirm({
      message: next ? 'Show this review to students again?' : 'Hide this review from students? It can be shown again anytime.',
      confirmLabel: next ? 'Show' : 'Hide',
      onConfirm: async () => {
        setBusy(true); setNotice('');
        try {
          // TODO(schema): `isActive` has no column in plan §1's file_reviews
          // table and the adapter drops it on the Supabase branch — hide/show
          // persists on Firebase only until the schema/adapter gain is_active.
          await updateReview(selectedId, review.id, { isActive: next, moderatedAt: new Date() });
          setNotice(next ? 'Review is now visible to students.' : 'Review hidden from students.');
        } catch (_) { setNotice('Could not update review visibility.'); } finally { setBusy(false); }
      },
    });
  };
  const publishLegacy = async (review) => {
    if (!permitted || busy) return;
    setBusy(true); setNotice('');
    try {
      await updateReview(selectedId, review.id, { status: 'approved', moderatedAt: new Date() });
      setNotice('Earlier pending review published.');
    } catch (_) { setNotice('Unable to publish earlier review.'); } finally { setBusy(false); }
  };
  const confirmRights = async () => {
    if (!permitted || busy || !rightsFile || !rightsBasis || !rightsConfirmed) return;
    setBusy(true); setNotice('');
    try {
      await updateFile(rightsFile, {
        rightsBasis, rightsConfirmed: true, rightsConfirmedAt: new Date()
      });
      setFiles((prev)=>prev.map((item)=>item.id === rightsFile
        ? {...item,rightsBasis,rightsConfirmed:true} : item));
      setRightsFile(''); setRightsBasis(''); setRightsConfirmed(false);
      setNotice('Rights declaration recorded for the selected existing resource. This is not an independent copyright verification.');
    } catch (_) { setNotice('Could not save sharing-rights declaration.'); }
    finally { setBusy(false); }
  };
  if (!permitted) return <p>Verified administrator access is required to manage reviews.</p>;
  return <section className="edx-admin-reviews" aria-label="Manage Academic Hub file reviews">
    <h3>Academic file reviews</h3>
    <section className="edx-review-entry" aria-label="Existing file copyright audit">
      <h4>Existing file sharing-rights audit</h4>
      <p>{files.filter((file)=>!file.rightsConfirmed).length} of {files.length} loaded files still need a documented sharing-rights check. No existing files are removed or automatically declared licensed.</p>
      <label>Choose an existing file to inspect
        <select value={rightsFile} onChange={(e)=>{setRightsFile(e.target.value);setRightsConfirmed(false);setRightsBasis('');}}>
          <option value="">Select a file…</option>
          {files.filter((file)=>!file.rightsConfirmed).map((file)=><option value={file.id} key={file.id}>{file.subject || 'General'} · {file.name || file.title || file.id}</option>)}
        </select>
      </label>
      {rightsFile && <>
        <p><a href={String(files.find((file)=>file.id===rightsFile)?.url || '#')} rel="noopener noreferrer">Inspect the original file and its permissions ↗</a></p>
        <label>Verified sharing basis<select value={rightsBasis} onChange={(e)=>setRightsBasis(e.target.value)}><option value="">Choose only after checking the actual document</option><option value="original-work">Original work owned by EduNexus</option><option value="written-permission">Written permission from copyright owner</option><option value="open-license">Licence permits redistribution</option><option value="public-domain">Verified public-domain work</option></select></label>
        <label><input type="checkbox" checked={rightsConfirmed} onChange={(e)=>setRightsConfirmed(e.target.checked)} style={{width:'auto',marginRight:8}}/> I checked the sharing rights of this exact existing resource and can support this declaration.</label>
        <button type="button" disabled={busy || !rightsBasis || !rightsConfirmed} onClick={confirmRights}>Record rights declaration</button>
      </>}
    </section>
    <p>New student reviews publish automatically. Select a file below to edit, remove or inspect its genuine submitted reviews. Earlier pending records can still be published.</p>
    {notice && <p role="status" className="edx-review-message">{notice}</p>}
    <label>Find a resource <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search the loaded files by title or course code" /></label>
    <label>Resource <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}><option value="">Select a file…</option>{files.filter((f) => [f.name, f.subject].some((part) => String(part || '').toLowerCase().includes(filter.toLowerCase()))).map((f) => <option key={f.id} value={f.id}>{f.subject || 'General'} · {f.name || f.title || f.id}</option>)}</select></label>
    {hasMoreFiles && <button type="button" disabled={busy} onClick={moreFiles}>Load more file records</button>}
    {selectedId && (reviews.length ? <div className="edx-review-grid">{reviews.map((r) => <article key={r.id} className="edx-review-entry">
      <strong>{r.rating} / 5 · {r.status === 'approved' ? 'Published' : r.status || 'Earlier review'} {r.editedAt ? '· edited by admin' : ''}</strong>
      <p>{String(r.comment || '')}</p>
      <div className="edx-review-actions"><button type="button" disabled={busy} onClick={() => begin(r)}>Edit</button><button type="button" disabled={busy} onClick={() => toggleHidden(r)}>{r.isActive === false ? 'Show' : 'Hide'}</button><button type="button" disabled={busy} onClick={() => remove(r)}>Delete</button>{r.status === 'pending' && <button type="button" disabled={busy} onClick={() => publishLegacy(r)}>Publish earlier review</button>}</div>
      {editingId === r.id && <div className="edx-review-editor"><label>Rating <select value={editRating} onChange={(e) => setEditRating(Number(e.target.value))}>{[1,2,3,4,5].map((n) => <option value={n} key={n}>{n} / 5</option>)}</select></label><label>Edit published text <textarea rows={7} maxLength={50000} value={editText} onChange={(e) => setEditText(e.target.value)} /></label><div className="edx-review-actions"><button type="button" disabled={busy || editText.trim().length < 20} onClick={() => save(r)}>Save review</button><button type="button" onClick={() => setEditingId('')}>Cancel</button></div></div>}
    </article>)}</div> : <p>No reviews found for this file.</p>)}
    <ConfirmUI />
  </section>;
}
