// Nav scroll state
const nav = document.getElementById('nav');
function onScroll() {
  if (window.scrollY > 40) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Reveal on scroll. Elements start with pointer-events:none (see .reveal in
// styles.css) so a not-yet-visible CTA can't intercept a click before it's
// actually in place — this observer is what turns clicking back on.
if ('IntersectionObserver' in window) {
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
