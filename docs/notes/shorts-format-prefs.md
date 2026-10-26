---
name: shorts-format-prefs
description: Current Zoom Out short format the user wants (2026-10-26): ~60 s, v4 voice at natural pace, "Tell me in the comments" ending, title in top bar
metadata:
  type: feedback
---
- New Zoom Out shorts are about **60 s** (user raised it from 40 s on 2026-10-26; 25/26/27 came out 60–67 s).
- Brittney always ends with a comments call: the last line finishes with "Tell me in the comments." (or similar).
- Voice: **Eleven v4 at its natural pace, no speed setting** (default in engine/py/voice.py EL_DEFAULT since 2026-10-26; replaces v2 at speed 1.1). v4 supports /with-timestamps and previous/next text.
- Episodes are released out of order: no `episodeLabel`; the top bar shows ZOOM OUT · <TITLE>.
- Workflow the user likes: I propose 3–4 topic ideas and a draft script via AskUserQuestion, they pick, then I build.

**Why:** user's explicit requests on 2026-10-26.
**How to apply:** every new short. See [[zoomout-channel]] for the build process.
- Every episode ships with a `youtube.md` (title, description ending "Tell me in the comments", sources, hashtags, tags, pinned comment with the A/B choices). The user had to ask for 25–28's: write it as part of the build, not after.
