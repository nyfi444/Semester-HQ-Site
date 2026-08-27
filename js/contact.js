/* ── Contact form — same backend Worker as checkout/AI proxy.
   Writes to Firestore's `feedback` collection server-side; nothing here
   ever touches Firestore directly. See /worker/README.md in the
   student-planner repo (WORKER_URL matches js/checkout.js). ──────────── */
const CONTACT_WORKER_URL = 'https://student-planner-ai-proxy.semesterhq.workers.dev';

async function submitContactForm(event) {
  event.preventDefault();
  const form = event.target;
  const btn = form.querySelector('button[type="submit"]');
  const statusEl = document.getElementById('contact-status');
  const original = btn.textContent;

  const payload = {
    name: form.name.value,
    email: form.email.value,
    category: form.category.value,
    message: form.message.value,
    website: form.website.value, // honeypot — always empty for real people
  };

  if (!payload.email.trim() || !payload.message.trim()) {
    statusEl.textContent = 'Please fill in an email and a message.';
    statusEl.className = 'contact-status error';
    return;
  }

  btn.textContent = 'Sending…';
  btn.setAttribute('aria-disabled', 'true');
  statusEl.textContent = '';
  statusEl.className = 'contact-status';

  try {
    const res = await fetch(`${CONTACT_WORKER_URL}/contact-message`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong sending that.');

    form.reset();
    form.style.display = 'none';
    statusEl.textContent = 'Message sent — thanks! We read every one and usually reply within a day or two.';
    statusEl.className = 'contact-status success';
  } catch (e) {
    statusEl.textContent = `Could not send: ${e.message}. Email hello@semesterhq.com instead?`;
    statusEl.className = 'contact-status error';
  } finally {
    btn.textContent = original;
    btn.removeAttribute('aria-disabled');
  }
}
