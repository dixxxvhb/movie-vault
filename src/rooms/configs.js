// Per-film room configs for the template engine (src/rooms/registry.js).
//
// Config shape:
//   {
//     family: 'mind-bender' | 'dread' | 'momentum' | 'spectacle' |
//             'intimate-tension' | 'weird-fable',
//     grade: {
//       bg, fogColor,          // hex — the room's base color
//       fogDensity,            // 0-1ish; GenericRoom derives fog far from it
//       key, keyIntensity,     // the room's one accent light
//       fill,                  // cool/neutral counter-light
//       ambient,               // ambient light intensity
//       sat, contrast, hue,    // world-aware Post grade pass (App.jsx),
//                              // fed to HueSaturation + BrightnessContrast
//     },
//     camera: { pos: [x,y,z], look: [x,y,z], fov, far },  // far optional
//     place: {
//       shell: 'box' | 'open' | 'corridor' | 'deck',
//       shellParams: {...},        // GenericRoom.jsx per-shell params
//       props: [ { type, pos, rot, scale, ...propParams } ],  // props.jsx
//       systems: [ { type, ...systemParams, wrapsProps? } ],  // systems/
//     },
//     info: { hotTakePos, hotTakeRot, scorePos, metaPos },  // optional
//   }
//
// Wave B fills all 41 ledger slugs below, transcribed from
// docs/IMMERSION-WAVEB-SPEC.md's table with docs/VAULT-IMMERSION-BRIEF-v2.md
// §5 winning wherever the two differ in spirit (the brief is the design
// intent; the table is structure). Tier 1 slugs (per the brief) get engine
// stand-ins here — bespoke rooms are Phase 2, not this wave. Any slug not
// listed still resolves through defaultConfigFor() below.

export const CONFIGS = {
  // ---------------------------------------------------------------- memento
  // "the motel room, backwards" — Discount Inn room: bed, dresser, wall of
  // notes, mirror. Duplicates as the room's own split-personality doubling;
  // ResetFlash as the reverse-timeline un-development. Score belongs mirrored
  // over the sink — InfoSurfaces has no mirror-flip param yet, so the score
  // plane is simply placed inside the mirror's reflection zone (adapted;
  // flagged for the architect).
  memento: {
    family: 'mind-bender',
    // grain/vignette/bloomIntensity: the Wave P1 baseline triplet, actively
    // overridden per-frame by Memento.jsx's own split-grade lerp (warm room
    // vs. silver corridor) — these three are just what shows before the
    // first useFrame tick and the floor gradeBus falls back to.
    grade: { key: '#c98a4a', fill: '#3a5560', sat: 0.05, grain: 0.06, vignette: 0.75, bloomIntensity: 0.24 },
    // ARCHITECT FIX (arrival composition): the old aim stood near the +Z
    // wall staring straight down -Z at the corridor door — at this room's
    // depth that put the door (a 2m-wide near-black slab) at ~45% of the
    // frame, with the bed and the whole note wall (on the far -X side
    // wall, nearly edge-on to a forward-only look) off-frame or clipped.
    // Pulled toward the +X corner and aimed diagonally across the room:
    // bed + nightstand read left-of-center, the note wall's near columns
    // catch the left edge, and the door still sits in frame but well off
    // to the right rather than dead center — "in frame, not the frame."
    camera: { pos: [1.35, 1.55, 1.95], look: [-1.1, 1.25, -0.75], fov: 52 },
    place: {
      shell: 'box',
      shellParams: { w: 3.6, d: 4.2, h: 2.5, wallMat: 'wood', window: false },
      props: [
        { type: 'bed', pos: [-0.9, 0, -0.8], rot: [0, 0.15, 0] },
        { type: 'table', pos: [1.1, 0, -1.3], rot: [0, -0.2, 0], w: 0.9, d: 0.5, h: 0.7, color: '#3a2c1c' },
        { type: 'paperScatter', pos: [1.1, 1.3, -1.75], rot: [Math.PI / 2, 0, 0], count: 16, area: [1.4, 1], color: '#e6dcc0' },
        { type: 'mirrorPlane', pos: [-1.6, 1.5, 0.2], rot: [0, Math.PI / 2, 0], w: 0.7, h: 1.1 },
        { type: 'lampPractical', pos: [1.1, 1.7, -1.3], color: '#e8b070', intensity: 0.8 },
      ],
      systems: [
        { type: 'Duplicates', offset: 0.05, wrongness: 'subtle', wrapsProps: true },
        { type: 'ResetFlash', period: 70, jitter: 0.2 },
      ],
    },
    info: { scorePos: [-1.55, 1.55, 0.2] },
  },

  // ----------------------------------------------------------- the-departed
  // Bespoke now (Phase 2, src/rooms/bespoke/Departed.jsx): camera retuned to
  // the hand-built roof/elevator geometry — the `place` block below is the
  // pre-bespoke Wave B stand-in, left in place unused (Memento's config keeps
  // the same kind of dead `place` block; the bespoke component never reads
  // it, GenericRoom never runs for a slug with a BESPOKE entry).
  'the-departed': {
    family: 'intimate-tension',
    // P1 polish pass (IMMERSION-V2-POLISH-SPEC.md): golden-hour triplet —
    // moderate grain (film-stock warmth, not noise), a gentle vignette (this
    // room is wide open sky, a heavy vignette would fight the haze), bloom
    // kept modest so the sun disc/skyline glow reads without blowing out
    // the dossier sheet.
    grade: { key: '#e8b060', fill: '#3a2e22', sat: 0.08, ambient: 0.27, grain: 0.06, vignette: 0.5, bloomIntensity: 0.34 },
    camera: { pos: [0, 1.6, 3.4], look: [0, 1.45, -3.3], fov: 54, far: 90 },
    place: {
      shell: 'open',
      shellParams: { ground: 'concrete', groundColor: '#3a342c', skyTop: '#e8b060', skyBottom: '#2a2018', horizon: true, distantCity: 22 },
      props: [
        { type: 'slab', pos: [-1.4, 1, -2.6], size: [1, 2, 0.12], color: '#2a2620' },
        { type: 'slab', pos: [1.4, 1, -2.6], size: [1, 2, 0.12], color: '#2a2620' },
        { type: 'slab', pos: [0, 0.55, -1.2], size: [6, 0.1, 0.08], color: '#1c1a16' },
        // moved off-center — at (0, 0.55) it stood directly in front of the
        // hot take sheet and covered half the verbatim text (QA sweep
        // 2026-08-21); walking the railing to one side reads better anyway.
        { type: 'abstractFigure', pos: [-2.2, 0.55, -1.2], scale: 0.9, color: '#8a6a2c', pose: 'walk-cycle-frozen' },
      ],
      systems: [
        { type: 'ScheduledCut', period: 75, duration: 4000, altGrade: '#ffe8b0' },
      ],
    },
    info: { scorePos: [1.4, 1.4, -2.5] },
  },

  // ----------------------------------------------------------------- sicario
  // Bespoke now (Phase 2, src/rooms/bespoke/Sicario.jsx): the room's own
  // entry is the dusk staging ground, not the tunnel — grade/camera below
  // now match its GROUND_STATION exactly (warm dusk, not tunnel green;
  // the green/thermal grade only exists as gradeBus overrides published
  // once you've actually descended, same seam Memento uses for its own
  // split). `place`/the old tunnel-only camera are dead weight for the same
  // reason as the-departed's/baby-driver's own entries above — the bespoke
  // component never reads this block; left in place as the pre-bespoke
  // Wave B stand-in.
  sicario: {
    family: 'dread',
    // grain/vignette/bloomIntensity: the dusk-ground baseline — Deakins-dusk
    // reads clean (low grain, wide-open vignette), the tunnel's own
    // green/thermal triplet (Sicario.jsx's GREEN/THERMAL) takes over the
    // instant you're underground.
    grade: { key: '#e8935a', fill: '#2a3a55', sat: 0.05, ambient: 0.3, keyIntensity: 1, grain: 0.045, vignette: 0.6, bloomIntensity: 0.26 },
    camera: { pos: [0, 1.9, 3.2], look: [0, 0.85, -2.4], fov: 56, far: 90 },
    place: {
      shell: 'corridor',
      shellParams: { length: 16, width: 2.4, height: 2.3, ribs: 9, wallTint: '#141210', farLight: true },
      props: [
        { type: 'abstractFigure', pos: [-0.6, 0, -1.4], scale: 0.85, color: '#1c1610', pose: 'walk-cycle-frozen' },
        { type: 'abstractFigure', pos: [0.5, 0, -1.8], scale: 0.85, color: '#1c1610', pose: 'stand' },
        { type: 'abstractFigure', pos: [-0.2, 0, -2.3], scale: 0.8, color: '#1c1610', pose: 'walk-cycle-frozen' },
        { type: 'abstractFigure', pos: [0.9, 0, -2.6], scale: 0.8, color: '#1c1610', pose: 'stand' },
        { type: 'abstractFigure', pos: [0, 0, -3.1], scale: 0.85, color: '#1c1610', pose: 'walk-cycle-frozen' },
      ],
      systems: [
        { type: 'AdvanceGlow', from: [0, 1.3, -15], color: '#8aff9a', speed: 0.18, resetAt: 13, axis: 'z' },
      ],
    },
  },

  // ------------------------------------------------------------------ matrix
  // Bespoke now (Phase 2, src/rooms/bespoke/Matrix.jsx): camera/grade below
  // match the bespoke room's own entry station exactly, same convention
  // 'the-sting' uses, so FilmWorld's ambientLight and the pre-enter camera
  // agree with what the hand-built rooftop actually shows. `place` is dead
  // weight the bespoke component never reads — left in place as the
  // pre-bespoke Wave B stand-in.
  matrix: {
    family: 'spectacle',
    // P1 polish pass: green pushed properly (this room's gradeBus override
    // republishes sat/hue/contrast off these same fields — see Matrix.jsx),
    // grain low (a clean digital-ish freeze, not film stock), contrast up,
    // vignette moderate so the periphery glyph rain still reads at the edge.
    grade: { key: '#7fae5a', fill: '#2a3a22', sat: 0.12, hue: 0.03, contrast: 0.14, grain: 0.03, vignette: 0.46, bloomIntensity: 0.36 },
    camera: { pos: [0, 1.7, 3.4], look: [0, 1.3, 0], fov: 52, far: 300 },
    place: {
      shell: 'open',
      shellParams: { ground: 'concrete', groundColor: '#3a3c34', skyTop: '#8aae7a', skyBottom: '#4a5238', horizon: true, distantCity: 18 },
      props: [
        { type: 'abstractFigure', pos: [0, 0, 0], scale: 1, color: '#12140f', pose: 'crouch' },
        { type: 'glassWall', pos: [0, 1.2, 0], rot: [0, 0, 0], w: 2.2, h: 2.2, color: '#bcd8a0', frame: '#4fd67a' },
        { type: 'glassWall', pos: [0, 1.2, 0], rot: [0, Math.PI / 2, 0], w: 2.2, h: 2.2, color: '#bcd8a0', frame: '#4fd67a' },
      ],
      systems: [
        { type: 'GlyphRain', pos: [3.4, 0, -2], area: [2.2, 6], color: '#4fd67a', columns: 6 },
        { type: 'GlyphRain', pos: [-3.4, 0, -2], area: [2.2, 6], color: '#4fd67a', columns: 6 },
      ],
    },
    info: { scorePos: [1.7, 1.9, 1.4] },
  },

  // ------------------------------------------------------------------ br2049
  // Bespoke now (Phase 2, src/rooms/bespoke/BR2049.jsx): camera lowered to
  // match the bespoke room's own entry station (the brief's "camera height
  // lowered in this room only"). `place` is dead weight for the same reason
  // as matrix's own entry above — the bespoke component never reads it.
  br2049: {
    family: 'spectacle',
    // bg/fogColor overridden: the ledger palette's own bg is the film's
    // warm Vegas-orange card gradient, right for a polaroid front but wrong
    // as this room's resting state — the brief's base grade is cold blue-
    // grey night, with the orange only rolling through periodically
    // (ScheduledCut, mounted in the bespoke room itself, owns that beat).
    grade: { bg: '#0a1620', fogColor: '#0a1620', key: '#3a6a8a', fill: '#0a1620', sat: -0.15, ambient: 0.12 },
    camera: { pos: [0, 1.35, 3], look: [0, 1.05, -8], fov: 50, far: 200 },
    place: {
      shell: 'deck',
      shellParams: { length: 12, width: 4.4, railing: true, fogWall: true, floorTint: '#141a1e' },
      props: [
        { type: 'slab', pos: [0, 0.4, -4], size: [4.4, 0.8, 1.2], color: '#20242a' },
        { type: 'waterPlane', pos: [0, -0.02, -9], size: [16, 8], color: '#08181e', bright: '#3aa0c0' },
        { type: 'abstractFigure', pos: [0, 0, -9.5], scale: 3.2, color: '#0a0c10', pose: 'stand', emissive: '#3a6a8a' },
      ],
      systems: [
        { type: 'RainField', density: 500, wind: 0.25, area: [8, 6, 12] },
        { type: 'ScheduledCut', period: 90, duration: 6000, altGrade: '#e8874a' },
      ],
    },
  },

  // ---------------------------------------------------------------- the-sting
  // Bespoke now (Phase 2, src/rooms/bespoke/Sting.jsx): grade/camera below
  // match the bespoke room's own FRONT station exactly (its default entry
  // view) so FilmWorld's ambientLight and the pre-enter camera line up with
  // what the hand-built parlor actually shows. `place` is dead weight for
  // the same reason as the-departed's/baby-driver's own entries above — the
  // bespoke component never reads it; left in place as the pre-bespoke
  // Wave B stand-in.
  'the-sting': {
    family: 'weird-fable',
    grade: { key: '#c8964a', fill: '#3a2c1a', sat: 0.1, ambient: 0.24 },
    camera: { pos: [0, 1.5, 2.2], look: [0, 1.3, -1.6], fov: 50 },
    place: {
      shell: 'box',
      shellParams: { w: 4.6, d: 4.6, h: 2.7, wallMat: 'wood', doorGap: true },
      props: [
        { type: 'counter', pos: [-1.4, 0, -1.6], rot: [0, 0.25, 0], color: '#5a3f22' },
        { type: 'barShelf', pos: [-1.4, 0, -2.0], rot: [0, 0.25, 0], count: 12, color: '#3a2814', glint: '#e8b060' },
        { type: 'screenPanel', pos: [1.3, 1.5, -1.9], w: 1.2, h: 0.8, color: '#1c2418', draw: (ctx, W, H) => {
          ctx.fillStyle = '#1c2418'; ctx.fillRect(0, 0, W, H)
          ctx.strokeStyle = '#d8cca0'; ctx.lineWidth = 2
          for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(20, 30 + i * 30); ctx.lineTo(W - 20, 30 + i * 30); ctx.stroke() }
        } },
        { type: 'table', pos: [0.6, 0, -0.4], w: 1, d: 0.6, color: '#4a3624' },
      ],
      systems: [
        { type: 'Assembler', period: 80, wrapsProps: true },
      ],
    },
    // QA sweep 2026-08-21: the foreground table (z: -0.4) sat directly in
    // the camera's sightline to the default metaPos (z: -1.66) and hid the
    // meta line/vibe chips entirely — raised it to clear the tabletop.
    info: { metaPos: [0, 1.3, -1.66] },
  },

  // ------------------------------------------------------------------- enemy
  // Bespoke now (Phase 2, src/rooms/bespoke/Enemy.jsx): camera/grade below
  // already matched the bespoke room's own entry station, so no change was
  // needed here. `place` is dead weight the bespoke component never reads —
  // left in place as the pre-bespoke Wave B stand-in.
  enemy: {
    family: 'mind-bender',
    grade: { key: '#c9a24a', fill: '#3a3020', sat: 0.12, contrast: 0.06 },
    camera: { pos: [0, 1.5, 1.8], look: [0, 1.4, -1.8], fov: 46 },
    place: {
      shell: 'box',
      shellParams: { w: 4.2, d: 4.2, h: 2.5, wallMat: 'flat', window: true },
      props: [
        { type: 'table', pos: [-0.4, 0, -0.4], w: 1, d: 0.6 },
        { type: 'chairRow', pos: [-0.4, 0, -0.1], count: 2, spacing: 0.6 },
      ],
      systems: [
        { type: 'Duplicates', offset: 0.09, wrongness: 'high', wrapsProps: true },
        { type: 'PeripheralFigure', corner: 'high', pos: [1.6, 2.1, -1.9], color: '#0c0d10' },
      ],
    },
  },

  // ------------------------------------------------------------ nightcrawler
  // Bespoke now (Phase 2, src/rooms/bespoke/Nightcrawler.jsx): grade/camera
  // below match the bespoke room's own entry composition (guardrail,
  // sodium-grid horizon). `place` is dead weight for the same reason as
  // the-departed's/baby-driver's own entries above — the bespoke component
  // never reads it; left in place as the pre-bespoke Wave B stand-in.
  nightcrawler: {
    family: 'momentum',
    grade: { bg: '#050608', fogColor: '#050608', key: '#ff8a2a', fill: '#0e1218', ambient: 0.1, keyIntensity: 1 },
    camera: { pos: [0, 1.6, 2.2], look: [0, 1.15, -6], fov: 52, far: 200 },
    place: {
      shell: 'open',
      shellParams: { ground: 'concrete', groundColor: '#1a1a1c', skyTop: '#0e1218', skyBottom: '#1c1610', horizon: true, distantCity: 30 },
      props: [
        // was a 0.9-tall slab standing in for a guardrail — at this camera
        // distance it read as an unexplained solid block filling the lower
        // frame and burying the meta line behind it (QA sweep 2026-08-21).
        // A thin rail bar reads as a guardrail instead.
        { type: 'slab', pos: [0, 0.65, -1], size: [3, 0.08, 0.06], color: '#1c1e20' },
        { type: 'screenPanel', pos: [0, 1.55, -1.3], w: 0.9, h: 0.5, color: '#101010', draw: (ctx, W, H) => {
          ctx.strokeStyle = '#ff3020'; ctx.lineWidth = 6; ctx.strokeRect(6, 6, W - 12, H - 12)
          ctx.fillStyle = '#ff3020'; ctx.beginPath(); ctx.arc(30, 30, 8, 0, Math.PI * 2); ctx.fill()
        } },
      ],
      systems: [],
    },
  },

  // ------------------------------------------------------------------- stby
  // Bespoke now (Phase 2, src/rooms/bespoke/Stby.jsx): grade/camera below
  // match the bespoke room's own fixed office station. `place` is dead
  // weight for the same reason as the-departed's/baby-driver's own entries
  // above — the bespoke component never reads it; left in place as the
  // pre-bespoke Wave B stand-in.
  stby: {
    family: 'intimate-tension',
    grade: { bg: '#3a3c36', fogColor: '#3a3c36', key: '#dfe8ff', fill: '#20242a', sat: -0.05, ambient: 0.35 },
    camera: { pos: [0, 1.5, 2], look: [0, 1.3, -1.8], fov: 48 },
    place: {
      shell: 'box',
      shellParams: { w: 5, d: 5, h: 2.5, wallMat: 'steel' },
      props: [
        { type: 'table', pos: [-1.2, 0, -1.2], w: 0.8, d: 0.6, color: '#3a3f46' },
        { type: 'table', pos: [1.2, 0, -1.2], w: 0.8, d: 0.6, color: '#3a3f46' },
        { type: 'table', pos: [-1.2, 0, 0.2], w: 0.8, d: 0.6, color: '#3a3f46' },
        { type: 'table', pos: [1.2, 0, 0.2], w: 0.8, d: 0.6, color: '#3a3f46' },
        { type: 'chairRow', pos: [0, 0, -0.6], count: 3, spacing: 0.7 },
      ],
      systems: [
        { type: 'ScheduledCut', period: 60, duration: 5000, altGrade: '#e8c060' },
      ],
    },
  },

  // ----------------------------------------------------------------- amadeus
  // Bespoke now (Phase 2, src/rooms/bespoke/Amadeus.jsx): grade/camera below
  // match the bespoke room's own bedchamber. `place` is dead weight for the
  // same reason as the-departed's/baby-driver's own entries above — the
  // bespoke component never reads it; left in place as the pre-bespoke
  // Wave B stand-in.
  amadeus: {
    family: 'intimate-tension',
    // P1 polish pass: rich warm/cold split, moderate grain (candlelit film
    // stock, not digital-clean), heavy vignette closing the chamber in.
    grade: {
      bg: '#180f08', fogColor: '#180f08', key: '#e8a860', fill: '#1a2a3a', ambient: 0.08,
      contrast: 0.14, sat: 0.06,
      grain: 0.055, vignette: 0.62, bloomIntensity: 0.4,
    },
    camera: { pos: [1.35, 1.5, 1.7], look: [-0.2, 1.1, -1.2], fov: 50 },
    place: {
      shell: 'box',
      shellParams: { w: 3.8, d: 4, h: 2.4, wallMat: 'flat', window: true },
      props: [
        { type: 'bed', pos: [-0.7, 0, -0.9], rot: [0, 0.2, 0] },
        { type: 'chairRow', pos: [0.4, 0, -0.4], count: 1 },
        { type: 'lampPractical', pos: [-0.1, 0.9, -0.2], color: '#ffb060', intensity: 1.1 },
        { type: 'lampPractical', pos: [1.3, 0.9, -1.6], color: '#ffb060', intensity: 0.6 },
      ],
      systems: [
        { type: 'InkSpread', surfaces: [
          { pos: [0, 1.5, -1.98], rot: [0, 0, 0] },
          { pos: [-1.88, 1.5, 0], rot: [0, Math.PI / 2, 0] },
        ], rate: 0.1 },
      ],
    },
  },

  // ---------------------------------------------------------- predestination
  // Bespoke now (Phase 2, src/rooms/bespoke/Predestination.jsx): grade/camera
  // below match the bespoke room's own bar station. `place` is dead weight
  // for the same reason as the-departed's/baby-driver's own entries above —
  // the bespoke component never reads it; left in place as the pre-bespoke
  // Wave B stand-in.
  predestination: {
    family: 'mind-bender',
    grade: { bg: '#241a10', fogColor: '#241a10', key: '#e8b860', fill: '#3a2414', ambient: 0.14 },
    camera: { pos: [0.3, 1.5, 1.3], look: [-0.7, 1.35, -1.3], fov: 48 },
    place: {
      shell: 'box',
      shellParams: { w: 3.6, d: 3.6, h: 2.4, wallMat: 'wood', doorGap: true },
      props: [
        { type: 'counter', pos: [0, 0, -1.4], color: '#4a3020' },
        { type: 'barShelf', pos: [0, 0, -1.7], count: 10, color: '#2a1c10', glint: '#e8a850' },
        { type: 'chairRow', pos: [-0.3, 0, -0.7], count: 2, spacing: 0.55 },
        // the timeline ribbon: a ring of slabs closing above the bottles —
        // it has no start, which is the whole point (corridor loop NOT
        // attempted at this tier, per the table)
        ...Array.from({ length: 16 }, (_, i) => ({
          type: 'slab',
          pos: [Math.cos((i / 16) * Math.PI * 2) * 0.9, 2.15, -1.7 + Math.sin((i / 16) * Math.PI * 2) * 0.9],
          rot: [0, (i / 16) * Math.PI * 2, 0],
          size: [0.36, 0.05, 0.05],
          color: '#e8b860',
          emissive: '#e8b860',
          emissiveIntensity: 0.4,
        })),
      ],
      systems: [],
    },
  },

  // ------------------------------------------------------------ baby-driver
  // Bespoke now (Phase 2, src/rooms/bespoke/BabyDriver.jsx): the camera below
  // already framed the car/facade well for the hand-built room, so it's
  // unchanged from the Wave B stand-in. `place` is dead weight for the same
  // reason as the-departed's above — the bespoke component never reads it.
  //
  // QA pass (architect review): grade had no bg/fogColor override, so both
  // fell back to defaultConfigFor()'s film-palette bg — this film's card
  // front is '#160D0D', near-black, which is most of why the room read as
  // dim night-amber rather than the brief's sunny Atlanta daylight (the
  // room's own lighting was never the whole story; the backdrop it was
  // fogging into was almost black). bg/fogColor now carry an explicit light
  // sky blue, and ambient/keyIntensity are both raised for daytime exposure.
  'baby-driver': {
    family: 'momentum',
    // P1 polish pass: this is the toolkit's daylight test — bright, crisp,
    // saturated, minimal vignette (a heavy vignette reads as night no
    // matter how hot the key is), grain low (digital daylight, not grungy
    // film stock).
    grade: {
      key: '#ffe6b0', fill: '#bcdce8', ambient: 0.55, keyIntensity: 1.9,
      bg: '#cfe8f2', fogColor: '#cfe8f2',
      sat: 0.14, contrast: 0.1, grain: 0.028, vignette: 0.3, bloomIntensity: 0.3,
    },
    camera: { pos: [0, 1.5, 3.2], look: [0, 1.3, -2], fov: 52, far: 60 },
    place: {
      shell: 'open',
      shellParams: { ground: 'concrete', groundColor: '#88888a', skyTop: '#a8d8e8', skyBottom: '#e8d8b0', horizon: true },
      props: [
        { type: 'slab', pos: [0, 1, -4], size: [8, 2.4, 0.3], color: '#c8b898' },
        { type: 'vehicleMass', pos: [1.4, 0, -1], rot: [0, 0.1, 0], color: '#a01818', w: 1.7, h: 1.1, d: 3.6 },
        { type: 'paperScatter', pos: [-1, 0, 0], count: 14, area: [2, 2], color: '#e8e0c8' },
      ],
      systems: [
        { type: 'PulseBeat', bpm: 110, depth: 0.5 },
      ],
    },
  },

  // -------------------------------------------------------------------- ncfom
  // Bespoke now (Phase 2, src/rooms/bespoke/Ncfom.jsx): grade/camera below
  // match the bespoke room's own front-of-counter station (the entry
  // viewpoint FilmWorld lands on; the room itself flies to a second,
  // behind-the-counter station via goToStation when you walk around). `place`
  // is dead weight for the same reason as the-departed's/baby-driver's own
  // entries above — the bespoke component never reads it.
  ncfom: {
    family: 'dread',
    grade: { key: '#e8d8a0', fill: '#8a7a5a', sat: -0.2, ambient: 0.32, bg: '#8a7a5a', fogColor: '#8a7a5a' },
    camera: { pos: [0, 1.5, 1.8], look: [0, 1.3, -1.4], fov: 44 },
    place: {
      shell: 'box',
      shellParams: { w: 3.6, d: 3.6, h: 2.4, wallMat: 'flat', doorGap: true },
      props: [
        { type: 'counter', pos: [0, 0, -1.4], color: '#8a7a5a' },
        { type: 'slab', pos: [-1.4, 1, -1], size: [0.5, 1.6, 0.3], color: '#6a5a3a' },
        { type: 'slab', pos: [-1.4, 1, -1.6], size: [0.5, 1.6, 0.3], color: '#6a5a3a' },
        { type: 'lampPractical', pos: [0.1, 0.98, -1.35], color: '#fff0c0', intensity: 0.15, distance: 1 },
      ],
      systems: [],
    },
  },

  // ---------------------------------------------------------------- barbarian
  // Bespoke now (Phase 2, src/rooms/bespoke/Barbarian.jsx): grade/camera
  // below match the bespoke room's own living-room entry station (index -1;
  // the descent below it moves via goToStation). `place` is dead weight for
  // the same reason as the-departed's/baby-driver's own entries above.
  barbarian: {
    family: 'dread',
    grade: { key: '#e8a860', fill: '#141416', ambient: 0.16, bg: '#141416', fogColor: '#141416' },
    camera: { pos: [0.3, 1.55, 2.5], look: [-0.2, 1.3, -1.6], fov: 58 },
    place: {
      shell: 'box',
      shellParams: { w: 3.8, d: 3.8, h: 2.5, wallMat: 'flat', doorGap: true },
      props: [
        { type: 'slab', pos: [-1, 0.24, -0.6], size: [1.2, 0.5, 0.7], color: '#6a5040' },
        { type: 'lampPractical', pos: [-0.6, 0.7, -0.2], color: '#ffb868', intensity: 1 },
      ],
      systems: [
        { type: 'ScheduledCut', period: 70, duration: 1000, altGrade: '#fff6d8' },
      ],
    },
  },

  // ---------------------------------------- masters-of-the-universe-2026
  // Bespoke now (Phase 2, src/rooms/bespoke/Motu.jsx): grade/camera below
  // match the bespoke room's own fixed throne-hall station. `place` is dead
  // weight for the same reason as the-departed's/baby-driver's own entries.
  'masters-of-the-universe-2026': {
    family: 'spectacle',
    grade: { key: '#a84fd6', fill: '#2a5a3a', sat: 0.15, ambient: 0.16, bg: '#1a1424', fogColor: '#1a1424' },
    camera: { pos: [0, 1.5, 3], look: [0, 1.4, -1.5], fov: 50 },
    place: {
      shell: 'box',
      shellParams: { w: 5.4, d: 6, h: 4.2, wallMat: 'flat' },
      props: [
        { type: 'throne', pos: [0, 0.2, -2.2], color: '#3a2a44', accent: '#e8dcc0' },
        { type: 'slab', pos: [0, 0.1, -2.2], size: [2, 0.2, 1.4], color: '#242030' },
      ],
      systems: [
        { type: 'PulseBeat', bpm: 30, depth: 0.6 },
      ],
    },
  },

  // ------------------------------------------------------------ disclosure-day
  // Bespoke now (Phase 2, src/rooms/bespoke/DisclosureDay.jsx): grade/camera
  // below match the bespoke room's own fixed podium station. `place` is dead
  // weight for the same reason as the-departed's/baby-driver's own entries.
  'disclosure-day': {
    family: 'intimate-tension',
    grade: { key: '#f4f0e0', fill: '#8a8470', ambient: 0.55, sat: -0.05, bg: '#d8d2b8', fogColor: '#d8d2b8' },
    camera: { pos: [0, 1.5, 3], look: [0, 1.4, -2], fov: 48 },
    place: {
      shell: 'box',
      shellParams: { w: 6, d: 7, h: 3.4, wallMat: 'flat' },
      props: [
        { type: 'podium', pos: [0, 0, -2.6] },
        { type: 'chairRow', pos: [0, 0, 0.6], count: 6, spacing: 0.66 },
        { type: 'slab', pos: [-2.4, 1.1, -2.8], size: [0.5, 2.2, 0.06], color: '#c8c0a8' },
        { type: 'slab', pos: [2.4, 1.1, -2.8], size: [0.5, 2.2, 0.06], color: '#c8c0a8' },
        { type: 'screenPanel', pos: [0, 2, -3.4], w: 4, h: 1.6, color: '#e8e2d0', draw: (ctx, W, H) => {
          ctx.fillStyle = '#e8e2d0'; ctx.fillRect(0, 0, W, H)
          ctx.fillStyle = '#9a9480'; ctx.font = '20px Georgia'
          for (let i = 0; i < 10; i++) ctx.fillText('the matter remains under continued advisement', 10, 30 + i * 40)
        } },
      ],
      systems: [
        { type: 'CurtainReveal', period: 45, pos: [0, 1.7, -3.35], w: 2, h: 2.8, color: '#7a2a2a' },
      ],
    },
  },

  // ------------------------------------------------------------------ darkknight
  // Wave P0 PROOF ROOM (IMMERSION-V2-POLISH-SPEC.md #7): the interrogation
  // room, upgraded with every P0 toolkit piece — materials.js surfaces on
  // walls/floor/table, baseboard trim, a full layered lightRig (the white
  // light panel as key, wall-fixture practicals, a cold bounce, a rim
  // catching the mirror edge), authored clutter split ordered/entropic per
  // the brief's own paragraph (§5: "half the room ordered, half entropic"),
  // one 512 shadow (the key panel, casting the table's shadow onto the
  // tile), and a tuned grade triplet (crushed contrast, low grain, a
  // heavy-ish vignette closing the room in). Config-driven only — no
  // bespoke component; GenericRoom renders all of this from `place`/
  // `lights`/`grade` alone, same contract every Tier-2 slug uses.
  darkknight: {
    family: 'intimate-tension',
    grade: {
      // Architect review (2nd pass): grade.fill doubles as the ambient
      // light's own color, and '#141414' is so close to black that
      // ambient's intensity barely moved a pixel regardless of its value —
      // the walls had no uniform base level under them at all, only
      // whatever a point light's falloff happened to reach. Lifted to a
      // dark cool gray (still reads as "steel/concrete", not lit) so the
      // envelope has a genuine floor under it everywhere, corners included.
      key: '#e8f0ff', fill: '#1d2226', ambient: 0.17,
      contrast: 0.16, sat: -0.08,
      grain: 0.05, vignette: 0.72, bloomIntensity: 0.32,
    },
    camera: { pos: [0, 1.5, 2], look: [0, 1.3, -1.4], fov: 44 },
    // The layered rig: one motivated key (the panel overhead), practicals at
    // both side walls, two bounces (front/back), and a rim from the mirror
    // side. Only the key casts a shadow — the room's one 512 map (spec
    // #3/#6: "one shadow map max"). Architect review (2nd pass): the first
    // pass's fills only reached the corners nearest each fixture — a whole
    // wall PLANE still read as pure #000 between them. Every fill below now
    // carries enough distance/intensity to graze the full length of its
    // nearest wall (barely — corners still fall off toward black), and a
    // second practical was added on the mirror-side wall specifically so
    // that wall has two sources instead of leaning on the rim alone.
    lights: {
      key: {
        type: 'spot', pos: [0, 2.4, -0.55], target: [0, 0, -0.8],
        color: '#eef4ff', intensity: 2.0, distance: 8.5, decay: 2,
        angle: 0.72, penumbra: 0.55,
        castShadow: true, shadowMapSize: 512, shadowNear: 0.5, shadowFar: 6,
      },
      practicals: [
        { pos: [-1.9, 2.0, 1.5], color: '#e8b070', intensity: 0.85, distance: 6, decay: 2 },
        { pos: [1.9, 0.95, 0.3], color: '#7a8a94', intensity: 0.45, distance: 4.4, decay: 2 },
      ],
      bounce: [
        { pos: [0, 0.4, -1.9], color: '#3a5468', intensity: 1.3, distance: 6.8, decay: 2 },
        { pos: [0, 1.5, 1.9], color: '#343c42', intensity: 0.85, distance: 6.2, decay: 2 },
      ],
      rim: { pos: [1.9, 1.6, -1.3], color: '#a8c8e0', intensity: 1.3, distance: 6, decay: 2 },
    },
    place: {
      shell: 'box',
      shellParams: {
        w: 4.2, d: 4.2, h: 2.6, wallMat: 'steel',
        // materials.js surfaces — concrete walls/ceiling, tile floor, per
        // the brief's "steel table, two-way mirror" interrogation room.
        mat: { walls: 'concrete', ceiling: 'concrete', floor: 'tile', wallWear: 0.4, floorWear: 0.55 },
        trim: { color: '#15171b', height: 0.08 },
        shadow: true,
      },
      props: [
        // the steel table — a bevelled body with a real metal surface
        // (materials.js), not a flat-colored box.
        {
          type: 'bevelBox', pos: [0, 0.36, -0.8], w: 1.2, h: 0.06, d: 0.7, radius: 0.02,
          mat: { kind: 'metal', tint: '#3a3f46', wear: 0.35 },
          castShadow: true, receiveShadow: true,
          touch: { kind: 'nudge', amplitude: 0.18 },
        },
        { type: 'slab', pos: [0.36, 0.18, -0.6], size: [0.04, 0.36, 0.04], color: '#22252a' },
        { type: 'slab', pos: [-0.36, 0.18, -0.6], size: [0.04, 0.36, 0.04], color: '#22252a' },
        { type: 'slab', pos: [0.36, 0.18, -1.0], size: [0.04, 0.36, 0.04], color: '#22252a' },
        { type: 'slab', pos: [-0.36, 0.18, -1.0], size: [0.04, 0.36, 0.04], color: '#22252a' },
        { type: 'chairRow', pos: [0, 0, -0.3], count: 2, spacing: 0.7 },
        { type: 'mirrorPlane', pos: [2.08, 1.5, 0], rot: [0, -Math.PI / 2, 0], w: 1.4, h: 1.6 },
        { type: 'frameOn', pos: [-2.08, 1.4, 0.9], rot: [0, Math.PI / 2, 0], w: 0.9, h: 1.2, color: '#15171b' },
        // the coin-flip object at the seam between order and entropy —
        // brief §5's own line for this room.
        { type: 'slab', pos: [0, 0.375, -0.8], size: [0.05, 0.006, 0.05], color: '#c8c0a0', touch: { kind: 'nudge', amplitude: 0.1, foley: 'tick' } },
      ],
      // Wave P0 clutter (detail.jsx): the room's own half-and-half rule.
      // Ordered side (camera-left, toward the practical): a squared case-
      // file stack and a single cup. Entropic side (camera-right, toward
      // the mirror/rim): scattered shards, a crooked box, a rag — debris
      // physics stands in for by a deliberately un-squared authored spread
      // rather than a live system (P1's job, not P0's toolkit proof).
      clutter: [
        { type: 'bookStack', pos: [-1.55, 0, 1.4], count: 5, w: 0.24, d: 0.32, colors: ['#3a3226', '#2c2c30', '#3a3226'] },
        { type: 'cup', pos: [-1.3, 0, 1.55], color: '#d8d0bc' },
        { type: 'shardBits', pos: [1.5, 0, 1.45], count: 11, spread: 0.55, color: '#cfe8ea' },
        { type: 'boxPile', pos: [1.75, 0, 1.15], count: 3, color: '#5a4a38', spread: 0.4 },
        { type: 'rag', pos: [1.4, 0.01, 1.7], color: '#3a3630' },
      ],
      atmosphere: [
        // Architect review (2nd pass): the first pass's cone dominated the
        // frame and washed the hot-take sheet out from inside it. Halved
        // (length/radius) and opacity cut by more than half — the light
        // panel now reads as the source of a modest throw over the table,
        // not a wall-to-wall wedge competing with the record for attention.
        { type: 'HazeCone', pos: [0, 2.35, -0.8], rot: [0, 0, 0], length: 1.15, radius: 0.42, color: '#e8f0ff', opacity: 0.07 },
      ],
      systems: [],
    },
    // Architect review (2nd pass) #4: the default info positions (tuned for
    // a ~5x5x2.8 generic box) float mid-room in this 4.2x4.2x2.6 shell —
    // close enough to the table/ceiling that the meta sheet clipped the
    // wall/table-top edge from a low angle. Pinned all three flush to the
    // back wall instead (z matches the wall's own inner face) and off-
    // center from the key's beam column so the record sits BESIDE the
    // light, never inside it.
    info: {
      hotTakePos: [-0.85, 1.55, -2.06], hotTakeRot: [0, 0, 0],
      scorePos: [1.15, 2.0, -2.06],
      metaPos: [-0.2, 0.85, -2.06],
    },
  },

  // ------------------------------------------------------------------------ tdkr
  tdkr: {
    family: 'spectacle',
    // keyIntensity dropped for the same reason as sicario/batman: the
    // fixed key sits right where this room's camera also lives.
    // fill brightened — see sicario's note; a near-black fill caps the
    // ambientLight (which uses grade.fill as its color) near zero.
    grade: { key: '#c8a860', fill: '#3a3428', ambient: 0.4, keyIntensity: 0.4 },
    // QA sweep 2026-08-21: the old look-at [0,5,-0.5] from a camera at
    // y=0.6 was almost straight up — the frame was ~70% empty sky with the
    // pit itself, the info surfaces and the score all cropped out the
    // bottom. Eased the tilt so the well walls and the light disc share
    // the frame with the record.
    camera: { pos: [0, 1, 0.5], look: [0, 3, -3], fov: 56, far: 60 },
    place: {
      shell: 'corridor',
      shellParams: { length: 12, width: 3.6, height: 8, ribs: 6, wallTint: '#2a2620', farLight: true },
      props: [
        { type: 'slab', pos: [1.4, 3, -6], size: [0.8, 0.15, 0.15], color: '#5a4a3a', touch: { kind: 'nudge', amplitude: 0.14, foley: 'thunk' } },
      ],
      systems: [
        { type: 'PulseBeat', bpm: 40, depth: 0.3 },
      ],
    },
  },

  // -------------------------------------------------------------------- batman
  batman: {
    family: 'dread',
    // QA sweep 2026-08-21: ambient 0.06 plus a near-vertical look-at read as
    // a black void with a few dim particles in it — bumped ambient/key just
    // enough that the well walls are visible without losing the "dry well
    // at dusk" darkness the brief wants.
    // fill brightened — see sicario's note; a near-black fill caps the
    // ambientLight (which uses grade.fill as its color) near zero.
    grade: { key: '#3a5a8a', fill: '#242a3c', ambient: 0.4, keyIntensity: 0.4 },
    camera: { pos: [0, 0.6, 0.8], look: [0, 2.6, -1.6], fov: 54, far: 40 },
    place: {
      shell: 'corridor',
      shellParams: { length: 6, width: 2.6, height: 9, ribs: 4, wallTint: '#141210', farLight: true },
      props: [
        // a loose stone worked free of the well's dry wall — Wave T touch.
        { type: 'slab', pos: [0.65, 0.15, -1], size: [0.3, 0.3, 0.3], color: '#1c1a16', touch: { kind: 'nudge', amplitude: 0.2, foley: 'thunk', reach: 4.2 } },
      ],
      systems: [
        { type: 'SwarmEvent', period: 40, count: 60, color: '#0d0d10', origin: [0, 3, -1] },
      ],
    },
    // narrow well (width 2.6) at this FOV pushes the default scorePos (x:
    // 1.2) to the frame edge — pulled in (QA sweep 2026-08-21).
    info: { scorePos: [0.75, 2.0, -1.4] },
  },

  // ---------------------------------------------------------------- poorthings
  poorthings: {
    family: 'weird-fable',
    grade: { key: '#e888c8', fill: '#88c8e8', sat: 0.2, ambient: 0.3 },
    // Fisheye lens feel via FOV, per the brief's composition-homage clause —
    // no fisheye shader, just pushed the lens wide the way the real one reads.
    camera: { pos: [0, 1.5, 2.6], look: [0, 1.5, -2], fov: 95 },
    place: {
      shell: 'open',
      shellParams: { ground: 'grass', groundColor: '#e8c8a0', skyTop: '#f0b0d0', skyBottom: '#f8e8b0', horizon: true },
      props: [
        { type: 'slab', pos: [-1.6, 1, -2], size: [0.8, 2, 0.6], color: '#e8a0c0', touch: { kind: 'nudge', amplitude: 0.16 } },
        { type: 'slab', pos: [1.6, 1.2, -2.4], size: [0.9, 2.4, 0.6], color: '#a0c8e8' },
        { type: 'slab', pos: [0, 2, -3], size: [3, 0.3, 0.3], color: '#e8d8a0' },
      ],
      systems: [],
    },
  },

  // -------------------------------------------------------------------------- cmiyc
  cmiyc: {
    family: 'momentum',
    grade: { key: '#e8c060', fill: '#20242a', ambient: 0.2 },
    camera: { pos: [0, 1.6, 4], look: [0, 1.4, -8], fov: 50, far: 60 },
    place: {
      shell: 'box',
      shellParams: { w: 5, d: 16, h: 4, wallMat: 'flat', window: true },
      props: [
        { type: 'slab', pos: [-1.6, 1.4, -3], size: [0.4, 2.8, 0.4], color: '#8a7040', touch: { kind: 'nudge', amplitude: 0.1, foley: 'thunk' } },
        { type: 'slab', pos: [1.6, 1.4, -3], size: [0.4, 2.8, 0.4], color: '#8a7040' },
        { type: 'slab', pos: [-1.6, 1.4, -7], size: [0.4, 2.8, 0.4], color: '#8a7040' },
        { type: 'slab', pos: [1.6, 1.4, -7], size: [0.4, 2.8, 0.4], color: '#8a7040' },
        { type: 'abstractFigure', pos: [-0.4, 0, -5], color: '#181410', pose: 'walk-cycle-frozen' },
        { type: 'abstractFigure', pos: [0.2, 0, -5.6], color: '#181410', pose: 'walk-cycle-frozen' },
        { type: 'abstractFigure', pos: [0.8, 0, -5.2], color: '#181410', pose: 'walk-cycle-frozen' },
      ],
      systems: [
        { type: 'StreakLights', axis: 'z', speed: 2.5, colors: ['#e8c060'], count: 16, span: 16, y: 0.05, z: 0 },
      ],
    },
    // QA sweep 2026-08-21: default metaPos (y: 0.78) sat low enough to read
    // as buried in the floor-level streak quads, and the default scorePos
    // (x: 1.2) crowded the near pillar (x: 1.6, z: -3) at this FOV — nudged
    // both clear.
    info: { scorePos: [0.95, 2.0, -2.2], metaPos: [0, 1.05, -1.66] },
  },

  // ---------------------------------------------------------------------- bullettrain
  bullettrain: {
    family: 'momentum',
    grade: { key: '#e8d44d', fill: '#2a2a3a', ambient: 0.2 },
    camera: { pos: [0, 1.45, 1.6], look: [0, 1.3, -3], fov: 50 },
    place: {
      shell: 'box',
      shellParams: { w: 2.6, d: 9, h: 2.2, wallMat: 'flat', window: true },
      props: [
        { type: 'chairRow', pos: [-0.6, 0, -1], count: 3, spacing: 1.4, color: '#c8607a' },
        { type: 'chairRow', pos: [0.6, 0, -1], count: 3, spacing: 1.4, color: '#e8a86a' },
        // overhead luggage, wedged in the rack above the seats — Wave T touch.
        { type: 'slab', pos: [-0.6, 1.9, -1], size: [0.5, 0.28, 0.34], color: '#2a2420', touch: { kind: 'nudge', amplitude: 0.22, foley: 'thunk', reach: 3.2 } },
      ],
      systems: [
        { type: 'StreakLights', axis: 'z', speed: 5, colors: ['#c8d0ff'], count: 20, span: 12, y: 1, z: -1.28 },
        { type: 'PulseBeat', bpm: 60, depth: 0 },
      ],
    },
    // QA sweep 2026-08-21: the default scorePos (x: 1.2) sits right at this
    // car's wall (w: 2.6, half-width 1.3) — the "9.1" was rendering half
    // inside the wall. Pulled it in from the wall and down from the low
    // 2.2m ceiling.
    info: { scorePos: [0.85, 1.85, -1.4] },
  },

  // ---------------------------------------------------------------------- stardust
  stardust: {
    family: 'weird-fable',
    grade: { key: '#e8b868', fill: '#1c1c30', ambient: 0.1 },
    // pulled back from the wall (was nose-to-stone at 1.6 with a "gap" slab
    // that just read as a second solid wall — no CSG here, so the gap is
    // two pillars with real empty space between them, and the camera sits
    // far back enough to actually see through it to the meadow)
    camera: { pos: [0, 1.5, 2.6], look: [0, 1.4, -3], fov: 50, far: 150 },
    place: {
      shell: 'open',
      shellParams: { ground: 'grass', groundColor: '#2a2818', skyTop: '#0a0a20', skyBottom: '#181430', horizon: false },
      props: [
        { type: 'slab', pos: [-1.25, 1, -2], size: [1.3, 2, 0.5], color: '#4a4438' },
        { type: 'slab', pos: [1.25, 1, -2], size: [1.3, 2, 0.5], color: '#4a4438' },
        { type: 'lampPractical', pos: [1.5, 0.8, 0.4], color: '#ffb868', intensity: 0.9, touch: { kind: 'light', reach: 4.2 } },
      ],
      systems: [
        { type: 'AdvanceGlow', from: [-6, 6, -10], axis: 'x', speed: 0.02, resetAt: 12, color: '#fff6d0', prop: 'sphere' },
      ],
    },
  },

  // -------------------------------------------------------------------- coherence
  coherence: {
    family: 'mind-bender',
    grade: { key: '#e8b060', fill: '#0a0a14', ambient: 0.08 },
    camera: { pos: [0, 1.6, 2.4], look: [0, 1.4, -6], fov: 52, far: 200 },
    place: {
      shell: 'open',
      shellParams: { ground: 'concrete', groundColor: '#141416', skyTop: '#0a0a1a', skyBottom: '#101018', horizon: false },
      props: [
        { type: 'slab', pos: [0, 1, -6], size: [2.2, 2, 1.6], color: '#2a2418' },
        { type: 'slab', pos: [-6, 1, -14], size: [2.2, 2, 1.6], color: '#2a2418' },
        { type: 'slab', pos: [6, 1, -14], size: [2.2, 2, 1.6], color: '#2a2418' },
        { type: 'slab', pos: [0, 1, -22], size: [2.2, 2, 1.6], color: '#2a2418' },
        { type: 'lampPractical', pos: [0, 1.9, -6], color: '#ffcf7a', intensity: 0.7, touch: { kind: 'light' } },
        { type: 'lampPractical', pos: [-6, 1.9, -14], color: '#ffcf7a', intensity: 0.7 },
        { type: 'lampPractical', pos: [6, 1.9, -14], color: '#ffcf7a', intensity: 0.7 },
      ],
      systems: [
        { type: 'ResetFlash', period: 55, jitter: 0.1 },
      ],
    },
  },

  // -------------------------------------------------------------------- exmachina
  exmachina: {
    family: 'intimate-tension',
    grade: { key: '#5ab8d0', fill: '#141a1c', ambient: 0.16 },
    camera: { pos: [0, 1.5, 1.8], look: [0, 1.4, -1.4], fov: 46 },
    place: {
      shell: 'box',
      shellParams: { w: 4, d: 4, h: 2.6, wallMat: 'flat' },
      props: [
        { type: 'glassWall', pos: [0, 1.3, -1.98], w: 3.8, h: 2.4, color: '#a8e0e8', touch: { kind: 'press', depress: 0.02, foley: 'glass' } },
        { type: 'glassWall', pos: [-1.98, 1.3, 0], rot: [0, Math.PI / 2, 0], w: 3.8, h: 2.4, color: '#a8e0e8' },
        { type: 'tree', pos: [0, 0, -6], scale: 1.4, foliage: '#1c3a24' },
        { type: 'tree', pos: [-2, 0, -7], scale: 1.1, foliage: '#1c3a24' },
        { type: 'tree', pos: [2.4, 0, -6.6], scale: 1.2, foliage: '#1c3a24' },
      ],
      systems: [
        { type: 'ScheduledCut', period: 50, duration: 3000, altGrade: '#c81010' },
      ],
    },
  },

  // --------------------------------------------------------------------- niceguys
  niceguys: {
    family: 'momentum',
    grade: { key: '#e8c060', fill: '#4a4a30', ambient: 0.3, sat: 0.06 },
    camera: { pos: [0, 1.5, 2.6], look: [0, 1.2, -1.4], fov: 52 },
    place: {
      shell: 'open',
      shellParams: { ground: 'grass', groundColor: '#7a8a5a', skyTop: '#e8c880', skyBottom: '#f0d8a0', horizon: true },
      props: [
        { type: 'pool', pos: [0.6, 0, -1.6], radius: 1.2, glow: '#3ac8d8' },
        { type: 'abstractFigure', pos: [0.9, 0.6, -1.1], rot: [0.9, 0, 0.3], color: '#0e1218', pose: 'crouch' },
        { type: 'paperScatter', pos: [-1, 0, 0.4], count: 16, area: [2, 1.4], color: '#e8dcc0' },
        { type: 'slab', pos: [-2.2, 0.6, -0.4], rot: [0.4, 0.2, 0.6], size: [0.4, 1.2, 0.4], color: '#a05030', touch: { kind: 'nudge', amplitude: 0.2, reach: 3.4 } },
      ],
      systems: [],
    },
  },

  // --------------------------------------------------------------------- rogue-one
  'rogue-one': {
    family: 'dread',
    // fill brightened — a near-black fill caps the ambientLight (which
    // uses grade.fill as its color) near zero (QA sweep 2026-08-21).
    grade: { key: '#c22e2e', fill: '#241418', ambient: 0.16 },
    camera: { pos: [0, 1.5, 2.5], look: [0, 1.3, -6], fov: 48, far: 60 },
    place: {
      shell: 'corridor',
      shellParams: { length: 14, width: 2.2, height: 2.4, ribs: 8, wallTint: '#0e0e10', farLight: true },
      props: [
        // a supply crate shoved against the corridor wall — Wave T touch.
        { type: 'slab', pos: [-0.75, 0.3, -2.2], size: [0.5, 0.6, 0.4], color: '#2e2a24', touch: { kind: 'nudge', amplitude: 0.16, foley: 'thunk', reach: 2.8 } },
      ],
      systems: [
        // "from" moved off the camera's own position — at from:[0,1.3,6]
        // (behind a camera parked at z=4.4) the glow plane's travel path
        // swept directly across the lens each cycle and blew the frame to
        // a solid red wash (QA sweep 2026-08-21). Starting it further back
        // keeps the advancing light behind the camera without occluding it.
        { type: 'AdvanceGlow', from: [0, 1.3, 9], axis: 'z', speed: 0.2, resetAt: 12, color: '#c22e2e' },
        { type: 'paperScatter', count: 20, area: [1.8, 8], color: '#c8c0a8', pos: [0, 0.02, -3] },
      ],
    },
  },

  // ---------------------------------------------------------------------- maverick
  maverick: {
    family: 'spectacle',
    grade: { key: '#e8b060', fill: '#3a4a5a', ambient: 0.2 },
    camera: { pos: [0, 1.4, 1.2], look: [0, 1.3, -1], fov: 42, far: 300 },
    place: {
      shell: 'box',
      shellParams: { w: 2.4, d: 2, h: 1.8, wallMat: 'steel', window: true },
      props: [
        // the throttle lever, within reach of the cockpit seat — Wave T touch.
        { type: 'slab', pos: [0.35, 0.9, -0.2], size: [0.1, 0.2, 0.28], color: '#26262a', touch: { kind: 'press', depress: 0.03 } },
      ],
      systems: [
        { type: 'StreakLights', axis: 'x', speed: 6, colors: ['#a86a3a', '#e8b060'], count: 20, span: 8, y: 1.1, z: -1.5 },
        { type: 'PulseBeat', bpm: 90, depth: 0.15 },
      ],
    },
    // this cockpit box is tiny (w:2.4, d:2) — the default info positions
    // (hotTake/score/meta all around z:-1.66 to -1.7) land past the back
    // wall (half-depth 1) and outside the side walls (half-width 1.2),
    // so none of the record rendered inside the room at all (QA sweep
    // 2026-08-21).
    info: {
      hotTakePos: [0, 1.5, -0.95],
      scorePos: [0.75, 1.65, -0.9],
      metaPos: [0, 0.85, -0.92],
    },
  },

  // -------------------------------------------------------------------------- moon
  moon: {
    family: 'intimate-tension',
    // keyIntensity dropped: an already-near-white key/wallTint combo (the
    // "white minimalist" module interior) plus the default 16x multiplier
    // blew the whole corridor to solid white (QA sweep 2026-08-21).
    grade: { key: '#e8e8f0', fill: '#8a8a90', ambient: 0.26, sat: -0.15, keyIntensity: 0.3 },
    camera: { pos: [0, 1.5, 2.2], look: [0, 1.4, -4], fov: 48, far: 40 },
    place: {
      shell: 'corridor',
      shellParams: { length: 8, width: 2.6, height: 2.4, ribs: 4, wallTint: '#d8d8dc', farLight: false },
      props: [
        // exactly two — the room's own doubling motif: nudge one, its twin
        // answers half a second later (Wave T `pairId`).
        { type: 'lampPractical', pos: [-0.8, 2, -1], color: '#f0f0ff', intensity: 0.6, touch: { kind: 'nudge', amplitude: 0.14, pairId: 'moon-lamps' } },
        { type: 'lampPractical', pos: [0.8, 2, -1], color: '#f0f0ff', intensity: 0.6, touch: { kind: 'nudge', amplitude: 0.14, pairId: 'moon-lamps' } },
        { type: 'chairRow', pos: [0, 0, -2.4], count: 2, spacing: 0.6, color: '#c0c0c8' },
        { type: 'screenPanel', pos: [0, 1.3, -3.9], w: 1.4, h: 0.9, color: '#c8b8a0', draw: (ctx, W, H) => {
          ctx.fillStyle = '#a89880'; ctx.fillRect(0, 0, W, H)
          ctx.fillStyle = '#605040'
          for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 6, 6)
        } },
      ],
      systems: [
        { type: 'Duplicates', offset: 0.02, wrongness: 0, wrapsProps: true },
      ],
    },
    // this corridor's width (2.6) puts the default scorePos (x: 1.2) right
    // at the wall — pulled in (QA sweep 2026-08-21).
    info: { scorePos: [0.85, 1.95, -1.6] },
  },

  // ---------------------------------------------------------------------- source-code
  'source-code': {
    family: 'mind-bender',
    grade: { key: '#e8c060', fill: '#3a4a5a', ambient: 0.24 },
    camera: { pos: [0, 1.45, 1.6], look: [0, 1.3, -3], fov: 50 },
    place: {
      shell: 'box',
      shellParams: { w: 2.6, d: 8, h: 2.2, wallMat: 'wood', window: true },
      props: [
        { type: 'chairRow', pos: [-0.6, 0, -1], count: 3, spacing: 1.4, color: '#8a5a3a', touch: { kind: 'nudge', amplitude: 0.12, reach: 2.8 } },
        { type: 'chairRow', pos: [0.6, 0, -1], count: 3, spacing: 1.4, color: '#8a5a3a' },
      ],
      systems: [
        { type: 'ResetFlash', period: 45, jitter: 0.05 },
      ],
    },
  },

  // ----------------------------------------------------------------------- obsession
  obsession: {
    family: 'weird-fable',
    grade: { key: '#3ab89a', fill: '#e8a860', sat: 0.14, ambient: 0.2 },
    camera: { pos: [0, 1.5, 2.2], look: [0, 1.4, -1], fov: 50 },
    place: {
      shell: 'box',
      shellParams: { w: 4.4, d: 4.4, h: 3, wallMat: 'flat' },
      props: [
        // shifted off the centerline: at scale 1.2 this tree's canopy was
        // ~1.4 wide and sat right where the info surfaces default to,
        // hiding the hot take/score/meta behind solid foliage geometry
        // (QA sweep 2026-08-21).
        { type: 'tree', pos: [-1.5, 0, -1.4], scale: 1.2, foliage: '#2c5a44' },
        { type: 'branchTags', pos: [-1.5, 0, -1.4], count: 20, radius: 1.2, color: '#e8dcc0', touch: { kind: 'swing', amplitude: 0.3 } },
      ],
      systems: [],
    },
  },

  // -------------------------------------------------------------------------- triangle
  triangle: {
    family: 'mind-bender',
    grade: { key: '#c8d0d8', fill: '#3a4048', ambient: 0.12, sat: -0.1 },
    camera: { pos: [0, 1.5, 2], look: [0, 1.4, -3], fov: 48 },
    place: {
      shell: 'deck',
      shellParams: { length: 8, width: 4, railing: true, fogWall: true, floorTint: '#2a2c30' },
      props: [
        // the pile of scratched charms and half-finished shapes — Wave T touch.
        { type: 'paperScatter', pos: [0.9, 0.02, -1.4], rot: [Math.PI / 2, 0, 0], count: 10, area: [0.5, 0.5], color: '#c8a860', touch: { kind: 'nudge', amplitude: 0.15 } },
      ],
      systems: [
        { type: 'LookAwayGrow', pos: [1.2, 0, -1.6], max: 34, color: '#c8a860' },
      ],
    },
  },

  // -------------------------------------------------------------------------- pressure
  pressure: {
    family: 'intimate-tension',
    grade: { key: '#e8c060', fill: '#0a0a10', ambient: 0.1 },
    camera: { pos: [0, 1.5, 1.8], look: [0, 1.3, -1.2], fov: 46 },
    place: {
      shell: 'box',
      shellParams: { w: 4.4, d: 4.4, h: 2.6, wallMat: 'flat', window: false },
      props: [
        { type: 'table', pos: [0, 0, -1], w: 1.8, d: 1.1, color: '#3a3f46' },
        { type: 'screenPanel', pos: [0, 0.79, -1], rot: [-Math.PI / 2, 0, 0], w: 1.7, h: 1, color: '#e8e0c8', touch: { kind: 'press', depress: 0.015 }, draw: (ctx, W, H) => {
          ctx.fillStyle = '#e8e0c8'; ctx.fillRect(0, 0, W, H)
          ctx.strokeStyle = '#3a4a8a'; ctx.lineWidth = 2
          for (let i = 0; i < 5; i++) {
            ctx.beginPath()
            ctx.moveTo(0, 40 + i * 60)
            ctx.bezierCurveTo(W * 0.3, 20 + i * 60, W * 0.6, 70 + i * 60, W, 40 + i * 60)
            ctx.stroke()
          }
        } },
        { type: 'lampPractical', pos: [1.5, 1.2, -1.6], color: '#ffb868', intensity: 0.9 },
      ],
      systems: [
        { type: 'RainField', density: 140, insideOnly: true, area: [4.2, 2.6, 4.2] },
      ],
    },
  },

  // -------------------------------------------------------------------- minority-report
  'minority-report': {
    family: 'mind-bender',
    grade: { key: '#dce8f0', fill: '#5a7a9a', sat: -0.2, contrast: 0.08, ambient: 0.22 },
    camera: { pos: [0, 1.5, 2.2], look: [0, 1.2, -1.4], fov: 48 },
    place: {
      shell: 'box',
      shellParams: { w: 4.6, d: 4.6, h: 3, wallMat: 'flat' },
      props: [
        { type: 'pool', pos: [0, 0.02, -1.2], radius: 1.4, color: '#c8dce8', glow: '#e0eef8' },
        { type: 'glassWall', pos: [-1.4, 1.5, -0.6], rot: [0, 0.5, 0], w: 1, h: 1.2, color: '#dce8f0', touch: { kind: 'press', depress: 0.02, foley: 'glass' } },
        { type: 'glassWall', pos: [1.4, 1.5, -0.6], rot: [0, -0.5, 0], w: 1, h: 1.2, color: '#dce8f0' },
      ],
      systems: [
        { type: 'AdvanceGlow', prop: 'sphere', from: [0, 0.3, -6], axis: 'z', speed: 0.15, resetAt: 5, color: '#e83030' },
      ],
    },
    // default scorePos (x: 1.2) was clipping the right frame edge at this
    // fov/camera distance — pulled in (QA sweep 2026-08-21).
    info: { scorePos: [0.9, 2.05, -1.6] },
  },

  // -------------------------------------------------------------------------- sunshine
  sunshine: {
    family: 'spectacle',
    // keyIntensity kept low deliberately — this room's "wall" IS the sun
    // (a bright screenPanel, not a light), so the key only needs to warm
    // the room, not compete with it and wash the hot take out entirely.
    grade: { key: '#ffdf9a', fill: '#3a2c18', ambient: 0.2, keyIntensity: 0.7 },
    camera: { pos: [0, 1.5, 2.4], look: [0, 1.5, -2], fov: 50 },
    place: {
      shell: 'box',
      shellParams: { w: 4.6, d: 4, h: 2.8, wallMat: 'flat' },
      props: [
        { type: 'chairRow', pos: [0, 0, 0.4], count: 5, spacing: 0.66, color: '#2a2a30' },
        // reach bumped: the cinema chairRow (pos z:0.4) blocks the walker
        // well short of this screen (pos z:-1.95) — closest achievable
        // approach is ~2.9m away, past the plain 2.4m default (QA sweep,
        // Wave T touch verification).
        { type: 'screenPanel', pos: [0, 2.6, -1.95], w: 1.2, h: 0.5, color: '#1c1c1c', touch: { kind: 'press', depress: 0.012, reach: 3.4 }, draw: (ctx, W, H) => {
          ctx.fillStyle = '#1c1c1c'; ctx.fillRect(0, 0, W, H)
          ctx.fillStyle = '#ffdf9a'; ctx.font = 'bold 60px Georgia'; ctx.fillText('67%', 40, 90)
        } },
      ],
      systems: [
        { type: 'PulseBeat', bpm: 6, depth: 0.2 },
      ],
    },
  },

  // ------------------------------------------------------------------- annihilation
  annihilation: {
    family: 'weird-fable',
    grade: { key: '#4fd6c8', fill: '#2a1c4a', sat: 0.25, ambient: 0.16 },
    camera: { pos: [0, 1.5, 2.2], look: [0, 1.4, -1.6], fov: 54 },
    place: {
      shell: 'open',
      shellParams: { ground: 'grass', groundColor: '#2a4a3a', skyTop: '#3a2c60', skyBottom: '#4a3a70', horizon: false },
      props: [
        { type: 'glassWall', pos: [0, 1.4, -1.8], w: 3.6, h: 2.6, color: '#8ae8d8' },
        { type: 'tree', pos: [-1.4, 0, -4], scale: 1.1, foliage: '#4fd6c8', trunk: '#2a5a4a', touch: { kind: 'nudge', amplitude: 0.1, reach: 3.4 } },
        { type: 'tree', pos: [1.6, 0, -4.4], scale: 1.3, foliage: '#c84fd6', trunk: '#2a5a4a' },
      ],
      systems: [],
    },
  },

  // ------------------------------------------------------------------------ oblivion
  oblivion: {
    family: 'spectacle',
    // keyIntensity dropped: near-white key on an already-pale flat-white
    // room blew out to a solid white void (QA sweep 2026-08-21, same class
    // as moon's fix).
    grade: { key: '#eaf4ff', fill: '#c8d8e0', ambient: 0.3, sat: -0.1, keyIntensity: 0.3 },
    camera: { pos: [0, 1.5, 2], look: [0, 1.4, -1.4], fov: 52, far: 200 },
    place: {
      shell: 'box',
      shellParams: { w: 4.6, d: 4.6, h: 2.8, wallMat: 'flat', window: true },
      props: [
        { type: 'slab', pos: [0, 0.02, -1.6], size: [3, 0.05, 1.6], color: '#dfeaf2' },
        { type: 'glassWall', pos: [0, 1, -2.2], w: 3, h: 1, color: '#eaf4ff', touch: { kind: 'press', depress: 0.02, foley: 'glass' } },
      ],
      systems: [
        { type: 'AdvanceGlow', prop: 'sphere', from: [-1.6, 1.6, -1], axis: 'x', speed: 0.06, resetAt: 3.2, color: '#eaf4ff' },
      ],
    },
  },

  // ----------------------------------------------------------------------------- game
  game: {
    family: 'mind-bender',
    grade: { key: '#c9a24a', fill: '#3a3020', ambient: 0.24 },
    camera: { pos: [0, 1.5, 1.8], look: [0, 1.3, -1.2], fov: 48 },
    place: {
      shell: 'box',
      shellParams: { w: 4, d: 4, h: 2.6, wallMat: 'flat' },
      props: [
        { type: 'table', pos: [-0.8, 0, -1], w: 1, d: 0.6 },
        { type: 'chairRow', pos: [-0.8, 0, -0.5], count: 2, spacing: 0.6 },
        { type: 'counter', pos: [1, 0, -1.4], w: 1, d: 0.5 },
        // the game piece sitting on the table, ready to be flicked spinning.
        { type: 'slab', pos: [-0.8, 0.71, -1], size: [0.09, 0.02, 0.09], color: '#c9a24a', touch: { kind: 'spin', maxSpeed: 16 } },
      ],
      systems: [],
    },
  },

  // -------------------------------------------------------------------------- silverlake
  silverlake: {
    family: 'weird-fable',
    grade: { key: '#4fc8d6', fill: '#1c1c30', ambient: 0.14 },
    camera: { pos: [0, 1.4, 2], look: [0, 1.2, -1.6], fov: 52 },
    place: {
      shell: 'open',
      shellParams: { ground: 'concrete', groundColor: '#1a1a24', skyTop: '#20203a', skyBottom: '#302a48', horizon: true, distantCity: 22 },
      props: [
        { type: 'pool', pos: [0, 0.02, -1.6], radius: 1.5, glow: '#4fc8d6' },
        { type: 'screenPanel', pos: [1.6, 1.5, -2], w: 0.9, h: 0.6, color: '#0e0e18', touch: { kind: 'press', depress: 0.015 }, draw: (ctx, W, H) => {
          ctx.fillStyle = '#0e0e18'; ctx.fillRect(0, 0, W, H)
          ctx.strokeStyle = '#4fc8d6'; ctx.lineWidth = 2
          ctx.strokeRect(20, 20, W - 40, H - 40)
          ctx.beginPath(); ctx.moveTo(40, 60); ctx.lineTo(W - 60, 90); ctx.lineTo(W - 40, H - 40); ctx.stroke()
        } },
      ],
      systems: [
        { type: 'GlyphRain', pos: [0, 0.02, -1.6], area: [3, 3], color: '#4fc8d6', columns: 8, speed: 0.15 },
        { type: 'LookAwayGrow', pos: [1.6, 1.5, -2], max: 1, grow: false, color: '#4fc8d6' },
      ],
    },
  },

  // -------------------------------------------------------------------------- hereditary
  hereditary: {
    family: 'dread',
    grade: { key: '#c8b060', fill: '#141210', ambient: 0.14 },
    camera: { pos: [0, 1.3, 1.8], look: [0, 1.1, -1.4], fov: 44 },
    place: {
      shell: 'box',
      shellParams: { w: 3.8, d: 3.8, h: 2.1, wallMat: 'wood', window: true },
      props: [
        { type: 'table', pos: [0, 0, -0.8], w: 0.6, d: 0.4, h: 0.5, color: '#3a2c1c', touch: { kind: 'nudge', amplitude: 0.12, foley: 'thunk' } },
        { type: 'chairRow', pos: [0, 0, -0.4], count: 2, spacing: 0.35, seatH: 0.28 },
        { type: 'slab', pos: [0, 1.05, -1.89], size: [3.8, 0.02, 0.02], color: '#0a0806' },
        { type: 'slab', pos: [-1.89, 1.05, 0], size: [0.02, 0.02, 3.8], color: '#0a0806' },
      ],
      systems: [
        { type: 'PeripheralFigure', corner: 'high', pos: [1.7, 1.95, -1.7], color: '#0a0806' },
      ],
    },
  },

  // -------------------------------------------------------------------------- malignant
  malignant: {
    family: 'dread',
    grade: { key: '#8a3a3a', fill: '#0e0a0e', ambient: 0.1 },
    camera: { pos: [0, 1.4, 1.4], look: [0, 1.3, -1], fov: 46 },
    place: {
      shell: 'box',
      shellParams: { w: 3.4, d: 3.4, h: 2.4, wallMat: 'flat' },
      props: [
        { type: 'bed', pos: [-0.4, 0, -0.6], rot: [0, 0.1, 0], touch: { kind: 'nudge', amplitude: 0.1, foley: 'thunk' } },
        { type: 'mirrorPlane', pos: [1.4, 1.5, -0.8], rot: [0, -0.4, 0], w: 0.8, h: 1.4, tint: '#3a2828' },
        { type: 'abstractFigure', pos: [1.4, 0, -0.4], rot: [0, Math.PI, 0], color: '#0a0808', pose: 'stand' },
      ],
      systems: [
        { type: 'DwellConcede', afterSec: 25 },
      ],
    },
    // this box is narrow (w:3.4) — default scorePos (x:1.2) was clipping
    // the right frame edge at this fov (QA sweep 2026-08-21).
    info: { scorePos: [0.85, 1.9, -1.35] },
  },
}

const CAMERA = { pos: [0, 1.55, 3.2], look: [0, 1.3, 0], fov: 50, far: undefined }

const INFO = {
  hotTakePos: [0, 1.55, -1.7],
  hotTakeRot: [0, 0, 0],
  scorePos: [1.2, 2.05, -1.68],
  metaPos: [0, 0.78, -1.66],
}

export function defaultConfigFor(film) {
  const p = film?.palette || {}
  const bg = p.bg || '#0d1418'
  const key = p.acc || p.fg || '#4FB6D9'
  const fill = p.sub || '#22334a'

  return {
    family: 'default',
    grade: {
      bg,
      fogColor: bg,
      fogDensity: 0.065,
      key,
      keyIntensity: 2.4,
      fill,
      ambient: 0.16,
      sat: 0,
      contrast: 0,
      hue: 0,
    },
    camera: { ...CAMERA },
    place: {},
    info: { ...INFO },
  }
}
