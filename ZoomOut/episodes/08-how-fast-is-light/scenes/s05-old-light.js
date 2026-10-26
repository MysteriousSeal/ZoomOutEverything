// Beat 5 — old light. "When you look at the Sun": a shutter snaps on the Sun and a photograph pulls
// out of it, developing from white into a close-up of the Sun (granulation, spots, a prominence).
// "...as it was eight minutes ago": an orange camera date-stamp burns in, "8 MIN AGO". Behind the
// print, sunlight keeps streaming down the route to Earth.
import * as L from '../../../../engine/runtime/lib.js';
import { SUN } from '../camera.js';
import { drawPhoton, PHOTON_GOLD } from './s01-one-second.js';
import { drawSunHud, SUN_A, SUN_B } from './s04-sun.js';

const { W } = L;
const SHUT = 0.62;          // beat-local: the shutter, on "look"
const PULL = 0.78;          // the print pulls out of the Sun
const DEV0 = 1.05, DEV1 = 2.5;
const STAMP = 3.22;         // on "eight minutes ago"
const CARD = { x: 528, y: 588, w: 432, h: 528, rot: -0.05 };
const PHOTO = 388;          // photo square (px) inside the print
const EXIT = 0.45, EXIT_D = 0.4;   // the print leaves EXIT s before the beat ends (gone before s06)
const STREAM_TRIP = 1.46;   // seconds per Sun->Earth trip of the background light stream

// ------------------------------------------------------------------ the Sun close-up (rendered once)
function h2(x, y, s) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vn(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return L.lerp(L.lerp(h2(xi, yi, s), h2(xi + 1, yi, s), ux), L.lerp(h2(xi, yi + 1, s), h2(xi + 1, yi + 1, s), ux), uy);
}
function fbm(x, y, s, o = 4) { let a = 0, m = 0.5, n = 0, f = 1; for (let i = 0; i < o; i++) { a += m * vn(x * f, y * f, s + i); n += m; m *= 0.5; f *= 2.1; } return a / n; }
/** cellular (worley) distance: granulation cells */
function cell(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y);
  let d1 = 9, d2 = 9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = xi + i + h2(xi + i, yi + j, s), cy = yi + j + h2(xi + i, yi + j, s + 7);
    const d = (cx - x) * (cx - x) + (cy - y) * (cy - y);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return Math.sqrt(d2) - Math.sqrt(d1);
}

let SUNIMG = null;
function sunImage() {
  if (SUNIMG) return SUNIMG;
  const N = 400, R = 150, c = N / 2;
  const cv = new OffscreenCanvas(N, N), cx = cv.getContext('2d');
  const img = cx.createImageData(N, N), d = img.data;
  const spots = [[-38, -22, 9], [-22, -30, 5], [-52, -12, 4], [44, 40, 7], [56, 34, 3.5]];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, r = Math.hypot(dx, dy);
    const o = (y * N + x) * 4;
    let R_ = 0, G = 0, B = 0, A = 255;
    if (r < R + 1) {
      const q = Math.min(1, r / R), mu = Math.sqrt(Math.max(0, 1 - q * q));
      // foreshortened granulation
      const sc = 1 / Math.max(0.25, mu);
      const gx = (dx * (0.9 + 0.1 * mu)) / 4.2, gy = (dy * (0.9 + 0.1 * mu)) / 4.2;
      const gr = L.smoothstep(L.clamp(cell(gx + dx * 0.02 * sc, gy, 3) * 1.6));
      const big = fbm(dx / 40, dy / 40, 11, 3);
      let I = (1 - 0.62 * (1 - mu) - 0.18 * (1 - mu) * (1 - mu)) * (0.9 + 0.1 * gr) * (0.94 + 0.12 * big);
      // faculae: bright flecks near the limb
      I += Math.max(0, fbm(dx / 9, dy / 9, 21, 3) - 0.62) * 1.2 * (1 - mu);
      // sunspots: umbra + penumbra
      let spot = 0;
      for (const [sx, sy, sr] of spots) {
        const sd = Math.hypot(dx - sx, dy - sy) / sr;
        spot = Math.max(spot, Math.exp(-sd * sd * 1.6) * 0.55 + Math.exp(-sd * sd * 6) * 0.4);
      }
      I *= 1 - spot;
      const col = L.ramp([[0, [120, 30, 6]], [0.45, [220, 96, 24]], [0.75, [255, 170, 70]], [1.0, [255, 236, 190]], [1.2, [255, 250, 235]]], I);
      R_ = col[0]; G = col[1]; B = col[2];
      A = 255 * L.clamp(R + 0.5 - r);
      if (A < 255) {   // blend the corona under the anti-aliased rim
        const k = A / 255;
        R_ = R_ * k + 255 * 0.5 * (1 - k); G = G * k + 150 * 0.5 * (1 - k); B = B * k + 60 * 0.5 * (1 - k); A = 255;
      }
    } else {
      // corona: soft falloff, streamers, and a prominence loop on the upper-left limb
      const an = Math.atan2(dy, dx);
      const e = (r - R) / R;
      const streak = 0.6 + 0.8 * fbm(an * 3 + 10, e * 2, 41, 3);
      let I = Math.exp(-e * 7) * 0.9 * streak + Math.exp(-e * 2.2) * 0.12;
      const pa = an - (-2.35), pr = (r - R) / 16;
      const loop = Math.exp(-Math.pow((pr - Math.sin(L.clamp(pa / 0.22 * Math.PI / 2 + Math.PI / 2, 0, Math.PI)) * 1.6) / 0.35, 2)) * (Math.abs(pa) < 0.22 ? 1 : 0);
      R_ = 255 * Math.min(1, I * 1.1 + loop * 0.5); G = 150 * I + 70 * loop * 0.5; B = 60 * I + 30 * loop * 0.5;
      // dark sky with a hint of grain
      R_ += 6; G += 5; B += 8;
    }
    d[o] = R_; d[o + 1] = G; d[o + 2] = B; d[o + 3] = A;
  }
  cx.putImageData(img, 0, 0);
  SUNIMG = cv;
  return cv;
}

// ------------------------------------------------------------------ the print
function drawPrint(ctx, v, t) {
  const pk = L.prog(t, PULL, 0.9);
  if (pk <= 0) return;
  const e = L.ease.outBack(pk, 1.25), ep = L.ease.outCubic(pk);
  const sx = v.wx(SUN.x), sy = v.wy(SUN.y);
  // exit (inside this beat): shrinks a touch, lifts back toward the Sun and fades
  const out = L.ease.inCubic(L.prog(t, v.d - EXIT, EXIT_D));
  if (out >= 1) return;
  const fl = Math.sin(v.gt * 0.7) * 0.008, bob = Math.sin(v.gt * 0.9) * 4;
  const x = L.lerp(sx, CARD.x, ep) + (sx - CARD.x) * 0.22 * out;
  const y = L.lerp(sy, CARD.y, ep) + bob + (sy - CARD.y) * 0.22 * out;
  const sc = L.lerp(0.06, 1, e) * (1 - 0.1 * out);
  const rot = L.lerp(0.35, CARD.rot, ep) + fl + 0.06 * out;
  ctx.save();
  ctx.globalAlpha *= L.clamp(pk * 4) * (1 - out);
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(sc, sc);
  const { w, h } = CARD;
  // paper + shadow
  ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
  const pg = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  pg.addColorStop(0, '#f1ede4'); pg.addColorStop(1, '#d9d3c6');
  ctx.fillStyle = pg;
  L.roundRect(ctx, -w / 2, -h / 2, w, h, 6);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  // the photo
  const px = -PHOTO / 2, py = -h / 2 + (w - PHOTO) / 2;
  ctx.save();
  ctx.beginPath(); ctx.rect(px, py, PHOTO, PHOTO); ctx.clip();
  ctx.fillStyle = '#07060a';
  ctx.fillRect(px, py, PHOTO, PHOTO);
  const dev = L.ease.inOutCubic(L.prog(t, DEV0, DEV1 - DEV0));
  if (dev > 0) {
    ctx.save();
    ctx.globalAlpha *= dev;
    if (dev < 0.98) ctx.filter = `blur(${((1 - dev) * 9).toFixed(1)}px)`;
    // framed up and to the left so the date stamp sits on the dark corner, not on the limb
    const img = sunImage(), S = PHOTO * 0.96;
    ctx.drawImage(img, -S / 2 - 22 + Math.sin(v.gt * 0.3) * 2, py + PHOTO / 2 - S / 2 - 26, S, S);
    ctx.restore();
  }
  // un-developed: milky white that clears
  ctx.fillStyle = `rgba(236,232,222,${1 - dev})`;
  ctx.fillRect(px, py, PHOTO, PHOTO);
  // inner shading + date stamp
  const vg = ctx.createRadialGradient(0, py + PHOTO / 2, PHOTO * 0.3, 0, py + PHOTO / 2, PHOTO * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(px, py, PHOTO, PHOTO);
  const st = t - STAMP;
  if (st > 0) {
    // burns in with a short flicker, like an LCD date imprint
    const fk = st < 0.22 ? (Math.sin(st * 90) > -0.2 ? 1 : 0.25) * L.clamp(st * 8) : 1;
    ctx.save();
    ctx.globalAlpha *= fk;
    ctx.font = L.font(46, 700, L.FONT.din);
    ctx.textBaseline = 'alphabetic';
    // a dark under-shadow first so the digits hold over anything bright, then the orange glow
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 12;
    L.trackedText(ctx, '8 MIN AGO', px + PHOTO - 20, py + PHOTO - 18, 2, 'right');
    ctx.fillStyle = 'rgb(255,146,58)';
    ctx.shadowColor = 'rgba(255,110,30,0.9)'; ctx.shadowBlur = 14;
    L.trackedText(ctx, '8 MIN AGO', px + PHOTO - 20, py + PHOTO - 20, 2, 'right');
    ctx.restore();
  }
  ctx.restore();
  // a soft sheen sweeps the print once it has developed
  const sh = L.prog(t, DEV1 - 0.2, 0.9);
  if (sh > 0 && sh < 1) {
    ctx.save();
    L.roundRect(ctx, -w / 2, -h / 2, w, h, 6); ctx.clip();
    const gx = L.lerp(-w, w, L.ease.inOutCubic(sh));
    const sg = ctx.createLinearGradient(gx - 120, -h / 2, gx + 120, h / 2);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.22)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
  // the caption written on the print's bottom margin
  const capY = py + PHOTO + (h - (py + h / 2) - PHOTO) / 2 + 12;
  ctx.font = L.font(28, 700, L.FONT.body);
  ctx.fillStyle = 'rgba(40,40,50,0.85)';
  ctx.textBaseline = 'middle';
  L.trackedText(ctx, 'THE SUN', px + 4, capY - 8, 5, 'left');
  ctx.font = L.font(20, 500, L.FONT.body);
  ctx.fillStyle = 'rgba(70,72,84,0.75)';
  L.trackedText(ctx, 'as you see it', px + 4, capY + 24, 1, 'left');
  ctx.restore();
}

/** shutter: viewfinder brackets snap shut on the Sun with a white flash */
function drawShutter(ctx, v, t) {
  const k = L.prog(t, SHUT - 0.22, 0.5);
  if (k <= 0 || k >= 1) return;
  const sx = v.wx(SUN.x), sy = v.wy(SUN.y);
  const closeK = L.ease.inOutCubic(L.clamp(k / 0.45));
  const a = 1 - L.ease.inCubic(L.clamp((k - 0.55) / 0.45));
  const s = L.lerp(120, 44, closeK);
  ctx.save();
  ctx.strokeStyle = `rgba(240,242,248,${0.85 * a})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (const [cx, cy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = sx + cx * s, y = sy + cy * s;
    ctx.moveTo(x, y - cy * 18); ctx.lineTo(x, y); ctx.lineTo(x - cx * 18, y);
  }
  ctx.stroke();
  ctx.restore();
  const fl = L.prog(t, SHUT, 0.45);
  if (fl > 0 && fl < 1) L.lightBlob(ctx, sx, sy, 90 + 260 * fl, [255, 250, 240], 0.85 * (1 - fl) * (1 - fl));
}

export default {
  beat: 5,
  chapter: { num: '05', title: 'Old light', sub: 'Every view is a delay' },
  captions: true,
  layer: 4,
  cues(d) {
    return [
      { t: SHUT - 0.1, name: 'blip', gain: 0.22, pitch: 1.6 },
      { t: SHUT, name: 'tick', gain: 0.45, pitch: 0.75 },
      { t: PULL + 0.05, name: 'swish', gain: 0.3, pitch: 1.0 },
      { t: DEV0 + 0.2, name: 'swell', gain: 0.2, pitch: 0.9 },
      { t: DEV1 - 0.1, name: 'shimmer', gain: 0.2, pitch: 1.2 },
      { t: STAMP, name: 'tick', gain: 0.38, pitch: 1.3 },
      { t: STAMP + 0.02, name: 'deep', gain: 0.28, pitch: 1.0 },
    ];
  },

  drawWorld(ctx, v) {
    // sunlight keeps streaming to Earth behind the print (same compressed speed as beat 4)
    const t = v.t;
    if (t < 0) return;
    const a = L.prog(t, 0, 0.4) * (1 - L.prog(v.gt, v.tl.scenes[6].start - 0.1, 0.5));
    if (a <= 0) return;
    const ax = v.wx(SUN_A.x), ay = v.wy(SUN_A.y), bx = v.wx(SUN_B.x), by = v.wy(SUN_B.y);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = L.rgba(PHOTON_GOLD, 0.3 * a);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.restore();
    const trip = STREAM_TRIP, gap = 0.62;
    for (let i = 0; i < 8; i++) {
      const p = ((t + i * gap) % (gap * 8)) / trip;
      if (p > 1) continue;
      const fa = Math.min(1, p * 8, (1 - p) * 8) * a * 0.6;
      drawPhoton(ctx, L.lerp(ax, bx, p), L.lerp(ay, by, p), { s: 0.42, a: fa, spikes: false });
    }
  },

  drawOverlay(ctx, v) {
    const t = v.t;
    if (t > v.d) return;
    // the beat-4 clock + tags carry on (locked at 8 min 20 s), then clear for the print
    const s4 = v.tl.scenes[4];
    const hk = 1 - L.ease.inCubic(L.prog(t, 0.55, 0.4));
    if (hk > 0) drawSunHud(ctx, { ...v, t: v.gt - s4.start, d: s4.end - s4.start, k: hk }, hk);
    drawShutter(ctx, v, t);
    drawPrint(ctx, v, t);
  },
};
