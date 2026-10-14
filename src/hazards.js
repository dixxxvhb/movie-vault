// What each room does that someone might want to know before walking in.
//
// The Threshold names these in general on the first visit. This is the same
// list per room, so "Warn me before a difficult room" (content.warnBefore)
// can say exactly what is behind THIS door, and "skip this room"
// (content.skip) has something to offer the choice against. Written from what
// the rooms actually do (flashPolicy callers, ScheduledCut / ResetFlash /
// PeripheralFigure in configs.js, the bespoke rooms), not from the films'
// reputations. A slug with no entry has nothing to warn about.

export const HAZARDS = {
  malignant: ['red flashing light', 'horror, with a shock or two'],
  'masters-of-the-universe-2026': ['lightning and strobe'],
  barbarian: ['a hard cut to full daylight', 'horror, with a shock or two'],
  stby: ['a hard cut to full brightness'],
  coherence: ['a flash to white on a repeating timer'],
  'source-code': ['a flash to white on a repeating timer'],
  'la-confidential': ['a camera flash to white on a timer'],
  valkyrie: ['a quick flash of warm light on a timer'],
  exmachina: ['the lights cut to red on a timer'],
  'the-big-short': ['the room cuts to green on a timer'],
  'inglourious-basterds': ['fire and flickering orange light, if you start it'],
  memento: ['a flickering tube light'],
  enemy: ['a flicker now and then'],
  br2049: ['spray catching the light in quick bursts'],
  'baby-driver': ['brake lights flashing on the beat'],
  hereditary: ['horror, slow dread', 'a figure at the edge of your view'],
  frailty: ['horror, slow dread', 'a figure at the edge of your view'],
  'memories-of-murder': ['slow dread', 'a figure at the edge of your view'],
  se7en: ['horror, slow dread'],
  'fight-club': ['a figure at the edge of your view'],
  'inside-man': ['a figure at the edge of your view'],
  batman: ['a swarm of bats, now and then'],
}

export function hazardsFor(slug) {
  return HAZARDS[slug] || null
}
