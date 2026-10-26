// Beat 0 — the hook: the Sun shrinks down to a basketball, drops beside a 1.75 m person (side-on card),
// grows basketball seams, then the card tilts away and the ball glides into the top-down world Sun.
// The Sun is drawn here for the WHOLE film: world space, true size (0.24 m at the origin), with a glow
// clamped in px so it stays a bright point at town scale and on the globe.
import * as L from '../../../../engine/runtime/lib.js';
import { SUN_DIAM, at as camAt } from '../camera.js';
import { globeK } from '../env.js';

const TAU = Math.PI * 2;
const SUN_R = SUN_DIAM / 2;

// ------------------------------------------------------------------ hook card layout (screen px)
const GROUND = 1300;                 // floor line of the side-on card
const PPM = 354;                     // card scale: px per metre (1.75 m person = 620 px)
const PERSON_X = 372;
const BALL_X = 650;
const BALL_R = SUN_R * PPM;          // 42.5 px
const REST_Y = GROUND - BALL_R;
const DROP = 150;                    // the ball finishes shrinking this far above the floor, then drops
const T_SHRINK = 1.5;                // shrink ends (ball hangs, then falls)
const G = 2 * DROP / (0.3 * 0.3);    // gravity so the fall takes 0.3 s
const BOUNCES = [[T_SHRINK + 0.3, 46], [0, 13]];   // [landing time, rebound height px]
const T_MORPH = 2.85, MORPH = 1.35;   // the card tilts away into the top-down view

/** Ball height above its rest position (px) and squash amount at time t. */
function ballBounce(t) {
  if (t < T_SHRINK) return { h: DROP, q: 0 };
  let t0 = T_SHRINK, land = T_SHRINK + 0.3;
  if (t < land) { const a = t - t0; return { h: Math.max(0, DROP - 0.5 * G * a * a), q: 0 }; }
  for (const [, hgt] of BOUNCES) {
    const up = Math.sqrt(2 * hgt / G), dur = 2 * up;
    const a = t - land;
    if (a < dur) {
      const imp = Math.max(0, 1 - a / 0.07);              // squash right after each landing
      return { h: Math.max(0, G * up * a - 0.5 * G * a * a), q: imp * (hgt / 46) * 0.14 };
    }
    land += dur;
  }
  const a = t - land;
  return { h: 0, q: Math.max(0, 1 - a / 0.07) * 0.03 };
}
const LANDINGS = (() => { let l = T_SHRINK + 0.3; const out = [l]; for (const [, h] of BOUNCES) { l += 2 * Math.sqrt(2 * h / G); out.push(l); } return out; })();

/** Morph progress 0..1 (card → top-down). */
const morphK = (t) => L.ease.inOutCubic(L.prog(t, T_MORPH, MORPH));

/** Where the ball / Sun is on screen at beat-0 time t: {x, y, r, q, seam, glowSeam, card}. */
function ballState(t, v) {
  const wx = v.wx(0), wy = v.wy(0), wr = SUN_R / v.cam.mpp;
  if (t >= T_MORPH + MORPH) return { x: wx, y: wy, r: wr, q: 0, card: 0 };
  const b = ballBounce(t);
  let x = BALL_X, y = REST_Y - b.h, r = BALL_R;
  if (t < T_SHRINK) {
    // shrink: from a Sun that fills the frame down to a 24 cm ball (log-space so the size change feels even)
    const e = L.ease.inOutCubic(L.prog(t, 0, T_SHRINK));
    r = Math.exp(L.lerp(Math.log(760), Math.log(BALL_R), e));
    x = L.lerp(540, BALL_X, L.ease.inOutCubic(L.prog(t, 0.2, T_SHRINK - 0.2)));
    y = L.lerp(930, REST_Y - DROP, L.ease.inOutCubic(L.prog(t, 0.2, T_SHRINK - 0.2)));
  }
  const m = morphK(t);
  if (m > 0) {
    x = L.lerp(x, wx, m);
    y = L.lerp(y, wy, m);
    r = Math.exp(L.lerp(Math.log(r), Math.log(wr), m));
  }
  return { x, y, r, q: b.q * (1 - m), card: 1 - m };
}

// ------------------------------------------------------------------ the Sun

let GRAN = null;
/** Granulation texture (built once, deterministic). Neutral grey = no change under 'overlay'. */
function granulation() {
  if (GRAN) return GRAN;
  const n = 384, cv = new OffscreenCanvas(n, n), c = cv.getContext('2d');
  c.fillStyle = 'rgb(92,92,92)';
  c.fillRect(0, 0, n, n);
  const r = L.rng(404), cells = 26, step = n / cells;
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      const x = (i + 0.5 + (r() - 0.5) * 0.7) * step, y = (j + 0.5 + (r() - 0.5) * 0.7) * step;
      const rad = step * (0.42 + r() * 0.22);
      const g = c.createRadialGradient(x, y, 0, x, y, rad);
      const b = 175 + r() * 50;
      g.addColorStop(0, `rgba(${b},${b},${b},1)`);
      g.addColorStop(0.7, `rgba(${b - 30},${b - 30},${b - 30},0.8)`);
      g.addColorStop(1, 'rgba(92,92,92,0)');
      c.fillStyle = g;
      for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) {   // wrap so the texture tiles seamlessly
        if (x + ox + rad < 0 || x + ox - rad > n || y + oy + rad < 0 || y + oy - rad > n) continue;
        c.save(); c.translate(ox, oy); c.fillRect(x - rad, y - rad, rad * 2, rad * 2); c.restore();
      }
    }
  }
  GRAN = cv;
  return cv;
}

/** Point on a basketball seam curve (unit sphere), before rotation. */
const SEAMS = [
  (u) => [Math.cos(u), Math.sin(u), 0],
  (u) => [0, Math.cos(u), Math.sin(u)],
  (u) => [0.6, 0.8 * Math.cos(u), 0.8 * Math.sin(u)],
  (u) => [-0.6, 0.8 * Math.cos(u), 0.8 * Math.sin(u)],
];

function rotate([x, y, z], ax, ay, az) {
  let c = Math.cos(ax), s = Math.sin(ax);
  [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(ay); s = Math.sin(ay);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(az); s = Math.sin(az);
  [x, y] = [x * c - y * s, x * s + y * c];
  return [x, y, z];
}

/** Basketball seams over the disc. k: visibility, draw: draw-on 0..1, hot: 0 dark leather seams → 1 glowing. */
function drawSeams(c, x, y, R, gt, k, draw, hot) {
  if (k <= 0 || R < 6) return;
  const ax = 0.55, ay = 0.35 + gt * 0.22, az = 0.35;
  c.save();
  c.lineCap = 'round';
  c.lineWidth = Math.max(1, R * 0.045);
  if (hot > 0) c.globalCompositeOperation = 'lighter';
  const col = L.mix([62, 22, 8], [255, 236, 190], hot);
  const N = 72;
  for (const f of SEAMS) {
    let prev = null;
    for (let i = 0; i <= N * draw; i++) {
      const u = (i / N) * TAU;
      const p = rotate(f(u), ax, ay, az);
      const vis = L.clamp(p[2] / 0.25);
      const q = [x + p[0] * R, y + p[1] * R, vis];
      if (prev && (vis > 0 || prev[2] > 0)) {
        c.strokeStyle = L.rgba(col, 0.82 * k * Math.min(vis, prev[2]) ** 0.8 * (hot > 0 ? 0.7 : 1));
        c.beginPath(); c.moveTo(prev[0], prev[1]); c.lineTo(q[0], q[1]); c.stroke();
      }
      prev = q;
    }
  }
  c.restore();
}

/** The glowing Sun disc at screen (x, y), radius R px. */
export function drawSun(c, x, y, R, gt, { seam = 0, seamDraw = 1, seamHot = 0, glowK = 1, pool = 0 } = {}) {
  // glow first (clamped in px so the Sun stays a beacon when it is sub-pixel)
  const pulse = 1 + 0.04 * Math.sin(gt * 2.1) + 0.03 * L.noise1(gt * 0.9, 7);
  if (pool > 0) {   // warm light pooling on the ground around it
    L.lightBlob(c, x, y, Math.min(1400, Math.max(140, R * 7)), [255, 140, 50], 0.16 * pool);
  }
  L.lightBlob(c, x, y, Math.max(R * 3.0, 70) * pulse, [255, 128, 40], 0.55 * glowK);
  L.lightBlob(c, x, y, Math.max(R * 1.55, 20) * pulse, [255, 196, 110], 0.85 * glowK);
  if (R < 1.4) {
    c.fillStyle = 'rgba(255,248,225,1)';
    c.beginPath(); c.arc(x, y, Math.max(1.6, R), 0, TAU); c.fill();
    return;
  }
  // limb-darkened body
  c.save();
  const g = c.createRadialGradient(x - R * 0.08, y - R * 0.1, 0, x, y, R);
  g.addColorStop(0, '#fff8e2');
  g.addColorStop(0.45, '#ffd170');
  g.addColorStop(0.8, '#f8962f');
  g.addColorStop(0.94, '#d65a17');
  g.addColorStop(1, '#a8360b');
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, Math.max(0, R), 0, TAU); c.fill();
  // granulation shimmer (two drifting layers of the same texture)
  if (R > 14) {
    c.clip();
    const tex = granulation();
    const a = L.clamp((R - 14) / 40);
    c.globalCompositeOperation = 'overlay';
    // cells ~R/12 px on a ball-sized Sun, but never bigger than ~22 px (a giant Sun gets finer, denser grain)
    const cell = Math.min(22, R / 12), sc = cell / (384 / 26);
    for (let i = 0; i < 2; i++) {
      const pat = c.createPattern(tex, 'repeat');
      pat.setTransform(new DOMMatrix().translate(x, y).rotate((i ? 110 + gt * 1.4 : gt * -0.9)).scale(sc * (i ? 1.12 : 1)).translate(i ? L.noise1(gt * 0.3, 3) * 40 : 0, 0));
      c.globalAlpha = a * (i ? 0.22 + 0.12 * Math.sin(gt * 1.3) : 0.4);
      c.fillStyle = pat;
      c.fillRect(x - R, y - R, R * 2, R * 2);
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    // re-darken the limb over the texture
    const lg = c.createRadialGradient(x, y, R * 0.6, x, y, R);
    lg.addColorStop(0, 'rgba(160,50,10,0)');
    lg.addColorStop(1, 'rgba(150,40,8,0.55)');
    c.fillStyle = lg;
    c.fillRect(x - R, y - R, R * 2, R * 2);
  }
  c.restore();
  drawSeams(c, x, y, R, gt, seam, seamDraw, seamHot);
  // bright hot rim
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = 'rgba(255,170,80,0.35)';
  c.lineWidth = Math.max(1, R * 0.03);
  c.beginPath(); c.arc(x, y, Math.max(0, R), 0, TAU); c.stroke();
  c.restore();
}

// ------------------------------------------------------------------ the person (side-on, facing the ball)
// A man in a tailored jacket and trousers, true 1:7.5 adult proportions, side profile facing +x (the ball), relaxed
// stance: weight on the far (straight) leg, the near knee eased forward, near arm hanging with a soft elbow bend.
// Built like the approved figure in episode 22 (s01-lifetime.js): layered tubes with value steps, folds, a face
// profile, short hair. The Sun-ball's warm light wraps the front edge and a rim copy outlines it.
const P = (x, y) => [x, -y];   // metres (y up) → canvas (y down)
const RIMC = [255, 170, 90];

/** closed smooth outline through pts (quadratic through midpoints) */
function smooth(c, pts) {
  const n = pts.length;
  const m = (i) => { const a = pts[i % n], b = pts[(i + 1) % n]; return [(a[0] + b[0]) / 2, -(a[1] + b[1]) / 2]; };
  const s = m(0);
  c.moveTo(s[0], s[1]);
  for (let i = 1; i <= n; i++) { const p = pts[i % n], e = m(i); c.quadraticCurveTo(p[0], -p[1], e[0], e[1]); }
  c.closePath();
}
/** a limb tube along joints J with radii R, as an outline point list */
function tube(J, R) {
  const L1 = [], L2 = [];
  for (let i = 0; i < J.length; i++) {
    const a = J[Math.max(0, i - 1)], b = J[Math.min(J.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    L1.push([J[i][0] - dy * R[i], J[i][1] + dx * R[i]]);
    L2.push([J[i][0] + dy * R[i], J[i][1] - dx * R[i]]);
  }
  return L1.concat(L2.reverse());
}
const lerp2 = (a, b, t) => [L.lerp(a[0], b[0], t), L.lerp(a[1], b[1], t)];

function pose(gt) {
  const br = Math.sin(gt * 1.9) * 0.004, sway = Math.sin(gt * 0.7) * 0.004;
  return {
    br, sway,
    far: { hip: [-0.02, 0.93], knee: [-0.012, 0.51], ankle: [-0.03, 0.095] },
    near: { hip: [0.025, 0.925], knee: [0.1, 0.52], ankle: [0.075, 0.095] },
    sh: [-0.005 + sway, 1.42 + br], el: [-0.045 + sway, 1.14 + br], wr: [0.0 + sway, 0.885 + br],
    fsh: [-0.05 + sway, 1.42 + br], fel: [-0.095 + sway, 1.15 + br], fwr: [-0.075 + sway, 0.9 + br],
    hc: [0.045 + sway, 1.64 + br],
  };
}

const C = {
  jacket: [44, 48, 58], trousers: [30, 33, 42], shoe: [16, 17, 22], sole: [62, 60, 62],
  skin: [92, 78, 74], hair: [20, 20, 24], line: 'rgba(4,6,10,0.55)', fold: 'rgba(4,6,10,0.4)', hi: 'rgba(255,200,150,0.14)',
};

/** fill the current path with a vertical body gradient, then the ball's warm light wrapping from the front edge */
function shadeFill(c, col, x0, x1, y0, y1, dim = 0) {
  const g = c.createLinearGradient(0, -y1, 0, -y0);
  g.addColorStop(0, L.rgba(L.mix(col, [150, 150, 160], 0.1 - dim * 0.08)));
  g.addColorStop(1, L.rgba(L.mix(col, [6, 7, 10], 0.25 + dim)));
  c.fillStyle = g;
  c.fill();
  c.save();
  c.clip();
  const w = c.createLinearGradient(x1, 0, x1 - (x1 - x0) * 0.5, 0);
  w.addColorStop(0, L.rgba(RIMC, 0.2 * (1 - dim) * SHADE.warm)); w.addColorStop(1, L.rgba(RIMC, 0));
  c.fillStyle = w;
  c.fillRect(x0 - 0.05, -y1 - 0.05, x1 - x0 + 0.1, y1 - y0 + 0.1);
  c.restore();
}
const SHADE = { warm: 1 };

function shoe(c, ankle, dim) {
  const ax = ankle[0];
  const up = [[ax - 0.07, 0.022], [ax - 0.074, 0.075], [ax - 0.035, 0.1], [ax + 0.04, 0.094], [ax + 0.11, 0.064], [ax + 0.18, 0.045], [ax + 0.205, 0.03], [ax + 0.2, 0.022]];
  c.beginPath(); smooth(c, up.concat([[ax + 0.06, 0.018]]));
  shadeFill(c, C.shoe, ax - 0.08, ax + 0.21, 0.02, 0.1, dim);
  c.strokeStyle = C.line; c.stroke();
  c.beginPath();
  c.moveTo(...P(ax - 0.074, 0.024)); c.lineTo(...P(ax + 0.2, 0.024));
  c.quadraticCurveTo(...P(ax + 0.215, 0.02), ...P(ax + 0.205, 0.008));
  c.lineTo(...P(ax + 0.02, 0.0)); c.lineTo(...P(ax - 0.074, 0.0)); c.closePath();
  c.fillStyle = L.rgba(L.mix(C.sole, [0, 0, 0], dim)); c.fill();
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.fillRect(ax - 0.005, -0.012, 0.004, 0.012);
  c.strokeStyle = 'rgba(255,200,150,0.2)'; c.lineWidth = 0.005;
  c.beginPath(); c.moveTo(...P(ax + 0.0, 0.098)); c.quadraticCurveTo(...P(ax + 0.05, 0.088), ...P(ax + 0.09, 0.07)); c.stroke();
  c.strokeStyle = 'rgba(255,205,160,0.24)'; c.lineWidth = 0.006;
  c.beginPath(); c.moveTo(...P(ax + 0.07, 0.08)); c.quadraticCurveTo(...P(ax + 0.15, 0.06), ...P(ax + 0.195, 0.034)); c.stroke();
}

function leg(c, lg, dim) {
  const { hip, knee, ankle } = lg;
  const J = [hip, lerp2(hip, knee, 0.5), knee, lerp2(knee, ankle, 0.5), [ankle[0] + 0.005, 0.105]];
  c.beginPath(); smooth(c, tube(J, [0.085, 0.072, 0.058, 0.055, 0.052]));
  shadeFill(c, C.trousers, -0.12, 0.16, 0.1, 0.95, dim);
  c.lineWidth = 0.005; c.strokeStyle = C.line; c.stroke();
  c.strokeStyle = C.fold; c.lineWidth = 0.006; c.lineCap = 'round';
  const kb = [knee[0] - 0.05, knee[1]];
  c.beginPath(); c.moveTo(...P(kb[0], kb[1] + 0.03)); c.quadraticCurveTo(...P(kb[0] + 0.03, kb[1]), ...P(kb[0] + 0.005, kb[1] - 0.04)); c.stroke();
  c.beginPath(); c.moveTo(...P(ankle[0] - 0.02, 0.15)); c.quadraticCurveTo(...P(ankle[0] + 0.02, 0.13), ...P(ankle[0] + 0.05, 0.14)); c.stroke();
  c.strokeStyle = C.hi; c.lineWidth = 0.004;
  c.beginPath(); c.moveTo(...P(hip[0] + 0.06, hip[1] - 0.1)); c.lineTo(...P(knee[0] + 0.04, knee[1])); c.lineTo(...P(ankle[0] + 0.04, 0.13)); c.stroke();
  shoe(c, ankle, dim);
}

function hand(c, wr, dir, dim) {
  const [ux, uy] = dir, wx = -uy, wy = ux;
  const Q = (u, w) => [wr[0] + ux * u + wx * w, wr[1] + uy * u + wy * w];
  const palm = [Q(-0.01, -0.028), Q(0.05, -0.034), Q(0.1, -0.03), Q(0.15, -0.012), Q(0.16, 0.006), Q(0.13, 0.022), Q(0.08, 0.03), Q(0.03, 0.032), Q(-0.01, 0.026)];
  c.beginPath(); smooth(c, palm);
  shadeFill(c, C.skin, wr[0] - 0.05, wr[0] + 0.05, wr[1] - 0.17, wr[1] + 0.01, dim);
  c.strokeStyle = C.line; c.lineWidth = 0.004; c.stroke();
  c.beginPath(); smooth(c, [Q(0.02, 0.02), Q(0.07, 0.04), Q(0.105, 0.036), Q(0.1, 0.022), Q(0.05, 0.016)]);
  c.fillStyle = L.rgba(L.mix(C.skin, [8, 8, 10], 0.15 + dim)); c.fill(); c.stroke();
}

function arm(c, sh, el, wr, dim) {
  const J = [sh, lerp2(sh, el, 0.5), el, lerp2(el, wr, 0.5), wr];
  const d = [wr[0] - el[0], wr[1] - el[1]], dl = Math.hypot(...d);
  hand(c, [wr[0] + d[0] / dl * 0.02, wr[1] + d[1] / dl * 0.02], [d[0] / dl, d[1] / dl], dim);
  c.beginPath(); smooth(c, tube(J, [0.058, 0.05, 0.046, 0.043, 0.041]));
  shadeFill(c, C.jacket, sh[0] - 0.08, sh[0] + 0.08, wr[1], sh[1] + 0.06, dim);
  c.strokeStyle = C.line; c.lineWidth = 0.005; c.stroke();
  c.strokeStyle = C.fold; c.lineWidth = 0.006; c.lineCap = 'round';
  c.beginPath(); c.moveTo(...P(el[0] + 0.03, el[1] + 0.04)); c.quadraticCurveTo(...P(el[0] + 0.01, el[1]), ...P(el[0] + 0.035, el[1] - 0.03)); c.stroke();
  const cu = lerp2(el, wr, 0.86);
  c.strokeStyle = C.hi; c.lineWidth = 0.005;
  c.beginPath(); c.moveTo(...P(cu[0] - 0.042, cu[1] - 0.004)); c.lineTo(...P(cu[0] + 0.042, cu[1] + 0.012)); c.stroke();
}

function jacket(c, q) {
  const b = q.br, s = q.sway;
  const pts = [
    [-0.045 + s, 1.53 + b], [-0.1 + s, 1.47 + b], [-0.128 + s, 1.37 + b], [-0.122 + s, 1.24 + b], [-0.105 + s, 1.12], [-0.118, 1.0],
    [-0.13, 0.86], [-0.132, 0.79], [0.0, 0.775], [0.122, 0.79], [0.128, 0.88], [0.118, 1.0], [0.124 + s, 1.12],
    [0.138 + s, 1.27 + b], [0.12 + s, 1.4 + b], [0.07 + s, 1.5 + b], [0.03 + s, 1.535 + b],
  ];
  c.beginPath(); smooth(c, pts);
  shadeFill(c, C.jacket, -0.14, 0.14, 0.77, 1.54, 0);
  c.strokeStyle = C.line; c.lineWidth = 0.005; c.stroke();
  c.strokeStyle = C.fold; c.lineWidth = 0.006; c.lineCap = 'round';
  c.beginPath(); c.moveTo(...P(0.06 + s, 1.49 + b)); c.quadraticCurveTo(...P(0.13 + s, 1.34 + b), ...P(0.122, 1.08)); c.stroke();
  c.beginPath(); c.moveTo(...P(0.02, 0.93)); c.lineTo(...P(0.115, 0.935)); c.stroke();
  c.strokeStyle = C.hi; c.lineWidth = 0.005;
  c.beginPath(); c.moveTo(...P(-0.128, 0.795)); c.quadraticCurveTo(...P(0.0, 0.782), ...P(0.12, 0.795)); c.stroke();
  c.fillStyle = 'rgba(255,200,150,0.3)';
  c.beginPath(); c.arc(...P(0.124, 1.02), 0.007, 0, TAU); c.fill();
}

function head(c, q) {
  const [hx, hy] = q.hc;
  c.beginPath(); smooth(c, [[hx - 0.07, hy - 0.06], [hx + 0.02, hy - 0.1], [hx + 0.035, hy - 0.16], [hx - 0.02, hy - 0.17], [hx - 0.07, hy - 0.15]]);
  shadeFill(c, C.skin, hx - 0.08, hx + 0.04, hy - 0.18, hy - 0.05, 0.1);
  const F = [[-0.035, 0.122], [0.045, 0.118], [0.088, 0.078], [0.098, 0.04], [0.094, 0.025], [0.122, -0.012], [0.1, -0.028],
    [0.104, -0.045], [0.097, -0.058], [0.1, -0.072], [0.084, -0.1], [0.05, -0.112], [0.01, -0.104], [-0.04, -0.08],
    [-0.078, -0.06], [-0.108, -0.01], [-0.112, 0.055], [-0.085, 0.105]].map(([x, y]) => [hx + x, hy + y]);
  c.beginPath(); smooth(c, F);
  shadeFill(c, C.skin, hx - 0.12, hx + 0.13, hy - 0.12, hy + 0.13, 0);
  c.strokeStyle = C.line; c.lineWidth = 0.004; c.stroke();
  const Hh = [[-0.04, 0.132], [0.05, 0.126], [0.086, 0.09], [0.07, 0.07], [0.02, 0.078], [-0.005, 0.045], [-0.03, 0.01],
    [-0.06, -0.035], [-0.085, -0.055], [-0.113, -0.01], [-0.118, 0.06], [-0.09, 0.114]].map(([x, y]) => [hx + x, hy + y]);
  c.beginPath(); smooth(c, Hh);
  shadeFill(c, C.hair, hx - 0.12, hx + 0.09, hy - 0.06, hy + 0.135, 0.05);
  c.beginPath(); c.ellipse(hx - 0.022, -(hy - 0.005), 0.018, 0.03, 0.15, 0, TAU);
  c.fillStyle = L.rgba(L.mix(C.skin, [200, 150, 110], 0.1)); c.fill();
  c.strokeStyle = C.fold; c.lineWidth = 0.004; c.stroke();
  c.strokeStyle = 'rgba(4,6,10,0.5)'; c.lineWidth = 0.005;
  c.beginPath(); c.moveTo(...P(hx + 0.055, hy + 0.028)); c.quadraticCurveTo(...P(hx + 0.075, hy + 0.04), ...P(hx + 0.093, hy + 0.034)); c.stroke();
  c.lineWidth = 0.004;
  c.beginPath(); c.moveTo(...P(hx + 0.088, hy - 0.05)); c.lineTo(...P(hx + 0.1, hy - 0.051)); c.stroke();
  c.beginPath(); smooth(c, [[hx - 0.062, hy - 0.128], [hx - 0.01, hy - 0.142], [hx + 0.03, hy - 0.152], [hx + 0.034, hy - 0.168], [hx - 0.01, hy - 0.162], [hx - 0.066, hy - 0.146]]);
  c.fillStyle = 'rgb(92,96,104)'; c.fill();
  c.strokeStyle = C.line; c.stroke();
}

function figure(c, q) {
  leg(c, q.far, 0.22);
  arm(c, q.fsh, q.fel, q.fwr, 0.3);
  leg(c, q.near, 0);
  jacket(c, q);
  head(c, q);
  arm(c, q.sh, q.el, q.wr, 0);
}

// painted into a scratch canvas, then laid down twice: a flat warm copy nudged toward the ball (the rim light on the
// front edge) and the figure itself on top; one layer, so the whole figure fades without seams
let FIGCV = null, RIMCV = null;
const FCW = 400, FCH = 700, FC_OX = 150;
function drawPerson(c, x, ground, H, gt, rim, alpha) {
  if (alpha <= 0) return;
  const ppm = H / 1.75;
  FIGCV ??= new OffscreenCanvas(FCW, FCH);
  RIMCV ??= new OffscreenCanvas(FCW, FCH);
  const g = FIGCV.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, FCW, FCH);
  g.translate(FC_OX, FCH - 20);
  g.scale(ppm, ppm);
  g.lineJoin = 'round';
  SHADE.warm = 0.35 + 0.65 * rim;
  figure(g, pose(gt));
  const r = RIMCV.getContext('2d');
  r.globalCompositeOperation = 'copy';
  r.drawImage(FIGCV, 0, 0);
  r.globalCompositeOperation = 'source-in';
  r.fillStyle = L.rgba(RIMC);
  r.fillRect(0, 0, FCW, FCH);
  r.globalCompositeOperation = 'source-over';
  c.save();
  const a0 = c.globalAlpha * alpha;
  c.globalAlpha = a0;
  c.fillStyle = 'rgba(0,0,0,0.5)';   // contact shadow under the feet
  c.beginPath(); c.ellipse(x + 20, ground + 1, 70, 6, 0, 0, TAU); c.fill();
  const ox = x - FC_OX, oy = ground - (FCH - 20);
  const rw = 3.2;
  if (rim > 0) { c.globalAlpha = a0 * 0.85 * rim; c.drawImage(RIMCV, ox + rw, oy - rw * 0.4); }
  c.globalAlpha = a0;
  c.drawImage(FIGCV, ox, oy);
  c.restore();
}

// ------------------------------------------------------------------ card backdrop

function drawCard(c, v, t, st) {
  const m = morphK(t);
  const back = 1 - L.smoothstep(L.clamp(m * 1.35));
  if (back <= 0) return;
  const { W, H } = L;
  c.save();
  c.globalAlpha = back;
  // the floor only appears once the shrinking Sun has risen clear of the horizon (it must never read as in front)
  // (measured on the shrink only, so it never drops back when the ball lands on the floor)
  const sf = t < T_SHRINK ? st : ballState(T_SHRINK, v);
  const floorK = L.ease.inOutCubic(L.clamp((GROUND - 24 - (sf.y + sf.r)) / 110));
  const sky = c.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, '#05060a');
  sky.addColorStop(1, '#0d0d12');
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);
  const fl = c.createLinearGradient(0, GROUND, 0, H);
  fl.addColorStop(0, '#16161b');
  fl.addColorStop(1, '#070709');
  c.fillStyle = fl;
  c.globalAlpha = back * floorK;
  c.fillRect(0, GROUND, W, H - GROUND);
  c.globalAlpha = back;
  // a cool, soft wash on the back wall so the silhouette separates from the dark
  const pin0 = L.ease.outCubic(L.prog(t, 0.4, 1.0));
  c.save();
  c.translate(PERSON_X - 20, GROUND - 330);
  c.scale(1, 1.7);
  const wash = c.createRadialGradient(0, 0, 0, 0, 0, 330);
  wash.addColorStop(0, `rgba(70,82,104,${0.22 * pin0})`);
  wash.addColorStop(1, 'rgba(70,82,104,0)');
  c.fillStyle = wash;
  c.fillRect(-330, -330, 660, 660);
  c.restore();
  c.restore();

  // the floor plane, person and dimension "tilt" away: squash toward the floor line + fade
  const tilt = 1 - 0.85 * m;
  const fade = 1 - L.clamp(m * 1.8);
  // the person is revealed only once the shrinking Sun's limb is clear of them (never seen through the Sun)
  const sp = t < T_MORPH ? st : ballState(T_MORPH - 0.01, v);   // (once the card tilts away, the fade takes over)
  const pin = L.ease.outCubic(L.clamp(((sp.x - sp.r) - (PERSON_X + 110)) / 140)) * (t > 0.3 ? 1 : 0);
  if (fade <= 0) return;
  c.save();
  c.translate(0, GROUND + 520 * m);
  c.scale(1, tilt);
  c.translate(0, -GROUND);
  // horizon / floor line with perspective floor lines
  c.globalAlpha = fade * floorK;
  c.strokeStyle = 'rgba(235,225,210,0.16)';
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(40, GROUND); c.lineTo(W - 40, GROUND); c.stroke();
  c.strokeStyle = 'rgba(235,225,210,0.05)';
  c.lineWidth = 1;
  for (let i = -8; i <= 8; i++) {
    c.beginPath(); c.moveTo(W / 2 + i * 70, GROUND); c.lineTo(W / 2 + i * 260, L.H); c.stroke();
  }
  for (const yy of [1335, 1390, 1470, 1590]) { c.beginPath(); c.moveTo(0, yy); c.lineTo(W, yy); c.stroke(); }
  // light pooling on the floor under the ball, the person's long shadow away from it
  const glowA = L.clamp((st.card) * L.clamp(1 - (st.r - BALL_R) / 400));
  c.save();
  c.translate(st.x, GROUND);
  c.scale(1, 0.18);
  L.lightBlob(c, 0, 0, 420, [255, 140, 50], 0.55 * glowA * L.clamp(1 - (REST_Y - st.y) / 400));
  c.restore();
  c.save();
  c.globalAlpha *= pin * 0.75;
  const sh = c.createLinearGradient(PERSON_X - 420, 0, PERSON_X + 20, 0);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(1, 'rgba(0,0,0,0.85)');
  c.fillStyle = sh;
  c.beginPath(); c.ellipse(PERSON_X - 190, GROUND + 6, 230, 12, 0, 0, TAU); c.fill();
  c.restore();
  drawPerson(c, PERSON_X, GROUND, 1.75 * PPM, v.gt, L.clamp(1 - Math.abs(st.x - PERSON_X) / 900) * pin, pin);
  c.restore();
}

// ------------------------------------------------------------------ scene

export default {
  beat: 1,
  chapter: null,
  captions: false,
  layer: 0,
  cues(d) {
    return [
      { t: 0.0, name: 'swell', gain: 0.32, pitch: 0.8 },
      { t: 0.75, name: 'whoosh', gain: 0.22, pitch: 1.2 },
      { t: LANDINGS[0], name: 'impact', gain: 0.38, pitch: 1.5 },
      { t: LANDINGS[1], name: 'tick', gain: 0.3, pitch: 0.7 },
      { t: LANDINGS[2], name: 'tick', gain: 0.18, pitch: 0.8 },
      { t: 1.95, name: 'shimmer', gain: 0.2, pitch: 1.1 },
      { t: T_MORPH + 0.05, name: 'whoosh', gain: 0.3, pitch: 0.8 },
      { t: T_MORPH + MORPH - 0.1, name: 'bloom', gain: 0.32, pitch: 0.9 },
    ];
  },

  drawWorld(ctx, v) {
    const t = v.t;
    if (t >= 0 && t < T_MORPH + MORPH) {   // 04b: before this beat (the cold open) the Sun is the world Sun
      // the hook card (screen-composed, but inside the motion-blurred world pass)
      const st = ballState(t, v);
      drawCard(ctx, v, t, st);
      const seam = L.clamp(L.prog(t, 1.75, 0.25)) * (1 - L.ease.inCubic(L.prog(t, T_MORPH + 0.25, 0.7)));
      const seamDraw = L.ease.inOutCubic(L.prog(t, 1.75, 0.75));
      const seamHot = L.ease.inOutCubic(L.prog(t, T_MORPH, 0.6));
      ctx.save();
      if (st.q > 0) {   // squash on landing
        ctx.translate(st.x, st.y + st.r);
        ctx.scale(1 + st.q * 0.6, 1 - st.q);
        ctx.translate(-st.x, -(st.y + st.r));
      }
      drawSun(ctx, st.x, st.y, st.r, v.gt, { seam, seamDraw, seamHot, pool: 1 - st.card });
      ctx.restore();
      return;
    }
    // the world Sun, every later beat
    const fadeG = globeK(v);
    const x = v.wx(0), y = v.wy(0), R = SUN_R / v.cam.mpp;
    const reach = Math.max(R * 3, 60);
    if (x < -reach || x > L.W + reach || y < -reach || y > L.H + reach) return;
    // during the fast planet-to-planet moves (beats 2–8) the Sun can cross the frame in a few frames; motion blur
    // would smear it into a streak, so it dims while its screen speed is high
    let fast = 1;
    if (v.beat >= 2 && v.beat <= 8) {
      const c2 = camAt(v.gt + 1 / 30, v.tl);
      const x2 = L.W / 2 - c2.x / c2.mpp, y2 = L.H * (c2.anchor ?? 0.5) - c2.y / c2.mpp;
      const spd = Math.hypot(x2 - x, y2 - y);
      fast = L.clamp(1 - (spd - 35) / 90);
    }
    if (fast <= 0) return;
    ctx.globalAlpha *= fast;
    // on the globe it settles into a small, steady point of light (New York)
    drawSun(ctx, x, y, R, v.gt, { pool: 1 - fadeG, glowK: L.lerp(1, 0.75, fadeG) });
  },

  drawOverlay(ctx, v) {
    const t = v.t;
    const { W } = L;
    // ---- headline: masked, staggered lines
    const lines = [
      // the kicker matches the cold open's kicker (body face, 700, warm white, no extra tracking)
      { text: 'IF THE SUN WERE A', y: 452, size: 40, weight: 700, color: [235, 228, 220, 0.9], t0: 0.72, track: 0, face: L.FONT.body },
      { text: 'BASKETBALL', y: 610, size: 158, weight: 800, color: v.accent, t0: 0.86, track: 2 },
    ];
    const out = L.prog(t, 2.8, 0.38);
    for (const [i, ln] of lines.entries()) {
      const kin = L.ease.outCubic(L.prog(t, ln.t0, 0.6));
      const kout = L.ease.inCubic(L.clamp(out * 1.25 - i * 0.2));
      if (kin <= 0 || kout >= 1) continue;
      ctx.save();
      ctx.globalAlpha = v.k * (1 - kout);
      ctx.beginPath();
      ctx.rect(0, ln.y - ln.size * 0.95, W, ln.size * 1.15);
      ctx.clip();
      ctx.font = L.font(ln.size, ln.weight, ln.face ?? L.FONT.display);
      ctx.textBaseline = 'alphabetic';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 24;
      ctx.fillStyle = L.rgba(ln.color.slice(0, 3), ln.color[3] ?? 1);
      const dy = (1 - kin) * ln.size * 0.9 - kout * ln.size * 0.6;
      L.trackedText(ctx, ln.text, W / 2, ln.y + dy, ln.track, 'center');
      ctx.restore();
    }
    // ---- "24 cm": a dimension that rides on the ball through the morph
    // fades out before the card tilts away (a moving dimension only doubles up under motion blur)
    const k = L.ease.outCubic(L.prog(t, 1.95, 0.5)) * (1 - L.ease.inOutCubic(L.prog(t, T_MORPH - 0.4, 0.35))) * v.k;
    if (k > 0) {
      const st = ballState(t, v);
      const bx = st.x, by = st.y, r = st.r;
      const y = by - r - 26 - 10 * (1 - st.card);
      const e = L.ease.outCubic(L.prog(t, 1.95, 0.6));
      ctx.save();
      ctx.globalAlpha = k;
      ctx.strokeStyle = 'rgba(240,235,228,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx - r * e, y - 8); ctx.lineTo(bx - r * e, y + 8);
      ctx.moveTo(bx - r * e, y); ctx.lineTo(bx + r * e, y);
      ctx.moveTo(bx + r * e, y - 8); ctx.lineTo(bx + r * e, y + 8);
      ctx.stroke();
      // dip the type while the morph moves fastest (it would only smear), back as it settles
      const mv = Math.sin(Math.PI * L.clamp(L.prog(t, T_MORPH, MORPH)));
      ctx.globalAlpha = k * L.clamp(e * 2 - 0.8) * (1 - 0.6 * mv * mv);
      ctx.font = L.font(L.lerp(34, 44, 1 - st.card), 700, L.FONT.body);
      ctx.fillStyle = 'rgba(245,240,232,1)';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 10;
      ctx.textBaseline = 'alphabetic';
      L.trackedText(ctx, '24 cm', bx, y - 16, 1, 'center');
      ctx.restore();
    }
  },
};
