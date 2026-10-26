// Beat 2 — "Now gather every drop: | the oceans, the ice caps, the lakes, the rivers, even the clouds."
// "Now gather every drop": the oceans glitter, thousands of glints rising a hair off the water.
// Then, word by word, each source lifts off as streams of light: ribbons that rise off the globe, swing around
// it on a shared orbit and pour into the point where the ball will form (ALL, drawn by s03). A small tag names
// each source as it lifts; s00 dims the source on the planet in step (remain()).
// The streams keep flowing into beat 3, where their tails are pulled in and the ball condenses.
// Exports streamState() so s03 can sync the ball to the streams.
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, SUN_DIR } from '../env.js';
import { ALL } from '../camera.js';
import { surf, liftTime, filmT } from './s00-hook.js';
import { isLand } from '../../../../engine/runtime/earth.js';

const { W } = L;
const TAU = Math.PI * 2;
const D_B = Math.hypot(ALL.x, ALL.y), A_B = Math.atan2(ALL.y, ALL.x), R_B = ALL.d / 2;

// ------------------------------------------------------------------ sources (lat, lon in degrees)
const KIND = {
  oceans: { col: [80, 180, 255], core: [205, 236, 255], w: 0.7e5, tag: 'OCEANS' },
  ice: { col: [170, 225, 255], core: [240, 250, 255], w: 0.55e5, tag: 'ICE CAPS' },
  lakes: { col: [70, 215, 225], core: [210, 250, 250], w: 0.38e5, tag: 'LAKES' },
  rivers: { col: [100, 190, 255], core: [215, 240, 255], w: 0.32e5, tag: 'RIVERS' },
  clouds: { col: [215, 230, 250], core: [255, 255, 255], w: 0.5e5, tag: 'CLOUDS' },
};
const SRC = {
  // kept sparse (22 streams) so each named source reads as its own bundle, not a tangle
  oceans: [[32, -45], [3, -25], [-12, -20], [-42, -30], [-22, -35], [8, -45]],
  ice: [[84, -10], [74, -40], [-67, -25], [81, 30]],
  lakes: [[45, -84], [-1, 33], [13, 14]],
  rivers: [[-3, -60], [15, 32.5], [0, 20], [-27, -56]],
  clouds: [[54, 14], [50, -18], [-45, -8], [6, -32], [-8, 12]],
};
// which source carries the name tag, and which side the tag sits on
const TAG_AT = { oceans: 2, ice: 1, lakes: 1, rivers: 0, clouds: 0 };
const KINDS = Object.keys(SRC);

const STREAMS = (() => {
  const r = L.rng(4242);
  const out = [];
  for (const kind of Object.keys(SRC)) {
    SRC[kind].forEach(([la, lo], i) => {
      out.push({
        kind, i, la: la * Math.PI / 180, lo: lo * Math.PI / 180,
        delay: i === TAG_AT[kind] ? 0 : 0.08 + r() * 0.55,
        travel: 1.7 + r() * 0.5,
        rout: 1.1 + r() * 0.22,
        side: r() < 0.5 ? -1 : 1,
        wk: 0.7 + r() * 0.6,
        tail0: 0.05 + r() * 0.35,           // beat-3 time the tail lets go
        tailDur: 1.0 + r() * 0.2,
        ph: r() * 10, seed: 1 + out.length,
        lift: 0.22 + r() * 0.08,           // peak height above the surface (x R_EARTH) on the way out
        ofs: 1.45 + r() * 0.5,             // vortex lane around ALL (x ball radius)
        wrap: (1.15 + r() * 0.25) * Math.PI, // how far it wraps around ALL before pouring in
      });
    });
  }
  return out;
})();

const onLand = (la, lo) => isLand(la, lo, -60);   // real coastlines (with a little shelf margin)
// ocean glints for "every drop" (rejection-sampled against the land outlines)
const GLINTS = (() => {
  const r = L.rng(77);
  const out = [];
  while (out.length < 170) {
    const la = (r() * 2 - 1) * 62, lo = -95 + r() * 150;
    if (onLand(la, lo)) continue;
    out.push({ la: la * Math.PI / 180, lo: lo * Math.PI / 180, ph: r() * TAU, f: 1.5 + r() * 2.5, d: r() * 0.6, rise: 0.006 + r() * 0.02 });
  }
  return out;
})();

// ------------------------------------------------------------------ timing
const T = (v, i) => v.tl.scenes[i].start;
const kindStart = liftTime;

/** Head / tail positions (0..1 along the path) and flow of one stream at global time gt. */
function streamPos(tl, st, gt) {
  const t0 = kindStart(tl, st.kind) + st.delay;
  const head = L.ease.inOutCubic(L.prog(gt, t0, st.travel));
  const tT = tl.scenes[3].start + st.tail0;
  const tail = L.ease.inCubic(L.prog(gt, tT, st.tailDur));
  return { head, tail, t0, flow: L.clamp((gt - t0) / 0.4) * (1 - tail) };
}
/** Summary for s03: fraction of streams that have reached the ball, and of tails that are in. */
export function streamState(tl, gt) {
  let arrived = 0, drained = 0;
  for (const st of STREAMS) {
    const p = streamPos(tl, st, gt);
    arrived += L.clamp((p.head - 0.85) / 0.15);
    drained += p.tail;
  }
  return { arrived: arrived / STREAMS.length, drained: drained / STREAMS.length };
}

// ------------------------------------------------------------------ path (world metres)
// Polar around Earth, then polar around ALL:
//  1. rise: straight out from the source along its surface normal, clearly past the limb into space;
//  2. orbit: swing around the planet (shortest way) and settle into a lane that runs tangentially past ALL —
//     streams coming round underneath pass on its far side, those coming over the top on its near side, so
//     both families turn the same way round the ball;
//  3. vortex: wrap 200-270 degrees round ALL at ~1.5-2.5 ball radii, then pour into the centre.
// The polyline is arc-length parameterised so heads, tails and droplets move at an even pace.
const angWrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const N_ORB = 64, N_VTX = 40;
function pathPts(st, src) {
  const rho0 = Math.hypot(src.x, src.y);
  const th0 = Math.atan2(src.y, src.x);
  const dth = angWrap(A_B - th0);
  const sg = dth >= 0 ? 1 : -1;
  const ofs = st.ofs * R_B;
  const ro = D_B - sg * ofs;                                   // near lane for +, far lane for -
  // short hops (sources already near ALL) rise less, so they arc rather than hairpin
  const k = 0.55 + 0.45 * L.clamp(Math.abs(dth) / 1.3);
  const rPeak = Math.max(ro, R_EARTH * (1 + st.lift * k * (0.9 + 0.3 * (st.rout - 1.1) / 0.22)));
  const pts = [];
  for (let i = 0; i <= N_ORB; i++) {
    const s = i / N_ORB;
    const rise = L.ease.outCubic(L.clamp(s / 0.38));
    const settle = L.smoothstep(L.clamp((s - 0.3) / 0.6));
    const r = L.lerp(L.lerp(rho0, rPeak, rise), ro, settle);
    const th = th0 + dth * Math.pow(s, 1.7);                   // radial first, tangential at the end
    // beyond the limb, squash the excursion on the left and underneath (well past ALL) so the arcs stay in
    // frame and clear of the captions; zero at ALL itself, so the vortex join is untouched
    const cx = Math.cos(th), sy = Math.sin(th), ex = Math.max(0, r - R_EARTH), r0 = Math.min(r, R_EARTH);
    const under = L.clamp((angWrap(th - A_B) - 0.2) / 0.5) * Math.max(0, sy);
    pts.push([(r0 + ex * (1 - 0.6 * Math.max(0, -cx))) * cx, (r0 + ex * (1 - 0.5 * under)) * sy]);
  }
  // vortex round ALL, entering tangentially, always turning the same way (-phi: anticlockwise on screen)
  const ph0 = sg > 0 ? A_B + Math.PI : A_B;
  for (let i = 1; i <= N_VTX; i++) {
    const u = i / N_VTX;
    const rr = R_B * L.lerp(st.ofs, 1.3, L.smoothstep(L.clamp(u / 0.8))) * (1 - L.ease.inCubic(L.clamp((u - 0.7) / 0.3)));
    const ph = ph0 - st.wrap * u;
    pts.push([ALL.x + rr * Math.cos(ph), ALL.y + rr * Math.sin(ph)]);
  }
  // cumulative arc length, normalised
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const tot = cum[cum.length - 1] || 1;
  return { pts, cum: cum.map((x) => x / tot) };
}
/** Point at arc-length fraction s (0..1). */
function along(P, s) {
  const { pts, cum } = P;
  s = L.clamp(s);
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
  const k = (s - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
  return [L.lerp(pts[lo][0], pts[hi][0], k), L.lerp(pts[lo][1], pts[hi][1], k)];
}

/** Only the source being named is bright: earlier kinds settle back once the next one lifts off. */
function focus(v, kind) {
  const next = KINDS[KINDS.indexOf(kind) + 1];
  if (!next) return 1;
  return 1 - 0.6 * L.ease.inOutCubic(L.prog(v.gt, kindStart(v.tl, next), 0.6));
}
// Screen-space soft limiter: keeps the loops out of the HUD band and clear of the captions.
const Y_TOP = 320, Y_BOT = 1220, Y_SOFT = 90;
function limY(y) {
  if (y < Y_TOP + Y_SOFT) return Y_TOP + Y_SOFT - Y_SOFT * Math.tanh((Y_TOP + Y_SOFT - y) / Y_SOFT);
  if (y > Y_BOT - Y_SOFT) return Y_BOT - Y_SOFT + Y_SOFT * Math.tanh((y - (Y_BOT - Y_SOFT)) / Y_SOFT);
  return y;
}

function drawStream(c, v, st) {
  const p = streamPos(v.tl, st, v.gt);
  if (p.head <= 0.001 || p.tail >= 0.999) return;
  const K = KIND[st.kind];
  const src = surf(st.la, st.lo, filmT(v));
  if (src.z < -0.05) return;
  const n = 60;
  const sa = p.tail, sb = p.head;
  const P = pathPts(st, src);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const s = L.lerp(sa, sb, i / n);
    const [x, y] = along(P, s);
    pts.push([v.wx(x), limY(v.wy(y)), s]);
  }
  const wBase = Math.max(2, v.ws(K.w * st.wk) * 0.72);
  const foc = focus(v, st.kind);
  // normals
  const left = [], right = [];
  for (let i = 0; i <= n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const m = Math.hypot(nx, ny) || 1;
    nx /= m; ny /= m;
    const u = i / n;
    // taper at both ends; thicker near the source while it is still pouring
    const taper = Math.pow(Math.sin(Math.PI * L.clamp(u * 0.92 + 0.04)), 0.55);
    const wob = 1 + 0.25 * Math.sin(pts[i][2] * 22 - v.gt * 5 + st.ph);
    const w = wBase * taper * wob * (1 + 0.6 * (1 - pts[i][2]) * (1 - p.tail));
    left.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    right.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  const ribbon = (scale) => {
    c.beginPath();
    for (let i = 0; i <= n; i++) {
      const [x, y] = pts[i];
      c.lineTo(x + (left[i][0] - x) * scale, y + (left[i][1] - y) * scale);
    }
    for (let i = n; i >= 0; i--) {
      const [x, y] = pts[i];
      c.lineTo(x + (right[i][0] - x) * scale, y + (right[i][1] - y) * scale);
    }
    c.closePath();
  };
  c.save();
  c.globalCompositeOperation = 'lighter';
  const fade = Math.min(1, (1 - p.tail) * 4);
  // the stream only reads crisp once it has left the planet: over the disc it is a faint glow, so the rising
  // streams don't look like scratches on the land
  const ex = v.wx(0), ey = v.wy(0), er = Math.max(0, v.ws(R_EARTH));
  const passes = (m, mc) => {
    ribbon(3.2); c.fillStyle = L.rgba(K.col, 0.05 * m * fade * (0.5 + 0.5 * foc)); c.fill();
    ribbon(1.5); c.fillStyle = L.rgba(K.col, 0.2 * m * fade * (0.4 + 0.6 * foc)); c.fill();
    ribbon(0.7); c.fillStyle = L.rgba(K.core, 0.72 * mc * fade * foc); c.fill();
  };
  c.save();
  c.beginPath(); c.rect(0, 0, L.W, L.H); c.arc(ex, ey, er, 0, TAU); c.clip('evenodd');
  passes(1, 1);
  c.restore();
  c.save();
  c.beginPath(); c.arc(ex, ey, er, 0, TAU); c.clip();
  passes(0.45, 0.18);
  c.restore();
  // droplets riding the stream
  const r = L.rng(st.seed * 13 + 1);
  for (let j = 0; j < 7; j++) {
    const ph = r(), sp = 0.35 + r() * 0.3, sz = 1.4 + r() * 1.8;
    const u = (ph + (v.gt - p.t0) * sp) % 1;
    const s = L.lerp(sa, sb, u);
    const [x, y] = along(P, s);
    const px = v.wx(x), py = limY(v.wy(y));
    const dOff = L.clamp((Math.hypot(px - ex, py - ey) - er + 10) / 40);
    c.fillStyle = L.rgba(K.core, 0.9 * fade * foc * Math.sin(Math.PI * u) * (0.2 + 0.8 * dOff));
    c.beginPath(); c.arc(px, py, Math.max(0, sz), 0, TAU); c.fill();
  }
  // the head: a bright droplet with a halo
  if (p.head < 0.995) {
    const [hx, hy] = pts[n];
    const off = L.clamp((Math.hypot(hx - ex, hy - ey) - er + 10) / 40);   // 0 over the disc, 1 once in space
    L.lightBlob(c, hx, hy, wBase * (5 + 4 * off), K.col, (0.22 + 0.18 * off) * fade);
    c.fillStyle = L.rgba(K.core, fade * (0.25 + 0.75 * off));
    c.beginPath(); c.arc(hx, hy, Math.max(0, wBase * 0.9), 0, TAU); c.fill();
  }
  // the source: light pooling where the water leaves
  if (p.tail < 0.02) {
    const sx = v.wx(src.x), sy = v.wy(src.y);
    const k = L.clamp((v.gt - p.t0) / 0.5) * L.clamp(src.z * 3);
    L.lightBlob(c, sx, sy, wBase * 7, K.col, 0.35 * k);
  }
  c.restore();
}

function drawGlints(c, v) {
  const t = v.gt - T(v, 2);
  const a = L.ease.outCubic(L.prog(t, 0.2, 0.8)) * (1 - L.ease.inCubic(L.prog(t, 2.6, 1.6)));
  if (a <= 0.001) return;
  const sn = Math.hypot(SUN_DIR.x, SUN_DIR.y, 0.78), sx = SUN_DIR.x / sn, sy = -SUN_DIR.y / sn, sz = 0.78 / sn;
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const g of GLINTS) {
    const rise = g.rise * L.ease.outCubic(L.prog(t, 0.4 + g.d, 1.6));
    const p = surf(g.la, g.lo, filmT(v), rise);
    if (p.z < 0.12) continue;
    // sunlit water only (on the night side they read as city lights)
    const R = R_EARTH * (1 + rise);
    const day = L.clamp((p.x / R * sx - p.y / R * sy + p.z * sz - 0.05) / 0.3);
    if (day <= 0.01) continue;
    const tw = Math.pow(0.5 + 0.5 * Math.sin(v.gt * g.f + g.ph), 3);
    const k = a * day * L.prog(t, 0.2 + g.d, 0.4) * (0.25 + 0.75 * tw) * Math.min(1, p.z * 2);
    if (k <= 0.01) continue;
    const x = v.wx(p.x), y = v.wy(p.y);
    L.lightBlob(c, x, y, 6, v.accent, 0.45 * k);
    c.fillStyle = `rgba(190,228,255,${0.8 * k})`;
    c.beginPath(); c.arc(x, y, 1.0, 0, TAU); c.fill();
  }
  c.restore();
}

// ------------------------------------------------------------------ tags
// The tags hold a little into beat 3 (so "CLOUDS" reads for 1.5 s+); s03's overlay draws them from TAG_HANDOFF on.
export const TAG_HANDOFF = 0.2;
export function drawTags(c, v) {
  const t3 = T(v, 3);
  const kinds = Object.keys(SRC);
  kinds.forEach((kind, ki) => {
    const ts = kindStart(v.tl, kind);
    const kin = L.ease.outCubic(L.prog(v.gt, ts - 0.05, 0.45));
    const kout = L.ease.inCubic(L.prog(v.gt, Math.max(t3 + 0.1 + ki * 0.05, ts + 1.85), 0.35));
    if (kin <= 0 || kout >= 1) return;
    const next = kinds[ki + 1];
    const dim = next ? 1 - 0.45 * L.ease.inOutCubic(L.prog(v.gt, kindStart(v.tl, next), 0.4)) : 1;
    const [la, lo] = SRC[kind][TAG_AT[kind]];
    const p = surf(la * Math.PI / 180, lo * Math.PI / 180, filmT(v));
    if (p.z < 0) return;
    const sx = v.wx(p.x), sy = v.wy(p.y);
    // leader points away from the planet's centre
    const ex = v.wx(0), ey = v.wy(0);
    let dx = sx - ex, dy = sy - ey;
    const m = Math.hypot(dx, dy) || 1;
    dx /= m; dy /= m;
    const len = 46;
    const lx = sx + dx * len * kin, ly = sy + dy * len * kin;
    const label = KIND[kind].tag;
    const al = (1 - kout) * dim;
    c.save();
    c.globalAlpha *= al;
    // ring on the source
    c.strokeStyle = 'rgba(235,245,255,0.9)';
    c.lineWidth = 2;
    c.beginPath(); c.arc(sx, sy, Math.max(0, 7 + 3 * (1 - kin)), 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(sx + dx * 8, sy + dy * 8); c.lineTo(lx, ly); c.stroke();
    // pill
    c.font = L.font(26, 700, L.FONT.body);
    c.letterSpacing = '3px';
    const tw = c.measureText(label).width - 3;
    c.letterSpacing = '0px';
    const pw = tw + 32, ph = 44;
    const right = dx >= 0;
    let px = right ? lx + 4 : lx - 4 - pw;
    px = L.clamp(px, 40, W - 140 - pw);
    const py = ly - ph / 2;
    c.globalAlpha *= L.clamp(kin * 1.5 - 0.3);
    // dark backing at full strength (not dimmed) so the streams never show through the word
    c.save();
    c.globalAlpha /= Math.max(0.01, dim);
    // a wider soft margin first, so the light streams fade out before they reach the pill
    c.fillStyle = 'rgba(3,8,18,0.5)';
    L.roundRect(c, px - 9, py - 9, pw + 18, ph + 18, ph / 2 + 9); c.fill();
    c.shadowColor = 'rgba(0,0,0,0.75)';
    c.shadowBlur = 18;
    c.fillStyle = 'rgba(3,8,18,0.96)';
    L.roundRect(c, px, py, pw, ph, ph / 2); c.fill();
    c.restore();
    c.strokeStyle = L.rgba(KIND[kind].col, 0.8);
    c.lineWidth = 1.5;
    L.roundRect(c, px, py, pw, ph, ph / 2); c.stroke();
    c.fillStyle = 'rgb(240,247,255)';
    c.textBaseline = 'middle';
    L.trackedText(c, label, px + 16, py + ph / 2 + 1, 3);
    c.restore();
  });
}

// ------------------------------------------------------------------ scene
export default {
  beat: 2,
  chapter: { num: '02', title: 'Every drop', sub: 'Wherever Earth keeps its water' },
  captions: true,
  layer: 3,
  cues(d) {
    return [
      { t: 0.3, name: 'shimmer', gain: 0.26, pitch: 1.0 },
      { t: 0.9, name: 'shimmer', gain: 0.16, pitch: 1.3 },
      { t: 2.5, name: 'whoosh', gain: 0.34, pitch: 0.8 },
      { t: 2.55, name: 'bubbles', gain: 0.18, pitch: 0.9 },
      { t: 3.2, name: 'swish', gain: 0.26, pitch: 1.2 },
      { t: 3.95, name: 'blip', gain: 0.24, pitch: 1.2 },
      { t: 4.55, name: 'swish', gain: 0.24, pitch: 1.45 },
      { t: 5.45, name: 'whoosh', gain: 0.24, pitch: 1.3 },
      { t: d - 0.9, name: 'riser', gain: 0.26, pitch: 1.0 },
    ];
  },
  drawWorld(ctx, v) {
    const gt = v.gt, t2 = T(v, 2), t4 = T(v, 4);
    if (gt < t2 - 0.1 || gt > t4 + 0.2) return;
    drawGlints(ctx, v);
    for (const st of STREAMS) drawStream(ctx, v, st);
  },
  drawOverlay(ctx, v) {
    if (v.gt < T(v, 3) + TAG_HANDOFF) drawTags(ctx, v);
  },
};
