# Legal Review Brief — Semester HQ Privacy Policy & Terms of Service

**Purpose:** Semester HQ charges $7.99/month for "Semester HQ Plus" via Stripe (recurring subscription, cancel anytime — not a one-time purchase). The attached `privacy.html` and `terms.html` were drafted by AI (not an attorney) based on the actual product behavior. This brief summarizes what's in them and flags the specific areas most likely to need professional review before real money changes hands.

---

## What's currently covered

**Privacy Policy** (`privacy.html`)
- Local-only usage requires no account/data collection
- Google sign-in (via Firebase Auth) collects name, email, profile photo
- Planner content (courses, grades, notes, etc.) stored in Firestore when signed in
- Uploaded syllabi/documents sent to Anthropic's Claude API for parsing; not retained after processing
- Stripe handles payment; Semester HQ only sees email + payment confirmation
- Study groups: shared visibility of items among group members
- No data sale, no ad trackers, no AI training on user content
- Listed subprocessors: Google Firebase, Anthropic, Stripe, Cloudflare
- User controls: export (JSON), delete (local wipe + email-based account deletion), 30-day recovery window
- Children's privacy: service intended for 13+, no knowing collection under 13
- Contact: single email address, no physical address

**Terms of Service** (`terms.html`)
- Describes the service and $7.99/month Semester HQ Plus subscription pricing (auto-renews monthly until canceled; price changes apply going forward with notice, not retroactively)
- Cancel anytime, no refund for the current period; 14-day, no-questions-asked refund on the first charge only
- Account security responsibility on the user
- Acceptable use clause (no illegal use, no reverse-engineering, no resale)
- AI feature disclaimer (output can be wrong, user must review before it's added to the planner)
- Availability disclaimer (no uptime guarantee)
- "As is" disclaimer + limitation of liability for indirect/incidental/consequential damages
- Termination clause
- No governing law, venue, dispute resolution, or arbitration clause
- No liability cap (dollar amount)
- No named legal entity or business address — only "Semester HQ" and an email

---

## Areas most likely to need a lawyer's eye

**1. Refund policy enforceability**
The "14 days, no questions asked" language (scoped to the first charge only, per current terms) is a strong, buyer-friendly commitment, but it's not tied to how refunds are actually issued through Stripe (timing, partial vs. full, what happens if Plus was already used to process AI uploads). Because this is now a recurring subscription, several US states have specific auto-renewal disclosure and cancellation-ease requirements (e.g., California's Automatic Renewal Law, similar statutes in NY/several other states) that apply to subscriptions in a way they didn't to a one-time purchase — worth explicit confirmation that the current terms satisfy them. A lawyer can also confirm the refund language doesn't conflict with card network / Stripe dispute rules.

**2. Liability limitation language**
The "as is" / limitation of liability clause disclaims indirect and consequential damages but:
- Has no liability cap (e.g., "capped at amount paid in the last 12 months") — most enforceable limitation clauses include one.
- Has no indemnification clause protecting you if a user's use of the product causes harm to a third party.
- Given the AI syllabus-parsing feature could plausibly cause a student to miss a real deadline, a lawyer should assess whether the current disclaimer is strong enough, especially paired with the fact that there's no arbitration/class-action-waiver clause limiting how disputes get resolved.

**3. Data processor list completeness**
The privacy policy lists Firebase, Anthropic, Stripe, and Cloudflare. Worth double-checking against what's *actually* wired up in the product before a lawyer reviews it, e.g.:
- Any analytics or crash-reporting tool (even privacy-friendly ones like Plausible) isn't mentioned — should be listed if present.
- Email delivery for account/refund correspondence (whatever sends mail from `hello@semester-hq.com`) isn't named.
- If Firebase Firestore/Auth data is hosted in a specific region, that's relevant for the jurisdiction question below.

**4. Jurisdiction — the big open item**
Neither document states which state or country Semester HQ operates from, and the Terms have no governing law / venue clause at all. This affects:
- Which state consumer protection and refund laws apply to you.
- Whether you need a registered business entity name and physical/mailing address in the Terms (many states require this for enforceable consumer contracts).
- Whether GDPR (UK/EU users) or state privacy laws beyond COPPA (CCPA/CPRA for California, plus newer state laws like VCDPA, CPA) apply — relevant if any students studying abroad or international students use the product, since college populations are more likely than average to include this.
- If GDPR could apply: the current privacy policy lacks the legal-basis-for-processing, retention-period, and "right to lodge a complaint with a supervisory authority" language GDPR expects.

**5. Clickwrap validity**
Not addressed in either doc, but worth asking your lawyer: is the Terms of Service actually being agreed to at signup (e.g., a checkbox: "I agree to the Terms of Service and Privacy Policy") or just linked in a footer? Browsewrap-only agreements (just posting the page) are more likely to be found unenforceable than clickwrap (affirmative checkbox at signup).

**6. COPPA / age-gate mechanics**
The "13+, we don't knowingly collect from under 13" line is the standard COPPA mitigation language, but it typically needs to be paired with an actual age gate or affirmation at signup to hold up. Worth confirming the signup flow has something like this, and flagging to the lawyer if it doesn't yet.

---

## Bottom line
The drafts are honest and reasonably complete for what the product does today — nothing here suggests bad-faith or misleading language. But there's no liability cap, no governing law clause, no confirmed business entity/address, and an unresolved jurisdiction question, all of which matter more once real payments start. Recommend at minimum a paid one-time review from a startup/SaaS-focused attorney (or a service like Termly/Clerky's legal network) rather than shipping these as final — the fix is likely a few hours of attorney time, not a rewrite.
