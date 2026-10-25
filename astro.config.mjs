import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // User site: the repository must be named "ilostmypassword.github.io".
  site: 'https://ilostmypassword.github.io',
  // Project site instead? Uncomment and set to the repository name:
  // base: '/blog',
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark-dimmed',
      // Keeps `data-language="mermaid"` on the block so it can be rendered as a diagram.
      langAlias: { mermaid: 'plaintext' },
    },
  },
});
