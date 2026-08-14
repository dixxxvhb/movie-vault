// Stands in for `iwer`, `@iwer/devui` and `@iwer/sem` in production builds.
// See the alias block in vite.config.js.
//
// Where the weight was actually coming from: `@pmndrs/xr/dist/emulate.js`
// STATICALLY imports all three, and it ships a list of synthetic room scans
// (office_small, meeting_room, living_room, music_room, office_large) that
// `@iwer/sem` then bundles as real geometry. That is 4.9MB of headset-emulator
// tooling in the deployed site — living_room alone was 1.5MB — and it arrived
// through the library, not through this app's own `?xrsim` path.
//
// Nothing here is ever executed. `emulate()` is only called when the XR store
// is created with an `emulate` option, and ours is created with `emulate: false`
// (xr.jsx) precisely because the store's emulator cannot pass IWER the
// forceInstall flag desktop Chrome needs. In dev the aliases are not applied at
// all, so `?xrsim` still gets the real library and `npm run shot` still enters
// an emulated Quest 3.
//
// These throw rather than no-op: a silent fake headset would be a much worse
// bug than a loud missing one.
const gone = (what) => {
  throw new Error(
    `${what} is dev-only and is not bundled in production — ` +
    'run the XR emulator on the dev server with ?xrsim'
  )
}

export class XRDevice {
  constructor() { gone('iwer') }
}

// device profiles: plain data in the real library, so plain data here
export const metaQuest3 = null
export const metaQuest2 = null
export const metaQuestPro = null
export const oculusQuest1 = null

// @iwer/devui
export class DevUI {
  constructor() { gone('@iwer/devui') }
}

// @iwer/sem — the synthetic environments, i.e. the room scans themselves
export class SyntheticEnvironmentModule {
  constructor() { gone('@iwer/sem') }
}

export default { XRDevice, DevUI, SyntheticEnvironmentModule }
