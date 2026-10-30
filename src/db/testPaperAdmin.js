// src/db/testPaperAdmin.js — Admin-managed test-paper records, stored in Supabase.
//
// User decision 2026-10-30: NO Firestore for the new test-paper admin
// features — Supabase only (same reason as testPaperBanks.js: the Firestore
// meta write failed live on permissions, while the site's Supabase content
// tables work anon-friendly with UI-level admin gating).
//
// Table `test_paper_records` (created by the SQL file
// ~/workspace/testpapers/supabase-testpaper-admin.sql, run by the user):
//   id text, kind text, data jsonb, created_at.
// Kinds:
//   savedPaper     — an admin-built fixed paper (title + subject + lectures
//                    + targets). Students see it as a ready-made card.
//   paperPattern   — a saved share link (name + subject + lectures + targets),
//                    grouped by subject in the admin panel.
//   paperAssignment— a saved paper/pattern assigned to VU IDs. Students find
//                    their assignments by entering their VU ID on /test-papers.

import { supabase } from './_common.js';

const TABLE = 'test_paper_records';

/** Row (Supabase) -> record (id + data fields). Pure, unit-tested. */
export function mapRecordRow(row) {
  const { id, kind, data } = row;
  return { id, kind, ...(data || {}) };
}

async function listKind(kind) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('kind', kind);
  if (error) throw error;
  return (data || []).map(mapRecordRow);
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function saveKind(kind, record) {
  const id = record.id || newId();
  const { id: _drop, kind: _dropKind, ...data } = record;
  const { error } = await supabase.from(TABLE).upsert({ id, kind, data });
  if (error) throw error;
  return id;
}

async function deleteKind(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export function listSavedPapers() {
  return listKind('savedPaper');
}

export function saveSavedPaper(paper) {
  return saveKind('savedPaper', paper);
}

export function deleteSavedPaper(id) {
  return deleteKind(id);
}

export function listSavedPatterns() {
  return listKind('paperPattern');
}

export function saveSavedPattern(pattern) {
  return saveKind('paperPattern', pattern);
}

export function deleteSavedPattern(id) {
  return deleteKind(id);
}

export function listAssignments() {
  return listKind('paperAssignment');
}

export function saveAssignment(assignment) {
  return saveKind('paperAssignment', assignment);
}

export function deleteAssignment(id) {
  return deleteKind(id);
}
