/* ── Lightweight CTA click tracking ────────────────────────────
   Reports which buttons people actually click (Log in, Try the demo,
   Subscribe) to the same Worker as checkout/contact (WORKER_URL), see
   worker/src/index.js's "7. Event tracking" in the student-planner repo.
   No cookies, no per-user identity: just event name + page path, so we
   can tell which CTA is converting instead of guessing. The Worker only
   accepts the names in its TRACKED_EVENTS list, so add a name there first.
──────────────────────────────────────────────────────────────── */
function trackEvent(event) {
  try {
    fetch(`${WORKER_URL}/track-event`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event, path: location.pathname }),
      keepalive: true,
    }).catch(() => {}); // never let tracking break the click
  } catch { /* ignore */ }
}

document.addEventListener('click', (e) => {
  const link = e.target.closest('a, button');
  if (!link) return;
  if (link.matches('.nav-login')) trackEvent('nav_login_click');
  // The primary CTA, in the nav, the hero, the sticky bar, and on the guide
  // pages: it now sends people to sign up rather than to the demo section.
  else if (link.matches('a[href*="login.html?signup"]')) trackEvent('get_started_click');
  // The demo: it used to be the #try section of the one-page home and now
  // has its own page, so this matches both the old #try links and any link
  // to demo.html (nav, footer, the "try the live demo" lines under the
  // CTAs). The event keeps its original name so the counts stay comparable
  // over time, and the Worker only accepts names it already knows.
  else if (link.matches('a[href$="#try"], a[href$="demo.html"], a[href*="demo.html#"], a[href*="demo.html?"]')) trackEvent('try_it_free_click');
  // "Start a group plan" (not "Manage it"): the top of the groups funnel.
  else if (link.matches('a[href*="group-admin.html"]:not(.gp-manage)')) trackEvent('group_start_click');
  else if (link.matches('.nav button.btn-primary')) trackEvent('nav_upgrade_click');
});

/* ── Link codes (off until the privacy page describes them) ─────────
   A campaign link can carry a short neutral code (?via=tt-bio, or a
   campaign's utm_campaign). When LINK_CODES is on, the code is kept for
   this visit only (sessionStorage, no cookie) and passed along when the
   visitor heads to sign-up or checkout, so Stripe can record which link
   a subscription came from. Codes are validated: 2 to 24 lowercase
   letters, numbers or dashes, never a name. Turn it on only together
   with the privacy.html sentence that says so. */
const LINK_CODES = false;
const VIA_KEY = 'shq_via';
function linkCode() {
  try { return sessionStorage.getItem(VIA_KEY) || ''; } catch { return ''; }
}
(function keepLinkCode() {
  if (!LINK_CODES) return;
  try {
    const q = new URLSearchParams(location.search);
    const raw = (q.get('via') || q.get('utm_campaign') || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (/^[a-z0-9-]{2,24}$/.test(raw)) sessionStorage.setItem(VIA_KEY, raw);
  } catch { /* storage off: nothing is kept */ }
})();
document.addEventListener('click', (e) => {
  if (!LINK_CODES) return;
  const a = e.target.closest('a[href*="login.html?signup"], a[href*="group-admin.html"]');
  const code = linkCode();
  if (!a || !code) return;
  try {
    const u = new URL(a.href, location.href);
    if (!u.searchParams.has('via')) { u.searchParams.set('via', code); a.href = u.toString(); }
  } catch { /* leave the link as it is */ }
}, true);
