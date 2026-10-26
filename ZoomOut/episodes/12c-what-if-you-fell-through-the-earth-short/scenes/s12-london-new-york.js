// Beat 9 (12c) — "A straight tunnel from London to New York? | Also about forty-two minutes."
// (12c folds 12b's "any two cities" beat into this one.) The cut-away closes and the old tunnel recedes while the
// camera pushes in and the real globe turns to the North Atlantic; a straight tunnel draws itself from London (right)
// to New York (left) under the ocean, the two cities pop in and get their names over the real coastlines, and one quiet line under the straight tunnel says how
// shallow it is: 5,400 km long, about 600 km deep at its middle. A capsule makes the trip from London
// to New York while the trip clock runs one last time and locks into "42 min" for the ending
// (the depth dimension lands mid-run, as the capsule passes the deepest point).
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, CITY_HALF_ANGLE, geoWorld, gravityTrain, CITY, BS, wordT } from '../camera.js';
import { RUN_C, COOL, drawTripClock, clockOwner, BEAT_CITIES } from './lib-clock.js';

const BEAT = BEAT_CITIES;
const B0 = BS[BEAT];
const T_CHORD = B0 + 0.85;                 // the tunnel draws in London -> New York once the cut-away has mostly closed
const T_LONDON = wordT(BEAT, 0, 'London');     // global: "London..."
const T_NY = wordT(BEAT, 0, 'New York');       // "...to New York?"
const T_DIM = (RUN_C.t0 + RUN_C.t1) / 2;       // the depth dimension + the length line: lands as the capsule passes the deepest point
const CHORD_KM = (2 * R_EARTH * Math.sin(CITY_HALF_ANGLE * Math.PI / 180)) / 1000;     // ≈ 5,394
const DEEP_KM = (R_EARTH * (1 - Math.cos(CITY_HALF_ANGLE * Math.PI / 180))) / 1000;   // ≈ 600

/** Screen-space chord line from A to B, drawn in to fraction e (0..1). */
function chordLine(ctx, v, A, B, e, a = 1, hero = 0) {
  if (e <= 0 || a <= 0) return;
  const x0 = v.wx(A.x), y0 = v.wy(A.y);
  const x1 = L.lerp(x0, v.wx(B.x), e), y1 = L.lerp(y0, v.wy(B.y), e);
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(8,4,4,0.5)';
  ctx.lineWidth = 6 + hero * 3;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.shadowColor = 'rgba(255,214,180,0.7)';
  ctx.shadowBlur = 10 + hero * 10;
  ctx.strokeStyle = `rgba(255,238,220,${0.82 + 0.18 * hero})`;
  ctx.lineWidth = 2.2 + hero * 1.3;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.restore();
  if (e < 1) L.lightBlob(ctx, x1, y1, 34, [255, 220, 180], 0.75 * a);
}

/** A city marker on the surface: dot + thin ring, popped in by s (0..1). */
function cityDot(ctx, x, y, s, a = 1) {
  if (s <= 0 || a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a * L.clamp(s * 2);
  L.lightBlob(ctx, x, y, 26, [255, 230, 200], 0.4);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, 4.5 * s), 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,244,230,0.85)';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, 10 * s), 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/** A capsule (cool white pill, like the faller) at trip fraction s along A -> B, with a short motion trail.
 *  opts: trail (trip fraction behind the head), glowR / glowA (head glow). */
function capsule(ctx, v, A, B, s, a = 1, sc = 1, opts = {}) {
  const { trail = 0.07, glowR = 34 * sc, glowA = 0.55 } = opts;
  if (a <= 0) return;
  const p = gravityTrain(A, B, s);
  const x = v.wx(p.x), y = v.wy(p.y);
  const ang = Math.atan2(v.wy(B.y) - v.wy(A.y), v.wx(B.x) - v.wx(A.x));
  // trail: where it was a moment ago (same chord), longer when fast
  const q = gravityTrain(A, B, Math.max(0, s - trail));
  const xq = v.wx(q.x), yq = v.wy(q.y);
  ctx.save();
  ctx.globalAlpha *= a;
  const len = Math.hypot(x - xq, y - yq);
  if (len > 2) {
    const g = ctx.createLinearGradient(x, y, xq, yq);
    g.addColorStop(0, L.rgba(COOL, 0.9)); g.addColorStop(1, L.rgba(COOL, 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = 4 * sc;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(xq, yq); ctx.stroke();
  }
  L.lightBlob(ctx, x, y, glowR, [170, 200, 255], glowA);
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(sc, sc);
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(190,215,255,0.95)';
  ctx.shadowBlur = 12;
  L.roundRect(ctx, -9, -3.6, 18, 7.2, 3.6);
  ctx.fill();
  ctx.restore();
}

/** Arrival ping (expanding ring) at screen (x, y), age in s since arrival. */
function arrivalPing(ctx, x, y, age, col = COOL) {
  if (age < -0.05 || age > 1.4) return;
  const a = Math.max(0, age);
  const f = Math.exp(-a * 2.6) * L.clamp((age + 0.05) / 0.05);
  L.lightBlob(ctx, x, y, 90, col, 0.6 * f);
  const p = L.ease.outCubic(L.clamp(a / 1.1));
  ctx.save();
  ctx.strokeStyle = L.rgba(col, 0.75 * (1 - p));
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, 8 + 60 * p), 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/** Name tag above a city: tracked caps, with a tiny tick down to the dot. */
function cityTag(ctx, x, y, name, k, align) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  ctx.save();
  ctx.globalAlpha *= L.clamp(k * 1.5);
  ctx.strokeStyle = 'rgba(235,240,250,0.6)';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(x, y - 16 - 30 * e); ctx.stroke();
  ctx.font = L.font(28, 700, L.FONT.body);
  ctx.fillStyle = 'rgba(244,246,252,0.97)';
  ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 12;
  ctx.textBaseline = 'alphabetic';
  const w = ctx.measureText(name).width + name.length * 4;
  L.trackedText(ctx, name, L.clamp(x, 40 + w / 2, 1040 - w / 2), Math.max(360, y - 58) + (1 - e) * 10, 4, align);
  ctx.restore();
}

const ends = (gt) => ({ L: geoWorld(...CITY.london, gt), N: geoWorld(...CITY.newYork, gt) });

export default {
  beat: BEAT,
  chapter: { num: '09', title: 'London to New York', sub: 'A straight tunnel under the Atlantic' },
  captions: true,
  chapterUntil() { return RUN_C.t1 - B0; },   // the card clears as the clock locks: '42 min' leads the end frame
  layer: 4,
  cues(d) {
    const b = B0;
    return [
      { t: 0.05, name: 'swell', gain: 0.25, pitch: 0.9 },
      { t: T_CHORD - b - 0.15, name: 'blip', gain: 0.2, pitch: 1.1 },
      { t: T_CHORD - b, name: 'swish', gain: 0.22, pitch: 1.2 },
      { t: T_LONDON - b, name: 'blip', gain: 0.28, pitch: 1.2 },
      { t: T_NY - b, name: 'blip', gain: 0.28, pitch: 1.0 },
      { t: T_LONDON + 0.3 - b, name: 'shimmer', gain: 0.2, pitch: 1.0 },
      { t: T_DIM - b, name: 'tick', gain: 0.25, pitch: 1.1 },
      { t: RUN_C.t0 - b - 0.35, name: 'count', gain: 0.16, pitch: 1.3 },
      { t: RUN_C.t0 - b, name: 'whoosh', gain: 0.32, pitch: 0.95 },
      { t: RUN_C.t1 - b - 0.45, name: 'riser', gain: 0.2, pitch: 1.0 },
      { t: RUN_C.t1 - b, name: 'impact', gain: 0.6, pitch: 0.9 },
      { t: RUN_C.t1 - b + 0.02, name: 'bloom', gain: 0.45, pitch: 0.9 },
      { t: RUN_C.t1 - b + 0.3, name: 'swell', gain: 0.3, pitch: 0.8 },
    ];
  },
  drawWorld(ctx, v) {
    const gt = v.gt;
    if (gt < T_CHORD - 0.3) return;
    // 12b f12b: the question beat: chord, dots, capsule and glow fade under its dim (nothing pokes out beside the card)
    const sQ = v.tl.scenes[BEAT + 1]?.start ?? Infinity;
    const qOut = 1 - L.ease.inOutCubic(L.prog(gt, sQ + 0.05, 0.3));
    if (qOut <= 0.001) return;
    ctx.save();
    ctx.globalAlpha *= qOut;
    const { L: LONDON, N: NEW_YORK } = ends(gt);
    const xL = v.wx(LONDON.x), yL = v.wy(LONDON.y), xN = v.wx(NEW_YORK.x), yN = v.wy(NEW_YORK.y);
    // the straight tunnel draws itself from London to New York, then brightens into the hero line
    const e = L.ease.inOutCubic(L.prog(gt, T_CHORD, 0.7));
    const hk = L.ease.inOutCubic(L.prog(gt, T_CHORD + 0.5, 0.8));
    chordLine(ctx, v, LONDON, NEW_YORK, e, 1, hk);
    cityDot(ctx, xL, yL, L.ease.outBack(L.prog(gt, T_CHORD - 0.15, 0.4), 2));
    cityDot(ctx, xN, yN, L.ease.outBack(L.prog(gt, T_CHORD + 0.55, 0.4), 2));
    // the capsule: fades in at London, rides, arrives in New York
    const ck = L.ease.outCubic(L.prog(gt, T_LONDON + 0.2, 0.5));
    const s = L.prog(gt, RUN_C.t0, RUN_C.t1 - RUN_C.t0);
    capsule(ctx, v, LONDON, NEW_YORK, s, ck, 1.45);
    arrivalPing(ctx, v.wx(NEW_YORK.x), v.wy(NEW_YORK.y), gt - RUN_C.t1);
    // a slow breathing glow on New York once arrived (secondary motion for the closing hold)
    const rest = L.prog(gt, RUN_C.t1 + 0.6, 0.8);
    if (rest > 0) L.lightBlob(ctx, v.wx(NEW_YORK.x), v.wy(NEW_YORK.y), 50, COOL, rest * (0.25 + 0.12 * Math.sin(gt * 2.4)));
    // 12b f12b: the closing hold: a soft glint keeps making the trip along the tunnel (slow-fast-slow, like the train),
    // so the hold before the question never sits still
    const ph = (gt - (RUN_C.t1 + 0.5)) / 2.0;
    if (ph > 0) {
      const f = ph % 1;
      const q = gravityTrain(LONDON, NEW_YORK, f);
      const a = Math.sin(Math.PI * f) * L.clamp(ph * 2);
      L.lightBlob(ctx, v.wx(q.x), v.wy(q.y), 38, [255, 228, 200], 0.85 * a);
    }
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    const gt = v.gt;
    // 12b: no longer the last beat, so the labels and the clock fade out with the overlay (v.k) as the question beat
    // starts, gone well before its card lands (the world layer, chord and capsule stay held behind the card)
    if (v.k <= 0.001) return;
    ctx.globalAlpha *= v.k;
    const { L: LONDON, N: NEW_YORK } = ends(gt);
    const xL = v.wx(LONDON.x), yL = v.wy(LONDON.y), xN = v.wx(NEW_YORK.x), yN = v.wy(NEW_YORK.y);
    cityTag(ctx, xL, yL, 'LONDON', L.prog(gt, T_LONDON, 0.55), 'center');
    cityTag(ctx, xN, yN, 'NEW YORK', L.prog(gt, T_NY, 0.55), 'center');
    // one quiet line under the straight tunnel
    const dk = L.prog(gt, T_DIM, 0.6);
    if (dk > 0) {
      const e = L.ease.outCubic(dk);
      ctx.save();
      ctx.globalAlpha *= L.clamp(dk * 1.6 - 0.2) * (1 - 0.4 * L.ease.inOutCubic(L.prog(gt, RUN_C.t1 + 0.1, 0.6)));
      ctx.font = L.font(25, 600, L.FONT.body);
      ctx.fillStyle = 'rgba(236,238,246,0.97)';
      ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 12;
      L.trackedText(ctx, `${L.fmt(Math.round(CHORD_KM / 100) * 100)} KM LONG  ·  ${L.fmt(Math.round(DEEP_KM / 50) * 50)} KM DEEP`, (xL + xN) / 2, (yL + yN) / 2 + 50 + (1 - e) * 8, 3, 'center');
      ctx.restore();
    }
    if (clockOwner(gt) === BEAT) drawTripClock(ctx, v);
  },
};
