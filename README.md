# The Vault

Dixon's movie-night ledger as a WebGL room — a real 3D space you fly around,
with every scored film hung as a Polaroid. Built with **Vite + React-Three-Fiber
(Three.js)**.

**Live:** https://dixxxvhb.github.io/movie-vault/

This is the one home for the Vault. (It used to be a Claude artifact; that era
is retired — see the git history before commit `HEAD` if you ever need it.)

## Layout

```
src/            the R3F app (App = room + camera, Polaroid = one hung card)
data/           Supabase-derived film data (the source of truth, pulled from
                project swjqlfcqvcrnydpyjyog)
scripts/        emit_vault_data.py — data/ -> public/vault-data.json
public/         static assets incl. the emitted vault-data.json the app fetches
ci/deploy.yml   the Pages auto-deploy workflow, parked until the gh token has
                `workflow` scope (then move it to .github/workflows/)
```

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
```

## Refresh the film data (after a movie-night chat updates Supabase)

Re-pull the four files in `data/` from Supabase, then:

```bash
npm run data         # rebuilds public/vault-data.json from data/
```

## Deploy

Auto-deploy on push is set up in `ci/deploy.yml` but needs the `gh` token's
`workflow` scope (`gh auth refresh -s workflow`) before it can live under
`.github/workflows/`. Until then, deploy is the gh-pages branch:

```bash
npm run build
# publish dist/ to the gh-pages branch (served at the live URL above)
```

## Milestones

- **M1 (shipped):** 31 Ledger films in a 3D room, salon hang, hover, orbit,
  click-to-inspect.
- **M2+:** the Shoebox/Hazy archive films, click-to-read full hot-takes, the
  Investigation links web, real room detail + lighting, game-style walk-around.
