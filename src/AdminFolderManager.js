import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './AdminFolderManager.css';
import {
  listFiles, getMetaDoc, setMetaDoc, updateFile, deleteFile,
  subscribeFiles, subscribeMetaDoc
} from './db/files';
import { adminPanelAccess } from './adminSession';
import {
  Folder, FolderOpen, Search, ChevronDown, ChevronRight,
  FileText, Eye, Pencil, Trash2, X, Loader2, Plus, Merge,
  Save, MoveRight, RefreshCw, ShieldCheck
} from 'lucide-react';

// General is the only system folder. Course folders are fully CRUD-manageable.
const SYSTEM_FOLDERS = ['General'];
const PROTECTED_KEYS = new Set(SYSTEM_FOLDERS.map((name) => folderKey(name)));

function cleanFolderName(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

// Duplicate identity intentionally ignores case, spaces and punctuation.
// Examples: CS 201 === CS201, while CS201P !== CS201.
function folderKey(value) {
  return cleanFolderName(value)
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, '');
}

function naturalFolderCompare(a, b) {
  return cleanFolderName(a).localeCompare(cleanFolderName(b), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function uniqueNames(values) {
  const byKey = new Map();
  for (const raw of values || []) {
    const name = cleanFolderName(raw);
    const key = folderKey(name);
    if (!name || !key || byKey.has(key)) continue;
    byKey.set(key, name);
  }
  return [...byKey.values()].sort(naturalFolderCompare);
}

function chooseCanonical(aliases, exactCounts) {
  return [...aliases].sort((a, b) => {
    const byUsage = (exactCounts.get(b) || 0) - (exactCounts.get(a) || 0);
    if (byUsage) return byUsage;
    const compactA = /^[A-Za-z]{2,6}\d{3}[A-Za-z]?$/.test(a) ? 0 : 1;
    const compactB = /^[A-Za-z]{2,6}\d{3}[A-Za-z]?$/.test(b) ? 0 : 1;
    if (compactA !== compactB) return compactA - compactB;
    if (a.length !== b.length) return a.length - b.length;
    return naturalFolderCompare(a, b);
  })[0];
}

function buildFolderGroups(metaList, files) {
  const rows = Array.isArray(files) ? files : [];
  const aliasesByKey = new Map();
  const exactCounts = new Map();

  const addAlias = (raw) => {
    const name = cleanFolderName(raw || 'General') || 'General';
    const key = folderKey(name) || folderKey('General');
    const bucket = aliasesByKey.get(key) || new Set();
    bucket.add(name);
    aliasesByKey.set(key, bucket);
  };

  SYSTEM_FOLDERS.forEach(addAlias);
  (Array.isArray(metaList) ? metaList : []).forEach(addAlias);
  rows.forEach((file) => {
    const name = cleanFolderName(file.subject || file.folder || 'General') || 'General';
    addAlias(name);
    exactCounts.set(name, (exactCounts.get(name) || 0) + 1);
  });

  return [...aliasesByKey.entries()].map(([key, aliasSet]) => {
    const aliases = [...aliasSet].sort(naturalFolderCompare);
    const name = chooseCanonical(aliases, exactCounts);
    const groupFiles = rows.filter((file) => folderKey(file.subject || file.folder || 'General') === key);
    return { key, name, aliases, files: groupFiles, count: groupFiles.length };
  }).sort((a, b) => naturalFolderCompare(a.name, b.name));
}

function safeHttpUrl(value) {
  try {
    const parsed = new URL(String(value || ''));
    return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : '';
  } catch (_) {
    return '';
  }
}

export default function AdminFolderManager({ user }) {
  const [metaList, setMetaList] = useState([]);
  const [allFiles, setAllFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [openKey, setOpenKey] = useState('');
  const [newFolder, setNewFolder] = useState('');
  const [editingKey, setEditingKey] = useState('');
  const [editingName, setEditingName] = useState('');
  const [editingFile, setEditingFile] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editFolder, setEditFolder] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const groups = useMemo(() => buildFolderGroups(metaList, allFiles), [metaList, allFiles]);
  const groupByKey = useMemo(() => new Map(groups.map((group) => [group.key, group])), [groups]);
  const folderNames = useMemo(() => groups.map((group) => group.name), [groups]);
  const duplicateGroups = useMemo(() => groups.filter((group) => group.aliases.length > 1), [groups]);

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setRefreshing(true);
    setError('');
    try {
      const [meta, page] = await Promise.all([
        getMetaDoc('folders').catch(() => null),
        listFiles({ limit: 10000, activeOnly: false }),
      ]);
      setMetaList(Array.isArray(meta?.list) ? meta.list : []);
      setAllFiles(Array.isArray(page?.items) ? page.items : []);
    } catch (e) {
      setError('Could not load the folder library: ' + (e?.message || 'unknown error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const safeRefresh = () => { if (alive) refresh({ quiet: true }); };
    refresh();
    const unsubFiles = subscribeFiles({ limit: 10000, onInvalidate: safeRefresh });
    const unsubFolders = subscribeMetaDoc('folders', { onInvalidate: safeRefresh });
    return () => {
      alive = false;
      try { unsubFiles(); } catch (_) {}
      try { unsubFolders(); } catch (_) {}
    };
  }, [refresh]);

  useEffect(() => {
    if (openKey && !groupByKey.has(openKey)) setOpenKey('');
  }, [openKey, groupByKey]);

  const filtered = useMemo(() => {
    const needle = cleanFolderName(query).toLocaleLowerCase('en-US');
    if (!needle) return groups;
    const compactNeedle = folderKey(needle);
    return groups.filter((group) => {
      if (group.name.toLocaleLowerCase('en-US').includes(needle)) return true;
      if (compactNeedle && group.key.includes(compactNeedle)) return true;
      if (group.aliases.some((alias) => alias.toLocaleLowerCase('en-US').includes(needle))) return true;
      return group.files.some((file) =>
        [file.name, file.title, file.description, file.ext]
          .some((value) => String(value || '').toLocaleLowerCase('en-US').includes(needle))
      );
    });
  }, [groups, query]);

  const countsForRows = useCallback((rows, names) => {
    const canonicalByKey = new Map(uniqueNames(names).map((name) => [folderKey(name), name]));
    const counts = {};
    for (const file of rows) {
      const raw = cleanFolderName(file.subject || file.folder || 'General') || 'General';
      const canonical = canonicalByKey.get(folderKey(raw)) || raw;
      counts[canonical] = (counts[canonical] || 0) + 1;
    }
    return counts;
  }, []);

  const persistFolderMeta = useCallback(async (names, rows) => {
    const allNames = uniqueNames([
      ...SYSTEM_FOLDERS,
      ...(names || []),
      ...(rows || []).map((file) => file.subject || file.folder || 'General'),
    ]);
    const list = allNames.filter((name) => !PROTECTED_KEYS.has(folderKey(name)));
    const fileCounts = countsForRows(rows || [], allNames);
    await setMetaDoc('folders', { list, fileCounts }, { merge: true });
    try {
      window.dispatchEvent(new CustomEvent('edunexus:folders-changed', { detail: { folders: allNames } }));
    } catch (_) {}
  }, [countsForRows]);

  const requireAdmin = () => {
    if (adminPanelAccess(user)) return true;
    setError('Administrator access is required for folder changes.');
    return false;
  };

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3400);
  };

  const handleAddFolder = async (event) => {
    event.preventDefault();
    if (!requireAdmin()) return;
    const name = cleanFolderName(newFolder);
    const key = folderKey(name);
    if (!name || !key) return setError('Enter a valid folder name.');

    const existing = groupByKey.get(key);
    if (existing) {
      setQuery(existing.name);
      setOpenKey(existing.key);
      setNewFolder('');
      flash(`“${name}” matches the existing “${existing.name}” folder, so no duplicate was created.`);
      return;
    }

    setBusy('add');
    setError('');
    try {
      await persistFolderMeta([...metaList, name], allFiles);
      setNewFolder('');
      setQuery('');
      await refresh({ quiet: true });
      flash(`Folder “${name}” created.`);
    } catch (e) {
      setError('Could not add folder: ' + (e?.message || 'unknown error'));
    } finally {
      setBusy('');
    }
  };

  const beginRename = (group) => {
    if (PROTECTED_KEYS.has(group.key)) return setError('The General system folder cannot be renamed or deleted.');
    setEditingKey(group.key);
    setEditingName(group.name);
    setError('');
  };

  const cancelRename = () => {
    setEditingKey('');
    setEditingName('');
  };

  const handleRenameOrMerge = async () => {
    if (!requireAdmin()) return;
    const source = groupByKey.get(editingKey);
    if (!source) return;
    const requested = cleanFolderName(editingName);
    const targetKey = folderKey(requested);
    if (!requested || !targetKey) return setError('Enter a valid folder name.');
    if (PROTECTED_KEYS.has(source.key)) return setError('The General system folder cannot be renamed.');

    const targetGroup = groupByKey.get(targetKey);
    const targetName = targetGroup && targetGroup.key !== source.key ? targetGroup.name : requested;
    if (targetKey === source.key && targetName === source.name && source.aliases.length === 1) {
      cancelRename();
      flash('Folder name is already up to date.');
      return;
    }

    const sourceIds = new Set(source.files.map((file) => file.id));
    const nextRows = allFiles.map((file) => sourceIds.has(file.id) ? { ...file, subject: targetName } : file);
    const sourceAliasKeys = new Set(source.aliases.map(folderKey));
    const nextMeta = metaList.filter((name) => !sourceAliasKeys.has(folderKey(name)));
    if (!PROTECTED_KEYS.has(targetKey)) nextMeta.push(targetName);

    setBusy('rename');
    setError('');
    try {
      const filesToMove = source.files.filter((file) => cleanFolderName(file.subject || file.folder || 'General') !== targetName);
      for (const file of filesToMove) {
        await updateFile(file.id, { subject: targetName, updatedAt: new Date() });
      }
      await persistFolderMeta(nextMeta, nextRows);
      cancelRename();
      setOpenKey(targetKey);
      await refresh({ quiet: true });
      flash(targetGroup && targetGroup.key !== source.key
        ? `Merged ${filesToMove.length} file${filesToMove.length === 1 ? '' : 's'} into “${targetName}”.`
        : `Folder renamed to “${targetName}”; all files stayed with it.`);
    } catch (e) {
      setError('Could not complete folder rename/merge: ' + (e?.message || 'unknown error'));
      await refresh({ quiet: true });
    } finally {
      setBusy('');
    }
  };

  const handleDeleteFolder = async (group) => {
    if (!requireAdmin()) return;
    if (PROTECTED_KEYS.has(group.key)) return setError('The General system folder cannot be deleted.');

    const message = group.count > 0
      ? `Delete “${group.name}”? Its ${group.count} file${group.count === 1 ? '' : 's'} will be moved safely to General; file records and stored files will NOT be deleted.`
      : `Delete the empty folder “${group.name}”?`;
    if (!window.confirm(message)) return;

    setBusy('delete:' + group.key);
    setError('');
    try {
      const sourceIds = new Set(group.files.map((file) => file.id));
      const nextRows = allFiles.map((file) => sourceIds.has(file.id) ? { ...file, subject: 'General' } : file);
      if (group.count > 0) {
        for (const file of group.files) {
          await updateFile(file.id, { subject: 'General', updatedAt: new Date() });
        }
      }
      const aliasKeys = new Set(group.aliases.map(folderKey));
      const nextMeta = metaList.filter((name) => !aliasKeys.has(folderKey(name)));
      await persistFolderMeta(nextMeta, nextRows);
      if (openKey === group.key) setOpenKey(group.count > 0 ? folderKey('General') : '');
      await refresh({ quiet: true });
      flash(group.count > 0
        ? `Folder deleted; ${group.count} file${group.count === 1 ? '' : 's'} moved safely to General.`
        : 'Empty folder deleted.');
    } catch (e) {
      setError('Could not delete folder: ' + (e?.message || 'unknown error'));
      await refresh({ quiet: true });
    } finally {
      setBusy('');
    }
  };

  const handleConsolidateDuplicates = async () => {
    if (!requireAdmin() || duplicateGroups.length === 0) return;
    if (!window.confirm(`Consolidate ${duplicateGroups.length} duplicate-label group${duplicateGroups.length === 1 ? '' : 's'} into their canonical folder names? Files will be moved between folder labels only; no files will be deleted.`)) return;

    setBusy('consolidate');
    setError('');
    try {
      const canonicalByKey = new Map(groups.map((group) => [group.key, group.name]));
      const nextRows = allFiles.map((file) => {
        const current = cleanFolderName(file.subject || file.folder || 'General') || 'General';
        const canonical = canonicalByKey.get(folderKey(current)) || current;
        return current === canonical ? file : { ...file, subject: canonical };
      });
      for (const file of allFiles) {
        const current = cleanFolderName(file.subject || file.folder || 'General') || 'General';
        const canonical = canonicalByKey.get(folderKey(current)) || current;
        if (current !== canonical) await updateFile(file.id, { subject: canonical, updatedAt: new Date() });
      }
      const nextMeta = uniqueNames(metaList.map((name) => canonicalByKey.get(folderKey(name)) || name));
      await persistFolderMeta(nextMeta, nextRows);
      await refresh({ quiet: true });
      flash('Duplicate folder labels consolidated.');
    } catch (e) {
      setError('Could not consolidate duplicate folders: ' + (e?.message || 'unknown error'));
      await refresh({ quiet: true });
    } finally {
      setBusy('');
    }
  };

  const beginFileEdit = (file) => {
    setEditingFile(file.id);
    setEditTitle(String(file.name || file.title || '').slice(0, 150));
    setEditDesc(String(file.description || '').slice(0, 1000));
    const current = groupByKey.get(folderKey(file.subject || file.folder || 'General'));
    setEditFolder(current?.name || cleanFolderName(file.subject || file.folder || 'General') || 'General');
    setError('');
  };

  const cancelFileEdit = () => {
    setEditingFile('');
    setEditTitle('');
    setEditDesc('');
    setEditFolder('');
  };

  const saveFileEdit = async (file) => {
    if (!requireAdmin()) return;
    const name = String(editTitle || '').trim().slice(0, 150);
    const target = groupByKey.get(folderKey(editFolder));
    const subject = target?.name || cleanFolderName(editFolder);
    if (!name || !subject) return setError('File title and destination folder are required.');

    setBusy('file:' + file.id);
    setError('');
    try {
      await updateFile(file.id, {
        name,
        subject,
        description: String(editDesc || '').trim().slice(0, 1000),
        updatedAt: new Date(),
      });
      cancelFileEdit();
      await refresh({ quiet: true });
      flash(subject !== cleanFolderName(file.subject || file.folder || 'General')
        ? `File moved to “${subject}” and updated.`
        : 'File details updated.');
    } catch (e) {
      setError('Could not save file changes: ' + (e?.message || 'unknown error'));
    } finally {
      setBusy('');
    }
  };

  const removeFile = async (file) => {
    if (!requireAdmin()) return;
    const title = String(file.name || file.title || file.id);
    if (!window.confirm(`Remove “${title}” from the EduNexus library? The external/source file is not deleted.`)) return;
    setBusy('file:' + file.id);
    setError('');
    try {
      await deleteFile(file.id);
      await refresh({ quiet: true });
      flash('File listing removed.');
    } catch (e) {
      setError('Could not remove file: ' + (e?.message || 'unknown error'));
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="edx-afm" aria-label="Admin folder manager">
      <div className="edx-afm-head">
        <div>
          <span className="ah-eyebrow">Administrator workspace · Academic library</span>
          <h3>Folder manager</h3>
          <p>{groups.length} unique folders · {allFiles.length} files · full folder CRUD</p>
        </div>
        <button type="button" className="edx-afm-refresh" onClick={() => refresh()} disabled={refreshing || loading}>
          <RefreshCw size={15} className={refreshing ? 'spin' : ''}/>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="edx-afm-toolbar">
        <form className="edx-afm-add" onSubmit={handleAddFolder}>
          <Plus size={17} aria-hidden="true"/>
          <input
            value={newFolder}
            onChange={(event) => setNewFolder(event.target.value)}
            maxLength={120}
            placeholder="Add folder (e.g. CS620_Modeling_and_Simulation)"
            aria-label="New folder name"
          />
          <button type="submit" disabled={busy === 'add' || !newFolder.trim()}>
            {busy === 'add' ? 'Adding…' : 'Add folder'}
          </button>
        </form>

        <label className="edx-afm-search">
          <Search size={17} aria-hidden="true"/>
          <input
            type="search"
            placeholder="Search folders or files…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search folders or files"
          />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear folder search"><X size={14}/></button>}
        </label>
      </div>

      <div className="edx-afm-rule-note">
        <ShieldCheck size={15}/>
        <span><strong>Duplicate protection:</strong> CS 201 and CS201 are treated as the same folder; CS201P remains a separate folder.</span>
      </div>

      <div className="edx-afm-summary" aria-live="polite">
        <span>{filtered.length} shown</span>
        <span>{groups.length} unique folders</span>
        <span>{allFiles.length} file records</span>
        {duplicateGroups.length > 0 && (
          <button type="button" className="edx-afm-consolidate" onClick={handleConsolidateDuplicates} disabled={busy === 'consolidate'}>
            <Merge size={14}/>{busy === 'consolidate' ? 'Consolidating…' : `Consolidate ${duplicateGroups.length} duplicate group${duplicateGroups.length === 1 ? '' : 's'}`}
          </button>
        )}
      </div>

      {error && <p className="ah-message ah-upload-error" role="alert">{error}</p>}
      {notice && <p className="ah-message ah-upload-success" role="status">{notice}</p>}

      {loading ? (
        <p className="edx-afm-loading"><Loader2 size={18} className="spin"/> Loading the academic folder library…</p>
      ) : filtered.length === 0 ? (
        <p className="edx-afm-empty">{query ? `No folder or file matches “${query}”.` : 'No folders found.'}</p>
      ) : (
        <ol className="edx-afm-list">
          {filtered.map((group, index) => {
            const open = openKey === group.key;
            const protectedFolder = PROTECTED_KEYS.has(group.key);
            const renaming = editingKey === group.key;
            return (
              <li key={group.key} className={'edx-afm-item' + (open ? ' is-open' : '')}>
                <button
                  type="button"
                  className="edx-afm-folder"
                  onClick={() => setOpenKey(open ? '' : group.key)}
                  aria-expanded={open}
                  title={group.name}
                >
                  <span className="edx-afm-sequence">{String(index + 1).padStart(3, '0')}</span>
                  <span className="edx-afm-folder-icon">{open ? <FolderOpen size={22}/> : <Folder size={22}/>}</span>
                  <span className="edx-afm-folder-copy">
                    <strong>{group.name}</strong>
                    <small>{group.count} {group.count === 1 ? 'file' : 'files'}{group.aliases.length > 1 ? ` · ${group.aliases.length} equivalent labels` : ''}</small>
                  </span>
                  <span className="edx-afm-chevron">{open ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}</span>
                </button>

                <div className="edx-afm-folder-tools" aria-label={`${group.name} folder actions`}>
                  <button type="button" onClick={() => setOpenKey(open ? '' : group.key)}>
                    {open ? <ChevronDown size={15}/> : <FolderOpen size={15}/>}<span>{open ? 'Close' : 'Open'}</span>
                  </button>
                  {!protectedFolder && <button type="button" onClick={() => beginRename(group)} title="Rename or merge folder"><Pencil size={15}/><span>Rename / merge</span></button>}
                  {!protectedFolder && <button type="button" className="danger" disabled={busy === 'delete:' + group.key} onClick={() => handleDeleteFolder(group)} title={group.count > 0 ? 'Delete folder and move its files safely to General' : 'Delete empty folder'}><Trash2 size={15}/><span>{busy === 'delete:' + group.key ? 'Deleting…' : 'Delete'}</span></button>}
                  {protectedFolder && <span className="edx-afm-system-badge"><ShieldCheck size={13}/> System folder</span>}
                </div>

                {renaming && (
                  <div className="edx-afm-rename">
                    <div>
                      <strong>Rename or merge this folder</strong>
                      <p>If the destination already exists, every file is moved into that existing folder automatically.</p>
                    </div>
                    <input value={editingName} onChange={(event) => setEditingName(event.target.value)} maxLength={120} aria-label="Rename folder"/>
                    <div className="edx-afm-rename-actions">
                      <button type="button" className="primary" onClick={handleRenameOrMerge} disabled={busy === 'rename' || !editingName.trim()}>{groupByKey.has(folderKey(editingName)) && folderKey(editingName) !== group.key ? <Merge size={15}/> : <Save size={15}/>} {busy === 'rename' ? 'Working…' : (groupByKey.has(folderKey(editingName)) && folderKey(editingName) !== group.key ? 'Merge folders' : 'Save name')}</button>
                      <button type="button" onClick={cancelRename}><X size={15}/> Cancel</button>
                    </div>
                  </div>
                )}

                {open && (
                  <div className="edx-afm-files">
                    <div className="edx-afm-files-head">
                      <div><strong>{group.name}</strong><span>{group.count} file{group.count === 1 ? '' : 's'} inside this folder</span></div>
                      {group.aliases.length > 1 && <span className="edx-afm-aliases" title={group.aliases.join(' · ')}>Equivalent labels: {group.aliases.join(' · ')}</span>}
                    </div>

                    {group.files.length === 0 ? (
                      <p className="edx-afm-empty">This folder is empty. You can upload a file here, rename it, or delete it.</p>
                    ) : (
                      <ul className="edx-afm-file-list">
                        {group.files.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' })).map((file) => {
                          const url = safeHttpUrl(file.url);
                          const isEditing = editingFile === file.id;
                          const fileBusy = busy === 'file:' + file.id;
                          return (
                            <li key={file.id} className="edx-afm-file">
                              <span className="edx-afm-file-icon"><FileText size={17}/></span>
                              {isEditing ? (
                                <div className="edx-afm-edit">
                                  <label>File title<input value={editTitle} maxLength={150} onChange={(event) => setEditTitle(event.target.value)}/></label>
                                  <label>Folder<select value={editFolder} onChange={(event) => setEditFolder(event.target.value)}>{folderNames.map((name) => <option key={folderKey(name)} value={name}>{name}</option>)}</select></label>
                                  <label className="wide">Description<textarea value={editDesc} maxLength={1000} rows={2} onChange={(event) => setEditDesc(event.target.value)} placeholder="Optional description"/></label>
                                  <div className="edx-afm-edit-actions wide">
                                    <button type="button" className="primary" disabled={fileBusy || !editTitle.trim()} onClick={() => saveFileEdit(file)}>{editFolder !== group.name ? <MoveRight size={15}/> : <Save size={15}/>} {fileBusy ? 'Saving…' : (editFolder !== group.name ? 'Move & save' : 'Save')}</button>
                                    <button type="button" onClick={cancelFileEdit}><X size={15}/> Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="edx-afm-file-copy">
                                    <strong>{String(file.name || file.title || file.id)}</strong>
                                    <small>{String(file.ext || 'FILE').toUpperCase()} · {file.isActive === false ? 'Disabled' : 'Active'}{file.description ? ' · Description saved' : ''}</small>
                                  </div>
                                  <div className="edx-afm-file-actions">
                                    {url && <a href={url} target="_blank" rel="noopener noreferrer" title="Open file"><Eye size={15}/><span>Open</span></a>}
                                    <button type="button" onClick={() => beginFileEdit(file)} title="Edit or move file"><Pencil size={15}/><span>Edit / move</span></button>
                                    <button type="button" className="danger" disabled={fileBusy} onClick={() => removeFile(file)} title="Remove file listing"><Trash2 size={15}/><span>Remove</span></button>
                                  </div>
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
        </ol>
      )}
    </section>
  );
}
