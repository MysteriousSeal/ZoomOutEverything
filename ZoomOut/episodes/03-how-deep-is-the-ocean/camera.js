// Camera for "How deep is the ocean": one continuous descent. Owned by the orchestrator.
//
// WORLD LAYOUT (metres; x right, y = depth, down positive; surface at y = 0):
//   surface swimmer ........ x ≈ 0,      y ≈ 0
//   sunlight / fish ........ x ∈ ±150,   y 0–200
//   scuba diver ............ x ≈ 0,      y = 332
//   Burj Khalifa ........... x ≈ +145 (base centre), sinks during beat 3, final base at y ≈ 900
//   beaked whale ........... x ≈ 0,      y = 2992
//   Titanic bow ............ x ∈ +40…+190 on the abyssal plain, y = 3800 (env.floorY(x))
//   trench ................. cliff edge at x = −300, wall down to x = −2300, flat floor y = 10935 for x ∈ [−8300, −2300]
//   Everest ................ base centred x = −5000 on the trench floor (half base 3,000 m), peak y = 10935 − 8849 = 2086
//
// Beat timing comes from build/timeline.json. Each beat: the camera travels to its key in the
// first part of the beat, then holds with a slow push/drift (never dead still).
import { clamp, ease, lerp, noise1, prog } from '../../../engine/runtime/lib.js';

// one key per beat: x, y (centre of screen), mpp (metres per pixel), travel (s)
export const KEYS = [
  { x: 0, y: -0.25, mpp: 0.0055, travel: 0 },     // 0 hook: swimmer at the surface
  { x: 0, y: 150, mpp: 0.24, travel: 1.4 },       // 1 sunlight zone, surface visible at top
  { x: 0, y: 332, mpp: 0.008, travel: 1.3 },      // 2 diver close-up
  { x: 95, y: 360, mpp: 0.68, travel: 1.0, panDelay: 0.4 },  // 3 Burj Khalifa sinking: zoom out around the diver first, then pan
  { x: 0, y: 2992, mpp: 0.013, travel: 1.5 },     // 4 whale close-up
  { x: 120, y: 3790, mpp: 0.2, travel: 1.1 },     // 5 Titanic bow on the plain
  { x: -5000, y: 10855, mpp: 0.45, travel: 1.4 }, // 6a trench floor (floor sits above the captions)
];
// 6b: final reveal — whole water column, surface to trench floor
// surface lands at y≈300 (below the HUD band), trench floor at y≈1476; the dive column (x = 0) sits at
// screen x≈780 so the recap list fits right of it, and the wide trench + Everest fill the frame left of it
const REVEAL = { x: -2232, y: 6138, mpp: 9.3 };
// fractions of beat 6. Synced to the VO: the pull-back fills the pause after "…the bottom.",
// Everest lands (end + 0.3 s) right after "Drop Everest in", the 2 km label on "two kilometers".
export const REVEAL_TIMES = { start: 0.27, end: 0.415 };
export const LAND_DELAY = 0.3;   // s after REVEAL_TIMES.end (s6-trench uses the same value)

function travelTo(a, b, k) {
  // fly: interpolate log(mpp), and zoom out mid-travel when the distance is large
  const e = ease.inOutCubic(k);
  const ex = b.panDelay ? ease.inOutCubic(prog(k, b.panDelay, 1 - b.panDelay)) : e;  // pan after the zoom-out
  const la = Math.log(a.mpp), lb = Math.log(b.mpp);
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const need = Math.log(dist / 1500);           // mpp that fits the whole jump on screen
  const bump = Math.max(0, need - Math.max(la, lb)) * Math.sin(Math.PI * e);
  return { x: lerp(a.x, b.x, ex), y: lerp(a.y, b.y, e), mpp: Math.exp(lerp(la, lb, e) + bump * 0.85) };
}

function base(gt, tl) {
  const sc = tl.scenes;
  let b = 0;
  sc.forEach((s, i) => { if (s.start <= gt) b = i; });
  const t = gt - sc[b].start, d = sc[b].end - sc[b].start;
  let cam;
  if (b === 0) {
    const k = ease.inOutCubic(prog(t, 0, d));
    cam = { x: 0, y: lerp(-0.6, 0.35, k), mpp: KEYS[0].mpp * lerp(1, 0.9, k) };
  } else {
    const prev = b === 1 ? { x: 0, y: 0.35, mpp: KEYS[0].mpp * 0.9 } : KEYS[b - 1];
    const key = KEYS[b];
    const k = prog(t, -0.05, key.travel);
    cam = travelTo(prev, key, k);
    // hold: slow push-in after arriving
    const hold = prog(t, key.travel, d - key.travel);
    cam.mpp *= lerp(1, 0.94, ease.inOutCubic(hold));
    if (b === 6) {
      const r = ease.inOutCubic(prog(t / d, REVEAL_TIMES.start, REVEAL_TIMES.end - REVEAL_TIMES.start));
      if (r > 0) {
        // zoom out about the trench floor under Everest: that point glides smoothly across the screen
        // (instead of a linear centre move, which lifts the floor out of frame mid-zoom and leaves black frames)
        const la = Math.log(cam.mpp), lb = Math.log(REVEAL.mpp);
        const mpp = Math.exp(lerp(la, lb, r));
        const ax = key.x, ay = 10935;
        const sxA = (ax - cam.x) / cam.mpp, syA = (ay - cam.y) / cam.mpp;
        const sxB = (ax - REVEAL.x) / REVEAL.mpp, syB = (ay - REVEAL.y) / REVEAL.mpp;
        cam = { x: ax - lerp(sxA, sxB, r) * mpp, y: ay - lerp(syA, syB, r) * mpp, mpp };
        cam.mpp *= lerp(1, 0.97, ease.inOutCubic(prog(t / d, REVEAL_TIMES.end, 1 - REVEAL_TIMES.end)));
      }
    }
  }
  return cam;
}

/** Camera at global time gt: {x, y, mpp, anchor, scroll}. Pure function of gt (frames render out of order). */
export function at(gt, tl) {
  const cam = base(gt, tl);
  // handheld-ish drift, proportional to zoom so it reads the same at every scale
  cam.x += noise1(gt * 0.35, 1) * 6 * cam.mpp;
  cam.y += noise1(gt * 0.3, 2) * 5 * cam.mpp;
  // impact shake when Everest lands (beat 6)
  const s6 = tl.scenes[6];
  const s = gt - (s6.start + REVEAL_TIMES.end * (s6.end - s6.start) + LAND_DELAY);
  if (s > 0 && s < 0.6) {
    const a = Math.exp(-s * 7) * 7 * cam.mpp;
    cam.x += Math.sin(s * 71) * a;
    cam.y += Math.sin(s * 53 + 1) * a;
  }
  cam.anchor = 0.5;
  cam.scroll = scrollPx(gt, tl);
  return cam;
}

/** Integrated on-screen scroll (pixels) — drives parallax particles so they stream with the dive. */
export function scrollPx(gt, tl) {
  const step = 1 / 60;
  let acc = 0, prev = base(0, tl);
  for (let t = step; t <= gt + 1e-9; t += step) {
    const c = base(t, tl);
    acc += clamp((c.y - prev.y) / ((c.mpp + prev.mpp) / 2), -400, 400);
    prev = c;
  }
  return acc;
}
