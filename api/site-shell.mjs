import { MAIN_ITEMS, MOBILE_ITEMS } from '../src/site-navigation.mjs';

const escape = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cap = '<svg aria-hidden="true" viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 10-10 5L2 10l10-5 10 5Z"/><path d="M6 12v5c3.5 3 8.5 3 12 0v-5"/><path d="M22 10v6"/></svg>';
function links(items, active) {
  return items.map(item =>
    '<a href="' + escape(item.href) + '"' +
    (item.id === active ? ' aria-current="page"' : '') +
    '>' + escape(item.label) + '</a>'
  ).join('');
}

// Same brand, destinations, order, active states and responsive threshold as App's navbar.
// Static real links intentionally work without JavaScript, preserving crawler accessibility.
export function renderNavbar(active = 'home') {
  return `<header class="site-header"><div class="nav-wrap">
  <a class="brand" href="/" aria-label="EduNexus home"><span class="brand-icon">${cap}</span><span class="brand-label"><strong>EduNexus</strong><small>Study Material • Mock Tests • AI Tools</small></span></a>
  <nav class="desktop-links" aria-label="Main navigation">${links(MAIN_ITEMS, active)}</nav>
  <details class="mobile-menu"><summary aria-label="Open navigation menu"><svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg><span>Menu</span></summary><nav aria-label="Mobile navigation">${links(MOBILE_ITEMS, active)}</nav></details>
  </div></header>`;
}

export const navStyles = `
.site-header{position:sticky;top:0;z-index:50;background:rgba(2,6,23,.94);backdrop-filter:blur(12px);color:#fff;border-bottom:1px solid #1e293b}
.nav-wrap{max-width:1450px;padding:10px 16px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:70px}
.brand{display:flex;align-items:center;gap:12px;flex-shrink:0;text-decoration:none;color:#e2e8f0}.brand-icon{width:40px;height:40px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(125deg,#6366f1,#8b5cf6);color:white;box-shadow:0 7px 20px #0003}
.brand strong{display:block;color:#93c5fd;font-size:1.22rem;line-height:1.15;font-weight:850;letter-spacing:-.025em}.brand small{display:block;color:#cbd5e1;font-size:.75rem;margin-top:3px}
.desktop-links{display:flex;justify-content:center;align-items:center;min-width:0;gap:0}
.desktop-links a,.mobile-menu nav a{color:#e2e8f0;text-decoration:none;font-weight:650;white-space:nowrap;padding:10px 12px;border-radius:28px;font-size:.94rem}
.desktop-links a:hover,.mobile-menu nav a:hover{background:#1e293b;color:#fff}.desktop-links [aria-current=page],.mobile-menu nav [aria-current=page]{background:#6366f1;color:white}
.mobile-menu{display:none;position:relative}.mobile-menu summary{cursor:pointer;display:flex;gap:8px;align-items:center;padding:9px 11px;border:1px solid #475569;border-radius:50px;list-style:none;font-weight:700;color:#f1f5f9}.mobile-menu summary::-webkit-details-marker{display:none}
.mobile-menu nav{position:absolute;right:0;top:calc(100% + 12px);width:min(290px,calc(100vw - 24px));max-height:min(75vh,650px);overflow-y:auto;padding:12px;display:grid;gap:4px;background:#020617;border:1px solid #475569;box-shadow:0 12px 30px #0005;border-radius:14px}
.mobile-menu nav a{display:block;padding:11px 12px;border-radius:9px}.mobile-menu:not([open]) nav{display:none}
@media(max-width:1279px){.desktop-links{display:none}.mobile-menu{display:block}}
@media(max-width:480px){.nav-wrap{padding:8px 12px;min-height:60px}.brand small{display:none}.brand-icon{width:36px;height:36px}.brand strong{font-size:1.12rem}}
`;
