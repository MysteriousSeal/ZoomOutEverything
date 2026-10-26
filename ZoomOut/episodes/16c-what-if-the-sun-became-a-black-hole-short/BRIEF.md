<!-- 16c: this is episode 16's original brief (90 s). 16c plays a ~50 s cut of it: see script.md (top) and remap.js. -->
# Creative brief — Zoom Out 16 (series "What If"): What If the Sun Became a Black Hole? (90 s)

**North star:** *Make a dynamic 90-second motion graphics video that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*
Read `../../../MOTION-PRINCIPLES.md` and `../../../engine/README.md` first. Finished references: `../06-how-high-is-space/` (one continuous camera, HUD readout), `../08-how-fast-is-light/` (true-scale space, light travel), `../11-what-if-the-moon-disappeared/` (beach on the top of the globe, then pull-back), `../15-what-if-humans-disappeared/` (state as a pure function of time, a clock HUD). This film is 90 s: the same craft with more beats, **not** slower. Something lands every 10–15 s.

## The film

Three acts, one unbroken camera journey (`camera.js`, smooth zoom-pan flights, never a cut):
1. **The collapse (beats 0–5).**
   - A sunny city street; the Sun shrinks to a point and vanishes (the hook is a flash-forward, and beat 1 rewinds it).
   - The clock starts. For 8 min 20 s nothing changes.
   - Fly out to the Earth and Sun at true scale: where the Sun was, a black hole, and the **last sunlight** is a bright shell racing toward Earth, with gravity's "news" riding along at the same speed.
   - Push in to the globe: the front **wipes across the lit hemisphere** and Earth goes dark.
2. **What changes, and what doesn't (beats 6–15).**
   - Pull back to the whole orbit: Earth keeps exactly the same orbit (only mass and distance matter).
   - **The dive:** seven orders of magnitude into the black hole, which is **6 km wide** over a city-sized map. You could drive across it in minutes.
   - Fly 1 AU back to the dark planet; frost spreads; down to the **same street**, now night and frozen (−18 °C). Out over the quay into the ocean cross-section: an ice lid on top, liquid water below.
3. **The twist (beats 16–18).**
   - Fly back to the Sun: the black hole **re-inflates into the real Sun** and light floods out. It can never do this: it's far too light (~20× the mass needed).
   - The real ending: the clock races 5 billion years ahead, a red giant swells toward Earth's orbit, then the long final push into a **white dwarf about the size of Earth** (an Earth-sized disc beside it for scale).

## World (camera.js, env.js)

SIDE VIEW of the plane of Earth's orbit, in metres. x is right, **y is down**. Always draw with `v.wx / v.wy / v.ws`.
- `EARTH = (0, R_EARTH)`: the street is at (0, 0) on the **top** of the planet. Street level is y = 0 for x < `COAST` (180 m); the quay drops to the sea surface `SEA_Y` (+4 m); the seabed is `seabedDepth(x)` (env), about 4 km deep by x ≈ 9 km. The sea is to the **right** of the street.
- `SUN = EARTH + AU · SUN_DIR`: the Sun is toward the **upper-left** (`SUN_DIR ≈ (−0.643, −0.766)`), so from the street the Sun hangs in the upper-left sky. AU = 1.496e11 m, so AU / c = 499 s.
- Constants: `C, AU, R_EARTH, R_SUN, M_SUN, RS` (2,953 m), `BH_D` (5.9 km), `R_GIANT` (1.3e11), `R_WD` (8.5e6), `R_STAR20` (6 R☉), `COAST, SEA_Y, OCEAN`.
- Framings: `FRAME.{street, system, globe, orbit, bh, ocean}` and `place(p, sx, sy, mpp)`.
- **Scale props** (not physically there; comparison objects placed beside the subject):
  - `CITY` {x, y, w 11 km, h 9.5 km}: a city map centred under the black hole.
  - `STAR20`: the centre of the ~20 M☉ star in beat 17.
  - `EARTH_GHOST`: the centre of the Earth-sized disc beside the white dwarf in beat 18.

**Story state** (env.js, pure functions of global time; import them, never re-derive them). `T.*` holds the key times.
- `elapsedAt(gt)`: seconds since the collapse. It is 0 until 8.70 s, then lands on 500 (8:20) at 23.7 s and holds. From 52.45 s ("Back on Earth") it races: 6 h, 2 days at 56.3, 1 week at 58.6, 3 weeks at 61.5, 1 year at 64.6, 25 years at 70.4.
- `futureYears(gt)`: 5 billion years at 81.5 s, 7.6 billion at 84.3, 7.8 billion at 86.6.
- `lightR(gt)`: radius of the dark sphere behind the **last sunlight**. It touches Earth at `T.dark0` = 22.4 s and has passed it at `T.dark1` = 23.2 s (slow motion through the sweep).
- `frontK(gt)`: the front ring fades at 24.3 s. `lightR2(gt)` is the new light after the twist.
- `sunlitAt(x, y, gt)` and `dayK(gt)` (street daylight 0..1). `frontPoint(v, R)` gives the screen point of the front plane, for scenes that draw on the front.
- `freezeK(gt)`: 0 until 52.45 s, 0.35 at 56 (globe frost), 0.8 at 59.5 (street), 1 at 64.6 (sea).
- `starState(gt)` returns `{mode: sun | bh | restore | giant | wd, r, col, bh}`:
  - collapse at 8.70 s;
  - re-inflate 71.2–72.4 s;
  - giant 82.1–84.3 s (R☉ → 0.87 AU);
  - white dwarf 84.9–86.6 s.

**env draws:**
- the sky (day/night by `dayK`, by altitude) and two parallax star layers;
- the **street**: `BUILDINGS`, `TREES`, `LAMPS` are exported. Facades with windows lit at night, frost on roofs and ledges, a foreshortened road band 0–8 m below the ground line with a lane line, and a hazy far skyline;
- the terrain: land, harbour, sea body, seabed, rock;
- the **globe**: continents, city lights on the night side, the sunlit hemisphere clipped by the light front, frost;
- Earth as a dot at system scale;
- a faint dashed 1 AU orbit ring at orbit scales;
- **the star** at SUN: the Sun, a black hole (true-size black disc plus a violet marker ring), the red giant, the white dwarf;
- the **light front**: a warm ring at system scale, a straight wipe at planet scale.

Scenes **add** on top of all this and never redraw it.

**HUD** (env): the top bar plus ONE right-hand readout per beat (`HUD_MODE`), which swaps on beat changes:
- the clock "8:20 · MIN : SEC · SINCE THE SUN COLLAPSED" in beats 1–5 and 13–15;
- the TRUE SCALE bar in beats 6–12 and 16–17;
- "7.8 BILLION YEARS · FROM TODAY" in beat 18.

It sits at the top right, y 260–340. Keep your subjects and labels out of x > 560 / y < 360.

## Look

A premium astrophysics documentary: deep blacks, warm white sunlight, **violet** (accent `[190,140,255]`) only for the black hole, labels and key lines. The black hole is not a cartoon: a true-size black disc, a thin photon ring, faint gravitational lensing of the stars behind it, and **no** accretion disc (a lone black hole has none). The street is calm and adult (side view, refined silhouettes, no faces, no emoji). Frost is pale blue-white `[225,238,255]`. The red giant is `[255,120,70]` with a soft, mottled limb; the white dwarf is `[215,230,255]`, small and fierce.

## Motion

The camera is orchestrator-owned: animate subjects, never the camera. Every hit lands on its words. One focal point per beat. Labels hold ≥ 1.5 s. Entrances ease out; exits ease in and are faster. Things a beat creates **persist** while they make sense, e.g. the orbit trace through beats 6–9, the city map until the flight leaves in beat 13, and ice on the sea. Your `drawWorld` runs every frame with `v.t` relative to your own beat start: cull by screen. Keep focal subjects in y 380–1240, clear of the captions (1280–1390), the HUD (y < 360) and x > 960 below y 1100. Labels go upper-left, y 420–700 (house `bigLabel`), unless your beat needs otherwise.

## Timing (build/timeline.json, 90.6 s; "|" = pause, see `phrases`)

Beats start at: 0.00, 4.03, 8.55, 12.92, 16.04, 20.95, 24.27, 27.05, 32.23, 37.31, 39.91, 43.40, 47.76, 52.32, 56.16, 62.21, 70.62, 74.78, 79.64 (end 90.64).

| beat | line | camera (ends on) |
|---|---|---|
| 0 | What if the Sun suddenly became a black hole? | street, 0.036 → 0.04 m/px, ground line y ≈ 1200 |
| 1 | Here's what would happen. / The strangest part comes last. | slow dolly right along the street (x 9 m), 0.042 |
| 2 | For eight minutes and twenty seconds, / nothing would change. | dolly on (x 17 m), 0.044 |
| 3 | That's how long sunlight takes to reach us. | **fly out** (2.5 s) to Earth (800, 1080) and Sun (≈ 294, 477), 1.9e8 m/px |
| 4 | Even changes in gravity / only travel at the speed of light. | same, a slight push (1.8e8) |
| 5 | Then, / the sky would go dark. | **push in** from 20.45 s to the globe: Earth (560, 860), r ≈ 187 px, 3.4e4 (arrives 21.85; the wipe runs 22.4–23.2) |
| 6 | But Earth wouldn't fly off into space. | pull back to the orbit: Sun (540, 800), Earth ≈ (797, 1106), 1 AU ≈ 400 px |
| 7 | It would keep the same orbit, / a hundred fifty million kilometers out. | orbit hold (3.6e8) |
| 8 | From that far, / a black hole pulls like any star of the same mass. | lean toward Earth: Sun (470, 720), 2.45e8 (Earth ≈ (850, 1170)) |
| 9 | Only mass and distance matter. | whole orbit again, 3.3e8 |
| 10 | So how small is a black hole with the Sun's mass? | **the dive**, a pure zoom into SUN at (540, 820), 3.3e8 → 60 m/px (40.0–43.3 s) |
| 11 | About six kilometers wide. / Smaller than a city. | settle at 14 m/px: the horizon is 422 px across |
| 12 | The whole Sun, / in a ball you could drive across in minutes. | 16 m/px, SUN at (540, 860) |
| 13 | Back on Earth, / the cold would set in fast. | **fly 1 AU** (3 s) to the globe: Earth (540, 900), r ≈ 318 px, the street at the top (y ≈ 582) |
| 14 | Within weeks, / experts estimate the land would drop below minus eighteen degrees. | dive to the street (2.2 s): 0.05 m/px, ground y ≈ 1190 |
| 15 | The oceans would freeze over from the top, / but under the ice, / the deep water could stay liquid for a very long time. | glide out and down (2.4 s) to the ocean slice at 6.2 m/px (surface y ≈ 586, seabed ≈ 1230); at +4.2 s sink 3 s toward (9.3 km, 3 km deep) at 4.6 m/px (surface leaves the top) |
| 16 | But here's the twist: / the Sun can never do this. | **fly** (2.3 s) to SUN at (540, 820), 3e6 m/px (R☉ ≈ 232 px); re-inflation 71.2–72.4 |
| 17 | It's far too light. / It would need to be about twenty times heavier. | pull out: Sun (300, 560) r ≈ 50 px, `STAR20` ≈ (640, 940) r ≈ 298 px at 1.4e7 |
| 18 | In about five billion years, / it will begin to swell into a red giant, / then shrink to a white dwarf about the size of Earth. | out to the orbit (4e8, SUN at (540, 820)); at +5.15 s (84.8) a 3.1 s push to 4e4: WD at (400, 740) r ≈ 212 px, `EARTH_GHOST` at ≈ (735, 1065) r ≈ 159 px; slow push to the end |

## Scenes

**16A: s00–s04 (the street and the light in flight)**
- **s00-hook.js** (no chapter, no captions).
  - Own the **sky Sun** in the street shots: a screen-anchored disc at about (250, 470) with a bloom, light rays and a warm wash over the facades, plus long shadows to the right. Export it if s01/s02 need it.
  - Pedestrians (refined silhouettes, walking, deterministic), a passing car or bus on the road band, birds.
  - On "suddenly became a black hole" the Sun **shrinks to a brilliant point and blinks out** (a violet glint, the sky dims a touch).
  - Headline `WHAT IF THE SUN` / `BECAME A BLACK HOLE?` ("BLACK HOLE?" on an accent bar, masked reveal, ≥ 1.2 s) in y 600–900, clear of the Sun.
- **s01-strangest.js:** a smooth **rewind** (the point re-expands into the Sun, the shadows swing back, a subtle scrub streak), and the clock arms at 0:00 (env). On "the strangest part comes last" a quick, mysterious **teaser glint** of something small and white-hot (the white dwarf) can flash in the sky for ≤ 0.6 s: an open loop.
- **s02-nothing-changes.js:** life goes on in full sun while the clock runs. Label "8 min 20 s" / "nothing changes".
- **s03-sunlight.js:** at true scale, dress env's front: photon streaks inside the bright shell racing outward, and a faint ghost of the Sun's old disc fading at SUN. Mark Earth (a small ring + "EARTH") and the distance with a dimension line along the Sun–Earth axis. Label "150 million km" / "93 million mi · 8 min 20 s at light speed".
- **s04-gravity-speed.js:** concentric gravity ripples (a thin violet ring pattern) riding exactly on the light front. Label "Light speed" / "gravity's news travels no faster".

**16B: s05–s09 (darkness and the orbit)**
- **s05-dark.js:** env wipes the globe dark (22.4–23.2 s). You add the moment: a fine bright terminator spark along the front's edge on the globe, the atmosphere rim fading, and the night side's city lights persisting. Label "8:20" / "then darkness" (lands with the clock).
- **s06-no-fly-off.js:** pull-back to the orbit. A ghost "fly-off" path (a dotted tangent line that the viewer might expect) appears and is **rejected**: it dissolves, and Earth stays on the circle. Label "Still in orbit" / "no slingshot into space".
- **s07-same-orbit.js:** a bright arc traced along the 1 AU orbit (env draws a faint dashed ring) with a time-lapse marker sweeping it. Earth stays fixed in the world, so show the motion as a sweeping trace, not a moving Earth. A radius dimension: "150 million km" / "93 million mi · same orbit".
- **s08-same-pull.js:** at the lean framing, a pull vector at Earth (drawn as a shape, no arrow glyphs) and, as an inset or overlay, the same vector for "a star of the same mass": identical length. Label "Same pull" / "same mass, same distance".
- **s09-mass-distance.js:** a clean diagram: an "M" tag at the black hole and a "d" bracket along the radius, everything else dims. Label "Mass + distance" / "nothing else matters".

**16C: s10–s14 (the 6 km hole, back to the cold Earth)**
- **s10-how-small.js:** during the dive (pure zoom into SUN), pass true-size **ghost rings**: the Sun's old disc (R☉, label "the Sun: 1.4 million km") and an Earth disc (12,742 km), each readable ≥ 1.5 s while the zoom passes through them. The question is the focus. No label at the end of the beat: the answer is next.
- **s11-six-km.js:** the black hole at true size (RS = 2,953 m) with a thin photon ring and lensing of a deterministic background starfield (a warped Einstein-ring look). Under it, the `CITY` map (a refined street-grid plate of a ~11 km city, e.g. central Paris, faint lines, world space). A diameter dimension across the horizon. Label "6 km" / "3.7 mi wide · smaller than a city".
- **s12-drive-across.js:** a car (a light dot with a trail) drives along a road across the city map, spanning the horizon's width, with a small timer. Label "≈ 4 min" / "across it at 90 km/h · 55 mph". The city map and the hole stay until the fly-out in beat 13.
- **s13-cold.js:** the dark globe (env frosts it via `freezeK`). Add a frost front spreading from the poles and continents, the city lights dimming, and a thin cold-blue atmosphere. Label "No sunlight" / "the cold sets in".
- **s14-minus-eighteen.js:** the same street at night, frozen (env does the facades, frost, lamps). Add ice crystals in the air, frost creeping over the road band, frozen breath / still trees, and a thermometer read-out dropping. Label "−18 °C" / "0 °F · within weeks (estimate)".

**16D: s15–s18 (ice, the twist, the real ending)**
- **s15-oceans.js:** in the ocean slice (env: water body, seabed), an **ice lid** grows down from the sea surface (pale blue-white, with crystalline texture and cracks; thickness grows with `elapsedAt`, drawn readable; mark it "not to scale" if exaggerated). Below: liquid water with slow currents and a faint warm glow from the seabed (Earth's internal heat). Label "Ice on top" / "liquid water below".
- **s16-twist.js:** the flight to the Sun. env re-inflates the star (71.2–72.4 s). You make it a **moment**: the violet horizon cracks open into sunlight, a shockless bloom, and the light floods out (`lightR2`). Label "Never" / "the Sun can't do this".
- **s17-too-light.js:** the Sun (r ≈ 50 px) beside a ~20 M☉ blue-white star at `STAR20` (`R_STAR20`, r ≈ 298 px), plus a mass comparison (e.g. 20 small Sun tokens filling a balance or bar). Label "≈ 20×" / "the mass you'd need".
- **s18-white-dwarf.js:**
  - The red giant (env radius) with a mottled, convective surface and a soft limb reaching toward the orbit; Mercury's and Venus's orbits are swallowed (thin rings vanish).
  - Then it sheds a **planetary nebula** (expanding shells in world space, still visible on the push-in).
  - The camera pushes to the white dwarf. Draw an Earth-sized disc at `EARTH_GHOST` (R_EARTH) for scale.
  - Label "≈ Earth-sized" / "the Sun as a white dwarf". A calm final hold.

## Ownership

Builders own **only** their scene files. Do **not** edit `engine/*`, `camera.js`, `env.js`, `episode.json`, any `.md`, or other scenes. Shared needs (framing, env state timing, colours) go in "sharedRequests". If two scenes in your group need the same component (e.g. the sky Sun for s00–s02, the black hole render for s11–s12, the orbit trace for s06–s09), export it from the lower-numbered scene and import it in the other. Import only; never edit another builder's file.
