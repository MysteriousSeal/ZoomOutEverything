// 16c beat 3 — "Then, | the sky would go dark." (16 beat 5)
import { beat } from './cut.js';
import s05 from './s05-dark.js';
import s06 from './s06-no-fly-off.js';

export default beat(3, { chapter: { num: '03', title: 'Darkness', sub: 'the last sunlight sweeps past Earth' }, parts: [[s05, 5], [s06, 6, false]] });   // s06: the label track in 16's beat 6 ("Lights out" fading)
