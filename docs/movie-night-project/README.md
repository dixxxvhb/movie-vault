# Movie Night project: setup

Leonard lives in a claude.ai Project. The movie-night skill is the clerk that keeps the record. Plan: `docs/plans/2026-09-22-movie-night-v5.md`.

## One-time setup (claude.ai)

1. **Create the project.** claude.ai, Projects, new project, name it `Movie Night`.
2. **Instructions.** Paste the whole of `INSTRUCTIONS.md` (this folder) into the project's instructions.
3. **Connector.** Make sure the Supabase connector is on for the project (figgg, `swjqlfcqvcrnydpyjyog`). Web search on too, for where-to-stream checks.
4. **Skill.** Settings, Capabilities. Skills only run with code execution switched on there, so check that first. Then in Skills, upload `movie-night.skill` from the Desktop, replacing the old one. Rebuild it any time with:
   `PYTHONIOENCODING=utf-8 python -m scripts.package_skill ~/Code/movie-vault/docs/movie-night ~/Desktop` run from the skill-creator plugin folder.
5. **First night.** Open the project and just talk. Each night can be its own thread; the project memory carries across them.

## Editing

`INSTRUCTIONS.md` here is the source. Edit it in the repo, then paste it into the project again. Never edit only the pasted copy, or the next paste erases the change.
