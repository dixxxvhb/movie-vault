# -*- coding: utf-8 -*-
"""Quick single-frame look while iterating. Same rules as shot.py: system
Chrome, device_scale_factor 2, sample the SAVED png (never the live canvas).

    python scripts/peek.py --click 0.50,0.30 --station "the ledger" --out inspect
    python scripts/peek.py --station stand --drag 400 --zoom 6
"""
import argparse, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
OUT = os.path.join(BASE, "_shots")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:5173")
    ap.add_argument("--room", default=None, help="?room=<slug> instead of the wall")
    ap.add_argument("--info-off", action="store_true", help="press i after settling")
    ap.add_argument("--fps", action="store_true", help="print window.__vaultFps after settling")
    ap.add_argument("--station", default=None)
    ap.add_argument("--click", default=None, help="fractional x,y in the canvas")
    ap.add_argument("--drag", type=float, default=0, help="px of horizontal look-drag")
    ap.add_argument("--zoom", type=float, default=0, help="wheel notches (+in / -out)")
    ap.add_argument("--guide", action="store_true", help="open the ? card")
    ap.add_argument("--out", default="peek")
    ap.add_argument("--settle", type=int, default=2200)
    args = ap.parse_args()

    from playwright.sync_api import sync_playwright
    os.makedirs(OUT, exist_ok=True)
    errors = []

    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", headless=True)
        page = b.new_context(viewport={"width": 1280, "height": 800},
                             device_scale_factor=2).new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        url = args.url + ("&" if "?" in args.url else "?") + "nocold&noguide"
        if args.room:
            url += "&room=" + args.room
        page.goto(url, wait_until="networkidle")
        page.wait_for_selector("canvas", timeout=20000)
        page.wait_for_timeout(args.settle)

        if args.info_off:
            page.keyboard.press("i")
            page.wait_for_timeout(400)

        if args.station:
            page.get_by_role("button", name=args.station, exact=True).click()
            page.wait_for_timeout(1500)

        box = page.locator("canvas").bounding_box()
        if args.click:
            fx, fy = [float(v) for v in args.click.split(",")]
            page.mouse.click(box["x"] + box["width"] * fx, box["y"] + box["height"] * fy)
            page.wait_for_timeout(2000)

        if args.drag:
            page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            page.mouse.down()
            steps = 20
            for i in range(steps):
                page.mouse.move(box["x"] + box["width"] / 2 + args.drag * (i + 1) / steps,
                                box["y"] + box["height"] / 2)
            page.mouse.up()
            page.wait_for_timeout(900)

        if args.zoom:
            page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            for _ in range(int(abs(args.zoom))):
                page.mouse.wheel(0, -120 if args.zoom > 0 else 120)
                page.wait_for_timeout(60)
            page.wait_for_timeout(900)

        if args.guide:
            page.get_by_role("button", name="what is this", exact=True).click()
            page.wait_for_timeout(700)

        if args.fps:
            page.wait_for_timeout(1500)
            try:
                print("fps", page.evaluate("window.__vaultFps"))
            except Exception:
                pass

        path = os.path.join(OUT, args.out + ".png")
        page.screenshot(path=path)
        print("->", os.path.relpath(path, BASE))
        b.close()

    real = [e for e in errors if "Download the React DevTools" not in e]
    for e in real[:8]:
        print("  console:", e[:220])
    if real:
        sys.exit(1)


if __name__ == "__main__":
    main()
