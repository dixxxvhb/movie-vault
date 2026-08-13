import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://dixxxvhb.github.io/movie-vault/ on GitHub Pages,
// so assets must resolve under that sub-path. Local dev uses '/'.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/movie-vault/' : '/',
  plugins: [react()],
  resolve: {
    // drei pulls stats-gl, which depends on a NEWER three than the one this app
    // is pinned to, so two copies of three were being bundled ("Multiple
    // instances of Three.js being imported"). Two copies means two sets of
    // classes, and every `instanceof` across the boundary silently returns
    // false — which is the kind of bug that shows up as one thing mysteriously
    // not rendering rather than as an error.
    dedupe: ['three', '@react-three/fiber', 'react', 'react-dom'],
  },
}))
