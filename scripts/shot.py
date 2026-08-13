# -*- coding: utf-8 -*-
"""
Headless screenshots of the running Vault, one per station.

Why this exists: Chrome-MCP cannot reach this PC's localhost, and the in-app
browser pane stops compositing WebGL frames the moment it is hidden. Without
this script, every visual check costs a full deploy to GitHub Pages.

RULES FOR THIS REPO (learned the hard way, do not relax):
  * device_scale_factor is 2, ALWAYS. A wall-texture bug once shipped blank to
    Dixon's display because headless checks ran at DPR 1.
  * Uses the SYSTEM Chrome via channel="chrome". Never run `playwright install`.
  * Pixel checks, not just DOM checks. A previous version passed every
    structural assertion while rendering a black void.

Usage:
    python scripts/shot.py                  # against the dev server
    python scripts/shot.py --url http://localhost:4173
"""
import argparse
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
OUT = os.path.join(BASE, "_shots")

STATIONS = ["stand", "the ledger", "investigation", "the door", "the mirror"]


def sample(png_path):
    """Brightness stats off the SAVED PNG.

    Deliberately not read back from the WebGL canvas: the drawing buffer is
    cleared after compositing (preserveDrawingBuffer is false), so drawImage of
    a live three.js canvas returns transparent black and every check reports a
    void while the render is perfectly fine. The screenshot is the truth.
    """
    from PIL import Image

    im = Image.open(png_path).convert("L").resize((32, 32))
    px = list(im.tobytes())
    lit = sum(1 for v in px if v > 24)
    return {
        "mean": sum(px) / len(px),
        "max": max(px),
        "litFraction": lit / len(px),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:5173")
    ap.add_argument("--settle", type=int, default=2200,
                    help="ms to let textures decode and the flight land")
    args = ap.parse_args()

    from playwright.sync_api import sync_playwright

    os.makedirs(OUT, exist_ok=True)
    failures = []

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_context(
            viewport={"width": 1280, "height": 800},
            device_scale_factor=2,
        ).new_page()

        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        page.goto(args.url, wait_until="networkidle")
        page.wait_for_selector("canvas", timeout=20000)
        page.wait_for_timeout(args.settle)

        for name in STATIONS:
            try:
                page.get_by_role("button", name=name, exact=True).click()
            except Exception as e:
                failures.append("station %r not clickable: %s" % (name, e))
                continue
            page.wait_for_timeout(1400)

            slug = name.replace(" ", "-")
            path = os.path.join(OUT, "%s.png" % slug)
            page.screenshot(path=path)

            s = sample(path)
            if s["mean"] < 4 or s["litFraction"] < 0.10:
                failures.append(
                    "%s: looks like a void (mean %.1f, lit %.0f%%)"
                    % (name, s["mean"], s["litFraction"] * 100)
                )
            else:
                print("  %-14s mean %5.1f  max %5.1f  lit %3.0f%%  -> %s"
                      % (name, s["mean"], s["max"], s["litFraction"] * 100,
                         os.path.relpath(path, BASE)))

        # inspect: approach the wall, then pick a card off it. Clicking into
        # the canvas at a fixed point is crude but it is the only way to reach
        # a three.js object from outside the scene graph.
        try:
            page.get_by_role("button", name="the ledger", exact=True).click()
            page.wait_for_timeout(1400)
            box = page.locator("canvas").bounding_box()
            # into the dense band just under the 10 line, where the layout puts
            # the highest scores. Recheck this point if the hang changes shape.
            page.mouse.click(box["x"] + box["width"] * 0.50,
                             box["y"] + box["height"] * 0.30)
            page.wait_for_timeout(2000)
            path = os.path.join(OUT, "inspect.png")
            page.screenshot(path=path)
            s = sample(path)
            sheet = page.locator("text=case file").count()
            if sheet == 0:
                failures.append("inspect: no case file opened")
            else:
                print("  %-14s mean %5.1f  lit %3.0f%%  -> %s"
                      % ("inspect", s["mean"], s["litFraction"] * 100,
                         os.path.relpath(path, BASE)))
        except Exception as e:
            failures.append("inspect step: %s" % e)

        browser.close()

    real_errors = [e for e in errors if "Download the React DevTools" not in e]
    if real_errors:
        print("\nconsole errors:")
        for e in real_errors[:10]:
            print("  -", e[:200])

    if failures:
        print("\nFAILED:")
        for f in failures:
            print("  -", f)
        sys.exit(1)
    print("\nall stations rendered")


if __name__ == "__main__":
    main()
