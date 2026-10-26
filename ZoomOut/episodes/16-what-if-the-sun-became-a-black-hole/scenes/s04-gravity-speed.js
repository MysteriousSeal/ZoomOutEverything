// Beat 4 — "Even changes in gravity | only travel at the speed of light."
// The same true-scale view (slight push). Gravity's "news" rides exactly on the last-light front: a packet of thin
// violet ripples just behind env's warm ring, breathing in on "changes in gravity". On "only travel at the speed of
// light" two racers meet on the Sun-Earth axis at the front, a warm photon and a violet ripple crest, neck and neck,
// with matched trails: the same speed. Label "Light speed" / "gravity's news travels no faster" replaces s03's.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, frontK, lightR, SUN } from '../env.js';
import { label2 } from './s00-hook.js';
import { axis, LABEL, sysK, T3 } from './s03-sunlight.js';

const { W, H } = L;
const TAU = Math.PI * 2;
const T4 = { rip: 16.3, race: 18.45, big: 18.5, small: 18.9 };

function drawRipples(c, v, k) {
  const R = lightR(v.gt);
  if (R <= 0) return;
  const rpx = v.ws(R);
  if (rpx > 6000 || rpx < 20) return;
  const cx = v.wx(SUN.x), cy = v.wy(SUN.y);
  const ku = L.ease.outCubic(L.prog(v.gt, T4.rip, 1.1));
  if (ku <= 0.003) return;
  const N = 3, gap = L.clamp(rpx * 0.04, 12, 26);   // a few clean, well-spaced crests (6 thin ones read as a glitchy stack)
  c.save();
  c.globalCompositeOperation = 'lighter';
  // the angular range on screen (the ring is large: draw only what is visible)
  const n = Math.min(360, Math.max(90, Math.round(rpx * 0.5)));
  for (let j = 0; j < N; j++) {
    const lag = j * 0.12;
    const kj = L.ease.outCubic(L.prog(v.gt, T4.rip + lag, 0.9)) * k;
    if (kj <= 0.003) continue;
    const rr = rpx - 3 - j * gap;
    if (rr <= 0) continue;
    const amp = 0;
    c.strokeStyle = L.rgba(L.mix(ACCENT, [255, 255, 255], j === 0 ? 0.45 : 0.1), (j === 0 ? 0.85 : 0.55) * Math.pow(1 - j / N, 1.2) * kj);
    c.lineWidth = j === 0 ? 2 : 1.3;
    c.beginPath();
    let pen = false;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const r = rr + amp * Math.sin(a * 24 + v.gt * 5 - j * 0.9);
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (x < -60 || x > W + 60 || y < -60 || y > H + 60) { pen = false; continue; }
      if (!pen) { c.moveTo(x, y); pen = true; } else c.lineTo(x, y);
    }
    c.stroke();
  }
  // a faint violet tint inside the packet
  const g = c.createRadialGradient(cx, cy, Math.max(0, rpx - N * gap - 10), cx, cy, rpx);
  g.addColorStop(0, L.rgba(ACCENT, 0));
  g.addColorStop(1, L.rgba(ACCENT, 0.10 * ku * k));
  c.fillStyle = g;
  c.beginPath(); c.arc(cx, cy, Math.max(0, rpx), 0, TAU); c.arc(cx, cy, Math.max(0, rpx - N * gap - 10), 0, TAU, true); c.fill();
  c.restore();
}

function drawRacers(c, v, k) {
  const kr = L.ease.outCubic(L.prog(v.gt, T4.race, 0.6)) * k;
  if (kr <= 0.003) return;
  const R = lightR(v.gt), rpx = v.ws(R);
  const A = axis(v);
  if (rpx > A.len + 10) return;
  const px = A.sx + A.ux * rpx, py = A.sy + A.uy * rpx;
  c.save();
  c.globalCompositeOperation = 'lighter';
  const SEP = 26;
  for (const [side, col] of [[-1, [255, 232, 190]], [1, ACCENT]]) {
    const ox = px + A.nx * side * SEP, oy = py + A.ny * side * SEP;
    const tl = 220 * kr;
    const g = c.createLinearGradient(ox - A.ux * tl, oy - A.uy * tl, ox, oy);
    g.addColorStop(0, L.rgba(col, 0));
    g.addColorStop(1, L.rgba(col, 0.85 * kr));
    c.strokeStyle = g;
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(ox - A.ux * tl, oy - A.uy * tl); c.lineTo(ox, oy); c.stroke();
    L.lightBlob(c, ox, oy, 26, col, 0.7 * kr);
    c.fillStyle = L.rgba(L.mix(col, [255, 255, 255], 0.6), kr);
    c.beginPath(); c.arc(ox, oy, Math.max(0, 5.2 * kr), 0, TAU); c.fill();
  }
  c.restore();
  // tiny tags beside the racers, on the outside of each lane, trailing just behind the heads
  const kt = L.clamp(L.prog(v.gt, T4.race + 0.2, 0.5)) * k;
  if (kt > 0.003) {
    c.save();
    c.globalAlpha *= kt;
    c.font = L.font(18, 600, L.FONT.body);
    c.textBaseline = 'middle';
    c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 8;
    for (const [side, col, word] of [[-1, [255, 226, 176], 'LIGHT'], [1, L.mix(ACCENT, [255, 255, 255], 0.3), 'GRAVITY']]) {
      const d = SEP + 22;
      const tx = px - A.ux * 70 + A.nx * side * d, ty = py - A.uy * 70 + A.ny * side * d;
      c.fillStyle = L.rgba(col, 0.95);
      L.trackedText(c, word, tx, ty, 3, A.nx * side > 0 ? 'left' : 'right');
    }
    c.restore();
  }
}

export default {
  beat: 4,
  chapter: { num: '04', title: 'Gravity too', sub: 'no faster than light' },
  layer: 3,
  cues() {
    const b = 16.037;
    return [
      { t: T4.rip - b, name: 'sonar', gain: 0.3, pitch: 0.7 },
      { t: 17.25 - b, name: 'sonar', gain: 0.18, pitch: 0.85 },
      { t: T4.race - b, name: 'swish', gain: 0.24, pitch: 1.1 },
      { t: T4.big - b + 0.05, name: 'ping', gain: 0.18, pitch: 1.2 },
    ];
  },
  drawWorld(c, v) {
    if (v.gt < 16.0 || v.gt > 21.2) return;
    const k = frontK(v.gt) * sysK(v.cam.mpp) * (1 - L.ease.inCubic(L.prog(v.gt, T3.end, 0.35)));
    if (k <= 0.003) return;
    drawRipples(c, v, k);
    drawRacers(c, v, k);
    // a soft dark plate under the big line: the ring and the ripples cross it here
    const kp = L.clamp(L.prog(v.gt, T4.big - 0.1, 0.5));
    if (kp > 0.003) {
      c.save();
      c.fillStyle = `rgba(3,5,12,${0.45 * kp})`;
      c.shadowColor = `rgba(3,5,12,${0.45 * kp})`;
      c.shadowBlur = 40;
      c.beginPath(); c.roundRect(LABEL.x - 24, LABEL.y - LABEL.size * 0.95, 500, LABEL.size * 1.25, 28); c.fill();
      c.restore();
    }
    label2(c, {
      x: LABEL.x, y: LABEL.y, big: 'Light speed', small: "gravity's news travels no faster",
      kb: L.prog(v.gt, T4.big, 0.6), ks: L.prog(v.gt, T4.small, 0.5), ko: 0, size: LABEL.size, accent: v.accent, backing: 0.5,
    });
  },
};
