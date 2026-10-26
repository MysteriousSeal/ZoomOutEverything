// Beat 17 — "Now, back to that one phone, | and those eight hours of YouTube every second."
// The planet turns home while zoomed out, then one long dive lands on the same phone.
//   * Follow the light home: one bright data pulse rides the Japan - Oregon cable east across the Pacific (moving
//     with the turning planet) and runs overland into New York, where it locks on as a small reticle at HOME.
//   * The reticle holds the eye through the dive (planet -> region -> city -> room) and opens out to frame the phone,
//     then fades as the phone fills the frame.
//   * As we land, the phone's screen becomes a generic live upload feed: video cards slide in from the top one after
//     another (each with its upload bar filling), the stream of "eight hours every second".
//   * Label "720,000 hours" / "uploaded every day" lands with the camera and is handed on to beat 18.
// Exports for s18 (import only): drawFeed, uploadLabel, FEED_P.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, CABLES, DEG, HOME, R_EARTH, PHONE, project, viewOf } from '../env.js';
import { screenRect, wordTime } from './s01-one-phone.js';
import { KEYS } from '../camera.js';

const TAU = Math.PI * 2;

// ------------------------------------------------------------------ the pulse's path home: Japan -> Oregon -> New York
const unit = (lat, lon) => { const p = lat * DEG, l = lon * DEG, cp = Math.cos(p); return [cp * Math.cos(l), cp * Math.sin(l), Math.sin(p)]; };
const PATH = (() => {
  const cb = CABLES.find((c) => c.name.startsWith('Oregon - Japan'));
  const sea = cb ? [...cb.pts].reverse() : [[34.9, 140.2], [38, 175], [44.5, -140], [45.6, -124.1]];
  const pts = [...sea, [44.2, -112], [42.2, -98], [41.6, -86], [41.0, -78], [HOME.lat, HOME.lon]];
  const P = [], acc = [0];
  let landA = 0;   // arc length where the sea cable lands (Oregon); beyond it the pulse rides the land backbone
  for (let i = 0; i < pts.length - 1; i++) {
    if (i === sea.length - 1) landA = acc[acc.length - 1];
    const a = unit(...pts[i]), b = unit(...pts[i + 1]);
    const ang = Math.acos(L.clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
    const n = Math.max(1, Math.ceil(ang / (0.7 * DEG)));
    const s = Math.sin(ang);
    for (let k = i ? 1 : 0; k <= n; k++) {
      const t = k / n;
      const fa = ang < 1e-9 ? 1 - t : Math.sin((1 - t) * ang) / s, fb = ang < 1e-9 ? t : Math.sin(t * ang) / s;
      if (P.length) acc.push(acc[acc.length - 1] + ang / n);
      P.push([a[0] * fa + b[0] * fb, a[1] * fa + b[1] * fb, a[2] * fa + b[2] * fb]);
    }
  }
  return { P, acc, len: acc[acc.length - 1], landA };
})();

// ------------------------------------------------------------------ timing
export function times(tl) {   // 18c: exported (cue times)
  const s = tl.scenes[17];
  return {
    go: s.start + 0.15,                       // the pulse sets off from Japan
    home: s.start + 1.0,                      // ... and reaches HOME as the planet finishes turning (18c: turn ends at +1.0)
    // 18c: the dive is shorter (camera.js KEYS[17].travel) and the line no longer says "every second": the label lands
    // with the camera (0.2 s before it settles, as in 18) and the feed starts 0.74 s before that (as in 18)
    land: s.start + KEYS[17].travel - 0.2,
    feed: s.start + KEYS[17].travel - 0.94,
    end: tl.scenes[18].start,
  };
}

function drawPulse(c, v, tm) {
  const gt = v.gt;
  if (gt < tm.go - 0.05 || gt > tm.home + 0.9) return;
  const B = viewOf(v);
  const cx = v.wx(0), cy = v.wy(0), r = v.ws(R_EARTH);
  const scr = (p) => [cx + r * (p[0] * B.e[0] + p[1] * B.e[1]), cy - r * (p[0] * B.n[0] + p[1] * B.n[1] + p[2] * B.n[2]), p[0] * B.c[0] + p[1] * B.c[1] + p[2] * B.c[2]];
  const f = L.ease.inOutCubic(L.prog(gt, tm.go, tm.home - tm.go));
  const head = f * PATH.len, tail = Math.max(0, head - 0.35);
  const fade = L.clamp(L.prog(gt, tm.go, 0.2)) * (1 - L.prog(gt, tm.home + 0.05, 0.5));
  if (fade <= 0) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round'; c.lineJoin = 'round';
  // the tail: the last ~20 deg of path, brightening toward the head
  let prev = null, hx = 0, hy = 0, hz = -1;
  const land = new Path2D();
  let landPen = false;
  for (let q = 0; q < PATH.P.length; q++) {
    const a = PATH.acc[q];
    if (a < tail - 0.02) continue;
    let p = scr(PATH.P[q]);
    if (a > head) {
      const f2 = (head - PATH.acc[q - 1]) / Math.max(1e-9, a - PATH.acc[q - 1]);
      const p0 = scr(PATH.P[q - 1]);
      p = [L.lerp(p0[0], p[0], f2), L.lerp(p0[1], p[1], f2), L.lerp(p0[2], p[2], f2)];
    }
    if (prev && p[2] > 0.02 && prev[2] > 0.02) {
      const w = L.clamp((a - tail) / Math.max(1e-6, head - tail));
      if (PATH.acc[q - 1] >= PATH.landA - 1e-6) {
        // overland: the terrestrial backbone, a thin dashed line (not a sea cable)
        if (!landPen) land.moveTo(prev[0], prev[1]);
        land.lineTo(p[0], p[1]);
        landPen = true;
      } else {
        c.strokeStyle = L.rgba(ACCENT, 0.35 * w * fade);
        c.lineWidth = 9 * w + 2;
        c.beginPath(); c.moveTo(prev[0], prev[1]); c.lineTo(p[0], p[1]); c.stroke();
        c.strokeStyle = L.rgba([225, 240, 255], 0.9 * w * fade);
        c.lineWidth = 2.4 * w + 0.6;
        c.stroke();
      }
    }
    prev = p;
    [hx, hy, hz] = p;
    if (a > head) break;
  }
  if (landPen) {
    c.setLineDash([8, 7]);
    c.strokeStyle = L.rgba([225, 240, 255], 0.7 * fade);
    c.lineWidth = 1.8;
    c.stroke(land);
    c.setLineDash([]);
  }
  if (hz > 0.02) {
    L.lightBlob(c, hx, hy, 46, ACCENT, 0.75 * fade);
    L.lightBlob(c, hx, hy, 13, [240, 248, 255], 0.95 * fade);
  }
  c.restore();
}

/** The lock-on reticle at HOME: holds the eye through the dive and opens out to frame the phone. */
function drawReticle(c, v, tm) {
  const gt = v.gt;
  const inK = L.ease.outCubic(L.prog(gt, tm.home - 0.05, 0.45));
  if (inK <= 0) return;
  const p = project(v, HOME.lat, HOME.lon);
  if (p.z < 0.2) return;
  const ph = v.ws(PHONE.h);
  const outK = 1 - L.ease.inOutCubic(L.clamp(L.invLerp(110, 280, ph)));
  const k = inK * outK;
  if (k <= 0.003) return;
  const rr = Math.max(30, ph * 0.66) * (1 + 1.6 * (1 - inK));
  c.save();
  c.lineCap = 'round';
  // flash on lock
  const fl = Math.exp(-Math.pow((gt - tm.home - 0.1) / 0.18, 2));
  L.lightBlob(c, p.x, p.y, 70, ACCENT, 0.5 * fl * inK);
  // two broken rings turning against each other
  const rot = gt * 0.9;
  for (const [rad, n, dir, a] of [[rr, 4, 1, 0.9], [rr * 1.32, 3, -1, 0.45]]) {
    c.strokeStyle = L.rgba([190, 222, 255], a * k);
    c.lineWidth = rad === rr ? 2 : 1.4;
    for (let i = 0; i < n; i++) {
      const s0 = dir * rot + (i / n) * TAU;
      c.beginPath(); c.arc(p.x, p.y, Math.max(0, rad), s0, s0 + (TAU / n) * 0.62); c.stroke();
    }
  }
  // four inward ticks
  c.strokeStyle = L.rgba(ACCENT, 0.95 * k);
  c.lineWidth = 2.2;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    c.beginPath();
    c.moveTo(p.x + Math.cos(a) * (rr + 6), p.y + Math.sin(a) * (rr + 6));
    c.lineTo(p.x + Math.cos(a) * (rr + 16), p.y + Math.sin(a) * (rr + 16));
    c.stroke();
  }
  // the dot (until the phone itself is visible)
  const dk = k * (1 - L.clamp(L.invLerp(8, 30, ph)));
  if (dk > 0) {
    L.lightBlob(c, p.x, p.y, 16, ACCENT, 0.7 * dk);
    c.fillStyle = L.rgba([240, 248, 255], dk);
    c.beginPath(); c.arc(p.x, p.y, 3, 0, TAU); c.fill();
  }
  c.restore();
}

// ------------------------------------------------------------------ the upload feed (phone screen)
export const FEED_P = 0.42;    // a new upload slides in every 0.42 s
const THUMBS = [
  [[40, 70, 120], [110, 160, 220]], [[90, 60, 40], [220, 160, 100]], [[40, 80, 70], [120, 190, 160]],
  [[70, 50, 100], [170, 140, 230]], [[30, 40, 60], [140, 160, 190]], [[100, 50, 60], [230, 140, 150]],
  [[50, 70, 40], [170, 200, 120]], [[20, 60, 90], [90, 190, 230]],
];
/** Video card at (x, y), width w (px), index i (deterministic look), upload progress up (0..1). Returns its height. */
function card(c, x, y, w, s, i, up, a) {
  const th = w * 9 / 16, rad = 0.0016 * s;
  const r = L.rng(4000 + i);
  const [c0, c1] = THUMBS[Math.floor(r() * THUMBS.length)];
  const g = c.createLinearGradient(x, y, x + w, y + th);
  g.addColorStop(0, L.rgba(c0, a));
  g.addColorStop(1, L.rgba(c1, a * 0.9));
  c.fillStyle = g;
  L.roundRect(c, x, y, w, th, rad); c.fill();
  // abstract picture: a soft horizon + a light
  c.fillStyle = L.rgba([0, 0, 0], 0.25 * a);
  c.fillRect(x, y + th * (0.55 + 0.2 * r()), w, th * 0.18);
  c.fillStyle = L.rgba([255, 255, 255], 0.18 * a);
  c.beginPath(); c.arc(x + w * (0.2 + 0.6 * r()), y + th * (0.3 + 0.2 * r()), Math.max(0, th * 0.12), 0, TAU); c.fill();
  // play glyph
  const pr = th * 0.14, pcx = x + w / 2, pcy = y + th / 2;
  c.fillStyle = L.rgba([4, 8, 16], 0.45 * a);
  c.beginPath(); c.arc(pcx, pcy, Math.max(0, pr * 1.35), 0, TAU); c.fill();
  c.fillStyle = L.rgba([245, 248, 255], 0.9 * a);
  c.beginPath(); c.moveTo(pcx - pr * 0.4, pcy - pr * 0.6); c.lineTo(pcx + pr * 0.65, pcy); c.lineTo(pcx - pr * 0.4, pcy + pr * 0.6); c.closePath(); c.fill();
  // upload bar along the bottom of the thumbnail
  const bh = Math.max(1.5, 0.0006 * s);
  c.fillStyle = L.rgba([255, 255, 255], 0.2 * a);
  c.fillRect(x, y + th - bh, w, bh);
  c.fillStyle = L.rgba(up >= 1 ? [150, 200, 255] : ACCENT, a);
  c.fillRect(x, y + th - bh, w * L.clamp(up), bh);
  // meta: avatar + two skeleton lines
  const my = y + th + 0.0032 * s, av = 0.0026 * s;
  c.fillStyle = L.rgba(c1, 0.8 * a);
  c.beginPath(); c.arc(x + av, my + av, Math.max(0, av), 0, TAU); c.fill();
  c.fillStyle = L.rgba([220, 230, 245], 0.55 * a);
  L.roundRect(c, x + av * 2.8, my + av * 0.25, w * (0.5 + 0.3 * r()), av * 0.6, av * 0.3); c.fill();
  c.fillStyle = L.rgba([170, 185, 210], 0.3 * a);
  L.roundRect(c, x + av * 2.8, my + av * 1.25, w * (0.3 + 0.2 * r()), av * 0.5, av * 0.25); c.fill();
  return th + 0.0032 * s + av * 2 + 0.0042 * s;
}
/**
 * The live upload feed on the phone screen. k = alpha. opts.shift (s) runs the stream's clock ahead (s18 accelerates
 * it smoothly), opts.lift (0..1) slides the whole stack up and away (s18 collapses it into one player).
 */
export function drawFeed(c, v, k, opts = {}) {
  if (k <= 0.003) return;
  const R = screenRect(v);
  if (R.h < 50) return;
  const s = R.s, gt = v.gt;
  c.save();
  L.roundRect(c, R.x, R.y, R.w, R.h, R.r); c.clip();
  c.globalAlpha = k;
  c.fillStyle = 'rgb(6,10,20)';
  c.fillRect(R.x, R.y, R.w, R.h);
  const pad = 0.0034 * s, w = R.w - 2 * pad;
  // header: a pulsing accent dot + "LIVE UPLOADS", under the camera pill
  const hy = R.y + 0.0118 * s;
  c.fillStyle = L.rgba(ACCENT, 0.6 + 0.4 * Math.sin(gt * 6));
  c.beginPath(); c.arc(R.x + pad + 0.001 * s, hy - 0.0009 * s, Math.max(0, 0.0009 * s), 0, TAU); c.fill();
  c.fillStyle = 'rgba(230,238,250,0.95)';
  c.font = L.font(Math.max(4, 0.0027 * s), 700, L.FONT.body);
  c.textBaseline = 'alphabetic';
  L.trackedText(c, 'LIVE UPLOADS', R.x + pad + 0.0032 * s, hy, 0.0003 * s, 'left');
  c.fillStyle = 'rgba(160,180,210,0.8)';
  c.font = L.font(Math.max(4, 0.0024 * s), 600, L.FONT.body);
  L.trackedText(c, '+8 H / SEC', R.x + R.w - pad, hy, 0.0002 * s, 'right');
  // the stream: card n = newest; each new one slides in from the top, pushing the rest down
  const top = R.y + 0.0158 * s;
  const tt = gt - 60 + (opts.shift ?? 0);
  const n = Math.floor(tt / FEED_P), fr = (tt / FEED_P) - n;
  const slide = L.ease.outCubic(L.clamp(fr / 0.55));
  const ch = card(c, -9999, -9999, w, s, 0, 0, 0);   // card pitch (measure)
  const lift = L.ease.inCubic(L.clamp(opts.lift ?? 0)) * R.h * 1.1;
  c.save();
  c.beginPath(); c.rect(R.x, top, R.w, R.y + R.h - top); c.clip();
  for (let j = 0; j < 6; j++) {
    const y = top + (j - 1 + slide) * ch - lift * (1 + j * 0.12);
    if (y > R.y + R.h || y + ch < top) continue;
    const up = j === 0 ? L.clamp(fr * 1.2) : j === 1 ? L.clamp(0.7 + fr) : 1;
    const a = j === 0 ? L.clamp(slide * 1.5) : 1;
    card(c, R.x + pad, y, w, s, n - j, up, a);
  }
  c.restore();
  // top fade under the header
  const tg = c.createLinearGradient(0, top, 0, top + 0.006 * s);
  tg.addColorStop(0, 'rgba(6,10,20,1)'); tg.addColorStop(1, 'rgba(6,10,20,0)');
  c.fillStyle = tg;
  c.fillRect(R.x, top, R.w, 0.006 * s);
  c.restore();
  // camera pill back on top
  const iw = 0.0124 * s, ih = Math.max(1.2, 0.0036 * s), iy = R.y + 0.0033 * s;
  c.fillStyle = '#010102';
  L.roundRect(c, R.cx - iw / 2, iy, iw, ih, ih / 2); c.fill();
}

// ------------------------------------------------------------------ label (handed on to s18)
/** "720,000 hours" / "uploaded every day" in the house style; k = visibility, ex = exit 0..1 (lifts and fades). */
export function uploadLabel(c, k, ex = 0) {
  if (k <= 0) return;
  const e = L.ease.inCubic(L.clamp(ex));
  c.save();
  c.globalAlpha *= 1 - e;
  c.translate(0, -36 * e);
  L.bigLabel(c, { x: 96, y: 470, big: '720,000', small: 'hours uploaded every day', k, accent: ACCENT });
  c.restore();
}

export default {
  beat: 17,
  chapter: { num: '17', title: 'Back to one phone', sub: 'The same screen' },
  captions: true,
  layer: 5,
  // beat starts 74.27: pulse sets off 74.42 (t 0.15) · locks on HOME 75.52 (1.25) · dive · feed 77.73 (3.46)
  // · lands + label 78.47 (4.2)
  cues(d) {
    return [
      { t: 0.15, name: 'swish', gain: 0.22, pitch: 0.7 },
      { t: 0.5, name: 'shimmer', gain: 0.14, pitch: 1.4 },
      { t: 1.22, name: 'blip', gain: 0.26, pitch: 1.1 },
      { t: 1.25, name: 'ping', gain: 0.2, pitch: 1.5 },
      { t: 1.35, name: 'dive', gain: 0.34, pitch: 1.0 },
      { t: 3.46, name: 'tick', gain: 0.14, pitch: 1.6 },
      { t: 4.2, name: 'bloom', gain: 0.26, pitch: 1.1 },
      { t: 4.22, name: 'ping', gain: 0.24, pitch: 1.25 },
      { t: 4.7, name: 'tick', gain: 0.1, pitch: 1.5 },
      { t: 5.12, name: 'tick', gain: 0.1, pitch: 1.5 },
    ];
  },
  drawWorld(ctx, v) {
    const tm = times(v.tl);
    if (v.gt < tm.go - 0.1 || v.gt > tm.end + 0.05) return;
    drawPulse(ctx, v, tm);
    drawReticle(ctx, v, tm);
    if (v.gt < tm.end) drawFeed(ctx, v, L.ease.inOutCubic(L.prog(v.gt, tm.feed, 0.5)));
  },
  drawOverlay(ctx, v) {
    const tm = times(v.tl);
    // drawn on its own clock (not v.k) up to the hand-over, so s18 continues it without a dip
    if (v.gt >= tm.end + 0.05) return;
    uploadLabel(ctx, L.prog(v.gt, tm.land, 0.55));
  },
};
