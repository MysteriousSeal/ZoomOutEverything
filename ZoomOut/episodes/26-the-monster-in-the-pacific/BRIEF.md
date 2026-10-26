# Creative brief: Zoom Out 26, "The Monster in the Pacific" (news, ≈ 36.5 s)

**North star:** *Make a dynamic motion-graphics film that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.* Tone: an urgent, cinematic news alert. Ominous but factual: the visuals carry the fear, the numbers stay honest.

Before you start:
- Read `../../../MOTION-PRINCIPLES.md`, `../../../engine/README.md`, `engine/runtime/lib.js`, `engine/runtime/kit.js` and `engine/runtime/earth.js`.
- Then read `camera.js` and `env.js` in this folder (once they exist): their header comments are the spec.
- References: `../18-every-second-on-the-internet/` (globe, lights), `../23-what-if-the-oceans-drained/` (ocean on a real globe), `../14-what-if-all-the-ice-melted/`, `../24-the-year-10-days-vanished/scenes/s13-question.js` (question card).
- Facts: `script.md` → FACT-CHECK. Every number and word on screen must match it.

## Format
- **No preroll.** Beat 0 is the hook: headline readable on **frame 1**, baked into the scene.
- No episode number: the top bar reads `ZOOM OUT · THE MONSTER IN THE PACIFIC` (automatic).
- Hard limit 40 s; don't ask for holds.

## The film

**One continuous camera around a real Earth** (earth.js real coastlines, believable ocean colour, clouds optional; **no fake or stylised Earth**).
1. Hook: close over the equatorial Pacific, dark and moody; beneath the surface an orange-red glow breathes, like something alive. Headline on frame 1.
2. Pull out: the globe centred on the Pacific (Australia left, the Americas right). A **sea-surface-temperature anomaly field** (the warm tongue) spreads along the equator from the west/central Pacific towards South America, with a calibrated colour scale (°C above normal, e.g. 0 … +4). It must look like real scientific data (smooth, banded, maximum along the equator and off Peru/Ecuador, ±~10–15° of latitude), not a cartoon blob.
3. Push in on the Niño 3.4 box (5°N–5°S, 170°W–120°W) with a big **+3.3 °C** readout.
4. A record chart: the 2015–16 record (≈ 2.75 °C) vs the 2026 forecast median (≈ 3.6 °C), with "91% OF MODEL RUNS: STRONGEST EVER".
5. Pull out / rotate to show the world's rain shifting: drought markers (Australia, the Amazon) and flood markers (Peru/Ecuador and the southern US for "the Americas"; East Africa). Use clean symbols drawn in code (no emoji).
6. Global temperature: a line of yearly global temperature above pre-industrial, the 2024 record ≈ 1.55 °C, and a glowing 2027 forecast point ≈ 1.76 °C, "≈ 95% CHANCE OF A NEW RECORD".
7. The question card.

**Look:** deep ocean navy, data-viz heat palette (amber → orange → red → magenta-white at the extreme), `ACCENT = [255, 120, 40]`; cool cyan for rain/floods; white type. House fonts (`L.bigLabel`, Avenir Next Condensed, DIN). Test "NIÑO" (Ñ) renders.

> **Updated 26 Oct:** the voice was re-recorded on Eleven v4 for a ≈ 60 s cut (see script.md). The table below shows the OLD times: always take times from build/timeline.json.

## Timing (build/timeline.json, 36.49 s)

| beat | start | line ("\|" = phrase pause) | shot |
|---|---|---|---|
| 0 | 0.00 | Something is waking up in the Pacific. \| And it could break the world's heat record. | `hook` |
| 1 | 5.09 | It's called El Niño: a giant pool of warm water spreading across the ocean. | `pacific` |
| 2 | 10.11 | Right now, parts of the Pacific are three degrees hotter than normal. | `nino34` |
| 3 | 13.79 | Most forecasts say it will become the strongest El Niño ever measured. | `record` |
| 4 | 17.96 | It moves rain around the planet: \| droughts in Australia and the Amazon, \| floods in the Americas and East Africa. | `world` |
| 5 | 25.23 | And on top of global warming, \| it could make 2027 the hottest year ever recorded. | `2027` |
| 6 | 30.95 | Is your weather already strange? \| Tell me in the comments. | `question` |

Exact phrase start times are in `build/timeline.json` (`lines[].phrases`).

## Scenes (one focal point per beat; labels ≥ 1.5 s; entrances ease out 0.3–0.6 s, exits faster; key visuals hold ≥ 0.8 s)

- **s00-hook.js** (no captions, no chapter, `overlayIn: false`): headline SOMETHING IS WAKING UP / IN THE **PACIFIC** (accent word), fitted ≤ 940 px, band y ≈ 260–520, readable on frame 1. On phrase 1, a tag "WORLD HEAT RECORD AT RISK".
- **s01-el-nino.js**: chapter/name card **EL NIÑO**; the warm tongue spreads; colour-scale legend (°C above normal), placed clear of the caption band.
- **s02-plus-three.js**: Niño 3.4 box, **+3.3 °C** big, source line "NIÑO 3.4 · WEEK OF 14 OCT 2026"; optionally "+3.9 °C OFF PERU".
- **s03-record.js**: two bars or two peaks: "2015–16 RECORD ≈ 2.75 °C" vs "2026 FORECAST ≈ 3.6 °C"; "91% OF MODEL RUNS: STRONGEST EVER". Instantly legible.
- **s04-rain.js**: drought (Australia, Amazon) on phrase 1, floods (the Americas: Peru/Ecuador + southern US; East Africa) on phrase 2, each with a short label, lit in sync with the words.
- **s05-2027.js**: the global temperature line, 2024 ≈ 1.55 °C, the 2027 point ≈ 1.76 °C glowing, "≈ 95% CHANCE OF A NEW RECORD". Label it as a forecast.
- **s06-question.js**: opaque card from its first frame: IS YOUR WEATHER / ALREADY STRANGE?, two pills **A) YES, IT'S ALREADY WEIRD** and **B) NOT YET**, lit in turn; holds to the end (36.49). Globe visible below.

## Layout rules
- Fit every line with `L.fitSize`.
- Nothing important at x > 940 below y 1100. Bottom y > 1580 clear.
- HUD band y < 340 (chapter card top left).
- Caption band y 1380–1520 (`captionY` 1450): keep subjects out of it.
- Guard `arc()` radii with `Math.max(0, r)`. No `Math.random`. Loops bounded by the screen.
- Avenir has no arrows: draw them.
- Frame-stable counters: `Math.round(v.gt * 30) / 30`, digits drawn whole.

## Ownership
Builders own **only** their files. Do **not** edit `engine/*`, `episode.json`, any `.md`, or other builders' scenes. `camera.js` and `env.js` belong to the setup agent, then the orchestrator. Put shared needs in "sharedRequests".

Shots: `node engine/node/shots.mjs ZoomOut/episodes/26-the-monster-in-the-pacific --name <unique> --times …` (`--sub 8` for fast moves). Delete your old shots.
