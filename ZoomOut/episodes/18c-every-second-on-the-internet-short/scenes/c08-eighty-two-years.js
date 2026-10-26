// 18c beat 8 = 18 beats 17 + 18: "Back on that one phone, | one day of YouTube uploads | would take about 82 years to
// watch. | Longer than a lifetime." s17 (the turn home, the dive, the upload feed, "720,000 hours / uploaded every
// day") starts in the voice hold before this line (legacy.js) and runs to "one day of YouTube uploads", where s18
// (the player, the lifetime bar, 82 YEARS) takes over. s18's overlay holds (k = 1) and is also drawn under the question
// card (c09).
import S17, { times as t17 } from './s17-back-to-phone.js';
import S18, { times as t18 } from './s18-eighty-two-years.js';
import { wrap, cuesOf, LT, TL } from '../legacy.js';

export default {
  ...wrap([{ o: 17, S: S17 }, { o: 18, S: S18 }]),
  chapter: { num: '08', title: 'One day of uploads', sub: 'Watched nonstop' },
  // the top clears just before the reveal (18: 1.9 s into beat 18)
  chapterUntil() { return LT.scenes[18].start + 1.9 - TL.scenes[8].start; },
  cues() {
    const A = t17(LT), s7 = LT.scenes[17].start;
    const m17 = { 0.15: A.go, 0.5: A.go + 0.35, 1.22: A.home - 0.03, 1.25: A.home, 1.35: A.home + 0.1, 3.46: A.feed, 4.2: A.land, 4.22: A.land + 0.02, 4.7: A.land + 0.5, 5.12: A.land + 0.92 };
    const B = t18(LT), s8 = B.s;
    const m18 = { 0.15: B.rush, 0.85: B.lift + 0.05, 1.0: B.player + 0.05, 2.03: B.fly, 2.5: B.fill - 0.18, 2.6: B.fill - 0.08, 2.68: B.fill,
      3.24: B.hit - 0.02, 3.26: B.hit, 3.28: B.hit + 0.02, 3.6: B.hit + 0.34, 5.74: B.life, 5.8: B.life + 0.06 };
    return [
      ...cuesOf(S17, 17, 8, (q) => (m17[q.t] != null ? m17[q.t] - s7 : null)),
      ...cuesOf(S18, 18, 8, (q) => (m18[q.t] != null ? m18[q.t] - s8 : null)),   // (no closing sign-off: the card follows)
    ];
  },
};
