#!/usr/bin/env node
/**
 * Encrypt a private post so it can be published on a static site.
 *
 *   node scripts/lock.mjs <slug> --add alice --add bob
 *   node scripts/lock.mjs <slug> --revoke bob
 *   node scripts/lock.mjs <slug> --list
 *
 * Input (never committed, see .gitignore):
 *   private/<slug>.md            the post, with the usual frontmatter
 *   private/<slug>.keys.json     recipient name -> access key (created here)
 *
 * Output (safe to commit):
 *   src/content/locked/<slug>.json   the encrypted payload
 *   src/content/posts/<slug>.md      a public stub: title, date, kind. Nothing else.
 *
 * Cryptography (AES-256-GCM everywhere: node:crypto here, WebCrypto in the browser):
 *   - a random 256-bit content key CK encrypts the rendered post (HTML),
 *     padded to a multiple of 4 KiB so its length reveals little;
 *   - every recipient gets a random 256-bit access key AK. The payload holds CK
 *     wrapped once per recipient, plus decoy wraps so the number of readers is
 *     not exposed either;
 *   - the access link is  <site>/posts/<slug>/#k=<AK>. What follows "#" is
 *     never sent to any server;
 *   - the slug is bound to every ciphertext as authenticated data.
 * Each run generates a NEW content key, so removing someone (--revoke, then
 * redeploy) really locks them out of the new version.
 */
import { createCipheriv, randomBytes, randomInt } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DESCRIPTION = 'Encrypted post. Access on request.';
const DEFAULT_SITE = 'https://ilostmypassword.github.io';
const BLOCK = 4096;
const DECOY_MULTIPLE = 4;
const KINDS = ['writeup', 'research', 'bounty', 'note'];

const fail = (msg) => {
  console.error(`\nError: ${msg}\n`);
  process.exit(1);
};

const b64u = (buf) => Buffer.from(buf).toString('base64url');

// ---------- arguments ----------
const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--') && !isOptionValue(a));
const add = [];
const revoke = [];
let site = DEFAULT_SITE;
let listOnly = false;

function isOptionValue(a) {
  const i = args.indexOf(a);
  return i > 0 && ['--add', '--revoke', '--site'].includes(args[i - 1]);
}

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--add') add.push(args[++i]);
  else if (a === '--revoke') revoke.push(args[++i]);
  else if (a === '--site') site = args[++i];
  else if (a === '--list') listOnly = true;
}

if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  fail('usage: node scripts/lock.mjs <slug> [--add name]... [--revoke name]... [--list] [--site url]\n(slug: lowercase letters, digits and dashes)');
}
for (const n of [...add, ...revoke]) {
  if (!n || !/^[\w.@+-]{1,64}$/.test(n)) fail(`invalid recipient name: ${JSON.stringify(n)}`);
}
site = String(site).replace(/\/+$/, '');

// ---------- files ----------
const privateMd = path.join(ROOT, 'private', `${slug}.md`);
const keysFile = path.join(ROOT, 'private', `${slug}.keys.json`);
const payloadFile = path.join(ROOT, 'src', 'content', 'locked', `${slug}.json`);
const stubFile = path.join(ROOT, 'src', 'content', 'posts', `${slug}.md`);

const keys = existsSync(keysFile) ? JSON.parse(await readFile(keysFile, 'utf8')) : {};

for (const n of revoke) {
  if (!(n in keys)) fail(`no such recipient: ${n}`);
  delete keys[n];
}
for (const n of add) {
  if (n in keys) console.warn(`Recipient "${n}" already exists, keeping the same key.`);
  else keys[n] = b64u(randomBytes(32));
}

if (listOnly) {
  printLinks(keys);
  process.exit(0);
}

if (!existsSync(privateMd)) fail(`missing ${path.relative(ROOT, privateMd)}`);
if (!Object.keys(keys).length) fail('no recipient yet. Add one with: --add <name>');

// ---------- read the post ----------
const source = await readFile(privateMd, 'utf8');
const { data, content } = parseFrontmatter(source);

const title = need(data.title, 'title');
const description = typeof data.description === 'string' ? data.description : '';
const date = need(data.date, 'date');
if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?Z?)?$/.test(date)) fail('date must look like 2026-10-25 or 2026-10-25T18:00:00Z');
const kind = KINDS.includes(data.kind) ? data.kind : 'note';
const tags = Array.isArray(data.tags) ? data.tags : [];
const event = typeof data.event === 'string' ? data.event : '';
// Optional: hide the real title from the public listing.
const publicTitle = typeof data.lockedTitle === 'string' && data.lockedTitle ? data.lockedTitle : title;

if (/!\[[^\]]*\]\((?!data:)/.test(content) || /<img\s/i.test(content)) {
  console.warn(
    'Warning: this post references images. Files served from the site (public/, src/assets/) are NOT encrypted,\n' +
      '         and remote images leak who reads the post. Inline them as data: URIs if they are sensitive.\n',
  );
}

// ---------- render markdown -> HTML (same Shiki theme as the site) ----------
let createMarkdownProcessor;
try {
  ({ createMarkdownProcessor } = await import('@astrojs/markdown-remark'));
} catch {
  fail(
    'cannot import @astrojs/markdown-remark (it normally ships with astro).\n' +
      'Run `npm install` first, or `npm i -D @astrojs/markdown-remark` and commit package.json + package-lock.json.',
  );
}
const processor = await createMarkdownProcessor({
  shikiConfig: { theme: 'github-dark-dimmed', langAlias: { mermaid: 'plaintext' } },
});
const rendered = await processor.render(content);
const headings = (rendered.metadata?.headings ?? []).filter((h) => h.depth === 2);
const words = content.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;

const document = {
  title,
  description,
  event,
  tags,
  minutes: Math.max(1, Math.round(words / 220)),
  toc: headings.map((h) => ({ slug: h.slug, text: h.text })),
  html: rendered.code,
};

// ---------- encrypt ----------
const seal = (key, aad, data) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([cipher.update(data), cipher.final(), cipher.getAuthTag()]);
  return { iv: b64u(iv), ct: b64u(ct) };
};

const pad = (buf) => {
  const total = Math.ceil((4 + buf.length) / BLOCK) * BLOCK;
  const out = Buffer.alloc(total);
  out.writeUInt32BE(buf.length, 0);
  buf.copy(out, 4);
  return out;
};

const contentKey = randomBytes(32);
const body = seal(contentKey, `h3ik0:v1:content:${slug}`, pad(Buffer.from(JSON.stringify(document), 'utf8')));

const wraps = Object.values(keys).map((ak) =>
  seal(Buffer.from(ak, 'base64url'), `h3ik0:v1:wrap:${slug}`, contentKey),
);
// Decoys: random bytes of the same shape as a real wrap (12-byte IV, 32 + 16-byte ciphertext).
while (wraps.length % DECOY_MULTIPLE !== 0) {
  wraps.push({ iv: b64u(randomBytes(12)), ct: b64u(randomBytes(48)) });
}
for (let i = wraps.length - 1; i > 0; i--) {
  const j = randomInt(i + 1);
  [wraps[i], wraps[j]] = [wraps[j], wraps[i]];
}

const payload = { v: 1, iv: body.iv, ct: body.ct, wraps };

// ---------- write ----------
await mkdir(path.dirname(payloadFile), { recursive: true });
await mkdir(path.dirname(keysFile), { recursive: true });
await writeFile(payloadFile, JSON.stringify(payload) + '\n');
await writeFile(keysFile, JSON.stringify(keys, null, 2) + '\n', { mode: 0o600 });
await writeFile(
  stubFile,
  [
    '---',
    `title: ${JSON.stringify(publicTitle)}`,
    `description: ${JSON.stringify(PUBLIC_DESCRIPTION)}`,
    `date: ${date}`,
    `kind: ${kind}`,
    'locked: true',
    '---',
    '',
    '',
  ].join('\n'),
);

console.log(`\nEncrypted "${title}" for ${Object.keys(keys).length} recipient(s).`);
console.log(`  ${path.relative(ROOT, payloadFile)}   (commit)`);
console.log(`  ${path.relative(ROOT, stubFile)}   (commit)`);
console.log(`  ${path.relative(ROOT, keysFile)}   (SECRET, stays local)`);
printLinks(keys);
console.log('\nNow commit and push to deploy. Send each link through an end-to-end encrypted channel (PGP).\n');

// ---------- helpers ----------
function printLinks(all) {
  console.log('\nAccess links:');
  for (const [name, ak] of Object.entries(all)) {
    console.log(`  ${name.padEnd(16)} ${site}/posts/${slug}/#k=${ak}`);
  }
}

function need(value, name) {
  if (typeof value !== 'string' || !value.trim()) fail(`frontmatter "${name}" is required`);
  return value.trim();
}

function unquote(s) {
  const m = s.match(/^(["'])([\s\S]*)\1$/);
  return m ? m[2] : s;
}

/** Minimal frontmatter reader: flat `key: value` lines and `[a, b]` lists. */
function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) fail('the post must start with a --- frontmatter block');
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const raw = kv[2].trim();
    out[kv[1]] =
      raw.startsWith('[') && raw.endsWith(']')
        ? raw
            .slice(1, -1)
            .split(',')
            .map((s) => unquote(s.trim()))
            .filter(Boolean)
        : unquote(raw);
  }
  return { data: out, content: m[2] };
}
