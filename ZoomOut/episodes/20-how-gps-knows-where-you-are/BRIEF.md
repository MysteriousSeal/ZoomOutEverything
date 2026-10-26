# Creative brief — Zoom Out 20: How Does GPS Know Where You Are? (90 s, series "How It Works")

**North star:** *Make a dynamic 90-second motion graphics video that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*

Read `../../../MOTION-PRINCIPLES.md` and `../../../engine/README.md` first. Finished references:
- `../06-how-high-is-space/scenes/`: the side-view world, landmark silhouettes, the climb to a globe
- `../08-how-fast-is-light/scenes/`: photons, trails, the travel-time clock
- `../14-what-if-all-the-ice-melted/scenes/`: drawing on top of a ray-cast globe, refined labels

This film is 90 s: the same craft with more beats, **not slower**. Every beat gets a payoff.

## The film

Three acts, **one continuous camera** (no hard cuts; every act is linked by a camera travel):

1. **ACT I (beats 0–3).**
   - The blue dot on a phone's map pulls back to a person on a night street.
   - The camera climbs out to the planet, wrapped in its constellation of **31 satellites**.
   - A one-day time-lapse follows: every satellite laps **twice** and the Earth turns **once**.
2. **ACT II (beats 4–13).**
   - The camera dives into **satellite B**: atomic clocks; it broadcasts position + time.
   - Pull back: B over the planet; your phone **only listens**. One pulse falls 20,000 km in **0.07 s**.
   - Dive to the phone: light covers **30 cm per nanosecond**. Pull back along the street: 1 µs off = **300 m**.
   - Rise to the four hero satellites over the Earth's limb: sphere → circle → two points → one point (the 4th fixes the phone's clock).
3. **ACT III (beats 14–18).**
   - "Einstein is in your pocket": B above, you below, Earth's gravity well.
   - +45 µs (gravity) − 7 µs (speed) = **+38 µs a day**.
   - Dive to the night city: the blue dot drifts **10 km**.
   - It snaps back as the camera dives home onto the blue dot (the hook frame).

## World, units and exported helpers

**World coordinates (metres), SIDE VIEW, like episode 06.**
- x is horizontal; y = −altitude (up is negative).
- The Earth is a sphere of radius `R_EARTH` centred at `(0, R_EARTH)`. Its **top limb (0, 0) is the street**, at New York (`HOME`, 40.758° N, 73.9855° W). +x along the ground ≈ east.
- The picture plane is the vertical cross-section through the phone and the Earth's centre.

**env.js draws all of this for you. Do not redraw it.**
- Deep space with parallax stars.
- The **night sky** over the street, darkening with altitude.
- The flat or curved **ground** at street → city scale: base colour only; the street and city are the builders' job.
- The **real globe**:
  - Ray-cast per pixel from ETOPO1 (land, ocean, ice).
  - Lit by a fixed Sun; New York is on the night side, near the terminator.
  - It spins once during the time-lapse, with an atmosphere rim.
- The **constellation**:
  - Orbit lines and 31 satellite glints, revealed in a sweep in beat 2.
  - The glints dim (`focusK`) from beat 6 on so the four heroes lead.
  - They hide under the beat-4 close-up model (`modelK`).
- **HUD**: top bar, adaptive scale bar (top right) and the FIX readout under it (top right, y ≈ 280–340): the phone's coordinates plus a status line (TIME-LAPSE +h · SATELLITES LOCKED n · UNCORRECTED · GPS FIX ±5 M).
  - The chapter card owns the top left. Keep your labels below y ≈ 380.

**From `camera.js` / `env.js`:**
- **Geometry and colours:**
  - `R_EARTH`, `GPS_ALT` (20.19e6), `GPS_A` (orbit radius), `C`.
  - `PHONE {x: 0, y: −1.3, w: 0.075, h: 0.155}`, `HOME`.
  - `ACCENT [120,230,140]`, `DOT [70,150,255]` (the blue dot), `SAT_INK`, `CLOCK [255,214,140]` (time readouts).
- **The four hero satellites** (`HERO[0..3]` = A, B, C, D; `SAT_B` = `HERO[1]`):
  - They sit **in the picture plane** at their resting points `{x, y, th, range, delay}`.
  - A circle centred on a hero with radius `range` passes **exactly** through the phone at (0, 0). That is the honest cross-section of its signal sphere.
  - Resting points (km) and ranges:

    | hero | x | y | range | delay |
    |---|---|---|---|---|
    | A | −19,739 | −11,402 | 22,795 km | 0.076 s |
    | B | −6,426 | −19,401 | 20,437 km | 0.068 s |
    | C | 8,208 | −18,890 | 20,596 km | |
    | D | 18,451 | −12,735 | 22,419 km | |

- **Constellation functions:**
  - `satsAt(gt, tl)` → 31 satellites `{i, hero, x, y, z, vx, vy, front}`; heroes are i = 27..30.
  - `heroAt(i, gt, tl)` (equals `HERO[i]` outside the time-lapse).
  - `satReveal(i, gt, tl)` (0..1) and `satsShown(gt, tl)`, for a counter that tracks env's reveal sweep.
- **The time-lapse:**
  - `lapsAt` (0 → 2), `hoursAt` (0 → 23.93 h) and `timeLapseWindow(tl)` `{start, end}`.
  - The window is ≈ 11.0 → 18.1 s, slower in beat 2 and fastest in beat 3.
  - `spinAt` gives the Earth's rotation; `homeWorld(gt, tl)` is the phone's world position as it rides the spinning Earth.
- **Close-up and focus:** `MODEL_SPAN` (8 m) and `modelK(v)`. Draw the detailed satellite with alpha `modelK`; env's glint fades out at the same rate. `focusK(gt, tl)`.
- **The drift:** `driftAt(gt, tl)` is the blue dot's eastward error in metres: 0 → 10,000 on "GPS would drift…" (≈ 78.7–81.5 s), back to 0 at 82.5–84.0 s. **The dot must be drawn at `PHONE.x + driftAt`.** The HUD coordinates already follow it.
- **Other helpers:** `toWorld(p)`, `VIEW`, `SUN`, `beatStart(tl, i)`, `phrase(tl, i, j, 'start'|'end')`.

## Look

- A premium night-time navigation and aerospace visualisation: deep navy and black, the refined real globe, and thin cool-white orbit lines.
- **Signal green** (accent) for numbers, signal rings and spheres. **Map blue** only for the location dot and its halo. **Warm clock gold** for time readouts.
- A real-feeling smartphone (thin bezel, dark map UI with streets and blocks), a person in silhouette with rim light from the phone, and shop fronts with warm windows.
- A GPS III-style satellite: gold-foil bus, two blue solar wings, an L-band antenna array facing Earth.
- No cartoon faces or emoji. **Glyphs:** Avenir and DIN lack arrows (→); draw them. µ, ° and ± are fine.

## Motion

- The camera keys are in `camera.js` (one per beat, travel + push). Scenes animate subjects, signals, clocks and labels.
- One focal point per beat. Labels are readable ≥ 1.5 s and stay out of the caption band (y 1280–1390), the HUD band (y < 380 here, because of the readout), the bottom 20%, and x > 960 below y 1100.
- Signals are the visual language: expanding rings or pulses with a soft trail (additive, green). Every arrival lands on a sound (`blip`, `ping`, `tick`).
- Time-lapse motion is honest: outside the window everything is in real time, which at these scales is frozen. Keep life in the frame with pulses, drift and glints instead.

## Timing (build/timeline.json, 90.4 s; "|" = pause, see `phrases`)

Beats start at: 0.0, 3.69, 9.09, 15.33, 18.23, 20.83, 25.19, 29.23, 33.37, 38.0, 42.79, 46.86, 51.05, 56.42, 61.21, 65.34, 71.97, 77.03, 82.34.

| beat | line (short) | camera (key, travel s) |
|---|---|---|
| 0 | How does your phone know… | phone screen centred at y 880, 0.19 mm/px (hook pull-back from 0.85×) |
| 1 | falling from space · Einstein | street, 8 mm/px, ground at y 1180 (1.7) |
| 2 | 31 satellites · 20,000 km up | planet, 60 km/px, Earth centre at y 830; orbits r ≈ 443 px (3.0) |
| 3 | laps twice a day | 55 km/px (1.2) · time-lapse |
| 4 | atomic clocks | satellite B close-up at (540, 820), 2 cm/px (2.0) |
| 5 | broadcast where + exact time | B at (540, 600), 5 cm/px (1.2) |
| 6 | never transmits · only listens | B ≈ (417, 404) over the phone ≈ (664, 1150), 26 km/px (2.3) |
| 7 | 0.07 s | 24.8 km/px push (0.8) |
| 8 | 30 cm per ns | phone at (540, 1150), 0.6 mm/px (2.4) |
| 9 | 1 µs = 300 m | street, 0.6 m/px: phone x ≈ 290, +300 m at x ≈ 790, ground y 1150 (1.9) |
| 10 | one sphere | four heroes over the limb, 46 km/px, phone ≈ (549, 1110); heroes y ≈ 690–870 (2.3) |
| 11 | circle | 45 km/px (0.9) |
| 12 | two points | 44 km/px (0.9) |
| 13 | fourth: one point | 39 km/px, phone at y 1110 (1.3) |
| 14 | Einstein in your pocket | two-clocks frame: B ≈ (433, 473), phone ≈ (647, 1120), 30 km/px (1.9) |
| 15 | +45 µs | 27.5 km/px (1.2) |
| 16 | −7 · +38 | 26 km/px (1.0) |
| 17 | 10 km a day | city, 18 m/px: phone x ≈ 262, +10 km at x ≈ 818, ground y 1150 (2.8) |
| 18 | tuned slower · dot on you | back to the phone screen at y 880, 0.2 mm/px (3.4) |

## Scenes

### ACT I — group 20A (s00–s03)

- **s00-hook.js** (no captions, no chapter, `layer: 5`):
  - The phone at `PHONE`, true size, screen facing us: a refined dark map (blocks, streets, a park, labels as shapes).
  - The blue dot drops in with a halo pulse and an accuracy circle.
  - Headline `HOW DOES GPS KNOW` / `WHERE YOU ARE?` (second line in accent), masked, readable ≥ 1.2 s, above the phone (y ≈ 330–480; the phone spans ≈ 470–1290).
  - The phone is **persistent world** (beats 8, 18 return to it). Export `drawPhone(ctx, v, {dotX})` for s08/s18 to reuse. The map dot uses `driftAt`.
- **s01-from-space.js:**
  - A person in silhouette (feet on y = 0, phone at `PHONE`, rim-lit by the screen) on a night street.
  - Shop fronts and facades along x ≈ −400 … +700 m. They must hold up at 0.6 m/px for beat 9: lit windows, street lamps, LOD as they shrink.
  - Faint green signal threads fall from the sky on "falling from space". A subtle "E" or relativity glyph tease on "Einstein" is optional, and the overlay stays light.
  - The street is persistent.
- **s02-constellation.js:**
  - The climb is the camera's job. Land "31" in sync with env's reveal sweep (`satsShown`), plus "20,200 km · 12,550 mi up" with a dimension line from the limb to an orbit.
- **s03-twice-a-day.js:**
  - A refined day clock (24 h dial or digital, `CLOCK` colour) driven by `hoursAt`; a lap counter 0 → 2 (`lapsAt`).
  - Trace one satellite's path with a short trail. Label "2 laps" / "every day · one orbit = 11 h 58 min".

### ACT II — group 20B (s04–s09)

- **s04-atomic-clocks.js:**
  - The detailed satellite B model at `SAT_B` (≈ 8 m span, alpha `modelK`), persistent.
  - A cut-away or inset reveals 3–4 atomic clocks with a crisp ticking readout. Label "atomic clocks" / "on every GPS satellite".
  - Export `drawSatellite(ctx, v, x, y, scale)`.
- **s05-broadcast.js:** green broadcast rings fall from the antenna, carrying a data strip: `POSITION` + `TIME 14:03:27.000 000 000` (nanosecond digits rolling).
- **s06-only-listens.js:**
  - B's broadcast cone washes over the planet. The phone (a blue point on the limb) pulses on receive.
  - A drawn "send" arrow up from the phone is struck out. Label "receive only" / "your phone never transmits".
- **s07-travel-time.js:**
  - One bright pulse travels B → phone along the straight line (20,437 km), with a trail.
  - A timer counts 0.000 → 0.068 s, locking on arrival with a `ping`. Label "0.07 s" / "20,000 km · 12,500 mi".
- **s08-thirty-cm.js:**
  - A 30 cm ruler (1 ft) hangs in the air above the phone (true scale: ~500 px), pointing toward B.
  - A light pulse crosses it once while a ns readout ticks to "1 ns". Label "30 cm" / "every billionth of a second".
- **s09-300-metres.js:**
  - The pull back along the street. A ghost dot slides 300 m away (x = 300) with a dimension bracket.
  - Label "300 m" / "1 microsecond off · about 1,000 ft".

### ACT II — group 20C (s10–s13)

- **s10-sphere.js … s13-fourth.js:**
  - Draw each hero's signal sphere as a translucent green **sphere** centred on `HERO[i]`, radius `HERO[i].range`. It passes exactly through the phone.
    - Use a soft radial fill, a crisp rim and a faint "equator" ellipse for 3D.
    - It grows from the satellite (radius animating 0 → range) and lands on the phone with a `ping`.
  - Beat 11: A ∩ B is a glowing **ring through the phone**: an ellipse whose axis is the A–B line, through the phone point.
  - Beat 12: C cuts it to **two points**: one on the phone, one far out in space (struck out / greyed: "not on Earth").
  - Beat 13:
    - First the spheres miss slightly: radii inflated by a common clock error, a fuzzy triangle.
    - Then D arrives and all four collapse onto one point, with a sharp lock and a `ping`.
    - A small phone-clock readout snaps from "±0.000 3 s" to atomic time.
  - One focal point per beat: the newest sphere leads and the earlier ones step back.
  - s10 exports `drawSignalSphere(ctx, v, i, k, opts)` for s11–s13 (the same builder).
  - Keep it schematic but exact at the phone.

### ACT III — group 20D (s14–s18)

- **s14-einstein.js:**
  - The two-clocks frame. A faint spacetime grid warps into Earth's gravity well (world-space, around `(0, R_EARTH)`).
  - Two clocks: one on satellite B, one at the phone.
  - Title moment: `EINSTEIN` / `IS IN YOUR POCKET` (signature beat; a big hit). Reuse s04's `drawSatellite` only if it reads at this scale; otherwise a glint plus a ring.
- **s15-gravity.js:** the satellite clock pulls ahead. A counter climbs to "+45 µs" / "per day · weaker gravity up there". The grid flattens near B.
- **s16-speed.js:**
  - A velocity arrow along B's orbit (3.9 km/s, drawn shape).
  - A "−7 µs" chip subtracts, and the tally settles on "+38 µs" / "every day, net".
- **s17-drift.js:**
  - The night city at true scale along x −2 … +15 km: skyline LOD and window lights, extending s01's street beyond ±700 m.
  - The blue dot glides east with `driftAt`, past a 10 km dimension line. Label "10 km" / "about 6 mi · every day".
  - Thumbnail stat frame ≈ 80.5 s.
- **s18-tuned.js:**
  - The dot snaps back as the camera dives home. A small inset: `10.23 MHz` re-tuned to `10.229 999 995 43 MHz`, "set before launch".
  - End on the hook frame: the blue dot on the phone, steady, with a soft pulse. A final hold of ~3 s, calm.

## Ownership

Builders own **only** their scene files. Do **not** edit `engine/*`, `camera.js`, `env.js`, `episode.json`, any `.md`, or other scenes. Shared needs go in "sharedRequests". Shared visuals are exported by their owner and **imported** (never edited) by others:
- `drawPhone` from s00
- the street from s01, which s09 relies on and s17 extends beyond ±700 m
- `drawSatellite` from s04
- `drawSignalSphere` from s10

Persistent world elements (the phone, the street, satellite B) must keep drawing outside their own beat whenever on screen. Cull by screen bounds; loops stay bounded by the screen.
