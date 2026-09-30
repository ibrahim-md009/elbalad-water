import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // مشفّر WebP احتياطي (WASM) يُحمَّل عند الحاجة فقط
  optimizeDeps: { exclude: ['@jsquash/webp'] },
});
