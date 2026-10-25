import rss from '@astrojs/rss';
import { SITE } from '../consts';
import { getPosts, url } from '../utils/posts';

export async function GET(context) {
  const posts = await getPosts();
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      categories: post.data.tags,
      link: url(`/posts/${post.id}/`),
    })),
  });
}
