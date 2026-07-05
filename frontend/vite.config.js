import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // 5174 matches setup.sh ("open localhost:5174") and the backend CORS
    // allow-list (FRONTEND_URL=http://localhost:5174). Running on 5173 makes
    // the browser origin 5173, which the backend rejects with a CORS error.
    port: 5174,
    proxy: {
      // Backend listens on 5001 (server.js PORT default + docker-compose).
      // Pointing at 5000 sends every /api call into the void.
      '/api': { target: 'http://localhost:5001', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5001', changeOrigin: true },
    },
  },
});
