// Beat 6 — the dinosaurs: from Christmas to December 30.
// The camera settles on December. Dec 25 ignites (the first dinosaurs, 230 Mya ≈ Dec 25, 22:00) and a reign band
// sweeps day by day through the last week while a glowing sauropod silhouette strolls across Dec 26–28.
// An asteroid streaks in from the upper right and strikes Dec 30 at its true position (66 Mya ≈ Dec 30, 06:00):
// the band is cut with a hot seam, a shockwave ring rolls across the grid and the dinosaur disintegrates into
// embers as the wavefront passes it. A faint dashed "fossil" outline stays for the rest of the film.
import * as L from '../../../../engine/runtime/lib.js';
import { dayOfYear, dayRect, monthRect } from '../camera.js';

const { W, H } = L;
const DEC0 = 334;                                  // day-of-year index of Dec 1
const U0 = dayOfYear(230e6) - DEC0;                // ≈ 24.92 (Dec 25, late)
const U1 = dayOfYear(66e6) - DEC0;                 // ≈ 29.25 (Dec 30, early morning)
const T_IGN = 1.45;                                // Dec 25 ignites ("…around Christmas")
const T_IMP = 3.45;                                // impact ("wiped")
const T_FLY = 0.8;                                 // asteroid flight time
const HOT = [255, 196, 140];
const EMBER = [255, 140, 90];
const PLUM = [26, 12, 32];

// ------------------------------------------------------------------ calendar geometry
const MR = monthRect(11);
/** inner (padded) rect of Dec cell index d, matching env.js cell padding */
const inner = (d) => { const r = dayRect(11, d); return { x: r.x + 0.03, y: r.y + 0.03, w: 0.94, h: 0.94 }; };
/** world point at fractional day u (days since Dec 1), vertically at fraction fy of the cell */
const dayPoint = (u, fy = 0.5) => { const d = Math.floor(u), r = inner(d); return { x: r.x + (u - d) * r.w, y: r.y + fy * r.h }; };
const IMPACT = dayPoint(U1, 0.5);

// ------------------------------------------------------------------ sauropod (local units = day cells, +x = head, y up is negative, ground = 0)
const SPINE_K = [
  [0.0, -0.36, 0.006], [0.3, -0.4, 0.03], [0.62, -0.5, 0.075], [0.92, -0.6, 0.15], [1.2, -0.665, 0.245], [1.52, -0.69, 0.29],
  [1.84, -0.675, 0.27], [2.06, -0.7, 0.19], [2.24, -0.85, 0.115], [2.38, -1.03, 0.08], [2.5, -1.19, 0.066], [2.6, -1.3, 0.062],
  [2.72, -1.36, 0.072], [2.86, -1.35, 0.052], [2.93, -1.32, 0.03],
];
const NECK0 = 7, TAIL0 = 4;                        // pivots: neck base (index 7), hip (index 4)
const LEGS = [                                      // hip x, top y, length, phase, near?
  { x: 1.18, len: 0.46, ph: 0.0, near: false }, { x: 1.88, len: 0.47, ph: Math.PI, near: false },
  { x: 1.3, len: 0.46, ph: Math.PI, near: true }, { x: 2.0, len: 0.47, ph: 0.0, near: true },
];
const DINO_LEN = 2.95, SC = 1.08;                 // SC: silhouette scale (local units -> day cells)
const DINO_X0 = inner(24).x + 0.12, GROUND = inner(24).y + inner(24).h - 0.02;   // stands on row 3, Dec 25–28
const walkX = (t) => 0.075 * Math.max(0, t - 1.6);                                // slow stroll to the right

function catmull(pts, steps = 6) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      out.push(p1.map((_, k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const rot = (p, c, a) => { const dx = p[0] - c[0], dy = p[1] - c[1], cs = Math.cos(a), sn = Math.sin(a); return [c[0] + dx * cs - dy * sn, c[1] + dx * sn + dy * cs, p[2]]; };

/** animated spine (smoothed) at beat time t */
function spineAt(t) {
  const neckA = 0.05 * Math.sin(t * 1.25) + 0.03 * L.noise1(t * 0.6, 61);
  const tailA = 0.07 * Math.sin(t * 1.05 + 1.1);
  const bob = 0.012 * Math.sin(t * 4.4);
  const k = SPINE_K.map((p, i) => {
    let q = p;
    if (i > NECK0) q = rot(q, SPINE_K[NECK0], -neckA * (i - NECK0) / 4);
    if (i < TAIL0) q = rot(q, SPINE_K[TAIL0], tailA * (TAIL0 - i) / 4);
    return [q[0], q[1] + bob, q[2]];
  });
  return catmull(k);
}
function outline(sp) {
  const top = [], bot = [];
  for (let i = 0; i < sp.length; i++) {
    const a = sp[Math.max(0, i - 1)], b = sp[Math.min(sp.length - 1, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const n = Math.hypot(nx, ny) || 1; nx /= n; ny /= n;
    const th = sp[i][2];
    top.push([sp[i][0] - nx * th, sp[i][1] - ny * th]);
    bot.push([sp[i][0] + nx * th * (i > 10 && i < 50 ? 1.08 : 1), sp[i][1] + ny * th]);
  }
  return { top, bot };
}
function bodyPath(ctx, o) {
  ctx.beginPath();
  o.top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  for (let i = o.bot.length - 1; i >= 0; i--) ctx.lineTo(o.bot[i][0], o.bot[i][1]);
  ctx.closePath();
}
function legPath(ctx, leg, t, bob) {
  const a = 0.2 * Math.sin(t * 2.2 + leg.ph);
  const lift = Math.max(0, Math.sin(t * 2.2 + leg.ph + Math.PI / 2)) * 0.035;
  const top = -0.5 + bob, len = 0.5 - bob - lift;
  const c = Math.cos(a), s = Math.sin(a);
  const P = (dx, dy) => [leg.x + dx * c - dy * s, top + dx * s + dy * c];
  ctx.beginPath();
  ctx.moveTo(...P(-0.1, 0));
  ctx.lineTo(...P(0.1, 0));
  ctx.quadraticCurveTo(...P(0.06, len * 0.55), ...P(0.065, len - 0.035));
  ctx.quadraticCurveTo(...P(0.085, len), ...P(0.035, len));
  ctx.lineTo(...P(-0.065, len));
  ctx.quadraticCurveTo(...P(-0.085, len * 0.45), ...P(-0.1, 0));
  ctx.closePath();
}

/** the full silhouette path set (legs + body), in local units */
function dinoShape(ctx, t, legsFilter) {
  const bob = 0.012 * Math.sin(t * 4.4);
  for (const leg of LEGS) if (legsFilter(leg)) { legPath(ctx, leg, t, bob); ctx.fill(); }
}

function drawDino(ctx, v, t, alpha, cut) {
  if (alpha <= 0.002) return;
  const s = v.ws(1) * SC;
  if (s * DINO_LEN < 6) return;
  const ox = DINO_X0 + walkX(t), oy = GROUND;
  const sp = spineAt(t), o = outline(sp);
  const px = 1 / s;
  ctx.save();
  ctx.translate(v.wx(ox), v.wy(oy));
  ctx.scale(s, s);
  if (cut) {                                       // disintegration: hide everything the shockwave has passed
    ctx.beginPath();
    ctx.rect(-20, -20, 40, 40);
    ctx.arc((cut.x - ox) / SC, (cut.y - oy) / SC, Math.max(0, cut.r / SC), 0, Math.PI * 2);
    ctx.clip('evenodd');
  }
  ctx.globalAlpha *= alpha;
  // a soft dark bed under the animal: the day numbers it stands over step back
  const db = ctx.createRadialGradient(1.55, -0.55, 0, 1.55, -0.55, 1.9);
  db.addColorStop(0, 'rgba(8,4,10,0.62)');
  db.addColorStop(0.6, 'rgba(8,4,10,0.45)');
  db.addColorStop(1, 'rgba(8,4,10,0)');
  ctx.fillStyle = db;
  ctx.fillRect(-0.4, -2.5, 3.9, 3.0);
  // soft halo behind the animal so it separates from the grid
  const hg = ctx.createRadialGradient(1.7, -0.7, 0, 1.7, -0.7, 1.8);
  hg.addColorStop(0, L.rgba(v.accent, 0.2));
  hg.addColorStop(1, L.rgba(v.accent, 0));
  ctx.fillStyle = hg;
  ctx.fillRect(-0.2, -2.6, 3.8, 3.8);
  // contact light: the animal stands on its days
  const cg = ctx.createLinearGradient(0, 0, 3.0, 0);
  cg.addColorStop(0, L.rgba(v.accent, 0));
  cg.addColorStop(0.5, L.rgba([255, 220, 245], 0.55));
  cg.addColorStop(1, L.rgba(v.accent, 0));
  ctx.fillStyle = cg;
  ctx.fillRect(0.4, -1.2 * px, 2.4, 2.4 * px);
  // far legs (darker), body, near legs: one solid luminous silhouette
  const fill = ctx.createLinearGradient(0, -1.35, 0, 0);
  fill.addColorStop(0, L.rgba(L.mix(PLUM, v.accent, 0.62)));
  fill.addColorStop(0.45, L.rgba(L.mix(PLUM, v.accent, 0.36)));
  fill.addColorStop(1, L.rgba(L.mix(PLUM, v.accent, 0.12)));
  ctx.fillStyle = L.rgba(L.mix(PLUM, v.accent, 0.16));
  dinoShape(ctx, t, (l) => !l.near);
  ctx.fillStyle = fill;
  bodyPath(ctx, o); ctx.fill();
  dinoShape(ctx, t, (l) => l.near);
  // form shading: a soft belly shadow and a sheen along the flank
  ctx.save();
  bodyPath(ctx, o); ctx.clip();
  const bg = ctx.createLinearGradient(0, -0.75, 0, -0.35);
  bg.addColorStop(0, 'rgba(255,230,250,0.0)');
  bg.addColorStop(0.35, 'rgba(255,230,250,0.10)');
  bg.addColorStop(1, 'rgba(20,6,24,0.35)');
  ctx.fillStyle = bg;
  ctx.fillRect(0.6, -1.0, 1.8, 0.7);
  ctx.restore();
  // the blast front burning into the body: a hot band just inside the cut
  if (cut && cut.r > 0) {
    const cxl = (cut.x - ox) / SC, cyl = (cut.y - oy) / SC, rl = cut.r / SC;
    ctx.save();
    bodyPath(ctx, o);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const bw = 0.55;
    const bg2 = ctx.createRadialGradient(cxl, cyl, Math.max(0, rl), cxl, cyl, rl + bw);
    bg2.addColorStop(0, L.rgba([255, 245, 225], 0.95));
    bg2.addColorStop(0.3, L.rgba(HOT, 0.75));
    bg2.addColorStop(1, L.rgba(EMBER, 0));
    ctx.fillStyle = bg2;
    ctx.fillRect(-1, -2.5, 5, 3.2);
    ctx.restore();
  }
  // rim light along the back, neck and head (from above)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = L.rgba(v.accent, 1);
  ctx.shadowBlur = 12;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = L.rgba(L.mix(v.accent, [255, 255, 255], 0.45), 0.9);
  ctx.lineWidth = 2.2 * px;
  ctx.beginPath();
  o.top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  // eye glint
  const hd = sp[sp.length - 5];
  ctx.shadowBlur = 4;
  ctx.fillStyle = 'rgba(255,240,252,0.9)';
  ctx.beginPath(); ctx.arc(hd[0] + 0.03, hd[1] - 0.012, Math.max(0, 1.8 * px), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.restore();
}

/** dashed fossil outline, left behind after the extinction */
function drawFossil(ctx, v, a) {
  if (a <= 0.002) return;
  const s = v.ws(1) * SC;
  if (s * DINO_LEN < 10) return;
  const tf = T_IMP;
  const ox = DINO_X0 + walkX(tf), oy = GROUND;
  const o = outline(spineAt(tf));
  ctx.save();
  ctx.translate(v.wx(ox), v.wy(oy));
  ctx.scale(s, s);
  ctx.globalAlpha *= a;
  ctx.strokeStyle = L.rgba(L.mix(v.accent, [255, 255, 255], 0.3), 0.9);
  ctx.lineWidth = 1.3 / s;
  ctx.lineJoin = 'round';
  ctx.setLineDash([3 / s, 4 / s]);
  ctx.beginPath();
  o.top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.globalAlpha *= 0.55;
  ctx.beginPath();
  o.bot.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.restore();
}


// ------------------------------------------------------------------ embers: particles sampled inside the silhouette (pose at impact)
const EMBERS = (() => {
  const r = L.rng(606), sp = spineAt(T_IMP), out = [];
  const ox = DINO_X0 + walkX(T_IMP), oy = GROUND;
  for (let i = 0; i < 150; i++) {
    let x, y;
    if (r() < 0.82) {
      const p = sp[Math.floor(Math.pow(r(), 0.85) * (sp.length - 1))];
      x = p[0] + (r() - 0.5) * 0.06; y = p[1] + (r() * 2 - 1) * p[2] * 0.9;
    } else {
      const leg = LEGS[Math.floor(r() * 4)];
      x = leg.x + (r() - 0.5) * 0.12; y = -r() * 0.5;
    }
    const wx = ox + x * SC, wy = oy + y * SC;
    const dx = wx - IMPACT.x, dy = wy - IMPACT.y, dist = Math.hypot(dx, dy);
    out.push({ x: wx, y: wy, dist, dx: dx / dist, dy: dy / dist, sp: L.lerp(0.35, 1.1, r()), life: L.lerp(1.2, 2.8, r()), sz: L.lerp(0.6, 1.5, r()), ph: r() * 10, up: L.lerp(0.1, 0.45, r()) });
  }
  return out;
})();
// the blast front: an outQuad expansion slow enough to SEE it roll from Dec 30 into the dinosaur (tail first)
const SHOCK_R = 7.0, SHOCK_T = 2.0;
const outQuad = (x) => 1 - (1 - x) * (1 - x);
const shockR = (t) => SHOCK_R * outQuad(L.prog(t, T_IMP, SHOCK_T));
const shockTime = (dist) => T_IMP + SHOCK_T * (1 - Math.sqrt(Math.max(0, 1 - dist / SHOCK_R)));

// ignition sparks around Dec 25 and impact debris
const SPARKS = (() => { const r = L.rng(607); return Array.from({ length: 18 }, () => ({ a: r() * Math.PI * 2, sp: L.lerp(0.25, 0.8, r()), life: L.lerp(0.8, 1.5, r()), sz: L.lerp(0.6, 1.4, r()), up: L.lerp(0.05, 0.3, r()) })); })();
const DEBRIS = (() => { const r = L.rng(608); return Array.from({ length: 34 }, () => ({ a: -Math.PI * L.lerp(0.05, 0.95, r()) + (r() < 0.25 ? Math.PI : 0), sp: L.lerp(0.8, 3.0, r()), life: L.lerp(0.6, 1.4, r()), sz: L.lerp(0.6, 1.6, r()) })); })();

// ------------------------------------------------------------------ pieces
function drawBand(ctx, v, t) {
  if (t < T_IGN - 0.1) return;
  const p = L.prog(t, T_IGN + 0.1, T_IMP - T_IGN - 0.1);
  const u = L.lerp(U0, U1, Math.pow(p, 1.35));
  const after = L.prog(t, T_IMP, 1.6);
  const fillA = L.lerp(0.3, 0.17, after);
  ctx.save();
  for (let d = Math.floor(U0); d <= Math.floor(U1); d++) {
    const a = Math.max(d, U0), b = Math.min(d + 1, u);
    if (b <= a) continue;
    const r = inner(d);
    const x0 = v.wx(r.x + (a - d) * r.w), x1 = v.wx(r.x + (b - d) * r.w), y0 = v.wy(r.y), y1 = v.wy(r.y + r.h);
    if (x1 < 0 || x0 > W || y1 < 0 || y0 > H) continue;
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, L.rgba(v.accent, fillA * 1.25));
    g.addColorStop(1, L.rgba(v.accent, fillA * 0.55));
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = L.rgba(L.mix(v.accent, [255, 255, 255], 0.4), 0.55 + 0.2 * (1 - after));
    ctx.fillRect(x0, y0, x1 - x0, Math.max(1, v.ws(0.018)));
  }
  // the moving leading edge (a bright scan line) while the reign grows
  if (u > U0 + 0.15 && t < T_IMP) {               // starts clear of the band's own start edge
    const e = dayPoint(Math.min(u, U1 - 1e-4), 0);
    const x = v.wx(e.x), y0 = v.wy(e.y), hh = v.ws(0.94);
    L.glow(ctx, v.accent, 16, () => { ctx.fillStyle = L.rgba([255, 230, 250], 0.9); ctx.fillRect(x - 1.5, y0, 3, hh); });
  }
  // the cut: a hot seam at the extinction moment that cools to a crisp accent line
  if (t >= T_IMP) {
    const e = dayPoint(U1, 0), x = v.wx(e.x), y0 = v.wy(e.y), hh = v.ws(0.94);
    const heat = Math.exp(-(t - T_IMP) / 0.9);
    // later it settles to a quiet accent mark so it never competes with the film's final focal point
    const cool = L.ease.inOutCubic(L.prog(t, T_IMP + 2, 1.2));
    const small = v.beat >= 10 ? 0.5 : 1;
    const sw = 3 * L.lerp(1, 0.67, cool) * small;
    L.glow(ctx, L.mix(v.accent, HOT, heat), L.lerp(10 + 20 * heat, 4, cool), () => {
      ctx.fillStyle = L.rgba(L.mix(L.mix([255, 220, 245], [255, 245, 225], heat), v.accent, cool), L.lerp(0.85, 0.35, cool) * small);
      ctx.fillRect(x - sw / 2, y0 - v.ws(0.06) * heat, sw, hh + v.ws(0.12) * heat);
    });
    // scorched remainder of Dec 30
    const r = inner(Math.floor(U1));
    const sx = v.wx(e.x), ex = v.wx(r.x + r.w);
    const sg = ctx.createLinearGradient(sx, 0, ex, 0);
    sg.addColorStop(0, L.rgba(EMBER, 0.28 * heat + 0.05));
    sg.addColorStop(1, L.rgba(EMBER, 0));
    ctx.fillStyle = sg;
    ctx.fillRect(sx, y0, ex - sx, hh);
  }
  ctx.restore();
}

function drawIgnition(ctx, v, t) {
  const age = t - T_IGN;
  if (age < 0 || age > 2.4) return;
  const r = inner(24), c = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  const cx = v.wx(c.x), cy = v.wy(c.y), s = v.ws(1);
  const I = L.ease.outCubic(L.clamp(age / 0.12)) * Math.exp(-age / 0.55);
  L.lightBlob(ctx, cx, cy, Math.max(0, s * (0.7 + 1.1 * L.ease.outCubic(L.clamp(age / 0.8)))), v.accent, 0.55 * I);
  // expanding square ring echoing the cell
  const ring = L.ease.outCubic(L.clamp(age / 0.9));
  const half = s * 0.47 * (1 + 0.55 * ring);
  ctx.save();
  ctx.strokeStyle = L.rgba([255, 225, 248], 0.8 * (1 - ring));
  ctx.lineWidth = 2;
  L.roundRect(ctx, cx - half, cy - half, half * 2, half * 2, 6);
  ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  for (const sp of SPARKS) {
    if (age > sp.life) continue;
    const k = age / sp.life, dist = sp.sp * L.ease.outCubic(k) * s * 0.9;
    const x = cx + Math.cos(sp.a) * dist, y = cy + Math.sin(sp.a) * dist - sp.up * age * s;
    ctx.fillStyle = L.rgba(L.mix([255, 235, 250], v.accent, k), 0.9 * (1 - k));
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, 1.6 * sp.sz * (1 - k * 0.5)), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawAsteroid(ctx, v, t) {
  const p = L.prog(t, T_IMP - T_FLY, T_FLY);
  if (p <= 0 || p >= 1) return;
  const A0 = { x: IMPACT.x + 6.6, y: IMPACT.y - 8.2 };
  const e = Math.pow(p, 2.1);                       // accelerating fall
  const hx = L.lerp(A0.x, IMPACT.x, e), hy = L.lerp(A0.y, IMPACT.y, e);
  const sx = v.wx(hx), sy = v.wy(hy);
  const dirx = IMPACT.x - A0.x, diry = IMPACT.y - A0.y, n = Math.hypot(dirx, diry);
  const len = v.ws(0.6 + 2.6 * p);                 // trail stretches as it speeds up
  const tx = sx - (dirx / n) * len, ty = sy - (diry / n) * len;
  const nx = -diry / n, ny = dirx / n, w = v.ws(0.075);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(tx, ty, sx, sy);
  g.addColorStop(0, L.rgba(EMBER, 0));
  g.addColorStop(0.6, L.rgba(EMBER, 0.35));
  g.addColorStop(1, L.rgba(HOT, 0.95));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(sx + nx * w, sy + ny * w);
  ctx.arc(sx, sy, Math.max(0, w), Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  L.lightBlob(ctx, sx, sy, Math.max(0, v.ws(0.55)), HOT, 0.7);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,250,240,1)';
  ctx.beginPath(); ctx.arc(sx, sy, Math.max(0, w * 0.75), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawImpact(ctx, v, t) {
  const age = t - T_IMP;
  if (age < 0) return;
  const cx = v.wx(IMPACT.x), cy = v.wy(IMPACT.y), s = v.ws(1);
  if (age < 2.5) {
    const I = Math.exp(-age / 0.32);
    L.lightBlob(ctx, cx, cy, Math.max(0, s * (1.2 + 3.5 * L.ease.outCubic(L.clamp(age / 0.5)))), HOT, 0.75 * I);
    L.lightBlob(ctx, cx, cy, Math.max(0, s * 0.45), [255, 255, 250], 0.9 * Math.exp(-age / 0.15));
    // shockwave rings rolling across the calendar
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // the fireball front: a hot glowing annulus that visibly travels from the strike into the dinosaur
    {
      const R = shockR(t) * s, fk = Math.pow(1 - L.prog(age, 0, SHOCK_T), 1.2) * L.clamp(age / 0.06);
      if (R > 2 && fk > 0.01) {
        const inner = Math.max(0, R - s * 0.9);
        const fg = ctx.createRadialGradient(cx, cy, inner, cx, cy, R + s * 0.08);
        fg.addColorStop(0, L.rgba(EMBER, 0));
        fg.addColorStop(0.7, L.rgba(EMBER, 0.22 * fk));
        fg.addColorStop(0.93, L.rgba(HOT, 0.55 * fk));
        fg.addColorStop(1, L.rgba(HOT, 0));
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.arc(cx, cy, R + s * 0.08, 0, Math.PI * 2); ctx.fill();
      }
    }
    for (let k = 0; k < 2; k++) {
      const a = age - k * 0.22;
      if (a <= 0) continue;
      const pr = L.prog(a, 0, SHOCK_T);
      if (pr >= 1) continue;
      const R = SHOCK_R * outQuad(pr) * (1 - k * 0.18);
      ctx.strokeStyle = L.rgba(L.mix(HOT, v.accent, pr), 0.7 * Math.pow(1 - pr, 1.3) * (1 - k * 0.45));
      ctx.lineWidth = Math.max(1, (k ? 1.5 : 3.5) * (1 - pr));
      ctx.shadowColor = L.rgba(HOT, 0.8);
      ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, R * s), 0, Math.PI * 2); ctx.stroke();
    }
    // debris thrown out of the strike
    for (const d of DEBRIS) {
      if (age > d.life) continue;
      const k = age / d.life, dist = d.sp * L.ease.outCubic(k) * s * 0.6;
      const x = cx + Math.cos(d.a) * dist, y = cy + Math.sin(d.a) * dist + 0.9 * k * k * s;
      ctx.fillStyle = L.rgba(L.mix([255, 245, 230], EMBER, k), 0.95 * (1 - k));
      ctx.beginPath(); ctx.arc(x, y, Math.max(0, 1.8 * d.sz * (1 - k * 0.6)), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

function drawEmbers(ctx, v, t) {
  if (t < T_IMP) return;
  const s = v.ws(1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const e of EMBERS) {
    const age = t - shockTime(e.dist);
    if (age < 0 || age > e.life) continue;
    const k = age / e.life, f = 1 - Math.exp(-age * 2.2);
    const x = e.x + (e.dx * 0.55 + 0.15) * e.sp * f + L.noise1(t * 1.4 + e.ph, 9) * 0.05;
    const y = e.y + e.dy * 0.4 * e.sp * f - e.up * age;
    const col = L.ramp([[0, [255, 240, 225]], [0.25, HOT], [0.6, v.accent], [1, [120, 90, 120]]], k);
    ctx.fillStyle = L.rgba(col, 0.95 * Math.pow(1 - k, 1.2));
    ctx.beginPath(); ctx.arc(v.wx(x), v.wy(y), Math.max(0, (0.9 + 0.012 * s) * e.sz * (1 - 0.5 * k)), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ labels
/** feathered dark backing so the label reads over the September grid above December */
function plate(ctx, x, y, w, h, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.shadowColor = `rgba(7,4,9,${0.88 * a})`;
  ctx.shadowBlur = 50;
  ctx.shadowOffsetX = 5000;
  ctx.fillRect(x - 5000, y, w, h);
  ctx.restore();
}
function label(ctx, v, big, small, k) {
  const x = Math.max(110, v.wx(MR.x));
  L.bigLabel(ctx, { x, y: 440, big, small, k, accent: v.accent, size: 112 });
}

export default {
  beat: 6,
  chapter: { num: '06', title: 'Dinosaurs', sub: 'Christmas to December 30' },
  captions: true,
  layer: 1,
  cues() {
    return [
      { t: T_IGN, name: 'bloom', gain: 0.32, pitch: 0.9 },
      { t: T_IGN + 0.05, name: 'shimmer', gain: 0.12, pitch: 1.0 },
      { t: T_IMP - T_FLY - 0.05, name: 'whoosh', gain: 0.38, pitch: 0.65 },
      { t: T_IMP, name: 'impact', gain: 0.62, pitch: 0.85 },
      { t: T_IMP + 0.02, name: 'deep', gain: 0.36, pitch: 1.1 },
      { t: T_IMP + 0.35, name: 'swish', gain: 0.12, pitch: 0.7 },
    ];
  },
  drawWorld(ctx, v) {
    const t = v.t;
    if (t < T_IGN - 0.2) return;
    if (v.ws(1) < 4) return;
    // cull: December on screen?
    const x0 = v.wx(MR.x - 1), x1 = v.wx(MR.x + 9), y0 = v.wy(MR.y - 3), y1 = v.wy(MR.y + 6);
    if (x1 < 0 || x0 > W || y1 < 0 || y0 > H) return;
    // beat 12's year summary redraws the dinosaur span: the fossil, seam and scorch step aside for it
    const b12 = v.tl.scenes[12] ? 1 - L.ease.inOutCubic(L.prog(v.gt - v.tl.scenes[12].start, 1.7, 0.6)) : 1;
    ctx.save();
    ctx.globalAlpha *= b12;
    drawBand(ctx, v, t);
    ctx.restore();
    drawIgnition(ctx, v, t);
    drawFossil(ctx, v, b12 * 0.6 * L.ease.inOutCubic(L.prog(t, T_IMP + 1.4, 1.2)));
    const fin = L.ease.outCubic(L.prog(t, T_IGN + 0.25, 0.8));
    const cut = t >= T_IMP ? { x: IMPACT.x, y: IMPACT.y, r: shockR(t) } : null;
    if (t < T_IMP + SHOCK_T + 0.1) {
      ctx.save();
      ctx.translate(0, v.ws(0.12) * (1 - fin));
      drawDino(ctx, v, t, fin, cut);
      ctx.restore();
    }
    drawEmbers(ctx, v, t);
    drawAsteroid(ctx, v, t);
    drawImpact(ctx, v, t);
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    const k1 = L.prog(t, T_IGN + 0.1, 0.5) * (1 - L.ease.inCubic(L.prog(t, T_IMP - 0.3, 0.28)));
    const k2 = Math.min(v.k, L.prog(t, T_IMP + 0.35, 0.55));
    plate(ctx, Math.max(110, v.wx(MR.x)) - 40, 290, 640, 238, Math.max(k1, k2));   // covers September's last row
    if (k1 > 0) label(ctx, v, 'DEC 25', 'the dinosaurs arrive', k1);
    if (k2 > 0) label(ctx, v, 'DEC 30', '66 million years ago', k2);
    // a warm whole-frame flash on the strike
    const fl = Math.exp(-Math.max(0, t - T_IMP) / 0.18) * (t >= T_IMP ? 1 : 0);
    if (fl > 0.01) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = L.rgba(HOT, 0.16 * fl); ctx.fillRect(0, 0, W, H); ctx.restore(); }
  },
};
