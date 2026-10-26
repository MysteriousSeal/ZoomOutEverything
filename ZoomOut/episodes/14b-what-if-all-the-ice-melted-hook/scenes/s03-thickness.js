// Beat 3 — "In places, it's more than four kilometers thick."
// A profile line draws itself across the continent (Amundsen Sea coast, 110°W -> South Pole -> Dome A -> Amery Ice
// Shelf, 70°E: on screen, left to right). A copy of it drops into the free band below (y 780-1240) and a
// cross-section rises from it:
//   * the ice SURFACE is real (ETOPO1 ice surface sampled along the line);
//   * the bed is a smoothed Bedmap2-style sketch: the marine West Antarctic basin (Bentley Subglacial Trench,
//     ~2.5 km below sea level, where the ice is >4 km thick), the Gamburtsev mountains under Dome A, the Lambert
//     graben, and the floating Amery Ice Shelf with sea water under it;
//   * vertical scale exaggerated ×150, and marked as such.
// A dimension line through the thickest ice carries the label "4 km+" / "13,000+ ft thick in places".
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, project, elevation, plate } from '../env.js';
import { antarcticaMask, drawMaskImage } from './s01-zoom-out.js';

let backC = null;

const TAU = Math.PI * 2;
const DEG_M = 111195;                          // metres per degree of latitude
const X0 = 90, X1 = 930, Y_SEA = 1062, Y_BOT = 1212;
const EXAG = 150;

// ------------------------------------------------------------------ the profile (built once)
const A_LON = -110, A_LAT = -73.5, B_LON = 70, B_LAT = -67.8;
const DA = 90 + A_LAT, DB = 90 + B_LAT, DT = DA + DB;   // degrees along each leg
const BED_A = [[-73.5, -500], [-75, -900], [-76.5, -1300], [-78, -1650], [-79.5, -2250], [-80.5, -2550], [-81.5, -2250], [-83, -1300], [-85, -600], [-87, -200], [-90, 100]];
const BED_B = [[-90, 100], [-88, 300], [-86, 900], [-84, 1400], [-82, 1650], [-81, 1300], [-80, 800], [-78, 300], [-76, -600], [-74.5, -1700], [-73, -1900], [-72.5, -1300], [-71, -1050], [-69, -950], [-67.8, -700]];
const table = (T, lat) => {
  for (let i = 1; i < T.length; i++) {
    const [a, va] = T[i - 1], [b, vb] = T[i];
    if ((lat - a) * (lat - b) <= 0) return L.lerp(va, vb, L.smoothstep(L.invLerp(a, b, lat)));
  }
  return T[T.length - 1][1];
};
const N = 200;
let P = null;
function profile() {
  if (P) return P;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, dd = u * DT;
    const legA = dd <= DA;
    const lat = legA ? A_LAT - dd : -90 + (dd - DA);
    const lon = legA ? A_LON : B_LON;
    const e = elevation(Math.max(-89.95, lat), lon);
    let bed = table(legA ? BED_A : BED_B, lat) + 110 * L.noise1(u * 38, 3) + 45 * L.noise1(u * 110, 4);
    let kind, top, base;
    if (e <= 0) { kind = 'sea'; top = 0; base = 0; bed = e; }
    else if (!legA && lat > -72.6 && e < 160) { kind = 'shelf'; top = e; base = -8.5 * e; bed = Math.min(bed, base - 220); }
    else { kind = 'ice'; top = e; bed = Math.min(bed, e - 60); base = bed; }
    pts.push({ u, lat, lon, kind, top, base, bed, x: L.lerp(X0, X1, u) });
  }
  // only the two ends are open sea: inside the coasts, any sub-zero sample is ice on a deep bed
  const first = pts.findIndex((p) => p.kind !== 'sea');
  let last = pts.length - 1; while (last > 0 && pts[last].kind === 'sea') last--;
  pts.forEach((p, i) => {
    if (p.kind === 'sea' && i > first && i < last) {
      const legA = p.lon === A_LON;
      p.top = Math.max(40, (pts[i - 1].top + (pts[i + 1]?.top ?? 0)) / 2);
      if (!legA && p.lat > -72.6 && p.top < 160) { p.kind = 'shelf'; p.base = -8.5 * p.top; p.bed = Math.min(table(BED_B, p.lat), p.base - 220); }
      else { p.kind = 'ice'; p.bed = Math.min(table(legA ? BED_A : BED_B, p.lat), p.top - 60); p.base = p.bed; }
    }
    if (p.kind === 'sea') p.bed = Math.max(p.bed, -1100);
  });
  let best = 0;
  pts.forEach((p, i) => { if (p.kind === 'ice' && p.top - p.bed > pts[best].top - pts[best].bed) best = i; });
  P = { pts, best, vm: (DT * DEG_M / (X1 - X0)) / EXAG };
  return P;
}

// ------------------------------------------------------------------ timing (beat-relative)
const T_LINE = 0.1, D_LINE = 0.95, T_DROP = 0.8, T_RISE = 1.1, T_DIM = 1.55, T_LABEL = 1.62, T_NOTE = 2.0;

function mapLine(v, pts, f) {
  const out = [];
  const n = Math.round(pts.length * f);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = project(v, Math.max(-89.9, p.lat), p.lon);
    out.push([q.x, q.y]);
  }
  return out;
}
const stroke = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); };

export default {
  beat: 3,
  chapter: { num: '03', title: 'The ice sheet', sub: 'up to 4.9 km thick' },
  captions: true,
  layer: 0,
  cues() {
    return [
      { t: T_LINE + 0.05, name: 'tick', gain: 0.16, pitch: 1.2 },
      { t: T_DROP, name: 'swish', gain: 0.2, pitch: 0.85 },
      { t: T_RISE + 0.1, name: 'creak', gain: 0.18, pitch: 0.7 },
      { t: T_DIM, name: 'impact', gain: 0.22, pitch: 0.9 },
      { t: T_LABEL + 0.05, name: 'ping', gain: 0.22, pitch: 1.1 },
    ];
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    // exit before the next camera move (faster than the entrance)
    const k = v.k * (1 - L.ease.inCubic(L.prog(t, v.d - 0.34, 0.34)));
    if (k <= 0.001) return;
    const { pts, best, vm } = profile();
    const n = pts.length;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // ---- 1. the profile line on the map (rides the globe)
    const fl = L.ease.inOutCubic(L.prog(t, T_LINE, D_LINE));
    const ml = fl > 0 ? mapLine(v, pts, fl) : [];
    if (ml.length > 1) {
      ctx.globalAlpha = k;
      ctx.strokeStyle = 'rgba(4,14,24,0.55)';
      ctx.lineWidth = 7;
      stroke(ctx, ml);
      ctx.strokeStyle = L.rgba(ACCENT, 0.95);
      ctx.lineWidth = 3;
      stroke(ctx, ml);
      // end caps: small perpendicular bars at the two coasts
      for (const [i, on] of [[0, true], [ml.length - 1, fl >= 1]]) {
        if (!on) continue;
        const [x, y] = ml[i], [x2, y2] = ml[i === 0 ? 1 : i - 1];
        const dx = x2 - x, dy = y2 - y, d = Math.hypot(dx, dy) || 1;
        const nx = -dy / d * 9, ny = dx / d * 9;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x - nx, y - ny); ctx.lineTo(x + nx, y + ny); ctx.stroke();
      }
      // a travelling bead while it draws
      if (fl < 1) {
        const [hx, hy] = ml[ml.length - 1];
        L.lightBlob(ctx, hx, hy, 22, ACCENT, 0.6 * k);
      }
    }

    // ---- 2. per-sample morph (map -> section baseline) and rise
    const kd = L.prog(t, T_DROP, 0.9);
    if (kd <= 0 || ml.length < n) { ctx.restore(); return; }
    const S = pts.map((p, i) => {
      const m = L.ease.inOutCubic(L.prog(t, T_DROP + 0.22 * p.u, 0.6));
      const q = L.ease.outCubic(L.prog(t, T_RISE + 0.35 * p.u, 0.75));
      const yTop = Y_SEA - q * p.top / vm, yBase = Y_SEA - q * p.base / vm, yBed = Y_SEA - q * p.bed / vm;
      return { m, q, x: L.lerp(ml[i][0], p.x, m), yLine: L.lerp(ml[i][1], yTop, m), yTop, yBase, yBed, p };
    });
    const landed = S.every((s) => s.m >= 1);
    const kq = L.ease.outCubic(L.prog(t, T_RISE, 1.1)) * k;      // the section's body (fills)

    // backing: a soft dark field so the slab separates from the ocean behind it. Kept to the slab's own bounds
    // (gone by y ≈ 880) and cut out of the continent mask, so it never darkens the ice sheet.
    if (kq > 0.001) {
      if (!backC) backC = new OffscreenCanvas(L.W, L.H);
      const bc = backC.getContext('2d');
      bc.setTransform(1, 0, 0, 1, 0, 0);
      bc.globalCompositeOperation = 'source-over';
      bc.clearRect(0, 0, L.W, L.H);
      bc.save();
      bc.translate(510, 1080);
      bc.scale(1, 190 / 520);
      const bg = bc.createRadialGradient(0, 0, 30, 0, 0, 520);
      bg.addColorStop(0, 'rgba(2,7,14,0.85)');
      bg.addColorStop(0.55, 'rgba(2,7,14,0.75)');
      bg.addColorStop(0.82, 'rgba(2,7,14,0.38)');
      bg.addColorStop(1, 'rgba(2,7,14,0)');
      bc.fillStyle = bg;
      bc.fillRect(-520, -520, 1040, 1040);
      bc.restore();
      bc.globalCompositeOperation = 'destination-out';
      drawMaskImage(bc, v, antarcticaMask().mask);
      bc.globalCompositeOperation = 'source-over';
      ctx.save();
      ctx.globalAlpha = kq;
      ctx.drawImage(backC, 0, 0);
      ctx.restore();
    }

    if (kq > 0.001) {
      const xs = S.map((s) => s.p.x);
      // bedrock (and sea floor), fading out at the bottom
      ctx.save();
      ctx.globalAlpha = kq;
      ctx.beginPath();
      S.forEach((s, i) => (i ? ctx.lineTo(xs[i], s.yBed) : ctx.moveTo(xs[i], s.yBed)));
      ctx.lineTo(X1, Y_BOT); ctx.lineTo(X0, Y_BOT); ctx.closePath();
      const rg = ctx.createLinearGradient(0, Y_SEA - 40, 0, Y_BOT);
      rg.addColorStop(0, 'rgb(78,68,60)');
      rg.addColorStop(0.55, 'rgba(44,38,36,0.95)');
      rg.addColorStop(1, 'rgba(24,22,24,0)');
      ctx.fillStyle = rg;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(150,130,110,0.12)';
      ctx.lineWidth = 1;
      for (const off of [10, 24, 42, 64]) {
        ctx.beginPath();
        S.forEach((s, i) => { const y = s.yBed + off + 4 * Math.sin(i * 0.21 + off); if (i) ctx.lineTo(xs[i], y); else ctx.moveTo(xs[i], y); });
        ctx.stroke();
      }
      ctx.restore();
      // sea water: open ocean at both coasts and under the floating shelf
      ctx.beginPath();
      ctx.moveTo(X0, Y_SEA);
      S.forEach((s, i) => ctx.lineTo(xs[i], s.p.kind === 'ice' ? Y_SEA : s.yBed));
      ctx.lineTo(X1, Y_SEA);
      ctx.closePath();
      ctx.fillStyle = 'rgba(22,84,112,0.9)';
      ctx.fill();
      ctx.restore();

      // the ice body: glassy, white at the surface, deep blue at the bed, with buried annual layers
      ctx.save();
      ctx.globalAlpha = kq;
      const bottomY = (s) => (s.p.kind === 'sea' ? s.yTop : s.p.kind === 'shelf' ? s.yBase : s.yBed);
      ctx.beginPath();
      S.forEach((s, i) => (i ? ctx.lineTo(xs[i], s.yTop) : ctx.moveTo(xs[i], s.yTop)));
      for (let i = n - 1; i >= 0; i--) ctx.lineTo(xs[i], bottomY(S[i]));
      ctx.closePath();
      const ig = ctx.createLinearGradient(0, Y_SEA - 4000 / vm, 0, Y_SEA + 2500 / vm);
      ig.addColorStop(0, 'rgb(240,248,252)');
      ig.addColorStop(0.45, 'rgb(186,218,236)');
      ig.addColorStop(0.75, 'rgb(118,170,206)');
      ig.addColorStop(1, 'rgb(62,112,160)');
      ctx.fillStyle = ig;
      ctx.fill();
      ctx.save();
      ctx.clip();
      for (const [f, col] of [[0.18, 'rgba(255,255,255,0.35)'], [0.34, 'rgba(70,120,160,0.18)'], [0.5, 'rgba(255,255,255,0.25)'], [0.64, 'rgba(70,120,160,0.2)'], [0.77, 'rgba(255,255,255,0.18)'], [0.88, 'rgba(60,100,140,0.22)']]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        let pen = false;
        S.forEach((s, i) => {
          if (s.p.kind === 'sea') { pen = false; return; }
          const y = s.yTop + (bottomY(s) - s.yTop) * Math.pow(f, 0.85);
          if (pen) ctx.lineTo(xs[i], y); else ctx.moveTo(xs[i], y);
          pen = true;
        });
        ctx.stroke();
      }
      // a slow light sweep through the ice (secondary motion)
      const sw = ((v.gt * 0.22) % 1.6) - 0.3;
      const gx = L.lerp(X0, X1, sw);
      const lg = ctx.createLinearGradient(gx - 120, 0, gx + 120, 0);
      lg.addColorStop(0, 'rgba(255,255,255,0)');
      lg.addColorStop(0.5, 'rgba(255,255,255,0.14)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(gx - 120, 800, 240, 420);
      ctx.restore();
      // underside of the ice: a thin dark line against rock / water
      ctx.strokeStyle = 'rgba(20,40,60,0.6)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      let pen = false;
      S.forEach((s, i) => {
        if (s.p.kind === 'sea') { pen = false; return; }
        if (pen) ctx.lineTo(xs[i], bottomY(s)); else ctx.moveTo(xs[i], bottomY(s));
        pen = true;
      });
      ctx.stroke();
      ctx.restore();

      // sea level: a dashed mint hairline across the section + a tiny tag in the open ocean on the left
      ctx.save();
      ctx.globalAlpha = kq;
      ctx.setLineDash([7, 7]);
      ctx.strokeStyle = L.rgba(ACCENT, 0.6);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(X0 - 14, Y_SEA); ctx.lineTo(X1 + 14, Y_SEA); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = L.font(26, 600, L.FONT.body);
      // 14b: 26 px, on a small plate just under the line at the left end (at the right end it ran into the ice)
      const slw = ctx.measureText('SEA LEVEL').width + 2 * 9;
      // f14v1: just right of the thickness bar (it crossed the tag when the tag sat at the left end)
      const sx0 = Math.max(X0 - 4, pts[best].x + 16);
      plate(ctx, sx0, Y_SEA + 8, slw + 24, 40, 1, 10);
      ctx.fillStyle = L.rgba(ACCENT, 0.95);
      ctx.textBaseline = 'alphabetic';
      L.trackedText(ctx, 'SEA LEVEL', sx0 + 12, Y_SEA + 37, 2, 'left');
      ctx.restore();
    }

    // ---- 3. the travelling line (the surface edge), crisp on top
    ctx.globalAlpha = k;
    const top = S.map((s) => [s.x, s.m >= 1 ? s.yTop : s.yLine]);
    if (!landed) {
      // faint projection lines from the map ends while the copy drops
      ctx.save();
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = L.rgba(ACCENT, 0.3 * (1 - L.prog(t, T_DROP + 0.7, 0.5)));
      ctx.lineWidth = 1.2;
      for (const i of [0, n - 1]) { ctx.beginPath(); ctx.moveTo(ml[i][0], ml[i][1]); ctx.lineTo(top[i][0], top[i][1]); ctx.stroke(); }
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2.5;
    stroke(ctx, top);
    L.glow(ctx, [190, 235, 255], 14, () => { ctx.strokeStyle = 'rgba(220,245,255,0.35)'; ctx.lineWidth = 2; stroke(ctx, top); }, 0.8);

    // ---- 4. the thickest ice: a dimension line through it, and the label above it
    const kdim = L.prog(t, T_DIM, 0.55);
    if (kdim > 0) {
      const s = S[best];
      L.dimension(ctx, s.p.x, s.yTop, s.yBed, kdim * k, ACCENT, '', 'right');
      // end dots so it reads as a measurement through the ice
      const e = L.ease.outCubic(kdim);
      ctx.fillStyle = L.rgba(ACCENT, k * e);
      for (const y of [s.yTop, s.yBed]) { ctx.beginPath(); ctx.arc(s.p.x, y, Math.max(0, 4 * e), 0, TAU); ctx.fill(); }
      // f14v1: no leader above the ice surface (it read as the measurement overshooting the ice); the bar ends on
      // its two dots, the label sits directly above it
    }
    const kl = L.enter(t, T_LABEL, 0.6) * k;
    if (kl > 0.001) L.bigLabel(ctx, { x: 96, y: 866, big: '4 km+', small: '13,000+ ft thick in places', k: kl, accent: ACCENT, size: 112 });
    const kn = L.enter(t, T_NOTE, 0.5) * k;
    if (kn > 0.001) {
      ctx.globalAlpha = kn;
      ctx.font = L.font(26, 600, L.FONT.body);
      ctx.fillStyle = 'rgba(214,226,238,0.9)';
      ctx.textBaseline = 'alphabetic';
      // 14b: the exaggeration is flagged plainly, 26 px, right edge at x 930 (< 940)
      L.trackedText(ctx, `NOT TO SCALE · HEIGHT × ${EXAG}`, X1, Y_BOT + 40, 2.5, 'right');
    }
    ctx.restore();
  },
};
