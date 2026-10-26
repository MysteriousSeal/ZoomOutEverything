# Creative brief — Zoom Out 15 (series "What If"): What If Humans Disappeared Tomorrow? (60 s)

**North star:** *Make a dynamic 60-second motion graphics video that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*
Read `../../../MOTION-PRINCIPLES.md` and `../../../engine/README.md` first. Finished references: `../06-how-high-is-space/` (one continuous camera, HUD readout), `../08-how-fast-is-light/` (true-scale space pull-back, light-travel scale), `../09-how-much-water-is-on-earth/`.

## The film

**A time-lapse of a world without us**, seen from directly above New York at night.
- A busy crossing. Then the people are gone, and the camera pulls back as the city carries on without them: lights burning for no one, the power stations shutting down, a **wave of darkness** rolling across Manhattan.
- The **TIME WITHOUT US** clock (env HUD, top right) races: 1 hour → 4 → 8 → 1 day → **2 DAYS** → 20 years → 300 years → 1,000 years → 1,000,000 years. Each beat shows what that much time does: the subway floods, forest swallows the grid, the bridges fall, plastic drifts out to sea, a bronze statue still stands.
- **Reveal:** one unbroken pull-back from the region, to the dark planet, past the Sun, to the stars. Our most lasting trace is a **bubble of radio and TV broadcasts about 100 light-years in radius**, still spreading at light speed. The clock gives way to a light-year scale bar.

## World (camera.js, env.js)

TOP-DOWN, metres. x = east, **y = south (screen down)**. The frame is rotated so Manhattan's long axis points straight up ("north" = uptown). Use `v.wx/v.wy/v.ws`.
- `camera.js` exports `R_EARTH, C, LY, AU, GRID {ave 260, aveW 30, st 80, stW 18}` (avenues at x = k·260, streets at y = k·80), `PLAZA (-75, -45)` (the bronze statue, inside the plaza block x[-245,-15] × y[-71,-9]), `PLANT {x 3520, y -4400, w 380, h 300}` (on the Brooklyn/Queens bank), `BRIDGES.{brooklyn, manhattan, williamsburg} {x0,y0,x1,y1}` (deck end points, shore to shore), `CENTRAL_PARK` rect, `NARROWS (-800, 12800)` (harbour mouth), `SUN_DIR`, `BUBBLE_R` (100 ly), `ELAPSED` (the clock keys) and `KEYS`.
- **The Earth's centre is the origin too:** the final pull-back looks straight down on the city, so New York sits at the centre of the planet's disc, then the planet becomes the pale dot at the centre of the bubble. Planet scale: the disc is drawn by env from ~250 m/px.
- `env.js` draws the water + land polygons (`MANHATTAN`, `EAST`, `WEST`, Governors Island; exported) and the city by LOD: blocks with building lots, tower shadows and rooftop water tanks below 3 m/px; amber street segments (lit) or faint asphalt lines (dark) from 3 to 40 m/px; flat land beyond. Also street-lamp pools (< 2 m/px), light-pollution haze, a high parallax cloud layer (foreground), the planet (night disc, clouds, sunlit crescent toward the upper right, rim), stars (> 800 m/px), and the HUD.
- **City state is a pure function of time.** Import from env and stay in sync with it:
  - `cityState(v)` returns `{h, day, green, ruin, blackR}`. `blackR` is the radius (m) of the blackout disc centred on PLANT (0 = all lit, Infinity = all dark). It grows during beat 3, from t ≈ 0.15 to 2.45 s.
  - `litAt(v, x, y)` gives 0..1, "is this point still lit?". Use it for car lights, windows and traffic lights, so everything dies with the wave.
  - `day` is the time-lapse daylight: real day/night sweeps during beats 4–5, then a steady averaged dusk.
  - `green` (beat 6) and `ruin` (beat 7) drive env's block colours.
  - `elapsedHours(v)` and `fmtElapsed(h)` give the clock. `glowDot(c, x, y, r, rgb, a)` is a cheap cached additive glow; use it for many lights. `worldRect(v)`, `onLand(x, y)`, `LAMP` (sodium amber), `MOON`, `fmtLight`.
- env loops are bounded by the screen. Yours must be too: iterate only over what is visible (`worldRect`), never over the whole city at fine detail.

## Look

Premium night-time satellite cinematography plus a refined documentary HUD. Deep navy water, near-black land, **sodium-amber light** (the accent `[255,190,95]` *is* the city's light, so when the lights die the accent leaves the world and returns only for labels, the radio bubble and the clock). After the blackout: cool moonlight, then the green of the time-lapse forest. Calm, adult, slightly awed. No cartoon faces, no emoji, no people figures (they are gone: show their absence, e.g. cars stopped mid-lane with headlights still on).

## Motion

One continuous camera, never a hard cut. Beats 0–3 pull back (street → blocks → plant → city), beats 4–7 lean back in on details, and beats 8–12 are the signature unbroken pull-back (harbour → region → planet → solar system → 100 ly). The camera is orchestrator-owned: you animate subjects, not the camera.
- Every hit lands on its words. One focal point per beat. Labels hold ≥ 1.5 s. Entrances ease out, exits ease in and are faster.
- Things a beat creates **persist in the world** while they make sense, e.g. the flooded tunnels stay blue-dark under the forest, and fallen bridge stubs remain. Your drawWorld runs every frame with `v.t` relative to your own beat start.
- Keep focal subjects in y 380–1240, clear of the captions (1280–1390) and the HUD (y < 360: top bar, chapter card at left, the clock at right up to y ≈ 350). Labels go upper-left in the area y 420–700 (house bigLabel), except the hook.

## Timing (build/timeline.json, 59.8 s; "|" = pause, see `phrases`)

Beats start at: 0.00, 4.02, 7.92, 12.85, 16.13, 19.43, 23.45, 27.67, 32.83, 37.26, 41.65, 45.14, 51.26 (end 59.84).

| beat | line | camera (centre, m/px) | clock lands on |
|---|---|---|---|
| 0 | What if every human on Earth disappeared tomorrow? | crossing (-20, 10), 0.14 → 0.16 | (clock hidden) |
| 1 | At first, the lights would stay on, for no one. | (40, -40), 0.75 | 1 HOUR @ +1.6 s |
| 2 | Within hours… power plants would shut down. | (2300, -3500), 3.4: PLANT at screen ≈ (900, 640) | 4 HOURS @ +2.1 |
| 3 | One by one, the lights would go out. | (1200, -6900), 12: all of Manhattan | 8 HOURS @ +2.6 |
| 4 | Beneath New York, pumps keep the subway dry. | (900, -5000), 8.5 | 1 DAY @ +2.6 (one sunrise/sunset sweep) |
| 5 | Without them, the tunnels would flood in about two days. | (900, -4700), 7.8 | **2 DAYS** @ +3.2 |
| 6 | In about twenty years, cracked streets would turn to forest. | (1300, -3600), 5.0 | 20 YEARS @ +1.9 |
| 7 | Within a few centuries, steel bridges and towers would rust and fall. | (2250, -1650), 3.2: bridges at screen y ≈ 340–1090 | 300 YEARS @ +2.0 |
| 8 | Plastic could outlast them, perhaps for a thousand years or more. | (1200, 19000), 38: harbour mouth ≈ (487, 739), ocean below | 1,000 YEARS @ +1.7 |
| 9 | Some bronze statues might keep their shape for millions of years. | (0, -12000), 140: PLAZA at screen ≈ (540, 988) | 1,000,000 YEARS @ +2.6 |
| 10 | But our most lasting trace has already left the planet. | Earth, 1.9e4 (r ≈ 335 px) | clock fades; scale bar in |
| 11 | For about a century, our radio and TV signals have raced outward at light speed. | 2.2e14 (travel 4.6 s: Moon, Sun, nearest stars) | |
| 12 | Today they reach about a hundred light-years in every direction, and they're still spreading. | 2.3e15 → slow pull-out: 100 ly ≈ 410 → 390 px | |

## Scenes

- **s00-hook.js** (no chapter, no captions). Top-down crossing at 0.14–0.16 m/px: an avenue (x = 0, 30 m wide, lanes ±7.5 m) and streets at y = 0, ±80.
  - Busy: cars and taxis as refined top-down bodies with headlight cones and red tail-light trails, streaming down the avenue and across.
  - Pedestrian-crossing signals, a bus. The plaza (upper left, statue at PLAZA, just off-frame at the start) can show its dark trees.
  - Headline `WHAT IF HUMANS` / `DISAPPEARED?` ("DISAPPEARED?" on an accent bar, masked reveal, readable ≥ 1.2 s) in y 420–720.
  - On "disappeared tomorrow" the traffic **eases to a stop** mid-lane; the headlights stay on. That stopped state persists into beat 1.
- **s01-lights-on.js.** As the camera pulls to 0.75 m/px, the stopped cars (headlights on), traffic lights cycling red/green for nobody and lit window spill are the life of the frame. Label "Lights on" / "for no one". Everything respects `litAt`.
- **s02-power-plants.js.** The power station at PLANT, top-down: turbine halls, 3–4 stacks with drifting steam plumes (world space, wind toward the upper left), a switchyard, a glowing intake.
  - On "shut down" the plumes thin and stop, the plant's lights die in a short stutter (end of beat 2, ~+3.8 s), and a thin accent pulse runs along a few transmission lines.
  - Label "Within hours" / "power plants shut down". The plant stays in the world, dark.
- **s03-blackout.js.** Env runs the wave (`blackR`). You own its **front**: a soft amber rim with sparks and flicker of the last blocks, a few stragglers going out late, and a brief brown-out shimmer before it.
  - Label "Lights out" / "the grid fails". The focal point is the front sweeping across Manhattan.
- **s04-pumps.js.** An x-ray of the subway: 6–8 stylised trunk lines following the avenues (thin cool-white lines, slightly offset from the streets), stations as dots, and pump nodes pulsing water out.
  - Label "≈ 50 million litres" / "pumped out every day · 13 M US gal".
  - Then the pumps stop, one by one, near the end of the beat. One sunrise/sunset sweep passes (env `day`).
- **s05-flood.js.** Water (deep blue-teal with a moving sheen) spreads through the lines from the low-lying tip and the rivers, synced with the clock, which reaches 2 DAYS on "about two days" (~+3.2 s).
  - Label "2 DAYS" / "to flood the subway" (this is the thumbnail stat). The flooded lines persist faintly into beat 6.
- **s06-forest.js.** Env greens the blocks (`green`). You add cracks webbing across the streets first, then canopy clusters (layered top-down tree crowns, lit on one side) bursting out of the parks and the cracks.
  - Label "≈ 20 years" / "streets turn to forest".
- **s07-bridges.js.** The three bridges at `BRIDGES.*`: refined top-down suspension bridges (deck, two towers, cable lines, shadow on the water).
  - Over the beat they rust (colour shift), cables snap and spans drop into the river with ripple rings, staggered. A few tower footprints in Lower Manhattan crumble (dust).
  - Label "A few centuries" / "steel rusts and falls". Bridge stubs persist.
- **s08-plastic.js.** At 38 m/px: glinting plastic specks (min-px, accent-warm white) collecting along the shores, then drifting out of the harbour mouth in current streams into the Atlantic below.
  - Label "1,000+ years" / "plastic lingers".
- **s09-bronze.js.** The region at 140 m/px, the city fully reclaimed. A **loupe** (a refined circular lens in screen space, about 230 px radius, upper half) opens from the plaza point (screen ≈ 540, 988) via a leader. Inside it, the bronze statue at close scale, top-down with a long low-sun shadow that reveals its side silhouette (a figure or a bull on a plinth), with green patina, in forest.
  - Label "Millions of years" / "bronze keeps its shape". The loupe closes before beat 10.
- **s10-last-trace.js, s11-broadcasts.js, s12-bubble.js** (one builder).
  - s10: as the camera pulls back to the dark planet (env), the first thin radio ring leaves Earth.
  - s11: nested shells (one per decade from 1920, brightest = oldest/outermost edge, thin accent strokes plus faint fill) race outward with the camera: they pass the Moon's orbit, the Sun (at `AU` along SUN_DIR) and the nearest stars. Label "≈ 100 years" / "of radio and TV".
  - s12: the full bubble, radius `BUBBLE_R`, glowing among a few hundred nearby stars (world space, deterministic; the ones inside the bubble faintly lit). It keeps growing slowly.
  - Label "≈ 100 light-years" / "in every direction". A short final hold.

## Ownership

Builders own **only** their scene files. Do **not** edit `engine/*`, `camera.js`, `env.js`, `episode.json`, any `.md`, or other scenes. Shared needs (camera framing, env colours or state timing) go in "sharedRequests". If two scenes in your group need the same component (e.g. subway line geometry for s04/s05, the radio shells for s10–s12), export it from the lower-numbered scene and import it in the other.
