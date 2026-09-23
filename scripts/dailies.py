# -*- coding: utf-8 -*-
"""
Shoot one frame of the running Vault and add it to THE DAILIES (dailies.html).

Every visible build step gets one entry, so Dixon can watch the room come
together. Frames are real headless Chrome at DPR 2 (the repo's rule), taken
against the dev server the preview pane is showing.

    python scripts/dailies.py --space lobby --caption "The five cards are up." \
        --room inglourious-basterds --spot lobby
    python scripts/dailies.py --space wall --caption "The wall, 47 films." --url "/?nocold&noguide"
    python scripts/dailies.py --space lobby --caption "..." --room inglourious-basterds --spot lobby --phone
    python scripts/dailies.py --done rue           # light a space on the filmstrip
    python scripts/dailies.py --refresh            # just re-read the git log

Session number comes from --session or the DAILIES_SESSION env var (default 1).
"""
import argparse
import datetime
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
DATA_DIR = os.path.join(BASE, "_dailies")
DATA = os.path.join(DATA_DIR, "dailies.json")
SHOTS = os.path.join(BASE, "_shots", "dailies")
ORIGIN = os.environ.get("VAULT_ORIGIN", "http://localhost:5191")


def load():
    if os.path.exists(DATA):
        with open(DATA, encoding="utf-8") as f:
            return json.load(f)
    return {"entries": [], "done": [], "commits": []}


def save(d):
    os.makedirs(DATA_DIR, exist_ok=True)
    d["commits"] = commits()
    d["stamp"] = datetime.datetime.now().isoformat()
    tmp = DATA + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(d, f, indent=1, ensure_ascii=False)
    os.replace(tmp, DATA)


def commits():
    try:
        out = subprocess.run(["git", "log", "-5", "--format=%h\t%s"], cwd=BASE,
                             capture_output=True, text=True, encoding="utf-8").stdout
    except Exception:  # noqa: BLE001
        return []
    return [dict(zip(("h", "s"), line.split("\t", 1))) for line in out.splitlines() if "\t" in line]


def shoot(url, path, phone, settle, keys):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", args=["--use-angle=d3d11", "--enable-gpu"])
        vp = {"width": 390, "height": 844} if phone else {"width": 1440, "height": 900}
        ctx = b.new_context(viewport=vp, device_scale_factor=2, has_touch=phone, is_mobile=phone)
        page = ctx.new_page()
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(settle)
        for k in keys:
            if k.startswith("wait:"):
                page.wait_for_timeout(int(k[5:]))
            else:
                page.keyboard.press(k)
        page.screenshot(path=path)
        b.close()
    return errors


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--space")
    ap.add_argument("--caption")
    ap.add_argument("--room")
    ap.add_argument("--spot")
    ap.add_argument("--url", help="path+query on the dev server, e.g. /?nocold&noguide")
    ap.add_argument("--phone", action="store_true")
    ap.add_argument("--settle", type=int, default=3500)
    ap.add_argument("--keys", default="", help="comma list of keys to press before the shot, wait:ms allowed")
    ap.add_argument("--session", default=os.environ.get("DAILIES_SESSION", "1"))
    ap.add_argument("--ref", default="")
    ap.add_argument("--done")
    ap.add_argument("--refresh", action="store_true")
    a = ap.parse_args()

    d = load()
    if a.done:
        if a.done not in d["done"]:
            d["done"].append(a.done)
        save(d)
        print("lit", a.done)
        return
    if a.refresh:
        save(d)
        print("refreshed")
        return
    if not (a.space and a.caption):
        sys.exit("need --space and --caption")
    if "—" in a.caption or "–" in a.caption:
        sys.exit("caption has an em or en dash; rewrite it")

    if a.url:
        url = ORIGIN + a.url
    else:
        q = ["nocold", "noguide"]
        if a.room:
            q.append("room=" + a.room)
        if a.spot:
            q.append("spot=" + a.spot)
        url = ORIGIN + "/?" + "&".join(q)

    n = max([e["n"] for e in d["entries"]], default=0) + 1
    slug = re.sub(r"[^a-z0-9]+", "-", (a.spot or a.space).lower()).strip("-")
    name = "%03d-%s%s.png" % (n, slug, "-phone" if a.phone else "")
    os.makedirs(SHOTS, exist_ok=True)
    errors = shoot(url, os.path.join(SHOTS, name), a.phone,
                   a.settle, [k for k in a.keys.split(",") if k])

    d["entries"].append({
        "n": n, "t": datetime.datetime.now().isoformat(), "session": a.session,
        "space": a.space, "caption": a.caption, "shot": "/_shots/dailies/" + name,
        "phone": a.phone, "plan_ref": a.ref, "url": url,
    })
    save(d)
    print("No. %d  %s  %s" % (n, name, url))
    if errors:
        print("CONSOLE ERRORS (%d):" % len(errors))
        for e in errors[:8]:
            print("  ", e[:200])


if __name__ == "__main__":
    main()
