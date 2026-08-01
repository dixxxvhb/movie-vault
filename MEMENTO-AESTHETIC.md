# Memento Aesthetic Dossier — reference for the Vault rebuild
Gathered 2026-08-01, ahead of the Polaroid Wall interactive rebuild.
Constraint honored throughout: NO corkboard, red string, pins, noir/typewriter/VHS costume (banned drawer). This is Memento's actual prop language, not the CSI board.

## 1. The polaroids
- SX-70/600-style square image, thick white border, deeper bottom margin (the "chin") = the writing zone.
- Evidentiary framing: subjects dead-center, flash-lit ID shots, not portraits. Blown highlights, faint warm chemical cast, soft edge vignette.
- Wear: rounded corners from pocket-carry, fingerprint smudges concentrated at corners and the chin (where it's held while writing).

## 2. The annotation system (information architecture gold)
- Short verdicts on the FRONT, in the bottom border ("Don't believe his lies"). Longer reasoning on the BACK ("she has also lost someone, she will help you out of pity").
- Terse, present-tense, declarative fragments. Legal-caption register, not diary prose.
- Epistemic hierarchy, three tiers of decreasing permanence:
  1. Tattoos = permanent facts (→ Ledger/Certified, ink)
  2. Polaroids + notes = revisable external memory (→ Archive, pencil)
  3. Episodic memory = unusable (→ Hazy, undeveloped)
- Sharpie on glossy stock: ink sits proud, uneven line weight, occasional skip where ink beads.

## 3. Color grading (Wally Pfister)
- Color sequences (reverse chronology, subjective): cool BLUE-tinged, handheld, unstable. Blue = Leonard's deduced "truth."
- B&W sequences (chronological, objective): high-contrast, locked-down, clinical.
- Overall texture: sun-bleached SoCal exteriors, flat fluorescent motel interiors, denim + beige/tan, 35mm grain. NOT moody noir shadows; the dread is procedural flatness.

## 4. Typography
- The canonical treatment: the DVD cover title is scrawled in Leonard's own polaroid-caption handwriting. Marketing typography = the annotation prop language itself.
- (Typewriter-tattoo hybrid title redesigns online are fan work, not canon — and typewriter is banned anyway.)

## 5. Physical texture → CSS
- Development-in: undeveloped instant film starts near-black muddy olive (~#1a1f16–#2a2418), blooms to full color. → keyframed filter: contrast/saturate/brightness reveal, ~600ms–1s. Period-accurate replacement for fade-in. Also the literal Hazy Wing visual.
- Sharpie: hand-lettered font + subtle multiply-blend texture, never crisp vector.
- Curl/gloss: slight corner curl, glossy specular sheen → box-shadow + faint diagonal gradient highlight.
- Wear: low-opacity smudge/noise at corners + chin; 1–2° random rotation per card, never more (avoid scrapbook kitsch).

## Distilled palette (approximations)
| Role | Hex | Why |
|---|---|---|
| Base/background | #e4ddc9–#d8cfb4 | motel beige / sun-bleached |
| Polaroid border | #f4f1e8 | warm white, never pure #fff |
| Ink | #1c1c1e–#242018 | warm near-black Sharpie |
| Truth blue | #2f4a63–#3c5b78 | Pfister's color-timeline tint |
| Objective b&w | #141414 / #f2f2f2 | the chronological record |
| Flash highlight | #fff7e0 | emulsion blowout |
| Denim accent | #4a5c6b | wardrobe blue-gray |

## Mapping to the Vault's three states
- Ledger/Definitive = developed, hung, ink verdict on the chin (his hot take/score).
- Archive = faded print, pencil score, quieter/desaturated.
- Certified = pen written over the pencil (visual promotion, color returns).
- Hazy = undeveloped dark frame; the rewatch IS the chemical bath. No certify affordance.
- Front/back split maps to card flip: verdict + score front, longer notes/see-also lines on the back (already the locked mode design: The Backs).
- Two-timeline color logic available for settled-vs-in-progress states (grayscale static vs blue-leaning color) instead of any string/pin metaphor.

## Open design tensions to resolve at build time (with Dixon)
- Current vault fonts are Instrument Serif + Schibsted Grotesk. Memento language wants a hand-lettered voice for annotations. Likely answer: keep the editorial fonts for chrome/structure, add ONE handwriting face strictly for his verdict lines. Decide at build.
- Wall background: current vault look vs motel-beige wash. Palette shift is a real redesign decision, his call.

## Sources
- knowyourmeme.com/memes/dont-believe-his-lies
- colorculture.org/cinematography-analysis-of-memento-in-depth/
- fondthinker.com/culture/memento-and-philosophic-film/
- arts3047.wordpress.com/2018/04/22/truth-vs-representation-in-christopher-nolans-memento/
- shmoop.com/study-guides/memento/polaroid-pictures-symbol.html
- reelreading.weebly.com/momento.html
- filmcolossus.com/movie-explanations/memento/shots
