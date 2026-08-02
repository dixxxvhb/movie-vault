# -*- coding: utf-8 -*-
"""
The Vault, motel-room check suite (pipeline v4 -- "The Motel Room").
18 checks, superset of the v3 suite (17). Run after every build.

v4 changes this suite covers:
  - the flip mechanic is gone. the backs wall is a real second surface
    (#backswall / #backsInner), mounted with its own set of .photo elements
    (p.backEl) that carry the panel content (p.sec) inside their own
    .backscale. reading = camera dives to the plane that is currently
    facing you (front wall in mode wall/invest, backs wall in mode backs),
    and the read affordance is a `.read` class on whichever element (front
    or back) is centered -- never a rotateY(180deg) flip.
  - camera is now two layers: the 2D pan/zoom (cam.x/y/s), applied
    identically to #world and #backsInner (one coordinate system, two
    sides of the same room), and the 3D room camera (roomCam.yaw/z),
    applied to #room, which turns to face the front wall or the backs wall.
  - cold open (wake from a coma) runs once on load and is skippable by a
    click or keypress; this suite skips it immediately so every other
    check runs against a settled scene.
  - shoebox (floor) and nightstand (replacing the dark drawer's cabinet)
    are real 3D furniture; clicking either opens it and flies the wall
    camera to its region (regions.box / regions.hazy).
  - panels, ranks, salon hang, states, certify/uncertify, links, the
    investigation and step-back are otherwise UNCHANGED from v3 and are
    verified the same way, just reached through p.sec instead of p.el
    wherever the content moved wall.

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
        await pg.wait_for_timeout(300)

        # -- 1. cold open: runs, and a keypress skips it straight to awake ----
        pre = await pg.evaluate("()=>({coldopen: document.body.classList.contains('coldopen'), done: coldOpenDone})")
        assert pre["coldopen"] is True and pre["done"] is False, pre
        await pg.keyboard.press("Escape")
        await pg.wait_for_timeout(150)
        post = await pg.evaluate("""()=>({awake: document.body.classList.contains('awake'),
          coldopen: document.body.classList.contains('coldopen'), done: coldOpenDone,
          lidsHidden: getComputedStyle(document.getElementById('lids')).display==='none'})""")
        assert post["awake"] is True and post["coldopen"] is False and post["done"] is True, post
        assert post["lidsHidden"] is True, post
        ok(1, "cold open runs on load and a keypress skips it straight to awake")

        await pg.wait_for_timeout(2200)   # let the chemicals develop

        # -- 2. every panel became a photo; counts per state ------------------
        counts = await pg.evaluate("""()=>({
          sections: document.querySelectorAll('#source section.panel, .backscale section.panel').length,
          photos: photos.length,
          backs: document.querySelectorAll('#backsInner .photo').length,
          ledger: photos.filter(p=>p.state==='ledger').length,
          arc: photos.filter(p=>p.state==='arc').length,
          cert: photos.filter(p=>p.state==='cert').length,
          hazy: photos.filter(p=>p.state==='hazy').length})""")
        assert counts["photos"] == counts["sections"], counts
        assert counts["backs"] == counts["photos"], counts   # every photo has a mounted back, no flip needed
        assert counts["ledger"] == 24, counts
        assert counts["arc"] == 33 and counts["hazy"] == 15, counts
        ok(2, "all %d films render on the front wall AND the backs wall (%d ledger / %d archive / "
           "%d certified / %d hazy)" % (counts["photos"], counts["ledger"], counts["arc"], counts["cert"], counts["hazy"]))

        # -- 3. the salon hang: distinct positions, bands descend -------------
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
        ok(3, "salon hang: %d ledger+cert photos at distinct spots, %d bands descend correctly"
           % (len(rows), len(present)))

        # -- 4. three states visually distinct --------------------------------
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
        ok(4, "states styled distinctly (loud / penciled fade / undeveloped)")

        # -- 5. hazy offers no certify affordance -----------------------------
        h = await pg.evaluate(
            "()=>photos.filter(p=>p.state==='hazy')"
            ".reduce((a,p)=>a+p.sec.querySelectorAll('.cert-btn,.certform').length,0)")
        assert h == 0, h
        ok(5, "the Hazy Wing cannot certify (no affordance rendered)")

        # -- 6. archive/hazy scale down (--sc) and lose their tape ------------
        sc = await pg.evaluate("""()=>{
          const scOf = t => getComputedStyle(byTitle[t].el).getPropertyValue('--sc').trim();
          const scBackOf = t => getComputedStyle(byTitle[t].backEl).getPropertyValue('--sc').trim();
          const tapeOf = t => getComputedStyle(byTitle[t].el, '::before').display;
          return {ledgerSc: scOf('Sicario'), arcSc: scOf('Contact'), hazySc: scOf('Prisoners'),
                  arcBackSc: scBackOf('Contact'),
                  arcTape: tapeOf('Contact'), hazyTape: tapeOf('Prisoners')}}""")
        assert sc["ledgerSc"] == "1", sc
        assert sc["arcSc"] == "0.56" and sc["arcBackSc"] == "0.56", sc
        assert sc["hazySc"] == "0.5", sc
        assert sc["arcTape"] == "none" and sc["hazyTape"] == "none", sc
        ok(6, "archive scales to %s (front AND back), hazy to %s, neither carries tape"
           % (sc["arcSc"], sc["hazySc"]))

        # -- 7. ranks: order matches scores, ties share T- --------------------
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
        ok(7, "ranks descend correctly, %d tied entries share T- numbers" % seen)

        # -- 8. camera: wheel zooms, drag pans (both planes track together) ---
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
        twins = await pg.evaluate("""()=>({w: getComputedStyle(world).transform,
          b: getComputedStyle(backsInner).transform})""")
        assert twins["w"] == twins["b"], twins   # one coordinate system, two sides of the room
        ok(8, "camera pans and zooms (s %.2f -> %.2f, x moved %.0f), both wall planes track together"
           % (s0, s1, x1 - x0))

        # -- 9. three modes switch, and the ROOM camera actually turns --------
        yaws = {}
        for m in ["backs", "invest", "wall"]:
            await pg.evaluate("m=>document.querySelector('.opt[data-mode=\"'+m+'\"]').click()", m)
            await pg.wait_for_timeout(950)
            st2 = await pg.evaluate("()=>({cls: document.body.className, yaw: roomCam.yaw})")
            assert ("mode-" + m) in st2["cls"], (m, st2)
            yaws[m] = st2["yaw"]
        assert yaws["backs"] != yaws["wall"], yaws   # SEATED/WALL -> BACKS is a real turn
        assert yaws["invest"] == yaws["wall"], yaws  # the investigation lives on the front wall
        ok(9, "all three modes switch, and the room camera turns for backs (wall/invest yaw %.0f, backs yaw %.0f)"
           % (yaws["wall"], yaws["backs"]))

        # -- 10. wall dive: step close, front reads, no flip anywhere ---------
        await pg.evaluate("()=>{ moved=false; byTitle['Sicario'].el.querySelector('.img').click() }")
        await pg.wait_for_timeout(300)
        dv = await pg.evaluate("""()=>({d:document.body.classList.contains('dived'),
          read: byTitle['Sicario'].el.classList.contains('read'),
          anyFlipClass: document.querySelectorAll('.photo.flipped').length})""")
        assert dv["d"] is True and dv["read"] is True and dv["anyFlipClass"] == 0, dv
        await pg.evaluate("()=>document.getElementById('offwall').click()")
        await pg.wait_for_timeout(200)
        assert not await pg.evaluate("()=>document.body.classList.contains('dived')")
        ok(10, "wall mode dives to the front print and reads it in place, comes back, no flip mechanic exists")

        # -- 11. the backs wall: turn, dive, read, see-also present -----------
        await pg.evaluate("()=>document.querySelector('.opt[data-mode=\"backs\"]').click()")
        await pg.wait_for_timeout(950)
        await pg.evaluate("()=>{ moved=false; byTitle['Sicario'].backEl.querySelector('.face.back').click() }")
        await pg.wait_for_timeout(650)
        bk = await pg.evaluate("""()=>{
          const p = byTitle['Sicario'];
          return {read: p.backEl.classList.contains('read'),
                  plotVisible: !!p.sec.querySelector('.plot') && p.sec.querySelector('.plot').offsetParent!==null,
                  sa: p.backEl.querySelectorAll('.saline').length,
                  nopho: p.backEl.querySelectorAll('.nopho').length}}""")
        assert bk["read"] and bk["plotVisible"], bk
        assert bk["sa"] >= 4 and bk["nopho"] >= 1, bk
        ok(11, "the backs wall turns, dives, and reads (%d see-also lines, %d marked no-photo-yet)"
           % (bk["sa"], bk["nopho"]))

        # -- 12. see-also respects direction -----------------------------------
        d = await pg.evaluate("""()=>{
          const txt = t => [].map.call(byTitle[t].backEl.querySelectorAll('.saline .rel'), e=>e.textContent);
          return {memento: txt('Memento'), usl: txt('Under the Silver Lake')}}""")
        assert "unreliable search" not in d["memento"], d
        assert "unreliable search" in d["usl"], d
        ok(12, "directional links render one-way (USL back carries the line, Memento's does not)")

        # -- 13. the handwriting flies you to its kin -------------------------
        await pg.evaluate("()=>{ moved=false; document.querySelector("
                          "'.photo[data-key=\"Sicario\"] .saline .goto').click() }")
        await pg.wait_for_timeout(650)
        fl = await pg.evaluate("""()=>({sic: byTitle['Sicario'].backEl.classList.contains('read'),
          now: document.querySelector('.photo.read').dataset.key})""")
        assert fl["sic"] is False and fl["now"] != "Sicario", fl
        await pg.evaluate("()=>document.getElementById('offwall').click()")
        await pg.wait_for_timeout(200)
        ok(13, "goto flight: previous back closed, camera flew to " + fl["now"])

        # -- 14. step back: sub-toggle inside the investigation, reflows and restores
        await pg.evaluate("()=>document.querySelector('.opt[data-mode=\"wall\"]').click()")
        await pg.wait_for_timeout(950)
        home = await pg.evaluate("()=>byTitle['Sicario'].home")
        await pg.evaluate("()=>document.querySelector('.opt[data-mode=\"invest\"]').click()")
        await pg.wait_for_timeout(950)
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
        ok(14, "step back reflows (%d dimmed, %d region labels) and drifts home on exit"
           % (cx["dims"], cx["labels"]))

        # -- 15. the investigation: hold lights kin, click traverses, exit clears
        await pg.evaluate("()=>fitRect({x: byTitle['Memento'].home.x-500, y: byTitle['Memento'].home.y-400, w: 1300, h: 1100})")
        await pg.wait_for_timeout(1000)
        # ground truth from the real box (perspective-projected), not the flat
        # cam formula -- the wall now lives inside a 3D room, so trust the DOM.
        pt = await pg.evaluate("""()=>{const r=byTitle['Memento'].el.getBoundingClientRect();
          return {x:r.left+r.width/2, y:r.top+r.height/2}}""")
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
        await pg.wait_for_timeout(950)
        gone = await pg.evaluate("()=>document.querySelectorAll('#threads line').length")
        assert gone == 0, gone
        ok(15, "the investigation lights kin, traversal leaves %d ember(s) and a note, "
           "leaving the mode clears every thread" % tr["ember"])

        # -- 16. certify end to end (guard, tray, re-rank, undo, --sc, both planes)
        await pg.evaluate("()=>document.querySelector('.opt[data-mode=\"backs\"]').click()")
        await pg.wait_for_timeout(950)
        await pg.evaluate("()=>{ moved=false; dive(byTitle['Contact']) }")
        await pg.wait_for_timeout(650)
        await pg.evaluate("()=>{ moved=false; byTitle['Contact'].sec.querySelector('.cert-btn').click() }")
        # empty line must be refused
        await pg.evaluate("()=>{ moved=false; byTitle['Contact'].sec.querySelector('.cert-go').click() }")
        await pg.wait_for_timeout(150)
        g = await pg.evaluate("""()=>({bad: byTitle['Contact'].sec.querySelector('.cert-why').classList.contains('bad'),
          tray: document.getElementById('tray').classList.contains('on')})""")
        assert g["bad"] is True and g["tray"] is False, g
        await pg.evaluate("""()=>{const p=byTitle['Contact'].sec;
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
            scBack:getComputedStyle(p.backEl).getPropertyValue('--sc').trim(),
            awaiting:p.el.querySelectorAll('.awaiting').length}}""")
        assert c["state"] == "cert" and c["score"] == 9.4 and c["arcscore"] == "10.0", c
        assert "in pen" in c["chin"] and c["tray"] is True, c
        assert c["code"].startswith("CERTIFY\n") and "Contact | 9.4 | the eighteen seconds" in c["code"], c
        assert c["defs"] == 25 and c["rank"].startswith(("No.", "T-")), c
        assert c["sc"] == "1" and c["scBack"] == "1" and c["awaiting"] == 0, c
        await pg.evaluate("()=>{ moved=false; byTitle['Contact'].sec.querySelector('.cert-undo').click() }")
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
        ok(16, "certify: guard refused empty line, pen stuck on both planes, --sc snapped to 1, "
                "undo restored the pencil (--sc %s, awaiting %d)" % (u["sc"], u["awaiting"]))

        # -- 17. shoebox + nightstand: real 3D furniture, click opens and flies
        await pg.evaluate("()=>document.querySelector('.opt[data-mode=\"wall\"]').click()")
        await pg.wait_for_timeout(950)
        s0b = await pg.evaluate("()=>({x:cam.x,y:cam.y,s:cam.s})")
        await pg.evaluate("()=>document.getElementById('shoebox').click()")
        await pg.wait_for_timeout(1100)
        box = await pg.evaluate("()=>({open: document.getElementById('shoebox').classList.contains('open'),"
                                "moved: cam.s !== " + repr(s0b["s"]) + " || cam.x !== " + repr(s0b["x"]) + "})")
        assert box["open"] is True and box["moved"] is True, box
        s1b = await pg.evaluate("()=>({x:cam.x,y:cam.y,s:cam.s})")
        await pg.evaluate("()=>document.getElementById('nightstand').click()")
        await pg.wait_for_timeout(1100)
        drw = await pg.evaluate("()=>({open: document.getElementById('nightstand').classList.contains('open'),"
                                "moved: cam.s !== " + repr(s1b["s"]) + " || cam.x !== " + repr(s1b["x"]) + "})")
        assert drw["open"] is True and drw["moved"] is True, drw
        ok(17, "the shoebox lid tips open and the nightstand drawer slides out; both fly the wall "
                "camera to their contents")

        # -- 18. bespoke SVG fronts on the ledger, no glyph fallback ----------
        svg = await pg.evaluate("""()=>({
          ledgerPanels: document.querySelectorAll('section.panel[data-set="ledger"]').length,
          hasphotoSvg: document.querySelectorAll('.img.hasphoto svg').length,
          badGlyph: [].filter.call(document.querySelectorAll('.img.hasphoto'),
            el=>getComputedStyle(el, '::before').content !== 'none').length})""")
        assert svg["ledgerPanels"] > 0, svg
        assert svg["hasphotoSvg"] == svg["ledgerPanels"], svg
        assert svg["badGlyph"] == 0, svg
        ok(18, "%d ledger photos carry bespoke SVG fronts, none fall back to a glyph" % svg["hasphotoSvg"])

        await pg.evaluate("()=>document.querySelector('.opt[data-mode=\"wall\"]').click()")
        await pg.evaluate("()=>fitRect(regions.def, 40)")
        await pg.wait_for_timeout(1000)
        await pg.screenshot(path=SHOT, full_page=False)
        await b.close()

    # -- 19. restore paths converge, byte for byte ---------------------------
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
        ok(19, "both restore paths converge byte-identical (ledger and build)")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    real = [e for e in errs if not any(n in e for n in FONT_NOISE)]
    if real:
        print("PAGE ERRORS:", real); sys.exit(1)
    print("\nall %d checks passed, zero page errors" % len(PASS))

asyncio.run(main())
