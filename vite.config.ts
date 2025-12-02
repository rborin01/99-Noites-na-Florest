import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This ensures process.env is defined to avoid crashes in some browser contexts
    'process.env': {}
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});