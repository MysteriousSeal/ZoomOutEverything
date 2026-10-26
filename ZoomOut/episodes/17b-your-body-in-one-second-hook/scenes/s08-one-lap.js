// Beat 8 — "Each one laps your whole body in about a minute."
// The camera rides the stream with the hero cell (its ring stays, quieter). A lap diagram rises in the top-right:
// a figure-eight circuit — heart in the middle, the lungs loop above, the body loop below. A dot (the hero) runs
// one full lap: heart → lungs (turns from venous violet to oxygenated red) → heart → body (back to violet) → heart.
// The label "≈ 1 min" / "one lap of your body" lands as the voice says "about a minute".
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT } from '../env.js';
import { heroRing } from './s07-trillions.js';

const { W } = L;
const VEIN = [150, 160, 255], ART = ACCENT;
// diagram geometry (screen px)
const C = { x: 786, y: 468 };
const HL = 118, HB = 118, RW = 104;            // loop heights (up to the lungs, down to the body), half-width

// the lap as a polyline: heart → up the left side → lungs → down the right → heart → down the right → body → up the left
let PATH = null;
function lapPath() {
  if (PATH) return PATH;
  const pts = [];
  const seg = (fn, n) => { for (let i = 0; i <= n; i++) pts.push(fn(i / n)); };
  const loop = (dir, h) => (s) => {
    // a rounded loop leaving the heart going up/down-left, returning on the right (lungs) or the opposite (body)
    const a = s * Math.PI * 2;
    const x = C.x - Math.sin(a) * RW * (dir < 0 ? 1 : -1);
    const y = C.y + dir * (h / 2) * (1 - Math.cos(a));
    return [x, y];
  };
  seg(loop(-1, HL), 80);   // pulmonary loop (up)
  seg(loop(1, HB), 80);    // systemic loop (down)
  let len = 0;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) { len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(len); }
  PATH = { pts, cum, len };
  return PATH;
}
function pointAt(s) {
  const { pts, cum, len } = lapPath();
  const d = L.clamp(s) * len;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const f = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
  return [L.lerp(pts[i - 1][0], pts[i][0], f), L.lerp(pts[i - 1][1], pts[i][1], f)];
}
/** Blood colour along the lap: violet to the lungs, red from the lungs through the heart to the body, violet back. */
function bloodCol(s) {
  const toRed = L.smoothstep(L.clamp((s - 0.22) / 0.06)), toVein = L.smoothstep(L.clamp((s - 0.72) / 0.06));
  return L.mix(L.mix(VEIN, ART, toRed), VEIN, toVein);
}

function heartIcon(c, x, y, s, col, a) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.beginPath();
  c.moveTo(0, 12);
  c.bezierCurveTo(-26, -4, -18, -26, 0, -12);
  c.bezierCurveTo(18, -26, 26, -4, 0, 12);
  c.closePath();
  const g = c.createRadialGradient(-6, -10, 2, 0, 0, 24);
  g.addColorStop(0, L.rgba([255, 170, 170], a)); g.addColorStop(1, L.rgba(col, a));
  c.fillStyle = g; c.fill();
  c.restore();
}
function lungsIcon(c, x, y, a) {
  c.save(); c.translate(x, y);
  c.strokeStyle = `rgba(235,226,236,${0.85 * a})`; c.lineWidth = 2.2; c.lineJoin = 'round';
  for (const sd of [-1, 1]) {
    c.beginPath();
    c.moveTo(sd * 6, -18);
    c.bezierCurveTo(sd * 30, -22, sd * 34, 14, sd * 26, 22);
    c.bezierCurveTo(sd * 18, 26, sd * 8, 22, sd * 6, 14);
    c.closePath();
    c.fillStyle = `rgba(150,160,255,${0.16 * a})`; c.fill(); c.stroke();
  }
  c.beginPath(); c.moveTo(0, -30); c.lineTo(0, -14); c.moveTo(0, -14); c.lineTo(-6, -8); c.moveTo(0, -14); c.lineTo(6, -8); c.stroke();
  c.restore();
}
function bodyIcon(c, x, y, a) {
  c.save(); c.translate(x, y);
  c.fillStyle = `rgba(235,226,236,${0.18 * a})`; c.strokeStyle = `rgba(235,226,236,${0.85 * a})`; c.lineWidth = 2.2;
  c.lineJoin = 'round';
  c.beginPath(); c.arc(0, -25, 7, 0, Math.PI * 2); c.fill(); c.stroke();
  c.beginPath();
  c.moveTo(-5, -15); c.quadraticCurveTo(-15, -15, -15, -6); c.lineTo(-13, 8); c.lineTo(-8, 8); c.lineTo(-7, 30); c.lineTo(-1.5, 30); c.lineTo(0, 12);
  c.lineTo(1.5, 30); c.lineTo(7, 30); c.lineTo(8, 8); c.lineTo(13, 8); c.lineTo(15, -6); c.quadraticCurveTo(15, -15, 5, -15); c.closePath();
  c.fill(); c.stroke();
  c.restore();
}

export default {
  beat: 8,
  chapter: { num: '08', title: 'One lap', sub: 'heart, lungs, body, heart' },
  chapterUntil(d) { return 1.6; },
  captions: true,
  layer: 5,
  cues(d) {
    const T0 = 0.75, DUR = 2.1;
    return [
      { t: 0.3, name: 'swish', gain: 0.18, pitch: 1.1 },
      { t: T0, name: 'swell', gain: 0.18, pitch: 1.0 },
      { t: T0 + DUR * 0.25, name: 'tick', gain: 0.18, pitch: 1.5 },
      { t: T0 + DUR * 0.5, name: 'tick', gain: 0.18, pitch: 1.2 },
      { t: T0 + DUR * 0.75, name: 'tick', gain: 0.18, pitch: 1.0 },
      { t: T0 + DUR, name: 'ping', gain: 0.3, pitch: 1.2 },
      { t: 1.5, name: 'blip', gain: 0.18, pitch: 1.1 },
    ];
  },
  drawWorld() {},
  drawOverlay(c, v) {
    const t = v.t;
    // the hero keeps its ring (quieter) while we ride with it
    const kr = v.k * (1 - 0.3 * L.prog(t, 0.2, 0.6));
    heroRing(c, v, { k: kr, draw: 1, gauge: 1, alpha: 0.85 });
    // backing
    const kd = Math.min(v.k, L.ease.outCubic(L.prog(t, 0.25, 0.55)));
    if (kd <= 0) return;
    c.save();
    c.globalAlpha = kd;
    const bg = c.createRadialGradient(540, 470, 60, 540, 470, 560);
    bg.addColorStop(0, 'rgba(10,2,6,0.55)'); bg.addColorStop(1, 'rgba(10,2,6,0)');
    c.fillStyle = bg; c.fillRect(0, 160, W, 720);
    c.restore();
    // --- the diagram
    const T0 = 0.75, DUR = 2.1;
    const p = L.ease.inOutCubic(L.prog(t, T0, DUR));
    c.save();
    c.globalAlpha = kd;
    c.translate(0, (1 - kd) * 20);
    const { pts } = lapPath();
    // faint full circuit, coloured by blood
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (let i = 1; i < pts.length; i++) {
      const s = i / (pts.length - 1);
      c.strokeStyle = L.rgba(bloodCol(s), 0.3); c.lineWidth = 3;
      c.beginPath(); c.moveTo(pts[i - 1][0], pts[i - 1][1]); c.lineTo(pts[i][0], pts[i][1]); c.stroke();
    }
    // the travelled part, bright
    const n = Math.floor(p * (pts.length - 1));
    for (let i = 1; i <= n; i++) {
      const s = i / (pts.length - 1);
      c.strokeStyle = L.rgba(bloodCol(s), 0.95); c.lineWidth = 4.5;
      c.beginPath(); c.moveTo(pts[i - 1][0], pts[i - 1][1]); c.lineTo(pts[i][0], pts[i][1]); c.stroke();
    }
    // stations
    const passed = (s0) => L.ease.outCubic(L.prog(p, s0 - 0.02, 0.08));
    lungsIcon(c, C.x, C.y - HL - 4, 0.75 + 0.25 * passed(0.25));
    bodyIcon(c, C.x, C.y + HB + 6, 0.75 + 0.25 * passed(0.75));
    const beat = 1 + 0.12 * Math.exp(-Math.min(Math.abs(p - 0.5), Math.abs(p - 1)) * 30);
    heartIcon(c, C.x, C.y, 1.15 * beat, [200, 30, 48], 1);
    // the dot (the hero)
    if (t > T0 - 0.2) {
      const [dx, dy] = pointAt(p);
      const col = bloodCol(p);
      c.globalCompositeOperation = 'lighter';
      L.lightBlob(c, dx, dy, 34, col, 0.7);
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(dx, dy, 6.5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = L.rgba(col); c.lineWidth = 3; c.stroke();
    }
    // lap complete: the circuit glows once
    const fin = Math.exp(-Math.max(0, t - T0 - DUR) * 2.5) * L.prog(t, T0 + DUR - 0.05, 0.05);
    if (fin > 0.01) {
      c.globalCompositeOperation = 'lighter';
      c.shadowColor = L.rgba(ACCENT); c.shadowBlur = 20;
      c.strokeStyle = L.rgba(ACCENT, 0.5 * fin); c.lineWidth = 4;
      c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
    }
    c.restore();
    // --- label
    const kl = Math.min(v.k, L.prog(t, 1.45, 0.55));
    L.bigLabel(c, { x: 96, y: 468, big: '≈ 1 min', small: 'one lap of your body', k: kl, accent: ACCENT, size: 124 });
  },
};
