---
name: mature-style
description: "ELI5 Shorts channel must look and sound adult/documentary, not like a kids' show; voices must be natural, not robotic"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0269dd66-0632-4ea5-b673-52aab4ca9f38
  modified: 2026-10-19T18:26:39.256Z
---

The ELI5 Shorts channel targets adults: "explain like I'm 5" means simple explanations, not childish presentation. The user rejected a first cut with a cute mascot, faces on objects, bouncy-castle analogies, rounded kid fonts and emoji labels ("looks like a kid show"), and rejected macOS `say` voices as robotic.

**Why:** the user wants a mature explainer brand (think Kurzgesagt/Vox-style science shorts), not children's content.

**How to apply:** use a documentary motion-graphics look (deep palettes, glow, diagrams, clean sans typography, grain), keep analogies grown-up, and use neural TTS (Kokoro, installed in `TheShortAnswer/.venv`) or real recordings, never `say`. See [[eli5-production-pipeline]].
