/**
 * Open every external link (different origin) in a new tab, wherever it comes
 * from: sidebar, pages, Markdown/MDX content. Re-run after each client-side
 * navigation, since the page content is swapped.
 */
export {};

function mark(root: ParentNode = document) {
  for (const a of root.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    if (a.hasAttribute('target') || a.hasAttribute('download')) continue;
    let url: URL;
    try {
      url = new URL(a.href, location.href);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol) || url.origin === location.origin) continue;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
}

document.addEventListener('astro:page-load', () => mark());
