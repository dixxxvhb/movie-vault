# Immersion v2 — Wave M: Real Movement
Architect: Fable session 2026-08-21 (Immersion v2 kickoff). This wave lands FIRST, fully verified, before any interaction or polish work stacks on it.
Dixon's ruling (revises the old click-to-station law for INSIDE rooms only): inside a film room you walk freely with WASD/arrows + mouse-look. Stations survive as landmarks/flight targets and for the motel wall itself, which is untouched.

## Non-negotiables (inherited, unchanged)
- Plain JS/JSX. No new deps. No TypeScript.
- StrictMode double-fires effects: all mounts idempotent, all listeners cleaned up.
- rooms/* never imports App.jsx. New shared modules are leaves (pointer.js pattern).
- Verify with `python scripts/peek.py --url "http://localhost:5173/?..." --out <name>` and READ the PNG. Full gate `npm run shot`. Never `playwright install`. Dev server on 5173 assumed running.
- Motel wall behavior byte-identical: `npm run shot` station suite must stay green with zero tolerance changes.

## M1 — walker core + collision world + generic rooms + mobile stick

### 1. `src/walkKeys.js` (new leaf)
Module-level key state. `window` keydown/keyup listeners installed once on first import (guard a module flag; StrictMode-safe because idempotent).
- Tracked: KeyW/KeyA/KeyS/KeyD, ArrowUp/Down/Left/Right. Arrows map to WASD.
- Ignore events when `e.target` is an INPUT/TEXTAREA or `e.isComposing`.
- Export `keyVec() -> {x, z}` where z=+1 forward (W), x=+1 strafe right (D), normalized if diagonal.
- Also export `anyWalkKey()` for HUD hinting.
- On window blur, clear all keys (alt-tab with W held = runaway walker).

### 2. `src/rooms/colliders.js` (new leaf)
A module-level collision world, gradeBus-style ownership.
```js
registerColliders(ownerId, rects)   // rects: [{minX, minZ, maxX, maxZ, top?}] metres, world space
setBounds(ownerId, bounds)          // {kind:'rect', minX, minZ, maxX, maxZ} | {kind:'circle', cx, cz, r}
registerFloor(ownerId, fn)          // fn(x, z) -> floor y (metres); default flat 0
clearOwner(ownerId)                 // removes everything that owner registered
resolveStep(x, z, dx, dz, radius) -> {x, z}   // the solver
floorYAt(x, z) -> y
```
- Rects with `top` defined and `top < 0.3` are registered but SKIPPED by the solver (ankle-height stuff you step past); everything else blocks at full height. (No jumping, no stepping onto furniture in M1.)
- Solver: axis-separated slide. Try X move against all rects (circle-vs-rect: closest-point distance < radius blocks; push out along the tried axis only), then Z move. Then clamp to bounds (rect clamp or circle clamp toward center). This is the classic cheap slide-along-walls; do not build swept collision.
- Multiple owners can coexist (room shell + props + a bespoke overlay). `clearOwner` on unmount.
- Expose `window.__vaultWalk = { x, z }` updated by the walker each frame (tiny, always on) so scripts/shot.py can assert movement and wall-stops.

### 3. CameraRig walk mode
New prop: `walkable` (default null). Shape: `{ eye: 1.55, speed: 2.2, radius: 0.28 }` (all optional with those defaults). Passed ONLY by FilmWorld/ArchiveWorld (motel never passes it).
Rules, integrated into the existing useFrame in this order:
- XR early-return stays first, untouched.
- Flight in progress: flight wins exactly as today; walk input ignored. (Entry flight, landmark clicks, door hops all still fly.)
- Idle + walkable + keyVec() nonzero: WALK.
  - Heading from `shown.current.yaw` (the damped look yaw): forward = -Z rotated by yaw, consistent with `aim()`'s convention. Movement is yaw-only; pitch never affects velocity.
  - Velocity: damp actual velocity toward `keyVec * speed` with accel time-constant ~0.09s, decel ~0.14s (exponential, frame-rate independent: `v += (target - v) * (1 - Math.exp(-dt/tau))`).
  - Integrate: proposed dx/dz for this frame -> `resolveStep(px, pz, dx, dz, radius)`.
  - Y: `floorYAt(x, z) + eye`, damped (rate ~10) so slopes/steps ease instead of popping.
  - Write camera.position directly. `base`/`off`/`shown` yaw-pitch machinery untouched — mouse-look composes with walking for free.
  - Walk bob: subtle. `bobPhase += dt * 7.4 * (speed01)`, offset `sin(bobPhase) * 0.012 * speed01` added to camera Y, plus `sin(bobPhase*0.5)` lateral 0.004. speed01 = |v|/speed. Module flag `bobEnabled` exported (`setWalkBob(on)`, persisted localStorage `vault-bob`, default on).
  - While walking (|v| > 0.05): fov zoom resets toward 1 (rate 6) — you cannot sprint around zoomed to 3.4x.
- After a walk, the "station" concept is stale: the camera is wherever it is. That is fine — the next stationKey change (landmark click, exit) flies FROM current position, which the flight already does (`fromPos = camera.position.clone()`).
- IMPORTANT: the arrival snap at flight end and the idle `shown` damping must not fight the walker. When walkable and the walker has moved (any walk input since last flight), skip the idle "hold at station pos" behavior entirely — position is walker-owned. Today idle mode doesn't write position at all (only rotation), so this should already hold; verify by reading the code, not assuming.
- Footstep hook: publish per-step events on a tiny bus (`src/rooms/walkBus.js`, gradeBus pattern): emit `{type:'step'}` each time bobPhase crosses PI (i.e. each footfall) while moving. Audio engine subscribes later (M-audio, separate); for M1 just publish.

### 4. GenericRoom auto-colliders
On mount (effect keyed on config), register with ownerId `room:<slug>`:
- box shell: 4 wall rects at the inside faces (thickness 0.15). If `doorGap`, split that wall's rect into two segments leaving the gap open. Bounds: rect inset 0.05.
- corridor shell: two side walls + far-end wall; entry end open; bounds rect spanning corridor length + 1m behind entry.
- open shell: `setBounds({kind:'circle', r: 34})` (ground disc is 40; keep the horizon out of reach). distantCity boxes: no colliders (out of bounds anyway).
- deck shell: railing lines as thin rects; fog wall as end wall; bounds rect.
- props: each entry in `PROPS` gains a `footprint(p) -> rects[]` helper (approximate axis-aligned; a table is one rect; chairRow one rect per seat; barShelf/counter one rect; abstractFigure r~0.25 as a square; paperScatter/pool/waterPlane/glassWall(non-blocking? NO: glassWall blocks)/branchTags none; lampPractical small square; vehicleMass its box; tree trunk square). Rotation: for rot.y ~ 0 or PI use as-is; for other rotations use the rotated AABB (conservative). Register alongside shell.
- `clearOwner` on unmount. StrictMode: effect cleanup must fully unregister so double-mount is clean.
- Sanity rule: the spawn point (config.camera.pos) must never be inside a collider. Add a dev-only console.warn if resolveStep from spawn is immediately blocked on all sides.

### 5. FilmWorld / ArchiveWorld
- Pass `walkable={{ eye: config.camera.pos[1] ?? 1.55 }}` to CameraRig. (Eye = the authored station height; rooms with slopes override via floor fn so eye rides the floor.)
- Everything else unchanged. Landmark stations (goToStation) still work: clicking flies, then walking resumes from there.

### 6. Mobile stick (`src/WalkStick.jsx`, DOM)
- Rendered by App next to the film HUD, only when a room world is mounted AND `navigator.maxTouchPoints > 0`.
- Left-bottom quadrant: a fixed translucent ring (~96px) with a nub; touchstart inside ring begins, nub follows within radius, vector -> a module setter `setStickVec({x, z})` that walkKeys' `keyVec()` merges (stick overrides keys when active). Touchend zeroes it.
- Pure DOM (absolutely positioned, pointer events on the ring only) so canvas drag-look on the right side is unaffected.
- Styling: quiet, paper-scrap-adjacent, near-invisible until touched (opacity 0.35 -> 0.6 active). No emojis, no bright chrome.

### 7. HUD
- Film HUD strip gains `bob` toggle next to the sound toggle (text style matches). Persisted as above.

### M1 gates
- peek `?room=darkknight&nocold&noguide`, then a scripted walk: extend `scripts/shot.py` with a `walk` check — load darkknight room, read `window.__vaultWalk`, dispatch W keydown, wait 700ms, keyup, assert position moved ≥0.8m; then hold W 3s toward the wall and assert position converges (wall stop). Add an arrow-key variant. Assert motel stations unchanged.
- peek three rooms of different shells (box: darkknight, open: coherence, corridor: rogue-one) after walking a few steps — READ the PNGs: no clipping through walls visible, room still composed.
- `npm run shot` full suite green.
- Commit: "Wave M1: the walker (WASD + collision + stick)". No push.

## M2 — pointer lock + crosshair (separate commit, after M1 verified)
- In walkable rooms, on desktop (`navigator.maxTouchPoints === 0`), clicking the canvas on NON-interactive space requests pointer lock on `gl.domElement`. While locked:
  - mousemove deltas feed `off` directly (same sens as drag, zoom-compensated).
  - A DOM crosshair dot (4px, 55% opacity, mix-blend-difference) centered; hidden when unlocked.
  - R3F click handlers still fire (pointer position = center when locked; verify — if R3F events don't follow lock, add a manual center raycast on click: `raycaster.setFromCamera({x:0,y:0}, camera)` against scene interactives; prefer whichever is less code after reading how R3F computes pointer from event.clientX).
- SHARP EDGE — Esc: the browser consumes Esc to release pointer lock and the keydown may not reach us. App's Esc handler must check: if `document.pointerLockElement` was set within the last ~200ms (track via `pointerlockchange` timestamp), swallow the Esc (that press was the unlock). First Esc unlocks, second exits the room. Test this by hand-reading the event flow, then verify with a peek + keyboard scripting.
- `wasDrag()` guard added to ALL rooms/* click handlers while in there (the live inconsistency: a look-drag ending over a click target currently fires it).
- Exiting the room, entering a flight, or opening Find releases pointer lock.
- Gate: peek with lock engaged (scripts can't truly pointer-lock in headless; verify the unlock/Esc logic via code review + manual dispatch of pointerlockchange, and the crosshair via a forced `?crosshair` debug query that shows it unlocked). Commit "Wave M2: pointer lock".

## M3 — bespoke + archive conversion (parallel batches AFTER M1+M2 land)
Every room that today uses click-planes/hotspots for movement converts to free walk. Stations stay as clickable landmarks where they exist. Per room:
- **Memento**: colliders for room furniture + walls + corridor sides. Delete `CorridorClickPlanes`. `maxIndex` (un-develop high-water) derives from walker position: `idx = floor((DOOR_Z - 0.4 - z) / CELL_LEN)` clamped, monotonic max in a ref. `stationIndex` state replaced by derived "inCorridor = z < DOOR_Z". Split grade `t`: unchanged formula but corridor test uses position not stationRef. Closed-door black plane fades out when player within 0.8m of the threshold (approach opens it; walking through it = crossing DOOR_Z). CorridorGlow already follows camera = follows walker; keep.
- **Sicario**: delete TunnelClickPlanes; `registerFloor` with the slope (`y = -SLOPE * progressAlongTunnel`, flat elsewhere); grade states (green/thermal) keyed to walker depth thresholds instead of station index; dwell-darkening unchanged.
- **Barbarian**: free walk living room + basement corridor; stairs = floor fn ramp; stationFor/moveOneStep deleted; the descent gating (if any state depends on station index) keys off z/y position.
- **Matrix**: helipad free walk (circle bounds); ring pads become landmarks (click still flies) but walking to a pad's radius triggers the same state the click did.
- **Predestination**: free walk bar + corridor. THE LOOP IS NOW REAL: when the walker crosses the far loop plane, teleport-wrap position back by the loop length (and same for backwards). The corridor visually tiles so the wrap is invisible (duplicate the near geometry at the far end if needed). This is the room's whole thesis; spend the effort.
- **BR2049 / Enemy / Sting / Ncfom / Departed / Nightcrawler / StBY / Amadeus / Baby Driver / MotU / Disclosure Day**: colliders authored from module constants (walls/furniture/parapet — Departed's roof edge parapet MUST block; nobody walks off the roof), free walk everywhere, existing named stations stay as landmarks. Ncfom `goBehind/goFront` stays clickable AND the walk path around the counter must be open (the room's point is walking around to see the coin).
- **Archive rooms**: FadedRoom inherits GenericRoom auto-colliders (it wraps the engine — confirm). Undeveloped: circle bounds, no colliders (walk through silhouettes is the design), the one-shot advance hotspot becomes a position trigger at 2m forward.
- Per-room gate: peek 2+ angles after walking there + wall-stop check near one wall; `npm run shot` green; one commit per room or small batch.

## Sharp edges (respect)
- pointer.js `wasDrag` latch + cursor reset on world swap already handled in App — do not duplicate.
- `<points>` keyed on count; material key flip on texture arrival; dispose textures on unmount.
- gaze consumers (PeripheralFigure, LookAwayGrow, Signs, bespoke rooms) read yaw/pitch — walking does not change that contract.
- Do NOT reintroduce yawRange clamps.
- configs.js / registry.js conflicts between parallel batches are additive keep-both.
- Kill each worktree's dev server before removing the worktree (file locks).
