# Build lessons (from episodes 25–28): read before building a Zoom Out short

Every item below is a real defect that reached a render and had to be fixed. Check for each one yourself before you report.

## Text and readouts
- Every text, number, readout (7-segment clocks, counters, dates) must sit fully INSIDE its plate/box with even padding. Fit with `L.fitSize` or measure; never assume a string fits. (Ep 25: a clock's digits spilled out of their panel.)
- Skewed/italic text: transform around the text's own baseline, never the canvas origin.
- Count-ups: never show in-between values that read as data ("≈ 1.03 °C"): reveal the value as the bar lands, or count only in whole, frame-quantised steps with "≈" shown only once landed.
- No placeholder text that reads as broken ("≈ ··%"). No label sitting alone without the number it qualifies.
- Labels must not repeat the caption word for word right above it; add information instead.
- Leader lines must touch their label and their target.
- Labels near a card edge: ≥ 20 px padding; right-column labels right-aligned with margin.
- Legends must cover every colour the data shows.
- Use proper typography: × ≈ – ’ “ ” · °; test that the font has the glyph (Avenir has no arrows or Cyrillic: draw arrows).

## Cards, overlays, transitions
- Cards opaque from their FIRST frame (draw the plate at full alpha; scale/slide/wipe it in; fade only its contents). Never let the engine's scene fade make a card see-through.
- No ghost figures/labels: when a card exits, fade its contents first, then the plate fast, the dim last.
- No empty cards/badges: content arrives with the plate (≤ 0.3 s empty max).
- No orphan tiles/chips lingering 2+ frames after their title.
- No 0.2 s dead frames between beats: cross-fade titles.
- The HUD top bar and captions must stay readable: scrims/plates behind them over busy backgrounds.

## Composition and realism
- No large empty or black areas (e.g. half the frame black in a hook). Frame the subject to fill the screen.
- Nothing cropped at frame edges unintentionally (fade elements before they cross the edge).
- Real Earth only (earth.js, real coastlines); no flat white "ice blob" stickers; clouds feathered and shaded.
- People only as refined ISO 7010 / airline safety-card pictograms (solid, no face), never crude. Check every pose zoomed in: on the ground line, no seams, no stray wedges, limbs readable, the pose matches the narration exactly.
- Don't draw things over the subject they label (draw order); YOU/markers above effects.
- Safe zones: nothing important at x > 940 below y 1100; y > 1580 clear; captions y 1380–1520; HUD y < 340.

## Timing and sound
- All times from build/timeline.json (beat starts and lines[].phrases): never hard-code seconds. The voice can be re-cut later.
- Visuals land ON the word (not 1 s early). Labels hold ≥ 1.5 s.
- Sound cues must not land on a word's onset or mask speech (keep cues ≥ 9 dB under the voice in the speech band); put whooshes in the gaps.
- Flashes: one bloom, no strobe; avoid sudden full-frame luminance drops (the dark-frame scanner flags them).

## Process
- Check every beat with shots (`--sub 8` at moves) and READ them at full resolution, zoomed in on each element.
- Determinism: no Math.random; seeded RNG only; frame-stable digits.
- After rendering: contact sheet (1 frame / 2.5 s) + full-res frames at every element; the final MP4 is what counts.
