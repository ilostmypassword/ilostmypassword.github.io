/**
 * Boot sequence, shown on every full page load (never on in-site navigation).
 *
 * The inline script in Base.astro's <head> decides whether to boot and adds
 * `booting` to <html> before first paint (no flash of content). This module
 * plays the log, then removes the class and fires `boot:done` so that the
 * load-time text effects start once the overlay is gone.
 * Click, Escape, Enter or Space skips it. A CSS failsafe hides the overlay
 * even if this script never runs.
 */
export {};

const root = document.documentElement;
const overlay = document.querySelector<HTMLElement>('[data-boot]');

const LINES: { text: string; ok?: boolean; delay: number }[] = [
  { text: 'h3ik0 secure boot 1.0 · linux x86_64', delay: 140 },
  { text: 'loading kernel modules', ok: true, delay: 150 },
  { text: 'mounting /articles', ok: true, delay: 130 },
  { text: 'mounting /about', ok: true, delay: 110 },
  { text: 'unlocking vault · AES-256-GCM', ok: true, delay: 190 },
  { text: 'tuning audio engine', ok: true, delay: 130 },
  { text: 'decrypting identity', ok: true, delay: 240 },
  { text: 'welcome.', delay: 380 },
];

if (root.classList.contains('booting') && overlay) {
  const log = overlay.querySelector<HTMLElement>('[data-boot-log]')!;
  let timer = 0;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    removeEventListener('keydown', onKey);
    overlay.removeEventListener('pointerdown', finish);
    overlay.classList.add('is-out');
    setTimeout(() => {
      root.classList.remove('booting');
      overlay.classList.remove('is-out');
      document.dispatchEvent(new CustomEvent('boot:done'));
    }, 520);
  };

  const onKey = (e: KeyboardEvent) => {
    if (['Escape', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      finish();
    }
  };
  addEventListener('keydown', onKey);
  overlay.addEventListener('pointerdown', finish);

  let i = 0;
  const next = () => {
    if (finished) return;
    const line = LINES[i++];
    if (!line) {
      finish();
      return;
    }
    const row = document.createElement('div');
    row.className = 'boot-line';
    if (line.ok) {
      const ok = document.createElement('span');
      ok.className = 'boot-ok';
      ok.textContent = '[ ok ]';
      row.append(ok, ` ${line.text}`);
    } else {
      row.textContent = line.text;
    }
    log.append(row);
    timer = window.setTimeout(next, line.delay);
  };
  timer = window.setTimeout(next, 120);
} else {
  root.classList.remove('booting');
}
