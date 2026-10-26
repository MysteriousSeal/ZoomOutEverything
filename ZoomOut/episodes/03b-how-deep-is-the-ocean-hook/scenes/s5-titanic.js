// Beat 5 — the Titanic's bow section on the abyssal plain at 3,800 m.
// The bow sits upright, half-buried in the sediment it ploughed up in 1912. It waits in the dark as a
// faint silhouette; an ROV searchlight (off-screen, upper right) switches on and sweeps along the hull
// from the torn break to the famous prow, lighting rust, rusticles and the drifting sediment haze.
import * as L from '../../../../engine/runtime/lib.js';
import { floorY } from '../env.js';

const { W, H } = L;
const X0 = 45;                   // world x of the break (aft end); the stem is at X0 + 140
const LENGTH = 140;
const Y0 = floorY(X0 + 70);      // reference mud line (world y) the hull heights are measured from
const SRC = { x: 262, y: Y0 - 205 };   // ROV lamp (off-screen, upper right)

// ------------------------------------------------------------------ geometry (local: X along the hull, h up from the mud line)
const HULL = [
  [0, -8], [0, 1.8], [1.3, 3.2], [0.5, 4.6], [1.8, 5.6], [0.9, 7.1], [2.4, 8.1], [2.9, 9.4],
  [30, 9.45], [60, 9.6], [96, 10.4], [111.6, 10.9], [112, 12.5], [120, 13.0], [128, 13.9], [135, 15.0], [140.3, 16.2],
  [140.5, 8], [140.2, 2], [139.4, -2], [137, -8],
];
const SUPER = [
  [3, 9.4], [4.2, 11.6], [5.9, 11.0], [7.2, 14.8], [8.6, 14.0], [10.3, 17.6], [11.6, 16.9], [13.6, 18.7],
  [62, 18.7], [62, 21.0], [86.2, 21.0], [86.2, 18.7], [87.2, 18.7], [87.2, 16.1], [92.2, 16.1], [92.2, 13.4], [96.2, 13.4], [96.2, 10.4],
];
// deck line (top of the hull / bulwarks), used for rusticles and the rim light
const DECK = [[2.9, 9.4], [96, 10.4], [111.6, 10.9]];
const FORE = [[112, 12.5], [120, 13.0], [128, 13.9], [135, 15.0], [140.3, 16.2]];
const deckAt = (X) => {
  const pts = X < 112 ? DECK : FORE;
  for (let i = 1; i < pts.length; i++) if (X <= pts[i][0]) return L.lerp(pts[i - 1][1], pts[i][1], L.invLerp(pts[i - 1][0], pts[i][0], X));
  return pts[pts.length - 1][1];
};

const R = L.rng(1912);
const PORTS = [];
for (const [h, a, b, step] of [[4.4, 8, 137, 2.3], [6.8, 6, 136, 2.3], [8.7, 14, 95, 2.0]]) {
  for (let X = a; X <= b; X += step) if (R() > 0.12 && !(X > 129 && X < 134 && h > 6)) PORTS.push([X + (R() - 0.5) * 0.3, h]);
}
const WINDOWS = [];
for (let X = 16; X < 91; X += 1.9) if (R() > 0.1) WINDOWS.push([X, 11.9, 0.9, 0.9]);     // B deck
for (let X = 15; X < 86; X += 3.1) if (R() > 0.08) WINDOWS.push([X, 14.4, 2.1, 1.3]);    // A deck promenade
for (let X = 63.5; X < 85; X += 1.6) WINDOWS.push([X, 19.6, 0.9, 0.8]);                    // officers' quarters / bridge
const DAVITS = [84.5, 81.5, 58, 54.5, 51, 47.5, 27, 23.5, 20];
const VENTS = [[44, 1.3], [40.5, 1.0], [37.5, 1.2], [16.5, 1.1]];
const RUST = Array.from({ length: 95 }, () => {
  const X = L.lerp(3, 139.5, R());
  return { X, len: L.lerp(0.7, 3.8, Math.pow(R(), 1.6)), w: L.lerp(0.25, 0.6, R()), a: L.lerp(0.4, 0.9, R()), top: R() < 0.25 && X > 14 && X < 86 };
});

// mud: the plain plus the berm the bow ploughed up (mounded at the stem and along the hull)
function mudY(x) {
  const X = x - X0;
  const along = L.smoothstep(L.clamp((X + 12) / 14)) * L.smoothstep(L.clamp((LENGTH + 14 - X) / 12));
  const bow = Math.exp(-Math.pow((X - 143) / 7, 2));
  return floorY(x) - 2.2 * along - 4.2 * bow - 0.7 * L.noise1(x / 6, 31) * along;
}

// ------------------------------------------------------------------ palettes
const DARK = { hull: [15, 18, 22], hull2: [10, 12, 15], sup: [19, 22, 26], det: [7, 9, 11], edge: [120, 160, 180], edgeA: 0.22, rust: null, mud: null };
const LIT = { hull: [112, 66, 44], hull2: [52, 33, 25], sup: [170, 124, 90], det: [22, 14, 11], edge: [250, 222, 182], edgeA: 0.85, rust: [168, 80, 40], mud: [[104, 96, 84], [46, 42, 38]] };

function poly(ctx, pts) { ctx.beginPath(); pts.forEach(([x, h], i) => (i ? ctx.lineTo(x, -h) : ctx.moveTo(x, -h))); ctx.closePath(); }

function drawShip(ctx, v, P, detail) {
  const s = v.ws(1), px = 1 / s;
  ctx.save();
  ctx.translate(v.wx(X0), v.wy(Y0));
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // superstructure (behind the hull's top edge)
  ctx.fillStyle = L.rgba(P.sup);
  poly(ctx, SUPER); ctx.fill();
  // funnel casings (the funnels themselves are gone) + vents + davits
  ctx.fillStyle = L.rgba(P.det);
  ctx.fillRect(66.4, -22.3, 7.2, 1.3);
  ctx.fillRect(28.4, -20.0, 7.2, 1.3);
  ctx.fillStyle = L.rgba(P.sup);
  ctx.fillRect(66.0, -21.2, 8.0, 0.3);
  ctx.fillRect(28.0, -18.9, 8.0, 0.3);
  for (const [X, hh] of VENTS) { ctx.beginPath(); ctx.ellipse(X, -18.7 - hh, 0.55, 0.45, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(X - 0.25, -18.7 - hh, 0.5, hh); }
  if (detail > 0.3) {
    ctx.strokeStyle = L.rgba(P.sup);
    ctx.lineWidth = Math.max(0.25, 1.2 * px);
    for (const X of DAVITS) { ctx.beginPath(); ctx.moveTo(X, -18.7); ctx.quadraticCurveTo(X, -21.3, X - 1.3, -21.0); ctx.stroke(); }
  }
  // hull
  const hg = ctx.createLinearGradient(0, -14, 0, 4);
  hg.addColorStop(0, L.rgba(P.hull));
  hg.addColorStop(1, L.rgba(P.hull2));
  ctx.fillStyle = hg;
  poly(ctx, HULL); ctx.fill();

  if (detail > 0.05) {
    ctx.save();
    ctx.globalAlpha *= detail;
    // plating strakes
    ctx.strokeStyle = L.rgba(P.det, 0.45);
    ctx.lineWidth = Math.max(0.12, 0.8 * px);
    for (const h of [2.4, 5.6, 7.9]) { ctx.beginPath(); ctx.moveTo(1.5, -h); ctx.lineTo(140, -h - (h > 5 ? 0.6 : 0.2)); ctx.stroke(); }
    // portholes and windows
    ctx.fillStyle = L.rgba(P.det, 0.9);
    for (const [X, h] of PORTS) { ctx.beginPath(); ctx.arc(X, -h, 0.24, 0, Math.PI * 2); ctx.fill(); }
    for (const [X, h, w, hh] of WINDOWS) ctx.fillRect(X, -h - hh / 2, w, hh);
    // hawse pipe + port anchor
    ctx.beginPath(); ctx.ellipse(131.6, -10.4, 0.6, 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 0.45;
    ctx.strokeStyle = L.rgba(P.det, 0.95);
    ctx.beginPath(); ctx.moveTo(131.6, -10.1); ctx.lineTo(131.3, -7.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(130.1, -8.4); ctx.quadraticCurveTo(131.3, -7.1, 132.6, -8.3); ctx.stroke();
    // rusticles and rust streaks hanging from the deck edges
    if (P.rust) {
      for (const r of RUST) {
        const top = r.top ? -18.7 : -deckAt(r.X);
        const g = ctx.createLinearGradient(0, top, 0, top + r.len);
        g.addColorStop(0, L.rgba(P.rust, r.a));
        g.addColorStop(1, L.rgba(P.rust, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(r.X - r.w / 2, top);
        ctx.lineTo(r.X + r.w / 2, top);
        ctx.lineTo(r.X + r.w * 0.1, top + r.len);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }
  // forecastle fittings: anchor crane, capstans; well-deck cargo cranes
  ctx.fillStyle = L.rgba(P.sup);
  ctx.strokeStyle = L.rgba(P.sup);
  ctx.lineWidth = Math.max(0.3, 1.2 * px);
  for (const X of [131.8, 134.6]) ctx.fillRect(X - 0.45, -deckAt(X) - 0.8, 0.9, 0.8);
  ctx.beginPath(); ctx.moveTo(126, -deckAt(126)); ctx.lineTo(126, -deckAt(126) - 2.2); ctx.lineTo(128.6, -deckAt(126) - 1.4); ctx.stroke();
  for (const X of [100.5, 107.5]) { ctx.beginPath(); ctx.moveTo(X, -10.6); ctx.lineTo(X, -12.6); ctx.lineTo(X + 2.6, -11.6); ctx.stroke(); }
  // foremast stump and the mast lying back across the bridge
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(113.6, -12.6); ctx.lineTo(113.6, -14.8); ctx.stroke();
  ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(113.4, -14.6); ctx.lineTo(87.0, -18.9); ctx.stroke();   // slopes down onto the bridge roof
  ctx.beginPath(); ctx.ellipse(97, -17.3, 0.9, 0.7, 0.16, 0, Math.PI * 2); ctx.fill();   // crow's nest, on the fallen mast
  // bow railing: top rail + stanchions running to the prow
  ctx.lineWidth = Math.max(0.12, 1.1 * px);
  ctx.strokeStyle = L.rgba(P.edge, Math.min(1, P.edgeA * 0.9));
  ctx.beginPath();
  for (let X = 112.2; X <= 140.3; X += 0.5) { const y = -deckAt(X) - 1.1; X === 112.2 ? ctx.moveTo(X, y) : ctx.lineTo(X, y); }
  ctx.stroke();
  if (detail > 0.3) {
    ctx.lineWidth = Math.max(0.08, 0.8 * px);
    ctx.beginPath();
    for (let X = 112.6; X <= 140.2; X += 1.25) { ctx.moveTo(X, -deckAt(X)); ctx.lineTo(X, -deckAt(X) - 1.1); }
    ctx.stroke();
  }
  // edge light along the deck lines and the stem
  ctx.strokeStyle = L.rgba(P.edge, P.edgeA);
  ctx.lineWidth = Math.max(0.15, 1.6 * px);
  ctx.beginPath();
  [...DECK, ...FORE].forEach(([X, h], i) => { if (i === DECK.length) ctx.moveTo(X, -h); else i ? ctx.lineTo(X, -h) : ctx.moveTo(X, -h); });
  ctx.moveTo(140.3, -16.2); ctx.lineTo(140.5, -8);
  ctx.stroke();
  ctx.strokeStyle = L.rgba(P.edge, P.edgeA * 0.7);
  ctx.beginPath();
  ctx.moveTo(13.6, -18.7); ctx.lineTo(62, -18.7); ctx.lineTo(62, -21); ctx.lineTo(86.2, -21); ctx.lineTo(86.2, -18.7);
  ctx.moveTo(87.2, -16.1); ctx.lineTo(92.2, -16.1); ctx.moveTo(92.2, -13.4); ctx.lineTo(96.2, -13.4);
  ctx.stroke();
  ctx.restore();
}

function mudPath(ctx, v, x0, x1, bottom) {
  ctx.beginPath();
  for (let i = 0; i <= 90; i++) { const x = L.lerp(x0, x1, i / 90); i ? ctx.lineTo(v.wx(x), v.wy(mudY(x))) : ctx.moveTo(v.wx(x), v.wy(mudY(x))); }
  ctx.lineTo(v.wx(x1), bottom);
  ctx.lineTo(v.wx(x0), bottom);
  ctx.closePath();
}
function drawMud(ctx, v, lit) {
  const x0 = X0 - 30, x1 = X0 + LENGTH + 30;
  mudPath(ctx, v, x0, x1, H + 50);
  if (lit) {
    const g = ctx.createLinearGradient(0, v.wy(Y0 - 6), 0, v.wy(Y0 + 22));
    g.addColorStop(0, L.rgba(LIT.mud[0]));
    g.addColorStop(0.4, L.rgba(LIT.mud[1]));
    g.addColorStop(1, 'rgba(20,19,18,0)');
    ctx.fillStyle = g;
  } else {
    // same screen-space gradient as env's terrain, so the berm melts into the plain
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0b1018');
    g.addColorStop(1, '#05070b');
    ctx.fillStyle = g;
  }
  ctx.fill();
  ctx.strokeStyle = lit ? 'rgba(235,215,185,0.55)' : 'rgba(90,150,170,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 90; i++) { const x = L.lerp(x0, x1, i / 90); i ? ctx.lineTo(v.wx(x), v.wy(mudY(x))) : ctx.moveTo(v.wx(x), v.wy(mudY(x))); }
  ctx.stroke();
}

// ------------------------------------------------------------------ the searchlight
let scratch = null;
function getScratch() {
  if (!scratch) { scratch = document.createElement('canvas'); scratch.width = W; scratch.height = H; }
  return scratch;
}
function lamp(t, d) {
  const on = L.ease.outCubic(L.prog(t, 0.38, 0.5));
  const flick = 1 - 0.45 * Math.exp(-Math.pow((t - 0.5) / 0.05, 2)) - 0.3 * Math.exp(-Math.pow((t - 0.66) / 0.04, 2));
  const off = 1 - L.ease.inCubic(L.prog(t, d - 0.2, 0.45));   // out before the hull reaches the HUD band
  return on * flick * off;
}
function spot(t) {
  const k = L.ease.inOutCubic(L.prog(t, 0.45, 1.95));
  return { x: X0 + L.lerp(14, 120, k), y: Y0 - L.lerp(11, 12.5, k), r: L.lerp(34, 50, L.ease.inOutCubic(L.prog(t, 1.5, 1.2))) };
}

const HAZE = (() => {
  const r = L.rng(3800);
  return Array.from({ length: 170 }, () => ({ x: L.lerp(10, 270, r()), y: L.lerp(Y0 - 210, Y0 + 2, Math.pow(r(), 0.7)), s: r(), ph: r() * 30 }));
})();

function drawLight(ctx, v, t, I) {
  const sp = spot(t);
  const sx = v.wx(sp.x), sy = v.wy(sp.y), rr = v.ws(sp.r);
  const S = { x: v.wx(SRC.x), y: v.wy(SRC.y) };

  // 1) lit version of floor + ship + berm, masked by the spot (with a faint bounce fill everywhere)
  const cv = getScratch(), sc = cv.getContext('2d');
  sc.setTransform(1, 0, 0, 1, 0, 0);
  sc.globalCompositeOperation = 'source-over';
  sc.globalAlpha = 1;
  sc.clearRect(0, 0, W, H);
  // lit seabed
  sc.beginPath();
  for (let i = 0; i <= 80; i++) { const x = L.lerp(X0 - 120, X0 + LENGTH + 120, i / 80); i ? sc.lineTo(v.wx(x), v.wy(floorY(x))) : sc.moveTo(v.wx(x), v.wy(floorY(x))); }
  sc.lineTo(W + 50, H + 50); sc.lineTo(-50, H + 50); sc.closePath();
  const fg = sc.createLinearGradient(0, v.wy(Y0 - 8), 0, v.wy(Y0 + 22));
  fg.addColorStop(0, L.rgba([96, 88, 78]));
  fg.addColorStop(0.35, L.rgba([60, 55, 49]));
  fg.addColorStop(1, 'rgba(20,19,18,0)');
  sc.fillStyle = fg;
  sc.fill();
  drawShip(sc, v, LIT, 1);
  drawMud(sc, v, true);
  // mask: soft elliptical pool (stretched along the beam) + low bounce fill
  sc.globalCompositeOperation = 'destination-in';
  sc.save();
  const ang = Math.atan2(sy - S.y, sx - S.x);
  sc.translate(sx, sy);
  sc.rotate(ang);
  sc.scale(1.25, 1);
  const mg = sc.createRadialGradient(0, 0, 0, 0, 0, rr * 2.4);
  mg.addColorStop(0, `rgba(0,0,0,${I})`);
  mg.addColorStop(0.3, `rgba(0,0,0,${0.9 * I})`);
  mg.addColorStop(0.46, `rgba(0,0,0,${0.42 * I})`);
  mg.addColorStop(0.72, `rgba(0,0,0,${0.17 * I})`);
  mg.addColorStop(1, `rgba(0,0,0,${0.12 * I})`);
  sc.fillStyle = mg;
  sc.fillRect(-W * 2, -H * 2, W * 4, H * 4);
  sc.restore();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(cv, 0, 0);
  ctx.restore();

  // 2) volumetric beam (additive): wide soft cone + brighter core
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const dx = sx - S.x, dy = sy - S.y, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
  ctx.filter = `blur(${Math.max(4, rr * 0.12).toFixed(1)}px)`;   // soft volumetric edges
  for (const [wk, a] of [[1.35, 0.04], [0.95, 0.055], [0.55, 0.07]]) {
    const g = ctx.createLinearGradient(S.x, S.y, sx, sy);
    g.addColorStop(0, `rgba(255,238,210,${a * 1.6 * I})`);
    g.addColorStop(0.75, `rgba(255,238,210,${a * I})`);
    g.addColorStop(1, `rgba(255,238,210,${a * 0.4 * I})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(S.x + nx * 14 * wk, S.y + ny * 14 * wk);
    ctx.lineTo(sx + nx * rr * wk, sy + ny * rr * wk);
    ctx.lineTo(sx - nx * rr * wk, sy - ny * rr * wk);
    ctx.lineTo(S.x - nx * 14 * wk, S.y - ny * 14 * wk);
    ctx.closePath();
    ctx.fill();
  }
  ctx.filter = 'none';
  // 3) sediment haze sparkling inside the beam
  for (const p of HAZE) {
    const x = p.x + L.noise1(v.gt * 0.3 + p.ph, 21) * 2.5, y = p.y + L.noise1(v.gt * 0.25 + p.ph, 22) * 1.8 - ((v.gt * 0.6 + p.ph) % 6);
    const px = v.wx(x), py = v.wy(y);
    const u = ((px - S.x) * dx + (py - S.y) * dy) / (len * len);
    if (u < 0.05 || u > 1.25) continue;
    const perp = Math.abs((px - S.x) * nx + (py - S.y) * ny);
    const hw = rr * 1.1 * u + 6;
    const f = 1 - perp / hw;
    if (f <= 0) continue;
    const a = f * f * I * (0.35 + 0.55 * p.s) * (u > 1 ? 1 - (u - 1) * 4 : 1);
    if (a <= 0.01) continue;
    ctx.fillStyle = `rgba(255,240,215,${a})`;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(0, 0.9 + p.s * 1.8), 0, Math.PI * 2);
    ctx.fill();
  }
  // glow where the beam meets the hull, and a hint of the lamp entering from frame edge
  L.lightBlob(ctx, sx, sy, Math.max(0, rr * 1.6), [255, 228, 190], 0.08 * I);
  ctx.restore();
}

function drawHazeBand(ctx, v, I) {
  // low sediment haze hugging the plain (sits over the base of the hull)
  const y0 = v.wy(Y0 - 7), y1 = v.wy(Y0 + 3);
  if (y1 < 0 || y0 > H) return;
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, 'rgba(26,32,40,0)');
  g.addColorStop(0.65, `rgba(30,36,44,${0.4 + 0.15 * I})`);
  g.addColorStop(1, 'rgba(26,32,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(Math.max(0, v.wx(X0 - 80)), y0, Math.min(W, v.wx(X0 + LENGTH + 80)) - Math.max(0, v.wx(X0 - 80)), y1 - y0);
}

export default {
  beat: 6,
  chapter: { num: '05', title: 'Titanic', sub: 'The bow section, found in 1985' },
  captions: true,
  layer: 0,
  cues(d) {
    return [
      { t: 0.4, name: 'blip', gain: 0.18, pitch: 0.6 },
      { t: 0.62, name: 'swell', gain: 0.28, pitch: 0.8 },
      { t: 0.95, name: 'creak', gain: 0.45, pitch: 0.85 },
    ];
  },
  drawWorld(ctx, v) {
    if (!v.visibleY(Y0 - 40, Y0 + 20)) return;
    const s = v.ws(1);
    if (s * LENGTH < 3) return;
    const t = v.t;
    const detail = L.clamp((s - 1.5) / 3);
    drawShip(ctx, v, DARK, detail);
    drawMud(ctx, v, false);
    const I = s > 1.5 ? lamp(t, v.d) : 0;
    if (I > 0.003) drawLight(ctx, v, t, I);
    drawHazeBand(ctx, v, I);
  },
  drawOverlay(ctx, v) {
    const k = Math.min(v.k, L.prog(v.t, 0.7, 0.45));   // wait until the camera is nearly there
    L.bigLabel(ctx, { x: 200, y: 560, big: '3,800 m', small: '12,500 ft · resting since 1912', k, accent: v.accent });
  },
};
