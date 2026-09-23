/* ── Checkout: same backend Worker as the app (WORKER_URL, js/diagnostics.js) ── */

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
      // No account yet: Stripe collects the email. A link code rides along
      // only when link codes are on (js/track.js).
      body: JSON.stringify(typeof LINK_CODES !== 'undefined' && LINK_CODES && typeof linkCode === 'function' && linkCode() ? { via: linkCode() } : {}),
    });
    const data = await res.json();
    if (!res.ok || !data.url) throw Object.assign(new Error(data.error || 'Something went wrong starting checkout.'), { status: res.status });
    window.location.href = data.url;
  } catch (e) {
    btn.textContent = original;
    btn.removeAttribute('aria-disabled');
    if (typeof trackEvent === 'function') trackEvent('checkout_error');
    if (!(e.status < 500)) diag.error('checkout', 'Could not start checkout', e);
    if (statusEl) {
      statusEl.textContent = `Could not start checkout: ${e.message}. Email hello@semester-hq.com if this keeps happening.`;
      statusEl.className = 'checkout-status error';
    } else {
      alert('Could not start checkout: ' + e.message + '\n\nIf this keeps happening, email hello@semester-hq.com.');
    }
  }
}
