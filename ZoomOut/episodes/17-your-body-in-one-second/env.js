// Environment for "What Happens in Your Body in One Second?". Owned by the orchestrator — builders: read, don't edit.
//
// drawBackground: studio backdrop (cool slate at body scale, deep tissue crimson once we're inside) + the BODY: a
//   dark "glass anatomy" figure, front view, 1.75 m, with a fresnel inner rim and a warm key-light edge. The person's
//   right forearm (viewer's left) comes forward to the wrist in front of the belly; the HAND and STOPWATCH are drawn by
//   s00 (from the wrist at WRIST). Organs, skeleton, micro worlds: scenes.
// drawForeground: fly-through motes that stream outward when the camera dives in and inward when it pulls out
//   (their speed is the camera's log-zoom speed), so every scale change feels like travel.
// drawHud: topBar + an adaptive scale bar with a magnification note ("MAGNIFIED ×630").
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, scaleBar, topBar } from '../../../engine/runtime/kit.js';
import { P, SKIN, VESSEL, SIZE, H_BODY, KEYS, zoomSpeed } from './camera.js';

const { W, H } = L;
export const ACCENT = [255, 95, 110];
export const BLOOD = [200, 30, 48];            // red-cell red (deeper than the accent)
export const PLASMA = [255, 214, 160];         // warm plasma / light
export const INK = [235, 230, 222];
export { P, SKIN, VESSEL, SIZE, H_BODY };

// ------------------------------------------------------------------ timing helpers
/** Global time of line i phrase j start/end (from build/timeline.json). */
export const phrase = (tl, i, j = 0, edge = 'start') => tl.lines[i].phrases[Math.min(j, tl.lines[i].phrases.length - 1)][edge];
/** The stopwatch starts on "Start the clock." (the thumb clicks the crown ~0.25 s into the phrase). */
export const clockStart = (tl) => phrase(tl, 1, 0, 'start') + 0.25;
/** Stopwatch reading (s) at global time gt: 0 before the click, then real time. */
export const clockTime = (gt, tl) => Math.max(0, gt - clockStart(tl));

// ------------------------------------------------------------------ facts (see script.md fact-check)
export const FACTS = {
  strokeMl: 70,                   // ml per beat at rest
  nerveMs: 120,                   // m/s, fastest (Aα) fibres
  rbcCount: 25e12,                // red cells in an adult (Sender et al. 2016)
  rbcPerSec: 2.4e6,               // new red cells per second (2-3 million)
  rbcDays: 120,                   // red-cell lifespan
  lapSec: 60,                     // one circulation ≈ 1 minute at rest
  breathL: 0.5,                   // tidal volume
  watts: 100,                     // ≈ 2,000 kcal/day
  turnoverPerDay: 330e9,          // Sender & Milo 2021
  turnoverPerSec: 330e9 / 86400,  // ≈ 3.8 million/s
};
/** Cells replaced since the clock started (the reveal counter): ≈ 3.8 million per second of clockTime. */
export const cellsReplaced = (gt, tl) => FACTS.turnoverPerSec * clockTime(gt, tl);

// ------------------------------------------------------------------ zoom helpers
const lg = (m) => Math.log(Math.max(1e-12, m));
/** 0 at body scale … 1 deep inside (log of mpp: 1e-4 → 2e-6). */
export const depthK = (v) => L.clamp(L.invLerp(lg(1e-4), lg(2e-6), lg(v.cam.mpp)));
/** Fade-in by zoom: 0 while mpp ≥ from, 1 once mpp ≤ to (log-space smoothstep). Use it to dissolve micro worlds. */
export const microK = (v, from, to) => L.smoothstep(L.clamp(L.invLerp(lg(from), lg(to), lg(v.cam.mpp))));

// ------------------------------------------------------------------ the body (metres; h = height above the floor)
// Right side of the torso outline (mirrored), smoothed by a closed Catmull-Rom curve.
const TORSO = [[0.05, 1.505], [0.115, 1.478], [0.172, 1.452], [0.198, 1.418], [0.18, 1.34], [0.166, 1.26], [0.148, 1.16],
  [0.136, 1.075], [0.15, 0.99], [0.166, 0.925], [0.168, 0.85], [0.1, 0.8], [0.0, 0.79]];
// tapered limb segments [ax, ah, ra, bx, bh, rb] (person's left arm hangs on the viewer's right; right forearm forward)
const LIMBS = [
  [0.0, 1.47, 0.05, 0.0, 1.56, 0.048],                                      // neck
  [0.092, 0.9, 0.078, 0.088, 0.5, 0.05], [-0.092, 0.9, 0.078, -0.088, 0.5, 0.05],     // thighs
  [0.088, 0.5, 0.05, 0.082, 0.36, 0.054], [-0.088, 0.5, 0.05, -0.082, 0.36, 0.054],   // knee to calf
  [0.082, 0.36, 0.054, 0.074, 0.075, 0.029], [-0.082, 0.36, 0.054, -0.074, 0.075, 0.029], // shins
  [0.19, 1.4, 0.05, 0.214, 1.11, 0.037], [0.214, 1.11, 0.037, 0.234, 0.865, 0.026],   // left arm (hanging)
  [0.234, 0.865, 0.027, 0.24, 0.76, 0.034], [0.24, 0.76, 0.034, 0.238, 0.69, 0.02],    // left hand
  [-0.19, 1.4, 0.05, -0.212, 1.13, 0.038],                                  // right upper arm
];
/** The right forearm (in front of the torso): elbow → wrist. s00's hand starts at WRIST. */
export const ELBOW = { x: -0.212, y: -1.13 };
export const WRIST = { x: -0.098, y: -1.074 };
const FOREARM = [ELBOW.x, -ELBOW.y, 0.037, WRIST.x, -WRIST.y, 0.026];

function catmull(c, pts, sx, sy) {
  const n = pts.length;
  const p = (i) => pts[(i + n) % n];
  c.moveTo(sx(p(0)[0]), sy(p(0)[1]));
  for (let i = 0; i < n; i++) {
    const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2);
    c.bezierCurveTo(
      sx(p1[0] + (p2[0] - p0[0]) / 6), sy(p1[1] + (p2[1] - p0[1]) / 6),
      sx(p2[0] - (p3[0] - p1[0]) / 6), sy(p2[1] - (p3[1] - p1[1]) / 6),
      sx(p2[0]), sy(p2[1]));
  }
  c.closePath();
}
function capsule(c, ax, ay, ra, bx, by, rb) {
  // screen coords; a tapered capsule as one convex path
  const d = Math.hypot(bx - ax, by - ay);
  if (d <= Math.abs(ra - rb) + 1e-6) { const r = Math.max(ra, rb); c.moveTo(ax + r, ay); c.arc(ax, ay, Math.max(0, r), 0, Math.PI * 2); return; }
  const ang = Math.atan2(by - ay, bx - ax), off = Math.acos(L.clamp((ra - rb) / d, -1, 1));
  c.moveTo(ax + Math.cos(ang + off) * ra, ay + Math.sin(ang + off) * ra);
  c.arc(ax, ay, Math.max(0, ra), ang + off, ang - off + Math.PI * 2);
  c.arc(bx, by, Math.max(0, rb), ang - off, ang + off);
  c.closePath();
}
/** Body bounds in world metres (for culling). */
const BOUNDS = { x0: -0.3, x1: 0.3, y0: -H_BODY - 0.01, y1: 0.01 };
/** Is any of the body on screen? */
export function bodyOnScreen(v) {
  return v.wx(BOUNDS.x1) > -50 && v.wx(BOUNDS.x0) < W + 50 && v.wy(BOUNDS.y1) > -50 && v.wy(BOUNDS.y0) < H + 50;
}
/**
 * Adds the body silhouette to the current path, in screen space, as separate convex/closed subpaths
 * (FILL ONLY with a single colour or use as a clip: overlapping subpaths make internal edges if stroked).
 * forearm: include the right forearm (default true).
 */
export function bodyPath(c, v, { forearm = true } = {}) {
  const sx = (x) => v.wx(x), sy = (h) => v.wy(-h), s = (m) => v.ws(m);
  const R = TORSO, Lft = TORSO.slice().reverse().map(([x, h]) => [-x, h]);
  catmull(c, [...R, ...Lft.slice(1, -1)], sx, sy);
  // head: an egg (wider at the cranium, narrower at the jaw)
  const hx = sx(0), hy = sy(1.632);
  // drawn clockwise on screen, the same winding as the torso and the limb capsules: with the nonzero rule an
  // opposite winding cancelled where the jaw overlaps the neck and left a dark hole under the chin
  c.moveTo(hx + s(0.077), hy);
  c.bezierCurveTo(hx + s(0.077), hy + s(0.06), hx + s(0.04), hy + s(0.108), hx, hy + s(0.112));
  c.bezierCurveTo(hx - s(0.04), hy + s(0.108), hx - s(0.077), hy + s(0.06), hx - s(0.077), hy);
  c.bezierCurveTo(hx - s(0.077), hy - s(0.075), hx - s(0.045), hy - s(0.118), hx, hy - s(0.118));
  c.bezierCurveTo(hx + s(0.045), hy - s(0.118), hx + s(0.077), hy - s(0.075), hx + s(0.077), hy);
  c.closePath();
  for (const [ax, ah, ra, bx, bh, rb] of LIMBS) capsule(c, sx(ax), sy(ah), s(ra), sx(bx), sy(bh), s(rb));
  // feet: small front-view wedges
  for (const side of [-1, 1]) {
    if (side > 0) {
      c.moveTo(sx(0.05), sy(0.085));
      c.quadraticCurveTo(sx(0.11), sy(0.07), sx(0.125), sy(0.0));
      c.lineTo(sx(0.04), sy(0.0));
      c.quadraticCurveTo(sx(0.04), sy(0.05), sx(0.05), sy(0.085));
    } else {   // mirrored foot traced in reverse, so it keeps the clockwise winding (no hole where it meets the shin)
      c.moveTo(sx(-0.05), sy(0.085));
      c.quadraticCurveTo(sx(-0.04), sy(0.05), sx(-0.04), sy(0.0));
      c.lineTo(sx(-0.125), sy(0.0));
      c.quadraticCurveTo(sx(-0.11), sy(0.07), sx(-0.05), sy(0.085));
    }
    c.closePath();
  }
  if (forearm) { const [ax, ah, ra, bx, bh, rb] = FOREARM; capsule(c, sx(ax), sy(ah), s(ra), sx(bx), sy(bh), s(rb)); }
}

// offscreen buffers (reused; drawing is a pure function of the view)
let MASK = null, MC = null, SMALL = null, SC = null, RIM = null, RC = null;
function buffers() {
  if (!MASK) {
    MASK = new OffscreenCanvas(W, H); MC = MASK.getContext('2d');
    SMALL = new OffscreenCanvas(W / 4, H / 4); SC = SMALL.getContext('2d');
    RIM = new OffscreenCanvas(W, H); RC = RIM.getContext('2d');
  }
}
const BODY_EDGE = [70, 98, 140];    // fresnel inner rim
const KEY = [255, 222, 212];        // warm key light (from the upper left)

/** Draws the glass figure. k = opacity (scenes don't call this; env does). */
function drawBody(c, v, k = 1) {
  if (k <= 0 || !bodyOnScreen(v)) return;
  buffers();
  const mpp = v.cam.mpp;
  // 1. mask
  MC.setTransform(1, 0, 0, 1, 0, 0);
  MC.globalCompositeOperation = 'source-over';
  MC.clearRect(0, 0, W, H);
  MC.fillStyle = '#fff';
  MC.beginPath(); bodyPath(MC, v, { forearm: false }); MC.fill();
  // 2. interior: vertical world-space gradient (lighter chest, darker legs) + the forearm as a separate slab
  const g = MC.createLinearGradient(0, v.wy(-H_BODY), 0, v.wy(0));
  g.addColorStop(0, L.rgba([22, 30, 48])); g.addColorStop(0.35, L.rgba([17, 24, 40])); g.addColorStop(1, L.rgba([8, 11, 19]));
  // paint the interior through the mask (source-in on the mask buffer, then composite)
  MC.globalCompositeOperation = 'source-in';
  MC.fillStyle = g; MC.fillRect(0, 0, W, H);
  // soft inner light behind the chest (the figure "glows" from inside a little)
  const cx = v.wx(0.0), cy = v.wy(-1.28), cr = v.ws(0.42);
  if (cr > 1) {
    const rg = MC.createRadialGradient(cx, cy, 0, cx, cy, cr);
    rg.addColorStop(0, 'rgba(70,60,90,0.35)'); rg.addColorStop(1, 'rgba(70,60,90,0)');
    MC.globalCompositeOperation = 'source-atop';
    MC.fillStyle = rg; MC.fillRect(0, 0, W, H);
  }
  // 3. fresnel rim: mask minus a blurred copy of itself (blur done at quarter size: cheap)
  const blurPx = L.clamp(0.016 / mpp, 3, 60);
  RC.setTransform(1, 0, 0, 1, 0, 0);
  RC.globalCompositeOperation = 'source-over';
  RC.clearRect(0, 0, W, H);
  RC.fillStyle = '#fff';
  RC.beginPath(); bodyPath(RC, v, { forearm: false }); RC.fill();
  SC.setTransform(1, 0, 0, 1, 0, 0);
  SC.clearRect(0, 0, W / 4, H / 4);
  SC.filter = `blur(${(blurPx / 4).toFixed(2)}px)`;
  SC.drawImage(RC.canvas, 0, 0, W / 4, H / 4);
  SC.filter = 'none';
  RC.globalCompositeOperation = 'destination-out';
  RC.drawImage(SMALL, 0, 0, W, H);
  RC.globalCompositeOperation = 'source-in';
  RC.fillStyle = L.rgba(BODY_EDGE, 0.9); RC.fillRect(0, 0, W, H);
  MC.globalCompositeOperation = 'lighter';
  MC.drawImage(RIM, 0, 0);
  // 4. warm key-light edge: mask minus itself shifted down-right (a crescent on the upper-left edges)
  const d = L.clamp(0.004 / mpp, 1.5, 6);
  RC.globalCompositeOperation = 'source-over';
  RC.clearRect(0, 0, W, H);
  RC.fillStyle = '#fff';
  RC.beginPath(); bodyPath(RC, v, { forearm: false }); RC.fill();
  RC.globalCompositeOperation = 'destination-out';
  RC.translate(d, d * 0.8);
  RC.beginPath(); bodyPath(RC, v, { forearm: false }); RC.fill();
  RC.setTransform(1, 0, 0, 1, 0, 0);
  RC.globalCompositeOperation = 'source-in';
  RC.fillStyle = L.rgba(KEY, 0.55); RC.fillRect(0, 0, W, H);
  MC.drawImage(RIM, 0, 0);
  MC.globalCompositeOperation = 'source-over';
  c.save();
  c.globalAlpha = k;
  c.drawImage(MASK, 0, 0);
  c.restore();
  // 5. the right forearm in front of the torso: same glass, its own rim so it separates from the belly
  const [ax, ah, ra, bx, bh, rb] = FOREARM;
  c.save();
  c.globalAlpha = k;
  c.beginPath(); capsule(c, v.wx(ax), v.wy(-ah), v.ws(ra), v.wx(bx), v.wy(-bh), v.ws(rb));
  const fg = c.createLinearGradient(v.wx(ax), v.wy(-ah - ra), v.wx(ax), v.wy(-ah + ra));
  fg.addColorStop(0, L.rgba([30, 40, 62])); fg.addColorStop(1, L.rgba([12, 16, 27]));
  c.fillStyle = fg; c.fill();
  c.lineWidth = L.clamp(0.0025 / mpp, 1, 5);
  c.strokeStyle = L.rgba(BODY_EDGE, 0.55); c.stroke();
  c.restore();
}

// ------------------------------------------------------------------ background
export function drawBackground(c, v) {
  const k = depthK(v);
  // studio backdrop → tissue crimson inside
  const g = c.createRadialGradient(W / 2, H * 0.42, 60, W / 2, H * 0.5, H * 0.9);
  g.addColorStop(0, L.rgba(L.mix([20, 26, 38], [52, 12, 20], k)));
  g.addColorStop(1, L.rgba(L.mix([4, 6, 10], [12, 2, 5], k)));
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // a soft backlight behind the figure (world space, so it rides the camera) + floor pool
  const far = L.clamp(L.invLerp(lg(2e-4), lg(1e-3), lg(v.cam.mpp)));
  if (far > 0) {
    const bx = v.wx(0), by = v.wy(-1.05), br = v.ws(1.3);
    const bl = c.createRadialGradient(bx, by, 0, bx, by, br);
    bl.addColorStop(0, `rgba(90,110,150,${0.22 * far})`); bl.addColorStop(0.5, `rgba(60,70,110,${0.08 * far})`); bl.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = bl; c.fillRect(0, 0, W, H);
    // floor: a faint reflective plane under the feet
    const fy = v.wy(0);
    if (fy < H + 10) {
      c.save();
      c.translate(v.wx(0), fy);
      c.scale(1, 0.14);
      const fl = c.createRadialGradient(0, 0, 0, 0, 0, v.ws(0.9));
      fl.addColorStop(0, `rgba(120,140,190,${0.16 * far})`); fl.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = fl;
      c.beginPath(); c.arc(0, 0, Math.max(0, v.ws(0.9)), 0, Math.PI * 2); c.fill();
      c.restore();
      const ln = c.createLinearGradient(v.wx(-0.9), 0, v.wx(0.9), 0);
      ln.addColorStop(0, 'rgba(160,180,220,0)'); ln.addColorStop(0.5, `rgba(160,180,220,${0.22 * far})`); ln.addColorStop(1, 'rgba(160,180,220,0)');
      c.fillStyle = ln; c.fillRect(v.wx(-0.9), fy, v.ws(1.8), 1.5);
    }
  }
  // the body: skipped deep inside (the micro worlds cover the frame there)
  if (v.cam.mpp > 2.5e-6) drawBody(c, v, 1);
}

// ------------------------------------------------------------------ foreground: fly-through motes
const MOTES = (() => {
  const r = L.rng(1717), out = [];
  for (let i = 0; i < 64; i++) out.push({ a: r() * Math.PI * 2, p: r(), s: 0.6 + r() * 1.2, w: r(), tw: r() * 6.28 });
  return out;
})();
export function drawForeground(c, v) {
  const sp = zoomSpeed(v.gt, v.tl);                       // decades / s (+ = diving in)
  const amt = L.clamp(Math.abs(sp) / 1.6);
  const Z = -Math.log10(v.cam.mpp) * 0.42 + v.gt * 0.012; // each decade of zoom moves a mote 0.42 of its life
  const k = depthK(v);
  const col = L.mix([200, 215, 255], [255, 200, 190], k);
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const m of MOTES) {
    const s = ((m.p + Z * m.s) % 1 + 1) % 1;
    const r = 70 * Math.exp(3.6 * s);                     // 70 … 2,550 px from the centre
    const x = W / 2 + Math.cos(m.a) * r, y = H * 0.48 + Math.sin(m.a) * r * 1.15;
    if (x < -80 || x > W + 80 || y < -80 || y > H + 80) continue;
    const life = L.smoothstep(L.clamp(s / 0.25)) * (1 - L.smoothstep(L.clamp((s - 0.75) / 0.25)));
    const a = life * (0.05 + 0.32 * amt) * (0.6 + 0.4 * Math.sin(v.gt * 1.3 + m.tw));
    if (a < 0.004) continue;
    const rad = (2 + 16 * s * s) * (0.6 + m.w);
    const gr = c.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, L.rgba(col, a)); gr.addColorStop(1, L.rgba(col, 0));
    c.fillStyle = gr;
    c.beginPath(); c.arc(x, y, Math.max(0, rad), 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

// ------------------------------------------------------------------ HUD
const LIFE_MPP = 0.068 / W;   // a phone screen ≈ 68 mm wide: this mpp is "life size"
/** Magnification relative to life size on a phone, 2 significant figures; '' when not magnified. */
export function magNote(mpp) {
  const z = LIFE_MPP / mpp;
  if (z < 2) return '';
  const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(z)) - 1));
  return `MAGNIFIED ×${L.fmt(Math.round(z / p) * p)}`;
}
export function drawHud(c, v) {
  topBar(c, v, ACCENT);
  scaleBar(c, v, { k: L.ease.outCubic(L.prog(v.gt, 1.4, 0.6)), note: magNote(v.cam.mpp) });
}
export const cues = (tl) => beatCues(tl, { gain: 0.18, pitch: 1.0 });
export { KEYS };
