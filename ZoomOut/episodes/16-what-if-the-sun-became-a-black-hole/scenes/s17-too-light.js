// Beat 17 — "It's far too light. | It would need to be about twenty times heavier."
// The camera pulls out: the Sun shrinks to r ≈ 50 px at the upper-left. Phrase 1: a mass gauge draws up the left
// edge with ONE Sun token at its foot and an empty dashed mark at the top (the gap = "far too light").
// Phrase 2: a ~20-solar-mass blue-white star ignites at STAR20 (true size, R_STAR20) while the gauge fills with
// twenty Sun tokens; "≈ 20×" lands on "twenty". The big star leaves as the camera pulls out in beat 18.
import * as L from '../../../../engine/runtime/lib.js';
import { STAR20, R_STAR20, SUN } from '../camera.js';
import { T } from '../env.js';
import { drawSunDetail, surface } from './s16-twist.js';

const { W, H } = L;
const TAU = Math.PI * 2;
const BLUE = [196, 214, 255];

const start = (v, b) => v.tl.scenes[b].start;

// star visibility (global time): ignites at +1.85 s, leaves early in beat 18
function starIn(v) { return L.ease.outCubic(L.prog(v.gt, start(v, 17) + 1.85, 0.45)); }
function starOut(v) { return L.ease.inCubic(L.prog(v.gt, start(v, 18) - 0.15, 1.15)); }
/** The gauge and label exit together with the star (slower than the house overlay fade). */
function exitK(v) { return 1 - L.ease.inCubic(L.prog(v.gt, start(v, 18) - 0.15, 0.9)); }
function starK(v) { return starIn(v) * (1 - starOut(v)); }

function drawStar20(c, v) {
  const k = starK(v);
  if (k <= 0.005) return;
  const cx = v.wx(STAR20.x), cy = v.wy(STAR20.y);
  const ig = L.prog(v.gt, start(v, 17) + 1.85, 0.9);
  const out = starOut(v);
  const r = Math.max(2, v.ws(R_STAR20) * (0.92 + 0.08 * L.ease.outBack(ig, 1.4)) * (1 - 0.5 * L.ease.inOutCubic(out)));
  if (cx + r * 4 < 0 || cx - r * 4 > W || cy + r * 4 < 0 || cy - r * 4 > H) return;
  c.save();
  // halo (additive)
  L.lightBlob(c, cx, cy, r * 3.2, [150, 180, 255], 0.32 * k);
  L.lightBlob(c, cx, cy, r * 1.55, [210, 225, 255], 0.5 * k);
  // ignition flash
  const fl = Math.sin(Math.PI * L.clamp(ig * 1.4)) * k;
  if (fl > 0.01) L.lightBlob(c, cx, cy, r * 2.6, [240, 246, 255], 0.7 * fl);
  // disc: on the exit it dims toward black (a receding star), only losing opacity at the very end
  c.globalAlpha = starIn(v) * (1 - out * out * out);
  const g = c.createRadialGradient(cx - r * 0.25, cy - r * 0.25, 0, cx, cy, r);
  g.addColorStop(0, 'rgb(250,252,255)');
  g.addColorStop(0.55, L.rgba([222, 232, 255]));
  g.addColorStop(1, L.rgba([120, 150, 230]));
  c.fillStyle = g;
  c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.fill();
  if (out > 0) {
    c.fillStyle = `rgba(10,18,62,${0.88 * out})`;   // dims through deep blue, never grey
    c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.fill();
  }
  c.globalAlpha = 1;
  // fine, even granulation (small cells, faint dark lanes)
  const sk = out > 0 ? k * k : k;
  surface(c, cx, cy, r, { col: BLUE, dark: [90, 120, 200], gt: v.gt, seed: 20, n: 230, cell: 0.045, mottle: 0.3, darkK: 0.2, spin: 0.015, limb: 0.8, alpha: sk });
  // crisp rim
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = L.rgba([220, 232, 255], 0.3 * k);
  c.lineWidth = 2;
  c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.stroke();
  c.restore();
}

// ------------------------------------------------------------------ the mass gauge (screen space)
const GX = 150, GY0 = 1222, GY1 = 702, N = 20;
const step = (GY0 - GY1) / (N - 0.0);
function token(c, x, y, r, a, hot = 0) {
  if (a <= 0.01 || r <= 0) return;
  L.lightBlob(c, x, y, r * 2.6, [255, 200, 120], 0.35 * a + 0.4 * hot);
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  g.addColorStop(0, L.rgba([255, 250, 230], a));
  g.addColorStop(0.7, L.rgba([255, 214, 150], a));
  g.addColorStop(1, L.rgba([220, 140, 70], a));
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.fill();
}
function drawGauge(c, v, k) {
  const t = v.t;
  const rail = L.ease.inOutCubic(L.prog(t, 0.75, 0.8)) * k;
  if (rail <= 0.005) return;
  c.save();
  // rail
  const yTop = L.lerp(GY0, GY1 - 18, rail);
  c.strokeStyle = `rgba(225,220,240,${0.35 * k})`;
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(GX - 30, GY0 + 22); c.lineTo(GX - 30, yTop); c.stroke();
  for (let i = 0; i <= N; i += 5) {
    const y = GY0 + step * 0.5 - i * step;
    if (y < yTop) break;
    c.beginPath(); c.moveTo(GX - 30, y); c.lineTo(GX - 38, y); c.stroke();
  }
  // the needed mark at the top: a dashed accent line, pulsing softly until filled
  const need = L.ease.outCubic(L.prog(t, 1.25, 0.5)) * k;
  const fillT = 2.25;            // tokens 2..20 arrive from here
  const filled = L.prog(t, fillT + 0.05 * (N - 1), 0.25);
  if (need > 0.01) {
    const y = GY1 - 18;
    c.setLineDash([6, 7]);
    c.strokeStyle = L.rgba(v.accent, need * (0.55 + 0.25 * Math.sin(t * 5) * (1 - filled)) + 0.3 * filled * need);
    c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(GX - 42, y); c.lineTo(GX + L.lerp(30, 40, filled), y); c.stroke();
    c.setLineDash([]);
  }
  // token #1 is the Sun's own mass: it leaves the Sun disc and drops to the foot of the gauge, with a fading trail
  const sx = v.wx(SUN.x), sy = v.wy(SUN.y);
  const FL0 = 0.85, FLD = 0.6;
  const fp = L.prog(t, FL0, FLD), fe = L.ease.inOutCubic(fp);
  const qx = GX - 60, qy = sy + 0.55 * (GY0 - sy);          // bezier control: a soft swing down the left edge
  const bez = (u) => {
    const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), d = u * u;
    return [a * sx + b * qx + d * GX, a * sy + b * qy + d * GY0];
  };
  const trailK = k * (fp > 0 ? 1 : 0) * (1 - L.prog(t, FL0 + FLD + 0.1, 0.6));
  if (trailK > 0.01) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round';
    const n = 28, u0 = Math.max(0, fe - 0.45);
    for (let j = 0; j < n; j++) {
      const ua = u0 + ((fe - u0) * j) / n, ub = u0 + ((fe - u0) * (j + 1)) / n;
      const [x1, y1] = bez(ua), [x2, y2] = bez(ub);
      c.strokeStyle = L.rgba([255, 200, 130], 0.45 * trailK * ((j + 1) / n));
      c.lineWidth = 1 + 2.5 * ((j + 1) / n);
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    }
    c.restore();
  }
  // tokens: #1 (the Sun) flies in, 2..20 stack up on "twenty times heavier"
  c.globalCompositeOperation = 'source-over';
  if (fp > 0 && fp < 1) {
    const [x, y] = bez(fe);
    token(c, x, y, 11 * L.ease.outCubic(L.clamp(fp * 3)), k, 0.3);
  }
  for (let i = 0; i < N; i++) {
    if (i === 0 && fp < 1) continue;
    const t0 = i === 0 ? FL0 + FLD - 0.05 : fillT + 0.05 * (i - 1);
    const e = L.prog(t, t0, 0.35);
    if (e <= 0) continue;
    const y = GY0 - i * step - (i ? (1 - L.ease.outCubic(e)) * 26 : 0);
    const r = i ? 11 * L.ease.outBack(e, 2.2) : 11 * (1 + 0.25 * Math.sin(Math.PI * e));
    const hot = Math.max(0, 1 - Math.abs(t - (t0 + 0.12)) / 0.3) * 0.5;
    token(c, GX, y, r, i ? k * L.clamp(e * 2) : k, hot);
  }
  // tiny keys: what a token is, what the mark is
  const tag = (txt, x, y, a, al = 'left') => {
    if (a <= 0.01) return;
    c.save();
    c.globalAlpha = a;
    c.font = L.font(20, 700, L.FONT.body);
    c.fillStyle = 'rgba(215,222,238,0.9)';
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 6;
    L.trackedText(c, txt, x, y, 3, al);
    c.restore();
  };
  tag('1 SUN', GX + 26, GY0 + 7, k * L.enter(t, FL0 + FLD, 0.4));
  tag('NEEDED', GX - 42, GY1 - 38, need);
  // the needed mark points at the star that has that mass
  const lk = L.prog(t, 3.3, 0.55) * k * starIn(v);
  if (lk > 0.01) {
    const cx = v.wx(STAR20.x), cy = v.wy(STAR20.y), rr = v.ws(R_STAR20);
    const x1 = GX + 46, y1 = GY1 - 18;
    const dx = cx - x1, dy = cy - y1, dl = Math.hypot(dx, dy) || 1;
    const gap = rr * 1.06 + 8;
    if (dl > gap + 30) L.leader(c, x1, y1, cx - (dx / dl) * gap, cy - (dy / dl) * gap, lk, v.accent, 0.7);
  }
  c.restore();
}

export default {
  beat: 17,
  chapter: { num: '17', title: 'Too light', sub: 'a black hole needs a far bigger star' },
  captions: true,
  layer: 2,
  cues() {
    // beat starts 74.78: P1 0.15–1.30, P2 1.90–4.16, "twenty" ≈ rel 2.95
    return [
      { t: 0.8, name: 'tick', gain: 0.22, pitch: 0.9 },        // the gauge draws, one Sun token
      { t: 1.3, name: 'blip', gain: 0.18, pitch: 0.8 },        // the empty mark at the top
      { t: 1.85, name: 'bloom', gain: 0.4, pitch: 1.3 },       // the 20-solar-mass star ignites
      { t: 2.25, name: 'count', gain: 0.3, pitch: 1.0 },       // tokens stack up
      { t: 3.2, name: 'ping', gain: 0.28, pitch: 1.2 },        // the stack hits the mark
      { t: 3.0, name: 'impact', gain: 0.3, pitch: 1.0 },       // "≈ 20×"
    ];
  },
  drawWorld(c, v) {
    if (v.gt < T.restore) return;
    // the restored Sun stays alive (s16 draws it until this beat starts, so the detail is never doubled)
    if (v.gt >= start(v, 17)) drawSunDetail(c, v);
    drawStar20(c, v);
    // gauge + label are screen-space, drawn here (not in drawOverlay) so they can leave with the star over 0.8 s
    // instead of the 0.35 s overlay fade
    if (v.gt < start(v, 17) || v.gt > start(v, 18) + 1.0) return;
    const k = L.ease.outCubic(L.prog(v.t, 0, 0.45)) * exitK(v);
    if (k <= 0.001) return;
    drawGauge(c, v, k);
    // the label belongs to the big star: centred over its rim; lands on "twenty" and holds ~2 s
    const lk = L.enter(v.t, 2.65, 0.5) * k;
    const lx = L.clamp(v.wx(STAR20.x), 470, 700);
    L.bigLabel(c, { x: lx, y: 520, big: '≈ 20×', small: 'the mass you would need', k: lk, accent: v.accent, size: 104, align: 'center' });
  },
};
