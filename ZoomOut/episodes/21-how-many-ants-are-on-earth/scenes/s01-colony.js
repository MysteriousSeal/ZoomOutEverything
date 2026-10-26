// Beat 1 — one colony under a stone. A real flat limestone slab (≈ 12 cm, crustose lichen on top, embedded ≈ 9 mm,
// casting a soft shadow to the left: the sun is upper right) at X.stone, and under it a CROSS-SECTION of a Lasius-type
// nest: a brood chamber right under the warm stone (eggs, larvae, silk cocoons), deeper galleries to ≈ 14 cm, joined
// by ≈ 5 mm tunnels with organic, uneven walls.
//   The void network (chambers + tunnels, soft inner shadows, back-wall texture, out-of-plane bores) is BAKED once into
//   an offscreen bitmap in world space (deterministic; plus a small mip for the far LOD), then drawn with the camera
//   transform each frame. The stone, brood and every ant are drawn live.
//   Workers (drawAnt, 4.2–4.9 mm) stand on chamber floors in two depth rows (back row first and dimmer; the brood sits
//   between the rows), and walk the tunnels on conveyor slots (same speed per tunnel → never overlapping; they fade only
//   where a tunnel opens into a chamber or turns out of the section plane). A guard waits in the entrance at the stone's
//   left edge, where the hero ant (s00) stops. LOD: full drawAnt ≥ 7 px, silhouettes, dots, then the bitmap only.
import * as L from '../../../../engine/runtime/lib.js';
import { drawAnt, gaitPhase } from '../ant.js';
import { X } from '../env.js';
import { labelScrim } from './s00-hook.js';

const { W, H } = L;
const SX = X.stone;   // 0.14
// ------------------------------------------------------------------ geometry (metres; y down = depth)
const STONE = [
  [0.0805, 0.002], [0.0812, -0.007], [0.0852, -0.0145], [0.094, -0.0192], [0.112, -0.0212], [0.135, -0.0226],
  [0.158, -0.0222], [0.176, -0.0205], [0.19, -0.0168], [0.1975, -0.0095], [0.2008, -0.001], [0.1995, 0.0055],
  [0.186, 0.0088], [0.16, 0.0096], [0.13, 0.0094], [0.104, 0.009], [0.088, 0.0075],
];
// chambers: centre x, y, half-width a, full height h (ceiling 0.6 h above y, floor 0.4 h below; flat-ish floor)
const CH = [
  { x: SX + 0.001, y: 0.0158, a: 0.05, h: 0.0122 },   // brood chamber right under the stone
  { x: 0.108, y: 0.0475, a: 0.027, h: 0.0108 },
  { x: 0.17, y: 0.0545, a: 0.025, h: 0.0106 },
  { x: 0.13, y: 0.0825, a: 0.033, h: 0.0112 },
  { x: 0.168, y: 0.1065, a: 0.023, h: 0.0102 },
  { x: 0.105, y: 0.1125, a: 0.021, h: 0.0100 },
  { x: 0.138, y: 0.1335, a: 0.024, h: 0.0100 },
  { x: 0.05, y: 0.03, a: 0.024, h: 0.0105 },          // the nest spreads out under the bare soil to the left
  { x: 0.035, y: 0.068, a: 0.026, h: 0.0105 },
  { x: 0.064, y: 0.0955, a: 0.021, h: 0.0102 },
  { x: 0.03, y: 0.125, a: 0.02, h: 0.0098 },
];
const ceilY = (c, x) => { const u = L.clamp((x - c.x) / c.a, -1, 1); return c.y - 0.6 * c.h * Math.pow(1 - u * u, 0.6); };
const floorY = (c, x) => { const u = L.clamp((x - c.x) / c.a, -1, 1); return c.y + 0.4 * c.h * Math.sqrt(Math.max(0, 1 - u ** 8)); };
const TR = 0.0026;   // tunnel bore radius (≈ 5 mm across)
const TUN = [
  { p: [[0.0786, -0.0006], [0.084, 0.005], [0.091, 0.012], [0.0965, 0.0175]], ants: 0, guard: true },   // entrance (left)
  { p: [[0.2012, -0.0006], [0.199, 0.008], [0.193, 0.0145], [0.187, 0.019]], ants: -1 },                // entrance (right)
  { p: [[0.108, 0.022], [0.104, 0.031], [0.106, 0.038], [0.108, 0.0425]], ants: 1 },
  { p: [[0.168, 0.022], [0.176, 0.034], [0.173, 0.043], [0.17, 0.048]], ants: -1 },
  { p: [[0.116, 0.052], [0.121, 0.062], [0.124, 0.07], [0.126, 0.0765]], ants: 1 },
  { p: [[0.162, 0.059], [0.153, 0.068], [0.147, 0.074], [0.143, 0.0775]], ants: -1 },
  { p: [[0.152, 0.087], [0.159, 0.094], [0.163, 0.099], [0.165, 0.1015]], ants: 1 },
  { p: [[0.11, 0.087], [0.106, 0.096], [0.105, 0.103], [0.105, 0.107]], ants: -1 },
  { p: [[0.112, 0.1165], [0.12, 0.124], [0.127, 0.128], [0.132, 0.1295]], ants: 1 },
  { p: [[0.162, 0.111], [0.156, 0.12], [0.15, 0.127], [0.146, 0.1295]], ants: -1 },
  { p: [[0.083, 0.049], [0.072, 0.057], [0.063, 0.066], [0.058, 0.0695]], ants: 1 },
  { p: [[0.0835, 0.0065], [0.078, 0.016], [0.072, 0.025], [0.068, 0.0305]], ants: 1 },
  { p: [[0.04, 0.0355], [0.036, 0.048], [0.034, 0.058], [0.035, 0.0635]], ants: -1 },
  { p: [[0.048, 0.0735], [0.055, 0.082], [0.06, 0.09], [0.062, 0.0925]], ants: 1 },
  { p: [[0.0835, 0.0975], [0.087, 0.102], [0.09, 0.1075]], ants: -1 },
  { p: [[0.055, 0.1], [0.045, 0.11], [0.038, 0.118], [0.035, 0.1215]], ants: 1 },
  { p: [[0.0125, 0.1265], [0.006, 0.132], [0.002, 0.137]], ants: -1, out: true },
  { p: [[0.0105, 0.0685], [0.005, 0.072], [0.0, 0.078]], ants: 1, out: true },
  { p: [[0.19, 0.1065], [0.1955, 0.114], [0.1975, 0.121]], ants: -1, out: true },
  { p: [[0.135, 0.1375], [0.132, 0.1405], [0.129, 0.1425]], ants: 0, out: true },
];
for (const t of TUN) {   // smooth centre line (quadratic through midpoints) → arclength table
  const p = t.p, pts = [p[0]];
  const q = (a, b, c, s) => [(1 - s) ** 2 * a[0] + 2 * (1 - s) * s * b[0] + s * s * c[0], (1 - s) ** 2 * a[1] + 2 * (1 - s) * s * b[1] + s * s * c[1]];
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  for (let i = 1; i < p.length - 1; i++) {
    const a = i === 1 ? p[0] : mid(p[i - 1], p[i]), c = i === p.length - 2 ? p[p.length - 1] : mid(p[i], p[i + 1]);
    for (let s = 1; s <= 12; s++) pts.push(q(a, p[i], c, s / 12));
  }
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  t.pts = pts; t.acc = acc; t.len = acc[acc.length - 1];
}
function along(t, s) {
  s = L.clamp(s, 0, t.len);
  let i = 1;
  while (i < t.acc.length - 1 && t.acc[i] < s) i++;
  const a = t.pts[i - 1], b = t.pts[i], k = (s - t.acc[i - 1]) / Math.max(1e-9, t.acc[i] - t.acc[i - 1]);
  return { x: L.lerp(a[0], b[0], k), y: L.lerp(a[1], b[1], k), tx: b[0] - a[0], ty: b[1] - a[1] };
}
/** pose for an ant heading along screen direction (tx, ty), feet on the lower wall: {dir, angle, fx, fy = feet normal} */
function orient(tx, ty) {
  const n = Math.hypot(tx, ty) || 1;
  tx /= n; ty /= n;
  const a = tx >= 0 ? Math.atan2(ty, tx) : Math.atan2(-ty, -tx);
  return { dir: tx >= 0 ? 1 : -1, angle: a, fx: -Math.sin(a), fy: Math.cos(a) };
}

// ------------------------------------------------------------------ brood + floor workers (static layout, seeded)
const BROOD = [];
const FLOOR = [];
(() => {
  const r = L.rng(2111);
  const put = (ci, k, x0, x1, n, s0, s1) => {
    const c = CH[ci];
    for (let i = 0; i < n; i++) {
      const x = L.lerp(x0, x1, (i + 0.5) / n) + (r() - 0.5) * ((x1 - x0) / n) * 0.5;
      BROOD.push({ ci, k, x, s: L.lerp(s0, s1, r()), r: (r() - 0.5), tone: r(), lift: 0 });
    }
  };
  const c0 = CH[0], c2 = CH[2], c3 = CH[3];
  put(0, 'egg', c0.x - 0.034, c0.x - 0.02, 22, 0.0005, 0.00068);
  put(0, 'larva', c0.x - 0.016, c0.x + 0.004, 10, 0.0016, 0.003);
  put(0, 'pupa', c0.x + 0.009, c0.x + 0.036, 7, 0.0036, 0.0042);
  put(2, 'larva', c2.x - 0.011, c2.x + 0.009, 8, 0.0014, 0.0028);
  put(3, 'pupa', c3.x - 0.018, c3.x + 0.016, 8, 0.0035, 0.0042);
  // eggs and small larvae heap up (2nd and 3rd layers, narrower)
  for (const b of BROOD.slice()) {
    if (b.k === 'egg') { BROOD.push({ ...b, x: b.x + (r() - 0.5) * 0.001, lift: 1, tone: r() }); if (r() < 0.5) BROOD.push({ ...b, x: b.x + (r() - 0.5) * 0.0008, lift: 2, tone: r() }); }
    if (b.k === 'larva' && r() < 0.4) BROOD.push({ ...b, x: b.x + (r() - 0.5) * 0.002, lift: 1, tone: r(), r: r() - 0.5 });
  }
  BROOD.sort((a, b) => a.lift - b.lift);
  const span = (ci) => {
    const xs = BROOD.filter((b) => b.ci === ci).map((b) => b.x);
    return xs.length ? [Math.min(...xs), Math.max(...xs)] : null;
  };
  CH.forEach((c, ci) => {
    const sp = span(ci);
    // 2 depth rows on the floor (row 0 = far, dimmer; the brood lies between the rows)
    for (let row = 0; row < 2; row++) {
      let x = c.x - c.a * 0.86 + r() * 0.003;
      while (x < c.x + c.a * 0.86) {
        const len = L.lerp(0.0042, 0.0049, r());
        const amp = r() < 0.35 ? L.lerp(0.0004, 0.001, r()) : 0;
        const cx = x + len * 0.55 + amp;
        const empty = r() < (row ? 0.3 : 0.22);
        if (!empty && cx + len * 0.55 + amp < c.x + c.a * 0.88) {
          let dir = r() < 0.5 ? 1 : -1;
          if (sp && r() < 0.75) dir = cx < (sp[0] + sp[1]) / 2 ? 1 : -1;   // nurses face the brood
          FLOOR.push({ ci, row: row ? 3 : 1, x: cx, dir, len, amp, f: L.lerp(0.18, 0.45, r()), ph: r() * 6.28, seed: r() * 10 });
        }
        x += len * (row ? 1.5 : 1.25) + 2 * amp + r() * 0.0015;
      }
    }
    // a few workers cling upside down to the ceiling
    let x = c.x - c.a * 0.55 + r() * 0.006;
    while (x < c.x + c.a * 0.55) {
      const len = L.lerp(0.0042, 0.0048, r());
      if (r() < 0.55) FLOOR.push({ ci, row: -1, x: x + len * 0.55, dir: r() < 0.5 ? 1 : -1, len, amp: 0, f: 0, ph: 0, seed: r() * 10 });
      x += len * 1.6 + r() * 0.004;
    }
  });
})();
const ANT_COL = [30, 19, 13];
const WALL = { lit: [150, 112, 76], mid: [118, 86, 56] };

// ------------------------------------------------------------------ the baked void network (world-space bitmap)
const BX0 = -0.006, BY0 = -0.004, BX1 = 0.212, BY1 = 0.15, PXM = 9000;   // px per metre in the bake
let BAKE = null;
function voidShapes(c, fill) {
  // chambers: noisy ceiling + floor polygons
  CH.forEach((ch, i) => {
    c.beginPath();
    const n = 40;
    for (let k = 0; k <= n; k++) {
      const x = ch.x - ch.a + (2 * ch.a * k) / n;
      const y = ceilY(ch, x) - 0.0008 * (L.noise1(x * 260, 11 + i) - 0.5) * Math.sin(Math.PI * k / n);
      k ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    for (let k = n; k >= 0; k--) {
      const x = ch.x - ch.a + (2 * ch.a * k) / n;
      c.lineTo(x, floorY(ch, x) + 0.0003 * (L.noise1(x * 400, 31 + i) - 0.5));
    }
    c.closePath();
    fill();
  });
  // tunnels: offset polygons with an uneven bore + round caps
  TUN.forEach((t, ti) => {
    const P = t.pts, left = [], right = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
      const o = orient(b[0] - a[0], b[1] - a[1]);
      const nx = -Math.sin(Math.atan2(b[1] - a[1], b[0] - a[0])), ny = Math.cos(Math.atan2(b[1] - a[1], b[0] - a[0]));
      const r = TR * (1 + 0.16 * (L.noise1(t.acc[i] * 700, 50 + ti) - 0.5) * 2);
      left.push([P[i][0] + nx * r, P[i][1] + ny * r]);
      right.push([P[i][0] - nx * r, P[i][1] - ny * r]);
      void o;
    }
    c.beginPath();
    left.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    for (let i = right.length - 1; i >= 0; i--) c.lineTo(...right[i]);
    c.closePath();
    fill();
    for (const e of [P[0], P[P.length - 1]]) { c.beginPath(); c.arc(e[0], e[1], TR * 0.98, 0, Math.PI * 2); fill(); }
  });
}
function bake() {
  const w = Math.ceil((BX1 - BX0) * PXM), h = Math.ceil((BY1 - BY0) * PXM);
  const mk = () => { const cv = new OffscreenCanvas(w, h); const c = cv.getContext('2d'); c.setTransform(PXM, 0, 0, PXM, -BX0 * PXM, -BY0 * PXM); return [cv, c]; };
  const [mask, mc] = mk();
  mc.fillStyle = '#fff';
  voidShapes(mc, () => mc.fill());
  // the void interior: the lit back wall, warm, with a fine grain texture
  const [vd, vc] = mk();
  const g = vc.createLinearGradient(0, 0, 0, BY1);
  g.addColorStop(0, L.rgba(WALL.lit)); g.addColorStop(1, L.rgba(L.mix(WALL.lit, WALL.mid, 0.8)));
  vc.fillStyle = g; vc.fillRect(BX0, BY0, BX1 - BX0, BY1 - BY0);
  const r = L.rng(2115);
  for (let i = 0; i < 9000; i++) {
    const x = L.lerp(BX0, BX1, r()), y = L.lerp(0, BY1, r()), s = L.lerp(0.00012, 0.0006, r()), tone = r();
    vc.fillStyle = tone < 0.55 ? `rgba(70,48,30,${0.12 + 0.16 * r()})` : `rgba(196,160,118,${0.1 + 0.14 * r()})`;
    vc.beginPath(); vc.ellipse(x, y, s, s * (0.5 + 0.4 * r()), r() * 3, 0, Math.PI * 2); vc.fill();
  }
  vc.setTransform(1, 0, 0, 1, 0, 0);
  vc.globalCompositeOperation = 'destination-in';
  vc.drawImage(mask, 0, 0);
  // inner shadows: the soil outside the void, blurred, falling in from the ceiling (light from above-front)
  const [sh, shc] = mk();
  shc.setTransform(1, 0, 0, 1, 0, 0);
  shc.fillStyle = 'rgb(16,10,6)'; shc.fillRect(0, 0, w, h);
  shc.globalCompositeOperation = 'destination-out';
  shc.drawImage(mask, 0, 0);
  vc.globalCompositeOperation = 'source-atop';
  vc.filter = 'blur(14px)'; vc.globalAlpha = 0.85; vc.drawImage(sh, 0, 9);
  vc.filter = 'blur(4px)'; vc.globalAlpha = 0.4; vc.drawImage(sh, 0, 3);
  vc.filter = 'blur(1.2px)'; vc.globalAlpha = 0.3; vc.drawImage(sh, 0, 0);
  vc.filter = 'none'; vc.globalAlpha = 1;
  // where a tunnel turns out of the section plane: a dark bore receding into the soil
  vc.setTransform(PXM, 0, 0, PXM, -BX0 * PXM, -BY0 * PXM);
  for (const t of TUN) {
    if (!t.out) continue;
    const e = t.pts[t.pts.length - 1];
    const gg = vc.createRadialGradient(e[0], e[1], 0, e[0], e[1], TR * 1.5);
    gg.addColorStop(0, 'rgba(6,4,2,0.97)'); gg.addColorStop(0.55, 'rgba(12,8,5,0.75)'); gg.addColorStop(1, 'rgba(12,8,5,0)');
    vc.fillStyle = gg;
    vc.beginPath(); vc.arc(e[0], e[1], TR * 1.5, 0, Math.PI * 2); vc.fill();
  }
  // compose: a soft dark halo on the cut face around every void, then the voids
  const [out, oc] = mk();
  oc.setTransform(1, 0, 0, 1, 0, 0);
  const [halo, hc] = mk();
  hc.setTransform(1, 0, 0, 1, 0, 0);
  hc.drawImage(mask, 0, 0);
  hc.globalCompositeOperation = 'source-in';
  hc.fillStyle = 'rgb(14,9,6)'; hc.fillRect(0, 0, w, h);
  oc.filter = 'blur(5px)'; oc.globalAlpha = 0.5; oc.drawImage(halo, 0, 0);
  oc.filter = 'none'; oc.globalAlpha = 1;
  oc.drawImage(vd, 0, 0);
  // a small mip for the far LOD (avoids shimmering when the colony is a speck)
  const mip = new OffscreenCanvas(Math.ceil(w / 8), Math.ceil(h / 8));
  const mpc = mip.getContext('2d');
  mpc.imageSmoothingQuality = 'high';
  mpc.drawImage(out, 0, 0, mip.width, mip.height);
  return { img: out, mip };
}

// ------------------------------------------------------------------ live drawing
function drawStone(ctx, mpp, detail) {
  // cast shadow on the ground surface, to the left (sun upper right)
  const sh = ctx.createLinearGradient(0.056, 0, 0.0815, 0);
  sh.addColorStop(0, 'rgba(8,5,3,0)'); sh.addColorStop(1, 'rgba(8,5,3,0.34)');
  ctx.fillStyle = sh;
  ctx.fillRect(0.056, -0.0018, 0.0255, 0.0026);
  ctx.beginPath();
  const n = STONE.length;
  const m = (i) => [(STONE[i % n][0] + STONE[(i + 1) % n][0]) / 2, (STONE[i % n][1] + STONE[(i + 1) % n][1]) / 2];
  ctx.moveTo(...m(0));
  for (let i = 1; i <= n; i++) ctx.quadraticCurveTo(STONE[i % n][0], STONE[i % n][1], ...m(i));
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -0.023, 0, 0.0095);
  g.addColorStop(0, 'rgb(188,180,164)');
  g.addColorStop(0.3, 'rgb(152,144,130)');
  g.addColorStop(0.66, 'rgb(106,98,88)');
  g.addColorStop(0.71, 'rgb(84,73,61)');    // below the soil line: stained
  g.addColorStop(1, 'rgb(64,53,42)');
  ctx.fillStyle = g;
  ctx.fill();
  if (detail <= 0) return;
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = detail;
  const kl = ctx.createRadialGradient(0.19, -0.03, 0, 0.19, -0.03, 0.09);
  kl.addColorStop(0, 'rgba(255,236,200,0.35)'); kl.addColorStop(1, 'rgba(255,236,200,0)');
  ctx.fillStyle = kl; ctx.fillRect(0.08, -0.03, 0.125, 0.04);
  // the face is weathered, not polished: soft mottling + pores
  const r = L.rng(2113);
  for (let i = 0; i < 26; i++) {
    const x = L.lerp(0.085, 0.198, r()), y = L.lerp(-0.02, 0.006, r()), s = L.lerp(0.003, 0.009, r());
    ctx.fillStyle = r() < 0.5 ? 'rgba(70,64,56,0.10)' : 'rgba(225,218,200,0.10)';
    ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 200; i++) {
    const x = L.lerp(0.082, 0.2, r()), y = L.lerp(-0.022, 0.009, r()), s = L.lerp(0.00012, 0.00045, r());
    ctx.fillStyle = r() < 0.6 ? 'rgba(40,34,28,0.4)' : 'rgba(235,228,212,0.32)';
    ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.7, r() * 3, 0, Math.PI * 2); ctx.fill();
  }
  // bedding planes: two faint, irregular cracks
  ctx.strokeStyle = 'rgba(52,46,40,0.42)';
  ctx.lineWidth = Math.max(0.00022, mpp * 1.1);
  for (const [y0, a, b, s] of [[-0.0125, 0.088, 0.146, 3], [-0.0035, 0.122, 0.197, 7]]) {
    ctx.beginPath(); ctx.moveTo(a, y0);
    for (let x = a; x <= b; x += 0.0015) ctx.lineTo(x, y0 + 0.0011 * (L.noise1(x * 180, s) - 0.5));
    ctx.stroke();
  }
  // crustose lichen on the sunlit top: pale grey-green rosettes + orange Xanthoria patches
  const top = (x) => { for (let i = 1; i < 10; i++) { const a = STONE[i], b = STONE[i + 1]; if (x >= a[0] && x <= b[0]) return L.lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0])); } return -0.02; };
  const lr = L.rng(2114);
  for (let i = 0; i < 40; i++) {
    const x = L.lerp(0.09, 0.19, lr()), orange = lr() < 0.22;
    const y = top(x) + 0.0007 + lr() * lr() * 0.004;
    const R = L.lerp(0.0007, 0.0022, lr());
    const col = orange ? L.mix([214, 138, 52], [236, 176, 70], lr()) : L.mix([160, 170, 132], [208, 212, 190], lr());
    for (let j = 0; j < 6; j++) {
      const a = lr() * 6.28, d = R * 0.7 * lr();
      ctx.fillStyle = L.rgba(col, 0.45 + 0.35 * lr());
      ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.4, R * (0.4 + 0.5 * lr()), R * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
  // rim light along the top edge
  ctx.save();
  ctx.globalAlpha = detail;
  ctx.strokeStyle = 'rgba(255,242,218,0.55)';
  ctx.lineWidth = Math.max(0.0003, mpp * 2);
  ctx.beginPath();
  ctx.moveTo(...m(1));
  for (let i = 2; i <= 9; i++) ctx.quadraticCurveTo(STONE[i][0], STONE[i][1], ...m(i));
  ctx.stroke();
  ctx.restore();
}
function drawBrood(ctx, b) {
  const c = CH[b.ci];
  ctx.save();
  ctx.translate(b.x, floorY(c, b.x) - b.lift * b.s * (b.k === 'egg' ? 1.15 : 0.6));
  if (b.k === 'egg') {
    ctx.fillStyle = L.rgba(L.mix([248, 244, 228], [222, 212, 186], b.tone));
    ctx.beginPath(); ctx.ellipse(0, -b.s * 0.66, b.s, b.s * 0.66, b.r, 0, Math.PI * 2); ctx.fill();
  } else if (b.k === 'larva') {
    // a C-shaped grub lying on its side: translucent cream, a darker gut line
    const s = b.s;
    ctx.rotate(b.r * 0.5);
    ctx.lineCap = 'round';
    ctx.strokeStyle = L.rgba(L.mix([242, 234, 212], [220, 204, 172], b.tone));
    ctx.lineWidth = s * 0.5;
    ctx.beginPath(); ctx.arc(0, -s * 0.46, s * 0.4, Math.PI * 0.1, Math.PI * 1.2); ctx.stroke();
    ctx.strokeStyle = 'rgba(150,118,78,0.35)';
    ctx.lineWidth = s * 0.14;
    ctx.beginPath(); ctx.arc(0, -s * 0.46, s * 0.4, Math.PI * 0.45, Math.PI * 0.95); ctx.stroke();
  } else {
    // a silk cocoon (Lasius pupae are cocooned): tan, with the dark meconium spot at one end
    const s = b.s;
    ctx.rotate(b.r * 0.12);
    const g = ctx.createLinearGradient(0, -s * 0.44, 0, 0);
    g.addColorStop(0, 'rgb(236,216,170)'); g.addColorStop(1, 'rgb(174,146,100)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, -s * 0.21, s * 0.5, s * 0.21, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(70,50,30,0.65)';
    ctx.beginPath(); ctx.ellipse(s * 0.43 * (b.tone < 0.5 ? 1 : -1), -s * 0.2, s * 0.05, s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export default {
  beat: 1,
  chapter: { num: '01', title: 'One colony', sub: 'A few thousand ants under a stone' },
  layer: 1,
  cues(d) {
    return [
      { t: 0.75, name: 'creak', gain: 0.1, pitch: 1.5 },
      { t: 2.05, name: 'blip', gain: 0.26, pitch: 1.1 },
      { t: 2.2, name: 'tick', gain: 0.2, pitch: 1.4 },
      { t: 4.2, name: 'tick', gain: 0.12, pitch: 1.6 },
    ];
  },
  drawWorld(ctx, v) {
    const mpp = v.cam.mpp;
    if (v.gt > v.tl.scenes[4].start) return;   // long gone once the globe is up
    const x0 = v.wx(-0.006), x1 = v.wx(0.212), y0 = v.wy(-0.025), y1 = v.wy(0.15);
    if (x1 < -20 || x0 > W + 20 || y1 < -20 || y0 > H + 20 || x1 - x0 < 1.5) return;
    if (!BAKE) BAKE = bake();
    const wpx = x1 - x0;
    const detail = L.clamp(L.invLerp(90, 280, wpx));
    // ---- the void network (bitmap in world space)
    ctx.save();
    ctx.imageSmoothingQuality = 'high';
    const bx = v.wx(BX0), by = v.wy(BY0), bw = (BX1 - BX0) / mpp, bh = (BY1 - BY0) / mpp;
    ctx.drawImage(bw < BAKE.mip.width * 1.5 ? BAKE.mip : BAKE.img, bx, by, bw, bh);
    ctx.restore();
    // ---- the stone (its underside is the brood chamber's ceiling)
    ctx.save();
    ctx.translate(v.wx(0), v.wy(0));
    ctx.scale(1 / mpp, 1 / mpp);
    drawStone(ctx, mpp, detail);
    ctx.restore();

    // ---- inhabitants
    const antPx = 0.0045 / mpp;
    if (antPx < 0.7) return;
    const t = v.gt;
    const draws = [];   // [depth, fn]: far rows → ceiling → brood (1) → tunnels (1.5) → near rows
    const RAISE = [0, 0.0012, 0, 0], DIM = [0, 0.5, 0, 0];
    for (const a of FLOOR) {
      const c = CH[a.ci];
      const x = a.x + a.amp * Math.sin(t * a.f * 6.28 + a.ph);
      const ceil = a.row < 0;
      const fy = ceil ? (q) => ceilY(c, q) : (q) => floorY(c, q);
      const y = fy(x) - (ceil ? -0.0003 : RAISE[a.row]);
      const sl = (fy(x + 0.001) - fy(x - 0.001)) / 0.002;
      const depth = ceil ? 0.5 : [0, 0.3, 1.6, 2][a.row];
      draws.push([depth, () => {
        const sx = v.wx(x), sy = v.wy(y), len = a.len / mpp;
        if (sx < -len || sx > W + len || sy < -len || sy > H + len) return;
        drawAnt(ctx, {
          x: sx, y: sy, len, dir: a.dir, angle: (ceil ? Math.PI : 0) + Math.atan(sl) * 0.85, phase: gaitPhase(x - a.x, a.len),
          walk: a.amp > 0 ? 0.85 : 0, t: t + a.seed, col: L.mix(ANT_COL, WALL.mid, ceil ? 0.3 : DIM[a.row]), detail: 0.7,
        });
      }]);
    }
    if (antPx > 1.5) {
      draws.push([1, () => {
        ctx.save(); ctx.translate(v.wx(0), v.wy(0)); ctx.scale(1 / mpp, 1 / mpp);
        for (const b of BROOD) drawBrood(ctx, b);
        ctx.restore();
      }]);
    }
    TUN.forEach((tn, ti) => {
      if (tn.guard) {   // a guard just inside the entrance, facing out (antennae toward the hero)
        const p = along(tn, 0.0049), o = orient(-p.tx, -p.ty);
        draws.push([1.5, () => drawAnt(ctx, {
          x: v.wx(p.x + o.fx * (TR - 0.0003)), y: v.wy(p.y + o.fy * (TR - 0.0003)), len: 0.0045 / mpp, dir: o.dir, angle: o.angle,
          walk: 0, t: t * 1.4 + 3, col: ANT_COL, detail: 0.8,
        })]);
        return;
      }
      if (!tn.ants) return;
      const sp = 0.011, speed = 0.0065, L0 = tn.len + sp;
      const n = Math.ceil(L0 / sp);
      for (let i = 0; i < n; i++) {
        const raw = i * sp + speed * t + ti * 0.0037;
        const lap = Math.floor(raw / L0), sA = raw - lap * L0;
        const r = L.rng(ti * 1000 + i * 37 + lap * 7919);
        if (r() < 0.3) continue;
        const s = tn.ants > 0 ? sA : tn.len - sA;
        if (s < 0 || s > tn.len) continue;
        const fade = L.clamp(Math.min(s, tn.len - s) / 0.004);
        if (fade <= 0) continue;
        const p = along(tn, s);
        const o = orient(p.tx * tn.ants, p.ty * tn.ants);
        const len = L.lerp(0.0042, 0.0048, r());
        draws.push([1.5, () => drawAnt(ctx, {
          x: v.wx(p.x + o.fx * (TR - 0.0003)), y: v.wy(p.y + o.fy * (TR - 0.0003)), len: len / mpp, dir: o.dir, angle: o.angle,
          phase: gaitPhase(sA, len), walk: 1, t: t + i, col: ANT_COL, alpha: fade, detail: 0.7,
        })]);
      }
    });
    draws.sort((a, b) => a[0] - b[0]);
    for (const [, fn] of draws) fn();
  },
  drawOverlay(ctx, v) {
    const t0 = v.tl.lines[1].phrases[1].start - v.tl.scenes[1].start - 0.05;   // "a few thousand ants"
    const kin = L.prog(v.t, t0, 0.7);
    if (kin <= 0) return;
    ctx.save();
    ctx.globalAlpha = v.k;
    const size = L.fitSize(ctx, 'A FEW THOUSAND', 900, 118, 800, L.FONT.display, 60);
    labelScrim(ctx, 40, 560, 980, 300, L.ease.outCubic(kin), 0.42);
    L.bigLabel(ctx, { x: 64, y: 548, big: 'A FEW THOUSAND', small: 'ants · one colony', k: kin, accent: v.accent, size });
    ctx.restore();
  },
};
