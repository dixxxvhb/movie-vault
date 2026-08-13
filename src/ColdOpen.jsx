import React, { useEffect, useRef, useState } from 'react'

// The arrival. You do not fade into this room, you wake up in it — the room is
// already there and your eyes are what was shut. Four blinks, focus settling,
// 3.4s, and ANY input skips it. Nobody should ever be made to sit through an
// intro twice.
//
// Deliberately a DOM overlay and not a post-processing pass: it has to be able
// to cover the very first frames, before textures have decoded, and it must
// never hold a WebGL resource that outlives it.

const TOTAL = 3400

// height of each lid as a fraction of half the screen, over time
const LIDS = `
@keyframes vault-lid {
   0%   { transform: scaleY(1);    }
   9%   { transform: scaleY(0.42); }
  17%   { transform: scaleY(0.93); }
  26%   { transform: scaleY(0.18); }
  38%   { transform: scaleY(0.55); }
  52%   { transform: scaleY(0.04); }
  62%   { transform: scaleY(0.14); }
 100%   { transform: scaleY(0);    }
}
@keyframes vault-haze {
   0%   { opacity: 1;   backdrop-filter: blur(14px); }
  40%   { opacity: .72; backdrop-filter: blur(6px);  }
  75%   { opacity: .28; backdrop-filter: blur(2px);  }
 100%   { opacity: 0;   backdrop-filter: blur(0px);  }
}
`

export default function ColdOpen({ onDone }) {
  // ?nocold skips it outright — the screenshot harness and anyone deep-linking
  // to a station should not have to wait to see the room.
  const skipped = typeof window !== 'undefined' &&
    window.location.search.includes('nocold')
  const [done, setDone] = useState(skipped)
  const fired = useRef(skipped)

  useEffect(() => {
    if (skipped) { onDone?.(); return }
    const finish = () => {
      if (fired.current) return
      fired.current = true
      setDone(true)
      onDone?.()
    }
    const t = setTimeout(finish, TOTAL)
    // any input at all cuts it short
    const evts = ['pointerdown', 'keydown', 'wheel', 'touchstart']
    evts.forEach((e) => window.addEventListener(e, finish, { once: true, passive: true }))
    return () => {
      clearTimeout(t)
      evts.forEach((e) => window.removeEventListener(e, finish))
    }
  }, [onDone, skipped])

  if (done) return null

  // pointer-events none throughout: the blink is something you look past, and
  // a click meant for the room should still reach the room while it plays.
  const lid = {
    position: 'fixed',
    left: 0,
    width: '100%',
    height: '52%',
    background: '#000',
    pointerEvents: 'none',
    animation: `vault-lid ${TOTAL}ms cubic-bezier(.4,0,.2,1) forwards`,
    willChange: 'transform',
  }

  return (
    <>
      <style>{LIDS}</style>
      <div style={{ ...lid, top: 0, transformOrigin: 'top' }} />
      <div style={{ ...lid, bottom: 0, transformOrigin: 'bottom' }} />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 32%, rgba(0,0,0,.92) 100%)',
          animation: `vault-haze ${TOTAL}ms ease-out forwards`,
          willChange: 'opacity',
        }}
      />
    </>
  )
}
