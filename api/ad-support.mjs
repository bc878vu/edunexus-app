// Standalone educational pages receive the standard AdSense loader only when
// the publisher confirms account/site approval in Vercel project settings.
// No ad units are inserted beside downloads or student review controls.
const enabled = process.env.ADSENSE_SITE_APPROVED === 'true';
export const standaloneAdScript = enabled
  ? '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5179042048080611" crossorigin="anonymous"></script>'
  : '';
export const standaloneContentSecurityPolicy = enabled
  ? "default-src 'none'; script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://*.googleadservices.com; connect-src https:; frame-src https:; img-src 'self' https: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
  : "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' https: data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
