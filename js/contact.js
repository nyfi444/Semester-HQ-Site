/* ── Contact form — same backend Worker as checkout/AI proxy.
   Writes to Firestore's `feedback` collection server-side; nothing here
   ever touches Firestore directly. See /worker/README.md in the
   student-planner repo (WORKER_URL matches js/checkout.js). ──────────── */
const CONTACT_WORKER_URL = 'https://student-planner-ai-proxy.semesterhq.workers.dev';

// Shared by the general contact form and the group/university pricing form —
// same Worker endpoint and honeypot/loading/error handling either way.
async function postContactMessage(payload, { form, btn, statusEl, successMsg }) {
  if (!payload.email.trim() || !payload.message.trim()) {
    statusEl.textContent = 'Please fill in an email and a message.';
    statusEl.className = 'contact-status error';
    return;
  }

  const original = btn.textContent;
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
    statusEl.textContent = successMsg;
    statusEl.className = 'contact-status success';
  } catch (e) {
    statusEl.textContent = `Could not send: ${e.message}. Email hello@semester-hq.com instead?`;
    statusEl.className = 'contact-status error';
  } finally {
    btn.textContent = original;
    btn.removeAttribute('aria-disabled');
  }
}

async function submitContactForm(event) {
  event.preventDefault();
  const form = event.target;
  const btn = form.querySelector('button[type="submit"]');
  const statusEl = document.getElementById('contact-status');

  const payload = {
    name: form.name.value,
    email: form.email.value,
    category: form.category.value,
    message: form.message.value,
    website: form.website.value, // honeypot — always empty for real people
  };

  await postContactMessage(payload, {
    form, btn, statusEl,
    successMsg: 'Message sent — thanks! We read every one and usually reply within 1–3 business days.',
  });
}

async function submitGroupContactForm(event) {
  event.preventDefault();
  const form = event.target;
  const btn = form.querySelector('button[type="submit"]');
  const statusEl = document.getElementById('contact-status');

  const org = form.org.value.trim();
  const orgType = form.orgType.value;
  const size = form.size.value.trim();
  const details = [
    org && `Institution/org: ${org}`,
    orgType && `Type: ${orgType}`,
    size && `Estimated students: ${size}`,
  ].filter(Boolean).join('\n');

  if (!org) {
    statusEl.textContent = 'Let us know the name of your school, department, or group.';
    statusEl.className = 'contact-status error';
    return;
  }

  const payload = {
    name: form.name.value,
    email: form.email.value,
    category: 'group',
    message: details ? `${details}\n\n${form.message.value}`.trim() : form.message.value,
    website: form.website.value, // honeypot
  };

  await postContactMessage(payload, {
    form, btn, statusEl,
    successMsg: 'Request sent — thanks! We usually get back to you about group pricing within 1–3 business days.',
  });
}
