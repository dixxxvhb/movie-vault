# Inglourious Basterds (2009)

The pilot for `docs/VAULT-TWO-SCENE-STANDARD.md`. Score 9.7, ninth on the wall.
Facts, cast and copy live in `src/rooms/bespoke/basterds/content.js` (checked 2026-09-22).
Sessions 1 to 4 built it as six spaces; this sheet rebuilds it as two scenes.

**The feeling:** premiere night in a Paris picture palace that is about to burn, and you are
the only one who knows.

## Arrival: the rue (built, Sessions 1 and 2; Dixon: "the most iconic and well done")

- **Place:** the street outside Le Gamaar at night, in the rain.
- **Reference:** TMDB backdrop #56, the film's own facade (`public/stills/.../facade.jpg`).
- **Hero frame:** from the spawn, the facade square on, marquee bulbs chasing, the doors lit.
- **What moves:** rain, the marquee chase, the slow push after the card.
- **Arrival card:** CHAPTER SIX: A GUEST IN PARIS (built).
- **Easter eggs:** the ladder (the marquee goes back to Piz Palu); the Morris column
  (Familiar Faces doors). Both stay.
- **Changes under the standard:** the house switch leaves the lobby wall and goes inside the
  Room. No info cards on the street (the ladder's tent card goes; the marquee tells it).
- **Threshold:** the front doors. Touch them, or walk into them: both leaves swing in, the
  crowd murmur swells, a cut through black (0.5 s) and you are standing at the back of the
  house, the doors closing behind you. The Room's chunk is already loaded.

## Room: the auditorium on premiere night

- **Place:** Le Gamaar's auditorium, one continuous volume: stalls on the rake, a balcony
  across the back with the projection booth in it, the Box on the east wall, the stage and
  screen, the wings, and a low bar under the Box.
- **References** (TMDB backdrops, reference only, none shipped with a swastika in frame):
  #60 the velvet rows; #4 and #9 the round window of her booth, and the red dress; #25 the
  premiere lobby's *Stolz der Nation* frames; #52 the fire.
- **Period, palette, type:** 1930s Paris picture palace. Oxblood velvet, old gold, cream
  plaster going brown with nicotine, black lacquer. Bodoni Moda, Josefin Sans, Oswald (the
  room's existing type).

### Floor plan (one volume, +z toward the street)

```
                       street doors (Arrival) ──teleport──┐
  z  -5 ┌──────────────── BALCONY (y 3.2) ─────────────────┐   stair up the NW corner
        │   booth box with the ROUND window, reels, dress   │
  z -11 ├──────── balcony front rail (the porthole view) ───┤
        │ back crossing (y 0): doors in, house switch,      │
  z -13 │ chapter 1 under glass in the floor                │
        │ W wall: chapter   ║  seats  ║  seats  ║  E wall:  │
        │ cases 1, 2, 3     ║ hunted  ║  reich  ║  THE BOX  │ ── bar alcove under the Box:
        │ between pilasters ║ (cast)  ║ (cast)  ║  above    │    LA LOUISIANE (y -1.2, low)
        │ and sconces       ║         ║         ║           │    table, deck, hand, shoe
        │ chapter cases 4,5 near the stage (W)               │
  z -30 ├────── apron (y -2.2), proscenium, curtain ────────┤
        │                    THE SCREEN                      │
  z -32 └── wings: W = nitrate + BURN THAT FUCKER + Marcel; E = the cigarette ──┘
```

- **Hero frames:**
  1. **From the doors:** the whole house, the screen playing *Stolz der Nation* inside a gold
     proscenium, velvet curtains swagged, the lamps of the living on the seat backs, the Box
     lit on the right, the balcony overhead.
  2. **From the balcony rail (the porthole view):** every seat in the chart below, both sides
     of the aisle, the beam in the haze.
  3. **The centrepiece:** her face on the screen through the burn.

### The eight slots

| Slot | Where and what |
|---|---|
| The plot | Five lit display cases on the west wall, story order from the back to the stage, each a period poster case: the still, the chapter title, and one object in the case (milk glass; the bat; the strudel; three glasses; the shoebox from Landa). The chapter 1 hatch stays: glass in the back crossing floor over the farmhouse crawlspace. |
| The people | The seating chart (built), with Hitler and Goebbels on the Box parapet and Zoller's card on the booth door. |
| The objects | The reels and the red dress (booth), the milk and strudel (case 1, 3), the shoe and its pair, the napkin, the bat, the cigarette, the nitrate. |
| The game | Who am I? at the La Louisiane table under the Box, with the three-fingers hand on its bar. The last card is you. |
| The event | The fire (built): her reel, the cigarette, the burn, the rewind. |
| His words | "such a fun movie..." over the proscenium; "BURN THAT FUCKER." on the nitrate; "queen behavior" on Landa's seat; "those god damn NAAAAZZZIIIIISSS." on the Box; "kinda FIERCE" in case 2. |
| The record | The switch by the doors: the history screen, the pinned notes (now on the cases and the Box). |
| The sound | The recipe folds to three buses: street, house (under-balcony and stalls), booth and bar as accents by distance. |

### Text budget (12 or fewer, cast cards not counted)
Five case labels, the reel rack card, the cigarette card, the deck card, the hand card, the shoe
card, and his words (which are objects, not signs). The lobby's tent cards, the counter's two
cards and the vitrine card are retired.

### What goes away
The lobby, the east stair, the gallery, the vestibule, the west stair, the cellar as separate
spaces. Their contents move into the Room as listed above.

## Build status: FINISHED (2026-09-23, live on master)

Everything on this sheet is built:
- **Arrival:** Chapter Six (the kit's ArrivalCard, now holding its full 3.4 s even while the
  room builds), the rue in the rain, the facade, the marquee, the Morris column, the ladder
  easter egg with no card.
- **Threshold:** the front doors, touch or walk in; out again by the house doors, facing the
  Morris column.
- **Room:** one volume. Proscenium, sunburst, curtains, organ grilles, pilasters and sconces,
  upper-wall panels and frieze, cornice cove, ceiling rosette, opera box, carpet; the five
  chapter cases with objects; chapter 1 under the crossing floor; the seating chart; the booth
  at the balcony front with the round port; the signed, lit, walkable stair; La Louisiane in
  the arch under the Box (the deck and its last card, the three fingers, the shoe and its pair
  upstairs, Wilhelm's table); Stolz der Nation playing; backstage as a stage house (screen back,
  fly rail, nitrate, BURN THAT FUCKER, Marcel, the cigarette); the fire.
- **His words:** all six placed (arch, Box, Landa's seat, case 2, the nitrate, the history
  screen). **The record:** the switch by the doors, the history screen, pinned notes on every
  case and the Box. **Sound:** zone buses (street, house, balcony, behind, bar).

Checks (2026-09-23, 1:40am, headless Chrome, gamepads blanked):
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
  "every_route_walked_with_keys": true,
  "console_errors": 0,
  "build_passes_dailies_not_in_dist": true,
  "max_7_lights": true,
  "no_em_or_en_dashes": true,
  "dixon_walked_it": false
}
```
Text surfaces in the Room (cast cards and the case posters aside): the reel rack card, the
cigarette card, the deck card, the hand card, the shoe card, three way-signs. Eight.

The one open item is Dixon's walk.

## Facts to check before copy ships
All copy is carried over from content.js (checked 2026-09-22). New copy in this rebuild: the
case labels only, written from CHAPTERS.
