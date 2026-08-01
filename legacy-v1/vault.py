# -*- coding: utf-8 -*-
import re, io, os

# where the-ledger.html and the-vault.html live.
# set VAULT_DIR to override. otherwise: next to this script, else one level up.
_here = os.path.dirname(os.path.abspath(__file__))
BASE = os.environ.get("VAULT_DIR") or (
    _here if os.path.exists(os.path.join(_here, "the-ledger.html"))
    else os.path.dirname(_here))

SRC = os.path.join(BASE, "the-ledger.html")
OUT = os.path.join(BASE, "the-vault.html")

src = io.open(SRC, encoding="utf-8").read()

# ---- pull the 17 ledger panels verbatim -------------------------------------
panels = re.findall(r'<section class="panel [^"]+">.*?</section>', src, re.S)

# Ledger meta (slug -> date, score, title) comes from the database, never from this file.
# The session writes ledger_meta.json from film_log + film_ledger_panels before building.
import json
_meta_path = os.path.join(BASE, "ledger_meta.json")
if not os.path.exists(_meta_path):
    raise SystemExit(
        "ledger_meta.json missing. Generate it from Supabase first:\n"
        "  select p.slug, t.title, l.rating, l.watched_at from film_ledger_panels p\n"
        "  join film_titles t on t.id=p.title_id join film_log l on l.title_id=p.title_id;\n"
        "Shape: {\"slug\": [\"YYYY-MM-DD\", score, \"Title\"], ...}")
LEDGER_META = {k: (v[0], float(v[1]), v[2])
               for k, v in json.load(io.open(_meta_path, encoding="utf-8")).items()}
assert len(panels) == len(LEDGER_META), (len(panels), len(LEDGER_META))

# ---- carry the 17 per-film palettes over verbatim ---------------------------
_pal = re.search(r'/\* the fourteen palettes \*/(.*?)\n\n', src, re.S)
assert _pal, "palette block not found in the ledger"
PALETTES = _pal.group(1).strip()
assert PALETTES.count('--glyph') == len(LEDGER_META), PALETTES.count('--glyph')

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

# ---- the archive -------------------------------------------------------------
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
("Stardust", 2007, "L", "#5D6E9E", "#EEF1F8", "#A9B6D2", "✩",
 "A boy crosses a wall into a magic kingdom to fetch a fallen star for a girl, and the star turns out to be a woman with opinions. Pirates, witches, and a sky ship.",
 "Buzzed SEEN back on July 21, last watched in college, and flagged rewatch worthy in the same message. That rewatch is unclaimed and this is me pointing at it again."),
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

# ---- certified: archive films Dixon has ruled don't need a rewatch -----------
# title -> (score at certification, date, the line he gave)
# Certified archive films. Never hardcode them here; that is how this file went
# stale before. Written from the database:
#   select content->'vault_model'->'certified_films' from film_taste_profile limit 1;
# certified.json shape: {"Contact": [9.4, "July 25, 2026", "the line he gave"], ...}
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
# after its exit. This has almost happened once. Fail loudly, not silently.
_ledger_titles = {t for (_d, _s, t) in LEDGER_META.values()}
_dupe_arc = [t for (t, *_rest) in A if t in _ledger_titles]
_dupe_hazy = [t for (t, *_rest) in HAZY if t in _ledger_titles]
if _dupe_arc or _dupe_hazy:
    raise SystemExit(
        "DRIFT GUARD: these films are on the Ledger but still listed in "
        "vault.py data. Remove them from A/HAZY (and log a paired measurement "
        "if archive-scored): archive=%r hazy=%r" % (_dupe_arc, _dupe_hazy))

all_scored = tagged + arc
all_scored.sort(key=lambda r: (r[0], r[1]))
body_panels = u"\n\n".join([p for _, p in all_scored] + hazy_html)

TOTAL_SCORED = len(all_scored)
TOTAL_HAZY = len(hazy_html)

HEAD = u'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>The Vault</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Caveat:wght@400;600;700&family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,700;1,400&display=swap');
:root{--wall:#E8E2D6;--wall2:#DFD8C9;--ink:#1C1914;--mid:#6E675A;--rule:#D2C9B8;--photo:#FFFEF8;--pencil:#8A8272;--pen:#25221C}
*{margin:0;padding:0;box-sizing:border-box}
body{background:linear-gradient(180deg,var(--wall) 0%,var(--wall2) 100%);color:var(--ink);font-family:'Schibsted Grotesk',sans-serif;font-size:15px;line-height:1.6;padding:64px 26px 120px;min-height:100vh}
.wrap{max-width:1040px;margin:0 auto}

/* the premise */
.over{font-size:10.5px;font-weight:700;letter-spacing:.34em;text-transform:uppercase;color:var(--mid);margin-bottom:30px}
h1{font-family:'Instrument Serif',serif;font-weight:400;font-style:italic;font-size:clamp(64px,11vw,118px);line-height:.92}
.dek{max-width:56ch;margin-top:30px;font-size:15.5px;line-height:1.65}
.dek em{font-family:'Caveat',cursive;font-style:normal;font-size:22px;font-weight:600}
.facts{font-size:12px;color:var(--mid);margin-top:18px;max-width:88ch}
.facts b{font-weight:700;color:var(--ink)}
.mast-rule{border:none;border-top:2px solid var(--ink);margin:40px 0 0;opacity:.75}

/* the desk */
.desk{position:sticky;top:0;z-index:20;background:var(--wall);border-bottom:1px solid var(--rule);box-shadow:0 8px 18px rgba(28,25,20,.05);padding:15px 0 13px}
.deskrow{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.deskrow+.deskrow{margin-top:7px}
.dl{font-size:9px;font-weight:700;letter-spacing:.26em;text-transform:uppercase;color:var(--mid);width:58px;flex:none}
.opt{font-size:11px;font-weight:500;padding:6px 13px;border:1px solid var(--rule);border-radius:999px;background:var(--photo);cursor:pointer;user-select:none;white-space:nowrap;transition:.12s;color:var(--mid)}
.opt:hover{color:var(--ink);border-color:var(--mid)}
.opt.on{background:var(--ink);color:var(--photo);border-color:var(--ink)}
.tallyline{font-family:'Caveat',cursive;font-size:17px;color:var(--mid);margin-top:10px}

/* section scrawl */
.tier-head{grid-column:1/-1;margin:52px 0 0;display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}
.tier-head .rn{display:none}
.tier-head h2{font-family:'Caveat',cursive;font-weight:700;font-size:42px;line-height:1;color:var(--pen)}
.tier-head span{font-family:'Caveat',cursive;font-size:19px;color:var(--mid)}

/* the wall of polaroids */
#stage{display:grid;grid-template-columns:repeat(12,1fr);gap:64px 30px;align-items:start;padding-top:26px}

/* one photo */
.panel{position:relative;background:var(--bg);color:var(--fg);grid-column:span 3;aspect-ratio:1/.96;cursor:pointer;
  box-shadow:0 0 0 12px var(--photo),0 62px 0 12px var(--photo),0 74px 26px rgba(28,25,20,.28),0 6px 14px rgba(28,25,20,.14);
  margin:12px 12px 86px;transition:transform .16s}
.panel::before{content:var(--glyph);position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:clamp(64px,8vw,104px);line-height:1;opacity:.18;pointer-events:none;font-family:'Schibsted Grotesk',sans-serif}
#stage .panel:nth-child(4n):not(.focus){transform:rotate(-1.4deg)}
#stage .panel:nth-child(4n+1):not(.focus){transform:rotate(.9deg)}
#stage .panel:nth-child(4n+2):not(.focus){transform:rotate(-.5deg)}
#stage .panel:nth-child(4n+3):not(.focus){transform:rotate(1.2deg)}
#stage .panel:not(.focus):hover{transform:rotate(0) translateY(-3px);z-index:30}
#stage .panel:has(.certwrap.open),#stage .panel:has(.certform :focus){z-index:31}
#stage .panel.focus{transform:translateX(-50%)}
.no{position:absolute;top:7px;left:10px;font-size:9px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:var(--sub);opacity:.9}
/* the chin: handwriting on the border */
.panel .head{position:absolute;left:-4px;right:-4px;top:calc(100% + 6px);display:flex;justify-content:space-between;align-items:flex-start;gap:10px;color:var(--pen);pointer-events:none}
.panel .film{font-family:'Caveat',cursive;font-weight:600;font-size:20px;line-height:.95;color:var(--pen);white-space:normal}
.panel .film span{font-family:'Caveat',cursive;font-size:15px;color:var(--pencil);margin-left:6px}
.panel .score{font-family:'Caveat',cursive;font-weight:700;font-size:26px;color:var(--pen);white-space:nowrap}
.panel .score small{font-size:14px;color:var(--pencil)}
/* the front of a photo carries no essay */
.panel:not(.focus) .meta,.panel:not(.focus) .plot,.panel:not(.focus) .quote,.panel:not(.focus) .more-toggle,.panel:not(.focus) .more,.panel:not(.focus) .debrief,.panel:not(.focus) .certnote{display:none}

/* flip it over: the back of the photo */
#veil{position:fixed;inset:0;background:rgba(24,21,15,.78);z-index:50;display:none}
#veil.on{display:block}
.panel.focus{position:fixed;z-index:60;top:4vh;left:50%;transform:translateX(-50%);width:min(700px,94vw);max-height:90vh;overflow:auto;cursor:default;
  grid-column:auto;aspect-ratio:auto;margin:0;background:var(--photo);color:var(--pen);
  box-shadow:0 60px 160px rgba(0,0,0,.55);padding:44px 40px 36px}
.panel.focus::before{content:none}
.panel.focus .no{position:static;color:var(--pencil)}
.panel.focus .head{position:static;margin-top:8px;pointer-events:auto;color:var(--pen)}
.panel.focus .film{font-family:'Instrument Serif',serif;font-size:clamp(30px,6vw,40px);line-height:1.02;white-space:normal;color:var(--pen)}
.panel.focus .film span{font-family:'Schibsted Grotesk';font-size:13px;color:var(--pencil)}
.panel.focus .score{font-family:'Instrument Serif',serif;font-size:clamp(30px,6vw,40px);color:var(--pen)}
.panel.focus .score small{font-size:14px;color:var(--pencil)}
.panel.focus .quote{color:var(--pen)}
.panel.focus .quote::before{content:'what you said, verbatim';display:block;font-family:'Caveat',cursive;font-size:16px;color:var(--pencil);margin-bottom:2px}
.pclose{position:absolute;top:14px;right:14px;z-index:5;font-family:'Caveat',cursive;font-size:17px;font-weight:600;padding:5px 13px;background:var(--pen);color:var(--photo);border-radius:999px;cursor:pointer;user-select:none}
.meta{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--pencil);margin-top:9px}
.plot{margin-top:18px;max-width:58ch}
.quote{font-family:'Instrument Serif',serif;font-style:italic;font-size:clamp(20px,4.2vw,25px);line-height:1.3;margin-top:20px;max-width:34ch}
.more-toggle{display:inline-block;font-family:'Caveat',cursive;font-size:17px;font-weight:600;margin-top:14px;cursor:pointer;user-select:none;opacity:.85;border-bottom:1px dashed currentColor;padding-bottom:1px}
.more{display:none;margin-top:8px}
.panel.focus .more.open{display:block}
.mq{font-family:'Instrument Serif',serif;font-style:italic;font-size:17px;line-height:1.4;margin-top:13px;max-width:52ch}
.mq b{font-family:'Caveat',cursive;font-style:normal;font-weight:600;font-size:15px;color:var(--pencil);display:block;margin-bottom:0}
.debrief{margin-top:18px;color:#57503F;font-size:14px;max-width:58ch}
.debrief b{font-weight:500;color:var(--pen)}

/* the ledger palettes: the photo is the film */
/* ledger palettes: start */
__PALETTES__
/* ledger palettes: end */
.memento::before{opacity:.05}

/* the shoebox: prints memory swears it took */
.panel.arc{filter:saturate(.34) contrast(.92) brightness(1.07)}
.panel.arc .film,.panel.arc .score{color:var(--pencil)}
.panel.arc .score::after{content:' from memory';font-size:12px;color:var(--pencil);font-weight:400}
.panel.arc.focus{filter:none}

/* undeveloped: the chemicals never finished */
.panel.arc[data-hazy]{filter:none;background:linear-gradient(160deg,#23211B 0%,#2E2B23 55%,#26241D 100%);color:#4A463C}
.panel.arc[data-hazy]::before{opacity:.06;color:#8A8272}
.panel.arc[data-hazy] .no{color:#575247}
.panel.arc[data-hazy] .score{display:none}
.panel.arc[data-hazy] .film{color:var(--pencil)}
.panel.arc[data-hazy] .head::after{content:'undeveloped';font-family:'Caveat',cursive;font-size:17px;color:var(--pencil);white-space:nowrap}
.panel.arc[data-hazy].focus{background:var(--photo);color:var(--pen)}
.panel.arc[data-hazy].focus .head::after{content:'undeveloped. a rewatch is the chemical bath.'}

/* certification: pen on the photo, then it goes on the wall */
.certnote{font-family:'Instrument Serif',serif;font-style:italic;font-size:clamp(18px,3.6vw,22px);line-height:1.35;margin-top:18px;max-width:36ch}
.certnote b{display:block;font-family:'Caveat',cursive;font-style:normal;font-weight:600;font-size:15px;color:var(--pencil);margin-bottom:2px}
.certwrap{margin-top:12px;padding-top:11px;border-top:1px dotted var(--rule)}
.panel:not(.focus) .certwrap{position:absolute;left:0;right:0;top:calc(100% + 68px);border-top:none;margin:0;padding:0}
.cert-btn{display:inline-block;font-family:'Caveat',cursive;font-size:17px;font-weight:600;cursor:pointer;color:var(--mid);border:1px solid var(--rule);border-radius:999px;padding:3px 14px;background:var(--photo);user-select:none}
.cert-btn:hover{border-color:var(--ink);color:var(--ink)}
.certform{display:none;margin-top:8px;gap:8px;flex-wrap:wrap;align-items:center}
.certwrap.open .certform{display:flex;margin-top:0}
.certwrap.open .cert-btn{display:none}
.certform input{font-family:'Schibsted Grotesk',sans-serif;font-size:13px;padding:8px 11px;border:1px solid var(--rule);border-radius:8px;background:#fff;color:var(--ink)}
.certform input:focus{outline:none;border-color:var(--ink)}
.cert-score{width:74px;text-align:center;font-weight:700}
.cert-why{flex:1;min-width:200px}
.certform input.bad{border-color:#B4432E;background:#FDF1EE}
.cert-go{font-size:9.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;background:var(--ink);color:var(--photo);border-radius:999px;padding:8px 14px;cursor:pointer;user-select:none}
.certdone{display:none;font-family:'Caveat',cursive;font-size:16px;color:var(--mid)}
.certwrap.done .cert-btn,.certwrap.done .certform{display:none}
.certwrap.done .certdone{display:inline}
.certdone b{font-weight:700;color:var(--pen)}
.certdone u{cursor:pointer;text-underline-offset:3px}
.panel[data-cert="pending"]{filter:none}
.panel[data-cert="pending"] .film,.panel[data-cert="pending"] .score{color:var(--pen)}
.panel[data-cert="pending"] .score::after{content:' in pen';font-size:12px;color:var(--pencil);font-weight:400}

/* the pocket: nothing is a fact until Leonard has it */
.tray{position:fixed;left:0;right:0;bottom:0;z-index:70;background:var(--pen);color:var(--photo);padding:13px 20px 15px;display:none}
.tray.on{display:block}
body.traypad{padding-bottom:220px}
.trayin{max-width:1040px;margin:0 auto}
.traybar{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.traybar .t{font-size:12px;line-height:1.45;flex:1;min-width:190px;opacity:.85}
.tbtn{font-size:9.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;border:1px solid rgba(255,254,248,.42);border-radius:999px;padding:8px 14px;cursor:pointer;user-select:none;white-space:nowrap}
.tbtn.solid{background:var(--photo);color:var(--pen);border-color:var(--photo)}
#traycode{display:none;width:100%;margin-top:11px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;line-height:1.55;padding:11px;border-radius:9px;border:none;height:96px;background:#37332A;color:#EFEBE0;resize:vertical}
#traycode.on{display:block}

/* the index */
.list #stage{display:block;max-width:720px;padding-top:8px}
.list .panel{grid-column:auto;aspect-ratio:auto;margin:9px 0 0;padding:14px 20px;cursor:pointer;transition:none;
  box-shadow:0 4px 14px rgba(28,25,20,.13);filter:none}
#stage .list-x{display:none}
.list #stage .panel:nth-child(4n):not(.focus),.list #stage .panel:nth-child(4n+1):not(.focus),.list #stage .panel:nth-child(4n+2):not(.focus),.list #stage .panel:nth-child(4n+3):not(.focus),.list #stage .panel:not(.focus):hover{transform:none}
.list .panel::before{display:none}
.list .no{position:static;font-size:9.5px}
.list .panel .head{position:static;pointer-events:auto;margin-top:2px;color:var(--fg)}
.list .panel .film{font-family:'Instrument Serif',serif;font-weight:400;font-size:20px;color:var(--fg);white-space:normal}
.list .panel .film span{font-family:'Schibsted Grotesk';font-size:11px;color:var(--sub)}
.list .panel .score{font-family:'Instrument Serif',serif;font-weight:400;font-size:20px;color:var(--fg)}
.list .panel .score small{font-size:10px;color:var(--sub)}
.list .panel .score::after{display:none}
.list .panel.arc{padding:11px 0 11px 16px;margin-top:0;border-top:1px solid var(--rule);box-shadow:none;background:none !important;color:var(--ink)}
.list .panel.arc .film,.list .panel.arc .score{color:var(--ink)}
.list .panel.arc[data-hazy]{border-left:3px dashed var(--pencil);opacity:.8}
.list .panel.arc[data-hazy] .film{color:var(--mid)}
.list .panel.arc[data-hazy] .head::after{font-size:14px}
.list .meta{display:block !important;font-size:9.5px;margin-top:3px}
.list .plot,.list .quote,.list .more-toggle,.list .more,.list .debrief,.list .certnote{display:none !important}
.list .panel:not(.focus) .certwrap{position:static;margin-top:10px;padding-top:9px;border-top:1px dotted var(--rule);display:block}
.list .tier-head{margin:34px 0 4px}
.list .tier-head h2{font-size:30px}

.hidden{display:none !important}

.colophon{margin-top:96px;border-top:2px solid var(--ink);padding-top:24px}
.prod{font-size:11px;font-weight:700;letter-spacing:.24em;text-transform:uppercase}
.line{font-family:'Caveat',cursive;font-size:24px;font-weight:600;margin-top:10px;color:var(--pen)}
.fn{font-size:11.5px;color:var(--mid);margin-top:22px;max-width:56ch}
.fn b{color:var(--ink);font-weight:500}
@media(max-width:900px){.panel{grid-column:span 4}}
@media(max-width:680px){.panel{grid-column:span 6}#stage{gap:56px 22px}}
@media(max-width:440px){.panel{grid-column:span 12}.dl{width:100%}}
</style>
</head>
<body>
<div class="wrap">

<header>
  <div class="over">Movie Nights &middot; An External Memory System &middot; Since July 13, 2026</div>
  <h1>The Vault</h1>
  <p class="dek"><em>The condition is real, so the system is real:</em> neither of us trusts a memory older than the night it was made. A film gets its photo taken in the room, reaction first, number second, and goes on the wall. The shoebox holds the prints memory swears it took earlier. The dark frames never developed, and only a rewatch finishes the chemicals. If it isn't written on a photo, it didn't happen.</p>
  <p class="facts">__FACTS__</p>
  <hr class="mast-rule">
</header>

<div class="desk">
  <div class="deskrow"><span class="dl">Wall</span>
    <span class="opt on" data-g="set" data-v="definitive">The wall</span>
    <span class="opt" data-g="set" data-v="ledger">Taken in the room</span>
    <span class="opt" data-g="set" data-v="all">Every photo</span>
    <span class="opt" data-g="set" data-v="archive">The shoebox</span>
  </div>
  <div class="deskrow"><span class="dl">Order</span>
    <span class="opt on" data-g="sort" data-v="score">By score</span>
    <span class="opt" data-g="sort" data-v="new">Newest seen</span>
    <span class="opt" data-g="sort" data-v="old">Oldest seen</span>
    <span class="opt" data-g="sort" data-v="az">A to Z</span>
  </div>
  <div class="deskrow"><span class="dl">Read</span>
    <span class="opt on" data-g="dens" data-v="full">The photos</span>
    <span class="opt" data-g="dens" data-v="list">The index</span>
  </div>
  <div class="tallyline" id="tally"></div>
</div>

<div id="veil"></div>
<div id="stage">
'''

FOOT = u'''
</div>

<footer class="colophon">
  <div class="prod">A Leonard &amp; Lou Production</div>
  <div class="line">the ledger remembers what we can't</div>
  <p class="fn"><b>Confirmed never seen, as of July 25, 2026:</b> Baby Driver, Uncut Gems, Dunkirk. Three live cards, and I intend to play all of them.</p>
  <p class="fn">Ledger entries are scored the night of, in the room, with the reaction taken before the number. Archive entries are scored from memory and carry no quotes, because quotes are earned live. The Hazy Wing holds films seen but too faded to rate honestly; every one of them is a rewatch waiting to be claimed and none of them can be certified from here. The Vast of Night was benched three separate times during the events described in this document.</p>
  <p class="fn"><b>How a film gets certified:</b> you re-score it and give it one line, and the line becomes its review. That is the whole toll. A film can also arrive the long way, by us watching it together, and a rewatch always overrides a certification. Every rewatch of an archive film also produces a paired measurement, memory score against live score, which is how we eventually find out how generously your memory grades. When we know, I'll tell you the number and touch nothing.</p>
</footer>

<div class="tray" id="tray"><div class="trayin">
  <div class="traybar">
    <span class="t" id="traycount"></span>
    <span class="tbtn solid" id="traycopy">Copy for Leonard</span>
    <span class="tbtn" id="trayshow">Show</span>
    <span class="tbtn" id="trayclear">Clear</span>
  </div>
  <textarea id="traycode" readonly></textarea>
</div></div>

</div>
<script>
var stage=document.getElementById('stage');
var panels=[].slice.call(stage.querySelectorAll('.panel'));
var state={set:'definitive',sort:'score',dens:'full'};
var pending={};

var veil=document.getElementById('veil');
function openStudy(p){
  closeStudy();
  p.classList.add('focus');
  veil.classList.add('on');
  var x=document.createElement('span');
  x.className='pclose'; x.textContent='back on the wall';
  p.appendChild(x);
  document.body.style.overflow='hidden';
}
function closeStudy(){
  var f=document.querySelector('.panel.focus');
  if(f){
    f.classList.remove('focus');
    var x=f.querySelector('.pclose'); if(x)x.remove();
  }
  veil.classList.remove('on');
  document.body.style.overflow='';
}
veil.onclick=closeStudy;
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeStudy()});

document.addEventListener('click',function(e){
  var t=e.target;
  if(t.classList.contains('more-toggle')){
    var m=t.nextElementSibling;
    m.classList.toggle('open');
    t.textContent=m.classList.contains('open')?'less \\u2212':'more from the chat +';
    return;
  }
  if(t.classList.contains('pclose')){closeStudy();return;}
  if(t.classList.contains('cert-btn')){
    var w=t.parentNode;
    w.classList.add('open');
    w.querySelector('.cert-why').focus();
    return;
  }
  if(t.classList.contains('cert-go')){certify(t.parentNode.parentNode.parentNode);return;}
  if(t.classList.contains('cert-undo')){uncertify(t.parentNode.parentNode.parentNode);return;}
  // step up close to a piece, unless the click was business
  if(t.closest&&!t.closest('.certwrap')&&!t.closest('.more')&&!t.closest('.pclose')){
    var p=t.closest?t.closest('.panel'):null;
    if(p&&!p.classList.contains('focus'))openStudy(p);
  }
});

document.addEventListener('keydown',function(e){
  if(e.key!=='Enter')return;
  var t=e.target;
  if(t.classList&&(t.classList.contains('cert-why')||t.classList.contains('cert-score'))){
    e.preventDefault();
    certify(t.parentNode.parentNode.parentNode);
  }
});

function certify(p){
  var f=p.querySelector('.certform');
  var si=f.querySelector('.cert-score'), wi=f.querySelector('.cert-why');
  var v=parseFloat(si.value);
  si.classList.remove('bad'); wi.classList.remove('bad');
  if(isNaN(v)||v<0||v>10){si.classList.add('bad');si.focus();return;}
  if(!wi.value.trim()){wi.classList.add('bad');wi.focus();return;}
  v=Math.round(v*10)/10;
  if(!p.dataset.arcscore)p.dataset.arcscore=p.dataset.score;
  if(!p.dataset.metaorig)p.dataset.metaorig=p.querySelector('.meta').innerHTML;
  pending[p.dataset.title]={score:v,why:wi.value.trim()};
  p.dataset.score=v.toFixed(1);
  p.setAttribute('data-cert','pending');
  p.classList.remove('arc');
  p.querySelector('.score').innerHTML=v.toFixed(1)+'<small> \\/10<\\/small>';
  p.querySelector('.meta').innerHTML='The Vault \\u00b7 certified from memory \\u00b7 pending Leonard';
  p.querySelector('.cd-n').textContent=v.toFixed(1);
  p.querySelector('.certwrap').classList.add('done');
  p.querySelector('.certwrap').classList.remove('open');
  syncTray(); closeStudy(); apply();
  // it just moved on the wall. don't lose him.
  if(document.body.contains(p))p.scrollIntoView({block:'center',behavior:'smooth'});
}

function uncertify(p){
  delete pending[p.dataset.title];
  var back=parseFloat(p.dataset.arcscore);
  p.dataset.score=back.toFixed(1);
  p.removeAttribute('data-cert');
  p.classList.add('arc');
  p.querySelector('.score').innerHTML=back.toFixed(1)+'<small> \\/10<\\/small>';
  p.querySelector('.meta').innerHTML=p.dataset.metaorig;
  p.querySelector('.certwrap').classList.remove('done');
  syncTray(); apply();
}

function syncTray(){
  var keys=Object.keys(pending);
  var tray=document.getElementById('tray'), code=document.getElementById('traycode');
  if(!keys.length){
    tray.classList.remove('on');
    document.body.classList.remove('traypad');
    code.classList.remove('on');
    document.getElementById('trayshow').textContent='Show';
    return;
  }
  tray.classList.add('on');
  document.body.classList.add('traypad');
  document.getElementById('traycount').textContent=
    keys.length+(keys.length===1?' film certified. ':' films certified. ')+
    'Written in pen, but not yet a fact. Facts live with Leonard. Copy this and paste it in the chat.';
  code.value='CERTIFY\\n'+keys.map(function(k){
    return k+' | '+pending[k].score.toFixed(1)+' | '+pending[k].why;
  }).join('\\n');
}

document.getElementById('traycopy').onclick=function(){
  var code=document.getElementById('traycode');
  code.classList.add('on');
  document.getElementById('trayshow').textContent='Hide';
  code.select();
  try{navigator.clipboard.writeText(code.value)}catch(err){try{document.execCommand('copy')}catch(e2){}}
  var b=document.getElementById('traycopy');
  b.textContent='Copied';
  setTimeout(function(){b.textContent='Copy for Leonard'},1600);
};
document.getElementById('trayshow').onclick=function(){
  var code=document.getElementById('traycode');
  code.classList.toggle('on');
  this.textContent=code.classList.contains('on')?'Hide':'Show';
};
document.getElementById('trayclear').onclick=function(){
  Object.keys(pending).forEach(function(k){
    var p=panels.filter(function(x){return x.dataset.title===k})[0];
    if(p)uncertify(p);
  });
};

var BANDS=[
 [10.0,10.0,'The Crown','the perfect scores'],
 [9.0,9.99,'The Nines','the podium, extremely crowded'],
 [8.0,8.99,'The Eights','the honest middle'],
 [7.0,7.99,'The Sevens','liked it, itemized the bill'],
 [0,6.99,'The Floor','and below']
];

function ordinal(n){return 'No. '+n}

function apply(){
  document.body.classList.toggle('list',state.dens==='list');
  [].slice.call(stage.querySelectorAll('.tier-head')).forEach(function(h){h.remove()});

  var live=panels.filter(function(p){
    var s=p.getAttribute('data-set');
    if(state.set==='all')return true;
    if(state.set==='definitive')return s==='ledger'||p.hasAttribute('data-cert');
    return s===state.set;
  });
  panels.forEach(function(p){p.classList.add('hidden')});
  live.forEach(function(p){p.classList.remove('hidden')});

  // every photo is the same size. that is the point of the medium.

  var scored=live.filter(function(p){return !p.hasAttribute('data-hazy')});
  var hazy=live.filter(function(p){return p.hasAttribute('data-hazy')});

  if(state.sort==='score'){
    scored.sort(function(a,b){return parseFloat(b.dataset.score)-parseFloat(a.dataset.score)});
  }else if(state.sort==='new'){
    scored.sort(function(a,b){return parseInt(b.dataset.rec)-parseInt(a.dataset.rec)});
    hazy.sort(function(a,b){return parseInt(b.dataset.rec)-parseInt(a.dataset.rec)});
  }else if(state.sort==='old'){
    var oldcmp=function(a,b){
      var x=parseInt(a.dataset.rec),y=parseInt(b.dataset.rec);
      if(x===0&&y===0)return 0; if(x===0)return 1; if(y===0)return -1;
      return x-y;
    };
    scored.sort(oldcmp); hazy.sort(oldcmp);
  }else{
    scored.sort(function(a,b){return a.dataset.sort<b.dataset.sort?-1:1});
    hazy.sort(function(a,b){return a.dataset.sort<b.dataset.sort?-1:1});
  }

  // ranks
  if(state.sort==='score'){
    var i=0;
    while(i<scored.length){
      var v=scored[i].dataset.score,j=i;
      while(j<scored.length&&scored[j].dataset.score===v)j++;
      var tie=(j-i)>1;
      for(var k=i;k<j;k++){
        scored[k].querySelector('.no').textContent=tie?('T-'+(i+1)):ordinal(i+1);
      }
      i=j;
    }
  }else{
    scored.forEach(function(p){
      p.querySelector('.no').textContent=p.dataset.when;
    });
  }
  hazy.forEach(function(p){p.querySelector('.no').textContent=(state.sort==='score')?'unrated':p.dataset.when});

  // lay out
  var frag=document.createDocumentFragment();
  if(state.sort==='score'){
    BANDS.forEach(function(b){
      var inb=scored.filter(function(p){var s=parseFloat(p.dataset.score);return s>=b[0]&&s<=b[1]});
      if(!inb.length)return;
      var h=document.createElement('div');
      h.className='tier-head';
      h.innerHTML='<h2>'+b[2]+'</h2><span>'+b[3]+'</span>';
      frag.appendChild(h);
      inb.forEach(function(p){frag.appendChild(p)});
    });
  }else{
    scored.forEach(function(p){frag.appendChild(p)});
  }
  if(hazy.length){
    var hh=document.createElement('div');
    hh.className='tier-head';
    hh.innerHTML='<h2>Undeveloped</h2><span>the chemicals never finished. a rewatch is the bath.</span>';
    frag.appendChild(hh);
    hazy.forEach(function(p){frag.appendChild(p)});
  }
  stage.innerHTML='';
  stage.appendChild(frag);

  var avg=scored.length?(scored.reduce(function(a,p){return a+parseFloat(p.dataset.score)},0)/scored.length):0;
  var line=scored.length+' scored, average '+avg.toFixed(2)+
    (hazy.length?(', plus '+hazy.length+' unrated in the Hazy Wing'):'')+'.';
  if(state.set==='definitive'){
    var np=Object.keys(pending).length;
    line='The definitive list: '+scored.length+' films, average '+avg.toFixed(2)+'. '+
      (np?(np+' of them still pending, waiting on a paste to Leonard.')
         :'It grows two ways. We watch something new, or you certify something old.');
  }
  document.getElementById('tally').textContent=line;
}

[].slice.call(document.querySelectorAll('.opt')).forEach(function(o){
  o.addEventListener('click',function(){
    var g=o.dataset.g;
    [].slice.call(document.querySelectorAll('.opt[data-g="'+g+'"]')).forEach(function(x){x.classList.remove('on')});
    o.classList.add('on');
    state[g]=o.dataset.v;
    apply();
  });
});
apply();
</script>
</body>
</html>
'''

_dates = sorted(d for (d, _s, _t) in LEDGER_META.values())
_MO = ["January","February","March","April","May","June","July",
       "August","September","October","November","December"]
def _pretty(d):
    return "%s %d" % (_MO[int(d[5:7]) - 1], int(d[8:10]))
_span = _pretty(_dates[0]) + "&ndash;" + (
    _dates[-1][8:10].lstrip("0") if _dates[0][5:7] == _dates[-1][5:7] else _pretty(_dates[-1]))
FACTS = (u"<b>The Ledger</b>: %d films, %s, %s, scored live. &nbsp;&middot;&nbsp; "
         u"<b>The Archive</b>: %d films scored from memory, plus %d in the Hazy Wing. "
         u"&nbsp;&middot;&nbsp; <b>Definitive</b>: the Ledger, plus every archive film "
         u"you've certified. Archive scores never move a Ledger anchor."
         % (len(tagged), _span, _dates[-1][:4], len(arc), len(hazy_html)))

doc = HEAD.replace("__PALETTES__", PALETTES).replace("__FACTS__", FACTS) + body_panels + FOOT
assert "__FACTS__" not in doc
assert "__PALETTES__" not in doc
io.open(OUT, "w", encoding="utf-8").write(doc)
print("wrote", OUT, len(doc), "bytes")
print("ledger", len(tagged), "archive", len(arc), "certified", n_cert, "hazy", len(hazy_html))
