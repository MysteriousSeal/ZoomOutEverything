// 16c beat 4 — "But Earth would keep the same orbit. | Only mass and distance matter." (16 beat 7 to 28.85 s, with the
// year sweep retimed into it, then 16 beat 9). s05 / s06 are listed for the label track: "Lights out" (16 beat 5)
// finishes fading here, in this beat's first 0.5 s (drawn by whichever of them is active on 16 time).
import { beat } from './cut.js';
import s05 from './s05-dark.js';
import s06 from './s06-no-fly-off.js';
import s07 from './s07-same-orbit.js';
import s09 from './s09-mass-distance.js';

export default beat(4, {
  chapter: { num: '04', title: 'Same orbit', sub: 'around a black hole now' },
  parts: [[s05, 5, false], [s06, 6, false], [s07, 7], [s09, 9]],
});
