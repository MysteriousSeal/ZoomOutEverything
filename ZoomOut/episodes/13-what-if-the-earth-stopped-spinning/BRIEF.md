# Creative brief — Zoom Out 13: What If the Earth Stopped Spinning? (60 s, series "What If")

**North star:** *Make a dynamic 60-second motion graphics video that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*
Read `../../../MOTION-PRINCIPLES.md` and `../../../engine/README.md` first. Finished references: `../06-how-high-is-space/scenes/` (one continuous camera journey), `../09-how-much-water-is-on-earth/scenes/s00-hook.js` (painting on an orthographic globe), `../08-how-fast-is-light/scenes/`.

## The film

**One impossible premise, followed honestly**, as one continuous camera journey with no hard cuts:
1. A spinning globe **brakes to a dead stop** (hook).
2. We **dive** to a street on the equator: you're moving at 1,670 km/h and don't feel it.
3. The planet **stops**: everything loose keeps flying east; then the air tears east at over 1,000 km/h.
4. We **pull back** to the whole planet: the 21 km bulge of water relaxes and the oceans **drain to the poles**, leaving two polar oceans and one ring continent.
5. We **pull out** to Earth's orbit: with no spin, one day lasts a whole year.
6. Reveal: the real Earth **is** slowing. Rewind 400 million years: a year had ~400 days. We **dive back down** into a fossil coral whose daily growth rings recorded it.

## World and units (`camera.js`, re-exported by `env.js`)

Metres, 2D. **Earth's centre is at the origin**, drawn as an **orthographic globe seen equator-on** (north up, east to the right) centred on longitude `LON0` (Ecuador, −78.5°). Consequences everyone relies on:
- The **city** (beats 1–4) is at the **disc centre, world (0, 0)**. At street scale the world is plain local metres: **x = east, y = south (down)**. Build the street around the origin, top-down (satellite/plan view, with a little building parallax if you like).
- The **equator** is the straight line **y = 0** at every scale (env draws it as a dashed accent line with an "EQUATOR 0°" tag, on top of scenes).
- The **poles** are the top (north, −y) and bottom of the disc. A latitude circle projects to a horizontal chord at y = −R·sin(lat).
- `SUN = {x: −AU, y: 0, r}`: the orbit view (beats 9–11) is centred on the Sun; Earth (the origin) sits on the right of the orbit ring at screen x ≈ 944, y ≈ 806. Earth is sub-pixel there: draw your own markers (not to scale, say so if needed).
- `CORAL = {x, y}`: a Devonian fossil-coral site in upstate New York, projected onto the same globe (≈ 0.68 R above the centre). Beat 12's camera ends there at **0.11 mm/px** (frame ≈ 12 cm wide).
- The world origin sits at **screen y ≈ 806** (`anchor 0.42`), so focal content naturally lands in the y 330–1250 band.

Exports: `camera.js`: `R_EARTH, AU, DEG, LON0, SUN, CORAL, project(la, lo) → {x, y, z}` (world metres, z > 0 faces us), `lonAt(gt)` (centre longitude; it spins only in the hook), `SPIN0, BRAKE0 = 1.1, BRAKE1 = 2.45` (the hook brake), `stopTime(tl)` (the planet stops: end of "Stop the planet suddenly," ≈ **14.20 s**), `KEYS`.
`env.js`: everything above plus `ACCENT, V_EQ (1670), SUN_DIR, OCEAN, OCEAN_DEEP, LAND_BASE, SEABED, LAND, ICY, globeGeom(v) → {cx, cy, r, lon0}`, `globeVisible(g)`, `unit(la, lo, lon0)`, `addPoly(c, poly, g)`, `landPath(c, g)`, `latBandPath(c, g, la0, la1)`, `wordTime(tl, li, /re/)` (start time of a VO word), `groundSpeed(v)` (the km/h shown in the HUD).

**What env draws:** space + stars; the Sun (orbit scale); the globe base (ocean gradient, shelf glow, land, ice, arid tints); a multi-scale field/terrain texture on land that carries the dives (mpp < ~4000); then **after all scenes' drawWorld**: globe lighting (night crescent lower-right, limb darkening, atmosphere rim) and the equator line. HUD: top bar, a persistent scale bar, and a **speed readout** (right, y 300–360) that counts up to 1,670 km/h on beat 1's second phrase, drops to 0 at `stopTime`, and leaves at beat 9. Close up (mpp < 20) env fills the screen with `LAND_BASE`; scenes own everything at street and specimen scale.

## Look

Premium earth-science documentary / mission-control infographic: dark space, a refined globe, muted naturalistic land, cyan accent `[90, 220, 235]` for numbers, vectors and the equator. Thin lines, small tracked caps, generous negative space. **No cartoon faces, no emoji, no kid-show bounce.** People and cars are clean minimal silhouettes (top-down). Imperial units on screen next to every metric number. Glyphs: no arrows (→) in Avenir; draw arrow shapes.

## Motion

- One focal point per beat, labels ≥ 1.5 s, hold ≥ 0.8 s after a key visual lands, nothing pops (ease in/out 0.3–0.6 s).
- The camera is the orchestrator's: never fight it, never add your own zoom. Draw everything in world space with `v.wx/wy/ws`.
- Speed at street scale: 1,670 km/h ≈ 464 m/s would cross the frame in a fraction of a frame. Show it as **streaks and motion trails** (long, eased, additive), not literal positions, and keep each streak readable for ≥ 0.8 s.
- Keep focal subjects out of the caption band (y 1280–1390), the HUD band (y < 300, and the speed readout at the top right to y ≈ 360), the bottom 20 % and x > 960 below y 1100.
- Every arc radius: `Math.max(0, r)`. Pure functions of time (`L.rng`, `L.noise1`). Cull what is off-screen; never loop O(world size / mpp).

## Timing (build/timeline.json, 60.1 s; "|" = pause, see `phrases`)

Beats start at: **0.0, 3.1, 9.4, 12.6, 18.9, 23.6, 26.7, 31.3, 34.5, 39.1, 44.5, 48.3, 53.6**. The planet stops at **14.20** (`stopTime`).

| beat | line | camera (key mpp, travel) |
|---|---|---|
| 0 | What if the Earth suddenly stopped spinning? | globe 17 km/px, low in frame (centre y ≈ 1010) for the headline; spins, brakes 1.1–2.45 s, stops |
| 1 | At the equator, \| you're moving at about 1,670 km/h. | **dive** to the street: 0.14 m/px (travel 2.6 s, lands ≈ 5.7 s) |
| 2 | You don't feel it, because everything moves with you. | 0.12 m/px, drifting 6 m east |
| 3 | Stop the planet suddenly, \| anything not bolted down keeps going east… | eases back to 0.2 m/px, 22 m east; a decaying camera jolt at 14.20 |
| 4 | So does the air: winds of more than 1,000 km/h. | district: 3.2 m/px (frame ≈ 3.5 km) |
| 5 | Over time, the oceans would start to move. | **pull back** to the globe: 15.5 km/px (travel 2.3 s); globe spans y ≈ 395–1215 |
| 6 | Spinning makes Earth bulge about 21 km at the equator. | 14.2 km/px |
| 7 | Without it, that water slides toward the poles. | 15 km/px |
| 8 | Two polar oceans, and one giant continent wrapped around the middle. | 14 km/px |
| 9 | And one day would last a whole year: \| six months of daylight, six months of night. | **pull out** to the orbit: 370,000 km/px, centred on the Sun (travel 2.2 s) |
| 10 | The strange part? \| Earth really is slowing down. | orbit, 350,000 km/px |
| 11 | About 400 million years ago, \| a year had roughly 400 days. | orbit, 360,000 km/px |
| 12 | Fossil corals recorded it, \| in their daily growth rings. | **dive** to CORAL: 0.11 mm/px (travel 2.7 s, lands ≈ 56.3 s) |

## Scenes

- **s00-hook.js** (no captions, no chapter): env already spins and brakes the globe. Add the craft: motion streaks / a spin ring around the globe that snap to a stop at `BRAKE1`, a subtle brake shudder flash, cues (whoosh, creak, impact at 2.45 s). Headline `WHAT IF EARTH` / `STOPPED SPINNING?` ("STOPPED SPINNING?" in accent), above the globe (y < 600), readable ≥ 1.2 s, exits before the dive.
- **s01-equator.js:** owns the **city for beats 1–4** (drawWorld every frame, culled when mpp > ~30): a top-down equatorial city around the origin (blocks, roofs with slight parallax, a main street running east–west along the equator line, trees, cars, people as minimal silhouettes). Beat 1 overlay: an east-pointing speed vector and bigLabel "1,670 km/h" / "1,040 mph · at the equator", landing on the number in the VO. Export state helpers for s02–s04 (e.g. car/person positions, `cityK`), import only.
- **s02-dont-feel-it.js:** life goes on: cars and pedestrians move normally; a ghosted "frame of reference" device (everything, including the viewer, carries the same east vector) shows why nothing is felt. No big number.
- **s03-stop.js:** at `stopTime` the ground freezes; everything loose (cars, people, bins, leaves, water from a fountain) keeps going east as long streaks; dust kicks up. Label "1,670 km/h" / "still heading east". Keep it documentary, not gory: abstract silhouettes and trails.
- **s04-winds.js:** the whole atmosphere tears east: dense streamlines and dust/cloud sheets over the district at 3.2 m/px; trees flattened. Label "> 1,000 km/h" / "620+ mph winds".
- **s05-oceans-move.js … s08-one-continent.js** (one builder, the signature visual): repaint the globe surface in drawWorld (clip to the disc via `globeGeom`; env lights it afterwards).
  - s05: the sea surface starts to stir (subtle flow lines from the equator toward both poles).
  - s06: a bulge diagram: the ocean surface vs a perfect sphere (dashed), **exaggerated** and tagged "exaggerated", with a `dimension()` "≈ 21 km" / "13 mi · equatorial bulge" at the equator limb.
  - s07: the water visibly flows poleward (flow lines, receding shoreline); the equatorial sea floor is exposed (`SEABED`).
  - s08: end state: two polar ocean caps (wavy shorelines around ~±45–55°, drowning the high-latitude land) and one continuous ring continent around the middle. Label "2 oceans · 1 continent". Fade the whole effect out during beat 9's pull-out so the real Earth is back for the reveal.
- **s09-day-is-a-year.js:** the orbit diagram: a thin orbit ring around the Sun; Earth (a not-to-scale glyph at true position) travels around it with one face held fixed to the stars, a city marker going from day to night halfway round; ghost Earths at quarter points. Label "1 day = 1 year" / "6 months of light · 6 months of night".
- **s10-slowing-down.js:** the real Earth again: the orbit ring becomes a calendar of 365 day ticks; the Earth glyph spins; a small readout "+ ~2 ms per century". Exports the tick-ring for s11.
- **s11-400-days.js:** a counter rewinds "400 million years"; the ring re-divides to ~400 ticks; small "1 day ≈ 22 h". Label "≈ 400 days" / "in a year, 400 million years ago".
- **s12-corals.js:** the dive lands on a Devonian fossil coral at `CORAL` (horn coral / *Heliophyllum*-like specimen on a limestone slab, ~8–10 cm; draw it for mpp < ~0.05 and fade the outcrop in from mpp ~5). Its fine growth ridges, a highlighted yearly band with ~400 ridges, a magnifier or ruler. Label "~400 rings" / "per year, 390 million years ago" or similar. Final hold ≥ 2.5 s.

## Ownership

Builders own **only** their scene files. Do **not** edit `engine/*`, `camera.js`, `env.js`, `episode.json`, any `.md`, or other scenes. Shared needs go in "sharedRequests". Scenes may import helpers exported by another scene of the same builder group (import only; never edit another builder's file).
