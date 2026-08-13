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

The Ledger is a value axis, not a leaderboard. `y` maps linearly from score 5.0
to 10.0, so equal scores hang at equal height and the distance between two
Polaroids is the real distance in how he felt. Cards that would collide spread
sideways (a beeswarm); nothing is ever moved vertically to make room, because
that would be lying about a score. Pencil rules mark 6 through 10 and the
current average, so the axis is legible without being explained.

Navigation is **click-to-station**: stand and drag to look, click a wall to
approach, Esc to stand back. Clicking a Polaroid flies to it, turns it over and
opens its case file.

## Layout

```
src/            App (room + layout), Room, CameraRig, Polaroid, CaseFile,
                Strings, Notes, roomTextures, vaultTextures
data/           Supabase-derived data, pulled from project swjqlfcqvcrnydpyjyog
scripts/        emit_vault_data.py (data -> public/vault-data.json, fetches
                posters), shot.py (headless screenshots + pixel checks)
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
- **Next:** the Shoebox and Dark Drawer (archive films), quotes as pinned
  scraps, cold open, WebXR.

Full plan and the locked design rulings: `VAULT-V6-PLAN.md`.
