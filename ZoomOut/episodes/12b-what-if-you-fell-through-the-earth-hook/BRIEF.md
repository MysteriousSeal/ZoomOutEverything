# Creative brief — Zoom Out 12: What If You Fell Through the Earth? (60 s, series "What If")

**North star:** *Make a dynamic 60-second motion graphics video that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*
Read `../../../MOTION-PRINCIPLES.md` and `../../../engine/README.md` first. Finished references: `../06-how-high-is-space/scenes/` (the mirror image: one continuous climb), `../03-how-deep-is-the-ocean/scenes/` (a dive), `../08-how-fast-is-light/scenes/`.

## The film

**One continuous vertical dive through a cut-away Earth, then a pull-back.**
- A person steps into a shaft drilled straight through the planet.
- The camera falls with them and zooms out layer by layer: grey crust → dark-red mantle → glowing liquid outer core → white-hot inner core. They pass the centre at ~8 km/s (8× a rifle bullet).
- Gravity flips and the camera pulls back to the whole planet, seen as a cross-section disc in space. The faller coasts to a stop at the far surface (12,742 km) and falls back.
- Reveal: one way takes **~42 minutes**. In the simplest model, a straight tunnel between **any** two cities takes the same 42 minutes, **London to New York** included.

It is an idealised thought experiment (vacuum tunnel, uniform density, no heat). Say so once, quietly, in the hook ("a thought experiment"). Never shout it.

## World, units and helpers

**Side cut-away in metres.** x horizontal; **y = depth below the entry hole (down is +)**.
- Entry hole at (0, 0) on top of the planet. `CENTRE` = (0, R_EARTH). Antipode at (0, 2R).
- The tunnel is the line x = 0 (a 1.2 m shaft, `TUNNEL_HW` 0.6 m).

`camera.js` exports:
- `R_EARTH`, `CENTRE`.
- `RADIUS {surface, moho, cmb, icb}`: boundary radii from the centre.
- `DEPTH {moho 35 km, cmb 2,891 km, icb 5,150 km, centre, antipode}`.
- `V_MAX` (7.9 km/s), `T_HALF` (2,532 s ≈ 42.2 min), `speedAt(depth)`.
- **`fallerDepth(gt)`:** the faller's depth at any global time. It is the film's spine, synced to the VO. Never invent your own.
- `fallerSpeed(gt)`; `tripFraction(depth)`: 0..1 of the one-way trip in *physical* time, for a 0 → 42:00 clock.
- `FALL_BACK {start 43.5, half 4.0}`: from 43.5 s, simple harmonic motion antipode → hole in 4.0 s, forever. `ARRIVE` = 38.0 (reaches the far surface).
- `surfacePoint(angleDeg)`, `NEW_YORK` (−25.05°, left), `LONDON` (+25.05°, right).
- `gravityTrain(A, B, s)`: SHM position along any chord at trip fraction s.
- `DIVE_X`, `DIVE_Y` (the faller's screen point during the dive), `GLOBE`, `CHORD_VIEW`, `KEYS`.

`env.js` draws:
- the dusk sky (near the surface) / space with stars;
- the planet: layers with sharp boundaries, slow world-anchored mottling, crust strata, a CMB glow, an inner-core glow, an atmosphere rim in globe views;
- the tunnel; the **faller marker** (white-hot point with a speed trail) and parallax embers during the dive;
- the HUD: a left "tunnel map" strip (true layer proportions, START / OTHER SIDE, the faller dot + current layer name); a right readout "N km" / "N MI FROM THE HOLE" / "SPEED x KM/S" (beats 1–9); a scale bar from beat 11.

`env.js` exports:
- `ACCENT`, `LAYER {crust, mantle, outer, inner}` (name, col), `colourAtRadius(r)`, `colourAtDepth(d)`, `layerAt(depth)`;
- `drawFaller(c, v, k)`, `fallerMarkerK(v)`, `FALLER_SWAP` [0.05, 0.2] mpp, `FALLER_COL`;
- `tunnelAlpha(v)` (recedes from beat 11), `TUNNEL_HW`.

**Look:** premium geology/physics documentary. Matte rock, emissive heat that rises with depth, thin precise lines, DIN numerals.
- Accent `[255, 140, 70]` is for numbers and key lines. The faller is cool white `[215, 232, 255]`, so it always reads against warm rock.
- No cartoon faces, no emoji, no lava-lamp kitsch.
- The core beats are bright and warm: **every label over the outer/inner core needs a dark backing** (a soft dark plate or a strong shadow). Orange-on-orange fails.

**Motion:**
- The faller is the focal point of every dive beat. It sits at screen (DIVE_X, 620) while the layers stream up past it (the camera follows it).
- Each boundary crossing is timed to the narrator naming the layer: Moho at 9.95 s, CMB at 14.8 s, ICB at 18.55 s, centre at 24.4 s. Hit them with a light flash or ring on the boundary.
- Labels land after the subject is in frame and hold ≥ 1.5 s.

## Timing (build/timeline.json, 60.65 s; "|" = pause, see `phrases`)

Beats start at: 0.00, 3.87, 9.47, 14.14, 18.17, 21.99, 27.72, 31.34, 35.07, 41.50, 45.30, 48.12, 54.00.

| beat | line | camera (mpp = m/px) | faller |
|---|---|---|---|
| 0 | What if you jumped into a hole straight through the Earth? | person at the hole, 6.5 mm/px (ground at y ≈ 1052) | standing, x/pose yours |
| 1 | crust, ~35 km | zoom out to 55 m/px; tunnel at x 330; faller eases to y 620 | 0 → 35 km (Moho at 9.95) |
| 2 | mantle, nearly 3,000 km | 3,200 m/px (curvature in the top corners) | → CMB at 14.8 |
| 3 | outer core, liquid iron | 3,600 m/px, tunnel at x 400 | → ICB at 18.55 |
| 4 | inner core, as hot as the Sun's surface | 2,600 m/px, tunnel centred (x 540) | inside the inner core |
| 5 | pass the center at ~8 km/s | push in to 1,300 m/px | centre at 24.4 |
| 6 | 8× a rifle bullet | 1,700 m/px | R + 1,200 → 2,600 km |
| 7 | gravity flips, slowing you down | follow → globe (15 km/px, Ø 850 px, top ≈ 322, antipode ≈ 1171) over 2.4 s | decelerating |
| 8 | coast up… reach the surface 12,700 km away | globe hold | arrives at 2R at 38.0, then rests |
| 9 | unless someone grabs you, you fall back in | globe | falls back from 43.5 |
| 10 | the whole trip takes about 42 minutes | globe, slight push | reaches the hole at 47.5 (= 42:00 on the clock) |
| 11 | simplest model: any two cities, same time | globe (tunnel recedes, faller fades out) | — |
| 12 | London to New York? Also about 42 minutes | push in to the chord view, 7.4 km/px (chord ≈ y 760, x 175–905) | — |

## Scenes

- **s00-hook.js** (no captions, no chapter). Dusk; the person (1.75 m, true scale, refined silhouette like 06's) stands at the lip of the shaft (x ≈ −1.0 m); ground texture and the lit shaft rim at true scale. On the last ~0.4 s they step in and drop (at beat 1 start they must be at x = 0, depth `fallerDepth`).
  - Keep drawing the person at (0, fallerDepth(gt)) in drawWorld for every frame. Fade them out between `FALLER_SWAP` mpp 0.05 → 0.2 (the env marker fades in over the same range).
  - Headline `WHAT IF YOU FELL` / `THROUGH THE EARTH?` ("THE EARTH?" on an accent bar, masked, readable ≥ 1.2 s), y 420–720, clear of the person. A small tracked line: "A THOUGHT EXPERIMENT".
- **s01-crust.js:** grey crust strata stream up (env). Add the surface lip receding above, rock grain, and a Moho flash at 9.95. Label "≈ 35 km" / "22 mi · continental crust", right of the tunnel (x ≥ 420).
- **s02-mantle.js:** slow convection cells (soft curved arrows/flow lines, world space) in the mantle. Label "≈ 2,900 km" / "1,800 mi of hot rock". CMB flash at 14.8.
- **s03-outer-core.js:** the liquid core: flowing swirls, heat shimmer. Label "liquid iron" / "2,260 km deep · 1,400 mi". The inner core rises into view below.
- **s04-inner-core.js:** the solid inner core ball (crystalline sheen); a thermometer or a Sun-surface comparison chip. Label "≈ 5,200 °C" / "9,400 °F · as hot as the Sun's surface" **on a dark plate**.
- **s05-top-speed.js:** the faller crosses the exact centre (a centre crosshair / ring at 24.4). Speed streaks; a speedometer-like readout. Label "≈ 8 km/s" / "17,700 mph".
- **s06-bullet.js:** comparison: a rifle bullet streak (~1 km/s) vs the faller (~8 km/s) over the same 1 s, as an overlay strip; "≈ 8×" lands on "eight times".
- **s07-gravity-flips.js:** gravity arrows on the tunnel that point back to the centre once past it (they flip on "flips"). A "slowing down" cue via the HUD speed falling; one small label.
- **s08-other-side.js:** on the globe, a dimension bracket along the tunnel "12,742 km" / "7,918 mi · straight through". The faller arrives at the antipode at 38.0: a tiny upside-down person silhouette pops out, with a soft ring.
- **s09-fall-back.js:** the faller drops back in (from 43.5); an oscillation trace (a fading sine-like trail beside the tunnel) suggests "forever".
- **s10-42-minutes.js:** a precise trip clock 00:00 → 42:00 driven by `tripFraction(fallerDepth(gt))` (antipode → hole = one trip; reaches 42:00 at 47.5, on "forty-two minutes"). Big "42 min" / "one way". It is the episode's thumbnail stat: make it gorgeous.
- **s11-any-two-cities.js** and **s12-london-new-york.js** (one builder):
  - s11: 3–4 chords between surface points of different lengths draw across the disc; a capsule rides each with `gravityTrain` and they all arrive **together**. Label "any two cities" / "same ~42 min".
  - s12: the camera pushes to `CHORD_VIEW`. Mark New York (left) and London (right), with the Atlantic arc above and the 5,400 km chord (deepest ~600 km). A capsule makes the trip; a final "42 min" / "London to New York". The faller is gone; the old tunnel has receded.

## Ownership

Builders own **only** their scene files. Do **not** edit `engine/*`, `camera.js`, `env.js`, `episode.json`, any `.md`, or other scenes. Shared needs (camera framing, env changes) go in "sharedRequests". If several scenes need one component (e.g. the trip clock or the gravity arrows), the earliest scene may export it for later ones to import (import only).
