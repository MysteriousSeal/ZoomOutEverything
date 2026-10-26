// Beat 14 — "French keeps the rest: | mardi, Mars. Mercredi, Mercury. | Jeudi, Jupiter. Vendredi, Venus."
// "French keeps the rest": a hairline bracket gathers the four middle rows (Tuesday to Friday, the four lights env
// now features) and the label FRENCH / "Latin roots" sits beside it. Then the same morph as beat 13, on each
// spoken French word: MAR·S → MAR·DI, MERC·URY → MERC·REDI, J·UPITER → J·EUDI, VEN·US → VEN·DREDI, each with
// its Latin root (dies Martis …). The cursor glides down Tuesday → Friday. (Morphs are drawn by s12's names system.)
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, LIGHTS } from '../env.js';
import { TL, morphTimes, drawCursor, nameAnchor, nameWidth } from './s12-roman-days.js';

const KEYS = ['mars', 'mercury', 'jupiter', 'venus'];
const T_BRACKET = 0.35, T_LABEL = 0.75;
const iOf = (key) => LIGHTS.findIndex((Lt) => Lt.key === key);

export default {
  beat: 14,
  chapter: { num: '14', title: 'In French', sub: 'Mars to Venus' },
  captions: true,
  // the camera's beat-14 push puts the (dim) SUNDAY row just under the card: clear it once the bracket has landed
  chapterUntil(d) { return 1.5; },
  layer: 0,
  cues(d) {
    const t0 = TL.scenes[14].start, MT = morphTimes(TL);
    const out = [
      { t: T_BRACKET, name: 'tick', gain: 0.14, pitch: 1.2 },
      { t: T_LABEL + 0.05, name: 'ping', gain: 0.18, pitch: 0.95 },
    ];
    KEYS.forEach((key, n) => {
      const t = MT[key] - t0;
      out.push({ t: t + 0.12, name: 'swish', gain: 0.18, pitch: 0.95 + 0.06 * n });
      out.push({ t: t + 0.5, name: 'ping', gain: 0.2, pitch: [1.0, 1.12, 1.0, 1.12][n] });
    });
    return out;
  },
  drawOverlay(c, v) {
    const t = v.t, MT = morphTimes(v.tl);
    drawCursor(c, v, KEYS, KEYS.map((k) => MT[k]), v.k);
    // bracket right of the four names (Tuesday..Friday rows)
    const top = nameAnchor(v, iOf('mars')), bot = nameAnchor(v, iOf('venus'));
    const kb = L.ease.inOutCubic(L.prog(t, T_BRACKET, 0.6)) * v.k;
    if (kb <= 0) return;
    const size = top.size;
    const bx = top.x + Math.max(nameWidth(c, 'MERCURY', size), nameWidth(c, 'MERCREDI', size)) + size * 0.55;
    const y0 = top.ly - size * 0.55, y1 = bot.ly + size * 0.55, ym = (y0 + y1) / 2;
    c.save();
    c.strokeStyle = L.rgba(ACCENT, 0.75 * v.k);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(bx - 16, L.lerp(ym, y0, kb)); c.lineTo(bx, L.lerp(ym, y0, kb)); c.lineTo(bx, L.lerp(ym, y1, kb)); c.lineTo(bx - 16, L.lerp(ym, y1, kb));
    c.moveTo(bx, ym); c.lineTo(bx + 18 * kb, ym);
    c.stroke();
    c.restore();
    const kl = v.k * L.enter(t, T_LABEL, 0.55);
    L.bigLabel(c, { x: bx + 40, y: ym + 26, big: 'FRENCH', small: 'Latin roots', k: kl, accent: v.accent, size: 76 });
  },
};
