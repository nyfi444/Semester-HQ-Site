/* ── Semester HQ: pricing configuration ─────────────────────────────
   The one place a price is written down.

   Every price on the site is also present as plain text in the HTML,
   because a crawler, a reader with JavaScript off, and the JSON-LD all
   need it without running anything. That means two copies, so this
   file's other job is to keep them honest: on a local preview it
   compares the markup against the config and complains in the console
   if they have drifted apart. Change the number here, run the site
   locally once, and the console tells you every place still to update.

   Grep for `data-price` to find the marked-up copies.
────────────────────────────────────────────────────────────────── */
(() => {
  'use strict';

  const PRICING = {
    currency: 'USD',
    symbol: '$',

    plus: {
      name: 'Semester HQ Plus',
      monthly: 7.99,
      // No annual plan is offered. Set this to a real number only when
      // one actually exists in Stripe; the Monthly / Annual toggle
      // below appears on its own when it does, and never invents a
      // discount from the monthly figure.
      annual: null,
      refundDays: 14,
    },

    groups: {
      name: 'Groups',
      perMemberMonthly: 5.99,
      // Self-serve range. Past the maximum it is a quote, not a
      // checkout — see group-pricing.html.
      minSeats: 5,
      maxSeats: 50,
    },
  };

  // Available to the console and to js/checkout.js if it ever needs it.
  window.SEMESTER_HQ_PRICING = PRICING;

  const money = (n) => PRICING.symbol + n.toFixed(2);

  /* Every value the markup is allowed to ask for by name. */
  const VALUES = {
    'plus.monthly': money(PRICING.plus.monthly),
    'plus.monthly.num': PRICING.plus.monthly.toFixed(2),
    'plus.name': PRICING.plus.name,
    'plus.refundDays': String(PRICING.plus.refundDays),
    'groups.perMember': money(PRICING.groups.perMemberMonthly),
    'groups.perMember.num': PRICING.groups.perMemberMonthly.toFixed(2),
    'groups.minSeats': String(PRICING.groups.minSeats),
    'groups.maxSeats': String(PRICING.groups.maxSeats),
  };

  const drift = [];

  document.querySelectorAll('[data-price]').forEach(el => {
    const key = el.dataset.price;
    const want = VALUES[key];
    if (want === undefined) {
      drift.push(`Unknown data-price key "${key}"`);
      return;
    }
    const have = el.textContent.trim();
    if (have !== want) {
      // The config wins on screen; the note below is for whoever is
      // editing, not for the reader.
      drift.push(`data-price="${key}": markup says "${have}", config says "${want}"`);
      el.textContent = want;
    }
  });

  /* Monthly / Annual toggle. Deliberately absent until an annual plan
     is configured — there is no honest way to show a second column
     without a second real price. */
  const toggleHost = document.querySelector('[data-price-toggle]');
  if (toggleHost) {
    if (PRICING.plus.annual == null) toggleHost.hidden = true;
    else toggleHost.hidden = false; // Build the control here when that day comes.
  }

  // Local preview only. Nothing is logged for a visitor.
  const local = ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname);
  if (local && drift.length) {
    console.warn(
      '[Semester HQ pricing] The markup and js/pricing.js disagree. ' +
      'The page has been corrected in the browser, but fix the HTML too ' +
      '(and check the JSON-LD, llms.txt, FAQ answers, and the other pages):\n  - ' +
      drift.join('\n  - ')
    );
  }
})();
