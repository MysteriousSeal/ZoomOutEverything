// Beat 2 — "For eight minutes and twenty seconds, | nothing would change."
// The Sun has collapsed (8.70 s, env clock running), but its last light is still on the way: the street stays in
// full sun, people keep walking, a bus passes (s00 draws all of that on story time). This beat adds the label,
// right-aligned in the open sky opposite the Sun, staged on the voice: "8 min 20 s" on "eight minutes",
// "nothing changes" on "nothing would change". Soft clock ticks under the line.
import * as L from '../../../../engine/runtime/lib.js';
import { label2 } from './s00-hook.js';

const BIG_AT = 0.42;    // "eight" ≈ 8.9 s
const SMALL_AT = 2.5;   // "nothing would change" ≈ 11.05 s

export default {
  beat: 2,
  chapter: { num: '02', title: 'Nothing changes', sub: 'the sky looks exactly the same' },
  cues() {
    return [
      { t: BIG_AT, name: 'blip', gain: 0.2, pitch: 1.1 },
      { t: 0.15, name: 'tick', gain: 0.12, pitch: 1.0 },
      { t: 1.15, name: 'tick', gain: 0.1, pitch: 1.0 },
      { t: 2.15, name: 'tick', gain: 0.1, pitch: 1.0 },
      { t: SMALL_AT, name: 'swish', gain: 0.12, pitch: 1.3 },
      { t: 3.15, name: 'tick', gain: 0.1, pitch: 1.0 },
    ];
  },
  drawOverlay(c, v) {
    const kb = L.prog(v.t, BIG_AT, 0.6), ks = L.prog(v.t, SMALL_AT, 0.5);
    const ko = L.prog(v.t, v.d - 0.05, 0.3);
    c.save();
    c.globalAlpha *= v.k > 0 ? 1 : 0;
    label2(c, { x: 940, y: 560, big: '8 min 20 s', small: 'nothing changes', kb, ks, ko, align: 'right', size: 112, accent: v.accent, backing: 0.32 });
    c.restore();
  },
};
