# movie-vault — The Vault

Dixon's movie-night ledger as a first-person 3D motel room. Last verified: 2026-09-08.

## Stack
Vite 5 + React 18 + React-Three-Fiber (Three.js 0.161), drei, postprocessing, @react-three/xr.
Room is authored in metres so a WebXR pass needs no re-authoring. Data comes from Supabase
(figgg project) via `scripts/PULL.sql` into the JSON files under `data/`.

## Commands
```bash
npm run dev      # vite dev server
npm run build    # vite build
npm run preview  # serve the build
npm run data     # python scripts/emit_vault_data.py — regenerate data/ from the pull
npm run shot     # python scripts/shot.py — screenshot the room
```

## Where things live
- Plan: `docs/plans/2026-09-04-no-vacancy-plan.md` (NO VACANCY — the room number is the score).
- Running list: `docs/STATUS.md` — open, agreed, done, with commit hashes. Keep it current.
- Specs: `docs/IMMERSION-*.md`, `docs/movie-night/`, `docs/movie-night-v3/`.
- Deploy: GitHub Pages at https://dixxxvhb.github.io/movie-vault/ (free, auto on push to
  `master`). No Netlify here.

## Rules
- Repo docs use forward-slash paths (`C:/Users/bowle/...`) — backslashes break Tailwind globs.
- Commit with explicit paths; this repo has had parallel agent worktrees under
  `.claude/worktrees/`.
- Content rules for rooms: `docs/VAULT-IMMERSION-BRIEF-v2.md` §1, opened up 2026-09-22.
  Stills, actor faces, logos, real fonts and dialogue as text are allowed; the one hard line is
  no recorded film audio (soundtrack or dialogue files). Vendor imported images through the
  pipeline like posters.
- Visual and motion judgment: `~/.claude/design-taste.md`. This is a personal project, so no
  DWD branding and no Tamara Mark.
