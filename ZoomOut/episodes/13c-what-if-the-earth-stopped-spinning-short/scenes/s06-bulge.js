// 13c beat 4 (BEAT.poles) — "Without the spin, | the water bulging at the equator slides toward the poles."
// 13c folds 13b's beats 5–7 into this one beat: the camera pulls back from the district to the globe (13b's beat-5
// pull-back), the repainted surface of s05 is drawn first (the stir, then the drain / flood), a dashed PERFECT
// SPHERE traces the limb, and on "bulging" a shell of water swells out at both equatorial limbs (shape
// exaggerated, and tagged so). On "slides" the shell slides along the limb to both poles while s07's poleward arc
// arrows draw on (the cross-section of "slides toward the poles"), ending as two polar domes in the continent beat.
// 13b's "≈ 21 km" measurement and its "Spinning" chevrons belonged to the cut bulge line: not drawn in 13c.
// Exports shell helpers for s07 (its poleward arrows hug the shell).
import * as L from '../../../../engine/runtime/lib.js';
import { BEAT, globeGeom, globeVisible } from '../env.js';
import { TB, W6, W7, drawSurface, surfaceState } from './s05-oceans-move.js';
import { drawArrows } from './s07-to-the-poles.js';

const TAU = Math.PI * 2;
export const EXAG = 0.085;          // shell thickness / radius at its peak (≈ 25× the real 21 km)
const DEG = Math.PI / 180;

/** Shell state: grow (0..1), slide (0 = at the equator, 1 = at the poles), fade. */
export function shellState(v) {
  const gt = v.gt, t6 = TB(v, 6), t7 = TB(v, 7);
  const st = surfaceState(v);
  return {
    sphere: L.ease.outCubic(L.prog(gt, t6 + 0.55, 0.7)) * st.k,
    grow: L.ease.outBack(L.prog(gt, t6 + W6.bulge - 0.1, 1.0), 0.9),
    slide: L.ease.inOutCubic(L.prog(gt, t7 + W7.water - 0.35, 2.3)),   // 13b fix: the domes reach the poles on "poles"
    // 13b fix: the exaggerated shell (and its dashed sphere and tag) leave together in the last 0.45 s of the poles
    // beat, so no unlabelled dome (or ghost tag) reaches "Two polar oceans"
    k: st.k * (1 - L.ease.inOutCubic(L.prog(gt, TB(v, 8) - 0.45, 0.4))),
  };
}
/** Shell thickness profile (fraction of r) at latitude la for slide s: a bump that travels from 0° to 90°. */
export function shellH(la, sl, grow) {
  const c = L.lerp(0, 90, sl) * DEG, w = L.lerp(36, 26, sl) * DEG;
  const amp = L.lerp(1, 0.42, L.smoothstep(sl));
  const d = (Math.abs(la) - c) / w;
  return Math.max(0, EXAG * grow * amp * Math.exp(-d * d));
}
/** Outer outline of the shell (screen points around the full limb). */
export function shellPts(g, sl, grow, n = 160) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (TAU * i) / n;
    const la = Math.asin(-Math.sin(a));                     // screen angle → limb latitude (north = up)
    const rr = g.r * (1 + shellH(la, sl, grow));
    pts.push([g.cx + rr * Math.cos(a), g.cy + rr * Math.sin(a)]);
  }
  return pts;
}

function drawShell(c, v, g, ss) {
  if (ss.grow <= 0.002) return;
  const pts = shellPts(g, ss.slide, ss.grow);
  c.save();
  c.globalAlpha *= ss.k;
  // water between the sphere and the shell outline
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.arc(g.cx, g.cy, Math.max(0, g.r), 0, TAU, true);
  // symmetric about the axis: the same water colour on both limbs (brighter at the surface, deeper inside)
  const lg = c.createRadialGradient(g.cx, g.cy, g.r, g.cx, g.cy, g.r * (1 + EXAG));
  lg.addColorStop(0, 'rgba(30,104,158,0.92)');
  lg.addColorStop(1, 'rgba(70,164,212,0.92)');
  c.fillStyle = lg;
  c.fill('nonzero');
  // crisp surface line with a soft glow
  c.lineJoin = 'round';
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.strokeStyle = 'rgba(190,245,255,0.85)';
  c.lineWidth = 2;
  c.stroke();
  // 13b: on "twenty-one" the measured part flashed in the accent (13c: the number is not spoken, no flash)
  const hi = 0;
  if (hi > 0.01) {
    for (const s of [-1, 1]) {
      c.beginPath();
      for (let i = 0; i <= 30; i++) {
        const la = (-30 + 2 * i) * DEG, a = s > 0 ? -la : Math.PI + la;
        const rr = g.r * (1 + shellH(la, ss.slide, ss.grow));
        c[i ? 'lineTo' : 'moveTo'](g.cx + rr * Math.cos(a), g.cy + rr * Math.sin(a));
      }
      c.strokeStyle = `rgba(90,220,235,${0.35 * hi})`;
      c.lineWidth = 9;
      c.stroke();
      c.strokeStyle = `rgba(220,252,255,${0.9 * hi})`;
      c.lineWidth = 2.6;
      c.stroke();
    }
  }
  c.restore();
}

function drawSphere(c, v, g, ss) {
  if (ss.sphere <= 0.002) return;
  c.save();
  c.globalAlpha *= ss.sphere * L.lerp(1, 0.55, ss.slide) * (1 - L.ease.inOutCubic(L.prog(v.gt, TB(v, 8) - 0.45, 0.4)));
  c.strokeStyle = 'rgba(235,240,248,0.75)';
  c.lineWidth = 1.6;
  c.setLineDash([7, 9]);
  c.lineDashOffset = -v.gt * 6;
  // draw on clockwise from the top
  const e = ss.sphere;
  c.beginPath();
  c.arc(g.cx, g.cy, Math.max(0, g.r), -Math.PI / 2, -Math.PI / 2 + TAU * e);
  c.stroke();
  c.restore();
}

/** Soft dark backing behind the top-left label (an ellipse that fades to nothing, no hard edges). */
export function labelBacking(c, x, y, k, { sx = 1.6, sy = 1, dx = 200, a = 0.5 } = {}) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= L.clamp(k * 1.5);
  c.translate(x + dx, y + 10);
  c.scale(sx, sy);
  const bg = c.createRadialGradient(0, 0, 0, 0, 0, 190);
  bg.addColorStop(0, `rgba(2,6,14,${a})`);
  bg.addColorStop(0.55, `rgba(2,6,14,${a * 0.6})`);
  bg.addColorStop(1, 'rgba(2,6,14,0)');
  c.fillStyle = bg;
  c.fillRect(-190, -190, 380, 380);
  c.restore();
}
const TAG = 'SHAPE EXAGGERATED ×25', TAG_Y = 412;   // 13c: the tag alone, clear above the globe's north limb
// beat-relative word times of the poles line (build/timeline.json, 13c), for the cues only (cues() gets no timeline)
const BULGING = 1.82, SLIDES = 2.94, POLES = 3.90;   // measured on the 13c VO (STT)
export function labelAnchor() { return { x: 64, y: 412 }; }   // above the globe (camera holds it low in the continent beat)

export default {
  beat: BEAT.poles,
  chapter: { num: '04', title: 'To the poles', sub: 'once the spin is gone' },
  captions: true,
  layer: 1,
  // beat-relative, from build/timeline.json (13c): "bulging" ≈ BULGING, "slides" ≈ SLIDES, "poles" ≈ POLES
  cues() {
    return [
      { t: 0.05, name: 'deep', gain: 0.26, pitch: 0.7 },          // the pull-back to the planet
      { t: 0.9, name: 'swell', gain: 0.22, pitch: 0.7 },          // the water stirs as the globe forms
      { t: BULGING - 0.1, name: 'swell', gain: 0.32, pitch: 0.75 },
      { t: BULGING + 0.05, name: 'bloom', gain: 0.24, pitch: 0.9 },
      { t: SLIDES - 0.35, name: 'swell', gain: 0.34, pitch: 0.6 },
      { t: SLIDES - 0.05, name: 'whoosh', gain: 0.24, pitch: 0.65 },
      { t: SLIDES + 0.25, name: 'bubbles', gain: 0.16, pitch: 0.6 },
      { t: POLES, name: 'splash', gain: 0.2, pitch: 0.55 },
    ];
  },
  drawWorld(ctx, v) {
    drawSurface(ctx, v);                       // 13b's s05 layer: the repainted surface (stir, drain, flood)
    const ss = shellState(v);
    if (ss.k > 0.003) {
      const g = globeGeom(v);
      if (globeVisible(g) && g.r >= 20) {
        drawShell(ctx, v, g, ss);
        drawSphere(ctx, v, g, ss);
      }
    }
    drawArrows(ctx, v);                        // 13b's s07 layer: the poleward arc arrows
  },
  drawOverlay(ctx, v) {
    // the honesty tag, top left above the globe, as soon as the shell swells (13b put it under the "≈ 21 km" label)
    const ss = shellState(v);
    const kl = L.clamp(ss.grow * 1.6) * ss.k * L.clamp(L.invLerp(5000, 12000, v.cam.mpp));   // leaves with the shell
    if (kl <= 0.003) return;
    const A = labelAnchor();
    ctx.save();
    ctx.globalAlpha *= L.clamp(kl);
    ctx.font = L.font(26, 600, L.FONT.body);
    const tw = ctx.measureText(TAG).width + 21 * 2;
    ctx.fillStyle = 'rgba(2,6,14,0.88)';
    ctx.beginPath();
    ctx.roundRect(A.x - 12, TAG_Y - 29, tw + 24, 40, 20);
    ctx.fill();
    ctx.fillStyle = 'rgba(214,222,235,0.88)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    L.trackedText(ctx, TAG, A.x, TAG_Y + 1, 2);
    ctx.restore();
  },
};
