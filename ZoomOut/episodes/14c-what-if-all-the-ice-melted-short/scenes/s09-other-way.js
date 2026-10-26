// 14c beat 6 (otherWay; 14b beat 9) — "But the sea has moved the other way, too."
// A "rewind": as the globe turns to the North Pole and env drains the sea back to today, a soft light hand sweeps
// once anticlockwise round the planet (a clock running backwards) and two latitude rings contract towards the
// pole, where the ice comes back. The inverse of beat 8's outward wavefront. No text (the chapter card names it).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, BEAT, globeDisc, project } from '../env.js';
import { traceGeo } from './s08-shanghai-coastlines.js';

const RING = [];
for (let i = 0; i <= 120; i++) RING.push(i * 3);   // longitudes for a latitude circle

function times(tl) {
  const s = tl.scenes[BEAT.otherWay].start;
  return { sweep0: s + 0.2, sweep: 2.4, rings0: s + 0.35, rings: 1.8, stagger: 0.25 };
}

export default {
  beat: 6,
  chapter: { num: '06', title: 'The other way', sub: 'the sea can fall too' },
  captions: true,
  layer: 0,
  // beat starts 38.37; the sea drains 38.67-40.77
  cues(d) {
    return [
      { t: 0.2, name: 'swish', gain: 0.18, pitch: 0.6 },
      { t: 0.45, name: 'bubbles', gain: 0.2, pitch: 0.6 },
      { t: 1.3, name: 'swell', gain: 0.18, pitch: 0.6 },
      { t: d - 0.6, name: 'shimmer', gain: 0.16, pitch: 0.8 },   // the pole glint (14c: tied to the beat end, was 2.45)
    ];
  },
  drawWorld(ctx, v) {
    const tm = times(v.tl);
    if (v.gt < tm.sweep0 - 0.05 || v.gt > v.tl.scenes[BEAT.iceAge].start) return;
    const D = globeDisc(v);
    if (D.r < 20) return;
    ctx.save();
    ctx.beginPath(); ctx.arc(D.x, D.y, Math.max(0, D.r), 0, Math.PI * 2); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    // ---- the rewinding hand: a conic wedge of light sweeping anticlockwise, trailing behind it
    const sp = L.prog(v.gt, tm.sweep0, tm.sweep);
    if (sp > 0 && sp < 1) {
      const env = Math.sin(Math.PI * sp);
      const ang = -Math.PI / 2 - Math.PI * 2 * L.ease.inOutCubic(sp);   // starts at 12 o'clock, goes anticlockwise
      // soft beam: no hard edge. A gentle ramp ahead of the hand, a core just behind it, a long decay trailing
      // clockwise behind (the hand moves anticlockwise, so positions near 1 are ahead and small positions behind)
      const A = 0.12 * env;
      const g = ctx.createConicGradient(ang, D.x, D.y);
      g.addColorStop(0, L.rgba(ACCENT, A * 0.75));
      g.addColorStop(0.04, L.rgba(ACCENT, A));
      g.addColorStop(0.12, L.rgba(ACCENT, A * 0.45));
      g.addColorStop(0.29, L.rgba(ACCENT, 0));
      g.addColorStop(0.93, L.rgba(ACCENT, 0));
      g.addColorStop(1, L.rgba(ACCENT, A * 0.75));
      ctx.fillStyle = g;
      ctx.fillRect(D.x - D.r, D.y - D.r, D.r * 2, D.r * 2);
    }
    // ---- two latitude rings contracting to the pole (the sea pulling back towards the ice), done by ~40.9
    ctx.lineWidth = 2;
    for (let i = 0; i < 2; i++) {
      const rp = L.prog(v.gt, tm.rings0 + i * tm.stagger, tm.rings);
      if (rp <= 0 || rp >= 1) continue;
      const lat = L.lerp(38, 80, L.ease.inOutCubic(rp));
      const a = Math.sin(Math.PI * rp) * 0.3;
      ctx.strokeStyle = L.rgba(L.mix(ACCENT, [255, 255, 255], 0.3), a);
      ctx.beginPath();
      traceGeo(ctx, v, RING.map((lo) => [lat, lo - 180]), false, 0.03);
      ctx.stroke();
    }
    ctx.restore();
    // the pole itself catches a small glint as the rings arrive
    // (a small soft blob, gone before beat 10 starts)
    const pEnd = v.tl.scenes[BEAT.iceAge].start - 0.15;
    const pk = L.prog(v.gt, pEnd - 0.9, 0.9);
    if (pk > 0 && pk < 1) {
      const p = project(v, 90, 0);
      if (p.z > 0.1) L.lightBlob(ctx, p.x, p.y, 40, [220, 245, 255], 0.28 * Math.sin(Math.PI * pk));
    }
  },
};
