/**
 * Encrypted articles: decrypts the payload in the browser.
 *
 * The page ships only ciphertext (see scripts/lock.mjs for the format). The
 * access key comes from the URL fragment (#k=...), which browsers never send
 * to a server, or from the form. It is removed from the address bar right
 * away and kept in sessionStorage for the current tab only.
 */
export {};

import { navigate } from 'astro:transitions/client';

interface Wrap {
  iv: string;
  ct: string;
}
interface Payload {
  v: number;
  iv: string;
  ct: string;
  wraps: Wrap[];
}
interface Doc {
  title: string;
  description: string;
  event: string;
  tags: string[];
  minutes: number;
  toc: { slug: string; text: string }[];
  html: string;
}

const KEY_RE = /^[A-Za-z0-9_-]{43}$/;
const enc = new TextEncoder();
const dec = new TextDecoder();

function fromB64u(s: string): Uint8Array<ArrayBuffer> {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b + '='.repeat((4 - (b.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Accepts a bare key or a full access link. */
function parseKey(input: string): string | null {
  const t = input.trim();
  const m = t.match(/[#&?]k=([A-Za-z0-9_-]{43})(?![A-Za-z0-9_-])/);
  if (m) return m[1];
  return KEY_RE.test(t) ? t : null;
}

async function decrypt(payload: Payload, slug: string, accessKey: string): Promise<Doc | null> {
  if (payload.v !== 1 || !crypto?.subtle) return null;
  const raw = fromB64u(accessKey);
  if (raw.length !== 32) return null;
  const ak = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);

  for (const w of payload.wraps) {
    try {
      const ck = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromB64u(w.iv), additionalData: enc.encode(`h3ik0:v1:wrap:${slug}`) },
        ak,
        fromB64u(w.ct),
      );
      const contentKey = await crypto.subtle.importKey('raw', ck, 'AES-GCM', false, ['decrypt']);
      const padded = new Uint8Array(
        await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: fromB64u(payload.iv), additionalData: enc.encode(`h3ik0:v1:content:${slug}`) },
          contentKey,
          fromB64u(payload.ct),
        ),
      );
      const length = new DataView(padded.buffer).getUint32(0);
      return JSON.parse(dec.decode(padded.subarray(4, 4 + length))) as Doc;
    } catch {
      // Not our wrap (or a decoy): try the next one.
    }
  }
  return null;
}

function metaRow(label: string, value: string) {
  const row = document.createElement('div');
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent = value;
  row.append(dt, dd);
  return row;
}

function show(root: HTMLElement, doc: Doc) {
  root.querySelector<HTMLElement>('[data-locked-title]')!.textContent = doc.title;
  const lede = root.querySelector<HTMLElement>('[data-locked-lede]');
  if (lede) {
    lede.removeAttribute('data-glyph');
    lede.classList.remove('log-glyph');
    lede.textContent = doc.description;
  }

  const dl = root.querySelector('.post-meta dl');
  dl?.append(metaRow('Reading time', `${doc.minutes} min`));
  if (doc.event) dl?.append(metaRow('Event', doc.event));

  const tocHost = root.querySelector<HTMLElement>('[data-locked-toc]');
  if (tocHost && doc.toc.length >= 3) {
    const nav = document.createElement('nav');
    nav.className = 'toc';
    nav.setAttribute('aria-label', 'On this page');
    const p = document.createElement('p');
    p.textContent = 'On this page';
    const ol = document.createElement('ol');
    for (const h of doc.toc) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${h.slug}`;
      a.textContent = h.text;
      li.append(a);
      ol.append(li);
    }
    nav.append(p, ol);
    tocHost.replaceChildren(nav);
  }

  const body = root.querySelector<HTMLElement>('[data-locked-body]')!;
  body.innerHTML = doc.html;
  body.hidden = false;
  root.querySelector<HTMLElement>('[data-gate]')!.hidden = true;
  root.querySelector<HTMLElement>('[data-relock]')!.hidden = false;
  root.classList.add('is-open');
  document.dispatchEvent(new CustomEvent('content:decrypted'));
}

async function init() {
  const root = document.querySelector<HTMLElement>('[data-locked]');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = '1';

  const slug = root.dataset.slug!;
  const store = `h3ik0:key:${slug}`;
  const payload = JSON.parse(root.querySelector('[data-payload]')?.textContent ?? 'null') as Payload | null;
  const form = root.querySelector<HTMLFormElement>('[data-gate-form]')!;
  const input = form.querySelector<HTMLInputElement>('input')!;
  const button = form.querySelector<HTMLButtonElement>('button')!;
  const error = root.querySelector<HTMLElement>('[data-gate-error]')!;
  if (!payload) return;

  const fail = (msg: string) => {
    error.textContent = msg;
    error.hidden = false;
  };

  async function attempt(candidate: string, quiet = false) {
    error.hidden = true;
    button.disabled = true;
    const label = button.textContent;
    button.textContent = 'Decrypting…';
    let doc: Doc | null = null;
    try {
      doc = await decrypt(payload!, slug, candidate);
    } catch {
      doc = null;
    }
    button.disabled = false;
    button.textContent = label;
    if (!doc) {
      sessionStorage.removeItem(store);
      if (!quiet) fail('This key does not unlock this article.');
      return false;
    }
    sessionStorage.setItem(store, candidate);
    input.value = '';
    show(root!, doc);
    return true;
  }

  if (!crypto?.subtle) {
    fail('Decryption needs a secure context (HTTPS). Open the site over HTTPS.');
    return;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const key = parseKey(input.value);
    if (!key) return fail('That does not look like an access key');
    void attempt(key);
  });

  root.querySelector('[data-relock]')?.addEventListener('click', () => {
    sessionStorage.removeItem(store);
    // Soft navigation (not location.reload) so the persisted music player keeps playing.
    void navigate(location.pathname + location.search, { history: 'replace' });
  });

  // 1. Key in the link, then wipe it from the address bar.
  const fromHash = location.hash.match(/^#k=([A-Za-z0-9_-]{43})$/)?.[1];
  if (location.hash.startsWith('#k=')) {
    history.replaceState(history.state, '', location.pathname + location.search);
  }
  if (fromHash && (await attempt(fromHash))) return;

  // 2. Key kept earlier in this tab.
  const saved = sessionStorage.getItem(store);
  if (!fromHash && saved && KEY_RE.test(saved)) await attempt(saved, true);
}

document.addEventListener('astro:page-load', () => void init());
