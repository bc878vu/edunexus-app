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

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setBanks(await listAdminBanks());
    } catch (e) {
      setError('Bank list load nahi hui: ' + (e && e.message ? e.message : 'unknown error'));
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
        <p>Test-paper banks sirf verified administrator upload kar sakta hai.</p>
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
      setCheck({ valid: false, errors: ['File valid JSON nahi hai'] });
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
      setNotice(`Bank save ho gaya: ${saved.code} — ${saved.title} (${saved.term}), ${saved.counts.mcqs} MCQs + ${saved.counts.shorts} shorts + ${saved.counts.longs} longs. Students ko ab yehi bank dikhega.`);
      setPasted('');
      setCheck(null);
      await reload();
    } catch (e) {
      setError('Save nahi hua: ' + (e && e.message ? e.message : 'unknown error'));
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
      setNotice(`Admin bank delete ho gaya: ${code} (${term}). Code wala bank (agar hai) wapas dikhega.`);
      setConfirmDelete('');
      await reload();
    } catch (e) {
      setError('Delete nahi hua: ' + (e && e.message ? e.message : 'unknown error'));
    }
    setBusy(false);
  };

  const codeBanked = new Set(BANK_SUBJECTS.map((s) => `${s.code}::${s.term}`));

  return (
    <section className="edx-exam-card edx-exam-form">
      <h3>Test Paper Banks — admin upload</h3>
      <p>Yahan se test-paper material upload hota hai: bank JSON (code, title, term, lectures, MCQs, shorts, longs) validate kar ke save karein. Ghalat bank kabhi save nahi hota, aur sawal kabhi invent nahi hote. Jo code pehle se code mein live hai, us ka admin bank us ki jagah le lega; delete karne par code wala bank wapas aa jayega.</p>

      <h4>Upload bank</h4>
      <label className="edx-exam-field">Bank JSON file
        <input type="file" accept=".json,application/json" onChange={(e) => onFile(e.target.files && e.target.files[0])} />
      </label>
      <label className="edx-exam-field">Ya JSON paste karein
        <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={8} placeholder='{"code":"CS101","title":"...","term":"Midterm","lectures":[...],"mcqs":[...],"shorts":[...],"longs":[...]}' />
      </label>
      <div className="edx-exam-actions">
        <button type="button" className="edx-exam-secondary" disabled={!pasted.trim()} onClick={onValidate}>Validate bank</button>
        <button type="button" className="edx-exam-primary" disabled={!check || !check.valid || busy} onClick={onSave}>{busy ? 'Save ho raha hai…' : 'Save bank'}</button>
      </div>
      {check && check.valid && (
        <p role="status">✓ Valid bank: {check.bank.code} — {check.bank.title} ({check.bank.term}), {check.counts.mcqs} MCQs + {check.counts.shorts} shorts + {check.counts.longs} longs, {check.counts.lectures} lectures.</p>
      )}
      {check && !check.valid && (
        <div role="alert">
          <p>✗ Bank invalid hai — save nahi hoga:</p>
          <ul>
            {check.errors.map((e, i) => (<li key={i}>{e}</li>))}
          </ul>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}

      <h4>Admin-uploaded banks ({banks.length})</h4>
      {loading && <p>Loading…</p>}
      {!loading && banks.length === 0 && <p>Abhi koi admin bank upload nahi hua. Code wale banks (PHY101, ACC501) yahan list nahi hote — wo code mein hain.</p>}
      {!loading && banks.length > 0 && (
        <ul>
          {banks.map((b) => {
            const key = `${b.code}::${b.term}`;
            const replaces = codeBanked.has(key);
            return (
              <li key={b.id}>
                <strong>{b.code}</strong> — {b.title} ({b.term}) · {b.mcqs.length} MCQs + {b.shorts.length} shorts + {b.longs.length} longs · {b.lectures.length} lectures
                {replaces ? ' · code bank ki jagah live' : ' · naya subject'}
                {' '}
                <button type="button" className="edx-exam-secondary" disabled={busy} onClick={() => onDelete(b.code, b.term)}>
                  {confirmDelete === key ? 'Confirm delete?' : 'Delete'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
