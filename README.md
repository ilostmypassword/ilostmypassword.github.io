# h3ik0's blog

Personal blog built with [Astro](https://astro.build), deployed to GitHub Pages.

## Run locally

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run preview
```

## Write a post

Add a file to `src/content/posts/`. The file name becomes the URL (`my-post.md` → `/posts/my-post/`).

```md
---
title: My post
description: One sentence shown in lists, RSS and link previews.
date: 2026-11-02
kind: writeup        # writeup | research | bounty | note
event: FCSC 2026     # optional: CTF name or bug bounty program
tags: [web, ssrf]
draft: false         # drafts only show up in `npm run dev`
---

Your content.
```

Use `.mdx` instead of `.md` when you need components:

- `<Flag value="FLAG{...}" />` renders a redacted flag that readers click to reveal (import it from `../../components/Flag.astro`).
- `<div class="note">...</div>` renders a callout, handy for disclosure timelines or scope notes.

Images can go in `public/` and be referenced as `/my-image.png`.

## Encrypted posts

The site is static, so access control is done with encryption: only ciphertext is published, and it is decrypted in the reader's browser with a key that you send by email.

1. Write the post in `private/<slug>.md` (same frontmatter as a normal post). `private/` is git-ignored: clear text and keys never leave your machine.
2. Encrypt it and create one access link per reader:
   ```bash
   npm run lock -- <slug> --add alice --add bob
   ```
   Optional frontmatter `lockedTitle:` hides the real title in public listings.
3. Commit `src/content/locked/<slug>.json` and `src/content/posts/<slug>.md`, then push.
4. Send each reader their link (`/posts/<slug>/#k=...`) in a PGP-encrypted email.

Update the post: edit `private/<slug>.md` and run `npm run lock -- <slug>` again (same links keep working).
Remove a reader: `npm run lock -- <slug> --revoke bob`, then deploy. The content key is regenerated at every run, so they cannot open the new version. List the links again with `--list`.

Limits to know: whoever has a key can read (and copy) the post; keys cannot expire; what was already published stays decryptable by its previous readers (including from git history). The title, date and type of the post are public; the description, tags and body are encrypted. Images are not encrypted.

## Deploy

1. Create a public repository named `ilostmypassword.github.io`.
2. Run `npm install` once and commit `package-lock.json` (the deploy action needs a lockfile).
3. Push to `main`.
4. In the repository, open Settings → Pages and set Source to **GitHub Actions**.

Every push to `main` rebuilds and publishes the site at https://ilostmypassword.github.io.

To host it as a project page instead (for example `ilostmypassword.github.io/blog`), set `base: '/blog'` in `astro.config.mjs`.

## Customize

- Name, tagline, links: `src/consts.ts`
- Colors and typography: the variables at the top of `src/styles/global.css`
- About page: `src/pages/about.astro`
