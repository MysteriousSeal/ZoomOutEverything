# Creative brief — Zoom Out 17: What Happens in Your Body in One Second? (90 s, series "Inside You")

**North star:** *Make a dynamic 90-second motion graphics video that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*
Same craft as the 60 s films, with more beats. **Do not make it slower.** At 90 s, retention is everything: every beat lands one clear number or image, then gets out of the way.

Read `../../../MOTION-PRINCIPLES.md` and `../../../engine/README.md` first. Finished references:
- `../07-how-small-is-an-atom/scenes/`: powers-of-ten dives, micro worlds
- `../06-how-high-is-space/scenes/`: refined silhouettes and labels
- `../12-what-if-you-fell-through-the-earth/scenes/`: a continuous journey

## The film

One continuous journey through scale, in three acts. There are no cuts: every change of world is a zoom through it.

1. **Act I, the hand (beats 0–3).**
   - A hand holds a stopwatch against a dark "glass anatomy" body. The thumb clicks the crown on "Start the clock".
   - The camera pulls back: the heart beats once in the glass chest.
   - It pushes in on the heart: 70 ml per beat.
2. **Act II, inside (beats 4–11).**
   - The camera dives from the heart frame **into the thumb pad**: a fingertip section, with a nerve signal racing at 120 m/s and a soccer-field inset.
   - It dives **into a venule** that is crowded with tumbling red cells: 25 trillion, one lap a minute.
   - It **pulls out through the hand to the whole body**, where the red-marrow sites glow.
   - It **dives into the hip bone's marrow**: 2–3 million new red cells per second, each living 120 days.
3. **Act III, the whole you (beats 12–18).**
   - Zoom back out to the chest (breath, 0.5 L), then the whole body (100 W).
   - **Reveal:** 330 billion cells replaced a day, almost 4 million per second, mostly blood and gut. A counter of cells replaced *since the clock started* ties it back to the hook.
   - Final line: "you're not quite the same person who started it."

## World, units and helpers (from `camera.js` / `env.js`)

- **Front view, metres, y DOWN** (y = −height above the floor). Feet are on y = 0 and the top of the head is at y = −1.75 (`H_BODY`). x increases to the viewer's right.
  - The person's right hand (viewer's LEFT) holds the stopwatch in front of the belly.
  - Draw with `v.wx / v.wy / v.ws` so the camera, zoom and blur just work.
- **`P`** (key points):
  - `watch` (−0.06, −1.10): stopwatch centre, radius `SIZE.watchR` = 28 mm.
  - `crown`, and `thumb` (the thumb pad on the crown).
  - `heart` (0.035, −1.30), 12 cm (`SIZE.heart`).
  - `lungs` (0, −1.33), `gut` (0, −1.0).
  - `skin`: the centre of the beat-4 fingertip-section frame, inside the thumb pad.
  - `marrow` (−0.11, −0.975): red marrow in the right iliac crest.
  - `ELBOW` and `WRIST`: env draws the right forearm to `WRIST`, and s00's hand starts there.
- **`SKIN`** (world y of the section layers, surface up like a textbook slice): `surface`, `dermis` (epidermis ≈ 0.6 mm), `nerve` (a ≈ 0.3 mm bundle running along x), `fat` (dermis ≈ 2 mm).
- **`VESSEL`** `{x, y, r: 30 µm}`: a dermal venule centreline, running along x. +x is downstream.
- **`SIZE`:** `rbc` 7.5 µm, `rbcThick` 2.5 µm, `ridge` 0.5 mm, `nerve` 0.3 mm.
- **Colours:** `ACCENT` [255, 95, 110] (numbers, highlights), `BLOOD` [200, 30, 48] (red cells), `PLASMA`, `INK`.
- **Timing:**
  - `phrase(tl, line, j, 'start'|'end')`.
  - `clockStart(tl)` (≈ 4.79 s, the crown click) and `clockTime(gt, tl)`.
  - `cellsReplaced(gt, tl)` (3.82 million/s × clockTime; ≈ 323 million at the end).
  - `FACTS` (every number in the script).
- **Zoom:**
  - `depthK(v)`: 0 at body scale, 1 deep inside.
  - **`microK(v, fromMpp, toMpp)`**: a log-space fade-in by zoom. Use it to dissolve one world into the next.
  - `zoomSpeed(gt, tl)` (camera.js): decades per second, + = diving in.
  - `magNote(mpp)`.
- **Body:** `bodyPath(c, v, {forearm})` adds the silhouette to the current path (use it as a **clip** for things inside the glass body; fill it, never stroke it). `bodyOnScreen(v)`.

### What env draws (don't redraw it)

- **drawBackground:**
  - A studio backdrop: cool slate that turns to deep tissue crimson as you go deeper (`depthK`), a backlight and a floor line.
  - The **glass body**: a dark translucent figure with a fresnel inner rim, a warm key-light edge from the upper left, and the right forearm in front of the belly. It is skipped when mpp < 2.5e-6, because the micro worlds cover the frame there.
- **drawForeground:** fly-through motes. They stream outward on dives and inward on pull-outs (their speed is the camera's zoom speed), and are faint on holds.
- **drawHud:** topBar, plus an adaptive **scale bar** (top right, y ≈ 238) with "MAGNIFIED ×N" (relative to life size on a phone). Keep your labels clear of x > 700, y < 300.

### Ownership of shared world objects (they persist across beats, so their owner draws them every frame)

- **s00 owns the hand + stopwatch for the whole film.** The sweep hand reads `clockTime`: it starts on the click in beat 1 and is still running at the end.
- **s02 owns the heart.** It is visible from beat 2 on, and beats with `clockTime`.
- **s12 owns the lungs.**
- **s04 owns the fingertip section** (beats 4–8, and the pull-out in 9).
- **s06 owns the venule interior** (beats 6–8, and the pull-out in 9).
- **s09 owns the skeleton / marrow map.**
- **s10 owns the marrow world** (beats 10–11, and the pull-out in 12).
- **Micro worlds must be OPAQUE** (full-screen tissue) once their `microK` reaches 1, because env stops drawing the body below 2.5e-6 m/px.
- **Gate micro worlds by camera position** too: s04 and s06 only near `P.skin`, s10 only near `P.marrow`. Otherwise they would appear during the other dive.
- **Bounded loops:**
  - Iterate only over lattice cells inside the visible world rectangle.
  - Pick the lattice spacing by the current mpp, or fade the layer out before its count explodes. Never let the count grow as (1/mpp)².

**Look:** a premium medical-documentary film ("glass anatomy").
- A dark, refined body with luminous organs.
- Micro worlds in warm tissue colours with depth of field: soft out-of-focus foreground and background cells, a crisp focal plane, subsurface glow on red cells.
- Red cells are true biconcave discs (a pale centre, a darker rim, light tumble), never cartoon circles.
- Labels: `L.bigLabel` in the accent, hairline leaders, small tracked caps.
- No cartoon faces or emoji. No arrows in text (Avenir lacks →): draw them.

**Motion:**
- The camera journey is the signature. Let things appear as they arrive, and hold.
- Each micro world **dissolves in during the dive** (never pops): a transitional layer (e.g. fingerprint ridges, bone surface, trabeculae) bridges the empty decades so the frame is never a flat dark void.
- Labels ease in 0.3–0.6 s after the camera settles, and stay ≥ 1.5 s.
- One focal point per beat.
- Hit sounds land on visual hits (`tick`, `ping`, `blip`, `bloom`, `impact`, `whoosh`, `dive`, `bubbles`, `swell`, `count`).

## Timing (build/timeline.json, 89.30 s; "|" = pause, see `phrases`)

Beat starts: 0.00, 4.39, 8.66, 11.90, 15.58, 21.11, 25.62, 30.52, 35.71, 39.03, 42.53, 47.27, 52.57, 58.17, 63.92, 66.31, 71.29, 76.62, 81.98.

| beat | line | camera (key at the end of travel; screen position of the subject) |
|---|---|---|
| 0 | What happens inside your body in a single second? | hand + stopwatch, 0.16 mm/px (watch Ø ≈ 350 px at (540, 1010)), slow pull-in from 0.88× |
| 1 | Start the clock. \| The strangest part comes last. | push to 0.135 mm/px, watch at (540, 940). Click at ≈ 4.79 s |
| 2 | In that second, your heart beats about once. | pull back, 0.46 mm/px: heart at (600, 700) ≈ 260 px; watch at ≈ (394, 1135) |
| 3 | Each beat pushes out about seventy milliliters of blood. | push in, 0.24 mm/px: heart ≈ 500 px at (560, 760) |
| 4 | Your fastest nerve signals … 120 m/s. | DIVE 1.7 decades into the thumb pad (travel 2.3 s) to 5 µm/px: section centre at (540, 900). Surface at y ≈ 660, nerve ≈ 980, venule ≈ 1080 |
| 5 | Fast enough to cross a soccer field \| in under one second. | slow pan along the nerve (+1.6 mm over 3.6 s), 4.6 µm/px |
| 6 | Now dive into a blood vessel. \| It's crowded with red blood cells. | DIVE 1.7 decades (2.2 s) to 0.1 µm/px: venule centre at (540, 880). Lumen 60 µm ≈ 600 px tall, red cell ≈ 75 px |
| 7 | You have about twenty-five trillion of them, \| most of the cells in your body. | pull back to 0.145 µm/px and drift downstream |
| 8 | Each one laps your whole body in about a minute. | ride the flow +85 µm over 3 s, 0.13 µm/px |
| 9 | To replace them, your bone marrow never stops. | PULL OUT 4 decades (2.1 s) through the hand to the body, 1.5 mm/px: centre (0, −1.12) at (540, 900); head ≈ 480, pelvis ≈ 1015 |
| 10 | It makes two to three million red cells, \| every single second. | DIVE 4 decades (2.3 s) into the hip bone, 0.12 µm/px, marrow centre at (540, 880) |
| 11 | Each one lives about a hundred and twenty days, \| then it's recycled. | slight pull back, 0.145 µm/px, drifting +20 µm |
| 12 | Zoom back out. \| Every few seconds, you breathe in about half a liter of air. | PULL OUT 3.9 decades (2.4 s) to the chest, 1.0 mm/px: (0, −1.24) at (540, 900); head ≈ 390, lungs ≈ 810 |
| 13 | And your body runs on about a hundred watts, \| like a bright old light bulb. | whole body, 2.2 mm/px: feet at y 1250, head ≈ 455 |
| 14 | Now, the strangest part. | slow pull to 2.6 mm/px (feet 1255, head ≈ 580): room above the head for the reveal numbers (y 330–560) |
| 15 | Every day, you replace roughly 330 billion of your own cells. | 2.7 mm/px hold (head ≈ 610) |
| 16 | That's about one percent of you, \| almost four million cells every second. | hold |
| 17 | Mostly blood and gut. \| In about three months, most of your blood is new. | push to the belly, 1.2 mm/px: gut at (540, 880) |
| 18 | By the end of this video, \| you're not quite the same person who started it. | pull back to 2.9 mm/px (feet 1240), then a slow pull-out (push 1.04) |

All the dives use makeCamera's zoom-tied pan. The target slides into the centre during the last part of each zoom, so whatever you dive into must already be visible where it lies.

## Scenes

### 17A — Act I: the hand and the heart (beats 0–3)

- **s00-hook.js** (no captions, no chapter, layer 2):
  - OWNS a refined hand + stopwatch for the whole film. The hand starts at env's `WRIST`; the palm sits behind the case; the fingers wrap the right edge; the thumb pad rests on the crown at `P.thumb`.
  - The hand is glass like the body, with a rim light; at hook scale it needs knuckle and nail detail.
  - The stopwatch: a brushed steel case, crown and lugs, a cream dial with a 60 s track, an accent sweep hand reading `clockTime`, a small 30-minute sub-dial, and a glass specular highlight.
  - Masked headline: `YOUR BODY IN` / `ONE SECOND` (with "ONE SECOND" in the accent), at y 380–600, readable ≥ 1.2 s.
  - The hand must also read when small (≈ 30 px at body scale) and when the camera passes through it in beat 9.
- **s01-start-clock.js:**
  - The thumb presses the crown at `clockStart` (≈ 4.79 s), with a click `tick` and a ring pulse.
  - A tick accent on every second after that.
  - Tension, with no label; at most a small "0.00 s" readout.
- **s02-heartbeat.js:**
  - OWNS an anatomical glass heart (chambers hinted, aorta arch, coronary vessels) at `P.heart`, beating on `clockTime` at ≈ 63 bpm.
  - On the beat, a pulse wave runs down the arm vessels to the hand.
  - Label "≈ 1 beat" / "per second, at rest".
- **s03-seventy-ml.js:**
  - The ejected volume becomes a measured glowing dose (e.g. a 70 ml measuring vial filling beside the heart, with ticks).
  - Label "≈ 70 ml" / "2.4 fl oz · each beat".
  - Hand the eye to the thumb before 15.6 s: the dive goes there.

### 17B — Act II a: skin and blood (beats 4–8)

- **s04-nerve.js:**
  - OWNS the fingertip section. Its layers dissolve in during the dive (the placeholder uses `microK(v, 9e-5, 2.5e-5)`, gated near `P.skin`).
  - Bridge it with fingerprint ridges that become the section's ridged surface.
  - Draw a ridged epidermis with cell texture; a dermis with collagen texture, capillary loops and Meissner corpuscles; a myelinated nerve bundle at `SKIN.nerve` with branches up to the corpuscles; the venule at `VESSEL`; fat lobules below.
  - On the line, a signal pulse races along the nerve (fast, with a trail).
  - Label "120 m/s" / "≈ 270 mph · fastest nerve fibres".
- **s05-soccer-field.js:**
  - The camera pans along the nerve while the pulse keeps firing.
  - An overlay inset of a top-down soccer pitch (≈ 105 m). A pulse crosses it in 0.875 s on "in under one second", with a timer reading 0.88 s.
  - Label "< 1 s" / "across a soccer field".
- **s06-into-vessel.js:**
  - OWNS the venule interior: endothelial walls with nuclei, plasma with depth haze, and red cells as biconcave discs tumbling downstream.
  - A deterministic, screen-bounded stream (placeholder: 40 µm/s on screen), with a few platelets and an occasional white cell.
  - Depth of field: blurred near-plane cells passing in front.
  - No label on phrase 1; phrase 2 can tag "red blood cells".
- **s07-trillions.js:**
  - Pick one cell out (a ring and a leader).
  - Label "25 trillion" / "about 84% of your cells".
- **s08-one-lap.js:**
  - Follow the stream.
  - An overlay mini-diagram of the circuit (heart, lungs, body, heart) with a dot completing one lap.
  - Label "≈ 1 min" / "one lap of your body".

### 17C — Act II b + Act III a: marrow, breath, power (beats 9–13)

- **s09-marrow-map.js:**
  - On the pull-out, the glass body shows a refined skeleton (clip with `bodyPath`).
  - The red-marrow sites glow in the accent: pelvis, spine, sternum, ribs, skull, femur heads.
  - The right iliac crest (`P.marrow`) pulses last; that is where beat 10 dives.
- **s10-cell-factory.js:**
  - OWNS the marrow world, gated near `P.marrow`. The dive needs bridge layers so the 4 decades are never a void: cortical bone surface → trabecular lattice → marrow.
  - In the marrow: fat cells, developing cells, and a sinusoid where new red cells squeeze through the wall (shedding their nuclei) into the stream.
  - A small "births per second" sparkle rhythm.
  - Label "2–3 million" / "new red cells every second".
- **s11-lifespan.js:**
  - A 120-day timeline. One cell ages (paler, stiffer) and is engulfed or recycled ("spleen and liver").
  - Label "120 days" / "then recycled".
- **s12-breath.js:**
  - OWNS refined glass lungs (bronchial tree hinted) that fill on phrase 2. Air glow comes in through the trachea.
  - Label "≈ 0.5 L" / "17 fl oz · each breath".
  - The marrow world from s10 dissolves out during "Zoom back out".
- **s13-hundred-watts.js:**
  - The whole body warms with a thermal glow (clip with `bodyPath`).
  - A refined filament bulb lights beside the body (x ≈ 800, y ≈ 700) on "like a bright old light bulb".
  - Label "≈ 100 W" / "like a bright old light bulb".

### 17D — Act III b: the reveal (beats 14–18)

- **s14-strangest.js:**
  - Near-silence, a slow push, no label.
  - Tiny sparks begin to appear across the body (inside `bodyPath`).
- **s15-330-billion.js:**
  - Sparks everywhere, denser in the blood and gut.
  - Label "330 billion" / "cells replaced every day" above the head (y 330–560).
- **s16-every-second.js:**
  - A counter of cells replaced *since the clock started* (`cellsReplaced`). It rolls at ~3.8 million/s and reads ≈ 255–270 million here.
  - Next to it, "≈ 4 million / second" and "≈ 1% of you, every day".
  - Tie it to the stopwatch: the hand is visible.
- **s17-blood-and-gut.js:**
  - Push in to the belly: the vessels (blood) and the gut lining light up in the accent.
  - Label "≈ 3 months" / "most of your blood is new".
- **s18-new-you.js:**
  - Pull back to the whole person, with the counter and stopwatch still running.
  - End on "≈ 320 million new cells since you pressed play".
  - A final glint across the body; optional end card "ZOOM OUT · INSIDE YOU".

## Ownership

Builders own **only** their scene files. Do **not** edit `engine/*`, `camera.js`, `env.js`, `episode.json`, any `.md`, or other scenes. Shared needs (framing, timing, colours, body shape) go in "sharedRequests".

- Every `arc()` radius uses `Math.max(0, r)`.
- Nothing random: use `L.rng` / `L.noise1`.
- Keep frame cost low (env ≈ 100 ms at 1 sub-frame).
