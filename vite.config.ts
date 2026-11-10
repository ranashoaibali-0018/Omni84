import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      // In AI Studio hosted HTTPS preview environment, disable HMR to prevent
      // '[vite] failed to connect to websocket Error: WebSocket closed without opened'
      hmr: false,
      watch: null,
      allowedHosts: true,
    },
  };
});
