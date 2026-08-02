# VAULT v5 HANDOFF — Mount the wall into the real room

Goal: merge `v5-room-proof.html` (true preserve-3d motel room, WORKING, commit
94a58b9) with `wall_template.html` (v4, the polaroid wall + all interaction).
Output: `wall_template.html` becomes the v5 template; v4 copy archived to
`legacy-v4/wall_template.html` first. Then rebuild `the-vault.html` via
`python vault.py` and make `check.py` pass (updated as specified below).

Non-negotiable contract (same as every version):
- The hand-authored `<section class="panel SLUG">` HTML is NEVER restructured.
- All vault.py tokens keep working: `__PALETTES__ __FACTS_JS__ __SECTIONS__
  __META__ __LINKS__ __PHOTOS__`.
- Never run `playwright install`. check.py resolves system Chrome/Edge.
- The 2D interaction code (fitRect, centerPhoto, wheel anchor zoom, drag pan,
  pinch, dive stack, investigation, step-back layout, certify) is NOT
  rewritten. It keeps operating on the existing `cam = {x,y,s}` in flat wall
  pixels. The 3D room renders UNDER it via a derivation layer (below).

## Why this works (the core idea — read twice)

v4 died because it tried to keep `#world`'s own `translate+scale` transform
while nesting it in a 3D graph. v5 inverts it: `#world` gets NO transform at
all, ever. The CSS camera does everything. When the camera faces a wall
head-on at distance d, CSS perspective projects that wall as a uniform 2D
similarity with scale s = PERSP/d. So any (cam.x, cam.y, cam.s) state has an
exactly equivalent camera pose. All existing math stays valid; we just render
it with a camera instead of a transform on the plane.

## Scene graph (transplant from v5-room-proof.html)

Keep from the proof, verbatim where possible:
- `#viewport` (perspective:1000px) > `#room` (preserve-3d) camera rig with
  the `translateZ(PERSP)` prefix, rAF loop, eased flights, yaw-shortest-path.
  NOTE: change `perspective-origin` AND `#room` anchor `top` to **50% / 50%**
  (proof used 46%; the engaged-mapping math below assumes dead center).
- `plane()` helper (transform-origin 0 0, translate(-50%,-50%) suffix, NO
  backface-visibility), `at()`, `box()`, debug mode (`?debug`), dust motes,
  cold open (door → seated flight, blink lids, skip on pointerdown),
  left-wall doorway + neon + floor wash, right-wall window + curtains,
  ceiling, floor, side walls, rails + baseboards, lamp + glow planes,
  table + legs + shadow, closed shoebox + UNDEVELOPED label, nightstand +
  drawer front + pull.
- Station buttons/HUD are replaced by the vault's existing desk/mode chips.

Delete from v4 template:
- `#roomShell` and ALL its CSS/JS (rsCeiling, rsLeft, rsCurtain, rsWindow,
  rsNeon, rsNeonWash, rsLamp, rsFloorWrap, rsFloor, rsFloorFade,
  rsForeground) — the real room replaces it.
- `layout()`'s painted-room `arch()` calls: wallpanel, rail, baseboard,
  floor, wire, shade, lamp, boxwall, boxlid, boxlabel, table, tableleg,
  cabinet, drawerfront2, drawerlip, pull. KEEP: tier bands, roomhead,
  bandhead, wtx text, colo — those are wall CONTENT.
- `turnSwing`, `seatedParallax`, `Z_SEATED`, the old `roomCam` — superseded
  by the proof's camera.
- `.glide` CSS transitions on #world/#backsInner. `glideTo(x,y,s)` is
  reimplemented as an rAF tween of `cam` (same ease curve, .85s), because
  #world no longer has a transform to transition.

## Geometry & wall mounting

Room dims are computed at layout time from the wall extent W×H (currently
written to world.style.width/height at :770):
```
ROOM_W = Math.max(5600, W + 800)
ROOM_H = Math.max(2600, H + 300)
ROOM_D = Math.round(ROOM_W * 0.78)
FLOOR_Y = +1040 stays; CEIL_Y = FLOOR_Y - ROOM_H
FRONT_Z = -ROOM_D/2; BACK_Z = +ROOM_D/2; LEFT_X/RIGHT_X = ∓ROOM_W/2
```
- `#frontWall` = the room's literal front wall plane: sized ROOM_W×ROOM_H,
  gets the aged-wallpaper background (port the wallpaper CSS from the v4
  `wallpanel`/`#backsInner` art onto the two wall planes). `#world` (W×H,
  position:absolute, NO transform) sits inside it at
  `left: (ROOM_W-W)/2, top: WALL_TOP` where WALL_TOP is chosen so the wall's
  EYE line (wall y = 640) lands at room eye height (-220):
  `WALL_TOP = (-220 - 640) - CEIL_Y` (i.e. room y of wall top = -860).
- `#backswall` = the backs plane at BACK_Z with rotateY(180), same sizing,
  hosting `#backsInner` at the same inset. The 180° rotation gives the
  physically-correct mirror when you turn around. Backs cards keep their
  existing left/top coordinates — do not remap them.
- Wall-coord → room-coord helpers (used by the camera derivation only):
  `wallRoomX(wx) = wx - W/2` … `wallRoomY(wy) = CEIL_Y + WALL_TOP + wy`.

## The derivation layer (the whole trick — implement exactly)

Global `facing`: 'front' | 'backs' | 'box' | 'drawer'. Every rAF frame with
no flight active:

```
s    = cam.s
dist = PERSP / s                         // dolly distance from the plane
wcx  = (vw/2 - cam.x) / s                // wall point at viewport center
wcy  = (vh/2 - cam.y) / s
front: eye = { x: wallRoomX(wcx), y: wallRoomY(wcy), z: FRONT_Z + dist,  yaw: 0,   pitch: 0 }
backs: eye = { x: -wallRoomX(wcx), y: wallRoomY(wcy), z: BACK_Z - dist,  yaw: 180, pitch: 0 }
```
(backs x negated because the plane is rotateY(180)-mounted.)
Apply with the proof's applyCam (translateZ(PERSP) … translate3d(-eye)).
Do NOT touch cam.x/cam.y/cam.s semantics anywhere else. The wheel-zoom
cursor anchor, drag pan, pinch, fitRect, centerPhoto all keep their code
character-for-character.

SVG thread stroke compensation `/cam.s` stays correct (engaged = head-on =
uniform scale). Leave those call sites alone.

During FLIGHTS (mode changes, cold open, goto across walls) the camera is
tweened directly in eye-space (proof's flight code) between the derived
start pose and derived end pose; on landing, `facing` switches and the
derivation resumes. Mode 'backs' flight: pull back to mid-room, yaw through
±90 (side walls sweep past), land facing backs at the fitRect(regions.def)
equivalent pose. Mode 'wall'/'invest': the reverse.

## Shoebox & Dark Drawer become real furniture

- The box-region photos (SC_BOX prints) no longer live on the front wall.
  Create `#boxPlane`: a plane hovering over the open shoebox, tilted
  rotateX(-62deg) (like a tray of prints angled at you), sized to
  `regions.box` w×h, hosting a `#boxInner` div; move the print elements into
  it with their coordinates offset by regions.box origin (do this in
  layout(), not by changing place()). Clicking the closed box: flight to the
  table station, lid plane hinges open (rotateX tween on a lid child), prints
  fade in (they keep the v4 opacity-0-until-open behavior via the existing
  `box-closed` body class). Facing 'box' engages the same derivation with
  plane basis = the tilted boxPlane: for engaged purposes treat it head-on —
  the flight lands the camera on the plane's normal axis at
  dist = PERSP/cam.s, yaw/pitch matching the plane tilt. Implement via a
  PLANES table: `{front:{...}, backs:{...}, box:{origin, yaw:0, pitch:-62+90…}}`
  — generalize the two-case derivation into a per-plane function
  `derivePose(plane, cam)` so box/drawer are the same code path.
- Dark Drawer: same pattern at the nightstand — drawer front slides out
  (translate tween), `#drawerPlane` lies at a gentler tilt inside it with the
  hazy photos. `drawer-closed` body class behavior preserved.
- The v4 dive/read/certify flows on prints and hazy photos must keep
  working (they operate on cam + fitRect, so they inherit correctness from
  the derivation).

## check.py (update, coverage never shrinks)

- Keep all DOM/behavioral checks (counts, state styling, rank order, modes,
  dive, flip/read, see-also, links, goto, step-back, thread, certify,
  restore byte-compare). Where a check drove the old 2D transform directly,
  drive it through the same public functions (fitRect/flyTo/setMode).
- Replace the 4 v4 pixel checks with:
  1. Per-facing render check: for wall, backs, box, drawer — screenshot,
     grid-sample: mean > 8 and stdev > 6 (no voids).
  2. **Engaged-mapping exactness** (the regression net): after
     `fitRect(regions.def, 60)` settles, pick 3 known photos, compare
     `getBoundingClientRect()` centers against the predicted
     `wall*s + cam` positions — must agree within 2px. Repeat on backs.
  3. Cold-open completes: lids gone by t=4s, camera at seated pose.
  4. Turn flight: after setMode('backs') + settle, backs wall visible
     (pixel check) AND mapping exactness holds.
- Target: all checks pass on system Chrome via the pip playwright package.

## Order of work

1. `mkdir legacy-v4`, copy current wall_template.html + check.py there.
2. Merge template per above. Build with `python vault.py`. Iterate with
   your own screenshot loop (write a throwaway script like
   `_experiments/v5_shots.py`; screenshots to `_experiments/v5-proof/`).
   Debug-color mode `?debug` is your friend for plane placement.
3. Update check.py; run until green.
4. Do NOT republish the artifact URL; do NOT touch Supabase. Local only.
5. Log a CHANGELOG.md v5 entry (what moved, what died, the derivation).

Known traps (all hit before, don't rediscover them):
- transform-origin must be 0 0 on placed planes; 50% displaces rotations.
- No backface-visibility:hidden anywhere inside the room box.
- The `translateZ(PERSP)` prefix in applyCam is what makes rotation a head
  turn; without it the eye is 1400px off.
- Positive yaw turns LEFT in this rig; authored bearings must negate.
- perspective-origin and #room anchor must BOTH be 50%/50% or the engaged
  math is off-center (change from proof's 46%).
- `.photo` transform slot is occupied by rotate+scale vars; never add 3D
  transforms to photos.
- z-index games (hover 40, read 60/70) only work because photos stay
  non-3D children of a flat #world; keep it that way.
