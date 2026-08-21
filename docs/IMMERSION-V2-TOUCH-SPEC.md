# Immersion v2 — Wave T: Hands On Everything
Architect: Fable, Immersion v2 session. Prereq: Waves M1+M2 landed (walker + pointer lock). Dixon's ruling: every room gets at least one hands-on interaction with a PHYSICAL response, not just observation. Template rooms included. Diegetic feedback so you know what's touchable.

## Shared system (build once, in the main tree, before any room work)

### 1. `src/rooms/Touchable.jsx`
Wrapper component: `<Touchable onUse={fn} reach={2.4} foley="tick" disabled={bool}>{meshes}</Touchable>`
- Click/crosshair activation: `onClick` with `e.stopPropagation()` AND `if (wasDrag()) return` (repo-wide fix landed in M2; keep the guard here regardless).
- Proximity gate: on activation, measure distance from `window.__vaultWalk`-equivalent player position (import the walker position getter from colliders.js or walkBus — use the module export, never window) to the group's world position. Beyond `reach`: ignore the click, play nothing. No "too far" UI; distance is the diegetic teacher.
- Hover affordance (the glint, DIEGETIC, no UI outlines): on pointer-over within ~reach*1.5, damp a brightness lift on all child mesh materials: clone-on-first-hover, lerp material.color toward white by up to 8% (works for basic AND standard materials), damp rate 8; revert on out. Cursor 'pointer' inside reach, 'default' beyond.
- Press feedback: on successful use, a quick scale dip on the group (0.97 over 80ms, back over 160ms) UNLESS the room's own animation replaces it (`noDip` prop).
- Foley: on use, `playOneShot(foley)` (see 2).
- Crosshair path: in pointer-lock mode M2 already routes center-raycast clicks through normal R3F handlers; verify Touchable receives them; hover from the center raycast drives the same glint.

### 2. Audio one-shots (`src/rooms/audio/engine.js` extension)
`playOneShot(name)`: short synthesized events through the master bus, no-op while muted, safe with or without an active room recipe. Build from kit primitives, new tiny synth fns where needed:
- `tick` (soft filtered click), `thunk` (low sine drop + noise burst, door/furniture), `paper` (short bandpassed noise flutter), `coin` (two detuned high partials, fast decay + a spin-down repeat variant `coinSpin`), `creak` (slow pitch-bent narrow noise), `chime` (existing chime partials, short), `switch` (two-tick snap), `glass` (bright partial + fast damp), `swish` (airy noise sweep).
No samples. Keep each under ~40 lines. Footsteps: subscribe to walkBus 'step' events -> alternate two very quiet tick variants, gain scaled by walk speed; per-room material flavor optional later (config.footstep = 'carpet'|'wood'|'concrete' picks filter color; default carpet=soft).

### 3. Template engine touchables
- `place.props[i].touch = { kind, ...params }` in configs. GenericRoom wraps that prop in `<Touchable>` and maps kind -> a small physical animation component:
  - `nudge`: impulse wobble (rotational spring, decays ~1.2s) — bottles, chairs, small objects. Foley per kind default.
  - `swing`: pendulum impulse for hanging things (branchTags).
  - `press`: element depresses 2-4cm and returns; may set a config-named event on walkBus (rooms/systems can listen).
  - `open`: slide/hinge a child (drawer out, lid up); toggles.
  - `spin`: object spins up and decays (coin, tray).
  - `light`: toggles a lampPractical's light + emissive.
- EVERY template room config gains at least one touch entry, chosen to fit the film's paragraph in brief §5 (examples: bullettrain luggage `nudge`, exmachina glass `press` triggers a power-cut early, sunshine filter `press` steps the dimmer %, obsession branchTags `swing`, triangle charm pile `nudge`, game price-tag `spin`, moon EXACTLY-TWO props nudge in pairs — nudging one nudges its twin a half second later).

## Bespoke interactions (one batch item per room; brief §5 is design law)
Dixon named these six explicitly; the other ten get one fitting interaction each:
- **NCFOM — pick the coin UP**: click coin within reach -> coin arcs up to a held position low-center in view (parented to camera, small), `coinSpin` foley. Click again while held -> it arcs back to the counter, spins (existing spin logic), lands; the walk-around-to-see-the-result rule STAYS (result face only rendered once player has crossed behind the counter). Mute-disabled room rule untouched.
- **Departed — elevator call button**: a lit button by the doors; press -> depress + `switch`, elevator event triggers within 2s instead of the random timer. Label swap logic unchanged.
- **Memento — pull the drawer / flip the notes**: nightstand drawer `open` (holds the meta notepad); wall notes: clicking a note quad flips it over (rotY 180 spring) to a blank/scrawled back, `paper` foley. At least 6 notes flippable.
- **Obsession — wish-tag swing**: touch a tag -> pendulum swing + `paper`, neighboring tags catch a smaller sympathetic swing.
- **Predestination — knock a bottle**: `nudge` with real topple: past a wobble threshold the bottle falls over (rotates to rest on the counter, stays down), `glass`. At least one bottle; the rest wobble only.
- **Barbarian — open the basement doors one by one**: each corridor door starts closed; click -> hinges open with `creak`, revealing the next dark segment; the hidden room's door is the last and heaviest (slower swing, lower `thunk`). Progression gating that used stations now keys on doors opened.
- Sting: press a chalkboard rag -> one odds line wipes and rewrites (canvas redraw), `swish`. / Matrix: touch the frozen shockwave -> time resumes 1s (brief law) + `swish`. / BR2049: touch the rain-wet rail -> ripple ring + damp `glass`. / Enemy: touch the wrong twin of any pair -> it snaps to match its partner for 3s, then drifts wrong again. / Nightcrawler: press the camcorder REC -> viewfinder frame locks to current view for 5s. / StBY: press a headset on a cubicle -> a phone `tick` ring answered by the hard cut arriving sooner. / Amadeus: touch a page -> ink accelerates across it, `paper`. / Baby Driver: press the car's brake -> brake lights + a beat-quantized `thunk` ON the next downbeat (never off-grid). / MotU: press the throne armrest petition -> spotlight snaps to YOU for 2s, lightning poses at you. / Disclosure Day: press the podium mic -> a `tick`, the scrolling speech pauses 3s, resumes; the curtain does not care.
- Archive rooms: prints/FadedRoom get one `nudge`-class touch on the room's central prop (faded response, half amplitude). Undeveloped: none (exit is the only interaction, by law).

## Gates
- Shared system commit first (Touchable + one-shots + engine touch kinds + footsteps), verified in darkknight (add a `touch` to its coin object) via peek before/after press frames.
- Per-room: peek before/during/after frames of the interaction (3 peeks), READ them; `npm run shot` green; commit per room/batch.
- StrictMode-safe, dispose cloned materials on unmount, no new deps.
