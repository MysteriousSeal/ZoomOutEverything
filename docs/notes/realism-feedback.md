---
name: realism-feedback
description: User rejects physically wrong layering (people drawn over cars) and fake-looking Earths (blob continents); videos must be watched end-to-end for such issues
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0269dd66-0632-4ea5-b673-52aab4ca9f38
  modified: 2026-10-20T15:39:49.621Z
---

The user watched the Zoom Out videos and flagged two kinds of problem: people drawn in front of cars (wrong depth or layer order in street scenes), and an Earth that "doesn't look like the Earth" (blob or invented continents instead of real coastlines). They asked me to watch the videos myself to find issues like these.

**Why:** the agent reviews checked composition, text and timing, but not physical plausibility. Viewers notice a fake Earth or people walking through cars right away, and it cheapens the premium look ([[mature-style]]).

**How to apply:**
- Every globe should use real coastlines. ZoomOut/episodes/14 has the NOAA ETOPO data (data/etopo6.bin); engine/runtime/earth.js (drawEarth, project, geoPath; data in engine/assets/etopo6.bin) is now the shared real-Earth renderer, and all globe episodes use it.
- Street scenes need correct depth order: pedestrians on sidewalks or crossings only when cars are stopped, and nothing overlapping that is physically impossible.
- Before shipping, extract frames from the final MP4 (about every 0.5 s) and look at them as a viewer, not only at the agent shot sheets.

Related: [[zoomout-channel]].
