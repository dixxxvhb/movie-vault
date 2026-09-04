import React, { Suspense, lazy, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { installXREmulator } from './xrEmulator.js'
import { applyUrlOverrides } from './settings.js'

// ?text renders the Vault as a document instead of a room. It is split out
// ahead of App on purpose: a visitor who needs the text version should not
// download three.js, drei, the postprocessing stack and 47 rooms' worth of
// scene code to read a list of films. The dynamic import means the 3D bundle
// is never even fetched on that path.
const App = lazy(() => import('./App.jsx'))
const TextMode = lazy(() => import('./TextMode.jsx'))
const Threshold = lazy(() => import('./Threshold.jsx'))

function wantsText() {
  try {
    return new URLSearchParams(window.location.search).has('text')
  } catch {
    return false
  }
}

function TextRoute() {
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    // index.html locks the document to the viewport and paints a boot splash
    // over it, both correct for a full-screen canvas and both fatal for a
    // page you have to scroll. Undo them on this path only.
    const boot = document.getElementById('boot')
    if (boot) boot.style.display = 'none'
    document.documentElement.style.overflow = 'auto'
    document.documentElement.style.height = 'auto'
    document.body.style.overflow = 'auto'
    document.body.style.height = 'auto'
    document.title = 'The Vault, written out'

    let live = true
    fetch(import.meta.env.BASE_URL + 'vault-data.json')
      .then((r) => r.json())
      .then((d) => live && setData(d))
      .catch(() => live && setFailed(true))
    return () => { live = false }
  }, [])
  if (failed) return <p style={{ padding: '2rem', color: '#EDE6D8' }}>The ledger could not be loaded.</p>
  if (!data) return <p style={{ padding: '2rem', color: '#9A9081' }}>Reading the ledger.</p>
  return <TextMode data={data} />
}

// Settings come from the URL before anything renders, so ?a11y=calm-room is
// in force for the very first frame rather than snapping into place after
// the cold open has already run.
applyUrlOverrides()

// The threshold renders BEFORE the app, not over it. The accessibility spec is
// specific about this: the gate has to be on top before any WebGL work begins,
// because the cold open is itself a full-screen motion event and putting the
// warning after it is putting the warning after the thing it warns about.
function Root() {
  const [entered, setEntered] = useState(false)
  return (
    <Suspense fallback={null}>
      <Threshold onDone={() => setEntered(true)} />
      {entered ? <App /> : null}
    </Suspense>
  )
}

function boot() {
  const text = wantsText()
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <Suspense fallback={null}>{text ? <TextRoute /> : <Root />}</Suspense>
    </React.StrictMode>
  )
}

if (wantsText()) {
  // Skip the XR emulator entirely on the text path: it exists to shim
  // navigator.xr for the 3D app and there is no 3D app here.
  boot()
} else {
  // The emulated headset has to replace navigator.xr BEFORE anything asks whether
  // XR is available, so it is installed ahead of the first render rather than in
  // an effect. It resolves immediately to false in production and whenever ?xrsim
  // is absent, so this costs a microtask and nothing else.
  installXREmulator().finally(boot)
}
