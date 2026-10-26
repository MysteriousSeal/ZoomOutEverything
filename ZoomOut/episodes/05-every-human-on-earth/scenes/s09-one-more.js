// Beat 9 — "But there's one more number."  (+ the shared engine of the abstract finale, beats 9–12)
//
// The world has veiled (env.veilK). The finale is ONE continuous particle system in screen space, so every beat
// morphs into the next instead of cutting:
//   b9   a coral block of 441 dots is born centre-screen: everyone alive today (8,200,000,000), seen up close
//   b10  the "camera" pulls back while a dim field of 6,120 dots ripples out around it: everyone who ever lived
//        (the field is 81 × 81 dots, the block 21 × 21: 441 / 6,561 ≈ 6.7 %, the true ratio); counter rolls to 117 B
//   b11  the field sorts itself into a 10 × 10 waffle; the coral dots fill the first seven cells: ≈ 7 %
//   b12  the seven coral cells pour into one bright figure ("one of us"); the 93 dim cells stream, strip by strip,
//        into 13 faint figures standing in a row behind it, one after another: 1 : 13. Quiet hold.
// Each scene file owns a time slice of drawFinale (exported here): beat i draws while gt ∈ (start_i, start_i+1],
// so exactly one overlay draws the system on any frame, independent of the per-scene overlay fade.
import * as L from '../../../../engine/runtime/lib.js';
import { veilK } from '../env.js';

const { W, H, ease, clamp, lerp, prog, rgba, mix } = L;

export const CORAL = [255, 130, 110];
const CORAL_HI = [255, 196, 178];
const CREAM = [240, 224, 214];
const GREY = [205, 196, 192];

// ------------------------------------------------------------------ layout (screen px, relative to the centre C)
export const C = { x: 540, y: 885 };
const N = 81, P = 8;                       // field: 81 × 81 dots, 8 px pitch (648 px square at zoom 1)
const B0 = 30, B1 = 50;                    // the coral block: grid indexes 30..50 (21 × 21 = 441 dots)
const CELL = 64, CELL_IN = 56, SLOT = 7;   // waffle: 10 × 10 cells, 64 px pitch, 8 × 8 dot slots at 7 px
export const LABEL_Y = 468;                // big label baseline (screen)
export const LABEL_SIZE = 112;
const COUNTER_SIZE = 102;                 // the 15-character counter runs a little smaller
// beat 12 figures (relative to C, at zoom 1)
export const HERO = { x: 0, base: 338, h: 350 };
export const GHOST = { base: -60, h: 98, pitch: 68, n: 13 };

/** Frac of x. */
const fr = (x) => x - Math.floor(x);
/** Integer hash → [0,1). */
function hash(i, s = 0) {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ------------------------------------------------------------------ the figure (a bust: head + rounded shoulders)
// normalised: height 1, base at w = 0, up is negative
const FIG = { headY: -0.74, headR: 0.155, w: 0.36, top: -0.52, rr: 0.3 };
function insideFig(u, w, m = 0) {
  if ((u * u + (w - FIG.headY) ** 2) <= (FIG.headR - m) ** 2) return true;
  const hw = FIG.w - m, top = FIG.top + m;
  if (Math.abs(u) > hw || w < top || w > -m) return false;
  if (w < top + FIG.rr && Math.abs(u) > hw - FIG.rr) return (Math.abs(u) - (hw - FIG.rr)) ** 2 + (w - (top + FIG.rr)) ** 2 <= FIG.rr * FIG.rr;
  return true;
}
/** n points evenly spread inside the figure (R2 low-discrepancy sequence), sorted top to bottom. */
function figPoints(n, seed) {
  const g = 1.32471795724474602596, a1 = 1 / g, a2 = 1 / (g * g);
  const pts = [];
  for (let k = 0; pts.length < n && k < n * 20; k++) {
    const u = -0.38 + 0.76 * fr(0.5 + a1 * (k + seed)), w = -0.9 + 0.9 * fr(0.5 + a2 * (k + seed));
    if (insideFig(u, w, 0.018)) pts.push([u, w]);
  }
  return pts.sort((a, b) => a[1] - b[1]);
}
/** Path of the figure at screen (x, base) with height h. */
export function figPath(ctx, x, base, h) {
  const w = FIG.w * h, top = base + FIG.top * h, rr = FIG.rr * h;
  ctx.beginPath();
  ctx.moveTo(x - w, base);
  ctx.lineTo(x - w, top + rr);
  ctx.arcTo(x - w, top, x - w + rr, top, rr);
  ctx.lineTo(x + w - rr, top);
  ctx.arcTo(x + w, top, x + w, top + rr, rr);
  ctx.lineTo(x + w, base);
  ctx.closePath();
  ctx.moveTo(x + FIG.headR * h, base + FIG.headY * h);
  ctx.arc(x, base + FIG.headY * h, Math.max(0, FIG.headR * h), 0, Math.PI * 2);
}

// ------------------------------------------------------------------ the dots (precomputed once, pure data)
const NT = N * N;
const gx = new Float32Array(NT), gy = new Float32Array(NT);        // field grid position (+ organic jitter)
const sx = new Float32Array(NT), sy = new Float32Array(NT);        // waffle slot (NaN = dust)
const tx = new Float32Array(NT), ty = new Float32Array(NT);        // beat-12 figure target
const coral = new Uint8Array(NT), grp = new Int8Array(NT);         // grp: ghost index, -1 = hero, -2 = dust
const rad = new Float32Array(NT), h1 = new Float32Array(NT), h2 = new Float32Array(NT), h3 = new Float32Array(NT);
const baseA = new Float32Array(NT), sdiag = new Float32Array(NT);
const cellDelay = new Float32Array(100);
export const CORAL_CELLS = 7;

(function build() {
  const half = (N - 1) / 2;
  const dim = [], cor = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i;
    h1[k] = hash(k, 1); h2[k] = hash(k, 2); h3[k] = hash(k, 3);
    const isC = i >= B0 && i <= B1 && j >= B0 && j <= B1;
    coral[k] = isC ? 1 : 0;
    const jit = isC ? 0 : 1.7;
    gx[k] = (i - half) * P + (h1[k] - 0.5) * 2 * jit;
    gy[k] = (j - half) * P + (h2[k] - 0.5) * 2 * jit;
    rad[k] = Math.hypot(i - half, j - half) / (half * Math.SQRT2);
    baseA[k] = isC ? 1 : 0.3 + 0.32 * h3[k] * h3[k];
    (isC ? cor : dim).push(k);
  }
  // waffle slots: cell (c, r), slot (a, b)
  const slotPos = (c, r, a, b) => [(c - 4.5) * CELL + (a - 3.5) * SLOT, (r - 4.5) * CELL + (b - 3.5) * SLOT];
  for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) cellDelay[r * 10 + c] = (c + r) / 18;
  // coral → the first 7 cells of the top row, as a 56 × 8 strip (column-major ↔ column-major: the square spreads)
  const cs = [];
  for (let c = 0; c < CORAL_CELLS; c++) for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) cs.push(slotPos(c, 0, a, b));
  cs.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  cor.sort((p, q) => gx[p] - gx[q] || gy[p] - gy[q]);
  cor.forEach((k, n) => { sx[k] = cs[n][0]; sy[k] = cs[n][1]; });
  // dim → the other 93 cells in reading order; 168 evenly scattered dots become dust that falls away
  const ds = [];
  for (let r = 0; r < 10; r++) for (let b = 0; b < 8; b++) for (let c = 0; c < 10; c++) {
    if (r === 0 && c < CORAL_CELLS) continue;
    for (let a = 0; a < 8; a++) ds.push(slotPos(c, r, a, b));
  }
  const nDust = dim.length - ds.length;
  const byHash = dim.slice().sort((p, q) => h3[p] * 7.13 % 1 - h3[q] * 7.13 % 1);
  const dust = new Set(byHash.slice(0, nDust));
  const keep = dim.filter((k) => !dust.has(k));
  keep.sort((p, q) => gy[p] - gy[q] || gx[p] - gx[q]);
  keep.forEach((k, n) => { sx[k] = ds[n][0]; sy[k] = ds[n][1]; });
  for (const k of dust) { sx[k] = NaN; sy[k] = NaN; grp[k] = -2; }
  for (let k = 0; k < NT; k++) if (!Number.isNaN(sx[k])) sdiag[k] = ((sx[k] + sy[k]) / CELL + 9) / 18;

  // beat 12: coral → the hero figure (sorted by height ↔ height)
  const hp = figPoints(cor.length, 3);
  const corY = cor.slice().sort((p, q) => sy[p] - sy[q] || sx[p] - sx[q]);
  corY.forEach((k, n) => { grp[k] = -1; tx[k] = HERO.x + hp[n][0] * HERO.h; ty[k] = HERO.base + hp[n][1] * HERO.h; });
  // dim → 13 ghosts: vertical strips of the waffle, left to right; inside a strip, top ↔ top
  const byX = keep.slice().sort((p, q) => sx[p] - sx[q] || sy[p] - sy[q]);
  const G = GHOST.n;
  for (let g = 0; g < G; g++) {
    const part = byX.slice(Math.round(g * byX.length / G), Math.round((g + 1) * byX.length / G));
    part.sort((p, q) => sy[p] - sy[q]);
    const pts = figPoints(part.length, 11 + g * 97);
    const x0 = (g - (G - 1) / 2) * GHOST.pitch;
    part.forEach((k, n) => { grp[k] = g; tx[k] = x0 + pts[n][0] * GHOST.h; ty[k] = GHOST.base + pts[n][1] * GHOST.h; });
  }
})();

// ------------------------------------------------------------------ timing (global seconds, from the timeline)
export function times(tl) {
  const s = tl.scenes;
  return { s9: s[9].start, s10: s[10].start, s11: s[11].start, s12: s[12].start, end: s[12].end };
}
/** Ghost g: when its dots start streaming, and when it has landed. */
export const ghostStart = (T, g) => T.s12 + 1.9 + g * 0.14;
export const ghostLand = (T, g) => ghostStart(T, g) + 0.95;
/** "… thirteen" (seconds into beat 12): when the " : 13" of the label lands. */
export const T13 = 2.2;

/** The finale's screen zoom (about C): close on the block in b9, pull back over b10, slow pushes after. */
function zoomAt(gt, T) {
  const z1 = lerp(1.7, 1.86, ease.inOutCubic(prog(gt, T.s9, 2.6)));
  let z = lerp(z1, 1.0, ease.inOutCubic(prog(gt, T.s10 + 0.2, 3.3)));
  z *= 1 + 0.02 * ease.inOutCubic(prog(gt, T.s10 + 3.5, T.s12 - T.s10 - 3.5));
  z *= 1 + 0.045 * ease.inOutCubic(prog(gt, T.s12 + 0.3, T.end - T.s12));
  return z;
}

// ------------------------------------------------------------------ dot passes (bucketed by alpha)
const NB = 14;
const bx = new Float32Array(NT), by = new Float32Array(NT), ba = new Float32Array(NT);
const order = new Int32Array(NT), counts = new Int32Array(NB + 1);
function drawDots(ctx, n, col, size, round) {
  counts.fill(0);
  for (let i = 0; i < n; i++) counts[Math.min(NB, Math.round(clamp(ba[i]) * NB))]++;
  const starts = new Int32Array(NB + 2);
  for (let b = 0; b <= NB; b++) starts[b + 1] = starts[b] + counts[b];
  const fill = starts.slice();
  for (let i = 0; i < n; i++) order[fill[Math.min(NB, Math.round(clamp(ba[i]) * NB))]++] = i;
  const s = size, hs = s / 2, r = Math.max(0, hs);
  for (let b = 1; b <= NB; b++) {
    if (starts[b + 1] === starts[b]) continue;
    ctx.fillStyle = rgba(col, b / NB);
    ctx.beginPath();
    for (let q = starts[b]; q < starts[b + 1]; q++) {
      const i = order[q];
      if (round) { ctx.moveTo(bx[i] + r, by[i]); ctx.arc(bx[i], by[i], r, 0, Math.PI * 2); } else ctx.rect(bx[i] - hs, by[i] - hs, s, s);
    }
    ctx.fill();
  }
}

// ------------------------------------------------------------------ ambient depth (far motes + near bokeh)
function drawAmbient(ctx, gt, T, z, cx, cy, a) {
  if (a <= 0) return;
  ctx.save();
  // far: tiny motes rising slowly (weak parallax)
  const zf = 1 + (z - 1) * 0.35;
  ctx.fillStyle = rgba(CREAM, 1);
  for (let i = 0; i < 70; i++) {
    const sp = 6 + 14 * hash(i, 21);
    const x0 = hash(i, 22) * W, y0 = fr(hash(i, 23) - (gt - T.s9) * sp / H) * (H + 80) - 40;
    const x = cx + (x0 + Math.sin(gt * 0.3 + i) * 6 - cx) * zf, y = cy + (y0 - cy) * zf;
    ctx.globalAlpha = a * (0.05 + 0.13 * hash(i, 24)) * (0.7 + 0.3 * Math.sin(gt * 1.3 + i * 2.1));
    const s = 1 + 1.4 * hash(i, 25);
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
  }
  ctx.restore();
  // near: a few big soft bokeh discs, strong parallax
  const zn = 1 + (z - 1) * 1.4;
  for (let i = 0; i < 7; i++) {
    const x0 = hash(i, 31) * W + Math.sin(gt * 0.11 + i) * 40, y0 = 300 + hash(i, 32) * 1300 - (gt - T.s9) * (10 + 8 * hash(i, 34));
    const x = cx + (x0 - cx) * zn, y = cy + (y0 - cy) * zn;
    L.lightBlob(ctx, x, y, (70 + 90 * hash(i, 33)) * zn, i % 3 ? CREAM : CORAL, a * 0.045);
  }
}

// ------------------------------------------------------------------ labels
/** House "big number" style, centred, with a slide/fade. */
export function bigText(ctx, str, x, y, col, a, dy = 0, size = LABEL_SIZE) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= clamp(a);
  ctx.textBaseline = 'alphabetic';
  ctx.font = L.font(size, 800, L.FONT.display);
  ctx.fillStyle = rgba(col);
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 18;
  L.trackedText(ctx, str, x, y + dy, -1, 'center');
  ctx.restore();
}
export function smallText(ctx, str, x, y, a, dy = 0) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= clamp(a);
  ctx.textBaseline = 'alphabetic';
  ctx.font = L.font(30, 600, L.FONT.body);
  ctx.fillStyle = rgba(GREY, 0.95);
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 8;
  L.trackedText(ctx, str.toUpperCase(), x, y + dy, 3, 'center');
  ctx.restore();
}
/** In/out envelope: eased entrance (slide up from below) and faster exit (slide up and away). */
function env2(gt, tIn, dIn, tOut, dOut) {
  const i = ease.outCubic(prog(gt, tIn, dIn)), o = ease.inCubic(prog(gt, tOut, dOut));
  return { a: i * (1 - o), dy: (1 - i) * 26 - o * 22 };
}

function drawLabels(ctx, gt, T, accent) {
  const x = W / 2, y = LABEL_Y;
  // dark backing so the label always reads over the field
  ctx.save();
  const g = ctx.createLinearGradient(0, 300, 0, 560);
  g.addColorStop(0, 'rgba(8,5,7,0)');
  g.addColorStop(0.3, 'rgba(8,5,7,0.72)');
  g.addColorStop(0.75, 'rgba(8,5,7,0.72)');
  g.addColorStop(1, 'rgba(8,5,7,0)');
  ctx.fillStyle = g;
  ctx.globalAlpha = ease.outCubic(prog(gt, T.s10, 0.6)) * (1 - ease.inCubic(prog(gt, T.s11 + 1.0, 0.8)));
  ctx.fillRect(0, 300, W, 260);
  ctx.restore();

  // the rule line, wiping in with the first label and staying for the whole finale
  const rk = ease.outCubic(prog(gt, T.s9 + 0.55, 0.6));
  if (rk > 0) {
    ctx.fillStyle = rgba(accent, 0.9);
    ctx.fillRect(x - 45 * rk, y - LABEL_SIZE * 0.92 - 26, 90 * rk, 4);
  }

  // b9–b10: the counter (coral "alive today" → rolls to 117 billion, cooling to cream)
  const c = env2(gt, T.s9 + 0.6, 0.6, T.s11 + 1.65, 0.32);
  if (c.a > 0) {
    const r = ease.inOutCubic(prog(gt, T.s10 + 0.35, 2.4));
    const val = Math.round(lerp(8.2e9, 117e9, r) / 1e6) * 1e6;
    const col = mix(accent, CREAM, ease.inOutCubic(prog(gt, T.s10 + 0.4, 1.2)));
    const land = prog(gt, T.s10 + 2.75, 0.5);
    const pulse = land > 0 && land < 1 ? Math.sin(land * Math.PI) * 0.035 : 0;
    ctx.save();
    ctx.translate(x, y); ctx.scale(1 + pulse, 1 + pulse); ctx.translate(-x, -y);
    const str = L.fmt(val);
    bigText(ctx, str, x, y, col, c.a, c.dy, COUNTER_SIZE);
    // "≈" settles in to the left once the number lands
    const ak = ease.outCubic(prog(gt, T.s10 + 2.65, 0.5));
    if (ak > 0) {
      ctx.font = L.font(COUNTER_SIZE, 800, L.FONT.display);
      const w = ctx.measureText(str).width;
      ctx.save();
      ctx.globalAlpha *= c.a * ak;
      ctx.font = L.font(72, 700, L.FONT.display);
      ctx.fillStyle = rgba(GREY, 0.9);
      ctx.textAlign = 'right';
      ctx.fillText('≈', x - w / 2 - 14 - (1 - ak) * 12, y + c.dy - 14);
      ctx.restore();
    }
    ctx.restore();
  }
  // small lines
  const s1 = env2(gt, T.s9 + 0.75, 0.55, T.s10 + 0.3, 0.3);
  smallText(ctx, 'alive today', x, y + 52, s1.a, s1.dy * 0.6);
  const s2 = env2(gt, T.s10 + 0.62, 0.55, T.s11 + 1.65, 0.3);
  smallText(ctx, 'humans who have ever lived', x, y + 52, s2.a, s2.dy * 0.6);

  // b11: ≈ 7 %
  const p = env2(gt, T.s11 + 1.95, 0.55, T.s12 + 0.05, 0.3);
  if (p.a > 0) {
    bigText(ctx, '≈ 7%', x, y, accent, p.a, p.dy);
    smallText(ctx, 'of them are alive today', x, y + 52, env2(gt, T.s11 + 2.1, 0.55, T.s12 + 0.05, 0.3).a, p.dy * 0.6);
  }

  // b12: "1" on "one of us", then " : 13" lands on "thirteen" while the figures stream in
  const one = env2(gt, T.s12 + 0.45, 0.55, 1e9, 1);
  if (one.a > 0) {
    ctx.save();
    ctx.font = L.font(LABEL_SIZE, 800, L.FONT.display);
    const w1 = ctx.measureText('1').width, wc = ctx.measureText(' : ').width, wn = ctx.measureText('13').width;
    const rk2 = ease.inOutCubic(prog(gt, T.s12 + T13, 0.55));
    const x0 = x - lerp(w1, w1 + wc + wn, rk2) / 2;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 18;
    ctx.globalAlpha = one.a;
    ctx.fillStyle = rgba(accent);
    ctx.fillText('1', x0, y + one.dy);
    if (rk2 > 0) {
      const ek = ease.outCubic(prog(gt, T.s12 + T13 + 0.1, 0.5));
      ctx.globalAlpha = one.a * ek;
      ctx.fillStyle = rgba(GREY, 0.85);
      ctx.fillText(' : ', x0 + w1, y + one.dy);
      ctx.fillStyle = rgba(CREAM);
      ctx.fillText('13', x0 + w1 + wc, y + one.dy + (1 - ek) * 24);
    }
    ctx.restore();
    smallText(ctx, 'for every one of us', x, y + 52, env2(gt, T.s12 + 0.6, 0.55, 1e9, 1).a);
  }
}

// ------------------------------------------------------------------ the whole finale at global time gt
export function drawFinale(ctx, v) {
  const gt = v.gt, T = times(v.tl), accent = v.accent;
  const vk = veilK(v);
  if (vk <= 0) return;
  // deepen env's veil (0.94) so nothing of the physical world ghosts through the abstract finale
  ctx.fillStyle = `rgba(8,5,7,${0.8 * vk})`;
  ctx.fillRect(0, 0, W, H);
  const z = zoomAt(gt, T);
  const cx = C.x + 3 * Math.sin(gt * 0.41), cy = C.y + 3 * Math.cos(gt * 0.33);
  drawAmbient(ctx, gt, T, z, cx, cy, vk);

  // ---------- phases
  const gather0 = T.s11 + 0.15;                 // b11: dots fly to their waffle slots
  const cellK = (ci) => ease.outCubic(prog(gt, T.s11 + 1.1 + cellDelay[ci] * 0.45, 0.6)) * (1 - ease.inCubic(prog(gt, T.s12 + 0.05, 0.55)));
  const loose = ease.inOutCubic(prog(gt, T.s12, 1.2));   // b12: the waffle loosens into a cloud

  // ---------- waffle cells (under the dots)
  if (gt > T.s11 + 1.0 && gt < T.s12 + 0.7) {
    ctx.save();
    for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
      const ci = r * 10 + c, k = cellK(ci);
      if (k <= 0) continue;
      const isC = r === 0 && c < CORAL_CELLS;
      const x = cx + ((c - 4.5) * CELL - CELL_IN / 2) * z, y = cy + ((r - 4.5) * CELL - CELL_IN / 2) * z, s = CELL_IN * z;
      L.roundRect(ctx, x, y, s, s, 7 * z);
      if (isC) {
        // "seven percent" lands: a light sweep runs along the seven coral cells
        const sw = prog(gt, T.s11 + 1.95 + c * 0.06, 0.5);
        const hot = sw > 0 && sw < 1 ? Math.sin(sw * Math.PI) : 0;
        ctx.fillStyle = rgba(mix(accent, CORAL_HI, hot * 0.6), (0.5 + 0.3 * hot) * k);
        ctx.fill();
        ctx.strokeStyle = rgba(CORAL_HI, 0.55 * k);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = rgba(CREAM, 0.09 * k);
        ctx.fill();
        ctx.strokeStyle = rgba(CREAM, 0.16 * k);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    ctx.restore();
    // glow behind the coral row
    const ck = cellK(0);
    if (ck > 0) {
      const sw = prog(gt, T.s11 + 1.95, 0.9);
      L.lightBlob(ctx, cx + (-4.5 + 3) * CELL * z, cy - 4.5 * CELL * z, 330 * z, accent, (0.14 + 0.16 * Math.sin(Math.PI * sw)) * ck);
    }
  }

  // ---------- block underlay + glow (b9–b10), fading as the block dissolves into the waffle
  const blockK = ease.outCubic(prog(gt, T.s9 + 0.15, 0.9)) * (1 - ease.inCubic(prog(gt, gather0 + 0.1, 0.4)));
  const bs = (B1 - B0 + 1) * P * z;
  if (blockK > 0) {
    const pop = ease.outBack(prog(gt, T.s9 + 0.15, 0.8), 1.4);
    const s = bs * lerp(0.6, 1, pop) + 6 * z;
    L.lightBlob(ctx, cx, cy, s * 1.6, accent, 0.32 * blockK * (0.92 + 0.08 * Math.sin(gt * 1.7)));
    ctx.save();
    ctx.globalAlpha = blockK;
    L.roundRect(ctx, cx - s / 2, cy - s / 2, s, s, 4 * z);
    const g = ctx.createLinearGradient(cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2);
    g.addColorStop(0, rgba(CORAL_HI, 0.42));
    g.addColorStop(1, rgba(accent, 0.22));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = rgba(CORAL_HI, 0.6);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // ---------- hero figure fill (b12), under its dots
  const heroK = ease.outCubic(prog(gt, T.s12 + 0.95, 0.7));
  const hx = cx + HERO.x * z, hb = cy + HERO.base * z, hh = HERO.h * z;
  if (heroK > 0) {
    const br = 0.93 + 0.07 * Math.sin((gt - T.s12) * 1.4);
    // floor pool + glow
    ctx.save();
    ctx.globalAlpha = heroK;
    const fg = ctx.createRadialGradient(hx, hb, 0, hx, hb, hh * 0.75);
    fg.addColorStop(0, rgba(accent, 0.26));
    fg.addColorStop(1, rgba(accent, 0));
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.ellipse(hx, hb, hh * 0.75, hh * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    L.lightBlob(ctx, hx, hb - hh * 0.5, hh * 1.25, accent, 0.26 * heroK * br);
    ctx.save();
    ctx.globalAlpha = heroK;
    figPath(ctx, hx, hb, hh);
    const g = ctx.createLinearGradient(0, hb - hh, 0, hb);
    g.addColorStop(0, rgba(CORAL_HI, 0.95));
    g.addColorStop(0.55, rgba(accent, 0.9));
    g.addColorStop(1, rgba(mix(accent, [60, 20, 24], 0.5), 0.7));
    ctx.fillStyle = g;
    ctx.shadowColor = rgba(accent, 0.7);
    ctx.shadowBlur = 30 * br;
    ctx.fill();
    ctx.restore();
    // rim light on the head and shoulders (top-left key)
    ctx.save();
    ctx.globalAlpha = heroK * 0.55;
    ctx.strokeStyle = rgba([255, 230, 220], 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hx, hb + FIG.headY * hh, Math.max(0, FIG.headR * hh - 1), Math.PI * 1.05, Math.PI * 1.6);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- ghost figure bodies (b12), under their dots
  for (let g = 0; g < GHOST.n; g++) {
    const land = ghostLand(T, g);
    const k = ease.outCubic(prog(gt, land - 0.35, 0.5));
    if (k <= 0) continue;
    const since = gt - land;
    const flash = since > 0 ? Math.exp(-since * 2.2) : clamp(1 + since / 0.35);
    const breathe = 0.85 + 0.15 * Math.sin(gt * 1.1 + g * 1.7);
    const gxs = cx + (g - (GHOST.n - 1) / 2) * GHOST.pitch * z, gbs = cy + GHOST.base * z, gh = GHOST.h * z;
    if (flash > 0.02) L.lightBlob(ctx, gxs, gbs - gh * 0.5, gh * 0.9, CREAM, 0.16 * flash * k);
    ctx.save();
    figPath(ctx, gxs, gbs, gh);
    const fill = ctx.createLinearGradient(0, gbs - gh, 0, gbs);
    fill.addColorStop(0, rgba(CREAM, (0.13 + 0.22 * flash) * k * breathe));
    fill.addColorStop(1, rgba(CREAM, (0.03 + 0.1 * flash) * k * breathe));
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }
  // the ghosts' ground line
  const gl = ease.outCubic(prog(gt, ghostStart(T, 0), 1.6));
  if (gl > 0) {
    const y = cy + GHOST.base * z + 2, hw = (GHOST.n * GHOST.pitch * 0.5 + 20) * z * gl;
    const lg = ctx.createLinearGradient(cx - hw, 0, cx + hw, 0);
    lg.addColorStop(0, rgba(CREAM, 0));
    lg.addColorStop(0.5, rgba(CREAM, 0.22));
    lg.addColorStop(1, rgba(CREAM, 0));
    ctx.fillStyle = lg;
    ctx.fillRect(cx - hw, y, hw * 2, 1.5);
  }

  // ---------- the dots
  let nd = 0, nc = 0;
  const tB = T.s10 + 0.15;
  for (let k = 0; k < NT; k++) {
    let x = gx[k], y = gy[k], a;
    const isC = coral[k] === 1;
    // birth
    if (isC) {
      const bt = T.s9 + 0.15 + 0.55 * rad[k] / 0.35 + 0.1 * h1[k];
      const e = prog(gt, bt, 0.35);
      if (e <= 0) continue;
      a = ease.outCubic(e) * (0.85 + 0.15 * Math.sin(gt * 2 + h2[k] * 6.28));
    } else {
      const bt = tB + 2.1 * rad[k] + 0.35 * h1[k];
      const e = prog(gt, bt, 0.55);
      if (e <= 0) continue;
      const since = gt - bt;
      a = baseA[k] * ease.outCubic(e) * (0.8 + 0.2 * Math.sin(gt * (0.8 + h2[k]) + h3[k] * 40)) + 0.45 * Math.exp(-since * 4) * e;
    }
    // b11: gather into the waffle
    if (Number.isNaN(sx[k])) {
      const f = prog(gt, gather0, 0.9);
      if (f > 0) {
        const e = ease.inCubic(f);
        x *= 1 + 0.25 * e; y *= 1 + 0.25 * e; y += 30 * e;
        a *= 1 - e;
        if (a <= 0.003) continue;
      }
    } else {
      const dl = isC ? gather0 + 0.25 + 0.15 * h1[k] : gather0 + 0.6 * sdiag[k] + 0.15 * h1[k];
      const e = ease.inOutCubic(prog(gt, dl, isC ? 1.05 : 0.9));
      if (e > 0) {
        const dx = sx[k] - x, dy = sy[k] - y, bend = (h2[k] - 0.5) * (isC ? 34 : 36) * Math.sin(Math.PI * e);
        const len = Math.hypot(dx, dy) || 1;
        x += dx * e - dy / len * bend; y += dy * e + dx / len * bend;
        if (!isC) a = lerp(a, 0.4 + 0.25 * h3[k], e);
      }
      // b12: loosen, then stream into a figure
      if (loose > 0) {
        const amp = 7 * loose;
        x += Math.sin(gt * 1.3 + h1[k] * 40) * amp; y += Math.cos(gt * 1.1 + h2[k] * 40) * amp - 6 * loose;
        if (!isC) a *= 1 - 0.5 * loose;
      }
      const g = grp[k];
      const st = g === -1 ? T.s12 + 0.15 + 0.4 * h1[k] : ghostStart(T, g) + 0.25 * h1[k];
      const f = prog(gt, st, g === -1 ? 0.9 : 0.7);
      if (f > 0) {
        const e = ease.inOutCubic(f);
        const dx = tx[k] - x, dy = ty[k] - y, bend = (h3[k] - 0.5) * (g === -1 ? 90 : 60) * Math.sin(Math.PI * e);
        const len = Math.hypot(dx, dy) || 1;
        x += dx * e - dy / len * bend; y += dy * e + dx / len * bend;
        if (g >= 0) {
          const since = gt - ghostLand(T, g);
          const flash = since > 0 ? Math.exp(-since * 2.2) : 0;
          a = lerp(a, (0.42 + 0.25 * h2[k]) * (0.85 + 0.15 * Math.sin(gt * 1.1 + g * 1.7)) + 0.4 * flash, e);
        } else a = lerp(a, 0.55 + 0.35 * h2[k] * (0.6 + 0.4 * Math.sin(gt * 2.3 + h1[k] * 30)), e);
      }
    }
    if (isC) { bx[NT - 1 - nc] = cx + x * z; by[NT - 1 - nc] = cy + y * z; ba[NT - 1 - nc] = a; nc++; } else { bx[nd] = cx + x * z; by[nd] = cy + y * z; ba[nd] = a; nd++; }
  }
  // the coral swarm keeps its light while it travels, so "us" stays the focal point
  if (nc > 0) {
    let mx = 0, my = 0;
    for (let i = 0; i < nc; i++) { mx += bx[NT - 1 - i]; my += by[NT - 1 - i]; }
    mx /= nc; my /= nc;
    const fly = Math.sin(Math.PI * prog(gt, gather0 + 0.2, 1.3)) + Math.sin(Math.PI * prog(gt, T.s12 + 0.1, 1.3));
    if (fly > 0.01) L.lightBlob(ctx, mx, my, 200 * z, accent, 0.3 * fly);
  }
  // dim dots
  ctx.save();
  const ds = Math.max(1.4, 2.3 * z * lerp(1, 0.8, ease.inOutCubic(prog(gt, T.s12 + 1.9, 1.5))));
  drawDots(ctx, nd, CREAM, ds, false);
  // coral dots (moved to the front of the buffers)
  for (let i = 0; i < nc; i++) { bx[i] = bx[NT - 1 - i]; by[i] = by[NT - 1 - i]; ba[i] = ba[NT - 1 - i]; }
  const fly = Math.sin(Math.PI * prog(gt, gather0 + 0.2, 1.3)) + Math.sin(Math.PI * prog(gt, T.s12 + 0.1, 1.3));
  const csz = lerp(3.3 * z, 2.6 * z, ease.inOutCubic(prog(gt, T.s11, 1.5))) * (1 + 0.45 * fly);
  ctx.globalCompositeOperation = 'lighter';
  drawDots(ctx, nc, CORAL_HI, csz, true);
  ctx.restore();

  drawLabels(ctx, gt, T, accent);
}

/** Owner of the finale on a given frame: beat i draws while gt ∈ (start_i, start_i+1]. */
export function owns(v, beat) {
  const s = v.tl.scenes;
  const a = beat === 9 ? -Infinity : s[beat].start;
  const b = beat === s.length - 1 ? Infinity : s[beat + 1].start;
  return v.gt > a && v.gt <= b;
}

export default {
  beat: 9,
  chapter: { num: '09', title: 'One more number', sub: 'Not space this time: time' },
  captions: true,
  layer: 0,
  cues(d) {
    return [
      { t: 0.05, name: 'swell', gain: 0.22, pitch: 0.7 },     // the world veils
      { t: 0.3, name: 'bloom', gain: 0.38, pitch: 0.85 },     // the coral block is born
      { t: 0.65, name: 'tick', gain: 0.22, pitch: 1.2 },      // its label
    ].filter((c) => c.t < d);
  },
  drawOverlay(ctx, v) {
    if (owns(v, 9)) drawFinale(ctx, v);
  },
};
