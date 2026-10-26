// 14c beat 8 (bridges; 14b beat 11) — "You could have walked from France to England, | or from Siberia to Alaska."
// Two self-drawing walking routes over the dry ice-age shelves, each a dotted trail that a small glowing walker
// lays down step by step, with an origin ring and a destination ring that pulses on arrival:
//   * Paris to London across the dry Channel (the Dover Strait is ≤ 60 m deep, so at −120 m it is land);
//   * Chukotka to Alaska across Beringia, the land bridge people and animals really crossed.
// Labels (lower left, clear of the ice): "On foot" / "France to England", then "Siberia to Alaska"; the destination
// pin gets its name (ENGLAND / ALASKA) as the walker arrives.
// The trails stay faintly on the globe into beat 12 and fade as the sea returns.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, BEAT, SAND, project, viewOf, worldOf, plate } from '../env.js';
import { drawPin } from './s08-shanghai-coastlines.js';

const { W } = L;
const ph = (tl, i, j, edge = 'start') => tl.lines[i].phrases[j][edge];
const WALK = [250, 246, 236];

// routes (lat, lon), resampled to even spacing on the sphere
const ROUTES = [
  { name: 'channel', dest: 'ENGLAND', destSide: 'left', orig: 'FRANCE', origSide: 'right', pts: [[48.86, 2.35], [49.6, 2.2], [50.35, 1.85], [50.95, 1.55], [51.25, 1.0], [51.45, 0.35], [51.51, -0.13]] },
  { name: 'bering', dest: 'ALASKA', destSide: 'right', orig: 'SIBERIA', origSide: 'left', pts: [[64.75, 177.5], [64.55, -177.5], [64.2, -173.0], [63.9, -169.8], [64.2, -166.6], [64.9, -163.4], [65.6, -160.0], [66.0, -156.0]] },
];
const DEG = Math.PI / 180;
function gdist(a, b) {
  const p1 = a[0] * DEG, p2 = b[0] * DEG, dl = (b[1] - a[1]) * DEG;
  return Math.acos(L.clamp(Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl), -1, 1));
}
for (const R of ROUTES) {
  // smooth (Catmull-Rom in lat/lon, with lon unwrapped) then accumulate arc length
  const P = R.pts.map(([a, b], i) => [a, b]);
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
  for (let i = 1; i < fine.length; i++) cum.push(cum[i - 1] + gdist(fine[i - 1], fine[i]));
  R.fine = fine; R.cum = cum; R.len = cum[cum.length - 1];
}
function along(R, s) {
  const d = L.clamp(s) * R.len, { cum, fine } = R;
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
  const k = (d - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
  return [L.lerp(fine[lo][0], fine[hi][0], k), L.lerp(fine[lo][1], fine[hi][1], k)];
}

// ------------------------------------------------------------------ timing
function times(tl) {
  return [
    // Channel: walk 49.33-50.63, the finished path holds ~0.7 s before the camera leaves (51.34)
    { start: ph(tl, BEAT.bridges, 0) + 0.35, dur: 1.3, pin: ph(tl, BEAT.bridges, 0) + 0.05, lbl: ph(tl, BEAT.bridges, 0) + 0.2 },
    // Beringia: the camera slows onto the strait by ~53.0; walk 52.34-53.54, held ~0.8 s into beat 12's pull-back
    // 14b fix: the camera lands by ~+1.2 (camera.js 'bering', travel 1.4); the walk arrives ~+1.9, so ALASKA reads ~1.6 s
    { start: ph(tl, BEAT.bridges, 1) + 0.95, dur: 0.95, pin: ph(tl, BEAT.bridges, 1) + 0.55, lbl: ph(tl, BEAT.bridges, 1) + 0.15 },
  ];
}
/** Fade-out of the trails as the sea returns in beat 12. */
const fadeOut = (v) => 1 - L.ease.inCubic(L.prog(v.gt, v.tl.scenes[BEAT.notFixed].start + 0.55, 0.8));
/** 0 inside the SEA LEVEL readout zone (top right), 1 clear of it, feathered. */
const hudClear = (x, y) => 1 - L.clamp((360 - y) / 60) * L.clamp((x - 640) / 60);

function drawRoute(c, v, R, tm) {
  const prog = L.ease.inOutCubic(L.prog(v.gt, tm.start, tm.dur));
  const appear = L.prog(v.gt, tm.pin, 0.35);
  const fo = fadeOut(v);
  if (appear <= 0 || fo <= 0) return;
  const vw = viewOf(v);
  const pt = (la, lo) => { const p = worldOf(vw, la, lo); return { x: v.wx(p.x), y: v.wy(p.y), z: p.z }; };
  const a = pt(...R.fine[0]), b = pt(...R.fine[R.fine.length - 1]);
  if (a.z < 0.05 && b.z < 0.05) return;
  const pxLen = Math.hypot(b.x - a.x, b.y - a.y);
  if (pxLen < 6) return;   // LOD: far away the trail is sub-pixel
  c.save();
  c.globalAlpha = fo;
  // a faint guide of the whole route (where the walker is going)
  c.setLineDash([2, 7]);
  c.lineCap = 'round';
  c.strokeStyle = L.rgba(WALK, 0.3 * appear);
  c.lineWidth = 2.4;
  c.beginPath();
  R.fine.forEach(([la, lo], i) => { const p = pt(la, lo); i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); });
  c.stroke();
  c.setLineDash([]);
  // the trail walked so far: a soft glowing line under the footsteps
  if (prog > 0) {
    c.save();
    c.beginPath();
    const nT = 60;
    let pen = false;
    for (let i = 0; i <= nT; i++) {
      const p = pt(...along(R, prog * i / nT));
      if (p.z < 0.05) { pen = false; continue; }
      if (pen) c.lineTo(p.x, p.y); else { c.moveTo(p.x, p.y); pen = true; }
    }
    // a dark halo so the path reads on bright sand, then a glowing accent band
    c.strokeStyle = 'rgba(2,10,18,0.45)';
    c.lineWidth = 16;
    c.stroke();
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = L.rgba(ACCENT, 0.3);
    c.lineWidth = 9;
    c.stroke();
    c.strokeStyle = L.rgba(ACCENT, 0.5);
    c.lineWidth = 3;
    c.stroke();
    c.restore();
  }
  // footsteps: evenly spaced dots laid down behind the walker (alternating left/right like real steps)
  const nSteps = Math.max(10, Math.min(60, Math.round(pxLen / 13)));
  const cut = prog * nSteps;
  for (let i = 0; i <= nSteps; i++) {
    if (i > cut) break;
    const s = i / nSteps;
    const [la, lo] = along(R, s);
    const [la2, lo2] = along(R, Math.min(1, s + 0.005));
    const p = pt(la, lo), q = pt(la2, lo2);
    if (p.z < 0.05) continue;
    const dx = q.x - p.x, dy = q.y - p.y, h = Math.hypot(dx, dy) || 1;
    const side = (i % 2 ? 1 : -1) * 4.2;
    const age = L.clamp(cut - i);                        // fresh steps are brighter
    c.fillStyle = L.rgba(L.mix(WALK, ACCENT, 0.35), 0.88 + 0.12 * (1 - age));
    c.beginPath();
    c.arc(p.x - dy / h * side, p.y + dx / h * side, Math.max(0, 4 * L.clamp((cut - i) * 2)), 0, Math.PI * 2);
    c.fill();
  }
  // origin pin and destination ring
  drawPin(c, a.x, a.y, appear * L.clamp(a.z * 5) * hudClear(a.x, a.y), -1, WALK);
  const arrive = L.prog(v.gt, tm.start + tm.dur - 0.1, 1.0);
  drawPin(c, b.x, b.y, L.clamp(appear * 0.6 + arrive) * L.clamp(b.z * 5) * hudClear(b.x, b.y), arrive, ACCENT);
  // the origin's name with its pin, the destination's once the walker arrives; each set on the side away from the
  // trail so the trail never runs under the letters
  const name = (txt, p, side, k) => {
    if (k <= 0.01) return;
    c.save();
    c.globalAlpha *= k;
    c.font = L.font(26, 700, L.FONT.body);
    c.textBaseline = 'middle';
    c.shadowColor = 'rgba(0,6,14,0.9)';
    c.shadowBlur = 10;
    c.fillStyle = 'rgba(244,250,250,0.98)';
    const dx = (24 + (1 - k) * 10) * (side === 'left' ? -1 : 1);
    // never clipped by the frame: fade out as the name nears either side edge (camera moves between the routes)
    c.letterSpacing = '3px';
    const tw = c.measureText(txt).width;
    c.letterSpacing = '0px';
    const x0 = side === 'left' ? p.x + dx - tw : p.x + dx, x1 = x0 + tw;
    c.globalAlpha *= L.clamp((x0 - 24) / 50) * L.clamp((W - 24 - x1) / 50);
    L.trackedText(c, txt, p.x + dx, p.y - 2, 3, side === 'left' ? 'right' : 'left');
    c.restore();
  };
  name(R.orig, a, R.origSide, L.ease.outCubic(L.prog(v.gt, tm.pin + 0.15, 0.4)) * L.clamp(a.z * 5) * hudClear(a.x, a.y));
  name(R.dest, b, R.destSide, L.ease.outCubic(L.clamp(arrive * 1.6)) * L.clamp(b.z * 5) * hudClear(b.x, b.y));
  // the walker: a small glowing dot at the head of the trail
  if (prog > 0 && prog < 1) {
    const [la, lo] = along(R, prog);
    const w = pt(la, lo);
    if (w.z > 0.05) {
      // a short bright comet trail behind the walker
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (let j = 1; j <= 6; j++) {
        const q = pt(...along(R, Math.max(0, prog - j * 0.018)));
        if (q.z < 0.05) continue;
        c.fillStyle = L.rgba(ACCENT, 0.32 * (1 - j / 7));
        c.beginPath(); c.arc(q.x, q.y, Math.max(0, 6.5 - j * 0.7), 0, Math.PI * 2); c.fill();
      }
      c.restore();
      L.lightBlob(c, w.x, w.y, 40, ACCENT, 0.7);
      c.fillStyle = 'rgba(2,10,18,0.5)';
      c.beginPath(); c.arc(w.x, w.y, 9.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.99)';
      c.beginPath(); c.arc(w.x, w.y, 7, 0, Math.PI * 2); c.fill();
    }
  }
  c.restore();
}

export default {
  beat: 8,
  chapter: { num: '08', title: 'Land bridges', sub: 'across the dry sea floor' },
  captions: true,
  layer: 2,
  // beat starts 48.83; France walk 49.33-50.63; Siberia pin 52.09, walk 52.34-53.54
  cues(d) {
    const out = [
      { t: 0.55, name: 'blip', gain: 0.2, pitch: 1.2 },
      { t: 1.75, name: 'ping', gain: 0.24, pitch: 1.25 },
  // 14c: phrase-2 cues moved with the shorter phrase gap (phrase 2 starts 2.41 s into the beat; 14b 2.71)
      { t: 3.0, name: 'blip', gain: 0.2, pitch: 1.0 },
      { t: 4.3, name: 'ping', gain: 0.24, pitch: 1.05 },
    ];
    // soft footsteps under each walk
    for (let i = 0; i < 6; i++) out.push({ t: 0.6 + i * 0.22, name: 'tick', gain: 0.07, pitch: 1.5 + (i % 2) * 0.15 });
    for (let i = 0; i < 6; i++) out.push({ t: 3.43 + i * 0.16, name: 'tick', gain: 0.07, pitch: 1.4 + (i % 2) * 0.15 });
    return out;
  },
  drawWorld(ctx, v) {
    const T = times(v.tl);
    if (v.gt < T[0].pin || fadeOut(v) <= 0) return;
    ROUTES.forEach((R, i) => drawRoute(ctx, v, R, T[i]));
  },
  drawOverlay(ctx, v) {
    const T = times(v.tl);
    const LX = 96, LY = 1225;   // lower left, below Paris (y ≈ 1000) so the route's start is never under the plate
    // 14b: the label is gone by the end of the beat (not riding the engine's overlay fade into beat 12)
    const k = Math.min(v.k, L.prog(v.gt, T[0].lbl, 0.6), 1 - L.ease.inCubic(L.prog(v.t, v.d - 0.4, 0.4)));
    if (k <= 0) return;
    // big "On foot" holds; the small line dips out during the Arctic crossing (France/England gone by ~51.6) and
    // Siberia/Alaska comes in once the camera is over the dark Bering area
    // 14b fix: the small line swaps in place on 'or from Siberia…' (out 0.25 s, then in 0.4 s): never a blank row
    const p1 = ph(v.tl, BEAT.bridges, 1);
    const out0 = L.prog(v.gt, p1 - 0.1, 0.25);
    const in1 = L.prog(v.gt, T[1].lbl, 0.4);
    // 14b: one opaque plate behind the big label and its small line (over the map)
    ctx.save();
    ctx.font = L.font(120, 800, L.FONT.display);
    const wBig = ctx.measureText('On foot').width;
    ctx.font = L.font(30, 600, L.FONT.body);
    const wSmall = Math.max(...['from France to England', 'from Siberia to Alaska'].map((s) => ctx.measureText(s.toUpperCase()).width + 3 * s.length));
    ctx.restore();
    plate(ctx, LX - 28, LY - 120 * 0.92 - 48, Math.max(wBig, wSmall) + 56, 120 * 0.92 + 48 + 52 + 32, k);
    L.bigLabel(ctx, { x: LX, y: LY, big: 'On foot', small: null, k, accent: ACCENT });
    const e = L.ease.outCubic(L.clamp(k));
    const lines = ['from France to England', 'from Siberia to Alaska'];
    ctx.save();
    ctx.font = L.font(30, 600, L.FONT.body);
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    lines.forEach((s, i) => {
      const a = i === 0 ? 1 - L.ease.inCubic(out0) : L.ease.outCubic(in1);
      if (a <= 0) return;
      ctx.globalAlpha = L.clamp(k * 1.4) * a;
      ctx.fillStyle = 'rgba(205,215,230,0.95)';
      const dy = i === 0 ? -10 * out0 : 10 * (1 - a);
      L.trackedText(ctx, s.toUpperCase(), LX, LY + 52 + (1 - e) * 18 + dy, 3, 'left');
    });
    ctx.restore();
  },
};
void SAND; void project;
