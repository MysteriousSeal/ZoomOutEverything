// Beat 2 — "A day is one spin of the Earth."
// env spins the real globe once (beat 2 - 0.25 s, 2.3 s, inOutSine, sampled per frame). This scene draws a fine rotation ring in the
// Earth's equatorial plane (true 3/4 projection from earthView, so the back half passes behind the globe), drawing
// itself in lock-step with the spin, with a light at its head and a drawn chevron arrowhead. When the spin completes
// the ring flashes once. Label: "1 DAY" / "one spin of the Earth" (top-left, clear of the globe).
import * as L from '../../../../engine/runtime/lib.js';
import { EARTH, earthView, spinE as envSpinE, spinStart, SPIN_DUR } from '../env.js';

const TAU = Math.PI * 2, DEG = Math.PI / 180;
const RING = 1.2;   // ring radius in Earth radii

/** Spin progress 0..1, identical to env's earthView spin. */
const spinE = envSpinE;

/** Screen point of ring angle phi (0 = front centre) + whether it is hidden behind the globe. */
function ringPt(v, phi, p0) {
  const R = v.ws(EARTH.r), rr = R * RING;
  const X = Math.sin(phi), Y = -Math.sin(p0) * Math.cos(phi), Z = Math.cos(p0) * Math.cos(phi);
  const x = X * rr, y = -Y * rr;
  const hidden = Z < 0 && (x * x + y * y) < R * R;
  return { x: v.wx(EARTH.x) + x, y: v.wy(EARTH.y) + y, hidden };
}

function drawRing(c, v, k) {
  const R = v.ws(EARTH.r);
  if (R < 6) return;
  const p0 = earthView(v.gt, v.tl).lat0 * DEG;
  const e = spinE(v.gt, v.tl);
  const draw = L.ease.outCubic(L.prog(v.t, 0.05, 0.25));       // a short lead-in stub before the spin starts
  // the Earth turns west to east: the surface moves left-to-right across the front, so the ring runs that way (phi increasing)
  const phi0 = -Math.PI * 0.62;
  const span = TAU * Math.max(0.04 * draw, e * 0.995);
  const phiH = phi0 + span;
  const N = Math.max(40, Math.round(160 * span / TAU));
  const done = L.prog(v.gt, spinStart(v.tl) + SPIN_DUR - 0.05, 0.6);   // completion flash
  c.save();
  c.lineCap = 'round';
  c.globalAlpha *= k;
  // faint full guide (the track), front part only
  c.strokeStyle = 'rgba(200,215,235,0.10)';
  c.lineWidth = 1.2;
  for (let i = 0; i < 120; i++) {
    const a = ringPt(v, (i / 120) * TAU, p0), b = ringPt(v, ((i + 1) / 120) * TAU, p0);
    if (a.hidden || b.hidden) continue;
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
  }
  // the drawn arc: brighter toward the head, glow pass + core pass
  for (const [lw, al, col] of [[7, 0.10, [235, 200, 130]], [2.4, 0.9, [245, 225, 180]]]) {
    c.lineWidth = lw;
    for (let i = 0; i < N; i++) {
      const u0 = i / N, u1 = (i + 1) / N;
      const a = ringPt(v, phi0 + span * u0, p0), b = ringPt(v, phi0 + span * u1, p0);
      if (a.hidden || b.hidden) continue;
      const fade = 0.3 + 0.7 * u1 + 0.5 * Math.exp(-done * 4) * (done > 0 ? 1 : 0);
      c.strokeStyle = L.rgba(col, Math.min(1, al * fade));
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
    }
  }
  // head: a light and a drawn chevron along the tangent (only while visible in front)
  const h = ringPt(v, phiH, p0), h2 = ringPt(v, phiH - 0.04, p0);
  if (!h.hidden) {
    const tx = h.x - h2.x, ty = h.y - h2.y, n = Math.hypot(tx, ty) || 1;
    const ux = tx / n, uy = ty / n;
    const hk = 1 - 0.6 * done;
    L.lightBlob(c, h.x, h.y, 46, [255, 220, 150], 0.5 * hk);
    c.fillStyle = L.rgba([255, 240, 210], 0.95 * hk);
    const s = 13;
    c.beginPath();
    c.moveTo(h.x + ux * s, h.y + uy * s);
    c.lineTo(h.x - ux * s * 0.7 - uy * s * 0.75, h.y - uy * s * 0.7 + ux * s * 0.75);
    c.lineTo(h.x - ux * s * 0.25, h.y - uy * s * 0.25);
    c.lineTo(h.x - ux * s * 0.7 + uy * s * 0.75, h.y - uy * s * 0.7 - ux * s * 0.75);
    c.closePath(); c.fill();
  }
  // completion: a soft ring pulse round the globe
  if (done > 0 && done < 1) {
    c.strokeStyle = L.rgba([245, 225, 180], 0.35 * (1 - done));
    c.lineWidth = 2;
    c.beginPath(); c.arc(v.wx(EARTH.x), v.wy(EARTH.y), Math.max(0, R * (1.02 + 0.12 * L.ease.outCubic(done))), 0, TAU); c.stroke();
  }
  c.restore();
}

export default {
  beat: 2,
  chapter: { num: '02', title: 'One day', sub: 'One spin of the Earth' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: 0.15, name: 'swish', gain: 0.18, pitch: 0.9 },
      { t: 0.65, name: 'tick', gain: 0.12, pitch: 1.3 },
      { t: 2.0, name: 'shimmer', gain: 0.2, pitch: 1.1 },
    ];
  },
  drawWorld(ctx, v) {
    const t3 = v.tl.scenes[3].start;
    if (v.t < 0 || v.gt > t3 + 0.6) return;
    const k = 1 - L.ease.inCubic(L.prog(v.gt, t3 - 0.05, 0.55));
    drawRing(ctx, v, k);
  },
  drawOverlay(ctx, v) {
    L.bigLabel(ctx, { x: 72, y: 384, big: '1 DAY', small: 'one spin of the Earth', k: v.k * L.enter(v.t, 0.85, 0.45), accent: v.accent, size: 92 });
  },
};
