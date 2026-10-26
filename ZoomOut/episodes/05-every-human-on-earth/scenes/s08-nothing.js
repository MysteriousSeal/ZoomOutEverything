// Beat 8 — "Physically, humanity is almost nothing." The camera pulls back; the coral film (s07) thins
// to its true scale and disappears. Nothing marks it but a tiny tag pointing at the bare horizon.
//
// This file also owns the GLOBE for beats 7–12 (layer −1, behind the canyon, which fades over it):
// centre (0, +R) in world metres, so the Grand Canyon (the world origin) sits exactly on its top limb.
// The planet is the real Earth (engine/runtime/earth.js), north up: it starts with the canyon on the top limb,
// then rolls toward us until the Americas face the viewer (see globeView). Light from the upper left.
// Exports globeK / globeR / limbPt / globeView / GC for s07 (the film).
import * as L from '../../../../engine/runtime/lib.js';
import { drawEarth } from '../../../../engine/runtime/earth.js';
import { R_EARTH } from '../env.js';

const { W, H, clamp, lerp, prog, ease } = L;
const TAU = Math.PI * 2;
const D2R = Math.PI / 180;

const sOf = (tl, i) => tl.scenes[i].start;

/** Globe visibility: from the first frame of beat 7. Its rock-toned body sits under the canyon (s06 covers
 *  it until it fades at mpp 120–700), so the ground never opens onto a void as the camera pulls out. */
export function globeK(v) {
  if (v.gt < sOf(v.tl, 7) - 0.05) return 0;
  return ease.inOutCubic(L.invLerp(13, 140, v.cam.mpp));
}
/** Atmosphere halo / sunlit rim: only once the curve of the planet reads. */
const atmK = (v) => ease.inOutCubic(L.invLerp(150, 600, v.cam.mpp));
/** Globe radius in pixels. */
export const globeR = (v) => R_EARTH / v.cam.mpp;
/** Screen point on the limb at angle a from the top (radians, + = clockwise/right), lifted by `lift` px. */
export function limbPt(v, a, lift = 0) {
  const r = globeR(v) + lift;
  return [v.wx(0) + r * Math.sin(a), v.wy(R_EARTH) - r * Math.cos(a)];
}

// ------------------------------------------------------------------ the real Earth (engine/runtime/earth.js)
// The view starts north-up with its centre due south of the Grand Canyon, 90° away, so the canyon sits exactly on
// the top limb (the side view of s04–s07 hands over seamlessly). Once the disc reads as a planet, the Earth rolls
// toward the viewer until the Americas face us (centre ≈ 22°N 98°W) and the canyon is a point on the face.
export const GC = [36.1, -112.1];   // Grand Canyon (lat, lon)
const ROLL = [1.4, 2.2];            // beat-7 seconds: start, duration of the roll
const SPIN_DEG = 2.2;               // slow axial spin (deg/s, Earth's real direction) once the film has formed
function tint(c, x, y, r, col, a) {
  if (r <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, L.rgba(col, a));
  g.addColorStop(0.55, L.rgba(col, a * 0.55));
  g.addColorStop(1, L.rgba(col, 0));
  c.fillStyle = g;
  c.fillRect(x - r, y - r, 2 * r, 2 * r);
}
/** 0 → 1 as the planet rolls from canyon-on-the-limb to the Americas facing us. */
export function rollK(v) { return ease.inOutCubic(prog(v.gt - sOf(v.tl, 7), ROLL[0], ROLL[1])); }
function spinDeg(v) {
  const a = Math.max(0, v.gt - sOf(v.tl, 7) - 4.0);
  return SPIN_DEG * (a > 1.5 ? a - 0.75 : (a * a) / 3);   // eased start, then constant
}
/** Orthographic view for drawEarth / project (screen px). */
export function globeView(v) {
  const k = rollK(v);
  return {
    cx: v.wx(0), cy: v.wy(R_EARTH), r: globeR(v),
    lat0: lerp(GC[0] - 90, 22, k), lon0: lerp(GC[1], -98, k), rot: spinDeg(v), tilt: 0,
  };
}
/** Screen-space key light (x right, y up, z toward the viewer): upper left, as before. */
export const SUN = (() => { const s = [-0.62, 0.5, 0.6], n = Math.hypot(...s); return s.map((x) => x / n); })();

// Grand Canyon cross-section (x, depth), same as s06/s07: the globe body is clipped out of the canyon's air.
const PROFILE = [
  [-8000, 0], [-7750, 95], [-7600, 175], [-7480, 280], [-6900, 360], [-6200, 640], [-5850, 670],
  [-5650, 900], [-4700, 1010], [-3200, 1190], [-1500, 1240], [-1050, 1300], [-800, 1560], [-560, 1790],
  [-480, 1800], [500, 1800], [580, 1785], [860, 1540], [1150, 1300], [1600, 1245], [3400, 1200],
  [4900, 1030], [5500, 910], [5800, 680], [6400, 640], [7100, 370], [7550, 280], [7700, 170],
  [7850, 90], [8000, 0],
];

// ------------------------------------------------------------------ rock (the planet's body, close in)
const seaOf = (r) => ease.inOutCubic(clamp(L.invLerp(5200, 1800, r)));
const nearOf = (r) => ease.inOutCubic(clamp(L.invLerp(9000, 30000, r)));
const STRATA_KM = [3.2, 5, 7.5, 11, 16, 24, 36, 55, 80, 120, 180, 270, 400, 600, 900, 1350, 2000];
// large-scale mottling at every scale: (x, depth) in km under the canyon, log-spread in depth
const MOTTLE = (() => {
  const r = L.rng(5150);
  return Array.from({ length: 240 }, () => {
    const d = Math.exp(lerp(Math.log(2.5), Math.log(4200), r()));
    return { x: (r() - 0.5) * 7 * d, d, rad: d * lerp(0.35, 0.8, r()), warm: r() < 0.55, a: lerp(0.08, 0.2, r()) };
  });
})();

/** The planet's rock body near the surface: a warm depth gradient, strata arcs and soft mottling, all
 *  anchored in world units so they slide up and compress toward the limb as the camera pulls out.
 *  fromPx > 0 starts it that many px below the limb with a soft top edge (s07 lays it over s06's basement). */
export function drawRock(c, v, k, fromPx = 0) {
  const r = globeR(v), cx = v.wx(0), cy = v.wy(R_EARTH), mpp = v.cam.mpp;
  const rk = k * (1 - seaOf(r));
  if (rk <= 0.003 || cy - r > H) return;
  const top = r - fromPx;
  if (top <= 0) return;
  c.save();
  c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.clip();
  // base tone (close in it replaces the planet-scale shading; s07's overlay always draws it)
  const baseK = (fromPx > 0 ? 1 : nearOf(r)) * rk;
  if (baseK > 0) {
    // a lit skin just under the surface, sinking quickly into dark rock so the deep body never reads as a
    // flat wash: the eye stays on the surface line (and the film running along it)
    const span = 1500, feather = fromPx > 0 ? 150 : 0;
    const r0 = Math.max(0, top - span);
    const g = c.createRadialGradient(cx, cy, r0, cx, cy, top);
    const q = (px) => clamp(1 - px / (top - r0));            // stop position for a depth (px) under `top`
    g.addColorStop(0, L.rgba([13, 9, 12], baseK));
    g.addColorStop(q(feather + 520), L.rgba([20, 14, 17], baseK));
    g.addColorStop(q(feather + 240), L.rgba([38, 27, 30], baseK));
    g.addColorStop(q(feather + 90), L.rgba([66, 47, 48], baseK));
    if (feather) { g.addColorStop(q(feather), L.rgba([76, 55, 54], baseK)); g.addColorStop(1, L.rgba([76, 55, 54], 0)); }
    else g.addColorStop(1, L.rgba([98, 72, 68], baseK));
    c.fillStyle = g;
    const y0 = Math.max(-10, cy - top);
    c.fillRect(-10, y0, W + 20, Math.max(0, H + 20 - y0));
  }
  const below = (px) => (fromPx > 0 ? clamp((px - fromPx - 40) / 160) : 1);
  // mottling
  for (const m of MOTTLE) {
    const rr = (m.rad * 1000) / mpp;
    if (rr < 40 || rr > 2.6 * H) continue;
    const X = v.wx(m.x * 1000), dpx = (m.d * 1000) / mpp, Y = cy - r + dpx;
    if (Y - rr > H || X + rr < 0 || X - rr > W) continue;
    const a = m.a * rk * below(dpx) * clamp(L.invLerp(40, 120, rr));
    if (a <= 0.002) continue;
    tint(c, X, Y, rr, m.warm ? [150, 104, 84] : [26, 18, 24], a * (m.warm ? 0.45 * clamp(1 - (dpx - 150) / 500) : 1));
  }
  // strata arcs (parallel to the surface)
  c.lineWidth = 1;
  for (let i = 0; i < STRATA_KM.length; i++) {
    const dpx = (STRATA_KM[i] * 1000) / mpp;
    if (dpx < 6 || dpx > r * 0.6 || cy - r + dpx > H + 4) continue;
    const a = rk * below(dpx) * clamp(L.invLerp(6, 30, dpx)) * clamp(L.invLerp(r * 0.6, r * 0.3, dpx));
    if (a <= 0.003) continue;
    c.strokeStyle = `rgba(255,222,196,${0.17 * a})`;
    c.beginPath(); c.arc(cx, cy, r - dpx, 0, TAU); c.stroke();
    c.strokeStyle = `rgba(10,6,10,${0.2 * a})`;
    c.lineWidth = 2;
    c.beginPath(); c.arc(cx, cy, r - dpx - 2, 0, TAU); c.stroke();
    c.lineWidth = 1;
  }
  c.restore();
}

// ------------------------------------------------------------------ stars (screen space, gentle parallax)
const STARS = (() => {
  const r = L.rng(808);
  return Array.from({ length: 170 }, () => ({ x: r(), y: r(), s: r() ** 3, ph: r() * 10, warm: r() }));
})();

function drawStars(c, v, k) {
  if (k <= 0) return;
  const t = v.gt;
  const px = -(v.cam.x / v.cam.mpp) * 0.02, py = (Math.log(v.cam.mpp) - 9.6) * 14;   // drift with the pull-back
  c.save();
  for (const s of STARS) {
    const x = ((s.x * (W + 80) + px) % (W + 80) + W + 80) % (W + 80) - 40;
    const y = lerp(-40, H + 40, s.y) + py * (0.4 + s.s);
    const tw = 0.65 + 0.35 * Math.sin(t * (0.8 + s.ph * 0.2) + s.ph * 6);
    const a = k * (0.18 + 0.55 * s.s) * tw;
    c.fillStyle = L.rgba(s.warm > 0.7 ? [255, 214, 196] : [226, 230, 240], a);
    const r = 0.7 + s.s * 1.4;
    c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.fill();
    if (s.s > 0.55) L.lightBlob(c, x, y, 6 + 8 * s.s, [255, 230, 220], a * 0.35);
  }
  c.restore();
}

// ------------------------------------------------------------------ globe
function drawGlobe(c, v, k) {
  const r = globeR(v), cx = v.wx(0), cy = v.wy(R_EARTH);
  if (cy - r > H + 50 || cy + r < -50) return;
  c.save();
  c.globalAlpha *= k;
  // the canyon cut is air, not planet: clip its cross-section out while it is wider than a pixel
  const cw = 16000 / v.cam.mpp;
  if (cw > 0.6) {
    c.beginPath();
    c.rect(-50, -50, W + 100, H + 100);
    PROFILE.forEach(([x, d], i) => (i ? c.lineTo(v.wx(x), v.wy(d)) : c.moveTo(v.wx(x), v.wy(d))));
    c.closePath();
    c.clip('evenodd');
  }
  const ak = atmK(v), near = nearOf(r);
  // atmosphere halo (outside the limb)
  const atm = Math.max(10, r * 0.06);
  if (ak > 0) {
    c.save();
    c.globalAlpha *= ak;
    const ag = c.createRadialGradient(cx, cy, r * 0.985, cx, cy, r + atm * 1.6);
    ag.addColorStop(0, 'rgba(140,190,240,0.42)');
    ag.addColorStop(0.25, 'rgba(120,170,230,0.20)');
    ag.addColorStop(1, 'rgba(110,150,220,0)');
    c.fillStyle = ag;
    c.beginPath(); c.arc(cx, cy, Math.max(0, r + atm * 1.6), 0, TAU); c.fill();
    c.restore();
  }
  // the real planet takes over from the rock body as the curve of the Earth appears
  const earthK = ease.inOutCubic(clamp(L.invLerp(26000, 4500, r)));
  if (earthK < 1) {
    // close in: the desert rock under the canyon, shaded from the upper left
    const lx = cx - r * 0.45, ly = cy - r * 0.5;
    const og = c.createRadialGradient(lx, ly, r * 0.05, cx, cy, r * 1.02);
    const sea = seaOf(r);
    const tone = (a, b) => L.rgba(L.mix(a, b, sea));
    og.addColorStop(0, tone([96, 70, 62], [47, 90, 120]));
    og.addColorStop(0.45, tone([70, 50, 48], [28, 59, 86]));
    og.addColorStop(0.85, tone([40, 28, 30], [14, 31, 51]));
    og.addColorStop(1, tone([30, 20, 24], [10, 22, 38]));
    c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU);
    c.fillStyle = og;
    c.fill();
    c.save();
    c.clip();
    drawRock(c, v, 1, 0);
    c.restore();
  }
  if (earthK > 0) {
    const view = globeView(v);
    drawEarth(c, { ...view, style: 'day', sun: SUN, atmosphere: 0.7 * ak, alpha: earthK, relief: 1.1 });
    // a gentle limb falloff so the disc keeps the film's dusky mood
    c.save();
    c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.clip();
    c.globalAlpha *= earthK * (1 - near);
    const lg = c.createRadialGradient(cx, cy, r * 0.7, cx, cy, r);
    lg.addColorStop(0, 'rgba(6,10,18,0)');
    lg.addColorStop(1, 'rgba(6,10,18,0.35)');
    c.fillStyle = lg;
    c.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    c.restore();
  }
  // crisp sunlit rim on the upper-left limb
  c.globalAlpha *= ak;
  c.lineWidth = Math.max(1.2, Math.min(2.4, r / 250));
  const rg = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  rg.addColorStop(0, 'rgba(200,228,255,0.55)');
  rg.addColorStop(0.5, 'rgba(160,200,240,0.18)');
  rg.addColorStop(1, 'rgba(160,200,240,0.04)');
  c.strokeStyle = rg;
  c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.stroke();
  c.restore();
}

export default {
  beat: 8,
  chapter: { num: '08', title: 'Almost nothing', sub: 'Spread that thin, we vanish' },
  captions: true,
  layer: -1,
  cues(d) {
    return [
      { t: 0.25, name: 'deep', gain: 0.24, pitch: 0.5 },
      { t: 0.45, name: 'swell', gain: 0.2, pitch: 0.6 },
      { t: 1.25, name: 'shimmer', gain: 0.12, pitch: 0.7 },
      { t: 1.5, name: 'tick', gain: 0.16, pitch: 0.9 },
    ];
  },

  drawWorld(ctx, v) {
    const k = globeK(v);
    if (k <= 0) return;
    drawStars(ctx, v, k * clamp(L.invLerp(1500, 6000, v.cam.mpp)));
    drawGlobe(ctx, v, k);
  },

  drawOverlay(ctx, v) {
    // a single quiet tag pointing at the bare horizon where the film was
    const k = L.enter(v.t, 1.3, 0.6) * v.k;
    if (k <= 0) return;
    const a = 32 * D2R;
    const [px, py] = limbPt(v, a, 2);
    const ex = px + 70, ey = py - 92;
    ctx.save();
    ctx.globalAlpha *= clamp(k * 1.4);
    // hairline ring marker on the limb
    ctx.strokeStyle = 'rgba(255,236,226,0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(px, py, Math.max(0, 7 + 10 * (1 - k)), 0, TAU); ctx.stroke();
    ctx.restore();
    L.leader(ctx, ex, ey, px + 6, py - 7, k, [255, 236, 226], 0.7);
    ctx.save();
    ctx.globalAlpha *= clamp(k * 1.6 - 0.4);
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    ctx.font = L.font(26, 700, L.FONT.body);
    ctx.fillStyle = L.rgba(v.accent);
    L.trackedText(ctx, 'ALL 8.2 BILLION OF US', ex - 8, ey - 34, 3, 'right');
    ctx.font = L.font(22, 600, L.FONT.body);
    ctx.fillStyle = 'rgba(225,215,212,0.85)';
    L.trackedText(ctx, '1 µm: NOT EVEN A PIXEL HERE', ex - 8, ey - 6, 3, 'right');
    ctx.restore();
  },
};
