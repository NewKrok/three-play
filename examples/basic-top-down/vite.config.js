import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  resolve: {
    alias: {
      '@newkrok/three-play': path.resolve(__dirname, '../../dist/index.js')
    }
  },
  build: {
    target: 'es2020',
    outDir: 'dist'
  }
});