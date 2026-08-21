# -*- coding: utf-8 -*-
"""
Phase 3 gate: three peeks of the certify-develops-the-room bloom
(useRoomDevelop.js) on a shoebox print's own room, at 0s / 1.5s / 3s, via
the `?develop=<slug>` debug query landed straight in that print's room
(`?printroom=<slug>`, same convention every other room-shaped query param
in App.jsx already follows).

Usage:
    python scripts/develop_peek.py arrival
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
    return {"mean": sum(px) / len(px), "max": max(px)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--url", default="http://localhost:5173")
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

        url = args.url + "/?nocold&noguide&printroom=" + args.slug + "&develop=" + args.slug
        page.goto(url, wait_until="networkidle")
        page.wait_for_selector("canvas", timeout=20000)

        # timestamped relative to the FIRST screenshot (right after the
        # canvas appears, effectively t=0 for the develop animation, which
        # starts on this room's own mount) rather than to wall-clock page
        # load, which varies run to run and previously made the 1.5s/3s
        # checkpoints land past the animation's own end.
        import time
        t0 = time.monotonic()
        checkpoints = [0, 1.5, 3.0]
        for target in checkpoints:
            elapsed = time.monotonic() - t0
            remaining_ms = max(0, int((target - elapsed) * 1000))
            if remaining_ms:
                page.wait_for_timeout(remaining_ms)
            label = ("%.1fs" % target).replace(".", "_")
            path = os.path.join(OUT, "develop-%s-%s.png" % (args.slug, label))
            page.screenshot(path=path)
            s = sample(path)
            print("  %5.1fs  mean %5.1f  max %5.1f  -> %s" % (target, s["mean"], s["max"], os.path.relpath(path, BASE)))

        browser.close()

    real_errors = [e for e in errors if "Download the React DevTools" not in e]
    if real_errors:
        print("console errors:")
        for e in real_errors[:15]:
            print("  -", e[:220])


if __name__ == "__main__":
    main()
