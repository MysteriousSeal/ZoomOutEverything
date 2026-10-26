---
name: quality-benchmark-reddit-reel
description: "The user's quality bar is a Sonnet 5.5 code-rendered Reddit motion reel (headless Chrome canvas + ffmpeg + numpy audio, multi-agent build/review/fix)"
metadata:
  node_type: memory
  type: reference
  originSessionId: 0269dd66-0632-4ea5-b673-52aab4ca9f38
  modified: 2026-10-19T19:02:28.989Z
---

On 2026-10-19 the user shared a r/ClaudeCode post ("Sonnet 5.5 built a 30 s motion-graphics reel") plus its video (`/Users/colas/Downloads/m2-res_480p.mp4`, 854x480, 30 s, music+SFX only, no voiceover) as the target to understand. Its prompt is the same principle the user adopted: "make a dynamic 30-second motion graphics video about <subject> that shows what an incredible motion designer you are. and not too fast, people should actually understand what the video is about."

How it was built: Canvas 2D frames rendered in headless Chrome, piped to ffmpeg; numpy-synthesized soundtrack; Workflow tool with 5 scene-builder agents (one scene file each, shared timing/compositor/lib owned by the orchestrator), 5 reviewer agents reading contact sheets and returning a defect list, then conditional fixer agents; `shots.mjs` (contact sheets and frames) and `bench.mjs` (ms per frame); render run as a background job.

Craft observed: a persistent HUD frame (corner labels, timecode, tick ruler, numbered lower-third chapter cards), bold condensed display type, continuous transitions (zoom-through a logo into an iris wipe, particles converging into a logo mosaic), motion blur, rolling-digit counters, bevels/shadows/depth of field, about 10 beats of ~3 s each with clear holds.

**How to apply:** treat this as the bar for both channels ([[eli5-production-pipeline]], [[zoomout-channel]]). The PIL renderer can't reach it; the planned upgrade is a headless-Chrome canvas renderer with a camera, transitions and motion blur.
