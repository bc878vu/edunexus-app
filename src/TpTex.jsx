// src/TpTex.jsx — LaTeX ($...$) rendering for course-test questions.
// Port of the vu-test Tex component; katex is already a dependency of
// EduNexus (used by RichContent), so no new package is needed.

import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export function TpTex({ text }) {
  if (text === null || text === undefined) return null;
  const parts = String(text).split(/(\$[^$]+\$)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.length > 2 && part.startsWith('$') && part.endsWith('$')) {
          let html = '';
          try { html = katex.renderToString(part.slice(1, -1), { throwOnError: false }); } catch (_) { html = ''; }
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// Real HTML table for truth tables (headers/rows may contain $...$ LaTeX).
// The DB column is table_json; vu-test normalized it to `table`.
export function TpTruthTable({ table }) {
  if (!table || !table.headers) return null;
  return (
    <table className="edx-course-truth">
      <thead><tr>{table.headers.map((h, i) => (<th key={i}><TpTex text={h} /></th>))}</tr></thead>
      <tbody>{table.rows.map((row, r) => (
        <tr key={r}>{row.map((cell, c) => (<td key={c}><TpTex text={cell} /></td>))}</tr>
      ))}</tbody>
    </table>
  );
}

// Normalize a DB question row: table_json -> table, options object -> array.
export function normalizeTpQuestion(q) {
  if (!q) return q;
  const out = { ...q };
  if (q.table_json !== undefined) out.table = q.table_json;
  if (q.options && !Array.isArray(q.options)) {
    out.options = ['A', 'B', 'C', 'D'].map((k) => q.options[k]).filter((v) => v !== undefined);
  }
  return out;
}
