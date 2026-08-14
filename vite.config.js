import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const STUB = fileURLToPath(new URL('./src/iwerStub.js', import.meta.url))

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

    // Keep the headset emulator out of what ships. `@pmndrs/xr`'s emulate
    // module statically imports iwer + @iwer/devui + @iwer/sem, and @iwer/sem
    // carries five synthetic room scans as real geometry — 4.9MB of dev tooling
    // was being deployed to GitHub Pages (living_room alone was 1.5MB). This
    // app never calls emulate(): the XR store is built with `emulate: false`
    // and `?xrsim` installs IWER by hand instead. So in a production build all
    // three specifiers resolve to a stub that is never executed. Dev is
    // untouched, which is why `?xrsim` and `npm run shot`'s emulated Quest 3
    // still work.
    alias: command === 'build'
      ? {
          iwer: STUB,
          '@iwer/devui': STUB,
          '@iwer/sem': STUB,
        }
      : {},
  },
}))
