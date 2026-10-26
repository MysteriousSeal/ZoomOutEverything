// Camera for "What $1 Billion Actually Looks Like": ONE unbroken pull-back. Owned by the orchestrator.
//
// The world is 3D (metres), drawn in isometric projection by env.iso(x, y, z):
//   x → right-back, z → left-back, y ↑ up; ground plane y = 0. Everything grows from the ORIGIN CORNER.
// WORLD LAYOUT (footprints on the ground, starting at the origin):
//   $10,000 stack ......... 0.156 × 0.066 m, 1.1 cm tall, centred at x 0.078, z 0.033
//   $1M briefcase ......... ≈ 0.46 × 0.33 m (open lid), corner at the origin; the stack becomes one of its bundles
//   $100M pallet .......... 1.2 (x) × 1.0 (z) m, ≈ 1.15 m tall incl. the wooden pallet, corner at the origin
//   human for scale ....... 1.75 m, standing at x −1.1, z 1.4 (beats 2–4; left of the $1B block's front row)
//   $1B: 10 pallets ....... 5 (x) × 2 (z) grid, pitch 1.3 × 1.15 m, from the origin
//   richest: 200 blocks ... 10 (x) × 20 (z) blocks of 10 pallets on the trillion grid, 55 × 40 m from the origin
//   $1T: 10,000 pallets ... 2 high → 5,000 footprints, 100 (x) × 50 (z), pitch 1.1 × 1.0 m → ≈ 110 × 50 m
//   football field ........ 109.7 × 48.8 m outline from the origin (end zones included)
// Camera keys are given as world points (projected with iso) + metres per pixel.
import { ease, lerp, noise1, prog } from '../../../engine/runtime/lib.js';

const C = Math.cos(Math.PI / 6), S = 0.5;
export const iso = (x, y, z) => [(x - z) * C, (x + z) * S - y];

const K = (x, y, z, mpp, travel) => { const [px, py] = iso(x, y, z); return { x: px, y: py, mpp, travel }; };
const KEYS = [
  K(0.078, 0.008, 0.033, 0.00034, 0),    // 0 one $10k stack fills the frame
  K(0.23, 0.08, 0.165, 0.00125, 1.3),    // 1 briefcase
  K(0.08, 0.75, 0.72, 0.0042, 1.2),      // 2 pallet + human (framed a little left so the person fits)
  K(3.2, 0.55, 1.15, 0.0105, 1.1),       // 3 ten pallets
  K(25.12, 0, 15.88, 0.09, 1.7),         // 4 200 $1B blocks (10 × 20, 55 × 40 m) framed whole
  K(55, 0.5, 25, 0.15, 1.3),             // 5 the whole trillion (field + margins fit the frame)
  K(55, 0, 24.5, 0.146, 0.8),            // 6 football field, both goalposts in frame
];

function travelTo(a, b, k) {
  // log-zoom; position follows the zoom's progress so the shot reads as one smooth pull-back
  const la = Math.log(a.mpp), lb = Math.log(b.mpp);
  const e = ease.inOutCubic(k);
  return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), mpp: Math.exp(lerp(la, lb, e)) };
}

function base(gt, tl) {
  const sc = tl.scenes;
  let b = 0;
  sc.forEach((s, i) => { if (s.start <= gt) b = i; });
  const t = gt - sc[b].start, d = sc[b].end - sc[b].start;
  let cam;
  if (b === 0) {
    const k = ease.inOutCubic(prog(t, 0, d));
    cam = { ...KEYS[0], mpp: KEYS[0].mpp * lerp(0.92, 1.0, k) };   // starts slightly tighter, eases out
  } else {
    const key = KEYS[b];
    cam = travelTo(KEYS[b - 1], key, prog(t, -0.05, key.travel));
    const push = b === 6 ? 0.98 : 0.95;   // the payoff must keep the whole field in frame
    cam.mpp *= lerp(1, push, ease.inOutCubic(prog(t, key.travel, d - key.travel)));   // hold: slow push
  }
  return cam;
}

/** Camera at global time gt: {x, y, mpp, anchor}. Pure function of gt. */
export function at(gt, tl) {
  const cam = base(gt, tl);
  cam.x += noise1(gt * 0.35, 1) * 4 * cam.mpp;
  cam.y += noise1(gt * 0.3, 2) * 4 * cam.mpp;
  cam.anchor = 0.47;
  return cam;
}
