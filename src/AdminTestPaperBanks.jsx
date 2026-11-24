// src/AdminTestPaperBanks.jsx — Admin tab: upload test-paper banks.
//
// This is the admin-panel upload path for test-paper material: the admin
// pastes or uploads a bank JSON (code/title/term/lectures + mcqs/shorts/longs
// in the testPapersBank.js shape). The bank is validated strictly first —
// exactly 4 options per MCQ, valid answers, lecture tags inside the declared
// lectures, unique ids — and only a valid bank is saved. Saving a bank for a
// code+term that already lives in code REPLACES the code bank for students
// (so corrections go live without a code push); deleting here only removes
// the admin copy, the code bank underneath keeps working.
//
// Full CRUD: Create = upload, Read = list, Update = Edit (title + lecture
// titles) or Replace (a new validated JSON for the same code+term),
// Delete = two-step remove of the admin copy.

import React, { useCallback, useEffect, useState } from 'react';
import { adminPanelAccess } from './adminSession';
import { listAdminBanks, saveAdminBank, deleteAdminBank } from './db/testPaperBanks.js';
import { validateTestPaperBank } from './testPaperBankValidate.js';
import { BANK_SUBJECTS } from './testPapersBank';

export default function AdminTestPaperBanks({ user }) {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pasted, setPasted] = useState('');
  const [check, setCheck] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLectures, setEditLectures] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [replaceCheck, setReplaceCheck] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setBanks(await listAdminBanks());
    } catch (e) {
      setError('Bank list failed to load: ' + (e && e.message ? e.message : 'unknown error'));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!adminPanelAccess(user)) {
    return (
      <section className="edx-exam-card" role="alert">
        <h3>Admin access required</h3>
        <p>Only a verified administrator can upload test-paper banks.</p>
      </section>
    );
  }

  const onFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPasted(String(reader.result || ''));
    reader.readAsText(file);
  };

  const onValidate = () => {
    setNotice('');
    setCheck(null);
    let parsed;
    try {
      parsed = JSON.parse(pasted);
    } catch (_) {
      setCheck({ valid: false, errors: ['File is not valid JSON'] });
      return;
    }
    setCheck(validateTestPaperBank(parsed));
  };

  const onSave = async () => {
    if (!check || !check.valid) return;
    setBusy(true);
    setError('');
    try {
      const saved = await saveAdminBank(pasted);
      setNotice(`Bank saved: ${saved.code} — ${saved.title} (${saved.term}), ${saved.counts.mcqs} MCQs + ${saved.counts.shorts} shorts + ${saved.counts.longs} longs. Students will now see this bank.`);
      setPasted('');
      setCheck(null);
      await reload();
    } catch (e) {
      setError('Save failed: ' + (e && e.message ? e.message : 'unknown error'));
    }
    setBusy(false);
  };

  const onDelete = async (code, term) => {
    const key = `${code}::${term}`;
    if (confirmDelete !== key) {
      setConfirmDelete(key);
      return;
    }
    setBusy(true);
    try {
      await deleteAdminBank(code, term);
      setNotice(`Admin bank deleted: ${code} (${term}). The code bank (if any) will show again.`);
      setConfirmDelete('');
      await reload();
    } catch (e) {
      setError('Delete failed: ' + (e && e.message ? e.message : 'unknown error'));
    }
    setBusy(false);
  };

  const codeBanked = new Set(BANK_SUBJECTS.map((s) => `${s.code}::${s.term}`));

  const startEdit = (b) => {
    setEditingKey(`${b.code}::${b.term}`);
    setEditTitle(b.title);
    setEditLectures(b.lectures.map((l) => `${l.n}: ${l.title}`).join('\n'));
    setReplaceText('');
    setReplaceCheck(null);
    setError('');
  };

  const parseLectures = (text) => {
    const lectures = [];
    const seen = new Set();
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const m = line.match(/^(\d+)\s*:\s*(.+)$/);
      if (!m) return { error: `Lecture line not understood: "${line}" (format: number: title)` };
      const n = parseInt(m[1], 10);
      if (seen.has(n)) return { error: `Lecture number ${n} is duplicated.` };
      seen.add(n);
      lectures.push({ n, title: m[2].trim() });
    }
    if (!lectures.length) return { error: 'At least one lecture is required.' };
    return { lectures };
  };

  const onEditSave = async (b) => {
    const parsed = parseLectures(editLectures);
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    const updated = { ...b, title: editTitle.trim(), lectures: parsed.lectures };
    const check = validateTestPaperBank(updated);
    if (!check.valid) {
      setError('Edit was not saved — bank became invalid: ' + check.errors.join(' | '));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await saveAdminBank(updated);
      setNotice(`Bank updated: ${b.code} — ${updated.title} (${b.term}).`);
      setEditingKey(null);
      await reload();
    } catch (e) {
      setError('Update failed: ' + (e && e.message ? e.message : 'unknown error'));
    }
    setBusy(false);
  };

  const onReplaceFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setReplaceText(text);
      try {
        setReplaceCheck(validateTestPaperBank(JSON.parse(text)));
      } catch (_) {
        setReplaceCheck({ valid: false, errors: ['File is not valid JSON'] });
      }
    };
    reader.readAsText(file);
  };

  const onReplaceSave = async (b) => {
    if (!replaceCheck || !replaceCheck.valid) return;
    if (replaceCheck.bank.code !== b.code || replaceCheck.bank.term !== b.term) {
      setError(`This file belongs to ${replaceCheck.bank.code} (${replaceCheck.bank.term}) — it cannot be saved in place of ${b.code} (${b.term}).`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await saveAdminBank(replaceText);
      setNotice(`Bank replaced: ${b.code} — ${replaceCheck.bank.title} (${b.term}), ${replaceCheck.counts.mcqs} MCQs + ${replaceCheck.counts.shorts} shorts + ${replaceCheck.counts.longs} longs.`);
      setEditingKey(null);
      setReplaceText('');
      setReplaceCheck(null);
      await reload();
    } catch (e) {
      setError('Replace failed: ' + (e && e.message ? e.message : 'unknown error'));
    }
    setBusy(false);
  };

  return (
    <section className="edx-exam-card edx-exam-form">
      <h3>Test Paper Banks — admin upload</h3>
      <p>Upload test-paper material here: validate a bank JSON (code, title, term, lectures, MCQs, shorts, longs) and save it. An invalid bank is never saved, and questions are never invented. An admin bank replaces the live code bank for that code; deleting it restores the code bank.</p>

      <h4>Upload bank</h4>
      <label className="edx-exam-field">Bank JSON file
        <input type="file" accept=".json,application/json" onChange={(e) => onFile(e.target.files && e.target.files[0])} />
      </label>
      <label className="edx-exam-field">Or paste JSON
        <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={8} placeholder='{"code":"CS101","title":"...","term":"Midterm","lectures":[...],"mcqs":[...],"shorts":[...],"longs":[...]}' />
      </label>
      <div className="edx-exam-actions">
        <button type="button" className="edx-exam-secondary" disabled={!pasted.trim()} onClick={onValidate}>Validate bank</button>
        <button type="button" className="edx-exam-primary" disabled={!check || !check.valid || busy} onClick={onSave}>{busy ? 'Saving…' : 'Save bank'}</button>
      </div>
      {check && check.valid && (
        <p role="status">✓ Valid bank: {check.bank.code} — {check.bank.title} ({check.bank.term}), {check.counts.mcqs} MCQs + {check.counts.shorts} shorts + {check.counts.longs} longs, {check.counts.lectures} {(check.bank.unitLabel === 'Topic' ? 'topics' : 'lectures')}.</p>
      )}
      {check && !check.valid && (
        <div role="alert">
          <p>✗ Bank is invalid — it will not be saved:</p>
          <ul>
            {check.errors.map((e, i) => (<li key={i}>{e}</li>))}
          </ul>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}

      <h4>Admin-uploaded banks ({banks.length})</h4>
      {loading && <p>Loading…</p>}
      {!loading && banks.length === 0 && <p>No admin bank has been uploaded yet. Code banks (PHY101, ACC501) are not listed here — they live in code.</p>}
      {!loading && banks.length > 0 && (
        <ul className="edx-paper-admin-list">
          {banks.map((b) => {
            const key = `${b.code}::${b.term}`;
            const replaces = codeBanked.has(key);
            const editing = editingKey === key;
            return (
              <li key={key} className="edx-paper-admin-row">
                <span className="edx-paper-admin-row-text"><strong>{b.code}</strong> — {b.title} ({b.term}) · {b.mcqs.length} MCQs + {b.shorts.length} shorts + {b.longs.length} longs · {b.lectures.length} {(b.unitLabel === 'Topic' ? 'topics' : 'lectures')}
                {replaces ? ' · live in place of the code bank' : ' · new subject'}</span>
                <span className="edx-paper-admin-row-actions">
                <button type="button" className="edx-exam-secondary" disabled={busy} onClick={() => (editing ? setEditingKey(null) : startEdit(b))}>
                  {editing ? 'Close edit' : 'Edit'}
                </button>
                <button type="button" className="edx-exam-secondary" disabled={busy} onClick={() => onDelete(b.code, b.term)}>
                  {confirmDelete === key ? 'Confirm delete?' : 'Delete'}
                </button>
                </span>
                {editing && (
                  <div style={{ marginTop: 10, border: '1px solid rgba(127,127,127,0.3)', borderRadius: 12, padding: 12 }}>
                    <label className="edx-exam-field">Title
                      <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    </label>
                    <label className="edx-exam-field">Lectures (one per line: number: title)
                      <textarea value={editLectures} onChange={(e) => setEditLectures(e.target.value)} rows={6} />
                    </label>
                    <p>The term cannot be changed (it identifies the bank) — to change the term, delete and re-upload. Question counts and options cannot be edited here; to change the whole bank, use Replace.</p>
                    <div className="edx-exam-actions">
                      <button type="button" className="edx-exam-primary" disabled={busy} onClick={() => onEditSave(b)}>Save changes</button>
                    </div>
                    <label className="edx-exam-field">Replace — new JSON file (must be for the same code + term)
                      <input type="file" accept=".json,application/json" onChange={(e) => onReplaceFile(e.target.files && e.target.files[0])} />
                    </label>
                    {replaceCheck && replaceCheck.valid && (
                      <p role="status">✓ Replace file valid: {replaceCheck.bank.code} — {replaceCheck.bank.title} ({replaceCheck.bank.term}), {replaceCheck.counts.mcqs} MCQs + {replaceCheck.counts.shorts} shorts + {replaceCheck.counts.longs} longs.</p>
                    )}
                    {replaceCheck && !replaceCheck.valid && (
                      <p role="alert">✗ Replace file invalid: {replaceCheck.errors.join(' | ')}</p>
                    )}
                    <div className="edx-exam-actions">
                      <button type="button" className="edx-exam-primary" disabled={!replaceCheck || !replaceCheck.valid || busy} onClick={() => onReplaceSave(b)}>Replace bank</button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
