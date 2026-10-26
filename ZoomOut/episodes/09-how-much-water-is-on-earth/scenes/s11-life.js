// Beat 11 — "That's what so much of life depends on."
// London fades away; the little ball begins to glow from within (s09 handles the inner light). Slow rings of light
// breathe outward from it and a few motes drift around it like a faint biosphere. One quiet grey line puts the number
// in perspective: it is about 0.007% of all the water on Earth.
import * as L from '../../../../engine/runtime/lib.js';
import { LAKES } from '../camera.js';

const { W, H } = L;
const BEAT = 11;
const R_L = LAKES.d / 2;
const MOTES = (() => {
  const r = L.rng(1111);
  return Array.from({ length: 26 }, () => ({ a: r() * Math.PI * 2, d: 1.12 + r() * 0.55, sp: (0.08 + r() * 0.12) * (r() < 0.5 ? -1 : 1), s: 1.2 + r() * 2.2, ph: r() * 10 }));
})();

function lifeK(v) {
  const s = v.tl.scenes[BEAT];
  const kin = L.ease.inOutCubic(L.prog(v.gt, s.start + 0.2, 1.0));
  const kout = 1 - L.ease.inCubic(L.prog(v.gt, s.end + 0.2, 1.4));
  return Math.min(kin, kout);
}

export default {
  beat: BEAT,
  chapter: { num: '11', title: 'Life', sub: 'Drinking water, farms, rivers, wetlands' },
  captions: true,
  layer: 3,
  cues(d) {
    return [
      { t: 0.25, name: 'swell', gain: 0.35, pitch: 1.0 },
      { t: 0.75, name: 'shimmer', gain: 0.22, pitch: 1.25 },
      { t: 1.05, name: 'tick', gain: 0.18, pitch: 1.1 },
    ];
  },
  drawWorld(ctx, v) {
    const cx = v.wx(LAKES.x), cy = v.wy(LAKES.y), pr = v.ws(R_L);
    const k = lifeK(v) * L.clamp((pr - 40) / 80);      // the halo fades as the pull-back shrinks the ball
    if (k <= 0.002) return;
    if (pr < 4 || cx + pr * 3 < 0 || cx - pr * 3 > W || cy + pr * 3 < 0 || cy - pr * 3 > H) return;
    const t = v.gt - v.tl.scenes[BEAT].start;
    ctx.save();
    // the drop lights up from within, breathing slowly
    const br = k * (0.8 + 0.2 * Math.sin(t * 2.4));
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, pr * 0.99), 0, Math.PI * 2); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const ig = ctx.createRadialGradient(cx + pr * 0.1, cy + pr * 0.12, 0, cx, cy, pr);
    ig.addColorStop(0, `rgba(140,235,255,${0.22 * br})`);
    ig.addColorStop(0.6, `rgba(80,190,255,${0.12 * br})`);
    ig.addColorStop(1, `rgba(120,220,255,${0.14 * br})`);
    ctx.fillStyle = ig;
    ctx.fillRect(cx - pr, cy - pr, pr * 2, pr * 2);
    ctx.restore();
    // breathing rings of light, slow and evenly spaced
    for (let i = 0; i < 3; i++) {
      const p = ((t + 0.2) / 2.4 + i / 3) % 1;
      if (t + 0.2 < i * 0.8) continue;
      const rr = pr * (1.04 + p * 0.9);
      ctx.strokeStyle = `rgba(140,215,255,${0.32 * k * Math.pow(1 - p, 1.6)})`;
      ctx.lineWidth = Math.max(1, 2.5 * (1 - p) + 0.5);
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, rr), 0, Math.PI * 2); ctx.stroke();
    }
    // motes drifting around the ball (a faint biosphere)
    ctx.globalCompositeOperation = 'lighter';
    for (const m of MOTES) {
      const a = m.a + t * m.sp;
      const d = pr * (m.d + 0.05 * Math.sin(t * 0.8 + m.ph));
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.96;
      const tw = 0.5 + 0.5 * Math.sin(t * 2.2 + m.ph);
      const al = k * (0.25 + 0.5 * tw);
      ctx.fillStyle = `rgba(180,240,230,${al})`;
      const ms = m.s * Math.min(1, pr / 200);
      ctx.beginPath(); ctx.arc(x, y, Math.max(0, ms), 0, Math.PI * 2); ctx.fill();
      L.lightBlob(ctx, x, y, ms * 6, [120, 230, 210], al * 0.35);
    }
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    // one quiet line; the glowing ball carries the beat
    const cy = v.wy(LAKES.y), pr = v.ws(R_L);
    const k = Math.min(v.k, L.ease.outCubic(L.prog(v.t, 0.7, 0.5)));
    if (k <= 0) return;
    ctx.save();
    ctx.globalAlpha *= k;
    ctx.font = L.font(30, 600, L.FONT.body);
    ctx.fillStyle = 'rgba(190,205,222,0.95)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10;
    ctx.textBaseline = 'middle';
    L.trackedText(ctx, '0.007% OF ALL WATER', W / 2, Math.min(560, cy - pr - 120) + (1 - k) * 10, 3, 'center');
    ctx.restore();
  },
};
