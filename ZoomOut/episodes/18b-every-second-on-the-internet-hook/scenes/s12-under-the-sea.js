// Beat 12 — "It goes under the sea."
// env draws the 36 cables on (from cablesStart, staggered). This scene makes the moment land:
//   * a sonar ripple: a ring of deep-blue light expands from the disc centre across the OCEANS only (land stays
//     dark: a low-res ocean mask is ray-cast from the same ETOPO grid as the globe), then settles as a faint tint;
//   * landing-station pings: a small ring opens where each cable starts drawing, and again where it lands.
// Label: a typographic beat, "Under the sea" / "fiber-optic cables on the seabed".
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, R_EARTH, CABLES, viewOf, elevation, project, cablesStart, globeDisc } from '../env.js';

const { W, H } = L;
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const SC = 6;                                     // mask downscale
const MW = Math.ceil(W / SC), MH = Math.ceil(H / SC);
let mCan = null, mCtx = null, mImg = null;

const T_RING = 0.12;                              // ripple starts (beat-relative), "It goes..."
const D_RING = 1.35;

/** Start / landing times of cable i (absolute), mirroring env.cableReveal. */
function cableTimes(i, tl) {
  const s = cablesStart(tl) + (i % 12) * 0.11 + Math.floor(i / 12) * 0.35;
  return [s, s + 1.5];
}

function drawOceanRipple(ctx, v, t, k) {
  if (!mCan) { mCan = new OffscreenCanvas(MW, MH); mCtx = mCan.getContext('2d'); mImg = mCtx.createImageData(MW, MH); }
  const B = viewOf(v), mpp = v.cam.mpp, ay = H * v.cam.anchor;
  const g = globeDisc(v);
  const d = mImg.data;
  d.fill(0);
  const front = L.ease.outCubic(L.prog(t, T_RING, D_RING)) * 1.15;
  const settle = L.ease.outCubic(L.prog(t, T_RING + 0.1, 0.6)) * (1 - L.ease.inOutCubic(L.prog(t, 1.9, 2.2)));
  const x0 = Math.max(0, Math.floor((g.x - g.r) / SC)), x1 = Math.min(MW, Math.ceil((g.x + g.r) / SC));
  const y0 = Math.max(0, Math.floor((g.y - g.r) / SC)), y1 = Math.min(MH, Math.ceil((g.y + g.r) / SC));
  for (let sy = y0; sy < y1; sy++) {
    const Y = -(v.cam.y + ((sy + 0.5) * SC - ay) * mpp) / R_EARTH;
    for (let sx = x0; sx < x1; sx++) {
      const X = (v.cam.x + ((sx + 0.5) * SC - W / 2) * mpp) / R_EARTH;
      const r2 = X * X + Y * Y;
      if (r2 >= 1) continue;
      const rho = Math.sqrt(r2);
      const wave = Math.exp(-Math.pow((rho - front) / (0.02 + 0.03 * front), 2)) * L.smoothstep(L.clamp(front / 0.65));
      const trail = rho < front ? 0.3 * settle * L.smoothstep(L.clamp((front - rho) / 0.08)) : 0;
      const a = (0.55 * wave * (1 - front / 1.3) + trail) * k;
      if (a < 0.01) continue;
      const Z = Math.sqrt(1 - r2);
      const px = X * B.e[0] + Y * B.n[0] + Z * B.c[0];
      const py = X * B.e[1] + Y * B.n[1] + Z * B.c[1];
      const pz = Y * B.n[2] + Z * B.c[2];
      const e = elevation(Math.asin(L.clamp(pz, -1, 1)) / DEG, Math.atan2(py, px) / DEG);
      const sea = L.clamp(-e / 400);              // shelf seas fade in softly
      if (sea <= 0) continue;
      const o = (sy * MW + sx) * 4;
      const lim = 0.45 + 0.55 * Z;
      d[o] = 40; d[o + 1] = 120; d[o + 2] = 255;
      d[o + 3] = Math.min(255, 255 * a * sea * lim);
    }
  }
  mCtx.putImageData(mImg, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(mCan, 0, 0, MW * SC, MH * SC);
  // a thin crisp vector front on top of the soft low-res mask (clipped to the disc)
  const rk = k * L.smoothstep(L.clamp(front / 0.2)) * (1 - L.smoothstep(L.clamp((front - 0.8) / 0.3)));
  if (rk > 0.001 && front < 1) {
    ctx.beginPath(); ctx.arc(g.x, g.y, Math.max(0, g.r), 0, TAU); ctx.clip();
    ctx.strokeStyle = L.rgba([150, 205, 255], 0.38 * rk);
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(g.x, g.y, Math.max(0, front * g.r), 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

/** Soft dark scrim behind the top-left label slot (x ~60-780, y ~300-540), so text never fights the globe limb,
 *  the lit Arctic or the cable bundles. Shared by beats 12-14. */
export function labelScrim(ctx, k, cy = 430) {
  if (k <= 0.001) return;
  ctx.save();
  ctx.translate(330, cy);
  ctx.scale(1, 0.34);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 500);
  g.addColorStop(0, `rgba(2,4,10,${0.6 * k})`);
  g.addColorStop(0.5, `rgba(2,4,10,${0.48 * k})`);
  g.addColorStop(1, 'rgba(2,4,10,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-500, -500, 1000, 1000);
  ctx.restore();
}

export default {
  beat: 12,
  chapter: { num: '12', title: 'Under the sea', sub: 'Submarine cables' },
  captions: true,
  layer: 0,
  cues(d) {
    return [
      { t: T_RING + 0.02, name: 'sonar', gain: 0.3, pitch: 0.9 },
      { t: 0.2, name: 'dive', gain: 0.18, pitch: 1.0 },
      { t: 0.55, name: 'bubbles', gain: 0.12, pitch: 1.1 },
      { t: 1.0, name: 'tick', gain: 0.1, pitch: 1.5 },
      { t: 1.35, name: 'tick', gain: 0.1, pitch: 1.7 },
    ];
  },

  drawWorld(ctx, v) {
    const s = v.tl.scenes[12];
    if (v.gt < s.start - 0.05 || v.gt > s.start + 5.5 || v.cam.mpp < 3000) return;
    const t = v.t;
    // ---- 1. sonar ripple over the oceans (beat 12 + a short settle into 13)
    if (t < 4.2) drawOceanRipple(ctx, v, t, 1);
    // ---- 2. landing-station pings
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    CABLES.forEach((cb, i) => {
      const [ts, te] = cableTimes(i, v.tl);
      for (const [tt, p, big] of [[ts, cb.pts[0], 1], [te, cb.pts[cb.pts.length - 1], 0.75]]) {
        const f = L.prog(v.gt, tt, 0.8);
        if (f <= 0 || f >= 1) continue;
        const q = project(v, p[0], p[1]);
        if (q.z < 0.08) continue;
        const e = L.ease.outCubic(f);
        ctx.strokeStyle = L.rgba([150, 210, 255], 0.7 * (1 - f) * big);
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(0, 3 + 15 * e * big), 0, TAU); ctx.stroke();
        if (f < 0.35) L.lightBlob(ctx, q.x, q.y, 14, ACCENT, 0.6 * (1 - f / 0.35));
      }
    });
    ctx.restore();
  },

  drawOverlay(ctx, v) {
    const k = v.k * L.ease.outCubic(L.prog(v.t, 0.28, 0.5));
    if (k <= 0.001) return;
    labelScrim(ctx, k);
    L.bigLabel(ctx, { x: 96, y: 450, big: 'Under the sea', small: 'fiber-optic cables on the seabed', k, accent: ACCENT, size: 96 });
  },
};
