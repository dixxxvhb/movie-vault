# STATUS

The running list. Open, agreed, done. Keep it current so a new session or a new
agent picks up without Dixon re-explaining.

Plan: `docs/plans/2026-09-04-no-vacancy-plan.md`
Source material: `docs/plans/2026-09-04-six-designs.md`

---

## Done

| What | Commit | Notes |
|---|---|---|
| Wall refreshed to 47 films | `841a56a` | Se7en, Inside Man, The Big Short, The Amateur, L.A. Confidential + 3 bloodlines. avg 8.55 |
| `scripts/PULL.sql` | `3074cc6` | 13 queries, one per data file, each returns its file's final contents. Caught the 10 hand-authored archive slugs a naive slugify would have orphaned |
| Two live WCAG 2.3.1 failures fixed | `43569e6` | `flashPolicy.js`. 3.5 Hz to 2.17 Hz, red saturation 0.862 to 0.668, swing 0-40 to 6.1-34.0 |
| `settings.js` | `b6b6d73` | One versioned profile, OS-derived defaults, four presets, URL overrides |
| `input.js`, `walkKeys.js` retired | `f8067d3` | 16 named actions, rebindable, gamepad, keyboard + snap turn wired. Verified: ArrowRight then W moves (0, 2.00) to (1.82, 1.82) |
| `?text` route | `02221ef` | Whole Vault as a document, split ahead of the 3D bundle. 460 KB to 50 KB on that path |
| Derived citation graph | `c778382` | 20 of 21 taste laws now cite their evidence films, 40 citations, no hand-authored table |

## Done, session two (the slice)

| What | Commit | Notes |
|---|---|---|
| Pipeline: emotional_key + forward bloodlines | `6be2f8c` | 47 keys emitted; the 4 "dropped" links point at queued films and now resolve with state. Zero dropped for the first time |
| Portrait phone fits the wall | `4aed73e` | Stations declare `frame`, the world width they must show; the rig dollies back on narrow viewports. Desktop byte-identical |
| THE HOUSE LIGHTS | `f18f244` | A switch by the door in every room, derived from the shell. Film state and motel state, ~700ms apart. All 26 template rooms, every shell kind, 60fps in both |
| FRAGMENTS | `bfa5831` | The take is printed on the room's own props, not a card. Auto-split, verified lossless across all 47 takes. The floating card stands down |
| THE LAWS | `5e55bc0` | `visits.js`, the first persistence. The Mirror fills in behind you: walk the films a law cites and it writes itself |

**The slice is proven.** Stand in Malignant for seven seconds, stand in Sorry
to Bother You for seven seconds, walk to the Mirror, and the doctrine those two
films taught him has written itself on the wall. Real visits, no test hook.

## Agreed, not started

**Phase 1, the pipeline.** Half done. Remaining, and still blocking:
- [ ] Emit the 78 `pitched` titles with their reasons (the far wing)
- [ ] Emit the 154 recommendations with reasoning (every proposed ending needs them)
- [ ] Emit full `film_status` state per title, plus `certified_on` / `certified_score`
- [ ] `plain_summary` per film, 2-3 sentences, ~8th-grade. Hand-written, never auto-simplified
- [ ] `data/archive.json` is 64 against 65 live. `PULL.sql` query 10 fixes it

**Phase 2, the slice.** DONE for the template path (Malignant). Still owed:
- [ ] The house lights and fragments in the 16 BESPOKE rooms, which do not
      route through GenericRoom. Sorry to Bother You is one of them, so half
      the slice pair is still on the old card
- [ ] The bloodline door between the two, opening on the authored note
- [ ] The pocket you cannot see from the door, and one go-stand-somewhere-else
      sightline per room
- [ ] Ear to the door (needs the walkway)
- [ ] Judge the whole thing on a phone

**Then:** spine (zustand store, controller, lazy rooms, render path,
deterministic mode), shell and arrival, the building, the rooms, below grade,
the ending.

## Owed to Dixon (decisions only he can make)

1. The Court (multi-storey, floor = score band) or the flat strip? Judges split.
2. The basement guess: does dialling a number beside his cheapen the numbers?
3. Dawn as a soft ending at ~40 minutes, or no clock?
4. The 78 pitched doors are public. Comfortable?
5. The owner's verb. What do you want at 1am with the take just written?

## Verified this session, worth not re-deriving

- **All 60fps.** Wall, malignant, enemy, memento, darkknight, br2049, sicario,
  stby, barbarian: zero console errors, 60fps each when measured in isolation.
  A sweep that opens nine pages in one browser reports 22fps for the wall and
  35 for memento; that is measurement contention, not a regression. Measure
  one page per browser instance.
- **The mobile arrival WAS broken and is now fixed** (`4aed73e`). At 390x844
  the wall used to crop on both sides with Memento off the left edge. Stations
  now declare the world width they must show and the rig steps back to fit.
  Before and after: `_shots/sweep-mobile.png` and `_shots/frame-phone.png`.
  Still true that the wall sits small in portrait with dead ceiling and floor
  above and below it; the arrival composition is Phase 4 work.

## Standing hazards

- **Flash.** `flashPolicy.js` covers `DwellConcede` and `Enemy`. Still
  unrouted: `ResetFlash`, `ScheduledCut`, Barbarian's smash cut, `Develop`'s
  wash, `ColdOpen`'s blink. Each passes alone; WCAG counts flashes in
  aggregate. A flash bus with a 700 ms floor is owed.
- **No content warning anywhere.** The site has horror, strobing, a hard cut to
  full daylight and a flash to white, and warns about none of it.
- **No pause.** Nothing freezes scheduled room events.
- **`?text` is the only screen-reader path.** The canvas has no focusable
  proxies yet.
