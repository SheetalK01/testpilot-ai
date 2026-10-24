import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Keep the browser's Host header (like Nginx does in Docker): the backend then sees proxied calls as
// same-origin, so local development does not depend on the CORS allow-list.
const backend = {
  target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:8080',
  changeOrigin: false,
};
const apiProxy = { '/api': backend, '/actuator/health': backend };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, proxy: apiProxy },
  preview: { port: 4173, proxy: apiProxy },
  build: {
    rollupOptions: {
      output: {
        // Keep the charting and highlighting libraries out of the main bundle.
        manualChunks: {
          charts: ['recharts'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
          prism: ['prism-react-renderer'],
        },
      },
    },
  },
});
