# -*- coding: utf-8 -*-
# The Vault: the Polaroid Wall. Spatial build.
# Pipeline v2 (2026-08-01): one camera, one wall, four modes.
# Contract: film_ledger_panels is the source of truth; the-ledger.html is a
# regenerated intermediate; this file renders, it does not own content.
import re, io, os, json

_here = os.path.dirname(os.path.abspath(__file__))
BASE = os.environ.get("VAULT_DIR") or (
    _here if os.path.exists(os.path.join(_here, "the-ledger.html"))
    else os.path.dirname(_here))

SRC = os.path.join(BASE, "the-ledger.html")
OUT = os.path.join(BASE, "the-vault.html")

src = io.open(SRC, encoding="utf-8").read()

# ---- pull the ledger panels verbatim ----------------------------------------
panels = re.findall(r'<section class="panel [^"]+">.*?</section>', src, re.S)

# Ledger meta (slug -> date, score, title) comes from the database, never from this file.
_meta_path = os.path.join(BASE, "ledger_meta.json")
if not os.path.exists(_meta_path):
    raise SystemExit(
        "ledger_meta.json missing. Generate it from Supabase first (distinct on"
        " (slug) ... order by watched_at desc; latest live score wins).")
META_RAW = json.load(io.open(_meta_path, encoding="utf-8"))
LEDGER_META = {k: (v[0], float(v[1]), v[2]) for k, v in META_RAW.items()}
assert len(panels) == len(LEDGER_META), (len(panels), len(LEDGER_META))

# ---- carry the per-film palettes over verbatim ------------------------------
_pal = re.search(r'/\* the fourteen palettes \*/(.*?)\n\n', src, re.S)
assert _pal, "palette block not found in the ledger"
PALETTES = _pal.group(1).strip()
assert PALETTES.count('--glyph') == len(LEDGER_META), PALETTES.count('--glyph')

# ---- the links layer (hand-authored bloodlines; schema film_links) ----------
# links.json is written from Supabase before building. Optional: an empty wall
# of connections is a valid wall.
_links_path = os.path.join(BASE, "links.json")
LINKS = (json.load(io.open(_links_path, encoding="utf-8"))
         if os.path.exists(_links_path) else [])

# ---- the bespoke fronts (photo_svg per definitive film; v3) -----------------
# photos.json is written from film_ledger_panels.photo_svg before building.
# Optional: a slug without a scene falls back to its glyph.
_photos_path = os.path.join(BASE, "photos.json")
PHOTOS = (json.load(io.open(_photos_path, encoding="utf-8"))
          if os.path.exists(_photos_path) else {})

def sortkey(t):
    t = re.sub(r'^(The|A|An)\s+', '', t)
    return t.lower()

tagged = []
for p in panels:
    # true on the Ledger, no longer true once the archive is in the room
    p = p.replace("the board's only perfect score", "the Ledger's only perfect score")
    cls = re.match(r'<section class="panel ([a-z0-9-]+)">', p).group(1)
    d, s, title = LEDGER_META[cls]
    rec = int(d.replace("-", ""))
    _mo = ["January","February","March","April","May","June","July",
           "August","September","October","November","December"][int(d[5:7]) - 1]
    when = "watched %s %d" % (_mo, int(d[8:10]))
    p = p.replace(
        '<section class="panel %s">' % cls,
        '<section class="panel %s" data-set="ledger" data-score="%.1f" data-rec="%d" '
        'data-when="%s" data-sort="%s">' % (cls, s, rec, when, sortkey(title)),
        1)
    tagged.append((s, p))

# ---- the archive: the one place facts still live in code (drift-guarded) ----
# bucket: R past year / F a few years / L a long time / C childhood / ? unspecified
BUCKET_REC = {"R": 20250900, "F": 20230000, "L": 20150000, "C": 20030000, "?": 0}
BUCKET_TXT = {"R": "seen in the past year", "F": "seen a few years back",
              "L": "seen a long time ago", "C": "childhood",
              "?": "date not recorded"}

# t, year, score(None=hazy), bucket, bg, fg, sub, glyph, plot, note
A = [
("Arrival", 2016, 10.0, "R", "#22323F", "#E6EFF2", "#8FA6B2", "◌",
 "A linguist is brought to a landed alien ship to answer one question: what do they want. She learns a language whose grammar has no direction, and learning it rewires how she experiences time. The daughter she has been grieving in flashback has not been born yet. She takes the whole life anyway, loss included.",
 "You told me this would land near the top of the Ledger if it were scored, and then you put a perfect ten on it. It is the emotional twin of Blade Runner 2049 and the reason Villeneuve is the spine of your taste. Sicario is his control, Arrival is his grief."),
("Oppenheimer", 2023, 10.0, "?", "#1A1A1C", "#EDE7DC", "#8A8478", "◉",
 "Three hours of rooms. A man builds the bomb, watches it work, and spends the rest of his life in a rigged hearing being taken apart by a smaller man with a grudge. Color is his subjective experience, black and white is the objective record, and the film cuts between them like evidence.",
 "My notes said you were obsessed with it, and a ten confirms it. You and I already worked out that its color grammar is Memento's grammar, which is not a coincidence and is a large part of why Nolan owns both of your perfect scores."),
("Contact", 1997, 10.0, "R", "#2C3E52", "#EAF1F7", "#93A8BC", "✧",
 "A radio astronomer picks up a signal from Vega containing blueprints for a machine. She rides it, experiences eighteen hours of contact, and comes back with no evidence and a recording of eighteen hours of static. The film ends on the gap between what she knows and what she can prove.",
 "The founding document of your first-contact lane, and the fact that you saw it in the past year and still put a ten on it means it is not nostalgia. Arrival and Contact scoring identically is the cleanest read on you in this entire archive."),
("Deep Impact", 1998, 10.0, "R", "#39434E", "#E9EDF1", "#98A2AD", "☄",
 "A comet is coming and the movie is almost entirely about who gets a spot in the cave and who says goodbye on the beach. The Messiah crew flies into the fragment on purpose. The wave hits anyway.",
 "The single most interesting number in this entire archive. A ten for the disaster movie that chose funerals over spectacle, which is very much a choice you would make, and it sits 1.7 above No Country on your Ledger. Two different instruments, both honest."),
("Interstellar", 2014, 10.0, "?", "#1E2A36", "#E4ECF2", "#8CA0B0", "◍",
 "Earth is dying so a farmer flies through a wormhole to find a new one, loses decades to relativity on a water planet, and falls into a black hole that turns out to be a library of his daughter's bedroom built by people who are also him. Love is the only thing that gets through the gap.",
 "You never once mentioned this to me in eleven nights of Nolan talk, which is why it went into the intake with a warning label. A ten. Filed permanently."),
("Dune: Part Two", 2024, 9.9, "R", "#8A5A2B", "#FBF0E1", "#D2AE83", "⌬",
 "Paul takes the water of life, stops pretending the prophecy is not a weapon, and becomes exactly the thing his mother engineered. The film is honest that the messiah story is a horror story from the inside.",
 "One tenth off perfect and the highest non-ten in the archive. Part Three in December 2026 is the single most anticipated thing on your calendar and I am already planning the night."),
("Titanic", 1997, 9.8, "?", "#1D3A4A", "#E8F0F4", "#89A6B4", "❈",
 "Two people meet on the most famous boat in history and one of them lives. Three hours and fifteen minutes, and the second half is a real-time engineering disaster shot with a body count and a clock.",
 "You added this yourself in the sweep round, which means it was sitting in your head unprompted. A 9.8 in a set where you also scored Parasite and Zodiac, so this is not a guilty pleasure vote, this is a real one."),
("The Lord of the Rings", None, 9.8, "?", "#3B4A32", "#EDF1E5", "#9CAA8C", "❖",
 "Nine hours, or eleven if you do it properly. A small person carries a small object a very long way while everyone larger fails at almost everything.",
 "Scored as a whole because that is the only honest way to do it. If you ever want to split the trilogy into three numbers, say so and I will reopen it."),
("The Truman Show", 1998, 9.8, "?", "#4C7A9E", "#F1F7FA", "#B9D2E1", "▢",
 "A man discovers his entire life is a television show and every person in it is employed. He sails to the edge of the sky, finds a door, and walks through it into a world he knows nothing about.",
 "This belongs in your pet genre and I had never once connected it. A constructed person walking out of a constructed reality is Bella Baxter, it is Ava leaving the compound, and it is K choosing meaning anyway. Add it to the list."),
("Dune", 2021, 9.7, "R", "#B07C42", "#FDF4E7", "#DFC199", "◇",
 "House Atreides is handed a planet as a trap, the trap closes, and a boy walks into the desert with his mother and a prophecy that was planted there centuries ago to be used.",
 "Two tenths under its sequel, which is the correct ranking and the one most people get backwards."),
("The Substance", 2024, 9.7, "R", "#C7B4C4", "#3A1A2E", "#7A4A64", "◑",
 "A fading star injects a serum that produces a younger duplicate. They are supposed to alternate weeks. They do not. The body pays every invoice, and the third act is not a metaphor anymore.",
 "You named this yourself as a reference point when you asked me for weird, gross, and cringe. It scored four tenths above Poor Things, which tells me the body horror was a feature and not a tax."),
("Inception", 2010, 9.7, "F", "#3E4C5A", "#EAEFF4", "#98A8B6", "◈",
 "A team of thieves goes three dreams deep to plant an idea, running out of time in reverse at every level. A man who cannot stop grieving his wife keeps building her into the architecture.",
 "The other Nolan you never mentioned. Also, quietly, another man editing reality to survive himself, which makes four films in your top tier running the same engine."),
("Zodiac", 2007, 9.7, "F", "#4A5240", "#EDF0E7", "#9BA490", "✆",
 "The killer is never caught. The movie is about the men who could not stop looking, and the exact moment each of them loses the rest of his life to it. Two and a half hours of paperwork and dread.",
 "Fincher's obsession procedural landing at 9.7 confirms the Nightcrawler and Sicario read: you do not need a resolution, you need total command of the frame."),
("Parasite", 2019, 9.7, "F", "#4F4237", "#F2EBE1", "#A8967F", "▤",
 "A poor family installs itself into a rich household one job at a time, and then discovers the basement. The genre changes twice and the rain does the rest.",
 "Bong's second entry in your archive after Snowpiercer, and it outscores it by three tenths. Class allegory with an engine under it is home turf for you."),
("Kingsman: The Secret Service", 2014, 9.6, "F", "#5C3C6B", "#F4ECF8", "#B79ECB", "✂",
 "A street kid is recruited into a tailor shop that is actually a spy agency, and a lisping tech billionaire plans to cull humanity with free SIM cards. The church scene is one unbroken take of a man being extremely good at his job.",
 "You buzzed SEEN on this back on July 21 and flagged it rewatch worthy in the same breath. The 9.6 says the rewatch is not optional."),
("Don't Look Up", 2021, 9.6, "R", "#3F5240", "#ECF1EA", "#9AAA97", "▽",
 "Two astronomers find a planet killer and cannot get anyone to care. The comet is real, the meeting is scheduled for Thursday, and everybody dies at dinner.",
 "The angriest film in your archive and it scored higher than most of your Ledger. This is a disaster movie about being right and being ignored, which is a specific flavor of rage and clearly one that lands."),
("Conclave", 2024, 9.6, "R", "#7B2F3A", "#F7EAEC", "#C99AA2", "✚",
 "Cardinals lock themselves in a room to elect a pope and spend the whole film committing small procedural sins. A quiet man runs the process and the process eats everyone.",
 "Your prestige procedural lane, confirmed at 9.6. Rooms, rules, and people quietly breaking them is a whole shelf I have been underusing."),
("Tenet", 2020, 9.6, "F", "#37424E", "#E8EDF2", "#94A2B0", "⧖",
 "Time runs both directions and the film refuses to slow down and explain itself. A protagonist with no name prevents a future war by moving backwards through it.",
 "The Nolan people either love or resent, and you love it. That is a real data point: you do not need to follow every beat if the machine is running at full power."),
("Get Out", 2017, 9.6, "?", "#2A3A2E", "#E7EEE8", "#93A497", "◔",
 "A man meets his white girlfriend's family and slowly learns what the weekend is actually for. The Sunken Place, the teacup, and a third act that pays every setup.",
 "Peele's debut sitting at 9.6 alongside Sorry to Bother You is a clean pair, and it says the social-horror lane is wide open for me."),
("Chicago", 2002, 9.6, "?", "#8C1F3D", "#FAE9EE", "#D18FA5", "❍",
 "Two murderesses fight for the spotlight in a Cook County jail while a lawyer sells the whole thing as vaudeville. Every number is staged inside somebody's head as the fantasy version of what is actually happening.",
 "The highest scoring musical in the archive, and the one whose entire formal conceit is that the numbers are internal. A choreographer's 9.6 for a film built on that idea is not a surprise, it is a thesis."),
("Gone Girl", 2014, 9.6, "?", "#3A4550", "#E9EEF2", "#96A3AE", "◪",
 "A wife disappears, the husband looks guilty, and then the movie hands the microphone to her and never takes it back. Two people trapped in a marriage that is also a performance for a live audience.",
 "Your second Fincher, tied with Zodiac's neighborhood. A woman who edits reality with total competence is the gender-flipped version of your entire favorite genre."),
("The Silence of the Lambs", 1991, 9.6, "?", "#4A4438", "#EFEBE2", "#A29882", "◬",
 "A trainee is sent to interview a caged genius so she can catch a different monster. Every conversation is a trade, and the camera puts you directly in the eyeline of both.",
 "The only pre-1994 film in the archive to score this high, which cuts against the antibodies doctrine. Worth noting: when the craft is total, the vintage stops mattering."),
("Bugonia", 2025, 9.5, "R", "#5E7A3F", "#F0F5E8", "#A8BC8B", "❋",
 "Two conspiracy-poisoned men kidnap a pharmaceutical CEO because they are certain she is an alien. The film refuses to tell you who is right until it absolutely has to.",
 "Your most recent Lanthimos and the one you told me you loved before we ever scored a single film together. Two tenths above Poor Things on the Ledger."),
("Mission: Impossible", None, 9.5, "?", "#2F4763", "#E9F0F7", "#93A9C0", "⌁",
 "Eight films of a man refusing to use a stunt double. Scored as one run, which is how it actually lives in your head.",
 "Profile said all seen and loved, and 9.5 backs it. This is the purest expression of your competent-operator lane, the same shelf as Bond and Bourne but scoring above both."),
("Snowpiercer", 2013, 9.4, "F", "#3A5A66", "#E9F1F4", "#94AEB8", "▬",
 "The last humans circle a frozen Earth on a train with a class system, and a revolt fights forward one car at a time until it reaches the engine and learns the revolt was scheduled.",
 "You buzzed this SEEN AND LOVED in all caps back on July 22. Bong's other entry, three tenths under Parasite."),
("Everything Everywhere All At Once", 2022, 9.4, "F", "#B04A7A", "#FBEBF2", "#E3A9C6", "❂",
 "A laundromat owner in an IRS audit learns she is the worst version of herself across every universe, which is exactly why she can borrow from all of them. Hot dog fingers, a bagel, and a generational apology.",
 "Filed under weird and audacious in your profile from day one. Ties Nightcrawler and Sorry to Bother You on the combined board."),
("Saw", 2004, 9.3, "?", "#3E4A44", "#E9EFEB", "#96A69E", "⌗",
 "Two men wake chained in a bathroom with a body between them. The film is mostly one room and a series of very bad choices, and the body gets up at the end.",
 "Cited in your profile as proof of horror tolerance, and 9.3 means it was never just tolerance. The bathroom is a stage with two performers and a fixed set, which is closer to your taste than the sequels suggest."),
("The Bourne trilogy", None, 9.3, "?", "#4A5142", "#EDEFE8", "#9EA694", "⟐",
 "A man with no memory discovers he is extremely good at violence and spends three films trying to find out who made him that way.",
 "Your profile said seen and liked, which was underselling it by a lot. Identity Supremacy Ultimatum, scored as a run, sitting one tenth under Saw."),
("Center Stage", 2000, 9.2, "?", "#C4708E", "#FCEDF2", "#E5AFC2", "✤",
 "Ballet students at a fictional New York academy fight for company contracts, and the final workshop performance turns into a full production number with a motorcycle on stage.",
 "The most personally loaded number in this archive and I am not going to pretend otherwise. The one dance film that dancers actually defend, scored above The Prestige."),
("The Prestige", 2006, 9.1, "F", "#43414A", "#EDEBF0", "#9B98A4", "◫",
 "Two magicians destroy each other over a trick. One is using a double. One is using a machine that makes a copy and drowns the original every single night.",
 "You buzzed SEEN on this and told me it did not slap, and then scored it a 9.1. This is why I asked instead of assuming. Your floor is other people's ceiling."),
("Planet of the Apes (the modern trilogy)", None, 8.9, "R", "#5A6B4E", "#EEF2E9", "#A5B39A", "◭",
 "Rise, Dawn, and War. A chimp gets smart, builds a society, and spends three films trying to avoid becoming us. Caesar is one of the best motion-capture performances ever put on screen.",
 "The only archive entry under nine that you did not actively dislike, and you saw it in the past year, so this is a current read and not a faded one."),
("Step Up", 2006, 8.4, "?", "#6A4C86", "#F3EDF8", "#B79FCE", "✦",
 "A kid doing community service at an arts academy partners with a dancer who needs a replacement for her senior showcase. The showcase is the whole movie.",
 "8.4 is a working professional's honest number for the film that recruited a generation. Eight tenths under Center Stage, which is exactly the gap I would have predicted."),
("Flowers in the Attic (Lifetime)", 2014, 4.3, "?", "#6B5A78", "#F1ECF5", "#B3A3BF", "✕",
 "Four children are locked in an attic by their mother and grandmother so the mother can secure an inheritance. It is a Lifetime adaptation of a book that was already a lot.",
 "July 19. John and Tori made you watch this as retaliation for Obsession, and your review was five words long and unprintable in polite company. The Vault needed a floor and now it has one."),
]

HAZY = [
# Stardust graduated to the Ledger (watched live 2026-08-02, 9.0). Removed from
# HAZY by the drift guard's own rule; its panel now lives in film_ledger_panels.
("Prisoners", 2013, "F", "#40453E", "#EAEDE8", "#98A093", "⊘",
 "Two girls go missing. One father decides the police are too slow and takes matters into a bathroom with a sledgehammer. Villeneuve, and the bleakest thing he has made.",
 "You remember the sledgehammer and nothing else. This has been parked since July 17 by standing rule: I do not pitch it, it is only ever yours to raise. Consider the rewatch permanently available and never suggested."),
("Shutter Island", 2010, "L", "#465059", "#EBEFF3", "#9AA5AF", "◐",
 "A marshal investigates a disappearance at a hospital for the criminally insane, and the island keeps rearranging itself around him. The last line is the whole film.",
 "You called this hazy back during a wall audit and hazy it remains. Given where Memento landed, an honest rewatch of this could be very loud."),
("Life of Pi", 2012, "L", "#2E7A80", "#E8F4F5", "#97C7CB", "≈",
 "A boy survives a shipwreck in a lifeboat with a tiger, and then tells the insurance investigators a second version with no animals in it. You choose which one is true.",
 "You put this in the men-who-edit-reality genre yourself, next to Memento and Enemy, and you called Memento's insulin question Life of Pi coded. It is load bearing in your taste and you cannot score it. That is a rewatch with a purpose."),
("The Martian", 2015, "L", "#B5652E", "#FBEFE4", "#E0B489", "◓",
 "An astronaut is left for dead on Mars and solves his way home one problem at a time, narrating the whole thing to a camera with a good attitude and a potato farm.",
 "Filed in your space optimism lane. Given Contact and Interstellar both took tens, this one being a blur is the biggest gap in the archive."),
("James Bond (the franchise)", None, "L", "#2F3A46", "#E8EBEF", "#95A0AB", "◎",
 "Sixty years, six men, and a formula that keeps surviving its own obituaries.",
 "Your profile says most seen and loved, and then you could not put a number on it, which is the honest answer for something you absorbed over decades rather than watched. If you ever want to score a single era, Craig or Connery or Brosnan, I will take that."),
("Mad Max: Fury Road", 2015, "L", "#C4541F", "#FCEDE4", "#EAB490", "⌁",
 "A two hour car chase in one direction and then the same chase back. Almost no dialogue, almost no digital effects, and a war rig full of people escaping a man who owns the water.",
 "I have pitched this at you and you never answered. Now I know why. Practical stunt work at this scale is choreography with engines, and a real rewatch is overdue."),
("Edge of Tomorrow", 2014, "F", "#4F7A85", "#EDF5F7", "#A7CBD3", "↺",
 "A coward dies on a beach, wakes up the morning before, and has to die a few hundred more times to get good enough to win. A loop movie that is genuinely funny about the grind.",
 "Also pitched, also never answered, now confirmed seen but faded. Sits in the loop lane with Coherence and Tenet, both of which you scored high."),
("Black Swan", 2010, "L", "#7A3C50", "#F6EAEE", "#C79AA8", "❃",
 "A ballerina cast in Swan Lake fractures under the role until she cannot tell rehearsal from hallucination from injury. The performance is perfect and it costs everything.",
 "The dance film you cannot score, which is interesting on its own. Given Poor Things at 9.3 and Chicago at 9.6, a rewatch of this one has a real shot at the archive podium."),
("Moulin Rouge!", 2001, "L", "#A81E3F", "#FBE9ED", "#DE93A5", "❤",
 "A poet falls for a courtesan in a Paris nightclub, told in pop songs and cuts so fast the first twenty minutes are an assault. Then it slows down and breaks your heart on schedule.",
 "Baz at full volume. Filed hazy, which for a musical of this specific intensity probably means you have not sat with it since it was everywhere."),
("La La Land", 2016, "F", "#3E5C86", "#EAF0F8", "#A2B9D6", "♪",
 "A jazz musician and an actress fall in love and then choose their careers, and the last five minutes show you the version where they did not.",
 "Gosling, who you have now scored 9.8 twice and 8.6 once in three completely different registers. This would be the fourth."),
("West Side Story", 1961, "C", "#B5462E", "#FBEDE7", "#E4AC98", "✧",
 "Romeo and Juliet on the Upper West Side with Jerome Robbins choreography that has never really been improved on.",
 "Filed under childhood, which explains the haze. There is also a 2021 Spielberg version that solves several problems with the original if you would rather come at it fresh."),
("Knives Out", 2019, "F", "#6B4A2E", "#F4ECE4", "#C0A183", "◈",
 "A crime novelist dies after his birthday party and a Southern detective works the case among a family of awful people. The film tells you what happened in the first act and is better for it.",
 "This is Sicario logic in a comedy: no twist needed, total command of the machine. That it did not stick is worth a second pass."),
("Midsommar", 2019, "F", "#C9B27E", "#3A2E12", "#7D6B36", "☼",
 "A grieving woman follows her indifferent boyfriend to a Swedish festival that runs on a ninety year cycle. Everything terrible happens in full daylight.",
 "Aster's breakup movie disguised as folk horror. I have been holding this back and it is now confirmed as seen but faded, so it becomes a rewatch card instead of a pitch."),
("Spider-Man: Into the Spider-Verse", 2018, "F", "#8E2F6E", "#FAE9F4", "#D593BE", "◆",
 "Miles Morales meets five other Spider-People from five other universes, each animated in their own visual language. The frame rate itself is a character arc.",
 "The most formally inventive animation of the last decade, and a multiverse film that actually earns it. You scored EEAAO 9.4, so the ceiling here is high."),
]

# ---- certified: archive films Dixon has ruled don't need a rewatch ----------
# Never hardcoded here. certified.json is written from film_taste_profile
# (content->'vault_model'->'certified_films') before building.
_cert_path = os.path.join(BASE, "certified.json")
CERTIFIED = ({k: tuple(v) for k, v in
              json.load(io.open(_cert_path, encoding="utf-8")).items()}
             if os.path.exists(_cert_path) else {})

CERT_FORM = (
 u'\n  <div class="certwrap">\n'
 u'    <span class="cert-btn">write on it in pen</span>\n'
 u'    <div class="certform">\n'
 u'      <input class="cert-score" type="number" min="0" max="10" step="0.1" value="{sc}">\n'
 u'      <input class="cert-why" type="text" maxlength="240" '
 u'placeholder="one line. why a rewatch would not change it.">\n'
 u'      <span class="cert-go">lock it in</span>\n'
 u'    </div>\n'
 u'    <span class="certdone">in pen at <b class="cd-n"></b>. '
 u'<u class="cert-undo">undo</u></span>\n'
 u'  </div>'
)

def _lum(h):
    h = h.lstrip('#')
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return (0.299 * r + 0.587 * g + 0.114 * b)

def accent(bg, sub):
    """Pick whichever of the panel's two colors reads on paper."""
    cands = [c for c in (bg, sub) if _lum(c) < 150]
    return min(cands, key=_lum) if cands else '#6E6A61'

PANEL_TPL = (
 u'<section class="{cls}" data-set="archive" data-title="{t}" data-score="{sc}" '
 u'data-rec="{rec}" data-when="{when}" data-sort="{sk}"{certattr} '
 u'style="--bg:{bg};--fg:{fg};--sub:{sub};--acc:{acc};--glyph:\'{gl}\'">\n'
 u'  <div class="no">{no}</div>\n'
 u'  <div class="head"><div class="film">{t}{yr}</div><div class="score">{scd}</div></div>\n'
 u'  <div class="meta">{meta}</div>\n'
 u'  <p class="plot">{plot}</p>\n'
 u'  <p class="debrief">{note}</p>{extra}\n'
 u'</section>'
)

arc = []
n_cert = 0
for (t, y, sc, bk, bg, fg, sub, gl, plot, note) in A:
    yr = u'<span>%d</span>' % y if y else u''
    cd = CERTIFIED.get(t)
    if cd:
        # certified. it graduates: gets its color field back and joins the definitive list.
        n_cert += 1
        csc, cdate, cwhy = cd
        cls, certattr = u'panel', u' data-cert="1"'
        meta = u'The Vault &middot; certified from memory &middot; no rewatch needed'
        extra = (u'\n  <p class="certnote"><b>Certified %s</b>%s</p>' % (cdate, cwhy))
        use = csc
    else:
        cls, certattr = u'panel arc', u''
        meta = u'The Vault &middot; scored from memory &middot; %s' % BUCKET_TXT[bk]
        extra = CERT_FORM.format(sc="%.1f" % sc)
        use = sc
    arc.append((use, PANEL_TPL.format(
        cls=cls, certattr=certattr, sc="%.1f" % use, rec=BUCKET_REC[bk],
        when=BUCKET_TXT[bk], sk=sortkey(t),
        bg=bg, fg=fg, sub=sub, acc=accent(bg, sub), gl=gl, no="", t=t, yr=yr,
        scd=u'%.1f<small> /10</small>' % use,
        meta=meta, plot=plot, note=note, extra=extra)))

hazy_html = []
for (t, y, bk, bg, fg, sub, gl, plot, note) in HAZY:
    yr = u'<span>%d</span>' % y if y else u''
    hazy_html.append(PANEL_TPL.format(
        cls=u'panel arc', certattr=u'', sc="", rec=BUCKET_REC[bk],
        when=BUCKET_TXT[bk], sk=sortkey(t),
        bg=bg, fg=fg, sub=sub, acc="#9C978C", gl=gl, no="", t=t, yr=yr,
        scd=u'<small>no score</small>',
        meta=u'The Hazy Wing &middot; seen, too faded to rate &middot; %s' % BUCKET_TXT[bk],
        plot=plot, note=note,
        extra=u'').replace('data-score=""', 'data-score="" data-hazy="1"'))

# ---- drift guard ------------------------------------------------------------
# The Archive (A) and HAZY lists are data in this file. If a film has been
# watched live it must be REMOVED from them, or it renders twice / stays hazy
# after its exit. Fail loudly, not silently.
_ledger_titles = {t for (_d, _s, t) in LEDGER_META.values()}
_dupe_arc = [t for (t, *_rest) in A if t in _ledger_titles]
_dupe_hazy = [t for (t, *_rest) in HAZY if t in _ledger_titles]
if _dupe_arc or _dupe_hazy:
    raise SystemExit(
        "DRIFT GUARD: these films are on the Ledger but still listed in "
        "vault.py data. Remove them from A/HAZY (and log a paired measurement "
        "if archive-scored): archive=%r hazy=%r" % (_dupe_arc, _dupe_hazy))

# deterministic ordering everywhere: score, then title sortkey, then raw html
all_scored = tagged + arc
all_scored.sort(key=lambda r: (r[0], r[1]))
sections = u"\n\n".join([p for _, p in all_scored] + hazy_html)

# ---- facts line -------------------------------------------------------------
_dates = sorted(d for (d, _s, _t) in LEDGER_META.values())
_MO = ["January","February","March","April","May","June","July",
       "August","September","October","November","December"]
def _pretty(d):
    return "%s %d" % (_MO[int(d[5:7]) - 1], int(d[8:10]))
_span = _pretty(_dates[0]) + "&ndash;" + (
    _dates[-1][8:10].lstrip("0") if _dates[0][5:7] == _dates[-1][5:7] else _pretty(_dates[-1]))
FACTS = (u"<b>The Ledger</b>: %d films, %s, %s, scored live. &nbsp;&middot;&nbsp; "
         u"<b>The Shoebox</b>: %d films scored from memory. &nbsp;&middot;&nbsp; "
         u"<b>The Hazy Wing</b>: %d frames that never developed. "
         u"&nbsp;&middot;&nbsp; <b>Definitive</b>: the Ledger plus every certified "
         u"photo. Archive scores never move a Ledger anchor."
         % (len(tagged), _span, _dates[-1][:4], len(arc), len(hazy_html)))

# ---- JSON payloads for the runtime ------------------------------------------
def _embed(obj):
    return json.dumps(obj, ensure_ascii=True).replace("</", "<\\/")

META_JS = _embed(META_RAW)          # slug -> [date, score, title]
LINKS_JS = _embed(LINKS)            # [{from,to,relation,note,weight,directional,source}]
PHOTOS_JS = _embed(PHOTOS)          # slug -> svg scene (the bespoke fronts)

TEMPLATE = io.open(os.path.join(_here, "wall_template.html"), encoding="utf-8").read()

doc = (TEMPLATE
       .replace("__PALETTES__", PALETTES)
       .replace("__FACTS_JS__", _embed(FACTS))
       .replace("__SECTIONS__", sections)
       .replace("__META__", META_JS)
       .replace("__LINKS__", LINKS_JS)
       .replace("__PHOTOS__", PHOTOS_JS))
for tok in ("__PALETTES__", "__FACTS_JS__", "__SECTIONS__", "__META__", "__LINKS__", "__PHOTOS__"):
    assert tok not in doc, tok

io.open(OUT, "w", encoding="utf-8").write(doc)
print("wrote", OUT, len(doc), "bytes")
print("ledger", len(tagged), "archive", len(arc), "certified", n_cert, "hazy", len(hazy_html))
print("links", len(LINKS), "fronts", len(PHOTOS))
