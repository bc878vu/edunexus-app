import { MAIN_ITEMS, MOBILE_ITEMS } from '../src/site-navigation.mjs';

const escape = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cap = '<svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 10-10 5L2 10l10-5 10 5Z"/><path d="M6 12v5c3.5 3 8.5 3 12 0v-5"/><path d="M22 10v6"/></svg>';
const menuIcon = '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
const closeIcon = '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';

function links(items, active, mobile = false) {
  return items.map(item =>
    '<a class="' + (mobile ? 'mobile-nav-link' : 'desktop-nav-link') + '" href="' + escape(item.href) + '"' +
    (item.id === active ? ' aria-current="page"' : '') +
    '>' + (mobile ? '<span class="mobile-nav-initial">' + escape(item.label.charAt(0)) + '</span>' : '') +
    '<span>' + escape(item.label) + '</span></a>'
  ).join('');
}

// SSR pages use the same geometry, brand, destinations, order, breakpoint and
// fixed center column as the React App navbar. Real links remain crawler-safe.
export function renderNavbar(active = 'home') {
  return `<header id="edunexus-main-navbar" data-edunexus-main-nav="true" class="site-header"><div class="nav-wrap">
  <a class="brand" href="/" aria-label="EduNexus home"><span class="brand-icon">${cap}</span><span class="brand-label"><strong>EduNexus</strong><small>Study Material • Mock Tests • AI Tools</small></span></a>
  <nav class="desktop-links" aria-label="Main navigation">${links(MAIN_ITEMS, active)}</nav>
  <div class="desktop-account" aria-label="Account greeting"><span>Hi, Dear</span></div>
  <details class="mobile-menu"><summary aria-label="Open navigation menu">${menuIcon}</summary><div class="mobile-drawer"><div class="mobile-drawer-head"><div class="mobile-drawer-brand"><span class="mobile-drawer-icon">E</span><span><strong>EduNexus</strong><small>Quick navigation</small></span></div><span class="mobile-close" aria-hidden="true">${closeIcon}</span></div><nav aria-label="Mobile navigation">${links(MOBILE_ITEMS, active, true)}</nav><div class="mobile-drawer-foot">Made for students · EduNexus</div></div></details>
  </div></header>`;
}

export const navStyles = `
.site-header,.site-header *{box-sizing:border-box}
.site-header{position:sticky;top:0;z-index:50;width:100%;background:rgba(2,6,23,.90);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);color:#fff;border-bottom:1px solid #1e293b;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.nav-wrap{width:100%;max-width:1450px;min-height:60px;padding:10px 16px;margin:0 auto;display:grid;grid-template-columns:minmax(240px,1fr) auto minmax(240px,1fr);align-items:center;gap:12px}
.brand{justify-self:start;display:flex;align-items:center;gap:12px;flex-shrink:0;text-decoration:none;color:#e2e8f0;min-width:0}
.brand-icon{width:40px;height:40px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(to bottom right,#6366f1,#8b5cf6);color:white;box-shadow:0 10px 15px -3px rgba(0,0,0,.22),0 4px 6px -4px rgba(0,0,0,.22);flex:0 0 auto}
.brand-label{display:flex;flex-direction:column;align-items:flex-start;min-width:0}
.brand strong{display:block;font-size:1.25rem;line-height:1.15;font-weight:800;letter-spacing:-.025em;background:linear-gradient(to right,#818cf8,#38bdf8,#8b5cf6);-webkit-background-clip:text;background-clip:text;color:transparent}
.brand small{display:block;color:#cbd5e1;font-size:.75rem;line-height:1rem;margin-top:1px;white-space:nowrap}
.desktop-links{justify-self:center;display:flex;justify-content:center;align-items:center;min-width:0;gap:0}
.desktop-nav-link{display:inline-flex;align-items:center;color:#e2e8f0;text-decoration:none;font-weight:600;white-space:nowrap;padding:10px 12px;border-radius:9999px;font-size:15px;line-height:20px;letter-spacing:.025em;transition:background-color .15s,color .15s,box-shadow .15s}
.desktop-nav-link:hover{background:rgba(30,41,59,.8);color:#fff}
.desktop-nav-link[aria-current=page]{background:#6366f1;color:white;box-shadow:0 4px 6px -1px rgba(0,0,0,.18),0 2px 4px -2px rgba(0,0,0,.18)}
.desktop-account{justify-self:end;min-width:88px;display:flex;align-items:center;justify-content:flex-end;gap:12px;color:#e2e8f0;font-size:12px;line-height:16px;white-space:nowrap}
.mobile-menu{display:none;justify-self:end;position:relative;z-index:61}
.mobile-menu summary{width:36px;height:36px;cursor:pointer;display:grid;place-items:center;border:1px solid #475569;border-radius:9999px;list-style:none;background:rgba(15,23,42,.9);color:#f1f5f9;box-shadow:0 1px 2px rgba(0,0,0,.1)}
.mobile-menu summary::-webkit-details-marker{display:none}
.mobile-menu[open]::before{content:"";position:fixed;inset:0;z-index:58;background:rgba(0,0,0,.45)}
.mobile-drawer{position:fixed;z-index:60;inset:0 auto 0 0;width:288px;max-width:80vw;display:flex;flex-direction:column;background:#020617;color:#f1f5f9;border-right:1px solid #1e293b;box-shadow:0 25px 50px -12px rgba(0,0,0,.5)}
.mobile-drawer-head{padding:12px 16px;border-bottom:1px solid #1e293b;display:flex;align-items:center;justify-content:space-between;gap:12px}
.mobile-drawer-brand{display:flex;align-items:center;gap:8px}.mobile-drawer-brand>span:last-child{display:flex;flex-direction:column}
.mobile-drawer-brand strong{font-size:14px;line-height:20px}.mobile-drawer-brand small{font-size:11px;line-height:16px;color:#94a3b8}
.mobile-drawer-icon{width:32px;height:32px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(to bottom right,#6366f1,#8b5cf6);color:#fff;font-weight:700}
.mobile-close{width:32px;height:32px;border:1px solid #334155;border-radius:9999px;display:grid;place-items:center;color:#cbd5e1}
.mobile-drawer nav{flex:1;overflow-y:auto;margin-top:8px;padding-bottom:8px}
.mobile-nav-link{width:100%;display:flex;align-items:center;gap:8px;padding:10px 16px;color:#f1f5f9;text-decoration:none;font-size:14px;line-height:20px;text-align:left}
.mobile-nav-link:hover{background:#1e293b}.mobile-nav-link[aria-current=page]{background:#4f46e5;color:#fff}
.mobile-nav-initial{width:24px;height:24px;border:1px solid #475569;border-radius:9999px;display:grid;place-items:center;font-size:11px;color:#94a3b8;flex:0 0 auto}
.mobile-nav-link[aria-current=page] .mobile-nav-initial{border-color:rgba(255,255,255,.8);color:#fff}
.mobile-drawer-foot{padding:12px 16px;border-top:1px solid #1e293b;color:#64748b;font-size:11px;line-height:16px}
@media(max-width:1279px){.nav-wrap{display:flex;align-items:center;justify-content:space-between}.desktop-links,.desktop-account{display:none}.mobile-menu{display:block}}
@media(max-width:639px){.nav-wrap{min-height:60px;padding:10px 16px}.brand small{display:none}.brand strong{font-size:1.125rem}.brand-icon{width:40px;height:40px}}
`;
