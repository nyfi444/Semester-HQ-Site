/* ── Checkout — same backend Worker as the app's AI proxy.
   Update WORKER_URL if you redeploy the Worker under a different URL
   (see /worker/README.md in the student-planner repo). ──────────────── */
const WORKER_URL = 'https://student-planner-ai-proxy.semesterhq.workers.dev';

async function startCheckout(btn) {
  const original = btn.textContent;
  btn.textContent = 'Redirecting…';
  btn.setAttribute('aria-disabled', 'true');
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
    alert('Could not start checkout: ' + e.message + '\n\nIf this keeps happening, email hello@semesterhq.com.');
  }
}
