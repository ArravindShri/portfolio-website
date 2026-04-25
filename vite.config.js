import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, proxy /api/* to a locally-running FastAPI server (uvicorn on
// :8000). In prod the frontend talks to the Railway URL via VITE_API_BASE_URL.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
