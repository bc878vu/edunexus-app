import React, { useEffect, useState } from "react";
import { adminPanelAccess } from './adminSession';
import { getDownloadURL, ref as storageRef, uploadBytes, deleteObject } from "firebase/storage";
import { Check, Edit3, Film, LayoutDashboard, Link2, Loader, Plus, Save, Settings, Trash2, Upload, X } from "lucide-react";
import { useConfirm } from "./ConfirmDialog";
import "./admin-content-manager.css";
import { storage } from "./firebase-client";
import { USE_SUPABASE, supabase } from "./supabase-client";
import { onAuthChange } from "./db/auth";
import { getMetaDoc, setMetaDoc, subscribeMetaDoc } from "./db/files";
import { listTutorials, createTutorial, updateTutorial, removeTutorial, subscribeTutorials } from "./db/tutorials";

const DEFAULT_BUTTONS = [
  { label: "Study Guides", href: "/study-guides", enabled: true },
  { label: "Tutorial Videos", href: "/tutorials", enabled: true },
  { label: "Student Resources", href: "/student-resources", enabled: true },
  { label: "Live Projects", href: "/live-projects", enabled: true }
];

export default function AdminContentManager({ user: adminUser = null }) {
  // Embedded as the "Tutorials" tab inside the Admin Panel (?page=admin), which
  // already gates admin access — no pathname-based route gating here.
  const [authUser, setAuthUser] = useState(null);
  const [buttons, setButtons] = useState(DEFAULT_BUTTONS);
  const [pinned, setPinned] = useState(true);
  const [tutorials, setTutorials] = useState([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingTutorial, setSavingTutorial] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ title: "", category: "VU Tutorials", url: "", description: "", type: "link", file: null });
  const { requestConfirm, ConfirmUI } = useConfirm();

  useEffect(() => onAuthChange(setAuthUser), []);
  // The parent Admin Panel already owns the authenticated normalized user.
  // Prefer it so a Supabase auth-state callback cannot temporarily hide an
  // otherwise valid tab-scoped admin session during provider migration.
  const user = adminUser || authUser;
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const data = (await getMetaDoc('floatingHub')) || {};
        if (!alive) return;
        if (Array.isArray(data.buttons) && data.buttons.length) setButtons(data.buttons.map((b) => ({ label: b.label || "Resource", href: b.href || "/", enabled: b.enabled !== false })));
        setPinned(data.dashboardPinned !== false);
      } catch (_) { /* keep defaults */ }
    };
    refresh();
    const unsub = subscribeMetaDoc('floatingHub', { onInvalidate: refresh });
    return () => { alive = false; unsub(); };
  }, []);
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const items = await listTutorials();
        if (alive) setTutorials(items);
      } catch (_) { if (alive) setTutorials([]); }
    };
    refresh();
    const unsub = subscribeTutorials({ onInvalidate: refresh });
    return () => { alive = false; unsub(); };
  }, []);

  const isAdmin = adminPanelAccess(user);
  const saveSettings = async () => {
    if (!isAdmin) return;
    setSavingSettings(true);
    try {
      await setMetaDoc('floatingHub', { buttons, dashboardPinned: pinned, updatedAt: new Date(), updatedBy: user.email });
      localStorage.setItem("edunexus_dashboard_pinned", pinned ? "1" : "0");
      window.dispatchEvent(new Event("edunexus:resource-config"));
      setNotice("Resource buttons and dashboard setting saved.");
    } catch (error) { setNotice(error?.message || "Settings save failed."); }
    finally { setSavingSettings(false); }
  };
  const updateButton = (index, key, value) => setButtons((items) => items.map((item, i) => i === index ? { ...item, [key]: value } : item));
  const addButton = () => setButtons((items) => [...items, { label: "New Resource", href: "/", enabled: true }]);
  const removeButton = (index) => setButtons((items) => items.filter((_, i) => i !== index));
  const resetTutorial = () => { setEditingId(null); setForm({ title: "", category: "VU Tutorials", url: "", description: "", type: "link", file: null }); };
  const editTutorial = (item) => { setEditingId(item.id); setForm({ title: item.title || "", category: item.category || "VU Tutorials", url: item.url || "", description: item.description || "", type: item.type === "file" ? "file" : "link", file: null }); };

  const saveTutorial = async (event) => {
    event.preventDefault();
    if (!isAdmin || !form.title.trim()) return;
    setSavingTutorial(true);
    try {
      const base = { title: form.title.trim(), category: form.category.trim() || "Tutorial", description: form.description.trim(), updatedAt: new Date(), updatedBy: user.email };
      if (editingId) {
        await updateTutorial(editingId, form.type === "link" ? { ...base, type: "youtube", url: form.url.trim(), videoId: youtubeId(form.url.trim()) } : base);
        setNotice("Tutorial updated.");
      } else {
        let payload = { ...base, createdAt: new Date(), createdBy: user.email };
        if (form.type === "file") {
          if (!form.file || !form.file.type.startsWith("video/")) throw new Error("Please select a video file.");
          if (form.file.size > 200 * 1024 * 1024) throw new Error("Video must be 200 MB or smaller.");
          const safeName = form.file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
          const path = `tutorials/${Date.now()}-${safeName}`;
          let fileUrl;
          if (USE_SUPABASE) {
            const { error } = await supabase.storage.from('tutorial-videos').upload(path, form.file, { contentType: form.file.type, upsert: true });
            if (error) throw error;
            fileUrl = supabase.storage.from('tutorial-videos').getPublicUrl(path).data.publicUrl;
          } else {
            const uploaded = await uploadBytes(storageRef(storage, path), form.file, { contentType: form.file.type });
            fileUrl = await getDownloadURL(uploaded.ref);
          }
          // TODO(schema): `storagePath`/`updatedBy` have no columns in plan §1
          // (file adapter already documents this) — on the Supabase branch the
          // storage path is not persisted, so file deletes can't clean it up.
          payload = { ...payload, type: "file", url: fileUrl, fileName: form.file.name, contentType: form.file.type, storagePath: path };
        } else {
          payload = { ...payload, type: "youtube", url: form.url.trim(), videoId: youtubeId(form.url.trim()) };
        }
        await createTutorial(payload);
        setNotice("Tutorial published.");
      }
      resetTutorial();
    } catch (error) { setNotice(error?.message || "Tutorial save failed."); }
    finally { setSavingTutorial(false); }
  };
  const deleteTutorial = async (item) => {
    if (!isAdmin) return;
    requestConfirm({
      message: `Delete “${item.title || "this tutorial"}"?`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        try {
          await removeTutorial(item.id);
          if (item.storagePath) {
            if (USE_SUPABASE) {
              await supabase.storage.from('tutorial-videos').remove([item.storagePath]).catch(() => {});
            } else {
              await deleteObject(storageRef(storage, item.storagePath)).catch(() => {});
            }
          }
          setNotice("Tutorial deleted.");
        } catch (error) { setNotice(error?.message || "Delete failed."); }
      },
    });
  };
  const goHome = () => { window.history.pushState({}, "", "/"); window.dispatchEvent(new Event("edunexus:navigation")); };
  const openTutorials = () => { window.history.pushState({}, "", "/tutorials"); window.dispatchEvent(new Event("edunexus:navigation")); };

  if (!isAdmin) return <div className="edx-admin-gate"><Settings size={34}/><h2>Admin access required</h2><p>Sign in with the verified EduNexus administrator account to manage resources and tutorials.</p><button onClick={goHome}>Back to EduNexus</button></div>;

  return <div className="edx-admin-overlay">
    <header className="edx-admin-header"><button onClick={goHome} className="edx-admin-brand"><LayoutDashboard size={20}/> EduNexus Control Center</button><div className="edx-admin-actions"><span className="edx-admin-status"><Check size={14}/> Verified admin</span><button onClick={openTutorials}><Film size={16}/> Open video platform</button></div></header>
    <main className="edx-admin-main">
      <section className="edx-admin-hero"><span>CONTROL CENTER</span><h1>Manage the floating resources & video learning platform.</h1><p>Changes here are stored in Firebase and reflected across the app. The existing dashboard design stays intact while these controls add a cleaner management layer.</p></section>
      <section className="edx-admin-card"><div className="edx-admin-cardhead"><div><span>01</span><h2>Floating resource button</h2><p>Edit the rotating button labels, destinations and order.</p></div><button onClick={addButton}><Plus size={16}/> Add page</button></div><div className="edx-resource-editor">{buttons.map((item, index) => <div className="edx-resource-row" key={`${index}-${item.href}`}><span className="edx-drag-handle">{index + 1}</span><input value={item.label} onChange={(e) => updateButton(index, "label", e.target.value)} aria-label="Resource label"/><input value={item.href} onChange={(e) => updateButton(index, "href", e.target.value)} aria-label="Resource URL"/><label className="edx-switch"><input type="checkbox" checked={item.enabled} onChange={(e) => updateButton(index, "enabled", e.target.checked)}/><span>On</span></label><button className="edx-icon-danger" onClick={() => removeButton(index)} title="Delete page"><Trash2 size={16}/></button></div>)}</div><div className="edx-pin-row"><div><strong>Pin main dashboard</strong><p>Keep Dashboard as the preferred home destination for the app experience.</p></div><label className="edx-switch big"><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)}/><span>{pinned ? "Pinned" : "Off"}</span></label></div><button className="edx-primary" onClick={saveSettings} disabled={savingSettings}>{savingSettings ? <Loader className="edx-spin" size={17}/> : <Save size={17}/>} Save resource settings</button></section>
      <section className="edx-admin-card"><div className="edx-admin-cardhead"><div><span>02</span><h2>Video platform — full CRUD</h2><p>Create, edit and delete site-owned tutorials. Students can watch them directly on the Tutorials page.</p></div><button onClick={resetTutorial}><Plus size={16}/> New tutorial</button></div><form className="edx-video-form" onSubmit={saveTutorial}><div className="edx-form-grid"><label>Title<input required value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})}/></label><label>Category<input value={form.category} onChange={(e)=>setForm({...form,category:e.target.value})}/></label></div><div className="edx-mode-tabs"><button type="button" className={form.type==='link'?'active':''} onClick={()=>setForm({...form,type:'link'})}><Link2 size={15}/> YouTube / external link</button><button type="button" className={form.type==='file'?'active':''} onClick={()=>setForm({...form,type:'file'})}><Upload size={15}/> Upload video</button></div>{form.type==='link'?<label>Video URL<input type="url" value={form.url} onChange={(e)=>setForm({...form,url:e.target.value})} placeholder="https://www.youtube.com/watch?v=..." required /></label>:<label>Video file<input type="file" accept="video/*" onChange={(e)=>setForm({...form,file:e.target.files?.[0] || null})} required={!editingId}/></label>}<label>Description<textarea rows="3" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/></label><div className="edx-form-actions"><button type="button" onClick={resetTutorial}>Cancel</button><button className="edx-primary" disabled={savingTutorial}>{savingTutorial?<Loader className="edx-spin" size={17}/>:<Save size={17}/>} {editingId ? "Update tutorial" : "Publish tutorial"}</button></div></form><div className="edx-tutorial-admin-list">{tutorials.length===0?<div className="edx-empty">No admin tutorials yet. Publish your first video above.</div>:tutorials.map((item)=><article className="edx-tutorial-admin-item" key={item.id}><div><span>{item.category || "Tutorial"}</span><h3>{item.title || "Untitled tutorial"}</h3><p>{item.description || "No description"}</p></div><div className="edx-row-actions"><button onClick={()=>editTutorial(item)}><Edit3 size={15}/> Edit</button><button className="danger" onClick={()=>deleteTutorial(item)}><Trash2 size={15}/> Delete</button></div></article>)}</div></section>
      {notice && <div className="edx-admin-notice">{notice}<button onClick={()=>setNotice("")}><X size={15}/></button></div>}
    </main>
    <ConfirmUI />
  </div>;
}

function youtubeId(value) {
  try { const url = new URL(value); if (url.hostname.includes("youtu.be")) return url.pathname.slice(1).split("/")[0]; if (url.hostname.includes("youtube.com")) return url.searchParams.get("v") || ""; } catch (_) {}
  return "";
}
