# LE GAMAAR: the Inglourious Basterds room

Plan written 2026-09-22 (Opus 5.5 session, with Dixon). **Status: plan only, nothing built.**
Dixon's go on this session was "only for writing the plan." Building starts in a later
session on his word.

Dixon's ask, verbatim: *"if i go here and want to remember a movie and what it was about and
the characters and such i can do that. but in order for it to work, i need to be fully
transported into that world... i want to be able to walk around and learn things about the
movie and remember who is in it and what happens etc. interactive always a bonus."*

He asked for one film and one room, pushed as far as it goes. This is that room.

---

## 0. The test this room has to pass

Put Dixon in the room six months from now with the film mostly forgotten. Twenty minutes
later, with no other source, he can:

1. name the five chapters in order and say what happens in each one;
2. put a face, an actor and a fate to at least twelve characters;
3. say how the threads meet at the premiere, and who dies where;
4. say what really happened to Hitler and Goebbels, and what the film invented.

Every element below exists to serve one of those four. Anything that doesn't gets cut
(`~/.claude/design-taste.md`, prime directive). The **Build-phase gates** in §15 test all four
directly.

## 0.1 Dixon watches it get built (the preview contract)

Dixon, 2026-09-22: *"i want to be sure i can watch all of this happen as i love seeing it
come together... open a preview first and make sure to keep the preview updated so i can see
things as they get written and applied."* This section is not optional and not a nicety. A
build step that he couldn't watch didn't happen right.

**Verified the same night:** the app's browser pane runs WebGL live, at about 42 animation
frames a second and about 22 fps in the Vault (Memento room checked). That's slower than a
real browser but fine for watching. Vite hot reload pushes edits into the running scene
without a page refresh.

### Before anything else, every session

1. **Start the preview first**, before reading a file or writing a line:
   `preview_start {name: "vault-dev-b"}`.
   - That's port **5191**, from `~/.claude/launch.json`. Port 5173 is often held by a DWD
     worktree dev server from another session. Never kill it, and never touch another
     session's server.
2. **Tab 1, THE ROOM:**
   - `http://localhost:5191/?nocold&noguide&room=inglourious-basterds&spot=<zone>`.
   - Until the room exists (the start of Session 1), point it at the wall instead
     (`?nocold&noguide`), so he watches the wall grow from 47 to 53 during the wall pass.
3. **Tab 2, THE DAILIES:** `http://localhost:5191/dailies.html` (see below).
4. **Front THE ROOM** and tell Dixon in one line what's about to appear first.

### While building

- **Aim the camera at what's being built.** When work moves to a new space or prop, navigate
  THE ROOM to that `?spot=`, so the hot reload lands where he's looking. After any full reload,
  re-aim.
- **Build in an order that shows up in the preview.**
  - Greybox shapes first, then materials, then light, then text, then interactions, then sound.
  - Every sub-step should change what's on screen.
  - Long invisible stretches (pipeline work, refactors) get announced in one line and kept
    short.
- **The preview is never left broken.** Check `read_console_messages` after every save that
  touches the room. A red console or a black canvas gets fixed before the next step, not
  batched. If a fix will take more than a few minutes, revert the step so he isn't staring at a
  crash.
- **One Dailies entry per visible step.** Take a pane screenshot of THE ROOM and write the
  entry (below). Front THE DAILIES briefly only at milestones (a space finished, the first
  fire), then back to THE ROOM.
- **Phone:** at the end of each space, open a third tab at the same URL with
  `resize_window {preset: "mobile"}`, take the shot, add it to the Dailies, then reset the tab
  to desktop.
- **Away from the desk:** at each space's milestone, send the hero shot with `SendUserFile`
  (status `proactive`), so it reaches his phone if he stepped away.
- **The pane is for watching, not for measuring.** Its fps is not the truth. `peek.py --fps`
  at DPR 2 in a real headless Chrome is the performance gate, same as §14.

### THE DAILIES (`dailies.html`, dev only)

On a film set the dailies are the day's footage, screened that night. This is the build's
version: a live contact sheet of the room coming together.

- **Files:**
  - `dailies.html` at the repo root, plus `src/dailies/` for its script and styles if needed.
  - `_dailies/dailies.json`, gitignored like `_shots/`.
  - Vite serves root HTML in dev only; the build input is `index.html` alone, so this never
    ships to Pages. Verify with `npm run build` and `dist/` having no `dailies.html`.
- **Layout, top to bottom:**
  1. The newest frame, large, with a one-line caption and a timestamp.
  2. A progress strip: the plan's spaces (Rue, Lobby, Auditorium, Booth, Behind, Cellar,
     Sound, History, Fire) as a filmstrip, each frame lit when its space is done.
  3. The contact sheet: every frame so far, newest first, captioned, grouped by session.
  4. The last five commits.
- **Look:** the film's palette (`#12100E` ground, `#F1E8DA` type, `#C4322B` for the one lit
  thing), Georgia, sprocket-hole edges on the filmstrip. It should look like it belongs to the
  film, not like a dashboard. No cards inside cards, no emojis.
- **Updates:** it polls `_dailies/dailies.json` every 3 seconds, and new frames slide in.
  Honour `prefers-reduced-motion`.
- **Entry shape:**
  `{t, session, space, caption, shot: "/_shots/dailies/<n>-<slug>.png", phone?: bool, plan_ref: "§4.3"}`.
  - Screenshots go to `_shots/dailies/`, numbered in order.
  - Captions are one plain line in Dixon-facing voice, no em dashes: *"The seats are in. Left
    of the aisle is everyone Landa hunted."*
- **When it's built:** first thing in Session 1, before the wall pass, so the very first
  entry is the wall at 47 and the second is the wall at 53.

### `?spot=` (engine, Session 1)

A URL param that spawns the walker at a named station and faces its look target:
`rue | lobby | floorboard | vitrine | auditorium | box | porthole | booth | behind | cellar | table`.

- It's the preview's aim point and also the peek scripts' target.
- It's added to `CONFIGS` stations for the room and read in `Basterds.jsx`.
- It does nothing for other rooms.

---

## 0.2 Full creative control (the Opus 5.5 test)

Dixon, 2026-09-22: *"remember that this is a full creative control test for opus 5.5. i want
you to wow me."*

What that means for whoever builds this:

- **The whole build runs on Opus 5.5 in the main thread.** No handing creative work to
  builder agents.
  - Subagents are allowed only for read-only recon (Explore) and mechanical checks.
  - Every visual, copy and design call is made by the session that's showing Dixon the
    preview.
- **The plan is a floor, not a ceiling.** When a better idea shows up mid-build, build it,
  show it in the preview, and log it in §18 (the build log) with one line of why.
  - The limits that stay: §0's four-point test, §2's rules, the flash safety, and the §14
    budgets.
  - Everything else, including the floor plan's details, is open to a better idea.
- **Every session lands at least one moment he didn't ask for**, and names it in the Dailies
  caption. The fresh ideas already in the plan (the Morris column, the seating chart as a cast
  map, the house lights as the history) don't count toward later sessions. Find new ones.
- **Judge every frame against the film.** Would a person who loves this movie gasp, grin, or
  go "oh, right, THAT"? If a frame is merely correct, it isn't done.
  - Run `~/.claude/design-taste.md`'s squint and deletion tests on the hero frames.
  - Review the fire at its ugliest frame (worst-case frame rule).

### The wow targets (named up front so they get the most love)

1. **Chapter Six: the arrival.**
   - Entering the room doesn't fade in. It plays like the film.
   - Black, a projector clatter, then a full-screen title card in the film's chapter-card
     style (period type, allowed now): **CHAPTER SIX: A GUEST IN PARIS**.
   - The visitor is the film's missing chapter.
   - Hard cut to the street in the rain, the marquee bulbs chasing, a slow push toward the
     doors.
   - Honour `motion.coldOpen` (off = straight to the street) and the flash budget (the cut is
     a luminance event).
   - About 6 seconds, skippable with any key or tap.
2. **The porthole.** The first time he steps up to the booth porthole, the whole seating
   chart is lit below him, both sides of the war, the folded seats of the dead. The build
   should make that view composed, not incidental: seat lamp brightness, the beam, the dust in
   the beam.
3. **The fire.** The showpiece. Nitrate catching, the screen burning through, her face still
   playing inside the burn, smoke rolling over the seats, the roar, the cut to silence, *The
   reel rewinds.*
   - It must be beautiful at full flash and still good at `none`.
   - This is the frame that goes in the Dailies as the session's hero.
4. **Something nobody planned.** Reserved. Session 4 decides it with the whole room standing.

---

## 1. Why this film, why this shape

- **The take names the problem.** "such wonderfully interwoven plots." It has five chapters,
  five locations, three languages and about twenty named characters. It's exactly the kind of
  film where you remember the feeling and lose the wiring.
- **The whole film ends in one building.** Every surviving thread walks into the same cinema
  on the same night. So the cinema can hold the entire film, and walking it is remembering it.
- **It is a film about a cinema used as a weapon**, now living inside a vault of films. The
  meta joke carries itself.
- **It's fresh.** 9.7 on Sep 7, 2026, tied with The Big Short and Gladiator. It isn't even on
  the wall yet.

Rejected: Gladiator (a spectacle room, not a memory room), The Departed (already bespoke),
Memento (already the best room; more of it is diminishing returns).

---

## 2. Rules for this room

### Opened up today (Dixon, 2026-09-22)

The Vault's rules were rewritten this session (`docs/VAULT-IMMERSION-BRIEF-v2.md` §1). For
this room that means:

- **Faces:** TMDB headshots, vendored into `public/cast/`.
- **Stills:** TMDB backdrops, vendored into `public/stills/inglourious-basterds/`. One per
  lobby card, and on the screen cards.
- **Logos:** the film's own logo (TMDB `logos`) on the Programme cover.
- **Real type:** a period deco face for the marquee and lobby cards (web font, e.g. from
  Google Fonts), Georgia for body.
- **Dialogue as text:** one signature line per character, short and exact, checked against a
  source.
- **Melody quotes:** a short motif in the whistle register played by our synths is fine.

### The one line that stays

**No recorded film audio.** No soundtrack files, no dialogue clips.

### Specific to this room

- **Zero swastika geometry, anywhere.** That includes banners, armbands, the Box parapet, and
  Landa's forehead at the end. Premiere drapes are plain red. The forehead carving is described
  in text once, on Landa's card, and never drawn.
- **Quotes are exact or absent.** A signature line is only used after it's checked against
  a source. Recaps and tent cards stay in our words.
- **The marquee** is a plot object here: Shosanna is up a ladder changing its letters when
  Zoller first talks to her.
- **Dixon's words are verbatim**, profanity and caps intact (§8).
- **Narrator voice:** the Vault says "he" about Dixon and "you" about the visitor. Plain words,
  about an 8th-grade reading level, contractions. No em or en dashes in any room copy. No
  emojis.
- **Palette** comes from the film's panel (`film_ledger_panels.palette_css`):
  `--bg #12100E`, `--fg #F1E8DA`, `--sub #8A6F5C`, `--acc #C4322B`. Red does the work; one
  accent per surface. No DWD colours or fonts. Georgia is the house serif (immersion P1 spec);
  large numerals use a condensed system face.
- **Flash:** every full-view luminance event goes through `claimFlash`, uses `strobe` or
  `flicker`, and honours `flash.level` and `content.roomEvents` (§10).

---

## 3. The building

### Engine constraints that shape the floor plan (verified in recon)

- **Collision and floor height live in x/z only** (`src/rooms/colliders.js`). A floor
  function returns one y per (x, z), so **two walkable spaces can never share a footprint**.
  The basement can't sit under the lobby, and the booth can't sit over the auditorium.
- **Stairs are ramps in the floor function.** Barbarian's `stairRampY` climbs 0.96 m over
  1.92 m, a 0.5 slope. There are no step meshes and no jumping.
- **Precedent:** Memento, Sicario and Barbarian are already multi-space rooms. Each is one
  component whose zones are driven by the walker's position (Barbarian `depthForZ`, Sicario
  `inTunnel`). Hidden zones unmount, and grade and fog switch per zone.
- **Budgets:** `camera.far` defaults to 60 m (override in config). At most 7 point/spot lights
  at once and one 512 shadow map, so lights are mounted per zone.

### Plan view

Metres. +z is toward the street. Approximate coordinates: the builder may shift walls by up
to a metre but may not break a footprint rule.

```
                          z
                          +9  ┌──────────────── RUE (street) ───────────────┐
                              │  Morris column (-6,+5)    spawn (0,+6.5)    │  y = 0
                              │  ladder (+4,+0.8)   letter crate (+5.5,+1.5)│
                          0   └──────────┬──[ doors x -1.5..1.5 ]──┬────────┘
   CELLAR (La Louisiane)                 │         LOBBY           │
   x -21..-13, z -2..-12      ┌──────────┤  y = 0, ceiling 4.2     │
   y = -3.0, ceiling 2.4      │  ramp W  │  cards ch1-3 on W wall   │ ramp E (x 5.5..7, z -3..-9.4)
   (reached by ramp from      │  x -13..-7  cards ch4-5 on E wall   │ rises 0 -> +3.2
    lobby W wall z -6..-8)    │  z -6..-8 │  floorboard (-5.5,-2)   │
                              └──────────┤  usher + Programme (0,-6)
                                         │  concession (E, z -1..-4)│
                          -10 ───────────┼──────────────┬───────────┤
                                         │ vestibule W  │  BOOTH    │ gallery x 2..7, z -10..-12, y +3.2
                                         │ x -7..-3     │  x -3..2  │
                                         │ y 0          │  z -10..-13, y +3.2
                          -13 ───────────┴──────────────┴─porthole──┘
                                         AUDITORIUM  x -8..8, z -13..-32
                                         raked: y 0 at the back (z -13) to -1.2 at the front (z -30)
                                         Box (Hitler's) = raised balcony on the E wall, z -20..-24
                                         (view-only in v1; walkable is a stretch, see §14)
                          -32 ═════════ SCREEN (10 m wide, bottom edge y +0.4) ═════════
                          -32..-34  BEHIND THE SCREEN (walkable, entered by a 1 m gap at x 7..8)
                                    the nitrate stack, the pocket
```

### Walk order is story order

- Street (chapter 3's first meeting) → lobby (the five chapter cards, in order) → auditorium
  (chapter 5) → booth (chapter 5, Shosanna's side) → behind the screen (the ending).
- The cellar is the one detour: you go down for chapter 4.
- Nothing is gated; you can go anywhere in any order. The order is just what a first-time
  visitor falls into.

### Zones

`zoneAt(x, z, y)` returns `rue | lobby | cellar | booth | auditorium | behind`. It drives:

1. which geometry is mounted: the current zone, plus any neighbour it has a sightline into;
2. the grade override and fog per zone;
3. the audio bus crossfade (§11);
4. the light set, never more than 7 active.

Two pairs stay mounted together:

- **Booth and auditorium**, because the porthole looks through.
- **Lobby and auditorium**, while you're within 2 m of the auditorium doors.

The doors are open in v1; a door slab fading at 0.8 m (Memento's pattern) hides the far
room.

### Stations

Five plain DOM buttons (law 8: controls are DOM): **STREET · LOBBY · AUDITORIUM · BOOTH ·
CELLAR**. Each calls `goToStation` or `teleportWalker`. On a phone this beats a 45 m walk.
Each station declares its `frame` so portrait screens dolly back (the `4aed73e` pattern).

---

## 4. Space by space

### 4.1 RUE (the street, spawn)

- **Setting:** Paris, June 1944, night, wet cobbles. The façade of Le Gamaar is art deco
  plaster. Plain red premiere drapes hang either side of the doors. One parked staff car is
  a silhouette only.
- **Street light:** one street lamp (the key light) and the marquee's incandescent bulb chase
  (emissive practicals, **not neon**).
- **The marquee (interactive):**
  - It has two states. **Premiere night** (default) shows the billing for *Stolz der Nation*
    (*Nation's Pride*).
  - Touching **the ladder** swaps it to **the day she met Zoller**. The marquee shows the
    earlier programme she was changing, with letters missing, as if mid-change.
  - A small card on the ladder, in our words: *Chapter 3. She was up here changing the
    letters when a German soldier started talking to her. He turned out to be a war hero, and
    he wouldn't go away.*
  - Foley: `creak`, then `paper`.
  - The earlier programme's title is flagged ⚑ in §16.
- **The Morris column (the fresh idea):**
  - A Parisian poster column covered in posters for **other films on his wall that share
    this cast** (§9, Familiar Faces).
  - Each poster carries the shared actor's headshot pinned over its corner.
  - Touching a poster opens that film's room through the existing door system (`onDoor`).
    It's a cross-film memory door that nobody hand-authors: it's computed from cast data.
- **House-light switch:** by the lobby doors, street side, at 1.24 m (§10).

### 4.2 LOBBY: the five chapter cards

The lobby is where the plot lives.

**The five cards:**

- Five large framed lobby cards, 0.9 × 1.2 m, lit by picture lights. Chapters 1 to 3 hang on
  the west wall from front to back; chapters 4 and 5 hang on the east wall by the auditorium
  doors.
- Each card has:
  1. the chapter number, big (the one focal point);
  2. the chapter title;
  3. the place and year;
  4. a three-to-four-sentence recap (§7);
  5. a strip of 3 to 6 headshots for the characters who **enter** in that chapter, each with
     a name label;
  6. **one still** from that chapter, the card's picture. The builder picks it from the TMDB
     backdrops, checks by eye which chapter it's from, and skips any it can't place.
- A card is readable from 1.5 m. The canvas is 1024 × 1365.

**The hidden pieces:**

- **Chapter 1, under the floorboards (the concealment):**
  - In front of card 1, one floorboard sits slightly proud and catches the light.
  - Touch it and it hinges up (`OpenKind` hinge, foley `creak`).
  - Underneath, at 1:6 scale, is the LaPadite farmhouse kitchen seen from above: the table,
    a glass of milk, a pipe. Under the kitchen's own floor are small abstract figures of the
    Dreyfus family.
  - You literally look down through a floor at people hiding under a floor. The recap card
    tells the rest.
- **Chapter 2, the vitrine:**
  - A glass case under card 2 holds a diorama of the ravine: the stone tunnel mouth, a
    baseball bat leaning on a rock, and a small seated figure (Rachtman) facing it.
  - Dixon's line is printed on the glass (§8).
  - Touching the case lights the tunnel mouth. The bat is the reveal (the Bear Jew), with a
    low `thunk` foley.

**Around the room:**

- **Concession counter** (east wall, front): two objects on the counter, each with a small
  tent card.
  - The **glass of milk** (chapter 1: what Landa asks for at the farm).
  - The **plate of strudel with a dish of cream** (chapter 3: Landa orders it for Shosanna at
    lunch, the moment she has to sit across from the man who killed her family).
  - These are the two most-remembered Landa beats, and both are about him being polite
    while terrifying.
- **The usher's stand and the Programme** (centre, back):
  - A printed premiere programme sits on a stand, touch to turn pages (`SpinKind`/page flip,
    foley `paper`).
  - The cover and inside cover carry Leonard's plot paragraph from the panel
    (`film_ledger_panels`, already written, already his record).
  - The following pages list the cast in billing order: headshot, actor, character, one line
    each.
  - This is the fast "who is in this" answer without walking the auditorium. It's the
    **first thing cut** if the build runs long (§14), because the seats carry the same faces.
- **Ramps:** the doorway west goes down to the cellar; the stair east goes up to the booth.

### 4.3 AUDITORIUM: the seating chart

This is the heart of the room: **the whole cast, seated as a map.**

- **The room:** about 180 seats (one `InstancedMesh`, red velvet). The floor is raked. One
  centre aisle and two side aisles.
- **Rows = the chapter where a character enters.** The back rows are chapter 1; the front row
  is chapter 5. So walking down the aisle toward the screen walks the film forward.
- **Left of the centre aisle:** the hunted and the Allies. **Right:** the Reich. You can read
  the sides of the war from the door.
- **Seat down or up = at the premiere or not:**
  - A character who **was in the building on premiere night** sits in a seat that's down,
    with a lit aisle lamp.
  - A character who **died before the premiere** has a seat folded up, with a "réservé" card
    and no lamp.
  - So the empty seats are the dead, and you can count them from the back row.
- **The seat card, on the aisle side of each character seat:**
  - 0.30 × 0.42 m, canvas 512 × 720.
  - Headshot (TMDB w185), character name (large), actor (small), a one-line "who they are",
    and a one-line "what happens to them" (§6).
  - One small object sits on the seat itself as the mnemonic, for example Bridget's single
    shoe (§6).
- **The Box** (east wall, raised, view-only in v1):
  - Hitler's and Goebbels's cards sit on the parapet.
  - Donowitz's and Ulmer's cards are pinned to the Box door behind them, because they came in
    through that door.
  - Dixon's first line is printed on the parapet (§8).
- **The screen:**
  - By default it shows *Nation's Pride* as a flickering bright rectangle: grain and light, no
    imagery.
  - When a reel is threaded in the booth, it shows that chapter's card (§4.4).

### 4.4 BOOTH: Shosanna's side of the glass

- **The room:** a hot tungsten box with two projectors (the changeover pair), a reel rack,
  and a makeup mirror with a red dress on a hanger (premiere night).
- **Zoller's card** is pinned to the inside of the booth door, the door he knocked on.
- **The reel rack (the main interaction):**
  - Five labelled reels, `1` to `5`, plus a sixth reel with a hand-written label, **hers**.
  - Touching a reel threads it onto the projector (foley `thunk`, then a projector-start
    whir). The `HazeCone` beam turns on through the porthole.
  - The auditorium screen then shows that chapter's **screen card**, with the headshots at
    screen size, for 40 seconds or until another reel is threaded.
  - The screen card is **not** the lobby card blown up. It's the chapter told in one sentence
    in huge type ("A farmer. A colonel. A family under the floor."), then the chapter's
    **key moment** in two sentences. Lobby cards explain; screen cards remind.
- **Her reel:**
  - It shows Shosanna's headshot on the screen, treated as projected film: grain, flicker,
    warm, huge (likeness allowed as of today).
  - A caption in our words: *She spliced herself into the last reel. Everyone in this room
    is about to find out whose cinema it is.*
  - Threading it **arms the ending**. The nitrate behind the screen starts to glow faintly,
    which is visible through the screen's edges.
- **The porthole:** the one place you see the **whole seating chart at once**, both sides of
  the aisle, the lit seats and the folded seats. This is the room's "go stand somewhere else"
  sightline (no-vacancy plan §2, still open in STATUS).

### 4.5 BEHIND THE SCREEN: the pocket

- **The pocket:** you reach it through a 1 m gap at the east edge of the screen. It's the
  pocket you can't see from any door, and it holds the strongest fragment.
- **What's there:**
  - A stacked wall of film cans (nitrate).
  - Dixon's "BURN THAT FUCKER." (§8), on paper tape across the cans.
  - **Marcel's card**, with a cigarette in a dish.
- **The ending, if her reel is armed:** touch the cigarette and **the fire runs** (§10). If it
  isn't armed, the cigarette just smokes, and a tent card says *Not yet. She has a reel to
  run first.*

### 4.6 CELLAR: La Louisiane (chapter 4)

- **The room:** a low-ceilinged basement tavern with a long table, a bar, a clock, and a
  banner for a new baby.
  - The banner is the staff sergeant celebrating his son. It's why Bridget signs the napkin,
    and the napkin is what later hangs her.
- **"Who am I?" (the memory game):**
  - The film's card game, turned into the room's flashcard game.
  - A deck on the table: touch it to deal. A card stands up on the table stand, and the
    front shows three clues in our words: chapter, side, their object, one thing they do.
  - Touch the card to turn it over: headshot, name, actor, fate.
  - Touch the deck again to deal the next one. It draws from all twenty characters, in
    random order without repeats until the deck is spent.
  - **No score, no streak, no completion counter** (no-vacancy law 3). It's the rehearsal,
    not the exam.
- **The three fingers:**
  - A carved wooden hand on the bar, holding up three fingers the British way (index, middle,
    ring).
  - Touch it and it flips to the German way (thumb, index, middle), foley `tick`.
  - Tent card: *Hicox ordered three glasses with the wrong three fingers. Germans count from
    the thumb. The table went quiet, and then everyone at it died.*
- **Bridget's shoe:**
  - One high-heeled shoe under the table, and the signed napkin on the table.
  - Tent card: *She lost it getting out. Landa finds it. See the premiere, row 4.*
  - The matching shoe is on her folded premiere seat. It's the one thread in the room you can
    physically follow from one space to another.

---

## 5. The five chapters (draft copy for the lobby cards)

Draft recaps in narrator voice. **Every factual claim is checked against the fact sheet
(§16) before it ships.** The builder may tighten the wording but not add facts.

**CHAPTER 1: Once Upon a Time... in Nazi-Occupied France.** *A dairy farm, 1941.*
An SS colonel named Hans Landa drives out to a French farm and asks for a glass of milk. He
is polite, patient and terrifying. The farmer, LaPadite, is hiding a Jewish family under his
floorboards, and Landa talks him into admitting it. The family is shot through the floor.
One daughter, Shosanna, runs, and Landa lets her go.

**CHAPTER 2: Inglourious Basterds.** *Occupied France, 1944.*
Lieutenant Aldo Raine, from Tennessee, recruits a squad of Jewish American soldiers to drop
behind enemy lines and spread fear. His one demand is Nazi scalps. They ambush a German
patrol, and Sergeant Rachtman refuses to talk, so Donny Donowitz, "the Bear Jew," walks out
of a tunnel with a baseball bat. One private is let go alive with a swastika carved into his
forehead, so everyone will know who did it. Hugo Stiglitz, a German soldier famous for
killing his own officers, joins them.

**CHAPTER 3: German Night in Paris.** *Paris, June 1944.*
Shosanna is alive in Paris, running a cinema under a new name. Fredrick Zoller, a German war
hero starring as himself in a propaganda film, falls for her and gets the premiere moved to
her cinema. At lunch with Goebbels she's made to sit across from Landa, who orders her
strudel and never seems to recognize her. She and Marcel, her projectionist, decide to burn
the cinema down on premiere night with every Nazi leader inside, using the nitrate film
behind the screen.

**CHAPTER 4: Operation Kino.** *London, then a tavern called La Louisiane.*
The British send Lieutenant Archie Hicox, a film critic turned commando, to meet their spy
Bridget von Hammersmark, a German movie star. The meeting happens in a basement bar full of
German soldiers, with Stiglitz and Wicki along to translate. A Gestapo major joins their
table, and Hicox gives himself away with the wrong three fingers. Everyone at the table dies
except Bridget, who is shot in the leg, and Aldo learns the premiere is still on.

**CHAPTER 5: Revenge of the Giant Face.** *Le Gamaar, premiere night.*
Landa finds Bridget's shoe, strangles her, and arrests Aldo, then trades the whole plot for
his own safe passage. Upstairs, Zoller forces his way into the booth, and he and Shosanna
shoot each other. Her spliced reel plays her face to the audience as Marcel lights the
nitrate. Donowitz and Ulmer shoot Hitler and Goebbels from the Box, and their bombs take the
building. Out in the woods, Aldo carves his mark into Landa's forehead.

---

## 6. The cast

Twenty characters get seats. Content lives in `src/rooms/bespoke/basterds/content.js` as
pure data. The **actor name and headshot are joined from `cast.json` by TMDB person id**, so
nothing about an actor is hand-typed. The ids are filled after the §12 backfill.

| # | Character | Actor | Enters | Side | Object on the seat | Premiere? | What happens to them | ⚑ |
|---|---|---|---|---|---|---|---|---|
| 1 | Shosanna Dreyfus ("Emmanuelle Mimieux") | Mélanie Laurent | 1 | L | reel label, her handwriting | yes, booth | Kills Zoller, he kills her. Her face burns on the screen | |
| 2 | Col. Hans Landa, "the Jew Hunter" | Christoph Waltz | 1 | R | pipe | yes | Lives. Trades the plot for his freedom; Aldo carves his forehead | |
| 3 | Perrier LaPadite | Denis Ménochet | 1 | L | milk glass | no (folded) | Gives up the family. The film never goes back to him | |
| 4 | Lt. Aldo Raine, "the Apache" | Brad Pitt | 2 | L | knife | yes (arrested in the lobby) | Lives. Gets the last word | |
| 5 | Sgt. Donny Donowitz, "the Bear Jew" | Eli Roth | 2 | L | baseball bat | yes, the Box | Shoots Hitler; dies when his bomb goes off | |
| 6 | Pfc. Omar Ulmer | Omar Doom | 2 | L | ankle bomb | yes, the Box | Same as Donowitz | |
| 7 | Pfc. Smithson Utivich | B.J. Novak | 2 | L | handcuffs | yes (arrested) | Lives. Cuffs Landa at the end | ⚑ |
| 8 | Sgt. Hugo Stiglitz | Til Schweiger | 2 | L | pistol under the table | no (folded) | Dies in the tavern | |
| 9 | Sgt. Werner Rachtman | Richard Sammel | 2 | R | medal he wouldn't trade | no (folded) | Killed by Donowitz's bat | ⚑ |
| 10 | Pvt. Butz | Sönke Möhring | 2 | R | cap pulled low | no (folded) | Let go alive, marked | ⚑ |
| 11 | Adolf Hitler | Martin Wuttke | 2 | R | cape | yes, the Box | Shot in the Box (history says otherwise, §10) | |
| 12 | Fredrick Zoller | Daniel Brühl | 3 | R | sniper tally card | yes, booth | Kills Shosanna, she kills him | |
| 13 | Marcel | Jacky Ido | 3 | L | cigarette | yes, behind the screen | Lights the nitrate. Doesn't come out | ⚑ |
| 14 | Joseph Goebbels | Sylvester Groth | 3 | R | film can, his production | yes, the Box | Shot in the Box | |
| 15 | Francesca Mondino | Julie Dreyfus | 3 | R | interpreter's notepad | yes | Inside when it burns | ⚑ |
| 16 | Lt. Archie Hicox | Michael Fassbender | 4 | L | three-finger hand | no (folded) | Dies in the tavern | |
| 17 | Bridget von Hammersmark | Diane Kruger | 4 | L | one shoe (its pair is in the cellar) | no (folded; seat reserved) | Strangled by Landa in the lobby | |
| 18 | Cpl. Wilhelm Wicki | Gedeon Burkhard | 4 | L | translation card | no (folded) | Dies in the tavern | |
| 19 | Maj. Dieter Hellstrom | August Diehl | 4 | R | the card from his forehead | no (folded) | Dies in the tavern | |
| 20 | Gen. Ed Fenech | Mike Myers | 4 | L | briefing folder | no (folded) | Sends Hicox. Stays in London | ⚑ |

Notes on the table:

- **Bridget's seat is folded even though she reached the building.** She's killed in the
  lobby before the film starts, so her reserved seat stays empty. That's accurate and it's the
  saddest seat in the room.
- **Staff Sgt. Wilhelm** (Alexander Fehling), the new father, gets a cellar card only, not a
  seat: Bridget shoots him after the standoff. Churchill (Rod Taylor) is a one-scene cameo;
  he gets a line on the chapter 4 card, not a seat.
- The **"what happens"** lines are drafts for the builder to render as written after the §16
  check.

---

## 7. Copy rules for everything above

- **Lobby cards:** 3 to 4 sentences, about 70 words max.
- **Screen cards:** one sentence in huge type plus two sentences.
- **Seat cards:** two lines, under 12 words each, plus the character's **one signature line**
  on the card's back face (touch to flip), exact and attributed. No line is better than a
  wrong line.
- **Tent cards:** under 30 words.
- **Recaps and tent cards stay in our words.** Real dialogue lives only on the seat-card
  backs and, at most, one line per screen card. Keep it a flavour, not a transcript.

---

## 8. Dixon's words in the room

These are fragments of his hot take, placed by hand (Fragments system, authored
`info.fragments` in the `CONFIGS` entry), verbatim, 4 to 17 words each:

| Fragment | Where | State |
|---|---|---|
| "those god damn NAAAAZZZIIIIISSS." | The Box parapet | film |
| "such a fun movie. such wonderfully interwoven plots." | Lobby, above the five cards | film |
| "BURN THAT FUCKER." | Paper tape across the nitrate, behind the screen (the pocket) | film |
| "landa was insane!!! also kinda iconic and giving queen behavior." | Landa's seat card, second face (touch to flip) | film |
| "brad pitt was incredible, his opening speech is kinda FIERCE." | Chapter 2 vitrine glass | film |
| "fun to know it was all fuckin bullshit hahaha" | The screen, house lights up | motel (history) |

---

## 9. Familiar Faces (the Morris column)

- **What it shows:** actors from this film who appear in other films on his wall or in his
  archive, computed, never hand-listed.
- **Expected hits** (to be confirmed by the data, not by this plan):
  - Brad Pitt: Se7en, The Big Short, Bullet Train.
  - Mélanie Laurent: Enemy.
  - Christoph Waltz: the James Bond franchise (archive).
  - Daniel Brühl: possibly the Bourne trilogy (archive) ⚑.
- **Each poster:** that film's vendored poster, the actor's headshot pinned on the corner,
  and a strip: *Brad Pitt was also Mills in Se7en (9.6).*
- **Touch opens that room** through `onDoor` with a `ledger` or `archive` door spec.
- **Why it's the fresh element:** it's the first place in the Vault where films link by
  **who's in them**, which is how people actually remember films ("wait, she was in Enemy?").
  It also costs nearly nothing once `cast.json` exists.
- **Later:** every room can grow one of these. Not in this build.

---

## 10. House lights = the history, and the fire

### House lights

In a cinema, "house lights up" means the film is over and you're back in the real world. So
the Vault's house-light switch here toggles **the fiction versus the record**:

- **FILM (default):** everything above.
- **HOUSE LIGHTS UP (the motel state):**
  - The grade flattens to work lights.
  - The screen shows Dixon's "fun to know it was all fuckin bullshit hahaha" and a short
    history card.
  - The Box parapet and seats 11 and 14 gain a second line on their cards.
  - The lobby cards gain a pinned note each where the film invented something.
  - `MotelUnderneath` props still appear (every room is a motel room underneath). The builder
    places the anchors in the lobby via `place.shell` and `shellParams` sized to the lobby, and
    checks both states in every zone.

History copy, drafts, all ⚑ until checked:

- Hitler killed himself in a Berlin bunker on April 30, 1945. Goebbels killed himself there
  the next day. Neither went to a cinema in Paris that summer.
- Le Gamaar, Operation Kino and the Basterds are invented. The title comes from a 1978
  Italian war film, *The Inglorious Bastards*, spelled correctly.
- Real Jewish soldiers did fight back: the Jewish Brigade in the British Army, and the Ritchie
  Boys, German-speaking refugees trained by US Army intelligence.
- Nitrate film really is that flammable. It's why projection booths were built like ovens.
- Christoph Waltz won the Oscar for Landa.

### The fire (the ending)

- **Trigger:** her reel is armed (§4.4), then you touch the cigarette (§4.5).
- **Sequence (about 20 s):**
  1. Nitrate catches: orange light rises behind the screen.
  2. The screen burns through from the centre: an animated alpha-mask dissolve with an
     ember edge.
  3. Her headshot keeps playing on the burning screen.
  4. Smoke haze fills the auditorium (fog density ramps).
  5. The crowd murmur turns to panic noise, then the roar.
  6. The roar cuts to silence.
  7. The screen shows, in our words: *The reel rewinds.*
  8. Everything resets over 3 seconds.
- **The room always resets** on purpose. Its job is remembering, and a burned room teaches
  nothing on the next visit.
- **Flash safety** (`src/flashPolicy.js`):
  - Fire flicker uses `strobe(t, {hz <= 2.5, soft: true})` on the orange key.
  - The burn-through and any full-view brightening go through `claimFlash('basterds-fire',
    amount)`.
  - `flash.level = reduced` halves the swing; `none` becomes a slow orange ramp with zero
    flicker.
  - `content.roomEvents = off` skips the fire: touching the cigarette shows the screen card
    *She burned it down. (Room events are off.)*
- **Threshold:** add a line to `src/Threshold.jsx` at L84-89, "gunfire and a fire that fills
  the screen (Inglourious Basterds)."

---

## 11. Sound

The recipe is `src/rooms/audio/recipes/basterds.js`, pure synthesis from `kit.js`. The engine
has no positional audio, so the recipe builds **one gain bus per zone** and exposes
`setZone(zone)` to crossfade (1.2 s). This is the `stby.js` two-bus pattern generalised. The
room subscribes to its own zone changes and calls it.

| Zone | Bed | Accents |
|---|---|---|
| Rue | brown `noiseWash` (night air), low | a distant bell `chime` every 40 to 90 s |
| Lobby | room tone + muffled crowd (band-passed noise, slow LFO) + a faint projector rattle through the wall | footsteps from the engine |
| Auditorium | fuller crowd + a projector clatter (noise amplitude-gated at 24 Hz) | on a reel thread: an **original** 5-note whistle figure in the spaghetti-Western register (sine + vibrato + spring-ish delay), composed for this room, not quoted |
| Booth | a loud projector: motor hum (60 Hz drone) + 24 Hz shutter flutter | the reel `thunk`; the knock on the door when you first enter (once per visit) |
| Behind | the projector through canvas, lowpassed | nitrate "tick" as film cans cool |
| Cellar | low chatter, glass `chime` clinks, a clock tick | silence for 2 s when the three-finger hand flips |
| Fire | a rising `noiseWash` with the cutoff opening, crackle `pluck`s, crowd panic | a hard cut to silence |

**Muted is the default** (`vault-sound`). Nothing in the room depends on sound to make sense.

---

## 12. Data work

### Phase 0a: fix the pull before anyone runs it

Recon found that `scripts/PULL.sql` query 3 doesn't select `emotional_key`, but
`emit_vault_data.py:179` reads `key` from `log_extra.json`. A literal re-pull would wipe all
47 keys. Fix query 3 to emit `key`, and diff against the current `log_extra.json` before
overwriting.

### Phase 0b: the weekly wall pass (already owed)

`film_night_debt` has one `wall_behind` row covering 9 films: The Big Short, The Amateur,
L.A. Confidential, Inglourious Basterds, In the Grey, Frost/Nixon, Gladiator, Spotlight,
Operation Finale. Basterds already has its panel row (slug `inglourious-basterds`, authored
Sep 8).

Run the procedure in `docs/plans/2026-09-22-movie-night-v5.md`:

1. run the 13 pull queries;
2. `npm run data` and read the drift guard;
3. peek the wall;
4. commit and push (Pages deploys);
5. add the mailbox marker row;
6. clear the debt.

The wall goes from 47 to 53 films live, and "scored live" stops lying.

### Phase 0c: cast data

The TMDB key never leaves Supabase. `film-tmdb` already fetches `credits` and throws the cast
away (`figgg/supabase/functions/film-tmdb/index.ts:205`), so this is plumbing, not new
access.

1. **Migration (additive), via MCP `apply_migration`, never `db push`:**
   `alter table film_titles add column cast_top jsonb, add column cast_fetched_at timestamptz;`
2. **`film-enrich` gains credits:**
   - Pull the current source with `get_edge_function`. It's version 3 and lives only in
     Supabase today, so commit it to `supabase/functions/film-enrich/index.ts` in this repo
     first, as the source of truth.
   - `enrichOne` adds `/{type}/{id}/credits` (`aggregate_credits` for TV) and writes
     `cast_top` as the top 30 by `order`: `[{id, name, character, order, profile_path}]`.
   - The due filter adds `cast_top.is.null`, so a one-time backfill runs without forcing the
     90-day window.
   - Deploy with MCP `deploy_edge_function`, keeping `verify_jwt` off (auth is in-function,
     unchanged).
3. **Backfill:** run `scripts/enrich_titles.py` in batches of 60 until `due_left = 0`. It uses
   the cron secret from `push_secrets`, read in-session. That's about 231 rows, 2 TMDB calls
   each, free tier, around 25 ms apart.
4. **`PULL.sql` query 14:** `data/cast.json`, `{slug: [{id, name, character, order,
   profile}]}` for **ledger and archive** slugs, archive slugs respecting the 10 hand-written
   overrides.
5. **`emit_vault_data.py`:**
   - `fetch_headshot(person_id, profile_path)` copies `fetch_poster` exactly (idempotent,
     vendored, no runtime third party) into `public/cast/<person_id>.jpg` at TMDB `w185`.
     Headshots are fetched **only** for people used by a cast-aware room (Basterds' top 30)
     and for Familiar Faces hits.
   - `films[slug].cast` is emitted only for films whose room uses it (Basterds for now), to
     keep `vault-data.json` small.
   - `faces[slug]` is computed: for each cast member of a cast-aware film, the other ledger
     and archive films they appear in, with character names.
6. **Stills and logo:** a one-off fetch through `film-enrich` (new `action: "images"`, same
   auth) returns the TMDB `/movie/16869/images` list of backdrops and logos. It returns the
   list only; emit vendors the chosen files. The chosen backdrop paths are hand-listed in
   `content.js` per chapter, and emit vendors them at `w780` into
   `public/stills/inglourious-basterds/`.
7. **Drift guard:** add a check that every seat in `content.js` resolves to a `cast.json`
   person id with a vendored headshot. A missing one fails loudly.

### Phase 0d: the ?text path

`TextMode.jsx` renders nothing room-specific today. Add a "Le Gamaar" section under
Basterds, from the same `content.js`: the five chapter recaps, then the cast table (name,
actor, what happens). The room's knowledge is then reachable without WebGL, which is the only
screen-reader path in the app. `content.js` is plain data of a few KB, so the 50 KB `?text`
bundle stays small.

---

## 13. Engine work, and what else it touches

| Change | File(s) | Why | Blast radius |
|---|---|---|---|
| Lazy-load this room | `rooms/registry.js`, `rooms/FilmWorld.jsx` (Suspense fallback = the develop wash's dark frame) | The registry note says switch to `import()` past about 150 KB of bespoke code, and this room alone will approach that | This room only. The other 16 stay static |
| Wire the interact key | `input.js` consumer + `rooms/Touchable.jsx` | F/Enter/Space map to `interact` and nothing reads them. This room has about 12 touchables; keyboard and gamepad players need them | Every room gains keyboard interact on the nearest in-reach touchable inside a 25° view cone. Verify in Memento and Sicario too |
| Zone buses | `recipes/basterds.js` | §11 | This room only |
| Threshold line | `Threshold.jsx` | §10 | Copy only |
| `?text` section | `TextMode.jsx` | §12d | Additive |
| Cast pipeline | `PULL.sql`, `emit_vault_data.py`, `public/cast/` | §12c | Additive; the drift guard gains one check |
| `?spot=` spawn | `Basterds.jsx`, its `CONFIGS` stations | §0.1 | This room only |
| THE DAILIES | `dailies.html`, `_dailies/` (gitignored), `.gitignore` | §0.1 | Dev only; never in `dist/` |
| Chapter Six arrival | `Basterds.jsx` (or a small `ArrivalCard.jsx`), routed through `claimFlash` | §0.2 | This room only |

The room's own files, all new:

```
src/rooms/bespoke/basterds/
  Basterds.jsx          room root: zones, colliders, floors, stations, lights, grade, audio hookup
  zones.js              zoneAt(), footprints, floor function (ramps, rake), bounds
  Rue.jsx  Lobby.jsx  Auditorium.jsx  Booth.jsx  Behind.jsx  Cellar.jsx
  Seats.jsx             InstancedMesh seats + character seats + seat cards
  Fire.jsx              the ending sequence (flash-policy routed)
  MorrisColumn.jsx      Familiar Faces
  basterdsTextures.js   canvas textures: lobby cards, seat cards, screen cards, tent cards, marquee
  content.js            chapters, characters, tent copy, history copy (pure data)
src/rooms/audio/recipes/basterds.js
```

Plus: a `CONFIGS['inglourious-basterds']` entry (family, grade, camera spawn, `camera.far:
80`, `place` for the house switch, `info.fragments` from §8), and a `BESPOKE` map entry,
lazy.

---

## 14. Performance, phone, and the cut list

### Budgets per zone (measured with `peek.py --fps`, one page per browser instance)

- 60 fps desktop; 55 minimum anywhere.
- At most 7 active lights and one 512 shadow (the zone key).
- Canvases no bigger than 1024.
- Anything repeated more than 8 times is instanced.
- No per-frame allocation.
- Mesh budgets per zone:

| Zone | Target | Key lights |
|---|---|---|
| Rue | about 120 meshes | street lamp key, marquee bulbs as 2 practicals |
| Lobby | about 160 | 5 picture lights folded into 2 practicals + emissive frames |
| Auditorium | about 200, seats as 1 instanced mesh | screen as the key, aisle lamps emissive-only |
| Booth + porthole view | about 150 | |
| Cellar | about 140 | |

### Headshots

About 30 images at 185 × 278 JPEG is roughly 250 KB total. They load with the room, not the
app.

### Phone (390 × 844, touch first)

- Stations do the travelling.
- Cards must be legible at arm's length. Test the seat card at 1.0 m on a 390 portrait peek.
- The walk stick must not cover the reel rack at booth spawn.

### Cut list, in order, if a session runs long

1. The Programme booklet (the seats carry the faces).
2. The marquee's second state.
3. The walkable Box (already a stretch; v1 is view-only).
4. The cellar as a walkable space, which becomes a lobby diorama with the card game on the
   concession counter.

**Never cut:** the seating chart, the lobby cards, the reels, the fire, Familiar Faces, and
the ?text section.

---

## 15. Build order, gates, screenshots

Four build sessions, each ending committed and pushed (GitHub Pages is free and
auto-deploys; no Netlify here). Commit with explicit paths.

**Every session starts the same way:** open the preview (§0.1), point THE ROOM, open THE
DAILIES, say in one line what's first.

**Session 1: data and bones**

0. Open the preview and build THE DAILIES first (§0.1). Entry 1 is the wall at 47.
1. Phase 0a to 0d (§12). Dixon watches the wall catch up to 53 live.
2. Engine prep: lazy load, interact key, Threshold line.
3. **Greybox:** all six footprints as untextured shells, the floor function (ramps, rake),
   colliders, bounds, `zoneAt`, stations, and a debug zone label behind `?peekZone`.

Gate:
- Walk the whole building on keyboard and on the stick; no clipping, no stuck spots.
- `zoneAt` is correct at 20 sampled points.
- Wall at 53 films.
- `?text` shows the section.
- Shots: `s1-01-greybox-plan.png` (top-down debug camera), `s1-02-rue.png`,
  `s1-03-lobby.png`, `s1-04-auditorium-from-porthole.png`, `s1-05-cellar-stair.png`,
  `s1-06-wall-53.png`, `s1-07-text-mode.png`.

**Session 2: street and lobby**

Rue, marquee, Morris column, lobby cards, floorboard diorama, vitrine, concession, and
`content.js` complete (after the §16 check).

Gate: every lobby card readable at 1.5 m in a 390 portrait peek; Morris column doors open
the right rooms. Shots:
- `s2-01-rue-premiere.png`, `s2-02-rue-ladder-state.png`
- `s2-03-lobby-cards-west.png`, `s2-04-lobby-cards-east.png`
- `s2-05-floorboard-open.png`, `s2-06-vitrine.png`
- `s2-07-morris-column.png`, `s2-08-card-closeup-390.png`

**Session 3: auditorium, booth, ending**

Seats and cards, the Box, the screen, booth reels, screen cards, her reel, behind the screen,
the fire.

Gate:
- The porthole view shows the whole chart.
- Each reel shows the right chapter.
- The fire runs under full, reduced and none, and is skipped with `roomEvents` off.
- The flash budget is honoured, measured by logging `claimFlash` grants.
- Shots:
  - `s3-01-aisle-back.png`, `s3-02-aisle-front.png`
  - `s3-03-seat-card-closeup.png`, `s3-04-porthole.png`
  - `s3-05-screen-ch1.png`, `s3-06-her-reel.png`
  - `s3-07-fire-worst-frame.png`: review at the ugliest frame, never t=0.

**Session 4: cellar, sound, history, polish**

Cellar and card game, three fingers, the shoe, the audio recipe and zone buses, the house
lights history layer and motel props, fragments, the full QA pass, and a STATUS.md update.
Shots:
- `s4-01-cellar.png`, `s4-02-card-front.png`, `s4-03-card-back.png`
- `s4-04-house-lights-lobby.png`, `s4-05-house-lights-screen.png`
- `s4-06-desktop-hero.png`, `s4-07-phone-hero.png`

Final checks JSON (every value true before the room is called done):

```json
{
  "build_passes": true,
  "wall_shows_53": true,
  "cast_json_resolves_every_seat": true,
  "text_mode_has_le_gamaar": true,
  "walk_all_zones_keyboard_and_stick": true,
  "no_spawn_inside_collider": true,
  "fps_min_55_every_zone": true,
  "max_7_lights_any_zone": true,
  "fire_respects_flash_levels_and_room_events": true,
  "threshold_lists_basterds": true,
  "house_lights_both_states_every_zone": true,
  "interact_key_works_here_memento_sicario": true,
  "no_swastika_geometry": true,
  "every_quote_checked_against_a_source": true,
  "no_recorded_film_audio": true,
  "no_em_or_en_dashes_in_room_copy": true,
  "fact_sheet_all_checked": true,
  "shots_desktop_and_390_reviewed": true,
  "preview_open_whole_session": true,
  "dailies_entry_per_visible_step": true,
  "dailies_not_in_dist": true,
  "one_unasked_for_moment_this_session": true
}
```

**The last gate is Dixon's, not a check.** He walks in and runs the §0 test on himself. That's
worth doing about a week later, not the same night.

---

## 16. Fact sheet: verify before any copy ships

Sources: Wikipedia plot plus the TMDB credits pulled in §12c. Items marked ⚑ are believed but
not yet verified in this session.

**Verified this session** (Wikipedia plot and cast):

- 2009, 153 minutes, Quentin Tarantino.
- The cast and character names in the §6 table (except the ⚑ rows).
- Hicox is exposed by a hand gesture.
- Bridget shoots Wilhelm after the standoff.
- Landa finds Bridget's shoe and a signed napkin at the tavern, and strangles her.
- Donowitz and Ulmer shoot Hitler and Goebbels from the opera box, then the explosives go
  off.
- Marcel ignites the nitrate behind the screen after locking the auditorium.
- Landa negotiates a deal for himself and his radio operator; Aldo shoots the operator and
  carves Landa's forehead.
- Waltz won the supporting actor Oscar.
- *Nation's Pride* was directed by Eli Roth.
- The title comes from Castellari's 1978 film.

**To verify (⚑):**

1. The five chapter titles, exact spelling. My recall: Once Upon a Time... in Nazi-Occupied
   France / Inglourious Basterds / German Night in Paris / Operation Kino / Revenge of the
   Giant Face.
2. The film on Shosanna's marquee when Zoller first talks to her.
3. The strudel lunch's location, and that Goebbels is at it.
4. Utivich cuffing Landa.
5. Rachtman's name and fate; Butz's name.
6. Marcel's and Mondino's fates.
7. Fenech's role.
8. Daniel Brühl in the Bourne films.
9. The history card claims: the dates, the Jewish Brigade, the Ritchie Boys, nitrate.

Nothing ⚑ ships unverified. Anything that can't be verified gets cut, not guessed.

---

## 17. Decisions owed to Dixon

1. ~~Film stills on the lobby cards?~~ **Settled 2026-09-22:** the rules were opened up, and
   stills are in (§2).
2. **3D figures modelled on the actors?** Allowed now, but expensive: modelling twenty people
   is a project of its own. **Recommendation: not this build.** Headshots and stills carry the
   memory; figures can come later for one hero moment (Landa at the farm table in the
   chapter 1 diorama is the obvious one).

Everything else in this plan is decided. The builder doesn't reopen it.

---

## 18. Build log (the builder appends here)

One line per deviation from this plan, and one line per unasked-for moment, each with the
session number and why.

- **S1, deviation: the pull is a function now, not a chore.** There was no local database
  credential, so the 13 `PULL.sql` queries would have meant hand-copying about 150 KB of JSON
  through chat. Built `vault_pull()` + the `vault-pull` edge function + `scripts/pull.py` instead:
  the weekly wall pass is one command. It caught three silent drifts that were waiting in the
  old SQL: the emotional keys (query 3), the lesson evidence the citation graph reads (query 8,
  20 of 21 laws would have gone uncited), and watch providers read one level too deep
  (query 13, every queue slip would have said "nowhere to watch").
- **S1, deviation: 39 thin titles linked to TMDB.** Three of the six new wall films had no
  poster because chat logged them without a TMDB id. `film-enrich` gained a strict `link`
  action (exactly one title+year match or it is skipped). 39 linked, 7 skipped honestly
  (franchise rows, no match, and a duplicate Sinners row for Dixon to merge).
- **S1, deviation: the building is a raster, not hand-placed walls.** `zones.js` lists
  footprints with floor functions; walls, openings and colliders all derive from them, and the
  blocking set is the rasterised complement of the walkable union. Moving a doorway is one line.
  `scripts/check_basterds.mjs` flood-fills it (528 m2 reachable, every spot, no floor jumps).
- **S1, deviation: the rake is 2.2 m, not 1.2 m.** At 1.2 m the seat blocks sat at eye level
  from the door. Stadium rake reads like a picture palace and gives the porthole its view.
- **S1, deviation: the Box spot moved to the east aisle** (it had been placed inside a seat
  block; the flood-fill caught it).
- **S1, found: the TMDB credits carry the tavern card names** (Pola Negri, Winnetou,
  Beethoven, Edgar Wallace, Mata Hari). They are in `content.js` as `FOREHEADS` and become the
  cellar deck's bonus round in Session 4.
- **S1, found: Mélanie Laurent is also in Operation Finale**, which he watched a week after
  Basterds. Familiar Faces surfaces it on its own; the Morris column gets it in Session 2.
- **S1, noticed, not ours:** the in-room header wraps badly at 390 ("I TO HIDE THE RECORD"
  runs into the score). It is the shared room chrome, every room has it. Worth a small fix in
  its own change.
- **S1, the pane:** the app's browser pane ticks animation frames only while the app window
  has focus. Headless Chrome (`scripts/dailies.py`) is the source of every Dailies frame.
- **S2, done:** the street to the film's own facade (reference: the TMDB still of Le Gamaar at
  night, `public/stills/inglourious-basterds/facade.jpg`), the five lobby cards with real stills,
  the floorboard, the vitrine, the counter, two of Dixon's lines, and Chapter Six.
- **S2, deviation: Chapter Six is plain DOM on document.body,** not drei `Html`: inside the
  Canvas, the DOM layer landed behind WebGL. Timers, not frames, so it plays in a pane that is
  not ticking.
- **S2, deviation: Morris column posters show only the lower 60% of each one-sheet** (the
  title block). Operation Finale's real poster has a swastika in the glasses; the room draws none.
- **S2, deviation: still picks avoid every frame with a swastika in it** (ch1 #36 farmhouse,
  ch2 #33 Donowitz at the tunnel, ch3 #34 the strudel, ch4 #10 the tavern table, ch5 #28 her eyes).
- **S2, cut (per §14):** the Programme booklet. The seats carry the faces; it can come back later.
- **S2, bug fixed in shared code:** the interact key aimed at each Touchable's group origin;
  it now aims at the anchor, the same point the click reach gate uses.
- **S2, the unasked-for moment:** Chapter Six itself was planned, so the session's own pick is
  the ladder. Touch it and the marquee goes back to the afternoon Zoller first talked to her:
  Die weisse Holle vom Piz Palu, letters missing mid-change, with the card saying he loved those
  films and would not go away.
- **S2, owed to S3/S4:** the house switch still sits on a pole (config `place.shell: 'open'`);
  the lobby wants a chandelier and deco pilasters; the in-room header wrap at 390 (shared chrome).
- **S3, done:** the seating chart (every character seat with a card, lamps for the living,
  folded seats for the dead, Landa's "queen behavior" pinned over his card), the Box (Hitler
  and Goebbels on the parapet, "those god damn NAAAAZZZIIIIISSS."), the screen (the film
  playing, five chapter reels, her reel), the booth (projector, reel rack, the red dress, the
  mirror), behind the screen ("BURN THAT FUCKER." on the nitrate, Marcel's card, the
  cigarette), and the fire (burn-through, painted flames, orange light, smoke, the reel
  rewinds). `window.__basterdsReel(n|'her')` and `__basterdsIgnite()` are the test hooks;
  `scripts/theatre_shot.py` drives them for the Dailies.
- **S3, deviation: two ports, not one porthole.** The projector sat in the only window. Real
  booths have a projection port and a viewing port, so there are two; you look through the
  one on the right.
- **S3, deviation: the flames are painted on the screen, not particles.** The nitrate is behind
  the screen, so the fire shows through it; painting at 10 fps reads better and costs nothing.
- **S3, deviation: the behind-the-screen light is the fire light.** One light, two jobs, so the
  room stays at 7.
- **S3, parked: the projector beam.** An additive cone rendered as a solid slab under this post
  stack. The porthole reads without it; Session 4 polish can try the repo's `HazeCone`.
- **S3, not done yet: signature lines on seat-card backs** (need a source for each exact line),
  the walkable Box (stretch), Zoller's card on the booth door.
- **S3, the unasked-for moment:** the fire keeps her face on the screen while it burns, and
  the house cards stay lit through it: every face in the room watches it happen.
- **S4, done:** La Louisiane (the Who am I? deck, the three fingers, Bridget's shoe with its
  pair on her premiere seat, the banner, the clock, Wilhelm's table and card), the sound recipe,
  house lights as the history layer, the projector beam, the chandelier and pilasters, Zoller's
  card by the booth door. `peek.py --fps`: 60 in all eight zone spots.
- **S4, deviation: the bonus round is a deck section, not a separate mode.** Twenty characters,
  then the five forehead names (`BONUS`, clues in our words), then the last card. One gesture,
  no mode switch, still no score.
- **S4, deviation: the hand's folded fingers curl behind the palm,** not toward you. Curled
  toward the camera they read as dangling; behind the palm the count reads from the bar.
- **S4, deviation: the shoes are red satin,** not black. Black patent disappeared in both rooms;
  the pair has to be findable to be a thread.
- **S4, deviation: the switch stays shell 'open' with `shellParams.switch` naming a wall.**
  `motelAnchorsFor` gained that one override, for bespoke rooms whose spawn is not indoors.
- **S4, the beam:** HazeCone at 0.015 idle and 0.035 with a reel on. From the port it's a faint
  haze; from the aisle it reads as a real beam. Brighter than that, it slabs over the screen.
- **S4, deviation: the house-lights notes are pinned paper,** fading in with the switch, one per
  lobby card and one on the Box parapet. The seat 11/14 second lines were folded into the Box
  note (Hitler and Goebbels sit in the Box, not in seats).
- **S4, the unasked-for moment:** the deck's last card is you. Play all twenty-five and the
  twenty-sixth is "Who am I? Chapter six. Side: not chosen yet. On my seat: nothing." Turn it:
  *A Guest in Paris. You. The film's missing chapter. The reel rewinds, and you come back.*
  It closes the loop Chapter Six opened on the street and the fire closes in the theatre.
- **S4, tooling:** `dailies.py --keys` takes `js:<statement>` steps, so any Dailies frame can
  drive the room's hooks (`__basterdsDeal(n)`, `__basterdsTurn()`, `__basterdsHand(v)`, `__house(v)`).
