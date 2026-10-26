# Lessons from the 04b–09b audits (apply them from the start)

## Models to copy
- Copy the question card from 09b (ZoomOut/episodes/09b-how-much-water-is-on-earth-hook/scenes/s13-question.js), the newest version. Its rules:
  - The card is OPAQUE from its first visible frame. Only scale (0.96→1) and lift (~24 px) animate, never alpha.
  - The entrance is gated on output-frame time `round(gt*30)/30`, so motion-blur sub-frames never show a translucent card.
  - The A/B choices start as faint placeholder pills and light up on their spoken words, using timeline phrase/word times.
  - Card about 840 wide. Bottom above about 1300; nothing at x > 940.
- The preroll replay normally uses `overlays:false`, so the film's labels don't clash with the headline. The headline text must say the same thing as the voiced hook line.
- Captions:
  - Numbers in captions show as numerals with the `{numeral~spoken words}` line syntax (see 09b episode.json).
  - The STT check must transcribe every line correctly. Avoid words a TTS slurs; the "Blow one up" line was misheard in 07b.

## Defects the auditors flagged before (avoid them up front)
- **Absolute v.gt timing in scenes and env.** The main film now starts at gt = preroll length. Use beat-relative time (`v.gt - tl.scenes[0].start`, or the scene's local t). Also check hard-coded beat indices: `tl.scenes[N]`, `voClock(N)`, `beat === N`.
- **Label lifecycle.** Labels must fade out (0.3–0.5 s) before or at the next beat. Never pop, and never ghost over the next beat or through the question card.
- **Camera timing.** The camera must ARRIVE on a subject before the narration names it (compare the camera keys with the timeline word times).
- **HUD clocks.** Clocks must be correct: mm:ss, frame-quantised `n30 = Math.round(v.gt*30)`, never "00:60", never jumping backwards.
- **Captions.** Captions (y 1380–1520) need a soft backing whenever a bright subject sits under them. Never use a hard band.
- **Thumbnail.** Keep the text out of the YouTube-buttons area (x > 940, y > 1100) and the bottom 18%.
- **youtube.md.** Include source links and a pinned comment with the choices, plus a "Real answers" paragraph for my reference. Every number on screen must match script.md and the narration.

## Added during the 10–15 audits
- **Frame-stable counters.** Any counting number drawn in a scene (drawOverlay/drawWorld) must compute its value from `Math.round(v.gt*30)/30`. Otherwise motion-blur sub-frames blend two values ("119" over "120").
- **No spoilers.** The film must never show the answer to the closing question.
- **No vanishing subjects.** A subject named in the caption must stay in frame until its line ends.
