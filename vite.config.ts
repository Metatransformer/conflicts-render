import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/conflicts-render/' : '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
