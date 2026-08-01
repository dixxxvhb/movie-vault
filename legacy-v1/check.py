import asyncio, sys, os
from playwright.async_api import async_playwright

_here = os.path.dirname(os.path.abspath(__file__))
BASE = os.environ.get("VAULT_DIR") or (
    _here if os.path.exists(os.path.join(_here, "the-vault.html"))
    else os.path.dirname(_here))

URL = "file://" + os.path.join(BASE, "the-vault.html")
SHOT = os.path.join(BASE, "v-def.png")

async def main():
    errs = []
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        pg = await b.new_page(viewport={"width": 900, "height": 1100})
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        await pg.goto(URL)
        await pg.wait_for_timeout(700)

        async def chip(v, g="set"):
            await pg.click('.opt[data-g="%s"][data-v="%s"]' % (g, v))
            await pg.wait_for_timeout(180)

        async def vis():
            return await pg.eval_on_selector_all(
                '#stage .panel', "els=>els.filter(e=>!e.classList.contains('hidden')).length")

        # 1. all four Show modes
        counts = {}
        for v in ["definitive", "ledger", "all", "archive"]:
            await chip(v)
            counts[v] = await vis()
        print("show modes:", counts)
        assert counts["definitive"] == 19, counts
        assert counts["ledger"] == 19
        assert counts["all"] == 67
        assert counts["archive"] == 48

        # 2. tray hidden at rest
        assert await pg.is_hidden("#tray")

        # 3. certify a film end to end
        await chip("archive")
        sel = '#stage .panel[data-title="Contact"]'
        await pg.click(sel + " .cert-btn")
        await pg.wait_for_timeout(120)
        assert await pg.is_visible(sel + " .cert-why")
        assert await pg.is_hidden(sel + " .cert-btn")

        # empty line must be refused
        await pg.click(sel + " .cert-go")
        await pg.wait_for_timeout(120)
        bad = await pg.get_attribute(sel + " .cert-why", "class")
        assert "bad" in bad, "empty reason was accepted: " + str(bad)
        assert await pg.is_hidden("#tray"), "tray opened on a refused certify"
        print("empty-reason guard: refused")

        await pg.fill(sel + " .cert-score", "9.4")
        await pg.fill(sel + " .cert-why", "the eighteen seconds of static. I have never needed to see it again.")
        await pg.click(sel + " .cert-go")
        await pg.wait_for_timeout(250)

        st = await pg.evaluate("""()=>{const p=document.querySelector('.panel[data-title="Contact"]');
          return {arc:p.classList.contains('arc'),cert:p.getAttribute('data-cert'),
                  score:p.dataset.score,arcscore:p.dataset.arcscore,
                  bg:getComputedStyle(p).backgroundColor,
                  scoretext:p.querySelector('.score').textContent.trim(),
                  meta:p.querySelector('.meta').textContent.trim(),
                  done:p.querySelector('.certwrap').classList.contains('done')}}""")
        print("after certify:", st)
        assert st["arc"] is False and st["cert"] == "pending"
        assert st["score"] == "9.4" and st["arcscore"] == "10.0"
        assert st["bg"] == "rgb(44, 62, 82)", st["bg"]
        assert st["done"] is True
        assert "certified from memory" in st["meta"]

        # 4. tray content
        assert await pg.is_visible("#tray")
        code = await pg.input_value("#traycode")
        print("tray code:", repr(code))
        assert code.startswith("CERTIFY\n")
        assert "Contact | 9.4 | the eighteen seconds" in code
        assert await pg.eval_on_selector("body", "b=>b.classList.contains('traypad')")

        # 5. it joins the definitive list
        await chip("definitive")
        n = await vis()
        tal = await pg.inner_text("#tally")
        print("definitive after cert:", n, "|", tal)
        assert n == 20, n
        assert "still pending" in tal
        rank = await pg.eval_on_selector(
            '.panel[data-title="Contact"] .no', "e=>e.textContent")
        print("its rank in definitive:", rank)

        # 6. undo puts it all back
        await pg.click('.panel[data-title="Contact"] .cert-undo')
        await pg.wait_for_timeout(220)
        # undoing from the definitive view detaches the panel, so read it off the array
        st2 = await pg.evaluate("""()=>{const p=panels.filter(x=>x.dataset.title==='Contact')[0];
          return {arc:p.classList.contains('arc'),cert:p.getAttribute('data-cert'),
                  score:p.dataset.score,attached:document.body.contains(p),
                  meta:p.querySelector('.meta').textContent.trim(),
                  done:p.querySelector('.certwrap').classList.contains('done')}}""")
        print("after undo:", st2)
        assert st2["arc"] is True and st2["cert"] is None and st2["score"] == "10.0"
        assert st2["done"] is False
        assert st2["attached"] is False, "it should have dropped out of the definitive view"
        assert "scored from memory" in st2["meta"]
        assert await pg.is_hidden("#tray")
        assert await vis() == 19
        # and it comes back correctly faded in a view that holds it.
        # polaroid era: archive photos keep their palette but wear the memory
        # fade; certification removes the fade. undo must put the fade back.
        await chip("archive")
        fl2 = await pg.eval_on_selector(
            '.panel[data-title="Contact"]', "e=>getComputedStyle(e).filter")
        print("re-attached fade:", fl2)
        assert "saturate" in fl2, fl2
        flc = await pg.eval_on_selector(
            '.panel[data-title="Titanic"]',
            "e=>{e.classList.remove('arc');var f=getComputedStyle(e).filter;e.classList.add('arc');return f}")
        assert flc == "none", flc

        # 7. hazy films offer no certify control
        await chip("all")
        h = await pg.eval_on_selector_all(
            '#stage .panel[data-hazy]', "els=>els.filter(e=>e.querySelector('.cert-btn')).length")
        assert h == 0, h
        print("hazy panels with a certify button:", h)

        # 8. ledger still loud, sort still works, compact list still splits
        await chip("score", "sort")
        pal = await pg.evaluate("""()=>['memento','sicario','br2049','darkknight'].map(c=>{
          const p=document.querySelector('.panel.'+c);
          const s=getComputedStyle(p);
          return c+':'+(s.backgroundImage!=='none'?'gradient':s.backgroundColor)})""")
        print("ledger palettes:", pal)
        assert "memento:rgb(255, 255, 255)" in pal
        assert "sicario:rgb(74, 54, 38)" in pal
        for v in ["new", "old", "az"]:
            await chip(v, "sort")
        await chip("score", "sort")
        await chip("list", "dens")
        lst = await pg.evaluate("""()=>{const a=document.querySelector('.panel.memento'),
          b=document.querySelector('.panel.arc');
          return [getComputedStyle(a).boxShadow!=='none',getComputedStyle(b).boxShadow==='none',
                  getComputedStyle(document.querySelector('.certwrap')).display]}""")
        print("compact list [ledger shadow, archive flat, certwrap display]:", lst)
        assert lst[0] and lst[1] and lst[2] != "none"
        await chip("full", "dens")

        await pg.screenshot(path=SHOT, full_page=False)
        await b.close()

    if errs:
        print("PAGE ERRORS:", errs); sys.exit(1)
    print("\nall checks passed, zero page errors")

asyncio.run(main())
