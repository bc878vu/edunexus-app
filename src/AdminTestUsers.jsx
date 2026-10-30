// src/AdminTestUsers.jsx — Test-paper students: list, progress, full CRUD.
//
// A "student" is grouped from attempts (VU ID preferred) on this sign-in-free
// site; the admin can also ADD a student manually (no attempts yet — e.g. to
// assign papers to a VU ID before they ever submit). Full CRUD:
//   Create — Add student form (name + VU ID + optional note).
//   Read   — search + per-student progress (attempts, subject averages).
//   Update — Edit name / VU ID (updates ALL of that student's attempts at
//            once, plus their manual entry if one exists).
//   Delete — two-step; deletes the manual entry AND all of their attempts.
// Teacher marking itself stays in the Paper Attempts tab.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { adminPanelAccess } from './adminSession';
import { usePaperAttempts, clearPaperAttemptsCache } from './usePaperAttempts';
import { listPaperAttempts, updateStudentIdentity, deleteStudentAttempts } from './db/paperAttempts';
import { listManualStudents, saveManualStudent, deleteManualStudent } from './db/testPaperAdmin';
import { groupStudents, mergeManualStudents, attemptDate, attemptPct } from './testPaperStats';

function fmtDate(d) {
  if (!d) return '—';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AdminTestUsers({ user }) {
  const { attempts: cachedAttempts, loading } = usePaperAttempts();
  const [attemptsOverride, setAttemptsOverride] = useState(null);
  const attempts = attemptsOverride || cachedAttempts;
  const [manual, setManual] = useState([]);
  const [query, setQuery] = useState('');
  const [openKey, setOpenKey] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const [editName, setEditName] = useState('');
  const [editVuId, setEditVuId] = useState('');
  const [newName, setNewName] = useState('');
  const [newVuId, setNewVuId] = useState('');
  const [newNote, setNewNote] = useState('');

  const reloadManual = useCallback(async () => {
    try {
      setManual(await listManualStudents());
    } catch (_) {
      setManual([]);
    }
  }, []);

  useEffect(() => {
    reloadManual();
  }, [reloadManual]);

  const refreshAttempts = useCallback(async () => {
    clearPaperAttemptsCache();
    try {
      setAttemptsOverride(await listPaperAttempts(200));
    } catch (_) {
      setAttemptsOverride([]);
    }
  }, []);

  const students = useMemo(() => mergeManualStudents(groupStudents(attempts), manual), [attempts, manual]);
  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return students;
    return students.filter((s) => s.vuId.toUpperCase().includes(q) || s.name.toUpperCase().includes(q));
  }, [students, query]);

  if (!adminPanelAccess(user)) {
    return (
      <section className="edx-exam-card" role="alert">
        <h3>Admin access required</h3>
        <p>Students sirf verified administrator dekh sakta hai.</p>
      </section>
    );
  }

  const vuTaken = (vuId, exceptKey) => students.some((s) => s.key !== exceptKey && s.vuId.toUpperCase() === vuId.toUpperCase());

  const onAdd = async () => {
    const name = newName.trim();
    const vuId = newVuId.trim();
    if (name.length < 2 || !vuId) {
      setError('Naam (kam az kam 2 harf) aur VU ID dono zaroori hain.');
      return;
    }
    if (vuTaken(vuId, null)) {
      setError(`Is VU ID ka student pehle se maujood hai: ${vuId}`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await saveManualStudent({ name, vuId, note: newNote.trim() });
      setNotice(`Student add ho gaya: ${name} (${vuId}).`);
      setNewName('');
      setNewVuId('');
      setNewNote('');
      await reloadManual();
    } catch (e) {
      setError('Add nahi hua: ' + (e && e.message ? e.message : 'unknown error'));
    }
    setBusy(false);
  };

  const startEdit = (s) => {
    setEditingKey(s.key);
    setEditName(s.name === 'Unnamed' ? '' : s.name);
    setEditVuId(s.vuId === '—' ? '' : s.vuId);
    setError('');
  };

  const onEditSave = async (s) => {
    const name = editName.trim();
    const vuId = editVuId.trim();
    if (name.length < 2 || !vuId) {
      setError('Naam (kam az kam 2 harf) aur VU ID dono zaroori hain.');
      return;
    }
    if (vuTaken(vuId, s.key)) {
      setError(`Is VU ID ka student pehle se maujood hai: ${vuId}`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (s.count > 0) await updateStudentIdentity(s.vuId, { studentName: name, studentVuId: vuId });
      if (s.manualId) await saveManualStudent({ id: s.manualId, name, vuId, note: s.manualNote || '' });
      setNotice(`Student update ho gaya: ${name} (${vuId}).`);
      setEditingKey(null);
      await refreshAttempts();
      await reloadManual();
    } catch (e) {
      setError('Update nahi hua: ' + (e && e.message ? e.message : 'unknown error'));
    }
    setBusy(false);
  };

  const onDelete = async (s) => {
    if (confirmDelete !== s.key) {
      setConfirmDelete(s.key);
      return;
    }
    setBusy(true);
    setError('');
    try {
      let removed = 0;
      if (s.count > 0) removed = await deleteStudentAttempts(s.vuId);
      if (s.manualId) await deleteManualStudent(s.manualId);
      setNotice(`Student delete ho gaya: ${s.name} (${s.vuId})${removed ? ` — ${removed} attempts bhi delete hue.` : ''}`);
      setConfirmDelete('');
      setOpenKey(null);
      await refreshAttempts();
      await reloadManual();
    } catch (e) {
      setError('Delete nahi hua: ' + (e && e.message ? e.message : 'unknown error'));
    }
    setBusy(false);
  };

  return (
    <section className="edx-exam-card edx-exam-form">
      <h3>Students — progress + manage</h3>
      <p>Attempts se bane students: VU ID, naam, attempts, average MCQ score, aakhri attempt. Kisi student par click kar ke us ki poori progress dekhein. Naya student add karein, naam/VU ID edit karein, ya student delete karein (us ke attempts samet).</p>

      <h4>Add student</h4>
      <label className="edx-exam-field">Naam
        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Jaise Asad Amanat Ali" />
      </label>
      <label className="edx-exam-field">VU ID
        <input type="text" value={newVuId} onChange={(e) => setNewVuId(e.target.value)} placeholder="Jaise BC230400878" />
      </label>
      <label className="edx-exam-field">Note (optional)
        <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Jaise: assigned paper pending" />
      </label>
      <div className="edx-exam-actions">
        <button type="button" className="edx-exam-primary" disabled={busy} onClick={onAdd}>{busy ? 'Save ho raha hai…' : 'Add student'}</button>
      </div>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}

      <label className="edx-exam-field">Search VU ID ya naam
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Jaise BC230400878 ya Asad" />
      </label>
      {loading && <p role="status">Loading…</p>}
      {!loading && filtered.length === 0 && <p>Koi student nahi mila.</p>}
      {!loading && filtered.map((s) => {
        const open = openKey === s.key;
        const bySubject = new Map();
        s.attempts.forEach((a) => {
          const code = a.paperCode || a.paperSlug || 'Unknown';
          const row = bySubject.get(code) || { code, count: 0, pctSum: 0, pctCount: 0 };
          row.count += 1;
          const p = attemptPct(a);
          if (p !== null) {
            row.pctSum += p;
            row.pctCount += 1;
          }
          bySubject.set(code, row);
        });
        return (
          <div key={s.key} style={{ border: '1px solid rgba(127,127,127,0.3)', borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <button type="button" className="edx-exam-secondary" onClick={() => setOpenKey(open ? null : s.key)} style={{ width: '100%', textAlign: 'left' }}>
              <strong>{s.name}</strong> · VU ID {s.vuId} · {s.count} attempts · Avg {s.avgPct !== null ? `${s.avgPct}%` : '—'} · Last {fmtDate(s.lastAttempt)}
              {s.manual ? ' · manual entry' : ''}
            </button>
            {editingKey === s.key ? (
              <div style={{ marginTop: 10 }}>
                <label className="edx-exam-field">Naam
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </label>
                <label className="edx-exam-field">VU ID
                  <input type="text" value={editVuId} onChange={(e) => setEditVuId(e.target.value)} />
                </label>
                <p>{s.count > 0 ? `Ye naam/VU ID is student ke ${s.count} attempts par bhi update ho jayega.` : 'Is student ke abhi koi attempts nahi hain.'}</p>
                <div className="edx-exam-actions">
                  <button type="button" className="edx-exam-primary" disabled={busy} onClick={() => onEditSave(s)}>Save changes</button>
                  <button type="button" className="edx-exam-secondary" onClick={() => setEditingKey(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <button type="button" className="edx-exam-secondary" onClick={() => startEdit(s)}>Edit</button>
                <button type="button" className="edx-exam-secondary" disabled={busy} onClick={() => onDelete(s)}>
                  {confirmDelete === s.key ? (s.count > 0 ? `Confirm delete? (${s.count} attempts bhi delete honge)` : 'Confirm delete?') : 'Delete'}
                </button>
              </div>
            )}
            {open && (
              <div style={{ marginTop: 10 }}>
                {s.manualNote && <p><strong>Note:</strong> {s.manualNote}</p>}
                {s.count === 0 && <p>Is student ne abhi koi paper submit nahi kiya.</p>}
                {s.count > 0 && (
                  <>
                    <p><strong>Subject wise:</strong> {[...bySubject.values()].map((r) => `${r.code}: ${r.count} attempts${r.pctCount ? `, avg ${Math.round(r.pctSum / r.pctCount)}%` : ''}`).join(' · ')}</p>
                    <ul>
                      {[...s.attempts].sort((a, b) => (attemptDate(b) || 0) - (attemptDate(a) || 0)).map((a) => {
                        const p = attemptPct(a);
                        return (
                          <li key={a.id}>
                            {fmtDate(attemptDate(a))} · {a.paperCode || a.paperSlug} · MCQ {a.mcqScore ?? '—'}/{a.mcqTotal ?? '—'}{p !== null ? ` (${p}%)` : ''} · {a.status || 'submitted'}
                            {a.teacherFeedback ? ` · Teacher: ${a.teacherFeedback}` : ''}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
