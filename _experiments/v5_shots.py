# throwaway v5 iteration script -- screenshots each facing to _experiments/v5-proof/
import asyncio, os, sys
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
URL = "file://" + os.path.join(BASE, "the-vault.html").replace("\\", "/")
OUT = os.path.join(HERE, "v5-proof")
os.makedirs(OUT, exist_ok=True)

async def main():
    async with async_playwright() as pw:
        try:
            b = await pw.chromium.launch(channel="chrome")
        except Exception:
            b = await pw.chromium.launch(channel="msedge")
        pg = await b.new_page(viewport={"width": 1280, "height": 900})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append("console:" + m.text) if m.type == "error" else None)
        await pg.goto(URL)
        await pg.wait_for_timeout(300)
        await pg.keyboard.press("Escape")  # skip cold open
        await pg.wait_for_timeout(400)

        # facing: front / wall
        await pg.evaluate("()=>fitRect(regions.def,40)")
        await pg.wait_for_timeout(1200)
        await pg.screenshot(path=os.path.join(OUT, "mounted-wall.png"))
        print("wall facing:", await pg.evaluate("()=>facing"))

        # facing: backs
        await pg.evaluate("()=>document.querySelector('.opt[data-mode=\"backs\"]').click()")
        await pg.wait_for_timeout(1900)
        await pg.evaluate("()=>fitRect(regions.def,40)")
        await pg.wait_for_timeout(1200)
        await pg.screenshot(path=os.path.join(OUT, "mounted-backs.png"))
        print("backs facing:", await pg.evaluate("()=>facing"))

        # back to wall, then box
        await pg.evaluate("()=>document.querySelector('.opt[data-mode=\"wall\"]').click()")
        await pg.wait_for_timeout(1900)
        await pg.evaluate("()=>document.querySelector('#boxLid').click()")
        await pg.wait_for_timeout(1800)
        await pg.screenshot(path=os.path.join(OUT, "mounted-box.png"))
        print("box facing:", await pg.evaluate("()=>facing"), "box-closed?", await pg.evaluate("()=>document.body.classList.contains('box-closed')"))

        # drawer
        await pg.evaluate("()=>document.querySelector('.opt[data-go=\"all\"]').click()")
        await pg.wait_for_timeout(1600)
        await pg.evaluate("()=>document.querySelector('#drawerLid').click()")
        await pg.wait_for_timeout(1800)
        await pg.screenshot(path=os.path.join(OUT, "mounted-drawer.png"))
        print("drawer facing:", await pg.evaluate("()=>facing"))

        print("PAGE ERRORS:", errs[:20])
        await b.close()

asyncio.run(main())
