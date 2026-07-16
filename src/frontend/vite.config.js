import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Comma-separated hostnames allowed to reach `vite preview` (the prod container's
// server, via `pnpm start`). Empty when unset — Vite always permits localhost, so
// local preview and the container healthcheck keep working. Set PREVIEW_ALLOWED_HOSTS
// (docker/.env) to the public host(s) behind the reverse proxy, e.g. adamed.reachit.space.
const previewAllowedHosts = process.env.PREVIEW_ALLOWED_HOSTS
  ? process.env.PREVIEW_ALLOWED_HOSTS.split(',').map((h) => h.trim()).filter(Boolean)
  : [];

export default defineConfig({
  plugins: [react()],
  publicDir: 'src/public',
  server: {
    allowedHosts: true,
  },
  preview: {
    allowedHosts: previewAllowedHosts,
  },
});
