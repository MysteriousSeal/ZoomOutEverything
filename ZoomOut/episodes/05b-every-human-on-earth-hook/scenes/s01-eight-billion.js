// Beat 1 — "There are about eight billion of us."
// The hero's tile multiplies outward: a radial wave of 1 m tiles, each with one person, rings out from the origin
// while the camera pulls back (0.0045 → 0.9 m/px). Close to the hero the front is round; as it grows it squares up,
// so by the time it is kilometres wide it is the 90.5 km square that s02 reveals. The carpet runs off the screen
// and an odometer above rolls up to 8,200,000,000 (= (2·h)² tiles inside the front).
// LOD (px per metre s): s ≥ 50 detailed tiles + people · 10–50 batched tiles + dot people · < 10 a patterned carpet
// → flat crowd fill. Exports the shared crowd fill + counter so s02/s03 continue the exact same look.
import * as L from '../../../../engine/runtime/lib.js';
import { at as camAt } from '../camera.js';
import { CORAL, TILE, SHIRTS, HAIRS, hash2, drawPerson, drawTile } from './s00-hook.js';

const { W, H, ease, clamp, lerp, prog, rgba, mix } = L;

// ------------------------------------------------------------------ numbers
export const PEOPLE = 8.2e9;
export const HF = Math.sqrt(PEOPLE) / 2;   // 45,277 m: half-side of the 90.5 km square
export const CROWD1 = [206, 112, 98];      // crowd fill at 1 person / m² (map scale)
export const CROWD4 = [255, 142, 120];     // at 4 people / m² (brighter, denser)

// ------------------------------------------------------------------ the growing front (beat-relative time)
// The camera's beat-1 move only depends on beat-relative time, so evaluate it on a stand-in timeline
// (keeps h(t), birth times and cue times pure functions of t, usable in cues(d) too).
const FAKE_TL = { scenes: [{ start: -100, end: 0 }, { start: 0, end: 2.56 }, { start: 2.56, end: 100 }] };
const mpp1 = (t) => camAt(clamp(t, 0, 2.0), FAKE_TL).mpp;
const GROW_END = 2.0;           // the counter reaches 8.2 B (the drawn front keeps growing into beat 2)
export const FRONT_PX = 330;    // the drawn front stays on screen: half-width capped at this many pixels
const hA = (t) => lerp(0.5, Math.max(0.5, FRONT_PX * mpp1(t)), ease.outCubic(prog(t, 0.15, 0.45)));
const KB = Math.log(HF / hA(GROW_END));
/** "Virtual" half-width (m) behind the counter: reaches the full 90.5 km square at GROW_END. */
function hCount(t) {
  if (t <= 0.15) return 0.5;
  if (t >= GROW_END) return HF;
  return hA(t) * Math.exp(KB * ease.inCubic(prog(t, 1.0, GROW_END - 1.0)));
}
/** Half-width (m) of the drawn crowd front at beat-1 time t (kept on screen while the camera pulls back). */
export function hAt(t) {
  if (t <= 0.15) return 0.5;
  return Math.min(hCount(t), FRONT_PX * mpp1(t));
}
// beat 2: the front keeps growing with the pull-back (its on-screen size swells a little) until it is the full square
const FAKE_TL2 = { scenes: [{ start: -200, end: -100 }, { start: -100, end: 0 }, { start: 0, end: 5.85 }, { start: 5.85, end: 100 }] };
const capPx2 = (t) => FRONT_PX;   // never larger than FRONT_PX: the square stays clear of the counter above and the caption below
/** Half-width (m) of the drawn crowd front at beat-2 time t (HF once complete, at about t = 1.4). */
export function hAt2(t) {
  if (t >= 2.2) return HF;
  return Math.min(HF, Math.max(FRONT_PX * mpp1(GROW_END), capPx2(t) * camAt(Math.max(0, t), FAKE_TL2).mpp));
}
/** Beat-2 time when the front becomes the complete 90.5 km square. */
export const FULL2 = (() => { let t = 0; while (t < 2.2 && hAt2(t) < HF) t += 0.01; return t; })();
// birth time of a ring at norm n: invert h(t) on a fine table (built once, pure)
const TB = (() => {
  const out = [];
  for (let t = 0.15; t <= GROW_END + 1e-9; t += 0.004) out.push([t, hAt(t)]);
  return out;
})();
export function birthT(n) {
  if (n <= 0.5) return -1e9;
  let lo = 0, hi = TB.length - 1;
  if (n > TB[hi][1]) return 1e9;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (TB[m][1] >= n) hi = m; else lo = m; }
  const [t0, h0] = TB[lo], [t1, h1] = TB[hi];
  return lerp(t0, t1, clamp((n - h0) / Math.max(1e-9, h1 - h0)));
}
/** Front shape: a circle near the hero that squares up (superellipse exponent 2 → 60) by the kilometre. */
const shapeC = (r) => L.smoothstep(clamp((Math.log(Math.max(r, 1)) - Math.log(2)) / (Math.log(1500) - Math.log(2))));
const expo = (r) => 2 * Math.pow(30, shapeC(r));
const supN = (ax, ay, p) => { const m = Math.max(ax, ay) || 1e-9; return m * Math.pow(Math.pow(ax / m, p) + Math.pow(ay / m, p), 1 / p); };
export function normOf(x, y) {
  return supN(Math.abs(x), Math.abs(y), expo(Math.hypot(x, y)));
}
/** Head count inside the front at beat-1 time t (exact 8.2 B at the end). */
export function countAt(t) {
  if (t >= GROW_END) return PEOPLE;
  const h = hCount(t);
  if (h <= 0.5) return 1;
  const c = shapeC(h);
  return Math.max(1, Math.min(PEOPLE, 4 * h * h * lerp(Math.PI / 4, 1, c)));
}

// ------------------------------------------------------------------ shared crowd fill (also used by s02/s03)
let PAT = null;
let SPK = null;
function specklePattern(ctx) {
  if (SPK) return SPK;
  const N = 256, cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const c = cv.getContext('2d'), img = c.createImageData(N, N), r = L.rng(4242);
  for (let i = 0; i < N * N; i++) {
    const u = r();
    let col, al;
    if (u < 0.26) { col = [26, 12, 14]; al = 0.55; }
    else { const sh = SHIRTS[(r() * SHIRTS.length) | 0], hr = HAIRS[(r() * HAIRS.length) | 0]; col = mix(sh, hr, r() * 0.45); al = 0.5 + r() * 0.4; }
    img.data.set([col[0] | 0, col[1] | 0, col[2] | 0, (al * 255) | 0], i * 4);
  }
  c.putImageData(img, 0, 0);
  SPK = ctx.createPattern(cv, 'repeat');
  return SPK;
}
function tilePattern(ctx) {
  if (PAT) return PAT;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  c.fillStyle = rgba(TILE);
  L.roundRect(c, 2, 2, 60, 60, 3); c.fill();
  c.fillStyle = rgba(mix(SHIRTS[0], [255, 220, 200], 0.15));
  c.beginPath(); c.ellipse(32, 33, 14, 9, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = rgba(HAIRS[1]);
  c.beginPath(); c.arc(32, 31, 5.5, 0, Math.PI * 2); c.fill();
  PAT = ctx.createPattern(cv, 'repeat');
  return PAT;
}

/**
 * Fill a crowd region. path(ctx) builds the region in SCREEN space (already transformed).
 * o.density 1..4 · o.a alpha · o.lift 0..1 (raised: bigger soft shadow) · o.rim 0..1 · o.front 0..1 (growth glow)
 */
export function fillCrowd(ctx, v, path, o = {}) {
  const s = 1 / v.cam.mpp, a = o.a ?? 1;
  if (a <= 0.003) return;
  const dens = clamp(((o.density ?? 1) - 1) / 3);
  const far = mix(CROWD1, CROWD4, dens);
  // near the floor the carpet is literally tiles; zoomed out it blends to the aggregate crowd colour
  const avg = mix(TILE, SHIRTS[0], 0.32);
  const base = mix(avg, far, clamp(L.invLerp(Math.log(0.6), Math.log(25), Math.log(v.cam.mpp))));
  ctx.save();
  ctx.globalAlpha *= a;
  const lift = o.lift ?? 0;
  // drop shadow (bigger when lifted)
  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${0.45 + 0.2 * lift})`;
  ctx.shadowBlur = 18 + 50 * lift;
  ctx.shadowOffsetX = 4 + 18 * lift;
  ctx.shadowOffsetY = 8 + 30 * lift;
  path(ctx);
  ctx.fillStyle = rgba(base);
  ctx.fill();
  ctx.restore();
  // body: light falls from the top-left
  path(ctx);
  const g = ctx.createLinearGradient(0, 300, W, H - 200);
  g.addColorStop(0, rgba(mix(base, [255, 236, 222], 0.16)));
  g.addColorStop(0.5, rgba(base));
  g.addColorStop(1, rgba(mix(base, [40, 14, 18], 0.3)));
  ctx.fillStyle = g;
  ctx.fill();
  // per-person texture while a tile is still a few pixels wide
  const pk = clamp(L.invLerp(2.2, 6, s));
  if (pk > 0) {
    const pat = tilePattern(ctx);
    pat.setTransform(new DOMMatrix([s / 64, 0, 0, s / 64, v.wx(-0.5), v.wy(-0.5)]));
    ctx.save();
    ctx.globalAlpha *= pk;
    ctx.fillStyle = '#0d0909';
    ctx.fill();
    ctx.fillStyle = pat;
    ctx.fill();
    ctx.restore();
  }
  // the crowd itself: a speckle of people (1 cell = 1 person at close range), world-anchored and octave-blended
  // so it scales with the zoom without ever going below ~1 px
  const sk = 1 - pk;
  if (sk > 0) {
    const pat = specklePattern(ctx), q = Math.log2(v.cam.mpp), n0 = Math.max(0, Math.floor(q) + 1);
    const w0 = n0 === 0 ? 1 : clamp(n0 - q - 1);
    const str = sk * lerp(0.85, 0.5, clamp(L.invLerp(1, 40, v.cam.mpp)));
    ctx.save();
    for (const [n, w] of [[n0, w0], [n0 + 1, 1 - w0]]) {
      if (w <= 0.01) continue;
      const sc = Math.pow(2, n) / v.cam.mpp;
      pat.setTransform(new DOMMatrix([sc, 0, 0, sc, v.wx(0), v.wy(0)]));
      ctx.globalAlpha = a * str * w;
      ctx.fillStyle = pat;
      ctx.fill();
    }
    ctx.restore();
  }
  // inner shading: a soft inner shadow, the edge rolls off into the floor
  ctx.save();
  ctx.clip();
  path(ctx);
  ctx.shadowColor = `rgba(20,4,8,${0.6 * (1 - pk)})`;
  ctx.shadowBlur = 50;
  ctx.strokeStyle = `rgba(20,4,8,${0.5 * (1 - pk)})`;
  ctx.lineWidth = 16;
  ctx.stroke();
  ctx.restore();
  // rim: ONE crisp line along the edge, its glow a shadow of that same line (so the halo follows the same rounded
  // outline instead of a wide stroke's chamfered corners); the growth front just brightens it
  const rim = o.rim ?? 1, fr = o.front ?? 0;
  const gk = Math.max(rim, fr);
  if (gk > 0.01) {
    path(ctx);
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.shadowColor = rgba(CORAL, clamp(0.5 * rim + 0.7 * fr));
    ctx.shadowBlur = 12 + 14 * fr;
    ctx.strokeStyle = rgba(mix(CORAL, [255, 232, 222], 0.35 + 0.2 * fr), clamp(0.9 * rim + 0.7 * fr));
    ctx.lineWidth = 2 + fr;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/** Screen-space path of the growing front at half-width h. */
export function frontPath(v, h) {
  return (ctx) => {
    ctx.beginPath();
    if (shapeC(h) > 0.998) { ctx.rect(v.wx(-h), v.wy(-h), 2 * h / v.cam.mpp, 2 * h / v.cam.mpp); return; }
    const N = 160;
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2, ux = Math.cos(th), uy = Math.sin(th);
      let r = h;
      for (let k = 0; k < 6; k++) r = h / supN(Math.abs(ux), Math.abs(uy), expo(r));
      const x = v.wx(ux * r), y = v.wy(uy * r);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  };
}

// ------------------------------------------------------------------ per-tile carpet (close range)
const FLASH = 0.45;
function tiles(ctx, v, t, h, alpha) {
  const mpp = v.cam.mpp, s = 1 / mpp;
  const x0 = Math.max(-Math.ceil(h), Math.floor(v.cam.x - (W / 2 + 40) * mpp)), x1 = Math.min(Math.ceil(h), Math.ceil(v.cam.x + (W / 2 + 40) * mpp));
  const y0 = Math.max(-Math.ceil(h), Math.floor(v.cam.y - (H * 0.47 + 40) * mpp)), y1 = Math.min(Math.ceil(h), Math.ceil(v.cam.y + (H * 0.53 + 40) * mpp));
  const born = [];
  for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
    if (!i && !j) continue;   // the hero tile belongs to s00
    const n = normOf(i, j);
    if (n > h + 0.6) continue;
    const age = t - (birthT(n) + (hash2(i, j, 1) - 0.5) * 0.06);
    if (age <= 0) continue;
    born.push([i, j, age]);
  }
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (s >= 50) {
    for (const [i, j, age] of born) {
      const pop = ease.outBack(prog(age, 0, 0.38), 1.6), fl = Math.exp(-age / FLASH);
      drawTile(ctx, v, i, j, { scale: lerp(0.55, 1, pop), a: clamp(age * 6), rim: 0.85 * fl });
      const pa = prog(age, 0.07, 0.32);
      if (pa <= 0) continue;
      const hh = hash2(i, j, 2), jx = (hash2(i, j, 3) - 0.5) * 0.14, jy = (hash2(i, j, 4) - 0.5) * 0.14;
      const rot = (hh - 0.5) * 1.4 + 0.08 * L.noise1(v.gt * 0.4 + hh * 9, 5);
      drawPerson(ctx, v.wx(i + jx), v.wy(j + jy), s * lerp(0.7, 1, ease.outBack(pa, 1.8)), rot, {
        shirt: SHIRTS[(hh * 97 | 0) % SHIRTS.length], hair: HAIRS[(hh * 131 | 0) % HAIRS.length], a: clamp(pa * 2),
        breathe: Math.sin(v.gt * 1.7 + hh * 20), head: 0.3 * L.noise1(v.gt * 0.5 + hh * 13, 6),
      });
    }
  } else {
    // batched: one path per material
    const tw = 0.94, flashP = new Path2D(), tileP = new Path2D(), heads = new Path2D();
    const bodies = SHIRTS.map(() => new Path2D());
    for (const [i, j, age] of born) {
      const pop = lerp(0.55, 1, ease.outBack(prog(age, 0, 0.38), 1.6)), hw = (tw / 2) * pop;
      const px = v.wx(i - hw), py = v.wy(j - hw), pw = 2 * hw * s;
      tileP.rect(px, py, pw, pw);
      if (age < FLASH * 2.2) flashP.rect(px, py, pw, pw);
      const pa = prog(age, 0.07, 0.32);
      if (pa <= 0) continue;
      const hh = hash2(i, j, 2), sc = lerp(0.6, 1, ease.outBack(pa, 1.8)) * s;
      const cx = v.wx(i + (hash2(i, j, 3) - 0.5) * 0.14), cy = v.wy(j + (hash2(i, j, 4) - 0.5) * 0.14), rot = (hh - 0.5) * 1.4;
      // a person seen from straight above (same view as drawPerson's crowd): shoulders + head, centred on the tile
      const bp = bodies[(hh * 97 | 0) % SHIRTS.length];
      // shoulders as a rounded capsule (arms at its ends), the head a touch forward of the shoulder line
      const ux = Math.cos(rot), uy = Math.sin(rot), hl = 0.12 * sc, rr = 0.1 * sc;
      bp.moveTo(cx + ux * hl + Math.cos(rot - Math.PI / 2) * rr, cy + uy * hl + Math.sin(rot - Math.PI / 2) * rr);
      bp.arc(cx + ux * hl, cy + uy * hl, rr, rot - Math.PI / 2, rot + Math.PI / 2);
      bp.arc(cx - ux * hl, cy - uy * hl, rr, rot + Math.PI / 2, rot + Math.PI * 1.5);
      bp.closePath();
      const hx = cx - uy * 0.02 * sc, hy = cy + ux * 0.02 * sc;
      heads.moveTo(hx + 0.088 * sc, hy);
      heads.arc(hx, hy, 0.088 * sc, 0, Math.PI * 2);
    }
    ctx.fillStyle = rgba(TILE);
    ctx.fill(tileP);
    if (s > 16) { ctx.strokeStyle = rgba([150, 92, 84], 0.5); ctx.lineWidth = 1; ctx.stroke(tileP); }
    bodies.forEach((bp, k) => { ctx.fillStyle = rgba(SHIRTS[k]); ctx.fill(bp); });
    ctx.fillStyle = rgba(mix(HAIRS[1], HAIRS[2], 0.4));
    ctx.fill(heads);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(CORAL, 0.5);
    ctx.lineWidth = Math.max(1, s * 0.06);
    ctx.stroke(flashP);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ counter (odometer), shared with s02
export const COUNTER = { x: W / 2, y: 470, size: 120 };
const GREY = [205, 196, 192];   // the "≈" (same treatment as the finale's counter in s09)
/**
 * Rolling odometer "0,000,000,000" in the house big-number style. value: continuous count; k: visibility;
 * small: grey caption line; bump 0..1 landing pulse; rate: count change per video frame; valueQ: the count at the
 * frame's own time (digits spinning faster than ~half a step a frame show it whole and crisp: motion-blur sub-frames
 * never overprint different digits); approx 0..1: a grey "≈" slides in before the number (8.2 B is a rounded figure).
 * Each digit is clipped to its own cell (cap height), so a rolling digit never shows as a bar taller than the type.
 */
export function drawCounter(ctx, v, value, k, small, bump = 0, rate = 0, valueQ = value, approx = 0) {
  if (k <= 0) return;
  const { x, y } = COUNTER;
  const size = COUNTER.size * (1 + 0.05 * Math.sin(Math.PI * clamp(bump)));
  const e = ease.outCubic(clamp(k));
  ctx.save();
  // legibility backing over the carpet
  const g = ctx.createRadialGradient(x, y - 40, 30, x, y - 40, 520);
  g.addColorStop(0, `rgba(10,6,8,${0.42 * e})`);
  g.addColorStop(0.55, `rgba(10,6,8,${0.2 * e})`);
  g.addColorStop(1, 'rgba(10,6,8,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, y - 520, W, 940);
  ctx.globalAlpha *= clamp(k * 1.4);
  ctx.fillStyle = rgba(CORAL, 0.9);
  ctx.fillRect(x - 45 * e, y - COUNTER.size * 0.92 - 26, 90 * e, 4);
  ctx.font = L.font(size, 800, L.FONT.display);
  const dw = ctx.measureText('0').width, cw = ctx.measureText(',').width * 1.05;
  const N = 10, total = N * dw + 3 * cw;
  const lead = Math.floor(Math.max(1, value)).toString().length;
  // the "≈" + number are centred together as one unit
  ctx.font = L.font(Math.round(size * 0.6), 700, L.FONT.display);
  const aw = ctx.measureText('≈').width + 22, ak = ease.inOutCubic(clamp(approx));
  ctx.font = L.font(size, 800, L.FONT.display);
  let cx = x - total / 2 + (aw / 2) * ak;
  const dy = (1 - e) * 30, yb = y + dy;
  const capT = yb - size * 0.75, capB = yb + size * 0.04, pitch = size * 0.86;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 14;
  if (ak > 0) {
    ctx.save();
    ctx.globalAlpha *= ak;
    ctx.font = L.font(Math.round(size * 0.6), 700, L.FONT.display);
    ctx.textAlign = 'left';
    ctx.fillStyle = rgba(GREY, 0.9);
    ctx.fillText('≈', cx - aw - 6 * (1 - ak), yb - 16);
    ctx.restore();
  }
  for (let p = N - 1; p >= 0; p--) {
    const dim = p >= lead;
    const fast = !dim && rate / Math.pow(10, p) > 0.45;    // spinning: show the frame's own digit, whole
    const val = fast ? valueQ : value;
    const q = val / Math.pow(10, p), d = Math.floor(q) % 10;
    const lower = val - Math.floor(q) * Math.pow(10, p);
    const roll = fast ? 0 : p === 0 ? q - Math.floor(q) : clamp(lower - (Math.pow(10, p) - 1));
    ctx.save();
    ctx.beginPath(); ctx.rect(cx - 2, capT - 3, dw + 4, capB - capT + 6); ctx.clip();
    ctx.fillStyle = dim ? 'rgba(255,230,220,0.14)' : rgba(CORAL, fast ? 0.9 : 1);
    const yy = yb - roll * pitch;
    ctx.fillText(String(d), cx + dw / 2, yy);
    if (roll > 0.001) ctx.fillText(String((d + 1) % 10), cx + dw / 2, yy + pitch);
    ctx.restore();
    cx += dw;
    if (p % 3 === 0 && p > 0) {
      ctx.fillStyle = p >= lead ? 'rgba(255,230,220,0.14)' : rgba(CORAL);
      ctx.fillText(',', cx + cw / 2, yb);
      cx += cw;
    }
  }
  if (small) {
    ctx.shadowBlur = 8;
    ctx.font = L.font(30, 600, L.FONT.body);
    ctx.fillStyle = rgba([225, 212, 208], 0.95);
    L.trackedText(ctx, small.toUpperCase(), x, y + 56 + (1 - e) * 18, 3, 'center');
  }
  ctx.restore();
}

/**
 * A copy of the view whose camera is pulled toward the video frame's own time by `cap` (0..1): during the fast
 * pull-back it caps the motion blur on the carpet texture (no radial streaks), without changing where anything is.
 */
export function capView(v, cap) {
  if (cap <= 0) return v;
  const gq = lerp(v.gt, Math.round(v.gt * 30) / 30, cap);
  const cam = camAt(gq, v.tl);
  return {
    ...v, cam,
    wx: (x) => W / 2 + (x - cam.x) / cam.mpp,
    wy: (y) => H * (cam.anchor ?? 0.5) + (y - cam.y) / cam.mpp,
    ws: (m) => m / cam.mpp,
  };
}
/** How fast the camera zooms at gt (fraction of scale per frame), for blur capping. */
export function zoomRate(v) {
  const a = camAt(v.gt - 1 / 60, v.tl).mpp, b = camAt(v.gt + 1 / 60, v.tl).mpp;
  return Math.abs(Math.log(b / a));
}

export default {
  beat: 1,
  chapter: { num: '01', title: 'Eight billion', sub: 'Everyone alive today' },
  captions: true,
  layer: 1,
  cues(d) {
    const out = [];
    // a tick for each early ring, accelerating and rising, then a riser while the carpet runs off-screen
    [1, 2, 3, 4, 6, 8, 11, 15, 20, 27].forEach((n, i) => {
      const t = birthT(n);
      if (t > 0 && t < 1.25) out.push({ t, name: 'tick', gain: 0.16 + i * 0.012, pitch: 0.9 + i * 0.07 });
    });
    out.push({ t: 0.9, name: 'riser', gain: 0.26, pitch: 1.0 });
    out.push({ t: 0.25, name: 'count', gain: 0.2, pitch: 1.0 });
    out.push({ t: GROW_END, name: 'impact', gain: 0.4, pitch: 0.9 });
    out.push({ t: GROW_END + 0.05, name: 'shimmer', gain: 0.2, pitch: 1.1 });
    return out;
  },
  drawWorld(ctx, v) {
    if (v.t < 0.1 || v.gt >= v.tl.scenes[2].start) return;   // s02 takes the (finished) square over at its start
    v = capView(v, clamp(zoomRate(v) / 0.06) * 0.75);        // the fast pull-back: crisp carpet, no radial fur
    const t = v.t;
    const h = hAt(t), s = 1 / v.cam.mpp;
    // far: the carpet as one region (a growth glow rides its front while it is still on screen)
    const flatK = clamp(L.invLerp(12, 9, s));
    if (flatK > 0) {
      // the front keeps growing (and glowing) into beat 2, where s02 finishes the square
      fillCrowd(ctx, v, frontPath(v, h), { a: flatK, rim: 0, front: 1 });
    }
    if (s >= 9) tiles(ctx, v, t, h, clamp(L.invLerp(9, 12, s)));
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    if (t > v.d) return;   // s02 carries the counter on without a dip
    const k = ease.outCubic(prog(t, 0.25, 0.5));
    const bump = prog(t, GROW_END, 0.35);
    const tq = Math.round(v.gt * 30) / 30 - (v.gt - t);
    drawCounter(ctx, v, countAt(t), k, 'people alive today', bump, Math.abs(countAt(t + 1 / 30) - countAt(t)), countAt(tq), prog(t, GROW_END + 0.1, 0.45));
  },
};
