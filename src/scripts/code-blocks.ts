/**
 * Code blocks in articles: a small header bar (language + copy button).
 * Line numbers are pure CSS (see .codeblock in global.css).
 */
export {};

const LABELS: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  sh: 'shell',
  bash: 'bash',
  shell: 'shell',
  zsh: 'shell',
  py: 'python',
  plaintext: 'text',
  txt: 'text',
  ansi: 'text',
};

function language(pre: HTMLElement): string {
  const raw = pre.dataset.language ?? pre.className.match(/language-([\w-]+)/)?.[1] ?? 'text';
  return LABELS[raw] ?? raw;
}

const MERMAID_URL = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
let mermaidPromise: Promise<any> | null = null;
let diagramId = 0;

function loadMermaid() {
  mermaidPromise ??= import(/* @vite-ignore */ MERMAID_URL).then((mod) => {
    const mermaid = mod.default;
    const css = getComputedStyle(document.documentElement);
    const font = css.getPropertyValue('--font-sans').trim() || 'sans-serif';
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      fontFamily: font,
      themeVariables: {
        background: 'transparent',
        primaryColor: '#1c2330',
        primaryTextColor: '#d9e1e4',
        primaryBorderColor: '#6a2fa6',
        lineColor: '#a064e0',
        secondaryColor: '#161b22',
        tertiaryColor: '#161b22',
        textColor: '#d9e1e4',
        clusterBkg: '#12171f',
        clusterBorder: '#3a2658',
        edgeLabelBackground: '#0d1117',
        actorBkg: '#1c2330',
        actorBorder: '#6a2fa6',
        actorTextColor: '#d9e1e4',
        actorLineColor: '#4a3a6a',
        signalColor: '#a064e0',
        signalTextColor: '#d9e1e4',
        noteBkgColor: '#241a38',
        noteTextColor: '#d9e1e4',
        noteBorderColor: '#6a2fa6',
        activationBkgColor: '#241a38',
        activationBorderColor: '#6a2fa6',
        labelBoxBkgColor: '#1c2330',
        labelBoxBorderColor: '#6a2fa6',
        labelTextColor: '#d9e1e4',
        loopTextColor: '#d9e1e4',
        sequenceNumberColor: '#0d1117',
      },
    });
    return mermaid;
  });
  return mermaidPromise;
}

async function renderDiagram(pre: HTMLElement) {
  const code = (pre.querySelector('code') ?? pre).textContent ?? '';
  const id = `mmd-${diagramId++}`;
  try {
    const mermaid = await loadMermaid();
    const { svg } = await mermaid.render(id, code);
    if (!pre.isConnected) return;
    const figure = document.createElement('figure');
    figure.className = 'diagram';
    figure.innerHTML = svg;
    pre.replaceWith(figure);
  } catch (err) {
    // Offline or invalid syntax: keep the plain code block as a fallback.
    console.warn('[mermaid] rendering failed, showing source instead', err);
    mermaidPromise = null;
    document.getElementById(`d${id}`)?.remove();
    delete pre.dataset.mermaidPending;
    pre.dataset.mermaidFailed = '';
    enhanceCode(pre);
  }
}

function isMermaid(pre: HTMLElement) {
  return language(pre) === 'mermaid';
}

function enhance() {
  for (const pre of document.querySelectorAll<HTMLElement>('.prose pre')) {
    if (pre.parentElement?.classList.contains('codeblock')) continue;
    if (isMermaid(pre) && !('mermaidFailed' in pre.dataset)) {
      if (!pre.dataset.mermaidPending) {
        pre.dataset.mermaidPending = '1';
        void renderDiagram(pre);
      }
      continue;
    }
    enhanceCode(pre);
  }
}

function enhanceCode(pre: HTMLElement) {
  {
    if (pre.parentElement?.classList.contains('codeblock')) return;

    const wrap = document.createElement('div');
    wrap.className = 'codeblock';
    const bar = document.createElement('div');
    bar.className = 'codeblock-bar';

    const lang = document.createElement('span');
    lang.className = 'codeblock-lang';
    lang.textContent = language(pre);

    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'codeblock-copy';
    copy.textContent = 'Copy';
    copy.addEventListener('click', async () => {
      const text = (pre.querySelector('code') ?? pre).textContent ?? '';
      try {
        await navigator.clipboard.writeText(text.replace(/\n$/, ''));
        copy.textContent = 'Copied';
      } catch {
        copy.textContent = 'Failed';
      }
      setTimeout(() => (copy.textContent = 'Copy'), 1500);
    });

    bar.append(lang, copy);
    pre.replaceWith(wrap);
    wrap.append(bar, pre);
    if (pre.querySelectorAll('.line').length > 2) wrap.classList.add('has-lines');
  }
}

document.addEventListener('astro:page-load', enhance);
document.addEventListener('content:decrypted', enhance);
