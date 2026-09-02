/* ── Checkout — same backend Worker as the app's AI proxy.
   Update WORKER_URL if you redeploy the Worker under a different URL
   (see /worker/README.md in the student-planner repo). ──────────────── */
const WORKER_URL = 'https://student-planner-ai-proxy.semesterhq.workers.dev';

async function startCheckout(btn) {
  const original = btn.textContent;
  const statusEl = document.getElementById('checkout-status');
  btn.textContent = 'Redirecting…';
  btn.setAttribute('aria-disabled', 'true');
  if (statusEl) { statusEl.textContent = ''; statusEl.className = 'checkout-status'; }
  if (typeof trackEvent === 'function') trackEvent('checkout_started');
  try {
    const res = await fetch(`${WORKER_URL}/create-checkout-session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}), // no account yet at this point — Stripe just collects an email
    });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || 'Something went wrong starting checkout.');
    window.location.href = data.url;
  } catch (e) {
    btn.textContent = original;
    btn.removeAttribute('aria-disabled');
    if (typeof trackEvent === 'function') trackEvent('checkout_error');
    if (statusEl) {
      statusEl.textContent = `Could not start checkout: ${e.message}. Email hello@semester-hq.com if this keeps happening.`;
      statusEl.className = 'checkout-status error';
    } else {
      alert('Could not start checkout: ' + e.message + '\n\nIf this keeps happening, email hello@semester-hq.com.');
    }
  }
}
