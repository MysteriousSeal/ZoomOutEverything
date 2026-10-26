# Creative brief: Zoom Out 22, "How Old Is Everything, Really?" (hook format, ~71.3 s)

**North star:** *Make a dynamic motion-graphics film that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*

Before you start:
- Read `../../../MOTION-PRINCIPLES.md`, `../../../engine/README.md`, `engine/runtime/lib.js` and `engine/runtime/kit.js`.
- Then read `camera.js` and `env.js` in this folder: they define the world, and you will use their helpers.
- Hook-format references: `../06b-how-high-is-space-hook/` (`p-cold.js`, `s13-question.js`).
- Facts and arithmetic: `script.md` → FACT-CHECK. Every number on screen must match it.

## The film

**One continuous camera** along a single horizontal **timeline ruler**.
- "NOW" is pinned near the right edge (screen x ≈ 880).
- Each beat zooms out by orders of magnitude. The past rushes toward now, and the adaptive tick labels roll over from YRS → thousands → MILLION → BILLION.
- At the Big Bang the ruler **unfolds into the home straight of a 100 m athletics track**: start line = the Big Bang, finish line = now. It is the same world with the same x axis.
- The camera then **dives back in** to lane 5 at the finish line:
  - the dinosaurs at 48 cm;
  - our species, the last 2.17 mm;
  - a human hair lying on the track, next to the 0.04 mm glowing sliver of written history.
- The question card holds over that frame. The preroll replays the hair reveal.

**Look:** mature documentary infographic in the style of Kurzgesagt or Vox, on a deep ink-teal background.
- Subjects are refined, ACCURATE silhouettes with rim light and soft accent glow, never cartoons. No faces on objects, no emoji.
- Accent `[120, 210, 230]` for numbers, pins and brackets. Ink/white for the rest.
- Real anatomy and proportions:
  - T. rex: horizontal back, tail held out straight, tiny two-fingered arms, no tail dragging.
  - Stegosaurus: two staggered rows of plates, four tail spikes (the thagomizer), small head held low.
  - Shark: correct fins, five gill slits.
  - Archaeopteris: a tall straight trunk with fern-like frond branches.
  - Great Pyramid: base-to-height ≈ 230 : 146, i.e. slope 51.8°.

## World and helpers (camera.js / env.js, orchestrator-owned)

- **Units: YEARS.** World x = −(years ago); now is x = 0, the future x > 0. `cam.mpp` = years per pixel. It runs from 0.02 (hook) → 2e7 (universe) → 40 (hair).
- **Ruler** = world y = 0, at screen `RULER_Y = 1040`.
  - Timeline beats: draw subjects at **fixed pixel sizes** pinned to `tx(v, years)` on that row. Subjects stand above the ruler (bases ~y 990–1020, tops ≥ ~620); brackets go above the ruler or below it (y 1110–1300).
  - env draws the tick labels at y ≈ 1084 and "NOW" at y ≈ 1098 under the ruler: keep brackets and labels clear of that 1070–1110 band.
- **Track** (beats 10–12): the same world.
  - 1 m of track = `YR_PER_M` = 1.38e8 years.
  - `mx(v, m)` = screen x of a point m metres before the finish; `my(v, w)` = screen y of a lateral coordinate w (metres); `mpx(v, m)` = pixels per m.
  - Lanes: 8 × 1.22 m with lane 1 on top, `TRACK_Y0` = −4.88 … `TRACK_Y1` = +4.88. Lane 5 centre = `LANE5` = 0.61 m; the camera rides `CAM_W` = 0.77 m.
  - Finish paint: m ∈ [0, −0.05] (x ≥ 0). Its leading edge is now.
  - `TRACK_AT.kpg` = 0.478 m, `TRACK_AT.sapiens` = 0.00217 m, `TRACK_AT.writing` = 3.77e-5 m. `HAIR_M` = 70e-6 m.
- **Facts:** `AGE` holds life 80, moon 57, cleopatra 2055, pyramid 4580, writing 5200, sapiens 3e5, trex 66.5e6, kpg 66e6, stego 150e6, tree 385e6, shark 450e6, earth 4.54e9, universe 13.8e9.
- **env.js exports:**
  - coordinates: `tx`, `rulerY`, `mx`, `my`, `mpx`, `ypx`;
  - phases: `trackK(v)` (0 → 1 over beat 10's first ~1.5 s) and `timelineK(v)` (its fade-out);
  - formatters: `fmtYears`, `fmtAgo`, `fmtTrack`, `fmtTape`;
  - drawing: `hBracket(c, x0, x1, y, k, color, label, side)` (horizontal measured bracket), `landmark(c, v, years, {k, label})` (small dot plus tiny tag on the ruler for past subjects), `pin(c, x, yBase, yTop, k, color)`;
  - colours and positions: `ACCENT`, `SURFACE`, `PAINT`, `TAPE_Y` (= 1250, the metres tape in the track phase).
- **What env draws:**
  - background, time dust, stars in deep time;
  - the ruler: ticks, NOW, the 13.8 Gyr end cap;
  - the whole track: stadium in the far view, lane 5 close-up with world-locked granule textures near the finish, lane lines, the finish line, the start line at −100 m;
  - the metres tape with "FINISH";
  - HUD: topBar + the **age readout** at the top right, y 250–340. It reads "4,580 / YEARS AGO", then in the track phase "0.48 m / = 66 MILLION YEARS". Keep the top-right block clear.

## Timing (build/timeline.json, 71.25 s; main-timeline beat starts)

Preroll 0–4.45 s: it replays film time 59.75 → 60.86 at 0.25× (`preroll.from` = 55.3).

| beat | start | line ("\|" = phrase pause; phrase starts) | camera (mpp yr/px, now x) |
|---|---|---|---|
| 0 | 4.45 | How old is everything, really? | 0.02 → 0.025, now 880 |
| 1 | 7.47 | Start with you. (7.62) \| A long life is about eighty years. (9.04) | 0.129: 80 y at x 260 |
| 2 | 11.59 | The Great Pyramid of Giza is about four and a half thousand years old. | 7.39: pyramid x 260 |
| 3 | 16.12 | Cleopatra lived closer to the Moon landing (16.27) \| than to the building of that pyramid. (19.39) | 7.9: pyramid ≈ 300, Cleopatra ≈ 620, Moon ≈ 873 |
| 4 | 21.72 | Our species appeared about three hundred thousand years ago. | 484: x 260 |
| 5 | 25.50 | The last dinosaurs died out sixty-six million years ago. | 1.065e5: x 260 |
| 6 | 29.63 | And T. rex lived closer to us (29.78) \| than to Stegosaurus. (32.09) | 2.2e5: Stego ≈ 198, T. rex ≈ 578 |
| 7 | 33.97 | Sharks are even older than trees. | 6.43e5, now 890: shark ≈ 190, tree ≈ 291 |
| 8 | 37.12 | The Earth itself formed four and a half billion years ago. | 7.1e6: Earth ≈ 240 |
| 9 | 40.77 | And the universe began about thirteen point eight billion years ago. | 1.97e7: Big Bang ≈ 180 |
| 10 | 45.93 | Now squeeze all of that onto a hundred-meter running track. | 1.77e7, now 900: start line ≈ 120 |
| 11 | 50.58 | The dinosaurs vanish half a meter from the finish line. (50.73) \| Our species: the last two millimeters. (54.25) | → 1e5 (0.478 m at x ≈ 200, lane 5) by ~52.4; **dive at 53.85** → 500 (2.17 mm at x ≈ 260) by ~55.2 |
| 12 | 57.17 | And all of written history? (57.33) \| Thinner than a human hair. (59.24) | → 40, now 800, by ~58.8 (hair ≈ 240 px wide, sliver ≈ 130 px) |
| 13 | 62.63 | If you could visit any moment on that track, (62.78) \| where would you go? (65.51) \| Tell me in the comments. (67.08) | holds the hair frame (push 0.985) |

Readout values: 80 · 4,580 · 2,055 · 300,000 · 66 MILLION · 150 MILLION · 450 MILLION · 4.54 BILLION · 13.8 BILLION · 100 m · 0.48 m → 2.2 mm · 0.04 mm.

## Scenes

The general rules for every timeline subject (beats 1–9):
- Enter before or as the camera settles: rise or draw-on, 0.4–0.6 s. Then hold.
- After your beat, the camera zooms out and your subject slides toward now. Shrink it to a `landmark()` dot plus a tiny tag once it gets within ~150 px of now or of the next subject, then fade out.
- Everything timeline-side must be gone (× `timelineK(v)`) by ~1 s into beat 10.
- Only the current beat's subject is big. One focal point per beat.

- **s00-hook.js** (no captions, no chapter, `overlayIn: false`):
  - The ruler at human scale. NOW pulses, with a small "2026" tag.
  - Headline HOW OLD IS / **EVERYTHING?** fitted ≤ 900 px, readable on frame 1, in the band y ≈ 480–760.
- **s01-lifetime.js:** an 80-year bracket (`hBracket`) grows left from now on "a long life". Optional: a slim human silhouette (standing, side profile, dignified) above the start of the span. bigLabel "80 years" / "a long human life".
- **s02-pyramid.js:**
  - An elegant, accurate Great Pyramid silhouette at −4,580 y: a ~300 px base, slope 51.8°, a sun-lit face and a shaded face, a subtle course texture. Sand-gold rim light.
  - bigLabel "4,580 years" / "Great Pyramid of Giza · c. 2560 BC".
- **s03-cleopatra.js:**
  - A dignified profile portrait silhouette (Ptolemaic coin style: diadem, bun) at −2,055 y.
  - A lunar module (or Moon) icon at 1969, sitting right at now. Use a leader up to the icon so it doesn't collide with NOW.
  - Two `hBracket`s: pyramid → Cleopatra "2,530 YEARS" and Cleopatra → Moon landing "2,000 YEARS". The second draws on "than to the building of that pyramid".
- **s04-sapiens.js:** an accurate early Homo sapiens skull (side view, Jebel Irhoud: long low braincase, modern face) at −300 ka. bigLabel "300,000 years" / "our species appears".
- **s05-dinosaurs.js:**
  - An accurate T. rex silhouette (side view, walking, horizontal posture) at −66.5 Ma.
  - A thin K–Pg line at −66 Ma: "the asteroid", as a subtle impact flash on the line, never cartoon.
  - bigLabel "66 million years". The T. rex STAYS for beat 6 (this builder owns it in both beats).
- **s06-trex-stego.js:**
  - An accurate Stegosaurus at −150 Ma.
  - Brackets: Stegosaurus → T. rex "≥ 82 MILLION YEARS" and T. rex → now "66 MILLION YEARS". The comparison must read without sound.
- **s07-sharks-trees.js:**
  - A shark at −450 Ma and Archaeopteris at −385 Ma. They are only ~100 px apart on the ruler: stack them, with the tree above the ruler and the shark on a leader, or similar.
  - Labels "450 million" vs "385 million".
- **s08-earth.js:**
  - A molten young Earth at −4.54 Ga: a glowing magma disc with a dark cooling crust, impact glints, no continents (it is too young: do NOT use earth.js coastlines). Maybe the Moon-forming debris.
  - bigLabel "4.54 billion years".
- **s09-big-bang.js:**
  - A flash at the ruler's left end cap (−13.8 Ga): a bright point that blooms, with a shock ring. Nothing exists before it.
  - bigLabel "13.8 billion years" / "the universe begins".
- **s10-track.js:**
  - env unfolds the stadium from the ruler; you add the dressing:
    - lane numbers at the start;
    - starting blocks hinted at the start line;
    - "START = BIG BANG" and "FINISH = NOW" tags;
    - the headline card **13.8 BILLION YEARS = 100 METERS** (fitted, opaque-ish backing, upper band y 420–600).
  - Optionally, faint markers for the Earth (32.9 m) and the dinosaurs (0.478 m).
- **s11-finish-line.js:**
  - The dinosaur marker at 0.478 m on lane 5: a small upright flag or a T. rex mini-silhouette plaque. A running spike shoe lies on the track for scale (top view, ~28 cm, accurate sole/spike plate, NO person).
  - `hBracket` "0.48 m". Then, on the dive (53.85), the Homo sapiens marker at 2.17 mm with a bracket "2.2 mm · our species".
- **s12-hair.js:**
  - A single human hair (~0.07 mm, cuticle scales, translucent brown-black, slight curvature) lying on the track parallel to the finish edge, just before the line.
  - Written history = a glowing accent sliver, 0.038 mm wide, ending at the finish edge.
  - Two measured brackets: hair "0.07 mm" vs written history "0.04 mm". The sliver reveal lands on "Thinner than a human hair" (59.24).
  - It must read on frame 1 of the preroll (film ≈ 59.75).
- **s13-question.js:** adapted from 06b, three choices: THE DINOSAURS / ANCIENT EGYPT / THE BIG BANG. Opaque card, fades in 0.45 s after the beat starts.
- **p-cold.js:** the headline ALL OF WRITTEN HISTORY / IS THINNER THAN A **HAIR**, on a dark band, fitted ≤ 940 px, readable on frame 1. Keep it off the hair and sliver if you can (choose the band so both stay visible).

## Layout rules
- Fit every line with `L.fitSize`.
- Nothing important at x > 940 below y 1100. Bottom y > 1580 clear. HUD band y < 340 (chapter card on the left, readout on the right).
- Caption band y 1380–1520 (`captionY` 1450): keep subjects out of it.
- Labels stay ≥ 1.5 s. bigLabels sit at x ≈ 80, y ≈ 520–580.

## Ownership
Builders own **only** their scene files. Do **not** edit `engine/*`, `camera.js`, `env.js`, `episode.json`, any `.md`, or other scenes. Put shared needs in "sharedRequests".
Shots: `node engine/node/shots.mjs ZoomOut/episodes/22-how-old-is-everything --name <unique> --times …`. Note that `--beats` indexes the FULL timeline, where preroll = beat 0, so film beat i = `--beats i+1`. Delete old shots.
