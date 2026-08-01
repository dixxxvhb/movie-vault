# -*- coding: utf-8 -*-
"""
The Vault, salon-wall check suite (pipeline v3).
17 checks, superset of the old v2 suite. Run after every build.

v3 changes this suite covers:
  - modes collapsed to wall / backs / invest (const + thread are gone)
  - The Investigation: hold to light kin, click a lit kin to traverse
    (ember trail), notecard flashes the link note, re-lights from the
    new photo. Leaving the mode clears every ember + thread line.
  - "step back" is a sub-toggle inside invest mode (not its own mode)
  - the wall is a salon hang, not grid rows: verify distinct positions
    and band-descending vertical order instead of row/col math
  - archive/hazy photos scale via --sc (.56 / .5) and lose their tape
  - archive photos carry an .awaiting element until certified, which
    also snaps --sc back to 1; undo restores .awaiting and --sc .56
  - go-to chips are def/box/hazy/all -> "The wall" / "The shoebox" /
    "The dark drawer" / "The room"
  - 24 ledger photos have bespoke SVG fronts (.img.hasphoto > svg)

Browser resolution order:
  1. /opt/pw-browsers/chromium (the skill sandbox; never run `playwright install`)
  2. PW_CHROMIUM env var (explicit executable)
  3. system Chrome, then Edge channel (this PC)
A Google Fonts ERR_TUNNEL_CONNECTION_FAILED (or generic fonts fetch failure)
is benign and environmental; it is filtered, not fixed.
"""
import asyncio, sys, os, subprocess, filecmp, tempfile, shutil
from playwright.async_api import async_playwright

_here = os.path.dirname(os.path.abspath(__file__))
BASE = os.environ.get("VAULT_DIR") or (
    _here if os.path.exists(os.path.join(_here, "the-vault.html"))
    else os.path.dirname(_here))

URL = "file://" + os.path.join(BASE, "the-vault.html").replace("\\", "/")
SHOT = os.path.join(BASE, "v-wall.png")

FONT_NOISE = ("fonts.googleapis.com", "ERR_TUNNEL_CONNECTION_FAILED",
              "Failed to load resource")

# band ranges, matching wall_template.html's BANDS (highest first)
BAND_RANGES = [(10.0, 10.0), (9.0, 9.99), (8.0, 8.99), (7.0, 7.99), (0, 6.99)]

def band_of(score):
    for i, (lo, hi) in enumerate(BAND_RANGES):
        if lo <= score <= hi:
            return i
    return len(BAND_RANGES)

def launch_opts():
    if os.path.exists("/opt/pw-browsers/chromium"):
        return {"executable_path": "/opt/pw-browsers/chromium"}
    if os.environ.get("PW_CHROMIUM"):
        return {"executable_path": os.environ["PW_CHROMIUM"]}
    return {"channel": "chrome"}

PASS = []
def ok(n, msg):
    PASS.append(n)
    print("  %2d. %s" % (n, msg))

async def main():
    errs = []
    async with async_playwright() as pw:
        try:
            b = await pw.chromium.launch(**launch_opts())
        except Exception:
            b = await pw.chromium.launch(channel="msedge")
        pg = await b.new_page(viewport={"width": 1280, "height": 900})
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        await pg.goto(URL)
        await pg.wait_for_timeout(2400)   # let the chemicals develop

        # -- 1. every panel became a photo; counts per state ------------------
        counts = await pg.evaluate("""()=>({
          sections: document.querySelectorAll('#source section.panel, .backscale section.panel').length,
          photos: photos.length,
          ledger: photos.filter(p=>p.state==='ledger').length,
          arc: photos.filter(p=>p.state==='arc').length,
          cert: photos.filter(p=>p.state==='cert').length,
          hazy: photos.filter(p=>p.state==='hazy').length})""")
        assert counts["photos"] == counts["sections"], counts
        assert counts["ledger"] == 24, counts
        assert counts["arc"] == 33 and counts["hazy"] == 15, counts
        ok(1, "all %d films render: %d ledger / %d archive / %d certified / %d hazy"
           % (counts["photos"], counts["ledger"], counts["arc"], counts["cert"], counts["hazy"]))

        # -- 2. the salon hang: distinct positions, bands descend -------------
        rows = await pg.evaluate("""()=>photos
          .filter(p=>p.state==='ledger'||p.state==='cert')
          .map(p=>({key:p.key, score:p.score,
            top: parseFloat(p.el.style.top), left: parseFloat(p.el.style.left)}))""")
        posset = set((round(r["left"], 1), round(r["top"], 1)) for r in rows)
        assert len(posset) == len(rows), ("positions collide", len(posset), len(rows))
        tagged = [(band_of(r["score"]), r["top"], r["key"]) for r in rows]
        byband = {}
        for bnd, top, key in tagged:
            byband.setdefault(bnd, []).append(top)
        present = sorted(byband.keys())
        for i in range(len(present)):
            for j in range(i + 1, len(present)):
                hi_band, lo_band = present[i], present[j]
                worst_gap = min(lo_top - hi_top
                                 for hi_top in byband[hi_band] for lo_top in byband[lo_band])
                assert worst_gap > 100, (hi_band, lo_band, worst_gap)
        ok(2, "salon hang: %d ledger+cert photos at distinct spots, %d bands descend correctly"
           % (len(rows), len(present)))

        # -- 3. three states visually distinct --------------------------------
        st = await pg.evaluate("""()=>{
          const f = t => getComputedStyle(byTitle[t].img);
          return {ledger: f('Sicario').filter, arc: f('Contact').filter,
                  hazyBg: f('Prisoners').backgroundImage,
                  hazyScore: byTitle['Prisoners'].chinScore.textContent,
                  hazyCert: byTitle['Prisoners'].el.querySelectorAll('.cert-btn').length}}""")
        assert st["ledger"] == "none", st
        assert "grayscale" in st["arc"], st
        assert "gradient" in st["hazyBg"], st
        assert st["hazyScore"] == "undeveloped", st
        ok(3, "states styled distinctly (loud / penciled fade / undeveloped)")

        # -- 4. hazy offers no certify affordance -----------------------------
        h = await pg.evaluate(
            "()=>photos.filter(p=>p.state==='hazy')"
            ".reduce((a,p)=>a+p.el.querySelectorAll('.cert-btn,.certform').length,0)")
        assert h == 0, h
        ok(4, "the Hazy Wing cannot certify (no affordance rendered)")

        # -- 5. archive/hazy scale down (--sc) and lose their tape ------------
        sc = await pg.evaluate("""()=>{
          const scOf = t => getComputedStyle(byTitle[t].el).getPropertyValue('--sc').trim();
          const tapeOf = t => getComputedStyle(byTitle[t].el, '::before').display;
          return {ledgerSc: scOf('Sicario'), arcSc: scOf('Contact'), hazySc: scOf('Prisoners'),
                  arcTape: tapeOf('Contact'), hazyTape: tapeOf('Prisoners')}}""")
        assert sc["ledgerSc"] == "1", sc
        assert sc["arcSc"] == "0.56", sc
        assert sc["hazySc"] == "0.5", sc
        assert sc["arcTape"] == "none" and sc["hazyTape"] == "none", sc
        ok(5, "archive scales to %s, hazy to %s, neither carries tape" % (sc["arcSc"], sc["hazySc"]))

        # -- 6. ranks: order matches scores, ties share T- --------------------
        ranks = await pg.evaluate("""()=>{
          const defs = photos.filter(p=>p.state==='ledger'||p.state==='cert')
            .sort((a,b)=>b.score-a.score||(a.sort<b.sort?-1:1));
          return defs.map(p=>({k:p.key,s:p.score,r:p.rankEl.textContent}))}""")
        assert ranks[0]["r"] == "No. 1" and ranks[0]["s"] == 10.0, ranks[0]
        seen = 0
        for i, r in enumerate(ranks):
            if r["r"].startswith("T-"): seen += 1
            else: assert r["r"] == "No. %d" % (i + 1), (i, r)
        prev = None
        for r in ranks:
            if prev is not None: assert r["s"] <= prev, r
            prev = r["s"]
        ok(6, "ranks descend correctly, %d tied entries share T- numbers" % seen)

        # -- 7. camera: wheel zooms, drag pans --------------------------------
        s0 = await pg.evaluate("()=>cam.s")
        await pg.mouse.move(640, 500)
        await pg.mouse.wheel(0, -400)
        await pg.wait_for_timeout(120)
        s1 = await pg.evaluate("()=>cam.s")
        assert s1 > s0, (s0, s1)
        x0 = await pg.evaluate("()=>cam.x")
        await pg.mouse.move(640, 500); await pg.mouse.down()
        await pg.mouse.move(760, 520, steps=6); await pg.mouse.up()
        await pg.wait_for_timeout(120)
        x1 = await pg.evaluate("()=>cam.x")
        assert abs(x1 - x0) > 60, (x0, x1)
        ok(7, "camera pans and zooms (s %.2f -> %.2f, x moved %.0f)" % (s0, s1, x1 - x0))

        # -- 8. three modes switch ---------------------------------------------
        for m in ["backs", "invest", "wall"]:
            await pg.evaluate("m=>document.querySelector('.opt[data-mode=\"'+m+'\"]').click()", m)
            await pg.wait_for_timeout(150)
            cls = await pg.evaluate("()=>document.body.className")
            assert ("mode-" + m) in cls, (m, cls)
        ok(8, "all three modes switch (wall / backs / the investigation)")

        # -- 9. wall dive: step close, front stays front ----------------------
        await pg.evaluate("()=>{ moved=false; byTitle['Sicario'].el.querySelector('.img').click() }")
        await pg.wait_for_timeout(300)
        dv = await pg.evaluate("()=>({d:document.body.classList.contains('dived'),"
                               "f:document.querySelectorAll('.photo.flipped').length})")
        assert dv["d"] is True and dv["f"] == 0, dv
        await pg.evaluate("()=>document.getElementById('offwall').click()")
        await pg.wait_for_timeout(200)
        assert not await pg.evaluate("()=>document.body.classList.contains('dived')")
        ok(9, "wall mode dives to the print and comes back, no flip")

        # -- 10. the backs: flip, read, see-also present -----------------------
        await pg.evaluate("()=>document.querySelector('.opt[data-mode=\"backs\"]').click()")
        await pg.evaluate("()=>{ moved=false; byTitle['Sicario'].el.querySelector('.img').click() }")
        await pg.wait_for_timeout(650)
        bk = await pg.evaluate("""()=>{
          const p = byTitle['Sicario'].el;
          return {flipped: p.classList.contains('flipped'),
                  plotVisible: !!p.querySelector('.plot') && p.querySelector('.plot').offsetParent!==null,
                  sa: p.querySelectorAll('.saline').length,
                  nopho: p.querySelectorAll('.nopho').length}}""")
        assert bk["flipped"] and bk["plotVisible"], bk
        assert bk["sa"] >= 4 and bk["nopho"] >= 1, bk
        ok(10, "backs flip and carry %d see-also lines (%d marked no-photo-yet)" % (bk["sa"], bk["nopho"]))

        # -- 11. see-also respects direction -----------------------------------
        d = await pg.evaluate("""()=>{
          const txt = t => [].map.call(byTitle[t].el.querySelectorAll('.saline .rel'), e=>e.textContent);
          return {memento: txt('Memento'), usl: txt('Under the Silver Lake')}}""")
        assert "unreliable search" not in d["memento"], d
        assert "unreliable search" in d["usl"], d
        ok(11, "directional links render one-way (USL back carries the line, Memento's does not)")

        # -- 12. the handwriting flies you to its kin -------------------------
        await pg.evaluate("()=>{ moved=false; document.querySelector("
                          "'.photo[data-key=\"Sicario\"] .saline .goto').click() }")
        await pg.wait_for_timeout(650)
        fl = await pg.evaluate("()=>({sic: byTitle['Sicario'].el.classList.contains('flipped'),"
                               "now: document.querySelector('.photo.flipped').dataset.key})")
        assert fl["sic"] is False and fl["now"] != "Sicario", fl
        await pg.evaluate("()=>document.getElementById('offwall').click()")
        await pg.wait_for_timeout(200)
        ok(12, "goto flight: previous back closed, camera flew to " + fl["now"])

        # -- 13. step back: sub-toggle inside the investigation, reflows and restores
        home = await pg.evaluate("()=>byTitle['Sicario'].home")
        await pg.evaluate("()=>document.querySelector('.opt[data-mode=\"invest\"]').click()")
        await pg.wait_for_timeout(150)
        chipVis = await pg.evaluate(
            "()=>getComputedStyle(document.getElementById('stepbackChip')).display")
        assert chipVis != "none", chipVis
        await pg.evaluate("()=>document.getElementById('stepbackChip').click()")
        await pg.wait_for_timeout(900)
        cx = await pg.evaluate("""()=>({left: parseFloat(byTitle['Sicario'].el.style.left),
          dims: document.querySelectorAll('.photo.dim').length,
          labels: document.querySelectorAll('.constlabel').length,
          stepback: document.body.classList.contains('stepback')})""")
        assert cx["stepback"] is True, cx
        assert abs(cx["left"] - home["x"]) > 1, (cx, home)
        assert cx["dims"] > 0 and cx["labels"] >= 1, cx
        await pg.evaluate("()=>document.getElementById('stepbackChip').click()")
        await pg.wait_for_timeout(900)
        back = await pg.evaluate("()=>({left: parseFloat(byTitle['Sicario'].el.style.left),"
                                 "dims: document.querySelectorAll('.photo.dim').length,"
                                 "stepback: document.body.classList.contains('stepback')})")
        assert back["stepback"] is False, back
        assert abs(back["left"] - home["x"]) < .5 and back["dims"] == 0, (back, home)
        ok(13, "step back reflows (%d dimmed, %d region labels) and drifts home on exit"
           % (cx["dims"], cx["labels"]))

        # -- 14. the investigation: hold lights kin, click traverses, exit clears
        await pg.evaluate("()=>fitRect({x: byTitle['Memento'].home.x-500, y: byTitle['Memento'].home.y-400, w: 1300, h: 1100})")
        await pg.wait_for_timeout(1000)
        pt = await pg.evaluate("""()=>{const p=byTitle['Memento'];
          return {x:(p.home.x+132)*cam.s+cam.x, y:(p.home.y+162)*cam.s+cam.y}}""")
        await pg.mouse.move(pt["x"], pt["y"])
        await pg.mouse.down()
        await pg.wait_for_timeout(420)
        lit = await pg.evaluate("""()=>({lines: document.querySelectorAll('#threads line').length,
          lit: document.querySelectorAll('.photo.lit').length,
          holding: document.body.classList.contains('holding')})""")
        assert lit["lines"] == 3 and lit["lit"] >= 3, lit
        assert lit["holding"] is True, lit
        await pg.mouse.up()
        await pg.wait_for_timeout(150)
        stillLit = await pg.evaluate("()=>document.querySelectorAll('#threads line').length")
        assert stillLit == 3, stillLit   # released but still armed: lines persist

        # click a lit kin: use the same direct .click() pattern as the rest of the
        # suite (dive/goto tests), not simulated mouse coordinates. A real mouse
        # click here would retarget to #viewport, which calls setPointerCapture on
        # every pointerdown -- that's a click(), not the followTo() the template runs.
        kinKey = await pg.evaluate("""()=>{
          const held = heldPhoto.key;
          const k = [].find.call(document.querySelectorAll('.photo.lit'), p=>p.dataset.key!==held);
          return k.dataset.key}""")
        await pg.evaluate(
            "k=>{ moved=false; byTitle[k].el.querySelector('.img').click() }", kinKey)
        await pg.wait_for_timeout(150)
        tr = await pg.evaluate("""()=>({ember: document.querySelectorAll('#threads line.ember').length,
          note: document.getElementById('notecard').classList.contains('on'),
          held: heldPhoto ? heldPhoto.key : null})""")
        assert tr["ember"] >= 1, tr
        assert tr["note"] is True, tr
        await pg.wait_for_timeout(750)
        relit = await pg.evaluate("()=>document.querySelectorAll('#threads line:not(.ember)').length")
        assert relit >= 1, relit   # the trace re-lit from the new photo
        await pg.evaluate("()=>document.querySelector('.opt[data-mode=\"wall\"]').click()")
        await pg.wait_for_timeout(400)
        gone = await pg.evaluate("()=>document.querySelectorAll('#threads line').length")
        assert gone == 0, gone
        ok(14, "the investigation lights kin, traversal leaves %d ember(s) and a note, "
           "leaving the mode clears every thread" % tr["ember"])

        # -- 15. certify end to end (guard, tray, re-rank, undo, --sc) --------
        await pg.evaluate("()=>document.querySelector('.opt[data-mode=\"backs\"]').click()")
        await pg.evaluate("()=>{ moved=false; dive(byTitle['Contact'], true) }")
        await pg.wait_for_timeout(650)
        await pg.evaluate("()=>{ moved=false; byTitle['Contact'].el.querySelector('.cert-btn').click() }")
        # empty line must be refused
        await pg.evaluate("()=>{ moved=false; byTitle['Contact'].el.querySelector('.cert-go').click() }")
        await pg.wait_for_timeout(150)
        g = await pg.evaluate("""()=>({bad: byTitle['Contact'].el.querySelector('.cert-why').classList.contains('bad'),
          tray: document.getElementById('tray').classList.contains('on')})""")
        assert g["bad"] is True and g["tray"] is False, g
        await pg.evaluate("""()=>{const p=byTitle['Contact'].el;
          p.querySelector('.cert-score').value='9.4';
          p.querySelector('.cert-why').value='the eighteen seconds of static. I have never needed to see it again.';
          moved=false; p.querySelector('.cert-go').click()}""")
        await pg.wait_for_timeout(900)
        c = await pg.evaluate("""()=>{const p=byTitle['Contact'];
          return {state:p.state, score:p.score, arcscore:p.sec.dataset.arcscore,
            chin:p.chinScore.textContent, tray:document.getElementById('tray').classList.contains('on'),
            code:document.getElementById('traycode').value,
            defs:photos.filter(x=>x.state==='ledger'||x.state==='cert').length,
            rank:p.rankEl.textContent,
            sc:getComputedStyle(p.el).getPropertyValue('--sc').trim(),
            awaiting:p.el.querySelectorAll('.awaiting').length}}""")
        assert c["state"] == "cert" and c["score"] == 9.4 and c["arcscore"] == "10.0", c
        assert "in pen" in c["chin"] and c["tray"] is True, c
        assert c["code"].startswith("CERTIFY\n") and "Contact | 9.4 | the eighteen seconds" in c["code"], c
        assert c["defs"] == 25 and c["rank"].startswith(("No.", "T-")), c
        assert c["sc"] == "1" and c["awaiting"] == 0, c
        await pg.evaluate("()=>{ moved=false; byTitle['Contact'].el.querySelector('.cert-undo').click() }")
        await pg.wait_for_timeout(900)
        u = await pg.evaluate("""()=>{const p=byTitle['Contact'];
          return {state:p.state, score:p.score, tray:document.getElementById('tray').classList.contains('on'),
            defs:photos.filter(x=>x.state==='ledger'||x.state==='cert').length,
            fade:getComputedStyle(p.img).filter,
            sc:getComputedStyle(p.el).getPropertyValue('--sc').trim(),
            awaiting:p.el.querySelectorAll('.awaiting').length}}""")
        assert u["state"] == "arc" and u["score"] == 10.0 and u["tray"] is False, u
        assert u["defs"] == 24 and "grayscale" in u["fade"], u
        assert u["sc"] == "0.56" and u["awaiting"] == 1, u
        ok(15, "certify: guard refused empty line, pen stuck, --sc snapped to 1, "
                "undo restored the pencil (--sc %s, awaiting %d)" % (u["sc"], u["awaiting"]))

        # -- 16. bespoke SVG fronts on the ledger, no glyph fallback ----------
        svg = await pg.evaluate("""()=>({
          ledgerPanels: document.querySelectorAll('section.panel[data-set="ledger"]').length,
          hasphotoSvg: document.querySelectorAll('.img.hasphoto svg').length,
          badGlyph: [].filter.call(document.querySelectorAll('.img.hasphoto'),
            el=>getComputedStyle(el, '::before').content !== 'none').length})""")
        assert svg["ledgerPanels"] > 0, svg
        assert svg["hasphotoSvg"] == svg["ledgerPanels"], svg
        assert svg["badGlyph"] == 0, svg
        ok(16, "%d ledger photos carry bespoke SVG fronts, none fall back to a glyph" % svg["hasphotoSvg"])

        await pg.evaluate("()=>document.querySelector('.opt[data-mode=\"wall\"]').click()")
        await pg.evaluate("()=>fitRect(regions.def, 40)")
        await pg.wait_for_timeout(1000)
        await pg.screenshot(path=SHOT, full_page=False)
        await b.close()

    # -- 17. restore paths converge, byte for byte ---------------------------
    tmp = tempfile.mkdtemp()
    try:
        a = os.path.join(tmp, "a.html"); b2 = os.path.join(tmp, "b.html")
        va = os.path.join(tmp, "va.html"); vb = os.path.join(tmp, "vb.html")
        env = dict(os.environ)
        subprocess.check_call([sys.executable, "restore.py", "--from-json"], cwd=BASE, env=env,
                              stdout=subprocess.DEVNULL)
        shutil.copy(os.path.join(BASE, "the-ledger.html"), a)
        subprocess.check_call([sys.executable, "vault.py"], cwd=BASE, env=env,
                              stdout=subprocess.DEVNULL)
        shutil.copy(os.path.join(BASE, "the-vault.html"), va)
        subprocess.check_call([sys.executable, "restore.py"], cwd=BASE, env=env,
                              stdout=subprocess.DEVNULL)
        shutil.copy(os.path.join(BASE, "the-ledger.html"), b2)
        subprocess.check_call([sys.executable, "vault.py"], cwd=BASE, env=env,
                              stdout=subprocess.DEVNULL)
        shutil.copy(os.path.join(BASE, "the-vault.html"), vb)
        assert filecmp.cmp(a, b2, shallow=False), "the-ledger.html diverges between restore paths"
        assert filecmp.cmp(va, vb, shallow=False), "the-vault.html diverges between restore paths"
        ok(17, "both restore paths converge byte-identical (ledger and build)")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    real = [e for e in errs if not any(n in e for n in FONT_NOISE)]
    if real:
        print("PAGE ERRORS:", real); sys.exit(1)
    print("\nall %d checks passed, zero page errors" % len(PASS))

asyncio.run(main())
