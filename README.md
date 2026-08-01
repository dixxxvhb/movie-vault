# The Vault — Code-side sync

Working copy of the movie-night ledger build, kept here so a Code session
doesn't have to reconstruct it from scratch every time.

**PIPELINE v3 (2026-08-01): The Room.** `vault.py` + `wall_template.html`
render a salon-hung wall in a painted room (height = rank, lamp over the
Crown), an open shoebox and dark drawer of evidence-in-waiting, bespoke SVG
fronts per definitive film (`film_ledger_panels.photo_svg`, pulled to
`photos.json`), and three modes: The Wall / The Backs / The Investigation
(merged Thread + Constellations: hold to light, click to follow, ember trail,
"step back" clustering). See `CHANGELOG.md` v3 for details and sync step
additions. `legacy-v1/` holds the old stacked-panel pipeline.

**Live artifact URL (stable — always pass this as `url` on republish):**
https://claude.ai/code/artifact/a58b1295-395f-4868-ba39-d4cbc5d87e94

## Source of truth

Everything lives in Supabase project `swjqlfcqvcrnydpyjyog`, tables
`film_ledger_panels`, `film_log`, `film_titles`, `film_taste_profile`.
Dixon's movie-night chats (wherever he runs the `movie-night` skill) write
there directly. This folder and the published artifact are a snapshot,
not the record.

## To sync the vault (run from this directory)

1. Pull current panels:
   ```sql
   select jsonb_agg(jsonb_build_object('slug', slug, 'palette_css', palette_css, 'panel_html', panel_html) order by slug)::text
   from film_ledger_panels;
   ```
   Save as `ledger_panels.json` (array of `{slug, palette_css, panel_html}`).
   If the SQL result gets written to a tool-result file instead of returned
   inline, extract the JSON payload out of the `<untrusted-data>` wrapper —
   see `extract_panels.py` for the pattern (regex must anchor on `\[.*\]`
   between the tags, not just the tag pair, since the surrounding prose
   mentions the tag name literally once before the real tag opens).

2. Regenerate `the-ledger.html`:
   ```
   python3 restore.py --from-json
   ```

3. Pull current scores/dates (latest live score wins per rewatch):
   ```sql
   select jsonb_object_agg(x.slug, jsonb_build_array(x.watched_at::text, x.rating, x.title))
   from (
     select distinct on (p.slug) p.slug, l.watched_at, l.rating, t.title
     from film_ledger_panels p
     join film_titles t on t.id = p.title_id
     join film_log l on l.title_id = p.title_id
     order by p.slug, l.watched_at desc
   ) x;
   ```
   Save as `ledger_meta.json`.

4. If anything new got certified this session (a `CERTIFY` paste-block),
   write `certified.json` — shape and rules in the movie-night SKILL.md.

4.5. Pull current fronts (v3; the bespoke scenes are blank without it):
   ```sql
   select jsonb_object_agg(slug, photo_svg)::text from film_ledger_panels
   where photo_svg is not null;
   ```
   Save as `photos.json`. New films get a scene authored on the Code side
   (236x236 viewBox, palette vars only, dead-center subject) and stored in
   `photo_svg` alongside the panel insert.

5. Pull current links (v2; optional, but the see-also layer and thread/
   constellations are empty without it):
   ```sql
   select jsonb_agg(jsonb_build_object('from', tf.title, 'to', tt.title,
     'relation', l.relation, 'note', l.note, 'weight', l.weight,
     'directional', l.directional, 'source', l.source) order by l.relation, tf.title)::text
   from film_links l
   join film_titles tf on tf.id = l.from_title_id
   join film_titles tt on tt.id = l.to_title_id;
   ```
   Save as `links.json`.

6. If a NEW panel needs hand-authoring (new film, new palette), author the
   `<section class="panel SLUG">` block + one palette line, add it to
   `ledger_panels.json` AND insert the `film_ledger_panels` row, add the slug
   to `ledger_meta.json`, then re-run `restore.py --from-json`. The panel
   structure is unchanged from v1 — the spatial wrapper is generated at build
   time, so panels stay portable.

7. Build:
   ```
   python3 vault.py
   ```
   (Needs `wall_template.html` next to it.) Watch the printed counts
   (ledger/archive/certified/hazy/links). If the drift guard fires, a Ledger
   title is still sitting in vault.py's hardcoded Archive or Hazy lists —
   remove it from there (and log a paired measurement in
   `film_taste_profile.content.vault_model.paired_measurements` in BOTH
   profile rows if it was an archive-scored rewatch).

8. Verify:
   ```
   python3 check.py
   ```
   14 checks. On this PC it drives system Chrome (playwright pip package,
   never `playwright install`); in the skill sandbox it uses
   /opt/pw-browsers/chromium.

9. Republish, reusing the same URL so the link never changes:
   ```
   Artifact({ file_path: ".../the-vault.html", url: "<the URL above>",
              favicon: "🎞️", title: "The Vault" })
   ```

10. If a new panel was hand-authored and step 6's insert somehow hasn't
    happened yet, insert it into `film_ledger_panels`
    (slug, title_id, palette_css, panel_html) before ending the session —
    this is the only reason the *next* sync has the panel to pull in step 1.

## Known fixes already applied here (and in the installed skill's reference/)

- `vault.py` / `restore.py` slug-matching regexes were `[a-z0-9]+`, which
  breaks on hyphenated slugs (e.g. `disclosure-day`). Widened to
  `[a-z0-9-]+` in both this copy and the skill's own `reference/` copy.
  If a freshly delivered `.skill` package ever reverts this, reapply it —
  it's a one-line sed: `s/\[a-z0-9\]+/[a-z0-9-]+/g` across `vault.py` and
  `restore.py`.

## What this environment does NOT have

- No `remote-devices` tool (desktop artifact staging/push). The original
  `the-ledger` desktop artifact ID from the skill's doctrine is not
  reachable from Code sessions — this folder + the URL above is the
  Code-side equivalent, not the same object.
- No Playwright — `check.py`'s 8-check verification can't run here. Verify
  visually via the Browser pane preview instead (open the built
  `the-vault.html` as a `file://` URL, screenshot, scroll through).
