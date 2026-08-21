# -*- coding: utf-8 -*-
"""
Ad hoc single-room screenshot helper for the batchB bespoke rooms
(Nightcrawler, Sorry to Bother You, Amadeus, Predestination). Modeled on
scripts/shot.py's own conventions (system Chrome, DPR 2, pixel checks on the
saved PNG, never `playwright install`), but scoped to one slug + one URL
per call rather than the full wall sweep, since these four rooms aren't part
of the standard station tour.

Usage:
    python scripts/room_peek.py nightcrawler out1.png
    python scripts/room_peek.py stby out2.png --extra-hash "&peekSwerve"
"""
import argparse
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
OUT = os.path.join(BASE, "_shots")


def sample(png_path):
    from PIL import Image
    im = Image.open(png_path).convert("L").resize((32, 32))
    px = list(im.tobytes())
    lit = sum(1 for v in px if v > 24)
    return {"mean": sum(px) / len(px), "max": max(px), "litFraction": lit / len(px)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("outname")
    ap.add_argument("--url", default="http://localhost:5177")
    ap.add_argument("--settle", type=int, default=2600)
    ap.add_argument("--extra-query", default="")
    args = ap.parse_args()

    from playwright.sync_api import sync_playwright

    os.makedirs(OUT, exist_ok=True)
    errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_context(
            viewport={"width": 1280, "height": 800},
            device_scale_factor=2,
        ).new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        url = args.url + "/?nocold&noguide&room=" + args.slug + args.extra_query
        page.goto(url, wait_until="networkidle")
        page.wait_for_selector("canvas", timeout=20000)
        page.wait_for_timeout(args.settle)

        path = os.path.join(OUT, args.outname)
        page.screenshot(path=path)
        s = sample(path)
        print("  %-16s mean %5.1f  max %5.1f  lit %3.0f%%  -> %s"
              % (args.slug, s["mean"], s["max"], s["litFraction"] * 100,
                 os.path.relpath(path, BASE)))
        if s["mean"] < 3 or s["litFraction"] < 0.05:
            print("  WARNING: looks like a void")

        browser.close()

    real_errors = [e for e in errors if "Download the React DevTools" not in e]
    if real_errors:
        print("console errors:")
        for e in real_errors[:15]:
            print("  -", e[:220])


if __name__ == "__main__":
    main()
