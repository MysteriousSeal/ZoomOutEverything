# Creative brief: Zoom Out 21, How Many Ants Are on Earth? (≈77 s, hook format)

**North star:** *Make a dynamic motion graphics video that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*

Read these first:
- `../../../MOTION-PRINCIPLES.md` and `../../../engine/README.md`.
- This folder's `camera.js`, `env.js` and `ant.js`. They are the shared world, and the header comments document everything.
- `script.md` for the facts. Every number on screen must match its FACT-CHECK section.

Finished references:
- `../06b-how-high-is-space-hook/`: hook format, `p-cold.js`, `s13-question.js`.
- `../06-how-high-is-space/`: a side-view world, a curved ground that becomes a globe.
- `../08-how-fast-is-light/`: Solar System scales.
- `../14-what-if-all-the-ice-melted/`: overlays on a real globe.

## The film

**One continuous camera over ~25 orders of magnitude:**
1. A real-anatomy ant at 5 mm.
2. A colony under a stone.
3. A leafcutter nest.
4. Up through the sky to the **real globe**.
5. Data beats over the turning globe: 489 surveys, then **20 quadrillion**, then per person, then biomass.
6. A dive back down to an ant in **amber** on the soil.
7. The ants **line up head to tail** into a column going straight up.
8. **The signature:** the column becomes a thin glowing amber line. It shoots off Earth, and the camera pulls out through the Solar System: Neptune's orbit, then Pluto's, then the whole **668 AU** line, with the Sun a dot.
9. The camera falls all the way back to **one ant beside a shoe**: "you're never really alone".
10. The question card over that held frame.

**Look:**
- Premium natural-history and space documentary (Kurzgesagt or Vox polish, never cartoon). No faces on ants, no mascots, no emoji.
- Warm macro light at ground level and deep black space.
- Accent `[235, 170, 70]` (amber) for numbers, the line and highlights.
- Real anatomy everywhere:
  - ants: head, mesosoma, petiole, gaster; six legs, all jointed to the mesosoma; elbowed antennae;
  - a real-coastline Earth (earth.js);
  - true-radius orbits.

## World (camera.js, env.js)

- **Side view in metres, y DOWN** (y = −altitude). The ground at macro scale is y = 0. It is the top of a circle of radius `R_EARTH` centred at `EARTH_C = (0, R_EARTH)`.
- The origin is one spot in central Texas, `SPOT`. It sits on the globe's top limb whenever the camera is near the ground.
- **Prop positions** `X`: hero ant at x = 0, `X.stone` +0.14, `X.nest` +3.2, `X.amber` −0.45, the line at x = 0, the shoe toe at −0.015, the last ant at +0.02.
- **Solar System:** a top-down map in the same plane.
  - `SUN` is 1 AU from Earth's centre, up and to the right.
  - `PLANETS[]`: true semi-major axes, layout angles, `{x, y, col, px}`.
  - `PLUTO_ORBIT` (an ellipse) and `PLUTO`.
  - `CROSS.neptune` (≈ 30.9 AU) and `CROSS.pluto` (≈ 38.0 AU) are the altitudes where the line crosses each orbit. `CROSS.voyager` = 170 AU and `CROSS.heliopause` = 120 AU are distance ticks.
- **The line:**
  - `ANT_LEN` = 0.005, `ANTS` = 2e16, `LINE_LEN` = 1e14 m (668 AU). `COL_TOP` = 0.081 m is the height of the macro column.
  - `tip(v)` gives the line tip's altitude (m) at any time. It is a pure, monotonic function of time.
    - Before beat 10 it equals COL_TOP.
    - In beat 10 it stays ~700 px above Earth on screen while the camera pulls out.
    - In beat 11 it reaches `LINE_LEN`, with Earth at screen y ≈ 1300 and the tip at y ≈ 400.
  - `lineK(v)` fades the whole line out early in beat 12.
- **Globe:**
  - `globeView(v)` returns the earth.js view (`{cx, cy, r, lat0, lon0, tilt, rot}`). Pass it to `project`, `geoPath` and `unproject` from `engine/runtime/earth.js` for dots and pins.
  - Orientation: Texas is on the top limb near the ground. During beats 3–7 the globe turns upright, facing Africa and Europe, and spins slowly west at 2°/s. It turns back to Texas during the dive into beat 8. `globeTimes(tl)` gives the phase times. `SUN_LIGHT` is the key light.
- **env draws:**
  - background: sky by altitude, stars, a macro out-of-focus meadow, a hazy horizon, the soil cross-section with scale-adaptive grains and surface grit, the real Earth, and the Solar System map (Sun, orbits, planet dots);
  - foreground: dust motes at macro scale;
  - HUD: `topBar` plus one readout at the top right. "ANTS IN VIEW (APPROX.)" runs 1 → 3,000 → 5,000,000 in beats 0–2 and leaves at beat 3. "LINE LENGTH" runs from "end to end" in beat 9 through beat 11, in cm → m → km → million km → AU with a "· N BILLION KM" note. Keep your labels clear of the readout: it occupies x > 600 at y 250–345.
- **Helpers:**
  - `band(mpp, a, b)` is a log-scale smoothstep, for every LOD crossfade.
  - `fmtLen(m)`, `soilColor(depth)`, `skyColor(alt)`, `shotAt(gt, tl)`, `shotStart(name, tl)`.
- **ant.js:** `drawAnt(ctx, {x, y, len, dir, angle, phase, walk, t, col, alpha, detail, leaf})`.
  - It draws one side-view worker with an alternating tripod gait and LOD (a 3-blob silhouette below 7 px, a dot below 2 px).
  - `gaitPhase(distM)` keeps the feet planted while the ant walks, and `antPx(v)` gives the body length in px.
  - Use it for EVERY ant. Builders may draw their own extra-detailed hero version on top if needed, but it must keep the same anatomy.

## Timing (build/timeline.json, 76.77 s; "|" marks a pause, see `phrases`)

The preroll runs 0.00–5.21. It replays film time 56.41 (preroll.from = 51.2) at rate 0.25: the line approaches Pluto's orbit and crosses it ~2.4 s in, on "…far past Pluto". Its headline must sit above y ≈ 470, since the line tip is at y ≈ 550.

Beat starts: **5.21, 8.10, 13.18, 16.30, 24.48, 28.78, 31.95, 36.52, 42.61, 48.29, 52.99, 57.88, 63.94, 67.29** (end 76.77).

Camera shots (`camera.js` SHOTS; makeCamera with one key per shot; mpp is metres per pixel; anchor 0.47):

| beat | start | line | shot → key |
|---|---|---|---|
| 0 | 5.21 | How many ants are there on Earth? | hook: x 0, mpp 2e-5 (ant 250 px), ground at y 1180 |
| 1 | 8.10 | one colony: a few thousand, under a stone | colony: x 0.09, mpp 2.6e-4 (28 cm wide), ground y 760; travel 1.6 |
| 2 | 13.18 | leafcutter nests hold millions | leafcutters: x 2.6, mpp 7e-3 (7.6 m wide), ground y 640; travel 1.7 |
| 3 | 16.30 | 2022, ~500 surveys \| every continent but Antarctica | globe: r ≈ 400 px centred y 880; travel 2.6 (globe turns upright 17.2–19.4) |
| 4 | 24.48 | conservative estimate: \| twenty quadrillion | estimate: globe r ≈ 300 centred y 690 (room below for the counter) |
| 5 | 28.78 | a two, followed by sixteen zeros | hold, gentle push |
| 6 | 31.95 | nearly 2.5 million \| per person | hold, gentle push |
| 7 | 36.52 | outweigh wild birds + mammals \| combined | biomass: globe r ≈ 210 centred y 560 (panel space y 820–1340) |
| 8 | 42.61 | 100+ million years \| age of the dinosaurs | amber: dive to x −0.45, mpp 6e-5, ground y 1150; travel 2.4 |
| 9 | 48.29 | line them up \| end to end, half a cm each | line-up: x 0, mpp 9e-5, ground y 1300 (the column rises to y ≈ 400); travel 1.5 |
| 10 | 52.99 | leaves Earth \| passes Neptune \| then Pluto | three shots: leaves-earth 52.99 (→ mpp 4.5e4, Earth top y 1180); neptune 54.52 (→ 7.05e9, tip reaches 33 AU ≈ 55.9 s); pluto 56.16 (→ 9.4e9, crosses Pluto ≈ 56.9 s, tip 44 AU) |
| 11 | 57.88 | ~670 × Earth–Sun distance | full-line: mpp 1.11e11, Earth y 1300, tip y 400 (668 AU); travel 2.6, then a slow pull-out |
| 12 | 63.94 | Look down. \| You're never really alone. | never-alone: back to x 0, mpp 1.2e-4 (13 cm wide), ground y 1150; travel 2.6 |
| 13 | 67.29 | question | hold (mpp 1.15e-4) |

## Scenes (direction)

### Group 21A: s00–s03, macro realism and the first zoom-out
- **s00-hook.js** (no chapter):
  - The hero ant walks right along the soil at x ≈ 0 with `drawAnt`. Antennae tap, the gait is planted, and it has a soft contact shadow.
  - Headline `HOW MANY` / `ANTS ON EARTH?`, fitted, in the clear band y 330–600, readable ≥ 1.2 s. It reads off the voice; captions may stay on, as in 06b.
  - The ant stays in the world (it keeps walking until beat 3).
- **s01-colony.js:**
  - A real flat stone (≈ 12 cm, with lichen and a shadow) at `X.stone` sitting on the soil.
  - Below it, a cross-section of the nest: galleries and chambers to ≈ 15 cm, brood piles and workers (`drawAnt`, small).
  - The hero ant reaches the stone's edge.
  - Label "≈ 3,000" / "ants · one colony" (or in words). The HUD readout already counts to 3,000, so pick one or make the label qualitative.
- **s02-leafcutters.js:**
  - An *Atta* mound (≈ 5 m across, loose excavated soil) at `X.nest`.
  - Fungus-garden chambers in cross-section down to ≈ 5 m, joined by tunnels.
  - A foraging trail along the surface: ants carrying leaf fragments (`leaf` option; dots at this scale).
  - Label "MILLIONS" / "workers in one leafcutter nest".
  - The beat is short (3.1 s, camera travel 1.7), so the nest must be readable by ~14.9 s.
- **s03-surveys.js:**
  - ~489 survey dots on the real globe: `project()` on land points, using `isLand` and **excluding Antarctica** (lat < −60). The pattern is illustrative, not the real site list; keep the density believable (more in the Americas, Europe and Australia; sparser in Africa and Asia).
  - The dots pop in staggered waves as the globe turns, plus a count-up "489 STUDIES".
  - On "but Antarctica", Antarctica gets a subtle "no ants" cue (stays empty or is outlined).

### Group 21B: s04–s08, the numbers and deep time
- **s04-quadrillion.js:**
  - A big rolling counter, fitted ≤ 940 px, in the band y ≈ 1050–1300 under the globe. It climbs to `20,000,000,000,000,000` and lands on "twenty quadrillion" with an impact.
  - Then `20 QUADRILLION` / "a conservative estimate".
- **s05-sixteen-zeros.js:** the counter's 16 zeros light up in sequence (tick cues), or it morphs to `2 × 10¹⁶`. Only one focal element.
- **s06-per-person.js:**
  - `≈ 2.4 MILLION` or `NEARLY 2.5 MILLION` / "ants for every person alive", from 20 quadrillion ÷ 8.2 billion.
  - The globe's night side glows (city lights = people). Optionally a single human figure next to a "2,440,000" tally.
- **s07-biomass.js:**
  - A scale or balance, or proportional squares, in **carbon mass**: ants **12** against wild mammals **~7** + wild birds **~2** (Mt C). Areas or weights must be honest.
  - Clean silhouettes: an ant, a generic bird, a generic mammal (deer or elephant). The ant side wins on "combined".
- **s08-amber.js:**
  - A translucent amber nugget (≈ 3 cm) on the soil at `X.amber`, back-lit. An ant is trapped inside (`drawAnt`, tinted, a few air bubbles).
  - A dinosaur silhouette as a ghost in the bokeh behind (generic Cretaceous, correct anatomy and posture).
  - Label "100+ MILLION YEARS" / "ants in Cretaceous amber".
  - The dive lands at ~45 s; hold ≥ 1.5 s.

### Group 21C: s09–s13 + p-cold, the signature line, the return and the question
- **s09-line-up.js:**
  - Ants walk in and climb into a column at x = 0, head to tail (`angle: −π/2`), up to `COL_TOP` (16 ants) by ~50.5 s.
  - A "5 mm" bracket on one ant (`L.dimension`).
  - s09 owns the **macro ants of the line for all later time**: draw only the on-screen ones, up to `tip(v)`, and cull below 1.5 px. Fade with `lineK(v)`. The stub already shows the culling pattern.
- **s10-past-pluto.js:**
  - The glowing line from (0, 0) to −`tip(v)`. It crossfades in from s09's ants (`band(mpp, 2e-4, 2e-3)`).
  - A bright head particle with a short trail at the tip.
  - Orbit-crossing flashes plus "NEPTUNE" / "PLUTO" tags when the tip passes `CROSS.neptune` and `CROSS.pluto`. Each tag must be readable ≥ 1.5 s.
  - It is also the preroll's picture.
- **s11-670-au.js:**
  - The whole line. An end marker "≈ 670 AU" / "100 billion km of ants".
  - Small ticks: "Pluto ≈ 38 AU", "Voyager 1 ≈ 170 AU", plus an "Earth–Sun = 1 AU" note at the base (the Sun is a 3 px dot). The line keeps drawing after s10 ends: s10 owns the line itself, s11 only labels it.
- **s12-never-alone.js:**
  - On the ground at mpp 1.2e-4: the toe of a real sneaker (sole, tread, laces; side view) resting on the soil at x < −0.015.
  - One ant (`drawAnt`) walking at +0.02. The ant is the focal point, above the caption band.
  - No people in the frame beyond the shoe.
- **s13-question.js:**
  - A draft is already adapted from 06b: kicker YOUR TURN, `AN ANT IN YOUR KITCHEN.` / `DO YOU LET IT LIVE?`, choices A) LET IT LIVE and B) IT'S GONE, then TELL ME IN THE COMMENTS.
  - The card fades in 0.45 s after the beat starts. Check the fit and the phrase timing.
- **p-cold.js:**
  - A draft headline `EVERY ANT ON EARTH,` / `IN ONE LINE: PAST PLUTO` at baselines 250 and 368, fitted ≤ 940 and on from frame 1.
  - Refine its typography and cues. If it needs space, ask the orchestrator to move `preroll.from` rather than overlapping the line.

## Rules

- Scenes are pure functions of time: use `L.rng`/`L.noise1`, never Math.random.
- Wrap every `arc` radius in `Math.max(0, r)`. Cull by screen bounds, and bound every loop by what is visible.
- Fit every text line with `L.fitSize` to its real box.
- Shorts-safe zones:
  - nothing important at x > 940 below y 1100;
  - keep y > 1580 clear;
  - the HUD band is y < 300 (the chapter card sits at y ≈ 238);
  - the caption band is y 1380–1520 (`captionY` 1450): keep focal subjects out of it.
- At most two text elements besides the caption. Labels stay ≥ 1.5 s. Use the house `L.bigLabel` for hero numbers.
- No `→` glyphs (Avenir lacks them): draw arrows as shapes.

## Ownership

Builders own **only** their scene files. Do **not** edit `engine/*`, `camera.js`, `env.js`, `ant.js`, `episode.json`, any `.md`, or other groups' scenes. Shared needs go in "sharedRequests" (camera keys, readout timing, preroll.from, env LOD).

Shared exports go from their owner to other scenes by **import only**: s09 may export its column drawer for s10/s12 within group 21C.

Use a unique `--name` for shots, and delete your old shots.
