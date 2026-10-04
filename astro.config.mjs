// @ts-check
import { defineConfig } from 'astro/config';

/**
 * Deployment settings come from environment variables so the same repo can be
 * published to GitHub Pages (user page or project page) or any static host.
 *
 *   SITE       e.g. https://username.github.io
 *   BASE_PATH  e.g. /deep-space-archive   ("/" for a user/organisation page)
 */
export default defineConfig({
  site: process.env.SITE ?? 'http://localhost:4321',
  base: process.env.BASE_PATH ?? '/',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  vite: {
    // The vault is read from disk at build time; watch it in dev so edits made
    // in Obsidian trigger a reload.
    server: { watch: { ignored: ['**/.obsidian/**'] } },
  },
});
