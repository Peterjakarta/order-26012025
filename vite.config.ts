import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // Copy version.json to dist during build
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },
  server: {
    // Serve version.json in development
    fs: {
      strict: false,
    },
  },
});