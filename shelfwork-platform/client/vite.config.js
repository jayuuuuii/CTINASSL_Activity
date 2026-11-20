import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the React app calls /api and /uploads on its own address;
// Vite forwards those requests to the backend, so no CORS setup is needed.
const BACKEND = process.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': BACKEND,
      '/uploads': BACKEND,
    },
  },
});
