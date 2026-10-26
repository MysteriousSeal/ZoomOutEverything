// Beat 11 — "And in the simplest model, | a straight tunnel between any two cities takes the same time."
// The cut-away closes and the old tunnel recedes: the whole face is the real Earth. Four straight tunnels of very
// different lengths draw through the globe between real cities (projected with earth.js, so each straight chord is a
// straight line on screen): London - New York (5,570 km, which beat 12 pushes into), Mexico City - Cairo (12,400 km),
// Lima - Lagos (9,100 km) and Reykjavik - Nuuk (1,400 km). A capsule waits at one end of
// each; on "takes the same time" they all set off together (each one sliding along its chord in simple harmonic
// motion via gravityTrain), the long ones fast and the short ones slow, and they all arrive at the same instant, as
// the trip clock below runs 00:00 -> 42:00 again.
import * as L from '../../../../engine/runtime/lib.js';
import { gravityTrain, geoWorld, CITY, OFF } from '../camera.js';
import { BEAT_START, RUN_B, COOL, drawTripClock, clockOwner } from './s09-fall-back.js';

const BEAT = 11;
const T_DRAW = 49.8 + OFF;     // global: the first chord starts drawing (just after "And in the simplest model,")
const STAGGER = 0.3;

/** The chords between real cities: a -> b. Index 0 is London -> New York. */
export const CHORDS = [
  { a: 'london', b: 'newYork', na: 'LONDON', nb: 'NEW YORK' },
  { a: 'mexico', b: 'cairo', na: 'MEXICO CITY', nb: 'CAIRO' },
  { a: 'lima', b: 'lagos', na: 'LIMA', nb: 'LAGOS' },
  { a: 'reykjavik', b: 'nuuk', na: 'REYKJAVIK', nb: 'NUUK', sa: 1, sb: -1 },   // short chord: names sit outboard
].map((c, i) => ({ ...c, i, t0: T_DRAW + i * STAGGER }));
/** World positions of a chord's two cities at gt (the globe spins slowly, and turns in beat 12). */
export const chordEnds = (c, gt) => ({ A: geoWorld(...CITY[c.a], gt), B: geoWorld(...CITY[c.b], gt) });

/** A small city name next to its dot (screen px). dy < 0 = above. */
export function cityName(ctx, x, y, name, a, dy = -22, side = 0) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.font = L.font(17, 700, L.FONT.body);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(242,245,252,0.95)';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 8;
  const w = ctx.measureText(name).width + name.length * 2;
  if (side) dy = 0;   // beside the dot (left -1 / right +1) instead of above it
  const tx = L.clamp(x + side * (w / 2 + 18), 40 + w / 2, 930 - w / 2);
  L.trackedText(ctx, name, tx, y + dy, 2, 'center');
  ctx.restore();
}

/** Fade of everything except the London - New York chord as beat 12 takes over. */
// (gone by beat 12 + 0.2 s, before s12's big London tag starts at "London": no name ghosts under it)
const othersOut = (gt) => 1 - L.ease.inOutCubic(L.prog(gt, BEAT_START[12] - 0.2, 0.4));

/** Screen-space chord line from A to B, drawn in to fraction e (0..1). */
export function chordLine(ctx, v, A, B, e, a = 1, hero = 0) {
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
export function cityDot(ctx, x, y, s, a = 1) {
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
export function capsule(ctx, v, A, B, s, a = 1, sc = 1, opts = {}) {
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
export function arrivalPing(ctx, x, y, age, col = COOL) {
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

const runS = (gt) => L.prog(gt, RUN_B.t0, RUN_B.t1 - RUN_B.t0);

export default {
  beat: BEAT,
  chapter: { num: '11', title: 'Gravity train', sub: 'Any straight tunnel, same time' },
  captions: true,
  layer: 3,
  cues(d) {
    const b = BEAT_START[BEAT];
    const out = [];
    CHORDS.forEach((c) => {
      out.push({ t: c.t0 - b - 0.1, name: 'blip', gain: 0.2, pitch: 1.1 + c.i * 0.12 });
      out.push({ t: c.t0 - b, name: 'swish', gain: 0.2, pitch: 1.2 + c.i * 0.1 });
    });
    out.push({ t: RUN_B.t0 - b - 0.35, name: 'count', gain: 0.16, pitch: 1.3 });
    out.push({ t: RUN_B.t0 - b, name: 'whoosh', gain: 0.32, pitch: 1.0 });
    out.push({ t: RUN_B.t1 - b - 0.4, name: 'riser', gain: 0.16, pitch: 1.2 });
    out.push({ t: RUN_B.t1 - b, name: 'ping', gain: 0.4, pitch: 1.0 });
    out.push({ t: RUN_B.t1 - b + 0.01, name: 'impact', gain: 0.35, pitch: 1.2 });
    out.push({ t: RUN_B.t1 - b + 0.05, name: 'bloom', gain: 0.3, pitch: 1.1 });
    return out;
  },
  drawWorld(ctx, v) {
    const gt = v.gt;
    if (gt < T_DRAW - 0.3) return;
    const others = othersOut(gt);
    // the question beat: the held London - New York chord fades under the card's dim (with s12's capsule and glow)
    const qOut = 1 - L.ease.inOutCubic(L.prog(gt, (v.tl.scenes[13]?.start ?? Infinity) + 0.05, 0.3));
    const s = runS(gt);
    for (const c of CHORDS) {
      const a = c.i === 0 ? qOut : others;
      if (a <= 0.002) continue;
      const { A, B } = chordEnds(c, gt);
      const pa = { x: v.wx(A.x), y: v.wy(A.y) }, pb = { x: v.wx(B.x), y: v.wy(B.y) };
      const e = L.ease.inOutCubic(L.prog(gt, c.t0, 0.6));
      chordLine(ctx, v, A, B, e, a);
      const sa = L.ease.outBack(L.prog(gt, c.t0 - 0.15, 0.4), 2), sb = L.ease.outBack(L.prog(gt, c.t0 + 0.45, 0.4), 2);
      cityDot(ctx, pa.x, pa.y, sa, a);
      cityDot(ctx, pb.x, pb.y, sb, a);
      // names (London / New York hand over to beat 12's big tags)
      const na = c.i === 0 ? 1 - L.prog(gt, BEAT_START[12], 0.2) : a;   // gone before beat 12's big tags arrive
      cityName(ctx, pa.x, pa.y, c.na, L.clamp(sa) * na * 0.95, -22, c.sa || 0);
      cityName(ctx, pb.x, pb.y, c.nb, L.clamp(sb) * na * 0.95, -22, c.sb || 0);
      // the capsule waits at its start, rides, arrives (the London one hands over to s12 at beat 12)
      const ck = L.ease.outCubic(L.prog(gt, c.t0 + 0.5, 0.4)) * others;
      capsule(ctx, v, A, B, s, ck, 1.7, { trail: 0.12, glowR: 50, glowA: 0.8 });
      arrivalPing(ctx, pb.x, pb.y, gt - RUN_B.t1);
    }
  },
  drawOverlay(ctx, v) {
    if (clockOwner(v.gt) === BEAT) drawTripClock(ctx, v);
  },
};
