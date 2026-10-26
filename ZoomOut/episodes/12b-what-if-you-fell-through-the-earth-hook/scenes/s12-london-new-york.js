// Beat 12 — "London to New York? | Also about forty-two minutes."
// The camera pushes in while the real globe turns to the North Atlantic (the other chords fade). London (right) and
// New York (left) get their names over the real coastlines, and one quiet line under the straight tunnel says how
// shallow it is: 5,400 km long, about 600 km deep at its middle. A capsule makes the trip from London
// to New York while the trip clock runs one last time and locks into "42 min" for the ending
// (the depth dimension lands mid-run, as the capsule passes the deepest point).
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, CITY_HALF_ANGLE, geoWorld, CITY, OFF, gravityTrain } from '../camera.js';
import { BEAT_START, RUN_C, COOL, drawTripClock, clockOwner } from './s09-fall-back.js';
import { chordLine, capsule, arrivalPing } from './s11-any-two-cities.js';

const BEAT = 12;
const T_LONDON = 54.25 + OFF;     // global: "London..."
const T_NY = 54.85 + OFF;         // "...to New York?"
const T_DIM = 56.05 + OFF;        // the depth dimension + the length line: lands as the capsule passes the deepest point
const CHORD_KM = (2 * R_EARTH * Math.sin(CITY_HALF_ANGLE * Math.PI / 180)) / 1000;     // ≈ 5,394
const DEEP_KM = (R_EARTH * (1 - Math.cos(CITY_HALF_ANGLE * Math.PI / 180))) / 1000;   // ≈ 600

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
  chapter: { num: '12', title: 'London to New York', sub: 'A straight tunnel under the Atlantic' },
  captions: true,
  chapterUntil() { return RUN_C.t1 - BEAT_START[BEAT]; },   // the card clears as the clock locks: '42 min' leads the end frame
  layer: 4,
  cues(d) {
    const b = BEAT_START[BEAT];
    return [
      { t: 0.05, name: 'swell', gain: 0.25, pitch: 0.9 },
      { t: T_LONDON - b, name: 'blip', gain: 0.28, pitch: 1.2 },
      { t: T_NY - b, name: 'blip', gain: 0.28, pitch: 1.0 },
      { t: 54.55 + OFF - b, name: 'shimmer', gain: 0.2, pitch: 1.0 },
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
    if (gt < BEAT_START[BEAT]) return;
    // the question beat: the chord, capsule and glow fade under its dim (nothing pokes out beside the card)
    const s13 = v.tl.scenes[BEAT + 1]?.start ?? Infinity;
    const qOut = 1 - L.ease.inOutCubic(L.prog(gt, s13 + 0.05, 0.3));
    if (qOut <= 0.001) return;
    ctx.save();
    ctx.globalAlpha *= qOut;
    // the hero chord brightens over the base line s11 keeps drawing
    const hk = L.ease.inOutCubic(L.prog(gt, BEAT_START[BEAT] + 0.4, 1.0));
    const { L: LONDON, N: NEW_YORK } = ends(gt);
    chordLine(ctx, v, LONDON, NEW_YORK, 1, hk, 1);
    // the capsule: fades in at London, rides, arrives in New York
    const ck = L.ease.outCubic(L.prog(gt, T_LONDON + 0.2, 0.5));
    const s = L.prog(gt, RUN_C.t0, RUN_C.t1 - RUN_C.t0);
    capsule(ctx, v, LONDON, NEW_YORK, s, ck, 1.45);
    arrivalPing(ctx, v.wx(NEW_YORK.x), v.wy(NEW_YORK.y), gt - RUN_C.t1);
    // a slow breathing glow on New York once arrived (secondary motion for the closing hold)
    const rest = L.prog(gt, RUN_C.t1 + 0.6, 0.8);
    if (rest > 0) L.lightBlob(ctx, v.wx(NEW_YORK.x), v.wy(NEW_YORK.y), 50, COOL, rest * (0.25 + 0.12 * Math.sin(gt * 2.4)));
    // the closing hold: a soft glint keeps making the trip along the tunnel (slow-fast-slow, like the train), so the
    // last 2.7 s before the question never sit still
    const ph = (gt - (RUN_C.t1 + 0.9)) / 2.0;
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
