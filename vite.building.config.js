import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Standalone build of the NO VACANCY building prototypes (building.html),
// relative paths so it can be hosted anywhere for a walk-through. The main
// app's build and deploy are untouched.
export default defineConfig({
  base: './',
  plugins: [react()],
  publicDir: false,
  resolve: { dedupe: ['three', '@react-three/fiber', 'react', 'react-dom'] },
  build: {
    outDir: 'dist-building',
    emptyOutDir: true,
    rollupOptions: { input: 'building.html' },
  },
})
