// Beat 6 — "But Earth wouldn't fly off into space."
// The camera pulls back from the dark globe to the whole orbit. The path a viewer might expect, a dotted straight
// line along Earth's velocity, draws out with a ghost Earth sliding along it toward the frame edge ("fly off into
// space") and is REJECTED: a cross strikes the ghost, the dots scatter and dissolve, and instead a bright arc grows
// from Earth along the 1 AU circle. Earth gets a thin marker ring, the black hole a tag.
//
// This file owns the ORBIT LAYER shared by beats 6–9 (exported, imported by s07–s09):
//   orbitGeom(v)  the screen geometry of the orbit,
//   drawTrace()   the bright arc swept along the orbit (grows here, sweeps a full year in beat 7, dims in beat 9,
//                 fades as the dive starts in beat 10),
//   earthRing()   the marker ring around Earth.
import * as L from '../../../../engine/runtime/lib.js';
import { AU, EARTH, SUN, filmScene } from '../camera.js';
import { ACC, drawLabels, labelVis, tag } from './s05-dark.js';

const { W, H } = L;

// ------------------------------------------------------------------ orbit geometry
const TH_E = Math.atan2(EARTH.y - SUN.y, EARTH.x - SUN.x);       // Earth's angle around SUN (screen convention)
export const DIR = -1;                                           // orbit sense on screen (angle decreasing: up-right)
export function orbitGeom(v) {
  const cx = v.wx(SUN.x), cy = v.wy(SUN.y), R = v.ws(AU);
  const ex = v.wx(EARTH.x), ey = v.wy(EARTH.y);
  const n = { x: Math.cos(TH_E), y: Math.sin(TH_E) };             // SUN -> Earth (unit)
  const u = DIR < 0 ? { x: n.y, y: -n.x } : { x: -n.y, y: n.x };  // velocity direction (unit, tangent)
  return { cx, cy, R, ex, ey, n, u, th: TH_E };
}

/** Swept angle of the bright trace (rad) at global time gt. */
export function sweep(gt) {
  const a1 = 0.42 * L.ease.outCubic(L.prog(gt, 26.15, 0.9));     // beat 6: a short arc ahead of Earth
  const a2 = L.ease.inOutCubic(L.prog(gt, 27.35, 3.6));            // beat 7: one full year
  return L.lerp(a1, Math.PI * 2, a2);
}
/** Overall brightness of the orbit layer (dims in beat 9, gone as the dive starts). */
export function orbitAlpha(gt) {
  const b8 = 0.4 * L.ease.inOutCubic(L.prog(gt, 32.4, 0.7));      // recedes behind the pull vectors
  const b9 = 0.15 * L.ease.inOutCubic(L.prog(gt, 37.55, 0.6));    // and a little more for the diagram
  return (1 - b8 - b9) * (1 - L.ease.inCubic(L.prog(gt, 39.6, 0.4)));
}

// The orbit layer is drawn through a mask (masked()): it fades out toward the HUD band (y < 300; the leaned beat-8
// framing puts the ring's top near y ≈ 110), and it is knocked back behind the label block (x 60-740, y 420-600)
// while a label is up, so the violet ring never runs through the violet numerals.
const FADE0 = 312, FADE1 = 368;
let OC = null;
/** Draw fn(ctx) into an offscreen layer, mask it (HUD band + label block), and add it onto c. */
export function masked(c, v, fn) {
  if (!OC) OC = new OffscreenCanvas(W, H);
  const o = OC.getContext('2d');
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.globalAlpha = 1;
  o.globalCompositeOperation = 'source-over';
  o.clearRect(0, 0, W, H);
  o.save();
  o.setTransform(c.getTransform());
  fn(o);
  o.restore();
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.globalAlpha = 1;
  o.globalCompositeOperation = 'destination-out';
  const tg = o.createLinearGradient(0, FADE0, 0, FADE1);
  tg.addColorStop(0, 'rgba(0,0,0,1)'); tg.addColorStop(0.5, 'rgba(0,0,0,0.5)'); tg.addColorStop(1, 'rgba(0,0,0,0)');
  o.fillStyle = tg;
  o.fillRect(0, 0, W, FADE1);
  const lk = 0.82 * labelVis(v.gt);
  if (lk > 0.005) {
    o.save();
    o.translate(400, 510);
    o.scale(1, 0.3);
    const rg = o.createRadialGradient(0, 0, 0, 0, 0, 420);
    rg.addColorStop(0, `rgba(0,0,0,${lk})`); rg.addColorStop(0.72, `rgba(0,0,0,${lk})`); rg.addColorStop(1, 'rgba(0,0,0,0)');
    o.fillStyle = rg;
    o.fillRect(-420, -420, 840, 840);
    o.restore();
  }
  o.globalCompositeOperation = 'source-over';
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'lighter';
  c.drawImage(OC, 0, 0);
  c.restore();
}

export function drawTrace(c, v) {
  const gt = v.gt;
  if (gt < 26.1 || gt > 40.05) return;
  const g = orbitGeom(v);
  if (g.R < 30 || g.R > 60000) return;
  const A = orbitAlpha(gt);
  if (A <= 0) return;
  const a = sweep(gt);
  const head = g.th + DIR * a;
  const full = L.prog(gt, 30.95, 0.01) > 0;                         // the year is complete
  c.save();
  c.lineCap = 'round';
  // the swept arc (soft wide glow + crisp core)
  const lo = Math.min(g.th, head), hi = Math.max(g.th, head);
  const glowK = full ? 0.75 + 0.25 * Math.sin(gt * 1.6) : 1;
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = L.rgba(ACC, 0.12 * A * glowK);
  c.lineWidth = 12;
  c.beginPath(); c.arc(g.cx, g.cy, g.R, lo, hi); c.stroke();
  c.strokeStyle = L.rgba(L.mix(ACC, [255, 255, 255], 0.35), 0.62 * A);
  c.lineWidth = 2.4;
  c.beginPath(); c.arc(g.cx, g.cy, g.R, lo, hi); c.stroke();
  // comet tail behind the head (while sweeping)
  const moving = a > 0.02 && !full;
  if (moving || gt < 27.3) {
    const tail = Math.min(a, 0.9);
    const N = 18;
    for (let i = 0; i < N; i++) {
      const f0 = i / N, f1 = (i + 1) / N;
      const t0 = head - DIR * tail * (1 - f0), t1 = head - DIR * tail * (1 - f1);
      c.strokeStyle = L.rgba([235, 225, 255], 0.55 * f1 * f1 * A);
      c.lineWidth = 2 + 3 * f1;
      c.beginPath(); c.arc(g.cx, g.cy, g.R, Math.min(t0, t1), Math.max(t0, t1)); c.stroke();
    }
    const hx = g.cx + Math.cos(head) * g.R, hy = g.cy + Math.sin(head) * g.R;
    const hk = L.clamp(a / 0.1) * A * (gt > 30.7 ? 1 - L.prog(gt, 30.7, 0.3) : 1);
    L.lightBlob(c, hx, hy, 46, ACC, 0.55 * hk);
    L.lightBlob(c, hx, hy, 12, [255, 255, 255], 0.95 * hk);
  }
  // a travelling glint around the finished ring (secondary motion)
  if (full) {
    const ga = g.th + DIR * ((gt - 30.95) * 0.55 + 0.4);
    const gx = g.cx + Math.cos(ga) * g.R, gy = g.cy + Math.sin(ga) * g.R;
    L.lightBlob(c, gx, gy, 26, [230, 215, 255], 0.35 * A);
  }
  c.restore();
}

/** Thin marker ring around Earth at orbit scale. */
export function earthRing(c, v, k) {
  if (k <= 0) return;
  const g = orbitGeom(v);
  if (g.R < 30 || g.R > 60000) return;
  const pulse = 1 + 0.06 * Math.sin(v.gt * 2.4);
  c.save();
  c.strokeStyle = `rgba(200,225,255,${0.7 * k})`;
  c.lineWidth = 1.6;
  c.beginPath(); c.arc(g.ex, g.ey, Math.max(0, 15 * pulse * (0.6 + 0.4 * L.ease.outBack(L.clamp(k)))), 0, Math.PI * 2); c.stroke();
  c.restore();
}
/** Visibility of the Earth ring across beats 6–9. */
export const earthRingK = (gt) => L.ease.outCubic(L.prog(gt, 25.4, 0.5)) * (1 - L.prog(gt, 39.6, 0.4));

// ------------------------------------------------------------------ tag track for beats 6–9 (global seconds)
const TAGS = [
  { a: 25.1, b: 28.9, text: 'EARTH', at: 'earth', dy: 30 },
  { a: 26.6, b: 35.1, text: 'BLACK HOLE', at: 'bh', dy: -34, col: [215, 195, 255] },
  { a: 35.3, b: 37.45, text: 'SAME-MASS STAR', at: 'bh', dy: -34, col: [255, 222, 175] },
];
/** Drawn by whichever of s06–s09 is active (same hand-over rule as the label track). */
export function drawOrbitTags(c, v) {
  const mine = (v.active && v.t >= 0.02) || (v.t >= v.d && v.t < v.d + 0.02);
  if (!mine) return;
  const g = orbitGeom(v);
  if (g.R < 30 || g.R > 4000) return;
  const rk = L.clamp(L.invLerp(Math.log(4000), Math.log(1400), Math.log(g.R)));   // fade in as the pull-back settles
  for (const tg of TAGS) {
    if (v.gt < tg.a || v.gt > tg.b + 0.3) continue;
    const k = rk * L.ease.outCubic(L.prog(v.gt, tg.a, 0.5)) * (1 - L.ease.inCubic(L.prog(v.gt, tg.b, 0.3)));
    const x = tg.at === 'earth' ? g.ex : g.cx, y = tg.at === 'earth' ? g.ey : g.cy;
    tag(c, x, y, tg.text, k, tg.dy, tg.col);
  }
}

// ------------------------------------------------------------------ the rejected fly-off path
const FLY_LEN = 1.25 * AU;                                       // world length of the dotted straight path
const DOTS = (() => { const r = L.rng(606), out = []; for (let i = 0; i < 60; i++) out.push({ d: r() * 0.35, a: r() * 6.28, s: 0.4 + r() }); return out; })();
const T_DRAW = 25.0, T_X = 25.95, T_GONE = 26.9;

function drawFlyOff(c, v) {
  const gt = v.gt;
  if (gt < T_DRAW || gt > T_GONE + 0.1) return;
  const g = orbitGeom(v);
  const len = Math.min(v.ws(FLY_LEN), 560);                      // screen-capped while the camera is still pulling back
  if (len < 40) return;
  const draw = L.ease.outCubic(L.prog(gt, T_DRAW, 0.75));
  const diss = L.prog(gt, T_X + 0.25, T_GONE - T_X - 0.25);       // 0..1 dissolve
  const ghostP = 0.4 * L.ease.inOutCubic(L.prog(gt, T_DRAW + 0.15, 0.85));
  c.save();
  c.lineCap = 'round';
  // the dotted path: dots placed every 12 px from Earth; they scatter outward and fade on rejection
  const step = 13, n = Math.floor((len * draw) / step);
  for (let i = 1; i <= n; i++) {
    const f = (i * step) / len;
    const D = DOTS[i % DOTS.length];
    const local = L.clamp((diss - D.d) / 0.45);                    // per-dot stagger
    if (local >= 1) continue;
    const drift = 26 * L.ease.outCubic(local) * D.s;
    const x = g.ex + g.u.x * len * f + Math.cos(D.a) * drift;
    const y = g.ey + g.u.y * len * f + Math.sin(D.a) * drift - 10 * local;
    const fadeEnd = 1 - L.clamp((f - 0.85) / 0.15);               // dots thin out toward the far end
    const a = 0.75 * (1 - local) * fadeEnd;
    if (a <= 0.01) continue;
    c.fillStyle = `rgba(230,232,245,${a})`;
    c.beginPath(); c.arc(x, y, Math.max(0, 2.1 * (1 - 0.5 * local)), 0, Math.PI * 2); c.fill();
  }
  // the ghost Earth riding the wrong path
  const gk = L.ease.outCubic(L.prog(gt, T_DRAW + 0.15, 0.4)) * (1 - L.ease.inCubic(L.prog(gt, T_X + 0.35, 0.45)));
  if (gk > 0) {
    const gx = g.ex + g.u.x * len * ghostP, gy = g.ey + g.u.y * len * ghostP;
    // faint trail
    const tg = c.createLinearGradient(g.ex, g.ey, gx, gy);
    tg.addColorStop(0, 'rgba(160,190,255,0)'); tg.addColorStop(1, `rgba(160,190,255,${0.35 * gk})`);
    c.strokeStyle = tg; c.lineWidth = 6;
    c.beginPath(); c.moveTo(g.ex, g.ey); c.lineTo(gx, gy); c.stroke();
    L.lightBlob(c, gx, gy, 30, [130, 175, 255], 0.35 * gk);
    c.fillStyle = `rgba(150,185,255,${0.55 * gk})`;
    c.beginPath(); c.arc(gx, gy, 6, 0, Math.PI * 2); c.fill();
    c.strokeStyle = `rgba(220,232,255,${0.6 * gk})`;
    c.lineWidth = 1.4;
    c.setLineDash([3, 4]);
    c.beginPath(); c.arc(gx, gy, 14, 0, Math.PI * 2); c.stroke();
    c.setLineDash([]);
    // the rejection: a cross strikes through the ghost
    const x1 = L.ease.outCubic(L.prog(gt, T_X, 0.16)), x2 = L.ease.outCubic(L.prog(gt, T_X + 0.1, 0.16));
    const S = 22;
    c.strokeStyle = `rgba(255,140,150,${0.95 * gk})`;
    c.lineWidth = 4;
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 8;
    if (x1 > 0) { c.beginPath(); c.moveTo(gx - S, gy - S); c.lineTo(gx - S + 2 * S * x1, gy - S + 2 * S * x1); c.stroke(); }
    if (x2 > 0) { c.beginPath(); c.moveTo(gx + S, gy - S); c.lineTo(gx + S - 2 * S * x2, gy - S + 2 * S * x2); c.stroke(); }
  }
  c.restore();
}

/** Earth "snaps back" onto its circle: a soft pulse at the real Earth as the arc takes over. */
function drawPin(c, v) {
  const p = v.gt - (T_X + 0.2);
  if (p < 0 || p > 1.2) return;
  const g = orbitGeom(v);
  c.save();
  c.globalCompositeOperation = 'lighter';
  L.lightBlob(c, g.ex, g.ey, 40 + 60 * p, [160, 200, 255], 0.5 * Math.exp(-p * 3));
  c.strokeStyle = `rgba(200,225,255,${0.6 * (1 - p / 1.2)})`;
  c.lineWidth = 2;
  c.beginPath(); c.arc(g.ex, g.ey, Math.max(0, 15 + 50 * L.ease.outCubic(p / 1.2)), 0, Math.PI * 2); c.stroke();
  c.restore();
}

export default filmScene({
  beat: 6,
  chapter: { num: '06', title: 'No escape', sub: 'Earth does not fly off' },
  captions: true,
  layer: 1,
  cues() {
    // beat starts 24.275 s
    return [
      { t: 0.75, name: 'swish', gain: 0.24, pitch: 1.2 },
      { t: T_X - 24.275, name: 'blip', gain: 0.34, pitch: 0.6 },
      { t: T_X - 24.275 + 0.1, name: 'tick', gain: 0.28, pitch: 0.7 },
      { t: T_X - 24.275 + 0.3, name: 'shimmer', gain: 0.2, pitch: 0.8 },
      { t: T_X - 24.275 + 0.22, name: 'ping', gain: 0.24, pitch: 1.2 },
    ];
  },
  drawWorld(c, v) {
    earthRing(c, v, earthRingK(v.gt));
    drawFlyOff(c, v);
    drawPin(c, v);
  },
  drawOverlay(c, v) {
    drawLabels(c, v);
    drawOrbitTags(c, v);
  },
});
