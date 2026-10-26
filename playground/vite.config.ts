import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const here = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: here('.'),
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^@brottin\/arrivo\/core$/, replacement: here('../src/core/index.ts') },
      { find: /^@brottin\/arrivo\/effects$/, replacement: here('../src/effects/index.ts') },
      { find: /^@brottin\/arrivo$/, replacement: here('../src/index.ts') },
    ],
  },
  build: {
    outDir: here('dist'),
    emptyOutDir: true,
    rollupOptions: { input: { main: here('index.html'), bench: here('bench.html'), frames: here('frames.html') } },
  },
  server: { port: 5173 },
});
