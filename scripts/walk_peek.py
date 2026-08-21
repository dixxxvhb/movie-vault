# -*- coding: utf-8 -*-
"""
Ad hoc: load a bespoke room, hold WASD to walk somewhere, optionally drag to
look, then screenshot. Same conventions as room_peek.py.

Usage:
    python scripts/walk_peek.py the-sting sting_behind --walk w --ms 3200 --turn 180
"""
import argparse
import os

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
OUT = os.path.join(BASE, "_shots")


def sample(png_path):
    from PIL import Image
    im = Image.open(png_path).convert("L").resize((32, 32))
    px = list(im.tobytes())
    return {"mean": sum(px) / len(px), "max": max(px), "litFraction": sum(1 for v in px if v > 24) / len(px)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("outname")
    ap.add_argument("--url", default="http://localhost:5181")
    ap.add_argument("--settle", type=int, default=8000)
    ap.add_argument("--walk", default="w", help="keys to hold, e.g. w or s or a")
    ap.add_argument("--ms", type=int, default=2000)
    ap.add_argument("--seq", default="", help="comma list of key:ms phases, e.g. d:1600,w:3200 (overrides --walk/--ms)")
    ap.add_argument("--turn", type=float, default=0, help="deg-ish drag amount, px")
    ap.add_argument("--extra-query", default="")
    ap.add_argument("--tap", default="", help="key to tap once before walking, e.g. i to hide the info record")
    args = ap.parse_args()

    from playwright.sync_api import sync_playwright
    os.makedirs(OUT, exist_ok=True)
    errors = []
    keymap = {'w': 'KeyW', 'a': 'KeyA', 's': 'KeyS', 'd': 'KeyD'}

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_context(viewport={"width": 1280, "height": 800}, device_scale_factor=2).new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        url = args.url + "/?nocold&noguide&room=" + args.slug + args.extra_query
        page.goto(url, wait_until="networkidle")
        page.wait_for_selector("canvas", timeout=20000)
        page.wait_for_timeout(args.settle)

        box = page.locator("canvas").bounding_box()
        cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2

        if args.tap:
            page.keyboard.press(args.tap)
            page.wait_for_timeout(300)

        if args.turn:
            page.mouse.move(cx, cy)
            page.mouse.down()
            steps = 20
            for i in range(steps):
                page.mouse.move(cx + args.turn * (i + 1) / steps, cy)
            page.mouse.up()
            page.wait_for_timeout(300)

        phases = []
        if args.seq:
            for part in args.seq.split(','):
                k, ms = part.split(':')
                phases.append((k, int(ms)))
        else:
            phases.append((args.walk, args.ms))

        for i, (keys, ms) in enumerate(phases):
            for k in keys:
                page.keyboard.down(keymap.get(k, k))
            page.wait_for_timeout(ms)
            for k in keys:
                page.keyboard.up(keymap.get(k, k))
            if len(phases) > 1:
                page.wait_for_timeout(200)
                p2 = os.path.join(OUT, args.outname.replace('.png', '') + '-p%d.png' % i)
                page.screenshot(path=p2)
                s = sample(p2)
                print("  phase %d (%s %dms) mean %5.1f lit %3.0f%% -> %s" % (i, keys, ms, s["mean"], s["litFraction"] * 100, os.path.relpath(p2, BASE)))
        page.wait_for_timeout(400)

        path = os.path.join(OUT, args.outname)
        page.screenshot(path=path)
        s = sample(path)
        print("  %-16s mean %5.1f  max %5.1f  lit %3.0f%%  -> %s"
              % (args.slug, s["mean"], s["max"], s["litFraction"] * 100, os.path.relpath(path, BASE)))
        browser.close()

    real_errors = [e for e in errors if "Download the React DevTools" not in e]
    if real_errors:
        print("console errors:")
        for e in real_errors[:15]:
            print("  -", e[:220])


if __name__ == "__main__":
    main()
