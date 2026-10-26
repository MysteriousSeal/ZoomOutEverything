# Creative brief — Zoom Out 02: A Million vs a Billion vs a Trillion Seconds

**North star:** *Make a dynamic 30-second motion graphics video that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*
Read `../../../MOTION-PRINCIPLES.md` and `../../../engine/README.md` (scene contract) first. Zoom Out 03 (`../03-how-deep-is-the-ocean/`) is a finished reference for the house style and code quality.

## The film

**A dive into the past.** A vertical timeline: **NOW** is pinned near the top (screen y = 430) and the past runs downward. The camera has a single parameter, **seconds per pixel**. It keeps zooming out, so each step compresses the previous one into a sliver near NOW: powers-of-ten, but for time.
- The spine, tick labels and NOW marker come from `env.js`. Your scenes add the **meaning**: bars that measure spans, life and history markers, and the comparisons.
- **World coordinates:** `y` = seconds ago. Use `v.wy(seconds)` for the screen y. Place content to the right of the spine (`env.SPINE_X` = 230) in screen x.

**Look:** dark, warm, editorial, like a premium museum timeline in motion. Accent gold `[245, 200, 90]` for spans and numbers; warm whites; refined line icons and silhouettes (calendar, suitcase, a person growing up, pyramid, mammoth, hand-print cave art, Capitol dome or banknote stack for the debt). No cartoon faces, no emoji.

**Motion:** spans **draw down** from NOW like a measuring tape, with a glowing head and a trailing gradient. Markers slide in from the right as the camera reveals them. When a zoom-out compresses a span, let it visibly *shrink into* the sliver near NOW and leave a tiny glowing tick behind, so the viewer feels the scale change.

## Timing (build/timeline.json; ~29.6 s; lines with "|" have a pause, see `phrases`)

| beat | time | line | camera |
|------|------|------|--------|
| 0 | 0.00–2.77 | "How long is a million seconds?" | 1 screen ≈ 1 minute; seconds tick |
| 1 | 2.77–6.54 | "About eleven and a half days. … A short vacation." | zoom to 1e6 s on ~750 px |
| 2 | 6.54–9.57 | "A billion seconds is almost thirty-two years." | zoom to 1e9 s |
| 3 | 9.57–12.59 | "That's the difference between a million and a billion." | same framing, slight push |
| 4 | 12.59–18.50 | "A trillion seconds ago, mammoths still roamed the Earth, … and humans were painting caves." | zoom to 1e12 s |
| 5 | 18.50–21.54 | "That's thirty-one thousand, seven hundred years." | hold, slight push |
| 6 | 21.54–29.57 | "And counting the US national debt, one dollar per second, … would take over a million years." | zoom to 3.7e13 s |

At each beat the key span ends near screen y ≈ 1180 (NOW + 750 px). Captions sit at y ≈ 1335.

## Scenes

### s0-hook.js (beat 0; no captions, no chapter)
- **Headline**, masked and staggered: `HOW LONG IS` / `A MILLION` / `SECONDS?` ("A MILLION" in gold). Readable ≥ 1.2 s; it must leave cleanly by the end of the beat.
- A big **seconds counter** ticking up in real time (DIN numerals, rolling digits) beside the spine, and a short gold span growing from NOW at real speed (1 s = 1 s).

### s1-million.js (beat 1)
- A gold span draws down from NOW to 1e6 s as the camera zooms out. At its end: "11.6 days" (bigLabel) / "1,000,000 seconds".
- On "A short vacation", a refined **suitcase + calendar** icon pair (a calendar strip flipping 11–12 pages) appears beside the span.

### s2-billion.js (beat 2)
- The million span **shrinks into a sliver** near NOW (it stays visible as a tiny glowing tick labelled "1 million"). A new span draws down to 1e9 s = **31.7 years**.
- Alongside it, a **person silhouette growing up** from child to adult (4–5 stages along the span) makes the years tangible. Label "31.7 years" / "1,000,000,000 seconds".

### s3-compare.js (beat 3)
- **Side-by-side comparison**: a magnifier circle on the sliver near NOW shows the million span ("11.6 days") next to the full billion span ("31.7 years"). A clear "×1,000" between them. The point: the same "-illion" word, wildly different size.

### s4-trillion.js (beat 4)
- Zoom out to 1e12 s. The billion span collapses to a tick ("a lifetime"). **History markers** slide in along the spine as they're revealed:
  - Great Pyramid ≈ 4,500 years ago
  - first writing ≈ 5,200 years
  - farming begins ≈ 12,000 years
  - peak of the last ice age ≈ 20,000 years
- At ≈ 31,700 years: **mammoth** silhouette + **cave-art hand prints**, landing on "mammoths" and "painting caves" (use the phrase times).
- The span reaches 1e12 s with a glowing head.

### s5-span.js (beat 5)
- The hold on the full trillion span: "31,700 years" (bigLabel) / "1,000,000,000,000 seconds". The history markers stay, emphasising that **all of recorded history sits in the top ~16%** of the span (a soft bracket "all written history").

### s6-debt.js (beat 6, payoff)
- A **dollar counter** (rolling "$" digits) racing up to "$37+ trillion" while a span draws down at "$1 per second". The camera zooms out to 3.7e13 s, and the trillion span (with all of human history) collapses into a sliver near NOW.
- Along the way, markers for **Homo sapiens ≈ 300,000 years** and "Homo erectus era ≈ 1 million years".
- Payoff: "1,000,000+ years" (bigLabel) / "to count the US debt, $1 per second". Hold.
- Keep the debt figure as "$37+ trillion" (it was above $37T in late 2025 and has kept rising).

## Ownership

Each builder owns **only** their scene file(s). Do **not** edit `engine/*`, `camera.js`, `env.js`, `episode.json`, `BRIEF.md`, `script.md` or any other scene. Shared needs go under "sharedRequests" in your report.
