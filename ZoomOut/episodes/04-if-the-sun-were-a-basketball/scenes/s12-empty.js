// Beat 12 — "Space isn't crowded. | It's almost entirely empty."
// The globe sinks into the dark until only two points of light remain: the Sun (New York) and Proxima (Rome).
// A hairline between them carries the real distance. Final hold.
// This file also draws those two lights and their tags for beats 10–12 (layer above everything, global timing),
// so they never dip at beat boundaries.
import * as L from '../../../../engine/runtime/lib.js';
import { globeK, NEW_YORK, ROME } from '../env.js';
import { ACC, SUN_C, STAR_C, T, dimK, starK, STAR_T, pointLight, cityTag } from './s10-star.js';

const { ease, clamp, lerp, prog, rgba } = L;

const B = {
  tagsOut: 0.5,     // city tags leave as the globe sinks
  tags2: 2.2,       // "It's almost entirely empty": THE SUN / NEAREST STAR
  line: 4.0,        // hairline between the lights draws itself
  fact: 4.5,        // ≈ 40 trillion km
};

/** visibility of a tag that enters at g0 (global s) and leaves at g1 */
const inOut = (gt, g0, g1, din = 0.5, dout = 0.4) => ease.outCubic(prog(gt, g0, din)) * (1 - ease.inCubic(prog(gt, g1, dout)));

export default {
  beat: 12,
  chapter: { num: '12', title: 'Almost nothing', sub: 'The Sun and its nearest star' },
  captions: true,
  chapterUntil(d) { return 3.6; },
  layer: 10,
  cues(d) {
    return [
      { t: 0.25, name: 'deep', gain: 0.4, pitch: 0.7 },
      { t: 1.2, name: 'swell', gain: 0.2, pitch: 0.7 },
      { t: B.tags2, name: 'shimmer', gain: 0.2, pitch: 0.9 },
      { t: B.line, name: 'bloom', gain: 0.28, pitch: 0.8 },
      { t: B.fact, name: 'impact', gain: 0.35, pitch: 0.7 },
    ];
  },
  drawWorld(ctx, v) {
    const gk = globeK(v);
    if (gk <= 0.001) return;
    const tt = T(v), gt = v.gt;
    const dk = dimK(v);
    // the dark: sinks the globe and the starfield together, leaving only our two lights
    if (dk > 0) {
      ctx.fillStyle = `rgba(2,3,8,${0.9 * dk})`;
      ctx.fillRect(0, 0, L.W, L.H);
    }
    const nyx = v.wx(NEW_YORK.x), nyy = v.wy(NEW_YORK.y);
    const rx = v.wx(ROME.x), ry = v.wy(ROME.y);
    const breathe = 1 + 0.06 * Math.sin(gt * 1.7);
    // the hairline takes over from the light streaks as it draws
    const lk = prog(gt, tt.b12 + B.line, 1.2);
    const le = lk > 0 ? ease.inOutCubic(lk) : 0;
    const streak = dk * (1 - le);
    // the Sun: a point of light at New York (takes over from the basketball as the globe arrives)
    const sk = ease.inOutCubic(L.invLerp(0.35, 1, gk));
    pointLight(ctx, nyx, nyy, SUN_C, sk, lerp(0.8, 1.4, dk) * breathe, streak);
    // Proxima: red, a little smaller
    const pk = starK(v);
    if (pk > 0) {
      // arrival flash
      const fl = Math.sin(Math.PI * prog(gt, tt.b10 + STAR_T, 0.6));
      L.lightBlob(ctx, rx, ry, 120, STAR_C, 0.45 * fl);
      pointLight(ctx, rx, ry, STAR_C, pk, lerp(0.7, 0.8, dk) * (1 + 0.06 * Math.sin(gt * 2.1 + 1)), streak);
    }
    // tags: city names while we're on the map, roles in the dark
    cityTag(ctx, nyx, nyy + 44, 'NEW YORK', 'THE SUN', inOut(gt, tt.b10 + 2.0, tt.b12 + B.tagsOut), SUN_C);
    cityTag(ctx, rx + 4, ry + 64, 'ROME', 'NEAREST STAR', inOut(gt, tt.b11 + 1.75, tt.b12 + B.tagsOut), STAR_C);
    const k2 = ease.outCubic(prog(gt, tt.b12 + B.tags2, 0.7));
    if (k2 > 0) {
      roleTag(ctx, nyx, nyy + 40, 'THE SUN', k2, SUN_C);
      roleTag(ctx, rx, ry + 40, 'PROXIMA CENTAURI', k2, STAR_C);
    }
    // hairline + the real distance
    if (lk > 0) {
      const e = le;
      const x0 = nyx + 24, x1 = rx - 24;
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, rgba(SUN_C, 0.8));
      g.addColorStop(1, rgba(STAR_C, 0.8));
      ctx.save();
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.moveTo(x0, nyy); ctx.lineTo(lerp(x0, x1, e), lerp(nyy, ry, e));
      ctx.stroke();
      ctx.restore();
    }
    const fk = prog(gt, tt.b12 + B.fact, 0.8);
    if (fk > 0) {
      const e = ease.outCubic(fk);
      const mx = (nyx + rx) / 2, my = Math.min(nyy, ry) - 110;
      ctx.save();
      ctx.globalAlpha *= clamp(fk * 1.5);
      ctx.textBaseline = 'alphabetic';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 14;
      ctx.font = L.font(78, 800, L.FONT.display);
      ctx.fillStyle = rgba(ACC);
      L.trackedText(ctx, '40 TRILLION KM', mx, my + (1 - e) * 16, 1, 'center');
      ctx.font = L.font(24, 600, L.FONT.body);
      ctx.fillStyle = 'rgba(205,215,230,0.85)';
      L.trackedText(ctx, 'THE REAL DISTANCE · ALL OF IT EMPTY', mx, my + 44 + (1 - e) * 10, 3, 'center');
      ctx.restore();
    }
  },
};

function roleTag(ctx, x, y, s, k, col) {
  ctx.save();
  ctx.globalAlpha *= clamp(k);
  ctx.textBaseline = 'middle';
  ctx.font = L.font(20, 700, L.FONT.body);
  ctx.fillStyle = rgba(col, 0.9);
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 8;
  L.trackedText(ctx, s, x, y + (1 - k) * 8, 4, 'center');
  ctx.restore();
}
