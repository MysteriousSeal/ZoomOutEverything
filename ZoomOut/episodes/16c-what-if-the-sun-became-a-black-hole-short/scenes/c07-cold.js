// 16c beat 7 — "Back on Earth, | within weeks the land could drop below −18 °C." (16 beat 13's first phrase: the flight
// back with s13's beacon, then 16 beat 14: s14's thermometer and −18 °C label, over the frozen globe; 16 dived on to
// the frozen street, 16c holds the globe: camera.js key 7)
import { beat } from './cut.js';
import s13 from './s13-cold.js';
import s14 from './s14-minus-eighteen.js';

export default beat(7, { chapter: { num: '07', title: 'The cold', sub: 'land temperatures, expert estimate' }, parts: [[s13, 13], [s14, 14]] });
