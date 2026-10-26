// Beat 1 — "Drop the sea by just fifty meters, | and you could walk from Alaska to Russia."
// The Bering Strait close-up while the sea falls 0 → −50 m (9.83–11.53). Two pins — the Seward Peninsula (ALASKA)
// and Chukotka (RUSSIA) — land as the camera arrives; on "you could walk from Alaska to Russia" a walking route
// draws itself from the Alaska pin to the Russia pin, laid down as alternating footsteps behind a glowing walker.
// The route runs mainland to mainland (Seward Peninsula → Chukotka, ≈ 360 km, so it reads at this zoom) and is honest:
// at −50 m the 0.1° grid still holds a sliver of water in the narrowest part of the strait, and the first dry link is
// a little to the SOUTH (shallowest saddle ≈ −47.5 m), so the path dips south across it. Every point of the smoothed
// route is ≥ −48.6 m in the grid (checked offline with the same bilinear elevation()).
// bigLabel "−50 m" / "Alaska joins Russia" sits in the left column (y 430–615), clear of the land bridge.
// Also exports the small overlay kit (pins, tags, geo routes) the other 23A scenes reuse.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, PLACES, project } from '../env.js';

const DEG = Math.PI / 180;
const ph = (tl, i, j, edge = 'start') => tl.lines[i].phrases[j][edge];
export const WALK = [250, 246, 236];

// ------------------------------------------------------------------ kit (shared by s01–s04)
/** A smoothed geo route: Catmull-Rom through lat/lon waypoints, arc-length parametrised. */
export function makeRoute(pts) {
  const P = pts.map(([a, b]) => [a, b]);
  for (let i = 1; i < P.length; i++) { while (P[i][1] - P[i - 1][1] > 180) P[i][1] -= 360; while (P[i][1] - P[i - 1][1] < -180) P[i][1] += 360; }
  const fine = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let s = 0; s < 12; s++) {
      const t = s / 12, t2 = t * t, t3 = t2 * t;
      const f = (k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      fine.push([f(0), f(1)]);
    }
  }
  fine.push(P[P.length - 1]);
  const cum = [0];
  for (let i = 1; i < fine.length; i++) {
    const a = fine[i - 1], b = fine[i];
    const dl = (b[1] - a[1]) * Math.cos((a[0] + b[0]) / 2 * DEG);
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], dl));
  }
  return { fine, cum, len: cum[cum.length - 1] };
}
/** Point at fraction s (0..1) of a route: [lat, lon]. */
export function along(R, s) {
  const d = L.clamp(s) * R.len, { cum, fine } = R;
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
  const k = (d - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
  return [L.lerp(fine[lo][0], fine[hi][0], k), L.lerp(fine[lo][1], fine[hi][1], k)];
}
/** Map pin: soft dark halo, accent ring, white dot; optional arrival pulse (0..1). */
export function drawPin(c, x, y, k, pulse = -1, col = ACCENT) {
  if (k <= 0) return;
  const e = L.ease.outBack(L.clamp(k), 2.2);
  c.save();
  c.globalAlpha *= L.clamp(k * 2);
  const g = c.createRadialGradient(x, y, 0, x, y, 32);
  g.addColorStop(0, 'rgba(2,8,16,0.6)');
  g.addColorStop(1, 'rgba(2,8,16,0)');
  c.fillStyle = g;
  c.fillRect(x - 32, y - 32, 64, 64);
  c.strokeStyle = L.rgba(col, 0.95);
  c.lineWidth = 2.5;
  c.beginPath(); c.arc(x, y, Math.max(0, 12 * e), 0, Math.PI * 2); c.stroke();
  c.fillStyle = 'rgba(245,252,250,0.98)';
  c.beginPath(); c.arc(x, y, Math.max(0, 4.5 * e), 0, Math.PI * 2); c.fill();
  if (pulse > 0 && pulse < 1) {
    c.strokeStyle = L.rgba(col, 0.6 * (1 - pulse));
    c.lineWidth = 2;
    c.beginPath(); c.arc(x, y, Math.max(0, 12 + 44 * L.ease.outCubic(pulse)), 0, Math.PI * 2); c.stroke();
  }
  c.restore();
}
/**
 * Small tracked-caps map tag on a soft dark plate. align 'left' | 'right' | 'center'; (x, y) = text middle-left/right.
 * o: {size, track, sub (second smaller line), col, maxW, plate (0..1)}. Fitted to maxW. Returns the box.
 */
export function tag(c, text, x, y, k, o = {}) {
  if (k <= 0) return null;
  const size0 = o.size ?? 26, track = o.track ?? 4, align = o.align ?? 'left', maxW = o.maxW ?? 420;
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  c.globalAlpha *= L.clamp(k * 1.3);
  c.textBaseline = 'middle';
  const fitT = (str, sz, w, wt) => {
    let s = sz;
    for (; s > 12; s -= 1) { c.font = L.font(s, wt, L.FONT.body); c.letterSpacing = `${track}px`; if (c.measureText(str).width - track <= w) break; }
    c.letterSpacing = '0px';
    return s;
  };
  const s1 = fitT(text, size0, maxW, 700);
  c.font = L.font(s1, 700, L.FONT.body); c.letterSpacing = `${track}px`;
  const w1 = c.measureText(text).width - track;
  let s2 = 0, w2 = 0;
  if (o.sub) {
    s2 = fitT(o.sub, Math.round(size0 * 0.68), maxW, 600);
    c.font = L.font(s2, 600, L.FONT.body); c.letterSpacing = `${Math.max(1, track - 2)}px`;
    w2 = c.measureText(o.sub).width - Math.max(1, track - 2);
  }
  c.letterSpacing = '0px';
  const w = Math.max(w1, w2), h = s1 * 1.05 + (o.sub ? s2 * 1.5 : 0);
  const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  const top = y - s1 * 0.55;
  const dx = (1 - e) * (align === 'right' ? 10 : align === 'center' ? 0 : -10);
  // plate: rounded dark glass
  const pa = (o.plate ?? 1);
  if (pa > 0) {
    c.fillStyle = `rgba(4,9,18,${0.62 * pa})`;
    L.roundRect(c, x0 - 14 + dx, top - 9, w + 28, h + 16, 8); c.fill();
    c.strokeStyle = `rgba(255,255,255,${0.10 * pa})`;
    c.lineWidth = 1; c.stroke();
  }
  c.shadowColor = 'rgba(0,4,10,0.9)';
  c.shadowBlur = 8;
  c.fillStyle = L.rgba(o.col ?? [244, 248, 250], 0.98);
  c.font = L.font(s1, 700, L.FONT.body);
  const lx = (wi) => (align === 'center' ? x - wi / 2 : align === 'right' ? x - wi : x0);
  L.trackedText(c, text, lx(w1) + dx, y, track, 'left');
  if (o.sub) {
    c.font = L.font(s2, 600, L.FONT.body);
    c.fillStyle = 'rgba(200,214,228,0.92)';
    L.trackedText(c, o.sub, lx(w2) + dx, y + s1 * 0.55 + s2 * 0.95, Math.max(1, track - 2), 'left');
  }
  c.restore();
  return { x: x0, y: top, w, h };
}

// ------------------------------------------------------------------ the route (Alaska → Russia, dry at −50 m)
export const BERING_ROUTE = makeRoute([
  [65.15, -164.8], [65.15, -166.3], [65.12, -167.3], [65.02, -167.95], [64.98, -168.5], [64.97, -168.95],
  [65.12, -169.2], [65.35, -169.45], [65.43, -169.9], [65.5, -170.4], [65.55, -171.0], [65.55, -172.6],]);

function times(tl) {
  const p1 = ph(tl, 1, 1);
  return {
    pins: tl.scenes[1].start + 1.45,      // camera has nearly arrived (10.58)
    walk0: p1 + 0.12, walk: 1.75,          // "and you could walk from Alaska to Russia"
    label: ph(tl, 1, 0) + 1.0,             // with the drop
  };
}
/** fade of the whole route as the camera leaves for the North Sea */
const away = (v) => 1 - L.ease.inCubic(L.prog(v.gt, v.tl.scenes[2].start - 0.05, 0.45));

function drawRoute(c, v, R, tm) {
  const appear = L.prog(v.gt, tm.pins, 0.4);
  const fo = away(v);
  if (appear <= 0 || fo <= 0) return;
  const prog = L.smoothstep(L.prog(v.gt, tm.walk0, tm.walk));
  const pt = (la, lo) => project(v, la, lo);
  const a = pt(...R.fine[0]), b = pt(...R.fine[R.fine.length - 1]);
  if (a.z < 0.05 && b.z < 0.05) return;
  c.save();
  c.globalAlpha = fo;
  c.lineCap = 'round'; c.lineJoin = 'round';
  // faint guide of the whole path
  c.setLineDash([2, 6]);
  c.strokeStyle = L.rgba(WALK, 0.32 * appear * (1 - prog * 0.6));
  c.lineWidth = 2;
  c.beginPath();
  R.fine.forEach(([la, lo], i) => { const p = pt(la, lo); i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); });
  c.stroke();
  c.setLineDash([]);
  // the walked trail
  if (prog > 0) {
    c.beginPath();
    const n = 80;
    for (let i = 0; i <= n; i++) { const p = pt(...along(R, prog * i / n)); i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); }
    c.strokeStyle = 'rgba(2,10,18,0.5)'; c.lineWidth = 11; c.stroke();
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = L.rgba(ACCENT, 0.3); c.lineWidth = 7; c.stroke();
    c.strokeStyle = L.rgba(L.mix(ACCENT, WALK, 0.4), 0.85); c.lineWidth = 2.6; c.stroke();
    c.globalCompositeOperation = 'source-over';
  }
  // pins
  const arrive = L.prog(v.gt, tm.walk0 + tm.walk - 0.05, 0.9);
  drawPin(c, a.x, a.y, appear * L.clamp(a.z * 5), L.prog(v.gt, tm.walk0, 0.9), WALK);
  drawPin(c, b.x, b.y, appear * L.clamp(b.z * 5), arrive, ACCENT);
  // walker
  if (prog > 0 && prog < 1) {
    const w = pt(...along(R, prog));
    c.globalCompositeOperation = 'lighter';
    for (let j = 1; j <= 5; j++) {
      const q = pt(...along(R, Math.max(0, prog - j * 0.02)));
      c.fillStyle = L.rgba(ACCENT, 0.3 * (1 - j / 6));
      c.beginPath(); c.arc(q.x, q.y, Math.max(0, 5.5 - j * 0.7), 0, Math.PI * 2); c.fill();
    }
    c.globalCompositeOperation = 'source-over';
    L.lightBlob(c, w.x, w.y, 34, ACCENT, 0.75);
    c.fillStyle = 'rgba(2,10,18,0.55)';
    c.beginPath(); c.arc(w.x, w.y, 8.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(w.x, w.y, 6, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

export default {
  beat: 1,
  chapter: { num: '01', title: 'Bering Strait', sub: 'Alaska to Russia on foot' },
  layer: 1,
  // beat 8.78: pins 10.23, label 9.93, walk 11.50–13.25
  cues(d) {
    const out = [
      { t: 1.15, name: 'blip', gain: 0.18, pitch: 1.1 },          // −50 m label
      { t: 1.45, name: 'ping', gain: 0.2, pitch: 1.2 },           // pins
      { t: 2.72, name: 'swish', gain: 0.14, pitch: 1.3 },         // the walk begins
      { t: 4.45, name: 'ping', gain: 0.26, pitch: 1.0 },          // arrival in Russia
    ];
    for (let i = 0; i < 7; i++) out.push({ t: 2.8 + i * 0.24, name: 'tick', gain: 0.06, pitch: 1.45 + (i % 2) * 0.15 });
    return out;
  },
  drawWorld(ctx, v) {
    const tm = times(v.tl);
    if (v.gt < tm.pins || v.gt > v.tl.scenes[2].start + 0.6) return;
    drawRoute(ctx, v, BERING_ROUTE, tm);
  },
  drawOverlay(ctx, v) {
    const tm = times(v.tl);
    // the camera leaves for the North Sea 0.5 s before the line ends: clear the labels as it goes
    const leave = 1 - L.ease.inCubic(L.prog(v.gt, v.tl.lines[1].phrases[1].end - 0.5, 0.3));
    const kl = Math.min(v.k, L.prog(v.gt, tm.label, 0.6)) * leave;
    L.bigLabel(ctx, { x: 80, y: 560, big: '−50 m', small: 'Alaska joins Russia', k: kl, accent: v.accent, size: 110 });
    // pin names
    const R = BERING_ROUTE;
    const a = project(v, ...R.fine[0]), b = project(v, ...R.fine[R.fine.length - 1]);
    const ka = Math.min(v.k, L.prog(v.gt, tm.pins + 0.15, 0.5)) * L.clamp(a.z * 5) * leave;
    const kb = Math.min(v.k, L.prog(v.gt, tm.pins + 0.25, 0.5)) * L.clamp(b.z * 5) * leave;
    tag(ctx, 'ALASKA', Math.min(a.x + 26, 940 - 130), a.y + 4, ka, { size: 24, maxW: 200 });
    tag(ctx, 'RUSSIA', b.x - 26, b.y - 4, kb, { size: 24, maxW: 200, align: 'right' });
  },
};
