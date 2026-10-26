# Creative brief — Zoom Out 03: How Deep Is the Ocean, Really?

**North star:** *Make a dynamic 30-second motion graphics video that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*
Read `../../../MOTION-PRINCIPLES.md` and `../../../engine/README.md` (scene contract) first.

## The film

One continuous dive from a swimmer at the surface to the bottom of the Mariana Trench. The camera (in `camera.js`) handles every move: zooming into close-ups, pulling out for big objects, and "flying" between depths. Your scenes live **in world space** (metres) so they're on screen whenever the camera passes. The finale pulls back to show the **entire water column at true vertical scale**, then Mount Everest drops into the trench.

**Look:** premium documentary motion graphics, like a science film title sequence. Silhouettes and shapes are refined and anatomically right: a real Burj Khalifa profile, the Titanic's bow, a beaked whale's actual shape. Rim light and soft glow show form in the dark. Colours come from the water (env.js); the accent `[70, 205, 215]` (teal) is reserved for numbers and highlights. No cartoon faces, no emoji, no clip-art.

**Motion:** everything eases in and out, nothing pops. Use secondary motion (bubbles, fins, light flicker, particles) so no shot is static. Each beat has **one focal point** and holds it long enough to read.

## Timing (from build/timeline.json; ~29.9 s)

| beat | time | line | camera |
|------|------|------|--------|
| 0 | 0.00–2.77 | "How deep is the ocean, really?" | surface close-up (1 px ≈ 5.5 mm), sinking slightly |
| 1 | 2.77–6.33 | "At two hundred meters, sunlight is basically gone." | travels to y=150, 1 px = 0.24 m (surface visible at top) |
| 2 | 6.33–10.15 | "At three hundred thirty-two: the deepest scuba dive ever." | zooms into y=332, 1 px = 1.1 cm |
| 3 | 10.15–13.83 | "Sink the Burj Khalifa here, and it vanishes completely." | pulls out to y=430, x=60, 1 px = 0.6 m |
| 4 | 13.83–18.45 | "At three thousand meters, a whale is still hunting, on a single breath." | flies to y=2992, 1 px = 1.3 cm |
| 5 | 18.45–21.21 | "At three thousand eight hundred, the Titanic." | y=3770, x=120, 1 px = 0.2 m |
| 6 | 21.21–29.92 | "And at eleven thousand, the bottom. Drop Everest in, and there's still two kilometers of water above it." | flies to trench floor (x=−2500, y=10790, 1 px = 0.45 m); at 38%→66% of the beat pulls back to the whole column (x=−1700, y=5650, 1 px = 6.4 m); holds to the end |

The camera arrives at each key in the first ~1–1.9 s of the beat, then holds with a slow push. Plan your entrances so the subject is **already in place when the camera arrives**, and do your hero animation during the hold.

## World layout (metres; y = depth, positive down; surface y=0)

See the header of `camera.js`. Helpers in `env.js`: `floorY(x)` (seafloor), `waterColor(depth)`, `lightAt(depth)`, `PLAIN=3800`, `TRENCH_FLOOR=10935`.

## Scenes

### s0-surface.js (beat 0, hook; no captions, no chapter)
- A **swimmer silhouette** at true scale (1.75 m), **treading water upright** in profile (head above the surface, sculling arms, alternating breaststroke "eggbeater" kick). We chose upright over a horizontal stroke because it reads as a person at this zoom and puts the deep water right below the swimmer. Near and far limbs move in opposite phase. The underwater part is tinted by the water and rim-lit, and the part above the water is a crisp dark shape with a sky rim. Caustic dapples move across the skin, with a caustic net in the water, a meniscus collar and glints on the surface, and bubbles shed by the hands and feet. At ~1.75–2.65 s the swimmer **looks down into the deep** just before the dive begins. On pull-outs the swimmer becomes a tiny upright mark, and it is culled once it is under ~1 px.
- **Headline**, staggered and masked: `HOW DEEP IS` / `THE OCEAN,` / `REALLY?`. The first two lines are dark ink on the bright sky. `REALLY?` sits in ink on an **accent bar that wipes in** at ~1.1 s. It holds ≥ 1.2 s, then masks out upward, staggered, from d−0.25 s.
- Cues: `blip` ×2 (lines), `swish` + `tick` (accent bar), soft `swish` on exit; `splash`/`bubbles` come from env.
- **As built:** the neck sits ~12 cm above the mean surface, so the waterline falls at the collarbone and the chin clears the wave crests (±~17 cm at this zoom), including during the look-down. Arms reach forward and slightly down in a sculling stroke (elbows below the hands' line), and the legs hang nearly vertical below the hips with a small eggbeater ellipse, so the pose reads as treading water rather than kneeling. The `REALLY?` accent bar is centred on the glyphs' actual ink bounds (equal padding left and right). When beat 1 starts, the close-up swimmer dissolves over 0.3 s instead of streaking through the camera travel; the tiny pull-out mark fades in only after the camera has slowed (from t ≈ d + 0.7 s).

### s1-sunlight.js (beat 1)
- Sparse **fish schools** (7 schools from 16 m to 152 m, 150 → 9 fish, plus 3 tuna-sized loners). Each school bends, stretches and ripples as one, using deterministic noise, and a turning wave sends silver flashes across the flanks. The schools fade out once the camera is past 0.35–0.75 m/px.
- The focal point is a **200 m line**: a dashed accent line with a soft glow band that draws itself in left → right (t 1.0–2.05 s), with a glowing head. Labelled with `bigLabel` "200 m" / "656 ft · 1% of sunlight left" (in at t 1.35 s, x = 170, just above the line). The line stays faintly visible through beat 2 and is gone before the Burj pull-out. We did not add a light meter, to stay within the two-text-element limit.
- Cues: `shimmer` 0.35, `swish` 1.0 (line), `ping` 1.42 (label), `tick` 2.05 (line complete).
- **As built:** the line starts at screen x = 200 so its start dot clears the env depth-gauge tick label "200 m", and the big label sits at x = 220 (line start + 20). The three tuna loners fade in at t 1.2–1.7 s (after the camera arrives), and the one at 40 m starts at x = −70, off the descent axis, so nothing streaks across the frame during the travel. The three shallowest schools get a 1.6× silver flash, and schools above 60 m have lighter bodies, so they read as glinting fish rather than dark specks at 0.24 m/px.

### s2-diver.js (beat 2)
- A **scuba diver** close-up at 332 m: detailed silhouette (tank, regulator, mask, fins), slow fin kicks, **torch beam** cone (additive light) sweeping a little, periodic **exhale bubble bursts** rising.
- An optional vertical guide line (record dives use one).
- Label "332 m" / "1,090 ft · deepest scuba dive ever".
- When the camera pulls out (beat 3+), keep drawing the diver (it becomes a tiny dot; that's the point).
- **As built:** the descent line (x = +1.55) runs from 242 m to 372 m with soft 10 m ends and 2 m depth tags, so it is on screen through the whole zoom-in and leads the eye down to the diver; it dims to ~0.25 alpha behind the label's small line and the caption (screen y 1150–1400) and fades out once the camera is past ~0.1 m/px. The fins have a light rim and a wider blade tip (±0.09 m) so they separate from the legs. The torch beam sits shallow (≈ 0.32 rad below the body axis) and falls off beyond ~4 m, keeping the label and caption in contrast. Exhale bubbles rise from behind the hood (not over the mask) and fade out before the top HUD band (screen y < 360).

### s3-burj.js (beat 3)
- The **Burj Khalifa** at true height (828 m), with an accurate stepped setback profile and spire, and faint lit window bands. Base centre x ≈ +145 (moved right from +110 so the label clears the spire).
- It **sinks**: at the beat start the top ~300 m stand above the surface; it descends until the spire tip passes under the surface (~70% of the beat) and ends with its base at ≈ 900 m. Add surface turbulence and a bubble trail when the spire submerges.
- A `dimension()` bracket "828 m" along the tower once submerged. A small marker on the diver from beat 2 ("diver, 332 m") makes the comparison.
- Label: "828 m" / "2,717 ft · fully submerged". Layer it in front of the diver.
- **As built:** asymmetric setbacks (alternating 3 m / 6 m steps at different heights on each side), broad lower wings (half-width 55 m up to h ≈ 30 m), and a slender spire from ~585 m (half-width ≤ 6 m) so the top third reads as a needle. The sink runs t 0.2–2.95 s; the spire tip goes under at t ≈ 1.95 s (`splash` on it). The label eases in at t ≈ 1.6 s, as the last ~30 m of spire slip under, so it is fully readable for ~1.7 s before the overlay fades. The tip's bubble column is confined to ±2.8 m of the axis, giving ≥ 40 px clearance from the label's small line.

### s4-whale.js (beat 4)
- A **Cuvier's beaked whale** (~5.5 m, robust body, small dorsal fin set far back, short beak, pale scarred head) gliding diagonally downward with a fluke stroke. It's near-black down here, so reveal it with rim light and a few bioluminescent sparks it disturbs.
- **Echolocation**: faint expanding arcs from the head (sync `sonar` cues).
- Label: "2,992 m" / "9,816 ft · on a single breath".
- **As built:** true-scale 5.5 m whale (≈ 420 px at the close-up), gliding at 0.62 m/s on a ~26° downward heading, centred on (−0.2, 2992) at t = 3.0 s, slow fluke stroke (0.36 Hz) bending the tail stock. The flukes are a thin, tapered horizontal blade seen almost edge-on (about ±0.05 m tall, un-notched, shallow convex trailing edge, far lobe slightly shorter and higher), with only their upper edge catching the rim light. The back rim light flows up over the dorsal fin as one contour. A cold rim light comes up as the camera arrives (t ≈ 0.9–2.3 s), followed by a light sweep from head to tail (t 1.25–2.95 s). About 60 bioluminescent sparks fire where the head and flukes pass, then curl into the wake. Echolocation click trains (3 arcs each) at t = 1.75, 2.95 and 3.95 s, each on a `sonar` cue; also `whale` (1.35 s) and `shimmer` (1.5 s). Distant bioluminescent bokeh adds parallax depth. The label waits until t ≈ 0.9 s (the camera is nearly at depth) and eases out over the last 0.3 s of the beat, while the whale is still in frame. The whale is culled when it's below 2 px (the final zoom-out).

### s5-titanic.js (beat 5, short: 2.76 s)
- The **Titanic's bow section** (~140 m long, the famous prow, rails, mast stump, rusticles) resting half-buried on the plain at `env.floorY(x)`, x ≈ 40…190.
- Revealed by a **searchlight sweep** (an ROV light cone moving across it). Sediment haze and a `creak` cue.
- Label: "3,800 m" / "12,500 ft · resting since 1912".
- **As built:** the bow runs from x = 45 (torn break) to x = 185 (stem), upright and buried in a sediment berm that mounds up at the stem. Details: the forecastle sheer and bow railing, the foremast stump with the mast lying back and sloping down onto the bridge roof (the crow's nest sits on the fallen mast), the funnel casings with no funnels, davits, rows of portholes and windows, and the port anchor in its hawse pipe. When unlit it's a faint silhouette, which still reads at the final zoom-out. The ROV lamp (off-screen, upper right) flickers on at t ≈ 0.4 s (`blip`), with `swell` at 0.62 s and `creak` at 0.95 s. Its soft elliptical pool sweeps from the break to the prow (t 0.45–2.4 s) and widens at the end, revealing the rust palette and rusticles, with a faint bounce fill across the whole hull. Blurred volumetric beam, sediment particles sparkling inside the beam, and a low haze band over the plain. The light starts fading 0.2 s before the beat ends and is gone 0.25 s into beat 6, before the hull reaches the HUD band. The chapter subtitle is "The bow section, found in 1985", so it doesn't repeat the label. The label waits until t ≈ 0.7 s.

### s6-trench.js (beat 6, the payoff)
1. **0–38%**: arrival on the trench floor: fine silt, a few drifting particles, a pressure readout ("1,086 bar ≈ 1.1 tonnes on every cm²"). Label "10,935 m" / "35,876 ft · Challenger Deep".
2. **38–66%**: the camera pulls back to the full column. As it does, small **landmark ticks** fade in along the column (surface · scuba 332 m · Burj 828 m · whale 2,992 m · Titanic 3,800 m), recapping the dive at true scale.
3. **~62–80%**: **Everest drops in** from above the surface: a refined mountain silhouette (8,849 m tall, snow cap, ridges; horizontal base ≈ 4,400 m, i.e. narrower than the real massif; vertical scale is true). It lands on the trench floor (base y = 10935, centre x = −2500) with a dust and shockwave impact (`deep` cue).
4. **80–100%**: a `dimension()` bracket from the peak (y=2086) to the surface (y=0): "≈ 2 km of water above the summit". Hold. A small "vertical scale: true" note.
- **As built (after review fixes):**
  - **Recap path:** the dashed dive path appears at the touchdown marker (t ≈ r0 + 0.15·rd) and *retraces the dive upward*: down the open water of the trench (not along the wall), off the plain at the Titanic, then up the column to the surface. Its glowing head starts climbing once the arrival label and gauge have cleared (r0 + 0.3·rd + 0.3 s). It is clamped to the middle half of the frame while the camera zooms out, so the pull-back always has one focal point (no empty frames around 25.4–26.1 s). Landmark dots pop on as the head passes them.
  - **Recap labels:** a screen-anchored list at x = 860 (fan y 336 / 412 / 500 / 590). It enters from r0 + 0.5·rd with a 0.06 s stagger, and each leader connects once its dot is lit and in frame. Recap labels, path and dots all clear at land + 0.3 s with a 0.3–0.35 s exit, fading to 0. Each label is held ≈ 1.6 s.
  - **Payoff label:** "≈ 2 km / of water still above the summit" starts at land + 0.64 s, after the recap has fully cleared (no text over text), and is held to the end (≈ 2 s). The bracket line draws from land + 0.32 s.
  - **Everest:** half-base 2,200 m (vertical scale true). Broad shoulders: the West Shoulder (left, ≈ 0.49 h) and the Lhotse side (right, ≈ 0.74 h) carry the summit pyramid. The snow line uses sharp, downward triangular couloir wedges, with rock buttresses pushing up into the snow. The body is an opaque rock gradient that darkens to near-black low down. Ridge lines bow and flare outward following the faces instead of running vertically.
  - **Drop:** it starts with the whole massif above the frame and is clipped to below the sea surface while falling, so it enters *through* the surface (no shapes in the sky band). The torn underside is smooth and feathers to transparent. A splash marks the moment the underside meets the surface (foam band where the mountain crosses y = 0, spray in the sky band, two faint rings), with a `splash` cue. Impact is still at land = REVEAL end + 0.3 s.
  - **Known overlap:** Everest falls (land − 1 s → land) while the recap list is still held, because the list needs ≥ 1.5 s and land is tied to the camera. The list is static and the mountain leads. A VO or camera retime that moves the pull-back earlier would separate them.

## Ownership

Each builder owns **only** their scene file(s). Do **not** edit `engine/*`, `camera.js`, `env.js`, `episode.json`, or other scenes. If you need a shared change, put it in your report under "shared requests" and the orchestrator will make it.
