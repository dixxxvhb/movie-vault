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
//
// Phase 3 cleanup: the first 16 entries below (memento through
// disclosure-day, registry.js's BESPOKE map) are now hand-built rooms —
// their component reads `film`/`config`/`infoVisible` directly and stages
// its own geometry, never GenericRoom. registry.js's getRoomComponent()
// picks BESPOKE[slug] over the family/place-driven path unconditionally
// once a slug is in that map, so a bespoke entry here is thin ON PURPOSE:
// only `family` (still feeds preset defaults into any grade/camera/lights
// field the entry doesn't set itself — see getRoomConfig's merge order),
// `grade`/`camera` (FilmWorld's ambient fill + the pre-enter camera, and
// each bespoke component's own `config.camera.pos`/`config.grade.bg`
// reads), and `lights` where a bespoke room actually asks for the layered
// rig (nightcrawler, currently the only one). `place` (shell/props/systems)
// and `info` (hotTake/score/meta positions) are BOTH dead for these 16 —
// grep confirms no bespoke component ever reads `config.place` or
// `config.info`; each one builds its own geometry and its own diegetic
// record placement by hand. They used to carry a full `place` block anyway
// (each was a Wave B GenericRoom stand-in before Phase 2 replaced it with a
// bespoke component) — stripped here rather than left as inert weight.

// Lays an authored scrap flat on a top (info.fragments tilt).
const FLAT = -Math.PI / 2

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
  },

  // ----------------------------------------------------------- the-departed
  // Bespoke now (Phase 2, src/rooms/bespoke/Departed.jsx): camera retuned to
  // the hand-built roof/elevator geometry. `place`/`info` (Wave B's
  // GenericRoom stand-in) stripped Phase 3 — see the file header.
  'the-departed': {
    family: 'intimate-tension',
    // P1 polish pass (IMMERSION-V2-POLISH-SPEC.md): golden-hour triplet —
    // moderate grain (film-stock warmth, not noise), a gentle vignette (this
    // room is wide open sky, a heavy vignette would fight the haze), bloom
    // kept modest so the sun disc/skyline glow reads without blowing out
    // the dossier sheet.
    grade: { key: '#e8b060', fill: '#3a2e22', sat: 0.08, ambient: 0.27, grain: 0.06, vignette: 0.5, bloomIntensity: 0.34 },
    camera: { pos: [0, 1.6, 3.4], look: [0, 1.45, -3.3], fov: 54, far: 90 },
  },

  // ----------------------------------------------------------------- sicario
  // Bespoke now (Phase 2, src/rooms/bespoke/Sicario.jsx): the room's own
  // entry is the dusk staging ground, not the tunnel — grade/camera below
  // match its GROUND_STATION exactly (warm dusk, not tunnel green; the
  // green/thermal grade only exists as gradeBus overrides published once
  // you've actually descended, same seam Memento uses for its own split).
  // `place`/the old tunnel-only camera (Wave B's GenericRoom stand-in)
  // stripped Phase 3 — see the file header.
  sicario: {
    family: 'dread',
    // grain/vignette/bloomIntensity: the dusk-ground baseline — Deakins-dusk
    // reads clean (low grain, wide-open vignette), the tunnel's own
    // green/thermal triplet (Sicario.jsx's GREEN/THERMAL) takes over the
    // instant you're underground.
    grade: { key: '#e8935a', fill: '#2a3a55', sat: 0.05, ambient: 0.3, keyIntensity: 1, grain: 0.045, vignette: 0.6, bloomIntensity: 0.26 },
    camera: { pos: [0, 1.9, 3.2], look: [0, 0.85, -2.4], fov: 56, far: 90 },
  },

  // ------------------------------------------------------------------ matrix
  // Bespoke now (Phase 2, src/rooms/bespoke/Matrix.jsx): camera/grade below
  // match the bespoke room's own entry station exactly, same convention
  // 'the-sting' uses, so FilmWorld's ambientLight and the pre-enter camera
  // agree with what the hand-built rooftop actually shows. `place`/`info`
  // (Wave B's GenericRoom stand-in) stripped Phase 3 — see the file header.
  matrix: {
    family: 'spectacle',
    // P1 polish pass: green pushed properly (this room's gradeBus override
    // republishes sat/hue/contrast off these same fields — see Matrix.jsx),
    // grain low (a clean digital-ish freeze, not film stock), contrast up,
    // vignette moderate so the periphery glyph rain still reads at the edge.
    grade: { key: '#7fae5a', fill: '#2a3a22', sat: 0.12, hue: 0.03, contrast: 0.14, grain: 0.03, vignette: 0.46, bloomIntensity: 0.36 },
    camera: { pos: [0, 1.7, 3.4], look: [0, 1.3, 0], fov: 52, far: 300 },
  },

  // ------------------------------------------------------------------ br2049
  // Bespoke now (Phase 2, src/rooms/bespoke/BR2049.jsx): camera lowered to
  // match the bespoke room's own entry station (the brief's "camera height
  // lowered in this room only"). `place` (Wave B's GenericRoom stand-in)
  // stripped Phase 3 — see the file header.
  br2049: {
    family: 'spectacle',
    // bg/fogColor overridden: the ledger palette's own bg is the film's
    // warm Vegas-orange card gradient, right for a polaroid front but wrong
    // as this room's resting state — the brief's base grade is cold blue-
    // grey night, with the orange only rolling through periodically
    // (ScheduledCut, mounted in the bespoke room itself, owns that beat).
    // Wave P1 finishing pass: grain/vignette/bloomIntensity tuned like a
    // colorist for this film specifically — moody cold night, heavier
    // vignette than a lit interior room since the sea wall is meant to feel
    // like it's closing in at the edges of frame, and enough bloom to catch
    // the billboard glow + the wet-concrete sheen pools without blowing out
    // (the InfoPlinth's hot-take paper stays non-emissive, so it never
    // competes with those two intended bloom sources).
    // ambient lifted from 0.12: this room is a wide-open exterior (a 14m
    // sea wall, not a tight box), so the point-light falloff alone leaves a
    // bigger unlit gap between fixtures than a small interior does — a
    // slightly higher floor keeps far reaches of the wall/deck from reading
    // as pure void without flattening the grazing sheen the wetconcrete
    // material depends on (see BR2049.jsx's own LightRig comment).
    grade: {
      bg: '#0a1620', fogColor: '#0a1620', key: '#3a6a8a', fill: '#0a1620', sat: -0.15, ambient: 0.17,
      grain: 0.07, vignette: 0.84, bloomIntensity: 0.4,
    },
    camera: { pos: [0, 1.35, 3], look: [0, 1.05, -8], fov: 50, far: 200 },
  },

  // ---------------------------------------------------------------- the-sting
  // Bespoke now (Phase 2, src/rooms/bespoke/Sting.jsx): grade/camera below
  // match the bespoke room's own FRONT station exactly (its default entry
  // view) so FilmWorld's ambientLight and the pre-enter camera line up with
  // what the hand-built parlor actually shows. `place`/`info` (Wave B's
  // GenericRoom stand-in) stripped Phase 3 — see the file header.
  'the-sting': {
    family: 'weird-fable',
    grade: { key: '#c8964a', fill: '#3a2c1a', sat: 0.1, ambient: 0.24, grain: 0.07, vignette: 0.55, bloomIntensity: 0.26 },
    camera: { pos: [0, 1.5, 2.2], look: [0, 1.3, -1.6], fov: 50 },
  },

  // ------------------------------------------------------------------- enemy
  // Bespoke now (Phase 2, src/rooms/bespoke/Enemy.jsx): camera/grade below
  // already matched the bespoke room's own entry station, so no change was
  // needed here. `place` (Wave B's GenericRoom stand-in) stripped Phase 3 —
  // see the file header.
  enemy: {
    family: 'mind-bender',
    // P1 finishing pass: sat/contrast pushed past the pre-polish pass
    // (0.12/0.06) per the brief's "yellow-sepia haze grade pushed hard" —
    // Enemy.jsx's own setGradeOverride reads sat/contrast from here with
    // these as its fallback. A first pass pushed to 0.22/0.12 and clipped
    // every close-lit surface (furniture near the practical/bounce lights)
    // to solid white once Bloom's mipmap blur piled on top — contrast that
    // high only reads correctly on large, already-dim wall planes. Backed
    // off to a smaller-but-still-visible push. grain/vignette/bloomIntensity
    // are the Wave P0 grade triplet (spec #5), tuned for a grimy Toronto
    // apartment: more grain than darkknight's proof-room baseline, vignette
    // pulled in a touch, bloom kept modest so only the window/score stay
    // bloom-hot.
    grade: {
      key: '#c9a24a', fill: '#3a3020', sat: 0.16, contrast: 0.08,
      grain: 0.07, vignette: 0.66, bloomIntensity: 0.24,
    },
    camera: { pos: [0, 1.5, 1.8], look: [0, 1.4, -1.8], fov: 46 },
    // The house switch on this set's own wall. The default anchor assumes the
    // preset's 4.2 m box, which put it behind a wall or out in mid-air here.
    place: { shellParams: { switch: [0.62, 2.045, Math.PI] } },
  },

  // ------------------------------------------------------------ nightcrawler
  // Bespoke now (Phase 2, src/rooms/bespoke/Nightcrawler.jsx): grade/camera
  // below match the bespoke room's own entry composition (guardrail,
  // sodium-grid horizon). `lights` below is LIVE — Nightcrawler.jsx reads
  // `config.lights` straight into its own <LightRig>, the one bespoke slug
  // that does (see the file header's note on why these entries are thin).
  // `place` (Wave B's GenericRoom stand-in) stripped Phase 3.
  nightcrawler: {
    family: 'momentum',
    // P1 finishing pass: grade triplet tuned for "clean digital night" —
    // low grain (this is Lou's camcorder footage, not film stock), deep
    // blacks (vignette kept moderate rather than the 0.92 spec default so
    // it stays controlled/digital instead of moody-crushed), bloom pushed
    // enough that the sodium grid nodes and the REC dot actually glow.
    grade: {
      bg: '#050608', fogColor: '#050608', key: '#ff8a2a', fill: '#0e1218', ambient: 0.1, keyIntensity: 1,
      grain: 0.02, vignette: 0.5, bloomIntensity: 0.5,
    },
    camera: { pos: [0, 1.6, 2.2], look: [0, 1.15, -6], fov: 52, far: 200 },
    // The room's own near-field rig (toolkit doctrine, spec #3): a cool
    // moonlight bounce for the digital-night undertone under the sodium
    // key, plus a rim off the guardrail's brushed metal so it doesn't sit
    // as a flat silhouette against the grid.
    lights: {
      bounce: [
        { pos: [0, 3.2, 2.6], color: '#7a8fb0', intensity: 0.4, distance: 9, decay: 2 },
      ],
      rim: { pos: [2.3, 1.2, -1.9], color: '#ffb060', intensity: 0.55, distance: 5.5, decay: 2 },
    },
  },

  // ------------------------------------------------------------------- stby
  // Bespoke now (Phase 2, src/rooms/bespoke/Stby.jsx): grade/camera below
  // match the bespoke room's own fixed office station. `place` (Wave B's
  // GenericRoom stand-in) stripped Phase 3 — see the file header.
  stby: {
    family: 'intimate-tension',
    // P1 polish pass: key nudged green (fluorescent-tube cast, per the
    // brief) and the grade triplet set deliberately for the mundane
    // call-floor half of the cut — flat, slightly grainy, bloom kept low so
    // only the actual strip fixtures (never the paper/monitor clutter) ever
    // bloom. The penthouse half gets its own distinct triplet via
    // setGradeOverride in Stby.jsx (richer bloom, tighter vignette).
    grade: {
      bg: '#3a3c36', fogColor: '#3a3c36', key: '#dfffe0', fill: '#20242a', sat: -0.05, ambient: 0.35,
      grain: 0.045, vignette: 0.88, bloomIntensity: 0.24,
    },
    camera: { pos: [0, 1.5, 2], look: [0, 1.3, -1.8], fov: 48 },
  },

  // ----------------------------------------------------------------- amadeus
  // Bespoke now (Phase 2, src/rooms/bespoke/Amadeus.jsx): grade/camera below
  // match the bespoke room's own bedchamber. `place` (Wave B's GenericRoom
  // stand-in) stripped Phase 3 — see the file header.
  amadeus: {
    family: 'intimate-tension',
    // P1 polish pass: rich warm/cold split, moderate grain (candlelit film
    // stock, not digital-clean), heavy vignette closing the chamber in.
    grade: {
      bg: '#180f08', fogColor: '#180f08', key: '#e8a860', fill: '#1a2a3a', ambient: 0.11,
      contrast: 0.14, sat: 0.06,
      grain: 0.055, vignette: 0.62, bloomIntensity: 0.4,
    },
    camera: { pos: [1.35, 1.5, 1.7], look: [-0.2, 1.1, -1.2], fov: 50 },
    // The house switch on this set's own wall. The default anchor assumes the
    // preset's 4.2 m box, which put it behind a wall or out in mid-air here.
    place: { shellParams: { switch: [1.85, 2.245, Math.PI] } },
  },

  // ---------------------------------------------------------- predestination
  // Bespoke now (Phase 2, src/rooms/bespoke/Predestination.jsx): grade/camera
  // below match the bespoke room's own bar station. `place` (Wave B's
  // GenericRoom stand-in) stripped Phase 3 — see the file header.
  predestination: {
    family: 'mind-bender',
    grade: { bg: '#241a10', fogColor: '#241a10', key: '#e8b860', fill: '#3a2414', ambient: 0.14, grain: 0.06, vignette: 0.6, bloomIntensity: 0.22 },
    camera: { pos: [0.3, 1.5, 1.3], look: [-0.7, 1.35, -1.3], fov: 48 },
  },

  // ------------------------------------------------------------ baby-driver
  // Bespoke now (Phase 2, src/rooms/bespoke/BabyDriver.jsx): the camera below
  // already framed the car/facade well for the hand-built room, so it's
  // unchanged from the Wave B stand-in. `place` (Wave B's GenericRoom
  // stand-in) stripped Phase 3 — see the file header.
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
  },

  // -------------------------------------------------------------------- ncfom
  // Bespoke now (Phase 2, src/rooms/bespoke/Ncfom.jsx): grade/camera below
  // match the bespoke room's own front-of-counter station (the entry
  // viewpoint FilmWorld lands on; the room itself flies to a second,
  // behind-the-counter station via goToStation when you walk around). `place`
  // (Wave B's GenericRoom stand-in) stripped Phase 3 — see the file header.
  ncfom: {
    family: 'dread',
    grade: { key: '#e8d8a0', fill: '#8a7a5a', sat: -0.2, ambient: 0.32, bg: '#8a7a5a', fogColor: '#8a7a5a', grain: 0.05, vignette: 0.35, bloomIntensity: 0.16 },
    camera: { pos: [0, 1.5, 1.8], look: [0, 1.3, -1.4], fov: 44 },
  },

  // ---------------------------------------------------------------- barbarian
  // Bespoke now (Phase 2, src/rooms/bespoke/Barbarian.jsx): grade/camera
  // below match the bespoke room's own living-room entry station (index -1;
  // the descent below it moves via goToStation). `place` (Wave B's
  // GenericRoom stand-in) stripped Phase 3 — see the file header.
  // --------------------------------------------------- inglourious-basterds
  // Bespoke (src/rooms/bespoke/basterds/): LE GAMAAR, a walkable cinema. Plan:
  // docs/plans/2026-09-22-le-gamaar-basterds-room.md. Spawn is the street,
  // facing the doors (zones.js SPOTS.rue). place.shellParams.switch puts the
  // house switch inside the Room, right of the doors as you face them from the house.
  'inglourious-basterds': {
    family: 'intimate-tension',
    grade: { key: '#ffcf8a', fill: '#1c2230', ambient: 0.2, bg: '#0b0a0c', fogColor: '#0b0a0c', fogDensity: 0.01,
             sat: 0.02, grain: 0.06, vignette: 0.55, bloomIntensity: 0.24 },
    camera: { pos: [0, 1.55, 9.2], look: [0, 5.2, 0], fov: 55, far: 90 },
    place: { shell: 'open', shellParams: { switch: [1.75, -11.06, Math.PI] } },
  },

  barbarian: {
    family: 'dread',
    grade: { key: '#e8a860', fill: '#141416', ambient: 0.16, bg: '#141416', fogColor: '#141416', grain: 0.08, vignette: 0.62, bloomIntensity: 0.2 },
    camera: { pos: [0.3, 1.55, 2.5], look: [-0.2, 1.3, -1.6], fov: 58 },
    // The house switch on this set's own wall. The default anchor assumes the
    // preset's 4.2 m box, which put it behind a wall or out in mid-air here.
    place: { shellParams: { switch: [1.945, 1.2, -Math.PI / 2] } },
  },

  // ---------------------------------------- masters-of-the-universe-2026
  // Bespoke now (Phase 2, src/rooms/bespoke/Motu.jsx): grade/camera below
  // match the bespoke room's own fixed throne-hall station. `place` (Wave
  // B's GenericRoom stand-in) stripped Phase 3 — see the file header.
  'masters-of-the-universe-2026': {
    family: 'spectacle',
    // P1 polish pass: camp-grand and saturated, low grain (this is a clean
    // digital spectacle, not grungy film stock), bloom allowed to bloom the
    // bolts/spotlight per the brief.
    grade: {
      key: '#a84fd6', fill: '#2a5a3a', ambient: 0.16, bg: '#1a1424', fogColor: '#1a1424',
      contrast: 0.08, sat: 0.32,
      grain: 0.02, vignette: 0.42, bloomIntensity: 0.55,
    },
    camera: { pos: [0, 1.5, 3], look: [0, 1.4, -1.5], fov: 50 },
  },

  // ------------------------------------------------------------ disclosure-day
  // Bespoke now (Phase 2, src/rooms/bespoke/DisclosureDay.jsx): grade/camera
  // below match the bespoke room's own fixed podium station. `place` (Wave
  // B's GenericRoom stand-in) stripped Phase 3 — see the file header.
  'disclosure-day': {
    family: 'intimate-tension',
    // P1 polish pass: the boring is authored, not defaulted — slightly
    // over-exposed (a hair of extra contrast/brightness reads as "TV-studio
    // flat" rather than "underlit"), minimal vignette (a vignette implies
    // mood; this room specifically has none), grain near zero (digital-clean
    // civic broadcast, not film stock).
    grade: {
      key: '#f4f0e0', fill: '#8a8470', ambient: 0.55, sat: -0.05, bg: '#d8d2b8', fogColor: '#d8d2b8',
      contrast: 0.05,
      grain: 0.015, vignette: 0.12, bloomIntensity: 0.18,
    },
    camera: { pos: [0, 1.5, 3], look: [0, 1.4, -2], fov: 48 },
    // The house switch on this set's own wall. The default anchor assumes the
    // preset's 4.2 m box, which put it behind a wall or out in mid-air here.
    place: { shellParams: { switch: [0.62, 3.445, Math.PI] } },
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
      // the doors used to stand on the right wall, right over the two-way
      // mirror; they take the wall behind you instead
      doorMount: { position: [0, 0, 2.06], rotationY: Math.PI, spacing: 1.0 },
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
    // P2 round 2 (architect review): the corridor-shell version above
    // still failed — a corridor is a horizontal shaft with straight walls;
    // "the pit" is a CIRCULAR well you look UP out of, and no amount of
    // light-tuning fixes a shell that's the wrong shape for the shot.
    // Rebuilt on the 'open' shell (just floor + sky backdrop, no walls of
    // its own) with a real shaftRing prop (props.jsx, P2 round 2 addition)
    // standing in for the well's curved stone — a hollow cylinder rendered
    // BackSide so the camera, standing at its base, sees the inner face.
    grade: { key: '#e8caa0', fill: '#5a5038', ambient: 0.58, keyIntensity: 1.7, grain: 0.03, vignette: 0.34, bloomIntensity: 0.36 },
    // Architect review round 2 (attempt 2 — the real bug was shaftRing
    // using standardMat()'s default FrontSide, so the stone wall was
    // invisible from inside the cylinder no matter how the camera was
    // aimed: fixed in props.jsx, BackSide clone). With the wall actually
    // rendering, a near-45-degree up-and-across look (rather than
    // straight up the axis) puts the curved stone across most of the
    // frame at a raking angle — where the roughness map shows — while
    // still catching the disc high and off-center as the focal.
    camera: { pos: [0.95, 1.3, -0.2], look: [-0.9, 4.4, -1.7], fov: 66, far: 40 },
    lights: {
      // the light disc itself is unlit (lightDisc prop) so it always
      // reads bright regardless of scale — this key just grazes the
      // stone near the top so the upper shaft isn't a black ring around
      // a bright dot.
      key: { pos: [0, 12.5, 0], intensity: 1.5, distance: 16, decay: 2, color: '#f0d8a8' },
      // a practical near the camera's OWN height, offset to the same side
      // as the near wall — this is the raking light the stone material
      // needs to actually read as stone rather than a flat gradient.
      practicals: [
        { pos: [1.8, 1.7, -0.8], intensity: 1.7, distance: 6.5, color: '#e0b878', decay: 2 },
        { pos: [-1.4, 4.6, -1.6], intensity: 1.0, distance: 8, color: '#c8a068', decay: 2 },
      ],
      bounce: [{ pos: [0, 0.5, 0], intensity: 0.5, distance: 6, color: '#4a4030', decay: 2 }],
    },
    place: {
      shell: 'open',
      shellParams: { ground: 'concrete', groundColor: '#3a3428', skyTop: '#0a0806', skyBottom: '#0a0806', horizon: false, boundsRadius: 2.35 },
      props: [
        // the well: a wide stone cylinder, camera standing at its base
        // looking up its full 13m — radius 2.6 keeps the curve tight
        // enough to read as a WELL, not an open plaza.
        { type: 'shaftRing', pos: [0, 6.6, 0], radius: 2.6, height: 13.2, segments: 26, mat: { kind: 'concrete', tint: '#8a8064', wear: 0.55 } },
        // ledge courses at three heights — the jump ledge (brief: "the
        // jump ledge is reachable") sits at the lower one, within the
        // walker's reach.
        { type: 'ledgeRing', pos: [0, 1.7, 0], radius: 2.52, tube: 0.05, color: '#221e14' },
        { type: 'ledgeRing', pos: [0, 4.8, 0], radius: 2.5, tube: 0.04, color: '#221e14' },
        { type: 'ledgeRing', pos: [0, 8.6, 0], radius: 2.48, tube: 0.04, color: '#221e14' },
        // the light disc far above — the single bright focal the brief
        // asks for, small in frame at this distance.
        { type: 'lightDisc', pos: [0, 13, 0], radius: 1.4, color: '#fff0cc' },
        // debris worked loose from the well's dry wall — Wave T touch,
        // sitting on the lower ledge within reach.
        { type: 'slab', pos: [1.9, 1.78, -0.6], size: [0.3, 0.12, 0.3], color: '#5a4a3a', touch: { kind: 'nudge', amplitude: 0.14, foley: 'thunk' } },
      ],
      // the rope: hangs from partway up (NOT reaching the disc/opening —
      // brief: "the rope is not attached"), drifting slightly off-plumb
      // like real slack rather than a rigid rod. A detail.jsx clutter
      // piece, not a prop: sitting in `props` it never rendered at all.
      clutter: [
        {
          type: 'wireRun',
          points: [[1.4, 9.2, -0.9], [1.55, 6.4, -0.75], [1.3, 3.2, -0.95]],
          sag: 0.18, radius: 0.02, color: '#3a3226',
        },
      ],
      systems: [
        { type: 'PulseBeat', bpm: 40, depth: 0.3 },
      ],
    },
    // hot take + rating placed on the near stone, roughly along the
    // camera's own upward sightline but offset off-axis from the disc —
    // secondary to the well (small in frame, not blocking the focal),
    // per the architect's framing note. Positions recomputed for the
    // round-2 oblique camera (previous positions sat to the camera's
    // SIDE, outside its cone entirely — that's why the record never
    // rendered in the earlier attempts).
    info: {
      hotTakePos: [0.35, 3.05, -1.65], hotTakeRot: [0, 0.4, 0],
      scorePos: [1.55, 3.75, -1.35],
      metaPos: [0.25, 2.25, -1.75],
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
        // two seats either side of the aisle, one row per z, inside the 2.6 m
        // car (a single 3-wide row at 1.4 spacing ran 0.7 m out through both walls)
        { type: 'chairRow', pos: [-0.75, 0, -1], count: 2, spacing: 0.48, color: '#c8607a' },
        { type: 'chairRow', pos: [0.75, 0, -1], count: 2, spacing: 0.48, color: '#e8a86a' },
        { type: 'chairRow', pos: [-0.75, 0, -2.6], count: 2, spacing: 0.48, color: '#e8a86a' },
        { type: 'chairRow', pos: [0.75, 0, -2.6], count: 2, spacing: 0.48, color: '#c8607a' },
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
      // openBack: the glass IS the back wall, so the forest beyond it shows
      // (behind an opaque wall the three trees never rendered at all)
      shellParams: { w: 4, d: 4, h: 2.6, wallMat: 'flat', openBack: true },
      props: [
        { type: 'glassWall', pos: [0, 1.3, -1.98], w: 3.8, h: 2.4, color: '#a8e0e8', touch: { kind: 'press', depress: 0.02, foley: 'glass' } },
        { type: 'glassWall', pos: [-1.98, 1.3, 0], rot: [0, Math.PI / 2, 0], w: 3.8, h: 2.4, color: '#a8e0e8' },
        { type: 'tree', pos: [0, 0, -6], scale: 1.4, foliage: '#1c3a24' },
        { type: 'tree', pos: [-2, 0, -7], scale: 1.1, foliage: '#1c3a24' },
        { type: 'tree', pos: [2.4, 0, -6.6], scale: 1.2, foliage: '#1c3a24' },
      ],
      systems: [
        { type: 'ScheduledCut', period: 50, duration: 3000, altGrade: '#a83a3a' },
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
      shellParams: { length: 14, width: 2.2, height: 2.4, ribs: 8, wallTint: '#0e0e10', farLight: true, mouthZ: 2.7 },
      props: [
        // a supply crate shoved against the corridor wall — Wave T touch.
        { type: 'slab', pos: [-0.75, 0.3, -2.2], size: [0.5, 0.6, 0.4], color: '#2e2a24', touch: { kind: 'nudge', amplitude: 0.16, foley: 'thunk', reach: 2.8 } },
        // P2 sweep fix: this was sitting in `systems` (a props.jsx type, not
        // a SYSTEMS one) and never rendered — moved into `props` where it
        // actually resolves. No outer rot: paperScatter already lays flat.
        { type: 'paperScatter', count: 20, area: [1.8, 8], color: '#c8c0a8', pos: [0, 0.02, -3] },
      ],
      systems: [
        // Starts down the corridor and comes at you, resetting before it
        // reaches the camera. Both earlier starts (z +6, then z +9) sat behind
        // the camera, and AdvanceGlow travels toward -Z from a positive start,
        // so the red panel swept through the lens every cycle.
        { type: 'AdvanceGlow', from: [0, 1.3, -12], axis: 'z', speed: 0.2, resetAt: 10, color: '#c22e2e' },
      ],
    },
    // the default scorePos (x 1.2) sat half inside this 2.2 m corridor's wall
    info: { scorePos: [0.5, 1.95, -2.6] },
  },

  // ---------------------------------------------------------------------- maverick
  maverick: {
    family: 'spectacle',
    // Rebuilt 2026-09-27. The cockpit box (2.4 x 2 x 1.8 m, one window
    // plane) rendered as a black void with the record pressed against the
    // lens. The film's place is the carrier deck at the golden hour: the
    // jet on the cat, the shooter, the island, the sea to the horizon.
    grade: {
      bg: '#e2a574', fogColor: '#d9a07a', fogDensity: 0.01,
      key: '#ffc27e', keyIntensity: 2.2, fill: '#5a6a80', ambient: 0.42,
      sat: 0.08, contrast: 0.08, grain: 0.04, vignette: 0.38, bloomIntensity: 0.3,
    },
    camera: { pos: [-0.6, 1.62, 3.4], look: [0.6, 1.3, -4], fov: 50, far: 300 },
    lights: {
      key: { type: 'directional', pos: [-12, 5, -22], intensity: 1.4, color: '#ffb46e' },
      bounce: [{ pos: [0, 1.2, 3.5], intensity: 0.55, distance: 12, color: '#6a7a92', decay: 2 }],
    },
    place: {
      shell: 'open',
      // the ground disc is the sea; the deck is a slab laid on it
      shellParams: { ground: 'concrete', groundColor: '#1e3042', skyTop: '#34466a', skyBottom: '#f2aa6a', horizon: true, boundsRadius: 7.5 },
      props: [
        // the flight deck, and its angled landing line
        { type: 'slab', pos: [0, 0.02, -6], size: [16, 0.04, 40], color: '#3c3e42', roughness: 0.9 },
        { type: 'slab', pos: [-1.6, 0.045, -6], rot: [0, 0.16, 0], size: [0.12, 0.01, 30], color: '#e8c24a' },
        { type: 'slab', pos: [1.4, 0.045, -4], size: [0.08, 0.01, 14], color: '#e8e4d8' },
        // the jet on the catapult: fuselage, wings, canopy, twin tails
        { type: 'slab', pos: [1.4, 1.0, -4.2], size: [0.9, 0.8, 6.2], color: '#8a9098', metalness: 0.35, roughness: 0.5 },
        { type: 'slab', pos: [1.4, 0.95, -4.8], size: [5.4, 0.1, 1.9], color: '#7e848c', metalness: 0.35, roughness: 0.5 },
        { type: 'slab', pos: [1.4, 1.52, -2.4], size: [0.56, 0.36, 1.5], color: '#2a3038', metalness: 0.6, roughness: 0.2 },
        { type: 'slab', pos: [1.05, 1.85, -6.7], rot: [0, 0, 0.35], size: [0.08, 1.1, 1.0], color: '#7e848c', metalness: 0.35 },
        { type: 'slab', pos: [1.75, 1.85, -6.7], rot: [0, 0, -0.35], size: [0.08, 1.1, 1.0], color: '#7e848c', metalness: 0.35 },
        // the jet blast deflector, raised behind it
        { type: 'slab', pos: [1.4, 0.7, -8.6], rot: [0.5, 0, 0], size: [4.2, 1.6, 0.12], color: '#4a4c50', metalness: 0.4 },
        // the island
        { type: 'slab', pos: [7.2, 3.2, -9], size: [2.6, 6.4, 5.5], color: '#50545a', roughness: 0.8 },
        { type: 'lampPractical', pos: [6.0, 4.6, -7.0], color: '#ff5a3a', intensity: 0.5, distance: 4 },
        // the shooter in yellow, crouched to launch; a deck hand by the helmet bag
        { type: 'abstractFigure', pos: [-0.3, 0, -2.4], rot: [0, 0.9, 0], color: '#e0b43a', pose: 'crouch' },
        { type: 'abstractFigure', pos: [-2.4, 0, -1.4], rot: [0, 0.5, 0], color: '#3a6ab0', pose: 'stand' },
        // his flight bag, dropped on the deck: touch it
        { type: 'bevelBox', pos: [-1.6, 0.18, 0.6], w: 0.6, h: 0.36, d: 0.4, radius: 0.05, color: '#4a5236', touch: { kind: 'nudge', amplitude: 0.08, foley: 'thunk' } },
      ],
      atmosphere: [
        // catapult steam drifting off the track
        { type: 'DustField', pos: [1.4, 0.3, -1.2], density: 40, size: 0.02, opacity: 0.18, area: [1.2, 0.6, 5], color: '#f0e8e0', speed: 0.3 },
      ],
      systems: [
        // the flyby: jets streaking along the horizon
        { type: 'StreakLights', axis: 'x', speed: 7, colors: ['#fff2d8'], count: 3, span: 70, y: 9, z: -32 },
        { type: 'PulseBeat', bpm: 90, depth: 0.12 },
      ],
    },
    info: {
      scorePos: [-2.2, 2.3, -3.2],
      metaPos: [-1.4, 1.45, -3.0],
    },
  },

  // -------------------------------------------------------------------------- moon
  moon: {
    family: 'intimate-tension',
    // P2 sweep fix: keyIntensity 0.3 correctly muted the preset's OWN rig
    // (see lightRig.js's scale), but the two lampPractical props are
    // separate point lights baked into props.jsx (not scaled by
    // keyIntensity at all) — at 0.6 authored intensity each, 2m from a
    // near-white 2.6m-wide corridor, those two alone blew the room to
    // solid white regardless of the rig fix. Dimmed both, darkened the
    // wall tint a shade off pure white, and gave the corridor a real
    // materials.js surface now that CorridorShell supports one (P2 lift).
    grade: { key: '#e8e8f0', fill: '#7a7a84', ambient: 0.2, sat: -0.15, keyIntensity: 0.5, grain: 0.03, vignette: 0.4, bloomIntensity: 0.22 },
    camera: { pos: [0, 1.5, 2.2], look: [0, 1.4, -4], fov: 48, far: 40 },
    place: {
      shell: 'corridor',
      shellParams: {
        length: 8, width: 2.6, height: 2.4, ribs: 4, wallTint: '#b8b8bc', farLight: false, mouthZ: 2.4,
        mat: { walls: 'tile', floor: 'tile', ceiling: 'plaster', wallWear: 0.15, floorWear: 0.2 },
      },
      props: [
        // exactly two — the room's own doubling motif: nudge one, its twin
        // answers half a second later (Wave T `pairId`).
        { type: 'lampPractical', pos: [-0.8, 2, -1], color: '#f0f0ff', intensity: 0.28, touch: { kind: 'nudge', amplitude: 0.14, pairId: 'moon-lamps' } },
        { type: 'lampPractical', pos: [0.8, 2, -1], color: '#f0f0ff', intensity: 0.28, touch: { kind: 'nudge', amplitude: 0.14, pairId: 'moon-lamps' } },
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
        { type: 'chairRow', pos: [-0.75, 0, -1], count: 2, spacing: 0.48, color: '#8a5a3a', touch: { kind: 'nudge', amplitude: 0.12, reach: 2.8 } },
        { type: 'chairRow', pos: [0.75, 0, -1], count: 2, spacing: 0.48, color: '#8a5a3a' },
        { type: 'chairRow', pos: [-0.75, 0, -2.6], count: 2, spacing: 0.48, color: '#8a5a3a' },
        { type: 'chairRow', pos: [0.75, 0, -2.6], count: 2, spacing: 0.48, color: '#8a5a3a' },
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
        // no outer rot — paperScatter already lays flat on its own (see the
        // memento note above); the old rot=[PI/2,0,0] here double-rotated
        // the pile onto its edge instead of scattered flat on the deck.
        { type: 'paperScatter', pos: [0.9, 0.02, -1.4], count: 10, area: [0.5, 0.5], color: '#c8a860', touch: { kind: 'nudge', amplitude: 0.15 } },
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
    // P2 round 2 (architect review), two real bugs found in order:
    // (1) grade.fill doubles as ambientLight's color, and keyIntensity was
    //     still well under the neutral 2.4 baseline — fixed by lightening
    //     fill and raising keyIntensity.
    // (2) camera.pos sat at z=2.4 while d=4 caps the room at z=+2 — the
    //     lens was embedded behind its own back wall the entire time.
    // (3) a THIRD bug, found via an A/B diagnostic (mat on vs off at the
    //     same light levels): materials.js's standardMat() surfaces render
    //     dramatically darker than BoxShell's plain wallCanvas fallback at
    //     equal ambient/key values — cranking ambient to 3.5 with `mat` on
    //     barely moved this room's exposure, while dropping `mat` entirely
    //     at ambient 0.5 alone nearly tripled it. That's a materials.js/
    //     BoxShell interaction worth its own investigation (flagged
    //     separately); for this room, staying on the plain wallCanvas path
    //     (still real per-kind noise, just no roughness/bump maps) is the
    //     one that actually reads as a lit room within this round's budget.
    grade: { key: '#ffdf9a', fill: '#8a6c3c', bg: '#5a4424', ambient: 0.55, keyIntensity: 3.2, grain: 0.03, vignette: 0.3, bloomIntensity: 0.36 },
    camera: { pos: [0, 1.5, 1.7], look: [0, 1.6, -1.95], fov: 50 },
    place: {
      shell: 'box',
      shellParams: {
        w: 4.6, d: 4, h: 2.8, wallMat: 'flat',
      },
      props: [
        { type: 'chairRow', pos: [0, 0, 0.4], count: 5, spacing: 0.66, color: '#2a2a30' },
        // the sun itself: a wall-filling emissive disc behind a dimming
        // filter, per the brief's own staging ("chairs facing the light").
        { type: 'screenPanel', pos: [0, 1.7, -1.97], w: 3, h: 2.2, color: '#3a2c18', draw: (ctx, W, H) => {
          const g = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W / 2)
          g.addColorStop(0, '#fff2c8'); g.addColorStop(0.55, '#ffcf6a'); g.addColorStop(1, '#3a2410')
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
        } },
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
    // P2 sweep fix: keyIntensity 0.3 muted the point lights fine, but
    // BoxShell's `window` mesh is an UNLIT meshBasicMaterial painted
    // straight from grade.key — a near-white key at full opacity is a
    // bright unlit plane no light-intensity scale can dim. That's what was
    // actually blowing this room to a solid white void. Backed the key off
    // pure white to a pale sky-blue (still reads as "glass pool edge, sky
    // tower" bright) and gave the shell a real material so there's texture
    // to see once the window stops being the whole frame.
    // P2 round 2: same fill-double-duty issue as hereditary/sunshine —
    // lightened the tint the walls actually render with and pushed
    // keyIntensity near neutral (it was still at 46% of the 2.4 baseline).
    grade: { key: '#bfe0f0', fill: '#a8c4d4', bg: '#8098a8', ambient: 0.26, sat: -0.1, keyIntensity: 2.6, grain: 0.03, vignette: 0.32, bloomIntensity: 0.3 },
    camera: { pos: [0, 1.5, 2], look: [0, 1.4, -1.4], fov: 52, far: 200 },
    place: {
      shell: 'box',
      shellParams: {
        w: 4.6, d: 4.6, h: 2.8, wallMat: 'flat', window: true,
        mat: { walls: 'metal', floor: 'tile', ceiling: 'metal', wallWear: 0.1, floorWear: 0.1 },
      },
      props: [
        // darkened off near-white — this flat slab under the key light was
        // the last blown-out patch in the P2 sweep fix above.
        { type: 'slab', pos: [0, 0.02, -1.6], size: [3, 0.05, 1.6], color: '#9ab0bc', roughness: 0.35, metalness: 0.15 },
        { type: 'glassWall', pos: [0, 1, -2.2], w: 3, h: 1, color: '#eaf4ff', touch: { kind: 'press', depress: 0.02, foley: 'glass' } },
      ],
      systems: [
        // P2 round 2: this drone orb was the last hot patch in the room —
        // AdvanceGlow.jsx now exposes `intensity` for exactly this case.
        { type: 'AdvanceGlow', prop: 'sphere', from: [-1.6, 1.6, -1], axis: 'x', speed: 0.06, resetAt: 3.2, color: '#bfe0f0', intensity: 0.4 },
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
    // P2 round 2 (architect review): round 1's fix was too timid on TWO
    // fronts that both punish a dark room doubly — grade.fill is not just
    // the ambientLight's color (BoxShell/GenericRoom), it's ALSO the
    // literal tint fed into the wall's own materials.js surface, so a
    // dark fill makes the walls themselves dark AND starves the ambient
    // term at the same time. And keyIntensity 1.4 is still WELL below
    // defaultConfigFor's neutral 2.4 baseline (see lightRig.js's scale) —
    // "raised" from 0 read as raised, but it was still scaling the
    // preset's whole rig down to 58%. Lightened the actual wall/floor
    // tint (still a believable dim wood, just not black-on-black) and
    // pushed keyIntensity to the room's neutral point instead of a
    // fraction of it.
    grade: { key: '#c8b060', fill: '#6a5638', bg: '#443826', ambient: 0.32, keyIntensity: 3.0, grain: 0.07, vignette: 0.5, bloomIntensity: 0.16 },
    camera: { pos: [0, 1.3, 1.8], look: [0, 1.1, -1.4], fov: 44 },
    place: {
      shell: 'box',
      shellParams: {
        w: 3.8, d: 3.8, h: 2.1, wallMat: 'wood', window: true,
        mat: { walls: 'wood', floor: 'wood', ceiling: 'plaster', wallWear: 0.4, floorWear: 0.45 },
      },
      // the dollhouse ceiling is 2.1 m; a full door (2.13 m) punched through it
      doorMount: { scale: 0.86 },
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

  // ============================================================ 2026-09-27
  // The fifteen films that were still standing in the Default placeholder
  // (a fog disc with no walls, doors or sound). Each is staged in the film's
  // own iconic place, and authors its own hot-take scraps (info.fragments)
  // so the take is never buried inside a carrier prop.

  // -------------------------------------------------------------------- se7en
  // The desert under the power pylons. The box on the ground, the unmarked car,
  // Doe kneeling. Hot take: "WHATS IN THE BOXXXXX", Brad Pitt, "that whole scene".
  se7en: {
    family: 'dread',
    grade: {
      bg: '#a88c62', fogColor: '#a88c62', fogDensity: 0.018,
      key: '#f2c58a', keyIntensity: 2.2, fill: '#6a5840', ambient: 0.34,
      sat: -0.28, contrast: 0.12, grain: 0.07, vignette: 0.52, bloomIntensity: 0.18,
    },
    camera: { pos: [0, 1.6, 1.6], look: [0.3, 0.9, -3], fov: 42, far: 160 },
    lights: {
      key: { type: 'directional', pos: [-8, 5, -12], intensity: 1.1, color: '#ffcf90' },
      bounce: [{ pos: [0, 1.2, 3], intensity: 0.5, distance: 14, color: '#8a6a48', decay: 2 }],
    },
    place: {
      shell: 'open',
      shellParams: { ground: 'grass', groundColor: '#b0915e', skyTop: '#c7a46e', skyBottom: '#e6cf9e', horizon: true, boundsRadius: 12 },
      props: [
        // the box
        { type: 'slab', pos: [0.5, 0.18, -1.4], size: [0.42, 0.36, 0.42], color: '#a8844f', touch: { kind: 'nudge', amplitude: 0.06, foley: 'thunk' } },
        { type: 'vehicleMass', pos: [-2.8, 0, -3.4], rot: [0, 0.45, 0], color: '#23262a', w: 1.8, h: 1.25, d: 4.6 },
        // Doe, kneeling in the dirt
        { type: 'abstractFigure', pos: [1.9, 0, -3.0], rot: [0, -0.5, 0], color: '#2a2622', pose: 'sit' },
        // the pylons
        { type: 'slab', pos: [-5, 7, -16], size: [0.45, 14, 0.45], color: '#3a3834', metalness: 0.4 },
        { type: 'slab', pos: [-5, 12.4, -16], size: [7, 0.22, 0.22], color: '#3a3834', metalness: 0.4 },
        { type: 'slab', pos: [7, 6, -30], size: [0.4, 12, 0.4], color: '#3a3834', metalness: 0.4 },
      ],
      atmosphere: [
        { type: 'DustField', density: 36, size: 0.012, opacity: 0.2, area: [6, 2.2, 6], color: '#d8c08c', speed: 0.18 },
      ],
      systems: [],
    },
    info: {
      scorePos: [1.4, 1.75, -2.4],
      metaPos: [0.2, 0.55, -1.8],
      fragments: [
        { index: 0, of: 3, state: 'film', pos: [0.5, 0.18, -1.4], y: 0.365, dz: 0, tilt: FLAT },
        { index: 1, of: 3, state: 'motel', pos: [-2.8, 0, -3.4], dx: 0.6, dz: 1.24, y: 0.715, tilt: FLAT, ry: 0.45 },
        { index: 2, of: 3, state: 'film', pos: [-5, 7, -16], y: 1.6, dz: 0.24, ry: 0.28 },
      ],
    },
  },

  // ---------------------------------------------------------------- spotlight
  // The Spotlight team's cramped office at the Globe: two desks, the bound
  // Church directories, the list with the circled names on the back wall.
  spotlight: {
    family: 'intimate-tension',
    grade: {
      bg: '#23272d', fogColor: '#23272d', fogDensity: 0.03,
      key: '#e6ead8', keyIntensity: 2.2, fill: '#5a6068', ambient: 0.3,
      sat: -0.12, contrast: 0.06, grain: 0.05, vignette: 0.45, bloomIntensity: 0.16,
    },
    camera: { pos: [0.3, 1.6, 2.1], look: [-0.1, 1.2, -2.2], fov: 46 },
    place: {
      shell: 'box',
      shellParams: {
        w: 5.2, d: 5.6, h: 2.5, wallMat: 'plaster',
        mat: { walls: 'plaster', floor: 'carpet', ceiling: 'tile', wallWear: 0.35, floorWear: 0.5 },
        trim: { color: '#3a3a36' },
      },
      props: [
        { type: 'table', pos: [-1.1, 0, -1.4], w: 1.5, d: 0.75, color: '#5e5448' },
        { type: 'table', pos: [1.0, 0, -1.9], w: 1.5, d: 0.75, color: '#5e5448' },
        { type: 'chairRow', pos: [-1.1, 0, -0.75], rot: [0, Math.PI, 0], count: 1, color: '#2c3036', cushion: '#3a3e46' },
        // the list: 87, rows of names, the circled ones
        { type: 'screenPanel', pos: [-0.2, 1.55, -2.78], w: 1.5, h: 0.9, color: '#d8d2c0', intensity: 0.7, draw: (ctx, W, H) => {
          ctx.fillStyle = '#d8d2c0'; ctx.fillRect(0, 0, W, H)
          ctx.fillStyle = '#2a2a2a'; ctx.font = 'bold 40px Georgia'; ctx.fillText('87', 18, 48)
          ctx.fillStyle = '#6a665c'
          for (let r = 0; r < 13; r++) ctx.fillRect(80, 24 + r * 21, 180 + ((r * 53) % 140), 4)
          ctx.strokeStyle = '#a8231c'; ctx.lineWidth = 3
          ;[2, 5, 6, 9, 11].forEach((r) => { ctx.beginPath(); ctx.ellipse(170, 26 + r * 21, 110, 11, 0, 0, Math.PI * 2); ctx.stroke() })
        } },
        { type: 'bevelBox', pos: [2.0, 0.2, -2.4], w: 0.5, h: 0.4, d: 0.4, color: '#9a8a66', touch: { kind: 'nudge', amplitude: 0.08, foley: 'thunk' } },
        { type: 'lampPractical', pos: [-1.6, 0.95, -1.6], color: '#fff0d0', intensity: 0.45 },
      ],
      clutter: [
        { type: 'bookStack', pos: [-0.65, 0.75, -1.45], count: 6, w: 0.24, d: 0.3, colors: ['#6a2a22', '#2a3a4a', '#4a3a22'] },
        { type: 'boxPile', pos: [1.9, 0, -1.2], count: 4, color: '#9a8660', spread: 0.45 },
        { type: 'cup', pos: [1.35, 0.75, -1.75], color: '#e8e0d0' },
      ],
      systems: [
        // the clippings pile up every time you look away from them
        { type: 'LookAwayGrow', pos: [0.3, 0, -0.6], max: 30, color: '#e8e0c8' },
      ],
    },
    info: {
      scorePos: [1.5, 1.9, -2.77],
      metaPos: [-1.7, 2.12, -2.77],
      fragments: [
        { index: 0, of: 2, state: 'film', pos: [-1.1, 0, -1.4], dx: -0.3, dz: 0.1, y: 0.757, tilt: FLAT },
        { index: 1, of: 2, state: 'film', pos: [-0.2, 1.55, -2.78], dx: 1.0, dz: 0.012, y: 1.3 },
      ],
    },
  },

  // ---------------------------------------------------------------- gladiator
  // The Colosseum floor: sand, the curved wall, the tiers, the emperor's box.
  // Maximus stands centre; the verdict is on the wall under the box.
  gladiator: {
    family: 'spectacle',
    grade: {
      bg: '#d6bf94', fogColor: '#d6bf94', fogDensity: 0.02,
      key: '#ffe2a8', keyIntensity: 2.4, fill: '#8a6c46', ambient: 0.36,
      sat: 0.06, contrast: 0.1, grain: 0.04, vignette: 0.4, bloomIntensity: 0.28,
    },
    // camera z < 5.5 so the open-shell door mount (z 5.5, facing -Z) stands behind you
    camera: { pos: [0, 1.6, 3.6], look: [0, 3.2, -10], fov: 56, far: 200 },
    lights: {
      key: { type: 'directional', pos: [6, 12, 4], intensity: 1.2, color: '#fff0d0' },
      bounce: [{ pos: [0, 1.2, 4], intensity: 0.6, distance: 16, color: '#8a6a44', decay: 2 }],
    },
    place: {
      shell: 'open',
      shellParams: { ground: 'grass', groundColor: '#c7a56c', skyTop: '#d9c9a4', skyBottom: '#efe0bd', horizon: false, boundsRadius: 10.2 },
      props: [
        { type: 'shaftRing', pos: [0, 3, 0], radius: 11, height: 6, segments: 48, mat: { kind: 'brick', tint: '#b89a70', wear: 0.6 } },
        { type: 'ledgeRing', pos: [0, 3.4, 0], radius: 10.9, tube: 0.08, color: '#8a7050' },
        { type: 'ledgeRing', pos: [0, 5.6, 0], radius: 10.9, tube: 0.07, color: '#8a7050' },
        // the imperial box
        { type: 'slab', pos: [0, 3.9, -10.4], size: [3.4, 0.25, 1.2], color: '#9a2a22' },
        { type: 'throne', pos: [0, 4.03, -10.6], scale: 0.7, color: '#6a1c18', accent: '#e0c070' },
        { type: 'abstractFigure', pos: [0.4, 0, -2.2], color: '#3a2a1e', pose: 'stand' },
      ],
      systems: [
        { type: 'DustDrift', density: 90, color: '#e2c890', area: [14, 3, 14], speed: 0.1 },
      ],
    },
    info: {
      scorePos: [1.4, 2.2, -3.2],
      metaPos: [-0.3, 0.9, -3.0],
      fragments: [
        { index: 0, of: 2, state: 'film', pos: [0.4, 0, -2.2], dx: -0.6, dz: 0.5, y: 0.012, tilt: FLAT },
        { index: 1, of: 2, state: 'film', pos: [0, 0, -10.9], y: 1.6, dz: 0 },
      ],
    },
  },

  // ------------------------------------------------------------- the-big-short
  // Burry's Scion office: the desk, three monitors of tranche data, the Jenga
  // tower Vennett knocks over to explain the CDO. The seven-clause take walks the room.
  'the-big-short': {
    family: 'momentum',
    grade: {
      bg: '#0d1512', fogColor: '#0d1512', fogDensity: 0.035,
      key: '#e8f0e0', keyIntensity: 2.2, fill: '#3a4a40', ambient: 0.22,
      sat: 0.02, contrast: 0.08, grain: 0.04, vignette: 0.45, bloomIntensity: 0.26,
    },
    camera: { pos: [0.3, 1.6, 2.0], look: [0, 1.1, -1.6], fov: 50 },
    place: {
      shell: 'box',
      shellParams: {
        w: 5, d: 5, h: 2.7, wallMat: 'flat',
        mat: { walls: 'plaster', floor: 'wood', ceiling: 'plaster', wallWear: 0.25, floorWear: 0.3 },
        trim: { color: '#2a2622' },
      },
      props: [
        { type: 'table', pos: [0, 0, -1.3], w: 1.9, d: 0.85, color: '#2e2a26' },
        { type: 'screenPanel', pos: [0, 1.0, -1.62], w: 1.6, h: 0.4, color: '#0c1210', intensity: 0.7, draw: (ctx, W, H) => {
          ctx.fillStyle = '#0c1210'; ctx.fillRect(0, 0, W, H)
          for (let p = 0; p < 3; p++) {
            const x0 = 8 + p * (W / 3)
            ctx.strokeStyle = '#2a3a30'; ctx.strokeRect(x0, 8, W / 3 - 16, H - 16)
            for (let r = 0; r < 9; r++) for (let c = 0; c < 5; c++) {
              ctx.fillStyle = (r * 7 + c * 3 + p) % 11 === 0 ? '#d64b2a' : '#3fa66b'
              ctx.fillRect(x0 + 10 + c * 30, 18 + r * 12, 22, 5)
            }
          }
        } },
        { type: 'chairRow', pos: [0, 0, -0.6], rot: [0, Math.PI, 0], count: 1, color: '#1c1c20', cushion: '#2a2a30' },
        // the Jenga tower
        { type: 'bevelBox', pos: [0.72, 0.99, -1.1], w: 0.12, h: 0.48, d: 0.12, radius: 0.006, color: '#d9c08a', touch: { kind: 'nudge', amplitude: 0.12, foley: 'thunk' } },
        { type: 'lampPractical', pos: [-0.75, 1.05, -1.15], color: '#fff0d0', intensity: 0.5 },
        { type: 'frameOn', pos: [-1.4, 1.65, -2.47], w: 1.0, h: 0.7, color: '#1c1a18' },
      ],
      clutter: [
        { type: 'crumpledPaper', pos: [0.2, 0.78, -1.5] },
        { type: 'cup', pos: [-0.45, 0.75, -1.0], color: '#e8e0d0' },
        { type: 'bookStack', pos: [1.9, 0, -2.1], count: 7, w: 0.3, d: 0.24, colors: ['#e8e4d8', '#d8d4c8'] },
      ],
      systems: [
        // the tonal morph: the room cuts to money green, then back
        { type: 'ScheduledCut', period: 75, duration: 1400, altGrade: '#2f7a50' },
      ],
    },
    info: {
      scorePos: [1.45, 1.95, -2.47],
      metaPos: [-0.2, 2.25, -2.47],
      fragments: [
        { index: 0, of: 7, state: 'film', pos: [0, 1.0, -1.62], dx: -0.5, dz: 0.01, y: 1.26 },
        { index: 1, of: 7, state: 'motel', pos: [0, 0, -1.3], dx: -0.3, dz: 0.25, y: 0.757, tilt: FLAT },
        { index: 2, of: 7, state: 'film', pos: [-1.4, 1.65, -2.47], dz: 0.02, y: 1.65 },
        { index: 3, of: 7, state: 'motel', pos: [0.9, 1.7, -2.48], dz: 0.01, y: 1.7 },
        { index: 4, of: 7, state: 'film', pos: [0.72, 0, -1.1], dx: -0.25, dz: 0, y: 0.757, tilt: FLAT },
        { index: 5, of: 7, state: 'motel', pos: [-2.48, 1.5, -0.6], dz: 0, y: 1.5, ry: Math.PI / 2 },
        { index: 6, of: 7, state: 'film', pos: [2.48, 1.45, -1.8], dz: 0, y: 1.45, ry: -Math.PI / 2 },
      ],
    },
  },

  // ---------------------------------------------------------- la-confidential
  // The Nite Owl coffee shop: red counter, stools, the back bar, a booth.
  // Flashbulb pops (Hush-Hush) through ScheduledCut, i.e. through claimFlash.
  'la-confidential': {
    family: 'intimate-tension',
    grade: {
      bg: '#1a1512', fogColor: '#1a1512', fogDensity: 0.04,
      key: '#e8b474', keyIntensity: 2.4, fill: '#4a3a2c', ambient: 0.22,
      sat: 0.06, contrast: 0.08, grain: 0.06, vignette: 0.58, bloomIntensity: 0.26,
    },
    camera: { pos: [0.5, 1.6, 2.0], look: [-0.2, 1.15, -1.6], fov: 44 },
    place: {
      shell: 'box',
      shellParams: {
        w: 6, d: 5, h: 2.8, wallMat: 'plaster',
        mat: { walls: 'plaster', floor: 'tile', ceiling: 'plaster', wallWear: 0.35, floorWear: 0.45 },
        trim: { color: '#2a1c16' },
      },
      props: [
        { type: 'counter', pos: [-0.3, 0, -1.4], w: 3.4, d: 0.7, color: '#7a2e24' },
        { type: 'chairRow', pos: [-0.3, 0, -0.72], rot: [0, Math.PI, 0], count: 5, spacing: 0.66, seatH: 0.72, color: '#c8c0b0', cushion: '#8a2a22' },
        { type: 'barShelf', pos: [-0.3, 0.95, -2.35], w: 2.6, rows: 2, count: 12, color: '#3a2a1e', glint: '#e8b060' },
        { type: 'lampPractical', pos: [1.9, 2.3, -2.2], color: '#ffb060', intensity: 0.9, distance: 6 },
        { type: 'slab', pos: [2.2, 0.6, -0.5], size: [0.1, 1.2, 1.4], color: '#5a2420' },
      ],
      systems: [
        { type: 'ScheduledCut', period: 48, duration: 220, altGrade: '#f4efe2' },
      ],
    },
    info: {
      scorePos: [-2.2, 2.2, -2.48],
      metaPos: [0.2, 2.45, -2.48],
      fragments: [
        { index: 0, of: 2, state: 'film', pos: [-0.3, 0, -1.4], dx: -1.1, dz: 0.05, y: 1.0, tilt: FLAT },
        { index: 1, of: 2, state: 'film', pos: [-0.3, 0, -2.48], dx: 1.6, dz: 0, y: 1.9 },
      ],
    },
  },

  // --------------------------------------------------------------- fight-club
  // Lou's basement: one bare bulb, concrete, two men squared up, the ring.
  // Duplicates doubles the whole room a hair off; Tyler stands where you are not looking.
  'fight-club': {
    family: 'mind-bender',
    grade: {
      bg: '#141214', fogColor: '#141214', fogDensity: 0.06,
      key: '#e6dca0', keyIntensity: 2.0, fill: '#34402e', ambient: 0.12,
      sat: -0.14, contrast: 0.14, grain: 0.09, vignette: 0.7, bloomIntensity: 0.22,
    },
    camera: { pos: [0, 1.6, 2.4], look: [0, 1.1, -1.4], fov: 50 },
    lights: {
      key: { pos: [0, 2.25, -0.9], intensity: 1.6, distance: 7, decay: 2, color: '#fff0c8' },
      bounce: [{ pos: [0, 0.3, -1.2], intensity: 0.4, distance: 5, color: '#3a4030', decay: 2 }],
    },
    place: {
      shell: 'box',
      shellParams: {
        w: 6, d: 6, h: 2.6, wallMat: 'plaster',
        mat: { walls: 'concrete', floor: 'concrete', ceiling: 'concrete', wallWear: 0.6, floorWear: 0.65 },
        trim: { color: '#0e0e10' },
      },
      props: [
        { type: 'abstractFigure', pos: [-0.35, 0, -1.0], rot: [0, 0.9, 0], color: '#2a2420', pose: 'stand' },
        { type: 'abstractFigure', pos: [0.4, 0, -1.3], rot: [0, -2.2, 0], color: '#3a2a26', pose: 'crouch' },
        { type: 'abstractFigure', pos: [-1.7, 0, -1.9], color: '#161214', pose: 'stand' },
        { type: 'abstractFigure', pos: [1.8, 0, -2.1], color: '#161214', pose: 'stand' },
        // the bulb itself (the light is lights.key above, so Duplicates cannot double it)
        { type: 'slab', pos: [0, 2.25, -0.9], size: [0.07, 0.1, 0.07], color: '#fff0c8', emissive: '#fff0c8', emissiveIntensity: 2.2 },
        { type: 'bevelBox', pos: [-2.2, 0.3, -2.4], w: 0.7, h: 0.6, d: 0.5, color: '#5a4632', touch: { kind: 'nudge', amplitude: 0.06, foley: 'thunk' } },
      ],
      clutter: [
        { type: 'rag', pos: [0.9, 0.01, -0.6], color: '#6a2a24' },
        { type: 'bottleRow', pos: [-2.3, 0.6, -2.4], count: 4, color: '#3a4a2a' },
      ],
      systems: [
        { type: 'Duplicates', offset: 0.05, wrongness: 'subtle', wrapsProps: true },
        { type: 'PeripheralFigure', corner: 'high', pos: [2.4, 0, -2.5], color: '#0e0c0e' },
      ],
    },
    info: {
      scorePos: [1.4, 2.0, -2.97],
      metaPos: [-0.2, 2.2, -2.97],
      fragments: [
        { index: 0, of: 2, state: 'film', pos: [0, 0, -0.4], y: 0.012, tilt: FLAT },
        { index: 1, of: 2, state: 'film', pos: [-2.2, 0.3, -2.4], y: 0.35, dz: 0.26 },
      ],
    },
  },

  // --------------------------------------------------------- operation-finale
  // The Buenos Aires safehouse: the bed, Malkin's chair pulled up to it, the
  // table with the travel document, one lamp. "the fucking house was nuts".
  'operation-finale': {
    family: 'intimate-tension',
    grade: {
      bg: '#1a1714', fogColor: '#1a1714', fogDensity: 0.045,
      key: '#e0b878', keyIntensity: 2.2, fill: '#3a3a3e', ambient: 0.16,
      sat: -0.06, contrast: 0.1, grain: 0.06, vignette: 0.62, bloomIntensity: 0.2,
    },
    camera: { pos: [0.4, 1.6, 1.7], look: [-0.5, 1.0, -1.3], fov: 44 },
    place: {
      shell: 'box',
      shellParams: {
        w: 4.4, d: 4.4, h: 2.7, wallMat: 'plaster', window: false,
        mat: { walls: 'plaster', floor: 'wood', ceiling: 'plaster', wallWear: 0.45, floorWear: 0.5 },
        trim: { color: '#241c16' },
      },
      props: [
        { type: 'bed', pos: [-1.3, 0, -1.0], color: '#9a9282', frame: '#3a3226' },
        { type: 'chairRow', pos: [0.1, 0, -1.3], rot: [0, -Math.PI / 2, 0], count: 1, color: '#4a3a2a', cushion: '#5a4a3a' },
        { type: 'table', pos: [1.2, 0, -1.7], w: 0.9, d: 0.6, color: '#4a3a2a' },
        { type: 'lampPractical', pos: [1.45, 0.95, -1.85], color: '#ffcf8a', intensity: 0.55 },
        // the document he will not sign
        { type: 'screenPanel', pos: [1.1, 0.757, -1.6], rot: [-Math.PI / 2, 0, 0], w: 0.3, h: 0.4, color: '#e8e0c8', intensity: 0.5, draw: (ctx, W, H) => {
          ctx.fillStyle = '#e8e0c8'; ctx.fillRect(0, 0, W, H)
          ctx.fillStyle = '#5a5448'
          for (let r = 0; r < 18; r++) ctx.fillRect(40, 60 + r * 30, W - 80 - (r % 4) * 40, 5)
          ctx.fillRect(W - 240, H - 70, 180, 3)
        } },
      ],
      systems: [],
    },
    info: {
      scorePos: [0.6, 1.8, -2.18],
      metaPos: [-0.9, 1.72, -2.18],
      fragments: [
        { index: 0, of: 4, state: 'film', pos: [0.1, 0, -1.3], y: 0.53, tilt: FLAT },
        { index: 1, of: 4, state: 'motel', pos: [-1.3, 0, -1.0], dz: -0.85, y: 0.675, tilt: FLAT },
        { index: 2, of: 4, state: 'film', pos: [1.2, 0, -1.7], dx: 0.25, dz: 0.12, y: 0.757, tilt: FLAT },
        { index: 3, of: 4, state: 'film', pos: [0, 1.55, -2.18], dx: -0.9, dz: 0, y: 1.55 },
      ],
    },
  },

  // ------------------------------------------------------------------ valkyrie
  // The Wolf's Lair map room: the long table, the oak support the briefcase
  // ended up behind (why it failed), the map, the chairs. One cut: the blast.
  valkyrie: {
    family: 'intimate-tension',
    grade: {
      bg: '#15171a', fogColor: '#15171a', fogDensity: 0.035,
      key: '#e8d4a8', keyIntensity: 2.4, fill: '#3c3e3a', ambient: 0.2,
      sat: -0.22, contrast: 0.1, grain: 0.06, vignette: 0.55, bloomIntensity: 0.18,
    },
    camera: { pos: [1.4, 1.65, 2.0], look: [0, 0.85, -1.0], fov: 46 },
    place: {
      shell: 'box',
      shellParams: {
        w: 7, d: 5, h: 2.8, wallMat: 'wood',
        mat: { walls: 'wood', floor: 'wood', ceiling: 'plaster', wallWear: 0.3, floorWear: 0.4 },
        trim: { color: '#2a1c12' },
      },
      props: [
        { type: 'table', pos: [0, 0, -1.0], w: 4.2, d: 1.2, h: 0.78, color: '#5a4028' },
        // the heavy support
        { type: 'slab', pos: [0.7, 0.36, -1.0], size: [0.3, 0.72, 0.9], color: '#3a2818' },
        // the briefcase, on the wrong side of it
        { type: 'bevelBox', pos: [1.1, 0.17, -0.8], w: 0.46, h: 0.34, d: 0.12, color: '#3a2a1c', touch: { kind: 'nudge', amplitude: 0.05, foley: 'thunk' } },
        { type: 'chairRow', pos: [0, 0, -0.15], rot: [0, Math.PI, 0], count: 6, spacing: 0.66, color: '#3a2a1c', cushion: '#4a3424' },
        { type: 'screenPanel', pos: [-1.0, 0.785, -1.0], rot: [-Math.PI / 2, 0, 0], w: 1.4, h: 0.9, color: '#d8cca8', intensity: 0.55, draw: (ctx, W, H) => {
          ctx.fillStyle = '#d8cca8'; ctx.fillRect(0, 0, W, H)
          ctx.strokeStyle = '#6a5a3a'; ctx.lineWidth = 2
          for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(0, 30 + i * 45); ctx.bezierCurveTo(W * 0.3, 10 + i * 48, W * 0.6, 60 + i * 40, W, 40 + i * 44); ctx.stroke() }
          ctx.strokeStyle = '#9e2b25'; ctx.lineWidth = 4
          ctx.beginPath(); ctx.moveTo(W * 0.7, 20); ctx.lineTo(W * 0.62, H * 0.5); ctx.lineTo(W * 0.74, H - 20); ctx.stroke()
        } },
        { type: 'frameOn', pos: [0, 1.75, -2.47], w: 1.8, h: 1.1, color: '#2a2018' },
      ],
      systems: [
        { type: 'ScheduledCut', period: 64, duration: 600, altGrade: '#ffd8a8' },
      ],
    },
    info: {
      scorePos: [-2.3, 2.0, -2.48],
      metaPos: [1.75, 1.6, -2.48],
      fragments: [
        { index: 0, of: 6, state: 'film', pos: [0, 0, -0.15], dx: 0.99, y: 0.53, tilt: FLAT },
        { index: 1, of: 6, state: 'motel', pos: [0, 0, -1.0], dx: 1.4, dz: 0.2, y: 0.787, tilt: FLAT },
        { index: 2, of: 6, state: 'film', pos: [1.1, 0.17, -0.8], dz: 0.07, y: 0.2 },
        { index: 3, of: 6, state: 'motel', pos: [0.7, 0.36, -1.0], dz: 0.46, y: 0.45 },
        { index: 4, of: 6, state: 'film', pos: [-1.0, 0, -1.0], dx: 0.1, dz: 0.1, y: 0.79, tilt: FLAT },
        { index: 5, of: 6, state: 'film', pos: [0, 1.75, -2.47], dz: 0.02, y: 1.75 },
      ],
    },
  },

  // -------------------------------------------------------- memories-of-murder
  // The last scene: the concrete drainage culvert in the rice field, Park
  // crouched looking into it. The killer is anyone, so he is in the periphery.
  'memories-of-murder': {
    family: 'dread',
    grade: {
      bg: '#c6b884', fogColor: '#c6b884', fogDensity: 0.025,
      key: '#f2dc98', keyIntensity: 2.4, fill: '#6e6c48', ambient: 0.4,
      sat: -0.12, contrast: 0.06, grain: 0.06, vignette: 0.38, bloomIntensity: 0.22,
    },
    camera: { pos: [0.4, 1.5, 1.4], look: [0, 0.55, -3.2], fov: 46, far: 160 },
    lights: {
      key: { type: 'directional', pos: [5, 9, 4], intensity: 1.1, color: '#fff0c8' },
      bounce: [{ pos: [0, 1, 3], intensity: 0.5, distance: 14, color: '#7a7040', decay: 2 }],
    },
    place: {
      shell: 'open',
      shellParams: { ground: 'grass', groundColor: '#b8a254', skyTop: '#d8d0a8', skyBottom: '#ece0b4', horizon: true, boundsRadius: 14 },
      props: [
        { type: 'slab', pos: [0, 0.92, -3.2], size: [2.4, 0.24, 1.4], color: '#8a8474' },
        { type: 'slab', pos: [-1.02, 0.4, -3.2], size: [0.36, 0.8, 1.4], color: '#7a766a' },
        { type: 'slab', pos: [1.02, 0.4, -3.2], size: [0.36, 0.8, 1.4], color: '#7a766a' },
        // the dark inside of the drain
        { type: 'slab', pos: [0, 0.4, -3.86], size: [1.68, 0.8, 0.06], color: '#070706' },
        { type: 'abstractFigure', pos: [0.25, 0, -2.05], rot: [0, Math.PI, 0], color: '#3a3a2c', pose: 'crouch' },
        { type: 'tree', pos: [-4.5, 0, -7], scale: 1.2, foliage: '#5a6a2a', trunk: '#3a2a1e' },
      ],
      atmosphere: [],
      systems: [
        { type: 'PeripheralFigure', corner: 'high', pos: [-3.2, 0, -4.2], color: '#1e1c16' },
      ],
    },
    info: {
      scorePos: [1.5, 1.5, -2.6],
      metaPos: [-0.2, 1.35, -2.4],
      fragments: [
        { index: 0, of: 2, state: 'film', pos: [0, 0.92, -3.2], dz: 0.4, y: 1.045, tilt: FLAT },
        { index: 1, of: 2, state: 'film', pos: [0, 0.4, -3.86], dz: 0.035, y: 0.45 },
      ],
    },
  },

  // --------------------------------------------------------------- frost-nixon
  // The interview set: two armchairs squared off across a side table, the TV
  // camera on its tripod, one hard film light. A two-hander, staged as two chairs.
  'frost-nixon': {
    family: 'intimate-tension',
    grade: {
      bg: '#1a1612', fogColor: '#1a1612', fogDensity: 0.035,
      key: '#f0dcb4', keyIntensity: 2.4, fill: '#3a3630', ambient: 0.2,
      sat: 0.03, contrast: 0.07, grain: 0.06, vignette: 0.52, bloomIntensity: 0.24,
    },
    camera: { pos: [0, 1.55, 2.0], look: [0, 1.0, -1.3], fov: 40 },
    place: {
      shell: 'box',
      shellParams: {
        w: 6, d: 5, h: 2.8, wallMat: 'plaster',
        mat: { walls: 'plaster', floor: 'carpet', ceiling: 'plaster', wallWear: 0.25, floorWear: 0.3 },
        trim: { color: '#2a2018' },
      },
      props: [
        { type: 'chairRow', pos: [-0.85, 0, -1.3], rot: [0, Math.PI / 2, 0], count: 1, color: '#6a5438', cushion: '#8a6a44' },
        { type: 'chairRow', pos: [0.85, 0, -1.3], rot: [0, -Math.PI / 2, 0], count: 1, color: '#6a5438', cushion: '#8a6a44' },
        { type: 'table', pos: [0, 0, -1.3], w: 0.45, d: 0.45, h: 0.5, color: '#3a2c20' },
        { type: 'bevelBox', pos: [-1.9, 1.45, 0.3], w: 0.34, h: 0.3, d: 0.55, color: '#1c1c1e' },
        { type: 'slab', pos: [-1.9, 0.65, 0.3], size: [0.06, 1.3, 0.06], color: '#2a2a2c' },
        { type: 'lampPractical', pos: [2.1, 2.0, -0.3], color: '#fff2dc', intensity: 1.0, distance: 6 },
      ],
      clutter: [
        { type: 'cup', pos: [0.12, 0.5, -1.25], color: '#dcdcd4' },
      ],
      systems: [],
    },
    info: {
      scorePos: [1.3, 1.85, -2.48],
      metaPos: [-0.9, 1.75, -2.48],
      fragments: [
        { index: 0, of: 1, state: 'film', pos: [0, 0, -1.3], dx: -0.06, y: 0.507, tilt: FLAT },
      ],
    },
  },

  // ---------------------------------------------------------------- inside-man
  // The bank's supply room: the false wall Dalton built, his cell behind it
  // (mattress, one bulb), hostages in identical painter suits, the shelving.
  'inside-man': {
    family: 'momentum',
    grade: {
      bg: '#0f1a24', fogColor: '#0f1a24', fogDensity: 0.035,
      key: '#e6ecf2', keyIntensity: 2.3, fill: '#3a4a5a', ambient: 0.22,
      sat: 0.02, contrast: 0.09, grain: 0.04, vignette: 0.45, bloomIntensity: 0.26,
    },
    camera: { pos: [0.8, 1.6, 2.0], look: [-0.6, 1.1, -1.8], fov: 48 },
    place: {
      shell: 'box',
      shellParams: {
        w: 5, d: 5, h: 2.7, wallMat: 'steel',
        mat: { walls: 'plaster', floor: 'tile', ceiling: 'tile', wallWear: 0.3, floorWear: 0.35 },
        trim: { color: '#1c2228' },
      },
      props: [
        // the false wall; walk round its right end into the cell
        { type: 'slab', pos: [-1.5, 1.2, -1.55], size: [1.6, 2.4, 0.1], color: '#9a9488' },
        { type: 'bevelBox', pos: [-1.55, 0.07, -2.1], w: 1.3, h: 0.14, d: 0.6, radius: 0.03, color: '#3a4658' },
        { type: 'lampPractical', pos: [-1.2, 1.9, -2.2], color: '#e8e0c0', intensity: 0.3, distance: 3 },
        { type: 'slab', pos: [1.5, 1.0, -2.25], size: [1.6, 2.0, 0.45], color: '#5a5a5e' },
        { type: 'abstractFigure', pos: [0.6, 0, -0.9], rot: [0, 0.4, 0], color: '#d4d4cc', pose: 'sit' },
        { type: 'abstractFigure', pos: [1.3, 0, -1.2], rot: [0, -0.3, 0], color: '#d4d4cc', pose: 'sit' },
      ],
      systems: [
        { type: 'PeripheralFigure', corner: 'low', pos: [-1.9, 0, -2.25], color: '#1a1c20' },
      ],
    },
    info: {
      scorePos: [0.2, 2.1, -2.48],
      metaPos: [0.2, 1.7, -2.48],
      fragments: [
        { index: 0, of: 2, state: 'film', pos: [-1.5, 1.2, -1.55], dz: 0.06, y: 1.45 },
        { index: 1, of: 2, state: 'film', pos: [-1.55, 0.07, -2.1], y: 0.145, tilt: FLAT },
      ],
    },
  },

  // ------------------------------------------------------------------ the-town
  // Charlestown at night: the getaway van, three nuns with the masks on, a
  // brick row-house front, one sodium streetlight, cruiser light sliding along the brick.
  'the-town': {
    family: 'momentum',
    grade: {
      bg: '#16191d', fogColor: '#16191d', fogDensity: 0.035,
      key: '#ffb46a', keyIntensity: 1.5, fill: '#2a3444', ambient: 0.14,
      sat: -0.04, contrast: 0.08, grain: 0.05, vignette: 0.55, bloomIntensity: 0.32,
    },
    camera: { pos: [0, 1.6, 2.2], look: [-0.4, 1.2, -3], fov: 50, far: 160 },
    place: {
      shell: 'open',
      shellParams: { ground: 'concrete', groundColor: '#1e2024', skyTop: '#0a0e16', skyBottom: '#1a2230', horizon: false, distantCity: 18, boundsRadius: 9 },
      props: [
        { type: 'vehicleMass', pos: [1.1, 0, -2.6], rot: [0, 0.3, 0], color: '#8c8a82', w: 1.9, h: 1.6, d: 4.8 },
        { type: 'abstractFigure', pos: [-1.1, 0, -1.9], color: '#0a0a0c', pose: 'stand' },
        { type: 'abstractFigure', pos: [-0.5, 0, -2.5], color: '#0a0a0c', pose: 'walk-cycle-frozen' },
        { type: 'abstractFigure', pos: [-1.7, 0, -2.8], color: '#0a0a0c', pose: 'stand' },
        { type: 'slab', pos: [0, 2.6, -6.5], size: [14, 5.2, 0.3], color: '#5a3228' },
        { type: 'lampPractical', pos: [2.9, 3.4, -4.2], color: '#ffb060', intensity: 1.2, distance: 9 },
      ],
      atmosphere: [],
      systems: [
        { type: 'StreakLights', axis: 'x', speed: 1.6, colors: ['#3f6fa0', '#a83a3a'], count: 8, span: 12, y: 0.9, z: -6.3 },
      ],
    },
    info: {
      scorePos: [-2.6, 2.3, -6.33],
      metaPos: [-0.4, 2.1, -6.33],
      fragments: [
        { index: 0, of: 4, state: 'film', pos: [1.1, 0, -2.6], dx: 0.426, dz: 1.376, y: 0.915, tilt: FLAT, ry: 0.3 },
        { index: 1, of: 4, state: 'motel', pos: [1.1, 0, -2.6], dx: -0.113, dz: -0.367, y: 1.335, tilt: FLAT, ry: 0.3 },
        { index: 2, of: 4, state: 'film', pos: [0, 2.6, -6.5], dx: -2.2, dz: 0.16, y: 1.6 },
        { index: 3, of: 4, state: 'film', pos: [0, 2.6, -6.5], dx: 2.2, dz: 0.16, y: 1.6 },
      ],
    },
  },

  // --------------------------------------------------------------- the-amateur
  // Heller's basement decryption office at Langley: the desk, the monitor
  // wall, the tracking board, the server rack. "the tech seemed highly unrelalistic".
  'the-amateur': {
    family: 'momentum',
    grade: {
      bg: '#0e1420', fogColor: '#0e1420', fogDensity: 0.04,
      key: '#cfe0ff', keyIntensity: 2.0, fill: '#2a3444', ambient: 0.15,
      sat: -0.06, contrast: 0.08, grain: 0.04, vignette: 0.55, bloomIntensity: 0.3,
    },
    camera: { pos: [0.4, 1.6, 1.8], look: [0, 1.1, -1.8], fov: 46 },
    place: {
      shell: 'box',
      shellParams: {
        w: 5, d: 5, h: 2.5, wallMat: 'steel',
        mat: { walls: 'concrete', floor: 'carpet', ceiling: 'tile', wallWear: 0.3, floorWear: 0.35 },
        trim: { color: '#141820' },
      },
      props: [
        { type: 'table', pos: [0, 0, -1.4], w: 2.0, d: 0.8, color: '#2a2e36' },
        { type: 'screenPanel', pos: [0, 1.02, -1.72], w: 1.8, h: 0.42, color: '#0a0e16', intensity: 0.75, draw: (ctx, W, H) => {
          ctx.fillStyle = '#0a0e16'; ctx.fillRect(0, 0, W, H)
          ctx.fillStyle = '#4c9bd6'
          for (let c = 0; c < 24; c++) for (let r = 0; r < 10; r++) if ((c * 13 + r * 7) % 5) ctx.fillRect(10 + c * 21, 10 + r * 11, 12, 5)
        } },
        { type: 'screenPanel', pos: [-1.4, 1.6, -2.47], w: 1.2, h: 0.8, color: '#101822', intensity: 0.7, draw: (ctx, W, H) => {
          ctx.fillStyle = '#101822'; ctx.fillRect(0, 0, W, H)
          ctx.strokeStyle = '#4c9bd6'; ctx.lineWidth = 2
          ctx.beginPath(); ctx.moveTo(60, H - 60); ctx.lineTo(W * 0.4, H * 0.45); ctx.lineTo(W * 0.62, H * 0.6); ctx.lineTo(W - 60, 60); ctx.stroke()
          ctx.fillStyle = '#e8eef4'; [[60, H - 60], [W * 0.4, H * 0.45], [W * 0.62, H * 0.6], [W - 60, 60]].forEach(([x, y]) => ctx.fillRect(x - 5, y - 5, 10, 10))
        } },
        { type: 'chairRow', pos: [0, 0, -0.7], rot: [0, Math.PI, 0], count: 1, color: '#1c2028', cushion: '#2a3038' },
        { type: 'lampPractical', pos: [0.85, 0.98, -1.25], color: '#cfe0ff', intensity: 0.4 },
        { type: 'bevelBox', pos: [2.0, 1.0, -2.1], w: 0.6, h: 2.0, d: 0.7, color: '#1a1e26' },
      ],
      systems: [
        { type: 'GlyphRain', pos: [2.0, 0.1, -1.74], area: [0.5, 1.8], color: '#4c9bd6', columns: 4, speed: 0.35 },
      ],
    },
    info: {
      scorePos: [0.3, 2.0, -2.48],
      metaPos: [-1.4, 2.2, -2.48],
      fragments: [
        { index: 0, of: 2, state: 'film', pos: [0, 0, -1.4], dx: -0.6, dz: 0.15, y: 0.757, tilt: FLAT },
        { index: 1, of: 2, state: 'film', pos: [-1.4, 1.6, -2.47], dz: 0.02, y: 1.05 },
      ],
    },
  },

  // --------------------------------------------------------------- in-the-grey
  // PLACEHOLDER STAGING (real sets unverified): a grey-ops briefing room. The
  // table with the op map, the two leads flanking it, the crate, one hard overhead.
  'in-the-grey': {
    family: 'momentum',
    grade: {
      bg: '#1c1e21', fogColor: '#1c1e21', fogDensity: 0.035,
      key: '#e8e6e0', keyIntensity: 2.2, fill: '#3a3c40', ambient: 0.2,
      sat: -0.08, contrast: 0.1, grain: 0.05, vignette: 0.5, bloomIntensity: 0.24,
    },
    camera: { pos: [0.3, 1.65, 2.0], look: [0, 1.0, -1.4], fov: 50 },
    place: {
      shell: 'box',
      shellParams: {
        w: 6, d: 5, h: 2.8, wallMat: 'steel',
        mat: { walls: 'concrete', floor: 'concrete', ceiling: 'metal', wallWear: 0.4, floorWear: 0.5 },
        trim: { color: '#18191b' },
      },
      props: [
        { type: 'table', pos: [0, 0, -1.2], w: 2.2, d: 1.1, color: '#2a2c2e' },
        { type: 'screenPanel', pos: [0, 0.757, -1.2], rot: [-Math.PI / 2, 0, 0], w: 1.6, h: 0.9, color: '#9aa0a4', intensity: 0.5, draw: (ctx, W, H) => {
          ctx.fillStyle = '#9aa0a4'; ctx.fillRect(0, 0, W, H)
          ctx.strokeStyle = '#4a5054'; ctx.lineWidth = 2
          for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.ellipse(W * 0.55, H * 0.5, 40 * i, 26 * i, 0.3, 0, Math.PI * 2); ctx.stroke() }
          ctx.fillStyle = '#b8b9bc'; ctx.fillRect(W * 0.55 - 6, H * 0.5 - 6, 12, 12)
        } },
        { type: 'abstractFigure', pos: [-1.2, 0, -1.6], rot: [0, 0.6, 0], color: '#2a2a2c', pose: 'stand' },
        { type: 'abstractFigure', pos: [1.2, 0, -1.7], rot: [0, -0.6, 0], color: '#1e1e20', pose: 'stand' },
        { type: 'bevelBox', pos: [-2.2, 0.3, -2.0], w: 1.0, h: 0.6, d: 0.5, color: '#3a4030', touch: { kind: 'nudge', amplitude: 0.05, foley: 'thunk' } },
        { type: 'lampPractical', pos: [0, 2.3, -1.2], color: '#e8e8e4', intensity: 0.5, distance: 5 },
      ],
      systems: [],
    },
    info: {
      scorePos: [1.6, 2.1, -2.48],
      metaPos: [-1.5, 2.05, -2.48],
      fragments: [
        { index: 0, of: 5, state: 'film', pos: [0, 0, -1.2], dx: 0.85, dz: 0.35, y: 0.757, tilt: FLAT },
        { index: 1, of: 5, state: 'motel', pos: [0, 0, -1.2], dx: -0.5, dz: 0.1, y: 0.762, tilt: FLAT },
        { index: 2, of: 5, state: 'film', pos: [-2.2, 0.3, -2.0], dz: 0.26, y: 0.35 },
        { index: 3, of: 5, state: 'motel', pos: [0, 1.5, -2.48], dx: -1.2, dz: 0, y: 1.5 },
        { index: 4, of: 5, state: 'film', pos: [0, 1.5, -2.48], dx: 1.3, dz: 0, y: 1.5 },
      ],
    },
  },

  // ---------------------------------------------------- one-battle-after-another
  // The rolling desert highway chase: the road rises over a crest and dips out
  // of sight, Bob's car pulled over, a second car on the crest, a headlight
  // coming over the hill that never arrives (AdvanceGlow stops at z -18).
  'one-battle-after-another': {
    family: 'momentum',
    grade: {
      bg: '#d6c7a2', fogColor: '#d6c7a2', fogDensity: 0.012,
      key: '#fff0d0', keyIntensity: 2.4, fill: '#a88a60', ambient: 0.44,
      sat: 0.04, contrast: 0.08, grain: 0.05, vignette: 0.3, bloomIntensity: 0.28,
    },
    camera: { pos: [0, 1.25, 2.0], look: [0, 0.9, -12], fov: 38, far: 220 },
    lights: {
      key: { type: 'directional', pos: [4, 10, 2], intensity: 1.2, color: '#fff4dc' },
      bounce: [{ pos: [0, 1, 3], intensity: 0.5, distance: 14, color: '#8a7050', decay: 2 }],
    },
    place: {
      shell: 'open',
      // boundsRadius 10 stops the walker before the rise (z -10.9): the walker is flat-floored
      shellParams: { ground: 'grass', groundColor: '#b89a6a', skyTop: '#8fb0cc', skyBottom: '#e6dac0', horizon: true, boundsRadius: 10 },
      props: [
        { type: 'slab', pos: [0, -0.04, -5], size: [3.4, 0.08, 12], color: '#2e2c2a' },
        { type: 'slab', pos: [0, 0.85, -15.8], rot: [0.17, 0, 0], size: [3.4, 0.08, 10], color: '#2e2c2a' },
        { type: 'slab', pos: [0, 0.95, -26.93], rot: [-0.12, 0, 0], size: [3.4, 0.08, 12.5], color: '#2e2c2a' },
        { type: 'vehicleMass', pos: [-0.7, 0, -4.2], color: '#6a6258', w: 1.8, h: 1.2, d: 4.4 },
        { type: 'vehicleMass', pos: [0.8, 1.58, -19.8], rot: [0.17, 0, 0], color: '#b8b0a0', w: 1.8, h: 1.2, d: 4.4 },
        { type: 'abstractFigure', pos: [2.3, 0, -3.6], rot: [0, -0.4, 0], color: '#7a6a52', pose: 'stand' },
      ],
      atmosphere: [],
      systems: [
        { type: 'AdvanceGlow', prop: 'sphere', from: [0.5, 1.9, -34], axis: 'z', speed: 0.05, resetAt: 16, color: '#fff0c0', intensity: 0.5 },
      ],
    },
    info: {
      scorePos: [1.5, 1.8, -3.2],
      metaPos: [1.2, 1.3, -3.2],
      fragments: [
        { index: 0, of: 5, state: 'film', pos: [0, -0.04, -5], dx: 0.9, dz: 4.0, y: 0.012, tilt: FLAT },
        { index: 1, of: 5, state: 'motel', pos: [-0.7, 0, -4.2], dz: -0.35, y: 1.0, tilt: FLAT },
        { index: 2, of: 5, state: 'film', pos: [-0.7, 0, -4.2], dz: 1.5, y: 0.69, tilt: FLAT },
        { index: 3, of: 5, state: 'motel', pos: [0, -0.04, -5], dx: -1.1, dz: -3.5, y: 0.012, tilt: FLAT },
        { index: 4, of: 5, state: 'film', pos: [0, -0.04, -5], dx: 0.3, dz: -4.8, y: 0.012, tilt: FLAT },
      ],
    },
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
