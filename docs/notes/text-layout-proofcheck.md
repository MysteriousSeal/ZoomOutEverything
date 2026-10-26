---
name: text-layout-proofcheck
description: User caught a headline overflowing its card in 03b; every new text element must be fitted and checked at full res before shipping
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0269dd66-0632-4ea5-b673-52aab4ca9f38
  modified: 2026-10-21T09:31:39.040Z
---

On 03b the user screenshotted "HOW DEEP WOULD" running past its card's border, then a cramped prompt and arrow under the last option. For 04b they asked me to "proofcheck the design to not make mistakes like for 03b".

**Why:** small layout slips (overflow, cramped spacing, ghosting, a wrong clock) read as amateur, and the user notices them right away.

**How to apply:** for any new overlay or card:
- Fit every line with `L.fitSize` to its real box.
- Lay the card out top-down with explicit gaps from text metrics; don't hand-place the y values.
- Keep Shorts text clear of the right button column (x > 940 below y ≈ 1100) and the bottom ~20%.
- Make cards fully opaque, so the world's labels don't ghost through.
- A cold-open headline must be readable on frame 1: use scene `overlayIn: false`, with the 0.05 s tolerance for motion-blur sub-frames.
- Episodes longer than 60 s need an `mm:ss` HUD clock. Ep 05 uses 00:SS and shows "00:60" for its last 0.3 s; left untouched by request.
- Inspect crops of every new text element from the final MP4, at full resolution.

Related: [[realism-feedback]], [[zoomout-channel]].
