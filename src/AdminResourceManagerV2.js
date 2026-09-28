import React, { useEffect, useState } from 'react';
import { adminPanelAccess } from './adminSession';
import { Settings, Save, Plus, Trash2, Pin, Film, ExternalLink, X } from 'lucide-react';
import { onAuthChange } from './db/auth';
import { getMetaDoc, setMetaDoc, subscribeMetaDoc } from './db/files';
const defaults=[['Study Guides','/study-guides'],['Tutorial Videos','/tutorials'],['Student Resources','/student-resources'],['Live Projects','/live-projects']];
const isAdminPage=()=>new URLSearchParams(location.search).get('page')==='admin'||location.pathname.replace(/\/$/,'')==='/admin';

export default function AdminResourceManagerV2(){
  const [active,setActive]=useState(isAdminPage); const [open,setOpen]=useState(false); const [user,setUser]=useState(null);
  const [buttons,setButtons]=useState(defaults.map(([label,href])=>({label,href,enabled:true}))); const [pinned,setPinned]=useState(true); const [saved,setSaved]=useState(false);
  const [saveError,setSaveError]=useState('');
  useEffect(()=>{const sync=()=>{setActive(isAdminPage());if(!isAdminPage())setOpen(false)};addEventListener('popstate',sync);addEventListener('edunexus:navigation',sync);return()=>{removeEventListener('popstate',sync);removeEventListener('edunexus:navigation',sync)}},[]);
  useEffect(()=>onAuthChange(setUser),[]);
  useEffect(()=>{
    if (!active) return undefined;
    let alive = true;
    const refresh = async () => {
      try {
        const d = (await getMetaDoc('floatingHub')) || {};
        if (!alive) return;
        if (Array.isArray(d.buttons) && d.buttons.length) setButtons(d.buttons.map(x=>({label:String(x.label||'Resource'),href:String(x.href||'/'),enabled:x.enabled!==false})));
        setPinned(d.dashboardPinned !== false);
      } catch (_) {}
    };
    refresh();
    const unsub = subscribeMetaDoc('floatingHub', { onInvalidate: refresh });
    return () => { alive = false; unsub(); };
  },[active]);
  if(!active||!adminPanelAccess(user))return null;
  // A failed write must surface instead of dying as an unhandled rejection
  // while the Save button keeps showing its idle label.
  const save=async()=>{setSaveError('');try{await setMetaDoc('floatingHub',{buttons,dashboardPinned:pinned,updatedAt:new Date(),updatedBy:user.email});localStorage.setItem('edunexus_dashboard_pinned',pinned?'1':'0');dispatchEvent(new Event('edunexus:resource-config'));setSaved(true);setTimeout(()=>setSaved(false),1800)}catch(e){setSaved(false);setSaveError(e?.message||'Could not save resource settings. Check your admin session and try again.')}};
  const go=(path)=>{setOpen(false);history.pushState({},'',path);dispatchEvent(new Event('edunexus:navigation'))};
  return <>
    <button className="edx-resource-manager-launcher" onClick={()=>setOpen(v=>!v)} aria-label="Open resource manager"><Settings size={18}/><span>Resources</span></button>
    {open&&<div className="edx-resource-manager-popover" role="dialog" aria-label="Resource manager">
      <header><div><strong>Resource Manager</strong><small>Admin-only • existing admin panel remains accessible</small></div><button onClick={()=>setOpen(false)} aria-label="Close"><X size={17}/></button></header>
      <div className="edx-resource-manager-body">
        <p>Manage the floating dashboard pages without replacing the existing Highlights, Academic, Blog, Forum and Profile tabs.</p>
        {buttons.map((b,i)=><div className="edx-resource-manager-row" key={i}><b>{i+1}</b><input value={b.label} onChange={e=>setButtons(v=>v.map((x,j)=>j===i?{...x,label:e.target.value}:x))}/><input value={b.href} onChange={e=>setButtons(v=>v.map((x,j)=>j===i?{...x,href:e.target.value}:x))}/><label><input type="checkbox" checked={b.enabled} onChange={e=>setButtons(v=>v.map((x,j)=>j===i?{...x,enabled:e.target.checked}:x))}/> On</label><button onClick={()=>setButtons(v=>v.filter((_,j)=>j!==i))} aria-label="Delete"><Trash2 size={15}/></button></div>)}
        <div className="edx-resource-manager-actions"><button onClick={()=>setButtons(v=>[...v,{label:'New Resource',href:'/',enabled:true}])}><Plus size={15}/> Add page</button><button onClick={()=>setPinned(v=>!v)}><Pin size={15}/> {pinned?'Dashboard pinned':'Pin Dashboard'}</button><button className="primary" onClick={save}><Save size={15}/> {saved?'Saved':'Save'}</button></div>
        {saveError&&<p role="alert" style={{color:'#b91c1c',fontSize:13,margin:'8px 0 0'}}>{saveError}</p>}
        <div className="edx-resource-manager-links"><button onClick={()=>go('/tutorials')}><Film size={15}/> Video platform <ExternalLink size={14}/></button></div>
      </div>
    </div>}
  </>;
}
