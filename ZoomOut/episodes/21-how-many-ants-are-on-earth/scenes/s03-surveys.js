// Beat 3 — the count. Schultheiss et al. (PNAS 2022) combined 489 ground surveys of ants "from every continent but
// Antarctica". On the real globe (env.globeView + earth.js project), 489 illustrative survey sites pop in, in a
// staggered ripple spreading out from Europe as the globe turns upright; the count rolls up with them (the number shown = sites popped so far).
//   * sites: seeded random LAND points (isLand, not ice, never south of 56° S), density weighted like the real data
//     (dense in the Americas, Europe and Australia; sparse in Africa, Arabia, Siberia and Central Asia). Illustrative
//     pattern, not the real site list.
//   * on "from every continent": a brightness wave runs through all sites; on "Antarctica": the Antarctic ice at the
//     bottom limb gets a cool, empty outline pulse (no sites there, ever).
import * as L from '../../../../engine/runtime/lib.js';
import { project, isLand, isIce } from '../../../../engine/runtime/earth.js';
import { globeView, SUN_LIGHT } from '../env.js';

const { W } = L;
const N = 489;
function weight(lat, lon) {
  if (lat > 15 && lat < 72 && lon > -170 && lon < -52) return lat > 56 ? 0.22 : 1.0;           // North America
  if (lat <= 15 && lat > -56 && lon > -95 && lon < -33) return 1.0;                              // Central + South America
  if (lat > 35 && lat < 71 && lon > -11 && lon < 40) return 1.25;                                // Europe
  if (lat > 12 && lat < 40 && lon >= 35 && lon < 60) return 0.12;                                // Arabia / Middle East
  if (lat > -36 && lat < 37 && lon > -18 && lon < 52) return lat > 15 && lat < 32 ? 0.04 : 0.2; // Africa (Sahara ≈ empty)
  if (lat >= 50 && lon >= 40) return 0.1;                                                        // Siberia
  if (lat > 35 && lat < 50 && lon > 50 && lon < 95) return 0.12;                                 // Central Asia
  if (lat > -11 && lat < 8 && lon > 95 && lon < 155) return 0.6;                                 // SE Asian islands
  if (lat >= 0 && lat < 50 && lon > 60 && lon < 150) return 0.38;                                // South + East Asia
  if (lat > -45 && lat < -10 && lon > 112 && lon < 155) return 1.1;                              // Australia
  if (lat > -48 && lat < -34 && lon > 165) return 0.8;                                           // New Zealand
  return 0.2;
}
const SITES = (() => {
  const r = L.rng(2131), out = [];
  let guard = 0;
  while (out.length < N && guard++ < 400000) {
    const lat = Math.asin(2 * r() - 1) * 180 / Math.PI, lon = r() * 360 - 180;
    if (lat < -56 || !isLand(lat, lon) || isIce(lat, lon)) continue;
    if (r() * 1.25 > weight(lat, lon)) continue;
    out.push({ lat, lon, j: r(), s: L.lerp(0.75, 1.2, r()) });
  }
  return out;
})();
// pop order: a ripple spreading out from the face we see first (Europe / West Africa), with jitter; the far side last
const D2R = Math.PI / 180;
SITES.forEach((s) => {
  const c = Math.sin(s.lat * D2R) * Math.sin(28 * D2R) + Math.cos(s.lat * D2R) * Math.cos(28 * D2R) * Math.cos((s.lon - 8) * D2R);
  s.key = Math.acos(L.clamp(c, -1, 1)) / D2R + 38 * s.j;
});
const ORDER = SITES.slice().sort((a, b) => a.key - b.key);
ORDER.forEach((s, i) => { s.rank = i / (N - 1); });

function times(tl) {
  const b = tl.scenes[3].start, ph = tl.lines[3].phrases;
  const p0 = b + 2.15;                           // first pops as the globe settles upright
  const p1 = ph[0].end - 0.05;                   // the last ones land as "…ground surveys" ends
  return { b, p0, p1, every: ph[1].start + 0.1, ant: ph[1].start + 0.58 * (ph[1].end - ph[1].start), end: tl.scenes[4].start };
}
const popT = (s, T) => T.p0 + (T.p1 - T.p0) * Math.pow(s.rank, 0.9);

export default {
  beat: 3,
  chapter: { num: '03', title: 'The count', sub: 'Ground surveys · PNAS 2022' },
  chapterUntil(d) { return 1.55; },
  layer: 3,
  cues(d) {
    // relative to the beat start; the phrase times are fixed by the voice timeline (see times())
    const out = [{ t: 2.1, name: 'count', gain: 0.22, pitch: 1.0 }];
    for (let i = 0; i < 9; i++) out.push({ t: 2.2 + i * 0.32, name: 'blip', gain: 0.12 + 0.012 * i, pitch: 1.0 + 0.07 * i });
    out.push({ t: 5.55, name: 'shimmer', gain: 0.24, pitch: 1.0 });
    out.push({ t: 6.75, name: 'sonar', gain: 0.18, pitch: 0.7 });
    return out;
  },
  drawWorld(ctx, v) {
    const T = times(v.tl);
    if (v.gt < T.p0 - 0.1 || v.gt > T.end + 0.8) return;
    const view = globeView(v);
    if (view.r < 60) return;
    const out = 1 - L.ease.inCubic(L.prog(v.gt, T.end - 0.15, 0.6));   // sites dissolve as the estimate beat begins
    if (out <= 0) return;
    const t = v.gt;
    const dotR = Math.max(2.2, view.r * 0.0085);
    // ---- Antarctica: a cool, empty outline pulse on the visible ice limb (on "Antarctica")
    const ka = L.ease.outCubic(L.prog(t, T.ant - 0.1, 0.5)) * (1 - 0.55 * L.ease.inOutCubic(L.prog(t, T.ant + 1.0, 0.8))) * out;
    if (ka > 0) {
      ctx.save();
      ctx.lineCap = 'round';
      for (const [lat, a, w] of [[-63, 0.95, 2.2], [-69, 0.5, 1.4]]) {
        let prev = null;
        ctx.strokeStyle = `rgba(200,230,255,${a * ka})`;
        ctx.lineWidth = w;
        ctx.shadowColor = `rgba(150,200,255,${0.8 * ka})`;
        ctx.shadowBlur = 10;
        ctx.setLineDash([7, 6]);
        ctx.beginPath();
        for (let lon = -180; lon <= 180; lon += 2) {
          const p = project(lat, lon, view);
          if (p.z > 0.06) { prev ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); prev = p; } else prev = null;
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    // ---- the survey sites
    const wave = L.prog(t, T.every, 1.3);   // "every continent": a brightness ripple, same order as the pops
    ctx.save();
    for (const s of SITES) {
      const tp = popT(s, T);
      if (t < tp) continue;
      const p = project(s.lat, s.lon, view, 0.004);
      if (p.z <= 0.01) continue;
      const limb = L.smoothstep(L.clamp(p.z / 0.38));
      const k = L.prog(t, tp, 0.38);
      const sc = L.ease.outBack(k) * s.s;
      const pulse = wave > 0 && wave < 1 ? Math.exp(-(((s.rank - (wave * 1.3 - 0.15)) / 0.08) ** 2)) : 0;
      // sites on the night side stay, but quieter (the land there is dark)
      const lit = (p.x - view.cx) / view.r * SUN_LIGHT[0] - (p.y - view.cy) / view.r * SUN_LIGHT[1] + p.z * SUN_LIGHT[2];
      const a = limb * out * L.lerp(0.45, 1, L.smoothstep(L.clamp(L.invLerp(-0.15, 0.2, lit))));
      // pop ring
      if (k < 1 || t - tp < 0.7) {
        const rk = L.prog(t, tp, 0.7);
        ctx.strokeStyle = `rgba(255,214,140,${0.55 * (1 - rk) * a})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, dotR * (1 + 3.2 * L.ease.outCubic(rk))), 0, Math.PI * 2); ctx.stroke();
      }
      const r = dotR * sc * (1 + 0.6 * pulse) * (0.55 + 0.45 * L.clamp(p.z / 0.6));
      ctx.fillStyle = `rgba(235,170,70,${(0.22 + 0.3 * pulse) * a})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, r * 2.1), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(${255},${L.lerp(196, 240, pulse) | 0},${L.lerp(110, 200, pulse) | 0},${a})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, r), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    const T = times(v.tl);
    const kin = L.prog(v.gt, T.p0 - 0.1, 0.6);
    if (kin <= 0) return;
    let n = 0;
    for (const s of SITES) if (v.gt >= popT(s, T)) n++;
    const big = L.fmt(n);
    ctx.save();
    ctx.globalAlpha = v.k;
    const size = L.fitSize(ctx, '489', 600, 132, 800, L.FONT.display, 60);
    // the context line switches on "from every continent"
    const sw = L.ease.inOutCubic(L.prog(v.gt, T.every - 0.05, 0.45));
    const smallA = 'ground surveys of ants', smallB = 'every continent but Antarctica';
    L.bigLabel(ctx, { x: W / 2, y: 404, big, small: null, k: kin, accent: v.accent, align: 'center', size });
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    const fitSmall = (s) => { let fs = 30; ctx.font = L.font(fs, 600, L.FONT.body); while (fs > 18 && ctx.measureText(s.toUpperCase()).width + s.length * 3 > 900) { fs -= 1; ctx.font = L.font(fs, 600, L.FONT.body); } return fs; };
    const e = L.ease.outCubic(kin);
    for (const [s, a, dy] of [[smallA, 1 - sw, -14 * sw], [smallB, sw, 14 * (1 - sw)]]) {
      if (a <= 0.01) continue;
      ctx.font = L.font(fitSmall(s), 600, L.FONT.body);
      ctx.fillStyle = `rgba(205,215,230,${0.95 * a * Math.min(1, kin * 1.4)})`;
      L.trackedText(ctx, s.toUpperCase(), W / 2, 452 + dy + (1 - e) * 18, 3, 'center');
    }
    ctx.restore();
  },
};
