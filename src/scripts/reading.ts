/**
 * Reading mode (posts only) + table-of-contents tracking.
 *
 * - Press F (or click the button) to hide the sidebar, navbar and footer and
 *   read the post in a single centred column. Esc / F exits.
 *   The mode follows you from one post to the next and switches off on
 *   any other page.
 * - The "On this page" list highlights the section being read.
 */
export {};

let reading = false;
let tocObserver: IntersectionObserver | null = null;

const isPost = () => Boolean(document.querySelector('.post'));

function apply() {
  const on = reading && isPost();
  if (reading && !on) reading = false;
  document.documentElement.classList.toggle('reading', on);
  for (const b of document.querySelectorAll<HTMLElement>('[data-reading-toggle]')) {
    b.setAttribute('aria-pressed', String(on));
  }
}

function toggle(force?: boolean) {
  if (!isPost()) return;
  reading = force ?? !reading;
  apply();
  if (reading) scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
}

function trackToc() {
  tocObserver?.disconnect();
  tocObserver = null;
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.toc a[href^="#"]')];
  if (!links.length) return;
  const byId = new Map<string, HTMLAnchorElement>();
  for (const a of links) byId.set(decodeURIComponent(a.hash.slice(1)), a);
  const heads = [...byId.keys()]
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => Boolean(el));
  if (!heads.length) return;

  const setActive = (id: string) => {
    for (const [k, a] of byId) {
      if (k === id) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    }
  };
  tocObserver = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
    },
    { rootMargin: '-12% 0px -75% 0px' },
  );
  for (const h of heads) tocObserver.observe(h);
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target as HTMLElement | null;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  if (document.querySelector('.palette[open], dialog[open]')) return;
  if (e.key === 'f' || e.key === 'F') {
    if (!isPost()) return;
    e.preventDefault();
    toggle();
  } else if (e.key === 'Escape' && reading) {
    toggle(false);
  }
});

document.addEventListener('click', (e) => {
  if ((e.target as Element | null)?.closest('[data-reading-toggle]')) toggle();
});

document.addEventListener('astro:after-swap', apply);
document.addEventListener('astro:before-swap', () => tocObserver?.disconnect());
document.addEventListener('astro:page-load', () => {
  apply();
  trackToc();
});
document.addEventListener('content:decrypted', trackToc);
