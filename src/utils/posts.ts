import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

/** Published posts, newest first. Drafts are visible in `npm run dev` only. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) =>
    import.meta.env.PROD ? !data.draft : true,
  );
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function readingTime(body = ''): number {
  const words = body.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function tagSlug(tag: string): string {
  return tag.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Prefix a path with the configured base, so the site also works as a project page. */
export function url(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

const GLYPH_SET = [...'ᗩᘺᓰᑢᑘᖇᕵᘜᘉᕼᕴᓍᕲᐺᖽᐸᗱᖴ0123456789'];

/** Replace every non-space character with a random glyph (teasers of encrypted posts). */
export function glyphs(text: string): string {
  return [...text]
    .map((c) => (/\s/.test(c) ? c : GLYPH_SET[Math.floor(Math.random() * GLYPH_SET.length)]))
    .join('');
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
