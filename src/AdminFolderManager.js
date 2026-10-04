import React, { useEffect, useMemo, useState } from 'react';
import './AdminFolderManager.css';
import { listFiles, listFilesBySubjects, getMetaDoc, updateFile, deleteFile } from './db/files';
import { adminPanelAccess } from './adminSession';
import {
  Folder, FolderOpen, Search, ChevronDown, ChevronRight,
  FileText, Eye, Pencil, Trash2, X, Loader2
} from 'lucide-react';

/**
 * AdminFolderManager — professional folder browser for the admin panel.
 *
 * Features:
 * - Live search across folder names
 * - Folders sorted alphabetically with file counts
 * - Click a folder to expand and see its files inline
 * - Per-file quick actions: preview, edit title/description, delete
 * - Fully responsive, no existing data modified on load
 */
export default function AdminFolderManager({ user }) {
  const [folders, setFolders] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [openFolder, setOpenFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Load folder list + counts once
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        // fileCounts from meta/folders (denormalized, maintained by uploads/deletes)
        const meta = await getMetaDoc('folders').catch(() => null);
        const metaCounts = (meta && meta.fileCounts) || {};
        // Distinct subjects from a broad file listing as fallback
        const all = await listFiles({ limit: 2000 }).catch(() => []);
        const seen = {};
        (Array.isArray(all) ? all : []).forEach((f) => {
          const s = String(f.subject || f.folder || 'General').trim() || 'General';
          seen[s] = (seen[s] || 0) + 1;
        });
        const merged = { ...seen };
        Object.keys(metaCounts).forEach((k) => {
          if (typeof metaCounts[k] === 'number') merged[k] = metaCounts[k];
        });
        if (!alive) return;
        const names = Object.keys(merged).sort((a, b) => a.localeCompare(b));
        setFolders(names);
        setCounts(merged);
      } catch (e) {
        if (alive) setError('Could not load folders: ' + (e?.message || 'unknown error'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return folders;
    return folders.filter((f) => f.toLowerCase().includes(q));
  }, [folders, query]);

  const toggleFolder = async (name) => {
    if (openFolder === name) {
      setOpenFolder(null);
      setFiles([]);
      return;
    }
    setOpenFolder(name);
    setFiles([]);
    setFilesLoading(true);
    setError('');
    try {
      const rows = await listFilesBySubjects([name], { limit: 400 });
      setFiles(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setError('Could not load files for ' + name + ': ' + (e?.message || 'unknown error'));
    } finally {
      setFilesLoading(false);
    }
  };

  const startEdit = (f) => {
    setEditing(f.id);
    setEditTitle(f.name || f.title || '');
    setEditDesc(f.description || '');
  };

  const saveEdit = async (id) => {
    if (!adminPanelAccess(user)) {
      setError('Sign in as the administrator to edit files.');
      return;
    }
    setSaving(true);
    try {
      await updateFile(id, {
        name: editTitle.trim().slice(0, 150),
        title: editTitle.trim().slice(0, 150),
        description: editDesc.trim().slice(0, 1000),
      });
      setFiles((rows) =>
        rows.map((r) =>
          r.id === id ? { ...r, name: editTitle.trim(), title: editTitle.trim(), description: editDesc.trim() } : r
        )
      );
      setEditing(null);
      setNotice('File details updated.');
      setTimeout(() => setNotice(''), 2500);
    } catch (e) {
      setError('Could not save: ' + (e?.message || 'unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const removeFile = async (f) => {
    if (!adminPanelAccess(user)) {
      setError('Sign in as the administrator to delete files.');
      return;
    }
    const ok = window.confirm('Delete "' + (f.name || f.title || f.id) + '" permanently?');
    if (!ok) return;
    try {
      await deleteFile(f.id);
      setFiles((rows) => rows.filter((r) => r.id !== f.id));
      const subj = String(f.subject || openFolder || 'General');
      setCounts((c) => ({ ...c, [subj]: Math.max(0, (c[subj] || 1) - 1) }));
      setNotice('File deleted.');
      setTimeout(() => setNotice(''), 2500);
    } catch (e) {
      setError('Could not delete: ' + (e?.message || 'unknown error'));
    }
  };

  const totalFiles = useMemo(
    () => Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0),
    [counts]
  );

  return (
    <section className="edx-afm" aria-label="Admin folder manager">
      <div className="edx-afm-head">
        <div>
          <span className="ah-eyebrow">Administrator workspace · Library folders</span>
          <h3>Folder manager</h3>
          <p>
            {folders.length} folders · {totalFiles} files · Click a folder to see its files.
          </p>
        </div>
        <label className="edx-afm-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search folders… (e.g. CS620)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search folders"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </label>
      </div>

      {error && <p className="ah-message ah-upload-error" role="alert">{error}</p>}
      {notice && <p className="ah-message ah-upload-success" role="status">{notice}</p>}

      {loading ? (
        <p className="edx-afm-loading"><Loader2 size={18} className="spin" /> Loading folders…</p>
      ) : filtered.length === 0 ? (
        <p className="edx-afm-empty">
          {query ? 'No folders match "' + query + '".' : 'No folders found.'}
        </p>
      ) : (
        <ul className="edx-afm-list">
          {filtered.map((name) => {
            const open = openFolder === name;
            const count = Number(counts[name]) || 0;
            return (
              <li key={name} className={'edx-afm-item' + (open ? ' is-open' : '')}>
                <button
                  type="button"
                  className="edx-afm-folder"
                  onClick={() => toggleFolder(name)}
                  aria-expanded={open}
                >
                  <span className="edx-afm-folder-icon">
                    {open ? <FolderOpen size={20} /> : <Folder size={20} />}
                  </span>
                  <span className="edx-afm-folder-name">{name}</span>
                  <span className="edx-afm-count" title={count + ' files'}>
                    {count} {count === 1 ? 'file' : 'files'}
                  </span>
                  <span className="edx-afm-chevron">
                    {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </span>
                </button>

                {open && (
                  <div className="edx-afm-files">
                    {filesLoading ? (
                      <p className="edx-afm-loading"><Loader2 size={16} className="spin" /> Loading files…</p>
                    ) : files.length === 0 ? (
                      <p className="edx-afm-empty">This folder has no files yet.</p>
                    ) : (
                      <ul>
                        {files.map((f) => {
                          const fid = f.id;
                          const isEditing = editing === fid;
                          return (
                            <li key={fid} className="edx-afm-file">
                              <FileText size={16} className="edx-afm-file-icon" />
                              {isEditing ? (
                                <div className="edx-afm-edit">
                                  <input
                                    value={editTitle}
                                    maxLength={150}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    placeholder="File title"
                                    aria-label="File title"
                                  />
                                  <textarea
                                    value={editDesc}
                                    maxLength={1000}
                                    rows={2}
                                    onChange={(e) => setEditDesc(e.target.value)}
                                    placeholder="Description"
                                    aria-label="File description"
                                  />
                                  <div className="edx-afm-edit-actions">
                                    <button
                                      type="button"
                                      className="ah-primary"
                                      disabled={saving}
                                      onClick={() => saveEdit(fid)}
                                    >
                                      {saving ? 'Saving…' : 'Save'}
                                    </button>
                                    <button
                                      type="button"
                                      className="ah-secondary"
                                      onClick={() => setEditing(null)}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <span className="edx-afm-file-name">
                                    {f.name || f.title || fid}
                                  </span>
                                  <span className="edx-afm-file-actions">
                                    {f.url && (
                                      <a
                                        href={f.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="Preview"
                                        aria-label="Preview file"
                                      >
                                        <Eye size={15} />
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      title="Edit title / description"
                                      aria-label="Edit file"
                                      onClick={() => startEdit(f)}
                                    >
                                      <Pencil size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      title="Delete file"
                                      aria-label="Delete file"
                                      className="danger"
                                      onClick={() => removeFile(f)}
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </span>
                                </>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
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
