// Beat 17 — "The Soviets tried five- and six-day weeks. | By nineteen forty, seven was back." (19c beat 11)
// The page itself is drawn by s16 (it owns act III's page and lights): here it re-flows 10 → 5 columns (19c: a PLAIN
// page; the nepreryvka's worker groups and their staggered rest days are the closing question's answer, so they are
// never shown), then 5 → 6 (every 6th day off for everyone), and on "seven was back" it SNAPS to 7 (outBack, the
// lights flash as they land). This scene times the label: the house "N DAYS" label continues from s16 ("10 DAYS")
// and its number rolls 10 → 5 → 6 → 7 with each re-flow.
// 19c (as 19b's audited version): s16's "10 DAYS" fades with its beat; a fresh "5 DAYS / USSR, 1929–1940" enters just
// before "five-", rolls 5 → 6 → 7 and holds to the beat end (s18 takes it on, no dip); times from s16's TIMES.
import * as L from '../../../../engine/runtime/lib.js';
import { TIMES, daysLabel } from './s16-ten-day-week.js';
import { adapt, LT } from '../legacy.js';

const SCENE = {
  beat: 17,
  chapter: { num: '11', title: 'Soviet weeks', sub: 'USSR, 1929–1940' },
  captions: true,
  layer: 0,
  cues(d) {
    void d;
    const T = TIMES(LT), r = (t) => t - T.t17;
    return [
      { t: r(T.su5), name: 'whoosh', gain: 0.22, pitch: 1.0 },          // 10 → 5 columns
      { t: LT.marks.five - 0.2 - T.t17, name: 'tick', gain: 0.1, pitch: 1.4 },   // "5 DAYS" comes in on "five-"
      { t: r(T.su6), name: 'whoosh', gain: 0.18, pitch: 1.2 },          // 5 → 6
      { t: r(T.su6) + 0.3, name: 'tick', gain: 0.1, pitch: 1.6 },
      { t: r(T.back) - 0.15, name: 'riser', gain: 0.16, pitch: 1.0 },  // building to the snap
      { t: r(T.back), name: 'swish', gain: 0.22, pitch: 1.3 },
      { t: r(T.back) + 0.22, name: 'impact', gain: 0.5, pitch: 0.9 },  // "seven was back": snap to 7
      { t: r(T.back) + 0.3, name: 'shimmer', gain: 0.2, pitch: 1.2 },
    ];
  },
  drawWorld() {},
  drawOverlay(ctx, v) {
    const T = TIMES(v.tl);
    if (v.gt >= T.t18) return;   // s18 continues the label from its first frame
    const flash = Math.sin(Math.PI * L.prog(v.gt, T.back + 0.15, 0.7));
    // (19c, as 19b's audited version) s16's "10 DAYS / FRANCE" has faded by the beat start; the Soviet label enters
    // fresh just before "five-", then rolls 5 → 6 → 7 and hands over to s18 unbroken
    const enter = L.prog(v.gt, v.tl.marks.five - 0.2, 0.55);
    if (enter <= 0) return;
    daysLabel(ctx, v, {
      seq: [[0, '5'], [T.su6 + 0.2, '6'], [T.back + 0.08, '7', 0.3]],
      small: [[0, 'USSR, 1929–1940'], [T.back + 0.1, 'Back by 1940']],
      k: L.clamp(enter * 1.5), enter, flash: Math.max(0, flash),
    });
  },
};

export default adapt(SCENE, 17, { overlayIn: false }, () => 1);
