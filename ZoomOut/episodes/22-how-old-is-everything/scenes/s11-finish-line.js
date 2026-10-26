// Beat 11 — "The dinosaurs vanish half a meter from the finish line. | Our species: the last two millimeters."
// The camera lands in lane 5 at the finish (0.78 m of track on screen). A sprint spike shoe lies on the track for
// scale (28 cm, world space, top view: engineered-mesh upper, laces, heel collar, the rigid spike plate's rim flaring
// at the forefoot). A pin rises from the metres tape at 0.478 m with a T. rex plaque; a bracket spans it to the
// finish; bigLabel "0.48 m". On the dive (camera.js split, 0.4 s before phrase 2) everything 0.48-m-scale slides
// away; the Homo sapiens pin (skull plaque) lands at 2.17 mm with its own bracket and bigLabel "2.2 mm".
// Also exports the plaque/pin helpers used by beat 12.
import * as L from '../../../../engine/runtime/lib.js';
import { TRACK_AT, YR_PER_M, diveStart } from '../camera.js';
import { mx, ACCENT, TAPE_Y, hBracket, pin } from '../env.js';

const SHOE = { heel: 0.40, len: 0.28, w: 0.712, rot: -0.07 };   // m before the finish (heel), length, lane coord, rad
const BRACKET_Y = 668, PLAQUE_Y = 930, PLAQUE_R = 46;

// ------------------------------------------------------------------ shared helpers
/** smooth closed path through points (quadratic through midpoints) */
export function smooth(c, pts) {
  const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  c.beginPath();
  const m0 = mid(pts[n - 1], pts[0]);
  c.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const m = mid(pts[i], pts[(i + 1) % n]); c.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
  c.closePath();
}

// T. rex, side view facing right (toward now): horizontal back, tail held straight out, deep skull, two-fingered
// arm, mid-stride. Unit: x 0..1 = nose-to-tail length; ground at y 0.40.
const TREX = [[0, 0.135], [0.18, 0.095], [0.40, 0.052], [0.55, 0.074], [0.65, 0.1], [0.72, 0.086], [0.78, 0.056], [0.87, 0.05],
  [0.965, 0.07], [1.0, 0.102], [0.975, 0.126], [0.95, 0.142], [0.86, 0.162], [0.78, 0.168], [0.715, 0.182], [0.675, 0.215],
  [0.69, 0.236], [0.712, 0.256], [0.722, 0.272], [0.708, 0.27], [0.69, 0.25], [0.63, 0.252], [0.575, 0.25], [0.585, 0.31],
  [0.55, 0.37], [0.6, 0.402], [0.5, 0.404], [0.505, 0.36], [0.49, 0.3], [0.47, 0.28], [0.445, 0.31], [0.42, 0.36],
  [0.44, 0.402], [0.355, 0.404], [0.375, 0.37], [0.39, 0.3], [0.385, 0.22], [0.25, 0.165], [0.1, 0.146], [0, 0.138]];
// Homo sapiens skull (Jebel Irhoud-like), side view facing right: long braincase, vertical-ish forehead, small brow,
// flat face, chin. Unit box 0..1.
const SKULL = [[0.04, 0.46], [0.07, 0.26], [0.22, 0.08], [0.42, 0.02], [0.62, 0.06], [0.74, 0.16], [0.8, 0.3], [0.79, 0.37],
  [0.86, 0.5], [0.83, 0.58], [0.86, 0.7], [0.84, 0.78], [0.86, 0.9], [0.72, 0.94], [0.56, 0.88], [0.5, 0.74], [0.42, 0.64],
  [0.3, 0.66], [0.16, 0.6]];

function icon(c, pts, x, y, w, h, color, hole) {
  c.save();
  c.translate(x, y);
  c.beginPath();
  smooth(c, pts.map(([u, v]) => [u * w, v * h]));
  if (hole) { c.moveTo(hole[0] * w + hole[2] * w, hole[1] * h); c.arc(hole[0] * w, hole[1] * h, Math.max(0, hole[2] * w), 0, Math.PI * 2, true); }
  c.fillStyle = color;
  c.fill('evenodd');
  c.restore();
}

/** a round plaque on a pin: dark disc, accent ring, a light silhouette icon */
export function plaque(c, x, y, k, kind, accent = ACCENT) {
  if (k <= 0) return;
  const e = L.ease.outBack(L.clamp(k));
  c.save();
  c.globalAlpha *= L.clamp(k * 1.5);
  c.translate(x, y);
  c.scale(e, e);
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 18; c.shadowOffsetY = 6;
  c.fillStyle = 'rgb(6,12,20)';
  c.beginPath(); c.arc(0, 0, PLAQUE_R, 0, Math.PI * 2); c.fill();
  c.shadowColor = 'transparent';
  c.strokeStyle = L.rgba(accent, 0.95); c.lineWidth = 3;
  c.stroke();
  const ink = 'rgba(232,238,242,0.95)';
  if (kind === 'trex') icon(c, TREX, -38, -22, 76, 106, ink);
  else {
    const w = 58, h = 56, x0 = -30, y0 = -28, P = (u, v) => [x0 + u * w, y0 + v * h];
    icon(c, SKULL, x0, y0, w, h, ink);
    c.fillStyle = 'rgb(6,12,20)';
    c.beginPath(); c.ellipse(...P(0.65, 0.41), 0.085 * w, 0.1 * h, -0.2, 0, Math.PI * 2); c.fill();          // orbit
    c.beginPath(); c.moveTo(...P(0.8, 0.47)); c.lineTo(...P(0.84, 0.57)); c.lineTo(...P(0.77, 0.57)); c.closePath(); c.fill();   // nasal aperture
    c.strokeStyle = 'rgb(6,12,20)'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(...P(0.36, 0.6)); c.quadraticCurveTo(...P(0.5, 0.56), ...P(0.6, 0.6)); c.stroke();                 // zygomatic arch
    c.beginPath(); c.moveTo(...P(0.5, 0.7)); c.quadraticCurveTo(...P(0.62, 0.76), ...P(0.86, 0.75)); c.stroke();               // jaw line
    c.beginPath(); c.arc(...P(0.3, 0.6), 0.035 * w, 0, Math.PI * 2); c.fill();                                                  // ear opening
  }
  c.restore();
}

// ------------------------------------------------------------------ the spike shoe (world space, top view)
// outline (heel → medial side (big toe, screen up) → toe → lateral side): [fraction of length, lateral m]
const OUT = [[0, 0], [0.03, -0.02], [0.12, -0.028], [0.28, -0.026], [0.42, -0.021], [0.55, -0.03], [0.68, -0.043], [0.8, -0.041],
  [0.9, -0.031], [0.96, -0.018], [1.0, -0.006], [0.985, 0.006], [0.93, 0.018], [0.85, 0.031], [0.75, 0.04], [0.64, 0.043],
  [0.52, 0.038], [0.4, 0.032], [0.25, 0.03], [0.12, 0.028], [0.03, 0.02]];
const outline = (len) => OUT.map(([f, y]) => [f * len, y]);

function drawShoe(c, v, alpha) {
  const s = YR_PER_M / v.cam.mpp;                       // px per metre
  if (alpha <= 0 || SHOE.len * s < 6) return;
  const hx = mx(v, SHOE.heel), hy = v.wy(SHOE.w * YR_PER_M);
  if (hx > L.W + 20 || hx + SHOE.len * s < -20) return;
  c.save();
  c.globalAlpha *= alpha;
  c.translate(hx, hy);
  c.rotate(SHOE.rot);
  c.scale(s, s);                                         // local units: metres
  const Lm = SHOE.len;
  const sole = outline(Lm);
  // contact shadow (light from the top left)
  c.save();
  c.shadowColor = 'rgba(8,2,1,0.55)'; c.shadowBlur = 0.018 * s; c.shadowOffsetX = 0.008 * s; c.shadowOffsetY = 0.012 * s;
  smooth(c, sole); c.fillStyle = 'rgb(24,26,30)'; c.fill();
  c.restore();
  // spike plate rim: rigid, dark, flaring at the forefoot; a few spike-pin housings peek out at the edge
  smooth(c, sole);
  const pg = c.createLinearGradient(0, -0.05, 0, 0.05);
  pg.addColorStop(0, 'rgb(58,62,70)'); pg.addColorStop(1, 'rgb(20,22,26)');
  c.fillStyle = pg; c.fill();
  // upper: inset from the plate (more at the heel, the plate flares at the forefoot)
  const up = outline(Lm * 0.965).map(([x, y]) => [x + Lm * 0.008, y * (x < Lm * 0.5 ? 0.93 : 0.86)]);
  smooth(c, up);
  const ug = c.createLinearGradient(0, -0.05, 0.02, 0.05);
  ug.addColorStop(0, 'rgb(246,247,248)'); ug.addColorStop(0.55, 'rgb(222,225,229)'); ug.addColorStop(1, 'rgb(170,176,184)');
  c.fillStyle = ug; c.fill();
  c.save();
  c.clip();
  // engineered mesh: fine diagonal weave (only when it resolves)
  if (s > 900) {
    c.strokeStyle = 'rgba(120,128,140,0.18)'; c.lineWidth = 0.0007;
    c.beginPath();
    for (let d = -0.1; d < Lm + 0.1; d += 0.0032) { c.moveTo(d, -0.06); c.lineTo(d + 0.05, 0.06); c.moveTo(d + 0.05, -0.06); c.lineTo(d, 0.06); }
    c.stroke();
  }
  // toe bumper and heel counter overlays (slightly darker panels)
  c.fillStyle = 'rgba(150,158,168,0.35)';
  c.beginPath(); c.ellipse(Lm * 0.99, -0.004, 0.05, 0.05, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(-0.01, 0, 0.06, 0.05, 0, 0, Math.PI * 2); c.fill();
  // a swept side panel on the lateral side (no logos)
  c.fillStyle = L.rgba(ACCENT, 0.85);
  c.beginPath();
  c.moveTo(Lm * 0.2, 0.034); c.quadraticCurveTo(Lm * 0.45, 0.012, Lm * 0.72, 0.05); c.lineTo(Lm * 0.7, 0.06);
  c.quadraticCurveTo(Lm * 0.45, 0.03, Lm * 0.18, 0.05); c.closePath(); c.fill();
  c.restore();
  // heel collar opening: padded rim + dark lining / insole
  const col = [[Lm * 0.06, 0], [Lm * 0.09, -0.016], [Lm * 0.2, -0.02], [Lm * 0.32, -0.015], [Lm * 0.35, 0], [Lm * 0.32, 0.016], [Lm * 0.2, 0.021], [Lm * 0.09, 0.017]];
  smooth(c, col.map(([x, y]) => [x - 0.003, y * 1.22]));
  c.fillStyle = 'rgb(205,210,216)'; c.fill();
  smooth(c, col);
  const cg = c.createLinearGradient(Lm * 0.05, 0, Lm * 0.36, 0);
  cg.addColorStop(0, 'rgb(34,37,42)'); cg.addColorStop(0.6, 'rgb(78,84,94)'); cg.addColorStop(1, 'rgb(52,56,64)');
  c.fillStyle = cg; c.fill();
  // lacing: two eyelet rows either side of the throat, criss-cross flat laces, a bow at the top
  const ex = (i) => Lm * (0.4 + i * 0.045);
  const ey = (i) => 0.0105 - i * 0.0006;
  c.fillStyle = 'rgb(214,218,224)';            // throat / tongue strip under the laces
  smooth(c, [[Lm * 0.36, -0.011], [Lm * 0.66, -0.008], [Lm * 0.68, 0], [Lm * 0.66, 0.008], [Lm * 0.36, 0.011], [Lm * 0.33, 0]]);
  c.fill();
  c.fillStyle = 'rgb(70,76,86)';
  for (let i = 0; i < 6; i++) for (const sg of [-1, 1]) { c.beginPath(); c.arc(ex(i), sg * ey(i), 0.0016, 0, Math.PI * 2); c.fill(); }
  c.strokeStyle = 'rgb(252,252,253)'; c.lineWidth = 0.0024; c.lineCap = 'round';
  c.shadowColor = 'rgba(0,0,0,0.3)'; c.shadowBlur = 0.002 * s; c.shadowOffsetY = 0.0008 * s;
  c.beginPath();
  for (let i = 0; i < 5; i++) { c.moveTo(ex(i), -ey(i)); c.lineTo(ex(i + 1), ey(i + 1)); c.moveTo(ex(i), ey(i)); c.lineTo(ex(i + 1), -ey(i + 1)); }
  c.stroke();
  c.lineWidth = 0.002;
  c.beginPath(); c.ellipse(Lm * 0.375, -0.007, 0.009, 0.0035, -0.6, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.ellipse(Lm * 0.375, 0.007, 0.009, 0.0035, 0.6, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.moveTo(Lm * 0.37, 0.002); c.quadraticCurveTo(Lm * 0.33, 0.014, Lm * 0.31, 0.022); c.stroke();
  c.shadowColor = 'transparent';
  // rim light along the lit (top-left) edge
  smooth(c, up);
  c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 0.0015; c.stroke();
  c.restore();
}

// ------------------------------------------------------------------ timing helpers
function times(v) {
  const s0 = v.tl.scenes[11].start, ph = v.tl.lines[11].phrases ?? [v.tl.lines[11]];
  return { s0, p1: ph[0].start, p2: ph[Math.min(1, ph.length - 1)].start, dive: diveStart(v.tl) };
}

export default {
  beat: 11,
  chapter: { num: '11', title: 'The finish line', sub: 'the last half meter' },
  layer: 11,
  cues(d) {
    // relative to the beat start (50.58): marker lands ~1.45 s in, the sapiens pin ~4.3 s in (after the dive)
    return [
      { t: 1.45, name: 'ping', gain: 0.3, pitch: 1.0 },
      { t: 1.6, name: 'tick', gain: 0.22, pitch: 1.1 },
      { t: 4.3, name: 'ping', gain: 0.3, pitch: 1.25 },
      { t: 4.45, name: 'tick', gain: 0.22, pitch: 1.3 },
    ];
  },
  drawWorld(ctx, v) {
    const { s0 } = times(v);
    if (v.gt < s0 - 0.2) return;
    drawShoe(ctx, v, L.clamp((v.gt - s0 + 0.2) / 0.4));
  },
  drawOverlay(ctx, v) {
    const T = times(v), gt = v.gt;
    const finX = mx(v, 0);
    // --- A: the last dinosaurs, 0.478 m
    const aIn = L.prog(gt, T.s0 + 1.4, 0.5), aOut = L.ease.inCubic(L.prog(gt, T.dive - 0.1, 0.35));
    const ka = aIn * (1 - aOut) * v.k;
    if (ka > 0) {
      const x = mx(v, TRACK_AT.kpg);
      ctx.save();
      ctx.globalAlpha *= 1 - aOut;
      pin(ctx, x, TAPE_Y, BRACKET_Y, aIn);
      plaque(ctx, x, PLAQUE_Y, L.prog(gt, T.s0 + 1.55, 0.45), 'trex');
      hBracket(ctx, x, finX, BRACKET_Y, L.prog(gt, T.s0 + 1.6, 0.6), ACCENT, '', 'above');
      ctx.restore();
      L.bigLabel(ctx, { x: 80, y: 560, big: '0.48 m', small: 'the last dinosaurs', k: L.prog(gt, T.s0 + 1.5, 0.55) * (1 - aOut) * v.k, accent: v.accent });
    }
    // --- B: our species, 2.17 mm (after the dive lands)
    const bIn = L.prog(gt, T.dive + 0.95, 0.5);
    const kb = bIn * v.k;
    if (kb > 0) {
      const x = mx(v, TRACK_AT.sapiens);
      ctx.save();
      ctx.globalAlpha *= v.k;
      pin(ctx, x, TAPE_Y, BRACKET_Y, bIn);
      plaque(ctx, x, PLAQUE_Y, L.prog(gt, T.dive + 1.1, 0.45), 'skull');
      hBracket(ctx, x, finX, BRACKET_Y, L.prog(gt, T.dive + 1.15, 0.6), ACCENT, '', 'above');
      ctx.restore();
      L.bigLabel(ctx, { x: 80, y: 560, big: '2.2 mm', small: 'our species', k: L.prog(gt, T.dive + 1.05, 0.55) * v.k, accent: v.accent });
    }
  },
};
