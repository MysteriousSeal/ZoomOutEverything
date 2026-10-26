// 16c beat 0 — "What if the Sun suddenly became a black hole?" (16 beat 0, then the rewind of 16's cut beat 1).
// Also runs the whole film's world layer (cut.js drawWorld16): one world, on 16 time.
import { RW } from '../remap.js';
import { beat, drawWorld16 } from './cut.js';
import s00 from './s00-hook.js';
import s01 from './s01-strangest.js';

export default beat(0, {
  chapter: null,
  captions: false,
  layer: -1,
  // s01: only the rewind scrub (its overlay) and its sounds; the teaser (16's "comes last") is cut
  parts: [[s00, 0], [s01, 1, (o) => o < RW.b + 0.3]],
  extra: { drawWorld: drawWorld16 },
});
