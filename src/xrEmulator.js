// A fake Quest 3, for verifying the XR pass without a Quest 3.
//
// @react-three/xr can auto-emulate, but only when navigator.xr is ABSENT — and
// desktop Chrome ships a navigator.xr with no device attached, so IWER decides a
// real runtime is already present and skips installing itself. The override for
// that is `installRuntime({ forceInstall: true })`, and the library calls
// installRuntime() with no arguments, so the option cannot be reached through
// the store's `emulate` config at all. Hence doing it by hand, here, first.
//
// Opt-in via ?xrsim, and dev-only. Two reasons it is not just "on in dev":
// installing this REPLACES navigator.xr globally, so it would shadow a real
// headset plugged into this PC; and `import.meta.env.DEV` is statically false in
// a production build, so the whole branch — and the multi-megabyte iwer payload
// behind it — is dropped from what ships.
export async function installXREmulator() {
  if (!import.meta.env.DEV) return false
  if (typeof window === 'undefined') return false
  if (!window.location.search.includes('xrsim')) return false

  try {
    const { XRDevice, metaQuest3 } = await import('iwer')
    const device = new XRDevice(metaQuest3, { stereoEnabled: true })
    // Stand the emulated headset where a person would actually be: the room's
    // spawn point, at eye height. Left at the origin it sits inside the floor at
    // the room's centre and every screenshot looks like a bug.
    device.installRuntime({ forceInstall: true })
    window.__xrEmulator = device
    console.info('[vault] XR emulator installed (?xrsim) — this is dev-only')
    return true
  } catch (e) {
    console.error('[vault] XR emulator failed to install', e)
    return false
  }
}
