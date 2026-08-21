# Immersion Phase 2 — Bespoke Rooms + the Audio Engine
Architect: Fable session 2026-08-21. Prereq: Waves A+B landed. Order: audio engine, then Memento, then The Departed, then Baby Driver (proves audio), then The Sting, Sicario, and the rest of Tier 1 as capacity allows. Brief §5 Tier 1 paragraphs are the design intent and win over anything thinner here.

## Bespoke architecture
- `src/rooms/bespoke/<Name>.jsx`, one per Tier 1 film. `registry.js` gains a bespoke map: slug -> lazy-ish component reference (plain import is fine; if bundle weight grows past ~150KB gzip for bespoke code, switch to dynamic `import()` per room and note it).
- A bespoke room receives the same props as GenericRoom (`film`, `config`, `infoVisible`) and may still use the prop kit, systems, and InfoSurfaces. Bespoke means the composition is hand-authored, not that everything is rebuilt.
- Each bespoke room keeps a config entry (grade/camera/far) so FilmWorld behavior stays uniform.

## Audio engine (`src/rooms/audio/`)
- `engine.js`: singleton. AudioContext constructed ONLY on first unmute (copy roomTone.js discipline; never autoplay). Master gain with 80ms ramps. Mute default ON; persisted (localStorage key `vault-sound`, same mechanism Guide.jsx already uses).
- Film HUD (FilmWorld strip) gains a `sound` toggle; motel keeps its existing room-tone toggle; the two are independent.
- `clock.js`: a beat/phrase clock that runs off rAF time math (NOT the AudioContext, NOT setInterval) so VISUAL systems stay on the grid even while muted. API: `useBeat(bpm) -> { beat, bar, phase }` via a subscribe callback ref pattern (no per-frame React state).
- `recipes/<slug>.js`: `start(ctx, master, clock) -> stop()`. Primitives in `recipes/kit.js`:
  - `drone(freqs, detuneCents, gain)` layered detuned oscillators through a lowpass
  - `noiseWash(color, lfoRate)` filtered noise bed
  - `pluck(freq)` Karplus-Strong-ish decaying feedback (or short filtered burst; keep cheap)
  - `chime(freqs)` bell partials with long decay
  - `beatKit(bpm)` synthesized kick (sine drop + click), snare (noise burst + bandpass), hat (short hp noise), bass (osc w/ glide), quantized to clock
  - `swellReverse(freq)` attack-swell-hard-cut envelope (reversed-tape feel)
- Rules: pure synthesis only, no samples, no melodies quoted from any score. Register and rhythm homage only. Total output limited (compressor on master) so nothing clips.

## MEMENTO (bespoke/Memento.jsx) — the crown, 10.0
The brief paragraph is law; implementation notes:
- **Geometry**: Discount Inn room ~4.5x2.8x5m: bed (slab + pillow forms), dresser, nightstand, tattoo-mirror bathroom nook (sink counter + mirror frame plane + cold flicker light), and THE WALL: a spread of note quads + small polaroid quads (procedural canvas: scrawled marker lines, our own handwriting textures; text fragments are Dixon-record phrases, not film quotes: his hot take split into shards, "remember sammy jankis" NOT used — write our own note copy from his record: "it deserves the 5.0", "structure can't be spoiled", "the insulin question stays open", etc. No film dialogue.)
- **The door + corridor**: doorway in one wall opens onto a ~18m corridor. Click-to-advance stations every ~3m (reuse CameraRig literal stations; station index in room state). As you advance, corridor segments BEHIND the camera un-develop in three steps: full material -> wireframe (same geometry, material swap w/ key flip) -> gone (unmount). The polaroid quads pinned along the corridor walls stay lit longest: the photos are the last thing to survive. Walking back re-develops nothing: the segments return only as wireframe. Exit affordance always works.
- **Split grade**: saturation follows view direction: looking INTO the room = warm (sat 0, warm key); looking down the corridor = silver B&W (sat -1, cool key). Lerp `Post` grade params from camera yaw vs door axis (pass a callback or small store from the room to App's grade state; keep it a module-level setter in rooms/gradeBus.js, App subscribes — rooms/* must not import App).
- **The mirror 10.0**: numeral canvas drawn REVERSED hung above the sink; inside the mirror frame plane, the same texture drawn normal. Reads wrong in the world, right in the mirror.
- **Floor polaroid**: a ~2.2m polaroid flat on the carpet, hot take handwritten across its photo area (canvas, big marker strokes). This replaces the standard hot-take sheet; score numeral replaced by the mirror bit; meta + chips stay, small, on the nightstand as a motel notepad.
- **Audio recipe**: low detuned drone + sparse plucks + occasional swellReverse. Quiet, unresolved, never a melody.
- **Cold detail**: entering Memento's room from the wall is the origin myth: the Develop wash for THIS slug runs slightly longer and settles grain slower (Develop accepts an optional `slow` flag).

## THE DEPARTED (bespoke/Departed.jsx)
- Rooftop: gravel roof plane, parapet, distant Boston-ish skyline (instanced emissive boxes) in golden-hour haze (warm fog + low sun key), elevator lobby volume with two door slabs.
- Elevator event (60-100s random): generative chime (recipe: two-partial chime), doors slide open on an empty lit car, hold 6s, close. While open, every tagged prop swaps its label quad between COP and RAT if not near view center (gaze check, PeripheralFigure logic inverted).
- The rat: small dark mass walking the parapet rail on a loop, gold rim light, silhouetted.
- Rating on the elevator floor indicator (canvas segments display showing 9.9). Hot take as a case-file dossier on the roof vent. Audio: distant city noiseWash + rare chime.

## BABY DRIVER (bespoke/BabyDriver.jsx) — proves the audio
- Curbside: bank facade, red vehicleMass at the curb, sunny grade, paper scatter.
- `recipes/baby-driver.js`: beatKit ~110bpm + bass line pattern (original, 8-bar loop) + stab hits on syncopation. The clock drives BOTH audio and visuals; muted = visuals still dance.
- Visual sync: wipers sweep on downbeat, brake lights flash on the bar, abstractFigure pedestrians cross on phrase boundaries, particle bursts on syncopation hits, score numeral pulses on the kick.
- If the sync reads mushy in a peek video (single frames can't show it), verify with 3 peeks timed ~0.5s apart showing different wiper positions.

## THE STING (bespoke/Sting.jsx)
- Assembler choreography upgraded from the generic system: entry sequence: flats + scaffold + backdrop fly in over ~6s and LOCK warm; behind every wall (walk around): bare lumber frames + stage weights. FBI office through a doorway permanently half-built (wireframe + primer grey). One wall un-builds/rebuilds on a long cycle. Hot take painted (big brush canvas) on the back of the largest flat: found only by walking behind. Amber grade, brass rail, chalkboard odds (our own fake races). Audio: sparse ragtime-adjacent plucks, original pattern, low.

## SICARIO (bespoke/Sicario.jsx)
- Two-zone: dusk staging ground (orange horizon band, 5 abstractFigures in silhouette line, long shadows) with the tunnel mouth; descend (click stations) into dark ribbed corridor where the grade flips to night-vision green, then thermal white-hot near the bottom (two ScheduledCut-style grade states keyed to depth). Room darkens with dwell. 9.9 in thermal white at the bottom; hot take + the 9.9 amendment as mission-brief text panel at the entry. Audio: sub drone that thickens with depth + slow pulse (the BWAAAM shape as a filtered swell, never the actual cue).

## Remaining Tier 1 (matrix, br2049, enemy, nightcrawler, stby, amadeus, predestination, ncfom, barbarian, masters-of-the-universe-2026, disclosure-day)
Their Wave B engine rooms already stage the scene; bespoke passes upgrade them one at a time in later sessions per brief §5. Do not start these until the five above are approved.

## Gates per room
- peek from at least 2 stations + one detail angle; READ the PNGs; the room must evoke the film's paragraph to an eye that has seen the movie. Iterate before reporting.
- `npm run shot` green after each room lands.
- One commit per room ("Memento: the motel room, backwards"). No push without Dixon's go.
