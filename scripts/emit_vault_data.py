# -*- coding: utf-8 -*-
"""
Emit public/vault-data.json for the WebGL (React-Three-Fiber) Vault.

This is the bridge between the existing Python pipeline (Supabase -> the JSON
build inputs, drift-guarded) and the new 3D app. It reads the SAME inputs
vault.py uses -- it does NOT invent data. The 3D app is pure render; all film
facts live in Supabase and flow through here.

Milestone 1 scope: the Ledger films only (ledger_meta.json + ledger_panels.json
palettes + photos.json fronts). Archive/Hazy come in M2 via a shared data
module. Run from the repo root:  python scripts/emit_vault_data.py
"""
import io, os, re, json

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
OUT_DIR = os.path.join(BASE, "public")
OUT = os.path.join(OUT_DIR, "vault-data.json")


def load(name):
    p = os.path.join(BASE, name)
    return json.load(io.open(p, encoding="utf-8"))


META = load("ledger_meta.json")          # slug -> [date, score, title]
PANELS = load("ledger_panels.json")      # [{slug, palette_css, panel_html}]
PHOTOS = load("photos.json")             # slug -> svg (vars unresolved)

PAL_BY_SLUG = {p["slug"]: p["palette_css"] for p in PANELS}


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


films = []
for slug, (date, score, title) in META.items():
    pal = parse_palette(PAL_BY_SLUG.get(slug, ""))
    front = resolve_svg(PHOTOS.get(slug), pal)
    films.append({
        "slug": slug,
        "title": title,
        "score": float(score),
        "watched": date,
        "state": "ledger",
        "palette": pal,
        "front": front,          # SVG string, vars resolved, or null (glyph fallback)
    })

# score desc, then title -- the salon hang order (rank = height, computed app-side)
films.sort(key=lambda f: (-f["score"], f["title"].lower()))

data = {
    "generated_from": "ledger_meta.json + ledger_panels.json + photos.json",
    "count": len(films),
    "avg": round(sum(f["score"] for f in films) / len(films), 2),
    "films": films,
}

os.makedirs(OUT_DIR, exist_ok=True)
json.dump(data, io.open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("wrote", OUT, "-", data["count"], "films, avg", data["avg"],
      "-", sum(1 for f in films if f["front"]), "resolved fronts")
