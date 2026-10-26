// Builder E: Laniakea, after Tully et al. 2014 (Nature): an orange boundary (the "watershed" of the flows) around
// ~520 million light-years of space, and white velocity flow lines streaming toward the Great Attractor.
// Units: Mly (world frame). Deterministic; streamlines built once.
import * as L from '../../../../engine/runtime/lib.js';
import { GA, VIRGO, CLUSTERS, MLY } from './e-model.js';

const { W, H } = L;
export const LAN_C = [92, 118];                      // centre of the boundary shape (the GA sits in its lower right)
const RX = 285, RY_UP = 228, RY_DN = 192;
const TH_O = Math.atan2(-LAN_C[1], -LAN_C[0]);     // direction from the centre toward us
/** Boundary radius (Mly) in screen-angle th (atan2(dy, dx), y down). */
export function lanR(th) {
  const c = Math.cos(th), s = Math.sin(th), ry = s < 0 ? RY_UP : RY_DN;
  let r = 1 / Math.sqrt((c / RX) ** 2 + (s / ry) ** 2);
  r *= 1 + 0.07 * Math.cos(2 * th + 0.9) + 0.05 * Math.cos(3 * th + 2.1) + 0.035 * Math.cos(5 * th + 0.4) + 0.02 * Math.cos(8 * th + 1.3);
  let d = th - TH_O; d = Math.atan2(Math.sin(d), Math.cos(d));
  r -= 34 * Math.exp(-((d / 0.95) ** 2));
  return r;
}
export const lanPt = (th, f = 1) => { const r = lanR(th) * f; return [LAN_C[0] + r * Math.cos(th), LAN_C[1] + r * Math.sin(th)]; };
function inside(x, y, f = 1) { const th = Math.atan2(y - LAN_C[1], x - LAN_C[0]); return Math.hypot(x - LAN_C[0], y - LAN_C[1]) < lanR(th) * f; }

// exterior attractors (unlabelled): Perseus–Pisces (left) and Shapley (beyond the GA)
const PP = CLUSTERS.find((c) => c.name === 'perseus').p, SH = CLUSTERS.find((c) => c.name === 'shapley').p;
const LOCAL = [[VIRGO, 0.9, 38], [CLUSTERS[2].p, 0.8, 45], [CLUSTERS[3].p, 0.7, 45], [[58, 56], 0.8, 40], [CLUSTERS[8].p, 0.6, 45], [CLUSTERS[7].p, 0.5, 35]];
function flowIn(x, y) {
  let dx = GA[0] - x, dy = GA[1] - y, d = Math.hypot(dx, dy) + 1e-6;
  let vx = dx / d, vy = dy / d;
  for (const [p, m, R] of LOCAL) {
    const ex = p[0] - x, ey = p[1] - y, e = Math.hypot(ex, ey) + 1e-6;
    const w = m * Math.exp(-e / R) * L.clamp(d / 60);
    vx += ex / e * w; vy += ey / e * w;
  }
  // gentle swirl so the lines aren't ruler-straight
  const sw = 0.42 * Math.sin(x / 95 + 1.3) * Math.cos(y / 110 - 0.4) + 0.2 * Math.sin((x + y) / 60);
  return [vx - vy * sw, vy + vx * sw];
}
function flowOut(x, y) {
  const th = Math.atan2(y - LAN_C[1], x - LAN_C[0]);
  const nx = Math.cos(th), ny = Math.sin(th);
  const pick = (Math.hypot(PP[0] - x, PP[1] - y) < Math.hypot(SH[0] - x, SH[1] - y)) ? PP : SH;
  const dx = pick[0] - x, dy = pick[1] - y, d = Math.hypot(dx, dy) + 1e-6;
  return [dx / d * 0.5 + nx, dy / d * 0.5 + ny];
}
function trace(x, y, fn, steps, h, stop) {
  const pts = [[x, y]];
  for (let i = 0; i < steps; i++) {
    let [vx, vy] = fn(x, y), l = Math.hypot(vx, vy) + 1e-9;
    const mx = x + vx / l * h * 0.5, my = y + vy / l * h * 0.5;
    [vx, vy] = fn(mx, my); l = Math.hypot(vx, vy) + 1e-9;
    x += vx / l * h; y += vy / l * h;
    pts.push([x, y]);
    if (stop(x, y)) break;
  }
  return pts;
}
let LINES = null;
export function lines() {
  if (LINES) return LINES;
  const r = L.rng(1402);
  const ins = [], outs = [];
  const stopIn = (x, y) => Math.hypot(x - GA[0], y - GA[1]) < 5 + 4 * r();
  // seeds along the boundary and scattered inside
  for (let i = 0; i < 52; i++) {
    const th = (i + r() * 0.6) / 52 * Math.PI * 2;
    const [x, y] = lanPt(th, 0.95 - 0.06 * r());
    ins.push(trace(x, y, flowIn, 220, 2.5, stopIn));
  }
  for (let k = 0; k < 400 && ins.length < 80; k++) {
    const th = r() * Math.PI * 2, f = Math.sqrt(r()) * 0.88;
    const [x, y] = lanPt(th, f);
    if (Math.hypot(x - GA[0], y - GA[1]) < 40) continue;
    ins.push(trace(x, y, flowIn, 220, 2.5, stopIn));
  }
  for (let i = 0; i < 40; i++) {
    const th = (i + r() * 0.7) / 40 * Math.PI * 2;
    const [x, y] = lanPt(th, 1.04 + 0.08 * r());
    outs.push(trace(x, y, flowOut, 14 + ((r() * 14) | 0), 3.5, () => false));
  }
  const pack = (P) => P.map((pts) => {
    const X = new Float64Array(pts.length), Y = new Float64Array(pts.length), S = new Float64Array(pts.length);
    let s = 0;
    pts.forEach(([x, y], i) => { if (i) s += Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]); X[i] = x; Y[i] = y; S[i] = s; });
    return { X, Y, S, len: s, ph: r(), sp: 0.8 + 0.4 * r() };
  });
  LINES = { ins: pack(ins), outs: pack(outs) };
  return LINES;
}

/** Draw the flow lines. k: visibility; t: seconds (animates the moving streaks). */
export function drawFlows(c, v, k, t) {
  if (k <= 0) return;
  const { ins, outs } = lines();
  const cx = v.cam.x / MLY, cy = v.cam.y / MLY, m = v.cam.mpp / MLY;
  const sx = (x) => W / 2 + (x - cx) / m, sy = (y) => H / 2 + (y - cy) / m;
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  const path = (ln, s0, s1) => {
    c.beginPath();
    let started = false;
    for (let i = 0; i < ln.X.length; i++) {
      if (ln.S[i] < s0) continue;
      if (ln.S[i] > s1) break;
      const x = sx(ln.X[i]), y = sy(ln.Y[i]);
      if (!started) { c.moveTo(x, y); started = true; } else c.lineTo(x, y);
    }
  };
  // exterior lines (fainter): the flows on the other side of the watershed
  c.strokeStyle = `rgba(200,215,240,${0.2 * k})`; c.lineWidth = 1.2;
  for (const ln of outs) { path(ln, 0, ln.len); c.stroke(); }
  // interior lines
  c.strokeStyle = `rgba(240,245,255,${0.2 * k})`; c.lineWidth = 1.2;
  for (const ln of ins) { path(ln, 0, ln.len); c.stroke(); }
  // moving streaks toward the Great Attractor (speed in Mly per second)
  c.globalCompositeOperation = 'lighter';
  c.lineWidth = 2;
  for (const ln of ins) {
    const L0 = ln.len + 60, head = ((t * 22 * ln.sp + ln.ph * L0) % L0);
    const tail = head - 28;
    if (head < 2 || tail > ln.len) continue;
    path(ln, Math.max(0, tail), Math.min(ln.len, head));
    const fade = L.clamp(Math.min(head / 20, (ln.len - tail) / 20));
    c.strokeStyle = `rgba(255,255,255,${0.6 * k * fade})`;
    c.stroke();
  }
  for (const ln of outs) {
    const L0 = ln.len + 50, head = ((t * 22 * ln.sp + ln.ph * L0) % L0), tail = head - 22;
    if (head < 2 || tail > ln.len) continue;
    path(ln, Math.max(0, tail), Math.min(ln.len, head));
    c.strokeStyle = `rgba(220,230,255,${0.32 * k})`;
    c.stroke();
  }
  c.restore();
}

/** Draw the orange boundary; p: 0..1 draw-on progress (grows both ways from the point nearest us). */
export function drawBoundary(c, v, k, p = 1, lw = 2.6) {
  if (k <= 0 || p <= 0) return;
  const cx = v.cam.x / MLY, cy = v.cam.y / MLY, m = v.cam.mpp / MLY;
  const N = 240, half = Math.PI * p;
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  const trace2 = () => {
    c.beginPath();
    for (let i = 0; i <= N; i++) {
      const th = TH_O - half + (2 * half) * i / N;
      const [x, y] = lanPt(th);
      const X = W / 2 + (x - cx) / m, Y = H / 2 + (y - cy) / m;
      if (i) c.lineTo(X, Y); else c.moveTo(X, Y);
    }
  };
  trace2();
  c.strokeStyle = `rgba(255,140,50,${0.16 * k})`; c.lineWidth = lw * 4; c.stroke();
  c.strokeStyle = `rgba(255,160,70,${0.9 * k})`; c.lineWidth = lw; c.stroke();
  c.restore();
}
/** Screen point on the boundary at angle th (screen radians). */
export function boundaryScreen(v, th) {
  const cx = v.cam.x / MLY, cy = v.cam.y / MLY, m = v.cam.mpp / MLY;
  const [x, y] = lanPt(th);
  return [W / 2 + (x - cx) / m, H / 2 + (y - cy) / m];
}
export const toScreen = (v, p) => [W / 2 + (p[0] - v.cam.x / MLY) / (v.cam.mpp / MLY), H / 2 + (p[1] - v.cam.y / MLY) / (v.cam.mpp / MLY)];
