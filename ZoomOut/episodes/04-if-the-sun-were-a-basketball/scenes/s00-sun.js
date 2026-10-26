// Beat 0 — the hook: the Sun shrinks down to a basketball, drops beside a 1.75 m person (side-on card),
// grows basketball seams, then the card tilts away and the ball glides into the top-down world Sun.
// The Sun is drawn here for the WHOLE film: world space, true size (0.24 m at the origin), with a glow
// clamped in px so it stays a bright point at town scale and on the globe.
import * as L from '../../../../engine/runtime/lib.js';
import { SUN_DIAM } from '../camera.js';
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
function drawSun(c, x, y, R, gt, { seam = 0, seamDraw = 1, seamHot = 0, glowK = 1, pool = 0 } = {}) {
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

function limb(c, a, b, ra, rb) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1e-6;
  const nx = -dy / len, ny = dx / len;
  c.beginPath();
  c.moveTo(a[0] + nx * ra, a[1] + ny * ra);
  c.lineTo(b[0] + nx * rb, b[1] + ny * rb);
  c.lineTo(b[0] - nx * rb, b[1] - ny * rb);
  c.lineTo(a[0] - nx * ra, a[1] - ny * ra);
  c.closePath();
  c.fill();
  c.beginPath(); c.arc(a[0], a[1], Math.max(0, ra), 0, TAU); c.fill();
  c.beginPath(); c.arc(b[0], b[1], Math.max(0, rb), 0, TAU); c.fill();
}

/** Figure in unit-height coords (feet at 0, head at -1, facing +x). breath: small idle motion. */
function figure(c, breath, far) {
  const sway = breath * 0.004;
  if (far) {
    limb(c, [-0.02, -0.52], [-0.035, -0.285], 0.05, 0.036);
    limb(c, [-0.035, -0.285], [-0.05, -0.04], 0.036, 0.027);
    limb(c, [-0.05, -0.03], [0.035, -0.012], 0.026, 0.016);
    limb(c, [-0.025 + sway, -0.79], [-0.05 + sway, -0.64], 0.03, 0.025);
    limb(c, [-0.05 + sway, -0.64], [-0.04 + sway, -0.5], 0.025, 0.02);
    return;
  }
  // torso
  c.beginPath();
  c.moveTo(-0.058 + sway, -0.825);
  c.bezierCurveTo(-0.01 + sway, -0.835, 0.04 + sway, -0.83, 0.055 + sway, -0.8);
  c.bezierCurveTo(0.075 + sway, -0.76, 0.07, -0.69, 0.052, -0.63);
  c.bezierCurveTo(0.045, -0.59, 0.06, -0.55, 0.058, -0.51);
  c.lineTo(-0.068, -0.5);
  c.bezierCurveTo(-0.075, -0.56, -0.058, -0.6, -0.06, -0.64);
  c.bezierCurveTo(-0.07, -0.7, -0.08 + sway, -0.77, -0.058 + sway, -0.825);
  c.closePath();
  c.fill();
  limb(c, [0.0 + sway, -0.86], [0.004 + sway, -0.815], 0.024, 0.026);                    // neck
  c.beginPath(); c.ellipse(0.012 + sway, -0.928, 0.054, 0.066, 0.12, 0, TAU); c.fill();   // head
  c.beginPath(); c.ellipse(0.06 + sway, -0.918, 0.012, 0.016, 0, 0, TAU); c.fill();       // nose
  // near leg + foot
  limb(c, [0.02, -0.52], [0.034, -0.285], 0.052, 0.037);
  limb(c, [0.034, -0.285], [0.026, -0.04], 0.037, 0.027);
  limb(c, [0.026, -0.03], [0.112, -0.012], 0.027, 0.017);
  // near arm, relaxed
  limb(c, [0.004 + sway, -0.795], [0.022 + sway, -0.64], 0.033, 0.026);
  limb(c, [0.022 + sway, -0.64], [0.05 + sway * 0.5, -0.495], 0.026, 0.02);
  c.beginPath(); c.ellipse(0.055, -0.475, 0.02, 0.032, 0.2, 0, TAU); c.fill();
}

// the person is composed in its own layer so it can fade without showing the overlapping limb shapes
const PL_W = 360, PL_H = 720, PL_OX = 160, PL_OY = 690;
let PL = null;
function drawPerson(c, x, ground, H, gt, rim, alpha) {
  if (alpha <= 0) return;
  if (!PL) PL = new OffscreenCanvas(PL_W, PL_H);
  const p = PL.getContext('2d');
  p.setTransform(1, 0, 0, 1, 0, 0);
  p.clearRect(0, 0, PL_W, PL_H);
  const breath = Math.sin(gt * 1.6);
  p.translate(PL_OX, PL_OY);
  p.scale(H, H);
  p.fillStyle = 'rgb(15,16,21)';
  figure(p, breath, true);
  // warm rim from the Sun-ball on the right, then the body
  p.save();
  p.translate(0.0045, -0.001);
  p.fillStyle = L.rgba([255, 170, 90], 0.85 * rim);
  figure(p, breath, false);
  p.restore();
  p.fillStyle = 'rgb(26,27,34)';
  figure(p, breath, false);
  // the near arm separates from the torso by a hair of reflected light
  p.strokeStyle = L.rgba([255, 170, 90], 0.22 * rim);
  p.lineWidth = 1.2 / H;
  p.beginPath(); p.moveTo(0.038 + breath * 0.004, -0.78); p.quadraticCurveTo(0.05, -0.64, 0.068, -0.5); p.stroke();
  c.save();
  c.globalAlpha *= alpha;
  c.drawImage(PL, x - PL_OX, ground - PL_OY);
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
  const sky = c.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, '#05060a');
  sky.addColorStop(1, '#0d0d12');
  c.fillStyle = sky;
  c.fillRect(0, 0, W, GROUND);
  const fl = c.createLinearGradient(0, GROUND, 0, H);
  fl.addColorStop(0, '#16161b');
  fl.addColorStop(1, '#070709');
  c.fillStyle = fl;
  c.fillRect(0, GROUND, W, H - GROUND);
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
  const pin = L.ease.outCubic(L.prog(t, 0.55, 0.8));        // person revealed as the Sun shrinks past
  if (fade <= 0) return;
  c.save();
  c.translate(0, GROUND + 520 * m);
  c.scale(1, tilt);
  c.translate(0, -GROUND);
  // horizon / floor line with perspective floor lines
  c.globalAlpha = fade;
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
  beat: 0,
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
    if (t < T_MORPH + MORPH) {
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
    // on the globe it settles into a small, steady point of light (New York)
    drawSun(ctx, x, y, R, v.gt, { pool: 1 - fadeG, glowK: L.lerp(1, 0.75, fadeG) });
  },

  drawOverlay(ctx, v) {
    const t = v.t;
    const { W } = L;
    // ---- headline: masked, staggered lines
    const lines = [
      { text: 'IF THE SUN WERE A', y: 452, size: 66, weight: 700, color: [240, 236, 230], t0: 0.72, track: 8 },
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
      ctx.font = L.font(ln.size, ln.weight, L.FONT.display);
      ctx.textBaseline = 'alphabetic';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 24;
      ctx.fillStyle = L.rgba(ln.color);
      const dy = (1 - kin) * ln.size * 0.9 - kout * ln.size * 0.6;
      L.trackedText(ctx, ln.text, W / 2, ln.y + dy, ln.track, 'center');
      ctx.restore();
    }
    // ---- "24 cm": a dimension that rides on the ball through the morph
    const k = L.ease.outCubic(L.prog(t, 1.95, 0.5)) * v.k;
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
