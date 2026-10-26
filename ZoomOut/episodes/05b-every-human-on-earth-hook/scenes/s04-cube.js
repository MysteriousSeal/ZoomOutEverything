// Beat 4 — the signature move: the concert-crowd square (45.3 km, top-down) lifts into 4,096 particles
// that stream inward and stack into ONE solid cube while the view tilts from top-down to a side view.
//
// This file also owns the cube for the rest of the side view (beats 5–6, and its hand-off into beat 7),
// so the cube is one continuous object. Shared helpers (pitch, projection, drop) are exported for
// s05/s06 (and s07 if it wants to melt the same cube).
//
// Projection (world metres): a 3D point (X, Z, H) — X right, Z toward the viewer, H up — maps to the
// 2D world as x = X, y = base + Z·sin(p) − H·cos(p). p = 90° is straight top-down (y = Z, so the square
// sits centred on the origin exactly like beat 3); p = P_END is a near-side view with a sliver of top face.
import * as L from '../../../../engine/runtime/lib.js';
import { crowdPts3 } from './s03-rhode-island.js';

export const SIDE = 800;                 // cube edge (m): 8.2 B people × ~0.065 m³ ≈ 0.53 km³
const HALF = SIDE / 2;
const N = 16;                            // voxels per edge (16³ = 4,096 particles)
const VOX = SIDE / N;
const SRC = 45300;                       // beat 3's concert-crowd square (m)
const NS = 64;                           // source grid (64² = 4,096)
export const P_END = (7 * Math.PI) / 180;
export const FLOOR = 1800;               // Grand Canyon floor (world y)
const CORAL = [255, 130, 110];
const CORAL_HI = [255, 196, 176];
const CORAL_LO = [176, 66, 62];

// ------------------------------------------------------------------ timing (beat-relative)
const SQUEEZE = [0.0, 1.85];
const MORPH = [0.25, 0.9];                               // crowd shape → square carpet                             // the whole carpet contracts (slightly ahead of the camera zoom)
const LIFT0 = 1.45, LIFT_SPREAD = 0.42, LIFT_DUR = 0.8;  // layer h extrudes at LIFT0 + LIFT_SPREAD·h/15 (+ jitter)
const TILT = [0.7, 1.6];                                 // start, duration of the top-down → side tilt
const SOLID = [2.45, 0.45];                               // particles fuse into the solid block
export const DROP = [0.55, 0.8];                         // beat 6: fall start, duration
const LIFT = 320;                                        // beat 6: lifted before the drop (m)
export const LAND = DROP[0] + DROP[1];

const sOf = (tl, i) => tl.scenes[i].start;

/** Beat 5's pitch: just above eye level, so a sliver of the cube's top face reads (it is a cube, not a panel). The
 *  Burj stands in the cube's front plane and is foreshortened by the same cos(p), so the heights still compare honestly. */
export const P_BURJ = (6 * Math.PI) / 180;
/** View pitch (radians) at global time gt. In beat 5 the view settles low (P_BURJ), so the cube and the Burj stand
 *  on the same ground line and their heights compare honestly; beat 6 flattens it to a pure cross-section. */
export function pitchAt(gt, tl) {
  const t4 = gt - sOf(tl, 4), t5 = gt - sOf(tl, 5), t6 = gt - sOf(tl, 6);
  let p = L.lerp(Math.PI / 2, P_END, L.ease.inOutCubic(L.prog(t4, TILT[0], TILT[1])));
  p = L.lerp(p, P_BURJ, L.ease.inOutCubic(L.prog(t5, 0.25, 1.4)));
  p = L.lerp(p, 0, L.ease.inOutCubic(L.prog(t6, 0.1, 1.3)));
  return p;
}

const YAW = (20 * Math.PI) / 180;
/** Cube yaw (radians): once solid it turns a little to show its shaded right face; square again as it falls. */
export function yawAt(gt, tl) {
  const t4 = gt - sOf(tl, 4), t6 = gt - sOf(tl, 6);
  const y = YAW * L.ease.inOutCubic(L.prog(t4, SOLID[0] + 0.25, 1.2));
  return L.lerp(y, 0, L.ease.inOutCubic(L.prog(t6, 0.1, 1.2)));
}
/** Half of the cube's on-screen width (m) at yaw y. */
export const halfWidth = (y) => HALF * (Math.cos(y) + Math.sin(y));

/** World y of the cube's base (Z = 0 plane): on the ground; in beat 6 it is lifted (while the canyon
 *  opens beneath it), hangs for a beat, then falls to the canyon floor. */
export function cubeBase(gt, tl) {
  const t6 = gt - sOf(tl, 6);
  if (t6 < DROP[0]) return -LIFT * L.ease.inOutCubic(L.prog(t6, 0.12, DROP[0] - 0.17));
  const k = L.prog(t6, DROP[0], DROP[1]);
  return -LIFT + (FLOOR + LIFT) * k * k;   // gravity-like (constant acceleration)
}

/** Landing squash factor on H (1 = rest), decaying spring after impact. */
function squashAt(gt, tl) {
  const a = gt - sOf(tl, 6) - LAND;
  if (a <= 0 || a > 1.2) return 1;
  return 1 - 0.07 * Math.exp(-a * 6) * Math.cos(a * 16);
}

export const proj = (X, Z, H, p, base = 0) => [X, base + Z * Math.sin(p) - H * Math.cos(p)];

// ------------------------------------------------------------------ particles
// Source: 4,096 points scattered evenly inside beat 3's final crowd shape (Rhode Island fill, 2,050 km²).
const CROWD = crowdPts3(1e3);
function inside(P, x, y) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const DOTS = (() => {
  const r = L.rng(4401);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, cx = 0, cy = 0;
  for (const [x, y] of CROWD) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const sp = Math.sqrt((SRC * SRC) / (NS * NS)) * 0.96;
  let pts = [];
  for (let y = y0 + sp / 2; y < y1; y += sp) for (let x = x0 + sp / 2; x < x1; x += sp) {
    const jx = x + (r() - 0.5) * sp * 0.3, jy = y + (r() - 0.5) * sp * 0.3;
    if (inside(CROWD, jx, jy)) pts.push([jx, jy, r()]);
  }
  pts.sort((a, b) => a[2] - b[2]);                 // deterministic shuffle, keep exactly 4,096
  pts = pts.slice(0, NS * NS);
  while (pts.length < NS * NS) pts.push(pts[pts.length % 97].map((u, i) => (i < 2 ? u + sp * 0.3 : r())));
  for (const [x, y] of pts) { cx += x; cy += y; }
  cx /= pts.length; cy /= pts.length;
  const maxR = Math.max(...pts.map(([x, y]) => Math.hypot(x - cx, y - cy)));
  const src = pts.map(([x, y]) => ({ sx: x, sz: y, rad: (0.5 * Math.hypot(x - cx, y - cy)) / maxR + r() * 0.004,
    ang: Math.atan2(y - cy, x - cx), rnd: r(), rnd2: r() }));
  src.sort((p, q) => p.rad - q.rad);   // inner ring → bottom layer (arrives first)
  const out = [];
  for (let h = 0; h < N; h++) {
    const grp = src.slice(h * N * N, (h + 1) * N * N).sort((p, q) => p.ang - q.ang);
    const tg = [];
    for (let ix = 0; ix < N; ix++) for (let iz = 0; iz < N; iz++) {
      const tx = ((ix + 0.5) / N - 0.5) * SIDE, tz = ((iz + 0.5) / N - 0.5) * SIDE;
      tg.push({ tx, tz, ix, iz, ang: Math.atan2(tz, tx) + (Math.hypot(tx, tz) < 1 ? 0 : 0) });
    }
    tg.sort((p, q) => p.ang - q.ang);
    grp.forEach((s, k) => {
      const g = tg[k];
      // its place in the square carpet: a 4×4 block of the 64² grid per cube column, one cell per layer
      const qx = ((g.ix * 4 + (h % 4) + 0.5) / NS - 0.5) * SRC, qz = ((g.iz * 4 + Math.floor(h / 4) + 0.5) / NS - 0.5) * SRC;
      out.push({ ...s, qx, qz, tx: g.tx, tz: g.tz, th: (h + 0.5) * VOX, h, ix: g.ix, iz: g.iz,
        t0: LIFT0 + LIFT_SPREAD * (h / (N - 1)) + s.rnd * 0.06, key: g.iz * N + h });
    });
  }
  return out;
})();
// painter order for landed voxels: back (small Z) to front, bottom to top
const ORDER = DOTS.map((_, i) => i).sort((a, b) => DOTS[a].key - DOTS[b].key);
const SHRINK = SIDE / SRC;   // 1/56.6

function dotPos(d, t, p) {
  // the carpet contracts as a whole (log-scaled, so it stays on screen through the 44x zoom); outer dots
  // lag a little and curl, so the squeeze reads as streams pouring inward…
  const g = L.ease.inOutCubic(L.prog(t, SQUEEZE[0], SQUEEZE[1]));
  const bump = Math.sin(Math.PI * g);
  const F = Math.pow(SHRINK, g) * (1 + 0.3 * bump * d.rad * (0.6 + 0.8 * d.rnd));
  const sw = 0.45 * bump * (0.5 + d.rad);
  const cs = Math.cos(sw), sn = Math.sin(sw);
  // the Rhode Island-shaped crowd reorganises into a square carpet as it contracts
  const m = L.ease.inOutCubic(L.prog(t, MORPH[0] + d.rnd * 0.25, MORPH[1]));
  const ox = L.lerp(d.sx, d.qx, m), oz = L.lerp(d.sz, d.qz, m);
  const cx = (ox * cs - oz * sn) * F, cz = (ox * sn + oz * cs) * F;
  // …then the footprint extrudes upward into the cube, bottom layers first
  const q = L.ease.inOutCubic(L.prog(t, d.t0, LIFT_DUR));
  const X = L.lerp(cx, d.tx, q), Z = L.lerp(cz, d.tz, q);
  const H = d.th * q + VOX / 2 * (1 - q);
  const [x, y] = proj(X, Z, H, p);
  return [x, y, q, F];
}

function drawParticles(c, v, p, alpha) {
  const t = v.t, mpp = v.cam.mpp;
  const s = Math.sin(p), co = Math.cos(p);
  c.save();
  c.globalAlpha *= alpha;
  // one painter pass (back → front, bottom → top): carpet dots, then voxels lifting into place
  const cols = [];
  for (let i = 0; i < 8; i++) cols.push([L.rgba(L.mix(CORAL_HI, CORAL, 0.15 + 0.1 * (1 - i / 7))), L.rgba(L.mix(CORAL, CORAL_LO, 0.5 - 0.42 * (i / 7)))]);
  const carpet = [L.rgba(L.mix(CORAL, CORAL_LO, 0.3)), L.rgba(L.mix(CORAL, L.WHITE, 0.1))];
  const g = L.ease.inOutCubic(L.prog(t, SQUEEZE[0], SQUEEZE[1]));
  for (const i of ORDER) {
    const d = DOTS[i];
    const [x, y, q, F] = dotPos(d, t, p);
    const sx = v.wx(x), sy = v.wy(y);
    if (sx < -30 || sx > L.W + 30 || sy < -30 || sy > L.H + 30) continue;
    if (q <= 0) {
      // starts as a solid sheet (matching beat 3's crowd), then breaks into particles
      const fill = L.lerp(1.08, 0.62, L.ease.inOutCubic(L.prog(t, 0.1, 0.6)));
      const sz = L.clamp(((SRC / NS) * fill * F) / mpp, 1.4, 9);
      c.fillStyle = carpet[d.rnd < 0.5 ? 0 : 1];
      c.fillRect(sx - sz / 2, sy - sz / 2, sz, sz);
      continue;
    }
    // a voxel: lit top face + shaded front face, growing from a carpet dot to a 50 m block
    const vs = L.lerp(((SRC / NS) * 0.62 * F), VOX * 0.94, Math.min(1, q * 1.6));
    // once nearly seated, overlap neighbours by a pixel so no sub-pixel seams show between columns
    const pad = q > 0.8 ? 1 : 0;
    const w = vs / mpp + pad, top = (vs * s) / mpp + pad, fr = (vs * co) / mpp + pad;
    const shade = Math.min(7, Math.floor((d.h / N) * 8));
    c.fillStyle = cols[shade][0];
    c.fillRect(sx - w / 2, sy - (top + fr) / 2, w, top);
    c.fillStyle = cols[shade][1];
    c.fillRect(sx - w / 2, sy - (top + fr) / 2 + top, w, fr);
  }
  // the core of the gathering crowd glows
  L.lightBlob(c, v.wx(0), v.wy(proj(0, 0, 0, p)[1]), 260, CORAL, 0.16 * g);
  c.restore();
}

// ------------------------------------------------------------------ labels
/**
 * The bigLabel small line, drawn by hand so unit symbols keep their case ("800 m", not "800 M"): same font, colour,
 * tracking and entrance as L.bigLabel's. y = the big number's baseline. a = extra alpha, dy = extra offset (swaps).
 */
export function smallLine(ctx, text, x, y, k, align = 'left', a = 1, dy = 0, maxW = 940 - x) {
  if (k <= 0 || a <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  ctx.save();
  ctx.globalAlpha *= L.clamp(k * 1.4) * a;
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 8;
  const size = L.fitSize(ctx, text, maxW - 3 * (text.length - 1), 30, 600, L.FONT.body, 18);
  ctx.font = L.font(size, 600, L.FONT.body);
  ctx.fillStyle = L.rgba([205, 215, 230], 0.95);
  L.trackedText(ctx, text, x, y + 52 + (1 - e) * 18 + dy, 3, align);
  ctx.restore();
}
/** Overlay exit: labels fade out over the last 0.4 s of their beat and are gone at the boundary (no 4-frame pop). */
export const labelOut = (v) => 1 - L.ease.inOutCubic(L.prog(v.t, v.d - 0.4, 0.38));

// ------------------------------------------------------------------ the solid cube
/**
 * Draw the solid cube. opts: { base, p, yaw, a (alpha), sq (H squash), sweep (0..1 light sweep or <0 none) }.
 * A true 3/4 block: lit front face, shaded right face (when yawed), bright top face (when pitched).
 * Exported so a later scene can draw the identical block.
 */
export function drawSolid(c, v, { base = 0, p = P_END, yaw = 0, a = 1, sq = 1, sweep = -1, dull = 0 }) {
  if (a <= 0) return;
  const mpp = v.cam.mpp;
  const s = Math.sin(p), co = Math.cos(p), cy = Math.cos(yaw), sy = Math.sin(yaw);
  const H = SIDE * sq, hw = HALF * (1 + (1 - sq) * 0.6), hz = HALF;
  // corner (X, Z, h) → screen
  const P = (X, Z, h) => { const xr = X * cy - Z * sy, zr = X * sy + Z * cy; return [v.wx(xr), v.wy(base + zr * s - h * co)]; };
  const FL = P(-hw, hz, 0), FR = P(hw, hz, 0), BR = P(hw, -hz, 0);
  const FLt = P(-hw, hz, H), FRt = P(hw, hz, H), BRt = P(hw, -hz, H), BLt = P(-hw, -hz, H);
  const xs = [FL[0], FR[0], BR[0], FLt[0], BLt[0]], ys = [FL[1], FR[1], BR[1], FLt[1], BLt[1], BRt[1]];
  const xl = Math.min(...xs), xr = Math.max(...xs), yT = Math.min(...ys), yBot = Math.max(...ys);
  if (xr < -50 || xl > L.W + 50 || yBot < -50 || yT > L.H + 50) return;
  const w = xr - xl;
  const poly = (pts) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
  const hull = () => { c.beginPath(); [FL, FR, BR, BRt, BLt, FLt].forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
  c.save();
  c.globalAlpha *= a;
  // warm halo behind the block: "us"
  L.lightBlob(c, (xl + xr) / 2, (yT + yBot) / 2, Math.max(w, yBot - yT) * 1.1, CORAL, 0.16 * (1 - dull));
  // right face (in shade: the light comes from the upper left)
  if (BR[0] - FR[0] > 0.4) {
    poly([FR, BR, BRt, FRt]);
    const g = c.createLinearGradient(0, FRt[1], 0, FR[1]);
    g.addColorStop(0, L.rgba(L.mix(CORAL, CORAL_LO, 0.42)));
    g.addColorStop(1, L.rgba(L.mix(CORAL, CORAL_LO, 0.78)));
    c.fillStyle = g;
    c.fill();
    const sg = c.createLinearGradient(FR[0], 0, BR[0], 0);
    sg.addColorStop(0, 'rgba(255,230,220,0.08)');
    sg.addColorStop(1, 'rgba(30,0,8,0.22)');
    c.fillStyle = sg;
    c.fill();
  }
  // top face
  if (Math.abs(FLt[1] - BLt[1]) > 0.4) {
    poly([FLt, FRt, BRt, BLt]);
    const g = c.createLinearGradient(0, Math.min(BLt[1], BRt[1]), 0, Math.max(FLt[1], FRt[1]));
    g.addColorStop(0, L.rgba(L.mix(CORAL_HI, CORAL, 0.35)));
    g.addColorStop(1, L.rgba(CORAL_HI));
    c.fillStyle = g;
    c.fill();
  }
  // front face: lit from the upper left
  const fh = FL[1] - FLt[1];
  if (fh > 0.4) {
    poly([FL, FR, FRt, FLt]);
    const g = c.createLinearGradient(0, Math.min(FLt[1], FRt[1]), 0, Math.max(FL[1], FR[1]));
    g.addColorStop(0, L.rgba(L.mix(CORAL, L.WHITE, 0.06)));
    g.addColorStop(0.55, L.rgba(CORAL));
    g.addColorStop(1, L.rgba(L.mix(CORAL, CORAL_LO, 0.55)));
    c.fillStyle = g;
    c.fill();
    const sg = c.createLinearGradient(FL[0], 0, FR[0], 0);
    sg.addColorStop(0, 'rgba(255,240,230,0.10)');
    sg.addColorStop(0.35, 'rgba(255,240,230,0)');
    sg.addColorStop(1, 'rgba(40,0,10,0.12)');
    c.fillStyle = sg;
    c.fill();
    // the voxel weave: it is made of people (only when it resolves)
    const cell = VOX / mpp;
    if (cell > 6) {
      const ka = L.clamp((cell - 6) / 8) * 0.09;
      const lp = (A, B, f) => [L.lerp(A[0], B[0], f), L.lerp(A[1], B[1], f)];
      c.lineWidth = 1;
      c.beginPath();
      for (let i = 1; i < N; i++) {
        const f = i / N;
        let A = lp(FL, FR, f), B = lp(FLt, FRt, f); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]);
        A = lp(FL, FLt, f); B = lp(FR, FRt, f); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]);
        if (BR[0] - FR[0] > 6) { A = lp(FR, BR, f); B = lp(FRt, BRt, f); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]);
          A = lp(FR, FRt, f); B = lp(BR, BRt, f); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); }
      }
      c.strokeStyle = `rgba(90,20,20,${ka})`;
      c.stroke();
    }
  }
  // light sweep when the block locks in
  if (sweep >= 0 && sweep <= 1) {
    c.save();
    hull(); c.clip();
    const cx = L.lerp(xl - w * 0.6, xr + w * 0.6, L.ease.inOutCubic(sweep));
    const lg = c.createLinearGradient(cx - w * 0.35, yT, cx + w * 0.35, yBot);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.5, `rgba(255,245,235,${0.38 * Math.sin(Math.PI * sweep)})`);
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = lg;
    c.fillRect(xl, yT, w, yBot - yT);
    c.restore();
  }
  // dulled by canyon dust once it has landed: it stops being the brightest thing in the frame
  if (dull > 0) {
    hull();
    c.fillStyle = `rgba(150,112,98,${0.6 * dull})`;
    c.fill();
  }
  // crisp edges: bright top-front edge, lit left edge, the vertical front-right corner, shadowed outline
  c.globalAlpha *= 1 - 0.6 * dull;
  c.lineWidth = Math.max(1, Math.min(2.5, 3 / Math.sqrt(mpp)));
  const seg = (A, B, col) => { c.strokeStyle = col; c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke(); };
  seg(FLt, FRt, 'rgba(255,236,226,0.85)');
  seg(FLt, FL, 'rgba(255,220,205,0.45)');
  if (BR[0] - FR[0] > 0.4) { seg(FRt, FR, 'rgba(255,226,212,0.5)'); seg(FRt, BRt, 'rgba(255,226,212,0.45)'); }
  c.strokeStyle = 'rgba(255,220,205,0.25)';
  c.beginPath(); c.moveTo(FLt[0], FLt[1]); c.lineTo(BLt[0], BLt[1]); c.lineTo(BRt[0], BRt[1]); c.lineTo(BR[0], BR[1]); c.stroke();
  c.restore();
}

/** Soft contact shadow on the ground plane under the cube. */
function drawShadow(c, v, base, p, a, yaw = 0) {
  if (a <= 0) return;
  const s = Math.sin(p);
  const cx = v.wx(60), cy = v.wy(base + HALF * s * 0.35);
  const rx = (halfWidth(yaw) * 2.3) / v.cam.mpp, ry = Math.max(6, (SIDE * 0.85 * s + 60) / v.cam.mpp);
  c.save();
  c.globalAlpha *= a;
  c.translate(cx, cy);
  c.scale(1, ry / rx);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, 'rgba(0,0,0,0.7)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.38)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, Math.max(0, rx), 0, Math.PI * 2); c.fill();
  c.restore();
}

// ------------------------------------------------------------------ landing dust (beat 6)
const DUST = (() => { const r = L.rng(4402); return Array.from({ length: 90 }, () => [r(), r(), r(), r(), r()]); })();
function drawDust(c, v, a) {
  if (a <= 0) return;
  const mpp = v.cam.mpp;
  // a low dust pall that settles over the floor and half-buries the block
  const hk = L.ease.outCubic(L.clamp(a / 0.9));
  if (hk > 0) {
    const cx = v.wx(0), cy = v.wy(FLOOR - 170);
    const rx = 1500 / mpp, ry = 330 / mpp;
    c.save();
    c.translate(cx, cy);
    c.scale(1, ry / rx);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(190,150,128,${0.5 * hk})`);
    g.addColorStop(0.5, `rgba(176,136,116,${0.26 * hk})`);
    g.addColorStop(1, 'rgba(160,120,100,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, Math.max(0, rx), 0, Math.PI * 2); c.fill();
    c.restore();
  }
  if (a > 2.6) return;
  c.save();
  // shock ring along the floor
  const rk = L.ease.outCubic(L.clamp(a / 1.1));
  const rr = (HALF + rk * 1700) / mpp;
  c.strokeStyle = `rgba(255,214,190,${0.5 * (1 - L.clamp(a / 1.1))})`;
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(v.wx(0), v.wy(FLOOR), Math.max(0, rr), Math.max(0, rr * 0.05), 0, 0, Math.PI * 2);
  c.stroke();
  for (const [r1, r2, r3, r4, r5] of DUST) {
    const life = 0.35 + r3 * 0.25;   // the bokeh puffs are gone within 0.6 s of the impact
    if (a > life) continue;
    const k = a / life;
    const side = r1 < 0.5 ? -1 : 1;
    const out = L.ease.outCubic(L.clamp(a / (0.3 + 0.3 * r4)));
    const x = side * (HALF * (0.6 + 0.4 * r2) + out * (250 + r2 * 1300));
    const y = FLOOR - (out * (60 + r5 * 420)) + k * k * 80;
    const rad = (60 + r4 * 160) * (0.5 + k) / mpp;
    c.fillStyle = `rgba(222,186,160,${0.32 * (1 - k) * (1 - k)})`;
    c.beginPath(); c.arc(v.wx(x), v.wy(y), Math.max(0, rad), 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

export default {
  beat: 4,
  chapter: { num: '04', title: 'One cube', sub: 'Everyone, by volume' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: 0.2, name: 'riser', gain: 0.3, pitch: 0.9 },
      { t: 0.45, name: 'shimmer', gain: 0.28, pitch: 1.1 },
      { t: TILT[0] + 0.1, name: 'swish', gain: 0.26, pitch: 0.7 },
      { t: 1.55, name: 'shimmer', gain: 0.2, pitch: 1.4 },
      { t: 2.2, name: 'tick', gain: 0.22, pitch: 1.2 },
      { t: SOLID[0] + 0.15, name: 'impact', gain: 0.45, pitch: 0.8 },
      { t: SOLID[0] + 0.2, name: 'bloom', gain: 0.32, pitch: 1 },
    ];
  },

  drawWorld(ctx, v) {
    const s4 = sOf(v.tl, 4), s7 = sOf(v.tl, 7);
    if (v.gt < s4) return;
    const t7 = v.gt - s7;
    if (t7 >= 0) return;   // s07 draws (and melts) the same cube from the start of beat 7
    const p = pitchAt(v.gt, v.tl);
    const base = cubeBase(v.gt, v.tl);
    const solidK = L.ease.outCubic(L.prog(v.t, SOLID[0], SOLID[1]));
    const handoff = 1 - L.ease.inCubic(L.prog(t7, 0.2, 0.7));
    // fade the carpet in over beat 3's square (hand-over) during the first frames
    const inK = L.ease.outCubic(L.prog(v.t, 0, 0.3));
    const yaw = yawAt(v.gt, v.tl);
    const t6 = v.gt - sOf(v.tl, 6);
    drawShadow(ctx, v, base, p, L.clamp(1 - Math.sin(p) * 1.2) * L.clamp(v.t / 1.5) * handoff * (1 - L.prog(t6, 0.05, 0.4)), yaw);
    if (solidK < 1) drawParticles(ctx, v, p, inK);
    if (solidK > 0) {
      const sweep = L.prog(v.t, SOLID[0] + 0.1, 1.0);
      const dull = L.ease.inOutCubic(L.prog(v.gt - sOf(v.tl, 6), LAND + 0.15, 1.1));
      drawSolid(ctx, v, { base, p, yaw, a: solidK * handoff, sq: squashAt(v.gt, v.tl), sweep: v.t < SOLID[0] + 1.2 ? sweep : -1, dull });
    }
    drawDust(ctx, v, v.gt - sOf(v.tl, 6) - LAND);
  },

  drawOverlay(ctx, v) {
    const k = L.enter(v.t, 2.3, 0.5), out = labelOut(v);
    if (k <= 0 || out <= 0) return;
    ctx.save();
    ctx.globalAlpha *= out;
    L.bigLabel(ctx, { x: 120, y: 600, big: '0.5 km³', k, accent: v.accent });
    smallLine(ctx, '≈ 800 m ON EACH SIDE', 120, 600, k);
    ctx.restore();
  },
};
