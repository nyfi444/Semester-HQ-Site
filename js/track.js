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
  // Every "Try the demo" link, in the nav, the hero, the sticky bar, and on
  // the guide pages (where it points at index.html#try). The event keeps its
  // original name so the counts stay comparable over time.
  else if (link.matches('a[href$="#try"]')) trackEvent('try_it_free_click');
  else if (link.matches('.nav button.btn-primary')) trackEvent('nav_upgrade_click');
});
