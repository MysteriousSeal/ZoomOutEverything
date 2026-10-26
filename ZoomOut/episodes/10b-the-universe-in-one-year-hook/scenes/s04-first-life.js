// Beat 4 — first life, late September. The wash front runs on from the Sun to Sept 21
// (Sept 21, as in the brief), and a single microbe blooms in that cell: a translucent
// rod-shaped cell with a membrane, a nucleoid, a beating flagellum, and two tiny cocci budding off.
// It stays there (alive, gently drifting) for the rest of the film.
import * as L from '../../../../engine/runtime/lib.js';
import { centre } from '../camera.js';
import { ACCENT, HOT, LIFE, dayCell, eventLabel, glowCell, ring, sparks, toScreen } from './s00-hook.js';
import { LIFE_DOY, T_LIFE } from './s03-sun.js';

const { W, H } = L;
const CELL = dayCell(LIFE_DOY);
const C = centre(CELL);

/** A microbe at (x, y), cell size s px. k: presence 0..1, gt: global time for life-like motion. */
export function microbe(c, x, y, s, k, gt, seed = 0, detail = true) {
  if (k <= 0 || s < 1.5) return;
  const len = s * 0.23, wid = s * 0.115;            // a plump capsule (a bacillus), not a thin rod: reads as a cell at phone size
  const ang = -0.55 + 0.18 * L.noise1(gt * 0.4, seed + 11);
  const ox = x + s * 0.03 * L.noise1(gt * 0.3, seed + 12), oy = y + s * 0.03 * L.noise1(gt * 0.33, seed + 13);
  c.save();
  c.translate(ox, oy);
  c.rotate(ang);
  c.globalAlpha *= L.clamp(k);
  if (!detail || s <= 24) {
    // small: a tuft of three short flagella so even a 20 px microbe reads as a living cell, not a hatch mark
    c.strokeStyle = L.rgba(LIFE, 0.7);
    c.lineWidth = Math.max(1, s * 0.035);
    c.lineCap = 'round';
    for (const da of [-0.5, 0, 0.5]) {
      const w = Math.sin(gt * 7 + seed + da * 3) * 0.12;
      c.beginPath();
      c.moveTo(-len * 0.9, wid * da * 0.8);
      c.quadraticCurveTo(-len - s * 0.12, wid * da * 1.4 + s * w * 0.3, -len - s * 0.2, wid * da * 2.2 + s * w * 0.4);
      c.stroke();
    }
  }
  if (detail && s > 24) {
    // flagellum: a travelling wave from the back pole
    c.strokeStyle = L.rgba(LIFE, 0.75);
    c.lineWidth = Math.max(1, s * 0.01);
    c.lineCap = 'round';
    c.beginPath();
    for (let i = 0; i <= 18; i++) {
      const u = i / 18;
      const px = -len - u * s * 0.3, py = Math.sin(u * 9 - gt * 9 + seed) * s * 0.03 * u;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.stroke();
  }
  // body
  const g = c.createRadialGradient(len * 0.2, -wid * 0.3, 0, 0, 0, len + wid);
  g.addColorStop(0, L.rgba(L.mix(LIFE, HOT, 0.5), 0.8));
  g.addColorStop(1, L.rgba(LIFE, 0.32));
  c.fillStyle = g;
  L.roundRect(c, -len, -wid, len * 2, wid * 2, wid);
  c.fill();
  c.strokeStyle = L.rgba(LIFE, 0.95);
  c.lineWidth = Math.max(1.2, s * 0.02);
  c.stroke();
  // membrane highlight: a light sheen along the upper wall
  c.strokeStyle = L.rgba(HOT, 0.6);
  c.lineWidth = Math.max(1, s * 0.012);
  c.beginPath(); c.moveTo(-len * 0.55, -wid * 0.55); c.lineTo(len * 0.55, -wid * 0.55); c.stroke();
  if (detail && s > 24) {
    // nucleoid + ribosomes
    c.strokeStyle = L.rgba(HOT, 0.5);
    c.lineWidth = Math.max(1, s * 0.008);
    c.beginPath();
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      const px = L.lerp(-len * 0.55, len * 0.55, u), py = Math.sin(u * 7 + gt * 1.3 + seed) * wid * 0.35;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.stroke();
    c.fillStyle = L.rgba(HOT, 0.7);
    for (const [u, w] of [[-0.6, 0.45], [0.15, -0.5], [0.62, 0.3]]) {
      c.beginPath(); c.arc(len * u, wid * w, Math.max(0, s * 0.008), 0, Math.PI * 2); c.fill();
    }
  }
  c.restore();
}

/** Two tiny cocci, one dividing. */
function cocci(c, x, y, s, k, gt) {
  if (k <= 0 || s < 12) return;
  c.save();
  c.globalAlpha *= L.clamp(k);
  const pts = [[0.27, 0.27, 0.06, 1], [-0.27, 0.25, 0.045, 2]];
  for (const [u, w, r, sd] of pts) {
    const px = x + s * (u + 0.015 * L.noise1(gt * 0.5, sd + 20)), py = y + s * (w + 0.015 * L.noise1(gt * 0.45, sd + 21));
    const split = sd === 1 ? 0.5 + 0.5 * Math.sin(gt * 0.8) : 0;
    for (const dx of split > 0 ? [-1, 1] : [0]) {
      const cx = px + dx * s * r * 0.55 * split;
      c.fillStyle = L.rgba(LIFE, 0.22);
      c.strokeStyle = L.rgba(LIFE, 0.85);
      c.lineWidth = Math.max(1, s * 0.009);
      c.beginPath(); c.arc(cx, py, Math.max(0, s * r), 0, Math.PI * 2); c.fill(); c.stroke();
    }
  }
  c.restore();
}

export default {
  beat: 4,
  chapter: { num: '04', title: 'First life', sub: 'Late September' },
  captions: true,
  layer: 4,
  cues(d) {
    return [
      { t: -0.05, name: 'tick', gain: 0.16, pitch: 1.4 },
      { t: T_LIFE, name: 'bloom', gain: 0.34, pitch: 1.25 },
      { t: T_LIFE + 0.05, name: 'bubbles', gain: 0.32, pitch: 1.0 },
      { t: 0.95, name: 'ping', gain: 0.22, pitch: 1.3 },
    ];
  },
  drawWorld(c, v) {
    const dt = v.t - T_LIFE;
    if (dt < 0) return;
    const s = toScreen(v, CELL);
    const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    if (cx < -s.w * 6 || cx > W + s.w * 6 || cy < -s.w * 6 || cy > H + s.w * 6) return;
    if (dt < 2) {
      L.lightBlob(c, cx, cy, s.w * (1 + 2.4 * L.ease.outCubic(L.clamp(dt / 0.9))), LIFE, 0.7 * Math.exp(-dt / 0.35));
      ring(c, v, C.x, C.y, dt, { reach: 2.2, dur: 1.1, color: LIFE, width: 1.6, alpha: 0.7 });
      sparks(c, v, C.x, C.y, dt, { n: 40, seed: 404, speed: 1.6, life: 1.2, color: LIFE, width: 1.6 });
    }
    const k = L.ease.outCubic(L.clamp(dt / 0.6)) * L.lerp(1, 0.78, L.ease.inOutCubic(L.prog(dt, 3.6, 4)));
    glowCell(c, v, CELL, k * 0.8, LIFE, 0.7);
    L.lightBlob(c, cx, cy, s.w * 0.7, LIFE, 0.22 * k);
    const grow = L.ease.outBack(L.clamp(dt / 0.8), 1.8);
    microbe(c, cx + s.w * 0.04, cy + s.w * 0.06, s.w * (0.55 + 0.75 * grow), k, v.gt, 3);
    cocci(c, cx, cy, s.w, L.clamp((dt - 0.5) / 0.6), v.gt);
  },
  drawOverlay(c, v) {
    eventLabel(c, v, { big: 'LATE SEPT', small: 'First life  ·  ~3.8 billion years ago', t0: 0.95 });
  },
};
