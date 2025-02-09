import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_COMMIT_REF': JSON.stringify(process.env.COMMIT_REF),
    'import.meta.env.VITE_CONTEXT': JSON.stringify(process.env.CONTEXT),
    'import.meta.env.VITE_URL': JSON.stringify(process.env.URL),
    'import.meta.env.VITE_DEPLOY_TIME': JSON.stringify(process.env.DEPLOY_TIME)
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
