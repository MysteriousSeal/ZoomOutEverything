// Beat 17 — "The Soviets tried five- and six-day weeks. | By nineteen forty, seven was back."
// The page itself is drawn by s16 (it owns act III's page and lights): here it re-flows 10 → 5 columns (19b: a
// plain 5-column grid; how rest days worked in the 5-day week is the closing question, so it is not shown), then 5 → 6 (every 6th day off), and
// on "seven was back" it SNAPS to 7 (outBack, the lights flash as they land). This scene times the label: the
// house "N DAYS" label continues from s16 ("10 DAYS") and its number rolls 10 → 5 → 6 → 7 with each re-flow.
import * as L from '../../../../engine/runtime/lib.js';
import { TIMES, daysLabel } from './s16-ten-day-week.js';

export default {
  beat: 17,
  chapter: { num: '17', title: 'Soviet weeks', sub: 'USSR, 1929–1940' },
  captions: true,
  layer: 0,
  cues(d) {
    void d;
    return [
      { t: 0.35, name: 'whoosh', gain: 0.22, pitch: 1.0 },     // 10 → 5 columns
      { t: 0.85, name: 'tick', gain: 0.1, pitch: 1.4 },         // "5" rolls in on "five-"
      { t: 2.15, name: 'whoosh', gain: 0.18, pitch: 1.2 },      // 5 → 6
      { t: 2.45, name: 'tick', gain: 0.1, pitch: 1.6 },
      { t: 3.85, name: 'riser', gain: 0.16, pitch: 1.0 },      // building to the snap
      { t: 4.0, name: 'swish', gain: 0.22, pitch: 1.3 },
      { t: 4.22, name: 'impact', gain: 0.5, pitch: 0.9 },      // "seven was back": snap to 7
      { t: 4.3, name: 'shimmer', gain: 0.2, pitch: 1.2 },
    ];
  },
  drawWorld() {},
  drawOverlay(ctx, v) {
    const T = TIMES(v.tl);
    const flash = Math.sin(Math.PI * L.prog(v.gt, T.back + 0.15, 0.7));
    // s16's "10 DAYS / FRANCE" has fully faded by the beat start; the Soviet label enters fresh just before "five-"
    // (VO onset ≈ t17 + 1.13 s, measured on build/vo.wav), then rolls 5 → 6 → 7 and hands over to s18 unbroken
    const enter = L.prog(v.gt, T.t17 + 0.95, 0.55);
    if (enter <= 0) return;
    daysLabel(ctx, v, {
      seq: [[0, '5'], [T.su6 + 0.2, '6'], [T.back + 0.08, '7', 0.3]],
      small: [[0, 'USSR, 1929–1940'], [T.back + 0.1, 'Back by 1940']],
      k: L.clamp(enter * 1.5), enter, flash: Math.max(0, flash),   // no beat-end fade: s18 continues it
    });
  },
};
