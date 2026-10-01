/* Inner pages, design v2: the phone menu and the phone sticky bar.
   js/main.js still sets .scrolled on #nav. Loaded after main.js. */
(() => {
  'use strict';
  const nav = document.getElementById('nav');
  const toggle = nav && nav.querySelector('.g-toggle');
  if (toggle) {
    const setOpen = (open) => {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('.g-links a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); toggle.focus(); }
    });
  }

  // Sticky bar: shown once the first screen has scrolled away, hidden
  // again while the final call to action or the footer is on screen.
  const bar = document.querySelector('.g-sticky');
  if (!bar) return;
  const ends = [...document.querySelectorAll('.final-cta, .g-foot')];
  const seen = new Set();
  const sync = () => bar.classList.toggle('show', window.scrollY > window.innerHeight * 0.8 && seen.size === 0);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { es.forEach(e => e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)); sync(); });
    ends.forEach(el => io.observe(el));
  }
  addEventListener('scroll', sync, { passive: true });
  sync();
})();
