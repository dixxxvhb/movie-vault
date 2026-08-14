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

STATIONS = ["stand", "the ledger", "investigation", "the door", "the mirror",
            "the shoebox", "the drawer"]


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


def sample_half(png_path, side):
    """Brightness stats for one half of the image — i.e. one eye."""
    from PIL import Image

    im = Image.open(png_path).convert("L")
    w, h = im.size
    box = (0, 0, w // 2, h) if side == "left" else (w // 2, 0, w, h)
    im = im.crop(box).resize((32, 32))
    px = list(im.tobytes())
    lit = sum(1 for v in px if v > 24)
    return {"mean": sum(px) / len(px), "litFraction": lit / len(px), "px": px}


def check_xr(page, failures):
    """Enter an emulated immersive session and prove the room renders in stereo.

    Only possible against the dev server: the emulator is dev-only and behind
    ?xrsim, so a production build has no way to fake a headset (by design —
    shipping IWER to real visitors would be megabytes for nothing).
    """
    page.goto(page.url.split("?")[0] + "?nocold&noguide&xrsim", wait_until="networkidle")
    page.wait_for_selector("canvas", timeout=20000)
    page.wait_for_timeout(2500)

    if not page.evaluate("!!window.__xrEmulator"):
        failures.append("xr: emulator did not install (?xrsim)")
        return
    if not page.evaluate("navigator.xr.isSessionSupported('immersive-vr')"):
        failures.append("xr: immersive-vr reported unsupported after emulator install")
        return

    # The session's own canvas overlays the page and swallows real pointer
    # events — exactly as a headset would — so the button is invoked directly.
    page.evaluate(
        "[...document.querySelectorAll('button')]"
        ".find(b => b.textContent.trim() === 'enter vr').click()"
    )
    page.wait_for_timeout(4000)

    if not page.evaluate("!!(window.__xrEmulator && window.__xrEmulator.activeSession)"):
        failures.append("xr: no active session after pressing enter vr")
        return

    path = os.path.join(OUT, "xr.png")
    page.screenshot(path=path)
    left, right = sample_half(path, "left"), sample_half(path, "right")

    if left["mean"] < 4 or left["litFraction"] < 0.10:
        failures.append("xr: left eye is a void (mean %.1f)" % left["mean"])
    if right["mean"] < 4 or right["litFraction"] < 0.10:
        failures.append("xr: right eye is a void (mean %.1f)" % right["mean"])
    # Two eyes must differ: identical halves mean one image is being stretched
    # across the frame rather than a real stereo pair being rendered.
    if left["px"] == right["px"]:
        failures.append("xr: both eyes are pixel-identical — not rendering in stereo")
    if not failures:
        print("  %-14s left %5.1f  right %5.1f  stereo pair -> %s"
              % ("xr session", left["mean"], right["mean"],
                 os.path.relpath(path, BASE)))


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

        # ?nocold skips the wake-up blink. Without it every station shot would
        # race a 3.4s black overlay, and the harness would be timing an
        # animation instead of checking a render. The blink gets its own shot
        # at the end, where the timing is the point.
        url = args.url + ("&" if "?" in args.url else "?") + "nocold&noguide"
        page.goto(url, wait_until="networkidle")
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

        # The cold open. Checked by timing, not by looking: the lids must
        # actually cover the room early on and must be gone by the end. A blink
        # that renders but never darkens anything is the failure mode here.
        try:
            # NOT networkidle: waiting for idle burns 2-3s and the blink is
            # over by then, so the "early" frame came back as a fully lit room
            # and the check silently proved nothing. Grab the first frame the
            # document will give us instead.
            page.goto(args.url, wait_until="domcontentloaded")
            page.wait_for_selector("canvas", timeout=20000)
            early = os.path.join(OUT, "coldopen.png")
            page.screenshot(path=early)
            e_s = sample(early)
            # A mid frame, because "black, then room" would also be the
            # signature of a 3.4s black screen with no blink in it at all. The
            # lids have to be demonstrably part-open partway through.
            page.wait_for_timeout(900)
            mid = os.path.join(OUT, "coldopen-mid.png")
            page.screenshot(path=mid)
            m_s = sample(mid)
            page.wait_for_timeout(2700)
            late = os.path.join(OUT, "coldopen-after.png")
            page.screenshot(path=late)
            l_s = sample(late)
            if e_s["mean"] >= l_s["mean"]:
                failures.append(
                    "cold open: not covering (early mean %.1f >= settled mean %.1f)"
                    % (e_s["mean"], l_s["mean"])
                )
            elif l_s["mean"] < 4:
                failures.append("cold open: never lifted (settled mean %.1f)" % l_s["mean"])
            elif not (e_s["mean"] < m_s["mean"] < l_s["mean"]):
                failures.append(
                    "cold open: no blink between the ends (%.1f -> %.1f -> %.1f)"
                    % (e_s["mean"], m_s["mean"], l_s["mean"])
                )
            else:
                print("  %-14s shut %.1f -> blinking %.1f -> open %.1f  -> %s"
                      % ("cold open", e_s["mean"], m_s["mean"], l_s["mean"],
                         os.path.relpath(mid, BASE)))
        except Exception as e:
            failures.append("cold open step: %s" % e)

        # WebXR, against the dev server only.
        if "localhost" in args.url or "127.0.0.1" in args.url:
            try:
                check_xr(page, failures)
            except Exception as e:
                failures.append("xr step: %s" % e)
        else:
            print("  %-14s skipped (emulator is dev-only; test XR on localhost)" % "xr session")

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
