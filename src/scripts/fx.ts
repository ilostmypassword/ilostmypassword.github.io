/**
 * Reading progress bar (posts only).
 * The bar lives in a persisted element (see Base.astro), so it survives
 * page transitions.
 */
export {};

let ticking = false;

function updateProgress() {
  ticking = false;
  const bar = document.querySelector<HTMLElement>('.read-progress');
  if (!bar) return;
  const post = document.querySelector<HTMLElement>('.post');
  if (!post) {
    bar.classList.remove('is-on');
    return;
  }
  const rect = post.getBoundingClientRect();
  const total = rect.height - innerHeight;
  const done = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
  bar.classList.add('is-on');
  bar.style.setProperty('--p', done.toFixed(4));
}
const schedule = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(updateProgress);
};

addEventListener('scroll', schedule, { passive: true });
addEventListener('resize', schedule);
document.addEventListener('astro:page-load', schedule);
schedule();
