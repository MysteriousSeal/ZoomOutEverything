# Creative brief: Zoom Out 27, "How to Survive a Nuclear Blast" (How to Survive #1, ≈ 38.0 s)

**North star:** *Make a dynamic motion-graphics film that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.* Tone: tense but calm and instructional, like a premium civil-defence film. Each step must be crystal clear without sound: this is advice that could save someone.

Before you start:
- Read `../../../MOTION-PRINCIPLES.md`, `../../../engine/README.md`, `engine/runtime/lib.js`, `engine/runtime/kit.js`.
- Then read `camera.js` and `env.js` in this folder (once they exist): their header comments are the spec.
- References: `../24-the-year-10-days-vanished/` (structure; `scenes/s13-question.js` for the card), `../17-your-body-in-one-second/`, `../15-what-if-humans-disappeared/` (city drawing).
- Facts: `script.md` → FACT-CHECK. Every word on screen must match it.

## Format
- **No preroll.** Beat 0 is the hook: headline readable on **frame 1**.
- No episode number: the top bar reads `ZOOM OUT · HOW TO SURVIVE A NUCLEAR BLAST` (automatic). This is the first "How to Survive" episode: build a recurring **step system** (STEP 1, STEP 2 … numbered tiles/badges) that future episodes can reuse.
- Hard limit 40 s; don't ask for holds.

## The film

**One continuous world: a city at dusk, drawn as a refined side cross-section** (a horizon line, layered skyline silhouettes receding into haze, one foreground street and one cut-away brick/concrete building with floors and a basement).
1. Hook: the quiet city; a "10:00" countdown starts, frame 1 readable, headline over it.
2. The flash: a white-out bloom far on the horizon (no mushroom-cloud cliché up close; a distant fireball and rising column, tasteful, realistic glow). STEP 1: DON'T LOOK · DROP · COVER YOUR HEAD.
3. The blast wave: a visible pressure front races across the skyline from the horizon (dust sheet, windows glinting/shattering far away, trees bending), arriving seconds after the flash. STEP 2: STAY DOWN.
4. Camera glides into the cut-away building: STEP 3: GET INSIDE. Brick/concrete; the basement and the building's core light up as the safest zones (a protection heat-map: outer walls/roof red, core and basement green).
5. Fallout: fine dust drifting down over the city from the cloud, settling on roofs; the building core stays protected.
6. The 7-10 rule chart: radiation dose rate decaying over time (log feel but readable): NOW → 7 H = 10× WEAKER → 2 DAYS = 100× WEAKER.
7. STEP 4: STAY INSIDE 24 H: a 24-hour clock fills.
8. The question card.

**People:** the user dislikes crude-looking people. Any human figure must be a **refined safety-card pictogram** (ISO 7010 / airline safety-card style: solid, geometric, no face), used only for "drop face down, cover your head". Otherwise no people.

**Look:** dusk blue-violet sky, warm sodium city lights, the flash in white-gold (`ACCENT = [255, 200, 60]`), civil-defence yellow/black for STEP badges, green for "safe", red for exposure. House fonts (`L.bigLabel`, Avenir Next Condensed, DIN). No gore, no skulls, no real city named.

> **Updated 26 Oct:** the voice was re-recorded on Eleven v4 for a ≈ 60 s cut (see script.md). The table below shows the OLD times: always take times from build/timeline.json.

## Timing (build/timeline.json, 38.03 s; phrase starts in `lines[].phrases`)

| beat | start | line ("\|" = phrase pause) | shot |
|---|---|---|---|
| 0 | 0.00 | If a nuclear bomb goes off near you, \| you have about ten minutes to save your life. | `hook` |
| 1 | 5.07 | First, the flash. \| Don't look. Drop face down and cover your head. | `flash` |
| 2 | 9.65 | Seconds later, the blast wave hits. \| Stay down until it passes. | `blast` |
| 3 | 13.96 | Then get inside. \| Brick or concrete, in the basement or the middle of the building. | `inside` |
| 4 | 19.50 | Because the fallout is coming: radioactive dust, deadliest in the first hours. | `fallout` |
| 5 | 24.11 | After seven hours, it's ten times weaker. \| After two days, a hundred times. | `decay` |
| 6 | 29.83 | So stay inside for at least twenty-four hours. | `24h` |
| 7 | 32.59 | Would you know where to go? \| Tell me in the comments. | `question` |

## Scenes (one focal point per beat; labels ≥ 1.5 s; entrances ease out 0.3–0.6 s, exits faster; key visuals hold ≥ 0.8 s; flashes must not strobe: one bloom, then decay)

- **s00-hook.js** (no captions, no chapter, `overlayIn: false`): headline YOU HAVE / **10 MINUTES** (accent), fitted ≤ 940 px, band y ≈ 260–520, readable on frame 1; a big countdown (10:00 → ticking, frame-stable whole digits).
- **s01-flash.js**: the flash and STEP 1 card with the pictogram (drop face down, hands over head).
- **s02-blast.js**: the pressure front; STEP 2 STAY DOWN.
- **s03-inside.js**: the cut-away building; STEP 3 GET INSIDE; BRICK · CONCRETE; BASEMENT / MIDDLE highlighted.
- **s04-fallout.js**: fallout settling; "RADIOACTIVE DUST · DEADLIEST IN THE FIRST HOURS".
- **s05-decay.js**: the 7-10 chart, "7 H: 10× WEAKER" on phrase 0, "2 DAYS: 100× WEAKER" on phrase 1.
- **s06-24h.js**: STEP 4 STAY INSIDE · 24 H with a filling clock ring.
- **s07-question.js**: opaque card from its first frame: WOULD YOU KNOW / WHERE TO GO?, two pills **A) YES, I HAVE A PLAN** and **B) NO IDEA**, lit in turn; holds to the end (38.03).

## Layout rules
- Fit every line with `L.fitSize`. Nothing important at x > 940 below y 1100. Bottom y > 1580 clear.
- HUD band y < 340 (chapter card top left). Caption band y 1380–1520 (`captionY` 1450): keep subjects out of it.
- Guard `arc()` radii with `Math.max(0, r)`. No `Math.random`. Loops bounded by the screen. Avenir has no arrows: draw them.
- Frame-stable counters: `Math.round(v.gt * 30) / 30`, digits drawn whole.

## Ownership
Builders own **only** their files. Do **not** edit `engine/*`, `episode.json`, any `.md`, or other builders' scenes. `camera.js` and `env.js` belong to the setup agent, then the orchestrator. Put shared needs in "sharedRequests".

Shots: `node engine/node/shots.mjs ZoomOut/episodes/27-how-to-survive-a-nuclear-blast --name <unique> --times …` (`--sub 8` for fast moves). Delete your old shots.
