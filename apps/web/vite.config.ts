import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_TARGET = process.env.VITE_API_PROXY ?? 'http://localhost:4000';

// During dev, proxy /api to the backend so cookies are first-party and CORS is
// a non-issue. In production, set VITE_API_BASE_URL to the deployed API.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Bind all interfaces (IPv4 + IPv6) so 127.0.0.1 and localhost both work.
    host: true,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
    },
  },
});
