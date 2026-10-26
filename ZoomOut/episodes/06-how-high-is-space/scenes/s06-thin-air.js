// Beat 6 — by 30 km, 99% of the air is below you.
// The air is shown literally: ~520 drifting "air" motes sampled from the real pressure profile (dense at the
// ground, almost none up high). A glowing fill level rises from the ground to 30 km while a counter riding on it
// reads the share of the air below (it races to 74% by 10 km, then crawls). At 30 km the level locks into the
// 30 km line with a flash; the motes it swept are tinted, and only a handful remain above it.
// The 30 km line stays in the world for the rest of the climb.
import * as L from '../../../../engine/runtime/lib.js';
import { ALT } from '../camera.js';
import { massifPath } from './s04-everest.js';

const { W, H } = L;
const LINE = ALT.air99;                 // 30,000 m
const RISE = [0.25, 1.75];              // the level rises from the ground to 30 km
const T_LOCK = RISE[0] + RISE[1];       // 2.0 s: on "ninety-nine percent"
const T_LABEL = 2.1;

// share of the atmosphere's mass below altitude h (US Standard Atmosphere, via pressure)
const BELOW = [[0, 0], [2000, 0.21], [4000, 0.383], [6000, 0.528], [8000, 0.649], [10000, 0.738], [12000, 0.807],
  [14000, 0.859], [16000, 0.897], [18000, 0.925], [20000, 0.946], [22000, 0.96], [25000, 0.975], [28000, 0.984],
  [30000, 0.988], [35000, 0.9945], [40000, 0.9972], [50000, 0.9992], [70000, 0.99995], [100000, 1]];
export const airBelow = (h) => L.ramp(BELOW.map(([a, f]) => [a, [f, 0, 0]]), h)[0];
function altForShare(u) {
  for (let i = 1; i < BELOW.length; i++) if (u <= BELOW[i][1]) return L.lerp(BELOW[i - 1][0], BELOW[i][0], L.invLerp(BELOW[i - 1][1], BELOW[i][1], u));
  return 100000;
}
// the motes: an exact-share sample (stratified, so 99% of them really are below the line)
const N = 520;
const MOTES = (() => {
  const r = L.rng(6060);
  const out = [];
  for (let i = 0; i < N; i++) {
    const u = (i + r()) / N;
    out.push({ h: altForShare(Math.min(0.99993, u)), x: L.lerp(-32000, 32000, r()), s: L.lerp(1.3, 2.7, r()), ph: r() * 50, tw: r() });
  }
  return out;
})();

const levelAt = (t) => LINE * L.ease.inOutCubic(L.prog(t, RISE[0], RISE[1]));

function drawLevel(c, v, t) {
  const lv = levelAt(t);
  if (lv <= 0) return;
  const after = L.prog(t, v.d, 1.6);                         // calmer once the next beat starts
  const gone = L.prog(t, v.d + 5.6, 1.2);                    // the fill clears before the Kármán beat settles
  const fillA = (1 - 0.55 * after) * (1 - gone);
  const gy = v.wy(0), ly = v.wy(-lv);
  if (fillA > 0 && ly < H) {
    // feathered top edge: fades in over 40 px above the level instead of a hard full-width edge
    const top = ly - 40, bot = Math.max(ly + 60, Math.min(gy, ly + 900)), f = 40 / (bot - top);
    const g = c.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, L.rgba(v.accent, 0));
    g.addColorStop(f, L.rgba(v.accent, 0.2 * fillA));
    g.addColorStop(f + 0.25 * (1 - f), L.rgba(v.accent, 0.08 * fillA));
    g.addColorStop(1, L.rgba(v.accent, 0.02 * fillA));
    c.fillStyle = g;
    c.fillRect(0, Math.max(-10, top), W, Math.min(H + 10, gy) - Math.max(-10, top));
  }
}

function drawLine(c, v, t) {
  const lv = levelAt(t);
  const locked = t >= T_LOCK;
  const y = v.wy(-lv);
  if (y < -40 || y > H + 40) return;
  const far = L.clamp((v.cam.mpp - 140) / 160);            // fades out on the way to the globe
  if (far >= 1) return;
  const flash = locked ? Math.exp(-(t - T_LOCK) * 2.2) : 0;
  const later = L.prog(t, v.d, 1.2);
  const a = (1 - far) * L.lerp(1, 0.55, later) * L.lerp(1, 0.55, L.prog(t, v.d + 6.6, 1.2));
  c.save();
  // glow (starts right of the env gauge text, fading in over X0..X1, so the "30 km" tick stays clean)
  const X0 = 140, X1 = 200;
  const gh = 26 + 40 * flash;
  const g = c.createLinearGradient(0, y - gh, 0, y + gh);
  g.addColorStop(0, L.rgba(v.accent, 0));
  g.addColorStop(0.5, L.rgba(v.accent, a * (0.28 + 0.5 * flash)));
  g.addColorStop(1, L.rgba(v.accent, 0));
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = g;
  c.fillRect(X1, y - gh, W - X1, gh * 2);
  // fine 2 px ramp: reads as a smooth horizontal fade (no visible staircase)
  for (let x = X0; x < X1; x += 2) {
    c.globalAlpha = L.smoothstep((x - X0 + 1) / (X1 - X0));
    c.fillRect(x, y - gh, 2, gh * 2);
  }
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  // the line: while rising it is a soft shimmering level; once locked it draws crisp from left to right
  const lc = L.mix(v.accent, [255, 255, 255], 0.35 + 0.5 * flash), la = a * (locked ? 0.95 : 0.7);
  const sg = c.createLinearGradient(X0, 0, X1, 0);
  sg.addColorStop(0, L.rgba(lc, 0));
  sg.addColorStop(1, L.rgba(lc, la));
  c.strokeStyle = sg;
  c.lineWidth = locked ? 2.5 : 2;
  c.beginPath();
  if (!locked) {
    for (let x = X0; x <= W; x += 24) {
      const yy = y + Math.sin(x * 0.02 - t * 6) * 2.2 + L.noise1(x * 0.01 + t * 2, 5) * 1.5;
      x > X0 ? c.lineTo(x, yy) : c.moveTo(x, yy);
    }
  } else {
    c.moveTo(X0, y); c.lineTo(W, y);
  }
  c.stroke();
  // lock sweep: a bright head racing across the line
  const sw = L.prog(t, T_LOCK, 0.7);
  if (sw > 0 && sw < 1) {
    const hx = W * L.ease.outCubic(sw);
    L.lightBlob(c, hx, y, 120, L.mix(v.accent, [255, 255, 255], 0.5), 0.55 * (1 - sw));
    L.lightBlob(c, hx, y, 24, [255, 255, 255], 0.9 * (1 - sw));
  }
  c.restore();
}

// the air density as a soft haze (exponential, ~8 km scale height) plus a sparse set of faint motes; both are kept
// off the mountain (clipped to the sky above Everest's silhouette)
function drawMotes(c, v, t) {
  const show = L.ease.outCubic(L.prog(t, -0.6, 1.2)) * (1 - L.ease.inOutCubic(L.prog(t, v.d + 0.2, 1.4)));
  if (show <= 0) return;
  const lv = levelAt(t);
  c.save();
  massifPath(c, v);
  c.rect(-10, -10, W + 20, Math.min(H, v.wy(0)) + 10);
  c.clip('evenodd');
  // density haze
  const gy = v.wy(0);
  const g = c.createLinearGradient(0, gy, 0, v.wy(-40000));
  for (let i = 0; i <= 8; i++) {
    const h = 5000 * i, d = Math.exp(-h / 8000);
    g.addColorStop(i / 8, L.rgba(L.mix(v.accent, [235, 242, 255], 0.55), 0.26 * d * show));
  }
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = g;
  c.fillRect(-10, v.wy(-40000), W + 20, gy - v.wy(-40000));
  const x0 = v.cam.x - (W / 2 + 20) * v.cam.mpp, x1 = v.cam.x + (W / 2 + 20) * v.cam.mpp;
  const span = 64000;
  for (let i = 0; i < MOTES.length; i++) {
    const m = MOTES[i];
    if (i % 4 && m.h < LINE) continue;              // a quarter of the sample below the line, all of the few above it
    // slow wind drift (faster up high), wrapped over the 64 km strip
    let x = m.x + t * (120 + m.h * 0.02) + L.noise1(t * 0.3 + m.ph, 9) * 300;
    x = ((x + span / 2) % span + span) % span - span / 2;
    if (x < x0 || x > x1) continue;
    const yy = v.wy(-(m.h + L.noise1(t * 0.4 + m.ph, 10) * 120));
    if (yy < -10 || yy > H + 10) continue;
    const xx = v.wx(x);
    const swept = m.h < lv;
    const col = swept ? L.mix(v.accent, [255, 255, 255], 0.3) : L.mix(v.accent, [210, 225, 255], 0.5);
    L.lightBlob(c, xx, yy, 8 + m.s * 2.5, col, show * (swept ? 0.12 : 0.09));
    // the few motes left above the line get a soft halo so they read as "what's left"
    if (m.h > LINE && t > T_LOCK) L.lightBlob(c, xx, yy, 16, L.mix(v.accent, [235, 242, 255], 0.5), 0.3 * show * L.prog(t, T_LOCK + 0.3, 0.8));
  }
  c.restore();
}

// a slim gauge of the whole atmosphere at the right edge: it fills with the counter, so "99%" is a picture
function drawAirBar(c, v, t, out) {
  const bk = L.enter(t, -0.1, 0.6) * out * v.k;
  if (bk <= 0) return;
  const x = 906, w = 16, top = 470, bot = 1180, hgt = bot - top;
  const tf = Math.round(v.gt * 30) / 30 - (v.gt - t);
  const share = airBelow(levelAt(tf));
  const grow = L.ease.outCubic(bk);
  const flash = t >= T_LOCK ? Math.exp(-(t - T_LOCK) * 2.2) : 0;
  c.save();
  c.globalAlpha = L.clamp(bk * 1.4);
  // track
  c.fillStyle = 'rgba(8,14,40,0.45)';
  L.roundRect(c, x, bot - hgt * grow, w, hgt * grow, w / 2); c.fill();
  c.strokeStyle = 'rgba(235,242,255,0.55)';
  c.lineWidth = 1.5;
  L.roundRect(c, x, bot - hgt * grow, w, hgt * grow, w / 2); c.stroke();
  // fill (the air below you)
  const fh = hgt * share * grow;
  if (fh > 1) {
    c.save();
    L.roundRect(c, x, bot - hgt * grow, w, hgt * grow, w / 2); c.clip();
    const g = c.createLinearGradient(0, bot - fh, 0, bot);
    g.addColorStop(0, L.rgba(L.mix(v.accent, [255, 255, 255], 0.45 + 0.4 * flash)));
    g.addColorStop(1, L.rgba(L.mix(v.accent, [40, 60, 160], 0.35)));
    c.fillStyle = g;
    c.fillRect(x, bot - fh, w, fh);
    c.restore();
    L.lightBlob(c, x + w / 2, bot - fh, 26 + 30 * flash, L.mix(v.accent, [255, 255, 255], 0.5), 0.5 + 0.4 * flash);
  }
  // quarter ticks
  c.fillStyle = 'rgba(235,242,255,0.5)';
  for (let i = 1; i < 4; i++) c.fillRect(x - 8, bot - hgt * grow * i / 4 - 1, 6, 2);
  c.restore();
}

export default {
  beat: 6,
  chapter: { num: '06', title: 'Thin air', sub: 'Where the atmosphere runs out' },
  captions: true,
  layer: 0,
  cues(d) {
    return [
      { t: RISE[0], name: 'riser', gain: 0.24, pitch: 0.9 },
      { t: RISE[0] + 0.15, name: 'count', gain: 0.16, pitch: 1.1 },
      { t: T_LOCK - 0.03, name: 'bloom', gain: 0.32, pitch: 1.0 },
      { t: T_LOCK, name: 'ping', gain: 0.22, pitch: 1.3 },
      { t: T_LABEL + 0.6, name: 'shimmer', gain: 0.12, pitch: 1.5 },
    ];
  },
  drawWorld(ctx, v) {
    const t = v.t;
    if (t < -0.6) return;
    drawLevel(ctx, v, t);
    drawMotes(ctx, v, t);
    drawLine(ctx, v, t);
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    const out = 1 - L.ease.inCubic(L.prog(t, v.d - 0.4, 0.3));
    const lv = levelAt(t);
    const ly = v.wy(-lv);
    // counter riding the level: "AIR BELOW 74%"
    const ck = L.enter(t, RISE[0] + 0.1, 0.4) * (1 - L.ease.inCubic(L.prog(t, T_LABEL + 0.1, 0.4))) * v.k;
    if (ck > 0) {
      const tf = Math.round(v.gt * 30) / 30 - (v.gt - t);           // counter value snapped to the frame (no blur smear)
      const pct = Math.round(airBelow(levelAt(tf)) * 100);
      const y = Math.min(ly - 18, 1215);
      ctx.save();
      ctx.globalAlpha = ck;
      ctx.textBaseline = 'alphabetic';
      ctx.shadowColor = 'rgba(0,0,20,0.6)';
      ctx.shadowBlur = 10;
      ctx.font = L.font(64, 700, L.FONT.din);
      ctx.fillStyle = '#fff';
      const w = L.trackedText(ctx, `${pct}%`, 880, y, 0, 'right');
      ctx.font = L.font(22, 600, L.FONT.body);
      ctx.fillStyle = 'rgba(225,232,250,0.9)';
      L.trackedText(ctx, 'OF THE AIR BELOW', 880 - w - 16, y - 6, 2.5, 'right');
      ctx.restore();
    }
    drawAirBar(ctx, v, t, out);
    const k = L.enter(t, T_LABEL, 0.5) * out * v.k;
    L.bigLabel(ctx, { x: 150, y: v.wy(-LINE) + 220, big: '30 km', small: '99% of the air below you', k, accent: v.accent });
  },
};
