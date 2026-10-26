// Beat 8 (ep 21) — "And they've been here for over a hundred million years, | since the age of the dinosaurs."
// The camera dives from the globe to a 2.6 cm amber nugget lying on the soil at X.amber, back-lit by the low sun. A
// worker ant (ant.js, same anatomy as every ant in the film) is trapped inside with air bubbles and plant debris.
// Label "100+ MILLION YEARS" / "ANTS IN CRETACEOUS AMBER". On "the age of the dinosaurs" a titanosaur (a Cretaceous
// sauropod: horizontal back and tail, pillar legs, neck forward-up) appears as a soft ghost in the out-of-focus meadow.
import * as L from '../../../../engine/runtime/lib.js';
import { X, ACCENT, band } from '../env.js';
import { drawAnt } from '../ant.js';

const { W, ease, clamp, prog, lerp, rgba, mix } = L;
const NUG = { w: 0.026, h: 0.0168, ant: 0.0085 };   // a large worker (Cretaceous ants ran ~3–10 mm)
const T8 = { label: 2.25, sub: 2.45, dino: 3.3 };

// nugget outline (metres, relative to (X.amber, 0)); flat-ish base resting on the soil
const OUTLINE = (() => {
  const out = [], n = 72;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 1 + 0.07 * Math.sin(2 * a + 0.7) + 0.045 * Math.sin(3 * a + 2.1) + 0.025 * Math.sin(5 * a + 1.0);
    let x = Math.cos(a) * (NUG.w / 2) * r, y = -NUG.h * 0.5 + Math.sin(a) * (NUG.h / 2) * r;
    y = Math.min(y, 0.00025);
    out.push([x + 0.0004 * Math.sin(a * 3), y]);
  }
  return out;
})();
const BUBBLES = (() => { const r = L.rng(2181); return Array.from({ length: 14 }, () => [r() * 2 - 1, r() * 2 - 1, r()]); })();
const DEBRIS = (() => { const r = L.rng(2182); return Array.from({ length: 40 }, () => [r() * 2 - 1, r() * 2 - 1, r(), r()]); })();

function nuggetPath(ctx, v) {
  const x0 = X.amber;
  ctx.beginPath();
  OUTLINE.forEach(([x, y], i) => {
    const a = OUTLINE[i], b = OUTLINE[(i + 1) % OUTLINE.length];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    if (i === 0) ctx.moveTo(v.wx(x0 + mx), v.wy(my));
    else ctx.quadraticCurveTo(v.wx(x0 + a[0]), v.wy(a[1]), v.wx(x0 + mx), v.wy(my));
  });
  const a = OUTLINE[0], b = OUTLINE[1];
  ctx.quadraticCurveTo(v.wx(x0 + a[0]), v.wy(a[1]), v.wx(x0 + (a[0] + b[0]) / 2), v.wy((a[1] + b[1]) / 2));
  ctx.closePath();
}

function drawNugget(ctx, v) {
  const s = 1 / v.cam.mpp;
  const pxW = NUG.w * s;
  if (pxW < 1.5) return;
  const cx = v.wx(X.amber), gy = v.wy(0), cy = v.wy(-NUG.h * 0.5);
  if (cx + pxW < -50 || cx - pxW > W + 50 || gy < -400 || gy - NUG.h * s > L.H + 50) return;
  if (pxW < 6) {   // far away: an amber glint
    L.lightBlob(ctx, cx, cy, pxW * 3, [255, 180, 70], 0.6);
    return;
  }
  const hw = pxW / 2, hh = NUG.h * s / 2;
  // back-light: warm halo behind, and light focused through the amber onto the soil in front (caustic)
  L.lightBlob(ctx, cx + hw * 0.25, cy - hh * 0.2, pxW * 1.05, [255, 170, 60], 0.32);
  // contact shadow
  ctx.save();
  ctx.fillStyle = 'rgba(16,8,2,0.55)';
  ctx.beginPath(); ctx.ellipse(cx - hw * 0.1, gy + 2, hw * 1.02, Math.max(1, hh * 0.12), 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  L.lightBlob(ctx, cx - hw * 0.35, gy + hh * 0.08, hw * 0.75, [255, 150, 40], 0.4);
  // body
  ctx.save();
  nuggetPath(ctx, v);
  const g = ctx.createRadialGradient(cx + hw * 0.28, cy - hh * 0.25, hh * 0.1, cx, cy, hw * 1.15);
  g.addColorStop(0, 'rgba(255,214,120,0.97)');
  g.addColorStop(0.35, 'rgba(240,160,48,0.96)');
  g.addColorStop(0.75, 'rgba(184,92,16,0.96)');
  g.addColorStop(1, 'rgba(110,44,6,0.97)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // inside: debris specks, the trapped ant, bubbles (all softened, as seen through resin)
  const sx = (u) => cx + u * hw * 0.82, sy = (w) => cy + w * hh * 0.7;
  for (const [u, w, a, b] of DEBRIS) {
    ctx.fillStyle = rgba(b < 0.7 ? [90, 40, 8] : [255, 230, 170], 0.25 + 0.3 * a);
    const r = (0.6 + 2.2 * a) * s * 4e-5;
    ctx.beginPath(); ctx.ellipse(sx(u), sy(w), Math.max(0, r * 1.6), Math.max(0, r), u * 3, 0, Math.PI * 2); ctx.fill();
  }
  // the ant: preserved mid-stride, legs splayed, slightly tilted
  const al = NUG.ant * s;
  ctx.save();
  ctx.filter = `blur(${Math.max(0, al * 0.006).toFixed(2)}px)`;
  drawAnt(ctx, { x: cx + al * 0.02, y: cy + hh * 0.22, len: al, dir: -1, angle: 0.12, phase: 0.3, walk: 1, t: 1.7, col: [62, 28, 8], alpha: 0.92, detail: 0.85 });
  ctx.restore();
  // resin over the ant: tint it into the amber
  ctx.fillStyle = 'rgba(230,140,40,0.22)';
  ctx.fillRect(cx - hw * 1.2, cy - hh * 1.4, hw * 2.4, hh * 2.8);
  for (const [u, w, r0] of BUBBLES) {
    const bx = sx(u), by = sy(w), r = (0.8 + 3.2 * r0 * r0) * s * 5e-5;
    if (Math.hypot(bx - (cx + al * 0.02), by - (cy + hh * 0.22 - al * 0.2)) < al * 0.55) continue;   // not over the ant
    ctx.strokeStyle = 'rgba(255,240,200,0.55)'; ctx.lineWidth = Math.max(0.8, r * 0.25);
    ctx.beginPath(); ctx.arc(bx, by, Math.max(0, r), 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,250,230,0.8)';
    ctx.beginPath(); ctx.arc(bx - r * 0.35, by - r * 0.35, Math.max(0, r * 0.28), 0, Math.PI * 2); ctx.fill();
  }
  // internal fracture plane catching the light
  ctx.strokeStyle = 'rgba(255,236,180,0.25)'; ctx.lineWidth = Math.max(1, s * 6e-5);
  ctx.beginPath(); ctx.moveTo(sx(0.35), sy(-0.95)); ctx.quadraticCurveTo(sx(0.6), sy(-0.2), sx(0.95), sy(0.1)); ctx.stroke();
  // depth: darker resin toward the edges (thick inner rim)
  ctx.save();
  nuggetPath(ctx, v);
  ctx.strokeStyle = 'rgba(96,36,4,0.45)';
  ctx.lineWidth = hh * 0.5;
  ctx.filter = `blur(${(hh * 0.12).toFixed(1)}px)`;
  ctx.stroke();
  ctx.restore();
  // rim light (back-lit edge, upper right)
  ctx.save();
  nuggetPath(ctx, v);
  ctx.globalCompositeOperation = 'lighter';
  const rg = ctx.createLinearGradient(cx - hw, cy + hh, cx + hw, cy - hh);
  rg.addColorStop(0, 'rgba(255,200,110,0)'); rg.addColorStop(0.6, 'rgba(255,200,110,0.05)'); rg.addColorStop(1, 'rgba(255,226,160,0.75)');
  ctx.strokeStyle = rg; ctx.lineWidth = Math.max(2, hh * 0.06);
  ctx.stroke();
  ctx.restore();
  // surface specular: a soft window reflection and a sharp glint on the dome
  ctx.fillStyle = 'rgba(255,250,235,0.16)';
  ctx.beginPath(); ctx.ellipse(cx - hw * 0.35, cy - hh * 0.62, hw * 0.34, hh * 0.13, -0.18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,252,240,0.75)';
  ctx.beginPath(); ctx.ellipse(cx - hw * 0.5, cy - hh * 0.6, hw * 0.07, hh * 0.035, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ titanosaur ghost (side view, facing left)
// local units: x right, y DOWN, feet at y = 0, head-to-tail ≈ 1.2 wide. Horizontal back and tail (no tail drag),
// pillar legs (front slightly shorter), long neck carried forward and up, small head.
const DINO = [
  [1.0, -0.2], [0.8, -0.255], [0.6, -0.315], [0.46, -0.36], [0.32, -0.37], [0.2, -0.36], [0.1, -0.41],
  [0.0, -0.52], [-0.08, -0.62], [-0.12, -0.67], [-0.155, -0.69], [-0.2, -0.68], [-0.215, -0.66], [-0.19, -0.645],
  [-0.14, -0.635], [-0.07, -0.56], [0.02, -0.44], [0.08, -0.33], [0.1, -0.26],
  [0.105, -0.12], [0.1, 0], [0.175, 0], [0.175, -0.12], [0.185, -0.2],      // near front leg
  [0.26, -0.185], [0.34, -0.18], [0.395, -0.2],                              // belly
  [0.4, -0.12], [0.395, 0], [0.475, 0], [0.48, -0.12], [0.505, -0.24],       // near hind leg
  [0.6, -0.235], [0.8, -0.215], [1.0, -0.2],
];
function dinoPath(ctx, x, y, sc) {
  ctx.beginPath();
  const P = DINO.map(([a, b]) => [x + a * sc, y + b * sc]);
  ctx.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length - 1; i++) ctx.quadraticCurveTo(P[i][0], P[i][1], (P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2);
  ctx.lineTo(P[P.length - 1][0], P[P.length - 1][1]);
  ctx.closePath();
}
function drawDino(ctx, v, k) {
  if (k <= 0) return;
  const gy = v.wy(0);
  const sc = 820, par = (X.amber - v.cam.x) / v.cam.mpp * 0.04;   // far away: almost no parallax
  const x = 470 + par, y = gy - 30;
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.filter = 'blur(4px)';
  // far legs (a step behind, a touch lighter)
  ctx.fillStyle = 'rgba(52,62,44,0.5)';
  ctx.beginPath(); ctx.roundRect?.(x + 0.2 * sc, y - 0.2 * sc, 0.065 * sc, 0.2 * sc, 6); ctx.fill();
  ctx.beginPath(); ctx.roundRect?.(x + 0.52 * sc, y - 0.24 * sc, 0.07 * sc, 0.24 * sc, 6); ctx.fill();
  dinoPath(ctx, x, y, sc);
  const g = ctx.createLinearGradient(0, y - 0.7 * sc, 0, y);
  g.addColorStop(0, 'rgba(46,58,44,0.62)'); g.addColorStop(1, 'rgba(40,46,30,0.7)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

export default {
  beat: 8,
  chapter: { num: '07', title: 'Deep time', sub: 'Ants in amber, ~100 million years old' },
  layer: 8,
  cues(d) {
    return [
      { t: T8.label, name: 'bloom', gain: 0.3, pitch: 0.9 },
      { t: T8.dino, name: 'deep', gain: 0.35, pitch: 0.7 },
    ];
  },
  drawWorld(ctx, v) {
    const macro = 1 - band(v.cam.mpp, 1.5e-3, 6e-3);
    if (macro <= 0) return;
    // the dinosaur ghost belongs to this beat only (it fades as the camera leaves for the line-up)
    if (v.t > 0) {
      const kd = ease.inOutCubic(prog(v.t, T8.dino, 1.1)) * (1 - ease.inOutCubic(prog(v.t, v.d - 0.25, 0.45)));
      drawDino(ctx, v, kd * macro);
    }
    drawNugget(ctx, v);
  },
  drawOverlay(ctx, v) {
    const t = v.t, k = v.k;
    if (t < 0 || k <= 0) return;
    const a1 = ease.outCubic(prog(t, T8.label, 0.5)), a2 = ease.outCubic(prog(t, T8.sub, 0.5));
    if (a1 <= 0) return;
    // label card (opaque backing over the bright meadow)
    const big = '100+ MILLION YEARS', small = 'ANTS IN CRETACEOUS AMBER';
    ctx.save();
    ctx.globalAlpha *= k;
    const bs = L.fitSize(ctx, big, 820, 110, 800, L.FONT.display, 40);
    ctx.font = L.font(bs, 800, L.FONT.display);
    const bw = ctx.measureText(big).width;
    const cardW = Math.min(940, bw + 100), cardX = (W - cardW) / 2, top = 330, capH = bs * 0.72;
    const yBig = top + 44 + capH, ySmall = yBig + 54, cardH = ySmall - top + 36;
    ctx.save();
    ctx.globalAlpha *= a1;
    ctx.fillStyle = 'rgba(12,10,8,0.78)';
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 30;
    L.roundRect(ctx, cardX, top + (1 - a1) * 20, cardW, cardH, 18); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= a1;
    ctx.font = L.font(bs, 800, L.FONT.display);
    ctx.fillStyle = rgba(ACCENT);
    ctx.textBaseline = 'alphabetic';
    L.trackedText(ctx, big, W / 2, yBig + (1 - a1) * 24, 1, 'center');
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= a2;
    const ss = L.fitSize(ctx, small, cardW - 80 - 4 * small.length, 28, 600, L.FONT.body, 16);
    ctx.font = L.font(ss, 600, L.FONT.body);
    ctx.fillStyle = 'rgba(232,226,214,0.95)';
    L.trackedText(ctx, small, W / 2, ySmall + (1 - a2) * 14, 4, 'center');
    ctx.restore();
    ctx.restore();
  },
};
