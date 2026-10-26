// Beat 16 — "Yet they carry more than ninety-nine percent of the traffic between continents."
// The camera pulls back to the whole night globe over Asia-Pacific. On "ninety-nine" the whole cable network
// brightens (a wave of light across all 36 routes, staggered) and the data pulses thicken and speed up.
// The "bar" is a ring gauge hugging the planet: it fills clockwise from 1 o'clock to 99% with a hot head, then a
// soft completion pulse (an echo of beat 1's one-second ring). The last 1% stays open
// (a grey notch with one tiny satellite: beat 11). Label "99%+" / "of traffic between continents" in the standard
// top-left stack (the camera frames the ring below it), on "ninety-nine"; the chapter card clears early to make room.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, CABLES, DEG, R_EARTH, cableZoomK, globeDisc, viewOf, spinFade } from '../env.js';
import { wordTime } from './s01-one-phone.js';

const TAU = Math.PI * 2;
const HOT = [200, 230, 255];

// ------------------------------------------------------------------ cable geometry (unit vectors, sampled every ~1 deg)
const unit = (lat, lon) => { const p = lat * DEG, l = lon * DEG, cp = Math.cos(p); return [cp * Math.cos(l), cp * Math.sin(l), Math.sin(p)]; };
const GEOM = CABLES.map((cb) => {
  const P = [], acc = [0];
  for (let i = 0; i < cb.pts.length - 1; i++) {
    const a = unit(...cb.pts[i]), b = unit(...cb.pts[i + 1]);
    const ang = Math.acos(L.clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
    const n = Math.max(1, Math.ceil(ang / (1.0 * DEG)));
    const s = Math.sin(ang);
    for (let k = i ? 1 : 0; k <= n; k++) {
      const t = k / n;
      const fa = ang < 1e-9 ? 1 - t : Math.sin((1 - t) * ang) / s, fb = ang < 1e-9 ? t : Math.sin(t * ang) / s;
      if (P.length) acc.push(acc[acc.length - 1] + ang / n);
      P.push([a[0] * fa + b[0] * fb, a[1] * fa + b[1] * fb, a[2] * fa + b[2] * fb]);
    }
  }
  return { P, acc, len: acc[acc.length - 1] };
});

// ------------------------------------------------------------------ timing
export function times(tl) {   // 18b: exported for the cold open (p-cold.js)
  const n = wordTime(tl, 16, 'ninety');
  return { n, fill: n + 0.05, full: n + 1.15, sat: n + 1.55, off: tl.scenes[17].start - 0.45 };   // eases off as the turn home starts
}
/** Overall brightening 0..1: rises on "ninety-nine", eases off on the way home. */
const glowK = (v, tm) => L.ease.inOutCubic(L.prog(v.gt, tm.n - 0.15, 0.9)) * (1 - L.ease.inCubic(L.prog(v.gt, tm.off, 0.7)));

function drawNetwork(c, v, tm) {
  const k = glowK(v, tm) * cableZoomK(v) * spinFade(v);
  if (k <= 0.002) return;
  const B = viewOf(v);
  const cx = v.wx(0), cy = v.wy(0), r = v.ws(R_EARTH);
  const scr = (p) => [cx + r * (p[0] * B.e[0] + p[1] * B.e[1]), cy - r * (p[0] * B.n[0] + p[1] * B.n[1] + p[2] * B.n[2]), p[0] * B.c[0] + p[1] * B.c[1] + p[2] * B.c[2]];
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineJoin = 'round'; c.lineCap = 'round';
  GEOM.forEach((g, ci) => {
    // the wave of light: each route lights up in turn (40 ms apart), with a brief over-bright flash
    const lt = v.gt - (tm.n - 0.1 + (ci % 18) * 0.04 + (ci >= 18 ? 0.02 : 0));
    const ck = k * L.ease.outCubic(L.clamp(lt / 0.5));
    if (ck <= 0) return;
    const flash = 1 + 0.9 * Math.exp(-Math.pow((lt - 0.35) / 0.25, 2));
    const S = g.P.map(scr);
    c.beginPath();
    let pen = false;
    for (const [x, y, z] of S) {
      if (z < 0.02) { pen = false; continue; }
      if (pen) c.lineTo(x, y); else { c.moveTo(x, y); pen = true; }
    }
    c.strokeStyle = L.rgba(ACCENT, Math.min(1, 0.2 * ck * flash));
    c.lineWidth = 9;
    c.stroke();
    c.strokeStyle = L.rgba(HOT, Math.min(1, 0.45 * ck * flash));
    c.lineWidth = 2;
    c.stroke();
    // thicker, faster pulses (both directions)
    const n = Math.max(2, Math.round(g.len * 7));
    for (let m = 0; m < n; m++) {
      const dir = (ci + m) % 2 ? 1 : -1;
      const s = (((m + 0.5) / n + dir * v.gt * 0.11 / Math.max(0.3, g.len)) % 1 + 1) % 1;
      const a = s * g.len;
      let q = 1; while (q < g.acc.length - 1 && g.acc[q] < a) q++;
      const f = (a - g.acc[q - 1]) / Math.max(1e-9, g.acc[q] - g.acc[q - 1]);
      const z = L.lerp(S[q - 1][2], S[q][2], f);
      if (z < 0.05) continue;
      const x = L.lerp(S[q - 1][0], S[q][0], f), y = L.lerp(S[q - 1][1], S[q][1], f);
      const lim = L.clamp(z * 4);
      L.lightBlob(c, x, y, 15, ACCENT, 0.6 * ck * lim);
      c.fillStyle = L.rgba([240, 248, 255], 0.95 * ck * lim);
      c.beginPath(); c.arc(x, y, 2.8, 0, TAU); c.fill();
    }
  });
  c.restore();
}

// ------------------------------------------------------------------ the 99% ring gauge
export function drawGauge(c, v, tm) {   // 18b: exported for the cold open (p-cold.js)
  const k = v.k * L.ease.outCubic(L.prog(v.gt, tm.n - 0.3, 0.5));
  if (k <= 0.002) return;
  const d = globeDisc(v);
  const r = d.r + 22;
  if (r < 60) return;
  const a0 = -Math.PI / 2 + 0.5;   // starts at about 1 o'clock, so the open 1% sits clear of the label
  const f = 0.99 * L.ease.inOutCubic(L.prog(v.gt, tm.fill, tm.full - tm.fill));
  c.save();
  // track with 100 fine ticks
  c.strokeStyle = `rgba(150,190,240,${0.16 * k})`;
  c.lineWidth = 1.2;
  c.beginPath(); c.arc(d.x, d.y, Math.max(0, r), 0, TAU); c.stroke();
  c.beginPath();
  for (let i = 0; i < 100; i++) {
    const a = a0 + (i / 100) * TAU, l = i % 10 === 0 ? 10 : 5;
    c.moveTo(d.x + Math.cos(a) * (r + 7), d.y + Math.sin(a) * (r + 7));
    c.lineTo(d.x + Math.cos(a) * (r + 7 + l), d.y + Math.sin(a) * (r + 7 + l));
  }
  c.strokeStyle = `rgba(170,200,240,${0.2 * k})`;
  c.lineWidth = 1.4;
  c.stroke();
  if (f > 0) {
    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round';
    c.strokeStyle = L.rgba(ACCENT, 0.32 * k);
    c.lineWidth = 10;
    c.beginPath(); c.arc(d.x, d.y, Math.max(0, r), a0, a0 + f * TAU); c.stroke();
    c.strokeStyle = L.rgba([175, 218, 255], 0.95 * k);
    c.lineWidth = 3;
    c.beginPath(); c.arc(d.x, d.y, Math.max(0, r), a0, a0 + f * TAU); c.stroke();
    const ha = a0 + f * TAU, hx = d.x + Math.cos(ha) * r, hy = d.y + Math.sin(ha) * r;
    const hk = k * (1 - L.prog(v.gt, tm.full, 0.4));
    L.lightBlob(c, hx, hy, 40, ACCENT, 0.7 * hk);
    L.lightBlob(c, hx, hy, 11, [235, 245, 255], 0.9 * hk);
    // completion: one soft pulse ring outward
    const q = L.prog(v.gt, tm.full, 1.0);
    if (q > 0 && q < 1) {
      const e = L.ease.outCubic(q);
      c.strokeStyle = L.rgba(ACCENT, 0.45 * (1 - e) * k);
      c.lineWidth = 2 + 6 * (1 - e);
      c.beginPath(); c.arc(d.x, d.y, Math.max(0, r * (1 + 0.12 * e)), 0, TAU); c.stroke();
    }
  }
  // the open 1%: a grey notch just before 1 o'clock, with one tiny satellite riding just outside it (beat 11's satellites)
  const sk = k * L.ease.outCubic(L.prog(v.gt, tm.sat, 0.5));
  if (sk > 0) {
    c.globalCompositeOperation = 'source-over';
    const ga = a0 + 0.99 * TAU;
    c.strokeStyle = `rgba(150,160,175,${0.9 * sk})`;
    c.lineWidth = 3;
    c.lineCap = 'butt';
    c.beginPath(); c.arc(d.x, d.y, Math.max(0, r), ga + 0.008, a0 + TAU - 0.003); c.stroke();
    const sa = ga + 0.005 * TAU + 0.004 * Math.sin(v.gt * 1.3), sr = r + 22 + (1 - sk) * 8;
    const sx = d.x + Math.cos(sa) * sr, sy = d.y + Math.sin(sa) * sr;
    c.save();
    c.translate(sx, sy);
    c.rotate(sa + Math.PI / 2);
    c.fillStyle = `rgba(200,208,220,${0.95 * sk})`;
    c.fillRect(-2.5, -2.5, 5, 5);
    c.fillStyle = `rgba(120,150,200,${0.9 * sk})`;
    c.fillRect(-11, -1.6, 6.5, 3.2);
    c.fillRect(4.5, -1.6, 6.5, 3.2);
    c.restore();
  }
  c.restore();
}

/** House-style label stack (number, unit line beneath) top-left; the camera keeps the ring's top clear of it, and a soft
 *  dark backing keeps it off the atmosphere glow. */
function sideLabel(c, k) {
  if (k <= 0) return;
  c.save();
  const a = L.clamp(k * 1.4);
  const bg = c.createRadialGradient(320, 420, 20, 320, 420, 300);
  bg.addColorStop(0, `rgba(2,4,9,${0.5 * a})`);
  bg.addColorStop(1, 'rgba(2,4,9,0)');
  c.fillStyle = bg;
  c.fillRect(0, 120, 760, 600);
  L.bigLabel(c, { x: 96, y: 440, big: '99%+', small: 'of traffic between continents', k, accent: ACCENT });
  c.restore();
}

export default {
  beat: 16,
  chapter: { num: '16', title: 'The backbone', sub: 'Cables vs satellites' },
  captions: true,
  layer: 3,
  chapterUntil() { return 1.15; },   // the label takes the top-left as the ring fills
  // beat starts 69.51: "ninety-nine" 70.95 (t 1.44) · ring full 72.10 (2.59) · satellite notch 72.50 (2.99)
  cues(d) {
    return [
      { t: 0.85, name: 'riser', gain: 0.16, pitch: 1.0 },
      { t: 1.38, name: 'swell', gain: 0.3, pitch: 0.9 },
      { t: 1.44, name: 'shimmer', gain: 0.24, pitch: 1.05 },
      { t: 1.5, name: 'tick', gain: 0.2, pitch: 1.3 },
      { t: 2.59, name: 'bloom', gain: 0.32, pitch: 1.0 },
      { t: 2.6, name: 'ping', gain: 0.24, pitch: 1.2 },
      { t: 2.99, name: 'blip', gain: 0.14, pitch: 0.8 },
    ];
  },
  drawWorld(ctx, v) {
    const tm = times(v.tl);
    if (v.gt < tm.n - 0.3 || v.gt > tm.off + 0.8) return;
    drawNetwork(ctx, v, tm);
  },
  drawOverlay(ctx, v) {
    const tm = times(v.tl);
    drawGauge(ctx, v, tm);
    const lk = L.prog(v.gt, tm.n, 0.55) * v.k;
    sideLabel(ctx, lk);
  },
};
