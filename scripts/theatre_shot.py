# Dailies helper for Le Gamaar's theatre: spot + optional reel / ignite + wait.
#   python scripts/theatre_shot.py <spot> <out.png> [--reel N|her] [--ignite] [--wait ms]
import argparse
from playwright.sync_api import sync_playwright
ap = argparse.ArgumentParser(); ap.add_argument('spot'); ap.add_argument('out')
ap.add_argument('--reel'); ap.add_argument('--ignite', action='store_true'); ap.add_argument('--wait', type=int, default=2500)
ap.add_argument('--phone', action='store_true')
a = ap.parse_args()
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", args=["--use-angle=d3d11"])
    vp = {"width": 390, "height": 844} if a.phone else {"width": 1440, "height": 900}
    pg = b.new_context(viewport=vp, device_scale_factor=2).new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
    pg.goto("http://localhost:5191/?nocold&noguide&room=inglourious-basterds&spot=" + a.spot, wait_until="networkidle")
    pg.wait_for_function("typeof window.__basterdsReel === 'function'", timeout=30000)
    pg.wait_for_timeout(5000)
    if a.reel: pg.evaluate("r => window.__basterdsReel(r)", int(a.reel) if a.reel.isdigit() else a.reel)
    if a.ignite: pg.evaluate("() => window.__basterdsIgnite()")
    pg.wait_for_timeout(a.wait)
    pg.screenshot(path=a.out)
    print('errors:', errs)
    b.close()
