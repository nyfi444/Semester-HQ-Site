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
const WORKER_URL = 'https://student-planner-ai-proxy.semesterhq.workers.dev';

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
