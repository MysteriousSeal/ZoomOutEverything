# Creative brief — Zoom Out 09: How Much Water Is on Earth, Really? (60 s)

**North star:** *Make a dynamic 60-second motion graphics video that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*
Read `../../../MOTION-PRINCIPLES.md` and `../../../engine/README.md` first. Finished references: `../03-how-deep-is-the-ocean/scenes/`, `../01-a-billion-dollars-in-cash/scenes/`.

## The film

The classic USGS water-spheres idea, told as motion:
- The oceans **lift off** the globe as streams of light and pull together into one water ball beside Earth: 1,385 km, less than half the Moon's width, a small blue bead.
- That ball drains to the **liquid fresh water** (273 km).
- Beside it, the **lakes and rivers** ball (56 km), roughly the width of London.
- Back out to the blue planet with its three beads.

**World:** metres, Earth at the origin. `env.js` draws space, stars and a lit Earth sphere, and exports `sphere(c, v, x, y, d, colour, opts)` for every water ball and the Moon outline, plus `R_EARTH` and `SUN_DIR`. `camera.js` exports `ALL`, `FRESH`, `LAKES` (x, y, d) and `MOON_CMP`.

**Look:** premium "earth-science documentary" style. A refined Earth (s00 draws continents over env's ocean sphere: simplified but recognisable landmasses, soft cloud wisps, terminator), glassy water spheres (deep blue, inner caustic shimmer, a specular highlight, a thin rim), thin dimension lines and small sans labels. Accent `[80, 180, 255]`. No cartoon faces or emoji.

**Motion:** liquid and graceful. Streams arc off the globe, swirl and converge; spheres wobble and settle like water (subtle surface oscillation). The fresh-water ball separates out of the big ball (the rest dims away). Every size gets a `dimension()` line. One focal point per beat.

## Timing (build/timeline.json, ~59.8 s)

Beats start at: 0.0, 3.9, 7.7, 14.6, 17.5, 22.3, 25.3, 28.6, 35.2, 39.6, 43.3, 49.9, 52.9.

Camera:
- **0–1:** Earth
- **2–3:** Earth + the forming ball
- **4:** the ALL ball
- **5:** ALL + Moon outline
- **6:** Earth + bead
- **7:** the ALL ball draining
- **8:** FRESH
- **9:** FRESH + LAKES
- **10–11:** LAKES (115 m/px) with London's outline
- **12:** back out to Earth + the three beads

## Scenes

- **s00-hook.js** (no captions, no chapter): draws the **continents** on env's Earth for the WHOLE film (in drawWorld, every frame; true size R_EARTH, rotating very slowly; front hemisphere only), plus a soft cloud layer. Headline `HOW MUCH WATER` / `IS ON EARTH?` with "WATER" in accent, readable ≥ 1.2 s.
- **s01-seventy-one.js:** the ocean areas glow and pulse; a ring counter to 71%. Label "71%" / "of the surface is ocean".
- **s02-every-drop.js, s03-one-ball.js:** streams of light lift off oceans, ice caps, lakes, rivers and clouds (use the phrase timing to name each source as it lifts), arc out and converge at `ALL`, forming a sphere.
- **s04-1385-km.js:** the ALL sphere settles; a dimension line. Label "1,385 km" / "860 mi · every drop of water".
- **s05-moon.js:** a grey Moon outline (3,474 km) at `MOON_CMP` beside the ball, with comparison brackets. Label "< ½ the Moon".
- **s06-bead.js:** pull back; Earth plus the small bead; a subtle callout.
- **s07-fresh.js, s08-273-km.js:** most of the ball (salt water and ice) dims or drains away; the 273 km liquid-fresh-water sphere at `FRESH` remains. Label "273 km" / "170 mi · liquid fresh water".
- **s09-lakes-rivers.js, s10-56-km.js:** the 56 km sphere at `LAKES` appears beside it, then a zoom with **London's outline** (simplified Greater London boundary, ≈ 50–60 km across, true scale) overlaid on it. Label "56 km" / "35 mi · every lake and river".
- **s11-life.js, s12-blue-planet.js:** a gentle glow on the small sphere ("so much of life depends on it"), then the pull-back to the blue planet with its three beads and a final hold.

## Ownership

Builders own **only** their scene files. Do **not** edit `engine/*`, `camera.js`, `env.js`, `episode.json`, any `.md`, or other scenes. Shared needs go in "sharedRequests".
