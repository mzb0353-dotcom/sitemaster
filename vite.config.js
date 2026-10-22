import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base יחסי כדי שאותו build יעבוד גם בתת-תיקייה (GitHub Pages) וגם בתוך Capacitor בהמשך.
export default defineConfig({
  base: './',
  plugins: [react()]
});
