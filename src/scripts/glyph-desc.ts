/**
 * Encrypted article teasers (listings and the locked article page).
 *
 * The line is made of frozen glyphs and is NEVER readable. While the pointer
 * is over it (or the row is focused) the glyphs churn; when it leaves, they
 * freeze again. The text itself is never present in the DOM, only glyphs.
 */
export {};

const GLYPHS = [...'ᗩᘺᓰᑢᑘᖇᕵᘜᘉᕼᕴᓍᕲᐺᖽᐸᗱᖴ0123456789'];
const STEP_MS = 70; // glyph refresh rate while hovered

interface State {
  out: HTMLElement;
  template: string[];
  last: number;
}

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const states = new Map<HTMLElement, State>();
const active = new Set<State>();
let raf = 0;

const glyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

function stateOf(el: HTMLElement): State | null {
  let s = states.get(el);
  if (s) return s;
  const out = el.querySelector<HTMLElement>('[data-glyph-text]');
  if (!out) return null;
  s = { out, template: [...(out.textContent ?? '').trim()], last: 0 };
  states.set(el, s);
  return s;
}

function render(s: State) {
  s.out.textContent = s.template.map((c) => (/\s/.test(c) ? c : glyph())).join('');
}

function tick(now: number) {
  for (const s of active) {
    if (now - s.last >= STEP_MS) {
      render(s);
      s.last = now;
    }
  }
  raf = active.size ? requestAnimationFrame(tick) : 0;
}

function start(el: HTMLElement) {
  if (reduce || !el.hasAttribute('data-glyph')) return;
  const s = stateOf(el);
  if (!s || active.has(s)) return;
  active.add(s);
  if (!raf) raf = requestAnimationFrame(tick);
}

function stop(el: HTMLElement) {
  const s = states.get(el);
  if (s) active.delete(s);
}

/** The teaser element for an event target: itself, or the one inside its listing row. */
function teaserOf(t: EventTarget | null): { host: HTMLElement; el: HTMLElement } | null {
  const host = (t as Element | null)?.closest?.<HTMLElement>('.log-entry, [data-glyph]') ?? null;
  if (!host) return null;
  const el = host.matches('[data-glyph]') ? host : host.querySelector<HTMLElement>('[data-glyph]');
  return el ? { host, el } : null;
}

/** True when the pointer/focus came from, or goes to, somewhere outside `host`. */
const fromOutside = (e: Event, host: HTMLElement) => {
  const to = (e as PointerEvent | FocusEvent).relatedTarget;
  return !(to instanceof Node && host.contains(to));
};

document.addEventListener('pointerover', (e) => {
  if ((e as PointerEvent).pointerType === 'touch') return;
  const hit = teaserOf(e.target);
  if (hit && fromOutside(e, hit.host)) start(hit.el);
});

document.addEventListener('pointerout', (e) => {
  const hit = teaserOf(e.target);
  if (hit && fromOutside(e, hit.host)) stop(hit.el);
});

document.addEventListener('focusin', (e) => {
  const hit = teaserOf(e.target);
  if (hit) start(hit.el);
});

document.addEventListener('focusout', (e) => {
  const hit = teaserOf(e.target);
  if (hit && fromOutside(e, hit.host)) stop(hit.el);
});

document.addEventListener('astro:before-swap', () => {
  states.clear();
  active.clear();
});
