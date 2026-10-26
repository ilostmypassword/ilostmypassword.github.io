/**
 * "Decode" effect, site-wide: text starts as noise and resolves left to right.
 *
 * - On page load, the home tagline and the Posts / About titles decode
 *   (see MAIN). Nothing else animates on load.
 * - Hovering a navbar link re-decodes it (see HOVER).
 *   The sidebar never animates.
 * - Elements already on screen decode immediately; the others decode once,
 *   when they scroll into view.
 * - Does nothing with prefers-reduced-motion. Text is always plain without JS.
 *
 * Add `data-no-scramble` to an element to opt out; to add more targets,
 * extend MAIN or HOVER below.
 */
export {};

const GLYPHS = [...'ᗩᘺᓰᑢᑘᖇᕵᘜᘉᕼᕴᓍᕲᐺᖽᐸᗱᖴ0123456789'];
// Same-width-ish characters for locked elements (navbar), so noise stays inside the link.
const NARROW_GLYPHS = [...'0123456789abcdeghnopqrsuvxyz#%*+=/'];

const MAIN = ['main .decode', 'main [data-decode]'];
const HOVER = ['.top-nav a'];

// Load effect: a short wave of noise sweeping across otherwise readable text.
const SOFT_WINDOW = 5;
const SOFT_STEP = 50;
// Hover effect (navbar): full noise, fast. The link's box is frozen during the
// effect (see `lock`), so speed doesn't affect clickability.
const HOVER_MS = 400;
const HOVER_STEP = 45;

interface Options {
  delay?: number;
  soft?: boolean;
  win?: number;
  ms?: number;
  step?: number;
  lock?: boolean;
}

interface Part {
  node: Text;
  chars: string[];
}
interface Task {
  el: HTMLElement;
  start: number;
  duration: number;
  parts: Part[];
  total: number;
  last: number;
  soft: boolean;
  win: number;
  step: number;
  glyphs: string[];
  unlock: (() => void) | null;
}

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tasks = new Set<Task>();
const running = new Set<HTMLElement>();
let raf = 0;
let io: IntersectionObserver | null = null;


const glyph = (set: string[]) => set[(Math.random() * set.length) | 0];

function render(task: Task, front: number) {
  let g = 0;
  for (const part of task.parts) {
    let out = '';
    for (const ch of part.chars) {
      if (/\s/.test(ch)) out += ch;
      else if (task.soft) out += g >= front - task.win && g < front ? glyph(task.glyphs) : ch;
      else out += g < front ? ch : glyph(task.glyphs);
      g++;
    }
    part.node.data = out;
  }
}

function tick(now: number) {
  for (const t of tasks) {
    const p = Math.min(1, Math.max(0, (now - t.start) / t.duration));
    if (now - t.last > t.step || p === 1) {
      if (t.soft) render(t, p === 1 ? t.total + t.win : Math.floor(p * (t.total + t.win)));
      else render(t, p === 1 ? t.total : Math.floor(p * p * t.total));
      t.last = now;
    }
    if (p === 1) {
      t.unlock?.();
      tasks.delete(t);
      running.delete(t.el);
    }
  }
  raf = tasks.size ? requestAnimationFrame(tick) : 0;
}

function begin(el: HTMLElement, opts: Options = {}) {
  const { delay = 0, soft = false, win = SOFT_WINDOW, ms, step = SOFT_STEP, lock = false } = opts;
  if (el.hasAttribute('data-no-scramble') || el.closest('.sidebar')) return;
  const parts: Part[] = [];
  let total = 0;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const node = n as Text;
    if (!node.data.trim()) continue;
    const chars = [...node.data];
    parts.push({ node, chars });
    total += chars.length;
  }
  if (!total) return;

  // Freeze the box while glyphs of other widths are swapped in, so the click
  // target never moves under the pointer, and clip anything that still
  // overflows so it can't paint over the neighbouring links.
  let unlock: (() => void) | null = null;
  if (lock) {
    const w = el.getBoundingClientRect().width;
    el.style.width = `${w}px`;
    el.style.whiteSpace = 'nowrap';
    el.style.clipPath = 'inset(0)';
    unlock = () => {
      el.style.removeProperty('width');
      el.style.removeProperty('white-space');
      el.style.removeProperty('clip-path');
    };
  }

  const task: Task = {
    el,
    start: performance.now() + delay,
    duration: ms ?? Math.min(900, 450 + total * 8),
    parts,
    total,
    last: 0,
    soft,
    win,
    step,
    glyphs: lock ? NARROW_GLYPHS : GLYPHS,
    unlock,
  };
  tasks.add(task);
  running.add(el);
  render(task, 0);
  if (!raf) raf = requestAnimationFrame(tick);
}

function start() {
  io?.disconnect();
  if (reduce) return;

  const selector = MAIN.join(',');

  io = new IntersectionObserver(
    (entries, obs) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        obs.unobserve(e.target);
        begin(e.target as HTMLElement, { soft: true });
      }
    },
    { rootMargin: '0px 0px -6% 0px' },
  );

  let i = 0;
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) begin(el, { delay: Math.min(i++, 8) * 70, soft: true });
    else io.observe(el);
  }
}

// Wait for the boot overlay (first visit of a session) to leave before decoding.
document.addEventListener('astro:page-load', () => {
  if (document.documentElement.classList.contains('booting')) {
    document.addEventListener('boot:done', start, { once: true });
  } else {
    start();
  }
});

// Hover: re-decode the hovered element (delegated, so it survives page swaps).
if (!reduce) {
  const hoverSelector = HOVER.join(',');
  document.addEventListener('pointerover', (e) => {
    if ((e as PointerEvent).pointerType === 'touch') return;
    const el = (e.target as Element | null)?.closest<HTMLElement>(hoverSelector);
    if (!el) return;
    if (e.relatedTarget instanceof Node && el.contains(e.relatedTarget)) return;
    for (const r of running) if (r === el || r.contains(el) || el.contains(r)) return;
    begin(el, { ms: HOVER_MS, step: HOVER_STEP, lock: true });
  });
}

document.addEventListener('astro:before-swap', () => {
  document.removeEventListener('boot:done', start);
  io?.disconnect();
  tasks.clear();
  running.clear();
});
