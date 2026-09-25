/* ── Semester HQ: the world ─────────────────────────────────────────
   The motion layer that goes with css/world.css. Loaded last on every
   page (after main.js, and after pricing.js where a page has it).

   What it does, each part null-safe so it simply skips on a page
   without its markup:
   1. Legacy anchors (home only). The site used to be one long page, so
      old links point at fragments: https://semester-hq.com/#pricing
      (still used inside the app), /#try, /#faq … GitHub Pages never sees
      a fragment, so the forward has to happen here. index.html's <head>
      does the same hop before first paint; this is the fallback and
      also covers a hash change while the home page is open.
   2. Marks the session as entered, so the arrival on the home page only
      plays when home is the first page of the visit.
   3. The arrival (home only): the ✦ lights and opens onto the hero.
   4. The live term readout: week N of the example term, from today.
   5. The dashboard slab settling flat as it scrolls into view (home).
   6. Cursor parallax on the panes and the hero ornaments: fine pointer
      only, off under reduced motion.
   7. Doorway panes settling into place as they arrive (motion only).
   8. Sub-nav scrollspy on inner pages: the chip for the section in view
      gets aria-current="true" (none above the first section).

   Not here, because js/main.js already owns them: the nav's .scrolled
   state, the phone menu (.nav-toggle / .open), .reveal, #demo-facade.
────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var doc = document.documentElement;
  var body = document.body;
  var isHome = !!(body && body.classList.contains('home'));

  /* ── 1. Legacy anchors → their new pages ──────────────────────────
     Keep in step with the copy of this map in index.html's <head>.
     #top and #guides stay on the home page. */
  var LEGACY = {
    'try': 'demo.html',
    'features': 'features.html',
    'also': 'features.html#also',
    'how': 'how-it-works.html',
    'connected': 'how-it-works.html#connected',
    'students': 'students.html',
    'term': 'students.html#term',
    'faq': 'faq.html',
    'pricing': 'pricing.html',
    'proof': 'pricing.html#proof',
    'testimonials': 'pricing.html#proof'
  };
  function legacyTarget(hash) {
    var id = String(hash || '').replace(/^#/, '');
    if (!id) return '';
    if (Object.prototype.hasOwnProperty.call(LEGACY, id)) return LEGACY[id];
    if (/^feat-[a-z0-9-]+$/.test(id)) return 'features.html#' + id;
    return '';
  }
  function hop() {
    var to = legacyTarget(location.hash);
    if (to) { location.replace(to); return true; }
    return false;
  }
  if (isHome) {
    if (hop()) return;
    window.addEventListener('hashchange', hop);
  }

  /* ── 2. This visit has entered the world ─────────────────────────── */
  try { sessionStorage.setItem('shq-entered', '1'); } catch (e) { /* storage off: fine */ }

  /* ── Helpers ──────────────────────────────────────────────────────── */
  function mq(q) { return window.matchMedia ? window.matchMedia(q) : { matches: false }; }
  var mqReduce = mq('(prefers-reduced-motion: reduce)');
  var mqFine = mq('(hover: hover) and (pointer: fine)');
  function motionOK() { return !mqReduce.matches; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function listen(m, fn) {
    if (!m) return;
    if (m.addEventListener) m.addEventListener('change', fn);
    else if (m.addListener) m.addListener(fn);
  }
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

  var stage = document.querySelector('[data-stage]');

  function syncMotion() {
    doc.classList.toggle('motion', motionOK());
    if (!motionOK()) {
      // Put every cursor- and scroll-driven value back to rest.
      each('[data-panes], [data-stage], .pane', function (el) {
        ['--mx', '--my', '--hx', '--hy', '--px', '--py', '--tilt'].forEach(function (p) { el.style.removeProperty(p); });
      });
    }
  }
  syncMotion();
  listen(mqReduce, function () { syncMotion(); onScroll(); });

  /* ── 4. The example term, computed from its dates ─────────────────
     Aug 24 to Dec 11, 2026. Anything marked data-live-term gets the
     live value; the markup already holds a sensible static fallback. */
  (function fillTerm() {
    if (!document.querySelector('[data-live-term]')) return;
    var DAY = 864e5;
    var start = new Date(2026, 7, 24);
    var end = new Date(2026, 11, 11);
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var total = Math.round((end - start) / DAY);
    var weeks = Math.ceil((total + 1) / 7);
    var elapsed = Math.round((today - start) / DAY);
    var e = clamp(elapsed, 0, total);
    var week = clamp(Math.floor(e / 7) + 1, 1, weeks);
    var pct = Math.round((e / total) * 100);
    var t;
    if (elapsed < 0) t = { week: 'Soon', of: '', span: 'Starts Aug 24', portal: 'Fall 2026 · Starts Aug 24' };
    else if (elapsed > total) t = { week: 'Done', of: '', span: 'Finals are behind you', portal: 'Fall 2026 · Term complete' };
    else t = { week: 'Week ' + week, of: 'of ' + weeks, span: pct + '% through the term', portal: 'Fall 2026 · Week ' + week + ' of ' + weeks };
    each('[data-live-term]', function (el) {
      var k = el.getAttribute('data-live-term');
      if (k === 'bar') el.style.setProperty('--p', String(pct / 100));
      else if (t[k] !== undefined) el.textContent = t[k];
    });
  })();

  /* ── 3. The arrival ───────────────────────────────────────────────── */
  var STAR = [[0, -10], [0.6, -3.2], [3.2, -0.6], [10, 0], [3.2, 0.6], [0.6, 3.2], [0, 10], [-0.6, 3.2], [-3.2, 0.6], [-10, 0], [-3.2, -0.6], [-0.6, -3.2]];
  function starPath(s, rot) {
    var c = Math.cos(rot), n = Math.sin(rot);
    function p(i) {
      var x = STAR[i][0] * s, y = STAR[i][1] * s;
      return (x * c - y * n).toFixed(3) + ' ' + (x * n + y * c).toFixed(3);
    }
    return 'M' + p(0) + 'C' + p(1) + ' ' + p(2) + ' ' + p(3) +
      'C' + p(4) + ' ' + p(5) + ' ' + p(6) +
      'C' + p(7) + ' ' + p(8) + ' ' + p(9) +
      'C' + p(10) + ' ' + p(11) + ' ' + p(0) + 'Z';
  }

  var arrival = document.getElementById('arrival');
  if (arrival && isHome && doc.classList.contains('has-portal')) runArrival();

  function runArrival() {
    var veil = arrival.querySelector('.arrival-veil');
    var core = arrival.querySelector('.arrival-core');
    var rim = arrival.querySelector('.arrival-rim');
    var glow = arrival.querySelector('.arrival-glow');
    var halo = arrival.querySelector('.arrival-halo');
    var label = arrival.querySelector('.arrival-label');
    var ended = false, raf = 0, timer = 0;
    var skipEvents = ['keydown', 'pointerdown', 'wheel', 'touchstart', 'scroll'];
    var OUTER = 'M-90 -90H90V90H-90Z';

    function hide() { arrival.hidden = true; doc.classList.add('portal-done'); }
    function end(skipped) {
      if (ended) return;
      ended = true;
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(timer);
      skipEvents.forEach(function (ev) { window.removeEventListener(ev, onSkip, true); });
      if (skipped) {
        doc.classList.add('portal-skipped');
        arrival.classList.add('is-skip');
        setTimeout(hide, 190);
      } else {
        hide();
      }
    }
    function onSkip() { end(true); }
    skipEvents.forEach(function (ev) { window.addEventListener(ev, onSkip, { capture: true, passive: true }); });

    if (!veil || !core || !rim || !glow || !halo || !label || !motionOK()) {
      // Reduced motion (or odd markup): CSS holds the lit star for a
      // beat and fades the veil; this just tidies up after it.
      timer = setTimeout(function () { end(false); }, 900);
      return;
    }

    var T_IGNITE = 380, T_OPEN = 460, T_OPENED = 1200, T_END = 1320, S_MAX = 19;
    var t0 = 0;
    // Hard stop, whatever the frame rate does.
    timer = setTimeout(function () { end(false); }, 1500);

    function frame(now) {
      if (!t0) t0 = now;
      var t = now - t0;
      var ea = 1 - Math.pow(1 - clamp(t / T_IGNITE, 0, 1), 3);
      var b = clamp((t - T_OPEN) / (T_OPENED - T_OPEN), 0, 1);
      var s, rot, coreOp, rimOp, labelOp;
      if (b <= 0) {
        s = 0.22 + 0.78 * ea;
        rot = -0.35 * (1 - ea);
        coreOp = ea; rimOp = ea; labelOp = ea;
      } else {
        s = Math.pow(S_MAX, Math.pow(b, 1.5));
        rot = 0.26 * Math.pow(b, 1.5);
        coreOp = 1 - clamp(b / 0.3, 0, 1);
        rimOp = 1 - clamp((b - 0.5) / 0.5, 0, 1);
        labelOp = 1 - clamp(b / 0.2, 0, 1);
      }
      var d = starPath(s, rot);
      veil.setAttribute('d', b > 0 ? OUTER + d : OUTER);
      core.setAttribute('d', d);
      rim.setAttribute('d', d);
      glow.setAttribute('d', d);
      core.style.opacity = coreOp.toFixed(3);
      rim.style.opacity = rimOp.toFixed(3);
      glow.style.opacity = (rimOp * 0.9).toFixed(3);
      halo.style.opacity = labelOp.toFixed(3);
      label.style.opacity = labelOp.toFixed(3);
      if (t > T_OPENED) arrival.style.opacity = (1 - clamp((t - T_OPENED) / (T_END - T_OPENED), 0, 1)).toFixed(3);
      if (t >= T_END) { end(false); return; }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  /* ── 5. The slab settles flat as it comes into view ───────────────── */
  var scrollQueued = false;
  function onScroll() {
    if (!stage) return;
    if (!motionOK()) { stage.style.removeProperty('--tilt'); return; }
    var r = stage.getBoundingClientRect();
    var vh = window.innerHeight || 1;
    var p = clamp((vh * 0.98 - r.top) / (vh * 0.72), 0, 1);
    var eased = 1 - Math.pow(1 - p, 2);
    var max = window.innerWidth <= 700 ? 8 : 15;
    stage.style.setProperty('--tilt', (max * (1 - eased)).toFixed(2) + 'deg');
  }
  if (stage) {
    window.addEventListener('scroll', function () {
      if (scrollQueued) return;
      scrollQueued = true;
      requestAnimationFrame(function () { scrollQueued = false; onScroll(); });
    }, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  /* ── 6. Cursor depth ──────────────────────────────────────────────── */
  function follow(host, apply) {
    if (!host) return;
    var cur = { x: 0, y: 0 }, tgt = { x: 0, y: 0 }, raf = 0;
    function loop() {
      cur.x += (tgt.x - cur.x) * 0.085;
      cur.y += (tgt.y - cur.y) * 0.085;
      apply(cur.x, cur.y);
      if (Math.abs(tgt.x - cur.x) > 0.001 || Math.abs(tgt.y - cur.y) > 0.001) raf = requestAnimationFrame(loop);
      else raf = 0;
    }
    function aim(x, y) { tgt.x = x; tgt.y = y; if (!raf) raf = requestAnimationFrame(loop); }
    host.addEventListener('pointermove', function (e) {
      if (!motionOK() || !mqFine.matches || e.pointerType === 'touch') return;
      var r = host.getBoundingClientRect();
      if (!r.width || !r.height) return;
      aim(clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1), clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1));
    });
    host.addEventListener('pointerleave', function () { if (motionOK()) aim(0, 0); });
  }

  var panesEl = document.querySelector('[data-panes]');
  follow(panesEl, function (x, y) {
    panesEl.style.setProperty('--mx', x.toFixed(4));
    panesEl.style.setProperty('--my', y.toFixed(4));
  });
  follow(document.querySelector('[data-hero]'), function (x, y) {
    if (!stage) return;
    stage.style.setProperty('--hx', x.toFixed(4));
    stage.style.setProperty('--hy', y.toFixed(4));
  });
  each('.pane', function (pane) {
    pane.addEventListener('pointermove', function (e) {
      if (!motionOK() || e.pointerType === 'touch') return;
      var r = pane.getBoundingClientRect();
      if (!r.width || !r.height) return;
      pane.style.setProperty('--px', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
      pane.style.setProperty('--py', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
    });
    pane.addEventListener('pointerleave', function () {
      pane.style.removeProperty('--px');
      pane.style.removeProperty('--py');
    });
  });

  /* ── 7. Panes settle into place as they arrive (motion only) ──────── */
  var cells = document.querySelectorAll('.door-cell');
  if (cells.length && 'IntersectionObserver' in window && motionOK()) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.1 });
    Array.prototype.forEach.call(cells, function (c) {
      // Anything already on screen at load starts settled, so nothing jumps.
      if (c.getBoundingClientRect().top < (window.innerHeight || 0)) c.classList.add('is-in');
      else io.observe(c);
    });
    doc.classList.add('io');
    // Safety net: never leave a pane lowered.
    setTimeout(function () { Array.prototype.forEach.call(cells, function (c) { c.classList.add('is-in'); }); }, 4000);
  }

  /* ── 8. Sub-nav scrollspy ─────────────────────────────────────────
     The chip for the last section whose top has passed 40% of the
     viewport is marked aria-current="true"; above the first one, none. */
  (function subnavSpy() {
    var pairs = [];
    each('.subnav a[href*="#"]', function (a) {
      var id = a.getAttribute('href').split('#')[1];
      var el = id && document.getElementById(id);
      if (el) pairs.push({ a: a, el: el });
    });
    if (!pairs.length) return;
    var current = null, queued = false;
    function update() {
      queued = false;
      var line = (window.innerHeight || 0) * 0.4, hit = null;
      for (var i = 0; i < pairs.length; i++) {
        if (pairs[i].el.getBoundingClientRect().top <= line) hit = pairs[i];
      }
      if (hit === current) return;
      if (current) current.a.removeAttribute('aria-current');
      if (hit) hit.a.setAttribute('aria-current', 'true');
      current = hit;
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue, { passive: true });
    update();
  })();
})();
