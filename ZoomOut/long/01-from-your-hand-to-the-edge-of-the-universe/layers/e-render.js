// Builder E: point-cloud renderer for the cosmos layer.
// Points are splatted (bilinear, additive, so sub-pixel motion is perfectly smooth) into a float RGB buffer, tone-mapped
// into an ImageData, and drawn with two cheap bloom passes computed from the same buffer (no canvas filters).
// Resolved galaxies (≥ ~1.6 px) are drawn as pre-rendered sprites instead.
import * as L from '../../../../engine/runtime/lib.js';
import { PR, PG, PB, PAL, hash } from './e-model.js';

const { W, H } = L;
let acc = null, img = null, cv = null, cx2 = null, u32 = null;
let sm = null, sm2 = null, smImg = null, smCv = null, sm2Img = null, sm2Cv = null, tmp = null;
const SW = W >> 2, SH = H >> 2, TW = SW >> 2, TH = Math.ceil(SH / 4);
const LUT_N = 4096, LUT_MAX = 24;
let lut = null;
function init() {
  if (acc) return;
  acc = new Float32Array(W * H * 3);
  cv = new OffscreenCanvas(W, H); cx2 = cv.getContext('2d');
  img = cx2.createImageData(W, H); u32 = new Uint32Array(img.data.buffer);
  sm = new Float32Array(SW * SH * 3); tmp = new Float32Array(SW * SH * 3);
  smCv = new OffscreenCanvas(SW, SH); smImg = smCv.getContext('2d').createImageData(SW, SH);
  sm2 = new Float32Array(TW * TH * 3);
  sm2Cv = new OffscreenCanvas(TW, TH); sm2Img = sm2Cv.getContext('2d').createImageData(TW, TH);
  lut = new Float32Array(LUT_N + 1);
  setGamma(1);
}
let lutGamma = -1;
/** Tone curve: out = (1 - e^-v)^gamma (gamma > 1 deepens faint haze, keeps highlights). */
function setGamma(gm) {
  if (Math.abs(gm - lutGamma) < 1e-3) return;
  lutGamma = gm;
  for (let i = 0; i <= LUT_N; i++) {
    const v = Math.max(1e-6, (i / LUT_N) * LUT_MAX);
    lut[i] = Math.pow(1 - Math.exp(-v), gm) / v;
  }
}

export function begin() { init(); acc.fill(0); sm.fill(0); }

/**
 * Splat a point set. Camera in Mly: (cx, cy) centre, mpp Mly per pixel. K: brightness per unit weight (B / mpp²).
 * frac: share of each radial shell to draw (points are shuffled within shells; the drawn subset tapers over its last
 * 25% and is brightness-compensated, so frac changes are smooth). Only shells within [rNear, rFar] are visited.
 * Each splat also lands (nearest cell) in the quarter-resolution bloom buffer.
 */
export function splat(o, cx, cy, mpp, K, amp, frac, spriteMin = 0, rNear = 0, rFar = Infinity) {
  if (frac <= 0 || amp <= 0 || o.n === 0) return;
  const X = o.X, Y = o.Y, Wt = o.Wt, Cap = o.Cap, T = o.T, S = o.S, A = acc, B = sm;
  const pr = PR, pg = PG, pb = PB;
  const inv = 1 / mpp, ox = W / 2 - 0.5 - cx * inv, oy = H / 2 - 0.5 - cy * inv;
  const Wm = W - 1, Hm = H - 1, W3 = W * 3, SW3 = SW * 3;
  const useS = S !== null && spriteMin > 0, sm8 = spriteMin * 8, sm2 = spriteMin * 2;
  // drawn subset per shell: weight 1 up to 0.75 nf, linear taper to 0 at nf
  const a = 0.75 * frac, m = Math.min(1, frac);
  const sumW = 1 <= a ? 1 : a + ((frac - a) ** 2 - (frac - m) ** 2) / (2 * 0.25 * frac);
  const kk = K * amp / sumW;
  const st = o.shellStart, sr = o.shellR, ns = o.NS;
  for (let s = 0; s < ns; s++) {
    if ((s + 1) * sr < rNear || s * sr > rFar) continue;
    const i0 = st[s], cntS = st[s + 1] - i0;
    if (cntS <= 0) continue;
    const nf = frac * cntS, n = Math.min(cntS, Math.ceil(nf)), t0 = Math.floor(0.75 * nf), tl = 0.25 * nf;
    for (let j = 0; j < n; j++) {
      const i = i0 + j;
      const sx = X[i] * inv + ox;
      if (sx < 0 || sx >= Wm) continue;
      const sy = Y[i] * inv + oy;
      if (sy < 0 || sy >= Hm) continue;
      let I = Wt[i] * kk;
      const c = Cap[i] * amp;
      if (I > c) I = c;
      if (j >= t0) { const tw = (nf - j) / tl; if (tw < 1) I *= tw; }
      if (useS) {
        const spx = S[i] * inv;
        if (spx > spriteMin) {
          const f = (spx - spriteMin) / sm8;
          if (f >= 1) continue;
          I *= 1 - 0.4 * (spx > sm2 ? 1 : (spx - spriteMin) / spriteMin) - 0.6 * f;
        }
      }
      const ix = sx | 0, iy = sy | 0, fx = sx - ix, fy = sy - iy;
      const t = T[i], r = pr[t] * I, g = pg[t] * I, b = pb[t] * I;
      let p = (iy * W + ix) * 3;
      let w = (1 - fx) * (1 - fy);
      A[p] += r * w; A[p + 1] += g * w; A[p + 2] += b * w;
      w = fx * (1 - fy);
      A[p + 3] += r * w; A[p + 4] += g * w; A[p + 5] += b * w;
      p += W3;
      w = (1 - fx) * fy;
      A[p] += r * w; A[p + 1] += g * w; A[p + 2] += b * w;
      w = fx * fy;
      A[p + 3] += r * w; A[p + 4] += g * w; A[p + 5] += b * w;
      const q = (iy >> 2) * SW3 + (ix >> 2) * 3;
      B[q] += r; B[q + 1] += g; B[q + 2] += b;
    }
  }
}

/** Splat one point at a screen position (for small hand-placed sets). */
export function splatOne(sx, sy, I, t) {
  sx -= 0.5; sy -= 0.5;
  if (sx < 0 || sy < 0 || sx >= W - 1 || sy >= H - 1) return;
  const ix = sx | 0, iy = sy | 0, fx = sx - ix, fy = sy - iy, r = PR[t] * I, g = PG[t] * I, b = PB[t] * I;
  let p = (iy * W + ix) * 3;
  const add = (q, w) => { acc[q] += r * w; acc[q + 1] += g * w; acc[q + 2] += b * w; };
  add(p, (1 - fx) * (1 - fy)); add(p + 3, fx * (1 - fy)); p += W * 3; add(p, (1 - fx) * fy); add(p + 3, fx * fy);
  const q = ((iy >> 2) * SW + (ix >> 2)) * 3; sm[q] += r; sm[q + 1] += g; sm[q + 2] += b;
}

function toneInto(src, n, dst32, gain, alpha = 255) {
  const kl = LUT_N / LUT_MAX, lt = lut;
  for (let i = 0, p = 0; i < n; i++, p += 3) {
    const r = src[p], g = src[p + 1], b = src[p + 2];
    const s = r + g + b;
    if (s < 0.003) { dst32[i] = 0; continue; }
    const v = s * gain;
    const k = (v >= LUT_MAX ? 1 / v : lt[(v * kl) | 0]) * gain * 765;
    let R = r * k, G = g * k, B = b * k;
    // highlights bleach toward white
    const wsh = v > 2 ? Math.min(0.45, (v - 2) * 0.05) : 0;
    if (wsh > 0) { R += (255 - R) * wsh; G += (255 - G) * wsh; B += (255 - B) * wsh; }
    R = R > 255 ? 255 : R; G = G > 255 ? 255 : G; B = B > 255 ? 255 : B;
    dst32[i] = (alpha << 24) | ((B | 0) << 16) | ((G | 0) << 8) | (R | 0);
  }
}

let VIG = null;
/** Soft falloff toward the frame edges (multiplies the buffer; strength 0..1). */
function applyVignette(a, w, h, k) {
  if (!VIG) {
    VIG = { x: new Float32Array(w), y: new Float32Array(h) };
    for (let x = 0; x < w; x++) { const u = (x - w / 2) / (w / 2); VIG.x[x] = u * u; }
    for (let y = 0; y < h; y++) { const u = (y - h / 2) / (h / 2); VIG.y[y] = u * u; }
  }
  const vx = VIG.x, vy = VIG.y;
  for (let y = 0; y < h; y++) {
    const yy = vy[y] * 0.7;
    for (let x = 0, p = y * w * 3; x < w; x++, p += 3) {
      if (a[p] + a[p + 1] + a[p + 2] === 0) continue;
      const d = vx[x] * 0.55 + yy;               // 0 centre … ~1.25 corners
      const f = 1 - k * (d > 0.15 ? Math.min(1, (d - 0.15) / 1.1) : 0);
      a[p] *= f; a[p + 1] *= f; a[p + 2] *= f;
    }
  }
}

function boxBlur(src, dst, w, h, rad) {
  // horizontal src -> dst, vertical dst -> src
  const norm = 1 / (2 * rad + 1);
  for (let y = 0; y < h; y++) {
    for (let ch = 0; ch < 3; ch++) {
      let s = 0;
      for (let x = -rad; x <= rad; x++) s += src[(y * w + Math.min(w - 1, Math.max(0, x))) * 3 + ch];
      for (let x = 0; x < w; x++) {
        dst[(y * w + x) * 3 + ch] = s * norm;
        const a = Math.min(w - 1, x + rad + 1), b = Math.max(0, x - rad);
        s += src[(y * w + a) * 3 + ch] - src[(y * w + b) * 3 + ch];
      }
    }
  }
  for (let x = 0; x < w; x++) {
    for (let ch = 0; ch < 3; ch++) {
      let s = 0;
      for (let y = -rad; y <= rad; y++) s += dst[(Math.min(h - 1, Math.max(0, y)) * w + x) * 3 + ch];
      for (let y = 0; y < h; y++) {
        src[(y * w + x) * 3 + ch] = s * norm;
        const a = Math.min(h - 1, y + rad + 1), b = Math.max(0, y - rad);
        s += dst[(a * w + x) * 3 + ch] - dst[(b * w + x) * 3 + ch];
      }
    }
  }
}

/**
 * Tone-map the buffer and composite it onto c (additive), plus bloom. gain: overall exposure. bloom: 0..1.
 */
export function finish(c, gain = 1, bloom = 1, alpha = 1, gamma = 1, crisp = 1, wide = 1, bgain = 1, vig = 0) {
  if (alpha <= 0) return;
  setGamma(gamma);
  if (vig > 0.001) applyVignette(acc, W, H, vig);
  toneInto(acc, W * H, u32, gain);
  cx2.putImageData(img, 0, 0);
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = alpha * crisp;
  c.drawImage(cv, 0, 0);
  if (bloom > 0) {
    // second level (16x)
    sm2.fill(0);
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
      const p = (y * SW + x) * 3, q = (((y >> 2) * TW) + (x >> 2)) * 3;
      sm2[q] += sm[p]; sm2[q + 1] += sm[p + 1]; sm2[q + 2] += sm[p + 2];
    }
    boxBlur(sm, tmp, SW, SH, 2);
    boxBlur(sm, tmp, SW, SH, 2);
    const t2 = new Float32Array(TW * TH * 3);
    boxBlur(sm2, t2, TW, TH, 2);
    boxBlur(sm2, t2, TW, TH, 1);
    setGamma(gamma);
    toneInto(sm, SW * SH, new Uint32Array(smImg.data.buffer), gain * bgain / 16 * 0.9);
    smCv.getContext('2d').putImageData(smImg, 0, 0);
    toneInto(sm2, TW * TH, new Uint32Array(sm2Img.data.buffer), gain / 256 * 1.1);
    sm2Cv.getContext('2d').putImageData(sm2Img, 0, 0);
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.globalAlpha = alpha * 0.55 * bloom;
    c.drawImage(smCv, 0, 0, SW, SH, 0, 0, W, H);
    c.globalAlpha = alpha * 0.45 * wide;
    c.drawImage(sm2Cv, 0, 0, TW, TH, 0, 0, TW * 16, TH * 16);
  }
  c.restore();
}

// ------------------------------------------------------------------ galaxy sprites
const SP = 64, SR = 28;
const MORPHS = 5;                  // spiral, barred, elliptical, irregular, dwarf
const SPR = {};
function blob(c, x, y, rad, col, a) {
  const g = c.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, L.rgba(col, a)); g.addColorStop(1, L.rgba(col, 0));
  c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
}
export function galaxySprite(m, tint, res = 1, seed = 0) {
  const key = `${m}_${tint}_${res}_${seed}`;
  if (SPR[key]) return SPR[key];
  const cvs = new OffscreenCanvas(SP * res, SP * res), c = cvs.getContext('2d');
  const r = L.rng(31 + m * 17 + tint * 5 + seed * 101);
  const col = PAL[tint], core = L.mix(col, [255, 250, 240], 0.55);
  c.translate(SP * res / 2, SP * res / 2); c.scale(res, res);
  c.globalCompositeOperation = 'lighter';
  if (m === 0 || m === 1) {
    blob(c, 0, 0, SR, col, 0.16);
    const turns = m === 0 ? 2.6 : 1.9, arms = 2;
    for (let arm = 0; arm < arms; arm++) {
      for (let i = 0; i < 110; i++) {
        const f = i / 110, th = f * turns * Math.PI + arm * Math.PI + (m === 1 ? 0.5 : 0);
        const rr = (m === 1 ? 7.5 : 3) + 22 * Math.pow(f, 0.9);
        const jx = (r() - 0.5) * 2.2, jy = (r() - 0.5) * 2.2;
        blob(c, rr * Math.cos(th) + jx, rr * Math.sin(th) + jy, 3.6 - 1.8 * f, L.mix(col, [190, 210, 255], 0.35), 0.17 * (1 - f * 0.55));
        if (r() < 0.1) blob(c, rr * Math.cos(th) + jx, rr * Math.sin(th) + jy, 1.4, [255, 175, 205], 0.45);
      }
    }
    if (m === 1) { c.save(); c.rotate(0.5); c.scale(1, 0.3); blob(c, 0, 0, 10, core, 0.5); c.restore(); }
    blob(c, 0, 0, 8, core, 0.85);
    blob(c, 0, 0, 3, [255, 252, 240], 0.9);
  } else if (m === 2) {
    blob(c, 0, 0, SR * 0.95, col, 0.3);
    blob(c, 0, 0, 13, core, 0.55);
    blob(c, 0, 0, 5, [255, 250, 238], 0.85);
  } else {
    const n = m === 4 ? 5 : 9;
    for (let i = 0; i < n; i++) blob(c, (r() - 0.5) * 26, (r() - 0.5) * 18, L.lerp(4, 10, r()), col, 0.3);
    for (let i = 0; i < 5; i++) blob(c, (r() - 0.5) * 20, (r() - 0.5) * 14, 2, [210, 220, 255], 0.5);
    blob(c, 0, 0, 5, core, 0.4);
  }
  SPR[key] = cvs;
  return cvs;
}
export const SPRITE_PX = SR * 2;     // the galaxy's diameter inside a sprite (sprite units)

/**
 * Draw resolved galaxies of a set (points whose diameter ≥ spriteMin px). alphaFn(i, x, y) extra visibility.
 */
export function drawSprites(c, o, cx, cy, mpp, n, spriteMin, amp, alphaFn = null) {
  if (!o.S || amp <= 0) return 0;
  const inv = 1 / mpp, ox = W / 2 - cx * inv, oy = H / 2 - cy * inv;
  let cnt = 0;
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const spx = o.S[i] * inv;
    if (spx <= spriteMin) continue;
    const sx = o.X[i] * inv + ox, sy = o.Y[i] * inv + oy;
    const ext = spx * 1.2 + 4;
    if (sx < -ext || sx > W + ext || sy < -ext || sy > H + ext) continue;
    let a = Math.min(1, (spx - spriteMin) / spriteMin) * amp * Math.min(1, 0.45 + 0.35 * o.Cap[i]);
    if (alphaFn) a *= alphaFn(i, o.X[i], o.Y[i]);
    if (a <= 0.01) continue;
    const m = o.M[i], h1 = hash(i, 3, 17), h2 = hash(i, 5, 19);
    const res = spx > 40 ? 3 : 1;
    const spr = galaxySprite(m, o.T[i] === 6 ? 0 : Math.min(3, o.T[i]), res, (i & 1));
    const s = Math.max(spx, 1.2) / SPRITE_PX / res * 1.35;
    const rot = h1 * Math.PI * 2, inc = m === 2 ? 0.6 + 0.4 * h2 : 0.25 + 0.75 * h2;
    const co = Math.cos(rot) * s, sn = Math.sin(rot) * s;
    c.setTransform(co, sn, -sn * inc, co * inc, sx, sy);
    // small sprites get a second additive pass so their faint arms still read
    const boost = 1 + 0.9 * (1 - Math.min(1, spx / 24));
    c.globalAlpha = Math.min(1, a);
    c.drawImage(spr, -SP * res / 2, -SP * res / 2);
    if (boost > 1.05) { c.globalAlpha = Math.min(1, a * (boost - 1)); c.drawImage(spr, -SP * res / 2, -SP * res / 2); }
    cnt++;
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.restore();
  return cnt;
}
