# The Vault

Dixon's movie-night ledger as a real room. A first-person 3D motel space where
every scored film hangs as a Polaroid, connected by red string, readable up
close. Built with **Vite + React-Three-Fiber (Three.js)**.

**Live:** https://dixxxvhb.github.io/movie-vault/

This is the one home for the Vault. (It used to be a Claude artifact; that era
is retired.)

## The room

Built in **metres**, so a WebXR pass later needs no re-authoring. Four walls,
four jobs:

| Wall | Holds |
|---|---|
| North — **the Ledger** | Every scored film. **Height is the score**, not the rank |
| North lit — **the Investigation** | The same wall with `film_links` strung in red, room dimmed |
| South — **the Door** | The queue: what's next |
| West — **the Mirror** | The taste lessons, taped up |

And two things on the floor, because not every film he has seen got scored the
night he saw it:

| On the floor | Holds |
|---|---|
| **the Shoebox** (under the window) | Seen, scored **from memory, in pencil**. Faded prints |
| **the Dark Drawer** (in the nightstand) | Seen, unscorable. Frames that were never developed |

The split is read out of `film_titles.seen_note`: a memory score anywhere in
the note puts a film in the Shoebox, everything else is a dark frame. Archive
scores **never** sit on the Ledger's axis and never move a Ledger anchor — a
remembered 10 and a recorded 10 are different currencies, so they are never
measured against the same wall. That is why the archive is at your feet and not
on the north wall.

The 45 lines in `film_quotes` hang as small scraps: under their Polaroid on the
Ledger, tucked beside their print in the archive, or loose in the drawer if the
film is on no wall at all (Veep, Star Trek Beyond — television, never scored).
Scraps are always smaller than the photograph they belong to.

The Ledger is a value axis, not a leaderboard. `y` maps linearly from score 5.0
to 10.0, so equal scores hang at equal height and the distance between two
Polaroids is the real distance in how he felt. Cards that would collide spread
sideways (a beeswarm); nothing is ever moved vertically to make room, because
that would be lying about a score. Pencil rules mark 6 through 10 and the
current average, so the axis is legible without being explained. The floor of
the axis tracks the real minimum rather than being pinned at 5.0, so a future
sub-5 score rescales the wall instead of silently clamping onto the baseboard.

Navigation is **click-to-station**: stand and drag to look, click a wall to
approach, Esc to stand back. Clicking a Polaroid flies to it, turns it over and
opens its case file.

Looking is **unbounded**. Every station turns a full 360 and pitches freely; the
authored aim is only where you are pointed when you arrive. The old per-station
`yawRange` clamps are gone — they protected the composition and in exchange made
the room feel like four photographs rather than one place, since standing at the
Ledger physically prevented you from turning to see the door behind you.

Zoom is a **lens, not a walk**: wheel, trackpad pinch, two-finger pinch, or
`+` / `-`, applied as station fov divided by a factor between 0.78 and 3.4 and
reset on arrival. It never moves the camera, because the stations are composed
positions and dollying the wheel would put you through a wall. Look sensitivity
scales down with the zoom so the felt turn speed stays constant.

## Saying what things are

Two layers, because "what is this and what does it do" had no answer in the
room itself:

- **Signage** (`Signs.jsx`) — each region wears a strip of masking tape naming
  it and counting what it holds, stuck to the thing it names: above the Ledger,
  above the Door and the Mirror, on the shoebox lid, on the drawer front. They
  fade in only as you turn toward them and fade back out once you are standing
  at the thing, so they teach the room without standing in front of it.
- **The guest card** (`Guide.jsx`) — a printed motel information card behind the
  `?` in the corner, shown once on a first visit (`localStorage`). It names all
  six regions with live counts and lists the controls. `?noguide` suppresses it
  (the screenshot harness uses this).

## The case file

Clicking a Polaroid takes it off the wall; its case file hangs **beside it, in
the room** — a real object at an angle in world space, not a panel bolted to the
edge of the screen. It is drei's `<Html transform>`, so the prose stays crisp,
selectable and scrollable while keeping true perspective; a canvas texture would
turn every paragraph to mush at reading distance.

One CSS px = `scale / 40` metres in transform mode (drei divides the object
basis by `distanceFactor / 400` while leaving translation in world units) — that
constant is why `SCALE` looks arbitrary.

Each sheet is printed in **the film's own palette**. `film_ledger_panels
.palette_css` already carries a designed `bg` / `fg` / `sub` / `acc` pair per
film, so Barbarian's file is near-black with a blood accent and The Nice Guys'
is warm 70s card stock, with the film's glyph printed into the stock. `palette.js`
mixes the raw swatch toward pulp so a saturated poster colour reads as paper, and
walks the accent toward black or white until it clears a contrast ratio at body
size.

## Layout

```
src/            App (room + layout), Room, CameraRig, Polaroid, CaseFile,
                Strings, Notes, Archive, Quotes, ColdOpen, Signs, Guide,
                roomTone, pointer, palette, roomTextures, vaultTextures,
                archiveTextures
data/           Supabase-derived data, pulled from project swjqlfcqvcrnydpyjyog
scripts/        emit_vault_data.py (data -> public/vault-data.json, fetches
                posters), shot.py (headless screenshots + pixel checks),
                peek.py (one-frame look while iterating)
public/         emitted vault-data.json + vendored posters/
```

## Develop

```bash
npm install
npm run dev
```

## Verify what you built

Chrome-MCP cannot reach this machine's localhost and the in-app browser pane
stops compositing WebGL the moment it is hidden, so:

```bash
npm run shot
```

Renders every station headless at **device_scale_factor 2** (never DPR 1 — a
wall-texture bug once shipped blank because of that) using system Chrome, writes
PNGs to `_shots/`, and pixel-checks each for the black-void failure mode. Never
run `playwright install`.

Station shots load with `?nocold` so they are not racing the wake-up blink. The
blink gets its own three-frame check (shut → part-open → gone) which must be
taken on `domcontentloaded`; waiting for `networkidle` first burns 2–3s and the
blink is already over, which made an earlier version of the check pass against a
fully lit room.

**Read the PNGs.** The brightness numbers only catch a black void — they cannot
tell you the shoebox is inside the wall or the pencil is illegible.

While iterating, `scripts/peek.py` takes a single frame without the full suite:

```bash
python scripts/peek.py --station "the ledger" --zoom 8 --out zoom-in
python scripts/peek.py --url "http://localhost:5173/?film=niceguys" --out casefile
python scripts/peek.py --guide --out guide
```

`?film=<slug>` opens straight onto one card, so a case-file check does not
depend on clicking blindly into the canvas and hoping it hits the right film.

## VR

Open the live URL in the Quest browser and press **enter vr**. The button only
appears once the browser confirms it can do `immersive-vr`, so a desktop without
a headset never sees it.

The room was built in metres from the start, so nothing was re-authored for this.
What changes in a session:

- **The headset owns the camera.** `CameraRig` stops writing to it entirely —
  fighting the head pose is how you make someone motion sick. Flying to a station
  instead moves the *player*: `XROrigin` is their feet, placed at the station's
  floor position and turned to face its target. Pitch is deliberately dropped;
  you tilt your own head. Eye height comes from the actual human, which is why
  the existing stations still frame correctly.
- **Postprocessing comes off.** A screen-space composer has no correct answer for
  a stereo pair — it runs per eye, so grain and aberration differ between your
  eyes and read as eye strain within a minute — and the stack alone costs more
  than the 72fps budget allows.
- **Navigation is the controller ray**, because there is no DOM in a headset:
  point at a wall to approach it, at the shoebox or drawer to open it, at a
  Polaroid to take it down, and at the floor to step back to the middle of the
  room (the floor stands in for Esc).

Known limit: the case file is DOM, so in a headset a card turns over and
you read its handwritten back, but the long-form sheet does not appear. Putting
that in-world needs a real 3D text layer and is not done.

### Testing VR without a headset

```bash
npm run shot
```

The harness enters an **emulated Quest 3** and checks the room actually renders
as a stereo pair — both eyes lit, and the two halves not pixel-identical (which
would mean one image stretched across the frame rather than real stereo).

To look around the emulator by hand, load the dev server with `?xrsim`. Two
things about it that cost an hour each to find:

- The emulator is **dev-only and opt-in**, because installing it *replaces*
  `navigator.xr` globally (it would shadow a real headset) and because `iwer`
  plus its synthetic rooms is megabytes that no visitor should download.
  `import.meta.env.DEV` makes the whole branch vanish from the production build —
  verified: production fetches one JS file and none of the emulator chunks.
- It must be installed with **`installRuntime({ forceInstall: true })`**, which
  is why `src/xrEmulator.js` exists instead of using the library's own `emulate`
  option. Desktop Chrome already exposes a deviceless `navigator.xr`, so IWER
  decides a real runtime is present and skips installing itself; the library
  calls `installRuntime()` with no arguments, so the override is unreachable
  through its config. The only symptom is `isSessionSupported` staying false
  forever, with no error.

Note that `vite preview` will NOT serve this correctly without `--base
/movie-vault/`: the base in `vite.config.js` is keyed on `command === 'build'`,
and preview reports `serve`, so it hosts at `/` while the built HTML asks for
`/movie-vault/`. That is a local-preview quirk, not a deploy problem.

## Refresh the film data

Re-pull the files in `data/` from Supabase, then:

```bash
npm run data
```

`emit_vault_data.py` merges them, vendors any new TMDB posters into
`public/posters/`, and runs a **drift guard** that shouts if a panel exists with
no ledger entry or vice versa — that is how a whole film once stayed invisible
on the wall for a day.

## Deploy

Push to `master`. The GitHub Action builds and deploys to Pages.

## Milestones

- **M0 (shipped)** screenshot harness with pixel checks.
- **M1.5 (shipped)** the real room: four walls, procedural surfaces, practical
  lighting, dust, postprocessing, station camera.
- **M2 (shipped)** real TMDB posters, vendored, Polaroid-graded.
- **M3 (shipped)** inspect: lean in, card turns, case file from `panel_html`.
- **M4 (shipped)** the Investigation: `film_links` as red string, room dims.
- **M5 (shipped)** the Door (queue) and the Mirror (taste lessons).
- **M6 (shipped)** the Shoebox and the Dark Drawer, `film_quotes` as scraps, and
  the cold open (a 3.4s wake-up blink, skippable on any input, `?nocold` to
  bypass). Optional room tone is synthesised on demand and **never autoplays** —
  no AudioContext is constructed until the toggle is pressed.
- **M7 (shipped)** WebXR. Stand in the room in a Quest — see **VR** above.

Full plan and the locked design rulings: `VAULT-V6-PLAN.md`.
