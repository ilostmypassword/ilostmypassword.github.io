/**
 * Easter egg: ↑ ↑ ↓ ↓ ← → ← → B A
 * Triggers a full-screen purple glyph rain and an "ACCESS GRANTED" toast.
 * Also leaves a hint in the devtools console.
 */
export {};

const SEQUENCE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const GLYPHS = [...'ᗩᘺᓰᑢᑘᖇᕵᘜᘉᕼᕴᓍᕲᐺᖽᐸᗱᖴ0123456789ｱｲｳｴｵｶｷｸｹｺ<>/\\{}[]#$%'];
const DURATION = 6500;

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let index = 0;
let active = false;

console.log(
  '%c ilostmypassword %c psst… ↑ ↑ ↓ ↓ ← → ← → B A ',
  'background:#6a2fa6;color:#fff;padding:2px 6px;border-radius:2px 0 0 2px',
  'background:#161b22;color:#a064e0;padding:2px 6px;border-radius:0 2px 2px 0',
);

function toast(text: string) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = text;
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('is-on'));
  setTimeout(() => {
    el.classList.remove('is-on');
    setTimeout(() => el.remove(), 500);
  }, 3200);
}

function rain() {
  const canvas = document.createElement('canvas');
  canvas.className = 'rain';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = innerWidth;
  const h = innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  const size = 16;
  const cols = Math.ceil(w / size);
  const drops = Array.from({ length: cols }, () => -Math.random() * (h / size));
  const speeds = Array.from({ length: cols }, () => 0.35 + Math.random() * 0.6);

  ctx.font = `${size}px "IBM Plex Mono", monospace`;
  requestAnimationFrame(() => canvas.classList.add('is-on'));

  const start = performance.now();
  let last = 0;
  const loop = (now: number) => {
    if (now - start > DURATION) {
      canvas.classList.remove('is-on');
      setTimeout(() => canvas.remove(), 700);
      active = false;
      return;
    }
    if (now - last > 40) {
      last = now;
      ctx.fillStyle = 'rgba(13, 17, 23, 0.14)';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < cols; i++) {
        const y = drops[i] * size;
        const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        ctx.fillStyle = Math.random() > 0.96 ? '#e4d3fb' : Math.random() > 0.5 ? '#a064e0' : '#6a2fa6';
        ctx.fillText(ch, i * size, y);
        drops[i] += speeds[i];
        if (y > h && Math.random() > 0.975) drops[i] = -Math.random() * 12;
      }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function trigger() {
  if (active) return;
  active = true;
  toast('ACCESS GRANTED');
  if (reduce) {
    active = false;
    return;
  }
  rain();
}

document.addEventListener('keydown', (e) => {
  const t = e.target as HTMLElement | null;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (key === SEQUENCE[index]) {
    index++;
    if (index === SEQUENCE.length) {
      index = 0;
      trigger();
    }
  } else {
    index = key === SEQUENCE[0] ? 1 : 0;
  }
});
