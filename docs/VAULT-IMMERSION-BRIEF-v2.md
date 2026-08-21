# VAULT IMMERSION BRIEF v2 — "Step Into the Polaroid"
**For: Claude Code session, repo `~/Code/movie-vault`**
**From: Leonard (chat), drafted with Dixon, 2026-08-21. Supersedes v1 same night.**
**Magnitude: 5.0+. Redesign-class addition, not a reskin.**
**Fidelity ruling (Dixon, this session): MAXIMUM-FIDELITY HOMAGE, ZERO IMPORTED ASSETS.**

*(Filed to repo by Code 2026-08-21. Kickoff rulings, decided by Dixon in-session: bloodline doors YES; audio = generative per-room; Tier 1 list = the split below as the working list, promotions at review.)*

---

## 0. The idea in one paragraph

The Vault is Leonard's external memory system: a wall of polaroids. Today, clicking a photo flips it to read the back. The upgrade: clicking a photo transports you INTO it. Every logged film gets an immersive 3D recreation of the scene or place that defined it for Dixon, and the film's record (rating, date, hot take verbatim, vibe tags, bloodlines) lives inside that world as diegetic objects. Back out and the world collapses into a photo on the wall. Memory is no longer just external. It is enterable.

## 1. The fidelity contract (read this twice)

**Build the scene, import nothing.** Every room is a hand-built 3D recreation made entirely of our own geometry, materials, shaders, particles, and generative audio. Within that rule, go as close as craft allows:

**ALLOWED, ENCOURAGED, THE WHOLE POINT:**
- Recreating the staging, layout, and blocking of specific scenes (the elevator, the basement, the bar, the pit). You should be able to stand where the camera stood.
- Film-accurate color grading. Match the palette, the LUT feel, the light temperature of the actual film per room.
- Composition homage: recreate iconic framings in 3D space (camera height, lens feel via FOV, key light angle).
- Sound-alike generative audio: original Web Audio synthesis tuned to evoke the score's register and rhythm (the BWAAAM shape, the groove pocket, the strings register). Familiar nerve, original signal.
- Silhouettes and figures as abstracted forms (no facial likeness, no actor recreation). A figure can hold a pose; it cannot be a person.
- Original text everywhere. Dixon's hot takes are the script of this world.

**EXCLUDED, NON-NEGOTIABLE (the short list):**
- No embedded stills, frames, posters, key art, or screenshots.
- No studio/franchise logos, wordmarks, or title treatments.
- No soundtrack audio files or sampled dialogue. Zero exceptions, this is the DMCA takedown vector for a public repo + public Pages site.
- No actor likenesses (face geometry/textures).
- No direct copies of protected graphic designs (the Matrix glyph set specifically; design our own falling-code alphabet).
- Nothing copied into the repo from the internet. If a file didn't originate in this project, it doesn't ship.

If any spec below can be built closer to the film within these rules, build it closer. Ambiguity resolves toward fidelity, not away from it.

## 2. Standing laws (unchanged, weight-5, do not relitigate)

1. Banned drawer stays banned as a DEFAULT COSTUME: noir, evidence board, typewriter, VHS, marquee, neon. A film's own world may contain these things when the film actually contains them; no room reaches for them as decoration, and no red string/corkboard anywhere including Under the Silver Lake.
2. No DWD branding: no #0c1f17, #f8d7c8, terracotta, ivory; no Cormorant/Outfit/Bebas.
3. No emojis in UI. Small unicode glyphs welcome.
4. No em dashes in any Dixon-facing copy.
5. Hot takes render VERBATIM, profanity and typos intact.
6. `film_ledger_panels` + the Supabase pull remain content source of truth; scene configs live in repo; content text comes from `npm run data`. Chat authors content, Code owns pipeline.
7. Nothing here writes to or reinterprets his numbers.

## 3. The three states become three render treatments

The Vault's confidence model becomes physical:

| State | Room treatment |
|---|---|
| **Ledger / Definitive** | Full room: film-graded color, light, motion, audio recipe. Alive. |
| **Archive, uncertified** | Same geometry rendered FADED: desaturated, pencil/wireframe shader, dust, low light. Memory in pencil. |
| **Hazy Wing** | Room exists UNDEVELOPED: near-black, fog, faint silhouettes you can walk through but never resolve. No info surfaces (no score exists). Exit is the only interaction. |

Certifying a film develops its room (wireframe blooms into graded color, animate if cheap). A rewatch is the chemical bath. Archive/Hazy titles get the treatment shader over Tier 2 templates for v1, no bespoke work yet.

## 4. Architecture

### 4.1 Scene contract
```ts
interface FilmScene {
  id: string;                 // film_titles.id
  tier: 1 | 2;
  grade: ColorGrade;          // film-matched LUT-style shader pass
  fog: FogConfig;
  lighting: LightRig;         // recreate the scene's actual key/fill logic
  camera: CameraSpec;         // height, FOV/lens feel, any locked framings
  systems: MotionSystem[];    // particles, shaders, physics, timers, resets
  audio?: AudioRecipe;        // generative sound-alike, never samples
  infoSurfaces: InfoSurface[];
  bloodlineDoors: DoorSpec[];
  enter(): TransitionSpec;
  exit(): TransitionSpec;
}
```

### 4.2 Portal transition (shared)
- **Enter:** camera dollies into the clicked polaroid; frame expands past viewport; develop shader (chemical wash, grain resolving) cross-fades into the room's grade. Under 1.8s, interruptible.
- **Exit:** reverse; room desaturates and collapses into the photo; camera returns to preserved wall position.
- Esc, a small persistent bottom-left "back to the wall" affordance, and browser back all exit. Deep-linkable `/film/:slug`.

### 4.3 Info surfaces (diegetic record)
Rating, watched date + context, hot take verbatim (the centerpiece, give it presence), vibe-tag glyph chips, rewatch/certified badges. Rendered as objects in-world per room spec. `i` toggles them away for pure ambience.

### 4.4 Template engine (Tier 2)
Parameterized generator: vibe_tags map to scene family, grade and staging from per-film config. Families: `mind-bender`, `dread`, `momentum`, `spectacle`, `intimate-tension`, `weird-fable`. Every logged film resolves to a room day one. v2 change: Tier 2 configs now specify an actual SCENE to stage, not just a mood; the engine supplies systems, the config supplies the place.

### 4.5 Performance
`React.lazy` + code-split per scene; wall + active room only in memory; shared primitive library (fog, particles, 3D text, develop shader, grade pass); 60fps desktop target, mobile degradation (fewer particles, no post), quality toggle. Two or three strong systems per room beat ten weak ones, even at max fidelity.

### 4.6 Audio
All generative Web Audio. Sound-alike recipes are in-scope per the fidelity contract. Global mute default ON until Dixon flips it once; persist.

## 5. THE FORTY ROOMS (v2, fidelity cranked)

Each spec: the scene being recreated, key systems, where the record lives.

### Tier 1 — bespoke (16)

**MEMENTO (2000) · 10.0 · the motel room, backwards**
Recreate the Discount Inn room: bed, dresser, the wall of notes and polaroids, tattoo-mirror bathroom light. The corridor beyond the door runs the room's own timeline in reverse: walk forward and the space BEHIND you un-develops to wireframe, then nothing; the polaroids on the wall are the only proof it existed. Grade: the film's split personality, warm color one direction, silver black-and-white the other, switching at the door. The 10.0 is written mirror-reversed above the sink, correct only in the mirror. Hot take handwritten across a floor-sized polaroid. The room states the Vault's thesis; it is the origin myth of the whole wall.

**THE DEPARTED (2006) · 9.9 · the elevator and the roof**
Recreate the rooftop and the elevator lobby: Boston golden-hour haze, the roofline, the elevator doors. The elevator arrives at long random intervals with a chime (generative), doors open on an empty car, and while they're open the room's identity labels swap (raycast-driven: objects tagged COP/RAT trade tags when unobserved). A gold-graded rat walks the railing silhouetted against the skyline, endlessly. Reveal-as-event made spatial. Rating on the elevator's floor indicator.

**SICARIO (2015) · 9.9 · the tunnel descent**
Recreate the border tunnel raid: dusk staging area above (the silhouette-line-at-sunset frame as your entry composition, figures as dark forms against orange), then the descent. Below, the shader alternates night-vision green and white-hot thermal exactly like the film's dual optics. The room darkens the longer you stay. Deakins dusk grade up top, optics grade below. 9.9 waits at the bottom in thermal white; hot take + the 9.9 amendment as mission-brief text on the wall.

**THE MATRIX (1999) · 9.8 · the rooftop, mid bullet-time**
Recreate the rooftop of "dodge this": helipad, city haze, overcast grade in that green-tinted LUT. Frozen in the center: a radial shockwave of particle shells and ripple distortion, bullet-time as a standing sculpture you walk around; a crouched abstracted figure holds the pose at its focus. Touch the wave and time resumes for one second. Falling code on the periphery uses OUR OWN designed glyph alphabet (build one; do not copy the film's). Rating rains into place and freezes.

**BLADE RUNNER 2049 (2017) · 9.8 · the sea wall**
Recreate the sea wall fight's world: night, driving rain, waves detonating against concrete, cold blue-grey grade, and periodically a vast warm-orange atmospheric shift that swallows the room (the Vegas grade rolling through like weather). A monumental holographic-scale figure stands in the far rain, facing away, never acknowledging you; camera height lowered in this room only. His heartbreak line glows at billboard scale, readable only from a distance. 9.8 reflected in the wet concrete, correct only in the reflection.

**THE STING (1973) · 9.6 · the wire room builds itself**
Recreate the betting parlor: wood tones, brass rail, chalkboard odds, amber 30s grade. The room assembles AS you enter: flats, scaffolding, painted backdrops flying in and locking, becoming complete and warm. Walk behind any wall: bare lumber and stage weights. The FBI office sits half-built through a doorway, permanently mid-construction, because he KNEW it was a build. Hot take painted on the back of the largest flat. One wall periodically un-builds and rebuilds itself. The con is the architecture.

**ENEMY (2013) · 9.6 · the apartment, doubled**
Recreate the Toronto apartment: sparse furniture, venetian-blind light, the city yellow-sepia haze grade pushed hard. Every object twinned inches apart, one copy slightly wrong. Your camera casts two shadows. Spider-leg shadows scale across the ceiling as you approach corners and vanish under direct look. The skyline out the window carries a suggestion of something enormous straddling it, fog-faint, never resolving. The 9.6 appears twice, one lying by a decimal, truth on approach. His own crack of the case in chalk, credited to him.

**NIGHTCRAWLER (2014) · 9.4 · the overlook**
Recreate the Mulholland-style overlook: guardrail, dry brush, LA as a sodium-orange grid to the horizon, that clean digital night grade. A camcorder viewfinder frame floats and reframes whatever you look at, REC dot, rule-of-thirds, and inside the frame only the exposure lifts: the world is better-lit as footage than as reality. Hot take types into the lower-third caption. The Olympics-judging correction note on the back of the room's one polaroid prop.

**SORRY TO BOTHER YOU (2018) · 9.4 · the call floor, then the swerve**
Recreate the RegalView call floor: cubicles, fluorescent grade, headsets, the desk-drop staging so the cubicle reads as the place calls launch from. At a timed beat mid-visit, HARD CUT, no polish: the entire room is replaced by the penthouse party's gold-lit excess with something fleshy and wrong at its edges. He went in armed and still lost; the room does it to him again every visit. Rating in room one; hot take, audibly yelled, in room two.

**AMADEUS (1984) · 9.3 · the deathbed dictation**
Recreate the bedchamber: candlelit, heavy drapes, the bed, a chair pulled close, warm candle grade against cold window blue. Generative ink writes staves and notation across pages, then walls, faster than a hand could, spreading like frost, while a sound-alike recipe builds the Confutatis register (low male-voice synth pulses answered by high strings tones, original synthesis). A visual ripple crosses the room at long intervals: the laugh as physics, never as sound. One desk in the corner the candlelight never reaches. Rating in ink flourish; hot take in a page margin.

**PREDESTINATION (2014) · 9.1 · the bar**
Recreate the bar: bottles, low amber light, two stools mid-conversation, 70s-brown grade. The doorway behind the bar opens onto the corridor that loops seamlessly into itself; walk it and re-enter the bar behind your own starting point. A timeline ribbon runs the walls and closes into a circle above the bottles. The hot take is engraved around the ring, readable forever because it has no start. Certified badge on a coaster. 9.1 at the circle's center, the only fixed point.

**BABY DRIVER (2017) · 8.4 · the opening, on beat**
Recreate the red-car curbside of the opening: bank facade, parked getaway car (our own clean car geometry, no marque badging), sunny Atlanta grade. A generative track (drums, bass, guitar-ish stabs synthesized) drives the room clock: wipers on the downbeat, brake lights on the bar, pedestrians and papers crossing on the phrase, particle bursts on syncopation. Nothing is interesting standing still; the genius is in the verbs. Rating pulses at kick drum. This room proves the audio system.

**NO COUNTRY FOR OLD MEN (2007) · 8.3 · the gas station counter**
Recreate the counter scene: dusty shelves, peanuts, the register, harsh daylight through the door, bleached Texas grade. On the counter: the coin. Approach and it spins once, lands, and the room does not show you the result until you walk around the counter to look. Wind as the only audio; the mute toggle is disabled here, which is both a joke and the thesis. The split-watch asterisk and his full conflicted take on a weathered highway sign outside the window. The room denies the meal, respectfully, exactly like the film.

**BARBARIAN (2022) · 7.6 · the house on Barbary**
Recreate 476 Barbary: the tidy Airbnb living room first, rain outside, cozy lamp grade. The basement door stands open. Below: the corridor of doors, the hidden room with the bed and camera and bucket, the rope-marked passage descending further into handheld-dark. Mid-visit, SMASH CUT: one full second of oversaturated sunny LA daylight, then back, no explanation, the Justin Long cut that fully conned him. His baby-voice survival strategy and the Ronettes funeral note on a taped index card by the lit door. Rating stenciled on that door.

**MASTERS OF THE UNIVERSE (2026) · 8.5 · the throne, savored**
Recreate the villain's throne room as camp cosmos: purple-green atmosphere, a spotlight that snaps onto the empty bone-motif throne, lightning that arcs into POSES rather than strikes, staging that performs its own menace and is having a wonderful time. Theatrical-relish doctrine made spatial. Hot take (the Skeletor coronation, verbatim) on a proclamation scroll; the standing Galitzine shirt grievance as a formal petition on the armrest. Ships in Phase 2 alongside the owed wall publish.

**DISCLOSURE DAY (2026) · 5.2 · the podium**
Recreate the endless-address staging: podium, flags without insignia, rows of empty chairs, over-lit civic grade. Speech text scrolls slowly and infinitely up every wall, saying nothing. A giant curtain marked REVEAL pulls back at intervals onto: nothing. The 5.2 on a plinth like a civic award; hot take engraved in full on a bronze government plaque. The room is boring ON PURPOSE and leaving it feels great, which is the review. The floor deserves a monument too.

### Tier 2 — template engine, now with staged scenes (25)

Family + the scene to stage + config notes. Engine supplies systems; config supplies the place. Any of these may be promoted to Tier 1 at Dixon's order.

- **The Dark Knight (2008) · 9.8** · `intimate-tension`+`momentum`: the interrogation room, recreated: white light panel, steel table, two-way mirror. Half the room ordered, half entropic (flicker, debris physics). The mirror shows the room WITHOUT the entropy. A coin-flip object at the seam. *(Top promotion candidate.)*
- **The Dark Knight Rises (2012) · 9.6** · `spectacle`: the pit, recreated: circular stone well, ledges, the rope, light disc far above. Climb camera path; bass chant pulse (generative, two-syllable rhythm). The jump ledge is reachable; the rope is not attached.
- **Batman Begins (2005) · 9.5** · `dread`: the well and the swarm: a boy-height camera at the bottom of a dry well, blue-black grade, bat-particle swarm that erupts, encircles, and disperses on a fear-timer.
- **Poor Things (2023) · 9.3** · `weird-fable`: the Lisbon terrace: candy sky, wrong-scale pastel architecture, fisheye lens shader, saturated storybook grade. His three-act reaction (why, what, the fuck) as three ornate garden signs.
- **Catch Me If You Can (2002) · 9.3** · `momentum`: the concourse walk: mid-century terminal, long shadows, silhouette crew crossing in formation, warm Christmas-adjacent grade, Saul-Bass-inspired (not copied) ribbon shapes sweeping the walls.
- **Bullet Train (2022) · 9.1** · `momentum`: the economy car: pastel train interior, exterior light blurring past at speed, tidy luggage physics gags, two colored light sources (lemon, tangerine) bickering at opposite ends of the car.
- **Stardust (2007) · 9.0** · `weird-fable`: the wall gap at night: stone wall, one gap, meadow beyond, sky full of stars, ONE falling star to follow, candlelight warmth on this side. Generative celeste shimmer (his highlight was the score; honor the register with original tones).
- **Coherence (2014) · 8.9** · `mind-bender`: the street outside the dinner party: dark suburb, ONE warm lit house duplicated to the horizon in every direction, comet streak overhead, glowsticks (two colors) floating as markers. "its fucking infinite bitch" belongs in lights on the info surface.
- **Ex Machina (2015) · 8.8** · `intimate-tension`: the glass interview room: Ava's enclosure staging, concrete + glass, forest beyond, cool research-facility grade, scheduled power-cut red pulses that lock the exit for three seconds each.
- **The Nice Guys (2016) · 8.6** · `momentum` daylight: the backyard party spill: 70s smog-gold afternoon, pool someone clearly just fell into, tumbling physics-comedy objects, mid-tumble abstracted figure frozen over the fence line.
- **Rogue One (2016) · 8.2** · `dread`+`momentum`: the corridor, recreated in pressure only: dark hallway, panicked papers and particles scattering ahead, the light source BEHIND you red and advancing with a low synthesized hum, a sliver of white light at the far door. No blades, no armor, no marks; pure pressure. His entry-point-to-the-bracket note on the wall.
- **Top Gun: Maverick (2022) · 8.2** · `spectacle`: the canyon run: cockpit-framed window, canyon walls streaking, g-force speed lines, afterburner sun flare, horizon roll on a timed run that resets.
- **Moon (2009) · 8.1** · `intimate-tension`: the base interior: white-grey modular corridor, the exercise area, a harvester crawling the horizon out one window, and exactly TWO of every object. A homey model-miniature texture feel to the exterior, honoring how it was made.
- **Source Code (2011) · 7.9** · `mind-bender`: the train car: warm commuter interior, morning light, Chicago approaching outside. The room RESETS on a repeating timer: flash to white, objects snap back, small details differ each loop. Occasionally the timer freezes into a held golden moment, then resets anyway. Both of his endings honored.
- **Obsession (2026) · 7.9** · `weird-fable` horror-comedy: the wishing willow indoors, wish-tags hanging from branches, cartoon-dread lighting. Group-watch context (John and Tori) on the info surface.
- **Triangle (2009) · 7.9** · `mind-bender`: the Aeolus deck: fog-locked 1930s liner deck, gulls circling one fixed point, and the Sally pile: an accumulation of identical objects that grows by one every time you look away.
- **Pressure (2026) · 7.7** · `intimate-tension`: the map room: one lamp, the big table, animated fronts sweeping the chart as isobars, rain on black windows. Mostly a weather report, and proud of it.
- **Minority Report (2002) · 7.5** · `mind-bender`: the temple pool: milky luminous water glowing from below, cool blown-out Spielberg grade, gesture panels floating mid-air that scrub the room's own lighting timeline, a red ball rolling down a long track toward you the entire visit and never arriving. His warning-system fix quoted, credited as his.
- **Sunshine (2007) · 7.4** · `spectacle`: the observation room: the sun as an entire wall behind a dimming filter, gold blowout at the edges, filter-percentage readout, chairs facing the light. Third act deliberately unrepresented, per his verdict.
- **Annihilation (2018) · 7.4** · `weird-fable`: the Shimmer boundary: prismatic soap-film wall you can approach, refraction shader, crystalline trees and mutated flora colorways beyond, beauty with the emotional volume knowingly low (his exact dock).
- **Oblivion (2013) · 7.4** · `spectacle`: the sky tower: white minimalist pod above a cloud floor, glass pool edge, one patrolling drone orb that regards you, Kosinski slickness as a material finish.
- **The Game (1997) · 6.8** · `mind-bender`: the handsome staged house: every prop with a visible seam, price tag, or stage label; a waiter's tray with a visibly fake pen. Predictable by design; the reveal is pre-revealed everywhere you look, which is the review.
- **Under the Silver Lake (2018) · 6.7** · `weird-fable`: the pool at night: LA hillside pool glow, cryptic cereal-box glyphs projected on water and walls, a map that rearranges when unobserved. NO string, NO corkboard (banned drawer applies hard). His dog-killer theory on the info surface, credited as his.
- **Hereditary (2018) · 6.7** · `dread`: inside the miniature: the Graham living room built with dollhouse seams in the walls, suggestion of enormous scale beyond the window, ceiling deliberately low, treehouse glow far off, a figure-shape in a high corner that is only ever in peripheral vision. Anxiety-not-excitement as spatial grammar; the room does not apologize.
- **Malignant (2021) · 5.4** · `dread` gonzo: the bedroom mirror in which your reflection faces AWAY. After a fixed dwell the room concedes his review and gets cooler: strobing red, motion, chaos, exactly like the back half of the movie.

*(Tier 1/Tier 2 split is Dixon's call at review; the engine covers all forty regardless.)*

## 6. Bloodline doors (if approved)

Source: `film_links`. Each link renders as a physical door in both rooms, styled to each room's material language, labeled with the authored line (verbatim, small). Opening runs exit-into-enter directly (skip the wall). Doors to Archive rooms open onto the faded treatment; doors to Hazy rooms are present but undeveloped and locked (the connection exists, the memory does not). After 2+ hops, the exit affordance returns to the WALL, not back through the chain.

## 7. Phasing

- **Phase 1:** portal system, scene contract, grade-pass shader, template engine + all 40 staged Tier 2 configs, three-state treatments, info surfaces, routing. Every film enterable.
- **Phase 2:** Tier 1 bespoke rooms. Priority: Memento, The Departed, Baby Driver (proves audio), The Sting, Sicario, then the rest. MotU 2026 rides with the owed wall publish.
- **Phase 3:** audio recipes across Tier 2, bloodline doors, certify-develops-the-room animation.
- Each phase ends with a publish (`npm run data`, push, Actions deploy) and a session-note handoff row for chat.

## 8. Also settle while in there

- The wall is one film behind: MotU 2026 panel + confirmed 8.5 need the standard publish FIRST, already owed. *(DONE 2026-08-21, commit c8d0435, all 41 films panelled + live.)*
- Audit film UI for lingering 5-point-scale assumptions (10-point, tenths).

## 9. What chat (Leonard) owes back

- New room copy (info framing lines, door labels) is CONTENT: authored in chat, written to tables or a `scene_copy` config Code defines. Never invented pipeline-side.
- Session notes at delivery and at each phase landing.

*End of brief. Open rulings for Dixon before Phase 1: final Tier 1 list, bloodline doors, audio scope.*
