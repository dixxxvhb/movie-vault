import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { installXREmulator } from './xrEmulator.js'

// The emulated headset has to replace navigator.xr BEFORE anything asks whether
// XR is available, so it is installed ahead of the first render rather than in
// an effect. It resolves immediately to false in production and whenever ?xrsim
// is absent, so this costs a microtask and nothing else.
installXREmulator().finally(() => {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})
