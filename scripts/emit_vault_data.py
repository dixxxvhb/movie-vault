# -*- coding: utf-8 -*-
"""
Emit public/vault-data.json for the WebGL (React-Three-Fiber) Vault.

This is the bridge between the existing Python pipeline (Supabase -> the JSON
build inputs, drift-guarded) and the new 3D app. It reads the SAME inputs
vault.py uses -- it does NOT invent data. The 3D app is pure render; all film
facts live in Supabase and flow through here.

Scope: the Ledger films (ledger_meta + ledger_panels + photos + titles), the
Archive (archive.json -> the Shoebox and the Dark Drawer), the links, the queue,
the lessons, and the quotes. Run from the repo root:

    python scripts/emit_vault_data.py
"""
import io, os, re, json, sys

try:
    from urllib.request import urlopen, Request
except ImportError:  # py2 safety, not expected here
    urlopen = None

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
OUT_DIR = os.path.join(BASE, "public")
OUT = os.path.join(OUT_DIR, "vault-data.json")


def load(name):
    p = os.path.join(BASE, "data", name)
    return json.load(io.open(p, encoding="utf-8"))


# data/ holds the Supabase-derived film data (pulled from project
# swjqlfcqvcrnydpyjyog). Refresh flow: re-pull these from Supabase, then
# `npm run data` to rebuild public/vault-data.json, then commit + redeploy.
META = load("ledger_meta.json")          # slug -> [date, score, title]
PANELS = load("ledger_panels.json")      # [{slug, palette_css, panel_html}]
PHOTOS = load("photos.json")             # slug -> svg (vars unresolved)
TITLES = load("titles.json")             # slug -> {year, runtime, poster, genres, director}

PAL_BY_SLUG = {p["slug"]: p["palette_css"] for p in PANELS}
PANEL_BY_SLUG = {p["slug"]: p.get("panel_html") for p in PANELS}

POSTER_DIR = os.path.join(OUT_DIR, "posters")
TMDB = "https://image.tmdb.org/t/p/w500"


def fetch_poster(slug, path):
    """Vendor the TMDB poster into public/posters/<slug>.jpg.

    Downloading at build time (rather than hotlinking) keeps the deployed page
    free of any third-party runtime dependency -- no CDN outage, no CSP
    surprise, no cross-origin texture taint. Idempotent: existing files are
    left alone, so a rebuild costs nothing.
    """
    if not path:
        return None
    dest = os.path.join(POSTER_DIR, slug + ".jpg")
    rel = "posters/%s.jpg" % slug
    if os.path.exists(dest) and os.path.getsize(dest) > 1024:
        return rel
    url = TMDB + path
    try:
        req = Request(url, headers={"User-Agent": "movie-vault/1.0"})
        blob = urlopen(req, timeout=30).read()
    except Exception as e:                      # noqa: BLE001 - report and carry on
        sys.stderr.write("poster FAILED %s: %s\n" % (slug, e))
        return None
    if len(blob) < 1024:
        sys.stderr.write("poster too small, skipping %s\n" % slug)
        return None
    os.makedirs(POSTER_DIR, exist_ok=True)
    with open(dest, "wb") as f:
        f.write(blob)
    print("  fetched", rel, len(blob) // 1024, "KB")
    return rel


def _first_hex(s):
    m = re.search(r"#[0-9A-Fa-f]{6}", s)
    return m.group(0) if m else None


def _lum(h):
    h = h.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return 0.299 * r + 0.587 * g + 0.114 * b


def parse_palette(css):
    """Resolve --bg/--fg/--sub/--acc/--glyph from a ledger palette line.
    Ledger palettes vary: some declare --bg, some use a `background:` gradient
    with no --bg, and none declare --acc. Fill sensible, always-visible
    fallbacks so the bespoke SVG fronts (which reference all four) resolve."""
    def var(name, default=None):
        m = re.search(r"--%s:\s*([^;}]+)" % name, css)
        return m.group(1).strip() if m else default

    fg = var("fg", "#EDE7DA")
    sub = var("sub", "#8B92A0")
    glyph = var("glyph", "")
    if glyph:
        glyph = glyph.strip().strip("'\"")
    bg = var("bg")
    if not bg:
        bgm = re.search(r"background:\s*([^;}]+)", css)
        bg = _first_hex(bgm.group(1)) if bgm else "#2A2620"
    acc = var("acc") or sub
    return {"bg": bg, "fg": fg, "sub": sub, "acc": acc, "glyph": glyph}


def resolve_svg(svg, pal):
    if not svg:
        return None
    out = svg
    for k in ("bg", "fg", "sub", "acc"):
        out = out.replace("var(--%s)" % k, pal[k])
    return out


# DRIFT GUARD. The local data/ files are a snapshot; the DB moves under them
# every movie night. Barbarian was watched, panelled and scored while the wall
# silently kept showing 33 films, because a panel with no ledger_meta row just
# vanishes from this loop. Anything present in one file and missing from the
# other is a stale pull, and it must be loud.
_panel_slugs = set(PANEL_BY_SLUG)
_meta_slugs = set(META)
_orphan_panels = sorted(_panel_slugs - _meta_slugs)
_missing_panels = sorted(_meta_slugs - _panel_slugs)
if _orphan_panels:
    sys.stderr.write(
        "DRIFT: %d panel(s) with no ledger_meta entry -> %s\n"
        "       data/ is behind the database. Re-pull before trusting this build.\n"
        % (len(_orphan_panels), ", ".join(_orphan_panels))
    )
if _missing_panels:
    sys.stderr.write(
        "DRIFT: %d ledger film(s) with no panel -> %s\n"
        % (len(_missing_panels), ", ".join(_missing_panels))
    )

films = []
for slug, (date, score, title) in META.items():
    pal = parse_palette(PAL_BY_SLUG.get(slug, ""))
    front = resolve_svg(PHOTOS.get(slug), pal)
    t = TITLES.get(slug) or {}
    films.append({
        "slug": slug,
        "title": title,
        "score": float(score),
        "watched": date,
        "state": "ledger",
        "palette": pal,
        "front": front,          # SVG string, vars resolved, or null (glyph fallback)
        "poster": fetch_poster(slug, t.get("poster")),
        "year": t.get("year"),
        "runtime": t.get("runtime"),
        "genres": t.get("genres") or [],
        "director": t.get("director") or [],
        "panel": PANEL_BY_SLUG.get(slug),   # the case file, read at inspect range
    })

# score desc, then title -- the salon hang order (rank = height, computed app-side)
films.sort(key=lambda f: (-f["score"], f["title"].lower()))

LINKS = load("links.json")   # authored bloodlines, from/to as TITLE strings

# links carry titles; the app works in slugs, so resolve once here
SLUG_BY_TITLE = {v[2].strip().lower(): k for k, v in META.items()}


def as_slug(name):
    return SLUG_BY_TITLE.get((name or "").strip().lower())


links = []
dropped = 0
for l in LINKS:
    a, b = as_slug(l.get("from")), as_slug(l.get("to"))
    if not a or not b:
        dropped += 1
        continue
    links.append({
        "from": a,
        "to": b,
        "relation": l.get("relation"),
        "note": l.get("note"),
        "weight": l.get("weight") or 1,
        "directional": bool(l.get("directional")),
    })

QUEUE = load("queue.json")["queue"]        # the door: what's next
LESSONS = load("lessons.json")["lessons"]  # the mirror: what he likes

# ---------------------------------------------------------------- the archive
#
# Films Dixon has watched but never scored live. His own doctrine sets the
# shape: every film is a photo taken the night it happened -- developed and hung
# (the Ledger), faded in the shoebox and scored from memory in pencil (the
# Shoebox), or an undeveloped dark frame awaiting the chemical bath of a rewatch
# (the Dark Drawer).
#
# The split is read out of seen_note, which is prose, not an enum. A memory
# score anywhere in the note puts the film in the Shoebox; everything else is a
# dark frame. Notes matching NEITHER known shape are reported rather than
# silently binned -- the same reasoning as the drift guard above.
ARCHIVE_IN = load("archive.json")["archive"]

MEMORY_RE = re.compile(r"memory\s+(\d+(?:\.\d+)?)", re.I)
KNOWN_DARK_RE = re.compile(r"hazy|no memory score", re.I)

archive = []
_by_slug = {}
_unclassified = []
_dupes = []

for a in ARCHIVE_IN:
    note = a.get("seen_note") or ""
    m = MEMORY_RE.search(note)
    memory = float(m.group(1)) if m else None
    if memory is None and not KNOWN_DARK_RE.search(note):
        _unclassified.append("%s -> %r" % (a["slug"], note))

    row = {
        "slug": a["slug"],
        "title": a["title"],
        "year": a.get("year"),
        # SHOEBOX = scored from memory, in pencil. DRAWER = undeveloped.
        "kind": "shoebox" if memory is not None else "drawer",
        "memory": memory,
        "note": note,
        "poster": None,          # filled below, only for rows that survive dedupe
        "poster_path": a.get("poster"),
        "genres": a.get("genres") or [],
        "director": a.get("director") or [],
        "runtime": a.get("runtime"),
    }

    # The DB carries The Prestige twice: one archive row with a memory score and
    # a poster, one bare "confirmed seen" row. Keep the richer one rather than
    # letting import order decide, and say so.
    prev = _by_slug.get(row["slug"])
    if prev is None:
        _by_slug[row["slug"]] = row
        archive.append(row)
        continue
    _dupes.append(row["slug"])
    better = (row["memory"] is not None, bool(row["poster_path"]))
    worse = (prev["memory"] is not None, bool(prev["poster_path"]))
    if better > worse:
        archive[archive.index(prev)] = row
        _by_slug[row["slug"]] = row

for row in archive:
    row["poster"] = fetch_poster(row["slug"], row["poster_path"])
    row.pop("poster_path")

# Shoebox descends by remembered score; the Dark Drawer has no score to sort by,
# so it sits in alphabetical order -- an unsorted pile would imply a ranking.
shoebox = sorted([a for a in archive if a["kind"] == "shoebox"],
                 key=lambda a: (-a["memory"], a["title"].lower()))
drawer = sorted([a for a in archive if a["kind"] == "drawer"],
                key=lambda a: a["title"].lower())

if _dupes:
    sys.stderr.write("ARCHIVE: %d duplicate slug(s) merged -> %s\n"
                     % (len(_dupes), ", ".join(sorted(set(_dupes)))))
if _unclassified:
    sys.stderr.write(
        "ARCHIVE: %d seen_note(s) match no known shape (filed as dark frames):\n  %s\n"
        % (len(_unclassified), "\n  ".join(_unclassified))
    )

# ----------------------------------------------------------------- the quotes
#
# Marginalia, not a sixth wall. A quote hangs beside its film when that film is
# on a wall or in the archive; a quote whose film is neither (Veep, Star Trek
# Beyond -- television, never scored) goes loose into the Dark Drawer.
QUOTES_IN = load("quotes.json")["quotes"]

ARCHIVE_SLUG_BY_TITLE = {a["title"].strip().lower(): a["slug"] for a in archive}

quotes = []
_loose = 0
for q in QUOTES_IN:
    name = (q.get("film") or "").strip().lower()
    slug = SLUG_BY_TITLE.get(name)
    where = "ledger" if slug else None
    if not slug:
        slug = ARCHIVE_SLUG_BY_TITLE.get(name)
        where = "archive" if slug else "loose"
    if where == "loose":
        _loose += 1
    quotes.append({
        "film": q.get("film"),
        "slug": slug,          # None for loose scraps
        "where": where,
        "quote": q.get("quote"),
        "said_by": q.get("said_by"),
    })

data = {
    "generated_from": "ledger_meta + ledger_panels + photos + titles + links + queue + lessons + archive + quotes",
    "queue": QUEUE,
    "lessons": LESSONS,
    "count": len(films),
    "avg": round(sum(f["score"] for f in films) / len(films), 2),
    "films": films,
    "links": links,
    "shoebox": shoebox,
    "drawer": drawer,
    "quotes": quotes,
}

os.makedirs(OUT_DIR, exist_ok=True)
json.dump(data, io.open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("wrote", OUT, "-", data["count"], "films, avg", data["avg"])
print("  fronts:", sum(1 for f in films if f["front"]),
      "| posters:", sum(1 for f in films if f["poster"]),
      "| panels:", sum(1 for f in films if f["panel"]),
      "| links:", len(links), ("(%d unresolved, dropped)" % dropped) if dropped else "")
print("  queue:", len(QUEUE), "| lessons:", len(LESSONS))
print("  shoebox:", len(shoebox), "| dark drawer:", len(drawer),
      "| archive posters:", sum(1 for a in archive if a["poster"]))
print("  quotes:", len(quotes),
      "(%d ledger, %d archive, %d loose)"
      % (sum(1 for q in quotes if q["where"] == "ledger"),
         sum(1 for q in quotes if q["where"] == "archive"),
         _loose))
