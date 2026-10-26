// Beat 6 — "Most of Florida | would be underwater."
// The camera climbs out of New York and glides south to Florida, face-on. env already floods the land honestly (mint
// shallows at +70 m). This scene adds what was lost: TODAY's coastline, traced once from the real elevation data
// (a 0-m contour by marching squares), drawn on as a dashed white ghost over the new sea; then pins for Miami and
// Orlando pulse in on "would be underwater". A single label sits in the dark Gulf.
//
// Also exports the shared story-layer helpers used by s07 (Venice, Amsterdam): contour(), drawGhost(), drawPin(),
// callout(), placeAt().
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, PLACES, elevation, shotStart, viewOf, worldOf } from '../env.js';

const { W, H } = L;

// ================================================================== shared helpers
/**
 * Today's coastline (elevation 0 contour) inside a lat/lon box, from the real data, as polylines of [lat, lon].
 * Computed once at import (marching squares on a `step`° grid, chained into continuous lines).
 */
export function contour({ lat0, lat1, lon0, lon1, step = 0.1, minPts = 4, level = 0, smooth = 0 }) {
  const ni = Math.round((lat1 - lat0) / step), nj = Math.round((lon1 - lon0) / step);
  const lat = (i) => lat1 - i * step, lon = (j) => lon0 + j * step;
  // optional box smoothing (radius `smooth`°, 5x5 taps) for noisy low coasts; field is elevation minus `level`
  const sample = (la, lo) => {
    if (!smooth) return elevation(la, lo);
    let s = 0;
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) s += elevation(la + a * smooth / 2, lo + b * smooth / 2);
    return s / 25;
  };
  const f = [];
  for (let i = 0; i <= ni; i++) {
    const row = new Float32Array(nj + 1);
    for (let j = 0; j <= nj; j++) { const e = sample(lat(i), lon(j)) - level; row[j] = e === 0 ? -0.01 : e; }
    f.push(row);
  }
  const pt = new Map();
  const edge = (type, i, j) => {
    const key = `${type}${i},${j}`;
    if (!pt.has(key)) {
      if (type === 'h') { const a = f[i][j], b = f[i][j + 1], t = a / (a - b); pt.set(key, [lat(i), lon(j) + t * step]); }
      else { const a = f[i][j], b = f[i + 1][j], t = a / (a - b); pt.set(key, [lat(i) - t * step, lon(j)]); }
    }
    return key;
  };
  const segs = [];
  for (let i = 0; i < ni; i++) {
    for (let j = 0; j < nj; j++) {
      const a = f[i][j] > 0, b = f[i][j + 1] > 0, c = f[i + 1][j + 1] > 0, d = f[i + 1][j] > 0;
      const idx = (a ? 8 : 0) | (b ? 4 : 0) | (c ? 2 : 0) | (d ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const T = () => edge('h', i, j), R = () => edge('v', i, j + 1), B = () => edge('h', i + 1, j), Lf = () => edge('v', i, j);
      switch (idx) {
        case 1: case 14: segs.push([Lf(), B()]); break;
        case 2: case 13: segs.push([B(), R()]); break;
        case 3: case 12: segs.push([Lf(), R()]); break;
        case 4: case 11: segs.push([T(), R()]); break;
        case 6: case 9: segs.push([T(), B()]); break;
        case 7: case 8: segs.push([Lf(), T()]); break;
        case 5: segs.push([Lf(), T()], [B(), R()]); break;
        case 10: segs.push([T(), R()], [Lf(), B()]); break;
        default: break;
      }
    }
  }
  // chain segments that share an edge point
  const adj = new Map();
  segs.forEach(([p, q], s) => { for (const k of [p, q]) { if (!adj.has(k)) adj.set(k, []); adj.get(k).push(s); } });
  const used = new Uint8Array(segs.length);
  const lines = [];
  const walk = (start, s0) => {
    const out = [start];
    let cur = start, s = s0;
    while (s != null && !used[s]) {
      used[s] = 1;
      const [p, q] = segs[s];
      cur = p === cur ? q : p;
      out.push(cur);
      s = (adj.get(cur) || []).find((n) => !used[n]);
    }
    return out;
  };
  for (let s = 0; s < segs.length; s++) {
    if (used[s]) continue;
    const fwd = walk(segs[s][0], s);
    const head = (adj.get(segs[s][0]) || []).find((n) => !used[n]);
    const back = head != null ? walk(segs[s][0], head).reverse() : [segs[s][0]];
    const keys = back.slice(0, -1).concat(fwd);
    if (keys.length >= minPts) lines.push(keys.map((k) => pt.get(k)));
  }
  lines.sort((p, q) => q.length - p.length);
  return lines;
}

/** Screen position of (lat, lon) under the view vw: [x, y, z]. */
export function placeAt(v, vw, lat, lon) {
  const p = worldOf(vw, lat, lon);
  return [v.wx(p.x), v.wy(p.y), p.z];
}

/**
 * A ghosted coastline: hairline, dashed, drawn on by k (0..1, each line grows from its start), alpha a.
 * A soft dark under-stroke keeps it legible over the mint shallows.
 */
export function drawGhost(ctx, v, vw, lines, k, a, w = 1) {
  if (k <= 0 || a <= 0.01) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  let any = false;
  for (const ln of lines) {
    const n = Math.max(2, Math.ceil(ln.length * L.clamp(k)));
    let open = false;
    for (let i = 0; i < n; i++) {
      const [x, y, z] = placeAt(v, vw, ln[i][0], ln[i][1]);
      if (z < 0.05 || x < -200 || x > W + 200 || y < -200 || y > H + 200) { open = false; continue; }
      if (open) ctx.lineTo(x, y); else { ctx.moveTo(x, y); open = true; any = true; }
    }
  }
  if (!any) { ctx.restore(); return; }
  ctx.strokeStyle = `rgba(4,14,26,${0.35 * a})`;
  ctx.lineWidth = 4 * w;
  ctx.stroke();
  ctx.setLineDash([7 * w, 6 * w]);
  ctx.strokeStyle = `rgba(240,248,252,${0.85 * a})`;
  ctx.lineWidth = 1.6 * w;
  ctx.stroke();
  ctx.restore();
}

/** City pin: a soft dark halo, a ring and a dot; it pulses once on arrival. k = entrance 0..1, pulse = 0..1 clock. */
export function drawPin(ctx, x, y, k, pulse = 1, a = 1, color = ACCENT) {
  if (k <= 0 || a <= 0.01) return;
  const e = L.ease.outBack(L.clamp(k), 2.2);
  ctx.save();
  ctx.globalAlpha *= a * L.clamp(k * 2);
  const halo = ctx.createRadialGradient(x, y, 0, x, y, 34);
  halo.addColorStop(0, 'rgba(2,8,16,0.55)');
  halo.addColorStop(1, 'rgba(2,8,16,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(x - 34, y - 34, 68, 68);
  if (pulse > 0 && pulse < 1) {
    ctx.strokeStyle = L.rgba(color, 0.75 * (1 - pulse));
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, 10 + 46 * L.ease.outCubic(pulse)), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(245,250,252,0.95)';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, 10 * e), 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = L.rgba(color);
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, 4 * e), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/**
 * A pin callout: hairline leader from the pin to an elbow (dx, dy), then the name (display, accent) and an optional
 * small tracked line. align 'left' puts the text to the right of the elbow, 'right' to the left of it.
 */
export function callout(ctx, x, y, { name, sub = '', k, a = 1, dx, dy, align = 'left', size = 58, subSize = 23 }) {
  if (k <= 0 || a <= 0.01) return;
  const e = L.ease.outCubic(L.clamp(k));
  const ex = x + dx, ey = y + dy;
  const dir = align === 'left' ? 1 : -1;
  ctx.save();
  ctx.globalAlpha *= a;
  // leader: pin edge → elbow → short run
  const ang = Math.atan2(dy, dx);
  const sx = x + Math.cos(ang) * 14, sy = y + Math.sin(ang) * 14;
  const l1 = L.clamp(e * 1.6);
  const l2 = L.clamp(e * 1.6 - 0.6);
  ctx.strokeStyle = 'rgba(235,242,248,0.8)';
  ctx.lineWidth = 1.6;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(L.lerp(sx, ex, l1), L.lerp(sy, ey, l1));
  if (l2 > 0) ctx.lineTo(ex + dir * 36 * l2, ey);
  ctx.stroke();
  // text: masked rise
  const tk = L.clamp(e * 1.5 - 0.35);
  if (tk > 0) {
    const tx = ex + dir * 48;
    ctx.save();
    ctx.globalAlpha *= L.clamp(tk * 1.4);
    ctx.beginPath(); ctx.rect(align === 'left' ? tx - 6 : tx - 900, ey - size * 0.9, 906, size * 0.9 + 80); ctx.clip();
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(2,8,18,0.7)';
    ctx.shadowBlur = 14;
    ctx.font = L.font(size, 800, L.FONT.display);
    ctx.fillStyle = L.rgba(ACCENT);
    const te = L.ease.outCubic(tk);
    L.trackedText(ctx, name, tx, ey + size * 0.32 + (1 - te) * size * 0.8, 0, align);
    if (sub) {
      ctx.shadowBlur = 8;
      ctx.font = L.font(subSize, 600, L.FONT.body);
      ctx.fillStyle = 'rgba(222,230,238,0.95)';
      L.trackedText(ctx, sub.toUpperCase(), tx, ey + size * 0.32 + 34 + (1 - te) * 20, 2.5, align);
    }
    ctx.restore();
  }
  ctx.restore();
}

/** Small tracked caps tag beside a pin (for secondary pins). */
function pinTag(ctx, x, y, text, k, a = 1) {
  if (k <= 0 || a <= 0.01) return;
  const e = L.ease.outCubic(L.clamp(k));
  ctx.save();
  ctx.globalAlpha *= a * e;
  ctx.font = L.font(22, 700, L.FONT.body);
  ctx.fillStyle = 'rgba(240,246,250,0.96)';
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 8;
  ctx.textBaseline = 'middle';
  L.trackedText(ctx, text, x + 20 + (1 - e) * 10, y, 3, 'left');
  ctx.restore();
}

// ================================================================== Florida
const FLORIDA = contour({ lat0: 24.4, lat1: 31.1, lon0: -87.7, lon1: -79.9, step: 0.1, minPts: 5 });
const T_GHOST = 1.0, T_LABEL = 1.25, T_MIAMI = 1.85, T_ORL = 2.15;   // seconds into beat 6 (camera lands ~1.4-1.9)

/** Visibility of the Florida story layer at global time (rides out with the camera, fades by the climb to Europe). */
function floridaK(v) {
  // fades as the camera leaves for Europe
  return 1 - L.ease.inCubic(L.prog(v.gt, shotStart('europe', v.tl) + 0.15, 0.5));
}

export default {
  beat: 6,
  chapter: { num: '06', title: 'Florida', sub: 'the peninsula at +70 m' },
  captions: true,
  layer: 1,
  cues(d) {
    void d;
    return [
      { t: T_GHOST, name: 'shimmer', gain: 0.22, pitch: 1.1 },   // today's coastline draws on
      { t: T_LABEL + 0.05, name: 'tick', gain: 0.24, pitch: 1.0 },
      { t: T_MIAMI, name: 'ping', gain: 0.26, pitch: 1.3 },
      { t: T_ORL, name: 'ping', gain: 0.22, pitch: 1.1 },
    ];
  },
  drawWorld(ctx, v) {
    if (v.t < T_GHOST - 0.1 || v.t > v.d + 1) return;
    const vk = floridaK(v);
    if (vk <= 0.01) return;
    const vw = viewOf(v);
    drawGhost(ctx, v, vw, FLORIDA, L.ease.inOutCubic(L.prog(v.t, T_GHOST, 1.1)), 0.9 * vk * L.clamp((v.t - T_GHOST + 0.1) * 4));
  },
  drawOverlay(ctx, v) {
    const vw = viewOf(v);
    const vk = floridaK(v);
    // pins ride the globe
    for (const [P, t0, tag] of [[PLACES.miami, T_MIAMI, 'MIAMI'], [PLACES.orlando, T_ORL, 'ORLANDO']]) {
      const [x, y, z] = placeAt(v, vw, P.lat, P.lon);
      if (z < 0.1) continue;
      const k = L.prog(v.t, t0, 0.45);
      drawPin(ctx, x, y, k, L.prog(v.t, t0 + 0.1, 1.0), vk);
      pinTag(ctx, x, y, tag, L.prog(v.t, t0 + 0.15, 0.4), vk);
    }
    // the label, in the dark Gulf
    L.bigLabel(ctx, {
      x: 84, y: 1110, big: 'Florida', small: 'highest point: 105 m',
      k: v.k * vk * L.prog(v.t, T_LABEL, 0.6), accent: ACCENT, size: 116,
    });
  },
};
