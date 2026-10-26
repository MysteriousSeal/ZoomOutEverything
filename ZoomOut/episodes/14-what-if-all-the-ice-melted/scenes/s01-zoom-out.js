// Beat 1 — "Now zoom out from a single ice cube, | all the way to Antarctica."
// The camera pulls back 7.8 decades (0.1 mm/px to 5.9 km/px) from the cube at the South Pole. This scene owns the
// dissolve between the scales:
//   * a white, wind-carved SASTRUGI FIELD (procedural, scale-aware: one tile drawn at every decade, each weighted
//     by its on-screen size, so the texture keeps the same density at any zoom) takes over from the slate table
//     (s00) and hands over to the real ETOPO ice sheet (mpp 50-500), at the same colour as env's ice raster;
//   * a thin accent ring keeps the cube's position (the pole) as it goes sub-pixel ("you are here");
//   * on "Antarctica" a light sweep crosses the continent (clipped to the real coastline mask).
// Also exports the Antarctica mask (pole view, world space) that s02 / s03 use for the rim glow.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, R_EARTH, VIEWS, elevation } from '../env.js';

const { W, H } = L;
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const ICE_BASE = [212, 220, 226];        // env's ice raster at the face centre (ICE × sphere shading 0.94)

// ------------------------------------------------------------------ Antarctica mask (pole view, world space)
/** World square covered by the mask: x in [-S, S], y in [R - S, R + S] (pole view, face centre = (0, R)). */
export const MASK_S = 3.3e6;
const MN = 768;
let maskC = null, glowC = null, sweepC = null;
function buildMask() {
  maskC = new OffscreenCanvas(MN, MN);
  const mc = maskC.getContext('2d');
  const img = mc.createImageData(MN, MN);
  const vw = VIEWS.pole;
  for (let j = 0; j < MN; j++) {
    const wy = R_EARTH - MASK_S + (j + 0.5) * (2 * MASK_S / MN);
    const Y = (R_EARTH - wy) / R_EARTH;
    for (let i = 0; i < MN; i++) {
      const X = (-MASK_S + (i + 0.5) * (2 * MASK_S / MN)) / R_EARTH;
      const r2 = X * X + Y * Y;
      if (r2 >= 1) continue;
      const Z = Math.sqrt(1 - r2);
      const px = X * vw.r[0] + Y * vw.u[0] + Z * vw.c[0];
      const py = X * vw.r[1] + Y * vw.u[1] + Z * vw.c[1];
      const pz = X * vw.r[2] + Y * vw.u[2] + Z * vw.c[2];
      const lat = Math.asin(L.clamp(pz, -1, 1)) / DEG, lon = Math.atan2(py, px) / DEG;
      if (lat > -60) continue;
      const e = elevation(lat, lon);
      const a = L.clamp(0.5 + e / 60);            // soft 1-px edge
      if (a <= 0) continue;
      const o = (j * MN + i) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
      img.data[o + 3] = a * 255;
    }
  }
  mc.putImageData(img, 0, 0);
  // outer glow: blurred mask minus the mask itself
  glowC = new OffscreenCanvas(MN, MN);
  const gc = glowC.getContext('2d');
  gc.filter = 'blur(7px)';
  gc.drawImage(maskC, 0, 0);
  gc.filter = 'blur(2px)';
  gc.drawImage(maskC, 0, 0);
  gc.filter = 'none';
  gc.globalCompositeOperation = 'destination-out';
  gc.drawImage(maskC, 0, 0);
  sweepC = new OffscreenCanvas(MN, MN);
}
/** {mask, glow} canvases (white on transparent), built once. */
export function antarcticaMask() {
  if (!maskC) buildMask();
  return { mask: maskC, glow: glowC, n: MN };
}
/** Draw a mask-space canvas into the world (pole view). */
export function drawMaskImage(c, v, img) {
  const x = v.wx(-MASK_S), y = v.wy(R_EARTH - MASK_S), s = v.ws(2 * MASK_S);
  c.drawImage(img, x, y, s, s);
}
/** A light band swept across the continent (p 0..1), clipped to the coastline mask. */
export function sweepContinent(c, v, p, alpha, color = [235, 248, 255]) {
  if (alpha <= 0.001 || p <= 0 || p >= 1) return;
  const { mask } = antarcticaMask();
  const sc = sweepC.getContext('2d');
  sc.globalCompositeOperation = 'source-over';
  sc.clearRect(0, 0, MN, MN);
  // diagonal band from the upper left to the lower right
  // white ice can't get much brighter: the band is lit while the rest of the sheet is briefly shaded
  const ux = Math.cos(0.6), uy = Math.sin(0.6);
  const d = L.lerp(0.1, 0.92, p) * MN * (ux + uy);
  const cx = d * ux, cy = d * uy, band = MN * 0.2;
  const shade = 'rgba(16,34,52,0.3)';
  const g = sc.createLinearGradient(cx - ux * band, cy - uy * band, cx + ux * band, cy + uy * band);
  g.addColorStop(0, shade);
  g.addColorStop(0.36, 'rgba(16,34,52,0)');
  g.addColorStop(0.47, L.rgba(color, 0.3));
  g.addColorStop(0.5, L.rgba(color, 0.75));
  g.addColorStop(0.53, L.rgba(color, 0.3));
  g.addColorStop(0.64, 'rgba(16,34,52,0)');
  g.addColorStop(1, shade);
  sc.fillStyle = g;
  sc.fillRect(0, 0, MN, MN);
  sc.globalCompositeOperation = 'destination-in';
  sc.drawImage(mask, 0, 0);
  c.save();
  c.globalAlpha = alpha * Math.sin(Math.PI * p);
  drawMaskImage(c, v, sweepC);
  c.restore();
}

// ------------------------------------------------------------------ sastrugi tile (seamless, built once)
const TN = 512;
let tileC = null, pattern = null;
function buildTile() {
  tileC = new OffscreenCanvas(TN, TN);
  const c = tileC.getContext('2d');
  const r = L.rng(14001);
  const wrap = (fn) => { for (const ox of [-TN, 0, TN]) for (const oy of [-TN, 0, TN]) { c.save(); c.translate(ox, oy); fn(); c.restore(); } };
  // broad luminance drifts (wind-packed vs loose snow)
  for (let i = 0; i < 22; i++) {
    const x = r() * TN, y = r() * TN, rad = 60 + r() * 140, lit = r() > 0.5;
    wrap(() => {
      const g = c.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, lit ? 'rgba(255,255,255,0.18)' : 'rgba(96,130,172,0.24)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    });
  }
  // sastrugi: soft wind-carved ridges (filled lenses), loosely aligned with the wind; each is a blurred lee
  // shadow (down-right) plus a thin lit crest (up-left). Few, soft and varied, so the field reads as snow.
  for (let i = 0; i < 52; i++) {
    const x = r() * TN, y = r() * TN;
    const len = 30 + r() * r() * 170, wd = 2.5 + r() * 6;
    const ang = -0.42 + (r() - 0.5) * 1.0;
    const bend = (r() - 0.5) * len * 0.7;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const x0 = x - ca * len / 2, y0 = y - sa * len / 2, x1 = x + ca * len / 2, y1 = y + sa * len / 2;
    const qx = x - sa * bend, qy = y + ca * bend;
    const a = 0.55 + r() * 0.45;
    const lens = (dx, dy, w) => {
      c.beginPath();
      c.moveTo(x0 + dx, y0 + dy);
      c.quadraticCurveTo(qx + dx - sa * w, qy + dy + ca * w, x1 + dx, y1 + dy);
      c.quadraticCurveTo(qx + dx + sa * w, qy + dy - ca * w, x0 + dx, y0 + dy);
      c.closePath();
    };
    wrap(() => {
      c.filter = 'blur(2px)';
      c.fillStyle = `rgba(70,104,148,${0.3 * a})`;
      lens(1.5, wd * 0.6, wd);
      c.fill();
      c.filter = 'blur(0.8px)';
      c.fillStyle = `rgba(255,255,255,${0.5 * a})`;
      lens(-0.4, -wd * 0.35, wd * 0.28);
      c.fill();
      c.filter = 'none';
    });
  }
  // crevasses: a few thin, slightly wandering cracks in short parallel sets (blue shadow + a lit lip), the strongest
  // marks in the field, so it reads as an ice sheet at every decade of the zoom
  for (let set = 0; set < 2; set++) {
    const sx = r() * TN, sy = r() * TN, ang = 0.9 + (r() - 0.5) * 0.6, n = 3 + Math.floor(r() * 4);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let k = 0; k < n; k++) {
      const off = (k - n / 2) * (14 + r() * 16) + (r() - 0.5) * 10, len = 40 + r() * 110;
      const x0 = sx - sa * off - ca * len / 2, y0 = sy + ca * off - sa * len / 2;
      const pts = [];
      for (let q = 0; q <= 8; q++) {
        const f = q / 8, wob = (r() - 0.5) * 3;
        pts.push([x0 + ca * len * f - sa * wob, y0 + sa * len * f + ca * wob]);
      }
      wrap(() => {
        c.lineCap = 'round';
        const path = (dx, dy) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x + dx, y + dy) : c.moveTo(x + dx, y + dy))); };
        c.filter = 'blur(1.2px)';
        c.strokeStyle = 'rgba(40,86,140,0.16)';
        c.lineWidth = 3.4;
        path(0, 0); c.stroke();
        c.filter = 'none';
        c.strokeStyle = 'rgba(30,70,120,0.24)';
        c.lineWidth = 1.1;
        path(0, 0); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.4)';
        c.lineWidth = 0.9;
        path(-1.2, -1.4); c.stroke();
      });
    }
  }
  // fine grain
  const img = c.getImageData(0, 0, TN, TN);
  const d = img.data;
  for (let i = 0; i < TN * TN; i++) {
    const n = r();
    if (n > 0.9) { const o = i * 4; const k = (n - 0.9) * 10; d[o] = d[o] * (1 - k * 0.2) + 255 * k * 0.2; d[o + 1] = d[o + 1] * (1 - k * 0.2) + 255 * k * 0.2; d[o + 2] = d[o + 2] * (1 - k * 0.2) + 255 * k * 0.2; d[o + 3] = Math.max(d[o + 3], 40 * k); }
    else if (n < 0.06) { const o = i * 4; d[o] *= 0.6; d[o + 1] *= 0.7; d[o + 2] *= 0.8; d[o + 3] = Math.max(d[o + 3], 22); }
  }
  c.putImageData(img, 0, 0);
}

/** How much of the procedural ice field shows (0..1) at this zoom. */
export function fieldK(mpp) {
  const lm = Math.log10(mpp);
  return L.smoothstep(L.clamp(L.invLerp(-3.55, -3.0, lm))) * (1 - L.smoothstep(L.clamp(L.invLerp(Math.log10(150), Math.log10(1500), lm))));
}

function drawField(c, v) {
  const mpp = v.cam.mpp;
  const k = fieldK(mpp);
  if (k <= 0.001) return;
  if (!tileC) { buildTile(); pattern = c.createPattern(tileC, 'repeat'); }
  const ox = v.wx(0), oy = v.wy(R_EARTH);
  c.save();
  c.globalAlpha = k;
  c.fillStyle = L.rgba(ICE_BASE);
  c.fillRect(0, 0, W, H);
  // one tile per decade of world size; each is weighted by its size on screen (peak at ~700 px). The weights are
  // normalised (they sum to 1) and the finer decade is held back, so two tiles never stack at full strength.
  const lo = Math.floor(Math.log10(mpp * 70)), hi = Math.ceil(Math.log10(mpp * 7000));
  const layers = [];
  for (let n = lo; n <= hi; n++) {
    const px = Math.pow(10, n) / mpp;
    const w = L.smoothstep(L.clamp(1 - Math.abs(Math.log10(px / 700))));
    if (w > 0.001) layers.push({ n, px, w: w * (px < 700 ? 0.7 : 1) });
  }
  const wsum = layers.reduce((a, b) => a + b.w, 0) || 1;
  for (const { n, px, w } of layers) {
    const rot = 0.25 * Math.sin(n * 1.7);       // each decade slightly re-oriented (the wind wanders)
    const sh = ((n * 0.37) % 1 + 1) % 1;
    const m = new DOMMatrix().translateSelf(ox, oy).rotateSelf(rot / DEG).scaleSelf(px / TN).translateSelf(sh * TN, sh * 0.6 * TN);
    pattern.setTransform(m);
    c.globalAlpha = k * w / wsum;
    c.fillStyle = pattern;
    c.fillRect(0, 0, W, H);
  }
  // soft polar light: brighter to the upper left, cooler to the lower right (screen space)
  c.globalAlpha = k;
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, 'rgba(255,252,246,0.16)');
  g.addColorStop(0.55, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(60,90,130,0.16)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // a shade along the top so the HUD (light type) reads over the snow: full strength as soon as snow shows
  c.globalAlpha = L.smoothstep(L.clamp(k * 6));
  const tg = c.createLinearGradient(0, 0, 0, 380);
  tg.addColorStop(0, 'rgba(8,18,30,0.68)');
  tg.addColorStop(260 / 380, 'rgba(8,18,30,0.34)');
  tg.addColorStop(1, 'rgba(8,18,30,0)');
  c.fillStyle = tg;
  c.fillRect(0, 0, W, 380);
  // sparkles: snow crystals catching the low sun (world-anchored per decade, twinkling)
  const r = L.rng(1401 + Math.round(Math.log10(mpp) * 4));
  for (let i = 0; i < 40; i++) {
    const x = r() * W, y = r() * H, ph = r() * TAU, sp = 2 + r() * 3;
    const tw = Math.pow(Math.max(0, Math.sin(v.gt * sp + ph)), 8);
    if (tw < 0.05) continue;
    const s = 2 + 5 * tw;
    c.globalAlpha = k * tw * 0.8;
    c.fillStyle = '#fff';
    c.fillRect(x - s, y - 0.6, s * 2, 1.2);
    c.fillRect(x - 0.6, y - s, 1.2, s * 2);
  }
  c.restore();
}

// ------------------------------------------------------------------ timing
const wordT = (tl) => {
  // "Antarctica" in phrase 2 of line 1 (same weighting as the captions)
  const ph = tl.lines[1].phrases[1];
  const words = ph.text.split(/\s+/);
  const wts = words.map((w) => w.replace(/\W/g, '').length + 1.5 + (/[,.?!:]$/.test(w) ? 3 : 0));
  const tot = wts.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < words.length; i++) { if (/^antarctica/i.test(words[i])) break; acc += wts[i]; }
  return ph.start + (ph.end - ph.start) * acc / tot;
};

// ------------------------------------------------------------------ scene
export default {
  beat: 1,
  chapter: { num: '01', title: 'Zoom out', sub: 'from one ice cube' },
  captions: true,
  layer: -1,                                    // the field sits under the table (s00, layer 0)
  cues(d) {
    return [
      { t: 0.25, name: 'riser', gain: 0.2, pitch: 0.8 },
      { t: 1.35, name: 'whoosh', gain: 0.3, pitch: 0.7 },
      { t: 2.3, name: 'swish', gain: 0.16, pitch: 0.75 },
      { t: 3.55, name: 'deep', gain: 0.3, pitch: 0.75 },
      { t: Math.min(d - 0.6, 3.72), name: 'shimmer', gain: 0.24, pitch: 0.9 },
    ];
  },
  drawWorld(ctx, v) {
    if (v.gt > v.tl.scenes[2].start + 0.5) return;
    drawField(ctx, v);
  },
  drawOverlay(ctx, v) {
    const gt = v.gt;
    // "you are here": the pole, where the cube was, once the cube is smaller than the ring
    const mpp = v.cam.mpp;
    const kin = L.smoothstep(L.clamp(L.invLerp(Math.log10(0.0022), Math.log10(0.006), Math.log10(mpp))));
    const kout = 1 - L.ease.inOutCubic(L.prog(gt, v.tl.scenes[1].start + 3.0, 0.7));
    const kr = kin * kout;
    if (kr > 0.001) {
      const x = v.wx(0), y = v.wy(R_EARTH);
      const pulse = L.prog(gt, v.tl.scenes[1].start + 1.25, 1.0);
      ctx.save();
      ctx.globalAlpha = kr;
      // soft dark halo so the ring reads on the white field
      ctx.strokeStyle = 'rgba(10,30,45,0.35)';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(x, y, 17, 0, TAU); ctx.stroke();
      ctx.strokeStyle = L.rgba(ACCENT, 0.95);
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, 17, 0, TAU); ctx.stroke();
      ctx.fillStyle = L.rgba(ACCENT);
      ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill();
      if (pulse > 0 && pulse < 1) {
        ctx.strokeStyle = L.rgba(ACCENT, 0.7 * (1 - pulse));
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, Math.max(0, 17 + 40 * L.ease.outCubic(pulse)), 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }
    // the light sweep across the whole continent on "Antarctica"
    const t0 = wordT(v.tl) - 0.05;
    const sp = L.prog(gt, t0, 1.5);
    if (sp > 0 && sp < 1) sweepContinent(ctx, v, L.ease.inOutCubic(sp), v.k);
  },
};
