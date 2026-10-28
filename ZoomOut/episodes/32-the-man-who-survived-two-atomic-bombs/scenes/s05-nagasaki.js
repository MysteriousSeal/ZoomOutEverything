// Beat 5 — "That's when it happens again. | Another flash, about three kilometres away."
// The office card leaves; its wall clock lifts off the wall and becomes the dial of the 11:02 clock card (the hands
// sweep 10:59 → 11:02, landing on "happens"). Camera 'nagaGZ': Nagasaki's ground zero at screen (300, 1010).
// Phrase 1: ONE bloom on "flash" (env.flash), the 3 KM lens grows out of ground zero on "three", his dot on
// "kilometres" (the office lay about 3 km south).
import * as L from '../../../../engine/runtime/lib.js';
import { NAGA, moments, clockCard, flash, lens, B, BE } from '../env.js';
import { OFFICE_CLOCK } from './s04-office.js';

export default {
  beat: 5,
  chapter: null,
  captions: true,
  overlayIn: false,
  layer: 5,
  drawOverlay(c, v) {
    const tl = v.tl, m = moments(tl), end = BE(tl, 5, -0.02), b0 = B(tl, 5);
    flash(c, v, NAGA, m.flash2);
    lens(c, v, { ll: NAGA, brg: 190, tIn: m.threeKm2 - 0.2, tRing: m.threeKm2, tHim: m.threeKm2 + 0.3, tOut: end });
    clockCard(c, v, {
      tIn: b0 + 0.42, tOut: end, from: [10, 59], to: [11, 2], tLand: m.happens + 0.05, place: 'NAGASAKI', kj: '長崎',
      lifeOpt: { cLead: 0, cDur: 0.2 },   // the text comes in WITH the plate (the office art has already gone)
      dialFrom: { x: OFFICE_CLOCK.x, y: OFFICE_CLOCK.y, r: OFFICE_CLOCK.r, t0: b0 - 0.02, t1: b0 + 0.5 },
    });
    void L;
  },
};
