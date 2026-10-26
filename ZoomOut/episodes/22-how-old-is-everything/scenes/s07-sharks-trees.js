// Beat 7 — Sharks are even older than trees. The two dates sit only ~100 px apart on the ruler, so they are
// stacked: the sea BELOW the ruler (a shark at −450 Ma swims in on "Sharks", hung from its ruler mark on a
// leader) and the land ABOVE it (Archaeopteris, the first true tree, at −385 Ma, grows up on "trees").
// Tags on the right make the two columns comparable; "450 > 385" lands the point: sharks came first.
// Both collapse to ruler landmarks during beat 8's zoom-out.
import * as L from '../../../../engine/runtime/lib.js';
import { AGE } from '../camera.js';
import { tx, rulerY, landmark, timelineK, ACCENT } from '../env.js';
import { GROUND, smoothPath, litShape, bigK, nearNow, label, tag, footing } from './s05-dinosaurs.js';

// ------------------------------------------------------------------ the shark (local px, centre origin, facing +x, ~320 px long)
const SHARK = [
  [152, -3, 1],                                                     // snout
  [134, -15], [104, -25], [66, -31],                               // head, back
  [40, -32], [14, -82, 1], [6, -52], [0, -34],                     // first dorsal fin (tall, swept, concave trailing edge)
  [-40, -26], [-64, -21], [-77, -37, 1], [-80, -19],               // second dorsal fin (small)
  [-112, -10],                                                      // caudal peduncle
  [-130, -20], [-172, -66, 1], [-152, -22], [-146, -6],            // tail: tall upper lobe (heterocercal) + notch
  [-164, 28, 1], [-128, 7],                                         // lower lobe
  [-108, 9], [-88, 14], [-98, 28, 1], [-80, 17],                   // anal fin
  [-44, 22], [-54, 38, 1], [-32, 25],                              // pelvic fin
  [0, 28], [56, 25], [100, 18], [132, 8],                          // belly, throat
];
const PECTORAL = [[66, 18], [86, 16], [44, 62, 1], [38, 52]];
const SHARK_TOP = [86, 116, 128], SHARK_BOT = [168, 186, 190];   // countershaded: darker back, pale belly

function sharkPts(gt) {
  return SHARK.map(([x, y, s]) => {
    const u = (152 - x) / 324;
    return [x, y + Math.sin(gt * 2.6 - u * 4.2) * 5 * u * u, s];
  });
}
export function drawShark(ctx, x, y, s, { gt = 0, alpha = 1 } = {}) {
  if (s <= 0 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(s, s);
  const off = 2.2 / Math.max(0.5, s);
  const pts = sharkPts(gt);
  litShape(ctx, () => smoothPath(ctx, pts), { top: [40, 62, 74], bot: [92, 112, 120], off, y0: -40, y1: 30 });
  // countershading: a pale belly band, clipped to the body
  ctx.save();
  smoothPath(ctx, pts); ctx.clip();
  const g = ctx.createLinearGradient(0, -6, 0, 30);
  g.addColorStop(0, 'rgba(170,190,198,0)'); g.addColorStop(0.45, 'rgba(170,190,198,0.32)'); g.addColorStop(1, 'rgba(170,190,198,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(-180, -6, 340, 40);
  // five gill slits
  ctx.strokeStyle = 'rgba(8,16,22,0.7)';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const gx = 96 - i * 6.5;
    ctx.beginPath(); ctx.moveTo(gx + 2, -12 + i * 0.6); ctx.quadraticCurveTo(gx - 2, 0, gx + 1, 13 - i * 0.5); ctx.stroke();
  }
  ctx.restore();
  // pectoral fin (near side), with a slow flex
  const fl = Math.sin(gt * 2.6) * 2;
  litShape(ctx, () => smoothPath(ctx, PECTORAL.map(([px, py, sh]) => [px, py + (py > 30 ? fl : 0), sh])), { top: [70, 92, 102], bot: [110, 130, 138], rimA: 0.6, off: off * 0.7, y0: 10, y1: 60 });
  ctx.restore();
}

// ------------------------------------------------------------------ Archaeopteris (local px, origin = trunk base, ~340 px tall)
const TREE_H = 340;
const BRANCHES = (() => {
  const r = L.rng(3850), out = [];
  const n = 13;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);                                     // 0 = lowest tier, 1 = top
    const h = L.lerp(118, TREE_H - 16, Math.pow(u, 0.92));
    const side = i % 2 ? 1 : -1;
    const len = L.lerp(118, 26, Math.pow(u, 0.85)) * (0.86 + r() * 0.22);
    out.push({ h, side, len, droop: 0.16 + r() * 0.1, ph: r() * 6.28, depth: r() });
    if (i % 3 === 1) out.push({ h: h + 9, side: -side, len: len * 0.55, droop: 0.1, ph: r() * 6.28, depth: 0.9, fore: true });
  }
  return out;
})();

function frond(ctx, b, grow, gt, shade) {
  const L0 = b.len * grow;
  if (L0 < 2) return;
  const sw = Math.sin(gt * 1.3 + b.ph) * 0.03;
  // rachis: a gentle curve out and down
  const ang = b.side > 0 ? -0.12 + b.droop + sw : Math.PI + 0.12 - b.droop - sw;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const p = (s) => [dx * s * L0, -b.h + dy * s * L0 + s * s * L0 * 0.12];
  ctx.strokeStyle = L.rgba(L.mix([70, 92, 78], [20, 30, 26], shade), 0.9);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 8; i++) { const [x, y] = p(i / 8); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
  // pinnate leaflets on both sides of the rachis, shorter toward the tip (a flattened, fern-like frond)
  const n = Math.max(3, Math.round(L0 / 6));
  for (let i = 1; i <= n; i++) {
    const s = i / (n + 0.6), [x, y] = p(s);
    const ll = (1 - s * 0.75) * Math.min(20, 7 + b.len * 0.12);
    for (const sd of [-1, 1]) {
      const a = ang + sd * 1.05 + (b.side > 0 ? 0.25 : -0.25);
      const ex = x + Math.cos(a) * ll, ey = y + Math.sin(a) * ll * 0.55 + ll * 0.25;
      ctx.fillStyle = L.rgba(L.mix(sd > 0 ? [108, 150, 112] : [84, 124, 96], [24, 38, 32], shade), 0.92);
      ctx.beginPath();
      ctx.ellipse((x + ex) / 2, (y + ey) / 2, Math.max(0.5, ll / 2), Math.max(0.5, ll * 0.17), Math.atan2(ey - y, ex - x), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawTree(ctx, x, gy, s, { gt = 0, grow = 1, alpha = 1 } = {}) {
  if (s <= 0 || alpha <= 0 || grow <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, gy);
  ctx.scale(s, s);
  const th = TREE_H * L.ease.outCubic(L.clamp(grow * 1.25));
  // back fronds (darker), trunk, front fronds
  const fr = (b) => L.ease.outCubic(L.clamp((th - b.h) / 60)) * L.ease.outCubic(L.clamp(grow * 1.4 - 0.2 - b.h / TREE_H * 0.4));
  for (const b of BRANCHES) if (!b.fore && b.depth < 0.5) frond(ctx, b, fr(b), gt, 0.45);
  // trunk: straight, woody, tapering, with a slight root flare
  litShape(ctx, () => smoothPath(ctx, [[-13, 0, 1], [-7, -6], [-6, -th * 0.5], [-1, -th, 1], [1, -th, 1], [6, -th * 0.5], [7, -6], [13, 0, 1]]),
    { top: [92, 78, 62], bot: [44, 34, 28], rim: [230, 214, 190], rimA: 0.7, off: 2, y0: -th, y1: 0 });
  for (const b of BRANCHES) if (b.fore || b.depth >= 0.5) frond(ctx, b, fr(b), gt, b.fore ? 0 : 0.12);
  ctx.restore();
}

const SHARK_IN = 0.15, TREE_IN = 1.15, CMP = 1.45;   // beat-local: "Sharks" · "trees" · the comparison
const SEA = [70, 150, 190];

export default {
  beat: 7,
  chapter: { num: '07', title: 'Sharks and trees', sub: 'the oldest of each' },
  layer: 7,
  cues(d) {
    return [
      { t: SHARK_IN + 0.3, name: 'bubbles', gain: 0.18, pitch: 1.0 },
      { t: TREE_IN, name: 'shimmer', gain: 0.2, pitch: 1.1 },
      { t: CMP, name: 'ping', gain: 0.32, pitch: 1.15 },
    ];
  },
  drawWorld(ctx, v) {
    const lk = timelineK(v);
    if (lk <= 0 || v.t < 0) return;
    const ry = rulerY(v), gy = ry - GROUND;
    const xs = tx(v, AGE.shark), xt = tx(v, AGE.tree);
    const big = bigK(v, 8, 1.1);
    const gt = v.gt;

    // ---- the shark: below the ruler (the sea), hung from its ruler mark
    if (xs > -400 && xs < L.W + 200) {
      const swim = L.ease.outCubic(L.prog(v.t, SHARK_IN, 1.3));
      const restX = xs + 82, sx = Math.max(restX, L.lerp(-260, restX, swim));
      const sy = ry + 178 + Math.sin(gt * 1.2) * 4;
      const nk = nearNow(v, xs, 24, 50);
      const a = lk * L.clamp(swim * 2) * nk;
      if (a > 0 && big > 0.01) {
        ctx.save();
        ctx.globalAlpha = a;
        // a dim water glow + caustic sway under the shark
        L.lightBlob(ctx, sx, sy, 260 * big, SEA, 0.12 * big);
        // leader from the ruler mark down to the shark's back
        const lkk = L.prog(v.t, 1.0, 0.5) * big;
        if (lkk > 0) {
          const yTop = ry + 8, yBot = sy - 24 * 0.85;
          ctx.strokeStyle = L.rgba(ACCENT, 0.7 * lkk);
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(xs, yTop); ctx.lineTo(xs, ry + 70); ctx.moveTo(xs, ry + 110); ctx.lineTo(xs, L.lerp(ry + 110, yBot, L.ease.outCubic(lkk))); ctx.stroke();
          ctx.fillStyle = L.rgba(ACCENT, lkk);
          ctx.beginPath(); ctx.arc(xs, ry, 5.5, 0, Math.PI * 2); ctx.fill();
        }
        drawShark(ctx, sx, sy, 0.85 * L.lerp(0.25, 1, big), { gt, alpha: L.clamp(big * 1.6 - 0.3) });
        const tk = L.ease.outCubic(L.prog(v.t, 0.8, 0.5)) * L.clamp(big * 2 - 1);
        tag(ctx, 'FIRST SHARKS', 470, ry + 170, tk, { align: 'left', size: 26, maxW: 420 });
        tag(ctx, '450 MILLION YEARS AGO', 470, ry + 204, tk, { align: 'left', size: 20, weight: 600, color: ACCENT, maxW: 420 });
        ctx.restore();
      }
      landmark(ctx, v, AGE.shark, { k: lk * (1 - big) * nearNow(v, xs, 50, 50), label: 'sharks', r: 5 });
    }

    // ---- Archaeopteris: above the ruler (the land)
    if (xt > -260 && xt < L.W + 200) {
      const grow = L.prog(v.t, TREE_IN, 0.95);
      const nk = nearNow(v, xt, 24, 50);
      const a = lk * L.clamp(grow * 4) * nk;
      if (a > 0 && big > 0.01) {
        ctx.save();
        ctx.globalAlpha = a;
        L.lightBlob(ctx, xt, gy - 180, 230 * big, [150, 210, 160], 0.07 * big);
        footing(ctx, xt, ry, 70 * big, big);
        drawTree(ctx, xt, gy, 1.0 * L.lerp(0.2, 1, big), { gt, grow, alpha: L.clamp(big * 1.6 - 0.3) });
        const tk = L.ease.outCubic(L.prog(v.t, TREE_IN + 0.35, 0.5)) * L.clamp(big * 2 - 1);
        tag(ctx, 'FIRST TREES', 470, ry - 250, tk, { align: 'left', size: 26, maxW: 420 });
        tag(ctx, '385 MILLION YEARS AGO', 470, ry - 216, tk, { align: 'left', size: 20, weight: 600, color: ACCENT, maxW: 420 });
        ctx.restore();
      }
      landmark(ctx, v, AGE.tree, { k: lk * (1 - big) * nearNow(v, xt, 50, 50) * L.clamp(grow * 4), r: 5 });
    }
  },
  drawOverlay(ctx, v) {
    label(ctx, v, '450 > 385', 'million years · sharks came first', v.k * L.ease.outCubic(L.prog(v.t, CMP, 0.45)));
  },
};
