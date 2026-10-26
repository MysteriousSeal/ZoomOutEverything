# Creative brief — Zoom Out 11 (What If): What If the Moon Disappeared? (60 s)

**North star:** *Make a dynamic 60-second motion graphics video that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*
Read `../../../MOTION-PRINCIPLES.md` and `../../../engine/README.md` first. Finished references: `../06-how-high-is-space/` (side-view world with a globe pull-back; this film is its cousin) and `../08-how-fast-is-light/` (true-scale Earth and Moon).

## The film

The film is **one continuous pull-back**:
- A calm **night beach** under a full Moon. The Moon **blinks out**, and the beach goes dark.
- Three beats on that beach: the dark, the flashback to moonlight, and the drop to "100× darker".
- Then the camera **rises off the sand**: the horizon curves, city lights glitter on the night side, and the beach becomes a point on the limb of **the globe**. Tides, eclipses and the tilt play out on the globe.
- The twist: the camera pulls out to the **Earth–Moon system at true scale**. The Moon is back, and its orbit is **slowly widening**: 3.8 cm a year, about as fast as fingernails grow.

## World, units and helpers

**WORLD:** side view, in metres. `x` runs horizontally (sea to the right, land to the left). `y = −altitude`, so up is negative.
- Mean sea level is the top of a circle of radius `R_EARTH` centred at `EARTH = (0, +R_EARTH)`.
- The shoreline is at `x = 0`.
- The beach is on the globe's **top limb**, on the **night side**. The Sun lies to the **lower-left** (`SUN_DIR`). The real `MOON` sits 384,400 km to the **upper-right** (`MOON_DIR = −SUN_DIR`, a full Moon), which is also where the sky-Moon hangs over the sea in the beach shots.

**`camera.js` exports:**
- `R_EARTH`, `R_MOON`, `D_MOON` (3.844e8), `RECEDE` (0.038 m/yr)
- `EARTH`, `MOON`, `MOON_DIR`, `SUN_DIR`
- `KEYS`, `at`

**`env.js` exports:**
- `ACCENT` and everything above.
- `moonlight(v)`: 0..1. This is the light on the beach. It drives the sky, sand, sea, stars and Milky Way.
  - beat 0: 1, then gone at `BLINK` = 1.62 s into beat 0
  - beat 1: 0
  - beat 2: back to 1 over t 0.25–1.35
  - beat 3: falls over t 0.3–3.7
  - after beat 3: 0
- `drawSkyMoon(c, v, {k, s, x, y})`: the full-Moon disc in the sky, in screen space. **Env never draws the disc. Scenes own it** (s00 draws it until the blink; s02/s03 draw it with `k: moonlight(v)`). Env only draws the moon halo, scaled by `moonlight`.
- `SKY_MOON` `{x: 770, y: 470, r: 54}`, `BLINK`, `beatAt(tl, gt)`
- `terrain(x)`: beach ground height in m. The wet sand is a 1:6 slope, the dune crest is ~4.2 m at x ≈ −9.5, and the seabed drops to ~10 m by x ≈ 20.
- `seaLevel(x, gt)` (gentle waves), `shoreX(gt)` (swash line)
- `skyK(v)`: 1 at the beach, 0 off the ground. `spaceK(v)`: 0 at the beach, 1 at globe scale.
- `globePx(v)` → `{cx, cy, r}` and `moonPx(v)` → `{cx, cy, r}` (true size).

**Env already draws:**
- the night sky gradient, two star layers and a Milky Way that brightens when the Moon is gone
- the beach in section: dune with grass, sand, the sea and seabed, moonlight shafts, glints and foam
- horizon airglow on the rise
- a screen-bounded LOD **city-lights** layer on the night-side continent
- the **globe**: ocean with sun glint, a continent whose coast runs through the beach, small islands on the day side, terminator, atmosphere rim
- HUD: `topBar` and an adaptive `scaleBar` (5 m on the beach, 100,000 km at the end)

## Look

A premium night-time documentary. Moonlight silver-blue, deep navy and black, warm sodium city lights. The accent `[175, 195, 255]` is used for numbers, lines and highlights. Silhouettes are refined, never cartoonish: no faces, no emoji. Exaggerations (tidal bulge, ghost orbit rings) must **say so on screen** ("exaggerated", "at today's rate").

## Motion

- The camera is the signature (keys in `camera.js`): you animate subjects, not the camera.
- Each beat has one focal point. Labels stay readable for ≥ 1.5 s, and hold ≥ 0.8 s after the key visual lands.
- Nothing pops: entrances ease out (0.3–0.6 s), and exits are faster.
- Hits land on narration words (see `build/timeline.json` → `lines[].phrases`).

## Timing (build/timeline.json, 59.6 s; "|" = pause, see `phrases`)

Beats start at: 0.0, 3.87, 6.82, 11.1, 16.02, 21.02, 26.6, 30.24, 35.13, 39.87, 44.26, 49.02, 54.14.

| beat | line | camera |
|---|---|---|
| 0 | What if the Moon suddenly disappeared? | beach, 0.0255 → 0.030 m/px; shoreline at (430, 1140) |
| 1 | The first thing you'd notice would be the nights. | 0.034 m/px, a touch more sky |
| 2 | Today, a full Moon lights the land with reflected sunlight. | 0.033 m/px |
| 3 | Without it, \| ~100× darker | 0.041 m/px, slow pull-back |
| 4 | Then the tides. \| The Moon does most of the pulling… | **the big pull-back** (travel 2.5 s) to the globe: centre (540, 790), r ≈ 344 px (1.85e4 m/px) |
| 5 | With only the Sun left, \| … a third of today's biggest | globe, 1.75e4 m/px |
| 6 | total solar eclipses gone | globe drifts: centre (600, 740), 1.65e4 m/px |
| 7 | The Moon also steadies Earth's tilt, \| seasons | globe (540, 790), 2.05e4 m/px (room for the axis) |
| 8 | Without it, \| … wobble far more | 2.15e4 m/px |
| 9 | Over millions of years, \| seasons could go haywire | 2.05e4 m/px |
| 10 | But here's the twist: \| the Moon is already slowly leaving us | **pull-out** (2.1 s) to the Earth–Moon system: Earth at (230, 1120) r ≈ 15 px, Moon at ≈ (790, 400) r ≈ 4 px, 4.2e5 m/px |
| 11 | Every year, \| … 3.8 cm farther away | hold, gentle push |
| 12 | … as fast as your fingernails grow | slow final pull-out (push 1.04) |

## Scenes

Stubs exist for every scene. Replace them entirely.

- **s00-hook.js** (no captions, no chapter):
  - Draw the sky-Moon with `drawSkyMoon` and make it **blink out at `BLINK`**. Ideas: a soft implosion, a last flare, then a faint after-image ring that fades. Land a `deep`/`impact` hit, then near-silence. The beach light drop is env's (`moonlight`).
  - Headline `WHAT IF THE MOON` / `DISAPPEARED?` ("DISAPPEARED?" in the accent), readable ≥ 1.2 s and clear of the Moon at (770, 470). The stub puts it at y 780–930. Keep it above the dune line (y ≈ 1000).
- **s01-the-nights.js:** the dark beach is the focal point. Let the eye adjust: the stars and the Milky Way come out (env already brightens them). A subtle beat-long detail is optional, for example the faint swash line still glinting. Keep it sparse: one focal point.
- **s02-moonlight.js:** the Moon returns (`drawSkyMoon` with `k: moonlight(v)`). Show "reflected sunlight" with a light ray from off-screen bouncing off the Moon down to the sand. Label "≈ 0.2 lux" / "full Moon · reflected sunlight".
- **s03-hundred-darker.js:** the Moon fades with `moonlight`. A refined lux meter (log scale, 1 → 0.001) drops from ~0.2 to ~0.002 as the beach darkens. Label "100× darker" / "starlight only · ~0.002 lux".
- **s04-tides.js, s05-one-third.js:** on the globe, the ocean's tidal bulge is an exaggerated, translucent ellipse of water around the globe, labelled "exaggerated". Tag it with the Moon's ghost or an arrow toward `MOON_DIR` and a small Sun arrow toward `SUN_DIR`. s04 lands the bulge as the pull-back settles (~18.4 s), on "most of the pulling". In s05 the Moon's share fades and the bulge relaxes to the Sun-only third. Label "≈ 1/3" / "of today's spring tides". s04 may export a `bulge()` helper for s05.
- **s06-eclipses.js:** a ghost Moon on the Sun side (lower-left, illustrative) casts its umbra and penumbra onto the day side. The shadow dot sweeps across, then the ghost and shadow dissolve. Label "0 eclipses" / "total solar eclipses: gone".
- **s07-tilt.js, s08-wobble.js:**
  - s07: Earth's axis draws through the poles at 23.4° from vertical, with polar ticks and a thin arc. Today's range (22.1–24.5°) is a narrow wedge. Label "23.4°" / "today: 22.1°–24.5°".
  - s08: the axis swings much wider and the wedge opens. Label "far wider swings" / "in many models, over millions of years". **Never** state 0–85° as fact.
  - s07 exports `drawAxis()`. s09 may import it (import only).
- **s09-seasons.js:** a time-lapse on the globe. The polar ice caps grow and shrink, or the lit hemisphere sweeps, at haywire amplitude. A small "millions of years" counter. One focal point.
- **s10-leaving.js:** the true-scale Moon (refined, lit from `SUN_DIR`, min ~4 px with a glow) fades back in at `MOON` as the camera pulls out. Its orbit ring (radius `D_MOON` around `EARTH`) draws in. Land it on "already slowly leaving us" (~46.3 s). Label "384,400 km" / "238,900 mi". s10 draws the Moon and the ring for the **rest of the film** (beats 10–12): keep them in `drawWorld` for `v.t ≥ 0`.
- **s11-3-8-cm.js:** the orbit **widening**: ghost rings expand outward ("at today's rate: +38,000 km per billion years") and the Moon nudges outward. The big number "3.8 cm / year" (sub "1.5 in · measured by lasers") lands on "three point eight" (~50.8 s).
- **s12-fingernails.js:** a refined fingertip silhouette with a nail growing beside a 3.8 cm ruler, as an overlay over the slow final pull-out. "≈ the speed fingernails grow". End on a composed still (the cover may come from here).

## Ownership

Builders own **only** their scene files. Do **not** edit `engine/*`, `camera.js`, `env.js`, `episode.json`, any `.md`, `build/timeline.json`, or other scenes. Shared needs go in "sharedRequests". You may import exported helpers from other scenes in your group or an earlier group (import only, never edit).
