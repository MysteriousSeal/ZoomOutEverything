# Creative brief — Zoom Out 05: Could Every Human Fit in One Place? (60 s)

**North star:** *Make a dynamic 60-second motion graphics video that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*
Read `../../../MOTION-PRINCIPLES.md` and `../../../engine/README.md` first. Finished references for house style and code quality: `../03-how-deep-is-the-ocean/scenes/` and `../01-a-billion-dollars-in-cash/scenes/`.

## The film

All 8.2 billion of us, to true scale, in three acts:
1. **Area (beats 0–3, top-down):** one person on one square metre multiplies into a carpet → the size of Puerto Rico → packed like a concert crowd, it fits inside Rhode Island.
2. **Volume (beats 4–8, side view → globe):** the crowd streams into one solid cube, shorter than the Burj Khalifa, lost in the Grand Canyon. Then it melts into a film over the whole Earth, 70× thinner than a hair.
3. **Time (beats 9–12, abstract):** a quiet pivot, "one more number". 117 billion humans have ever lived; we are ~7%; for each of us, ~13 came before.

**Look:** warm, human, editorial. Dark warm background, coral accent `[255, 130, 110]` for numbers and "us", soft warm whites. Crowds are rendered as fields of tiny warm dots or tiles (never clip-art people). Maps are clean outlines with a soft glow, on a sea tone (env). The cube is a solid, softly lit coral block with crisp edges. No cartoon faces or emoji.

**Motion:** continuous zooms (camera.js) and morphs:
- tiles → carpet → square;
- the square drops into an outline;
- dots stream into the cube (the signature move);
- the cube tilts from the top-down view into a side view;
- the cube drops into the canyon;
- the cube melts into a film around the globe.

One focal point per beat; labels readable ≥ 1.5 s.

## Timing (build/timeline.json, ~60.3 s; lines with "|" have a pause, see `phrases`)

| beat | time | line | camera / view |
|------|------|------|------|
| 0 | 0.00–3.91 | "Could every human on Earth fit in one place?" | top-down, 1 m tile (4.5 mm/px) |
| 1 | 3.91–6.47 | "There are about eight billion of us." | → 0.9 m/px, tiles spreading |
| 2 | 6.47–12.32 | "Give everyone a square meter, … and we'd cover an area the size of Puerto Rico." | → 210 m/px map |
| 3 | 12.32–19.75 | "Pack in like a concert crowd, four per square meter, … and we'd all fit inside Rhode Island, with room to spare." | → 105 m/px map |
| 4 | 19.75–23.70 | "Now pack everyone, by volume, into a single cube." | → side view, cube (2.4 m/px) |
| 5 | 23.70–28.55 | "It's about eight hundred meters tall. … Shorter than the Burj Khalifa." | cube + Burj |
| 6 | 28.55–32.44 | "Drop it into the Grand Canyon, and you'd barely find it." | canyon cross-section (13 m/px) |
| 7 | 32.44–39.23 | "Spread us evenly over the whole planet, … and we'd be a film seventy times thinner than a human hair." | → globe (15.5 km/px) |
| 8 | 39.23–42.38 | "Physically, humanity is almost nothing." | wider globe |
| 9 | 42.38–44.54 | "But there's one more number." | world veiled; abstract |
| 10 | 44.54–48.98 | "About a hundred and seventeen billion humans have ever lived." | abstract |
| 11 | 48.98–52.80 | "Everyone alive today is just seven percent of them." | abstract |
| 12 | 52.80–60.28 | "For every one of us, … about thirteen people have already come and gone." | abstract, final hold |

## World layout (camera.js header)

**Top-down beats 0–3:**
- The person and tile are at the origin.
- Puerto Rico's outline is centred on the origin (≈ 180 × 65 km), with the 90.5 km square of everyone.
- Rhode Island's outline is centred on the origin (≈ 60 × 77 km), with the 45.3 km concert-crowd square.

**Side view beats 4–6:** the ground is at y = 0 and up is negative y.
- The cube stands on x ∈ [−400, 400], 800 m tall.
- The Burj Khalifa is at x ≈ +900 (828 m).
- The Grand Canyon cross-section is cut into the ground around the origin, ≈ 16 km wide, with its floor at y = +1800. The cube ends on the canyon floor.

**Globe beats 7–8:** centre (0, +R) with R = 6,371 km, so the canyon sits at the north pole.

**Beats 9–12:** `env.drawForeground` lays a dark veil over the world (`veilK`). Draw these scenes in **drawOverlay** (screen space).

Hand-drawn outlines of Puerto Rico and Rhode Island are fine, but they must be recognisable (simplified real coastlines, ~40–80 points, correct proportions).

## Scenes

- **s00-hook.js** (no captions, no chapter): one person seen from above (refined top-down silhouette: head, shoulders) standing on a glowing 1 × 1 m tile. Headline `COULD EVERY HUMAN` / `FIT IN ONE PLACE?` with "FIT" in coral, masked, readable ≥ 1.2 s.
- **s01-eight-billion.js:** tiles multiply outward (a radial fractal wave) as the camera zooms out. A big rolling counter climbs to **8,200,000,000**.
- **s02-puerto-rico.js:** the carpet resolves into a 90.5 km square, the Puerto Rico outline draws itself, and the square slides onto it: nearly the same area. Label "≈ 8,200 km²" / "1 m² each · 3,200 sq mi".
- **s03-rhode-island.js:** the square compresses ×4 (people pack in: show the density change with a micro inset of 4 dots per m²), the Rhode Island outline draws, and the square drops inside with clear room to spare. Label "≈ 2,050 km²" / "4 per m² · fits in Rhode Island".
- **s04-cube.js:** the signature move. The square's dots lift and stream inward into **one solid cube**, while the view tilts from top-down to the side view (the camera handles zoom; you handle the tilt and morph). Label "0.5 km³" / "everyone, by volume".
- **s05-burj.js:** the Burj Khalifa silhouette (accurate stepped profile and spire) rises next to the cube. A `dimension()` shows the cube ≈ 800 m against the tower's 828 m. Label "≈ 800 m" / "2,620 ft · shorter than the Burj".
- **s06-canyon.js:** a Grand Canyon cross-section (layered strata, rim to rim ≈ 16 km, 1.8 km deep). The cube drops in with a dust puff and the camera pulls out until it's a speck. Label "1.8 km deep" / "the cube: a speck".
- **s07-film.js:** the cube melts into a thin coral sheen that spreads around the **globe** (refined: ocean, soft landmasses or graticule, atmosphere rim). A macro inset compares the film (1 µm) to a human hair (≈ 70 µm) as two bars or a hair cross-section with the film line. Label "≈ 1 µm" / "70× thinner than a hair".
- **s08-nothing.js:** pull back; the film is invisible on the globe. Minimal text. Let the image speak.
- **s09-one-more.js:** the world veils (env). A single bright "8.2 B" block or counter waits centre-screen.
- **s10-ever-lived.js:** a vast dim dot field (117 B) fills the screen around the bright 8.2 B block. Counter "≈ 117,000,000,000".
- **s11-seven-percent.js:** a proportion bar or waffle (7% bright coral, 93% dim). Label "≈ 7%".
- **s12-thirteen.js:** one bright figure, then 13 faint figures appear behind it in a row, staggered (timed to "about thirteen people"). Label "1 : 13". A final quiet hold.

## Ownership

Each builder owns **only** their scene files. Do **not** edit `engine/*`, `camera.js`, `env.js`, `episode.json`, any `.md`, or other scenes. Shared needs go in "sharedRequests".
