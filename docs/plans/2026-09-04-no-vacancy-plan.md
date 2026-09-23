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

## 2b. The three things the panel caught that no design had

Three judges scored six designs and picked three different winners, on an
aggregate that is a near tie (Second Watch 119, Night Audit 117, No Vacancy
116). The split is not a problem: the designs agree on almost everything that
matters and disagree on the shell. What is worth more than the winner is what
all six missed.

### Miss 1: nobody designed for film 48

*"Every one of these six designed a finished monument to a thing that gets one
film longer every few nights."*

This is the truest fact about the project and the plan above was wrong before
this paragraph existed. The archive is not a corpus of 47, it is a habit that
has run 47 times. On the night film 48 is scored, a hand-authored world has a
hole in it and stays dishonest until somebody with taste sits down and builds
a room.

Two consequences, both binding:

- **Procedural placement is not a nice-to-have, it is the whole reason the
  Court wins.** Door position, floor, number and light colour all derive from
  the data. Film 48 appears at the right spacing on the right floor with
  nobody touching a level file. Any design that requires hand-authored
  geography per film is disqualified on this ground alone.
- **The in-between state is a designed thing, not a gap.** A film scored last
  night and not yet staged gets an honest room: taped out on the floor under
  worklights, the take on the wall, the number on the door, and visibly not
  dressed yet. Somebody visiting the morning after should see that it happened
  and see that it is not finished, and that should read as deliberate.

### Miss 2: nobody gave Dixon a verb

*"All six built for a stranger and then handed me a mode toggle. The KEEPER
switch is the tell, because it is a design saying the only way to be the owner
here is to turn the game off."*

He is the person who will open this most, and the moment that matters is 1am,
film just finished, take just written, wanting to see what his own building did
about it. That is not the stranger's 40-minute walk and it should not be served
by turning the game off.

**The owner's verb: the new room is already lit when he arrives, and walking
into it is how he sees his own take staged for the first time.** Not a mode.
Not a toggle. A destination that only exists because he wrote something.

This is the single largest gap between the plan and the ask and it needs its
own design pass. Flagged, not solved.

### Miss 3: nobody designed the first twenty seconds on a phone

*"This ships as a public GitHub Pages link, which means first contact is
overwhelmingly a stranger holding a 390px screen with one thumb, no pointer
lock, no keyboard, no context, and roughly twenty seconds of patience."*

All six cold opens are darkness and a request to walk, and every one of them
throws away the single thing the current build does best: putting 47 Polaroids
in front of a stranger in one glance with zero input.

**Ruling: the arrival is designed at 390px first, and it gives before it
asks.** Something legible and moving in the first three seconds with no input
at all, that then invites the walk. The courtyard read (a blank ground floor,
a packed top floor) is the right image because it teaches the whole archive in
one glance, so it has to be the FIRST thing, not something you reach after
leaving Room 4 and turning a corner.

Touch is the primary platform, not an accessibility bullet. `SIT` becomes a
first-class verb for exactly this reason: sitting lets a room perform itself
hands-off at full quality, any input standing you back up, which makes the
whole building completable with one thumb.

### Grafts the judges required, all adopted

- **Ear to the door.** One lowpass biquad at ~380 Hz over the recipe each room
  already has. All three judges ranked it the top graft.
- **The Vault never editorialises a night.** A hard rule, in the repo beside
  the other hard rules. The Departed's room holds a hotel pen and a stack of
  paper turned face down and squared to the table edge, and the Vault says
  nothing about it. The place remembers. It does not comment.
- **Score is attention, not construction.** Nothing gets built smaller. What
  changes is whether the room notices you: 9.5+ withholds and waits, the sevens
  run a loop and ignore you, under 7.0 talks over you. Disclosure Day at 5.2
  keeps the biggest room in the game. This replaces the "a 5.0 is a grey
  blockout" idea from the recon, which was a licence to build less, and Dixon
  asked for more.
- **The first watch has no Dixon in it.** Entering a room gives you zero
  commentary. His voice arrives as the payoff for something you already felt,
  never as the toll for entry.
- **Two doors out**, each painted with a real line he said about the film,
  neither correct. Zero UI, and it is how the ending gets its data.
- **The divergence ending.** The read-back names where you disagreed with him,
  not where you agreed, because agreement is flattery.
- **The hazy room is built wrong on purpose.** A Shoebox film gets proportions
  slightly off, a doorway a touch too narrow, one prop that does not belong,
  because he is remembering it rather than watching it. Developing it corrects
  the geometry. Best unbuilt idea in the batch.
- **The blank nights.** Fifteen dark units for the nights he watched nothing,
  generated free from `watched`. Shared-night clusters (10A The Nice Guys, 10B
  Batman Begins, 10C The Dark Knight, all July 24) under one porch light.
- **The Departed moves The Matrix.** Two designers found it independently,
  which means it is real. A plate physically slides a tenth, in sightline,
  because a new number arrived and needed the room.
- **One prop per room is a mechanism, not decor**, and `nudge` is banned as a
  default. If a touchable does not change a state that is part of the room's
  argument, it does not get a prompt. This is the direct fix for 16 of 29.
- **Everything a room gives you is obtainable from outside it.** Declining
  Hereditary must cost a visitor nothing.
- **The Dark Drawer room**: a chair, a light, and a card that reads what he
  remembers, which is nothing. Four draw calls for the most honest room in
  the building.

### One judge claim that was wrong, checked

Two judges asserted the taste laws carry no cited evidence and that the
citation mechanic rests on a join table nobody has written. Verified against
Supabase: **all 21 laws carry an evidence string and 16 name a teacher film.**
The pipeline was discarding both. Fixed this session by deriving the citation
graph from the evidence prose (commit `c778382`): 20 of 21 laws now cite their
films, 40 citations, no hand-authored table, and it keeps working for lesson 22.

Their underlying point stood, though, and the rest of it is real and owed:
`emit_vault_data.py` still does not emit `emotional_key`, the 78 pitched
titles, the 154 recommendations, or the `film_status` states. **Four of the
designs' endings cannot be built until it does. That is Phase 1 work, before
a single wall gets modelled.**

---

## 3. Rulings (settled; Dixon can reopen any of them)

1. **The room number is the score.** Doors are placed procedurally from the
   data. No level file lists films.
2. **Nothing rewrites his numbers.** Ever. The basement is the only place a
   number is ever created, and only by certification.
3. **No completion percentage, no checklist, no achievement list.** The gap in
   the wall is the counter.
4. **The hot take is never a floating card again.** Fragments on props,
   verbatim, profanity and typos intact.
5. **The vacancy sign is a dead tube on a pole with one floodlight on it**,
   which is the better motel anyway. (Neon is no longer banned outright,
   2026-09-22: a room whose film has neon can use it. See the immersion brief
   §2.)
6. **The north wall survives intact** as Room 4's contents and as the index.
   It is now a scale model of where you are standing.
7. **No recorded film audio (soundtrack files, dialogue clips).** That is the
   one hard line: it is what rights holders actually file takedowns over, and a
   takedown disables the whole public repo and Pages site. **Opened up
   2026-09-22 (Dixon): actor likenesses, stills, posters, logos, real fonts and
   dialogue as text are all allowed.** The rules live in
   `docs/VAULT-IMMERSION-BRIEF-v2.md` §1.
8. **Content about the world is an object in the room. Controls that operate
   the machine are plain DOM.** Settings, pause and options are deliberately
   boring and deliberately not diegetic.
9. **A room a player skips costs them nothing.** Its film, score, case file and
   quotes all stay reachable. Say so in the UI, because fear that opting out
   costs something is the main reason people do not use content settings.
10. **No physics engine.** Measured: `@react-three/rapier` is 815 KB gzipped
    against a 445 KB total bundle. `three-mesh-bvh` (62 KB) and `zustand` are
    already installed as drei transitive deps and cost nothing new.
11. **Everything is derived from the data.** No level file lists films, no
    geography is hand-authored per title. Film 48 must appear correctly with
    nobody opening an editor. This is the disqualifying test for any
    structural proposal.
12. **The Vault never editorialises a night.** It renders what he wrote and
    what happened. It does not add meaning, sympathy, or a reading. The place
    remembers; it does not comment.
13. **Score is attention, never construction.** No room is built smaller
    because he liked it less. A low score changes whether the room notices you,
    not how finished it is. Disclosure Day at 5.2 gets the biggest room in the
    game and that is the review.
14. **The first watch has no Dixon in it.** His voice is the payoff, never the
    toll.
15. **Touch at 390px is the primary platform**, not an accessibility bullet.
    The arrival gives before it asks.
16. **`nudge` is banned as a default.** One prop per room is a mechanism. If a
    touchable does not change a state that is part of the room's argument, it
    does not get a prompt.

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
flash hazards fixed. `settings.js`, `input.js`, keyboard turn, `?text`, and the
derived citation graph.

**Phase 1 — THE PIPELINE.** Before a single wall gets modelled, because four of
the six designs' endings cannot be built without it. Emit `emotional_key`, the
78 pitched titles, the 154 recommendations with reasoning, the full
`film_status` state per title, and `certified_on`/`certified_score`. Fix the
four bloodlines silently dropped at build time. Add `plain_summary` per film.
Small, dull, and everything downstream is blocked on it.

**Phase 2 — THE SLICE.** Two rooms and the door between them: **Malignant 5.4
and Sorry to Bother You 9.4.** Three of six independent designers chose this
same pair, which settles it. The authored bloodline note already reads:
"Comparably insane ideas. One opened a door and made him look, one had a doctor
explain a chart. 5.4 versus 9.4 is the whole doctrine." The law that cites them
is the highest-weighted law on the Mirror, and the citation graph now resolves
it to exactly `[malignant, stby]`.
Build: fragments on props, the pocket you cannot see from the door, the house
lights, one go-stand-somewhere-else sightline per room, ear to the door, two
doors out with real lines painted on them, the bloodline door, and the law
writing itself on the Mirror.
**Gate: does walking those two rooms produce the click?** If not, the design is
wrong and we know in two weeks instead of four months. Judge it on a phone.

**Phase 3 — the spine.** The zustand store and the scene table. The character
controller extracted with real state. Per-room `React.lazy`. The render-path
fixes. Deterministic mode and the verification harness.

**Phase 4 — the shell and the arrival.** The arrival designed at 390px first,
giving before it asks. Title, pause, the Options panel, the pre-room content
gate, the save file, `SIT` as a first-class verb. Kill the ten-button dock.

**Phase 5 — the building.** The Court exterior, **procedural** door placement
from the data, walkway, courtyard, stairs, blank nights, shared-night clusters.
Room 4 relocated into it. The north wall becomes a scale model of where you
are standing.

**Phase 6 — the rooms.** All 47 to the Phase 2 standard. The six films with
panels and no room yet (Se7en, L.A. Confidential, The Big Short, Inside Man,
The Amateur, One Battle After Another). Richer prop vocabulary, placement
primitives, composite shells. **Plus the standby state**, so film 48 has an
honest room the morning after.

**Phase 7 — below grade and the far wing.** The storage level, blank plates,
certification, the hazy rooms built wrong on purpose. The 78 pitched doors.

**Phase 8 — the ending, and the owner's verb.** Dawn, the divergence read-back,
the one recommendation. And the 1am path: Dixon walks in and the room for the
film he scored two hours ago is already lit.

---

## 9. Open for Dixon

1. **The Court, or the strip?** Multi-storey where floor is a score band gives
   the 53-metre gap and the whole-taste-at-a-glance read. A single flat strip
   is much cheaper (roughly twelve draw calls, and `DoorRow.jsx` already
   exists) and loses the ranking as a spatial fact. One judge picked each. I
   want the Court, because the ranking as architecture is the whole idea.
2. **The basement guess.** Dialling a number on an unscored film and having
   yours sit beside his forever: good, or does it cheapen the numbers? The one
   mechanic that touches the sacred part, so it is yours to rule on.
3. **Dawn as a soft ending at ~40 minutes,** or no clock at all?
4. **The 78 pitched doors.** They include films you said no to, with the
   reason you gave. Public site. Comfortable?
5. **The owner's verb.** What do you actually want at 1am, take just written?
   The plan says the new room is already lit and walking into it is the
   reward. That is a guess and it is the one thing here nobody can research.

---

## 10. Provenance

19 recon agents (2.9M tokens), 6 designers, 3 judges (1.2M tokens). Raw results:
`journal.jsonl` under
`.claude/projects/C--Users-bowle/<session>/subagents/workflows/wf_7351b9cd-3e9`
(recon) and `wf_16001b53-2a7` (design panel). The six full designs are worth
reading before Phase 2; each has staging detail this document compresses.
