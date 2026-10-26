// 16c beat 1 — "For 8 minutes and 20 seconds, | nothing would change." (16 beat 2)
import { beat } from './cut.js';
import s02 from './s02-nothing-changes.js';

export default beat(1, { chapter: { num: '01', title: 'Nothing changes', sub: 'the sky looks exactly the same' }, parts: [[s02, 2]] });
