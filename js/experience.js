/* ── Semester HQ: the experience layer ──────────────────────────────
   Behaviour for the index.html sections styled by css/experience.css.
   Loaded after js/main.js.

   Three rules this file keeps:

   1. Nothing here is load-bearing. Every effect is an enhancement of
      markup that already reads correctly; css/experience.css renders
      the finished state, so no-JS and prefers-reduced-motion both get
      the whole page, just still.
   2. No layout reads in a scroll handler. Positions are measured on a
      frame tick or on resize, never inline with a style write.
   3. One rAF loop for cursor work and one for scroll work, and both
      park themselves when there is nothing to do.
────────────────────────────────────────────────────────────────── */
(() => {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (n, lo, hi) => (n < lo ? lo : n > hi ? hi : n);

  /* Progress of an element through the viewport, as 0 → 1.
     `from` and `to` are fractions of viewport height: the element's
     centre starting at `from` reads 0, reaching `to` reads 1. */
  function centreProgress(el, from, to) {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const centre = (r.top + r.height / 2) / vh;
    return clamp((from - centre) / (from - to), 0, 1);
  }

  /* ═══ The scroll loop ══════════════════════════════════════════════
     Anything that needs a number recomputed as the page moves
     registers here. The loop only runs while at least one registered
     element is near the viewport, and stops itself when none are. */

  const scrollJobs = [];
  let scrollRunning = false;

  function registerScrollJob(el, update) {
    const job = { el, update, active: false };
    scrollJobs.push(job);

    // Only pay for a job while its section is actually in play.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach(e => { job.active = e.isIntersecting; });
        if (job.active) startScrollLoop();
      }, { rootMargin: '25% 0px 25% 0px' }).observe(el);
    } else {
      job.active = true;
      startScrollLoop();
    }
    update(); // Settle on a correct value before the first scroll.
  }

  function startScrollLoop() {
    if (scrollRunning) return;
    scrollRunning = true;
    const tick = () => {
      let live = false;
      for (const job of scrollJobs) {
        if (!job.active) continue;
        live = true;
        job.update();
      }
      if (live) requestAnimationFrame(tick);
      else scrollRunning = false;
    };
    requestAnimationFrame(tick);
  }

  /* ═══ 0. The space ════════════════════════════════════════════════
     A soft pool of light that follows the cursor, the arrival of the
     room on load, and the workspace easing back as you leave it. */

  function ambientLight() {
    const light = document.querySelector('.space-light');
    if (!light) return;
    // A light that tracks a finger it cannot see is just a flicker, and
    // one that tracks a cursor someone asked to hold still is worse.
    if (!finePointer.matches || reduce.matches) return;

    let frame = 0, x = 50, y = 34;
    window.addEventListener('pointermove', (e) => {
      x = (e.clientX / window.innerWidth) * 100;
      y = (e.clientY / window.innerHeight) * 100;
      if (frame) return; // One style write per frame, at most.
      frame = requestAnimationFrame(() => {
        frame = 0;
        light.style.setProperty('--lx', x.toFixed(2) + '%');
        light.style.setProperty('--ly', y.toFixed(2) + '%');
      });
    }, { passive: true });
  }

  /* The room assembles once, on the frame after the first paint. The
     class is what every arrival transition in the CSS keys off, so if
     this never ran the page would simply already be assembled. */
  function arrive() {
    const enter = () => document.documentElement.classList.add('entered');
    // Two frames so the arrival transitions have a state to start from.
    // The timeout is not belt-and-braces: a background tab throttles
    // rAF to a couple of frames a second, and a hero that never
    // arrives is a hero nobody can see.
    const done = () => {
      requestAnimationFrame(() => requestAnimationFrame(enter));
      setTimeout(enter, 400);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', done, { once: true });
    else done();
  }

  /* Scrolling out of the hero eases the workspace back rather than
     sliding it flatly off the top. */
  function leaveHero() {
    const shot = document.querySelector('.hero-shot');
    const stage = shot && shot.querySelector('.hero-stage');
    if (!stage || reduce.matches) return;

    registerScrollJob(shot, () => {
      const r = shot.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 0 while the workspace is in place; 1 once its bottom edge has
      // reached the top of the screen.
      const exit = clamp(1 - (r.bottom / (vh * 0.9)), 0, 1);
      stage.style.setProperty('--exit', exit.toFixed(4));
    });
  }

  /* ═══ 1. The hero workspace ════════════════════════════════════════
     The dashboard leans toward the cursor and the floating cards drift
     at three different depths, so the group reads as objects in a
     space rather than one flat image. */

  function heroWorkspace() {
    const stage = document.querySelector('[data-tilt]');
    if (!stage) return;
    const inner = stage.querySelector('.hero-stage-inner');
    const floats = Array.from(stage.querySelectorAll('.hero-float'));
    if (!inner) return;

    // The cards fade in once, whatever happens with motion below.
    requestAnimationFrame(() => {
      floats.forEach((el, i) => {
        setTimeout(() => el.classList.add('in'), 520 + i * 130);
      });
    });

    // Target and current values, kept apart so the card chases the
    // cursor with weight instead of snapping to it.
    const want = { x: 0, y: 0 };
    const have = { x: 0, y: 0 };
    let running = false;
    let inside = false;

    const MAX_Y = 5;   // rotateY, degrees — the brief's ceiling
    const MAX_X = 3;   // rotateX, degrees
    const DRIFT = 26;  // px a depth-1.0 card travels at full deflection

    const frame = () => {
      // An exponential approach: 12% of the remaining gap per frame.
      have.x += (want.x - have.x) * 0.12;
      have.y += (want.y - have.y) * 0.12;

      stage.style.setProperty('--rx', (-have.y * MAX_X).toFixed(3));
      stage.style.setProperty('--ry', (have.x * MAX_Y).toFixed(3));

      for (const el of floats) {
        const d = parseFloat(el.dataset.depth || '0.5');
        el.style.setProperty('--px', (-have.x * DRIFT * d).toFixed(2));
        el.style.setProperty('--py', (-have.y * DRIFT * d).toFixed(2));
      }

      // Park the loop once it has effectively arrived and the pointer
      // has left, rather than burning frames on a still hero.
      const settled = Math.abs(want.x - have.x) < 0.001 && Math.abs(want.y - have.y) < 0.001;
      if (settled && !inside) { running = false; return; }
      requestAnimationFrame(frame);
    };

    const wake = () => {
      if (running) return;
      running = true;
      requestAnimationFrame(frame);
    };

    const onMove = (e) => {
      const r = stage.getBoundingClientRect();
      // −1 → 1 across the stage, so deflection is symmetrical.
      want.x = clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1);
      want.y = clamp(((e.clientY - r.top) / r.height - 0.5) * 2, -1, 1);
      inside = true;
      wake();
    };
    const onLeave = () => { want.x = 0; want.y = 0; inside = false; wake(); };

    function attach() {
      stage.addEventListener('pointermove', onMove);
      stage.addEventListener('pointerleave', onLeave);
    }
    function detach() {
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
      onLeave();
    }

    // Cursor tilt is for a mouse on a wide screen. A touch device gets
    // the cards, still, and no motion it cannot control.
    const eligible = () => finePointer.matches && !reduce.matches && window.innerWidth >= 1280;
    let attached = false;
    const sync = () => {
      const ok = eligible();
      if (ok && !attached) { attach(); attached = true; }
      else if (!ok && attached) { detach(); attached = false; }
    };
    sync();
    reduce.addEventListener('change', sync);
    finePointer.addEventListener('change', sync);
    window.addEventListener('resize', sync, { passive: true });
  }

  /* ═══ 2. Scatter → one HQ ══════════════════════════════════════════
     Eight scattered tools converge as the section crosses the middle
     of the screen. One custom property drives all of it; the
     interpolation itself is CSS. */

  function scatter() {
    const stage = document.querySelector('[data-scatter]');
    if (!stage || reduce.matches) return; // CSS already shows the merged state.

    registerScrollJob(stage, () => {
      const p = centreProgress(stage, 0.86, 0.44);
      stage.style.setProperty('--p', p.toFixed(4));
    });
  }

  /* ═══ 3. Six tabs, folded into one ════════════════════════════════
     Windows hanging at different depths are pulled forward and fold
     into the dashboard that replaces them. One scroll-driven number;
     CSS does the rest, including the perspective. */

  function fold() {
    const stage = document.querySelector('[data-fold]');
    if (!stage || reduce.matches) return; // CSS already shows the folded state.

    // Written to the section rather than the stage: the closing line
    // lives outside the stage and ramps in off the same number.
    const host = stage.closest('.fold') || stage;
    registerScrollJob(stage, () => {
      const p = centreProgress(stage, 0.88, 0.42);
      host.style.setProperty('--p', p.toFixed(4));
    });
  }

  /* ═══ 4. A week in the semester ════════════════════════════════════ */

  function weekLine() {
    const line = document.querySelector('[data-week]');
    if (!line || reduce.matches) return;
    const days = Array.from(line.querySelectorAll('.week-day'));

    registerScrollJob(line, () => {
      line.style.setProperty('--p', centreProgress(line, 0.92, 0.42).toFixed(4));
      // A day lights when its own dot has come up past two-thirds of
      // the screen, which reads as the line reaching it.
      const vh = window.innerHeight || 1;
      for (const d of days) {
        const r = d.getBoundingClientRect();
        d.classList.toggle('lit', r.top < vh * 0.66);
      }
    });
  }

  /* ═══ 5. Everything connected ══════════════════════════════════════
     Nodes and connectors arrive in order, once. */

  function connectFlow() {
    const flow = document.querySelector('[data-connect]');
    if (!flow) return;
    if (reduce.matches || !('IntersectionObserver' in window)) { flow.classList.add('lit'); return; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        flow.classList.add('lit');
        io.disconnect();
      });
    }, { threshold: 0.28 });
    io.observe(flow);
  }

  /* ═══ 6. The semester timeline ═════════════════════════════════════
     Computed from the dates in the markup rather than written into it,
     so the figure is right on every future day instead of only the day
     it was typed. The dates themselves are an example term, and the
     markup says so. */

  function termTimeline() {
    const track = document.querySelector('[data-term]');
    if (!track) return;

    const start = Date.parse(track.dataset.start + 'T00:00:00');
    const end = Date.parse(track.dataset.end + 'T00:00:00');
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;

    const now = Date.now();
    const frac = clamp((now - start) / (end - start), 0, 1);
    const pct = Math.round(frac * 100);

    const DAY = 86400000;
    const weeks = Math.max(1, Math.ceil((end - start) / (DAY * 7)));
    const week = clamp(Math.floor((now - start) / (DAY * 7)) + 1, 1, weeks);

    // Months already behind us read in ink rather than grey.
    track.querySelectorAll('.term-month[data-date]').forEach(m => {
      const d = Date.parse(m.dataset.date + 'T00:00:00');
      if (Number.isFinite(d) && d <= now) m.classList.add('past');
    });

    const pctOut = document.querySelector('[data-term-pct]');
    const weekOut = document.querySelector('[data-term-week]');
    const label = track.querySelector('.term-now-label');

    // Before the term and after it, "week 1 of 16" would be a lie, so
    // each end gets its own wording.
    if (now < start) {
      if (pctOut) pctOut.textContent = '0%';
      if (weekOut) weekOut.textContent = 'The term has not started yet.';
      if (label) label.textContent = 'Week 1';
    } else if (now >= end) {
      if (pctOut) pctOut.textContent = '100%';
      if (weekOut) weekOut.textContent = 'The term is over. Semester Wrapped is waiting.';
      if (label) label.textContent = 'Done';
    } else {
      if (pctOut) pctOut.textContent = pct + '%';
      if (weekOut) weekOut.textContent = `You are in week ${week} of ${weeks}. Semester HQ knows that, so the dashboard opens on this week rather than on a blank month.`;
      if (label) label.textContent = 'Week ' + week;
    }

    // Set on a later frame so the fill animates from zero rather than
    // appearing already full.
    const paint = () => track.style.setProperty('--pct', pct + '%');
    if (reduce.matches || !('IntersectionObserver' in window)) { paint(); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { paint(); io.disconnect(); } });
    }, { threshold: 0.3 });
    io.observe(track);
  }

  /* ═══ 7. Magnetic buttons ══════════════════════════════════════════
     A few pixels toward the cursor. Enough to feel answered, not
     enough to make the button a moving target — and never on a touch
     screen, where there is no cursor to answer. */

  function magnetic() {
    if (reduce.matches || !finePointer.matches) return;
    const PULL = 4; // px

    document.querySelectorAll('.magnetic').forEach(btn => {
      let frame = 0;
      const move = (e) => {
        if (frame) return; // One write per frame, at most.
        frame = requestAnimationFrame(() => {
          frame = 0;
          const r = btn.getBoundingClientRect();
          const dx = ((e.clientX - r.left) / r.width - 0.5) * 2;
          const dy = ((e.clientY - r.top) / r.height - 0.5) * 2;
          btn.style.setProperty('--mx', (clamp(dx, -1, 1) * PULL).toFixed(2));
          btn.style.setProperty('--my', (clamp(dy, -1, 1) * PULL).toFixed(2));
        });
      };
      const rest = () => {
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        btn.style.setProperty('--mx', '0');
        btn.style.setProperty('--my', '0');
      };
      btn.addEventListener('pointermove', move);
      btn.addEventListener('pointerleave', rest);
      // A button that keeps its offset after being clicked looks stuck.
      btn.addEventListener('blur', rest);
    });
  }

  /* ═══ 8. Counters ══════════════════════════════════════════════════
     Only plain whole numbers count up. "$7.99" and "Live" are left
     exactly as written — a counter that mangles a price is worse than
     no counter. */

  function counters() {
    const targets = Array.from(document.querySelectorAll('[data-count]'))
      .filter(el => /^\d+$/.test(el.textContent.trim()));
    if (!targets.length) return;

    if (reduce.matches || !('IntersectionObserver' in window)) return; // Already correct in the markup.

    const run = (el) => {
      const to = parseInt(el.textContent.trim(), 10);
      if (to === 0) return; // Nothing to count to, and "0" is the point.
      const DURATION = 900;
      const t0 = performance.now();
      el.classList.add('counting');
      const step = (t) => {
        const k = clamp((t - t0) / DURATION, 0, 1);
        // Ease out, so it decelerates into the real figure.
        el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(step);
        else el.textContent = String(to); // Land exactly on it.
      };
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        run(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    targets.forEach(el => io.observe(el));
  }

  /* ═══ Go ═══════════════════════════════════════════════════════════ */

  ambientLight();
  arrive();
  heroWorkspace();
  leaveHero();
  scatter();
  fold();
  weekLine();
  connectFlow();
  termTimeline();
  magnetic();
  counters();

  // One shared wake-up for the scroll loop. The loop itself decides
  // whether there is anything to do.
  window.addEventListener('scroll', startScrollLoop, { passive: true });
  window.addEventListener('resize', startScrollLoop, { passive: true });
})();
