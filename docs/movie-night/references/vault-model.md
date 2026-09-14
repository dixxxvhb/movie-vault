# The Vault model

The ranked wall holding every film in one ranking. Since 2026-08-06 the Vault is a WebGL app (Vite + React-Three-Fiber), live at dixxxvhb.github.io/movie-vault, repo `~/Code/movie-vault` (public). Since 2026-08-21 every polaroid opens into a walkable room ("Step Into the Polaroid"). `film_ledger_panels` remains the panel source of truth; the app renders from a data pull. Query the counts; never quote them from memory.

## Three states, not two rooms

His reframe, do not lose it: **a live score is trustworthy because a reaction was captured before the number, not because we were in the same room.** Confidence rule, not purity rule.

| State | What it is |
|---|---|
| Logged | Every film. Ledger (watched together, scored live) plus Archive (seen before, scored from memory, `memory_score` set) plus the Hazy Wing (seen, too faded to rate, `seen_before` with no score). |
| Certified | An archive film he has ruled does not need a rewatch. `certified_on`, `certified_score`, `certified_line` on the title row. It gets its color field back and joins the definitive ranking. |
| Definitive | Ledger plus Certified. The list we are actually building. Grows two ways: watch something new, or certify something old. |

## The seven rules (his rulings, 2026-07-25; mirrored in `film_lessons` and `film_taste_profile.vault_model.rules`)

1. Certify toll: his word plus one line. That line becomes the film's review. Do not ask for more.
2. Re-score at certification. He gives a fresh number then. Both the memory score and the certified score are kept.
3. Rewatch always overrides. Live > certified > memory.
4. Rewatches get queued and are always disclosed as a rewatch at pick time. Never sneak one in.
5. The Hazy Wing cannot certify. No score to stand on. A rewatch is the only way out, and the wall renders no certify affordance there.
6. Drift is reported, never applied. No auto-adjustment of his numbers, ever.
7. Archive scores never move a Ledger anchor.

## Calibration

Rewatching an archive-scored film produces a paired measurement (memory vs live). The v3 trigger appends it to `vault_model.paired_measurements` automatically. When there are enough to state a real number, tell him the number and touch nothing. A Hazy Wing exit produces no pair; there was never a memory score to compare.

### Calibration, part two: predictions

Every pitch carries `predicted_score` and `predicted_on`. When the film gets logged, the same trigger that closes the rec appends `{title, predicted, live, date}` to `content -> calibration -> predictions[]`, and `film_calibration` reports it: n, mean signed error, mean absolute error, and the error broken out by emotional key and by tag.

Reported, never applied. Exactly like paired measurements, and for the same reason: rule 6. The number says where Leonard's ear is off, not where Dixon's scores should move. Nothing in the code reads it to adjust anything, and nothing ever should.

The prediction is Leonard's bet. When the live score lands 1.0 or more away, say so out loud before he does, then write nothing. The trigger already has it.

## CERTIFY blocks

He pastes:
```
CERTIFY
Title | 9.4 | the one line he gave
```
Write `certified_on`, `certified_score`, `certified_line` to the title row first. Then publish if Code is available. `film_check` on a hazy title will refuse; say so plainly.

## Rewatch shelf

`film_rewatch_shelf` ranks candidates: hazy first (his bad memory is an asset; long-gap rewatches play like first watches and score like them), then archive by memory score. Mix them into normal picks as disclosed rewatches, never as the whole slate.
