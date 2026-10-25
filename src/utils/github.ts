// Total GitHub stars across the user's public (non-fork) repos.
// Fetched at build time; returns null on any failure so the UI just hides the badge.
// Set GITHUB_TOKEN in the build environment to avoid anonymous rate limits.

let cache: Promise<number | null> | null = null;

function ghHeaders(): Record<string, string> {
  const token = import.meta.env.GITHUB_TOKEN ?? process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'h3ik0-blog',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchStars(user: string): Promise<number | null> {
  const headers = ghHeaders();

  try {
    let total = 0;
    for (let page = 1; page <= 10; page++) {
      const res = await fetch(
        `https://api.github.com/users/${user}/repos?per_page=100&type=owner&page=${page}`,
        { headers },
      );
      if (!res.ok) return null;
      const repos = (await res.json()) as { stargazers_count: number; fork: boolean }[];
      for (const r of repos) if (!r.fork) total += r.stargazers_count;
      if (repos.length < 100) break;
    }
    return total;
  } catch {
    return null;
  }
}

export function getGithubStars(user: string): Promise<number | null> {
  return (cache ??= fetchStars(user));
}

// Latest push: repo, link to the pushed commit, ISO date and (when GitHub
// provides it) the commit message. Null on any failure.
export interface LastPush {
  repo: string;
  url: string;
  at: string;
  message?: string;
}
let pushCache: Promise<LastPush | null> | null = null;

const firstLine = (s?: string) => s?.split('\n')[0]?.trim() || undefined;

async function fetchLastPush(user: string): Promise<LastPush | null> {
  const headers = ghHeaders();
  try {
    // 1. Public events: gives the exact pushed commit.
    const ev = await fetch(`https://api.github.com/users/${user}/events/public?per_page=50`, { headers });
    if (ev.ok) {
      const events = (await ev.json()) as {
        type: string;
        created_at: string;
        repo: { name: string };
        payload: { head?: string; commits?: { message: string }[] };
      }[];
      const e = events.find((x) => x.type === 'PushEvent' && x.payload?.head);
      if (e) {
        return {
          repo: e.repo.name.split('/').pop()!,
          url: `https://github.com/${e.repo.name}/commit/${e.payload.head}`,
          at: e.created_at,
          message: firstLine(e.payload.commits?.at(-1)?.message),
        };
      }
    }

    // 2. Fallback: latest commit of the most recently pushed repo.
    const res = await fetch(
      `https://api.github.com/users/${user}/repos?sort=pushed&direction=desc&per_page=10&type=owner`,
      { headers },
    );
    if (!res.ok) return null;
    const repos = (await res.json()) as { name: string; full_name: string; html_url: string; pushed_at: string | null; fork: boolean }[];
    const r = repos.find((x) => !x.fork && x.pushed_at);
    if (!r) return null;
    const cr = await fetch(`https://api.github.com/repos/${r.full_name}/commits?per_page=1`, { headers });
    if (cr.ok) {
      const [c] = (await cr.json()) as { html_url: string; commit: { message: string; author?: { date?: string } } }[];
      if (c) {
        return {
          repo: r.name,
          url: c.html_url,
          at: c.commit.author?.date ?? r.pushed_at!,
          message: firstLine(c.commit.message),
        };
      }
    }
    return { repo: r.name, url: r.html_url, at: r.pushed_at! };
  } catch {
    return null;
  }
}

export function getLastPush(user: string): Promise<LastPush | null> {
  return (pushCache ??= fetchLastPush(user));
}
