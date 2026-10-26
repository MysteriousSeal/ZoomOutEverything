// Environment for "How Old Is Everything?" (EP 22). Owned by the orchestrator — builders: import helpers, don't edit.
//
// drawBackground: deep gradient → time dust (3 parallax layers, log-spaced, they stream into "now" as we zoom out)
//   → faint stars in deep time → the TIMELINE RULER (adaptive ticks: years → thousands → millions → billions, the
//   NOW marker, the 13.8-billion-year end cap) → the TRACK (beats 10–12: it unfolds out of the ruler; far = the whole
//   stadium, near = lane 5 at the finish with world-locked granule textures) → the metres TAPE (track phase).
// drawHud: topBar + the AGE READOUT (top right: "4,580 / YEARS AGO", then "0.48 m / = 66 MILLION YEARS").
// See camera.js for world units (x = −years ago; track metres × YR_PER_M).
import * as L from '../../../engine/runtime/lib.js';
import { topBar, beatCues, stars } from '../../../engine/runtime/kit.js';
import {
  AGE, RULER_Y, YR_PER_M, M_PER_YR, LANE_W, LANES, LINE_W, TRACK_Y0, TRACK_Y1, BEND, CAM_KEYS, cameraTimeline, diveStart,
} from './camera.js';
import { at as camAt } from './camera.js';

const { W, H } = L;
export const ACCENT = [120, 210, 230];
export const INK = [232, 236, 240];
export const SURFACE = [164, 60, 46];          // track polyurethane (muted brick red)
export const APRON = [120, 44, 36];
export const GRASS = [34, 70, 50];
export const PAINT = [240, 238, 232];
export { RULER_Y };

// ------------------------------------------------------------------ coordinate helpers (for scenes)
/** screen x of a moment `years` ago */
export const tx = (v, years) => v.wx(-years);
/** screen y of the ruler (world y = 0) */
export const rulerY = (v) => v.wy(0);
/** screen x of a point `m` metres BEFORE the finish line (track phase; negative m = past the line) */
export const mx = (v, m) => v.wx(-m * YR_PER_M);
/** screen y of a lateral track coordinate `w` metres (lane 1 inner edge −4.88, lane 8 outer edge +4.88) */
export const my = (v, w) => v.wy(w * YR_PER_M);
/** pixels for a track length in metres */
export const mpx = (v, m) => (m * YR_PER_M) / v.cam.mpp;
/** years → pixels at the current zoom */
export const ypx = (v, years) => years / v.cam.mpp;

/** Track phase 0..1: 0 through beat 9, eases in over the first ~1.4 s of beat 10 (the ruler becomes the track). */
export function trackK(v) {
  const s = v.tl.scenes[10];
  return s ? L.ease.inOutCubic(L.prog(v.gt, s.start + 0.15, 1.4)) : 0;
}
/** Timeline phase 0..1 (ruler, ticks, dust): fades out as the track arrives. */
export const timelineK = (v) => 1 - L.clamp(trackK(v) * 1.25);

// ------------------------------------------------------------------ formatting
/** Tick label: "50 YRS", "5,000 YRS", "500,000 YRS", "50 MILLION", "1 BILLION". */
export function fmtYears(y) {
  if (y < 1e6) return `${L.fmt(y)} YRS`;
  if (y < 1e9) return `${L.fmt(y / 1e6)} MILLION`;
  return `${L.fmt(y / 1e9, y % 1e9 ? 1 : 0)} BILLION`;
}
/** Readout / label number: "80", "4,580", "300,000", "66 MILLION", "4.54 BILLION", "13.8 BILLION". */
export function fmtAgo(y) {
  if (y < 1e4) return L.fmt(Math.round(y));
  if (y < 1e6) return L.fmt(Math.round(y / 1000) * 1000);
  if (y < 1e9) return `${L.fmt(y / 1e6, y < 1e7 ? 1 : 0)} MILLION`;
  return `${L.fmt(y / 1e9, y < 1e10 ? 2 : 1)} BILLION`;
}
/** Track length: "100 m", "0.48 m", "2.2 mm", "0.04 mm". */
export function fmtTrack(m) {
  if (m >= 10) return `${L.fmt(m)} m`;
  if (m >= 0.1) return `${L.fmt(m, 2)} m`;
  if (m >= 0.001) return `${L.fmt(m * 1000, 1)} mm`;
  return `${L.fmt(m * 1000, 2)} mm`;
}
/** Tape tick label (metres before the finish): "50 m", "20 cm", "5 mm", "0.05 mm", "5 µm". */
export function fmtTape(m) {
  if (m >= 1) return `${L.fmt(m)} m`;
  if (m >= 0.01) return `${L.fmt(m * 100)} cm`;
  if (m >= 0.001) return `${L.fmt(m * 1000)} mm`;
  if (m >= 1e-5) return `${L.fmt(m * 1000, m >= 1e-4 ? 1 : 2)} mm`;
  return `${L.fmt(m * 1e6)} µm`;
}

// ------------------------------------------------------------------ shared drawing helpers (for scenes)
/** Horizontal bracket over [x0, x1] at screen y (ticks point toward the ruler: side 'above' = ticks down). */
export function hBracket(c, x0, x1, y, k = 1, color = INK, label = '', side = 'above', size = 30) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  const mid = (x0 + x1) / 2, a = L.lerp(mid, x0, e), b = L.lerp(mid, x1, e);
  const dy = side === 'above' ? 14 : -14;
  c.save();
  c.strokeStyle = L.rgba(color, 0.9);
  c.lineWidth = 3;
  c.lineJoin = 'round';
  c.beginPath(); c.moveTo(a, y + dy); c.lineTo(a, y); c.lineTo(b, y); c.lineTo(b, y + dy); c.stroke();
  if (label) {
    c.globalAlpha *= L.clamp(k * 2 - 1);
    const s = L.fitSize(c, label, Math.max(60, Math.abs(x1 - x0) + 120), size, 700, L.FONT.body, 16);
    c.font = L.font(s, 700, L.FONT.body);
    c.fillStyle = L.rgba(color);
    c.textBaseline = side === 'above' ? 'alphabetic' : 'top';
    c.shadowColor = 'rgba(2,6,12,0.8)';
    c.shadowBlur = 10;
    L.trackedText(c, label, mid, side === 'above' ? y - 14 : y + 14, 1, 'center');
  }
  c.restore();
}

/** A past landmark that has slid toward now: small dot on the ruler + a tiny tag above it. k = visibility. */
export function landmark(c, v, years, { k = 1, label = '', color = INK, r = 5 } = {}) {
  if (k <= 0) return;
  const x = tx(v, years), y = rulerY(v);
  if (x < -40 || x > W + 40) return;
  c.save();
  c.globalAlpha *= L.clamp(k);
  c.fillStyle = L.rgba(color, 0.95);
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); c.fill();
  if (label) {
    c.fillRect(x - 1, y - 30, 2, 22);
    c.font = L.font(20, 600, L.FONT.body);
    c.fillStyle = L.rgba(color, 0.85);
    c.textBaseline = 'alphabetic';
    c.shadowColor = 'rgba(2,6,12,0.8)';
    c.shadowBlur = 8;
    L.trackedText(c, label.toUpperCase(), x, y - 38, 2, 'center');
  }
  c.restore();
}

/** Vertical pin from the ruler up to a subject's base (screen px). */
export function pin(c, x, yBase, yTop, k = 1, color = ACCENT) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  c.strokeStyle = L.rgba(color, 0.8);
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(x, yBase); c.lineTo(x, L.lerp(yBase, yTop, e)); c.stroke();
  c.fillStyle = L.rgba(color);
  c.beginPath(); c.arc(x, yBase, 6, 0, Math.PI * 2); c.fill();
  c.restore();
}

// ------------------------------------------------------------------ background: gradient + dust + stars
const DUST = (() => {
  const r = L.rng(2207), out = [];
  for (const [p, n, size, a] of [[0.55, 70, 1.1, 0.16], [0.8, 60, 1.6, 0.22], [1.0, 40, 2.4, 0.3]]) {
    for (let i = 0; i < n; i++) out.push({ p, u: r(), y: 320 + r() * 1180, s: size * (0.6 + r() * 0.8), a: a * (0.5 + r() * 0.5), ph: r() * 6.28 });
  }
  return out;
})();

function drawDust(c, v, k) {
  if (k <= 0) return;
  const lm = Math.log10(v.cam.mpp), nowX = v.wx(0);
  c.save();
  for (const d of DUST) {
    // log-periodic position: each particle sits 10^(3s) px from now; zooming out slides it toward now
    const s = ((d.u - (d.p * lm) / 3) % 1 + 1) % 1;
    const dist = Math.pow(10, s * 3.1);
    const x = nowX - dist;
    if (x < -10) continue;
    const a = d.a * k * L.smoothstep(L.clamp((dist - 40) / 160)) * L.smoothstep(L.clamp(s * 6)) * L.smoothstep(L.clamp((1 - s) * 6));
    if (a <= 0.005) continue;
    const yy = d.y + Math.sin(v.gt * 0.4 + d.ph) * 6;
    c.fillStyle = `rgba(190,230,240,${a})`;
    c.beginPath(); c.arc(x, yy, Math.max(0, d.s), 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

// ------------------------------------------------------------------ the timeline ruler
// tick sequence 1, 5, 10, 50, 100 … (each divides the next, so every tick has one well-defined level)
const stepAt = (k) => Math.pow(10, Math.floor(k / 2)) * (k % 2 ? 5 : 1);

function drawRuler(c, v, k) {
  if (k <= 0) return;
  const mpp = v.cam.mpp, y = rulerY(v), nowX = v.wx(0);
  const leftYears = Math.min(AGE.universe, -(v.cam.x - (W / 2) * mpp));   // years ago at the left screen edge
  const capX = tx(v, AGE.universe);
  c.save();
  c.globalAlpha = k;
  // the line: past (solid) from the 13.8 Gyr cap (or the screen edge) to now; the future dashed and faint
  const x0 = Math.max(-10, capX);
  c.shadowColor = L.rgba(ACCENT, 0.5);
  c.shadowBlur = 12;
  c.strokeStyle = 'rgba(225,236,242,0.82)';
  c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(x0, y); c.lineTo(nowX, y); c.stroke();
  c.shadowBlur = 0;
  c.setLineDash([6, 10]);
  c.strokeStyle = 'rgba(225,236,242,0.25)';
  c.beginPath(); c.moveTo(nowX + 8, y); c.lineTo(W + 10, y); c.stroke();
  c.setLineDash([]);
  if (capX > -20) {   // the beginning of time
    c.fillStyle = 'rgba(225,236,242,0.9)';
    c.fillRect(capX - 1.5, y - 22, 3, 44);
  }
  // ticks
  let k0 = 0;
  while (stepAt(k0) / mpp < 10) k0++;
  while (k0 > -40 && stepAt(k0 - 1) / mpp >= 10) k0--;
  const s0 = stepAt(k0), N = Math.floor(leftYears / s0);
  c.font = L.font(22, 600, L.FONT.body);
  c.textBaseline = 'alphabetic';
  for (let n = 1; n <= N; n++) {
    let lv = k0;
    for (let kk = k0 + 1; kk < k0 + 12; kk++) { const m = Math.round(stepAt(kk) / s0); if (n % m === 0) lv = kk; else break; }
    const px = stepAt(lv) / mpp, pos = n * s0, x = tx(v, pos);
    if (x < -20 || x > nowX - 4) continue;
    const at = L.clamp((px - 10) / 40), len = 7 + 13 * L.clamp((px - 60) / 200);
    c.fillStyle = `rgba(225,236,242,${0.6 * at})`;
    c.fillRect(x - 1, y - len, 2, len);
    const al = L.clamp((px - 210) / 110) * L.clamp((nowX - 80 - x) / 50) * L.clamp((x - 50) / 40);
    if (al > 0.01 && pos >= 1) {
      c.fillStyle = `rgba(205,218,228,${0.8 * al})`;
      L.trackedText(c, fmtYears(pos), x, y + 44, 1.5, 'center');
    }
  }
  // NOW
  const pulse = 0.5 + 0.5 * Math.sin(v.gt * 3);
  L.lightBlob(c, nowX, y, 40 + 10 * pulse, ACCENT, 0.35);
  c.fillStyle = L.rgba(ACCENT);
  c.fillRect(nowX - 1.5, y - 26, 3, 52);
  c.beginPath(); c.arc(nowX, y, 7, 0, Math.PI * 2); c.fill();
  c.font = L.font(24, 700, L.FONT.body);
  L.trackedText(c, 'NOW', nowX, y + 58, 3, 'center');
  c.restore();
}

// ------------------------------------------------------------------ the track
const CY = TRACK_Y0 - BEND.r;   // bend centres' lateral position (m), −41.38
/** stadium outline (metres) at radius r from the bend centres; finish line at u = 0 (where the far-side bend begins) */
function stadiumPts(r, n = 160) {
  const pts = [[-BEND.straight, CY + r], [0, CY + r]];
  for (let i = 1; i < n; i++) { const a = Math.PI / 2 - (Math.PI * i) / n; pts.push([r * Math.cos(a), CY + r * Math.sin(a)]); }
  pts.push([0, CY - r], [-BEND.straight, CY - r]);
  for (let i = 1; i < n; i++) { const a = -Math.PI / 2 - (Math.PI * i) / n; pts.push([-BEND.straight + r * Math.cos(a), CY + r * Math.sin(a)]); }
  return pts;
}
const STAD = {};
const stad = (r) => (STAD[r] ??= stadiumPts(r));
const CHUTE = -104;   // the 100 m start sits in a straight extension ("chute") beyond the bend: start line at −100 m

function farTrack(c, v, k, g) {
  const P = (u, w) => [v.wx(u * YR_PER_M), v.wy(w * YR_PER_M * g)];
  const poly = (pts) => { c.beginPath(); pts.forEach(([u, w], i) => { const [x, y] = P(u, w); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); };
  const rect = (u0, u1, w0, w1) => { const [x0, y0] = P(u0, w0), [x1, y1] = P(u1, w1); c.rect(x0, y0, x1 - x0, y1 - y0); };
  const rOut = BEND.r + LANES * LANE_W;
  c.save();
  c.globalAlpha = k;
  // the stadium around the track (fades in as the camera closes in, so the whole-track view stays clean):
  // seating bowl with seat rows, perimeter wall, concourse walkway, outer grass verge
  const sk = L.clamp((1.6e7 - v.cam.mpp) / 5e6);
  if (sk > 0) {
    c.save();
    c.globalAlpha = k * sk;
    c.fillStyle = 'rgb(30,40,50)'; poly(stad(rOut + 70)); c.fill();
    const rowPx = (0.85 * YR_PER_M) / v.cam.mpp;
    if (rowPx > 2.5) {
      c.lineWidth = Math.max(1, rowPx * 0.5);
      for (let r = rOut + 10.4, i = 0; r < rOut + 70; r += 0.85, i++) {
        c.strokeStyle = i % 2 ? 'rgb(48,66,80)' : 'rgb(52,72,88)';
        poly(stad(Math.round(r * 100) / 100)); c.stroke();
      }
    }
    c.fillStyle = 'rgb(22,26,32)'; poly(stad(rOut + 9.8)); c.fill();          // wall
    c.fillStyle = 'rgb(150,156,160)'; poly(stad(rOut + 9.25)); c.fill();      // wall top edge
    c.fillStyle = 'rgb(62,68,74)'; poly(stad(rOut + 9.1)); c.fill();          // concourse
    c.fillStyle = 'rgb(30,62,44)'; poly(stad(rOut + 5.5)); c.fill();          // verge
    c.restore();
  }
  // apron, track, infield
  c.fillStyle = L.rgba(APRON); poly(stad(rOut + 1.2)); c.fill();
  c.beginPath(); rect(CHUTE - 1.2, -BEND.straight + 1, TRACK_Y0 - 0.6, TRACK_Y1 + 1.2); c.fill();
  c.fillStyle = L.rgba(SURFACE); poly(stad(rOut)); c.fill();
  c.beginPath(); rect(CHUTE, -BEND.straight + 1, TRACK_Y0, TRACK_Y1); c.fill();
  c.fillStyle = L.rgba(GRASS); poly(stad(BEND.r)); c.fill();
  // mowing stripes, clipped to the infield
  c.save(); poly(stad(BEND.r - 0.3)); c.clip();
  c.fillStyle = 'rgba(255,255,255,0.035)';
  for (let u = -BEND.straight - 40; u < 40; u += 10) { c.beginPath(); rect(u, u + 5, CY - 40, CY + 40); c.fill(); }
  c.restore();
  // lane lines
  const lw = (LINE_W * YR_PER_M) / v.cam.mpp;
  c.strokeStyle = L.rgba(PAINT, 0.85 * L.clamp(lw * 1.6 + 0.25));
  c.lineWidth = Math.max(1, lw);
  for (let i = 0; i <= LANES; i++) {
    poly(stad(BEND.r + i * LANE_W)); c.stroke();
    const [ax, ay] = P(CHUTE, TRACK_Y0 + i * LANE_W), [bx] = P(-BEND.straight, 0);
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, ay); c.stroke();
  }
  // finish line (leading edge = now) and the 100 m start line
  c.fillStyle = L.rgba(PAINT);
  c.beginPath(); rect(0, LINE_W, TRACK_Y0, TRACK_Y1); c.fill();
  c.beginPath(); rect(-100 - LINE_W, -100, TRACK_Y0, TRACK_Y1); c.fill();
  c.restore();
}

// ------------------------------------------------------------------ track surface texture (world-locked, every zoom)
// A real sprayed-EPDM athletics surface: packed rubber granules (~1.5–2.5 mm) with dark binder crevices between them,
// and a matte, finely pitted rubber skin on each granule. ONE granule lattice (2 mm cells, periodic every 8 cells =
// 16 mm) is shared by the raster tile (far/mid zoom, with mips) and the vector close-up (granules > ~60 px), so the
// two match exactly through the dive. The texture is pure luminance shading (dark crevices, soft top-left light), so it
// sits correctly on the red surface AND on the white finish paint. Lazy: no DOM at import time.
const GR = { G: 0.0016, N: 10, PX: 1024 };          // main grains: cell (m), cells per tile, tile texels
GR.T = GR.G * GR.N;                                  // tile size (m) = 16 mm
const ghash = (i, j, s) => { const x = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return x - Math.floor(x); };
// lattice phase: a big grain's centre sits under the hair close-up (u −0.1 mm, lane-5 camera row) so that view is one
// grain's skin, not a crevice
const G_ANCHOR = { u: -0.0001, w: 0.77 - 0.00002 };
/** One periodic granule lattice: N×N cells of size G (tile N·G = 16 mm), Voronoi grains shrunk about their seeds. */
function lattice(G, N, salt, shrink0, shrinkVar) {
  const md = (i) => ((i % N) + N) % N;
  const seed = (i, j) => [(i + 0.26 + 0.48 * ghash(md(i), md(j), salt + 1)) * G, (j + 0.26 + 0.48 * ghash(md(i), md(j), salt + 2)) * G];
  const cells = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const p = seed(i, j);
    let poly = [[p[0] - 2 * G, p[1] - 2 * G], [p[0] + 2 * G, p[1] - 2 * G], [p[0] + 2 * G, p[1] + 2 * G], [p[0] - 2 * G, p[1] + 2 * G]];
    for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
      if (!di && !dj) continue;
      const q = seed(i + di, j + dj), nx = q[0] - p[0], ny = q[1] - p[1], mx_ = (p[0] + q[0]) / 2, my_ = (p[1] + q[1]) / 2;
      const f = (pt) => (pt[0] - mx_) * nx + (pt[1] - my_) * ny;   // ≤ 0 inside
      const out = [];
      for (let k = 0; k < poly.length; k++) {
        const a = poly[k], b = poly[(k + 1) % poly.length], fa = f(a), fb = f(b);
        if (fa <= 0) out.push(a);
        if ((fa <= 0) !== (fb <= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
      }
      poly = out;
    }
    // shrink about the seed (irregular crevices); jitter each corner so grains read as rounded-angular chunks
    const h = (s) => ghash(i, j, salt + s);
    const shrink = shrink0 + shrinkVar * h(3);
    const pts = poly.map(([x, y], k) => { const r = shrink * (0.86 + 0.24 * ghash(i * 7 + k, j * 13 + k, salt + 4)); return [(x - p[0]) * r, (y - p[1]) * r]; });
    // Chaikin-smooth twice, with a little radial wobble, so grains read as rounded pebbles, not cut tiles
    let sm = pts;
    for (let it = 0; it < 2; it++) {
      const o = [];
      for (let k = 0; k < sm.length; k++) { const a = sm[k], b = sm[(k + 1) % sm.length]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
      sm = o;
    }
    sm = sm.map(([x, y], k) => { const f = 1 + 0.06 * (ghash(i * 3 + k, j * 5 + k, salt + 7) - 0.5); return [x * f, y * f]; });
    pts.length = 0; pts.push(...sm);
    let R = 0;
    for (const [x, y] of pts) R = Math.max(R, Math.abs(x), Math.abs(y));
    cells.push({ i, j, p, pts, R, tone: h(5) * 2 - 1 });
  }
  return { cells, G, N };
}
let GRAN = null;
function granules() {
  if (GRAN) return GRAN;
  // three sizes, packed: ~1.3 mm grains on top, ~0.75 mm and ~0.45 mm grains bedded progressively deeper
  const big = lattice(GR.G, GR.N, 0, 0.66, 0.26);
  const mid = lattice(GR.T / 18, 18, 40, 0.6, 0.3); mid.depth = 0.5;
  const small = lattice(GR.T / 30, 30, 80, 0.62, 0.3); small.depth = 1;
  big.depth = 0;
  GRAN = { layers: [small, mid, big], OFF_U: G_ANCHOR.u - big.cells[0].p[0], OFF_W: G_ANCHOR.w - big.cells[0].p[1] };
  return GRAN;
}

/** Trace one grain (local metres → screen via X/Y): a rounded pebble through its corner midpoints. */
function granulePath(c, cell, X, Y, dx = 0, dy = 0) {
  const P = cell.pts, n = P.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  c.beginPath();
  const m0 = mid(P[n - 1], P[0]);
  c.moveTo(X(m0[0]) + dx, Y(m0[1]) + dy);
  for (let k = 0; k < n; k++) { const v = P[k], m = mid(v, P[(k + 1) % n]); c.quadraticCurveTo(X(v[0]) + dx, Y(v[1]) + dy, X(m[0]) + dx, Y(m[1]) + dy); }
  c.closePath();
}

/** Shade one grain (the binder wash is already cut out under it): a matte rubber dome lit from the top left, tone
 *  variation, a soft specular glint; deeper grains sit darker in the bed. s = screen px per metre. */
function shadeGranule(c, cell, X, Y, s, depth = 0) {
  granulePath(c, cell, X, Y);
  const t = cell.tone, R = cell.R;
  c.fillStyle = t < 0 ? `rgba(30,8,5,${-t * 0.14 + depth * 0.3})` : `rgba(255,236,226,${t * 0.07 * (1 - depth)})`;
  if (t >= 0 && depth > 0) { c.fill(); c.fillStyle = `rgba(30,8,5,${depth * 0.3})`; }
  c.fill();
  const cx = X(-R * 0.32), cy = Y(-R * 0.38), rr = Math.max(1, R * s * 1.45);
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, rr);
  g.addColorStop(0, `rgba(255,240,230,${0.2 * (1 - depth * 0.6)})`);
  g.addColorStop(0.4, 'rgba(255,240,230,0.02)');
  g.addColorStop(0.72, 'rgba(22,6,4,0.12)');
  g.addColorStop(1, 'rgba(22,6,4,0.42)');
  c.fillStyle = g;
  c.fill();
  // a soft sheen glint (polyurethane-bound rubber is matte with a faint gloss)
  const gl = 0.08 + 0.16 * ghash(cell.i, cell.j, 9);
  if (depth < 0.6 && R * s > 6) {
    const gx = X(-R * (0.3 + 0.15 * ghash(cell.i, cell.j, 10))), gy = Y(-R * (0.35 + 0.1 * ghash(cell.i, cell.j, 11))), gr = R * s * 0.28;
    const sg = c.createRadialGradient(gx, gy, 0, gx, gy, gr);
    sg.addColorStop(0, `rgba(255,250,245,${gl})`); sg.addColorStop(1, 'rgba(255,250,245,0)');
    c.fillStyle = sg;
    c.fill();
  }
}
const CREVICE = 'rgba(12,3,2,0.82)';

/** Paint the whole granule stack onto g: binder wash, then each layer deep → top: soft ambient-occlusion shadow on
 *  what lies below, cut the grain out of the wash, shade it. each(layer, fn) enumerates (cell, X, Y); s = px/m. */
function paintGrains(g, W_, H_, s, each) {
  g.fillStyle = CREVICE; g.fillRect(0, 0, W_, H_);
  for (const layer of GRAN.layers) {
    const blur = Math.min(40, layer.G * s * 0.16);
    if (layer.depth < 1 && blur > 0.6) {
      g.save();
      // soft shadow only: draw the shape far off-canvas and throw its blurred shadow back into place
      const OFF = 20000;
      g.fillStyle = '#000';
      g.shadowColor = 'rgba(8,2,1,0.7)'; g.shadowBlur = blur;
      each(layer, (cell, X, Y) => { const o = cell.R * s * 0.1; g.shadowOffsetX = OFF + o; g.shadowOffsetY = o * 1.3; granulePath(g, cell, X, Y, -OFF, 0); g.fill(); });
      g.restore();
    }
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = '#000';
    each(layer, (cell, X, Y) => { granulePath(g, cell, X, Y); g.fill(); });
    g.globalCompositeOperation = 'source-over';
    each(layer, (cell, X, Y) => shadeGranule(g, cell, X, Y, s, layer.depth));
  }
}
let TILES = null;
function mips(base) {
  const out = [base];
  for (let k = 1; k < 5; k++) {
    const prev = out[k - 1], sz = prev.width / 2, t = new OffscreenCanvas(sz, sz), g = t.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.filter = 'blur(0.6px)';   // pre-filter each level so sub-texel grains average to tone
    g.drawImage(prev, 0, 0, sz, sz);
    g.filter = 'none';
    out.push(t);
  }
  return out;
}
function makeTiles() {
  const { PX, T } = GR, S = PX / T;   // texels per metre
  // granule tile
  const A = new OffscreenCanvas(PX, PX), a = A.getContext('2d');
  granules();
  paintGrains(a, PX, PX, S, (layer, fn) => {
    for (const cell of layer.cells) for (const ox of [-PX, 0, PX]) for (const oy of [-PX, 0, PX]) {
      const cx = cell.p[0] * S + ox, cy = cell.p[1] * S + oy, rr = cell.R * S * 1.3 + 4;
      if (cx + rr < 0 || cx - rr > PX || cy + rr < 0 || cy - rr > PX) continue;
      fn(cell, (x) => cx + x * S, (y) => cy + y * S);
    }
  });
  // granule skin: matte rubber, fine pits and specks (two scales, luminance only)
  const skin = (seed, n, rmin, rmax, dark, light) => {
    const t = new OffscreenCanvas(PX, PX), g = t.getContext('2d'), r = L.rng(seed);
    for (let i = 0; i < n; i++) {
      const cx = r() * PX, cy = r() * PX, rad = rmin + (rmax - rmin) * r() * r(), isDark = r() < 0.62, al = r();
      const sq = 0.6 + 0.4 * r(), rot = r() * 3.14;
      g.fillStyle = isDark ? `rgba(28,7,4,${dark * (0.35 + 0.65 * al)})` : `rgba(255,232,220,${light * (0.35 + 0.65 * al)})`;
      for (const ox of [-PX, 0, PX]) for (const oy of [-PX, 0, PX]) {
        if (cx + ox + rad < 0 || cx + ox - rad > PX || cy + oy + rad < 0 || cy + oy - rad > PX) continue;
        g.beginPath(); g.ellipse(cx + ox, cy + oy, Math.max(0, rad), Math.max(0, rad * sq), rot, 0, 6.28); g.fill();
      }
    }
    return t;
  };
  const B = skin(12, 4200, 0.6, 3.6, 0.15, 0.1);   // 0.4 mm tile: pits and grit on a grain's skin
  const C = skin(13, 3600, 0.5, 2.6, 0.08, 0.06);   // 0.05 mm tile: micro-roughness
  // broad mottle (wear, spray density): soft blotches over ~0.5 m, breaks the tile repeat at mid zoom
  const D = new OffscreenCanvas(PX, PX), d = D.getContext('2d'), rd = L.rng(14);
  for (let i = 0; i < 70; i++) {
    const cx = rd() * PX, cy = rd() * PX, rad = 30 + rd() * 110, dark = rd() < 0.55, al = 0.02 + rd() * 0.035;
    for (const ox of [-PX, 0, PX]) for (const oy of [-PX, 0, PX]) {
      const g = d.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, rad);
      const col = dark ? '30,8,5' : '255,232,220';
      g.addColorStop(0, `rgba(${col},${al})`); g.addColorStop(1, `rgba(${col},0)`);
      d.fillStyle = g; d.fillRect(cx + ox - rad, cy + oy - rad, rad * 2, rad * 2);
    }
  }
  return [
    { mip: mips(A), m: T, kind: 'gran' },
    { mip: mips(B), m: 0.0004, kind: 'skin' },
    { mip: mips(C), m: 0.00005, kind: 'micro' },
    { mip: mips(D), m: 0.5, kind: 'mottle' },
  ];
}

// full-screen scratch layer for the vector close-up (lazy)
let GLAYER = null;
const VEC = { on: 700, off: 1400 };   // mpp (yr/px) where the vector granules take over from the raster tile

function patternLayer(c, v, T, alpha, origin, rot = 0, mul = 1) {
  if (alpha <= 0.01) return;
  const mpp = v.cam.mpp, tw = T.m * mul * YR_PER_M;
  const ts = tw / GR.PX / mpp;                                   // screen px per texel (level 0)
  const lf = L.clamp(Math.log2(1.5 / ts), 0, T.mip.length - 1);   // mip level so texels stay ≥ ~1.5 px (no aliasing)
  const l0 = Math.floor(lf), fr = lf - l0;
  const TM = T.m * mul;
  const ou = origin.u + Math.floor((v.cam.x * M_PER_YR - origin.u) / TM) * TM;
  const ow = origin.w + Math.floor((v.cam.y * M_PER_YR - origin.w) / TM) * TM;
  const ox = v.wx(ou * YR_PER_M), oy = v.wy(ow * YR_PER_M);
  for (const [lv, w] of [[l0, 1 - fr], [Math.min(l0 + 1, T.mip.length - 1), fr]]) {
    if (w <= 0.01) continue;
    const img = T.mip[lv], sc = ts * (GR.PX / img.width);
    const pat = c.createPattern(img, 'repeat');
    pat.setTransform(new DOMMatrix().translate(ox, oy).rotate(rot).scale(sc));
    c.save();
    c.globalAlpha = alpha * w;
    c.imageSmoothingEnabled = true;
    c.fillStyle = pat;
    c.fillRect(0, 0, W, H);
    c.restore();
  }
}

function vectorGranules(c, v, alpha) {
  if (alpha <= 0.01) return;
  const { OFF_U, OFF_W } = granules();
  const mpp = v.cam.mpp, s = YR_PER_M / mpp;                     // screen px per metre
  const u0 = (v.cam.x - (W / 2 + 40) * mpp) * M_PER_YR, u1 = (v.cam.x + (W / 2 + 40) * mpp) * M_PER_YR;
  const an = v.cam.anchor ?? 0.5;
  const w0 = (v.cam.y - (H * an + 40) * mpp) * M_PER_YR, w1 = (v.cam.y + (H * (1 - an) + 40) * mpp) * M_PER_YR;
  const lists = new Map();
  for (const layer of GRAN.layers) {
    const { G, N, cells } = layer, list = [];
    const i0 = Math.floor((u0 - OFF_U) / G) - 1, i1 = Math.floor((u1 - OFF_U) / G) + 1;
    const j0 = Math.floor((w0 - OFF_W) / G) - 1, j1 = Math.floor((w1 - OFF_W) / G) + 1;
    if ((i1 - i0 + 1) * (j1 - j0 + 1) > 6000) return;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const cell = cells[(((j % N) + N) % N) * N + (((i % N) + N) % N)];
      const pu = OFF_U + (i - cell.i) * G + cell.p[0], pw = OFF_W + (j - cell.j) * G + cell.p[1];
      const cx = v.wx(pu * YR_PER_M), cy = v.wy(pw * YR_PER_M), rr = cell.R * s * 1.3 + 6;
      if (cx + rr < 0 || cx - rr > W || cy + rr < 0 || cy - rr > H) continue;
      list.push([cell, (x) => cx + x * s, (y) => cy + y * s]);
    }
    lists.set(layer, list);
  }
  GLAYER ??= new OffscreenCanvas(W, H);
  const g = GLAYER.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, W, H);
  paintGrains(g, W, H, s, (layer, fn) => { for (const [cell, X, Y] of lists.get(layer)) fn(cell, X, Y); });
  c.save();
  c.globalAlpha = alpha;
  // a touch of macro-lens depth of field
  const dof = L.clamp((1400 - v.cam.mpp) / 1000) * 1.1;
  if (dof > 0.3) c.filter = `blur(${dof.toFixed(2)}px)`;
  c.drawImage(GLAYER, 0, 0);
  c.restore();
}

function drawTexture(c, v, k) {
  if (k <= 0) return;
  TILES ??= makeTiles();
  const { OFF_U, OFF_W } = granules();
  const origin = { u: OFF_U, w: OFF_W };
  const mpp = v.cam.mpp, cellPx = (GR.G * YR_PER_M) / mpp;
  // motion damping: during a fast zoom the grain contrast drops (log-mpp rate per second, from the camera itself),
  // so motion blur averages to tone instead of radial streaks
  let rate = 0;
  try { rate = Math.abs(Math.log(camAt(v.gt + 1 / 30, v.tl).mpp / mpp)) * 30; } catch (e) { rate = 0; }
  const damp = L.lerp(1, 0.1, L.smoothstep(L.clamp((rate - 0.6) / 2.6)));
  // granules: only once a grain is ≥ ~4 px (below that the surface reads as flat tone + mottle: nothing to alias)
  const gk = k * damp * L.smoothstep(L.clamp((cellPx - 6) / 12));
  const vk = L.smoothstep(L.clamp((VEC.off - mpp) / (VEC.off - VEC.on)));
  // a second, rotated and rescaled copy (non-aligned scale) hides the 16 mm tile repeat until the grains are large
  const f = 0.5 * L.clamp((60 - cellPx) / 30);
  patternLayer(c, v, TILES[0], gk * (1 - vk) * (1 - f), origin);
  patternLayer(c, v, TILES[0], gk * (1 - vk) * f, origin, 37, 1.37);
  patternLayer(c, v, TILES[3], k * L.clamp((mpp - 8e3) / 2e4) * L.clamp((4e6 - mpp) / 2e6), origin);
  vectorGranules(c, v, gk * vk);
  // granule skin (pits, grit) and micro-roughness: only once a grain is big on screen
  patternLayer(c, v, TILES[1], k * damp * L.smoothstep(L.clamp((3500 - mpp) / 2500)), origin);
  patternLayer(c, v, TILES[2], k * damp * L.smoothstep(L.clamp((420 - mpp) / 300)), origin);
}

function nearTrack(c, v, k) {
  const sx = (u) => L.clamp(v.wx(u * YR_PER_M), -60, W + 60);
  const sy = (w) => L.clamp(v.wy(w * YR_PER_M), -60, H + 60);
  const rect = (u0, u1, w0, w1, col) => { const x0 = sx(u0), x1 = sx(u1), y0 = sy(w0), y1 = sy(w1); if (x1 - x0 > 0.01 && y1 - y0 > 0.01) { c.fillStyle = col; c.fillRect(x0, y0, x1 - x0, y1 - y0); } };
  c.save();
  c.globalAlpha = k;
  rect(-200, 200, -80, TRACK_Y0, L.rgba(GRASS));
  rect(-200, 200, TRACK_Y1, 80, L.rgba(APRON));
  rect(-200, 200, TRACK_Y0, TRACK_Y1, L.rgba(SURFACE));
  // finish line paint (its leading edge is now)
  rect(0, LINE_W, TRACK_Y0, TRACK_Y1, L.rgba(PAINT));
  drawTexture(c, v, 1);
  // lane lines: straight up to the finish, then following the bend (exact curve, sampled across the visible part)
  const uR = Math.max(0, (v.cam.x + (W / 2 + 60) * v.cam.mpp) * M_PER_YR);
  c.fillStyle = L.rgba(PAINT, 0.92);
  for (let i = 0; i <= LANES; i++) {
    const w = TRACK_Y0 + i * LANE_W, r = BEND.r + i * LANE_W;
    const yc = v.wy(w * YR_PER_M), half = (LINE_W / 2) * YR_PER_M / v.cam.mpp;
    if (yc + half < -60 || yc - half > H + 60) continue;
    rect(-200, 0, w - LINE_W / 2, w + LINE_W / 2, L.rgba(PAINT, 0.92));
    if (uR > 0) {
      c.beginPath();
      const n = 16;
      for (let j = 0; j <= n; j++) { const u = (uR * j) / n, ww = CY + Math.sqrt(r * r - u * u); c[j ? 'lineTo' : 'moveTo'](sx(u), sy(ww - LINE_W / 2)); }
      for (let j = n; j >= 0; j--) { const u = (uR * j) / n, ww = CY + Math.sqrt(r * r - u * u); c.lineTo(sx(u), sy(ww + LINE_W / 2)); }
      c.closePath(); c.fill();
    }
  }
  c.restore();
}

const FAR_MPP = 3.8e5;   // above this the whole stadium is drawn as polygons; below it, the finish-line close-up

function drawTrack(c, v, k) {
  if (k <= 0) return;
  // the unfold: the ruler line opens into the home straight (a crisp band growing out of the line), then the reveal
  // sweeps on outward and the whole stadium resolves. Geometry is never squashed; only the reveal window grows.
  const y0 = v.wy(0), halfS = ((TRACK_Y1 + 1.2) * YR_PER_M) / v.cam.mpp;
  const hb = k < 0.45 ? L.lerp(1.5, halfS, L.ease.inOutCubic(k / 0.45)) : L.lerp(halfS, H + 200, L.ease.inOutCubic((k - 0.45) / 0.55));
  const clipped = k < 0.999;
  if (clipped) { c.save(); c.beginPath(); c.rect(0, y0 - hb, W, 2 * hb); c.clip(); }
  const fk = L.clamp(k * 6);
  if (v.cam.mpp > FAR_MPP * 0.8) farTrack(c, v, fk * L.clamp((v.cam.mpp - FAR_MPP * 0.8) / (FAR_MPP * 0.4)), 1);
  if (v.cam.mpp < FAR_MPP * 1.2) nearTrack(c, v, fk * L.clamp((FAR_MPP * 1.2 - v.cam.mpp) / (FAR_MPP * 0.4)));
  if (clipped) {
    c.restore();
    // light at the opening edges sells the unfold
    const ek = Math.sin(Math.PI * L.clamp(k)) * 0.9;
    if (ek > 0.02) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (const yy of [y0 - hb, y0 + hb]) {
        const gr = c.createLinearGradient(0, yy - 14, 0, yy + 14);
        gr.addColorStop(0, L.rgba(ACCENT, 0)); gr.addColorStop(0.5, L.rgba(ACCENT, 0.55 * ek)); gr.addColorStop(1, L.rgba(ACCENT, 0));
        c.fillStyle = gr; c.fillRect(0, yy - 14, W, 28);
      }
      c.restore();
    }
  }
}

// ------------------------------------------------------------------ the metres tape (track phase)
export const TAPE_Y = 1250;
function drawTape(c, v, k) {
  if (k <= 0) return;
  const mppM = v.cam.mpp * M_PER_YR, y = TAPE_Y, finX = v.wx(0);
  c.save();
  c.globalAlpha = k;
  const bg = c.createLinearGradient(0, y - 36, 0, y + 64);
  bg.addColorStop(0, 'rgba(6,10,16,0)'); bg.addColorStop(0.3, 'rgba(6,10,16,0.55)'); bg.addColorStop(0.7, 'rgba(6,10,16,0.55)'); bg.addColorStop(1, 'rgba(6,10,16,0)');
  c.fillStyle = bg;
  c.fillRect(0, y - 36, W, 100);
  c.fillStyle = 'rgba(232,236,240,0.85)';
  c.fillRect(Math.max(-10, v.wx(-100 * YR_PER_M)), y - 1, finX - Math.max(-10, v.wx(-100 * YR_PER_M)), 2);
  let k0 = -40;
  while (stepAt(k0) / mppM < 10) k0++;   // tape steps in metres (from 1e-20 m up)
  const s0 = stepAt(k0), leftM = Math.min(100, (-(v.cam.x - (W / 2) * v.cam.mpp)) * M_PER_YR), N = Math.floor(leftM / s0 + 1e-9);
  c.font = L.font(22, 600, L.FONT.body);
  c.textBaseline = 'alphabetic';
  for (let n = 1; n <= Math.min(N, 400); n++) {
    let lv = k0;
    for (let kk = k0 + 1; kk < k0 + 12; kk++) { const m = Math.round(stepAt(kk) / stepAt(k0)); if (n % m === 0) lv = kk; else break; }
    const px = stepAt(lv) / mppM, pos = n * s0, x = v.wx(-pos * YR_PER_M);
    if (x < -20 || x > finX - 4) continue;
    const at = L.clamp((px - 10) / 40), len = 7 + 13 * L.clamp((px - 60) / 200);
    c.fillStyle = `rgba(232,236,240,${0.7 * at})`;
    c.fillRect(x - 1, y - len, 2, len);
    const al = L.clamp((px - 200) / 110) * L.clamp((finX - 110 - x) / 50) * L.clamp((x - 50) / 40);
    if (al > 0.01) { c.fillStyle = `rgba(215,225,232,${0.85 * al})`; L.trackedText(c, fmtTape(pos), x, y + 40, 1.5, 'center'); }
  }
  c.fillStyle = L.rgba(ACCENT);
  c.fillRect(finX - 1.5, y - 24, 3, 48);
  c.font = L.font(24, 700, L.FONT.body);
  L.trackedText(c, 'FINISH', Math.min(finX, W - 110), y + 52, 3, 'center');
  c.restore();
}

// ------------------------------------------------------------------ frame layers
export function drawBackground(c, v) {
  const tk = trackK(v), lk = timelineK(v);
  const deep = L.clamp(L.invLerp(5, 7.5, Math.log10(v.cam.mpp)));   // deep time: cooler, darker, stars
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, L.rgba(L.mix([8, 14, 22], [3, 5, 12], deep)));
  g.addColorStop(0.55, L.rgba(L.mix([10, 22, 30], [5, 9, 20], deep)));
  g.addColorStop(1, L.rgba(L.mix([6, 12, 18], [2, 4, 10], deep)));
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  L.lightBlob(c, v.wx(0), RULER_Y, 620, ACCENT, 0.07 * lk);
  stars(c, v, deep * 0.6 * lk, 140, 22);
  drawDust(c, v, lk);
  drawRuler(c, v, lk);
  drawTrack(c, v, tk);
  drawTape(c, v, L.clamp(tk * 1.4 - 0.4));
}
export function drawForeground() {}

// ------------------------------------------------------------------ HUD: the age readout
// SUBJECT per CAMERA beat (camera.js splits beat 11): the readout counts (in log space) to it over the travel.
export const SUBJECT = [null, AGE.life, AGE.pyramid, AGE.cleopatra, AGE.sapiens, AGE.kpg, AGE.stego, AGE.shark, AGE.earth,
  AGE.universe, AGE.universe, AGE.kpg, AGE.sapiens, AGE.writing, AGE.writing];
/** The readout's current value in years (null in the hook) and whether it reads as track metres. */
export function readout(v) {
  const ctl = cameraTimeline(v.tl), sc = ctl.scenes;
  let b = 0;
  sc.forEach((s, i) => { if (s.start <= v.gt) b = i; });
  b = Math.min(b, SUBJECT.length - 1);
  const z = SUBJECT[b], a = SUBJECT[b - 1] ?? 1;
  if (z == null) return { years: null, track: false, b };
  const k = L.ease.inOutCubic(L.prog(v.gt - sc[b].start, -0.05, Math.max(0.3, CAM_KEYS[b].travel)));
  return { years: Math.exp(L.lerp(Math.log(a), Math.log(z), k)), track: b >= 10, b };
}

export function drawHud(c, v) {
  topBar(c, v, ACCENT);
  const r = readout(v);
  const s1 = v.tl.scenes[1];
  const k = L.ease.outCubic(L.prog(v.gt, s1.start + 0.1, 0.6));
  if (r.years == null || k <= 0) return;
  // years mode until the track arrives, then metres; crossfade over beat 10's unfold
  const tk = trackK(v);
  c.save();
  c.textAlign = 'right';
  c.shadowColor = 'rgba(2,6,12,0.75)';
  c.shadowBlur = 14;
  for (const [mode, a] of [['years', 1 - L.clamp(tk * 2)], ['track', L.clamp(tk * 2 - 1)]]) {   // swap, never overlaid
    if (a * k <= 0.01) continue;
    c.globalAlpha = k * a;
    const big = mode === 'years' ? fmtAgo(r.years) : fmtTrack(r.years * M_PER_YR);
    const small = mode === 'years' ? 'YEARS AGO' : `= ${fmtAgo(r.years)} YEARS`;
    c.font = L.font(L.fitSize(c, big, 420, 64, 700, L.FONT.din, 30), 700, L.FONT.din);
    if (mode === 'track') {   // over the bright track / finish paint the readout sits on a dark plate
      const bw = Math.max(c.measureText(big).width, 300) + 40;
      c.save(); c.shadowBlur = 0; c.fillStyle = 'rgba(4,8,14,0.6)'; L.roundRect(c, W - 64 - bw + 20, 244, bw, 104, 14); c.fill(); c.restore();
    }
    c.fillStyle = '#fff';
    c.fillText(big, W - 64, 300);
    c.font = L.font(L.fitSize(c, small, 440, 22, 600, L.FONT.body, 14), 600, L.FONT.body);
    c.fillStyle = mode === 'years' ? 'rgba(220,228,236,0.85)' : L.rgba(ACCENT, 0.95);
    L.trackedText(c, small, W - 64, 334, 2, 'right');
  }
  c.restore();
}

export const cues = (tl) => [
  ...beatCues(tl, { gain: 0.18, pitch: 1.05 }),
  { t: diveStart(tl), name: 'dive', gain: 0.32, pitch: 0.9 },
];
