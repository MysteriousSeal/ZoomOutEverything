// Beat 7 — "Spread us evenly over the whole planet, | and we'd be a film seventy times thinner than a human hair."
// The cube (s04's block, on the canyon floor) melts: shoulders slump, a molten pool fills the inner gorge,
// and a bright film climbs the walls and runs out over the land while the camera pulls out to the globe
// (s08 draws it). The film's front rides around the limb; on the disc its edge is a glowing ring that
// sweeps down over the planet until it closes at the far side ("…a film"). A macro lens then compares
// the 1 µm film with a 70 µm hair. In beat 8 the (exaggerated) film thins to its true scale and vanishes.
// World metres, side view (y down, ground y = 0, canyon floor y = +1800, globe centre (0, +R)).
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH } from '../env.js';
import { project } from '../../../../engine/runtime/earth.js';
import { globeK, globeR, limbPt, drawRock, globeView, rollK, GC } from './s08-nothing.js';

const { W, H, clamp, lerp, prog, ease } = L;
const TAU = Math.PI * 2;
const CORAL = [255, 130, 110];
const CORAL_HI = [255, 196, 176];
const CORAL_LO = [176, 66, 62];
const FLOOR = 1800, TOP = 1000, HALF = 400;

// Grand Canyon cross-section (x, depth), same as s06's profile (south rim → north rim).
const PROFILE = [
  [-8000, 0], [-7820, 70], [-7700, 250], [-7250, 300], [-6650, 560], [-6420, 640], [-6300, 900],
  [-5500, 975], [-4750, 1100], [-3500, 1175], [-2000, 1225], [-1720, 1290], [-1560, 1540], [-1330, 1585],
  [-1200, 1785], [-1080, FLOOR], [1120, FLOOR], [1240, 1785], [1380, 1590], [1590, 1545], [1760, 1295],
  [2050, 1235], [3600, 1185], [4850, 1080], [5550, 965], [5760, 700], [6320, 640], [6900, 400],
  [7420, 300], [7680, 250], [7850, 70], [8000, 0],
];
function canyonY(x) {
  if (x <= PROFILE[0][0] || x >= PROFILE[PROFILE.length - 1][0]) return 0;
  let i = 1;
  while (PROFILE[i][0] < x) i++;
  const [x0, y0] = PROFILE[i - 1], [x1, y1] = PROFILE[i];
  return lerp(y0, y1, (x - x0) / (x1 - x0));
}

// ------------------------------------------------------------------ timing (beat-relative seconds)
const MELT = [0.0, 1.0];        // the block slumps into a pool
const POOL = 1380;                // pool level once melted (fills the inner gorge)
const DRAIN = [1.25, 1.0];        // the pool runs out into the film
const SPREAD0 = [0.4, 0.9];      // film starts climbing the walls (ramp of the camera-tied spread)
const WRAP = [1.75, 1.85];        // extra spread that carries the front around the far side
const T_CLOSE = WRAP[0] + WRAP[1];   // the film closes at the far side of the planet (≈ "…a film")
const T_LABEL = 3.85;             // "seventy times thinner…"
const T_LENS = 4.3;               // macro lens opens
const T_HAIR = 4.75;              // the hair slides into the lens ("…a human hair")

const sOf = (tl, i) => tl.scenes[i].start;

/** The camera's zoom curve for this beat (without its drift/push), so the film front can ride it. */
function mppT(t) {
  const e = ease.inOutCubic(prog(t, -0.05, 2.6));
  return Math.exp(lerp(Math.log(13), Math.log(15500), e));
}
const S_MAX = 400 + 360 * (15500 - 13);
/** Half-length of the film (metres along the surface, each way from the canyon). */
function spreadAt(t) {
  const a = ease.inOutCubic(prog(t, SPREAD0[0], SPREAD0[1]));
  const s = 400 + a * 360 * (mppT(t) - 13);
  return Math.min(Math.PI * R_EARTH, s + (Math.PI * R_EARTH - S_MAX) * ease.inOutCubic(prog(t, WRAP[0], WRAP[1])));
}
/** Film on-screen exaggeration (1 = drawn bold; → 0 in beat 8 as it shrinks to true scale). */
function boldAt(v) {
  const t8 = v.gt - sOf(v.tl, 8);
  return 1 - ease.inOutCubic(prog(t8, 0.35, 1.45));
}

/** Point on the film path at signed surface distance u (canyon profile near the origin, globe beyond). */
function pathPt(u) {
  if (Math.abs(u) < 8000) return [u, canyonY(u)];
  const th = u / R_EARTH;
  return [R_EARTH * Math.sin(th), R_EARTH * (1 - Math.cos(th))];
}

// ------------------------------------------------------------------ the melt
function meltAt(t) { return ease.inOutCubic(prog(t, MELT[0], MELT[1])); }
function poolLevel(t) { return lerp(POOL, FLOOR + 2, ease.inOutCubic(prog(t, DRAIN[0], DRAIN[1]))); }
/** Top of the molten mass at x (world y), before clipping to the canyon. */
function meltTop(x, t, m) {
  const ax = Math.abs(x);
  const delay = ax < HALF ? 0.32 * (1 - ax / HALF) : 0.32 * Math.min(1, (ax - HALF) / 650);
  const mx = ease.inOutCubic(clamp((m - delay) / 0.68));
  const from = ax <= HALF ? TOP : FLOOR;
  const ripple = L.noise1(x / 170 + t * 2.4, 71) * 26 * Math.sin(Math.PI * m) + L.noise1(x / 60 - t * 3, 72) * 7 * Math.sin(Math.PI * m);
  return lerp(from, poolLevel(t), mx) + ripple * (ax < HALF + 600 ? 1 : 0);
}

const XS = (() => {
  const xs = [];
  for (let x = -1250; x <= 1250; x += 25) xs.push(x);
  xs.push(-HALF - 0.1, -HALF + 0.1, HALF - 0.1, HALF + 0.1, -480, 500, -560, 580, -800, 860, -1050, 1150);
  return xs.sort((a, b) => a - b);
})();

function drawMelt(c, v, t) {
  const m = meltAt(t);
  const lvl = poolLevel(t);
  if (lvl >= FLOOR) return;
  const mpp = v.cam.mpp;
  if (mpp > 260) return;
  const fade = clamp(L.invLerp(260, 150, mpp));
  const top = XS.map((x) => Math.min(meltTop(x, t, m), canyonY(x)));
  const xl = v.wx(-1300), xr = v.wx(1300);
  if (xr < -40 || xl > W + 40) return;
  c.save();
  c.globalAlpha *= fade;
  const heat = Math.sin(Math.PI * clamp(m * 1.1));
  // molten glow
  const gy = v.wy(lerp(1400, 1700, m));
  L.lightBlob(c, v.wx(0), gy, Math.max(60, 1900 / mpp), CORAL, 0.18 + 0.3 * heat);
  L.lightBlob(c, v.wx(0), gy, Math.max(30, 900 / mpp), CORAL_HI, 0.25 * heat);
  // body
  c.beginPath();
  XS.forEach((x, i) => (i ? c.lineTo(v.wx(x), v.wy(top[i])) : c.moveTo(v.wx(x), v.wy(top[i]))));
  for (let i = XS.length - 1; i >= 0; i--) c.lineTo(v.wx(XS[i]), v.wy(canyonY(XS[i])) + 0.5);
  c.closePath();
  const yTop = v.wy(Math.min(TOP, lvl - 60)), yBot = v.wy(FLOOR);
  const g = c.createLinearGradient(0, yTop, 0, yBot);
  g.addColorStop(0, L.rgba(L.mix(CORAL, CORAL_HI, 0.25 + 0.5 * heat)));
  g.addColorStop(0.55, L.rgba(L.mix(CORAL, CORAL_HI, 0.15 * heat)));
  g.addColorStop(1, L.rgba(L.mix(CORAL, CORAL_LO, 0.6)));
  c.fillStyle = g;
  c.fill();
  // light from the upper left on the slumping shoulders
  c.save();
  c.clip();
  const sg = c.createLinearGradient(v.wx(-HALF), 0, v.wx(HALF), 0);
  sg.addColorStop(0, 'rgba(255,240,230,0.14)');
  sg.addColorStop(0.4, 'rgba(255,240,230,0)');
  sg.addColorStop(1, 'rgba(40,0,10,0.18)');
  c.fillStyle = sg;
  c.fillRect(v.wx(-1300), yTop - 40, v.ws(2600), yBot - yTop + 80);
  c.restore();
  // glossy meniscus along the free surface
  c.beginPath();
  let pen = false;
  XS.forEach((x, i) => {
    const thick = canyonY(x) - top[i];
    if (thick < 3) { pen = false; return; }
    const X = v.wx(x), Y = v.wy(top[i]);
    pen ? c.lineTo(X, Y) : c.moveTo(X, Y);
    pen = true;
  });
  c.strokeStyle = `rgba(255,238,228,${0.55 + 0.35 * (1 - m)})`;
  c.lineWidth = Math.max(1, Math.min(2.5, 3 / Math.sqrt(mpp)));
  c.stroke();
  // crisp cube edges while it is still a block
  if (m < 0.35) {
    const a = 1 - m / 0.35;
    c.strokeStyle = `rgba(255,220,205,${0.45 * a})`;
    c.beginPath(); c.moveTo(v.wx(-HALF), v.wy(meltTop(-HALF + 1, t, m))); c.lineTo(v.wx(-HALF), v.wy(FLOOR)); c.stroke();
    c.strokeStyle = `rgba(255,220,205,${0.25 * a})`;
    c.beginPath(); c.moveTo(v.wx(HALF), v.wy(meltTop(HALF - 1, t, m))); c.lineTo(v.wx(HALF), v.wy(FLOOR)); c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------------ the film
function strokeFilm(c, pts, w, a) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = L.rgba(CORAL, 0.22 * a);
  c.lineWidth = w * 4.5;
  c.stroke();
  c.restore();
  c.strokeStyle = L.rgba(L.mix(CORAL, CORAL_HI, 0.35), 0.95 * a);
  c.lineWidth = w;
  c.stroke();
}

function drawFilm(c, v, t, bold) {
  const s = spreadAt(t);
  if (s <= HALF + 10) return;
  const mpp = v.cam.mpp;
  const w = 2.6 * bold;
  if (w < 0.05) return;
  const a = clamp(bold * 2.5);
  const r = globeR(v);
  const full = s >= Math.PI * R_EARTH - 1;
  let pts = [];
  const globe = r < 6000 && s > 8000;
  let ends = [];
  if (globe) {
    // globe view: the film is a spherical cap around the Grand Canyon (its real position on the rolling planet)
    const th = s / R_EARTH, A = anchorDir(v), k = globeK(v);
    drawCap(c, v, th, A, k * a);
    // where the cap reaches the limb, the film is seen edge-on: bold coral runs along the horizon
    const cx = v.wx(0), cy = v.wy(R_EARTH), ct = Math.cos(th), n = 360;
    const inCap = (q) => A[0] * Math.sin(q) + A[1] * Math.cos(q) > ct || full;
    let run = null;
    const flush = () => { if (run && run.length > 1) { strokeFilm(c, run, w, a); ends.push(run[0], run[run.length - 1]); } run = null; };
    // the edge-on film rides just inside the limb and is clipped to the disc, so it never sticks out past the planet
    const ri = Math.max(0, r - w * 0.6);
    c.save();
    c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.clip();
    let q0 = 0;   // start the scan outside the cap so runs never wrap across the seam
    for (let i = 0; i < n; i++) if (!inCap((i / n) * TAU)) { q0 = (i / n) * TAU; break; }
    for (let i = 0; i <= n; i++) {
      const q = q0 + (i / n) * TAU;
      if (inCap(q)) (run || (run = [])).push([cx + ri * Math.sin(q), cy - ri * Math.cos(q)]);
      else flush();
    }
    flush();
    c.restore();
    if (full) ends = [];
  } else {
    // close up: follow the canyon walls, then the curve of the Earth
    const us = [];
    const umin = -s, umax = s;
    for (const [x] of PROFILE) if (x > umin && x < umax) us.push(x);
    const n = 90;
    for (let i = 0; i <= n; i++) us.push(lerp(umin, umax, i / n));
    us.sort((p, q) => p - q);
    pts = us.map((u) => { const [x, y] = pathPt(u); return [v.wx(x), v.wy(y) - w * 0.5]; });
    strokeFilm(c, pts, w, a);
  }
  // leading edges: glints racing outward where the film front meets the horizon
  if (!full) {
    const glint = clamp(L.invLerp(HALF + 10, HALF + 400, s));
    const pts = globe ? ends : [-1, 1].map((sg) => { const [x, y] = pathPt(sg * s); return [v.wx(x), v.wy(y)]; });
    for (const [X, Y] of pts) {
      // soft: on the globe the fronts sit on the limb, where a hard white point reads as a lens flare
      if (globe) { L.lightBlob(c, X, Y, 24, CORAL_HI, 0.3 * glint * a); continue; }
      L.lightBlob(c, X, Y, 26, CORAL_HI, 0.75 * glint * a);
      L.lightBlob(c, X, Y, 7, [255, 245, 238], 0.95 * glint * a);
    }
  }
  // the ring closes: a soft pulse off the whole planet
  const pk = t - T_CLOSE;
  if (pk > -0.05 && pk < 1.2 && r < 6000) {
    const e = ease.outCubic(clamp(pk / 1.2));
    const pcx = v.wx(0), pcy = v.wy(R_EARTH), ro = r + 8 + e * 40;
    c.save();
    c.globalCompositeOperation = 'lighter';
    const pg = c.createRadialGradient(pcx, pcy, Math.max(0, r - 2), pcx, pcy, ro);
    pg.addColorStop(0, L.rgba(CORAL_HI, 0.32 * (1 - e) * a));
    pg.addColorStop(1, L.rgba(CORAL_HI, 0));
    c.fillStyle = pg;
    c.beginPath(); c.arc(pcx, pcy, ro, 0, TAU); c.arc(pcx, pcy, Math.max(0, r - 2), 0, TAU, true); c.fill();
    c.restore();
    const A = anchorDir(v), qa = Math.atan2(-A[0], -A[1]);   // the far side, where the front closes
    const [bx, by] = limbPt(v, qa);
    L.lightBlob(c, bx, by, 60, CORAL_HI, 0.6 * (1 - e) * a);
  }
}

/** The Grand Canyon's direction in view space (x right, y up, z toward the viewer; unit length). */
function anchorDir(v) {
  const view = globeView(v);
  const p = project(GC[0], GC[1], view);
  return [(p.x - view.cx) / view.r, (view.cy - p.y) / view.r, p.z];
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };

let capCv = null;
/** Coral tint over the part of the planet the film has covered (a spherical cap of angular radius th around A),
 *  rasterised per pixel so it is correct at any orientation, bounded by its glowing, projected front ring. */
function drawCap(c, v, th, A, k) {
  const r = globeR(v);
  const ck = k * clamp(L.invLerp(3200, 1400, r));
  if (ck <= 0) return;
  const cx = v.wx(0), cy = v.wy(R_EARTH), ct = Math.cos(th), full = th >= Math.PI - 1e-3;
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H, Math.ceil(cy + r));
  if (x1 > x0 && y1 > y0) {
    const S = 3, w = Math.ceil((x1 - x0) / S), h = Math.ceil((y1 - y0) / S);
    if (!capCv) capCv = document.createElement('canvas');
    if (capCv.width < w || capCv.height < h) { capCv.width = Math.max(w, capCv.width); capCv.height = Math.max(h, capCv.height); }
    const g = capCv.getContext('2d');
    const img = g.createImageData(w, h), d = img.data;
    const soft = Math.max(0.003, (1.5 * S) / r);
    for (let j = 0; j < h; j++) {
      const Y = (cy - (y0 + (j + 0.5) * S)) / r;
      for (let i = 0; i < w; i++) {
        const X = (x0 + (i + 0.5) * S - cx) / r, rho2 = X * X + Y * Y;
        if (rho2 >= 1) continue;
        const Z = Math.sqrt(1 - rho2), rho = Math.sqrt(rho2);
        const e = full ? 1 : clamp((A[0] * X + A[1] * Y + A[2] * Z - ct) / soft + 0.5);
        if (e <= 0) continue;
        // seen through more of the film at grazing angles, the limb glows; the face takes a light coral wash
        const gr = rho < 0.55 ? 0.09 : rho < 0.8 ? lerp(0.09, 0.14, (rho - 0.55) / 0.25) : lerp(0.14, 0.42, (rho - 0.8) / 0.2);
        const o = 4 * (j * w + i);
        d[o] = CORAL[0]; d[o + 1] = CORAL[1]; d[o + 2] = CORAL[2];
        d[o + 3] = 255 * ck * e * gr * clamp((1 - rho) * r / 1.5);
      }
    }
    g.putImageData(img, 0, 0);
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.imageSmoothingEnabled = true;
    c.drawImage(capCv, 0, 0, w, h, x0, y0, w * S, h * S);
    c.restore();
  }
  // the front ring: the cap's boundary circle, drawn where it faces us
  if (!full && Math.sin(th) * r > 1) {
    const E1 = norm(Math.abs(A[2]) < 0.95 ? cross(A, [0, 0, 1]) : cross(A, [1, 0, 0])), E2 = cross(A, E1);
    const st = Math.sin(th), n = 240, runs = [];
    let run = null;
    for (let i = 0; i <= n; i++) {
      const f = (i / n) * TAU, cf = Math.cos(f), sf = Math.sin(f);
      const P = [0, 1, 2].map((m) => ct * A[m] + st * (cf * E1[m] + sf * E2[m]));
      if (P[2] > 0) (run || (run = [])).push([cx + r * P[0], cy - r * P[1]]);
      else if (run) { runs.push(run); run = null; }
    }
    if (run) runs.push(run);
    // join a run that wraps across f = 0
    if (runs.length > 1) { const a0 = runs[0][0], z = runs[runs.length - 1]; const b = z[z.length - 1]; if (Math.hypot(a0[0] - b[0], a0[1] - b[1]) < 1e-6 + r * 0.03) { runs[0] = z.concat(runs[0]); runs.pop(); } }
    c.save();
    c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.clip();
    const rk = ck * clamp(L.invLerp(1, 12, st * r));
    for (const [lw, col, al] of [[9, CORAL, 0.25], [2, [255, 226, 214], 0.9]]) {
      c.lineWidth = lw;
      c.strokeStyle = L.rgba(col, al * rk);
      c.beginPath();
      for (const rr of runs) rr.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.stroke();
    }
    c.restore();
  }
}

/** A small pin on the Grand Canyon while the planet rolls into view: the canyon → planet link.
 *  The label sits OUTSIDE the disc, above the planet (limb + 30 px); dot, leader and text share one alpha. */
function drawPin(c, v) {
  const k = L.enter(v.t, 2.0, 0.45) * (1 - ease.inCubic(clamp(prog(v.t, T_LABEL - 0.6, 0.45)))) * v.k;
  if (k <= 0.001) return;
  const view = globeView(v);
  const p = project(GC[0], GC[1], view);
  const vis = clamp((p.z - 0.15) / 0.15);   // only once the canyon has rolled clearly onto the face
  const A = k * vis;
  if (A <= 0.001) return;
  const r = globeR(v), cy = v.wy(R_EARTH);
  const tx = 660, base = cy - r - 30 - 4;      // ARIZONA baseline: 30 px clear of the limb (+ descender room)
  c.save();
  c.globalAlpha *= A;
  L.lightBlob(c, p.x, p.y, 16, [255, 240, 230], 0.6);
  c.fillStyle = '#fff4ee';
  c.beginPath(); c.arc(p.x, p.y, 4.5, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(255,240,232,0.9)';
  c.lineWidth = 1.5;
  c.beginPath(); c.arc(p.x, p.y, Math.max(0, 10 + 8 * (1 - k)), 0, TAU); c.stroke();
  // leader: from 14 px under the text block to the ring around the point
  const lx = tx, ly = base + 14 + 5;
  const ang = Math.atan2(p.y - ly, p.x - lx);
  L.leader(c, lx, ly, p.x - Math.cos(ang) * 11, p.y - Math.sin(ang) * 11, ease.outCubic(clamp(k * 1.3)), [255, 240, 232], 0.75);
  c.textBaseline = 'alphabetic';
  c.shadowColor = 'rgba(0,0,0,0.75)';
  c.shadowBlur = 8;
  c.font = L.font(24, 700, L.FONT.body);
  c.fillStyle = 'rgba(255,244,238,0.95)';
  L.trackedText(c, 'GRAND CANYON', tx, base - 26, 3, 'center');
  c.font = L.font(20, 600, L.FONT.body);
  c.fillStyle = 'rgba(225,215,212,0.85)';
  L.trackedText(c, 'ARIZONA', tx, base, 3, 'center');
  c.restore();
}

// ------------------------------------------------------------------ macro lens: film vs hair
const LENS = { x: 748, y: 1062, r: 182 };
const UM = 2.6;                       // lens pixels per micrometre
const LENS_A = 58 * Math.PI / 180;    // where the lens looks: the limb, 58° right of the canyon

function drawLens(c, v) {
  const lk = ease.outBack(clamp(prog(v.t, T_LENS, 0.55)), 1.3) * v.k;
  if (lk <= 0.001) return;
  const fk = clamp(prog(v.t, T_LENS, 0.3)) * v.k;
  const { x, y } = LENS, r = LENS.r * lk;
  // leader from the limb to the lens
  const [px, py] = limbPt(v, LENS_A, 1);
  const ang = Math.atan2(py - y, px - x);
  const ex = x + Math.cos(ang) * LENS.r, ey = y + Math.sin(ang) * LENS.r;
  c.save();
  c.globalAlpha *= fk;
  c.strokeStyle = 'rgba(255,236,226,0.75)';
  c.lineWidth = 2;
  c.beginPath(); c.arc(px, py, 9, 0, TAU); c.stroke();
  const le = ease.outCubic(clamp(prog(v.t, T_LENS, 0.4)));
  c.setLineDash([2, 5]);
  c.beginPath(); c.moveTo(px + Math.cos(ang + Math.PI) * 9, py + Math.sin(ang + Math.PI) * 9);
  c.lineTo(lerp(px, ex, le), lerp(py, ey, le)); c.stroke();
  c.setLineDash([]);
  c.restore();

  c.save();
  c.globalAlpha *= fk;
  // drop shadow + backing
  c.shadowColor = 'rgba(0,0,0,0.6)';
  c.shadowBlur = 30;
  c.fillStyle = '#120c0e';
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.fill();
  c.shadowBlur = 0;
  c.save();
  c.clip();
  const zoom = lerp(0.7, 1, ease.outCubic(clamp(prog(v.t, T_LENS, 0.9))));
  c.translate(x, y);
  c.scale(zoom, zoom);
  const sy = 72;                       // ground surface (lens local y)
  // ground: warm rock with grains
  const gg = c.createLinearGradient(0, sy, 0, sy + 140);
  gg.addColorStop(0, '#4a3634');
  gg.addColorStop(1, '#1b1315');
  c.fillStyle = gg;
  c.fillRect(-260, sy, 520, 200);
  c.strokeStyle = 'rgba(255,214,190,0.07)';
  c.lineWidth = 1;
  c.beginPath();
  for (let i = 1; i < 7; i++) {
    const yy = sy + i * 17;
    c.moveTo(-260, yy);
    for (let x = -260; x <= 260; x += 26) c.lineTo(x, yy + L.noise1(x / 70 + i * 4, 76) * 4);
  }
  c.stroke();
  // backdrop above the ground: soft air
  const bg = c.createLinearGradient(0, -200, 0, sy);
  bg.addColorStop(0, '#16101a');
  bg.addColorStop(1, '#2a1c22');
  c.fillStyle = bg;
  c.fillRect(-260, -260, 520, sy + 260);
  // the hair: a strand lying on the film, 70 µm thick, slides in from the left
  const hk = ease.outCubic(clamp(prog(v.t, T_HAIR, 0.8)));
  const hd = 70 * UM, hy1 = sy - 1 * UM, hy0 = hy1 - hd;
  if (hk > 0) {
    const off = (1 - hk) * -420 + Math.sin(v.t * 0.7) * 3;
    c.save();
    c.globalAlpha *= clamp(hk * 2);
    const hg = c.createLinearGradient(0, hy0, 0, hy1);
    hg.addColorStop(0, '#2a1810');
    hg.addColorStop(0.18, '#6a4430');
    hg.addColorStop(0.38, '#9a6c4c');
    hg.addColorStop(0.62, '#5c3a28');
    hg.addColorStop(1, '#22140e');
    c.fillStyle = hg;
    c.fillRect(-260 + off, hy0, 520, hd);
    // cuticle scales: overlapping plates, free edges bulging toward the tip (right), shadowed behind
    c.save();
    c.beginPath(); c.rect(-260 + off, hy0, 520, hd); c.clip();
    const edge = (bx, i) => {
      const pts = [];
      for (let j = 0; j <= 14; j++) {
        const q = j / 14;
        pts.push([bx + Math.sin(q * Math.PI) * 13 + L.noise1(i * 3.1 + q * 9, 74) * 2.6, lerp(hy0, hy1, q)]);
      }
      return pts;
    };
    for (let i = -10; i <= 10; i++) {
      const bx = off + i * 30 + L.noise1(i * 1.7, 75) * 6;
      const pts = edge(bx, i);
      // shadow cast by the plate onto the one beneath (to the right of the free edge)
      c.beginPath();
      pts.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y)));
      for (let j = pts.length - 1; j >= 0; j--) c.lineTo(pts[j][0] + 7, pts[j][1]);
      c.closePath();
      c.fillStyle = 'rgba(20,8,4,0.32)';
      c.fill();
      // lit lip of the plate
      c.beginPath();
      pts.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.strokeStyle = 'rgba(255,224,196,0.34)';
      c.lineWidth = 1.4;
      c.stroke();
    }
    // cylinder shading over the plates: dark edges, a soft core
    const cg = c.createLinearGradient(0, hy0, 0, hy1);
    cg.addColorStop(0, 'rgba(10,4,2,0.55)');
    cg.addColorStop(0.25, 'rgba(10,4,2,0)');
    cg.addColorStop(0.7, 'rgba(10,4,2,0)');
    cg.addColorStop(1, 'rgba(10,4,2,0.6)');
    c.fillStyle = cg;
    c.fillRect(-260 + off, hy0, 520, hd);
    // specular streak along the cylinder
    c.fillStyle = 'rgba(255,236,220,0.10)';
    c.fillRect(-260 + off, hy0 + hd * 0.3, 520, hd * 0.07);
    c.restore();
    c.restore();
  }
  // the film: 1 µm of coral on the ground, with a shimmer running along it
  const wk = ease.inOutCubic(clamp(prog(v.t, T_LENS + 0.08, 0.55)));
  if (wk > 0) {
    const fx0 = -260, fx1 = lerp(-260, 260, wk);
    // true to scale against the 70 µm hair: a 2.6 px core with only a faint 1 px halo (no fat glow)
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = L.rgba(CORAL, 0.18);
    c.fillRect(fx0, sy - UM - 1, fx1 - fx0, UM + 2);
    c.restore();
    c.fillStyle = L.rgba(L.mix(CORAL, CORAL_HI, 0.5));
    c.fillRect(fx0, sy - UM, fx1 - fx0, UM);
    const shx = lerp(-260, 260, ((v.t * 0.35) % 1));
    L.lightBlob(c, shx, sy - UM / 2, 12, CORAL_HI, 0.3 * wk);
  }
  // in-lens tags
  c.textBaseline = 'middle';
  c.shadowColor = 'rgba(0,0,0,0.65)';
  c.shadowBlur = 6;
  if (hk > 0) {
    c.globalAlpha = fk * clamp(prog(v.t, T_HAIR + 0.35, 0.4));
    c.font = L.font(28, 700, L.FONT.body);
    // dark pill behind the tag so it reads over the striped hair
    c.letterSpacing = '2px';
    const tw = c.measureText('HAIR  70 µm').width - 2;
    c.letterSpacing = '0px';
    c.save();
    c.shadowBlur = 0;
    c.fillStyle = 'rgba(14,8,8,0.72)';
    L.roundRect(c, -tw / 2 - 16, (hy0 + hy1) / 2 - 22, tw + 32, 44, 22);
    c.fill();
    c.restore();
    c.fillStyle = 'rgba(255,240,230,0.97)';
    L.trackedText(c, 'HAIR  70 µm', 0, (hy0 + hy1) / 2 + 1, 2, 'center');
  }
  if (wk > 0) {
    c.globalAlpha = fk * clamp(prog(v.t, T_LENS + 0.4, 0.4));
    c.font = L.font(26, 700, L.FONT.body);
    c.fillStyle = L.rgba(CORAL_HI);
    L.trackedText(c, 'FILM  1 µm', 0, sy + 34, 2, 'center');
  }
  c.restore();
  // rim + glass glint
  c.strokeStyle = 'rgba(255,236,226,0.85)';
  c.lineWidth = 2.5;
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.stroke();
  c.restore();
}

export default {
  beat: 7,
  chapter: { num: '07', title: 'A film', sub: 'Spread over the whole planet' },
  captions: true,
  layer: 3,
  cues(d) {
    return [
      { t: MELT[0] + 0.05, name: 'swell', gain: 0.3, pitch: 0.7 },
      { t: MELT[0] + 0.3, name: 'bubbles', gain: 0.24, pitch: 0.6 },
      { t: SPREAD0[0] + 0.3, name: 'shimmer', gain: 0.24, pitch: 1.0 },
      { t: WRAP[0], name: 'riser', gain: 0.22, pitch: 0.9 },
      { t: T_CLOSE - 0.03, name: 'bloom', gain: 0.4, pitch: 1.0 },
      { t: T_CLOSE, name: 'ping', gain: 0.2, pitch: 1.4 },
      { t: T_LABEL, name: 'tick', gain: 0.2, pitch: 1.1 },
      { t: T_LENS, name: 'swish', gain: 0.24, pitch: 1.2 },
      { t: T_HAIR + 0.1, name: 'blip', gain: 0.2, pitch: 0.9 },
    ];
  },

  drawWorld(ctx, v) {
    if (v.t < 0) return;
    if (v.gt > sOf(v.tl, 9) + 1) return;
    const t = v.t;
    const bold = boldAt(v);
    // the Earth under the canyon: s08's rock body laid over s06's basement (below 2.4 km, soft top edge),
    // fading out exactly as s06 does so the globe beneath takes over without a seam
    const under = 1 - L.invLerp(120, 700, v.cam.mpp);
    if (under > 0) drawRock(ctx, v, under, 2400 / v.cam.mpp);
    ctx.save();
    drawFilm(ctx, v, t, bold);
    ctx.restore();
    if (t < DRAIN[0] + DRAIN[1] + 0.1) drawMelt(ctx, v, t);
  },

  drawOverlay(ctx, v) {
    drawPin(ctx, v);
    drawLens(ctx, v);
    const k = L.enter(v.t, T_LABEL, 0.5) * v.k;
    if (k > 0) {
      // soft dark backing so the label reads over the limb glow
      ctx.save();
      ctx.globalAlpha *= clamp(k);
      ctx.translate(W - 330, 385);
      ctx.scale(1.6, 0.6);
      const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 260);
      g.addColorStop(0, 'rgba(8,5,7,0.6)');
      g.addColorStop(1, 'rgba(8,5,7,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-260, -260, 520, 520);
      ctx.restore();
    }
    // right-aligned: the chapter chip (kept for the whole beat) sits top-left, the label's rule clears it on the right
    L.bigLabel(ctx, { x: W - 110, y: 392, big: '≈ 1 µm', small: '70× thinner than a hair', k, accent: v.accent, size: 104, align: 'right' });
  },
};
