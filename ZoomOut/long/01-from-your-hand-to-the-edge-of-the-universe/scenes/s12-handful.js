// Beat 12: Only a handful of humans have ever traveled this far from home.
// Builder B. The Apollo record, beside the Moon: Apollo 8 and 10–17 (nine crewed flights to the Moon, 1968–1972),
// 24 astronauts (three of them twice), 12 of whom walked on it. No count of "everyone who went this far" is claimed.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT } from '../world.js';
import { MOON_POS } from '../camera.js';
import { phrase, enter, text } from '../layers/b-label.js';

const B = 12;
export default {
  beat: 12,
  chapter: null,
  cues() {
    return [{ t: phrase(B, 0) + 0.5, name: 'shimmer', gain: 0.14, pitch: 0.9 }];
  },
  drawOverlay(c, v) {
    // the Apollo record, right-aligned just left of the Moon (which sits on its orbit, up and to the right)
    const k = enter(v, phrase(B, 0) + 0.3, 0.8);
    if (k <= 0) return;
    const mx = v.wx(MOON_POS.x), my = v.wy(MOON_POS.y);
    // a small ring on the Moon so the eye finds it
    c.save(); c.globalAlpha *= k;
    c.strokeStyle = 'rgba(2,6,12,0.55)'; c.lineWidth = 4; c.beginPath(); c.arc(mx, my, 9, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = L.rgba(ACCENT); c.lineWidth = 1.8; c.beginPath(); c.arc(mx, my, 9, 0, Math.PI * 2); c.stroke();
    c.restore();
    const x = mx - 34, y = my + 40;
    c.save(); c.globalAlpha *= k;
    c.font = L.font(60, 800, L.FONT.display); c.textBaseline = 'alphabetic';
    const w2 = Math.max(c.measureText('24').width, 0);
    c.restore();
    const w1 = text(c, 'ASTRONAUTS HAVE', x, y + 14, { size: 18, alpha: k, align: 'right' });
    const w3 = text(c, 'FLOWN TO THE MOON', x, y + 36, { size: 18, alpha: k, align: 'right' });
    c.save(); c.globalAlpha *= k;
    c.font = L.font(60, 800, L.FONT.display); c.textBaseline = 'alphabetic'; c.textAlign = 'right';
    c.fillStyle = L.rgba(ACCENT); c.shadowColor = 'rgba(2,6,12,0.85)'; c.shadowBlur = 16;
    c.fillText('24', x - Math.max(w1, w3) - 14, y + 46);
    c.restore();
    text(c, 'APOLLO 8, 10–17 · 1968–1972 · 12 WALKED ON IT', x, y + 74, { size: 16, weight: 600, alpha: k * 0.9, color: [190, 205, 220], track: 2, align: 'right' });
  },
};
