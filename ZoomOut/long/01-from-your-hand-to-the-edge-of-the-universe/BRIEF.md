# BRIEF — "From Your Hand to the Edge of the Universe" (Zoom Out, long-form #1)

A ~4:53 **landscape 1920×1080** YouTube video: one unbroken zoom out, from a hand in Central Park (10 cm) to the observable universe (93 billion light-years), then a 7-second rush back to the hand. It is the channel's flagship, and the user wants it **perfect**: beautiful, physically and astronomically correct, readable, smooth, with no glitches.

Engine docs: `engine/README.md`. Read `camera.js`, `world.js`, `env.js`, `layers/park-data.js` and `episode.json` in this folder before writing anything. Visual reference for the house style: `ZoomOut/episodes/08-how-fast-is-light/` (dark space, real Earth, thin orbit lines, small tracked uppercase labels, warm star glows) and `ZoomOut/episodes/04-if-the-sun-were-a-basketball/`.

## How a frame is made

- `env.drawBackground` fills the frame with SPACE, draws a faint backdrop starfield (lf 5.6–16.9), then the **layers** from far to near: `cosmos → galaxy → stars → solar → earth → city → hand` (`layers/*.js`, each `export default { draw(c, v) }`).
- Then each beat's `scenes/sNN-*.js` adds `drawWorld` (optional) and `drawOverlay` (labels and callouts; multiply alpha by `v.k`).
- Then the HUD (orchestrator): the top bar; FIELD OF VIEW top-left; the powers-of-ten ladder down the right edge; the chapter card, lower-left, from `scene.chapter`.
- **No burned-in captions** (`captions: false`; subtitles ship as an .srt), so the narration is NOT on screen. Labels must add information: names, numbers, distances. Never transcribe the voice.

## Camera and coordinates (`camera.js`, orchestrator-owned)

- `v.cam = { x, y, mpp, F, lf }`.
  - F is the field of view in metres across the 1920 px frame, and `lf = log10(F)`.
  - World units are metres, with x east/right and y south/down. The origin is the hand.
  - `v.wx(x)`, `v.wy(y)` and `v.ws(m)` map world to screen.
- **Float precision:**
  - Never draw a shape whose screen size is astronomically large (for example `arc` with r = 1e12 px). Cull, or switch representation, when something is far bigger than the screen. For a huge circle crossing the frame, draw only the visible arc, or a straight edge when r > ~1e6 px.
  - Never compute `v.wx(hugeOffset)` and then subtract nearby numbers to get small details. Draw small things relative to their own centre once it is on screen.
- The zoom is continuous (a monotone spline through per-beat keys). Read `KEYS` to see the F each beat settles on.
  - The camera centre glides between anchors as a function of lf (`CENTRES`).
  - Beat 35 zooms from 2e27 m back to 0.3 m in ~7 s along the same path, so **every layer must look right at every lf in both directions, including at extreme zoom speed**.
  - Motion blur averages 4–8 sub-frames, so anything that flickers between sub-frames turns to mush. Keep everything a pure, smooth function of `v.cam` and `v.gt`.
- Real anchors exported by `camera.js`:
  - `HAND` (lat/lon), `PERSON`/`HEAD_DIR`, `SUBSOLAR`, `SUN_SCREEN` and `SHADOW` (light from the LOWER LEFT; shadows fall to the UPPER RIGHT, everywhere, from grass blades to the Moon's phase to the planets' lit sides).
  - `SUN`, `helio(lon, r)` and `ECL_ROT` (planets at their true heliocentric ecliptic longitudes on 15 July 2026, 19:30 UTC), `MOON_POS`, `VOYAGER`.
  - `gal(l, b, d)` (galactic coordinates → world, l = 0 points right, l = 90 up), `GC`, `R_MW`, `ANDROMEDA`, `LANIAKEA`, `R_OBS`.
  - `AU`, `LY`, `R_EARTH`, `C`.
- `world.js`: `band(lf, a, b, c, d)` (smooth trapezoid fade in log F), `HANDOFF`, `GRASS`, `ACCENT` (brand cyan [90,220,235]), `INK`, `SPACE`, `worldRect`, `onScreen`, `fmtField`.

## Timeline (seconds; voice is final)

| beat | start–end | line (spoken) | owner |
|---|---|---|---|
| 0 | 0.00–6.04 | This is a human hand. About ten centimeters across. | A |
| 1 | 6.04–13.28 | Now let's zoom out, ten times wider at every step, until we reach the edge of everything we can see. | A |
| 2 | 13.28–17.13 | A person, lying in the grass on a summer afternoon. | A |
| 3 | 17.13–20.37 | A blanket, a few trees, and a footpath. | A |
| 4 | 20.37–24.83 | This is the Sheep Meadow, in New York's Central Park. | B |
| 5 | 24.83–30.59 | The park is four kilometers long, a green rectangle cut out of the city grid. | B |
| 6 | 30.59–37.55 | Manhattan: an island twenty-one kilometers long, home to more than one and a half million people. | B |
| 7 | 37.55–43.23 | The whole city, wrapped around one of the largest natural harbors in the world. | B |
| 8 | 43.23–49.57 | The east coast of North America, and the curve of the planet starts to show. | B |
| 9 | 49.57–55.82 | The Earth. Twelve thousand seven hundred kilometers across. | B |
| 10 | 55.82–63.49 | The International Space Station orbits just four hundred kilometers up, barely above the surface at this scale. | B |
| 11 | 63.49–71.48 | The Moon, three hundred eighty-four thousand kilometers away. Light makes the trip in just over a second. | B |
| 12 | 71.48–75.98 | Only a handful of humans have ever traveled this far from home. | B |
| 13 | 75.98–83.73 | The Sun. A hundred and fifty million kilometers away. Its light takes about eight minutes to reach us. | C |
| 14 | 83.73–91.34 | Mercury, Venus, Earth, Mars: the rocky inner planets, and past them, the asteroid belt. | C |
| 15 | 91.34–99.28 | Then the giants: Jupiter, Saturn, Uranus, and Neptune, four and a half billion kilometers out. | C |
| 16 | 99.28–108.86 | Voyager 1, launched in 1977, is the farthest object humans have ever built. It's nearly a full light-day away. | C |
| 17 | 108.86–119.67 | A light-year is nearly ten trillion kilometers. Around the Sun, the Oort cloud may hold trillions of icy comets, stretching more than a light-year out. | C |
| 18 | 119.67–128.63 | Four light-years away: Proxima Centauri, the nearest star. Voyager would need more than seventy thousand years to get there. | D |
| 19 | 128.63–133.39 | Within ten light-years, there are only about a dozen stars. | D |
| 20 | 133.39–139.95 | Nearly every star you can see at night lies within a few thousand light-years. | D |
| 21 | 139.95–148.50 | The Milky Way. A hundred thousand light-years across, with hundreds of billions of stars. | D |
| 22 | 148.50–158.99 | We're out here, in a quiet arm, twenty-six thousand light-years from the center. There, a black hole four million times heavier than the Sun sits waiting. | D |
| 23 | 158.99–168.63 | The Sun takes about two hundred thirty million years to go around once. The last time we were here, the first dinosaurs were just appearing. | D |
| 24 | 168.63–175.36 | The Local Group: the Milky Way, Andromeda, and dozens of smaller galaxies. | D |
| 25 | 175.36–186.44 | Andromeda is two and a half million light-years away. On a dark night you can see it with your naked eye, as light that set off long before our species existed. | D |
| 26 | 186.44–193.49 | Galaxies gather in groups, groups into clusters, and clusters into superclusters. | E |
| 27 | 193.49–203.21 | Ours is called Laniakea, Hawaiian for immense heaven: about a hundred thousand galaxies, spread across five hundred million light-years. | E |
| 28 | 203.21–213.54 | Zoom out again, and the galaxies line up into filaments and walls, around enormous empty voids. The cosmic web. | E |
| 29 | 213.54–216.44 | Every point of light here is a galaxy. | E |
| 30 | 216.44–226.57 | The observable universe. Ninety-three billion light-years across, holding hundreds of billions of galaxies. | E |
| 31 | 226.57–238.44 | The universe is thirteen point eight billion years old, but space has been stretching the whole time, so the farthest light we see came from places that are now much farther away. | E |
| 32 | 238.44–243.85 | At the edge is the oldest light there is: the afterglow of the Big Bang. | E |
| 33 | 243.85–251.12 | Beyond it, light hasn't had time to reach us yet. Nobody knows how far the universe really goes. | E |
| 34 | 251.12–260.81 | And since light reaches us from every direction at the same speed, the center of the observable universe is right where you are. | E |
| 35 | 260.81–269.31 | So let's go back. (then 28 powers of ten in ~7 s, no voice) | E |
| 36 | 269.31–276.07 | A human hand. About twenty-eight steps of ten from the edge of everything we can see. | A |
| 37 | 276.07–293.22 | Let's zoom out. (then a ~14 s end screen: a calm pull-back from the hand to the meadow; YouTube end-screen elements will cover parts of it) | A |

Exact numbers are in `build/timeline.json` (`lines[i].phrases` give each phrase's start and end, so you can time labels to the words).

## Owners and layers

| builder | layer files (write) | beats (scenes, write) | scale range lf |
|---|---|---|---|
| A | `layers/hand.js` | 0, 1, 2, 3, 36, 37 | −1.5 → 2.4 |
| B | `layers/city.js`, `layers/earth.js` | 4–12 | 1.4 → 10.2 |
| C | `layers/solar.js` | 13–17 | 9.4 → 17.4 |
| D | `layers/stars.js`, `layers/galaxy.js` | 18–25 | 15.8 → 24.6 |
| E | `layers/cosmos.js` | 26–35 | 23.0 → 28 |

- You may create helper modules under `layers/` with your owner prefix, e.g. `layers/c-planets.js` or `layers/d-starcat.js`.
- **Never edit files you don't own** (camera.js, env.js, world.js, park-data.js, geo.js, episode.json, other builders' files, engine/). If you need a change there, say so in your final report.
- Keep the `chapter` objects already in your scene stubs. You may polish a `sub`; keep it short and factually exact.

## Handoffs (log10 F windows, see `world.js` HANDOFF): both sides draw across the window and must MATCH

- **hand → city [1.6, 2.4].**
  - Both use `layers/park-data.js` (TREES, PATHS, PEOPLE, moversAt, MEADOW_POLY, PAL).
  - A draws the detailed ground and fades it out over 2.0–2.4. B draws the meadow, park and city from 1.6 up (B's version may be simpler but must match colours and positions).
  - The hero person, their blanket and the hand belong to A only. B draws the hero as a tiny figure from lf 2.0 up (same place, colours and pose), so they never vanish.
- **city → earth [5.3, 6.4]** (both B).
  - The vector coastline map (geo.js, orthographic about HAND, north up) dissolves into the real globe (`engine/runtime/earth.js` drawEarth with `lat0: HAND.lat, lon0: HAND.lon, tilt: 0`, centre `v.wx(0), v.wy(0)`, `r = v.ws(R_EARTH)`). These are the same projection, so the coastlines line up exactly.
  - Daytime look (`style: 'day'`, `sun: SUBSOLAR`): NYC must be in daylight.
- **earth → solar [9.4, 10.2].** The Earth–Moon pair shrinks into C's Earth dot at the origin. C draws the Earth and Moon dots from 9.4 up; B fades its globe and Moon out by 10.2.
- **solar → stars [15.8, 17.0].** C's Sun becomes D's Sun star at `SUN` (essentially the origin at these scales). Exactly one Sun is visible at any time.
- **stars → galaxy [19.2, 20.4]** (both D).
- **galaxy → cosmos [23.2, 24.4].**
  - D's Local Group (MW and Andromeda as small sprites) hands off to E's field of galaxies.
  - E must not draw a duplicate Milky Way or Andromeda. E keeps a marker on "us" (the origin) where the narration needs it.

## Look and quality bar

- **Premium documentary, not cartoon.** Deep blacks, restrained colour, soft glows, crisp thin lines (≥1.2 px; never hairlines that shimmer), and small tracked uppercase labels in the house style:
  - `L.font(14–22, 700, L.FONT.body)` + `L.trackedText`, with a thin leader line to the object.
  - Big numbers in `L.FONT.display` 800.
  - All labels need a dark halo or backing so they read over anything.
- **Text sizes for 1080p landscape:** small labels ≥ 16 px, normal labels 18–24 px, hero numbers 60–110 px. Never larger than needed. Never let text overlap other text, the HUD or the chapter card.
- **Screen-safe zones:**
  - Keep labels and important subjects out of the top-left HUD box (x < 600 and y < 210), the right ladder (x > 1640), the top bar (y < 95) and the chapter card zone (x < 900 and y > 880, while a chapter card shows).
  - The content box is roughly x 140–1620, y 110–870.
- **Accuracy:** every name, number, position and size must be real (see the fact sheet below). Sizes may be enlarged where a body would be sub-pixel; when you do, label it with a small "NOT TO SCALE" or "×N SIZE" tag, or keep the enlargement obviously iconic (a dot with a glow). Orbits are drawn as true circles or ellipses at true scale.
- **Physical plausibility:**
  - Nothing floats over something it should be under. People stand only on paths or lawns, never inside trees or on water.
  - Light comes from one side (lower left) at every scale.
  - **No invented continents, ever.** Use earth.js for the globe.
- **Determinism:** no `Math.random`. Use `L.rng(seed)` or `L.noise1`. Cache expensive procedural things in module-level caches keyed by parameters (e.g. pre-rendered OffscreenCanvas sprites or point arrays built once).
- **Performance:**
  - Average ≤ ~120 ms per sub-frame for your layer at its heaviest moment (`node engine/node/bench.mjs <ep> --sub 1` gives ms per frame).
  - Pre-render sprites (galaxies, star glows, trees) to OffscreenCanvas once, and cull everything off-screen.
- **Sound:** each scene's `cues(d)` may return a few cues (see the engine README for names and gains). Keep it tasteful: soft `shimmer`, `bloom`, `swell` or `ping` on reveals, and `deep`/`impact` only for the 2–3 biggest moments of your range. env.js already adds a soft whoosh at every beat change.

## Facts (verified; use these exact values, and don't invent new numbers)

- **Hand and person:** hand ~10 cm across (palm width ~8.5 cm; ~19 cm long). Person ~1.7 m. It is 15 July, 3:30 pm, sunny, with short shadows toward the upper right (sun elevation ~48° → shadow length ≈ 0.9 × height).
- **Sheep Meadow:** a 15-acre (6 ha) open lawn, 66th–69th Street. Central Park is 4 km (2.5 mi) long and 0.8 km wide, 843 acres, opened 1858. Cars have been banned from its drives since 2018.
- **Manhattan:** 21.6 km (13.4 mi) long, ~3.7 km wide at its widest, population ~1.6 million (2020: 1,694,251). New York City has 8.3 million people (2020 census: 8,804,190). Upper and Lower New York Bay form the harbor.
- **Earth:**
  - Diameter 12,742 km.
  - ISS altitude ~400 km (370–460), orbit inclination 51.6°, one orbit every ~92 min, ~28,000 km/h.
  - The Kármán line is at 100 km.
- **Moon:** mean distance 384,400 km; diameter 3,474 km; light takes ~1.28 s. 24 Apollo astronauts flew to the Moon, 12 walked on it. Do NOT state a total count of people who have traveled that far.
- **Sun:**
  - 1 AU = 149.6 million km; light takes 8 min 20 s.
  - Sun diameter 1.39 million km (109 Earths).
  - Planet orbital radii (AU): Mercury 0.387, Venus 0.723, Earth 1, Mars 1.524, Jupiter 5.203, Saturn 9.537, Uranus 19.19, Neptune 30.07.
  - The main asteroid belt spans ~2.2–3.3 AU. The Kuiper belt spans ~30–50 AU.
  - Neptune is ~4.5 billion km from the Sun; light takes ~4 h 10 min.
- **Voyager 1:** launched 5 Sep 1977. In mid-2026 it is ~168 AU ≈ 25 billion km away, nearly one light-day (1 light-day = 25.9 billion km = 173 AU). It is the most distant human-made object, crossed the heliopause in Aug 2012 at ~121 AU, and travels ~17 km/s.
- **Heliopause:** ~120 AU (upwind).
- **Oort cloud:**
  - Hypothetical, never directly observed. Inner edge ~2,000–5,000 AU; outer edge perhaps 100,000+ AU (~1.6+ light-years).
  - Possibly trillions of icy bodies.
  - It is SPHERICAL (a shell), unlike the flat planets.
- **1 light-year** = 9.46 trillion km = 63,241 AU.
- **Proxima Centauri:** 4.24 ly, a red dwarf. Alpha Centauri A and B are at 4.37 ly. At 17 km/s Voyager would need ~75,000 years (say "more than 70,000").
- **Stars within ~10 ly, with distances and galactic coordinates (l, b):**

  | star | distance | l | b |
  |---|---|---|---|
  | Proxima Centauri | 4.24 ly | 313.9° | −1.9° |
  | Alpha Centauri A+B | 4.37 ly | 315.7° | −0.7° |
  | Barnard's Star | 5.96 ly | 31.0° | +14.1° |
  | Wolf 359 | 7.86 ly | 244.1° | +56.1° |
  | Lalande 21185 | 8.31 ly | 185.1° | +65.4° |
  | Sirius A+B | 8.60 ly | 227.2° | −8.9° |
  | Luyten 726-8 A+B | 8.73 ly | 175.5° | −76.0° |
  | Ross 154 | 9.70 ly | 11.3° | −10.3° |

  Brown dwarfs Luhman 16 (6.5 ly) and WISE 0855 (7.4 ly) may be shown dimmer, labelled "brown dwarf". The count within 10 ly is about a dozen stars, including the Sun.
- **Bright naked-eye stars (for the "few thousand light-years" bubble), with distances and (l, b):**

  | star | distance | l | b |
  |---|---|---|---|
  | Vega | 25 ly | 67.4° | +19.2° |
  | Arcturus | 37 ly | 15.1° | +69.1° |
  | Aldebaran | 65 ly | 181.0° | −20.2° |
  | Polaris | 433 ly | 123.3° | +26.5° |
  | Betelgeuse | ~550 ly (uncertain) | 199.8° | −9.0° |
  | Rigel | ~860 ly | 209.2° | −25.2° |
  | Antares | ~550 ly | 351.9° | +15.1° |
  | Deneb | ~2,600 ly (uncertain) | 84.3° | +2.0° |

- **Milky Way:**
  - ~100,000 ly across, 100–400 billion stars (say "hundreds of billions").
  - A barred spiral. Two major arms (Perseus and Scutum–Centaurus), minor arms (Sagittarius, Norma/Outer), and the Sun in the Orion–Cygnus Arm (Orion Spur), between Perseus (outside) and Sagittarius (inside).
  - The Sun is ~26,000 ly from the centre. The central bar is ~27,000 ly long, angled ~27° to the Sun–centre line.
  - Sagittarius A* has 4.3 million solar masses.
  - The Sun orbits once every ~230 million years, at ~230 km/s.
  - Seen from the north galactic pole the disc rotates CLOCKWISE. With camera.js's gal(), the Sun is to the left of the centre and moves UP the screen (l = 90°).
  - Satellites: LMC at 160,000 ly (l 280.5°, b −32.9°) and SMC at 200,000 ly (l 302.8°, b −44.3°).
- **Local Group:**
  - ~10 million ly across, 80+ galaxies, mostly dwarfs (say "dozens").
  - Andromeda (M31): 2.5 million ly, ~220,000 ly across, ~1 trillion stars; the most distant object easily visible to the naked eye. Its light left ~2.5 million years ago; Homo sapiens appeared ~300,000 years ago.
  - Triangulum (M33): 2.73 million ly (l 133.6°, b −31.3°).
- **Superclusters:**
  - The Virgo Cluster is 54 million ly away (l 283.8°, b +74.4°), with ~1,300–2,000 galaxies.
  - Laniakea (Tully et al. 2014, Nature): ~520 million ly across, ~100,000 galaxies, 10^17 solar masses. The Great Attractor is near its centre, ~150–250 million ly away (camera.js LANIAKEA).
  - "Laniakea" is Hawaiian for "immense heaven".
- **Cosmic web:** filaments, walls (e.g. the Sloan Great Wall, ~1.4 billion ly long) and voids typically 30–300 million ly across (e.g. the Boötes Void, ~330 million ly).
- **Observable universe:**
  - 93 billion ly across (radius 46.5 billion ly) and 13.8 billion years old.
  - It holds "hundreds of billions of galaxies" (estimates range from ~200 billion to 2 trillion).
  - The CMB was released ~380,000 years after the Big Bang and is the oldest light we can see.
  - The observable universe is a sphere centred on the observer, so it is centred on the hand.
- **The whole zoom:** from 0.1 m to 8.8e26 m is ~10^28, "about twenty-eight steps of ten".

## Workflow for each builder

1. Read the files listed above.
2. Write your layer(s) and scenes.
3. Check your work with stills, using a unique name. Look at EVERY sheet and full-resolution frame yourself:
   ```sh
   cd /Users/colas/ELI5Shorts
   node engine/node/shots.mjs ZoomOut/long/01-from-your-hand-to-the-edge-of-the-universe --name <you>_v1 --beats 13,14 --per 4
   node engine/node/shots.mjs ZoomOut/long/01-from-your-hand-to-the-edge-of-the-universe --name <you>_t --times 80.5,84.2
   ```
   Also check the zoom-back window: beat 35, 260.8–269.3 s. To find when the camera is at a given scale, run `node tools/camtime.mjs [from to step]` or `node tools/camtime.mjs --lf 6.0` from this folder.
4. Check both handoff windows with your neighbours. Their layers may still be placeholders while you work; at minimum make your side fade correctly.
5. Delete your shots when done (`rm build/shots/<you>_*`). Disk space is tight.
6. Final report (short):
   - what you built;
   - which times you verified, with ms per frame;
   - anything you need from the orchestrator or another builder;
   - any fact you were unsure about.
