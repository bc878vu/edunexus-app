import React, { useEffect, useRef } from 'react';

// Ad publisher ID (matches public/ads.txt)
export const ADSENSE_CLIENT = 'ca-pub-5179042048080611';

// Set to true in Vercel env (REACT_APP_ADSENSE_APPROVED=true) ONLY after Google approves the site.
// Until then the component renders nothing — no layout shift, no policy risk.
const ADS_ENABLED = typeof process !== 'undefined' && process.env && process.env.REACT_APP_ADSENSE_APPROVED === 'true';

/**
 * Responsive ad slot.
 * Props:
 *   slot   - Ad-unit ID (from ad dashboard). If omitted, uses Auto-Ads-compatible responsive format.
 *   format - 'auto' | 'rectangle' | 'horizontal' | 'vertical'
 *   label  - optional small "Advertisement" label for transparency
 */
export default function AdSlot({ slot, format = 'auto', label = true, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ADS_ENABLED) return;
    try {
      // Load the ad library once
      if (!document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) {
        const s = document.createElement('script');
        s.async = true;
        s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
        s.crossOrigin = 'anonymous';
        document.head.appendChild(s);
      }
      // Push the ad unit
      const t = setTimeout(() => {
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) {}
      }, 300);
      return () => clearTimeout(t);
    } catch (_) {}
  }, []);

  if (!ADS_ENABLED) return null;

  const styleMap = {
    auto: { display: 'block' },
    rectangle: { display: 'inline-block', width: '336px', height: '280px' },
    horizontal: { display: 'inline-block', width: '728px', height: '90px' },
    vertical: { display: 'inline-block', width: '300px', height: '600px' },
  };

  return (
    <div className={`edunexus-ad-slot ${className}`} style={{ margin: '1.5rem auto', textAlign: 'center', maxWidth: '100%', overflow: 'hidden' }}>
      {label && (
        <div style={{ fontSize: '10px', letterSpacing: '.15em', textTransform: 'uppercase', opacity: 0.45, marginBottom: '6px' }}>
          Advertisement
        </div>
      )}
      <ins
        ref={ref}
        className="adsbygoogle"
        style={styleMap[format] || styleMap.auto}
        data-ad-client={ADSENSE_CLIENT}
        {...(slot ? { 'data-ad-slot': slot } : {})}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
