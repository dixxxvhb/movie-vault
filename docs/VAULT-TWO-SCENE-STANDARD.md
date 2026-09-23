# The Two-Scene Standard

Every film on the wall becomes two scenes and a door between them. Written 2026-09-23 after
Le Gamaar Session 4, from what that room got right (the street) and what it didn't (the inside).
Le Gamaar is the pilot. This file is the standard every other room is built to.

Dixon, 2026-09-23: *"a beautiful first appearance when i enter the movie scene... then i want to
be able to somehow go into ONE other room and have it be the final place with the rest of the
details. fully built out and interactable and different for each movie but lets me wander around
and learn and view and remember and see and each be dedicated to that movie and theme exclusively."*

---

## 1. What Le Gamaar taught us

**Why the street works** (Dixon called it the most iconic and best-made part of the room):
1. It was built against **one reference image**, the film's own still of the facade, and
   matched shape by shape.
2. It is **one composed view**. You arrive facing it, and everything in the frame is there
   for that frame.
3. It **moves**: rain, marquee bulbs chasing, a slow push toward the doors.
4. It has a **ceremony**: the arrival card, then a cut.
5. It **tells you nothing**. There is no sign explaining the street. You want to go in.

**Why the inside didn't:**
1. **Six spaces, each half built.** The lobby, auditorium, booth, behind, cellar and stairs
   stayed greybox architecture (raster walls, flat plaster, one ceiling height, one bulb each)
   with props placed in them.
2. **A checklist, not a place.** Every plan item became a prop plus a tent card explaining it.
   The story was told by signs.
3. **No reference per space**, so there was nothing to match and no bar to fail against.
4. **No hero frame per space.** Nobody decided what the room looks like from the door.

The rule that comes out of it: **one space built all the way beats six built halfway, and
objects carry the story before text does.**

---

## 2. The format

### Scene 1: THE ARRIVAL

The film's most iconic exterior or establishing place, seen the moment you enter the film.

- **One reference still**, vendored to `public/stills/<slug>/arrival.jpg`. Built to match it.
- **One hero frame** from the spawn point. Everything in it is composed for that frame.
- **The arrival card** (generalised from `ArrivalCard.jsx`): black, a sound cue, a full-screen
  title in the film's own title style, a cut to the scene, a slow push. About 6 s, skippable,
  honours `motion.coldOpen` and the flash budget.
- **It moves**: weather, practical lights, one living element (traffic, water, smoke, a sign,
  crowds as silhouettes).
- **A short walk**, about 10 to 20 m, to **one threshold**.
- **No info cards.** At most one or two easter eggs you find by touching things (Le Gamaar's
  ladder, the Morris column).
- **The house switch is never here.** It lives inside the Room.

### The Threshold

One designed transition from the Arrival into the Room: a door opening, an elevator, a hatch,
a car door, a cut on action. Specific to the film. About 1.5 s. The Room is loaded (lazy chunk)
while you walk toward the threshold, so the transition never waits.

### Scene 2: THE ROOM

One interior, the film's most iconic one (or an honest composite), that holds **everything**.
You wander it to learn, view, remember and see.

**Architecture, not a box:**
- Built against **a reference still** (`public/stills/<slug>/room.jpg`), three passes minimum.
- Real architectural vocabulary for the period and place: mouldings, columns, windows, ceiling
  structure, doors that look like doors. **No raster or greybox wall survives into the final.**
- **Three light layers**: practicals you can see (lamps, sconces, screens, windows), a key, and
  accents on what matters. Seven lights maximum; the rest is emissive.
- **Three hero frames** named in the film sheet: from the door, from the far end, and the
  close-up of the room's centrepiece. Each gets a Dailies frame on desktop and on a phone.

**What the Room must hold** (the contents are the same for every film; the form is unique):

| Slot | What it is | Le Gamaar's answer |
|---|---|---|
| **The plot** | The film's acts or beats, told by objects placed in story order | Five chapter cases along the walls |
| **The people** | Every character who matters, with face, actor and fate (`data/cast.json`) | The seating chart |
| **The objects** | The film's props, each one a real thing you can pick up or open | The milk, the strudel, the shoe, the reels |
| **The game** | One way to rehearse the film by playing | Who am I? |
| **The event** | The film's climax, played in the room, flash-safe, always resetting | The fire |
| **His words** | Dixon's lines, verbatim, placed where they belong | The scraps |
| **The record** | House lights up: what was invented, what was real, what he felt | The history screen and pinned notes |
| **The sound** | A synthesised recipe, no recorded film audio | The zone buses |

**Text rules:** objects first. A card only when an object can't say it. Target **twelve text
surfaces or fewer** in the whole Room, not counting cast cards. No card explains what a thing
is if you can see what it is.

### Rules that carry over unchanged
`VAULT-IMMERSION-BRIEF-v2.md` §1 (stills, faces, logos, fonts and dialogue as text allowed;
recorded film audio never; no swastikas), the flash policy, reduced motion, `?text` mode,
60 fps at DPR 2 (55 is the floor), house lights in every scene, no emojis, no em dashes.

---

## 3. The film sheet (one per film, before any code)

`docs/films/<slug>.md`, filled in and checked against the film before building. Template:

```
# <Title> (<year>)
Score / rank on the wall:
The feeling in one line (what Dixon should feel walking in):

## Arrival
Place:                      Reference still:
Hero frame (what's in it):
What moves:
The arrival card (title style, sound cue):
Easter eggs (0 to 2):
Threshold (what you walk through, how it transitions):

## Room
Place:                      Reference still:
Period, palette, type:
Floor plan sketch (one room, where each slot lives):
Hero frames: door / far end / centrepiece
The plot:      (beats, and the object for each)
The people:    (who, where each one lives in the room)
The objects:
The game:
The event:     (flash plan, reset)
His words:     (verbatim, and where)
The record:    (house lights: what changes)
The sound:     (bed, accents, the event)

## Facts to check before copy ships
```

---

## 4. The kit (shared code, built during the pilot)

Pieces that every room reuses, so the second film is faster than the first. They live in
`src/rooms/kit/` and each one is extracted from Le Gamaar only once it works there.

- `ArrivalCard` (title, style, sound cue, push target): generalised from Le Gamaar.
- `Threshold` (door / cut / elevator presets, preloads the Room chunk).
- `Weather` (rain, snow, fog, dust, heat shimmer), `Practicals` (bulbs, neon, sconces, flicker
  through the flash policy).
- Architecture pieces: `Moulding`, `Pilaster`, `Coffer`, `Curtain`, `Sconce`, `Frame`, `Case`
  (a lit display case), `DoorLeaf`.
- `CastCard` + `useCast(slug)`, `Scrap` (his words), `HouseNote` (the record), `TentCard`.
- `zoneAudio` (the bus crossfade from `recipes/basterds.js`), `eventRunner` (build, climax,
  hard cut, reset, flash claims, roomEvents off).
- Tooling: `?spot=`, `dailies.py --keys js:`, `peek.py --fps`, a flood-fill walk check.

---

## 5. Rollout

- **Pilot: Inglourious Basterds.** Its film sheet is `docs/films/inglourious-basterds.md`. The
  Arrival exists (the street). The Room is rebuilt from six spaces into one.
- **Then by score, top down**, because those are the films he loves most. The 16 existing
  bespoke rooms keep their best interior as the Room and gain an Arrival. The 36 template rooms
  get both scenes.
- **Honest cost:** at this bar a film is one to two sessions (a film sheet, then the build).
  The whole wall is a long project. Every film ships on its own the moment it passes, so the
  wall gets better one door at a time.

### Done means (per film)
```json
{
  "film_sheet_checked": true,
  "arrival_matches_reference_three_passes": true,
  "arrival_has_no_info_cards": true,
  "threshold_transition_under_2s_no_wait": true,
  "room_is_one_space": true,
  "no_greybox_walls": true,
  "room_matches_reference_three_passes": true,
  "all_eight_slots_filled": true,
  "text_surfaces_12_or_fewer": true,
  "hero_frames_desktop_and_390": true,
  "fps_min_55_both_scenes": true,
  "house_lights_both_scenes": true,
  "event_flash_safe_and_resets": true,
  "no_recorded_film_audio": true,
  "dixon_walked_it": false
}
```
