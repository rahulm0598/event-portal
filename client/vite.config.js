import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  // basicSsl serves the dev site over HTTPS (self-signed) so phone/tablet
  // cameras work on the LAN (camera needs a secure context: https or localhost).
  plugins: [react(), basicSsl()],
  server: {
    https: true,
    port: 5173,
    host: true,            // listen on LAN so phones can reach it
    allowedHosts: true,    // allow ngrok/cloudflared tunnel hostnames
    proxy: {
      // Phone hits the tunnel -> Vite (on laptop) -> proxied to backend.
      // Same-origin in the browser, so no CORS and camera (HTTPS) works.
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
});
