# Creative brief: Zoom Out 25, "The Man Who Saved the World" (Hidden History, ≈ 38.9 s)

**North star:** *Make a dynamic motion-graphics film that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.* This one is a **thriller**: tense, cold, precise. It must make people stop scrolling in the first second.

Before you start:
- Read `../../../MOTION-PRINCIPLES.md`, `../../../engine/README.md`, `engine/runtime/lib.js`, `engine/runtime/kit.js` and `engine/runtime/earth.js`.
- Then read `camera.js` and `env.js` in this folder (once they exist). They define the world, and their header comments are the spec.
- References: `../24-the-year-10-days-vanished/` (structure, s13-question.js), `../18-every-second-on-the-internet/` (night globe, city lights, real coastlines), `../13-what-if-the-earth-stopped-spinning/`.
- Facts: `script.md` → FACT-CHECK. Every number and word on screen must match it.

## Format

- **No preroll.** Beat 0 is the hook: its headline is readable on **frame 1** (no fade-in), baked into the scene.
- **No episode number anywhere.** The top bar reads `ZOOM OUT · THE MAN WHO SAVED THE WORLD` (engine, automatic: `episodeLabel` is absent on purpose).
- Hard length limit: 40 s. Don't ask for holds.

## The film

**Signature move: one continuous zoom out**, from the alarm screen to orbit.
1. Start tight on the **launch-warning board** of the bunker: a big backlit panel with "СТАРТ" (LAUNCH) blazing red, plus the hook headline.
2. Pull out to reveal the **bunker control room** (empty of people): wall map of the northern hemisphere, consoles, a red phone, a wall clock just after midnight, date stamp.
3. Push into the **wall map**, which becomes (through a seamless match-cut) a **real-coastline globe seen from above the North Pole** at night: the US and the USSR facing each other across the Arctic. Launch arcs rise from the US, one, then another, up to five, curving over the pole.
4. Beat 4: the five arcs vs a ghosted **hundreds** of arcs (what a real first strike looks like); then radar fans along the Soviet border sweep and find nothing.
5. Beat 5: the five arcs dissolve; "FALSE ALARM" stamp; a waiting clock.
6. Beat 6: **zoom out to orbit**: the Sun, the Oko satellite on its long Molniya ellipse, and sunlight glinting off high clouds over the US straight into the satellite's eye. The "missiles" were reflections.
7. Beat 7: the question card.

**Look:** premium documentary thriller (think Vox / Kurzgesagt polish, but darker). Never a kid show.
- Palette: near-black blue-green bunker night, phosphor green CRT lines, **alarm red** (`ACCENT = [220, 60, 50]`), warm amber for the clock and lamps, cold white for text.
- Period details: Soviet 1980s control room: Bakelite/steel consoles, toggle rows, analogue gauges, a CRT glow, Cyrillic stencils. All drawn, all crisp.
- **No people at all.** Petrov is never shown: no faces, no silhouettes, no hands. His presence is the empty chair, the phone, his name in text.
- The Earth must look real: real coastlines (earth.js), night side with city lights, polar ice. **No fake or stylised Earth.**
- Cyrillic: test that the house fonts render "СТАРТ" and "ЛОЖНАЯ ТРЕВОГА"; if not, use a font that does (e.g. "PT Sans Narrow", "Helvetica Neue Condensed").

> **Updated 26 Oct:** the voice was re-recorded on Eleven v4 for a ≈ 60 s cut (see script.md). The table below shows the OLD times: always take times from build/timeline.json.

## Timing (build/timeline.json, 38.87 s)

| beat | start | line ("\|" = phrase pause; phrase starts) | shot |
|---|---|---|---|
| 0 | 0.00 | In 1983, one man stopped a nuclear war (0.30) \| by refusing to believe a computer. (3.68) | `hook`: the СТАРТ board, tight |
| 1 | 6.08 | September twenty-sixth. A secret bunker near Moscow. (6.23) \| Just after midnight. (10.07) | `room`: pull out to the whole control room |
| 2 | 11.36 | The alarm goes off: a US missile launch. (11.51) \| Then another. (14.46) \| Five in total. (15.65) | `map`: into the wall map → polar globe; arcs 1, 2 … 5 |
| 3 | 16.74 | Stanislav Petrov has minutes to report it. (16.89) \| A report could trigger a counterstrike. (19.48) | `chain`: globe holds; the chain-of-command / countdown |
| 4 | 21.76 | But a real attack would be hundreds of missiles, not five. (21.91) \| And the ground radar sees nothing. (25.46) | `hundreds`: wider globe; then radar fans |
| 5 | 27.39 | He calls it a false alarm. (27.54) \| And waits. (29.67) | `false`: the stamp; waiting clock |
| 6 | 30.72 | He was right. (30.87) \| Sunlight on high clouds had fooled the satellites. (32.07) | `orbit`: zoom out: Sun, satellite, glint |
| 7 | 34.82 | Would you have trusted the computer? (34.97) | `question`: card |

(Beat boundaries come from timeline.json `scenes`; phrase times are from `lines[].phrases`.)

## Scenes (one focal point per beat; labels ≥ 1.5 s; entrances ease out 0.3–0.6 s, exits faster; key visuals hold ≥ 0.8 s)

**s00-hook.js** (no captions, no chapter, `overlayIn: false`)
- Headline **1 MAN** STOPPED / A **NUCLEAR WAR** (accent words in alarm red), fitted ≤ 940 px, band y ≈ 260–520, readable on frame 1.
- Under it, the СТАРТ board fills the frame: flicker-free, a slow pulse of the red lamp (no strobing faster than ~1.5 Hz), CRT scanline texture done subtly.
- Phrase 1 ("refusing to believe a computer", 3.68): a small tag on the board: "COMPUTER: LAUNCH DETECTED · RELIABILITY HIGH".

**s01-bunker.js**
- The pull-out to the room. Labels: "26 SEP 1983" and "SERPUKHOV-15 · NEAR MOSCOW" (or "SECRET BUNKER · NEAR MOSCOW"); the wall clock reads 00:14 → 00:15 on "Just after midnight" (10.07).
- An empty duty-officer chair facing the board.

**s02-launch.js**
- The match-cut from the wall map into the polar globe.
- Arc 1 on "a US missile launch" (≈ 12.6), arc 2 on "Then another" (14.46), arcs 3–5 on "Five in total" (15.65). A counter "1 … 5" with a precise, satisfying tick (no rolling digits; frame-stable).
- Arcs: from the central US (no named base) over the Arctic towards the USSR, with a bright head and a fading trail; they only fly part of the way (they are detections, not impacts).

**s03-chain.js**
- Name card "STANISLAV PETROV · DUTY OFFICER" (clean type, no portrait).
- A countdown "MINUTES TO REPORT" ticking, and on phrase 1 (19.48) a minimal chain: OFFICER → COMMAND → KREMLIN → COUNTERSTRIKE, the last box in red. Keep it readable.

**s04-hundreds.js**
- Phrase 0: the camera widens; hundreds of ghost arcs fan across the pole (a first strike), labelled "A REAL ATTACK: HUNDREDS"; the real five stay bright: "DETECTED: 5".
- Phrase 1 (25.46): the ghosts clear; radar fans sweep along the Soviet border: "GROUND RADAR: NOTHING".

**s05-false-alarm.js**
- A stamp "FALSE ALARM" (with "ЛОЖНАЯ ТРЕВОГА" small under it), landing precisely on 27.6–28.0; the five arcs fade to grey.
- "And waits" (29.67): a clock counting minutes (00:15 → 00:38 compressed) or a slow pulse. Silence feeling.

**s06-sunlight.js**
- The zoom out to orbit (true orientation; scale can be compressed but say nothing false): the Sun's light from one side, the Oko satellite high above, rays glancing off high clouds over the US into the satellite's sensor.
- Labels: "SUNLIGHT ON HIGH CLOUDS" and "WHAT THE SATELLITE SAW: 5 LAUNCHES".

**s07-question.js**
- Adapted from ep 24's s13-question.js: opaque card from its first frame, WOULD YOU HAVE / TRUSTED THE COMPUTER?, two choices: **A) YES, IT'S THE PROTOCOL** and **B) NO, I'D TRUST MY GUT**, lit in turn as the line is spoken. The globe stays visible below.

## Layout rules
- Fit every line with `L.fitSize`.
- Nothing important at x > 940 below y 1100. Bottom y > 1580 clear.
- HUD band y < 340 (chapter card top left).
- Caption band y 1380–1520 (`captionY` 1450): keep subjects out of it.
- Guard `arc()` radii with `Math.max(0, r)`. No `Math.random`. Loops bounded by the screen.
- Avenir has no arrows: draw them.
- Frame-stable counters: `Math.round(v.gt * 30) / 30`, digits drawn whole.

## Ownership
Builders own **only** their files. Do **not** edit `engine/*`, `episode.json`, any `.md`, or other groups' scenes. `camera.js` and `env.js` belong to the setup agent, then to the orchestrator. Put shared needs in "sharedRequests" in your final report.

Shots: `node engine/node/shots.mjs ZoomOut/episodes/25-the-man-who-saved-the-world --name <unique> --times …` (add `--sub 8` for fast moves). Delete your old shots.
