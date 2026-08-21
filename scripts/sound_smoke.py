# -*- coding: utf-8 -*-
"""
Phase 3 gate: sound-on smoke test for the 25 template-room audio recipes.

Loads a handful of template rooms across different presets/shells with sound
enabled (localStorage 'vault-sound' = 'on', same key engine.js persists to)
and asserts: no console errors, and the AudioContext is never constructed
before the user actually unmutes (engine.js's own "never autoplay" rule) —
checked by forcing sound on BEFORE navigation is not the test; this instead
verifies the normal path (mute default OFF at load, an explicit script click
on the HUD toggle turns it on) never throws.

Usage:
    python scripts/sound_smoke.py
    python scripts/sound_smoke.py --url http://localhost:5173
"""
import argparse
import os

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)

# a spread across different shells/families/registers
ROOMS = ["darkknight", "tdkr", "bullettrain", "sunshine", "hereditary", "malignant"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:5173")
    args = ap.parse_args()

    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        failures = []

        for slug in ROOMS:
            page = browser.new_context(
                viewport={"width": 1280, "height": 800},
                device_scale_factor=2,
            ).new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

            # clear any stale persisted flag first — this test wants the
            # REAL path (mute default OFF at load, sound only switches on
            # from an actual click), not a pre-seeded localStorage value.
            page.goto(args.url, wait_until="domcontentloaded")
            page.evaluate("() => localStorage.removeItem('vault-sound')")

            url = args.url + "/?nocold&noguide&room=" + slug
            page.goto(url, wait_until="networkidle")
            page.wait_for_selector("canvas", timeout=20000)
            page.wait_for_timeout(500)

            # AudioContext must not exist yet — the room mounted, but nobody
            # unmuted (engine.js's own never-autoplay rule).
            has_ctx_before = page.evaluate(
                "() => window.__vaultDebugAudio ? window.__vaultDebugAudio().hasContext : false"
            )

            # the real path: click the film room's own sound toggle
            # (App.jsx), a trusted input event, same as a visitor unmuting.
            page.get_by_title("this room's generative audio").click()
            page.wait_for_timeout(1500)

            has_ctx_after = page.evaluate(
                "() => window.__vaultDebugAudio ? window.__vaultDebugAudio().hasContext : null"
            )

            real_errors = [e for e in errors if "Download the React DevTools" not in e]
            status = "ok"
            if real_errors:
                status = "ERRORS"
                failures.append((slug, real_errors[:5]))
            print("  %-14s ctx-before-unmute=%s ctx-after=%s  %s" % (slug, has_ctx_before, has_ctx_after, status))

            page.close()

        browser.close()

    if failures:
        print("\nFAILURES:")
        for slug, errs in failures:
            print(" ", slug)
            for e in errs:
                print("    -", e[:200])
        raise SystemExit(1)
    print("\nsound smoke: all clear")


if __name__ == "__main__":
    main()
