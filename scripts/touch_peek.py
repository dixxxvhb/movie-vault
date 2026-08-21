# -*- coding: utf-8 -*-
"""
Wave T verification helper: load one bespoke room, click a touchable at a
given fractional canvas point, and grab before/during/after screenshots so
the physical response (ripple, lock, ring, ink, brake flash, spotlight
snap, pause) can be read straight off the PNGs. Same conventions as
room_peek.py/shot.py: system Chrome, DPR 2, sample the saved PNG.

Usage:
    python scripts/touch_peek.py br2049 0.5,0.62 br2049 --before 300 --during 600 --after 2200
    python scripts/touch_peek.py baby-driver 0.42,0.58 babydriver --frames 3 --frame-gap 300
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
    ap.add_argument("click", help="fractional x,y on the canvas")
    ap.add_argument("outprefix")
    ap.add_argument("--url", default="http://localhost:5175")
    ap.add_argument("--settle", type=int, default=2600)
    ap.add_argument("--before", type=int, default=300, help="ms to wait before clicking, for the 'before' frame")
    ap.add_argument("--after", type=int, default=2200, help="ms after click for the 'after' frame")
    ap.add_argument("--extra-query", default="")
    ap.add_argument("--frames", type=int, default=0, help="if >0, take N extra frames after click at --frame-gap ms apart instead of one 'during'/'after' pair")
    ap.add_argument("--frame-gap", type=int, default=300)
    ap.add_argument("--during", type=int, default=250, help="ms after click for the 'during' frame")
    args = ap.parse_args()

    from playwright.sync_api import sync_playwright

    os.makedirs(OUT, exist_ok=True)
    errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_context(viewport={"width": 1280, "height": 800}, device_scale_factor=2).new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        url = args.url + "/?nocold&noguide&room=" + args.slug + args.extra_query
        page.goto(url, wait_until="networkidle")
        page.wait_for_selector("canvas", timeout=20000)
        page.wait_for_timeout(args.settle)

        before_path = os.path.join(OUT, args.outprefix + "-before.png")
        page.screenshot(path=before_path)

        box = page.locator("canvas").bounding_box()
        fx, fy = [float(v) for v in args.click.split(",")]
        cx, cy = box["x"] + box["width"] * fx, box["y"] + box["height"] * fy
        page.mouse.click(cx, cy)

        if args.frames > 0:
            for i in range(args.frames):
                page.wait_for_timeout(args.frame_gap)
                p2 = os.path.join(OUT, "%s-f%d.png" % (args.outprefix, i))
                page.screenshot(path=p2)
        else:
            page.wait_for_timeout(args.during)
            during_path = os.path.join(OUT, args.outprefix + "-during.png")
            page.screenshot(path=during_path)
            page.wait_for_timeout(max(0, args.after - args.during))
            after_path = os.path.join(OUT, args.outprefix + "-after.png")
            page.screenshot(path=after_path)

        s = sample(before_path)
        print("  %-16s before mean %5.1f max %5.1f lit %3.0f%%" % (args.slug, s["mean"], s["max"], s["litFraction"] * 100))
        browser.close()

    real_errors = [e for e in errors if "Download the React DevTools" not in e]
    if real_errors:
        print("console errors:")
        for e in real_errors[:15]:
            print("  -", e[:220])


if __name__ == "__main__":
    main()
