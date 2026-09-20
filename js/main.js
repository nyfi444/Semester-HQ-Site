/* ── Semester HQ marketing site ─────────────────────────────────
   Nav state, the mobile menu, reveal-on-scroll, and the demo facade.
   Loaded last on every page. */

// The `js` class is what lets .reveal blocks start hidden (styles.css).
// index.html also sets it from a one-liner in <head> so nothing flashes on
// the long page; this covers every other page.
document.documentElement.classList.add('js');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Nav scroll state
const nav = document.getElementById('nav');
function onScroll() {
  if (!nav) return;
  if (window.scrollY > 40) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Mobile menu: a real button that reveals the links under 980px.
const navToggle = nav && nav.querySelector('.nav-toggle');
if (navToggle) {
  const setOpen = (open) => {
    nav.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
  };
  navToggle.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('.nav-links a')) setOpen(false); });
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('open') && !nav.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); navToggle.focus(); }
  });
}

// Reveal on scroll. Elements start with pointer-events:none (see .reveal in
// styles.css) so a not-yet-visible CTA can't intercept a click before it's
// actually in place. This observer is what turns clicking back on. With
// reduced motion on, or without IntersectionObserver, everything is simply
// shown.
if (!reduceMotion && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));

  // Safety net: if anything is ever missed (font swap reflow, a resize
  // mid-animation, etc.), don't leave a button permanently unclickable.
  setTimeout(() => {
    document.querySelectorAll('.reveal:not(.in)').forEach(el => el.classList.add('in'));
  }, 4000);
} else {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
}

// The demo facade on index.html: a screenshot with one button. The live app
// only loads once someone asks for it. Under 700px an iframe would trap the
// page's scrolling, so phones get the app in a new tab instead.
const demoFacade = document.getElementById('demo-facade');
if (demoFacade) {
  const demoUrl = demoFacade.dataset.demoUrl || 'https://app.semester-hq.com/';
  const openDemo = () => {
    if (window.matchMedia('(max-width: 699px)').matches) {
      window.open(demoUrl, '_blank', 'noopener');
      return;
    }
    const frame = document.createElement('iframe');
    frame.src = demoUrl;
    frame.title = 'Semester HQ: live app';
    frame.loading = 'lazy';
    demoFacade.replaceWith(frame);
    frame.focus();
  };
  demoFacade.addEventListener('click', (e) => { e.preventDefault(); openDemo(); });
}
