# Motion Principles

> **Make a dynamic 30-second motion graphics video about the subject that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.**

These rules apply to every video on every channel (The Short Answer, Zoom Out). Dynamic and clear are not in tension: the motion should guide the eye, not compete with it.

## 1. Clarity first

- **One idea on screen at a time.** Each beat has exactly one focal point. If two things move, one leads and the other supports.
- **The mute test:** someone watching once, without sound, should be able to say what the video was about.
- **The explain-back test:** after one watch with sound, a viewer can repeat the core idea in one sentence.
- At most **two text elements** besides the caption (e.g. one big number + one small unit line).

## 2. Pacing: not too fast

- **Script:** 55–70 words for 30 seconds (≈ 140–150 wpm effective). Fewer words means more room for visuals to land.
- **Voice:** a slightly calm delivery (Kokoro `SPEED=0.92`), plus a **0.4 s breath** between lines.
- **Hold rule:** after a beat's key visual lands, hold it **≥ 0.8 s** before the next change.
- **Text rule:** any label stays readable for **≥ 1.5 s**; the hook headline for **≥ 1.2 s**.
- **Change rate:** at most one *major* visual change every **2–3 s**. Secondary motion keeps it alive in between.
- Watch it once at phone size, on mute. If anything feels rushed, it is: cut words, not holds.

## 3. Dynamic: the motion-design craft

- **The camera is never dead still.** There's always a slow push, drift or parallax (2–5% over a beat).
- **Continuous camera between scenes:** zoom-throughs, match cuts, morphs (a stack of bills *becomes* the briefcase; a molecule *becomes* the next scene's dot). Avoid hard cuts.
- **Nothing pops on or off.** Entrances ease out (cubic or back, 0.3–0.6 s); exits ease in and are faster than entrances.
- **Overlapping action:** stagger groups by 40–80 ms; let elements overshoot and settle.
- **Depth:** 3 parallax layers (background, midground, foreground particles), soft glow, light sweeps, motion trails on fast moves.
- **One signature transition per video**: a "how did they do that" moment, planned in the script's scene table.
- Every shot works as a still frame: pause on any random frame and it should look composed.

## 4. Readability and hierarchy

- Big number in the accent colour, unit and context small and grey.
- Strong contrast; labels on dark backings when over busy visuals.
- Keep everything out of the bottom ~20% and the right ~120 px (YouTube UI).

## 5. Sound sync

- Every visual hit lands on a sound (tick, whoosh, impact), and every transition lands on a beat.
- Music ducks under the voice; the reveal gets the biggest hit plus a short moment of near-silence.

## 6. Checklist before export

- [ ] Script ≤ 70 words, 7 lines, voice at SPEED 0.92
- [ ] Every beat has a single focal point
- [ ] No label is on screen < 1.5 s
- [ ] The camera moves in every shot; no hard cuts without a reason
- [ ] The signature transition is in and it reads clearly
- [ ] Mute test and explain-back test pass
- [ ] Random-frame test: 5 random pauses, all composed

## How we meet these rules

**Engine:** [`engine/`](engine/README.md) draws Canvas 2D frames in headless Chrome and pipes them to ffmpeg.
- **Camera and scenes:** a per-episode camera (zoom/pan/fly with a mid-travel zoom-out), and scenes drawn in world space so shots flow into each other.
- **Motion blur:** 4 sub-frames per frame.
- **Shared house style:** chapter cards, word-by-word captions, big-number labels, vignette and grain.
- **Voice:** Kokoro at `SPEED=0.92` with a 0.4 s line gap by default.

**Process** (the method from the Sonnet 5.5 "Reddit reel" benchmark):
1. **Orchestrator:** owns the shared files (engine, `camera.js`, `env.js`, `episode.json`) and writes a `BRIEF.md` per episode.
2. **Builders:** each owns exactly one or two scene files and iterates by rendering contact sheets (`engine/node/shots.mjs`) and actually looking at them.
3. **Reviewers:** independent and never edit. They render their own evidence and return a defect list (severity, beat, time, fix).
4. **Fixers:** run only where a reviewer said "fix".
5. **Whole-film reviewer:** checks continuity.
6. **Final pass:** the orchestrator applies shared-file fixes, renders in the background, and checks the final MP4.

The Short Answer 01–02 were made with the older Pillow renderer, before these rules. They can be rebuilt on the engine.
