# Creative brief: Zoom Out 23, "What If the Oceans Drained?" (≈77.8 s, hook format, series "What If")

**North star:** *Make a dynamic motion graphics video that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*

Read these first:
- `../../../MOTION-PRINCIPLES.md` and `../../../engine/README.md`.
- `engine/runtime/lib.js` and `engine/runtime/kit.js`.
- This folder's `camera.js` and `env.js`. Their header comments document the world.
- `script.md` → FACT-CHECK. Every number on screen must match it.

Finished references:
- `../14-what-if-all-the-ice-melted/`: overlays on a real globe (pins, labels, walking routes over land bridges).
- `../22-how-old-is-everything/`: the question card.
- `../21-how-many-ants-are-on-earth/`: the hook-format preroll.

## The film

**One continuous camera over the REAL globe**, while the sea level drops from 0 to −10,935 m. The world is drawn for you; your job is the story layer.

1. The blue planet: WHAT IF THE OCEANS DRAINED?
2. Bering Strait −50 m: Alaska joins Russia.
3. Over the pole to the North Sea −60 m: Doggerland.
4. Pull out to the North Pole: −120 m, the real Ice Age.
5. Into Beringia: people and mammoths cross.
6. The Atlantic: −2,500 m, the Mid-Atlantic Ridge rises out of the dark.
7. Oblique south view: a glowing seam traces the 65,000 km ridge around Antarctica.
8. −5 km: the abyssal plains are dry.
9. Hawaii −6 km: Mauna Kea 10.2 km base to peak vs Everest.
10. The Mariana Trench: the last glint of water, then gone.
11. A whole dry planet.
12. It shrinks onto a classroom-globe stand: the ocean is a ≈ 0.09 mm skin.
13. The oceans flow back.
14. The question card over the blue planet.

**Look:**
- Premium earth-science documentary (Kurzgesagt or Vox polish). The real-data globe is the star.
- Overlays are thin, precise and sparse:
  - hairline leaders, small tracked caps, `L.bigLabel` in the accent;
  - pins drawn as a ring plus dot with a soft dark halo.
- Accent `[70, 180, 255]` (ocean blue) for numbers, the ridge seam and highlights.
- No cartoon faces, mascots or emoji. No `→` glyphs (Avenir lacks them): draw arrows as shapes.
- **Do NOT end on, or show, a water sphere.** Episode 09 did that.

## World, units and helpers (camera.js / env.js, orchestrator-owned)

### The globe raster

**The globe is drawn by env.js, per pixel, from real data:** NOAA ETOPO1 on a 0.1° grid (`engine/assets/etopo6.bin`).
- **Land:** muted hypsometric tints with hillshade; today's ice caps are white.
- **Exposed sea floor** (between today's sea level and the current one) is coloured as real sediment by depth:
  - sandy shelf (< 200 m);
  - grey-brown slope mud;
  - pale calcareous ooze on the ridges (2–3.5 km);
  - rust-brown red clay in the abyss (> 4.5 km);
  - dark trenches.
- The multi-scale hillshade, with light from the NW, comes from the bathymetry itself: ridge fabric, fracture zones, seamount chains.
- **The water that is left** is coloured by its depth below the CURRENT surface. Shallow pools are translucent turquoise over the sediment; deep basins are navy.
- **Do not paint seafloor, water or coastlines yourself:** they are honest and already there.

### World coordinates

- **World coordinates are metres in a side view**, as in ep 14. The sphere (radius `R_EARTH`) is centred at `(0, R_EARTH)`.
- Whatever place the current view centres on (the **face centre**) is drawn top-down at world `(0, R_EARTH)`. On screen that is (540, 864) plus the shot's offset.
- **The globe's orientation changes with time** (camera.js `view(gt, tl)`, slerped between `VIEWS`). Always place things through the helpers, never with fixed world or screen coordinates:
  - `project(v, lat, lon, elev?)` → screen `{x, y, z}`. `z > 0` faces us, so fade or cull as `z` → 0.
  - `geoPath(c, v, [[lat, lon], …], close?)`: polygons. Far-side points clamp to the limb.
  - `strokeGeo(c, v, pts, step?, zMin?)`: OPEN polylines, broken where they go behind the globe. Use it for routes and paths.
  - `globeDisc(v)` → `{x, y, r}` · `viewOf(v)` · `worldOf(view, lat, lon, elev)` · `elevation(lat, lon)` (m, bilinear) · `isIce(lat, lon)`.

### Sea level (story state, pure functions of time)

- `seaLevel(v)` / `seaAt(gt, tl)` gives the DISPLAY sea level in m (≤ 0). It is the HUD number.
- `dataSea(s)` is the threshold applied to the grid.
  - Below −6 km it is compressed, because the grid's deepest cell is −10,460 m. The HUD hits −10,935 exactly when the last Mariana cell runs dry.
  - Never compare `elevation()` with `seaLevel` directly below −6 km: use `dataSea(seaLevel(v))`.
- `SEA` = `{bering −50, dogger −60, lgm −120, ridge −2500, ridgeLow −3000, abyss −5000, hawaii −6000, last −10800, mariana −10935, gone −11000}`.
- `seaKeys(tl)`. Drops are eased in log-depth:
  - −50 over 9.83–11.53
  - −60 over 15.19–16.93
  - −120 over 21.92–24.62
  - −2,500 over 29.80–34.16 (the ridge crests surface on "a hidden mountain range appears")
  - −3,000 over 35.18–41.06 (slow, while the ridge is traced)
  - −5,000 over 41.81–44.66
  - −6,000 over 48.29–51.35
  - −10,800 over 53.97–57.02
  - −10,935 over 57.02–58.29 (the last glint)
  - "gone" over 58.62–59.32
  - **refill to 0 over 65.77–67.59**
- `wetFraction(s)`: the fraction of today's ocean area still wet, from the grid's hypsometry (0.21 at −5 km).
- `ghostK(v)`: today's coastline as a thin white ghost line, on whenever the sea is below today's level.
- `coastK(v)`: the current shoreline glows in close-ups.

### The ridge (`data/ridge.js`, snapped to the grid's crests)

- `RIDGE` is the list of branches `{name, pts, cum, len, sprout}`. The TRUNK is one continuous path: Mid-Atlantic, then SW Indian, SE Indian, Pacific-Antarctic, East Pacific Rise. Side branches sprout as the trunk passes their junction.
- `drawRidge(c, v, D, {alpha, color, width, glow, heads})` draws the glowing seam, revealed up to trunk distance `D` km. Bright moving fronts are drawn at the heads, and only the visible hemisphere is drawn.
- `RIDGE_TRACE_END` (D for the whole system) · `ridgeRevealedKm(D)` · `RIDGE_TOTAL_KM` (≈ 68,000; the label says "65,000 km").

### Places, views and HUD

- **Places** (`PLACES`): `pacific`, `bering`, `alaska`, `russia`, `northSea`, `doggerBank`, `dover`, `beringia`, `atlantic`, `hawaii`, `maunaKea`, `mariana`, `challenger` (the data's deepest cell, 11.35 N 142.45 E).
- `VIEWS`, `CLASSROOM_TILT` (23.4°), `shotAt(gt, tl)`, `shotStart(name, tl)`.
- Other exports: `ACCENT`, `SEDIMENT` colours, `fmtDepth`, `gaugeY(depth)` / `GAUGE` (to point at the gauge).
- **HUD (env):**
  - topBar.
  - From beat 1 on, the SEA LEVEL readout at the top right: "SEA LEVEL" at y 252, the number at y 318, and a tag at y 350 ("TODAY", feet, "20,000 YEARS AGO", "NO OCEAN LEFT", "REFILLING").
  - A slim log-scale gauge bar at x ≈ 1012, y 384–1000, with ticks 0 / 50 m / 120 m / 2.5 km / 5 km / 11 km and labels to its left (x ≈ 950–995).
  - The HUD fades out at the question.
  - **Keep labels out of x > 900 for y < 1000, and out of the right top block.**
- **Performance:** about 190 ms per frame at sub 1. The globe raster is cached through holds; any changing orientation or sea level re-renders it.
  - Keep your drawing cheap: no per-pixel loops, and bound loops by what is on screen.
  - Expensive `shadowBlur` on long paths: use layered strokes instead (see `drawRidge`).

## Timing (build/timeline.json, 77.81 s)

Preroll 0–5.73 s: it replays film time 33.33 → 34.76 at 0.25× (`preroll.from` = 27.6). The sea passes ≈ −2,200 → −2,500 m over the Atlantic.

| beat | start | line ("\|" = phrase pause; phrase starts) | camera shot (start → ≈ arrival) |
|---|---|---|---|
| 0 | 5.73 | What if all the oceans drained away? | `hook`: Pacific face, r 449 → 386 px, centre (540, 974) |
| 1 | 8.78 | Drop the sea by just fifty meters, (8.93) \| and you could walk from Alaska to Russia. (11.38) | `bering` → 10.6: mpp 2300, strait at (540, 824) |
| 2 | 14.04 | By sixty, Britain has rejoined Europe, (14.19) \| across a lost land called Doggerland. (17.19) | `doggerland` 13.94 → 16.0: over the Arctic (peak 7000), mpp 1350, centre (540, 824) |
| 3 | 19.93 | Twenty thousand years ago, (20.08) \| the seas really were about a hundred and twenty meters lower. (22.02) | `ice-age` → 21.9: North Pole top-down, mpp 9200 (North Sea at the bottom, Beringia at the top) |
| 4 | 25.77 | People and mammoths walked across these land bridges. (25.92) | `beringia` 25.67 → 27.4: mpp 2500, centre (540, 804) |
| 5 | 29.35 | Keep draining. At two and a half kilometers, (29.50) \| a hidden mountain range appears. (32.55) | `atlantic` → 31.5: whole globe r 455, MAR face-on |
| 6 | 34.88 | The mid-ocean ridge winds sixty-five thousand kilometers around the planet, the longest on Earth. (35.03) | `ridge-ring` → 36.8: oblique south view (−58°, −12°), spin −9°/s (face drifts EAST) |
| 7 | 41.36 | At five kilometers, most of the seafloor is dry: (41.51) \| vast, flat abyssal plains. (45.02) | `abyss` → 43.4: the North Atlantic (32°, −42°), mpp 13000 |
| 8 | 47.29 | Hawaii's Mauna Kea now stands over ten kilometers tall, (47.44) \| taller than Everest. (51.81) | `hawaii` → 49.4: mpp 1500, Hawaii at (540, 694) |
| 9 | 53.42 | The last water pools in the Mariana Trench, (53.57) \| eleven kilometers down. (56.47) | `mariana` → 55.4: mpp 1900; `deep` 56.12 → 57.6: Challenger Deep cell at (540, 804), mpp 1400 |
| 10 | 58.47 | Then it's gone. (58.62) | `gone` 58.52 → 60.4: the whole dry Pacific face, r 455 |
| 11 | 60.45 | On a classroom globe, (60.60) \| all that ocean is about as thin as a coat of paint. (62.24) | `classroom` → 62.3: r 260 at (540, 640), roll 23.4° (axis tilt), still dry |
| 12 | 65.67 | A thin blue skin, (65.82) \| and it's what keeps this planet alive. (67.45) | `blue` → 67.9: r 439 at (540, 834), slow spin; the oceans refill 65.77–67.59 |
| 13 | 69.88 | If the seas dropped tonight, (70.03) \| where would you walk first? (71.95) \| Tell me in the comments. (73.63) | holds `blue` (push 0.95 over the beat) |

## Scenes

- **s00-hook.js** (no captions, no chapter, `overlayIn: false`):
  - Headline WHAT IF THE OCEANS / **DRAINED?** (stub draft at baselines 372/492, fitted ≤ 900). It must read on frame 1, above the globe (its top is at y ≈ 525).
  - Refine the typography: an accent treatment for DRAINED?, and an exit in the last 0.5 s.
- **s01-bering.js:**
  - Pins on Cape Dezhnev (RUSSIA) and Cape Prince of Wales (ALASKA).
  - As the strait goes dry (9.83–11.53), a walking route (`strokeGeo`) draws across it on "you could walk from Alaska to Russia". The route must lie on dry ground at −50 m; check it with `elevation()`.
  - bigLabel "−50 m" / "Alaska joins Russia". Keep it off the land bridge (left column y ≈ 520–600).
- **s02-doggerland.js:**
  - Tag DOGGERLAND across the dry southern North Sea, plus a subtle dashed outline of the area that is dry at −60 m.
  - Small BRITAIN and EUROPE (or FRANCE) tags.
  - A sub-label "flooded ≈ 8,000 years ago". On-screen numbers come from the FACT-CHECK.
- **s03-ice-age.js:**
  - The North Pole view at −120 m. Two soft highlight rings, BERINGIA (top) and DOGGERLAND (bottom), appear as the sea falls.
  - bigLabel "−120 m" / "20,000 years ago".
  - **No ice sheets** (the bathtub model; see the FACT-CHECK caveat).
- **s04-land-bridges.js:**
  - On the Beringia close-up, a slow procession crosses the land bridge west to east along a dry route: a few small, ACCURATE silhouettes.
  - Woolly mammoths: domed head, sloping back, shoulder hump, curved tusks, small ears, shaggy coat, pillar legs.
  - Two or three people: upright, hide clothing, spears; correct proportions; walking gait with alternating legs.
  - They are symbolic markers (≈ 30–60 px), dark with a rim light, walking slowly with a parallax dust trail. Mammoths and people must never overlap impossibly; keep their depth order correct.
  - A small tag BERINGIA.
  - Fade everything out at beat end.
- **s05-keep-draining.js:**
  - The sea drains to −2,500 m. The ridge surfaces by itself in the raster (a pale seam out of the navy).
  - Support it with a faint accent under-glow along the Atlantic ridge, using `drawRidge` with a low alpha or a limited D, rising with the drain. Keep the full bright trace for s06.
  - bigLabel "2.5 km" / "a hidden mountain range".
  - **This is the preroll's picture** (film 33.33–34.76): it must read at 0.25× with the p-cold headline in the band y 160–380.
- **s06-ridge.js** (owns the ridge seam for ALL later time; the stub shows the pattern):
  - Trace D from 0 to `RIDGE_TRACE_END` over the beat, with bright heads. The seam stays (dimmer) through beats 7–9 and fades out in beat 10.
  - A km counter or bigLabel "65,000 km" / "the longest mountain range on Earth". The counter may run with `ridgeRevealedKm(D)` scaled to 65,000.
- **s07-abyssal-plains.js:**
  - At −5 km, a label on a dry plain (e.g. "ABYSSAL PLAIN", with a leader to the Sohm or Hatteras plain off North America, or the Madeira plain).
  - bigLabel "5 km" / "79 % of the sea floor dry" (the grid's hypsometry; or "most of the sea floor is dry").
  - An optional live "% DRY" counter from `wetFraction`.
- **s08-mauna-kea.js:**
  - A pin on Mauna Kea.
  - A side-profile inset panel (opaque-ish card, lower half y ≈ 900–1340, x 80–900), drawn to ONE vertical scale: Mauna Kea's real profile (gentle shield slopes, ≈ 10.2 km from its base on the sea floor, today's sea level marked at 6.0 km up) beside Everest's (steep pyramid, 8.85 km above sea level).
  - Labels "10.2 km · base to peak" and "8.85 km · above sea level".
  - Accurate shapes: Mauna Kea is a broad, low-angle shield (flank slopes ~ 5–12°, so it is far wider than tall: draw the slopes honestly, even if the inset is wide); Everest is a sharp pyramid.
- **s09-mariana.js:**
  - The trench arc label "MARIANA TRENCH".
  - During `deep` (56.12+), the last pool at the Challenger cell: an accent glint (a soft lightBlob plus a sparkle) that shrinks with the water and winks out at ≈ 58.3.
  - bigLabel "10,935 m" / "Challenger Deep".
  - Use `dataSea(seaLevel(v))` vs `elevation()` to know if any water is left.
- **s10-gone.js:** the bare planet. At most a quiet "NO OCEAN LEFT" tag, or nothing: let the image land. Hold.
- **s11-classroom-globe.js:**
  - The globe settles onto a classroom-globe STAND, drawn around `globeDisc(v)`: a half-meridian ring tilted with `CLASSROOM_TILT` (axis pins at the poles: use `project(v, ±90, 0)`), and a turned base or pedestal below (≈ y 930–1010).
  - A scale tag "30 cm".
  - A cross-section inset (y ≈ 1040–1340): a magnified sliver of the globe's surface where the ocean is a paint-thin blue layer. Label "≈ 0.09 mm" (the deepest point 0.26 mm is optional).
  - The stand and inset fade out early in beat 12 as the camera moves in.
  - Note the globe is still DRY in this beat (the refill is beat 12): the inset shows the ocean that WAS there. A dashed or ghost blue layer works.
- **s12-blue-skin.js:**
  - The oceans flow back (env does the water). Add a soft rim glow on the ocean surface, and/or a gentle light sweep.
  - Optional label "a thin blue skin". Hold on the blue planet.
- **s13-question.js:** an adapted draft is already in place:
  - kicker YOUR TURN · WHERE WOULD YOU / **WALK** FIRST?
  - A) ALASKA TO RUSSIA · B) BRITAIN TO FRANCE · C) INTO THE MARIANA TRENCH
  - TELL ME IN THE COMMENTS
  - The card fades in 0.4 s after the beat starts. Check the fit and the phrase timing.
- **p-cold.js:**
  - A draft headline DRAIN THE OCEANS, AND FIND / EARTH'S **LONGEST MOUNTAINS** at baselines 250/360, fitted ≤ 940 and on from frame 1.
  - Refine the typography and cues. Keep it clear of the globe's top (y ≈ 390 in this window).
  - If the ridge needs more presence on frame 1, ask the orchestrator to move `preroll.from` (sharedRequests).

## Layout rules

- Fit every text line with `L.fitSize` to its real box. Lay cards out top-down from text metrics.
- Shorts-safe zones:
  - nothing important at x > 940 below y 1100;
  - y > 1580 stays clear;
  - the HUD band is y < 300 (the chapter card at the top left y ≈ 238; the readout and gauge at the top right / right edge);
  - the caption band is y 1380–1520 (`captionY` 1450): keep focal subjects out of it.
- At most two text elements besides the caption. Labels stay ≥ 1.5 s. bigLabels sit at x ≈ 80, y ≈ 520–600.
- Scenes are pure functions of time: `L.rng`/`L.noise1`, never Math.random. Wrap every `arc` radius in `Math.max(0, r)`.

## Builder groups

- **23A: beats 0–4.** `s00-hook.js`, `s01-bering.js`, `s02-doggerland.js`, `s03-ice-age.js`, `s04-land-bridges.js`. The hook headline; the land bridges; route and region tags on the close-up maps; the accurate mammoth and human silhouettes.
- **23B: beats 5–9.** `s05-keep-draining.js`, `s06-ridge.js`, `s07-abyssal-plains.js`, `s08-mauna-kea.js`, `s09-mariana.js`. The ridge emergence and trace (the preroll picture), the abyssal-plain labels, the to-scale Mauna Kea vs Everest profile, the last glint in the Mariana Trench.
- **23C: beats 10–13 + preroll.** `s10-gone.js`, `s11-classroom-globe.js`, `s12-blue-skin.js`, `s13-question.js`, `p-cold.js`. The dry planet, the classroom-globe stand and paint-thin cross-section, the refill, the question card and the preroll headline.

## Ownership

Builders own **only** their scene files. Do **not** edit `engine/*`, `camera.js`, `env.js`, `data/*`, `episode.json`, any `.md`, or other groups' scenes. Shared needs go in "sharedRequests": camera keys, sea-level timing, `preroll.from`, HUD placement, env colours.

Shots: `node engine/node/shots.mjs ZoomOut/episodes/23-what-if-the-oceans-drained --name <unique> --times …`.
- `--beats` indexes the FULL timeline, where preroll = beat 0, so film beat i = `--beats i+1`.
- Delete your old shots.
- A first page load bakes the seafloor field (≈ 1 s).
