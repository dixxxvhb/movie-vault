-- Movie Night v3, step 6: the taste profile stops being a fact store.
-- Single row, updated in place. Archive/hazy/certified/abandoned facts now
-- live on film_titles (steps 2-3).

update public.film_taste_profile
set updated_at = now(),
    content = jsonb_set(
      jsonb_set(
        (content
          - 'current_mood'
          - 'vault_counts_20260725'
          - 'vault_counts_20260726'
          - 'vault_archive')
        #- '{vault_model,archive_additions}'
        #- '{vault_model,certified_films}',
        '{emotional_keys}',
        '["tense","dread","fun","cozy","awe","sad","camp"]'::jsonb),
      '{lanes}',
      jsonb_build_array(
        'cerebral sci-fi: Villeneuve and Nolan are the spine',
        'competent-operator action/spy: MI, Bond, Bourne, lone-operator thrillers',
        'first-contact / space optimism: Contact, The Martian, Project Hail Mary',
        'disaster: Deep Impact, Don''t Look Up',
        'weird + audacious: EEAAO, Lanthimos, The Substance',
        'prestige procedural: Conclave, Spotlight-type',
        'morally-gray slow-burn thrillers: Sicario landed at 9.9, dread beats surprise for him')),
    notes_md = $md$

**Jul 17 addendum:** Project Hail Mary (movie) confirmed SEEN and beloved (pre-ritual watch). Standing lesson: the log only starts Jul 13; his lifetime watch history is largely unmapped. For big-canon titles, confirm seen/unseen before building a whole pitch. His own queue = certified unseen; everything else = ask first. (v3 note: the mapping now lives on the registry itself; film_check is the confirm.)

**Jul 17, confirmed calibration:** He runs an execution meritocracy. Pays for CONTROL, not ambition. The reach only counts if the hand closes. Evidence across the board (scores shown in the current ten-point era): Sicario 9.9 (no twist, total control), Coherence 8.9 (no budget, stuck landing), Enemy 9.6 (lunatic idea, iron grip), The Game 6.8 (competent, hollow), Sunshine 7.4 (huge reach, about three fingers closed; but he does line-item accounting: strong acts still get paid even when one act fumbles).

## Leonard's wall, lifetime audit (Jul 17, 2026, 32 titles via widget)
**Loved:** Inception, Interstellar, The Prestige, Tenet, The Dark Knight, Zodiac, Gone Girl, Arrival, Gravity.
**Seen but hazy (prime rewatch candidates):** Se7en, Shutter Island. The antibodies assumption on Se7en was WRONG, he had seen it and barely remembered (since rewatched live, 9.6 on Aug 24); Shutter Island half-forgotten, his men-editing-reality thesis means a rewatch would land like a first watch.
**Know of, never seen:** The Social Network, Fight Club (twist heavily strip-mined culturally, antibodies risk), Event Horizon, The Fifth Element, Eternal Sunshine of the Spotless Mind, Donnie Darko, No Country for Old Men, Being John Malkovich.
**Never heard of (fresh territory, his favorite drug):** Ad Astra, Source Code, Predestination, Primer, Nightcrawler, Gone Baby Gone, Wind River, Hell or High Water, Heat, The Lobster, The Killing of a Sacred Deer, The Favourite, Sorry to Bother You.
**Derived:** Nolan wing COMPLETE and fully beloved (all five audit titles loved, plus Memento 10.0 and the Oppenheimer fixation; only Dunkirk/Insomnia/Following unaudited). Fincher vindicated: Zodiac and Gone Girl loved, so The Game's 6.8 was movie-specific, never pitch Fincher apologetically again. Villeneuve near-complete (Arrival loved). Lanthimos back catalog (Lobster/Sacred Deer/Favourite) is virgin territory despite current-era Lanthimos love, a vein of gold. Timing note, handle with dignity: Eternal Sunshine is unseen and is a breakup film at its core; he is mid-divorce. High-value title, pitch with honest framing and let him choose the moment.
**Vibe lanes (his own words):** Friday full tank = long heavy masterpiece. Weeknight = tight 90-minute thriller. Bad day = explosions, zero thoughts (stock this shelf; the queue runs dread-heavy). Subtitles = if it earns it (Parasite-class earns entry).

**PERMANENT DESIGN RULE (Jul 21, 2026):** Movie-night / personal artifacts must NEVER use DWD branding. No forest green/pink/terracotta/ivory palette, no Cormorant/Outfit/Bebas. His words: "can stuff not related to dwd not be branded exaclty like dwd???? i look at that shit all day." Movie night has its own identity. (Superseded detail, 2026-08-26: the noir case-file aesthetic originally named here was later banned outright; the Vault's Polaroid Wall canon is the current identity.)

**(Superseded 2026-08-26.)** THE LEDGER standing ritual (Jul 21, 2026) targeted the desktop artifact `the-ledger`, since retired. The Vault is now the GitHub Pages app (dixxxvhb.github.io/movie-vault) and publishing is Code's job via the pipeline doc. Kept for history: scrapbook-editorial design, verbatim quotes preserved, the Vast of Night grievance counter.

**REDESIGN CALIBRATION, PERMANENT, ALL MODELS (Jul 23, 2026):** When Dixon asks for a "redesign" he means a 5.0-magnitude rethink: new concept, new structure, new idea, not a reskin. The poster-wall pass was ruled "a .3 redesign." He let it slide only because his usage ran out. Standing order, his words: "lets not let it happen again, no matter the model." Future redesign requests get a genuinely different design concept, not the same layout in new colors.

**Jul 25, 2026 amendment.** Sicario raised 9.8 to 9.9 and given sole possession of No. 2: "sicario beats those. it needs its own number for sure." Ties are unstable at the top; when a new film lands on an existing number he may re-separate the old one rather than accept a tie. Offer the amendment, do not assume it.

**The Nolan lane is confirmed and is the strongest signal on the board.** Memento 10.0, Sicario is Villeneuve, and Nolan holds 10.0 / 9.8 / 9.5 across Memento, The Dark Knight, Batman Begins. Villeneuve holds 9.9 / 9.8 / 9.6 across Sicario, Blade Runner 2049, Enemy, plus Arrival which he has seen and loves outside the log. **Two directors own the entire top of his board.** Unplayed Nolan: Interstellar, Inception, Insomnia, Dunkirk, Oppenheimer, Tenet, all unbuzzed live (several carry archive memory scores on the registry).

**Comedy is a viable lane and was under-stocked.** The Nice Guys, first comedy ever pitched, landed at 8.6 with no effort. Counterprogramming against his dread lane works; keep a light card in every slate.

**Jul 25, TWO INSTRUMENTS (critical calibration).** The Jul 25 archive harvest produced FIVE memory 10.0s (Arrival, Oppenheimer, Contact, Deep Impact, Interstellar) against the Ledger's ONE (Memento). This is not inconsistency, it is two different measuring devices. Archive scores run on love and memory, compressed upward by time and affection. Ledger scores run on the film as experienced live, in the room, reaction taken before the number. Cleanest illustration: Deep Impact memory 10.0 sits 1.7 above No Country for Old Men 8.3 live. HARD RULE: archive scores never move Ledger anchors and are never cited as precedent when scoring a live watch. Cite Ledger numbers only when calibrating a pick. (v3 note: memory scores and buckets now live on film_titles; film_status carries the state.)

**Jul 25, NEW LANE INTEL.** Social horror is live and strong: Get Out 9.6 archive alongside Sorry to Bother You 9.4 Ledger, so the lane is confirmed twice by two different instruments. Prestige procedural confirmed high: Zodiac 9.7, Gone Girl 9.6, Silence of the Lambs 9.6. Musicals are genuinely live, not a courtesy: Chicago 9.6. Nolan owns both perfect-score categories (Memento 10.0 Ledger, Oppenheimer 10.0 archive, Inception 9.7, Tenet 9.6, Prestige 9.1). First-contact/space-sincerity is his single highest lane: Arrival, Contact, Interstellar all 10.0. Dance canon is mostly HAZY, not unseen: Center Stage 9.2 and Step Up 8.4 scored, but Black Swan, Moulin Rouge!, La La Land and West Side Story all came back too faded. Those are rewatch cards, never pitch them as new.

**Jul 25, HAZY WING is a distinct signal.** Seen-but-faded means do not pitch as a first watch, but a rewatch is fully live and may play like one. Proof case: Batman Begins scored 9.5 on a rewatch. The hazy roster lives on the registry now (seen_bucket set, no memory_score); query film_status or film_rewatch_shelf instead of reading a list here.
$md$
where id = 'a46b5853-c9f1-43df-95f4-cf40cab6d4bb';
