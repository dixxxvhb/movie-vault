# Immersion v2 — Wave P: Video-Game Grade
Architect: Fable, Immersion v2 session. Prereq: Waves M + T landed. Dixon's bar, verbatim intent: "small indie game you'd pay for, not a tech demo." Every room's exit test: "would this pass as a screenshot from a real game?" If no, it is not done. Equal weight with movement and interaction.
The fidelity contract (brief §1) still rules: zero imported assets. Everything below is procedural canvas + geometry + lights.

## P0 — the shared toolkit (main tree, single builder, FIRST)

### 1. `src/rooms/materials.js`
Procedural PBR-feel surface factory, cached by param key (module Map, never disposed — matCache precedent):
`makeSurface({ kind, tint, scale, wear })` -> `{ map, bumpMap, roughnessMap }` CanvasTextures (512 or 1024 canvases, RepeatWrapping).
Kinds (each its own generator, layered noise + strokes on canvas):
- `wood` (grain lines + knots + varnish variance), `plaster` (blotches + hairline cracks), `concrete` (pores + form lines + damp patches when wear high), `carpet` (fine speckle + traffic wear lanes), `fabric` (weave cross-hatch), `metal` (brushed streaks + edge wear), `paper` (fiber + slight cockling bump), `brick`/`tile` (grout grid + per-cell tint jitter), `asphalt`/`gravel` (aggregate speckle), `wetconcrete` (concrete + dark sheen pools -> low roughness patches).
Pair with `meshStandardMaterial`; roughnessMap is the star: light grazing across variance is what sells realism. Helper `standardMat({kind, tint, ...})` returns a cached material instance.
RULE: no two adjacent surfaces in a room share the identical material instance params. Vary tint/scale/wear.

### 2. `src/rooms/detail.jsx`
- `Bevel` helpers: use drei `RoundedBox` (dep already present, currently unused — confirm import works with pinned drei 9.109/three 0.161; if it drags in problems, hand-roll a chamfered box geometry ONCE here) for any prominent prop body. Naked sharp `boxGeometry` allowed only for distant/large architecture.
- `Trim`: baseboard/crown/door-frame runs (thin extruded boxes with a step profile) parameterized by wall length.
- `FrameOn(wall)`: picture-frame/panel moulding rectangles to break flat walls.
- Decals: `Scuff`, `Stain`, `CrackLine` as alpha-canvas quads laid on surfaces (polygonOffset to avoid z-fight).
- Clutter kit (instanced where count > 8): `crumpledPaper` (crushed icosahedron-ish), `cup`, `bottleRow`, `wireRun` (catmull tube along points, sag), `bookStack`, `boxPile`, `rag`, `shardBits`. All accept tint; authored placement per room, never random confetti: clutter tells the film's story.

### 3. Lighting doctrine (doc section + `src/rooms/lightRig.js` helpers)
Per room, layered like a level: (a) one KEY (directional or spot, the scene's motivated source), (b) PRACTICALS (small point lights at visible fixtures, warm, decay 2), (c) one or two colored BOUNCE fills (low intensity, hue from floor/walls), (d) RIM/silhouette accent where a silhouette matters, (e) darks stay dark: ambient <= 0.12 in moody rooms, zero in dread rooms.
- `lightRig(config)` helper assembles from a config block so template rooms inherit it: `lights: {key:{...}, practicals:[...], bounce:[...], rim:{...}}`.
- Shadows: Canvas gains `shadows` enabled, but EVERY existing light stays castShadow=false (motel byte-identical; verify with shot suite). A film room may enable castShadow on AT MOST its key light + one 512px map when the room earns it (Memento lamp, NCFOM door light). Measure fps in the peek run (expose `window.__vaultFps` rolling average; shot.py logs it).
- Bloom discipline: emissiveIntensity > 1 ONLY on actual light sources (bulbs, signs, screens); paper/props stay <= 0.4 so bloom never blooms paper.

### 4. Atmosphere kit (`src/rooms/atmosphere.jsx`)
- `HazeCone` (volumetric-feel spotlight cone: additive gradient cone mesh, camera-fade), `DustField` (existing pattern, parameterized density/size), `FogLayers` (two ground-fog planes scrolling opposite), `Rainlight` (window-light shimmer quad). Use where EARNED per room, one or two per room max.
- Camera physics polish lives in CameraRig already (bob); add eased stop (velocity decel already), plus landing micro-dip after a flight (2cm, 250ms).

### 5. Per-room grade (`Post` extension)
`config.grade` gains optional `{ grain, vignette, bloomIntensity }`; App's Post reads them (uniforms on the existing shared effects; Noise opacity, Vignette darkness, Bloom intensity). Every polished room sets all three deliberately, tuned per film like a colorist.

### 6. Performance rules (part of polish, enforced per room)
- 60fps desktop budget. `window.__vaultFps` + shot.py logging (see 3).
- Instance any repeated mesh > 8 count. Total lights per room <= 7 points/spots. One shadow map max. Texture canvases <= 1024. No per-frame material/geometry allocation (reuse Vector3 scratch).
- If a room dips below ~50fps in the harness, cut cost before cutting the look: instance, merge geometry, reduce lights, THEN simplify.

### P0 gate: toolkit committed; darkknight upgraded as the PROOF ROOM using every toolkit piece (materials on walls/table, trim, clutter, layered lights, grade values, fps logged). Two peeks (wide + detail) that pass the game-screenshot test to YOUR eye before showing the architect.

## P1 — bespoke priority pass (parallel batches AFTER P0 approved)
Order (Dixon's most-visited first): **Memento, Departed, Matrix, Sicario, Baby Driver**, then the remaining 11 bespoke (Sting, BR2049, Enemy, Nightcrawler, StBY, Amadeus, Predestination, NCFOM, Barbarian, MotU, Disclosure Day), then archive treatments inherit automatically where they wrap the engine.
Per room, the finishing pass (brief §5 paragraph is the art direction; the film's real look is the reference):
1. Geometry: replace naked boxes on hero props (RoundedBox/profiles), add trim/frames/baseboards, silhouettes (register keys, duvet fold on beds, wheel wells + panel gaps on the car), environmental-storytelling clutter authored to the film (Memento: motel ashtray, strewn notes, instant camera shape; Departed: roof gravel texture + vents + tar seams + cigarette butts; etc.).
2. Materials: standardMat surfaces everywhere lit; no two surfaces share a flat material; wet sheen where wet.
3. Lighting: full layered rig per doctrine; the room's lighting must be screenshot-able as a mood reference alone (turn info surfaces off with `i` for the check).
4. Atmosphere: earned haze/dust; foley already wired (Wave T); interaction glints intact.
5. Grade: set grain/vignette/bloom + hue/sat/contrast like a colorist for THAT film.
6. Fps: log before/after; stay >= 55 in harness.
Per-room gate: BEFORE peek + AFTER peeks (wide, detail, info-off mood shot). READ them. Ask per frame: real game screenshot? Iterate until yes. `npm run shot` green. One commit per room.

## P2 — template engine lift (after P1 batch 1 proves the toolkit)
- GenericRoom shells adopt materials.js surfaces (config `shellParams.mat = {walls:'plaster', floor:'carpet', ...}` with per-family defaults), trim on box shells, lightRig replaces the two hard-coded point lights (config-driven, preset-level defaults so all 25 template rooms upgrade from their PRESET without 25 hand edits), DustField default at low density, grade triplet defaults per preset.
- Prop kit upgrade: bevel hero props, add silhouette details (register keys, bottle variety, seat cushions), clutter hooks (`place.clutter = [...]`).
- Then a sweep: peek ALL 25 template rooms (loop), READ each, fix the worst 5 by hand-tuning their configs.
- Gate: fps holds, shot suite green, commit engine lift + config tune separately.

## Batching + process (burned lessons, follow exactly)
- P0 in the main tree, single builder. P1 in parallel worktree batches of 3-4 rooms, `git worktree add` BY HAND (Agent-tool isolation fails when session CWD isn't the repo), specs COMMITTED first, one writer per checkout, architect merges, configs.js/registry.js conflicts = additive keep-both, kill each worktree's dev server before removal. Every builder READS its screenshots.
