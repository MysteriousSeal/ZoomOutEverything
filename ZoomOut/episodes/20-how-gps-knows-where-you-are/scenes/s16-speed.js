// Beat 16 — "Their speed slows them by about seven. | So they gain thirty-eight every day."
// A velocity arrow draws itself along B's direction of travel (3.9 km/s, curving with the orbit). A cool "–7 µs" chip
// peels off the arrow on "seven", glides across to the tally and is absorbed: the count runs +45 → +38 and locks on
// "thirty-eight"; the line under it turns into "every day · net". The satellite clock's gold wedge shrinks with it.
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, SAT_INK, beatStart, heroAt } from '../env.js';
import { T, actK } from './s14-einstein.js';
import { drawTally } from './s15-gravity.js';

const TAU = Math.PI * 2;
const COOL = [150, 195, 255];

/** The arrow's geometry (screen px): start, control, tip, unit direction, normal pointing away from the Earth. */
function arrowGeo(v) {
  const b = heroAt(1, v.gt, v.tl);
  const bx = v.wx(b.x), by = v.wy(b.y);
  let dx = b.vx, dy = b.vy;
  // the normal that points away from the Earth's centre
  const ex = v.wx(0) - bx, ey = v.wy(R_EARTH) - by;
  let nx = -dy, ny = dx;
  if (nx * ex + ny * ey > 0) { nx = -nx; ny = -ny; }
  // a short arrow (≈ 125 px) riding just under B's track (toward the Earth), so it stays clear of the HUD band
  const L0 = 26, L1 = 150, OFF = 58;
  const ox = bx - nx * OFF, oy = by - ny * OFF;
  const s = { x: ox + dx * L0 + nx * 10, y: oy + dy * L0 + ny * 10 };
  const e = { x: ox + dx * L1 - nx * 18, y: oy + dy * L1 - ny * 18 };   // bends toward the Earth, like the orbit
  const m = { x: ox + dx * (L0 + L1) / 2 + nx * 4, y: oy + dy * (L0 + L1) / 2 + ny * 4 };
  return { b: { x: bx, y: by }, s, m, e, dx, dy, nx, ny };
}
const qpt = (g, u) => ({
  x: (1 - u) * (1 - u) * g.s.x + 2 * (1 - u) * u * g.m.x + u * u * g.e.x,
  y: (1 - u) * (1 - u) * g.s.y + 2 * (1 - u) * u * g.m.y + u * u * g.e.y,
});

function drawArrow(c, v, k, draw, tagK = 1) {
  if (k <= 0.002 || draw <= 0) return;
  const g = arrowGeo(v);
  const N = 24, n = Math.max(1, Math.round(N * draw));
  c.save();
  c.globalAlpha *= k;
  c.lineCap = 'round'; c.lineJoin = 'round';
  // glow pass + crisp pass
  for (const [lw, a] of [[10, 0.12], [3.2, 0.95]]) {
    c.strokeStyle = L.rgba(SAT_INK, a);
    c.lineWidth = lw;
    c.beginPath();
    for (let i = 0; i <= n; i++) { const p = qpt(g, (i / N)); if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); }
    c.stroke();
  }
  // head: a refined chevron that rides the drawing tip
  const u = n / N, p = qpt(g, u), q = qpt(g, Math.max(0, u - 0.05));
  const a = Math.atan2(p.y - q.y, p.x - q.x);
  c.fillStyle = L.rgba(SAT_INK, 0.95);
  c.save();
  c.translate(p.x, p.y); c.rotate(a);
  c.beginPath(); c.moveTo(10, 0); c.lineTo(-12, -10); c.lineTo(-7, 0); c.lineTo(-12, 10); c.closePath(); c.fill();
  c.restore();
  // speed tag, outside the curve
  const tk = L.clamp(draw * 2 - 1) * tagK;
  if (tk > 0) {
    const mid = qpt(g, 0.55);
    c.globalAlpha *= tk;
    c.font = L.font(26, 700, L.FONT.body);
    c.fillStyle = 'rgba(232,238,250,0.95)';
    c.shadowColor = 'rgba(0,0,0,0.75)'; c.shadowBlur = 8;
    c.textBaseline = 'middle';
    const ang = Math.atan2(g.dy, g.dx);
    c.save();
    c.translate(mid.x - g.nx * 34, mid.y - g.ny * 34);   // under the arrow (toward the Earth)
    c.rotate(Math.abs(ang) > Math.PI / 2 ? ang + Math.PI : ang);
    L.trackedText(c, '3.9 km/s', 0, 0, 2, 'center');
    c.restore();
  }
  c.restore();
}

/** The "–7 µs" chip: born on the arrow, flies to the tally on "seven", absorbed as the count starts. */
function drawChip(c, v) {
  const kk = T(v.tl), gt = v.gt;
  const born = L.ease.outBack(L.prog(gt, Math.max(kk.speed + 0.45, kk.seven - 0.4), 0.5));
  const fly = L.ease.inOutCubic(L.prog(gt, kk.seven + 0.15, 0.75));
  const gone = L.ease.inCubic(L.prog(gt, kk.so - 0.15, 0.3));
  if (born <= 0 || gone >= 1) return;
  const g = arrowGeo(v);
  const a = qpt(g, 0.55);
  const p0 = { x: a.x - g.nx * 112, y: a.y - g.ny * 112 + 70 };  // inside the curve, clear below the speed tag
  const p1 = { x: 610, y: 742 };                             // just right of the tally's number
  // a gentle arc for the flight
  const x = L.lerp(p0.x, p1.x, fly) - 90 * gone, y = L.lerp(p0.y, p1.y, fly) - Math.sin(Math.PI * fly) * 60;
  const pulse = gt > kk.seven - 0.1 ? Math.exp(-(gt - kk.seven + 0.1) * 4) : 0;
  const s = L.lerp(0.6, 1, L.clamp(born)) * (1 + 0.08 * pulse) * (1 - 0.35 * gone);
  c.save();
  c.globalAlpha *= L.clamp(born * 1.5) * (1 - gone);
  c.translate(x, y); c.scale(s, s);
  if (fly > 0 && fly < 1) L.lightBlob(c, 0, 0, 90, COOL, 0.25);
  c.font = L.font(50, 800, L.FONT.display);
  const txt = '–7 µs';
  const w = c.measureText(txt).width + 40;
  c.fillStyle = 'rgba(6,12,26,0.85)';
  L.roundRect(c, -w / 2, -34, w, 66, 33); c.fill();
  c.strokeStyle = L.rgba(COOL, 0.85); c.lineWidth = 2;
  L.roundRect(c, -w / 2, -34, w, 66, 33); c.stroke();
  c.fillStyle = L.rgba(L.mix(COOL, [255, 255, 255], 0.3 + 0.5 * pulse));
  c.textBaseline = 'middle';
  L.trackedText(c, txt, 0, 2, 0, 'center');
  c.restore();
  // absorbed: a cool flash where it lands
  const ab = L.prog(gt, kk.so - 0.15, 0.6);
  if (ab > 0 && ab < 1) L.lightBlob(c, p1.x - 40, p1.y - 20, 140 + 120 * ab, COOL, 0.45 * (1 - ab));
}

export default {
  beat: 16,
  chapter: { num: '16', title: 'Orbital speed', sub: 'special relativity' },
  captions: true,
  layer: 3,
  cues(d) {
    void d;
    // mirrors T(): "speed" ≈ 0.45 s, "seven" ≈ 1.77 s, "So" = 2.70 s, "thirty-eight" locks ≈ 3.92 s
    return [
      { t: 0.4, name: 'swish', gain: 0.3, pitch: 1.25 },         // the velocity arrow
      { t: 0.95, name: 'blip', gain: 0.2, pitch: 0.9 },          // –7 chip
      { t: 1.75, name: 'tick', gain: 0.2, pitch: 0.85 },         // "seven"
      { t: 1.95, name: 'whoosh', gain: 0.22, pitch: 1.4 },       // chip flies to the tally
      { t: 2.6, name: 'blip', gain: 0.22, pitch: 0.75 },         // absorbed
      { t: 2.65, name: 'count', gain: 0.14, pitch: 0.9 },
      { t: 3.9, name: 'impact', gain: 0.42, pitch: 1.0 },        // +38 µs
      { t: 3.92, name: 'ping', gain: 0.32, pitch: 0.95 },
    ];
  },
  drawWorld(ctx, v) {
    const kk = T(v.tl);
    if (v.gt < kk.b16 - 0.2) return;
    const k = actK(v);
    const draw = L.ease.inOutCubic(L.prog(v.gt, kk.speed - 0.1, 0.7));
    // the speed tag hands over to the "–7 µs" chip (≥ 1.5 s readable), keeping the text count down
    const tagK = 1 - L.ease.inCubic(L.prog(v.gt, Math.max(kk.speed + 1.6, kk.seven + 0.05), 0.35));
    drawArrow(ctx, v, k, draw, tagK);
  },
  drawOverlay(ctx, v) {
    if (v.gt >= beatStart(v.tl, 16)) drawTally(ctx, v);
    drawChip(ctx, v);
  },
};
void TAU;
