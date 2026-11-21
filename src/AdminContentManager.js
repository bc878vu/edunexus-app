import React, { useEffect, useState } from "react";
import { adminPanelAccess } from './adminSession';
import { getDownloadURL, ref as storageRef, uploadBytes, deleteObject } from "firebase/storage";
import { Edit3, Film, Link2, Loader, Plus, Save, Settings, Trash2, Upload, X } from "lucide-react";
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
  const [form, setForm] = useState({ title: "", category: "VU Tutorials", url: "", description: "", type: "link", file: null, kind: "tutorial", subject: "", order: "", featured: false, active: true });
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
  const resetTutorial = () => { setEditingId(null); setForm({ title: "", category: "VU Tutorials", url: "", description: "", type: "link", file: null, kind: "tutorial", subject: "", order: "", featured: false, active: true }); };
  const editTutorial = (item) => { setEditingId(item.id); setForm({ title: item.title || "", category: item.category || "VU Tutorials", url: item.url || "", description: item.description || "", type: item.type === "file" ? "file" : "link", file: null, kind: item.kind === "lecture" ? "lecture" : "tutorial", subject: item.subjectCode || "", order: item.sortOrder ?? "", featured: !!item.isFeatured, active: item.isActive !== false }); };

  const saveTutorial = async (event) => {
    event.preventDefault();
    if (!isAdmin || !form.title.trim()) return;
    setSavingTutorial(true);
    try {
      // Lecture videos: kind 'lecture' rows power the Home page "Lecture
      // Videos" section; 'tutorial' rows power the Tutorials page. Lectures
      // are always YouTube links (no file upload).
      const isLecture = form.kind === "lecture";
      const orderNum = parseInt(form.order, 10);
      const base = { title: form.title.trim(), category: form.category.trim() || "Tutorial", description: form.description.trim(), updatedAt: new Date(), updatedBy: user.email, kind: isLecture ? "lecture" : "tutorial", subjectCode: form.subject.trim() || null, sortOrder: Number.isFinite(orderNum) ? orderNum : null, isFeatured: !!form.featured, isActive: !!form.active };
      // Only one lecture can be "first" (the autoplay video): unset the flag
      // on every other lecture before saving this one as first.
      if (isLecture && form.featured) {
        await Promise.all(tutorials.filter((t) => t.isFeatured && t.id !== editingId).map((t) => updateTutorial(t.id, { isFeatured: false })));
      }
      if (editingId) {
        await updateTutorial(editingId, !isLecture && form.type === "file" ? base : { ...base, type: "youtube", url: form.url.trim(), videoId: youtubeId(form.url.trim()) });
        setNotice(isLecture ? "Lecture updated." : "Tutorial updated.");
      } else {
        let payload = { ...base, createdAt: new Date(), createdBy: user.email };
        if (!isLecture && form.type === "file") {
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
  // Lecture ordering (admin): rows are ordered by sort_order (blank = last),
  // then newest first. Moves and "Set as first" re-number every row so the
  // order is stable and the Home page shows the same order as this list.
  const orderedTutorials = [...tutorials].sort((a, b) => {
    const ao = typeof a.sortOrder === "number" ? a.sortOrder : Number.MAX_SAFE_INTEGER;
    const bo = typeof b.sortOrder === "number" ? b.sortOrder : Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });
  const moveTutorial = async (item, dir) => {
    const idx = orderedTutorials.findIndex((t) => t.id === item.id);
    const swap = orderedTutorials[idx + dir];
    if (idx < 0 || !swap) return;
    const next = [...orderedTutorials];
    [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
    setSavingTutorial(true);
    try {
      await Promise.all(next.map((t, i) => updateTutorial(t.id, { sortOrder: i })));
      setNotice("Order updated.");
    } catch (error) { setNotice(error?.message || "Order update failed."); }
    finally { setSavingTutorial(false); }
  };
  const setAsFirstLecture = async (item) => {
    if (item.kind !== "lecture") return;
    const next = [item, ...orderedTutorials.filter((t) => t.id !== item.id)];
    setSavingTutorial(true);
    try {
      await Promise.all(next.map((t, i) => updateTutorial(t.id, { sortOrder: i, isFeatured: t.id === item.id })));
      setNotice("“" + (item.title || "Lecture") + "” is now the first (autoplay) lecture.");
    } catch (error) { setNotice(error?.message || "Set as first failed."); }
    finally { setSavingTutorial(false); }
  };
  const goHome = () => { window.history.pushState({}, "", "/"); window.dispatchEvent(new Event("edunexus:navigation")); };
  const openTutorials = () => { window.history.pushState({}, "", "/tutorials"); window.dispatchEvent(new Event("edunexus:navigation")); };

  if (!isAdmin) return <div className="edx-admin-gate"><Settings size={34}/><h2>Admin access required</h2><p>Sign in with the verified EduNexus administrator account to manage resources and tutorials.</p><button onClick={goHome}>Back to EduNexus</button></div>;

  return <div className="edx-admin-overlay">
    <section className="edx-admin-main" aria-label="Tutorial and resource administration">
      <section className="edx-admin-hero"><span>CONTROL CENTER</span><h1>Manage the floating resources & video learning platform.</h1><p>Changes here are stored in Firebase and reflected across the app. The main EduNexus navbar stays in place while these controls manage this module.</p><div className="edx-admin-hero-actions"><button type="button" onClick={openTutorials}><Film size={16}/> Open Tutorials</button></div></section>
      {(() => { const catCounts = {}; tutorials.forEach(t => { const c = (t.category || 'Tutorial').trim() || 'Tutorial'; catCounts[c] = (catCounts[c] || 0) + 1; }); const topCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 5); const maxCat = topCats.length ? topCats[0][1] : 1; const enabledBtns = buttons.filter(b => b.enabled).length; return (
      <section className="edx-admin-card" aria-label="Tutorials stats">
        <div style={{height:4, margin:'-20px -20px 16px', background:'linear-gradient(90deg,#8b5cf6,#6366f1,#06b6d4)', borderRadius:'12px 12px 0 0'}} />
        <div className="edx-admin-cardhead"><div><span>📊</span><h2>Tutorials stats</h2><p>Live counts from the tutorial library and floating resource buttons.</p></div></div>
        <div style={{display:'flex', gap:12, flexWrap:'wrap', marginBottom:14}}>
          <div style={{background:'#f5f3ff', borderRadius:12, padding:'14px 18px'}}><strong style={{fontSize:22}}>{tutorials.length}</strong><div style={{fontSize:12, fontWeight:700, color:'#64748b'}}>Total tutorials</div></div>
          <div style={{background:'#eef2ff', borderRadius:12, padding:'14px 18px'}}><strong style={{fontSize:22}}>{Object.keys(catCounts).length}</strong><div style={{fontSize:12, fontWeight:700, color:'#64748b'}}>Categories</div></div>
          <div style={{background:'#ecfdf5', borderRadius:12, padding:'14px 18px'}}><strong style={{fontSize:22}}>{tutorials.filter((t) => t.kind === 'lecture').length}</strong><div style={{fontSize:12, fontWeight:700, color:'#64748b'}}>Lecture videos (Home)</div></div>
          <div style={{background:'#ecfeff', borderRadius:12, padding:'14px 18px'}}><strong style={{fontSize:22}}>{enabledBtns}/{buttons.length}</strong><div style={{fontSize:12, fontWeight:700, color:'#64748b'}}>Resource buttons on</div></div>
        </div>
        {topCats.length > 0 && <div style={{display:'grid', gap:8}}>{topCats.map(([c, n]) => <div key={c} style={{display:'flex', alignItems:'center', gap:10}}><span style={{width:140, flexShrink:0, fontSize:12, fontWeight:700}}>{c}</span><div style={{flex:1, height:12, borderRadius:99, background:'#e2e8f0', overflow:'hidden'}}><div style={{height:'100%', borderRadius:99, background:'#8b5cf6', width: (n / maxCat * 100) + '%'}} /></div><span style={{fontSize:12, fontWeight:700}}>{n}</span></div>)}</div>}
      </section>); })()}
      <section className="edx-admin-card"><div className="edx-admin-cardhead"><div><span>01</span><h2>Floating resource button</h2><p>Edit the rotating button labels, destinations and order.</p></div><button onClick={addButton}><Plus size={16}/> Add page</button></div><div className="edx-resource-editor">{buttons.map((item, index) => <div className="edx-resource-row" key={`${index}-${item.href}`}><span className="edx-drag-handle">{index + 1}</span><input value={item.label} onChange={(e) => updateButton(index, "label", e.target.value)} aria-label="Resource label"/><input value={item.href} onChange={(e) => updateButton(index, "href", e.target.value)} aria-label="Resource URL"/><label className="edx-switch"><input type="checkbox" checked={item.enabled} onChange={(e) => updateButton(index, "enabled", e.target.checked)}/><span>On</span></label><button className="edx-icon-danger" onClick={() => removeButton(index)} title="Delete page"><Trash2 size={16}/></button></div>)}</div><div className="edx-pin-row"><div><strong>Pin main dashboard</strong><p>Keep Dashboard as the preferred home destination for the app experience.</p></div><label className="edx-switch big"><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)}/><span>{pinned ? "Pinned" : "Off"}</span></label></div><button className="edx-primary" onClick={saveSettings} disabled={savingSettings}>{savingSettings ? <Loader className="edx-spin" size={17}/> : <Save size={17}/>} Save resource settings</button></section>
      <section className="edx-admin-card"><div className="edx-admin-cardhead"><div><span>02</span><h2>Video platform — full CRUD</h2><p>Create, edit and delete site-owned tutorials and lecture videos. Tutorials show on the Tutorials page; lecture videos show in the “Lecture Videos” section on the Home page (first video autoplays, muted).</p></div><button onClick={resetTutorial}><Plus size={16}/> New tutorial</button></div><form className="edx-video-form" onSubmit={saveTutorial}><div className="edx-form-grid"><label>Title<input required value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})}/></label><label>Category<input value={form.category} onChange={(e)=>setForm({...form,category:e.target.value})}/></label></div><div className="edx-mode-tabs"><button type="button" className={form.kind==='tutorial'?'active':''} onClick={()=>setForm({...form,kind:'tutorial'})}><Film size={15}/> Tutorial</button><button type="button" className={form.kind==='lecture'?'active':''} onClick={()=>setForm({...form,kind:'lecture'})}><Film size={15}/> Lecture video (Home page)</button></div>{form.kind==='lecture' && <div className="edx-form-grid"><label>Subject code<input value={form.subject} onChange={(e)=>setForm({...form,subject:e.target.value})} placeholder="e.g. MGT101" /></label><label>Order<input type="number" min="0" value={form.order} onChange={(e)=>setForm({...form,order:e.target.value})} placeholder="0 = first" /></label></div>}{form.kind==='lecture' && <div className="edx-form-grid"><label style={{display:'flex', alignItems:'center', gap:8, fontSize:14, fontWeight:600}}><input type="checkbox" checked={form.featured} onChange={(e)=>setForm({...form,featured:e.target.checked})}/> Show first (autoplay video)</label><label style={{display:'flex', alignItems:'center', gap:8, fontSize:14, fontWeight:600}}><input type="checkbox" checked={form.active} onChange={(e)=>setForm({...form,active:e.target.checked})}/> Active (shown on Home page)</label></div>}<div className="edx-mode-tabs"><button type="button" className={form.type==='link'?'active':''} onClick={()=>setForm({...form,type:'link'})}><Link2 size={15}/> YouTube / external link</button>{form.kind==='tutorial' && <button type="button" className={form.type==='file'?'active':''} onClick={()=>setForm({...form,type:'file'})}><Upload size={15}/> Upload video</button>}</div>{form.kind==='lecture' || form.type==='link'?<label>Video URL<input type="url" value={form.url} onChange={(e)=>setForm({...form,url:e.target.value})} placeholder="https://www.youtube.com/watch?v=..." required /></label>:<label>Video file<input type="file" accept="video/*" onChange={(e)=>setForm({...form,file:e.target.files?.[0] || null})} required={!editingId}/></label>}<label>Description<textarea rows="3" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/></label><div className="edx-form-actions"><button type="button" onClick={resetTutorial}>Cancel</button><button className="edx-primary" disabled={savingTutorial}>{savingTutorial?<Loader className="edx-spin" size={17}/>:<Save size={17}/>} {editingId ? "Update tutorial" : "Publish tutorial"}</button></div></form><div className="edx-tutorial-admin-list">{tutorials.length===0?<div className="edx-empty">No admin tutorials yet. Publish your first video above.</div>:orderedTutorials.map((item)=><article className="edx-tutorial-admin-item" key={item.id}><div><span>{item.category || "Tutorial"}</span>{item.kind==='lecture' && <span> 🎬 Lecture{item.subjectCode ? ' · ' + item.subjectCode : ''}{item.isFeatured ? ' · ★ First' : ''}{item.isActive === false ? ' · Hidden' : ''}</span>}<h3>{item.title || "Untitled tutorial"}</h3><p>{item.description || "No description"}</p></div><div className="edx-row-actions">{item.kind==='lecture' && <button onClick={()=>setAsFirstLecture(item)} disabled={savingTutorial} title="Make this the first (autoplay) lecture">★ First</button>}{item.kind==='lecture' && <button onClick={()=>moveTutorial(item, -1)} disabled={savingTutorial} title="Move up">↑</button>}{item.kind==='lecture' && <button onClick={()=>moveTutorial(item, 1)} disabled={savingTutorial} title="Move down">↓</button>}<button onClick={()=>editTutorial(item)}><Edit3 size={15}/> Edit</button><button className="danger" onClick={()=>deleteTutorial(item)}><Trash2 size={15}/> Delete</button></div></article>)}</div></section>
      {notice && <div className="edx-admin-notice">{notice}<button onClick={()=>setNotice("")}><X size={15}/></button></div>}
    </section>
    <ConfirmUI />
  </div>;
}

function youtubeId(value) {
  try { const url = new URL(value); if (url.hostname.includes("youtu.be")) return url.pathname.slice(1).split("/")[0]; if (url.hostname.includes("youtube.com")) return url.searchParams.get("v") || ""; } catch (_) {}
  return "";
}
