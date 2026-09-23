// LE GAMAAR: everything the room knows, as plain data.
//
// One source for the lobby cards, the seat cards, the screen cards, the cellar
// deck and the ?text document (TextMode.jsx renders this for screen readers).
// Pure data, no imports, so the 50 KB ?text bundle can take it without
// pulling in three.js.
//
// Voice: the Vault's narrator. Plain words, contractions, no em or en dashes,
// no film dialogue except `line` fields (exact, checked against a source, and
// null until they are). Actors come from data/cast.json by TMDB person id
// (`cast`), never typed by hand.
//
// Facts verified 2026-09-22 against Wikipedia's plot and cast and the TMDB
// credits. Every item the plan flagged is either confirmed or left out.

export const FILM = {
  title: 'Inglourious Basterds',
  year: 2009,
  director: 'Quentin Tarantino',
  runtime: 153,
  place: 'Le Gamaar, Paris',
  when: 'June 1944, the night of the premiere',
}

// side: 'hunted' = the hunted and the Allies (left of the aisle),
//       'reich'  = the Reich (right of the aisle).
// premiere: true if they are in the building on premiere night.
export const CHAPTERS = [
  {
    n: 1,
    title: 'Once Upon a Time... in Nazi-Occupied France',
    where: 'A dairy farm',
    when: '1941',
    recap: 'An SS colonel named Hans Landa drives out to a French dairy farm and asks for a glass of milk. He is polite, patient and terrifying. The farmer, LaPadite, is hiding a Jewish family under his floorboards, and Landa talks him into admitting it. The family is shot through the floor. One daughter, Shosanna, runs, and Landa lets her go.',
    screen: 'A farmer. A colonel. A family under the floor.',
    moment: 'Landa never raises his voice. He asks for milk, switches to English so the family below cannot follow, and gets the truth out of LaPadite without a single threat said out loud.',
  },
  {
    n: 2,
    title: 'Inglourious Basterds',
    where: 'Occupied France',
    when: '1944',
    recap: 'Lieutenant Aldo Raine, from Tennessee, recruits a squad of Jewish American soldiers to drop behind enemy lines and spread fear. His one demand is Nazi scalps. When a captured sergeant refuses to talk, Donny Donowitz, "the Bear Jew," walks out of a tunnel with a baseball bat. One private is let go alive with a swastika carved into his forehead, so everyone will know who did it. Hugo Stiglitz, a German soldier famous for killing his own officers, joins them.',
    screen: 'Eight men. One order. A hundred scalps each.',
    moment: 'Sergeant Rachtman refuses to give up a German position. The sound of a bat on a stone tunnel comes first, then Donowitz.',
  },
  {
    n: 3,
    title: 'German Night in Paris',
    where: 'Paris',
    when: 'June 1944',
    recap: 'Shosanna is alive in Paris, running a cinema under a new name. Fredrick Zoller, a German war hero starring as himself in a propaganda film, falls for her and gets the premiere moved to her cinema. At lunch she is made to sit across from Landa, who orders her strudel and never seems to recognize her. She and Marcel, her projectionist, decide to burn the cinema down on premiere night with every Nazi leader inside, using the nitrate film behind the screen.',
    screen: 'A cinema. A war hero. A plan made of film.',
    moment: 'Landa orders two strudels and waits for the cream. Shosanna has to eat across from the man who killed her family and not let her face move.',
  },
  {
    n: 4,
    title: 'Operation Kino',
    where: 'London, then a basement tavern called La Louisiane',
    when: 'June 1944',
    recap: 'The British send Lieutenant Archie Hicox, a film critic turned commando, to meet their spy Bridget von Hammersmark, a German movie star. The meeting happens in a basement bar full of German soldiers, with Stiglitz and Wicki along to pass as locals. A Gestapo major joins their table, and Hicox gives himself away by ordering three drinks with the wrong three fingers. Almost everyone at the table dies. Bridget survives with a bullet in her leg, and Aldo learns the premiere is still on.',
    screen: 'A basement bar. A card game. Three fingers.',
    moment: 'Everyone is playing a guessing game with names stuck to their foreheads. Then Hicox holds up three fingers the British way, and the whole room knows.',
  },
  {
    n: 5,
    title: 'Revenge of the Giant Face',
    where: 'Le Gamaar',
    when: 'Premiere night',
    recap: "Landa matches Bridget's lost shoe to her foot and strangles her, then arrests Aldo and trades the whole plot for his own safe passage. Upstairs, Zoller forces his way into the booth, and he and Shosanna shoot each other. Her spliced reel puts her face on the screen as Marcel lights the nitrate. Donowitz and Ulmer shoot Hitler and Goebbels from the box, and their bombs take the building. Out in the woods, Aldo carves his mark into Landa's forehead.",
    screen: 'A premiere. A locked door. Her face on the screen.',
    moment: 'Her face fills the screen and tells the audience who is about to kill them. Behind the screen, the nitrate is already burning.',
  },
]

// cast: TMDB person id (data/cast.json). object: the thing on their seat.
export const CHARACTERS = [
  { id: 'shosanna', cast: 19119, name: 'Shosanna Dreyfus', aka: 'Emmanuelle Mimieux', chapter: 1, side: 'hunted',
    object: 'reel label in her handwriting', premiere: true, where: 'the booth',
    who: 'Escapes the farm. Runs the cinema under a new name.',
    fate: 'Kills Zoller, and he kills her. Her face burns on the screen.' },
  { id: 'landa', cast: 27319, name: 'Col. Hans Landa', aka: 'the Jew Hunter', chapter: 1, side: 'reich',
    object: 'a calabash pipe', premiere: true, where: 'the lobby',
    who: 'SS colonel. Speaks four languages. Never raises his voice.',
    fate: 'Lives. Trades the plot for his freedom. Aldo carves his forehead.' },
  { id: 'lapadite', cast: 81125, name: 'Perrier LaPadite', chapter: 1, side: 'hunted',
    object: 'a glass of milk', premiere: false,
    who: 'Dairy farmer hiding the Dreyfus family.',
    fate: 'Gives them up. The film never goes back to him.' },
  { id: 'aldo', cast: 287, name: 'Lt. Aldo Raine', aka: 'Aldo the Apache', chapter: 2, side: 'hunted',
    object: 'a bowie knife', premiere: true, where: 'arrested outside',
    who: 'Leads the Basterds. Tennessee. Wants a hundred scalps a man.',
    fate: 'Lives. Gets the last word.' },
  { id: 'donowitz', cast: 16847, name: 'Sgt. Donny Donowitz', aka: 'the Bear Jew', chapter: 2, side: 'hunted',
    object: 'a baseball bat', premiere: true, where: 'the box',
    who: "Aldo's second. The bat.",
    fate: 'Shoots Hitler in the box. Dies when his bomb goes off.' },
  { id: 'ulmer', cast: 23286, name: 'Pfc. Omar Ulmer', chapter: 2, side: 'hunted',
    object: 'an ankle bomb', premiere: true, where: 'the box',
    who: "Basterd. Goes in with Aldo and Donowitz, all three passing as Bridget's Italian escorts.",
    fate: 'Dies in the box with Donowitz.' },
  { id: 'utivich', cast: 107770, name: 'Pfc. Smithson Utivich', chapter: 2, side: 'hunted',
    object: 'handcuffs', premiere: true, where: 'arrested outside',
    who: 'Basterd. Arrested with Aldo on premiere night.',
    fate: 'Lives. Puts the cuffs on Landa at the end.' },
  { id: 'stiglitz', cast: 1844, name: 'Sgt. Hugo Stiglitz', chapter: 2, side: 'hunted',
    object: 'a pistol under the table', premiere: false,
    who: 'German soldier famous for killing his own officers. The Basterds break him out.',
    fate: 'Dies in the tavern.' },
  { id: 'rachtman', cast: 49487, name: 'Sgt. Werner Rachtman', chapter: 2, side: 'reich',
    object: 'the medal he would not trade', premiere: false,
    who: 'German sergeant who will not give up a position.',
    fate: "Killed by Donowitz's bat." },
  { id: 'butz', cast: 147446, name: 'Pvt. Butz', chapter: 2, side: 'reich',
    object: 'a cap pulled low', premiere: false,
    who: 'The private Aldo lets go.',
    fate: 'Lives, with a swastika carved in his forehead, to tell everyone.' },
  { id: 'hitler', cast: 49056, name: 'Adolf Hitler', chapter: 2, side: 'reich',
    object: 'a cape', premiere: true, where: 'the box',
    who: 'Furious about the Basterds. Comes to the premiere.',
    fate: 'Shot in the box. (History says otherwise; flip the house lights.)' },
  { id: 'zoller', cast: 3872, name: 'Pvt. Fredrick Zoller', chapter: 3, side: 'reich',
    object: 'a sniper tally card', premiere: true, where: 'the booth',
    who: "War hero. Stars as himself in Goebbels's film. Won't leave Shosanna alone.",
    fate: 'Shosanna shoots him, he shoots her. Both die in the booth.' },
  { id: 'marcel', cast: 51636, name: 'Marcel', chapter: 3, side: 'hunted',
    object: 'a cigarette', premiere: true, where: 'behind the screen',
    who: "Shosanna's projectionist, and the man she loves.",
    fate: 'Locks the doors and lights the nitrate. Does not come out.' },
  { id: 'goebbels', cast: 41965, name: 'Joseph Goebbels', chapter: 3, side: 'reich',
    object: 'a film can of his own production', premiere: true, where: 'the box',
    who: "Propaganda minister. Nation's Pride is his film.",
    fate: 'Shot in the box.' },
  { id: 'mondino', cast: 2539, name: 'Francesca Mondino', chapter: 3, side: 'reich',
    object: "an interpreter's notepad", premiere: true, where: 'the house',
    who: "Goebbels's French interpreter.",
    fate: 'Inside when it burns.' },
  { id: 'hicox', cast: 17288, name: 'Lt. Archie Hicox', chapter: 4, side: 'hunted',
    object: 'a hand holding up three fingers', premiere: false,
    who: 'British film critic turned commando. His German accent is one nobody at the table can place.',
    fate: 'Dies in the tavern.' },
  { id: 'bridget', cast: 9824, name: 'Bridget von Hammersmark', chapter: 4, side: 'hunted',
    object: 'one high-heeled shoe (the other is in the cellar)', premiere: false, where: 'the lobby',
    who: 'German film star spying for the Allies.',
    fate: 'Survives the tavern. Landa strangles her in a room off the lobby.' },
  { id: 'wicki', cast: 32823, name: 'Cpl. Wilhelm Wicki', chapter: 4, side: 'hunted',
    object: 'a phrasebook', premiere: false,
    who: 'Austrian-born Basterd, there to pass as a local.',
    fate: 'Dies in the tavern.' },
  { id: 'hellstrom', cast: 6091, name: 'Maj. Dieter Hellstrom', chapter: 4, side: 'reich',
    object: 'the card from his forehead', premiere: false,
    who: 'Gestapo major who sits down at the wrong table.',
    fate: 'Dies in the tavern.' },
  { id: 'fenech', cast: 12073, name: 'Gen. Ed Fenech', chapter: 4, side: 'hunted',
    object: 'a briefing folder', premiere: false,
    who: 'British general who sends Hicox. Churchill sits in on the briefing.',
    fate: 'Stays in London.' },
]

// Cellar only: the new father at the next table.
export const WILHELM = {
  cast: 31663, name: 'Staff Sgt. Wilhelm',
  who: 'Celebrating the birth of his son in the tavern. Bridget signs a napkin for the baby.',
  fate: 'Bridget shoots him after the standoff.',
}

// The forehead cards in La Louisiane, from the TMDB credits.
export const FOREHEADS = ['Pola Negri', 'Winnetou', 'Beethoven', 'Edgar Wallace', 'Mata Hari']

// Dixon's words, verbatim, and where each one lives (plan §8).
export const FRAGMENTS = [
  { text: 'those god damn NAAAAZZZIIIIISSS.', where: 'the box parapet', state: 'film' },
  { text: 'such a fun movie. such wonderfully interwoven plots.', where: 'the lobby, above the five cards', state: 'film' },
  { text: 'BURN THAT FUCKER.', where: 'the nitrate, behind the screen', state: 'film' },
  { text: 'landa was insane!!! also kinda iconic and giving queen behavior.', where: "Landa's seat card", state: 'film' },
  { text: 'brad pitt was incredible, his opening speech is kinda FIERCE.', where: 'the chapter 2 vitrine', state: 'film' },
  { text: 'fun to know it was all fuckin bullshit hahaha', where: 'the screen, house lights up', state: 'motel' },
]

// House lights up: what really happened. Each line checked against Wikipedia.
export const HISTORY = [
  'Hitler killed himself in his Berlin bunker on April 30, 1945. Goebbels killed himself there the next day. Neither went to a cinema in Paris that summer.',
  'Le Gamaar, Operation Kino and the Basterds are invented. The title comes from a 1978 Italian war film, The Inglorious Bastards, spelled correctly.',
  "Nation's Pride is invented too. Eli Roth, who plays Donowitz, directed it for the film.",
  'Christoph Waltz won the Oscar for Landa.',
]
