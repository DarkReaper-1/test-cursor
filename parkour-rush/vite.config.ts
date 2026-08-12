import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2021',
    chunkSizeWarningLimit: 1200,
  },
  server: {
    host: true,
    port: 5173,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
} as any);
