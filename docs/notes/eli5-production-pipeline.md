---
name: eli5-production-pipeline
description: "The channel is \"The Short Answer\" in /Users/colas/ELI5Shorts/TheShortAnswer; videos are code-rendered (motion graphics + Kokoro TTS + synthesized audio)"
metadata:
  node_type: memory
  type: project
  originSessionId: 0269dd66-0632-4ea5-b673-52aab4ca9f38
  modified: 2026-10-19T18:51:00.950Z
---

Channel name: **The Short Answer** (named 2026-10-19; tagline "Big questions. Thirty seconds."). Everything lives in `/Users/colas/ELI5Shorts/TheShortAnswer/`: `README.md` (channel bible with script rules), `.venv/` (Kokoro TTS etc.), `models/` (Kokoro model files), `episodes/<NN-slug>/` each with `script.md`; rendered episodes also hold `episode.py`, `common.py`, `voice.py`, `audio.py`, `render.py`, `build.sh`, `out/`.

As of 2026-10-19: episodes 01 (sky blue) and 02 (internet) are rendered; 03 inflation, 04 sleep and 05 AI chatbot have rewritten scripts only. Default voice is af_heart; the user hasn't picked from the auditions yet.

**Why:** the user wants "everything" made per video (animation, voice, video) in a mature style; see [[mature-style]].

**Update 2026-10-19:** a shared headless-Chrome engine now lives in `/Users/colas/ELI5Shorts/engine/` (README there): Canvas scenes in world space, camera.js/env.js per episode, motion blur, shots.mjs/bench.mjs review tools, py/voice.py + py/audio.py. New episodes use it with a build → review → fix Workflow; Zoom Out 03 (ocean, ZoomOut/episodes/) is the pilot and template. The Pillow renderer below is legacy (TSA 01–02).

**How to apply (legacy Pillow path):** for a new episode copy `episodes/02-how-does-the-internet-work/` (generic render.py reads SLUG + thumbnail() from episode.py), keep common.py, rewrite episode.py from script.md (7 lines = 7 scenes). Check `render.py --preview` contact sheets before the full render. Font gaps: Avenir/Helvetica lack "→" and "∝"; Helvetica has λ, subscripts, superscripts.
