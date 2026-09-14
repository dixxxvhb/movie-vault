# Vault pipeline and design canon (Code sessions)

## Division of labor (standing)

Chat (Leonard) owns all content: `film_log`, hot takes, panels, `film_links`, lessons, notes, profile writes, certifications, the debrief. Claude Code owns the pipeline: data sync, build scripts, migrations, structure. Chat never hand-patches the pipeline; it writes a brief and hands it to Code.

## Publish procedure

1. Repo `~/Code/movie-vault` (remote `github.com/dixxxvhb/movie-vault`, branch `master`).
2. Re-pull the data files into `data/` from Supabase:
   - `ledger_meta.json` = `{slug: [watched_at, score, title]}`, `distinct on (slug) ... order by watched_at desc`, latest live score wins.
   - `ledger_panels.json` = `[{slug, palette_css, panel_html}]` from `film_ledger_panels`.
   - `links.json` = `film_links` with from/to resolved to title strings.
   - `photos.json` = `{slug: photo_svg}` for panels with a bespoke front.
   - `archive.json` from `film_titles where seen_before and no film_log row`: `memory_score` present puts a film in the Shoebox, absent puts it in the Dark Drawer. (v3: read the columns, not the seen_note text.)
   - `queue.json`, `lessons.json`, `quotes.json`, `titles.json`, `providers.json` as the emit script expects.
3. `npm run data` (runs `scripts/emit_vault_data.py` -> `public/vault-data.json`).
4. Commit and `git push origin master`. That is the deploy; the GitHub Action publishes Pages.
5. Verify live, then write the marker: `insert into film_mailbox (id, note) values (gen_random_uuid(), 'published through <newest slug> <date>')`. This is what `film_night_debt.wall_behind` reads.

Not built yet: `emit_vault_data.py` should eventually emit a `calibration.json` from `film_calibration` so the room can show how well the predictions track. Noted so it is not re-derived; do not build it until it is briefed.

Invariants:
- `film_ledger_panels` is the panel source of truth. Every new or changed panel is stored there in the session it is scored.
- Drift guard: a Ledger title must not also appear in Archive or Hazy data. The v3 `film_status` precedence makes this structural, but keep the build-time guard.
- Rewatch dedupe as above.

## Design canon (weight 5)

The Polaroid Wall is law. Every film is a photo taken the night it happened: developed and hung (Ledger), faded and penciled from memory (Archive), undeveloped dark frame (Hazy). Certifying is writing on the photo in pen. Per-film palettes as CSS custom properties (`--bg --fg --sub --acc --glyph`); bespoke fronts follow the 236x236 viewBox, palette-var, dead-center-subject grammar in `film_ledger_panels.photo_svg`. The banned drawer stays banned: no corkboard, no standing red string, no pins, no noir, no neon, no DWD branding (no forest green, pink, terracotta, ivory; no Cormorant, Outfit, Bebas), no localStorage or sessionStorage. The Thread is serial killer red (#C42B2B) and survives the ban only because it is opt-in on hold and gone on release; if it reads as yarn it has failed. Query `film_lessons where scope = 'design'` for the full rulings.
