# Creative brief: Zoom Out 28, "How to Survive a Riot" (How to Survive #2, ≈ 59.0 s)

**North star:** *Make a dynamic motion-graphics film that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.* Tone: tense, clear, calm authority. Each step must read without sound. No violence shown.

Before you start:
- Read `../../../MOTION-PRINCIPLES.md`, `../../../engine/README.md`, `engine/runtime/lib.js`, `engine/runtime/kit.js`.
- Then read `camera.js` and `env.js` in this folder (once they exist).
- **Series consistency:** this is How to Survive #2. Reuse ep 27's STEP badge and safety-card pictogram (`../27-how-to-survive-a-nuclear-blast/env.js`: `stepBadge`, `pictoDrop`): copy them into this env (don't import across episodes) and keep the same look. Ep 27's `scenes/s07-question.js` is the question-card reference.
- Facts: `script.md` → FACT-CHECK. Every word on screen must match it.
- **Times:** always from `build/timeline.json` (beat starts and `lines[].phrases`); never hard-code.

## Format
- No preroll. Beat 0 is the hook: headline readable on **frame 1**.
- No episode number: the top bar reads `ZOOM OUT · HOW TO SURVIVE A RIOT` (automatic).

## The film

**One continuous camera over a top-down city block** (a realistic night street plan seen from directly above: building footprints with rooftop detail, a plaza, a wide avenue narrowing into a side street, fences/barriers, a wall, an underpass, street lamps casting pools of light, parked cars from above).
**The crowd = thousands of glowing particles** moving by a deterministic crowd simulation (flow fields + density): calm drifting, then the mood turns, then surges propagate as visible density waves; a density heat colour (cool → amber → red at ≥ 5 people/m²). Elegant, realistic, data-like. **No human figures in the crowd.** One highlighted particle is "you" (a white ring marker, label YOU), and the camera follows it through the steps.

1. Hook: the crowd seen from above, density waves pulsing red at a pinch point; headline.
2. STEP 1 LEAVE EARLY: the mood turns (colour shifts, a few hotspots); "you" walks away from the core; a phone/camera glyph crossed out: DON'T STOP TO FILM.
3. STEP 2 STAY AT THE EDGES: the walls, fences and the narrow street light up red as crush zones; "you" stays on the edge near an exit.
4. STEP 3 GO WITH THE SURGE: a surge wave travels through the particles; "you" moves with it, then steps sideways/diagonally between waves (a dashed zig-zag path to the edge).
5. STEP 4 ARMS UP: cut to a clean safety-card pictogram card (boxer's stance, arms folded in front of the chest, a breathing-space bubble at the chest), over the dimmed map.
6. STEP 5 IF YOU FALL: pictogram: get up; then the side-curl pose with arms over the head.
7. STEP 6 TEAR GAS: a gas cloud drifts on the map with a wind arrow; "you" moves upwind and uphill (contour lines show the slope); an eye + water-drop glyph: DON'T RUB · FLUSH WITH WATER.
8. STEP 7 GET INDOORS: "you" enters a building footprint; windows on its edge marked red: AWAY FROM WINDOWS.
9. The question card.

**Look:** night city in deep blue-black, warm sodium light pools, crowd particles warm white, density heat amber → red, safe/exit routes green, civil-defence yellow STEP badges (ep 27). House fonts. Pictograms only in the ep 27 safety-card style.

## Timing (build/timeline.json, 59.00 s)

| beat | start | line |
|---|---|---|
| 0 | 0.00 | If a crowd turns into a riot, \| the biggest danger often isn't the violence. \| It's the crowd itself. |
| 1 | 8.02 | Step one: leave early. \| The moment it turns, walk away. Don't stop to film. |
| 2 | 14.91 | Stay at the edges. \| Avoid walls, fences and narrow streets: that's where people get crushed. |
| 3 | 22.62 | If the crowd surges, \| don't fight it. \| Go with it, and drift sideways between waves. |
| 4 | 29.30 | Arms up, like a boxer. \| Protect your chest, so you can keep breathing. |
| 5 | 34.83 | If you fall, get up fast. \| If you can't, curl up on your side and cover your head. |
| 6 | 41.47 | Tear gas? \| Move upwind and uphill. \| Don't rub your eyes: flush them with water. |
| 7 | 48.23 | Once you're out, get indoors, \| away from windows. |
| 8 | 52.23 | Have you ever been in a crowd that turned? \| Tell me in the comments. |

## Scenes
- s00-hook.js (no captions, no chapter, `overlayIn: false`): headline THE CROWD / **IS THE DANGER** (accent), fitted ≤ 940 px, band y ≈ 260–520, readable on frame 1.
- s01-leave.js, s02-edges.js, s03-surge.js, s04-arms.js, s05-fall.js, s06-gas.js, s07-indoors.js: one STEP each (STEP 1 … STEP 7), as above.
- s08-question.js: opaque card from its first frame: HAVE YOU EVER BEEN IN / A CROWD THAT TURNED?, pills A) YES, IT WAS SCARY and B) NEVER, lit in turn, then TELL ME IN THE COMMENTS on phrase 1; holds to the end.

## Layout rules
- Fit every line with `L.fitSize`. Nothing important at x > 940 below y 1100. Bottom y > 1580 clear.
- HUD band y < 340. Caption band y 1380–1520 (`captionY` 1450): keep subjects out of it.
- Guard `arc()` radii. No `Math.random` (seeded RNG only; the crowd sim must be a pure function of time, so every frame renders identically in any order and in parallel workers: precompute or use closed-form motion). Loops bounded. Draw arrows.

## Ownership
Builders own only their files. Don't edit `engine/*`, `episode.json`, `.md` files or others' scenes. `camera.js` and `env.js` belong to the setup agent, then the orchestrator.

Shots: `node engine/node/shots.mjs ZoomOut/episodes/28-how-to-survive-a-riot --name <unique> --times …` (`--sub 8` for fast moves).
