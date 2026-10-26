# Hook-version brief (07b, 08b, 09b)

Root: the repo root. Python: TheShortAnswer/.venv/bin/python. Read engine/README.md for engine rules and tools/README.md for the tools.

## The model to copy
ZoomOut/episodes/06b-how-high-is-space-hook is the reference: a finished hook version of 06. Diff its episode.json against ../06-how-high-is-space/episode.json, then read:
- scenes/p-cold.js;
- scenes/s13-question.js;
- its camera handling of the appended beat (the last shot is held);
- thumbnail.json (time = original time + preroll offset);
- youtube.md.

Also read engine/runtime/main.js (the `preroll` handling) and engine/py/voice.py (`holds`, the preroll `hold`).

## Steps
1. **Copy the original.** Run `rsync -a --exclude build --exclude out ZoomOut/episodes/<orig>/ ZoomOut/episodes/<new>/`. Never modify the original folder.
2. **episode.json.**
   - Set `slug` to the new folder name.
   - Add `"preroll": {line, scene:"scenes/p-cold.js", from, rate (0.25–0.4), overlays:false|true, hold:0.2}`.
   - Append the question line and a scene `scenes/s13-question.js`.
   - Add `"captionY": 1450`.
   - Add `voice.holds` for the old final line, so that beat keeps its ORIGINAL duration. Compare against the original build/timeline.json.
   - `overlays`: use false unless the replayed overlays are wanted and don't clash with the headline. The preroll scene's own headline always draws.
3. **Run voice.py,** then pick `preroll.from`. It is a main-timeline time chosen so the payoff visual is ALREADY on screen on frame 1. The replay covers from → from + rate × preroll length.
4. **p-cold.js.**
   - Headline of 1–2 lines, fitted with L.fitSize to ≤ 940 px, readable on frame 1 with no fade-in.
   - Place it in a clear band; the HUD is off during the preroll.
   - Keep it off the payoff subject.
5. **sNN-question.js.**
   - Build it from 06b's s13-question.js, using the A/B or A/B/C choices given.
   - The card is fully opaque, between x 80–940, with its bottom above about 1300 and clear of the captions (y 1380–1520).
   - Every line is fitted. Even gaps, laid out top-down from text metrics.
   - The card fades in about 0.4 s after the beat starts. The previous beat's labels must be gone first, with no ghosting through the card.
   - Phrases are synced to the timeline.
   - The film's final image stays held behind the card.
   - The camera must hold the last shot for the appended beat; check camera.js for KEYS-length assumptions.
6. **Beat-relative timing.** The preroll approach keeps beat indices unchanged, but the main film now starts at gt = preroll length. Grep every scene and env.js for timing based on absolute `v.gt` from 0, and make it beat-relative. Previous bug: 05b's hook intro never played because of this. Also check any `tl.scenes[N]`, `voClock(N)` or `beat === N` assumptions, and the HUD clock: it must show mm:ss and never values like "00:60".
7. **thumbnail.json:** new time = old time + the preroll offset. Check that the headline frame is identical to the original's.
8. **youtube.md.**
   - Header: hook version, plus a one-line note that the original stays in ../<orig>.
   - Add the question line to the description.
   - Add a pinned comment with the choices.
9. **Verify with shots** (prefix with your id). Cover:
   - t = 0, 0.05 and 2;
   - the preroll → film cut;
   - each beat start;
   - the transition into the question beat at 30 fps over ±0.6 s;
   - the card at the end.

   Use --sub 8 for anything moving, and READ every frame.

   Do NOT run render.mjs, cues.mjs or audio.py; the orchestrator renders. Delete your shots when done.

## Report
- The duration.
- The preroll from and rate.
- The beat start times.
- What you changed, per file.
- Anything uncertain.
