/* Home (design v2): screens rise in, phones drift a little against the
   desktop frame they sit on, and the phone sticky CTA only appears once
   the hero's own "Get started" has scrolled away. Text never waits. */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const rise = document.querySelectorAll('.rise-in');
  if (reduce || !('IntersectionObserver' in window)) {
    rise.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    rise.forEach(el => io.observe(el));
    setTimeout(() => rise.forEach(el => el.classList.add('in')), 5000);
  }

  // Parallax: each [data-drift] phone moves up to N px as its stage crosses the viewport.
  const drift = [...document.querySelectorAll('[data-drift]')];
  if (!reduce && drift.length) {
    let ticking = false;
    const run = () => {
      ticking = false;
      const vh = window.innerHeight;
      for (const el of drift) {
        const host = el.parentElement.getBoundingClientRect();
        const p = Math.max(-1, Math.min(1, (host.top + host.height / 2 - vh / 2) / vh));
        el.style.transform = `translate3d(0, ${(p * Number(el.dataset.drift)).toFixed(1)}px, 0)`;
      }
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
    addEventListener('resize', run);
    run();
  }

  // Clubs: hovering a feature under the club page rings the
  // part of the page it talks about. Positions are measured from the real
  // page by tools/export-home-images.py.
  const ring = document.querySelector('.spot-ring');
  const feats = [...document.querySelectorAll('.club-feats li[data-spot]')];
  if (ring && feats.length) {
    let spots = null;
    const aim = (li) => {
      feats.forEach(f => f.classList.toggle('is-on', f === li));
      const r = li && spots && spots[li.dataset.spot];
      ring.classList.toggle('on', !!r);
      if (r) ['x', 'y', 'w', 'h'].forEach(k => ring.style.setProperty('--' + k, r[k]));
    };
    fetch('assets/v2/club-spots.json').then(r => r.json()).then(j => { spots = j; }).catch(() => {});
    feats.forEach(li => {
      li.addEventListener('mouseenter', () => aim(li));
      li.addEventListener('mouseleave', () => aim(null));
    });
  }

  // Sticky CTA (phone): visible only when neither the hero actions nor the final CTA is on screen.
  const bar = document.querySelector('.sticky-cta');
  const watch = [document.querySelector('[data-hero-actions]'), document.querySelector('[data-final]'), document.querySelector('.footer')].filter(Boolean);
  if (bar && watch.length && 'IntersectionObserver' in window) {
    const seen = new Set();
    const io = new IntersectionObserver(es => {
      es.forEach(e => e.isIntersecting ? seen.add(e.target) : seen.delete(e.target));
      const passedHero = watch[0].getBoundingClientRect().bottom < 0;
      bar.classList.toggle('show', passedHero && seen.size === 0);
    });
    watch.forEach(el => io.observe(el));
  }
})();
