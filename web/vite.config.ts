import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// NUI icin: goreli yollar (base './'), sabit cikti isimleri (fxmanifest files{} basit kalsin).
export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: false,
  build: {
    outDir: 'build',
    target: 'esnext',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    rolldownOptions: {
      output: {
        assetFileNames: 'assets/[name][extname]',
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
      },
    },
  },
});
