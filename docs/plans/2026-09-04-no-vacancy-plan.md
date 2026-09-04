# NO VACANCY — the Vault becomes a game

Plan authored 2026-09-04 (Opus session). Supersedes nothing; extends
`VAULT-IMMERSION-BRIEF-v2.md`, whose Phases 1 to 3 all shipped.

Dixon's ask, verbatim: *"i want a full game engine. i want it to look and feel
like a video game. in every sense. more themed to each movie. better to walk
around and explore each place. more context. more fun. more inclusive."*

Research behind this plan: 19 agents read the whole codebase and researched the
R3F game stack, walking-sim design, progression, game audio, web 3D
performance, diegetic UI, world structure and game accessibility. Then six
independent designers proposed six complete games and three judges scored them.
This document is the decision, not the survey.

---

## 1. What is actually here, measured

The README undersells the project badly. What exists: 16 hand-built bespoke
film rooms, a config-driven template engine, free WASD walking with AABB slide
collision, pointer lock, a touch stick, a generative Web Audio engine with 41
hand-authored recipes, archive rooms with a develop mechanic, and a WebXR mode.
It holds a clean 60fps with headroom.

So the problem is not ambition and it is not the renderer. Measured:

| | Today |
|---|---|
| Level vocabulary | 21 prop primitives, 4 shell kinds, 6 touch kinds |
| Interactions across all 26 configs | 29 total, of which **16 are `nudge`** |
| A room | ONE box, typically 4.2 x 4.2 x 2.6 metres |
| Concealment | **None.** Every room shows you everything from the doorway |
| Saved state | **None.** Every visit is visit one |
| Game shell | No title, no pause, no settings, no remapping, no FOV |
| Accessibility | Five aria-labels and one bob toggle. That is the inventory |
| Bottom of the screen | A row of ten DOM buttons |

Every film's world is one small box made of the same 21 pieces where the only
verb is *touch it*. That is the whole diagnosis. Barbarian's living room has
empty picture frames on the wall, which is the diagnosis as a prop.

### What the world never renders

| Content | Rows | Rendered today |
|---|---|---|
| Scored films | 47 | yes |
| Taste laws, each with cited evidence | 21 | as prose on one wall |
| Bloodlines with named relation types | 39 | red string on hold |
| Quotes | 45 | scraps |
| Archive: seen, scored from memory | 34 | the Shoebox |
| Archive: seen, unscorable | 30 | the Dark Drawer |
| Queued | 20 | the Door |
| **Pitched, offered and passed over** | **78** | **nothing** |
| Recommendations with reasoning | 154 | nothing |
| Session notes | 51 | nothing |
| `emotional_key` per film | 47 | nothing |
| `context`, the pre-watch guess | 47 | one line |

---

## 2. The design

### The building is the ledger

**The room number is the score.** Room 100 is Memento. Room 52 is Disclosure
Day. Room 99 is Sicario and Room 98 is Blade Runner 2049 and they are next door
to each other because they were always next door to each other.

A motel room number is the one place in the world where a number screwed to a
wall is not a UI element. This is the cheapest complete answer to "make it feel
like a game and not a website" that exists, and it costs a brass numeral.

The building is a U around a night courtyard. Floor is the score band. Position
along the walkway is the real score, so spacing is the actual gap between his
numbers, exactly the beeswarm logic the north wall already uses. Door placement
is **procedural, not authored**: a film logged in Supabase appears on the
correct floor at the correct spacing with nobody touching a level file.

The consequence is the best moment in the whole design and nobody invented it,
the data did: **fifty-three metres of blank stucco** between Room 54 (Malignant)
and Room 67 (Hereditary), because he has never scored anything between 5.4 and
6.7. You can read a year of one man's taste off the outside of a building
before you open a single door.

The existing motel room is untouched and becomes **Room 4**, yours, by the
office. Its north wall stops being the universe and becomes a scale model of
the building you are standing in, still fully working as the index and the
jump-to. Nothing about the wall is lost. It is finally located.

### You are a guest

Not an appraiser, not an auditor, not a cataloguer. Those are jobs, and a job
is a costume a stranger has to put on before the game starts.

A guest needs no roleplay. It explains why you are somewhere personal (the
office was dark, there was a key in a wire basket), it makes snooping the
correct behaviour, and it lets you leave whenever you like without the game
having an opinion. It is also just true: this is a public site and every
visitor really is a stranger who pulled off the road.

The Vault says **he** about the man whose taste this is and **you** about the
person in the building. It never once implies you should already care about him.

### The core loop

1. **Read the door from the walkway.** Four channels, all diegetic, all free.
   The number is the score. The light under the door is that film's palette.
   Hold to listen and its synthesised recipe comes through the wood, muffled.
   A card in the window carries the date, the context and a content warning if
   the room needs one. That is a complete preview of 47 films with zero UI.
2. **Go in.** The room is cold: no score card, no floating panel, no
   commentary. Same as he went in.
3. **Walk it.** The hot take is not on a card. It is printed on the props,
   verbatim, in three to six pieces, so reading it *is* walking. The strongest
   fragment is always in the pocket you cannot see from the door.
4. **Flick the light switch.** Every room has one, in the same place in every
   room, because underneath the film every room is still a motel room.
5. **Find the one thing you were wrong about** from where you came in.
6. **Leave through a bloodline door**, or back out to the walkway.

### The house lights

The single best mechanic in the panel, and it is cheap.

Every one of the 47 rooms has a working light switch by the door. Flicking it
lerps the room over ~700ms between two complete states:

- **FILM** is what ships today: the per-room grade, fog, key and practical
  rig, and the film's audio recipe.
- **MOTEL** is what is underneath: the same door in the same place, the bent
  blinds, the air conditioner rattling in the wall, the popcorn ceiling, the
  one bad chair, the clock radio, the pad by the phone.

**Half the writing is only visible in one state.** That doubles the content of
every room in the game for one switch and zero new geometry, using a transform
the codebase already ships (`fadedConfigFor` / `developedGradeFor` are exactly
this, inverted). It delivers the concealment the exploration research named as
the missing ingredient, globally, rather than room by room.

Sicario's border room has the blinds. Blade Runner 2049's snowbound greenhouse
has the air conditioner. Memento is the joke, because Memento already is the
room.

### Upstairs is fixed, downstairs is where you change something

**Upstairs, 47 rooms, numbered and lit.** His taste as architecture. Nothing to
guess: the building already told you. The scores are sacred and untouchable.

**Downstairs, the storage level, 64 units, unnumbered and dark.** The Shoebox
and the Dark Drawer. Doors here have **blank brass plates**, and here the guess
is real because no number exists yet. Dial a number, and if the film has a
memory score his engraves beside yours forever. If it is a Dark Drawer film,
nothing engraves, because there is nothing to engrave, and that absence is the
record.

Certification is the one real quest: carry a print up the stairs and watch a
door light for the first time on the floor its score earns. It is the only
place in the world where the player changes anything.

### The laws write themselves

The 21 taste laws are the progression, and they need no invented fiction
because each one already cites its evidence.

> *"An unguessable IDEA is not the same as an unguessable REVEAL."*
> Evidence: Malignant 5.4 versus Sorry to Bother You 9.4. Comparably insane
> ideas. One opened a door and made him look, one had a doctor explain a chart.

Walk both rooms and the law writes itself onto the Mirror. It then **visibly
changes rooms you have already been in**: once you know the reveal-as-event
law, Disclosure Day's endless podium reads as a violation rather than a bore.
No counter, no checklist, no percentage. The Mirror fills in behind you.

### The far wing: 78 rooms that were never rented

Nobody in the panel did anything with the 78 `pitched` films, and it is the
largest bucket of unrendered content in the database. They are the doors on the
far side of the courtyard: dark, numberless, never opening, each with a card in
the window naming what was offered and what he said. It costs a door and a line
of text and it is the quietest thing in the building.

### The ending

Dawn arrives on its own, roughly forty minutes in. It does not evict you. The
walkway lights click off a bank at a time on their photocell, the dead vacancy
sign stays dead, and the office window goes yellow.

There is **no completion percentage** and there never will be. Instead the
Vault reads your actual route and dwell, names your taste back to you in two or
three sentences, and hands you exactly one of the 154 recommendations, chosen
for the person who walked *that* path. That is the ending: not a score, a gift.

---

## 3. Rulings (settled, do not relitigate)

1. **The room number is the score.** Doors are placed procedurally from the
   data. No level file lists films.
2. **Nothing rewrites his numbers.** Ever. The basement is the only place a
   number is ever created, and only by certification.
3. **No completion percentage, no checklist, no achievement list.** The gap in
   the wall is the counter.
4. **The hot take is never a floating card again.** Fragments on props,
   verbatim, profanity and typos intact.
5. **No neon.** The banned drawer is standing law. The vacancy sign is a dead
   tube on a pole with one floodlight on it, which is the better motel anyway.
6. **The north wall survives intact** as Room 4's contents and as the index.
   It is now a scale model of where you are standing.
7. **Zero imported assets, zero sampled audio, no actor likenesses, no logos.**
   Unchanged from the immersion brief and non-negotiable: this is the DMCA
   vector for a public repo recreating film scenes.
8. **Content about the world is an object in the room. Controls that operate
   the machine are plain DOM.** Settings, pause and options are deliberately
   boring and deliberately not diegetic.
9. **A room a player skips costs them nothing.** Its film, score, case file and
   quotes all stay reachable. Say so in the UI, because fear that opting out
   costs something is the main reason people do not use content settings.
10. **No physics engine.** Measured: `@react-three/rapier` is 815 KB gzipped
    against a 445 KB total bundle. `three-mesh-bvh` (62 KB) and `zustand` are
    already installed as drei transitive deps and cost nothing new.

---

## 4. Architecture: keep, extend, replace

The recon was unanimous in shape: **the content and craft layers are excellent
and every engine layer is a prototype.**

### Keep and extend, do not rewrite
- The 16 bespoke rooms. Hand-composed spaces with hundreds of QA lessons baked
  into their constants. The most valuable thing in the repo.
- `materials.js` derived-PBR surface factory, `lightRig.js` key/practical/
  bounce/rim doctrine, the per-room colour grade.
- The archive develop transform. It is already an invertible transform on a
  shared config, which is exactly what the house lights need.
- The 41 audio recipes and the synthesis primitive library.
- `emit_vault_data.py`'s derivation logic.
- `Develop.jsx`. It is a correct loading-screen seam: a DOM wash whose `onPeak`
  performs the world swap while the screen is fully covered. A real engine
  would want to keep that.
- `colliders.js`'s owner-keyed registration API.

### Replace
- **`App.jsx`'s world machine.** One string parsed by twelve `startsWith`
  checks with hardcoded slice offsets, whose correctness depends on
  `'entering-print:'` not accidentally satisfying `startsWith('entering:')`.
  It is not a viable spine and will not become one incrementally. One zustand
  store plus a declarative scene table.
- **The collision solver** (keep the registration API).
- **The character controller.** Extract it out of `CameraRig` into its own
  module with real state: grounded, vertical velocity, crouch, stance.
- **`walkKeys.js`.** Already done this session.
- **The interaction trigger layer** (keep `Touchable` as the contract).
- **The render path.** MSAA and an unused antialias backbuffer are both live.

### Adopt (zero install cost, already present)
- `zustand` for game and world state.
- `three-mesh-bvh` if hand-authored collider rects become unmaintainable.

### Do not adopt
- Rapier. WebGPU and TSL (unavailable while the Quest mode ships). Any ECS.

---

## 5. Performance budget

Per room: **30 draw calls, 40k triangles, 8 MB textures. Three rooms resident
maximum.** Whole scene ceiling 90 to 120 draw calls, 150k triangles.

The ceiling is not GPU shading, it is main-thread stalls: procedural canvas
texture generation plus `texImage2D` uploads plus first-use shader compilation
on every room swap, with drei `Html` panels writing DOM transforms every frame.

Ordered fixes:
1. `<EffectComposer multisampling={0}>` and drop `antialias: true`. Free.
2. Per-room `React.lazy` through `registry.js`. The `?text` split this session
   already proved the path (460 KB to 50 KB on that route).
3. Cache and dispose the Polaroid textures; module-level Map keyed on slug.
4. Feed the existing FpsMeter into an adaptive DPR ramp. It already publishes
   a rolling average that nothing reads.
5. Per-frame texture upload budget: at most one texture per frame, never a
   whole room's worth in one.
6. Collapse each room toward ~4 draw calls: one BatchedMesh for the shell, one
   InstancedMesh per repeated prop type.
7. Move in-world type to troika SDF text everywhere except the one focused
   panel. Never `transform: true` on more than one `Html` at a time.

---

## 6. Inclusivity

Not an options menu bolted on at the end. Two things at once: real access, and
a design a stranger is welcome inside.

### Done this session
- **Two live WCAG 2.3.1 failures fixed.** `DwellConcede` was strobing
  saturated red at 3.5 Hz, full black to full bright, automatically after 25
  seconds, with no warning and no way off. `Enemy` ran an 11 Hz square-wave
  flicker. `src/flashPolicy.js` now caps every blink in the Vault at 2.5 Hz,
  shapes the wave off square, keeps a floor under the swing and desaturates
  red off the 0.8 threshold. Measured: 3.5 Hz to 2.17 Hz, saturation 0.862 to
  0.668, swing 0-40 to 6.1-34.0.
- **`src/settings.js`.** One versioned profile, OS-derived defaults, four
  presets, URL overrides.
- **`src/input.js`.** Sixteen named actions, rebindable by `KeyboardEvent.code`,
  gamepad with proper edge diffing (which delivers switch access, since the
  Xbox Adaptive Controller enumerates as a gamepad). Keyboard and gamepad turn
  wired: smooth or snap. Drag-to-look with no keyboard alternative was a WCAG
  2.2 single-pointer failure on its own.
- **`?text`.** The whole Vault as a document, split ahead of the 3D bundle.

### Still owed, in priority order
1. **A flash bus** owning every full-view luminance event (ResetFlash,
   ScheduledCut, Barbarian's smash cut, Develop's wash, ColdOpen's blink) with
   a 700 ms hard floor between events. Each passes in isolation; WCAG counts
   flashes in aggregate.
2. **A pre-room gate** rendering before ColdOpen mounts: the content warning
   naming the specific hazards present, and the four presets, in the same
   breath. Not a splash-screen shrug.
3. **`scripts/flashcheck.py`** — sample frames through the existing headless
   Chrome path, compute relative luminance over a sliding window grid, fail
   the build on a violation.
4. **The Options panel**, reachable from every state, deliberately boring,
   with a live preview of the room behind it.
5. **Pause**, that actually pauses: freeze `useFrame` deltas, suspend the audio
   clock, halt every scheduled room event.
6. **`cut, don't fly`** — replace the 780 ms flight with an instant reposition
   behind the wash that already exists. The highest-value vestibular fix here
   and close to a one-line change.
7. **Focusable DOM proxies** per interactable, driving a world-space focus
   indicator. `Find` is already a complete keyboard navigation system; extend
   it rather than inventing one.
8. **Hold-to-toggle for every hold.** The Investigation's "never standing
   string" ruling governs the default, not the ceiling. A player who cannot
   sustain a press is not choosing an aesthetic, they are locked out of a wall.
9. **Functional colours from Okabe-Ito** (thread, lens highlight, find marker,
   focus ring). The room's own grade is untouched; only the four colours that
   carry meaning change.
10. **`plain_summary` per film**, 2-3 sentences at roughly 8th-grade level.
    Never run the case-file prose through a simplifier: it would flatten the
    writing and produce something worse than either.
11. **`ACCESSIBILITY.md`** listing every feature and every hazard by room name.

Four hard categories come free and should be stated rather than re-derived:
**no fail states, no timed input, no difficulty, no lost progress.** Saying so
out loud is itself an accessibility feature, because players routinely have to
research whether a game will lock them out.

---

## 7. Verification

The screenshot harness is the right instrument and already encodes the
project's hard-won lessons (system Chrome, `device_scale_factor 2`, sample the
saved PNG, read the PNGs). Every new check lands there, not in a separate tool.

Owed: `scripts/gold.py` (all 47 rooms plus 64 prints as a contact sheet),
scene-budget assertions from `gl.info`, a void-horizon raycast (nowhere the
player can see out of the world), projected target size per interactable,
CVD-simulated variants, `flashcheck.py`, and a `verify` job in `deploy.yml`
gating the Pages deploy.

**Deterministic mode (`?det=<seed>`) is the unlock everything else depends on:**
fixed dt driven by `window.__vaultStep(ms)`, a seeded PRNG, and every scheduled
event keyed on the frame counter rather than the wall clock.

---

## 8. Phases

Each phase ends with a publish and a `docs/STATUS.md` row.

**Phase 0 — done this session.** Data refreshed to 47 films. `PULL.sql`. Both
flash hazards fixed. `settings.js`, `input.js`, keyboard turn, `?text`.

**Phase 1 — THE SLICE.** Two rooms and the door between them: **Malignant 5.4
and Sorry to Bother You 9.4.** Three of six independent designers chose this
same pair, which settles it. The authored bloodline note already reads:
"Comparably insane ideas. One opened a door and made him look, one had a doctor
explain a chart. 5.4 versus 9.4 is the whole doctrine."
Build: fragments on props, the pocket you cannot see from the door, the house
lights, one go-stand-somewhere-else sightline per room, the bloodline door, and
the law writing itself on the Mirror.
**Gate: does walking those two rooms produce the click?** If not, the design is
wrong and we know in two weeks instead of four months.

**Phase 2 — the spine.** The zustand store and the scene table. The character
controller extracted with real state. Per-room `React.lazy`. The render-path
fixes. Deterministic mode and the verification harness.

**Phase 3 — the shell.** Title (the motel seen from the road), pause, the
Options panel, the pre-room gate, the save file. Kill the ten-button dock.

**Phase 4 — the building.** The Court exterior, procedural door placement,
walkway, courtyard, stairs. Ear-to-the-door. Room 4 relocated into it.

**Phase 5 — the rooms.** All 47 to the Phase 1 standard. The six films with
panels and no room yet (Se7en, L.A. Confidential, The Big Short, Inside Man,
The Amateur, One Battle After Another). Richer prop vocabulary, placement
primitives, composite shells.

**Phase 6 — below grade and the far wing.** The storage level, blank plates,
certification. The 78 pitched doors.

**Phase 7 — the ending.** Dawn, the taste read-back, the one recommendation.

---

## 9. Open for Dixon

1. **The Court, or the strip?** Multi-storey where floor is a score band gives
   the 53-metre gap and the whole-taste-at-a-glance read. A single flat strip
   is friendlier and loses the ranking as a spatial fact. I want the Court.
2. **Is Room 4 still the front door?** The plan starts you in Room 4 and has
   you walk out. The alternative starts you at the road looking at the sign.
3. **The basement guess.** Dialling a number on an unscored film and having
   yours sit beside his forever: good, or does it cheapen the numbers? This is
   the one mechanic that touches the sacred part.
4. **Dawn as a soft ending at ~40 minutes** — or no clock at all?
5. **The 78 pitched doors.** They include films he said no to, with the reason.
   Public site. Comfortable?
