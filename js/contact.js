/* ── Contact form: same backend Worker as checkout (WORKER_URL, js/diagnostics.js).
   Writes to Firestore's `feedback` collection server-side; nothing here
   ever touches Firestore directly. ──────────────────────────────────── */

// Shared by the general contact form and the group/university pricing form:
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
    const res = await fetch(`${WORKER_URL}/contact-message`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong sending that.'), { status: res.status });

    form.reset();
    form.style.display = 'none';
    statusEl.textContent = successMsg;
    statusEl.className = 'contact-status success';
  } catch (e) {
    if (!(e.status < 500)) diag.error('contact', 'Could not send a contact message', e); // a 4xx is the form's answer, not a bug
    statusEl.textContent = `Could not send: ${e.message}. Email hello@semester-hq.com instead?`;
    statusEl.className = 'contact-status error';
  } finally {
    btn.textContent = original;
    btn.removeAttribute('aria-disabled');
  }
}

/* ── Reviews ───────────────────────────────────────────────────────
   A review is a contact message with a rating and permission to quote
   it, not a separate system: same Worker endpoint, same inbox, so
   nothing new has to be monitored. contact.html?review=1 (linked from
   the footer) opens the form already in review mode. It's sent under
   the `feedback` category, the same one the app's own Leave a review
   card uses, so both arrive looking identical and no Worker change is
   needed to start collecting them.
   Reviews are collected before any are shown: there's no testimonial
   section on the site yet, and inventing one would mean making up
   quotes. ─────────────────────────────────────────────────────── */
let _reviewRating = 0;
function setSiteReviewRating(n) {
  _reviewRating = n;
  document.querySelectorAll('.cf-star').forEach((el) => {
    const on = Number(el.dataset.star) <= n;
    el.textContent = on ? '★' : '☆';
    el.classList.toggle('on', on);
    el.setAttribute('aria-checked', String(Number(el.dataset.star) === n));
  });
  const read = document.getElementById('cf-rating-read');
  if (read) read.textContent = `${n} out of 5`;
}
function syncReviewFields() {
  const category = document.getElementById('cf-category');
  const fields = document.getElementById('cf-review-fields');
  const message = document.getElementById('cf-message');
  if (!category || !fields) return;
  const isReview = category.value === 'review';
  fields.hidden = !isReview;
  if (isReview && message) message.placeholder = "What's it saved you? What would you tell another student?";
}
document.addEventListener('DOMContentLoaded', () => {
  const category = document.getElementById('cf-category');
  if (!category || !document.getElementById('cf-review-fields')) return;
  if (new URLSearchParams(location.search).has('review')) category.value = 'review';
  category.addEventListener('change', syncReviewFields);
  document.querySelectorAll('.cf-star').forEach(el => el.addEventListener('click', () => setSiteReviewRating(Number(el.dataset.star))));
  syncReviewFields();
});

async function submitContactForm(event) {
  event.preventDefault();
  const form = event.target;
  const btn = form.querySelector('button[type="submit"]');
  const statusEl = document.getElementById('contact-status');
  const isReview = form.category.value === 'review';

  // The rating and the quote permission ride along in the message body, so a
  // review lands in the same inbox as everything else, fully readable.
  const quotable = !!document.getElementById('cf-quotable')?.checked;
  const message = isReview
    ? `${_reviewRating ? `Rating: ${_reviewRating}/5\n` : ''}Can be quoted publicly: ${quotable ? 'yes' : 'no'}\n\n${form.message.value}`
    : form.message.value;

  if (isReview && !_reviewRating && !form.message.value.trim()) {
    statusEl.textContent = 'Add a rating or a few words first.';
    statusEl.className = 'contact-status error';
    return;
  }

  const payload = {
    name: form.name.value,
    email: form.email.value,
    category: isReview ? 'feedback' : form.category.value,
    message,
    website: form.website.value, // honeypot, always empty for real people
  };

  await postContactMessage(payload, {
    form, btn, statusEl,
    successMsg: isReview
      ? 'Review sent. Thank you, genuinely: this is the kind of thing that decides what gets built next.'
      : 'Message sent. Thanks! We read every one and usually reply within 1–3 business days.',
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
    successMsg: 'Request sent. Thanks! We usually get back to you about group pricing within 1–3 business days.',
  });
}
