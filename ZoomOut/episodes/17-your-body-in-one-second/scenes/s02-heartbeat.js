// Beat 2 — "In that second, your heart beats about once."
// OWNS the anatomical glass heart at P.heart for the whole film (fades in as the camera pulls back in beat 2):
// deep crimson glass with chambers hinted, the aortic arch and its branches, the pulmonary trunk, the superior vena
// cava and coronary vessels. It beats on every whole second of the stopwatch (s00.heartAge), so "once a second" is
// literally in sync with the sweep hand; each beat sends a pulse down the right arm's artery to the thumb.
// Label "≈ 1 beat" / "per second, at rest" lands on the 9.79 s beat ("your heart").
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, P, SIZE, clockStart } from '../env.js';
import { heartAge, systole, atrial, arteryK, drawArtery, ART_WRIST, tubePath, blobPath } from './s00-hook.js';

const { W, H } = L;
const U = SIZE.heart;           // local unit = 12 cm
const HC = P.heart;
// local (x right, y down, units of U) → world
const lw = (x, y) => [HC.x + x * U, HC.y + y * U];
const lwr = (x, y, r) => [HC.x + x * U, HC.y + y * U, r * U];

// outline of the ventricles + atria, front view (apex down to the viewer's right)
const BODY = [[-0.25, -0.31], [-0.37, -0.24], [-0.425, -0.09], [-0.415, 0.07], [-0.34, 0.21], [-0.19, 0.33], [0.0, 0.44],
  [0.17, 0.55], [0.27, 0.575], [0.355, 0.5], [0.42, 0.3], [0.44, 0.08], [0.405, -0.09], [0.345, -0.19], [0.25, -0.235],
  [0.13, -0.25], [0.0, -0.29], [-0.13, -0.33]];
// great vessels (tubes: [x, y, r] local)
const SVC = [[-0.25, -0.2, 0.062], [-0.265, -0.4, 0.058], [-0.27, -0.6, 0.054]];
const AORTA = [[-0.04, -0.22, 0.072], [-0.085, -0.4, 0.074], [-0.05, -0.54, 0.07], [0.06, -0.6, 0.066], [0.18, -0.57, 0.062], [0.25, -0.48, 0.058], [0.27, -0.38, 0.056]];
const BRANCHES = [
  [[-0.05, -0.55, 0.036], [-0.075, -0.68, 0.032], [-0.088, -0.8, 0.028]],   // brachiocephalic (→ the right arm)
  [[0.04, -0.59, 0.027], [0.045, -0.7, 0.025], [0.05, -0.81, 0.022]],       // left common carotid
  [[0.13, -0.585, 0.03], [0.155, -0.69, 0.027], [0.18, -0.79, 0.024]],     // left subclavian
];
const PULM = [[0.1, -0.2, 0.082], [0.1, -0.34, 0.078], [0.14, -0.43, 0.068]];
const PULM_L = [[0.14, -0.44, 0.05], [0.28, -0.46, 0.045], [0.41, -0.42, 0.04]];
const PULM_R = [[0.1, -0.44, 0.048], [-0.02, -0.47, 0.044], [-0.12, -0.46, 0.04]];
// coronary vessels (local polylines, root first; tapered when drawn)
const LAD = [[0.04, -0.24], [0.06, -0.08], [0.1, 0.1], [0.17, 0.3], [0.25, 0.5]];
const CX = [[0.06, -0.24], [0.2, -0.19], [0.33, -0.1], [0.41, 0.06]];
const RCA = [[-0.08, -0.25], [-0.24, -0.18], [-0.36, -0.03], [-0.34, 0.15], [-0.2, 0.28]];
const SMALL = [[[0.08, -0.02], [0.2, 0.04], [0.33, 0.14]], [[0.13, 0.18], [0.25, 0.25], [0.36, 0.36]], [[-0.35, 0.04], [-0.24, 0.1], [-0.12, 0.12]],
  [[0.3, -0.14], [0.35, 0.02], [0.37, 0.18]], [[-0.27, 0.22], [-0.14, 0.24], [-0.02, 0.33]], [[0.02, 0.0], [-0.08, 0.12], [-0.12, 0.26]]];

/** Heart scale state at time gt: squeeze 0..1 (ventricles), kick (atria). */
function beatState(gt, tl) {
  const a = heartAge(gt, tl);
  return { s: systole(a), atr: atrial(a), age: a };
}

function vesselGlass(c, v, pts, col, k, rimA = 0.5, fade = 0) {
  c.save();
  c.beginPath(); tubePath(c, v, pts.map(([x, y, r]) => lwr(x, y, r)), 5);
  const p0 = lw(pts[0][0], pts[0][1]), p1 = lw(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  const g = c.createLinearGradient(v.wx(p0[0]) - v.ws(0.03), v.wy(p0[1]), v.wx(p1[0]) + v.ws(0.03), v.wy(p1[1]));
  g.addColorStop(0, L.rgba(col, 0.9 * k)); g.addColorStop(1, L.rgba(L.mix(col, [20, 10, 20], 0.45), 0.9 * k * (1 - fade)));
  c.fillStyle = g; c.fill();
  c.clip();
  const rw = L.clamp(0.002 / v.cam.mpp, 1, 10);
  const rg = c.createLinearGradient(v.wx(p0[0]), v.wy(p0[1]), v.wx(p1[0]), v.wy(p1[1]));
  rg.addColorStop(0, L.rgba(L.mix(col, [255, 230, 230], 0.5), rimA * 0.8 * k)); rg.addColorStop(1, L.rgba(L.mix(col, [255, 230, 230], 0.5), rimA * 0.8 * k * (1 - fade)));
  c.strokeStyle = rg; c.lineWidth = rw * 1.2; c.stroke();
  // cylinder shading: a darker core line down the middle of the tube
  c.beginPath();
  pts.forEach(([x, y], i) => { const q = lw(x + 0.012, y); i ? c.lineTo(v.wx(q[0]), v.wy(q[1])) : c.moveTo(v.wx(q[0]), v.wy(q[1])); });
  c.strokeStyle = `rgba(30,6,16,${0.25 * k * (1 - fade * 0.5)})`; c.lineWidth = Math.max(1, v.ws(pts[0][2] * U) * 0.7); c.lineCap = 'round'; c.stroke();
  c.restore();
}

/** Draws the heart (world space). k = visibility. */
export function drawHeart(c, v, k) {
  const mpp = v.cam.mpp;
  const px = U / mpp;                                     // pixels per heart unit
  const cx = v.wx(HC.x), cy = v.wy(HC.y);
  if (cx < -px * 1.5 || cx > W + px * 1.5 || cy < -px * 1.2 || cy > H + px * 1.5 || px < 3) return;
  const { s, atr } = beatState(v.gt, v.tl);
  const fine = px > 160;
  c.save();
  // glow behind the heart (pulses with systole)
  L.lightBlob(c, cx + px * 0.02, cy + px * 0.05, px * 0.95, [255, 70, 90], k * (0.16 + 0.22 * s));
  // great vessels behind the heart body
  const vsq = 1 - 0.015 * s;
  c.save();
  c.translate(cx, cy); c.scale(vsq, vsq); c.translate(-cx, -cy);
  vesselGlass(c, v, PULM_R, [100, 64, 124], k, 0.3, 0.7);
  vesselGlass(c, v, SVC, [86, 76, 128], k, 0.5, 0.75);
  for (const b of BRANCHES) vesselGlass(c, v, b, [190, 46, 62], k, 0.45, 0.85);
  vesselGlass(c, v, AORTA, [196, 48, 64], k, 0.5, 0.6);
  vesselGlass(c, v, PULM_L, [112, 70, 130], k, 0.35, 0.6);
  vesselGlass(c, v, PULM, [120, 72, 138], k);
  if (px > 60) {
    // a soft light down the aorta on each ejection
    const ag = L.smoothstep(L.prog(heartAge(v.gt, v.tl), 0.05, 0.12)) * (1 - L.smoothstep(L.prog(heartAge(v.gt, v.tl), 0.2, 0.4)));
    if (ag > 0) {
      const top = lw(0.05, -0.67);
      L.lightBlob(c, v.wx(top[0]), v.wy(top[1]), px * 0.28, [255, 150, 150], 0.5 * ag * k);
    }
  }
  c.restore();
  // the heart body: squeezes toward the base on systole, with a slight twist
  const base = lw(0, -0.24);
  const bx = v.wx(base[0]), by = v.wy(base[1]);
  c.save();
  c.translate(bx, by);
  c.rotate(-0.03 * s);
  c.scale(1 - 0.05 * s + 0.02 * atr, 1 - 0.075 * s + 0.01 * atr);
  c.translate(-bx, -by);
  c.beginPath(); blobPath(c, v, BODY.map(([x, y]) => lw(x, y)));
  const rg = c.createRadialGradient(cx - px * 0.15, cy - px * 0.08, px * 0.02, cx, cy, px * 0.62);
  rg.addColorStop(0, L.rgba(L.mix([178, 40, 60], [255, 96, 108], s), 0.95 * k));
  rg.addColorStop(0.55, L.rgba([118, 20, 40], 0.93 * k));
  rg.addColorStop(1, L.rgba([52, 8, 22], 0.94 * k));
  c.fillStyle = rg; c.fill();
  c.save();
  c.clip();
  // chambers hinted: four soft lobes of inner light
  const lobe = (x, y, r, a) => { const p = lw(x, y); L.lightBlob(c, v.wx(p[0]), v.wy(p[1]), px * r, [255, 120, 130], a * k); };
  lobe(-0.13, 0.08, 0.3, 0.22 + 0.25 * s);       // right ventricle
  lobe(0.27, 0.18, 0.28, 0.2 + 0.3 * s);         // left ventricle
  lobe(-0.32, -0.14, 0.17, 0.15 + 0.4 * atr);    // right atrium
  lobe(0.33, -0.17, 0.14, 0.12 + 0.4 * atr);     // left auricle
  // soft valleys between the chambers (interventricular + AV grooves), blurred by width
  const groove = (pts, w, a) => {
    c.beginPath();
    pts.forEach(([x, y], i) => { const p = lw(x, y); i ? c.lineTo(v.wx(p[0]), v.wy(p[1])) : c.moveTo(v.wx(p[0]), v.wy(p[1])); });
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = `rgba(40,4,14,${a * 0.5 * k})`; c.lineWidth = Math.max(1, px * w * 2); c.stroke();
    c.strokeStyle = `rgba(40,4,14,${a * k})`; c.lineWidth = Math.max(1, px * w); c.stroke();
  };
  if (px > 50) {
    groove(LAD, 0.05, 0.22);
    groove([[-0.3, -0.2], [-0.16, -0.19], [0.02, -0.21], [0.22, -0.21], [0.36, -0.13]], 0.05, 0.22);
  }
  // fresnel rim + warm key light
  c.beginPath(); blobPath(c, v, BODY.map(([x, y]) => lw(x, y)));
  const rw = L.clamp(0.0024 / mpp, 1, 14);
  c.strokeStyle = `rgba(255,120,130,${0.22 * k})`; c.lineWidth = rw * 3.2; c.stroke();
  c.strokeStyle = `rgba(255,170,175,${0.4 * k})`; c.lineWidth = rw * 1.1; c.stroke();
  const kg = c.createLinearGradient(cx - px * 0.5, cy - px * 0.35, cx + px * 0.1, cy + px * 0.2);
  kg.addColorStop(0, `rgba(255,226,214,${0.6 * k})`); kg.addColorStop(1, 'rgba(255,226,214,0)');
  c.strokeStyle = kg; c.lineWidth = rw * 1.6; c.stroke();
  // glass gloss: a curved specular sheet on the upper left
  if (px > 40) {
    c.beginPath();
    const g0 = lw(-0.25, -0.05);
    c.ellipse(v.wx(g0[0]), v.wy(g0[1]), Math.max(0, px * 0.12), Math.max(0, px * 0.24), 0.5, 0, Math.PI * 2);
    const sg = c.createRadialGradient(v.wx(g0[0]) - px * 0.04, v.wy(g0[1]) - px * 0.08, 0, v.wx(g0[0]), v.wy(g0[1]), px * 0.25);
    sg.addColorStop(0, `rgba(255,235,230,${0.32 * k})`); sg.addColorStop(1, 'rgba(255,235,230,0)');
    c.fillStyle = sg; c.fill();
  }
  c.restore();
  // coronary vessels on the surface: tapered hairlines that brighten on the beat
  if (px > 70) {
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.globalCompositeOperation = 'lighter';
    const col = L.mix([235, 90, 100], [255, 190, 175], s);
    const vessel = (pts, w0, a) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const p = lw(pts[i][0], pts[i][1]), q = lw(pts[i + 1][0], pts[i + 1][1]);
        const f = 1 - i / (pts.length - 1);
        c.beginPath(); c.moveTo(v.wx(p[0]), v.wy(p[1])); c.lineTo(v.wx(q[0]), v.wy(q[1]));
        c.strokeStyle = L.rgba(col, a * k * (0.5 + 0.5 * f)); c.lineWidth = Math.max(0.7, px * w0 * (0.45 + 0.55 * f)); c.stroke();
      }
    };
    vessel(LAD, 0.014, 0.5); vessel(CX, 0.012, 0.4); vessel(RCA, 0.013, 0.45);
    if (fine) for (const sm of SMALL) vessel(sm, 0.007, 0.3);
    c.restore();
  }
  c.restore();
  c.restore();
}

export default {
  beat: 2,
  chapter: { num: '02', title: 'Heartbeat', sub: 'about one beat per second at rest' },
  captions: true,
  layer: 1,
  cues(d) {
    // lub-dub on each whole second of the stopwatch inside this beat (9.79, 10.79, 11.79 s)
    // (cues only get d: times are from build/timeline.json, clockStart = 4.787 s, beat start 8.662 s)
    const out = [];
    for (const t of [1.125, 2.125, 3.125]) {
      out.push({ t, name: 'impact', gain: t === 1.125 ? 0.3 : 0.22, pitch: 1.25 });
      out.push({ t: t + 0.2, name: 'impact', gain: 0.13, pitch: 1.6 });
    }
    out.push({ t: 1.15, name: 'blip', gain: 0.14, pitch: 0.9 });
    return out;
  },
  drawWorld(c, v) {
    if (v.cam.mpp < 3e-6) return;
    const k = L.ease.outCubic(L.prog(v.t, 0.25, 0.9));
    if (k <= 0) return;
    // the right arm's artery (heart → wrist; s00 draws the part inside the hand)
    const ak = arteryK(v.gt, v.tl);
    if (ak > 0) drawArtery(c, v, 0, ART_WRIST, ak);
    drawHeart(c, v, k);
  },
  drawOverlay(c, v) {
    const tb = clockStart(v.tl) + 5 - v.tl.scenes[2].start;   // the 9.79 s heartbeat, relative to this beat
    const k = v.k * L.prog(v.t, tb - 0.05, 0.5);
    L.bigLabel(c, { x: 500, y: 1030, big: '≈ 1 BEAT', small: 'per second, at rest', k, accent: ACCENT, align: 'left', size: 104 });
  },
};
