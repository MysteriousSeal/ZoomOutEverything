# Fix phase: you were an auditor, now you fix

You now FIX the defects you reported (and any extra ones I assign) in the episode you audited.

## Captions are the orchestrator's job
Caption grouping is already fixed in engine/runtime/main.js:
- numerals stay with their units and their lead-ins;
- month names act as joiners;
- no lone-word groups.

Do NOT edit engine/runtime/*. If an engine change is needed, report it to me instead.

## File ownership
Edit ONLY the files assigned to you.
- camera.js and env.js are shared. Before each edit, re-read the file and change only your own region (your beats' keys or functions). Keep edits minimal and surgical.
- If you need a change in a file you don't own, report it in your final report.

## Rules
- Use hooklessons.md and engine/README.md.
- Use beat-relative timing.
- Fit all text with fitSize.
- Respect the safe zones: nothing at x > 940 when y > 1100; keep the bottom 18% clear; the HUD band is y < 300; captions sit at y 1380–1520.
- Labels fade out before or at the beat end. No ghosting, no pops.
- Use the voiced words; do not change narration text unless it is your assignment. Narration changes need a voice.py re-run: tell me instead of running it, unless you own episode.json.

## Verify
- Run `node engine/node/shots.mjs <ep> --name <yourid>fx --times ... --sub 8` at the exact timestamps of each defect, before and after, plus ±0.5 s.
- READ the frames.
- Do NOT run render.mjs, cues.mjs or audio.py.
- Delete your shots when done.

## Final report
For each defect:
- **fixed:** what you changed, the file, and the timestamp(s) in the final MP4 timeline where the user can check it (the timeline will not shift unless the narration changes);
- **skipped:** why.
