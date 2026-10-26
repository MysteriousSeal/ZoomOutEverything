# "c" cut brief: about 50 s versions of the hook episodes

Goal: a tighter cut of an existing hook ("b") episode, so that I can A/B test the length. The FINAL MP4 must be **48–54 s**, including the cold open and the question card.

## Steps
1. **Copy the b folder.** Run `rsync -a --exclude build --exclude out ZoomOut/episodes/<b>/ ZoomOut/episodes/<c>/`. Never edit the b folder or the original.
2. **Cut narration lines** in episode.json, following the per-episode plan in your prompt.
   - Keep: the cold-open hook, the opening question, the strongest number beats, the twist or payoff, the comment question.
   - You MAY lightly reword a kept line, so the story still flows without the cut line. Keep the facts identical to script.md.
3. **Remove the matching scene files** from the episode.json scene list. Then fix everything that assumed the old beat count or indices:
   - camera.js KEYS (one per beat; the last shot is held for the question);
   - env.js `tl.scenes[N]` and voClock(N) references;
   - chapter numbers or titles;
   - any scene that reads the next or previous beat.
   - Grep for `scenes[`, `beat`, `voClock`, and literal indices.
4. **Bridge the visual handovers.** A scene that used to follow a removed one must still enter cleanly: no jump cut of the camera, no labels arriving from nowhere, and no labels left over from the removed beat.
5. **Voice and timing.** Run voice.py, keeping `holds` only where they still make sense. Then:
   - re-pick `preroll.from` so the payoff visual is on screen on frame 1; the main timeline times have changed;
   - update thumbnail.json `time` the same way;
   - check that the headline frame is identical in content to b's.
6. **slug and youtube.md.**
   - Set `slug` to the new folder name.
   - In youtube.md, add a header saying this is the 50 s cut for an A/B test against <b>. Keep the same title, description and pinned comment, updated if a cut line removed a fact the description mentions.
7. **Verify with shots** (prefix them with your id, use --sub 8 for motion). Cover:
   - frame 0;
   - the preroll → film cut;
   - every beat start, plus ±0.5 s around every NEW handover;
   - the question transition;
   - the end card.

   READ every frame, and apply everything in hooklessons.md. Do NOT run render.mjs, cues.mjs or audio.py. Delete your shots when done.

## Report
- The expected final duration (preroll length + main timeline).
- The lines kept, with any rewording.
- The preroll from and rate.
- The beat starts.
- The changes per file.
- Anything uncertain.
