# -*- coding: utf-8 -*-
"""
The Vault, spatial-wall check suite (pipeline v2).
14 checks, superset of the old 8. Run after every build.

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

        # -- 2. three states visually distinct --------------------------------
        st = await pg.evaluate("""()=>{
          const f = t => getComputedStyle(byTitle[t].img);
          return {ledger: f('Sicario').filter, arc: f('Contact').filter,
                  hazyBg: f('Prisoners').backgroundImage,
                  hazyScore: byTitle['Prisoners'].chinScore.textContent,
                  hazyCert: byTitle['Prisoners'].el.querySelectorAll('.cert-btn').length}}""")
        assert st["ledger"] == "none", st
        assert "saturate" in st["arc"], st
        assert "gradient" in st["hazyBg"], st
        assert st["hazyScore"] == "undeveloped", st
        ok(2, "states styled distinctly (loud / penciled fade / undeveloped)")

        # -- 3. hazy offers no certify affordance -----------------------------
        h = await pg.evaluate(
            "()=>photos.filter(p=>p.state==='hazy')"
            ".reduce((a,p)=>a+p.el.querySelectorAll('.cert-btn,.certform').length,0)")
        assert h == 0, h
        ok(3, "the Hazy Wing cannot certify (no affordance rendered)")

        # -- 4. ranks: order matches scores, ties share T- --------------------
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
        ok(4, "ranks descend correctly, %d tied entries share T- numbers" % seen)

        # -- 5. camera: wheel zooms, drag pans --------------------------------
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
        ok(5, "camera pans and zooms (s %.2f -> %.2f, x moved %.0f)" % (s0, s1, x1 - x0))

        # -- 6. four modes switch ---------------------------------------------
        for m in ["backs", "const", "thread", "wall"]:
            await pg.evaluate("m=>document.querySelector('.opt[data-mode=\"'+m+'\"]').click()", m)
            await pg.wait_for_timeout(150)
            cls = await pg.evaluate("()=>document.body.className")
            assert ("mode-" + m) in cls, (m, cls)
        ok(6, "all four modes switch (wall / backs / constellations / thread)")

        # -- 7. wall dive: step close, front stays front ----------------------
        await pg.evaluate("()=>{ moved=false; byTitle['Sicario'].el.querySelector('.img').click() }")
        await pg.wait_for_timeout(300)
        dv = await pg.evaluate("()=>({d:document.body.classList.contains('dived'),"
                               "f:document.querySelectorAll('.photo.flipped').length})")
        assert dv["d"] is True and dv["f"] == 0, dv
        await pg.evaluate("()=>document.getElementById('offwall').click()")
        await pg.wait_for_timeout(200)
        assert not await pg.evaluate("()=>document.body.classList.contains('dived')")
        ok(7, "wall mode dives to the print and comes back, no flip")

        # -- 8. the backs: flip, read, see-also present -----------------------
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
        ok(8, "backs flip and carry %d see-also lines (%d marked no-photo-yet)" % (bk["sa"], bk["nopho"]))

        # -- 9. see-also respects direction -----------------------------------
        d = await pg.evaluate("""()=>{
          const txt = t => [].map.call(byTitle[t].el.querySelectorAll('.saline .rel'), e=>e.textContent);
          return {memento: txt('Memento'), usl: txt('Under the Silver Lake')}}""")
        assert "unreliable search" not in d["memento"], d
        assert "unreliable search" in d["usl"], d
        ok(9, "directional links render one-way (USL back carries the line, Memento's does not)")

        # -- 10. the handwriting flies you to its kin -------------------------
        await pg.evaluate("()=>{ moved=false; document.querySelector("
                          "'.photo[data-key=\"Sicario\"] .saline .goto').click() }")
        await pg.wait_for_timeout(650)
        fl = await pg.evaluate("()=>({sic: byTitle['Sicario'].el.classList.contains('flipped'),"
                               "now: document.querySelector('.photo.flipped').dataset.key})")
        assert fl["sic"] is False and fl["now"] != "Sicario", fl
        await pg.evaluate("()=>document.getElementById('offwall').click()")
        await pg.wait_for_timeout(200)
        ok(10, "goto flight: previous back closed, camera flew to " + fl["now"])

        # -- 11. constellations reflow and restore ----------------------------
        home = await pg.evaluate("()=>byTitle['Sicario'].home")
        await pg.evaluate("()=>document.querySelector('.opt[data-mode=\"const\"]').click()")
        await pg.wait_for_timeout(900)
        cx = await pg.evaluate("""()=>({left: parseFloat(byTitle['Sicario'].el.style.left),
          dims: document.querySelectorAll('.photo.dim').length,
          labels: document.querySelectorAll('.constlabel').length})""")
        assert abs(cx["left"] - home["x"]) > 1, (cx, home)
        assert cx["dims"] > 30 and cx["labels"] >= 10, cx
        await pg.evaluate("()=>document.querySelector('.opt[data-mode=\"wall\"]').click()")
        await pg.wait_for_timeout(900)
        back = await pg.evaluate("()=>({left: parseFloat(byTitle['Sicario'].el.style.left),"
                                 "dims: document.querySelectorAll('.photo.dim').length})")
        assert abs(back["left"] - home["x"]) < .5 and back["dims"] == 0, (back, home)
        ok(11, "constellations reflow (%d dimmed, %d region labels) and drift home on exit"
           % (cx["dims"], cx["labels"]))

        # -- 12. the thread: lit while held, gone on release ------------------
        await pg.evaluate("()=>document.querySelector('.opt[data-mode=\"thread\"]').click()")
        await pg.evaluate("()=>fitRect({x: byTitle['Memento'].home.x-500, y: byTitle['Memento'].home.y-400, w: 1300, h: 1100})")
        await pg.wait_for_timeout(1000)
        pt = await pg.evaluate("""()=>{const p=byTitle['Memento'];
          return {x:(p.home.x+132)*cam.s+cam.x, y:(p.home.y+162)*cam.s+cam.y}}""")
        await pg.mouse.move(pt["x"], pt["y"])
        await pg.mouse.down()
        await pg.wait_for_timeout(420)
        lit = await pg.evaluate("()=>({lines: document.querySelectorAll('#threads line').length,"
                                "lit: document.querySelectorAll('.photo.lit').length})")
        await pg.mouse.up()
        await pg.wait_for_timeout(420)
        gone = await pg.evaluate("()=>document.querySelectorAll('#threads line').length")
        assert lit["lines"] == 3 and lit["lit"] >= 3, lit
        assert gone == 0, gone
        ok(12, "the thread lights %d lines while held and vanishes on release" % lit["lines"])

        # -- 13. certify end to end (guard, tray, re-rank, undo) --------------
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
            rank:p.rankEl.textContent}}""")
        assert c["state"] == "cert" and c["score"] == 9.4 and c["arcscore"] == "10.0", c
        assert "in pen" in c["chin"] and c["tray"] is True, c
        assert c["code"].startswith("CERTIFY\n") and "Contact | 9.4 | the eighteen seconds" in c["code"], c
        assert c["defs"] == 25 and c["rank"].startswith(("No.", "T-")), c
        await pg.evaluate("()=>{ moved=false; byTitle['Contact'].el.querySelector('.cert-undo').click() }")
        await pg.wait_for_timeout(900)
        u = await pg.evaluate("""()=>{const p=byTitle['Contact'];
          return {state:p.state, score:p.score, tray:document.getElementById('tray').classList.contains('on'),
            defs:photos.filter(x=>x.state==='ledger'||x.state==='cert').length,
            fade:getComputedStyle(p.img).filter}}""")
        assert u["state"] == "arc" and u["score"] == 10.0 and u["tray"] is False, u
        assert u["defs"] == 24 and "saturate" in u["fade"], u
        ok(13, "certify: guard refused empty line, pen stuck, tray spoke, undo restored the pencil")

        await pg.evaluate("()=>document.querySelector('.opt[data-mode=\"wall\"]').click()")
        await pg.evaluate("()=>fitRect(regions.def, 40)")
        await pg.wait_for_timeout(1000)
        await pg.screenshot(path=SHOT, full_page=False)
        await b.close()

    # -- 14. restore paths converge, byte for byte ---------------------------
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
        ok(14, "both restore paths converge byte-identical (ledger and build)")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    real = [e for e in errs if not any(n in e for n in FONT_NOISE)]
    if real:
        print("PAGE ERRORS:", real); sys.exit(1)
    print("\nall %d checks passed, zero page errors" % len(PASS))

asyncio.run(main())
