// vite.config.js — build-tool configuration.
// Sanguine is a MULTI-PAGE site: each .html file is its own entry point. Most pages
// are plain HTML + vanilla JS modules; only app.html loads the small React app.
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // JSX transform + Fast Refresh for src/*.jsx

const pages = ['index', 'about', 'donor', 'donors', 'bloodbanks', 'camps', 'compatibility',
  'eligibility', 'faq', 'gallery', 'contact', 'app'];

export default defineConfig({
  plugins: [react()],
  // './' makes asset URLs relative, so the built site works from any folder or static host.
  base: './',
  build: {
    rollupOptions: {
      input: Object.fromEntries(pages.map((p) => [p, resolve(__dirname, `${p}.html`)]))
    }
  },
  // Vitest: run tests in a simulated browser (jsdom)
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    include: ['src/test/**/*.test.{js,jsx}', 'tests/vanilla/**/*.test.js']
  }
});
