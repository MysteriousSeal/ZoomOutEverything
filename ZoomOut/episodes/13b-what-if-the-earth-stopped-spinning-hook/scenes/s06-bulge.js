// Beat 6 — "Spinning makes Earth bulge about twenty-one kilometers at the equator."
// A dashed PERFECT SPHERE traces the globe's limb. On "Spinning", soft chevrons push outward at the equator; on
// "bulge" a shell of water swells out at both equatorial limbs (shape exaggerated, and tagged so). On
// "twenty-one" a bracket measures the left bulge and a leader rises to the label "≈ 21 km".
//
// The WATER SHELL lives on through beats 7–8: in beat 7 it slides along the limb from the equator to both
// poles (the cross-section of "the water slides toward the poles"), ending as two polar domes in beat 8.
// Exports shell helpers for s07 (its poleward arrows hug the shell).
import * as L from '../../../../engine/runtime/lib.js';
import { globeGeom, globeVisible } from '../env.js';
import { TB, W6, W7, surfaceState } from './s05-oceans-move.js';

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
    slide: L.ease.inOutCubic(L.prog(gt, t7 + W7.water - 0.35, 2.3)),   // the domes reach the poles on "poles" (~40.4 s)
    // in beat 8 the face carries the story: the exaggerated shell (and its dashed sphere and tag) leave together
    // in the last 0.45 s of beat 7, so no unlabelled dome (or ghost tag) reaches "Two polar oceans"
    k: st.k * (1 - L.ease.inOutCubic(L.prog(gt, TB(v, 8) - 0.45, 0.4))),   // fully gone by the end of beat 7
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
  // on "twenty-one" the measured part (around the equator) flashes in the accent, then stays a touch brighter
  const tn = v.gt - TB(v, 6) - W6.num;
  const hi = tn > 0 ? (0.35 + 0.65 * Math.exp(-tn * 2.2)) * L.clamp(tn / 0.15) * (1 - ss.slide) : 0;
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

/** "Spinning" pushes outward: chevrons at both equatorial limbs. */
function drawPush(c, v, g) {
  const t = v.gt - TB(v, 6);
  const k = L.ease.outCubic(L.prog(t, W6.spinning + 0.05, 0.5)) * (1 - L.ease.inCubic(L.prog(t, W6.num + 0.2, 0.6)));
  if (k <= 0) return;
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const u = (((t * 0.9 + i / 3) % 1) + 1) % 1;            // each chevron drifts outward and fades
      const x = g.cx + s * g.r * (0.8 + 0.22 * u), y = g.cy + 34;
      const a = k * Math.sin(Math.PI * u) * 0.85;
      const sz = 14;
      c.strokeStyle = `rgba(150,235,245,${a})`;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x - s * sz, y - sz); c.lineTo(x, y); c.lineTo(x - s * sz, y + sz);
      c.stroke();
    }
  }
  c.restore();
}

/** The measurement: a bracket across the left bulge, a leader up to the label. */
function drawMeasure(c, v, g, ss, k) {
  if (k <= 0) return;
  const h = shellH(0, ss.slide, ss.grow) * g.r;
  const x0 = g.cx - g.r - h, x1 = g.cx - g.r, y = g.cy;
  const e = L.ease.outCubic(k);
  c.save();
  c.strokeStyle = `rgba(240,244,250,${0.95 * Math.min(1, k * 1.5)})`;
  c.lineWidth = 2.5;
  c.lineCap = 'round';
  // bracket on the equator line, across the bulge (opens from the middle), with bold end ticks
  const xm = (x0 + x1) / 2, xa = L.lerp(xm, x0, e), xb = L.lerp(xm, x1, e);
  c.beginPath();
  c.moveTo(xa, y - 15); c.lineTo(xa, y + 15);
  c.moveTo(xb, y - 15); c.lineTo(xb, y + 15);
  c.moveTo(xa, y); c.lineTo(xb, y);
  c.stroke();
  c.restore();
  return { x: xm, y: y - 17 };
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
export function labelAnchor() { return { x: 64, y: 412 }; }   // above the globe (camera holds it low in beat 6)

/** The honesty tag "SHAPE EXAGGERATED ×25": on with the measurement, held for as long as the water shell shows
 *  (beats 6–7), set to the right of the "≈ 21 km" figure so it never touches the globe's limb. Screen space. */
const TAG = 'SHAPE EXAGGERATED ×25';
function tagGeom(c) {
  const A = labelAnchor();
  c.font = L.font(96, 800, L.FONT.display);
  const bigW = c.measureText('≈ 21 km').width;
  const x = A.x + bigW + 40, maxW = 940 - x - 24;
  const fs = L.fitSize(c, TAG, maxW - 2 * (TAG.length - 1), 26, 600, L.FONT.body, 20);
  c.font = L.font(fs, 600, L.FONT.body);
  const tw = c.measureText(TAG).width + 2 * (TAG.length - 1);
  return { x, y: A.y - 30, fs, tw };     // y: text baseline, level with the middle of the big figure
}
function drawTag(c, v, ss) {
  const t6 = v.gt - TB(v, 6);
  const k = L.prog(t6, W6.num + 0.15, 0.5) * ss.k * (ss.grow > 0.02 ? 1 : 0);
  if (k <= 0.01) return;
  const G = tagGeom(c);
  c.save();
  c.globalAlpha *= L.clamp(k);
  c.fillStyle = 'rgba(2,6,14,0.88)';
  c.beginPath();
  c.roundRect(G.x - 12, G.y - G.fs * 0.74 - 9, G.tw + 24, G.fs * 0.74 + 20, 20);
  c.fill();
  c.font = L.font(G.fs, 600, L.FONT.body);
  c.fillStyle = 'rgba(214,222,235,0.92)';
  L.trackedText(c, TAG, G.x, G.y, 2);
  c.restore();
}

export default {
  beat: 6,
  chapter: { num: '06', title: 'The bulge' },
  captions: true,
  layer: 1,
  cues() {
    return [
      { t: W6.spinning + 0.05, name: 'whoosh', gain: 0.14, pitch: 1.2 },
      { t: W6.bulge - 0.1, name: 'swell', gain: 0.32, pitch: 0.75 },
      { t: W6.bulge + 0.05, name: 'bloom', gain: 0.26, pitch: 0.9 },
      { t: W6.num, name: 'tick', gain: 0.3, pitch: 1.1 },
      { t: W6.num + 0.08, name: 'ping', gain: 0.16, pitch: 1.3 },
    ];
  },
  drawWorld(ctx, v) {
    const ss = shellState(v);
    if (ss.k <= 0.003 || v.gt < TB(v, 6) - 0.2) return;
    const g = globeGeom(v);
    if (!globeVisible(g) || g.r < 20) return;
    drawShell(ctx, v, g, ss);
    drawSphere(ctx, v, g, ss);
    if (v.beat === 6) drawPush(ctx, v, g);
    if (v.beat === 6 || v.beat === 7) drawTag(ctx, v, ss);
  },
  drawOverlay(ctx, v) {
    const ss = shellState(v);
    const g = globeGeom(v);
    if (g.r < 20) return;
    const t = v.t;
    const kl = v.k * L.prog(t, W6.num - 0.05, 0.55);
    if (kl <= 0) return;
    const m = drawMeasure(ctx, v, g, ss, kl);
    const A = labelAnchor();
    labelBacking(ctx, A.x, A.y, kl);
    // leader: from under the label straight down to the bracket on the equator
    if (m) L.leader(ctx, m.x, A.y + 84, m.x, m.y, L.prog(t, W6.num + 0.1, 0.6), [235, 240, 248], 0.8);
    L.bigLabel(ctx, { x: A.x, y: A.y, big: '≈ 21 km', small: '13 mi · equatorial bulge', k: kl, accent: v.accent, size: 96 });
  },
};
