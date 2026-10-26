// 16c beat 2 — "That's how long sunlight takes to reach us, | and gravity is no faster." (16 beat 3, then the first
// 1.65 s of 16 beat 4: s04's ripple packet and racers, retimed; s03's "150 million km" label holds through it)
import { beat } from './cut.js';
import s03 from './s03-sunlight.js';
import s04 from './s04-gravity-speed.js';

export default beat(2, { chapter: { num: '02', title: 'Light in flight', sub: 'gravity travels no faster' }, parts: [[s03, 3], [s04, 4]] });
