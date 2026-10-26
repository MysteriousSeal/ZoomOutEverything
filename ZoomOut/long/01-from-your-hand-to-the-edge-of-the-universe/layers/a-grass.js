// Builder A: the lawn, as pre-rendered tiling textures at four scales, cross-faded by log10(F) (classic infinite-zoom LOD).
//   L0  0.32 m tile, 6.4 px/mm   real blades (3-6 mm wide), clover, a daisy, clippings, micro-shadows   lf -1.6 .. 0.1
//   L1  1.6 m tile               small blades                                                          lf -0.15 .. 0.9
//   L2  10 m tile                blade grain + clumps                                                  lf 0.65 .. 1.75
//   L3  64 m tile                lawn mottling, worn patches                                           lf 1.45 .. 2.4
// Every tile is normalised to the same mean colour (park-data PAL.grass), so the cross-fades never shift the colour and
// the hand-off to builder B's flat meadow (lf 2.0-2.4) is invisible. Sun from the lower left, shadows to the upper right.
import * as L from '../../../../engine/runtime/lib.js';
import { PAL } from './park-data.js';

const { W, H } = L;
const SUN = { x: -0.6, y: 0.8 };      // toward the sun, screen axes
const SH = { x: 0.6, y: -0.8 };       // shadows fall this way
export const GRASS_MEAN = PAL.grass;

const mk = (w, h = w) => { const c = new OffscreenCanvas(w, h); return [c, c.getContext('2d', { willReadFrequently: true })]; };

// ------------------------------------------------------------------ blades
/** Outline of a blade: quadratic centre line from (x, y) along `ang`, `len` long, bent by `bend`; tapered or mown tip. */
function blade(x, y, ang, len, wid, bend, cut) {
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  const p1x = x + dx * len * 0.5 + nx * bend * len, p1y = y + dy * len * 0.5 + ny * bend * len;
  const p2x = x + dx * len, p2y = y + dy * len;
  const n = 7, Lp = [], Rp = [], M = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
    const px = a * x + b * p1x + c * p2x, py = a * y + b * p1y + c * p2y;
    let tx = 2 * (1 - t) * (p1x - x) + 2 * t * (p2x - p1x), ty = 2 * (1 - t) * (p1y - y) + 2 * t * (p2y - p1y);
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const hw = wid / 2 * (cut ? 1 - 0.25 * t : Math.pow(1 - t, 0.75) * (0.75 + 0.25 * (1 - t)));
    Lp.push([px - ty * hw, py + tx * hw]); Rp.push([px + ty * hw, py - tx * hw]); M.push([px, py, -ty, tx]);
  }
  if (cut) {   // oblique, slightly ragged mower cut
    const side = cut > 0.55 ? Lp : Rp, q = side[n];
    side[n] = [L.lerp(side[n - 1][0], q[0], 0.15 + 0.3 * cut), L.lerp(side[n - 1][1], q[1], 0.15 + 0.3 * cut)];
  }
  return { Lp, Rp, M, x0: x, y0: y, x1: p2x, y1: p2y };
}
function polyPath(g, A, B) {
  g.beginPath();
  g.moveTo(A[0][0], A[0][1]);
  for (let i = 1; i < A.length; i++) g.lineTo(A[i][0], A[i][1]);
  for (let i = B.length - 1; i >= 0; i--) g.lineTo(B[i][0], B[i][1]);
  g.closePath();
}
/** Run fn(ox, oy) for every wrap copy of a shape with bbox [x0-r, x1+r] that touches the N x N tile. */
function wrap(N, x, y, r, fn) {
  for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
    if (x + ox + r < 0 || x + ox - r > N || y + oy + r < 0 || y + oy - r > N) continue;
    fn(ox, oy);
  }
}

// ------------------------------------------------------------------ colour helpers
const sh = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
function normalise(cv, target) {
  const g = cv.getContext('2d');
  const im = g.getImageData(0, 0, cv.width, cv.height), d = im.data;
  let r = 0, gg = 0, b = 0;
  const n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
  const kr = target[0] / (r / n), kg = target[1] / (gg / n), kb = target[2] / (b / n);
  for (let i = 0; i < d.length; i += 4) { d[i] = d[i] * kr; d[i + 1] = d[i + 1] * kg; d[i + 2] = d[i + 2] * kb; d[i + 3] = 255; }
  g.putImageData(im, 0, 0);
}
function mips(cv) {
  const out = [cv];
  let c = cv;
  while (c.width > 64) {
    const [n, g] = mk(c.width >> 1);
    g.imageSmoothingQuality = 'high';
    // a wrap-aware half-size: draw the tile with 1 px of its neighbours so edges average correctly
    g.drawImage(c, 0, 0, n.width, n.height);
    out.push(n);
    c = n;
  }
  return out;
}

// ------------------------------------------------------------------ L0: macro lawn (32 cm)
function clover(g, N, x, y, s, rnd, ppm) {
  // a white-clover plant: 3-5 trifoliate leaves on stalks, leaflets with the pale chevron
  const leaves = 3 + ((rnd() * 3) | 0);
  for (let i = 0; i < leaves; i++) {
    const a = rnd() * Math.PI * 2, d = (4 + rnd() * 12) * ppm * s;
    const cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d;
    const lr = (5.5 + rnd() * 3) * ppm * s, rot = rnd() * Math.PI * 2, depth = rnd();
    wrap(N, cx, cy, lr * 2.5, (ox, oy) => {
      g.save();
      g.translate(cx + ox, cy + oy);
      // soft shadow of the leaf toward the upper right
      g.save();
      g.translate(SH.x * lr * 0.5, SH.y * lr * 0.5);
      g.filter = `blur(${lr * 0.25}px)`;
      g.fillStyle = 'rgba(5,14,3,0.45)';
      g.beginPath(); g.arc(0, 0, lr * 1.9, 0, Math.PI * 2); g.fill();
      g.restore();
      g.rotate(rot);
      for (let k = 0; k < 3; k++) {
        g.save();
        g.rotate(k * Math.PI * 2 / 3 + (rnd() - 0.5) * 0.3);
        // obovate leaflet with a shallow notch, base at the centre
        const Lr = lr * (0.9 + rnd() * 0.2);
        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(Lr * 0.75, -Lr * 0.15, Lr * 1.15, -Lr * 0.85, Lr * 0.55, -Lr * 1.65);
        g.quadraticCurveTo(Lr * 0.22, -Lr * 1.82, 0, -Lr * 1.55);
        g.quadraticCurveTo(-Lr * 0.22, -Lr * 1.82, -Lr * 0.55, -Lr * 1.65);
        g.bezierCurveTo(-Lr * 1.15, -Lr * 0.85, -Lr * 0.75, -Lr * 0.15, 0, 0);
        const base = L.mix([44, 86, 42], [74, 118, 56], depth);
        const gr = g.createLinearGradient(0, 0, 0, -Lr * 1.7);
        gr.addColorStop(0, L.rgba(sh(base, 0.7)));
        gr.addColorStop(1, L.rgba(base));
        g.fillStyle = gr;
        g.fill();
        g.save(); g.clip();
        // the pale chevron
        g.strokeStyle = 'rgba(180,205,165,0.32)';
        g.lineWidth = Lr * 0.16;
        g.filter = `blur(${Lr * 0.06}px)`;
        g.beginPath(); g.moveTo(-Lr * 0.55, -Lr * 0.75); g.lineTo(0, -Lr * 0.45); g.lineTo(Lr * 0.55, -Lr * 0.75); g.stroke();
        g.filter = 'none';
        // midrib + side light from the lower left
        g.strokeStyle = 'rgba(30,60,25,0.35)'; g.lineWidth = Lr * 0.05;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -Lr * 1.5); g.stroke();
        g.restore();
        g.restore();
      }
      g.restore();
    });
  }
}
function daisy(g, N, x, y, r, rnd) {
  wrap(N, x, y, r * 2, (ox, oy) => {
    g.save();
    g.translate(x + ox, y + oy);
    g.save();
    g.translate(SH.x * r * 0.9, SH.y * r * 0.9);
    g.filter = `blur(${r * 0.18}px)`;
    g.fillStyle = 'rgba(6,16,4,0.5)';
    g.beginPath(); g.arc(0, 0, r * 1.05, 0, Math.PI * 2); g.fill();
    g.restore();
    const n = 34;
    for (let layer = 0; layer < 2; layer++) {
      for (let i = 0; i < n; i++) {
        const a = (i + layer * 0.5) / n * Math.PI * 2 + (rnd() - 0.5) * 0.08, pl = r * (0.82 + rnd() * 0.22), pw = r * 0.085;
        g.save();
        g.rotate(a);
        g.beginPath();
        g.moveTo(r * 0.18, -pw * 0.5);
        g.quadraticCurveTo(pl * 0.7, -pw * 1.1, pl, 0);
        g.quadraticCurveTo(pl * 0.7, pw * 1.1, r * 0.18, pw * 0.5);
        const lit = 0.5 + 0.5 * Math.cos(a - Math.atan2(SUN.y, SUN.x));
        const gr = g.createLinearGradient(r * 0.2, 0, pl, 0);
        gr.addColorStop(0, L.rgba(L.mix([215, 212, 200], [250, 248, 240], lit)));
        gr.addColorStop(0.8, L.rgba(L.mix([228, 226, 218], [255, 253, 248], lit)));
        gr.addColorStop(1, L.rgba([226, 150, 170]));   // the pink tips of Bellis perennis
        g.fillStyle = gr;
        g.globalAlpha = layer ? 1 : 0.85;
        g.fill();
        g.restore();
      }
    }
    g.globalAlpha = 1;
    // yellow disc florets, domed: lit lower left
    const cr = r * 0.26;
    const gr = g.createRadialGradient(-cr * 0.35, cr * 0.35, cr * 0.1, 0, 0, cr);
    gr.addColorStop(0, 'rgb(255,226,90)'); gr.addColorStop(0.7, 'rgb(236,184,40)'); gr.addColorStop(1, 'rgb(170,120,20)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(0, 0, cr, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 80; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * cr * 0.9;
      g.fillStyle = `rgba(150,100,10,${0.25 + rnd() * 0.3})`;
      g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, cr * 0.06, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  });
}

/**
 * Generic lawn tile. ppm = px per mm. layers: deep -> top. detail: full shading (L0) or simple (L1).
 */
function lawnTile(N, ppm, seed, opts) {
  const rnd = L.rng(seed);
  const [cv, g] = mk(N);
  g.fillStyle = 'rgb(42,60,26)';
  g.fillRect(0, 0, N, N);
  // soil / thatch speckle under everything
  for (let i = 0; i < N * N / (opts.detail ? 900 : 300); i++) {
    const x = rnd() * N, y = rnd() * N, r = (0.4 + rnd() * 1.2) * ppm;
    g.fillStyle = rnd() < 0.5 ? `rgba(70,62,34,${0.3 + rnd() * 0.3})` : `rgba(14,22,8,${0.4 + rnd() * 0.4})`;
    g.fillRect(x, y, r, r * (0.5 + rnd()));
  }
  const [shc, shg] = mk(N);
  const L_ = opts.layers;
  L_.forEach((ly, li) => {
    const top = li === L_.length - 1;
    // depth dimming of everything already drawn (occlusion by this layer's canopy)
    if (li > 0) { g.fillStyle = `rgba(10,20,6,${ly.dim ?? 0.28})`; g.fillRect(0, 0, N, N); }
    const B = [];
    for (let i = 0; i < ly.n; i++) {
      const flat = rnd() < ly.flat;
      const len = (flat ? L.lerp(ly.len[1] * 0.8, ly.len[1] * 1.8, rnd()) : L.lerp(ly.len[0], ly.len[1], Math.pow(rnd(), 1.4))) * ppm;
      const wid = L.lerp(ly.wid[0], ly.wid[1], rnd()) * ppm;
      const ang = rnd() * Math.PI * 2;
      const bend = (rnd() - 0.5) * (flat ? 0.35 : 0.18);
      const cut = rnd() < (ly.cut ?? 0.25) ? 0.1 + rnd() * 0.9 : 0;
      B.push({ x: rnd() * N, y: rnd() * N, ang, len, wid, bend, cut, flat, tone: rnd(), sheen: rnd() });
    }
    // micro-shadows cast by this layer onto what is below (upper right)
    if (ly.shadow) {
      shg.setTransform(1, 0, 0, 1, 0, 0);
      shg.clearRect(0, 0, N, N);
      shg.fillStyle = '#000';
      for (const b of B) {
        const s = blade(b.x, b.y, b.ang, b.len, b.wid, b.bend, b.cut);
        wrap(N, b.x, b.y, b.len + b.wid, (ox, oy) => {
          shg.save(); shg.translate(ox, oy); polyPath(shg, s.Lp, s.Rp); shg.fill(); shg.restore();
        });
      }
      const off = ly.shadow * ppm;
      g.save();
      g.filter = `blur(${off * 0.35}px)`;
      g.globalAlpha = ly.shadowA ?? 0.45;
      for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) g.drawImage(shc, ox + SH.x * off, oy + SH.y * off);
      g.restore();
    }
    for (const b of B) {
      const s = blade(b.x, b.y, b.ang, b.len, b.wid, b.bend, b.cut);
      // tone: depth-lit; lit blades yellow-green, others deeper green; a few dry/straw blades
      const dry = b.tone > 0.975;
      const baseC = dry ? [150, 140, 80] : L.mix(ly.dark, ly.light, b.tone);
      wrap(N, b.x, b.y, b.len + b.wid, (ox, oy) => {
        g.save();
        g.translate(ox, oy);
        polyPath(g, s.Lp, s.Rp);
        if (opts.detail) {
          // along the blade: base (deeper, shaded) -> tip (higher, sunlit); flat blades are evenly lit
          const gr = g.createLinearGradient(s.x0, s.y0, s.x1, s.y1);
          gr.addColorStop(0, L.rgba(sh(baseC, b.flat ? 0.85 : 0.55)));
          gr.addColorStop(0.65, L.rgba(baseC));
          gr.addColorStop(1, L.rgba(b.cut ? L.mix(baseC, [150, 146, 92], 0.3) : sh(baseC, 1.05)));
          g.fillStyle = gr;
          g.fill();
          // the blade is folded along its midrib: the half facing away from the sun is darker
          const m = s.M[3], facing = m[2] * SUN.x + m[3] * SUN.y;   // normal of the L side
          const half = facing > 0 ? s.Rp : s.Lp;
          g.beginPath();
          g.moveTo(s.M[0][0], s.M[0][1]);
          for (let i = 1; i < s.M.length; i++) g.lineTo(s.M[i][0], s.M[i][1]);
          for (let i = half.length - 1; i >= 0; i--) g.lineTo(half[i][0], half[i][1]);
          g.closePath();
          g.fillStyle = `rgba(10,30,5,${0.22 + 0.15 * Math.abs(facing)})`;
          g.fill();
          // waxy sheen on the lit half of some blades
          if (b.sheen > 0.55 && !dry) {
            const lit = facing > 0 ? s.Lp : s.Rp;
            g.beginPath();
            for (let i = 1; i < s.M.length - 1; i++) {
              const x = (s.M[i][0] * 0.55 + lit[i][0] * 0.45), y = (s.M[i][1] * 0.55 + lit[i][1] * 0.45);
              i === 1 ? g.moveTo(x, y) : g.lineTo(x, y);
            }
            g.strokeStyle = `rgba(225,240,190,${0.12 + 0.18 * (b.sheen - 0.55) * 2})`;
            g.lineWidth = Math.max(0.8, b.wid * 0.16);
            g.stroke();
          }
          // a thin dark edge so overlapping blades separate
          polyPath(g, s.Lp, s.Rp);
          g.strokeStyle = 'rgba(12,28,6,0.35)';
          g.lineWidth = Math.max(0.7, ppm * 0.18);
          g.stroke();
        } else {
          g.fillStyle = L.rgba(baseC);
          g.fill();
          if (b.wid > 3) {
            const m = s.M[3], facing = m[2] * SUN.x + m[3] * SUN.y;
            const half = facing > 0 ? s.Rp : s.Lp;
            g.beginPath();
            g.moveTo(s.M[0][0], s.M[0][1]);
            for (let i = 1; i < s.M.length; i++) g.lineTo(s.M[i][0], s.M[i][1]);
            for (let i = half.length - 1; i >= 0; i--) g.lineTo(half[i][0], half[i][1]);
            g.closePath();
            g.fillStyle = 'rgba(10,30,5,0.3)';
            g.fill();
          }
        }
        g.restore();
      });
    }
    if (ly.blur) {
      const [tc, tg] = mk(N);
      tg.drawImage(cv, 0, 0);
      g.save();
      g.filter = `blur(${ly.blur}px)`;
      for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) g.drawImage(tc, ox, oy);
      g.restore();
    }
    if (opts.extras && li === opts.extrasAt) opts.extras(g, rnd);
    void top;
  });
  if (opts.after) opts.after(g, rnd);
  return cv;
}

// ------------------------------------------------------------------ noise helpers for the coarse tiles
function valueNoise(N, cells, rnd) {
  // tileable value noise, `cells` per tile
  const v = new Float32Array(cells * cells);
  for (let i = 0; i < v.length; i++) v[i] = rnd();
  const out = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    const fy = y / N * cells, iy = Math.floor(fy), ty = L.smoothstep(fy - iy);
    for (let x = 0; x < N; x++) {
      const fx = x / N * cells, ix = Math.floor(fx), tx = L.smoothstep(fx - ix);
      const a = v[(iy % cells) * cells + (ix % cells)], b = v[(iy % cells) * cells + ((ix + 1) % cells)];
      const c = v[((iy + 1) % cells) * cells + (ix % cells)], d = v[((iy + 1) % cells) * cells + ((ix + 1) % cells)];
      out[y * N + x] = L.lerp(L.lerp(a, b, tx), L.lerp(c, d, tx), ty);
    }
  }
  return out;
}

function grainTile(N, mmPerPx, seed) {
  // L2: blades are ~1 px: grain of short strokes in depth layers + clumps
  const rnd = L.rng(seed);
  const [cv, g] = mk(N);
  const n1 = valueNoise(N, 16, rnd), n2 = valueNoise(N, 64, rnd);
  const im = g.createImageData(N, N), d = im.data;
  for (let i = 0; i < N * N; i++) {
    const k = 0.75 + 0.35 * (n1[i] - 0.5) + 0.25 * (n2[i] - 0.5) + (rnd() - 0.5) * 0.35;
    d[i * 4] = 70 * k; d[i * 4 + 1] = 108 * k; d[i * 4 + 2] = 46 * k; d[i * 4 + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const lens = [6, 14];
  for (let layer = 0; layer < 3; layer++) {
    if (layer) { g.fillStyle = 'rgba(12,22,6,0.18)'; g.fillRect(0, 0, N, N); }
    const n = N * N / (layer === 2 ? 10 : 14);
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = rnd() * N, y = rnd() * N, a = rnd() * Math.PI * 2, l = L.lerp(lens[0], lens[1], rnd()) / mmPerPx * (0.4 + rnd() * 0.8);
      const t = rnd();
      const c = t > 0.985 ? [160, 150, 90] : L.mix([46, 82, 30], [150, 182, 82], Math.pow(t, 0.8) * (0.6 + 0.2 * layer));
      g.strokeStyle = L.rgba(c, 0.9);
      g.lineWidth = 0.6 + rnd() * 0.7;
      const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l;
      wrap(N, x, y, l + 2, (ox, oy) => { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x2 + ox, y2 + oy); g.stroke(); });
    }
  }
  // a few clover patches and the odd daisy (white specks)
  for (let i = 0; i < 12; i++) {
    const x = rnd() * N, y = rnd() * N, r = (20 + rnd() * 60) / mmPerPx;
    for (let j = 0; j < 40; j++) {
      const a = rnd() * Math.PI * 2, dd = Math.sqrt(rnd()) * r;
      g.fillStyle = `rgba(${66 + rnd() * 20},${112 + rnd() * 24},${52 + rnd() * 12},0.5)`;
      wrap(N, x, y, r + 3, (ox, oy) => { g.beginPath(); g.arc(x + ox + Math.cos(a) * dd, y + oy + Math.sin(a) * dd, 7 / mmPerPx + 0.6, 0, 7); g.fill(); });
    }
  }
  for (let i = 0; i < 40; i++) {
    const x = rnd() * N, y = rnd() * N;
    g.fillStyle = 'rgba(245,245,235,0.9)';
    g.beginPath(); g.arc(x, y, Math.max(0.8, 9 / mmPerPx), 0, 7); g.fill();
  }
  return cv;
}

function mottleTile(N, mPerPx, seed) {
  // L3: lawn at 10-60 m: mottling, slightly worn patches, fine grain
  const rnd = L.rng(seed);
  const [cv, g] = mk(N);
  const n0 = valueNoise(N, 5, rnd), n1 = valueNoise(N, 14, rnd), n2 = valueNoise(N, 40, rnd), n3 = valueNoise(N, 160, rnd);
  const im = g.createImageData(N, N), d = im.data;
  const base = PAL.grass, light = PAL.grassLight, dark = PAL.grassDark, worn = PAL.grassWorn;
  for (let i = 0; i < N * N; i++) {
    const m = 0.5 * n0[i] + 0.3 * n1[i] + 0.2 * n2[i];
    let c = m > 0.5 ? L.mix(base, light, (m - 0.5) * 1.1) : L.mix(base, dark, (0.5 - m) * 1.1);
    const w = L.smoothstep(L.clamp((n1[i] * 0.6 + n2[i] * 0.4 - 0.68) * 5));
    c = L.mix(c, worn, w * 0.55);
    const k = 1 + (n3[i] - 0.5) * 0.18 + (rnd() - 0.5) * 0.16;
    d[i * 4] = c[0] * k; d[i * 4 + 1] = c[1] * k; d[i * 4 + 2] = c[2] * k; d[i * 4 + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  return cv;
}

// ------------------------------------------------------------------ the levels
const N0 = 2048;
let LV = null;
function levels() {
  if (LV) return LV;
  const t0 = 0.32, ppm0 = N0 / (t0 * 1000);           // 6.4 px/mm
  const L0 = lawnTile(N0, ppm0, 101, {
    detail: true,
    layers: [
      { n: 1500, len: [6, 30], wid: [2, 4], flat: 0.15, dark: [34, 62, 22], light: [70, 104, 40], dim: 0, shadow: 0, blur: 3.5 },
      { n: 1300, len: [6, 36], wid: [2.2, 4.5], flat: 0.18, dark: [44, 78, 28], light: [92, 130, 50], dim: 0.2, shadow: 4, shadowA: 0.4, blur: 1.6 },
      { n: 1100, len: [6, 40], wid: [2.5, 5], flat: 0.22, dark: [58, 96, 34], light: [118, 156, 62], dim: 0.18, shadow: 6, shadowA: 0.45 },
      { n: 650, len: [8, 45], wid: [2.8, 5.5], flat: 0.28, dark: [76, 116, 42], light: [150, 184, 78], dim: 0.2, shadow: 8, shadowA: 0.5 },
    ],
    extrasAt: 2,
    after(g, rnd) {
      const at = (x, y) => [(x + 0.16) * N0 / 0.32, (y + 0.16) * N0 / 0.32];
      const [dx, dy] = at(0.1, -0.065);
      daisy(g, N0, dx, dy, 8.5 * ppm0, rnd);
      const [ex, ey] = at(-0.135, -0.09);
      daisy(g, N0, ex, ey, 7 * ppm0, rnd);
    },
    extras(g, rnd) {
      // white clover patches and grass clippings, placed in tile px; the tile's centre is the hand (world origin)
      const at = (x, y) => [(x + 0.16) * N0 / 0.32, (y + 0.16) * N0 / 0.32];
      for (const [x, y, s] of [[-0.118, 0.052, 1], [0.128, 0.058, 0.9], [-0.03, -0.128, 0.85], [0.06, 0.14, 1]]) {
        const [px, py] = at(x, y);
        clover(g, N0, px, py, s, rnd, ppm0);
      }
      // dry clippings from the last mow
      for (let i = 0; i < 22; i++) {
        const x = rnd() * N0, y = rnd() * N0, a = rnd() * Math.PI * 2, l = (4 + rnd() * 9) * ppm0, w = (1.6 + rnd() * 1.5) * ppm0;
        const s = blade(x, y, a, l, w, (rnd() - 0.5) * 0.2, true);
        wrap(N0, x, y, l + w, (ox, oy) => {
          g.save(); g.translate(ox, oy); polyPath(g, s.Lp, s.Rp);
          g.fillStyle = L.rgba(L.mix([112, 108, 62], [150, 140, 88], rnd())); g.fill(); g.restore();
        });
      }
    },
  });
  normalise(L0, sh(GRASS_MEAN, 0.92));
  const t1 = 1.6, ppm1 = N0 / (t1 * 1000);           // 1.28 px/mm
  const L1 = lawnTile(N0, ppm1, 202, {
    detail: false,
    layers: [
      { n: 9000, len: [10, 40], wid: [2.5, 5], flat: 0.25, dark: [34, 62, 22], light: [70, 104, 40], dim: 0 },
      { n: 9000, len: [10, 50], wid: [3, 5.5], flat: 0.3, dark: [46, 80, 30], light: [96, 134, 52], dim: 0.3 },
      { n: 7500, len: [12, 60], wid: [3, 6], flat: 0.35, dark: [60, 98, 36], light: [122, 160, 64], dim: 0.26 },
      { n: 5000, len: [14, 70], wid: [3.2, 6], flat: 0.45, dark: [80, 120, 44], light: [156, 188, 80], dim: 0.2 },
    ],
    extrasAt: 2,
    extras(g, rnd) {
      for (let i = 0; i < 7; i++) clover(g, N0, rnd() * N0, rnd() * N0, 0.9, rnd, ppm1);
      for (let i = 0; i < 4; i++) daisy(g, N0, rnd() * N0, rnd() * N0, 8 * ppm1, rnd);
    },
  });
  normalise(L1, sh(GRASS_MEAN, 0.95));
  const L2 = grainTile(N0, 10000 / N0, 303);
  normalise(L2, GRASS_MEAN);
  const L3 = mottleTile(N0, 64 / N0, 404);
  normalise(L3, GRASS_MEAN);
  LV = [
    { T: t0, mips: mips(L0), ox: -t0 / 2, oy: -t0 / 2 },
    { T: t1, mips: mips(L1), ox: 0.37, oy: -0.21 },
    { T: 10, mips: mips(L2), ox: 1.3, oy: 2.1 },
    { T: 64, mips: mips(L3), ox: -7, oy: 11 },
  ];
  return LV;
}

/** Draw one tiled level over the whole frame (pattern, wrap-safe), choosing the mip by the screen scale. */
function drawLevel(c, v, lv, alpha) {
  if (alpha <= 0.002) return;
  const N = lv.mips[0].width;
  let s = (lv.T / N) / v.cam.mpp;    // screen px per texel at mip 0
  let m = 0;
  while (s < 0.75 && m < lv.mips.length - 1) { s *= 2; m++; }
  const img = lv.mips[m], tsz = lv.T / v.cam.mpp;          // tile size on screen (px)
  let ex = W / 2 + (lv.ox - v.cam.x) / v.cam.mpp, ey = H / 2 + (lv.oy - v.cam.y) / v.cam.mpp;
  ex = ((ex % tsz) + tsz) % tsz - tsz; ey = ((ey % tsz) + tsz) % tsz - tsz;
  const pat = c.createPattern(img, 'repeat');
  pat.setTransform(new DOMMatrix([s, 0, 0, s, ex, ey]));
  c.save();
  c.globalAlpha *= alpha;
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  c.fillStyle = pat;
  c.fillRect(0, 0, W, H);
  c.restore();
}

export function warmGrass() { levels(); }

/** The whole lawn for the current camera. */
export function drawGrass(c, v) {
  const lf = v.cam.lf, lv = levels();
  c.fillStyle = L.rgba(GRASS_MEAN);
  c.fillRect(0, 0, W, H);
  // weights: each finer level fades in on top of the coarser one
  const w3 = lf > 1.3 ? 1 : 0;
  const w2 = 1 - L.smoothstep(L.clamp((lf - 1.45) / 0.3));
  const w1 = 1 - L.smoothstep(L.clamp((lf - 0.62) / 0.28));
  const w0 = 1 - L.smoothstep(L.clamp((lf + 0.18) / 0.3));
  if (w3 > 0) drawLevel(c, v, lv[3], w3);
  if (lf < 1.75 && lf > 0.5) drawLevel(c, v, lv[2], lf > 1.3 ? w2 : 1);
  if (lf < 0.9 && lf > -0.2) drawLevel(c, v, lv[1], lf > 0.5 ? w1 : 1);
  if (lf < 0.12) drawLevel(c, v, lv[0], lf > -0.2 ? w0 : 1);
}
