# Creative brief: Zoom Out 24, "The Year 10 Days Vanished" (Hidden History, hook format, ~77.9 s)

**North star:** *Make a dynamic motion-graphics film that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*

Before you start:
- Read `../../../MOTION-PRINCIPLES.md`, `../../../engine/README.md`, `engine/runtime/lib.js` and `engine/runtime/kit.js`.
- Then read `camera.js` and `env.js` in this folder. They define the world, and their header comments are the spec.
- Hook-format references: `../22-how-old-is-everything/` and `../21-how-many-ants-are-on-earth/` (`p-cold.js`, `s13-question.js`).
- Facts: `script.md` → FACT-CHECK. Every number on screen must match it.

Every scene file is currently a **SETUP STUB**: it works and is placed correctly, but it is crude. Replace it with finished craft.

## The film

**One continuous camera** over a single flat "orrery + manuscript" plane:
- The manuscript **desk** (calendar pages, a coin, a rule grid, a map) sits far above a **true-scale orbit** of the Earth around the Sun.
- The camera:
  1. starts on the torn October 1582 page;
  2. slides to Caesar's coin;
  3. pulls out to the whole orbit;
  4. **dives 4 orders of magnitude into the spring-equinox point**, onto two real-coastline Earths 11 minutes of orbit apart (≈ 20,000 km);
  5. pulls out continuously while that gap grows to 1 day (AD 453) and then 10 days (AD 1582);
  6. returns to the page for the papal tear;
  7. visits the leap-rule grid, February 1900/2000 and Britain 1752;
  8. swoops over the orbit once more for today's residual drift;
  9. settles on the page for the question.

**Look:** premium documentary (Kurzgesagt or Vox polish), never a kid show. No faces on objects, no emoji, no portraits of real people other than an engraved coin profile.
- Deep navy (`NAVY`), parchment (`PARCH`), iron-gall ink (`INKC`), red rubric ink (`RUBRIC`) and parchment-gold engraving lines (`ACCENT = [230, 190, 110]`).
- Period lettering: `serif()` (Baskerville). Modern labels and big numbers: the house fonts (`L.bigLabel`, Avenir Next Condensed, DIN).
- Fine engraved line work: hairlines, double rules, graduations.

## World and helpers (camera.js / env.js, orchestrator-owned)

**Units: u.**
- The orbit radius `R_ORB` = 9,000 u = 1 AU, so 1 u = 16,622 km. Everything orbital is TRUE SCALE.
- y points DOWN. The Sun is at (0, 0). The spring equinox `EQX` = (0, −9000) is straight up.
- Earth moves counter-clockwise seen from the north, so on screen it moves LEFT from the equinox.
- `orbitPos(phi)` / `arcPos(u)` give world positions past the equinox. `orbitScreen(v, phi, outPx)` / `arcScreen(v, u, outPx)` give screen points (outPx pushes outward from the Sun).
- Key lengths:
  - `U_PER_DAY` = 154.83 u per day of orbit;
  - `G1` = 1.209 u, one Julian year's slip of 11 min 15 s;
  - `D1` = one day;
  - `D10` = 9.82 days (≈ 1,520 u);
  - `R_EARTH_U` = 0.383 u;
  - `R_SUN_U` = 41.9 u.

**The desk** (props drawn by scenes, legible at mpp ≈ 1, so 1 u ≈ 1 px):

| prop | centre | beats |
|---|---|---|
| `P_OCT`: October 1582 page, `PAGE_W × PAGE_H` = 860 × 960 u | (0, −11400) | 0, 1, 8, 13, preroll |
| `P_COIN`: Caesar coin | (−1250, −11400) | 2 |
| `P_LEAP`: the 400-year grid | (1250, −11500) | 9 |
| `P_FEB`: February 1900 vs February 2000 | (1250, −10550) | 10 |
| `P_UK`: map of Britain | (2600, −11760) | 11, upper |
| `P_SEP`: September 1752 page | (2600, −10930) | 11, lower |

- Multiply every desk prop's alpha by `deskK(v)` (it fades out as mpp goes 1.6 → 2.6) and return early when it is 0. Neighbouring props are partly visible during travels; that is intended, because it is one desk.

**env draws (never redraw these):**
- the background: navy, paper grain, faint engraved astrolabe rings;
- the orbit: the ring, tick tiers (days → hours → minutes, faded in by spacing), the month ring (far views), the Sun, the dashed equinox radial and the "SPRING EQUINOX" label;
- the two Earths:
  - the **REAL Earth**, always at the equinox, half-lit (equinox terminator);
  - the **CALENDAR Earth**, `drift(v).u` past it (to the left), drawn as a gold-rimmed ghost globe up close or a gold ring marker far out;
  - real-coastline globes (earth.js) once the Earth radius is ≥ ~8 px, markers below that;
- beat 3: a single Earth lapping 4 times (`lapPhi`, `lapAt(gt, tl)` → {lap 1..4, frac}; laps run beat-3 + 0.9 s → +5.3 s);
- the HUD: topBar and the drift readout, top right, y 250–340: "DRIFT 11 MIN … 10 DAYS" / "JULIAN CALENDAR · YEAR AD 1,582", then the Gregorian version in beat 12. **Keep the top-right block clear** in beats 4–7 and 12.

**State helpers:**
- `drift(v)` → {u, days, year, mode, show}.
  - Julian: 0 → G1 as the beat-4 dive lands (+1.7 → +2.8 s); holds through beat 5; then tied to the camera so the gap stays ≈ 360–400 px on screen: beat 6 → 1 day (AD 453), beat 7 → 9.82 days (AD 1582).
  - Gregorian (beat 12): 0 → 1 day over beat-12 + 1.5 → +4.4 s; the year runs 1582 → ≈ 4808.
- Formatters: `fmtDrift(days)`, `fmtYear(y)`.

**Page helpers:**
- `pageLayout(P, w, h, rows)`: cell(r, col) centres in world space.
- `drawMonthPage(c, v, spec)`: paper, header, weekday row, grid and numerals, with a `skip(d)` hook.
- `paper(c, x, y, w, h, opts)`: a screen-space parchment sheet.
- `dayNumeral(...)`.
- `monthDays(n, col0, list)`.
- Data:
  - `OCT_JULIAN`: 31 days, Oct 1 = Monday;
  - `OCT_GREGORIAN`: 1–4 then 15–31, with 15 in the Friday column;
  - `SEP_1752`: 1, 2, then 14–30, with Sep 1 = Tuesday and 14 = Thursday;
  - `WEEKDAYS`.

**Earth helper:** `drawEarthAt(c, v, phi, 'real'|'cal', alpha)` if you need an extra Earth.

## Timing (build/timeline.json, 77.86 s; main-timeline times)

Preroll 0–4.79 s: it replays film time 47.79 → 48.99 at 0.25× (`preroll.from` = 43.0), the tear.

| beat | start | line ("\|" = phrase pause; phrase starts) | shot (mpp u/px) |
|---|---|---|---|
| 0 | 4.79 | How did ten days vanish from history? | `hook`: the page at screen y ≈ 1050, mpp 1.05 → 1.12 |
| 1 | 8.03 | In 1582, … Thursday, October fourth, (8.18) \| and woke up on Friday the fifteenth. (13.76) | `oct`: push in on week row 0, mpp 0.78 |
| 2 | 16.07 | The culprit: Julius Caesar's calendar, sixteen centuries old. (16.22) | `caesar`: the coin at screen y 900, mpp 0.95 |
| 3 | 20.68 | A leap day every four years made its average year (20.83) \| three hundred sixty-five and a quarter days. (24.00) | `orbit`: Sun at (540, 880), mpp 22 (orbit radius 409 px) |
| 4 | 27.08 | But Earth returns to the equinox about eleven minutes sooner. (27.23) | `close`: dive, mpp 0.0030 (Earths ≈ 128 px radius, 403 px apart, row y 860); lands ≈ 29.4 |
| 5 | 31.06 | Eleven minutes a year doesn't sound like much. (31.21) | `close-hold`, slight push |
| 6 | 34.33 | But it adds up to a whole day every hundred and twenty-eight years. (34.48) | `day`: pull out to mpp 0.42 over 2.8 s (1 day ≈ 370 px) |
| 7 | 38.39 | By 1582 it had slipped ten days, (38.54) \| and Easter was drifting away from the real equinox. (41.53) | `ten`: pull out to mpp 4.2 over 2.2 s (10 days ≈ 360 px), push 1.03 |
| 8 | 45.01 | So Pope Gregory the Thirteenth simply deleted them. (45.16) | `page`: page at screen y 1000 (y ≈ 570–1430), mpp 1.12; travel 1.7 s |
| 9 | 49.14 | To stop the drift, (49.29) \| three leap days every four hundred years were cancelled. (50.89) | `leap`: P_LEAP at y 900, mpp 1.0 |
| 10 | 54.40 | That's why 1900 had no leap day, (54.55) \| but 2000 did. (57.58) | `feb`: P_FEB at y 900, mpp 1.0 |
| 11 | 59.29 | Britain held out until 1752, (59.44) \| and had to skip eleven days. (62.55) | `uk`: P_UK ≈ y 520, P_SEP ≈ y 1350, mpp 1.3 |
| 12 | 64.66 | Even today, the calendar drifts about a day every three thousand years. (64.81) | `drift`: swoop out (lift) over the orbit and down to the equinox, mpp 0.42 |
| 13 | 69.53 | If ten days vanished from this year, (69.68) \| which ten would you skip? (72.00) \| Tell me in the comments. (73.68) | `home` (starts 69.08): back to the page at y 1060, mpp 1.2 |

## Scenes

General rules:
- One focal point per beat.
- Labels stay ≥ 1.5 s.
- Entrances ease out over 0.3–0.6 s; exits are faster.
- Hold each key visual ≥ 0.8 s.
- Labels in this film are period-styled where they sit on paper (serif, ink) and modern house style where they sit on navy (bigLabel, tracked caps).

**s00-hook.js** (no captions, no chapter, `overlayIn: false`)
- Headline HOW DID **10 DAYS** / VANISH?, fitted ≤ 900 px, in the band y ≈ 260–500, readable on frame 1.
- The page (drawn by s08) is already torn.
- Optionally, a subtle gold glint along the seam.

**s01-oct-1582.js**
- On phrase 0 (around "Thursday, October fourth", ≈ 10.4 s) ring the **4** in the THU column. On phrase 1 ring the **15** in the FRI column.
- Draw an engraved gold arc from 4 to 15, hopping over the seam. No arrow glyphs: draw the shapes.
- Tags "THURSDAY 4" / "FRIDAY 15".
- The torn strip of 5–14 can glint: "never happened".
- Chapter sub: the countries that switched.

**s02-caesar.js**
- A refined Julius Caesar coin medallion, like ep 22's Cleopatra coin: a dignified laureate profile in relief (a Roman denarius style, legend CAESAR · DICT …), gold metal with rim light and an engraved rim.
- A "46 BC" tag.
- The coin should still read as a small gold disc while the beat-3 pull-out shrinks it away.

**s03-leap-day.js**
- The orbit view with a lap tally per lap (`lapAt`): "+¼", "+¼", "+¼", then the 4th lap gains a glowing **FEB 29**. The tally ends at **365¼ DAYS**.
- Keep it clear of env's "SPRING EQUINOX" label (top of the orbit, y ≈ 450) and of the HUD band. Good places: the orbit's centre or the band y 1330–1380.

**s04-eleven-minutes.js**
- After the dive lands (≈ +2.3 s), label the REAL EARTH ("the true equinox") and "CALENDAR: MARCH 21" (the calendar's Earth, gold).
- A measured bracket along the orbit between them, "11 MIN 15 S". Use the minute ticks env draws: 11 of them.

**s05-not-much.js**
- The hold. A second, quieter fact: the gap is ≈ 20,000 km of orbit, ≈ 1.6 Earths.
- A slow bracket pulse. Nothing major moves.

**s06-128-years.js**
- A gap meter (bracket) that follows `drift(v)` as the camera pulls out.
- A year counter or tag (the readout already shows the year; add a centuries tick spiral or a counter wheel only if it stays clean).
- "COUNTING FROM AD 325" tag (Council of Nicaea).
- Land **1 DAY = 128 YEARS** as the gap reaches 1 day (≈ 37.0 s).

**s07-ten-days.js**
- The 10-day gap with day ticks numbered 1–10, and **10 DAYS** landing ≈ 40.3 s.
- Phrase 1 (41.53): a small Easter/equinox marker pair:
  - "CHURCH'S EQUINOX · MARCH 21", on the calendar Earth side;
  - "REAL EQUINOX · ≈ MARCH 11", on the real Earth;
  - an engraved Easter cross or sun-and-moon glyph sliding with the calendar marker.
- It must read without sound: the calendar is late against the sky.

**s08-gregory.js** (owns the OCTOBER PAGE in every beat: hook, beat 8, question)
- Page states are in `octState()` / `TEAR` (beat-relative): stamp 0.75, tear 2.2 → 3.3, reflow 3.1 → 4.0.
  - Before beat 3 + 2 s and after the reflow: END STATE (Gregorian layout, red seam, strip of 5–14 resting askew in the empty rows 3–4).
  - Beat 8 starts INTACT (Julian).
- Make the tear the signature:
  - ragged torn paper edges with fibres;
  - the cells lift with shadows, peel away as one strip and settle askew;
  - 15–31 glide back, so 15 lands under FRI;
  - a precise, refined motion, not a cartoon rip.
- Papal emblem: crossed keys (one gold, one silver) under a triple tiara, engraved as a seal or wax-stamp in red. No portrait. It currently overlaps the OCTOBER title: move it, e.g. to the page's top-right corner or the foot.
- **The preroll replays film 47.79 → 48.99 WITH overlays**, under p-cold's headline band y ≈ 220–550. Keep every s08 overlay below y ≈ 580 or on the page, and keep the tear readable at film 47.8 (preroll frame 1).

**s09-leap-rule.js**
- An engraved 400-year grid: four centuries as a timeline of century years 1600 · 1700 · 1800 · 1900 · 2000, with tiny "every 4th year" ticks if it helps.
- Cross out 1700, 1800 and 1900 in red ink, landing on phrase 1 (50.89 → 53.9). Keep 1600 and 2000 with a gold check or ring.
- Show the rule "÷ 400" in words, e.g. "CENTURY YEARS: LEAP ONLY IF DIVISIBLE BY 400". Avenir has no ÷ glyph: test it, or write words.
- **3 IN 400**.

**s10-1900-2000.js**
- February 1900 (28 days, Feb 1 = Thursday) vs February 2000 (29 days, Feb 1 = Tuesday), as two mini pages.
- The empty slot after 28 in 1900 is struck through; 29 in 2000 is gold-ringed on "but 2000 did" (57.58).
- The beat-9 grid sits just above this set: keep the two from fighting (dim or slide).

**s11-britain.js**
- A real-coastline map of Britain (earth.js, already in the stub), **clipped to an engraved map plate** (a parchment-framed oval or rectangle, upper half y ≈ 380–900). Right now it floods the screen.
- London pin. Optional: the colonies line "and its colonies".
- The September 1752 page below: WED 2 → THU 14, with 3–13 torn out like October.
- **−11 DAYS** on phrase 1 (62.55).
- Keep the page clear of the caption band (y 1380–1520).

**s12-still-drifting.js**
- Over env's Gregorian drift: a small gold bracket that grows to 1 day, then **1 DAY ≈ 3,000 YEARS** (+ "26 SECONDS A YEAR").
- The swoop passes the whole orbit at its peak (~66 s). Let the month ring be seen; don't cover it.

**s13-question.js**
- Adapted from ep 21: three choices, A) THE COLDEST 10, B) THE 10 BEFORE PAYDAY, C) I'D KEEP THEM ALL.
- Opaque card from +0.4 s, y 360–≈1090. The page's lower rows (with the torn strip) stay visible below.

**p-cold.js**
- Headline 10 DAYS IN **1582** / NEVER HAPPENED on a dark band y 220–550, fitted ≤ 940 px, readable on frame 1.

## Layout rules
- Fit every line with `L.fitSize`.
- Nothing important at x > 940 below y 1100. Bottom y > 1580 clear.
- HUD band y < 340 (chapter card top left; readout top right in beats 4–7 and 12).
- Caption band y 1380–1520 (`captionY` 1450): keep subjects out of it.
- Guard `arc()` radii with `Math.max(0, r)`. No `Math.random`. Loops bounded by the screen.
- Avenir has no arrows: draw them.

## Ownership
Builders own **only** their files. Do **not** edit `engine/*`, `camera.js`, `env.js`, `episode.json`, any `.md`, or other groups' scenes. Put shared needs in "sharedRequests".

Shots: `node engine/node/shots.mjs ZoomOut/episodes/24-the-year-10-days-vanished --name <unique> --times …`. `--beats` indexes the FULL timeline, where preroll = beat 0, so film beat i = `--beats i+1`. Delete your old shots.

| group | files | beats | focus |
|---|---|---|---|
| A `page-caesar-leap` | s00-hook, s01-oct-1582, s02-caesar, s03-leap-day | 0–3 (4.79–27.08) | hook headline over the torn page; the 4 → 15 highlight; the Caesar coin; the 4-lap leap-day tally |
| B `drift-and-tear` | s04-eleven-minutes, s05-not-much, s06-128-years, s07-ten-days, s08-gregory | 4–8 (27.08–49.14) + the page in beats 0–2 and 13 | labels on the true-scale Earths, the gap meter/counter, 10 days + Easter; **the October page and the tear (signature, replayed in the preroll)** |
| C `fix-and-question` | s09-leap-rule, s10-1900-2000, s11-britain, s12-still-drifting, s13-question, p-cold | 9–13 (49.14–77.86) + preroll | the 400-year grid, February 1900/2000, Britain map + September 1752, the residual drift, the question card, the cold-open headline |
