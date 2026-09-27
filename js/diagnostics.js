/* ── Diagnostics + the shared Worker URL ────────────────────────────
   Loaded first on every page. WORKER_URL is the one backend for checkout,
   the contact forms, and click tracking (js/checkout.js, js/contact.js,
   js/track.js); update it here if the Worker ever moves (see
   worker/README.md in the student-planner repo).

   Reports uncaught errors, and anything a script passes to
   diag.error(feature, message, err), to the Worker's /log-error route.
   They show up in the app's admin/errors.html as source "marketing".
   Emails and URL parameter values are stripped before sending; the page is
   sent as its path only. Capped per page view so a loop can't spam it.
──────────────────────────────────────────────────────────────── */
// Production is only the real hostnames. A branch Preview, a version URL or
// localhost talks to the staging Worker instead: Stripe in test mode, its
// own Firebase project, email only to the people testing. Same rule as the
// app's js/config.js.
const PRODUCTION_HOSTS = ['semester-hq.com', 'www.semester-hq.com', 'app.semester-hq.com'];
const IS_PRODUCTION = PRODUCTION_HOSTS.includes(location.hostname);
const WORKER_URL = IS_PRODUCTION
  ? 'https://student-planner-ai-proxy.semesterhq.workers.dev'
  : 'https://student-planner-ai-proxy-staging.semesterhq.workers.dev';
// Cloudflare's published always-pass Turnstile key, for staging only.
const TURNSTILE_TEST_SITEKEY = '1x00000000000000000000AA';
// A small corner label on preview addresses, so a staging page is never
// mistaken for the real site. Not on localhost, where screenshots are taken.
if (!IS_PRODUCTION && /\.workers\.dev$/.test(location.hostname)) {
  document.addEventListener('DOMContentLoaded', () => {
    const tag = document.createElement('div');
    tag.textContent = 'Staging · test data only';
    tag.setAttribute('aria-hidden', 'true');
    tag.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:2147483647;pointer-events:none;font:600 11px/1 -apple-system,system-ui,sans-serif;letter-spacing:.02em;color:#F8F6F2;background:#121212;padding:6px 9px;border-radius:999px;opacity:.85';
    document.body.appendChild(tag);
  });
}

const diag = (() => {
  const MAX_REPORTS = 10;
  const seen = new Set();
  const scrub = (text, max) => String(text ?? '')
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]')
    .replace(/([?&#][\w-]+=)[^&#\s'")]+/g, '$1…')
    .slice(0, max);

  function report(feature, message, err) {
    const errMessage = err?.message || '';
    const text = scrub(errMessage && errMessage !== message ? `${message}: ${errMessage}` : message || errMessage || 'Unknown error', 2000);
    // Safari reports a page-to-page animation cut short by a quick tap or the
    // back button as an error (css/world.css @view-transition). The visitor
    // sees nothing wrong, so it isn't reported.
    if (/Skipping view transition|view transition was (skipped|aborted)|Transition was (skipped|aborted)/i.test(text) || err?.name === 'AbortError' && /transition/i.test(text)) return;
    if (!navigator.onLine || /^Script error\.?$/.test(text) || /-extension:\/\//.test(err?.stack || '')) return;
    if (seen.has(text) || seen.size >= MAX_REPORTS) return;
    seen.add(text);
    try {
      fetch(`${WORKER_URL}/log-error`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          source: 'marketing', level: 'error', feature, message: text,
          stack: scrub(String(err?.stack || '').replace(/\?[^\s:)]*(?=:\d+:\d+)/g, ''), 4000),
          page: location.pathname, userAgent: navigator.userAgent,
        }),
      }).catch(() => {});
    } catch { /* the reporter must never throw */ }
  }

  const featureFromStack = (stack) => (String(stack || '').match(/\/js\/([\w-]+)\.js/) || [])[1] || 'site';
  window.addEventListener('error', (e) => report(featureFromStack(e.error?.stack || e.filename), e.error?.message || e.message, e.error));
  window.addEventListener('unhandledrejection', (e) => report(featureFromStack(e.reason?.stack), e.reason?.message || String(e.reason), e.reason));

  return {
    error(feature, message, err) {
      console.error(`[${feature}] ${message}`, err ?? '');
      report(feature, message, err);
    },
  };
})();
