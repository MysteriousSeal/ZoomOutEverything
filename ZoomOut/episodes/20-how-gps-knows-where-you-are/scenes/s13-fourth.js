// Beat 13 — "A fourth fixes your phone's own clock, | which is nowhere near atomic."
// The phone times every signal with its own quartz clock, which is off: every distance is wrong by the SAME amount,
// so all the spheres inflate together and miss (a warm fuzzy patch). D lands; with four spheres the common error
// can be solved away, they shrink back together and lock onto one point. The phone-clock readout goes from
// ±0.000 3 s (warm) to atomic-grade (gold). Drawn by the shared system in s10; readout + cues here.
import * as L from '../../../../engine/runtime/lib.js';
import { CLOCK } from '../env.js';
import { TRI, WARN, lockT } from './s10-sphere.js';
import { drawReadout } from './s04-atomic-clocks.js';

export default {
  beat: 13,
  chapter: { num: '13', title: 'Four satellites', sub: 'one point, one clock' },
  captions: true,
  layer: 3,
  cues() {
    const g = TRI.grow[3], m = TRI.miss, s = TRI.solve;
    const lock = s.t0 + s.dur;
    return [
      { t: m.t0, name: 'creak', gain: 0.14, pitch: 0.9 },
      { t: g.mark, name: 'blip', gain: 0.16, pitch: 1.6 },
      { t: g.t0 - 0.05, name: 'swell', gain: 0.24, pitch: 1.35 },
      { t: g.t1, name: 'blip', gain: 0.2, pitch: 0.8 },
      { t: s.t0, name: 'riser', gain: 0.16, pitch: 1.4 },
      { t: lock, name: 'ping', gain: 0.4, pitch: 1.3 },
      { t: lock + 0.01, name: 'impact', gain: 0.26, pitch: 1.2 },
      { t: lock + 0.04, name: 'bloom', gain: 0.22, pitch: 1.1 },
    ];
  },
  drawOverlay(ctx, v) {
    const lt = lockT(v);
    const k = v.k * L.enter(v.t, 0.75, 0.5);
    // number, colour and label swap TOGETHER at the swap midpoint (lt 0.6), so the atomic-grade value never sits on
    // the "quartz" label; the new label reads as a correction, not a claim that the phone is atomic.
    const swap = L.ease.inOutCubic(L.prog(lt, 0.35, 0.5));
    const SW = 0.6;
    const on = lt >= SW;
    drawReadout(ctx, {
      x: 1000, y: 500, align: 'right', size: 96, k,
      text: on ? '±0.000 000 02 s' : '±0.000 3 s',
      color: on ? CLOCK : WARN,
      label: "your phone's clock · quartz",
      label2: 'corrected by satellite 4',
      swap,
      lock: lt - SW,
    });
  },
};
