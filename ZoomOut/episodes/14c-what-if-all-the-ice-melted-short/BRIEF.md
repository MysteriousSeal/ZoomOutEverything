# Creative brief — Zoom Out 14: What If All the Ice Melted? (60 s, series "What If")

**North star:** *Make a dynamic 60-second motion graphics video that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*

Read `../../../MOTION-PRINCIPLES.md` and `../../../engine/README.md` first. Finished references:
- `../06-how-high-is-space/scenes/`: landmark silhouettes, the side-view world, a globe pull-back
- `../09-how-much-water-is-on-earth/scenes/`: globe overlays, refined labels

## The film

One continuous journey over a **real globe**:
1. A single ice cube pulls back into Antarctica (90% of the world's ice, more than 4 km thick).
2. The ice caps melt as the planet turns to the Atlantic.
3. The camera **dives into the top edge of the globe** and lands side-on beside the Statue of Liberty, as the sea rises 70 m almost to her chest.
4. It climbs back out and glides over Florida, Europe (Venice, Amsterdam) and Shanghai. Every place is visibly drowned, then every coastline on Earth glows as it is redrawn.
5. **Reveal:** the sea drains back and keeps falling. At the last ice age, 20,000 years ago, it was 120 m lower: the English Channel and the Bering Strait are dry sand, and you could walk across.
6. End: the sea returns to today. "Coastlines aren't fixed. The ice decides where they are."

## World, units and helpers

- **The globe is drawn by env.js for you, per pixel, from real data** (`data/etopo6.bin`: NOAA ETOPO1 on a 0.1° grid).
  - Land has hypsometric tints plus hillshade relief. The ocean is shaded by depth. The present ice caps (Antarctica, Greenland) are white. There is an atmosphere rim and stars.
  - **The sea level is a threshold**: `seaLevel(v)` (metres, relative to today) is applied every frame.
    - Newly flooded land glows as **mint shallows**.
    - Newly exposed sea floor turns to **sand** (`SAND`).
    - The coastline itself glows in the accent when `coastK(v)` > 0.
  - **Do not redraw coastlines or flood areas yourself**: they are already there and honest. Your job is the story layer (labels, pins, slices, ice sheets, meltwater, paths) on top.
- **World coordinates (metres), side view.** The sphere (radius `R_EARTH`) is centred at `(0, R_EARTH)`.
  - The **face centre** is `(0, R_EARTH)`: whatever place the current view centres on is drawn there, top-down.
  - The **top limb** is `(0, 0)` with `y = −elevation`. In the New York views (`nyLimb`), Liberty Island sits exactly on the top limb, so the statue is drawn **side-on at x ≈ 0, standing on y = −3 (island ground)**.
- **The orientation of the globe changes with time** (camera.js `view(gt, tl)`, slerped between `VIEWS`). Always place things on the globe through the helpers, never with fixed world coordinates:
  - `project(v, lat, lon, elev?)`: screen `{x, y, z}`. `z > 0` means it faces us, so cull or fade when `z` approaches 0.
  - `geoPath(c, v, [[lat, lon], …], close?)`: traces a lat/lon polygon or polyline on the sphere (subdivided; far-side points clamp to the limb). Use it for ice-sheet extents, outlines and walking paths.
  - `globeDisc(v)` → `{x, y, r}` on screen · `viewOf(v)` · `worldOf(view, lat, lon, elev)` · `elevation(lat, lon)` (bilinear, metres) · `isIce(lat, lon)`.
  - `sideK(v)`: 0..1, how much the frame is in the New York side view. The globe raster becomes sky and sea cross-section there.
- **Story state** (pure functions of time, from env.js):
  - `seaLevel(v)` / `seaAt(gt, tl)` / `seaKeys(tl)` / `SEA = {rise: 70, lgm: -120}`:
    - +70 rises over 19.86–22.76
    - drains to 0 over 38.67–40.77
    - falls to −120 over 45.32–47.82
    - returns to 0 over 54.12–56.92
  - `iceK(v)`: Antarctica and Greenland ice melts over 16.53–18.53 and returns over 38.67–40.67.
  - `coastK(v)`: coastline glow in beat 8 phrase 2 and in beat 12.
- **Places and constants** (from env.js):
  - `PLACES`: `pole`, `liberty`, `florida`, `orlando`, `miami`, `venice`, `amsterdam`, `europe`, `shanghai`, `channel`, `bering`, each `{lat, lon}`.
  - `LIBERTY`: metres above sea level: `ground 3`, `pedestalTop/heel 49.9`, `chest 71`, `head 83.8`, `torch 96`.
  - `ACCENT`, `SAND`, `R_EARTH`, `VIEWS`.
  - `shotAt(gt, tl)` → `{name, start, end, travel, p}` for timing to the camera. `shotStart(name, tl)`.
- **Side view (beats 4–6):**
  - env.drawBackground paints a dusk sky above the horizon and the sea's cross-section below `y = 0`.
  - **env.drawForeground draws the risen sea** (`y = −seaLevel` down to the bottom) as translucent water **in front of all scenes' drawWorld**, with a mint surface line. So the statue is genuinely submerged; don't draw your own water there.
- **HUD (env):**
  - topBar.
  - A scale bar (beats 0–3, carries the cube-to-continent pull-back).
  - From beat 4 on, the **SEA LEVEL readout** at the top right (`+70 m` in accent, `−120 m` in sand, with feet and an era tag: TODAY / ALL LAND ICE MELTED / 20,000 YEARS AGO).
  - Keep your labels clear of it (x > 700, y < 350).

**Look:** a premium earth-science documentary.
- The real-data globe is the star. Overlays are thin, precise and sparse:
  - hairline leaders, small tracked caps, `L.bigLabel` in the accent;
  - city pins as a small ring plus dot, drawn with a soft dark halo so they read over relief.
- The ice is glassy white and blue, with crisp edges and subtle internal cracks.
- The statue is an accurate, refined patina-green silhouette (pedestal, robe, raised torch arm, crown rays). Scale it from `LIBERTY`.
- No cartoon faces, emoji or arrows (Avenir lacks `→`: draw a line or use words).

**Motion:**
- The camera journey is the signature, and it is already built. Don't fight it: let things appear as they arrive, and hold.
- Labels ease in 0.3–0.6 s after the camera settles and stay ≥ 1.5 s.
- One focal point per beat.
- Pins pulse once on arrival.
- Anything on the globe must ride the rotation through `project`/`geoPath`, never a fixed screen position.

## Timing (build/timeline.json, 60.86 s; "|" = pause, see `phrases`)

Beat starts: 0.00, 3.30, 8.39, 12.61, 16.28, 22.07, 25.89, 29.63, 33.32, 38.37, 41.24, 48.83, 53.92.

| beat | line | camera shots (start s → arrival) |
|---|---|---|
| 0 | What if all the ice on Earth melted? | `cube` 0.0: South Pole face centre, 0.1 mm/px (3 cm cube ≈ 300 px), slow pull-back |
| 1 | Now zoom out from a single ice cube, \| all the way to Antarctica. | `zoom-out` 3.30 → ~7.0: 7.8 decades of pull-back to 5.9 km/px |
| 2 | Antarctica holds about ninety percent of the world's ice. | `antarctica` 8.39: continent ≈ x 160–960, y 560–1250 at 6.5 km/px; label room above (y 330–520) |
| 3 | In places, it's more than four kilometers thick. | `thickness` 12.61: continent moves up (≈ y 280–720, 7.6 km/px); **y 780–1240 is free for the section** |
| 4 | If all the ice on land melted, \| the oceans would rise about seventy meters. | `globe-turn` 16.28 → 18.4: whole globe (15.5 km/px), turning from the pole to the `nyLimb` view while the ice melts. `dive` 18.56 → ~20.8: plunge into the top limb to the statue (0.15 m/px; sea level at y ≈ 1180, torch ≈ 540, statue x ≈ 430). The sea rises 19.86 → 22.76 |
| 5 | That's almost up to the chest of the Statue of Liberty. | `liberty` 22.07: gentle push to 0.128 m/px around the chest |
| 6 | Most of Florida \| would be underwater. | `to-florida` 25.36 → ~27.9: climb out (peak 9 km/px) and glide to Florida, face-on, 1.6 km/px |
| 7 | Venice would vanish. \| So would Amsterdam. | `europe` 28.88 → ~30.8: Europe face-on, 2.3 km/px. Venice and Amsterdam both in frame (get positions from `project`) |
| 8 | Shanghai, too. \| Every coastline on Earth would have to be redrawn. | `shanghai` 32.62 → ~34.5: Yangtze delta, 1.9 km/px. `every-coast` 35.00 → ~37.6: pull back to the whole globe (Asia), slow spin, coastline glow |
| 9 | But the sea has moved the other way, too. | `to-arctic` 38.37 → ~40.6: whole globe turns to the North Pole view (Europe at the bottom, Bering at the top, North America on the left); the sea drains to 0 |
| 10 | Twenty thousand years ago, at the peak of the last ice age, \| the sea was about one hundred twenty meters lower. | `ice-age` 41.24: Arctic view push, 9.4 km/px. The sea falls 45.32 → 47.82 |
| 11 | You could have walked from France to England, \| or from Siberia to Alaska. | `channel` 48.38 → ~49.8: Dover Strait face-on, 2.5 km/px. `bering` 51.19 → ~53.0: across the Arctic to Beringia, 3.2 km/px |
| 12 | Coastlines aren't fixed. \| The ice decides where they are. | `not-fixed` 53.92 → ~56.5: pull back to the North Atlantic globe, slow spin; the sea returns to 0 by 56.9; coastline glow |

## Scenes

- **s00-hook.js** (no captions, no chapter):
  - A refined ice cube (≈ 3 cm, true size, world-space at the face centre `(0, R_EARTH)`) on a dark slate/stone table: top-down with a slight 3/4 bevel, internal bubbles and cracks, a specular edge, a small meltwater puddle that grows slowly.
  - The table is an opaque world-space plane covering the screen at small mpp; fade it by mpp so s01 can dissolve it.
  - Headline `WHAT IF ALL THE` / `ICE MELTED?` with "ICE MELTED?" in the accent, masked rise, readable ≥ 1.2 s, kept above the cube (y 380–600).
- **s01-zoom-out.js:** owns the dissolve during the 7.8-decade pull-back.
  - The table and puddle fade out (≈ mpp 0.002–0.02) into a white, sastrugi-textured ice field (procedural, bounded by the screen, scale-aware).
  - That fades out as the real ice sheet takes over (≈ mpp 50–500).
  - The cube stays as a tiny glint until it is sub-pixel.
  - A light sweep can cross the continent when it lands on "Antarctica".
- **s02-ninety-percent.js:**
  - The ice sheet gets a cool rim glow (`geoPath` along the 60°S circle, or the continent itself via a soft glow).
  - A refined "≈ 90%" device: e.g. a thin ring gauge filling to 90%, or 10 tiles with 9 lit. Keep it to one device.
  - Label "≈ 90%" / "of the world's ice".
- **s03-thickness.js:**
  - A profile line draws across the continent (e.g. Ross Sea → South Pole → East Antarctica).
  - A cross-section slab rises from it into the free area below (y 780–1240): glassy ice on dark bedrock, sea level marked, vertical scale exaggerated with a small "vertical scale × 100" note.
  - A dimension bracket "4 km+".
  - Label "4 km+" / "13,000+ ft thick in places".
- **s04-seventy-metres.js:**
  - Phrase 1: the white caps melt as env fades them (`iceK`). Add meltwater streams and sparkles running off Antarctica's coast into the ocean while the globe turns.
  - Phrase 2, during the dive: a "+70 m" label lands as the water starts climbing at the statue (env draws the water).
  - Optional distant side-view silhouettes (Manhattan skyline at x ≈ +1.5–3 km, low and hazy) to give the horizon depth.
- **s05-liberty.js:** the Statue of Liberty side-on on Liberty Island at x ≈ 0 (ground y = −3, torch tip y = −96), with the star-fort base.
  - **Draw it in drawWorld from beat 4** (`v.t < 0` is fine) so it is there when the dive lands.
  - A dimension/tick at the waterline: "+70 m" / "almost to her chest".
  - Subtle caustic light on the submerged pedestal is welcome (scene-side, under env's water).
- **s06-florida.js:**
  - Pins for Miami and Orlando and a ghosted present-day Florida outline (`geoPath`, hairline, dashed) so the eye sees what was lost.
  - Label "Florida" / "mostly under the sea · highest point 105 m".
- **s07-venice-amsterdam.js:** Venice pin and label on "Venice would vanish", then Amsterdam on "So would Amsterdam" (one focal point at a time; dim the first). Hairline present-day outlines optional.
- **s08-shanghai-coastlines.js:**
  - Phrase 1: Shanghai pin and label.
  - Phrase 2, during the pull-back: env's coastline glow redraws every coast; add a sweeping light band and maybe a small counter-free caption-free flourish.
  - Label "Shanghai" / "about 25 million people".
- **s09-other-way.js:** a "rewind" feel while the globe turns to the Arctic and the water drains (a soft radial sweep, or a reversing ripple). Minimal text.
- **s10-ice-age.js:**
  - Phrase 1: the **Laurentide and Fennoscandian ice sheets** grow over North America and northern Europe as glassy white polygons via `geoPath` (approximate LGM extents), plus a "20,000 YEARS AGO" tag.
  - Phrase 2: the sea falls (env) and the shelves turn to sand. Label "−120 m" / "390 ft lower seas".
  - The ice sheets must stay drawn through beats 11–12 (fade them as the sea returns in beat 12).
- **s11-land-bridges.js:**
  - A dotted walking path France → England across the dry Channel, then Siberia → Alaska across Beringia, each drawing itself with a tiny walker dot.
  - Labels "France to England" / "Siberia to Alaska", one at a time, each ≥ 1.5 s.
- **s12-not-fixed.js:**
  - As the sea returns to today, leave the **−120 m coastline (sand, dashed) and the +70 m coastline (mint, hairline)** as faint outlines on the globe, if feasible. Otherwise just the glow.
  - A final gentle push. Minimal text.
  - Optional end card "ZOOM OUT · WHAT IF".

## Ownership

Builders own **only** their scene files. Do **not** edit `engine/*`, `camera.js`, `env.js`, `data/*`, `episode.json`, any `.md`, or other scenes. Shared needs (camera framing, sea or ice timing, colours) go in "sharedRequests".

Keep per-frame cost low: the env raster already costs ~150 ms. Cull off-screen and far-side work, and never loop over the data grid in a scene. Every `arc()` radius must use `Math.max(0, r)`. Nothing random: use `L.rng` / `L.noise1`.
