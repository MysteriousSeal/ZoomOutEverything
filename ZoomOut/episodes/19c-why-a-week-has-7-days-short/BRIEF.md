# Creative brief — Zoom Out 19: Why Does a Week Have 7 Days? (90 s, series "Hidden History")

**North star:** *Make a dynamic 90-second motion graphics video that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*
Read `../../../MOTION-PRINCIPLES.md` and `../../../engine/README.md` first. Finished references for craft: `../06-how-high-is-space/`, `../08-how-fast-is-light/`, `../12-what-if-you-fell-through-the-earth/`, `../14-what-if-all-the-ice-melted/`. This film is 90 s: the same craft with more beats, **not** slower. A mini-payoff lands every 10–15 s.

## The film

Three acts, one continuous camera move (no cuts):
- **I. The sky's clocks (beats 0–6).** A paper calendar page floats in the dark. The camera tilts up to the real Earth (it spins once: a day), pulls back to the Moon's orbit (a month), then to the Sun (a year). The week matches nothing (and the twist is teased). Back to the Moon: four phases of about 7.4 days each.
- **II. The seven lights (beats 7–15).** The camera dives into the Earth's top limb and lands on a Babylonian rooftop at night. Seven lights rise one by one over it. Then the Sabbath, a pull back to the globe as the week spreads, and back into the sky, where the lights line up in a column in weekday order and their names morph into weekdays (English, French, Norse gods).
- **III. The calendar (beats 16–18).** The column swings into the header row of a calendar page hung in the sky. The page re-grids to 10 columns (France), then 5 and 6 (USSR), then snaps back to 7: it outlived them all.

## World, units and shared helpers (`camera.js`, `env.js`)

Stylised side view in design units **u** (1 u = 1 px at mpp 1). It is a diagram and is never claimed to be to scale.
- `EARTH` {0, 0, r 260}: a **real globe** drawn by env. NOAA ETOPO relief, ray-cast at half resolution, day/night from the Sun, a twilight band. The orientation comes from `earthView(gt, tl)`: a 3/4 view that spins once in beat 2, tips so that **Babylon sits on the top limb** during beat 7, turns to the Old World in beat 11 and back in beat 12. Use `project(v, lat, lon, h)` → `{x, y, front}` to pin anything to the globe (it rides the rotation).
- `MOON_ORBIT` 1300, `MOON_R` 70. The Moon is drawn by env at `moonPos(gt, tl)`. It laps once in beat 3 (from beat 3 + 0.35 s, over 3.6 s). In beat 6 it starts at **new moon** (between Earth and Sun) and steps a quarter at each of `moonStepTimes(tl)` (each step lasts 0.6 s). It is shaded toward the Sun. `drawMoonDisc(c, x, y, r, lx, ly, k)` draws phase icons in the same style.
- `SUN` {6200, 7200, r 520}, below-right of the Earth (so the Earth's top limb is on the **night** side). `EARTH_ORBIT` ≈ 9,501 u.
- `CAL` {0, 1650, 720 × 820}: the hook's paper page. `ROOF` (0, −260): the rooftop on the limb. At rooftop zoom (mpp ≈ 0.016) env draws the night ground and the atmosphere as a deep indigo night sky. `skyK(v)` is 0..1 "under the night sky", and `groundK(v)` is the stylised-ground blend.
- `LIGHTS[i]` = {key, name, sky (naming order), day (weekday, Sunday = 0), weekday, fr, norse, col, r}. `skyPos(sky)` gives the arc and `colPos(day)` / `COL` the column. **env draws the lights** (in `drawForeground`, clipped above the horizon) from their rise (`lightRise(i, tl)`, on each spoken name in line 8) through the arc → column move (beat 12 + 0.35 s, staggered 0.07 s per weekday, 1.7 s). It dims non-featured lights in beats 13–15 (`lightEmphasis`). **From beat 16 start, s16 draws them** with `drawLight(c, i, x, y, size, k, glint, gt)` and `lightSize(i, v)`. `lightPos(i, gt, tl)` gives the exact world position at any time. Attach labels to `lightPos` through `v.wx/v.wy`, never to fixed screen positions.
- `drawCalendarPage(c, v, o)` → layout. This is the premium paper page: binding rings, month title, accent year, weekday header row, hairline grid, DIN day numbers, an optional `today` ring and `cellTint(col, row, d)`. Options include `cols`, `rows`, `first`, `days`, `headers`, `k`, `headK`, `numbers`, `grid`. `calLayout(o)` gives the cells and headers (`cell(col,row)`, `headX(col)`, `headY`). `MONTH` = October 2026 (day 1 is a Thursday, column 4). `WEEK_SHORT` holds the header labels. `CAL2` {0.5, −268, 11.6 × 12.4} is the final page in the sky.
- HUD (env): top bar plus the **ERA readout** at the top right (y 230–300). It reads TODAY → rolls to **c. 600 BC · BABYLON** (beat 7) → JUDAH (10) → c. AD 600 (11) → c. AD 100 · ROMAN EMPIRE (12) → TODAY (14–15) → **1793 · PARIS** (16) → **1929 → 1940 · MOSCOW** (17) → TODAY (18). Keep chapter titles ≤ 16 characters so they never reach it.

## Look

- Premium, adult documentary: a dark cosmos with warm lamplight-gold accents `[235,200,130]`, cream paper `PAPER [238,231,218]` and ink `INKC [24,24,30]`.
- Typography is the house style: `L.bigLabel` for the big number, small tracked caps, hairline leaders, dark halos over busy areas.
- Babylon is a refined silhouette with no cartoon faces or emoji. Think mud-brick parapets, a stepped ziggurat far off, palms and a robed sky-watcher with a tablet.
- Avenir lacks arrows: for "SATURN → SATURDAY", morph the letters or draw a line, never a `→` glyph.

## Motion

- The camera journey is the signature, and it is already built. Let things arrive with it, then hold.
- Labels ease in 0.3–0.6 s after the camera settles and stay ≥ 1.5 s. Only one focal point per beat.
- **Name morphs** are the film's typographic signature: letters cross-dissolve and slide (shared prefix stays put: SATURN·DAY, MON(N)·DAY). Keep that one technique consistent across s13–s15.
- Pure functions of time, guard every `arc()` radius with `Math.max(0, r)`, keep big labels out of y 1280–1390 (captions), y < 300 (HUD) and x > 960.

## Timing (build/timeline.json, 90.48 s; "|" = pause, see `phrases`)

Beat starts: 0.00, 2.84, 7.43, 9.59, 14.17, 16.47, 21.53, 26.49, 32.28, 36.53, 40.43, 45.38, 49.09, 54.97, 59.76, 66.92, 71.27, 77.69, 83.04.

| beat | line | camera (arrival screen positions) |
|---|---|---|
| 0 | Why does a week have seven days? | CAL page x 240–840, y 668–1352 at mpp 1.2 (slow pull-out from 1.02); headline room y 380–620 |
| 1 | …comes from the sky. \| Except the week. | page x 219–861, y 534–1266 (mpp 1.12) |
| 2 | A day is one spin of the Earth. | tilt up 1.15 s: Earth centre (540, 790), r 333 px; it spins once 7.5–9.4 s |
| 3 | A month… about 29.5 days. | pull back 1.3 s: Earth (540, 800) r 76, Moon orbit r 382 px; the Moon laps 9.9–13.5 s |
| 4 | A year is one trip around the Sun. | pull back 1.4 s: Sun (540, 800), Earth's orbit r 404 px, Earth at (276, 494) |
| 5 | But nothing up there takes a week. \| And twice… abolish it. | hold, slight pull-out (mpp 25) |
| 6 | One theory: …a little over seven days. | back to the Moon (as beat 3), Moon at new moon; quarter steps at 22.78, 23.63, 24.48, 25.33 s |
| 7 | …back to Babylon, where sky-watchers tracked seven moving lights. | 2.5 s dive into the limb: the horizon lands at y 1150 (mpp 0.016), rooftop on it at x ≈ 540 |
| 8 | The Sun, the Moon, Mercury… Saturn. | tilt up: horizon at y 1417. Arc: SUN (164,1061) MOON (249,903) MERCURY (382,797) VENUS (540,760) MARS (698,797) JUPITER (831,903) SATURN (916,1061) |
| 9 | Seven wanderers, \| and seven became a sacred number. | gentle push (mpp 0.0165) |
| 10 | The Jewish week… \| made seven a steady rhythm. | slight drift (mpp 0.0168) |
| 11 | Christianity and Islam later carried it across the world. | pull back 1.6 s to the globe: centre (540, 900), r 382 px, turning to face Europe/Africa/Asia (lat 28, lon 25); the lights are a sparkle cluster above its top |
| 12 | Meanwhile, Roman astrologers… \| The names survive. | back into the sky 1.8 s. Column x 212, rows SUN 408, MON 528, TUE 648, WED 768, THU 888, FRI 1008, SAT 1128 (120 px apart); horizon y 1488; names go to the right (x 260–940) |
| 13 | Saturday is Saturn's day. \| Sunday… \| Monday… | hold (mpp 0.0122); Saturn, Sun and Moon featured |
| 14 | French keeps the rest: mardi… vendredi… | slight push: column x 201, rows SUN 311 … TUE 579, WED 713, THU 847, FRI 981, SAT 1115; Tue–Fri featured |
| 15 | English swapped in Norse gods: \| Tyr, Woden, Thor and Frigg. | hold (mpp 0.0109) |
| 16 | Revolutionary France… 1793. \| It lasted twelve years. | pull back 1.4 s: CAL2 page x 132–948, y 363–1237 |
| 17 | The Soviets tried five- and six-day weeks. \| By 1940, seven was back. | hold (mpp 0.014) |
| 18 | Empires fell. Calendars changed. \| The seven-day week outlived them all. | slow pull-out (push 1.05) |

## Scenes

**19A — s00–s04**
- **s00-hook** (no captions or chapter): owns the CAL page in drawWorld (beats 0–3 only, fading out by mpp 1.25–1.8). Make the page flip (SEPTEMBER curls away to reveal OCTOBER, with a paper shadow and a light sweep). Masked headline `WHY DOES A WEEK` / `HAVE 7 DAYS?`, with "7 DAYS?" on an accent bar, y 380–620, readable ≥ 1.2 s.
- **s01-from-the-sky:** on the page, three hairline tags land in turn: DAY (a cell, with a tiny sun-spin glyph), MONTH (the title, with a moon glyph), YEAR (the year, with an orbit glyph). On "Except the week" a week row lights up with a large accent "?". Near the end, a soft glow from above invites the tilt-up.
- **s02-day:** a thin rotation arrow ring (drawn shapes, not glyphs) around the Earth and a day/night terminator sweep. Label "1 day" / "one spin of the Earth". The spin itself is env's.
- **s03-month:** the Moon's orbit draws as a hairline that follows the lapping Moon. Label "29.5 days" / "one lunar cycle".
- **s04-year:** Earth's orbit draws round the Sun (hairline + a comet-like trail on the Earth). Label "365¼ days" / "one orbit of the Sun".

**19B — s05–s09**
- **s05-no-week:** hold on the orrery. A small 7-tick "week" arc tries to fit each cycle and fails (shake/fade). Label "7 days?" / "matches nothing in the sky". On phrase 2, the open loop: two ghosted stamps "1793" and "1929" flicker in and away (a tease, ≤ 1.5 s).
- **s06-phases:** the Moon's orbit is split into four quarters (hairline ticks), with four phase icons (`drawMoonDisc`) lighting in turn on `moonStepTimes`. Label "≈ 7.4 days" / "29.5 ÷ 4, per phase". Say it's a theory: a small "ONE THEORY" tag.
- **s07-babylon:** draw the rooftop from **before** the dive lands (v.t < 0 is fine) on the limb at ROOF. Use mud-brick parapets, a robed sky-watcher with a clay tablet, a ziggurat and palm silhouettes on the horizon, and faint warm lamp glows. Label "Babylon" / "sky-watchers, c. 600 BC" (keep it above y 1100).
- **s08-seven-lights:** env makes the lights rise on their names. Add each name label above its light as it rises (attach to `lightPos`, small tracked caps in the light's colour), plus a faint ecliptic arc hairline through them. One focal point: the newest light.
- **s09-wanderers:** each light draws a short wandering path (a looping retrograde trace) against the fixed stars. Then a large accent "7", with "planētēs" / "Greek: wanderers" small. The rooftop sky-watcher stays.

**19C — s10–s14**
- **s10-sabbath:** below the arc, a row of seven day-tiles (clay-tablet style, x 120–940, y 1000–1150). Six marked "work" tiles fill left to right; the seventh glows as the Sabbath (a candle-like warm glow). Label "6 + 1" / "days of work, then a Sabbath".
- **s11-spread:** on the globe via `project()`, warm light rings expand from Jerusalem/Rome → Europe, North Africa, the Middle East and Asia (Christianity), then from Mecca (Islam), as glowing dots and arcs. Label "worldwide" / "carried by Christianity and Islam".
- **s12-roman-days:** while the lights move into the column, a hairline "planetary hours" heptagram can trace the order (optional). Then the planet names sit right of each light. Label "one day each" / "Roman astrology, c. AD 100" (top).
- **s13-sat-sun-mon:** the name morphs, one per phrase: SATURN → SATURDAY, SUN → SUNDAY, MOON → MONDAY (a shared-prefix morph). The others stay dim (env).
- **s14-french:** for Mars, Mercury, Jupiter and Venus, the French names appear (MARDI, MERCREDI, JEUDI, VENDREDI) on each phrase, two per phrase. Use a small "FR" tag and a Latin root line, e.g. "Martis dies".

**19D — s15–s18**
- **s15-norse:** the four French names cross-fade into TUESDAY / WEDNESDAY / THURSDAY / FRIDAY. Under each, its god (TYR, WODEN, THOR, FRIGG) in small accent caps, perhaps with a fine rune-like rule (drawn lines).
- **s16-ten-day-week:** **owns the lights from 71.27 s.** The column swings into the CAL2 header row while the page builds beneath it (`drawCalendarPage`, headK 0 so the lights are the headers). Then on "ten-day week" the grid re-flows to 10 columns (the page widens or the cells narrow; three extra header slots appear as dim ghost lights or plain labels PRIMIDI…DÉCADI). Label "10-day week" / "France, 1793–1805". The current stub shows the handoff positions.
- **s17-soviet:** the grid re-flows to 5 columns (colour-coded worker groups, a nod to the *nepreryvka*), then 6. On "By 1940, seven was back" it snaps to 7 with an impact. Label "5 · 6 days" / "USSR, 1929–1940".
- **s18-outlived:** the 7-column page holds, and its seven header lights glow once in sequence (Sun → Saturn). The final hero: a big accent "7" or "SEVEN" and a quiet end card. Make it a composed frame for the last 2 s.

## Ownership

Builders own **only** their scene files. Do **not** edit `engine/*`, `camera.js`, `env.js`, `episode.json`, `data/`, any `.md`, or other scenes. Shared needs (camera, env lights, Earth, Moon, calendar helper) go in "sharedRequests". Use `--name` values starting with your group key (e.g. `19B_…`) for shots, and delete your old shots.
