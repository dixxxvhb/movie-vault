import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://dixxxvhb.github.io/movie-vault/ on GitHub Pages,
// so assets must resolve under that sub-path. Local dev uses '/'.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/movie-vault/' : '/',
  plugins: [react()],
}))
