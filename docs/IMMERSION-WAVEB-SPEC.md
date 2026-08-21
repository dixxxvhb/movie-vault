# Immersion Wave B — Template Engine + All 41 Rooms
Architect: Fable session 2026-08-21. Prereq: Wave A landed (FilmWorld, registry, configs.js with DEFAULT, InfoSurfaces, Develop portal). Design intent per room: `docs/VAULT-IMMERSION-BRIEF-v2.md` §5 — the builder MUST read §5 and honor each room's intent; this spec gives structure, the brief gives soul.

## Engine architecture (locked)

"Family" is a PRESET, not a component. The engine is one data-driven room:

```
src/rooms/
  GenericRoom.jsx      one component: shell + props + systems + lighting from config
  presets.js           the six family presets (default shell/lighting/systems/fog)
  props.js             prop kit: parameterized primitive set pieces (pure JSX fns)
  systems/             system kit: one small component per system (self-cleaning)
  configs.js           41 per-film configs (Wave A file, now filled)
```

`getRoomConfig(slug)` merges: DEFAULT <- preset[family] <- per-film config. FilmWorld renders `<GenericRoom config info film/>`. Tier 1 bespoke rooms (Phase 2) will REPLACE GenericRoom per slug via the registry; in Phase 1 every slug goes through the engine.

### Shells (props.js provides; config.shell picks + params)
- `box` room: w/d/h, wall material (flat color + subtle procedural roughness canvas), optional window strip (emissive plane), optional door gap. Reuse canvas-texture patterns from roomTextures.js but NEW simpler generators (no motel wallpaper; flat/plaster/steel/wood tints per config).
- `open` exterior: ground plane (color/mat), sky dome (big sphere, gradient canvas texture, backside), optional horizon glow band, optional distant-city instanced boxes w/ emissive windows.
- `corridor`: long box, repeating ribs, far-end light plane.
- `deck`: floor plane + railing tubes + fog wall (open with hard fog).

### Prop kit (each a pure component: pos/rot/scale/color/emissive)
slab, table, chairRow (abstract seat boxes), counter, barShelf (bottle-ish cylinders, emissive glints), bed, screenPanel (emissive plane w/ canvas texture), podium, throne (slab composition, bone-white accents), tree (cone/cylinder abstraction), branchTags (hanging quads on lines), waterPlane (animated normal-ish via time-scrolled canvas bump; keep cheap), glassWall (transparent plane + frame), mirrorPlane (fake: darker duplicate world NOT required; a reflective-looking gradient plane is enough at this tier), vehicleMass (rounded box composition, no badging), abstractFigure (dark capsule+sphere, optional pose param: stand/sit/crouch/walk-cycle-frozen), paperScatter (instanced quads), pool (recessed plane + emissive water), lampPractical (small emissive sphere + point light).

### System kit (src/rooms/systems/, each: mount-clean, StrictMode-safe, params via config)
1. `ResetFlash` {period, jitter}: white flash overlay plane + props re-seed (coherence, source-code).
2. `Duplicates` {offset, wrongness}: renders children twice, second slightly off (enemy, moon).
3. `SwarmEvent` {period, count, color}: particle cloud erupts, circles, disperses (batman).
4. `StreakLights` {axis, speed, colors}: emissive quads sweeping past windows (bullettrain, maverick, cmiyc).
5. `AdvanceGlow` {from, color, speed, resetAt}: light + glow plane creeping toward camera, never arrives (rogue-one, minority-report rolling ball variant {prop:'sphere'}).
6. `ScheduledCut` {period, duration, altGrade, altLights}: hard swap of background/lighting for N ms, no easing, then back (stby swerve, barbarian smash cut, exmachina power-cut red {lockExit:true} flag ignored at this tier).
7. `PeripheralFigure` {corner, height}: abstractFigure only visible when NOT near view center — read `gaze` from CameraRig.jsx export; opacity = smoothstep(angleFromCenter) (hereditary, malignant pre-dwell).
8. `LookAwayGrow` {prop, max}: instanced pile that adds one instance each time gaze leaves it (triangle Sally pile).
9. `PulseBeat` {bpm, targets}: rhythmic intensity pulse on lights/emissives (baby-driver stand-in, tdkr chant {bpm:40}).
10. `GlyphRain` {area, color, glyphs}: falling canvas-texture glyph quads, OUR OWN alphabet: design ~24 original glyphs on canvas from primitive strokes; do NOT copy the film's set (matrix periphery).
11. `RainField` {density, wind}: streak particles + floor splash shimmer (br2049, pressure windows {insideOnly:true}).
12. `Assembler` {period}: props fly in from below/offscreen, lock, later un-build one wall and rebuild (the-sting).
13. `CurtainReveal` {period}: a curtain plane scales open onto an empty alcove, closes (disclosure-day).
14. `InkSpread` {surfaces, rate}: growing dark decal quads crawling across walls (amadeus stand-in).
15. `DwellConcede` {afterSec, then}: after N sec of presence, swap to a wilder state: strobe red light + faster systems (malignant).

If a room in the table below names a system not in this kit, map it to the closest one with params; add a new system ONLY if nothing fits (flag it in the report).

### Grade
Default derives from `film.palette`: background/fog = darkened bg, key light = acc, fill = sub. Per-film `grade` overrides in the table. Post pass (Wave A) reads {hue, sat, contrast}.

## The 41 configs

Format: slug | preset | shell | staging (props one-liner) | systems | notes. Read the corresponding brief §5 paragraph for each before writing its config; where this table and the brief's prose differ in spirit, the brief wins. Tier 1 slugs get engine stand-ins now (marked T1); their bespoke rooms come in Phase 2.

| slug | preset | shell | staging | systems |
|---|---|---|---|---|
| memento (T1) | mind-bender | box (motel-ish, plain) | bed, dresser, paperScatter on wall, mirrorPlane over sink slab | Duplicates{subtle}, ResetFlash{period:70} — score numeral RENDERED MIRRORED, correct in the mirror plane region |
| the-departed (T1) | intimate-tension | open (rooftop) | floor=roof gravel tint, distant-city, railing tubes, elevator doors slab pair, golden horizon band | ScheduledCut{period:75, duration:4000, altLights:elevator-open chime-lit} |
| sicario (T1) | dread | corridor (tunnel) | dusk entry: open shell w/ orange horizon + figure line (abstractFigure x5 walk-frozen) then dark ribs | AdvanceGlow{color:'#8aff9a'} + grade flip toward green over dwell |
| matrix (T1) | spectacle | open (rooftop helipad) | helipad disc, distant-city, crouched abstractFigure center | GlyphRain{periphery}, frozen shockwave = ringed transparent shells around figure |
| br2049 (T1) | spectacle | deck (sea wall) | concrete slabs, waterPlane beyond, monumental abstractFigure far, facing away | RainField{heavy}, ScheduledCut{period:90, duration:6000, altGrade:orange wash} |
| the-sting (T1) | weird-fable | box (parlor) | counter, barShelf, chalk screenPanel, flat props with visible backs | Assembler{period:80} |
| enemy (T1) | mind-bender | box (apartment) | table+chairs, window strip venetian slats, skyline silhouette w/ faint colossal legs | Duplicates{offset:0.08, wrongness:high}, PeripheralFigure{ceiling} |
| nightcrawler (T1) | momentum | open (overlook) | guardrail tubes, sodium grid city (emissive instanced), one polaroid prop | screenPanel viewfinder frame floating that brightens what it frames (use a spot light aligned to gaze) |
| stby (T1) | intimate-tension | box (call floor) | cubicle slabs grid, fluorescent strips | ScheduledCut{period:60, duration:5000, altGrade:gold, altProps:party} |
| amadeus (T1) | intimate-tension | box (bedchamber) | bed, chair close, candle lampPracticals, cold window strip | InkSpread{walls} |
| predestination (T1) | mind-bender | box (bar) | counter, barShelf, two stools, doorway gap glowing | timeline ribbon = emissive tube ring above bottles; corridor loop NOT attempted at this tier |
| baby-driver (T1) | momentum | open (curbside) | bank facade slab, red vehicleMass, sunny sky | PulseBeat{bpm:110, targets:brakeLights+paperScatter} |
| ncfom (T1) | dread | box (gas station) | counter, shelf slabs, harsh door light plane, coin = small emissive disc on counter | none (stillness IS the system); wind-only note on info surface |
| barbarian (T1) | dread | box (living room) + corridor gap down | couch slab, lampPractical cozy, open dark door gap w/ stairs hint | ScheduledCut{period:70, duration:1000, altGrade:oversaturated daylight} |
| masters-of-the-universe-2026 (T1) | spectacle | box (throne hall, tall) | throne on dais, purple-green fog, spot snap | PulseBeat{bpm:30, targets:lightning rim lights posed not striking} |
| disclosure-day (T1) | intimate-tension | box (hall, overlit) | podium, chairRow x6 empty, flag slabs blank | CurtainReveal{period:45}, scrolling speech text = screenPanel walls w/ slow-scroll canvas of empty rhetoric WE write (meaningless civic filler, no real-world names) |
| darkknight | intimate-tension | box (interrogation) | steel table, two chairs, white light panel, mirrorPlane wall | half-room entropy: paperScatter + flicker light on one side only; mirror region shows calm tint |
| tdkr | spectacle | corridor (vertical: the pit) | circular well walls (curved slabs), ledges, rope tube NOT attached at top, light disc far above (camera looks up) | PulseBeat{bpm:40, targets:ambient} |
| batman | dread | box (well bottom, low) | stone tint, small sky disc above | SwarmEvent{period:40} |
| poorthings | weird-fable | open (terrace) | candy gradient dome, wrong-scale pastel arch slabs, three ornate sign panels (his three acts: why / what / the fuck) | fisheye: fov 95 in camera config |
| cmiyc | momentum | box (concourse, long) | terminal columns, long window strips low sun, silhouette figure row walk-frozen | StreakLights{floor shadows}, ribbon quads sweeping walls |
| bullettrain | momentum | box (train car) | seat rows pastel, window strips | StreakLights{speed:high, colors:[lemon '#e8d44d', tangerine '#e8862b'] at car ends as dueling point lights} |
| stardust | weird-fable | open (night meadow) | stone wall + gap, star dome (dense emissive points), candle warmth this side | one falling-star streak on a long timer |
| coherence | mind-bender | open (dark suburb street) | ONE warm lit house mass duplicated to horizon (instanced grid), comet streak overhead | ResetFlash{period:55}, glowstick quads (two colors) drifting |
| exmachina | intimate-tension | box (glass room) | glassWall panels, concrete, forest silhouette beyond (dark cones + green rim) | ScheduledCut{period:50, duration:3000, altGrade:red, altLights:red pulse} |
| niceguys | momentum | open (backyard) | pool, fence line, smog-gold sky, tumbling props frozen mid-air, abstractFigure mid-tumble over fence | none; comedy is the frozen physics |
| rogue-one | dread | corridor (dark hallway) | sliver of white light plane at far door | AdvanceGlow{from:behind, color:'#C22E2E', hum note in info}, paperScatter fleeing forward |
| maverick | spectacle | box (cockpit-framed) | canyon walls streaking beyond window frame | StreakLights{terrain}, PulseBeat{g-force shake subtle}, timed run reset |
| moon | intimate-tension | corridor (base, white) | white modular ribs, window w/ grey regolith + crawling harvester mass far, EXACTLY TWO of every prop | Duplicates{explicit pairs, no wrongness} |
| source-code | mind-bender | box (train car, warm) | seat rows warm wood tint, morning window strips, city approaching | ResetFlash{period:45, heldGoldenChance}: occasionally freeze warm + bloom before the reset anyway |
| obsession | weird-fable | box (parlor w/ tree) | tree indoors, branchTags hanging wish-tags, cartoon-dread lighting (teal shadows, warm pools) | branchTags sway |
| triangle | mind-bender | deck (liner deck) | fog wall, railing, gull cones circling one point | LookAwayGrow{prop:identical charm quads} |
| pressure | intimate-tension | box (map room) | big table w/ isobar screenPanel, one lampPractical, black windows | RainField{insideOnly windows}, isobar sweep = scrolling canvas on the table panel |
| minority-report | mind-bender | box (temple pool) | pool glowing milky from below, cool blown-out grade, floating glassWall gesture panels | AdvanceGlow{prop:red sphere on a rail track toward camera, never arrives} |
| sunshine | spectacle | box (observation room) | one ENTIRE wall = sun plane behind dimmer (emissive gradient + filter % readout screenPanel), chairRow facing it | slow filter breathing; gold blowout edges via bloom |
| annihilation | weird-fable | open (boundary) | iridescent shimmer wall (transparent gradient plane, animated uv), crystalline cones beyond, mutated colorway flora (instanced) | shimmer scroll |
| oblivion | spectacle | box (sky pod, white) | glass pool edge, cloud floor outside (white fog bank), minimalist slabs | one drone orb patrolling that turns to regard camera (gaze-aware lookAt) |
| game | mind-bender | box (handsome house) | furniture props EACH with a visible seam/price-tag quad, tray with fake pen | none; the pre-revealed reveal is set dressing |
| silverlake | weird-fable | open (hillside pool night) | pool glow, LA glitter grid below, cereal-glyph projections (GlyphRain{floor-projected, static}) on water/walls | map screenPanel that re-arranges on LookAwayGrow logic (rearrange, not grow). NO string, NO corkboard |
| hereditary | dread | box (living room, LOW ceiling) | dollhouse seams = visible frame lines on walls, treehouse glow far out window, miniature furniture slightly small | PeripheralFigure{high corner} |
| malignant | dread | box (bedroom) | bed, mirrorPlane in which a figure faces AWAY (abstractFigure reversed behind a dark plane) | DwellConcede{afterSec:25, then:strobe red + motion} |

## Three-state treatments (Wave C, same builder run if capacity allows, else next task)
- films[].state exists in data; shoebox/drawer entries are separate arrays. Phase 1 scope: LEDGER films only via the engine. Shoebox/drawer rooms:
  - Shoebox print rooms: engine room from a genre-mapped preset, rendered FADED: force sat toward 0 (grade), dim lights 0.4x, add drifting dust, pencil-grey fog; info = memory score IN PENCIL styling + snap_line.
  - Dark Drawer rooms: one shared `Undeveloped` room: near-black, dense fog, faint abstractFigure silhouettes that never resolve, NO info surfaces, exit only.
  - Enterable from a held print (picked state): "step inside" on the print HUD.
- Certification develop animation: Phase 3, skip.

## Gates
- Every one of the 41 slugs resolves to a non-default config (DEFAULT remains only as a safety net).
- peek at MINIMUM these six rooms and READ the PNGs: matrix, coherence, hereditary, bullettrain, sunshine, disclosure-day (one per preset).
- `npm run shot` full suite green (wall untouched).
- Perf: rooms must hold 60fps-ish on desktop; instanced meshes for any count > 20; total new code split via dynamic import of GenericRoom bundle is OPTIONAL this wave (note if skipped).
- Commits: engine+systems commit, then configs commit. No push.
