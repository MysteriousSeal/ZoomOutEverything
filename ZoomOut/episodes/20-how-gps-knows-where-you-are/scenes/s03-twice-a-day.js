// Beat 3 — "Each one laps the planet about twice a day."
// The one-day time-lapse (env spins the globe and moves the 31 satellites; this scene reads the same clocks):
//   · a gold 24-hour dial ring around the planet, filled by hoursAt(), with a hand and a small hour readout;
//   · satellite B traced with a fading trail and a highlight ring, so one satellite's two laps are easy to follow;
//   · New York (the phone) as a small blue dot riding the turning Earth (homeWorld): the planet turns once;
//   · a lap counter that rolls 1 lap -> 2 laps exactly when lapsAt() crosses each whole orbit.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, CLOCK, DOT, R_EARTH, SAT_INK, beatStart, homeWorld, hoursAt, lapsAt, satsAt, timeLapseWindow } from '../env.js';

const TAU = Math.PI * 2;
const TRACE = 28;              // satellite B (heroes are 27..30)
const DAY = 23.93;
const RING = 1.42;             // dial radius in Earth radii
// The lap counter is driven by env's clock, not by fixed times: lapTimes() finds the instants when lapsAt() crosses
// 1 and 2 (bisection), so the digit rolls, the pings and the hold all follow env's time-lapse window wherever it sits.
const lapCache = new WeakMap();
function lapTimes(tl) {
  if (lapCache.has(tl)) return lapCache.get(tl);
  const w = timeLapseWindow(tl);
  const cross = (n) => {
    let a = w.start, b = w.end;
    if (lapsAt(b, tl) < n - 1e-6) return b;
    for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (lapsAt(m, tl) < n - 1e-6) a = m; else b = m; }
    return b;
  };
  const r = { lap1: cross(1), lap2: cross(2), start: w.start, end: w.end };
  lapCache.set(tl, r);
  return r;
}
// the timeline, for the sound cues (cues(d) gets no timeline; the engine loads the same file)
const TL = await (await fetch(new URL('../build/timeline.json', import.meta.url))).json();
const HOLD = 1.6;              // "2 laps" stays readable at least this long after it lands

/** World-layer visibility: through beat 3, gone by the dive into satellite B. */
const worldK = (v) => L.ease.outCubic(L.prog(v.t, -0.1, 0.6)) * (1 - L.ease.inCubic(L.prog(v.t, v.d - 0.15, 0.45)));

function drawTrail(c, v, k) {
  const gt = v.gt, tl = v.tl;
  const N = 30, span = 0.85;
  let prev = null;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  for (let j = N; j >= 0; j--) {
    const s = satsAt(gt - (j / N) * span, tl)[TRACE];
    const P = { x: v.wx(s.x), y: v.wy(s.y), front: s.front };
    if (prev && P.front && prev.front) {
      const a = Math.pow(1 - j / N, 1.6);
      c.strokeStyle = L.rgba(ACCENT, 0.75 * a * k);
      c.lineWidth = 1 + 3.2 * a;
      c.beginPath(); c.moveTo(prev.x, prev.y); c.lineTo(P.x, P.y); c.stroke();
    }
    prev = P;
  }
  c.restore();
  const s = satsAt(gt, tl)[TRACE];
  if (!s.front) return;
  const X = v.wx(s.x), Y = v.wy(s.y);
  const pulse = 0.5 + 0.5 * Math.sin(gt * 5);
  c.save();
  c.strokeStyle = L.rgba(ACCENT, (0.65 + 0.25 * pulse) * k);
  c.lineWidth = 2;
  c.beginPath(); c.arc(X, Y, Math.max(0, 15 + 3 * pulse), 0, TAU); c.stroke();
  c.restore();
  L.lightBlob(c, X, Y, 34, ACCENT, 0.35 * k);
}

function drawDial(c, v, k) {
  const h = hoursAt(v.gt, v.tl);
  const cx = v.wx(0), cy = v.wy(R_EARTH), r = (RING * R_EARTH) / v.cam.mpp;
  const draw = L.ease.inOutCubic(L.prog(v.t, 0.05, 0.9));
  const a0 = -Math.PI / 2, aH = a0 + (h / DAY) * TAU * draw;
  c.save();
  c.globalAlpha = k;
  // base ring + 24 hour ticks (every 6 h longer)
  c.strokeStyle = L.rgba(CLOCK, 0.2);
  c.lineWidth = 1.5;
  c.beginPath(); c.arc(cx, cy, Math.max(0, r), a0, a0 + TAU * draw); c.stroke();
  for (let i = 0; i < 24; i++) {
    const a = a0 + (i / 24) * TAU;
    if ((i / 24) > draw) break;
    const major = i % 6 === 0, passed = i <= h;
    const r0 = r - (major ? 9 : 4), r1 = r + (major ? 9 : 4);
    c.strokeStyle = L.rgba(CLOCK, passed ? (major ? 0.95 : 0.6) : (major ? 0.45 : 0.25));
    c.lineWidth = major ? 2.5 : 1.5;
    c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.stroke();
  }
  // elapsed arc + hand
  if (aH > a0 + 0.002) {
    c.strokeStyle = L.rgba(CLOCK, 0.95);
    c.lineWidth = 3.5;
    c.lineCap = 'round';
    c.beginPath(); c.arc(cx, cy, Math.max(0, r), a0, aH); c.stroke();
  }
  const hx = cx + Math.cos(aH) * r, hy = cy + Math.sin(aH) * r;
  L.lightBlob(c, hx, hy, 26, CLOCK, 0.6);
  c.fillStyle = L.rgba([255, 244, 220]);
  c.beginPath(); c.arc(hx, hy, 5, 0, TAU); c.fill();
  // the day readout, fixed under the dial: elapsed hours of one day
  const hh = Math.min(24, Math.floor(h + 0.08));
  const ry = cy + r + 52;
  c.textBaseline = 'alphabetic';
  c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 10;
  c.font = L.font(46, 700, L.FONT.din);
  const main = `${hh} H`;
  const mw = c.measureText(main).width;
  c.font = L.font(26, 700, L.FONT.din);
  const sub = '  /  24 H';
  const sw = c.measureText(sub).width;
  const x0 = cx - (mw + sw) / 2;
  c.textAlign = 'left';
  c.fillStyle = L.rgba(CLOCK, 0.55);
  c.fillText(sub, x0 + mw, ry);
  c.font = L.font(46, 700, L.FONT.din);
  c.fillStyle = L.rgba(CLOCK);
  c.fillText(main, x0, ry);
  c.restore();
}

function drawHome(c, v, k) {
  const w = timeLapseWindow(v.tl);
  if (v.gt < w.start - 0.5 || v.gt > w.end + 1) return;
  const p = homeWorld(v.gt, v.tl);
  if (p.z < -1e4) return;                        // on the far side of the planet
  const X = v.wx(p.x), Y = v.wy(p.y);
  const ph = (v.gt * 0.9) % 1;
  c.save();
  c.globalAlpha = k;
  c.strokeStyle = L.rgba(DOT, 0.6 * (1 - ph));
  c.lineWidth = 1.5;
  c.beginPath(); c.arc(X, Y, Math.max(0, 5 + 14 * ph), 0, TAU); c.stroke();
  c.fillStyle = '#fff';
  c.beginPath(); c.arc(X, Y, 5, 0, TAU); c.fill();
  c.fillStyle = L.rgba(DOT);
  c.beginPath(); c.arc(X, Y, 3.6, 0, TAU); c.fill();
  c.restore();
}

/** The lap counter: 0 -> 1 lap -> 2 laps, each digit rolling over exactly when env's traced orbit closes. */
function lapsAlpha(v) {
  const lt = lapTimes(v.tl), b0 = beatStart(v.tl, 3), b1 = beatStart(v.tl, 4);
  const kin = L.ease.outCubic(L.prog(v.gt, b0 + 0.22, 0.4));   // after s02's count has cleared the same spot
  // hold "2 laps" ≥ HOLD s: it may run into the start of beat 4's camera travel, up to where the engine stops
  // drawing this overlay (v.k ≈ 0 at end + 0.25 s)
  const out0 = L.clamp(lt.lap2 + HOLD, b1 - 0.1, b1);
  return Math.min(kin, 1 - L.ease.inCubic(L.prog(v.gt, out0, 0.24)));
}
function drawLaps(c, v) {
  const k = lapsAlpha(v);
  if (k <= 0.001) return;
  const lt = lapTimes(v.tl), b0 = beatStart(v.tl, 3);
  const e = L.ease.outCubic(L.clamp(L.prog(v.gt, b0 + 0.22, 0.5)));
  const x = 72, y = 566, size = 140;
  // the digit rolls over 0.4 s at each whole lap (a lap that closed before the counter could be read is not rolled)
  const roll = (tc) => (tc < b0 + 0.35 ? 1 : L.ease.inOutCubic(L.prog(v.gt, tc - 0.12, 0.4)));
  const r1 = roll(lt.lap1), r2 = roll(lt.lap2);
  const digit = r1 < 1 ? [0, 1, r1] : [1, 2, r2];
  const shown = r1 < 0.5 ? 0 : r2 < 0.5 ? 1 : 2;
  c.save();
  c.globalAlpha = k;
  // soft backing
  c.save();
  c.translate(x + 260, y - 40); c.scale(380, 170);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, 'rgba(3,5,12,0.55)'); g.addColorStop(1, 'rgba(3,5,12,0)');
  c.fillStyle = g; c.fillRect(-1, -1, 2, 2);
  c.restore();
  c.fillStyle = L.rgba(ACCENT, 0.9);
  c.fillRect(x, y - size * 0.92 - 26, 90 * e, 4);
  c.font = L.font(size, 800, L.FONT.display);
  c.textBaseline = 'alphabetic';
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 18;
  c.fillStyle = L.rgba(ACCENT);
  const dw = c.measureText('2').width;
  // rolling digit, masked to its own line
  c.save();
  c.beginPath(); c.rect(x - 10, y - size * 0.82, dw + 20, size * 0.92); c.clip();
  const dy = digit[2] * size * 0.95;
  c.fillText(String(digit[0]), x, y + (1 - e) * 30 - dy);
  c.fillText(String(digit[1]), x, y + (1 - e) * 30 - dy + size * 0.95);
  c.restore();
  c.font = L.font(size * 0.62, 700, L.FONT.display);
  c.fillText(shown === 1 ? 'lap' : 'laps', x + dw + 22, y + (1 - e) * 30);
  // flash on each completed lap
  for (const rr of [r1, r2]) if (rr > 0 && rr < 1) L.lightBlob(c, x + dw / 2, y - size * 0.35, 120, ACCENT, 0.4 * Math.sin(Math.PI * rr));
  c.shadowBlur = 8;
  c.font = L.font(30, 600, L.FONT.body);
  c.fillStyle = 'rgba(205,215,230,0.95)';
  L.trackedText(c, 'ONE ORBIT = 11 H 58 MIN', x, y + 52 + (1 - e) * 16, 3, 'left');
  c.restore();
}

export default {
  beat: 3,
  chapter: { num: '03', title: 'Twice a day', sub: 'one day, sped up' },
  captions: true,
  layer: 1,
  cues(d) {
    const lt = lapTimes(TL), b0 = beatStart(TL, 3);
    const q = [
      { t: 0.05, name: 'swish', gain: 0.14, pitch: 1.2 },         // the dial draws on
      { t: lt.lap2 - b0, name: 'ping', gain: 0.3, pitch: 1.5 },   // lap 2 ("twice a day")
      { t: lt.lap2 - b0 + 0.02, name: 'bloom', gain: 0.22, pitch: 1.0 },
      { t: Math.min(d - 0.25, lt.end - b0), name: 'tick', gain: 0.14, pitch: 1.4 },   // 24 h: the day closes
    ];
    if (lt.lap1 >= b0 + 0.35) q.push({ t: lt.lap1 - b0, name: 'ping', gain: 0.24, pitch: 1.2 });   // lap 1 (if seen)
    return q;
  },
  drawWorld(ctx, v) {
    if (v.cam.mpp < 8e3) return;                 // planet scale only
    // New York rides the turning Earth for the whole time-lapse (from beat 2 on)
    const w = timeLapseWindow(v.tl);
    const hk = L.ease.outCubic(L.prog(v.gt, w.start, 0.6)) * (1 - L.ease.inCubic(L.prog(v.gt, w.end + 0.1, 0.4)));
    if (hk > 0) drawHome(ctx, v, hk);
    const k = worldK(v);
    if (k <= 0) return;
    drawDial(ctx, v, k);
    drawTrail(ctx, v, k);
    void SAT_INK;
  },
  drawOverlay(ctx, v) {
    drawLaps(ctx, v);
  },
};
