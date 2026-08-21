# -*- coding: utf-8 -*-
"""
Wave T bespoke-room QA: fires a sequence of clicks/waits/key-holds at a
room loaded via ?room=<slug> and saves a screenshot after each named step.
Same conventions as peek.py/room_peek.py: system Chrome, DPR 2, never
`playwright install`. The walker (Wave M3) responds to plain WASD keydown/
keyup with no pointer lock required, and Touchable's onClick is a normal
R3F raycast handler that also works unlocked — so this never needs to
engage pointer lock at all, just fractional canvas clicks + held keys.

Usage: python scripts/wavet_peek.py <slug> <steps.json> [--url http://localhost:5174]
steps.json: a list of steps, each one of:
  {"shot": "name"}
  {"click": [fx, fy]}
  {"key": "KeyW", "ms": 600}
  {"wait": 500}
"""
import argparse, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
OUT = os.path.join(BASE, "_shots", "wavet")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("steps")
    ap.add_argument("--url", default="http://localhost:5174")
    ap.add_argument("--extra-hash", default="")
    ap.add_argument("--settle", type=int, default=2600)
    args = ap.parse_args()

    steps = json.loads(args.steps)

    from playwright.sync_api import sync_playwright
    os.makedirs(OUT, exist_ok=True)
    errors = []

    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", headless=True)
        page = b.new_context(viewport={"width": 1280, "height": 800}, device_scale_factor=2).new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        url = args.url + "/?nocold&noguide&room=" + args.slug + args.extra_hash
        page.goto(url, wait_until="networkidle")
        page.wait_for_selector("canvas", timeout=20000)
        page.wait_for_timeout(args.settle)

        box = page.locator("canvas").bounding_box()

        for step in steps:
            if "shot" in step:
                path = os.path.join(OUT, args.slug + "_" + step["shot"] + ".png")
                page.screenshot(path=path)
                print("->", os.path.relpath(path, BASE))
            elif "click" in step:
                fx, fy = step["click"]
                page.mouse.click(box["x"] + box["width"] * fx, box["y"] + box["height"] * fy)
                page.wait_for_timeout(step.get("wait", 400))
            elif "key" in step:
                page.keyboard.down(step["key"])
                page.wait_for_timeout(step.get("ms", 500))
                page.keyboard.up(step["key"])
                page.wait_for_timeout(step.get("wait", 150))
            elif "wait" in step:
                page.wait_for_timeout(step["wait"])
            elif "drag" in step:
                dx = step["drag"]
                cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
                page.mouse.move(cx, cy)
                page.mouse.down()
                steps_n = 24
                for i in range(steps_n):
                    page.mouse.move(cx + dx * (i + 1) / steps_n, cy)
                page.mouse.up()
                page.wait_for_timeout(step.get("wait", 400))

        b.close()

    real = [e for e in errors if "Download the React DevTools" not in e]
    for e in real[:12]:
        print("  console:", e[:220])


if __name__ == "__main__":
    main()
