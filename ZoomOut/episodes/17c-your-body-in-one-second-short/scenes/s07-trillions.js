// Beat 7 — "You have about twenty-five trillion of them, | most of the cells in your body."
// The camera eases back to show the crowd. On phrase 1 the hero cell (s06's slow near-wall cell, already tagged in
// beat 6) is picked out: a soft lift of light, an accent ring that draws itself around it, a hairline to the label
// "25 TRILLION". On phrase 2 the ring becomes a gauge: 84 % of the circle fills in the accent (red cells' share of
// all your cells, by count) while the small line turns into "≈ 84% of all your cells".
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, phrase } from '../env.js';
import { adapt, LT, rel } from '../legacy.js';
import { heroView, pickT } from './s06-into-vessel.js';

const { W } = L;
const SHARE = 0.84;
const TP = rel(7, pickT(LT));   // 17c: beat-relative pick time (cues)

/** The ring around the hero (shared with s08, which keeps it, quieter). */
export function heroRing(c, v, { k = 1, draw = 1, gauge = 0, alpha = 1 } = {}) {
  if (k <= 0) return;
  const hv = heroView(v);
  const rr = hv.r * 1.85;
  c.save();
  c.globalAlpha *= k * alpha;
  c.lineCap = 'round';
  // dark under-stroke so the ring reads over the crowd
  c.strokeStyle = 'rgba(20,2,8,0.55)'; c.lineWidth = 9;
  c.beginPath(); c.arc(hv.x, hv.y, Math.max(0, rr), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * draw); c.stroke();
  if (gauge > 0) {
    // the gauge: a thick accent arc for 84 %, a pale remainder
    c.strokeStyle = 'rgba(255,236,230,0.4)'; c.lineWidth = 3;
    c.beginPath(); c.arc(hv.x, hv.y, Math.max(0, rr), -Math.PI / 2 + Math.PI * 2 * SHARE * gauge + 0.12, -Math.PI / 2 + Math.PI * 2 - 0.12); c.stroke();
    c.shadowColor = L.rgba(ACCENT, 0.8); c.shadowBlur = 14;
    c.strokeStyle = L.rgba(ACCENT); c.lineWidth = L.lerp(3, 9, L.ease.outCubic(L.clamp(gauge * 2)));
    c.beginPath(); c.arc(hv.x, hv.y, Math.max(0, rr), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * SHARE * gauge); c.stroke();
    c.shadowBlur = 0;
  }
  c.shadowColor = L.rgba(ACCENT, 0.7); c.shadowBlur = 10;
  c.strokeStyle = L.rgba(ACCENT, gauge > 0 ? 0.0 : 1); c.lineWidth = 3;
  if (gauge <= 0) { c.beginPath(); c.arc(hv.x, hv.y, Math.max(0, rr), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * draw); c.stroke(); }
  c.restore();
  return { x: hv.x, y: hv.y, r: rr };
}

export const SCENE = {
  beat: 7,
  chapter: { num: '07', title: 'Red blood cells', sub: 'the most common cell in you' },
  chapterUntil(d) { return 1.55; },
  captions: true,
  layer: 5,
  cues(d) {
    // phrase 1 at 0.15 s, the pick ≈ 1.0 s; phrase 2 at 2.9 s
    return [
      { t: 0.95, name: 'shimmer', gain: 0.16, pitch: 1.3 },
      { t: 1.0, name: 'ping', gain: 0.3, pitch: 1.1 },
      { t: 1.35, name: 'bloom', gain: 0.22, pitch: 1.0 },
    ].map((q) => ({ ...q, t: q.t + TP - 1.0 }));   // 17c: on the legacy pick time (no phrase-2 gauge)
  },
  drawWorld(c, v) {
    // a soft lift of light on the hero once it is picked (world layer: it gets the motion blur)
    const T = pickT(v.tl);
    const k = L.ease.outCubic(L.prog(v.gt, T - 0.1, 0.5)) * (1 - L.ease.inCubic(L.prog(v.gt, v.tl.scenes[9].start - 0.1, 0.5)));
    if (k <= 0 || v.cam.mpp > 1e-6) return;
    const hv = heroView(v);
    L.lightBlob(c, hv.x, hv.y, hv.r * 2.6, [255, 120, 110], 0.26 * k);
  },
  drawOverlay(c, v) {
    const t = v.t, s7 = v.tl.scenes[7].start;
    // 17c: one phrase ("You have about 25 trillion red blood cells."): no 84 % gauge, the small line stays
    const tp = pickT(v.tl) - s7, t2 = v.tl.__legacy ? Infinity : phrase(v.tl, 7, 1, 'start') - s7;
    const kRing = Math.min(v.k, L.prog(t, tp - 0.1, 0.25));
    if (kRing <= 0) return;
    const draw = L.ease.inOutCubic(L.prog(t, tp - 0.1, 0.6));
    const gauge = L.ease.inOutCubic(L.prog(t, t2 + 0.15, 1.1));
    // backing for the label (top band, over dark tissue)
    const kl = Math.min(v.k, L.prog(t, tp + 0.25, 0.55));
    if (kl > 0) {
      c.save();
      c.globalAlpha = kl;
      const bg = c.createRadialGradient(330, 430, 40, 330, 430, 440);
      bg.addColorStop(0, 'rgba(10,2,6,0.5)'); bg.addColorStop(1, 'rgba(10,2,6,0)');
      c.fillStyle = bg; c.fillRect(0, 160, W, 640);
      c.restore();
    }
    const ring = heroRing(c, v, { k: kRing, draw, gauge });
    // hairline from the ring up to the label
    const lk = Math.min(v.k, L.prog(t, tp + 0.35, 0.5));
    if (lk > 0 && ring) {
      const a = -Math.PI * 0.62, sx = ring.x + Math.cos(a) * (ring.r + 8), sy = ring.y + Math.sin(a) * (ring.r + 8);
      L.leader(c, sx, sy, 150, 560, lk, [255, 236, 230], 0.7);
    }
    L.bigLabel(c, { x: 96, y: 468, big: '25 TRILLION', small: '', k: kl, accent: ACCENT, size: 120 });
    // small line: "red blood cells" → "≈ 84% of all your cells" on phrase 2
    const swOut = L.ease.inCubic(L.prog(t, t2 + 0.05, 0.25)), sw = L.ease.outCubic(L.prog(t, t2 + 0.3, 0.45));
    c.save();
    c.font = L.font(30, 600, L.FONT.body);
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 8;
    const e = L.ease.outCubic(L.clamp(kl));
    for (const [str, a, dy] of [['RED BLOOD CELLS IN YOU', 1 - swOut, -14 * swOut], ['≈ 84% OF ALL YOUR CELLS', sw, 14 * (1 - sw)]]) {
      if (a <= 0.01) continue;
      c.globalAlpha = L.clamp(kl * 1.4) * a;
      c.fillStyle = 'rgba(205,215,230,0.95)';
      L.trackedText(c, str, 96, 468 + 52 + (1 - e) * 18 + dy, 3, 'left');
    }
    c.restore();
  },
};

// 17c: 17 beat 7 plays as a 17c beat on the legacy timeline (legacy.js); chapter renumbered
export default adapt(SCENE, 7, { chapter: { num: '06', title: 'Red blood cells', sub: 'the most common cell in you' } });
