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

## Agreed, not started

**Phase 1, the pipeline.** Blocks everything downstream.
- [ ] Emit `emotional_key` (47 films, authored, never rendered)
- [ ] Emit the 78 `pitched` titles with their reasons
- [ ] Emit the 154 recommendations with reasoning (every proposed ending needs them)
- [ ] Emit full `film_status` state per title, plus `certified_on` / `certified_score`
- [ ] Fix the 4 bloodlines silently dropped at build time (39 in, 35 out)
- [ ] `plain_summary` per film, 2-3 sentences, ~8th-grade. Hand-written, never auto-simplified
- [ ] `data/archive.json` is 64 against 65 live. `PULL.sql` query 10 fixes it

**Phase 2, the slice.** Malignant 5.4 and Sorry to Bother You 9.4, and the door
between them. Gate: does walking those two rooms produce the click? Judge it on
a phone.

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
- **The mobile arrival is broken, and it is the primary platform.**
  Screenshotted at 390x844: the ledger wall is cropped on BOTH sides, so
  Memento (the 10.0, the entire argument of the wall) is cut off the left edge
  and The Sting is cut off the right. Two thirds of the screen is empty ceiling
  and floor. The dock runs off the edge mid-word at "THE MIRRO". The one thing
  this build does better than anything else, 47 Polaroids in a single glance,
  is exactly what fails on the device most visitors arrive on. Evidence:
  `_shots/sweep-mobile.png`.

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
