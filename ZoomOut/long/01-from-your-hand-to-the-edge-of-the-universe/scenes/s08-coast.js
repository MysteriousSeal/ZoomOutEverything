// Beat 8: The east coast of North America, | and the curve of the planet starts to show.
// Builder B. The map dissolves into the real globe (layers/city.js → layers/earth.js); this scene pins New York and the
// big East Coast cities at their real places as they come into view, then names the continent.
import * as L from '../../../../engine/runtime/lib.js';
import { ll } from '../layers/b-geo.js';
import { phrase, enter, place, pin, text, safe, safeK, callout } from '../layers/b-label.js';

const B = 8;
const NYC = ll(40.7128, -74.006);
const CITIES = [
  [ll(42.3601, -71.0589), 'BOSTON', 6.15], [ll(39.9526, -75.1652), 'PHILADELPHIA', 6.05],
  [ll(38.9072, -77.0369), 'WASHINGTON, D.C.', 6.2],
];
const OCEAN = ll(36.5, -68.0), NA = ll(42.0, -95.0);

export default {
  beat: 8,
  chapter: null,
  cues() {
    return [{ t: phrase(B, 1) + 0.6, name: 'swell', gain: 0.2, pitch: 0.85 }];
  },
  drawOverlay(c, v) {
    const lf = v.cam.lf;
    // New York: a pin that follows the zoom out (the hand is a few km from it)
    const kN = enter(v, 0.4, 0.6) * L.clamp(L.invLerp(5.5, 5.75, lf));
    const x = v.wx(NYC.x), y = v.wy(NYC.y);
    if (kN > 0) {
      const ks = safeK(x + 50, y);
      pin(c, x, y, kN * ks, { r: 5 });
      text(c, 'NEW YORK', x + 14, y - 16, { size: 18, alpha: kN * ks, track: 4 });
    }
    // East Coast cities, each as it becomes a sensible size on screen
    for (const [p, name, lf0] of CITIES) {
      if (p.z <= 0) continue;
      const cx = v.wx(p.x), cy = v.wy(p.y);
      const k = enter(v, 0.6, 0.6) * L.clamp(L.invLerp(lf0, lf0 + 0.2, lf)) * (1 - L.clamp(L.invLerp(6.5, 6.68, lf))) * safeK(cx + 60, cy);
      if (k <= 0) continue;
      c.save(); c.globalAlpha *= k;
      c.fillStyle = 'rgba(2,6,12,0.6)'; c.beginPath(); c.arc(cx, cy, 5, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(240,238,230,0.95)'; c.beginPath(); c.arc(cx, cy, 3, 0, Math.PI * 2); c.fill();
      c.restore();
      text(c, name, cx + 11, cy, { size: 16, alpha: k * 0.95, track: 3, color: [232, 230, 222] });
    }
    // the ocean and the continent
    const kO = L.clamp(L.invLerp(6.1, 6.35, lf)) * v.k;
    const ox = v.wx(OCEAN.x), oy = v.wy(OCEAN.y);
    place(c, 'ATLANTIC OCEAN', ox, oy, kO * 0.9 * safeK(ox, oy, 90), { size: 18, color: [170, 210, 235], track: 8 });
    const kA = enter(v, phrase(B, 0) + 0.2, 0.8) * L.clamp(L.invLerp(6.7, 6.95, lf));
    const ax = v.wx(NA.x), ay = v.wy(NA.y);
    place(c, 'NORTH AMERICA', ax, ay, kA * safeK(ax, ay, 90), { size: 22, color: [240, 236, 224], track: 10 });
    void callout;
  },
};
