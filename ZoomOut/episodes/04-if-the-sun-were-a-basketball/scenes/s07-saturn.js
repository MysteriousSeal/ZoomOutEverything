// Beat 7 — Saturn: a smaller grape, 247 m from the basketball Sun, out at the edge of the park.
// Same grammar as Mars and Jupiter (shared kit in s05-mars.js). In the magnifier: a ringed Saturn (back half of
// the rings behind the globe, front half over it) beside a dark red grape at the same scale.
import * as L from '../../../../engine/runtime/lib.js';
import { pos } from '../camera.js';
import { drawOrbit, drawBody, drawInset, stagger, shadeSphere, rimLight, grape, labelScrim } from './s05-mars.js';

const NAME = 'saturn';
const COL = [235, 205, 150];
const T_OPEN = 1.15;         // "a smaller grape"
const T_LABEL = 1.75;        // "two hundred and fifty meters out"
const INSET = [318, 760];
const R_IN = 150;

const TILT = -0.32, SQUASH = 0.3;
// ring bands in planet radii: [inner, outer, alpha, colour]
const RINGS = [
  [1.24, 1.52, 0.22, [170, 150, 120]],    // C ring (faint, dusky)
  [1.52, 1.95, 0.9, [228, 208, 165]],     // B ring (bright)
  [2.03, 2.27, 0.62, [210, 190, 150]],    // A ring (beyond the Cassini division)
];

function rings(ctx, x, y, r, half) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(TILT);
  ctx.scale(1, SQUASH);
  const a0 = half === 'back' ? Math.PI : 0, a1 = half === 'back' ? Math.PI * 2 : Math.PI;
  for (const [ri, ro, al, col] of RINGS) {
    ctx.strokeStyle = L.rgba(col, al);
    ctx.lineWidth = (ro - ri) * r;
    ctx.beginPath(); ctx.arc(0, 0, Math.max(0, ((ri + ro) / 2) * r), a0, a1); ctx.stroke();
  }
  // Encke gap + a few ringlet lines
  ctx.strokeStyle = 'rgba(20,18,16,0.5)';
  ctx.lineWidth = Math.max(0.8, r * 0.025);
  ctx.beginPath(); ctx.arc(0, 0, 2.18 * r, a0, a1); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,245,225,0.12)';
  ctx.lineWidth = 1;
  for (const f of [1.62, 1.74, 1.86]) { ctx.beginPath(); ctx.arc(0, 0, f * r, a0, a1); ctx.stroke(); }
  ctx.restore();
}

export function drawSaturn(ctx, x, y, r, la, t) {
  rings(ctx, x, y, r, 'back');
  ctx.save();
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.92, TILT, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#dcc596';
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  ctx.save();
  ctx.translate(x, y); ctx.rotate(TILT);
  const drift = Math.sin(t * 0.4) * r * 0.01;
  for (const [a, b, c] of [[-0.95, -0.7, 'rgba(170,150,120,0.55)'], [-0.42, -0.24, 'rgba(196,166,112,0.6)'], [0.08, 0.22, 'rgba(240,222,180,0.5)'], [0.34, 0.5, 'rgba(190,158,108,0.55)'], [0.68, 0.95, 'rgba(160,140,112,0.5)']]) {
    ctx.fillStyle = c;
    ctx.fillRect(-r, a * r + drift, 2 * r, (b - a) * r);
  }
  // the rings' thin shadow line across the globe
  ctx.fillStyle = 'rgba(20,15,10,0.45)';
  ctx.fillRect(-r, r * 0.3, 2 * r, r * 0.07);
  ctx.restore();
  shadeSphere(ctx, x, y, r, la, { night: 0.86, sheen: 0.13 });
  ctx.restore();
  rimLight(ctx, x, y, r * 0.96, la, [255, 230, 190], 0.35);
  rings(ctx, x, y, r, 'front');
}

const RED = { base: [110, 38, 62], dark: [36, 10, 24], light: [190, 90, 120], bloom: [[200, 205, 230], 0.13] };

export default {
  beat: 7,
  chapter: { num: '07', title: 'Saturn', sub: '2.0 cm · 247 m out' },
  captions: true,
  layer: 0,
  cues(d) {
    return [
      { t: 0.2, name: 'riser', gain: 0.14, pitch: 0.85 },
      { t: 0.75, name: 'ping', gain: 0.22, pitch: 0.85 },
      { t: T_OPEN, name: 'bloom', gain: 0.28, pitch: 0.85 },
      { t: T_LABEL, name: 'tick', gain: 0.24, pitch: 0.9 },
    ];
  },
  drawWorld(ctx, v) {
    drawOrbit(ctx, v, NAME, 0.15, 1.35);
    drawBody(ctx, v, NAME, COL, 0.6);
  },
  drawOverlay(ctx, v) {
    const p = pos(NAME);
    drawInset(ctx, v, {
      body: [v.wx(p.x), v.wy(p.y)], c: INSET, R: R_IN, tOpen: T_OPEN,
      tags: [['SATURN', -58, 80], ['GRAPE', 78, 80]],
      content(c, cx, cy, R, la, kc) {
        stagger(c, kc, 0, () => drawSaturn(c, cx - 58, cy - 14, 37, la, v.gt));
        stagger(c, kc, 1, () => grape(c, cx + 78, cy - 10, 34, 37, la, RED));
      },
    });
    const k = Math.min(v.k, L.prog(v.t, T_LABEL, 0.55));
    labelScrim(ctx, k);
    L.bigLabel(ctx, { x: 80, y: 480, big: '2.0 cm', small: '247 m · 810 ft from the Sun', k, accent: v.accent });
  },
};
