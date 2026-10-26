# Creative brief — Zoom Out 01: What $1 Billion Actually Looks Like

**North star:** *Make a dynamic 30-second motion graphics video that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*
Read `../../../MOTION-PRINCIPLES.md` and `../../../engine/README.md` (scene contract) first. Zoom Out 03 (`../03-how-deep-is-the-ocean/`) is a finished reference for the house style and code quality.

## The film

**One unbroken pull-back.** We start on a single strap of $100 bills filling the frame and never cut. Each step of the ladder is built *out of the previous one*:
- the strap becomes one bundle inside a briefcase;
- briefcases stack into a shrink-wrapped pallet;
- pallets line up into ten;
- the ten tile outward into hundreds of blocks;
- the blocks fill a football field, stacked two high.

The camera (`camera.js`) handles the zoom; your objects are **3D boxes in world metres drawn in isometric projection** with `env.isoBox / isoPt / isoQuad`, so they stay put while the camera pulls back.

**Look:** a premium product render in motion-graphics form. Clean isometric shapes with three-tone face shading, a crisp highlight edge on top faces, soft contact shadows, and a subtle studio floor grid (env).
- **Bills:** muted US-note green-grey on the faces, a paper-white edge stack with fine lines suggesting individual bills, and the iconic paper band (strap) around each $10k bundle.
- **Accent `[110, 220, 140]`:** for numbers and highlights only.
- **Never:** cartoon money bags, emoji, dollar-sign clip art or faces.

**Motion:** objects *assemble* rather than appear. Bundles drop in staggered with a slight overshoot, the shrink-wrap draws over the pallet, and pallets slide or roll in along their rows. Assembly happens while the camera is pulling back, and the result **holds** while the narrator names it. One focal point per beat.

## Timing (build/timeline.json; ~29.7 s; lines with "|" have a pause, see `phrases`)

| beat | time | line | camera (mpp = metres per pixel) |
|------|------|------|------|
| 0 | 0.00–6.18 | "This is ten thousand dollars in hundred-dollar bills. … About one centimeter thick." | one strap fills the frame (0.34 mm/px), slow ease-out |
| 1 | 6.18–10.27 | "A million dollars weighs ten kilos, and fits in a briefcase." | → 1.25 mm/px (briefcase) |
| 2 | 10.27–13.54 | "A hundred million fills an entire shipping pallet." | → 4.2 mm/px (pallet + human) |
| 3 | 13.54–17.88 | "A billion dollars? … Ten pallets. Ten tonnes of cash." | → 10.5 mm/px (ten pallets) |
| 4 | 17.88–20.98 | "The world's richest people own hundreds of these." | → 4.2 cm/px (blocks spreading) |
| 5 | 20.98–24.65 | "And a trillion dollars? … Ten thousand pallets." | → 12.8 cm/px (whole trillion) |
| 6 | 24.65–29.74 | "Stacked two high, they cover a whole football field." | slow push on the field (12.2 cm/px) |

## World layout

See the header of `camera.js`. Everything starts at the origin corner (0, 0, 0) and grows in +x / +z.

Real dimensions:
- **$100 bill:** 156 × 66.3 mm × 0.11 mm.
- **Strap ($10k):** 100 bills ≈ 1.1 cm.
- **$1M:** 100 straps ≈ 10 kg.
- **$100M:** ≈ 1.14 m³ on a 1.2 × 1.0 m pallet.
- **$1B:** 10 pallets ≈ 10 t.
- **$1T:** 10,000 pallets, stacked 2 high on 5,000 footprints ≈ 6,000 m².
- **US football field with end zones:** 109.7 × 48.8 m.

Helpers in `env.js`: `isoPt`, `isoBox(ctx, v, x,y,z, w,h,d, colour|{top,left,right}, {alpha, stroke})`, `isoQuad`, `faces`, `drawHuman(ctx, v, x, z, k)` (1.75 m person).

**Level of detail:** at far zoom, don't draw 10,000 individual bundles. Draw pallets as single boxes, and big groups as one box per row or block, fading detail by `v.cam.mpp` so it stays fast (the final render is 8 motion-blur sub-frames × 900 frames).

## Scenes

### s0-stack.js (beat 0; captions on, no chapter)
- A single **$10,000 strap** (100 bills) in iso, filling the frame: visible bill edges, the band with "$10,000" printed small, a subtle paper texture and a soft shadow.
- Open on a single $100 bill sliding in, then 99 more riffle onto it (a fast, satisfying stack-up that settles before "About one centimeter thick").
- On the second phrase, a `dimension()` bracket marks the thickness: "1.1 cm" / "0.43 in".
- Big label "$10,000" (bigLabel). Before the camera pulls away (end of beat), duplicates of the strap start to appear next to it, seeding beat 1.

### s1-briefcase.js (beat 1)
- An **open briefcase** (dark leather or aluminium, lid open at ~100°, latches, handle) at the origin, filled with $1M = 100 straps. They drop in by rows in a staggered cascade timed to the pull-back.
- Label "$1,000,000" / "10 kg · 22 lb".

### s2-pallet.js (beat 2)
- A **shipping pallet** (wooden, with visible slats and blocks) holding $100M in neat bundle blocks. Shrink-wrap draws over it with a glossy sheen sweep. The briefcase from beat 1 stays visible on top or next to it for comparison. `drawHuman` stands beside it (x −0.7, z 0.5) for scale.
- Label "$100,000,000" / "1 pallet · ≈ 1 tonne".

### s3-billion.js (beat 3)
- **Ten pallets** slide in to form a 5 × 2 grid (pitch 1.3 × 1.15 m), one after another with rhythm (sync `tick`). The pause in the line ("A billion dollars? … Ten pallets") is the moment they land.
- Optional forklift silhouette. Label "$1,000,000,000" / "10 tonnes · 22,000 lb".

### s4-richest.js (beat 4)
- The 10-pallet block **duplicates outward** across the floor into hundreds of blocks in a wave (shimmer/ping). A counter or label "hundreds of billions" with a small "each block = $1 billion" key.
- No names or exact fortunes. Label "$100s of billions" / "the world's richest fortunes".

### s5-trillion.js (beat 5)
- The wave keeps going until **10,000 pallets** fill the area, stacked **two high** (the second layer drops on in a sweep). A total counter climbs to "$1,000,000,000,000".
- Label "$1 trillion" / "10,000 pallets".

### s6-field.js (beat 6, payoff)
- A **football field** draws itself under the cash: white yard lines, end zones in the accent tint, goalposts (iso). The cash block covers it almost exactly, slightly overflowing the sides.
- The human from beat 2 is still standing at the corner, tiny. Show a small circle callout "you are here".
- A final label: "≈ 1 football field" / "stacked two pallets high". Hold to the end.

## Ownership

Each builder owns **only** their scene file(s). Do **not** edit `engine/*`, `camera.js`, `env.js`, `episode.json`, `BRIEF.md`, `script.md` or any other scene. Shared needs go under "sharedRequests" in your report.
