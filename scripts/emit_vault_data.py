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
LOG_EXTRA = load("log_extra.json")["films"]   # slug -> {vibes, rewatch}
# The Vault Immersion record (Phase 1, 2026-08-21): each film's own room shows
# the hot take verbatim + how it was watched. Pulled from Supabase alongside
# the rest of data/ -- see hot_takes.json's own _source note. Null-safe: a
# film with no take yet (a fresh addition to the wall) still emits, just with
# both fields null, and Default.jsx / InfoSurfaces.jsx already handle that.
HOT_TAKES = load("hot_takes.json")["takes"]  # slug -> {hot_take, context}

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
        # vibe_tags were authored on the night and had never been rendered.
        # They are what the lens filters on.
        "vibes": (LOG_EXTRA.get(slug) or {}).get("vibes") or [],
        # a rewatch is a film he came back to; the wall gives it a second pin.
        "rewatch": bool((LOG_EXTRA.get(slug) or {}).get("rewatch")),
        # film_log.emotional_key: one of tense/dread/fun/cozy/awe/sad/camp,
        # authored on all 47 films and never rendered until now. It is the
        # one taxonomy in this data that groups by FEEL rather than by score,
        # which is how a visitor actually decides which door to open, and
        # critically it does not leak the number.
        "key": (LOG_EXTRA.get(slug) or {}).get("key"),
        # the film's own room (Vault Immersion, Wave A): the hot take is
        # rendered VERBATIM there, never cleaned up -- see hot_takes.json.
        "hot_take": (HOT_TAKES.get(slug) or {}).get("hot_take"),
        "context": (HOT_TAKES.get(slug) or {}).get("context"),
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
# A bloodline whose other end is a film he has not watched yet used to be
# thrown away silently. Four of them were, and they are not broken data: they
# are the connections that point FORWARD. Sicario to Day of the Soldado.
# Ex Machina to Her. Memento to Run Lola Run. Coherence to The Vast of Night.
# Those are doors onto rooms that do not exist, which is a truer thing than a
# missing edge, so they now resolve against the queue and carry the state of
# each end. A room can render a door that will not open yet.
_QUEUE_TITLES = {q["title"] for q in load("queue.json")["queue"]}

def _link_end(title):
    s = as_slug(title)
    if s:
        return s, "wall"
    if title in _QUEUE_TITLES:
        return title, "queued"
    return None, None

for l in LINKS:
    a, a_state = _link_end(l.get("from"))
    b, b_state = _link_end(l.get("to"))
    if not a or not b:
        dropped += 1
        continue
    links.append({
        "from": a,
        "to": b,
        "fromState": a_state,
        "toState": b_state,
        "relation": l.get("relation"),
        "note": l.get("note"),
        "weight": l.get("weight") or 1,
        "directional": bool(l.get("directional")),
    })

QUEUE = load("queue.json")["queue"]        # the door: what's next

# ---------------------------------------------------------- where to watch it
#
# A queue is only useful if it tells you how to actually start the film, so each
# slip gets ONE line. The ranking is deliberate and it is about his wallet, not
# TMDB's ordering: free beats a service he already pays for, which beats a
# service he does not have, which beats renting. A film on eleven platforms he
# has never heard of is not "available", it is a rental.
PROV = load("providers.json")
MINE = PROV["mine"]

# TMDB writes the same service a dozen ways ("Paramount Plus Premium",
# "Paramount+ Amazon Channel"), so his subscriptions are matched on a stem
# rather than an exact string.
MINE_STEMS = {
    "amazon prime video": "Prime",
    "paramount plus": "Paramount+",
    "paramount+": "Paramount+",
    "peacock": "Peacock",
    "youtube": "YouTube",
}


def _short(name):
    n = (name or "").strip()
    for junk in (" Amazon Channel", " Apple TV Channel", " Roku Premium Channel", " Standard with Ads"):
        n = n.replace(junk, "")
    return {"YouTube Free": "YouTube", "Amazon Prime Video": "Prime",
            "Paramount Plus Premium": "Paramount+", "Paramount Plus Essential": "Paramount+",
            "Tubi TV": "Tubi", "Disney Plus": "Disney+"}.get(n, n)


def _mine(name):
    low = (name or "").lower()
    for stem, label in MINE_STEMS.items():
        if stem in low:
            return label
    return None


def where_to_watch(title):
    """One honest line, or None when there is genuinely nowhere to go."""
    p = PROV["titles"].get(title)
    if not p:
        return None
    # free first, and a free source he already uses beats one he does not
    for f in p.get("free") or []:
        if _mine(f):
            return "free on " + _mine(f)
    if p.get("free"):
        return "free on " + _short(p["free"][0])
    for f in p.get("flat") or []:
        if _mine(f):
            return "on " + _mine(f)
    if p.get("flat"):
        return "needs " + _short(p["flat"][0])
    if p.get("rent"):
        return "rent"
    return None


_where = 0
for q in QUEUE:
    w = where_to_watch(q.get("title"))
    q["where"] = w
    if w:
        _where += 1
LESSONS = load("lessons.json")["lessons"]  # the mirror: what he likes

# ---------------------------------------------------------------- the archive
#
# Films Dixon has watched but never scored live. His own doctrine sets the
# shape: every film is a photo taken the night it happened -- developed and hung
# (the Ledger), faded in the shoebox and scored from memory in pencil (the
# Shoebox), or an undeveloped dark frame awaiting the chemical bath of a rewatch
# (the Dark Drawer).
#
# The split is read from real registry columns (v3, 2026-08-26):
# film_titles.memory_score present puts the film in the Shoebox; seen_before
# with no score is a dark frame. The old seen_note prose parse (and its
# parenthesized-aside trap) is gone; the columns are the source of truth.
ARCHIVE_IN = load("archive.json")["archive"]
# Where a title has a snap_line, the print says that instead: one line about
# the film, in his own words.
ARCH_EXTRA = load("archive_extra.json")["titles"]

archive = []
_by_slug = {}
_dupes = []

for a in ARCHIVE_IN:
    # abandon_note covers walkouts (Cosmos): the note moved off seen_note when
    # abandonments became first-class columns.
    note = a.get("seen_note") or a.get("abandon_note") or ""
    memory = a.get("memory_score")
    memory = float(memory) if memory is not None else None

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
        "snap": (ARCH_EXTRA.get(a["title"]) or {}).get("snap"),
        "affinity": (ARCH_EXTRA.get(a["title"]) or {}).get("aff"),
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

# ------------------------------------------------------- the citation graph
#
# A taste law is a rule plus the films that taught it, and until now only the
# rule survived the pipeline. That mattered more than it looked: the whole
# progression design turns on "a law crystallises once you have walked the
# films it cites", and the lessons were shipping as bare {rule, weight}.
#
# The citations do not need hand-authoring. Every evidence string names its
# films in plain prose ("Malignant 5.4 versus Sorry to Bother You 9.4"), so
# the slugs are DERIVED by matching known titles against that prose. That
# keeps working for lesson 22 without anybody maintaining a join table.
#
# Longest title first, so "The Dark Knight Rises" is claimed before "The Dark
# Knight" can match inside it. Aliases cover the short forms he actually
# writes ("Maverick", "BR2049") and are the only hand-maintained part.
_ALIASES = {
    "Maverick": "maverick",
    "BR2049": "br2049",
    "Blade Runner 2049": "br2049",
    "Sorry to Bother You": "stby",
    "The Dark Knight Rises": "tdkr",
    "Catch Me If You Can": "cmiyc",
    "No Country for Old Men": "ncfom",
    "The Nice Guys": "niceguys",
    "Under the Silver Lake": "silverlake",
    "Poor Things": "poorthings",
    "Bullet Train": "bullettrain",
    "Ex Machina": "exmachina",
}

_title_to_slug = {f["title"]: f["slug"] for f in films}
_title_to_slug.update({a["title"]: a["slug"] for a in archive})
_title_to_slug.update(_ALIASES)
_titles_by_len = sorted(_title_to_slug, key=len, reverse=True)

_uncited = 0
for _lesson in LESSONS:
    _ev = _lesson.get("evidence") or ""
    _claimed = []
    _seen = set()
    _mask = _ev
    for _t in _titles_by_len:
        _i = _mask.find(_t)
        if _i < 0:
            continue
        _slug = _title_to_slug[_t]
        if _slug not in _seen:
            _seen.add(_slug)
            _claimed.append(_slug)
        # blank the span so a shorter title cannot match inside a longer one
        _mask = _mask[:_i] + (" " * len(_t)) + _mask[_i + len(_t):]
    # the film explicitly credited as the teacher always leads the list
    _tb = _lesson.get("taught_by")
    if _tb and _tb in _claimed:
        _claimed.remove(_tb)
    if _tb:
        _claimed.insert(0, _tb)
    _lesson["cites"] = _claimed
    if not _claimed:
        _uncited += 1

# ---------------------------------------------------------------- the cast
#
# Le Gamaar plan §12c. cast.json holds the top-billed cast for every ledger and
# archive film with a TMDB link. Only rooms that use faces get their cast
# emitted (vault-data.json stays small), and only those people's headshots are
# vendored, the same way posters are: downloaded once at build time into
# public/cast/<tmdb person id>.jpg, never hotlinked.
#
# faces[slug] is Familiar Faces: for each cast member of a face-using room, the
# OTHER ledger and archive films they are in, with who they played there.
CAST_ROOMS = {"inglourious-basterds"}
CAST_IN = load("cast.json") if os.path.exists(os.path.join(BASE, "data", "cast.json")) else {}
CAST_DIR = os.path.join(OUT_DIR, "cast")
HEADSHOT = "https://image.tmdb.org/t/p/w185"


def fetch_headshot(pid, path):
    if not path:
        return None
    dest = os.path.join(CAST_DIR, "%d.jpg" % pid)
    rel = "cast/%d.jpg" % pid
    if os.path.exists(dest) and os.path.getsize(dest) > 1024:
        return rel
    try:
        req = Request(HEADSHOT + path, headers={"User-Agent": "movie-vault/1.0"})
        blob = urlopen(req, timeout=30).read()
    except Exception as e:                      # noqa: BLE001 - report and carry on
        sys.stderr.write("headshot FAILED %d: %s\n" % (pid, e))
        return None
    if len(blob) < 1024:
        return None
    os.makedirs(CAST_DIR, exist_ok=True)
    with open(dest, "wb") as f:
        f.write(blob)
    print("  fetched %s %d KB" % (rel, len(blob) // 1024))
    return rel


_where_title = {s: META[s][2] for s in META}
_where_title.update({a["slug"]: a["title"] for a in archive})
_score = {s: META[s][1] for s in META}
_kind = {s: "ledger" for s in META}
_kind.update({a["slug"]: "archive" for a in archive})

cast_out = {}
faces_out = {}
for _slug in sorted(CAST_ROOMS):
    people = CAST_IN.get(_slug) or []
    if not people:
        sys.stderr.write("cast MISSING for face room %s\n" % _slug)
        continue
    cast_out[_slug] = [{"id": p["id"], "name": p["name"], "character": p.get("character"),
                        "order": p.get("order"), "photo": fetch_headshot(p["id"], p.get("profile"))}
                       for p in people]
    ids = {p["id"] for p in people}
    hits = {}
    for other, crew in CAST_IN.items():
        if other == _slug or other not in _kind:
            continue
        for p in crew:
            if p["id"] in ids:
                hits.setdefault(p["id"], []).append({
                    "slug": other, "kind": _kind[other], "title": _where_title.get(other, other),
                    "score": _score.get(other), "character": p.get("character")})
    faces_out[_slug] = [
        {"id": pid, "name": next(p["name"] for p in people if p["id"] == pid),
         "films": sorted(v, key=lambda x: (x["kind"] != "ledger", -(x["score"] or 0)))}
        for pid, v in sorted(hits.items(), key=lambda kv: next(p["order"] for p in people if p["id"] == kv[0]))]

data = {
    "generated_from": ("ledger_meta + ledger_panels + photos + titles + log_extra + links + "
                       "queue + providers + lessons + archive + archive_extra + quotes + cast"),
    "cast": cast_out,
    "faces": faces_out,
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
      "| links:", len(links),
      "(%d forward into the queue)" % sum(1 for l in links if l["toState"] == "queued"),
      ("(%d unresolved, dropped)" % dropped) if dropped else "")
print("  queue:", len(QUEUE), "(%d with a place to watch)" % _where, "| lessons:", len(LESSONS),
      "(%d cite films, %d cite none)" % (len(LESSONS) - _uncited, _uncited))
print("  vibes:", sum(1 for f in films if f["vibes"]),
      "| rewatches:", sum(1 for f in films if f["rewatch"]),
      "| snap lines:", sum(1 for a in archive if a.get("snap")),
      "| favourites:", sum(1 for a in archive if a.get("affinity") == "favorite"))
print("  hot takes:", sum(1 for f in films if f["hot_take"]), "/", len(films))
print("  shoebox:", len(shoebox), "| dark drawer:", len(drawer),
      "| archive posters:", sum(1 for a in archive if a["poster"]))
print("  quotes:", len(quotes),
      "(%d ledger, %d archive, %d loose)"
      % (sum(1 for q in quotes if q["where"] == "ledger"),
         sum(1 for q in quotes if q["where"] == "archive"),
         _loose))
