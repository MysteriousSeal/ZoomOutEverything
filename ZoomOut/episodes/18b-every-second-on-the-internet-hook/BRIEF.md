# Creative brief — Zoom Out 18: Every Second on the Internet (90 s)

**North star:** *Make a dynamic 90-second motion graphics video that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*
Read `../../../MOTION-PRINCIPLES.md` and `../../../engine/README.md` first. Finished references for house style and code quality: `../06-how-high-is-space/`, `../08-how-fast-is-light/`, `../12-what-if-you-fell-through-the-earth/`, `../14-what-if-all-the-ice-melted/` (`14` also ray-casts the same ETOPO globe). This film is 90 s, with the same craft and more beats, **not** slower: a payoff every 10–15 s.

## The film

**One continuous top-down zoom, out and back.**
- **Act 1 (0–19 s), the phone:** one phone lights up on a nightstand in a dark New York bedroom. Searches pour out of it: 100,000+ a second, 8 billion+ a day. We tease that "the strangest number comes last".
- **Act 2 (19–46 s), the city:** "Zoom out" takes us to the room, the building, then a city of glowing screens. That gives 4 million emails a second (half spam) and 8 hours of new video a second ("not every minute, every second"). The camera glides across the Hudson to a data-centre campus, then climbs to the region: data centres use ~1.5% of the world's electricity.
- **Act 3 (46–74 s), the planet:** the night globe turns east to France ("as much as France"). Then the whole planet: the data doesn't go through space, it goes **under the sea**, and the cables draw themselves on. That gives 1.4 million km, 35 times around, garden-hose thin, 99% of the traffic.
- **Act 4 (74–90 s), the reveal:** the planet turns home and the camera dives all the way back to the same phone. One day of YouTube uploads takes **82 years** to watch.

## World, units and helpers (read `camera.js`, `env.js`, `geo.js`)

- **TOP-DOWN, metres, north up.** World x = east, y = south (screen down).
- The phone lies screen-up at the **world origin**, axis-aligned to the screen.
- The globe is an orthographic disc whose **centre is the world origin**. The "face" point looking at the camera always sits at (0, 0), and `camera.face(gt, tl)` turns the planet.
  - While the face is HOME (beats 0–9 and 17–18), HOME *is* the origin.
  - During beats 10–16 the planet turns. Place everything on it with `project(v, lat, lon)` or `geoPath(c, v, pts)`.
- **PLAN frame:** the city grid is Manhattan's, rotated 29°.
  - `withPlan(c, v, (c, mpp) => …)` draws in plan metres around the phone (origin = phone, +x across the avenues, +y down the avenues). Line widths there are in metres: use `n * mpp` for n px.
  - Also available: `planToScreen(v, px, py)`, `toWorld`, `toPlan`, `planK(v)` (0 when HOME is turned away: hide plan things).
- **Constants (env/camera exports):**
  - `PHONE {w 0.0716, h 0.1476, r}` (world, centred at 0,0)
  - plan: `NIGHTSTAND`, `ROOM` (4 × 4.5 m, window in the east wall), `BED` (where the bed goes; *not drawn by env*), `BLDG` (the cut-away apartment building), `GRID` (avenues every 260 m, streets every 80 m), `WATER` (Hudson, East River, Upper Bay)
  - `DC_PLAN` / `DC` (the data-centre pad, ~850 × 610 m, plan / world centre)
  - `HOME {lat, lon}`, `R_EARTH`, `DEG`, `CITIES`, `CABLES` (geo.js)
  - colours: `ACCENT [80,170,255]`, `SCREEN` (cool screen light), `WARM` (window / sodium)
- **Helpers:**
  - `elevation(lat, lon)`, `cityDensity(x, y)` (local world metres), `globeDisc(v)`, `homeAt(v)`, `viewOf(v)`, `worldOf(B, lat, lon)`
  - `cableReveal(i, gt, tl)`, `cableZoomK(v)`, `cablesStart(tl)`, `counterState(v)`

**env already draws (do NOT redraw these):**
- the bedroom floor (oak planks), walls, window spill, the walnut nightstand
- the building cut-away with other lit apartments
- the city blocks with rooftops, lit-screen dots (bloomed) and traffic on the avenues; the rivers and the bay
- the regional light field (snapped to the street grid) and the metro sky-glow
- the night globe (real ETOPO1 relief), the atmosphere rim and stars
- the CITIES light clusters
- **all 36 undersea cables**: they draw on from `cablesStart` (beat 12 + 0.15 s), staggered, with data pulses and landing dots, and fade on the dive home
- the HUD: topBar plus a live counter, top right, y 236–290 ("GOOGLE SEARCHES SINCE YOU PRESSED PLAY", from beat 2). It switches to "HOURS OF VIDEO UPLOADED…" on beat 17's second phrase. Keep your labels out of x > 560 for y < 300.

**Look:** premium night-time data documentary. Deep blue-black, warm sodium windows and cool screen-blue light, thin precise lines, glow used sparingly (additive, `L.lightBlob`, `lighter`).
- No logos or brand marks: the Google, YouTube and Gmail names appear only in narration and small text, never their logos or UI.
- Generic UI shapes are fine (a search bar, a play bar, an envelope).
- No emoji, no cartoon faces. Avenir Next has no arrow glyphs: draw arrows as shapes.

**Motion:** the camera is the signature, so scenes animate *subjects*, never fight the camera.
- Every visual hit lands on its spoken number (use `v.tl.lines[i].phrases`).
- Stagger groups by 40–80 ms, ease out on entrances, and keep exits faster.
- One focal point per beat. Labels are readable ≥ 1.5 s.
- Big number in the accent colour via `L.bigLabel` at about x 96, y 470–560 (left), unless the composition needs it elsewhere.
- Captions sit at y 1280–1390. Keep every focal subject between y 320 and 1250 and x < 960.

## Timing (build/timeline.json, 89.95 s; "|" = pause, see `phrases`)

Beats start at: 0.00, 4.15, 8.12, 13.97, 19.40, 24.79, 27.11, 31.20, 34.45, 40.73, 46.31, 49.04, 54.36, 56.21, 61.40, 64.92, 69.50, 74.27, 79.76 (end 89.95).

Key phrase times:
- 2: "people type more than a hundred thousand…" 10.08–13.44
- 3: "And the strangest number comes last." 16.91–18.87
- 4: "Zoom out," 19.55–20.32 / "…four million emails." 20.92–24.26
- 7: "Not every minute." 31.35–32.42 / "Every second." 33.02–33.92
- 8: "in vast warehouses…" 36.81–40.20
- 11: "the data doesn't fly through space." 52.00–53.83
- 15: "many are about as thick as a garden hose." 66.66–68.98
- 17: "and those eight hours…" 76.70–79.23
- 18: "One single day of uploads" 79.91–81.49 / "would take about eighty-two years…" 82.09–84.95 / "Longer than a lifetime." 85.55–86.95

| beat | line | camera (camera.js KEYS) |
|---|---|---|
| 0 | hook | phone, 0.26 mm/px, phone centre at y ≈ 1000 (slight pull-out) |
| 1 | one phone lights up | push in, 0.22 mm/px, phone at y ≈ 880 |
| 2 | 100,000+ searches | 0.65 mm/px: the phone plus the nightstand |
| 3 | 8 billion a day, open loop | 1.9 mm/px: nightstand + bed corner |
| 4 | "Zoom out": 4 million emails | 0.1 m/px: building cut-away + the block |
| 5 | nearly half spam | hold, push |
| 6 | 8 hours of video / s | 2 m/px: the city of screens |
| 7 | not every minute: every second | hold, push to 1.75 m/px |
| 8 | data centres | lifted glide (auto zoom-out) 7 km WNW to `DC`, 1.1 m/px, campus centre at y ≈ 820 |
| 9 | ~1.5% of world electricity | climb to 150 m/px, the NY region (HOME at y ≈ 700, ocean lower right) |
| 10 | as much as France | lift and turn the planet to France (46.6 N, 2.4 E), 2.6 km/px, France at y ≈ 820 |
| 11 | not through space | whole night globe, 15.5 km/px, disc centre y 840 (r ≈ 410 px), over the Atlantic, slow spin |
| 12 | under the sea | push to 14 km/px; **cables draw on** |
| 13 | 1.4 million km | turn east to Europe/Africa (24 N, 18 E), spin |
| 14 | 35 times around | Indian Ocean (16 N, 62 E), 16.5 km/px: room around the disc for rings |
| 15 | garden hose | push in to 3.6 km/px over the Arabian Sea (15 N, 63 E): cables are large lines |
| 16 | 99% between continents | pull back, Asia-Pacific (22 N, 112 E), whole globe, spin |
| 17 | back to that one phone | the planet turns home (east, 180°) while zoomed out, then one 4.4 s dive to the phone at 0.42 mm/px (y ≈ 960) |
| 18 | 82 years | 0.32 mm/px, phone centre at y ≈ 1010, slow push |

## Scenes (one file per beat; `drawWorld` = world subjects, `drawOverlay` = labels)

- **s00-hook.js** (no captions, no chapter): near-black at t 0. The phone (drawn by s01) wakes at ≈ 0.6 s with a soft light pool on the nightstand. Headline `ONE SECOND` / `ON THE INTERNET` ("SECOND" in accent) at y ≈ 420–600, readable ≥ 1.2 s, masked wipe-in.
- **s01-one-phone.js — owns THE PHONE for the whole film** (drawWorld at every time, culled when < 2 px):
  - a refined modern phone: thin bezel, rounded corners, a camera pill, a subtle edge highlight and shadow on the wood;
  - screen states as a pure function of `v.gt`: dark before ≈ 0.6 s, then a lock screen (time, a wallpaper gradient in accent blues);
  - the light pool it casts on the nightstand.
  - Export `drawPhone(ctx, v, opts)` and a `screenRect(v)` (screen corners in px) so s02, s17 and s18 can draw *on* the screen during their beats (import only).
  - Beat 1: a notification lands and a thin one-second sweep ring completes around the phone.
- **s02-searches.js:** search queries as thin glowing lines plus small pill-shaped "search bars" streaming out of the phone in all directions (deterministic). Label "100,000+" / "searches every second" on "hundred thousand" (≈ 11.3 s). The HUD counter starts on its own.
- **s03-eight-billion.js:** the bed (draw it at `BED`, plan frame: duvet, pillows, a crumpled throw) appears as the camera pulls out. A thin 24-hour dial ring sweeps around the nightstand. Label "8 billion+" / "searches a day". On "the strangest number comes last", a small accent "?" tag or a dimmed lock icon parks top-left as the open loop (subtle).
- **s04-emails.js:** on "Zoom out" the camera climbs to the block. Envelopes (tiny outlined shapes, deterministic) rise from lit roofs across the block and stream off-frame. Label "4 million" / "emails every second" on "four million" (≈ 22.6 s).
- **s05-spam.js:** about half of the envelope stream turns grey, gets caught in a fine filter line and drops away. Label "≈ 45%" / "of all email is spam".
- **s06-youtube.js:** over the city of screens, a single refined video timeline bar (generic, no logo) fills to "8:00:00", with hour ticks. Label "8 hours" / "of new video every second".
- **s07-every-second.js:**
  - "Not every minute.": a 60 s clock ring appears and is struck through.
  - "Every second.": it collapses to a single 1 s tick and the whole city flashes once (an additive pulse wave expanding from HOME across the blocks).
  - Label "every second" / "500 hours every minute".
- **s08-data-centres.js:** the campus on `DC_PLAN` (plan frame):
  - 3–5 long data halls with roof cooling units (rows of circular fans that spin), a substation, generator yards;
  - light streams flowing in from the city along the streets (from HOME's direction).
  - Label "data centers" / "warehouses of computers" on "data centers" (≈ 39.4 s).
- **s09-electricity.js:** as the camera climbs to the region, accent power lines converge on the campus (and a few other glowing points). Overlay: a single horizontal "world electricity" bar with a bright 1.5% sliver. Label "≈ 1.5%" / "of the world's electricity".
- **s10-france.js:** France's outline (lat/lon polygon via `geoPath`) glows in the accent as the planet arrives, with a soft fill. Label "≈ France" / "about 415 TWh a year".
- **s11-not-space.js:** the whole night globe. A thin ring of satellites (tiny dots at LEO, r ≈ R + 550 km) traces around and then dims. Label "< 1%" / "goes by satellite" on "doesn't fly through space".
- **s12-under-the-sea.js:** env draws the cables on. This scene adds the moment: a brief accent sweep over the oceans and landing-station pings. Label "under the sea" (or no big number: a typographic beat).
- **s13-cable-length.js:** a km counter racing to "1.4 million km" / "870,000 mi of cable", timed to the spoken number; one highlighted cable traced end to end.
- **s14-wrap-earth.js:** one cable unspools from the globe into 35 thin rings that wrap around it (staggered, tilted ellipses, front and back occlusion), with a ring counter. Label "× 35" / "around the Earth".
- **s15-garden-hose.js:** a circular magnifier lens (y ≈ 520–900), pinned to one cable on the globe. Inside it, the deep-sea cable cross-section (fibres, steel, copper, polyethylene; ~17–21 mm) beside a garden hose silhouette at the same scale. Label "≈ 2 cm" / "0.8 in thick".
- **s16-ninety-nine.js:** the whole network brightens; pulses thicken; a single bar fills to 99%. Label "99%+" / "of traffic between continents".
- **s17-back-to-phone.js:** the dive home. Optionally a thin accent trace follows one pulse down a cable into New York and into the phone. As we land (≈ 78.5 s), the screen (via s01's `screenRect`) shows a generic video upload feed. Label "720,000 hours" / "uploaded every day".
- **s18-eighty-two-years.js:** the reveal. On the phone screen, a generic video player whose progress bar runs the length of 82 years (year ticks, a lifetime marker at ~73). The headline stat **82 YEARS** lands on "eighty-two years" (≈ 83.3 s) with the film's biggest hit, held to the end. Then "Longer than a lifetime." Keep the final frame composed (cover ≈ 85.0 s).

## Ownership

Builders own **only** their scene files. Do **not** edit `engine/*`, `camera.js`, `env.js`, `geo.js`, `episode.json`, `data/`, any `.md`, or other builders' scenes. Shared needs go in "sharedRequests".

Cross-scene imports (read-only) are fine: s02, s17 and s18 import `drawPhone` / `screenRect` from s01. The phone is drawn **only** by s01.
