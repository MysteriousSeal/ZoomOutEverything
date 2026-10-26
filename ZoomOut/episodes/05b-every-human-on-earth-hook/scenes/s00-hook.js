// Beat 0 — the hook: "Could every human on Earth fit in one place?"
// One man standing on a glowing 1 × 1 m tile, seen from a high 3/4 view (camera elevation ≈ 56°): the tile is drawn
// in the same perspective as the figure, so he stands ON it. Idle life: breathing, a slow head turn, a soft weight
// sway. The tile's rim glows, a light sweep crosses it, corner marks and a "1 m" dimension frame it.
// A masked two-line headline rises above: COULD EVERY HUMAN / FIT IN ONE PLACE? ("FIT" in coral).
// As the headline leaves, the view tilts up to straight overhead (the map camera of beats 1–3), so the hero's tile
// lines up with the carpet of tiles that s01 grows around it.
// Exports the person + tile renderers so s01 (tiles multiplying) and s03 (density lens) reuse them, and keeps
// drawing the hero tile + person (the coral "you") through the carpet until it becomes sub-pixel.
// All hero timing is beat-relative (bt = gt − beat-0 start): the film starts after the cold-open preroll.
import * as L from '../../../../engine/runtime/lib.js';

const { W, ease, clamp, lerp, prog, rgba, mix } = L;

export const CORAL = [255, 130, 110];
export const TILE = [74, 46, 46];          // tile face
export const TILE_EDGE = [150, 92, 84];    // tile rim (non-hero)
export const SKIN = [214, 160, 128];
// crowd palettes (shirts, hair): warm, muted, never clip-art bright
export const SHIRTS = [[206, 128, 108], [226, 170, 140], [176, 104, 96], [236, 196, 160], [190, 140, 120], [214, 112, 98]];
export const HAIRS = [[38, 26, 24], [66, 42, 32], [96, 62, 44], [28, 22, 22], [120, 84, 58]];

/** Integer hash → [0, 1). Deterministic per tile. */
export function hash2(i, j, s = 0) {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(s | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ------------------------------------------------------------------ the person: a small posed 3D figure, projected
// Body space (metres): x across the body (to the viewer's right when he faces the camera), y toward the viewer, z up,
// feet on z = 0. The figure is posed in 3D (relaxed contrapposto: weight on his right leg (−x), the other knee eased
// forward, hips and shoulders counter-tilted, soft elbows, hands relaxed against the thighs) and projected for a camera
// at elevation `el` (π/2 = straight down, the map camera; ~1 rad = a high 3/4 view). Every part is a convex solid
// (spheres, rings, ellipsoids); its outline is the convex hull of its projected samples, so the figure stays solid and
// anatomically consistent at any yaw and elevation. Light: key from the upper left, a warm bounce rim on the right.
const TAU = Math.PI * 2;
export const HERO_EL = (44 * Math.PI) / 180;   // the hook's camera elevation

function hull(P) {
  if (P.length < 3) return P;
  P.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  lo.pop(); up.pop();
  return lo.concat(up);
}
const poly = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const nrm3 = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Projection for a figure standing at screen (x0, y0): s px/m, body yaw, camera elevation el. Returns [x, y, depth]. */
function projector(x0, y0, s, yaw, el) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), se = Math.sin(el), ce = Math.cos(el);   // se: plan depth scale, ce: height scale
  const P = (p) => {
    const xr = p[0] * cy - p[1] * sy, yr = p[0] * sy + p[1] * cy;
    return [x0 + xr * s, y0 + (yr * se - p[2] * ce) * s, yr * ce + p[2] * se];
  };
  P.s = s;
  return P;
}
/** samples of a sphere's projected outline */
function sph(out, P, c, r, n) {
  const q = P(c), R = r * P.s;
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; out.push([q[0] + Math.cos(a) * R, q[1] + Math.sin(a) * R]); }
  return out;
}
/** basis perpendicular to an axis */
function basis(ax) {
  const u = nrm3(ax), ref = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const a = nrm3(cross3(u, ref)), b = cross3(u, a);
  return [a, b];
}
/** samples of a ring (circle of radius r, or ellipse rx/ry in the a/b basis) around centre c, perpendicular to ax */
function ring(out, P, c, ax, rx, ry, n) {
  const [a, b] = basis(ax);
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU, ca = Math.cos(t) * rx, sb = Math.sin(t) * ry;
    out.push(P([c[0] + a[0] * ca + b[0] * sb, c[1] + a[1] * ca + b[1] * sb, c[2] + a[2] * ca + b[2] * sb]));
  }
  return out;
}
/** horizontal elliptical ring (rx across, ry deep) with a side-to-side tilt (dz per m of x) */
function hring(out, P, c, rx, ry, tilt, n) {
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU, x = Math.cos(t) * rx, y = Math.sin(t) * ry;
    out.push(P([c[0] + x, c[1] + y, c[2] + x * tilt]));
  }
  return out;
}
/** The visible (front-facing) arc of a horizontal ring, as a screen polyline (may be empty). */
function frontArc(P, c, rx, ry, tilt, n, a0 = 0, a1 = TAU) {
  const pts = [], vis = [];
  for (let i = 0; i < n; i++) {
    const t = a0 + ((a1 - a0) * i) / n, x = Math.cos(t) * rx, y = Math.sin(t) * ry;
    const p = [c[0] + x, c[1] + y, c[2] + x * tilt];
    const q = P(p), q2 = P([p[0] + Math.cos(t) * 0.01, p[1] + Math.sin(t) * 0.01, p[2]]);
    pts.push(q); vis.push(q2[2] - q[2] > 0.0012);
  }
  let st = vis.findIndex((v, i) => v && !vis[(i + n - 1) % n]);
  if (st < 0) return vis[0] ? pts : [];
  const out = [];
  for (let k = 0; k < n; k++) { const i = (st + k) % n; if (!vis[i]) break; out.push(pts[i]); }
  return out;
}

/** The visible arc of a ring around axis ax (centre c, radius r) as a screen polyline. */
function ringArc(P, c, ax, r, n) {
  const [a, b] = basis(ax), pts = [], vis = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU, nx = [a[0] * Math.cos(t) + b[0] * Math.sin(t), a[1] * Math.cos(t) + b[1] * Math.sin(t), a[2] * Math.cos(t) + b[2] * Math.sin(t)];
    const p = add3(c, nx, r), q = P(p);
    pts.push(q); vis.push(P(add3(p, nx, 0.01))[2] - q[2] > 0.0012);
  }
  const st = vis.findIndex((v, i) => v && !vis[(i + n - 1) % n]);
  if (st < 0) return [];
  const out = [];
  for (let k = 0; k < n; k++) { const i = (st + k) % n; if (!vis[i]) break; out.push(pts[i]); }
  return out;
}

/** Fill a hull with a left-lit cylindrical gradient (lighter left, base, darker right) + a soft top-to-bottom falloff. */
function shadeHull(g, H, col, o = {}, all = [H]) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const Q of all) for (const [x, y] of Q) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const gr = g.createLinearGradient(x0, 0, x1 + 0.01, 0);
  gr.addColorStop(0, rgba(mix(col, [255, 240, 228], o.hi ?? 0.2)));
  gr.addColorStop(0.42, rgba(col));
  gr.addColorStop(1, rgba(mix(col, [14, 6, 10], o.lo ?? 0.38)));
  poly(g, H);
  g.fillStyle = gr;
  g.fill();
  if (o.fall) {
    const vg = g.createLinearGradient(0, y0, 0, y1 + 0.01);
    vg.addColorStop(0, 'rgba(255,240,228,0)');
    vg.addColorStop(1, `rgba(14,6,10,${o.fall})`);
    g.fillStyle = vg;
    g.fill();
  }
}
function strokeLine(g, pts, col, lw) {
  if (pts.length < 2) return;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.strokeStyle = col; g.lineWidth = lw; g.stroke();
}

/** The posed skeleton (body space) for a pose: breathe −1..1, lean [dx, dy] m at the crown. */
function skeleton(o) {
  const br = o.breathe ?? 0, ln = o.lean ?? [0, 0];
  const J = {
    hipL: [-0.098, 0, 0.93], hipR: [0.074, 0, 0.905],
    kneeL: [-0.078, 0.012, 0.51], kneeR: [0.104, 0.065, 0.5],
    ankL: [-0.064, 0, 0.085], ankR: [0.15, 0.035, 0.085],
    shL: [-0.163, -0.012, 1.418 + 0.004 * br], shR: [0.168, -0.012, 1.438 + 0.004 * br],
    elL: [-0.2, 0.0, 1.142], elR: [0.198, 0.03, 1.16],
    wrL: [-0.192, 0.07, 0.895], wrR: [0.186, 0.09, 0.91],
    neck0: [0.0, -0.016, 1.45], neck1: [0.004, -0.002, 1.578],
    head: [0.006, 0.012, 1.66],
  };
  for (const k in J) { const p = J[k], f = p[2] / 1.76; p[0] += ln[0] * f; p[1] += ln[1] * f; }
  return J;
}

// palettes for the parts the callers don't set
const PANTS = [58, 52, 64], SHOE = [46, 34, 32], SOLE = [116, 100, 92];
const INK = 'rgba(18,9,12,0.52)';

/**
 * Draw the figure into g, feet centred on (x0, y0). P = projector. lod: 0 crowd (small), 1 medium, 2 hero (all details).
 * o: shirt, pants, hair, skin, breathe, head (turn −1..1), lean, long (longer hair).
 */
function figure(g, P, o, lod) {
  const s = P.s;
  const shirt = o.shirt ?? CORAL, pants = o.pants ?? PANTS, hairC = o.hair ?? HAIRS[0], skin = o.skin ?? SKIN;
  const shoe = o.shoe ?? SHOE;
  const J = skeleton(o);
  const nC = lod === 2 ? 22 : lod === 1 ? 14 : 9;     // samples per circle
  const lw = Math.max(0.7, Math.min(1.6, 0.0062 * s)); // ink width (px)
  const det = lod >= 1;
  const br = o.breathe ?? 0;
  g.lineJoin = 'round'; g.lineCap = 'round';
  /** one solid group: strokes all hulls (the outline), then fills them; returns nothing */
  const solid = (hulls, col, sh = {}) => {
    g.strokeStyle = INK; g.lineWidth = 2 * lw;
    for (const H of hulls) { poly(g, H); g.stroke(); }
    for (const H of hulls) shadeHull(g, H, col, sh, hulls);   // one gradient over the whole group: no seams
  };
  const D = (p) => P(p)[2];

  // ---- feet: sole slab + leather upper, toe turned out a little
  const foot = (ank, turn) => {
    const f = [Math.sin(turn), Math.cos(turn), 0], sd = [Math.cos(turn), -Math.sin(turn), 0];
    const at = (u, w, z) => [ank[0] + f[0] * u + sd[0] * w, ank[1] + f[1] * u + sd[1] * w, z];
    return () => {
      const so = [];
      for (const z of [0, 0.022]) {
        hring(so, P, at(-0.05, 0, z), 0.047, 0.047, 0, nC);
        hring(so, P, at(0.12, 0, z), 0.05, 0.05, 0, nC);
        hring(so, P, at(0.19, 0, z), 0.034, 0.034, 0, nC);
      }
      const up = [];
      sph(up, P, at(-0.045, 0, 0.064), 0.043, nC);
      sph(up, P, at(0.05, 0, 0.088), 0.044, nC);
      sph(up, P, at(0.12, 0.012, 0.055), 0.036, nC);
      sph(up, P, at(0.12, -0.012, 0.055), 0.036, nC);
      sph(up, P, at(0.183, 0, 0.048), 0.028, nC);
      solid([hull(so)], SOLE, { hi: 0.15, lo: 0.3 });
      solid([hull(up)], shoe, { hi: 0.28, lo: 0.4 });
      if (det) {
        // toe-cap highlight and the lacing line
        strokeLine(g, [P(at(0.12, -0.02, 0.085)), P(at(0.17, 0, 0.07))], 'rgba(255,236,220,0.12)', lw * 1.2);
        strokeLine(g, [P(at(0.02, 0, 0.125)), P(at(0.09, 0, 0.09))], 'rgba(0,0,0,0.35)', lw);
      }
    };
  };
  // ---- legs: trousers (thigh + shin, a flat hem resting on the shoe)
  const leg = (hip, knee, ank, relaxed) => () => {
    const th = [], sh = [];
    sph(th, P, hip, 0.088, nC);
    ring(th, P, knee, sub3(hip, knee), 0.064, 0.064, nC);
    sph(sh, P, knee, 0.063, nC);
    const hem = add3(ank, [0, 0.004, 0.035]);
    ring(sh, P, hem, sub3(knee, hem), 0.058, 0.058, nC);
    solid([hull(th), hull(sh)], pants, { hi: 0.18, lo: 0.42 });
    if (det) {
      // front crease (light), knee folds on the eased leg, the break just above the shoe
      const fr = (p, r) => add3(p, [0, r, 0]);
      strokeLine(g, [P(fr(hip, 0.08)), P(fr(knee, 0.062)), P(fr(hem, 0.056))], 'rgba(255,240,230,0.1)', lw);
      if (relaxed) {
        strokeLine(g, [P(add3(knee, [-0.035, 0.05, 0.02])), P(add3(knee, [-0.005, 0.06, 0.005])), P(add3(knee, [0.025, 0.052, 0.02]))], 'rgba(0,0,0,0.2)', lw);
      }
      strokeLine(g, [P(add3(hem, [-0.04, 0.045, 0.045])), P(add3(hem, [0.0, 0.058, 0.03])), P(add3(hem, [0.04, 0.045, 0.048]))], 'rgba(0,0,0,0.3)', lw);
    }
  };
  // ---- torso: a sweater lofted through hem, waist, chest and shoulders (hips/shoulders counter-tilted)
  const tH = -0.14, tS = 0.11;
  const RINGS = [
    [[-0.016, 0.0, 0.845], 0.152, 0.104, tH],
    [[-0.018, 0.0, 0.95], 0.153, 0.104, tH],
    [[-0.01, 0.002, 1.08], 0.14, 0.098, 0],
    [[-0.004, 0.008, 1.26], 0.162 * (1 + 0.012 * br), 0.112 * (1 + 0.025 * br), tS * 0.5],
    [[0.003, -0.004, 1.37], 0.158, 0.098, tS],
    [[0.003, -0.012, 1.462], 0.088, 0.06, tS * 0.5],
  ];
  const torso = () => {
    const rs = RINGS.map(([c, rx, ry, tl]) => hring([], P, c, rx, ry, tl, nC + 6));
    const hs = [];
    for (let i = 0; i + 1 < rs.length; i++) hs.push(hull(rs[i].concat(rs[i + 1])));
    const cap = rs[4].concat(rs[5]);
    sph(cap, P, add3(J.shL, [0.012, 0, -0.04]), 0.047, nC);
    sph(cap, P, add3(J.shR, [-0.012, 0, -0.04]), 0.047, nC);
    hs.push(hull(cap));
    solid(hs, shirt, { hi: 0.22, lo: 0.34, fall: 0.1 });
    if (!det) return;
    // ribbed hem band
    const a = frontArc(P, RINGS[0][0], 0.153, 0.105, tH, 40), b = frontArc(P, [RINGS[0][0][0], 0, 0.885], 0.155, 0.105, tH, 40);
    if (a.length > 2 && b.length > 2) {
      poly(g, a.concat(b.slice().reverse()));
      g.fillStyle = rgba(mix(shirt, [20, 8, 12], 0.22), 0.9);
      g.fill();
      strokeLine(g, b, 'rgba(0,0,0,0.25)', lw);
    }
    // the knit gathers a little above the hem at the sides (never across the belly)
    for (const [ang, z, len] of [[-1.15, 0.93, 0.5], [-1.3, 0.975, 0.4], [1.2, 0.95, 0.45]]) {
      const arc = frontArc(P, [-0.012, 0, z], 0.156, 0.105, 0, 8, ang - len / 2, ang + len / 2);
      strokeLine(g, arc, 'rgba(0,0,0,0.16)', lw);
    }
  };
  // ---- arms: sleeve (upper arm + forearm, soft elbow, ribbed cuff), the hand under the cuff
  const arm = (sh, el, wr, side) => () => {
    const u = nrm3(sub3(wr, el)), inw = [-side, 0, 0];
    const fw = nrm3(cross3(cross3(u, [0, 1, 0]), u));
    const fwd = Math.abs(fw[1]) > 0.1 ? fw : [0, 1, 0];
    const H = (k, f, i) => [wr[0] + u[0] * k + fwd[0] * f + inw[0] * i, wr[1] + u[1] * k + fwd[1] * f + inw[1] * i, wr[2] + u[2] * k + fwd[2] * f + inw[2] * i];
    // hand: palm, four fingers curling in toward the thigh, the thumb along the front
    const handC = mix(skin, [120, 60, 50], 0.1);
    const palm = [];
    sph(palm, P, H(0.026, 0.0, 0.0), 0.024, nC);
    for (const f of [-0.026, -0.009, 0.009, 0.026]) sph(palm, P, H(0.088, f, 0.002), 0.012, nC);
    const hulls = [hull(palm)];
    if (lod >= 1) {
      for (const [f, r, l] of [[-0.026, 0.0082, 0.85], [-0.009, 0.0095, 1], [0.009, 0.0095, 1.04], [0.026, 0.009, 0.95]]) {
        const fp = [];
        sph(fp, P, H(0.09, f, 0.002), r, nC);
        sph(fp, P, H(0.09 + 0.04 * l, f * 0.92, 0.009), r * 0.95, nC);
        hulls.push(hull(fp));
        const tp = [];
        sph(tp, P, H(0.09 + 0.04 * l, f * 0.92, 0.009), r * 0.95, nC);
        sph(tp, P, H(0.09 + 0.068 * l, f * 0.85, 0.024), r * 0.85, nC);
        hulls.push(hull(tp));
      }
    }
    solid(hulls, handC, { hi: 0.14, lo: 0.34 });
    const th = [];
    sph(th, P, H(0.035, 0.026, 0.008), 0.013, nC);
    sph(th, P, H(0.082, 0.04, 0.02), 0.0095, nC);
    solid([hull(th)], mix(handC, [90, 40, 34], 0.05), { hi: 0.1, lo: 0.3 });
    // sleeve
    const ua = [], fa = [];
    sph(ua, P, add3(sh, [side * 0.004, 0, -0.045]), 0.045, nC);
    sph(ua, P, el, 0.04, nC);
    sph(fa, P, el, 0.039, nC);
    ring(fa, P, add3(wr, u, -0.004), u, 0.034, 0.034, nC);
    solid([hull(ua), hull(fa)], shirt, { hi: 0.2, lo: 0.36 });
    if (det) {
      // elbow folds, cuff rib
      strokeLine(g, [P(add3(el, [inw[0] * 0.02, 0.046, 0.035])), P(add3(el, [inw[0] * 0.012, 0.05, 0.0])), P(add3(el, [inw[0] * 0.024, 0.044, -0.03]))], 'rgba(0,0,0,0.22)', lw);
      strokeLine(g, [P(add3(el, [-inw[0] * 0.02, 0.04, 0.07])), P(add3(el, [0, 0.05, 0.05]))], 'rgba(0,0,0,0.14)', lw);
      strokeLine(g, ringArc(P, add3(wr, u, -0.03), u, 0.037, 20), 'rgba(0,0,0,0.2)', lw);
    }
  };
  // ---- head: neck, hair mass, ears, skull + jaw, hair cap, quiet features
  const hy = (o.head ?? 0) * 0.45, hp = o.nod ?? 0.07;
  const chp = Math.cos(hp), shp = Math.sin(hp), chy = Math.cos(hy), shy = Math.sin(hy);
  const HL = (x, y, z) => {
    const y1 = y * chp + z * shp, z1 = z * chp - y * shp;
    return [J.head[0] + x * chy - y1 * shy, J.head[1] + x * shy + y1 * chy, J.head[2] + z1];
  };
  const ell = (out, c, ax, ay, az, nLat, nLon, keep) => {
    for (let i = 0; i <= nLat; i++) {
      const la = -Math.PI / 2 + (Math.PI * i) / nLat;
      for (let j = 0; j < nLon; j++) {
        const lo = (TAU * j) / nLon;
        const x = c[0] + ax * Math.cos(la) * Math.cos(lo), y = c[1] + ay * Math.cos(la) * Math.sin(lo), z = c[2] + az * Math.sin(la);
        if (!keep || keep(x, y, z)) out.push(P(HL(x, y, z)));
      }
    }
    return out;
  };
  const head = () => {
    const nLa = lod === 2 ? 10 : 6, nLo = lod === 2 ? 18 : 10;
    // neck
    const nk = [];
    hring(nk, P, J.neck0, 0.054, 0.048, 0, nC);
    sph(nk, P, J.neck1, 0.046, nC);
    solid([hull(nk)], mix(skin, [80, 36, 30], 0.12), { hi: 0.08, lo: 0.36 });
    // crew collar (the rib around the neck)
    const col = frontArc(P, [0.002, -0.01, 1.462], 0.066, 0.058, 0.03, 30);
    if (col.length > 2) strokeLine(g, col, rgba(mix(shirt, [20, 8, 12], 0.3)), Math.max(1.2, 0.016 * s));
    // hair mass behind the skull
    const hb = ell([], [0, -0.03, o.long ? -0.03 : 0.016], 0.078, 0.088, o.long ? 0.13 : 0.094, nLa, nLo);
    solid([hull(hb)], hairC, { hi: 0.12, lo: 0.4 });
    // ears: the far one before the skull, the near one after
    const ear = (sd) => {
      const e = [];
      for (let i = 0; i < nC; i++) { const t = (i / nC) * TAU; e.push(P(HL(sd * 0.071, -0.006 + Math.cos(t) * 0.017, -0.01 + Math.sin(t) * 0.029))); }
      return hull(e);
    };
    const dC = D(HL(0, 0, 0));
    const ears = [-1, 1].map((sd) => [D(HL(sd * 0.08, 0, 0)) < dC, ear(sd)]);
    for (const [far, e] of ears) if (far) solid([e], mix(skin, [90, 40, 34], 0.15), { hi: 0.1, lo: 0.3 });
    const sk = [];
    ell(sk, [0, -0.008, 0.012], 0.072, 0.092, 0.098, nLa, nLo);
    ell(sk, [0, 0.022, -0.038], 0.058, 0.07, 0.07, nLa, nLo);
    solid([hull(sk)], skin, { hi: 0.2, lo: 0.32 });
    for (const [far, e] of ears) if (!far) {
      solid([e], mix(skin, [90, 40, 34], 0.1), { hi: 0.12, lo: 0.3 });
      if (det) { poly(g, e); g.strokeStyle = 'rgba(90,40,34,0.3)'; g.lineWidth = lw; g.stroke(); }
    }
    // jaw shadow under the chin onto the neck
    // hair cap: the part of the hair volume above the hairline (higher at the forehead, lower at the nape)
    const hc = ell([], [0, -0.006, 0.026], 0.08, 0.1, 0.102, lod === 2 ? 14 : 8, lod === 2 ? 24 : 12, (x, y, z) => z > 0.022 + 0.42 * y);
    if (hc.length > 2) {
      const H = hull(hc);
      solid([H], hairC, { hi: 0.22, lo: 0.42 });
      if (det) {
        // a soft sheen across the crown and the side parting
        strokeLine(g, [P(HL(-0.05, -0.03, 0.09)), P(HL(-0.015, 0.0, 0.112)), P(HL(0.03, 0.02, 0.1))], rgba(mix(hairC, [255, 236, 220], 0.3), 0.3), lw * 1.4);
        strokeLine(g, [P(HL(-0.03, 0.07, 0.07)), P(HL(-0.035, 0.0, 0.106)), P(HL(-0.03, -0.06, 0.09))], 'rgba(0,0,0,0.28)', lw);
      }
    }
    // features: only when the face turns toward the camera (fade out toward the overhead view)
    const fa = clamp((D(HL(0, 0.1, 0)) - D(HL(0, 0, 0))) / 0.1 * 2.2 - 0.35);
    if (lod === 2 && fa > 0.01) {
      g.save();
      g.globalAlpha *= fa;
      const Q = (x, y, z) => P(HL(x, y, z));
      // brows
      for (const sd of [-1, 1]) strokeLine(g, [Q(sd * 0.014, 0.089, 0.02), Q(sd * 0.03, 0.087, 0.026), Q(sd * 0.046, 0.076, 0.022)], rgba(mix(hairC, [0, 0, 0], 0.25), 0.85), lw * 1.5);
      // eyes: a soft socket shadow and a dark iris
      for (const sd of [-1, 1]) {
        const e = Q(sd * 0.03, 0.084, 0.002);
        L.lightBlob(g, e[0], e[1], 0.018 * s, [90, 40, 36], 0.35);
        g.fillStyle = 'rgba(30,18,18,0.92)';
        g.beginPath(); g.ellipse(e[0], e[1], Math.max(0, 0.0062 * s), Math.max(0, 0.0055 * s), 0, 0, TAU); g.fill();
      }
      // nose: the shaded side and the tip
      strokeLine(g, [Q(0.006, 0.094, -0.004), Q(0.011, 0.103, -0.03), Q(-0.004, 0.1, -0.036)], 'rgba(110,52,42,0.55)', lw * 1.2);
      // lips: a calm line, a touch of shadow under the lower lip
      strokeLine(g, [Q(-0.017, 0.088, -0.056), Q(0, 0.091, -0.054), Q(0.017, 0.088, -0.056)], 'rgba(120,52,48,0.55)', lw * 1.2);
      strokeLine(g, [Q(-0.008, 0.088, -0.068), Q(0.008, 0.088, -0.068)], 'rgba(110,52,42,0.22)', lw);
      g.restore();
    }
  };

  // ---- painter's order: feet, legs, the arms behind the torso, torso, the arms in front, head
  const parts = [
    [D(J.ankL), foot(J.ankL, -0.12)], [D(J.ankR), foot(J.ankR, 0.32)],
  ].sort((a, b) => a[0] - b[0]);
  const legs = [[D(J.kneeL), leg(J.hipL, J.kneeL, J.ankL, false)], [D(J.kneeR), leg(J.hipR, J.kneeR, J.ankR, true)]].sort((a, b) => a[0] - b[0]);
  const dT = D([0, 0, 1.18]);
  const arms = [[D(add3(J.elL, [0, 0.03, 0])), arm(J.shL, J.elL, J.wrL, -1)], [D(add3(J.elR, [0, 0.03, 0])), arm(J.shR, J.elR, J.wrR, 1)]].sort((a, b) => a[0] - b[0]);
  for (const [, f] of parts) f();
  for (const [, f] of legs) f();
  for (const [d, f] of arms) if (d < dT - 0.03) f();
  torso();
  for (const [d, f] of arms) if (d >= dT - 0.03) f();
  head();
}

let FIG = null;
/**
 * A standing person, feet centred on screen (x, y) (the middle of their square metre). s = px per metre (true scale:
 * 1.76 m tall). rot = body yaw (radians; crowds use it for variety). o: shirt, hair, pants, skin, a (alpha), breathe
 * (−1..1), head (head turn), lean [dx, dy] m, el (camera elevation, default π/2 = straight down like the map camera),
 * shadow (contact shadow, default on), rim (0..1 warm bounce rim on the right edge), long (longer hair), cast (ignored).
 * The figure is painted into a scratch canvas and laid down once, so a fading figure never shows its own overlaps.
 */
export function drawPerson(ctx, x, y, s, rot, o = {}) {
  const a = o.a ?? 1;
  if (a <= 0.003 || s < 2) return;
  const el = o.el ?? Math.PI / 2;
  const se = Math.sin(el), ce = Math.cos(el);
  ctx.save();
  ctx.globalAlpha *= a;
  // contact shadow on the floor, anchored at the feet (a soft pool + darker cores under the soles)
  if (o.shadow !== false) {
    const sx = 0.26 * s, sy = Math.max(1, 0.17 * s * se);
    const cx = x + 0.035 * s, cy = y + 0.03 * s * se;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(1, sy / sx);
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, sx);
    gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.26)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(0, 0, Math.max(0, sx), 0, TAU); ctx.fill();
    ctx.restore();
  }
  if (s < 9) {
    // far away: shoulders + head seen from above
    ctx.fillStyle = rgba(o.shirt ?? CORAL);
    ctx.beginPath(); ctx.ellipse(x, y - 1.3 * s * ce, Math.max(0, 0.22 * s), Math.max(0, 0.12 * s * se + 0.3 * s * ce), rot, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(o.hair ?? HAIRS[0]);
    ctx.beginPath(); ctx.arc(x, y - 1.62 * s * ce, Math.max(0, 0.085 * s), 0, TAU); ctx.fill();
    ctx.restore();
    return;
  }
  const lod = s >= 110 ? 2 : s >= 40 ? 1 : 0;
  // scratch canvas: feet at (fx, fy)
  const cw = Math.ceil(0.9 * s + 24), ch = Math.ceil((1.9 * ce + 0.75 * se) * s + 30);
  const fx = cw / 2, fy = Math.ceil((1.86 * ce + 0.36 * se) * s + 12);
  if (!FIG || FIG.width < cw || FIG.height < ch) FIG = new OffscreenCanvas(Math.max(cw, FIG?.width ?? 0, 64), Math.max(ch, FIG?.height ?? 0, 64));
  const g = FIG.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
  g.clearRect(0, 0, cw + 2, ch + 2);
  figure(g, projector(fx, fy, s, rot, el), o, lod);
  const rim = o.rim ?? 0;
  if (rim > 0.01) {
    // warm bounce from the glowing tile: a coral copy just right of and below the figure, behind it
    g.globalCompositeOperation = 'destination-over';
    g.filter = `drop-shadow(${(0.008 * s).toFixed(1)}px ${(0.004 * s).toFixed(1)}px 0px ${rgba(mix(CORAL, [255, 220, 200], 0.2), 0.75 * rim)})`;
    g.drawImage(FIG, 0, 0, cw, ch, 0, 0, cw, ch);
    g.filter = 'none';
    g.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(FIG, 0, 0, cw, ch, x - fx, y - fy, cw, ch);
  ctx.restore();
}

/** A 1 m tile centred at world (cx, cy), seen from straight above. o: a, rim (0..1 glow), face colour, edge colour, pop scale. */
export function drawTile(ctx, v, cx, cy, o = {}) {
  const s = 1 / v.cam.mpp, sc = o.scale ?? 1;
  const a = o.a ?? 1;
  if (a <= 0.003) return;
  const half = 0.47 * sc;
  const x = v.wx(cx - half), y = v.wy(cy - half), w = 2 * half * s;
  ctx.save();
  ctx.globalAlpha *= a;
  L.roundRect(ctx, x, y, w, w, Math.max(1, 0.05 * s * sc));
  if (s > 30) {
    const g = ctx.createLinearGradient(x, y, x + w, y + w);
    g.addColorStop(0, rgba(mix(o.face ?? TILE, [255, 220, 210], 0.1)));
    g.addColorStop(1, rgba(mix(o.face ?? TILE, [0, 0, 0], 0.2)));
    ctx.fillStyle = g;
  } else ctx.fillStyle = rgba(o.face ?? TILE);
  ctx.fill();
  const rim = o.rim ?? 0;
  if (s > 8) {
    ctx.strokeStyle = rgba(mix(o.edge ?? TILE_EDGE, CORAL, rim), 0.55 + 0.45 * rim);
    ctx.lineWidth = Math.max(1, Math.min(3, s * 0.008));
    if (rim > 0.05 && s > 20) { ctx.shadowColor = rgba(CORAL, 0.9 * rim); ctx.shadowBlur = Math.min(40, s * 0.12) * rim; }
    ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ hero animation (pure functions of time)
/** Hero idle pose at global time gt (a continuous idle: any time base works). */
export function heroPose(gt) {
  return {
    breathe: Math.sin(gt * 2 * Math.PI / 3.6),
    head: 0.3 * L.noise1(gt * 0.4, 11) + 0.18 * Math.sin(gt * 0.8),
    rot: 0.05 * L.noise1(gt * 0.3, 12),
    lean: [0.014 * Math.sin(gt * 0.9) + 0.008 * L.noise1(gt * 0.5, 13), 0.006 * L.noise1(gt * 0.4, 14)],
  };
}

/** Hero tile rim glow at beat-0 time bt (lights up at the start, pulses gently, then settles into the carpet). */
export function heroRim(bt) {
  const on = ease.outCubic(prog(bt, 0.15, 0.7));
  return on * (0.75 + 0.25 * Math.sin(bt * 2.4));
}

const HERO_DY = 138;  // beat 0: the hero's tile sits low in frame (y ≈ 1040), his head clear of the headline
const HERO_SC = 0.85; // beat 0: the hero is drawn a touch smaller than the map camera's scale (eases to 1 in the tilt)
/** Hook view at beat-0 time bt: camera elevation + vertical offset; tilts to straight overhead as the headline leaves. */
function heroView(bt, d0) {
  const k = ease.inOutCubic(prog(bt, d0 - 0.5, 0.8));
  return { el: lerp(HERO_EL, Math.PI / 2, k), dy: HERO_DY * (1 - k), sc: lerp(HERO_SC, 1, k), k };
}

/** Rounded-square tile outline in plan (metres, centred on 0), projected for elevation el. */
function tilePlan(half, r) {
  const out = [];
  for (const [cx, cy, a0] of [[half - r, -half + r, -Math.PI / 2], [half - r, half - r, 0], [-half + r, half - r, Math.PI / 2], [-half + r, -half + r, Math.PI]]) {
    for (let i = 0; i <= 6; i++) { const a = a0 + (i / 6) * (Math.PI / 2); out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  }
  return out;
}

function drawHero(ctx, v) {
  const sc = v.tl.scenes, bt = v.gt - sc[0].start, d0 = sc[0].end - sc[0].start;
  const hv = heroView(bt, d0), se = Math.sin(hv.el), ce = Math.cos(hv.el);
  const s = hv.sc / v.cam.mpp;
  if (s < 1.2) return;
  const ox = v.wx(0), oy = v.wy(0) + hv.dy;
  if (ox < -200 || ox > W + 200 || oy < -200 || oy > L.H + 200) return;
  const T = (px, py, z = 0) => [ox + px * s, oy + (py * se - z * ce) * s];   // plan (m) → screen
  // floor bloom under the tile (big when close, a soft coral spark when the carpet is far away)
  const near = clamp(L.invLerp(8, 60, s));
  const intro = ease.outCubic(prog(bt, 0.05, 1.0));
  L.lightBlob(ctx, ox, oy, Math.max(30, 1.5 * s), CORAL, (0.16 + 0.08 * Math.sin(bt * 2.4)) * intro * lerp(0.6, 1, near));
  const pop = ease.outBack(prog(bt, 0.0, 0.6), 1.4);
  const rim = heroRim(bt);
  if (hv.k >= 1 || s < 30) {
    drawTile(ctx, v, 0, 0, { rim, face: [70, 40, 42], edge: CORAL, scale: lerp(0.9, 1, pop), a: clamp(pop * 1.6) });
  } else {
    // the tile in the hook's perspective: a thin slab (front face + top), rim glowing along the top edge
    const half = 0.47 * lerp(0.9, 1, pop), plan = tilePlan(half, 0.05 * lerp(0.9, 1, pop));
    ctx.save();
    ctx.globalAlpha *= clamp(pop * 1.6);
    const TH = 0.035;
    // front face (the slab's thickness; only its lower half of the outline shows)
    poly(ctx, plan.map(([px, py]) => T(px, py, -TH)));
    ctx.fillStyle = rgba(mix([70, 40, 42], [10, 4, 6], 0.55));
    ctx.fill();
    const top = plan.map(([px, py]) => T(px, py, 0));
    poly(ctx, top);
    const fy0 = T(0, -half)[1], fy1 = T(0, half)[1];
    const gr = ctx.createLinearGradient(ox - half * s, fy0, ox + half * s, fy1);
    gr.addColorStop(0, rgba(mix([70, 40, 42], [255, 220, 210], 0.12)));
    gr.addColorStop(1, rgba(mix([70, 40, 42], [0, 0, 0], 0.18)));
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.strokeStyle = rgba(mix(CORAL, CORAL, rim), 0.55 + 0.45 * rim);
    ctx.lineWidth = Math.max(1, Math.min(3, s * 0.008));
    ctx.shadowColor = rgba(CORAL, 0.9 * rim); ctx.shadowBlur = Math.min(40, s * 0.12) * rim;
    ctx.stroke();
    ctx.restore();
  }
  // corner crop-marks: a precise "1 m" frame just outside the tile, in the floor's perspective (beat 0 only)
  const ck = ease.outCubic(prog(bt, 0.5, 0.6)) * (1 - ease.inCubic(prog(bt, 3.2, 0.4)));
  if (ck > 0 && s > 60) {
    ctx.save();
    ctx.strokeStyle = rgba([255, 225, 215], 0.55 * ck);
    ctx.lineWidth = 2;
    const e = 0.56, len = 0.09 * ck;
    ctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const a = T(sx * e, sy * e - sy * len), b = T(sx * e, sy * e), c = T(sx * e - sx * len, sy * e);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]);
    }
    ctx.stroke();
    ctx.restore();
  }
  // a quiet "1 m" dimension in front of the tile: it draws out from the centre, sets up "one square metre"
  const dk = ease.outCubic(prog(bt, 1.0, 0.7)) * (1 - ease.inCubic(prog(bt, 3.15, 0.4)));
  if (dk > 0 && s > 60) {
    const y = T(0, 0.47, -0.035)[1] + 40, xa = ox - 0.47 * s, xb = ox + 0.47 * s, w = (xb - xa) / 2 * dk;
    ctx.save();
    ctx.strokeStyle = 'rgba(240,228,225,0.7)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(ox - w, y - 14); ctx.lineTo(ox - w, y); ctx.lineTo(ox + w, y); ctx.lineTo(ox + w, y - 14);
    ctx.stroke();
    ctx.globalAlpha *= clamp(dk * 2 - 1);
    ctx.font = L.font(36, 700, L.FONT.body);
    ctx.fillStyle = 'rgba(240,228,225,0.9)';
    ctx.textBaseline = 'top';
    L.trackedText(ctx, '1 m', ox, y + 16, 2, 'center');
    ctx.restore();
  }
  // a light sweep across the tile face
  const sw = prog(bt, 1.0, 1.1);
  if (sw > 0 && sw < 1 && s > 40) {
    ctx.save();
    poly(ctx, tilePlan(0.47, 0.05).map(([px, py]) => T(px, py)));
    ctx.clip();
    const u = lerp(-1.4, 1.4, ease.inOutCubic(sw)) * s;
    const g = ctx.createLinearGradient(ox + u - 0.35 * s, oy - 0.35 * s * se, ox + u + 0.35 * s, oy + 0.35 * s * se);
    const al = 0.2 * Math.sin(Math.PI * sw);
    g.addColorStop(0, 'rgba(255,220,210,0)');
    g.addColorStop(0.5, `rgba(255,220,210,${al})`);
    g.addColorStop(1, 'rgba(255,220,210,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(ox - 0.5 * s, oy - 0.5 * s, s, s);
    ctx.restore();
  }
  const p = heroPose(v.gt);
  const pin = ease.outCubic(prog(bt, 0.15, 0.55));
  drawPerson(ctx, ox, oy, s * lerp(0.94, 1, pin), -0.3 + p.rot, {
    shirt: CORAL, hair: HAIRS[0], a: clamp(pin * 1.5) * clamp(L.invLerp(1.2, 3, s)), breathe: p.breathe, head: p.head, lean: p.lean,
    el: hv.el, rim: 0.8 * rim * (1 - hv.k), nod: -0.1,
  });
}

// ------------------------------------------------------------------ headline
const LINES = [
  { words: [['COULD EVERY HUMAN', false]], y: 470, t0: 0.3 },
  { words: [['FIT', true], [' IN ONE PLACE?', false]], y: 600, t0: 0.58 },
];
const HEAD_SIZE = 128;

export default {
  beat: 0,
  chapter: null,
  captions: false,
  layer: 2,
  cues(d) {
    return [
      { t: 0.12, name: 'bloom', gain: 0.32, pitch: 0.9 },
      { t: 0.3, name: 'swish', gain: 0.2, pitch: 1.0 },
      { t: 0.58, name: 'swish', gain: 0.18, pitch: 1.15 },
      { t: 0.95, name: 'ping', gain: 0.22, pitch: 1.2 },
      { t: 1.05, name: 'shimmer', gain: 0.14, pitch: 1.0 },
      { t: d - 0.3, name: 'swish', gain: 0.16, pitch: 0.8 },
    ];
  },
  drawWorld(ctx, v) {
    if (v.gt > v.tl.scenes[2].end) return;
    drawHero(ctx, v);
  },
  drawOverlay(ctx, v) {
    const t = v.t, d = v.d;
    ctx.save();
    ctx.font = L.font(HEAD_SIZE, 800, L.FONT.display);
    const size = L.fitSize(ctx, 'COULD EVERY HUMAN', 880, HEAD_SIZE, 800, L.FONT.display);
    // a soft dark plate behind the headline: keeps it crisp over the floor glow
    const pk = ease.outCubic(prog(t, 0.1, 0.6)) * (1 - ease.inCubic(prog(t, d - 0.3, 0.3)));
    if (pk > 0) {
      const g = ctx.createRadialGradient(W / 2, 545, 40, W / 2, 545, 560);
      g.addColorStop(0, `rgba(8,5,7,${0.5 * pk})`);
      g.addColorStop(1, 'rgba(8,5,7,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 545 - 560, W, 2 * 560);   // the full radius: no hard edge where the rect would end
    }
    // accent rule draws in above the headline
    const rk = L.enter(t, 0.15, 0.6, ease.outExpo) * (1 - L.enter(t, d - 0.32, 0.28, ease.inCubic));
    if (rk > 0) {
      ctx.fillStyle = rgba(v.accent, 0.95);
      ctx.fillRect(W / 2 - 70 * rk, 330, 140 * rk, 5);
    }
    LINES.forEach((ln, i) => {
      const kin = L.enter(t, ln.t0, 0.65, ease.outExpo);
      const kout = L.enter(t, d - 0.34 + i * 0.05, 0.3, ease.inCubic);
      if (kin <= 0 || kout >= 1) return;
      ctx.save();
      ctx.font = L.font(size, 800, L.FONT.display);
      ctx.letterSpacing = '-1px';
      const widths = ln.words.map(([w]) => ctx.measureText(w).width);
      ctx.letterSpacing = '0px';
      const total = widths.reduce((s, w) => s + w, 0);
      const top = ln.y - size * 0.82, bot = ln.y + size * 0.14;
      ctx.beginPath(); ctx.rect(0, top - 8, W, bot - top + 18); ctx.clip();
      const dy = (1 - kin) * size * 1.05 - kout * size * 1.1;
      let x = W / 2 - total / 2;
      ctx.textBaseline = 'alphabetic';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 18;
      ln.words.forEach(([w, acc], j) => {
        ctx.fillStyle = acc ? rgba(v.accent) : rgba([250, 240, 236]);
        L.trackedText(ctx, w, x, ln.y + dy, -1, 'left');
        if (acc) {
          // a coral underline wipes in under FIT
          const uk = L.enter(t, ln.t0 + 0.35, 0.5, ease.outExpo) * (1 - kout);
          ctx.shadowBlur = 0;
          ctx.fillRect(x + 4, ln.y + dy + 14, (widths[j] - 10) * uk, 7);
          ctx.shadowBlur = 18;
        }
        x += widths[j];
      });
      ctx.restore();
    });
    ctx.restore();
  },
};
