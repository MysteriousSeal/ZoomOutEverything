// Beat 4: This is the Sheep Meadow, | in New York's Central Park.
// Builder B. The city layer carries the picture (meadow, sunbathers, the Mall's elms, the drives); this scene outlines
// the meadow (15 acres, 66th–69th St) and keeps a small marker on where we started, the hand.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT } from '../world.js';
import { MEADOW_POLY, toWorld } from '../layers/park-data.js';
import { phrase, enter, place, callout, text, safe } from '../layers/b-label.js';

const B = 4;
export default {
  beat: 4,
  chapter: { num: '03', title: "The Sheep Meadow", sub: "Central Park, New York" },
  cues() {
    return [{ t: phrase(B, 0) + 0.9, name: 'shimmer', gain: 0.16, pitch: 1.05 }];
  },
  drawOverlay(c, v) {
    const lf = v.cam.lf;
    // the meadow outline traces itself once the whole lawn is in frame
    const ko = enter(v, Math.max(phrase(B, 0) + 0.7, 1.4), 1.3) * L.clamp(L.invLerp(2.45, 2.7, lf));
    if (ko > 0) {
      const pts = MEADOW_POLY.map((p) => [v.wx(p.x), v.wy(p.y)]);
      const n = Math.max(2, Math.round(pts.length * ko));
      c.save();
      c.lineJoin = 'round';
      for (const [w, col] of [[4, 'rgba(2,6,12,0.35)'], [1.8, L.rgba(ACCENT, 0.9)]]) {
        c.strokeStyle = col; c.lineWidth = w; c.setLineDash([10, 7]);
        c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < n; i++) c.lineTo(pts[i][0], pts[i][1]);
        if (ko >= 1) c.closePath();
        c.stroke();
      }
      c.restore();
    }
    // the name, in the open middle of the lawn
    const kn = enter(v, Math.max(phrase(B, 0) + 0.9, 1.6), 0.7) * L.clamp(L.invLerp(2.5, 2.75, lf));
    const m = toWorld(-40, -15);
    place(c, 'SHEEP MEADOW', v.wx(m.x), v.wy(m.y), kn, { size: 24, sub: '15 ACRES · 6 HECTARES' });
    // where the hand is (the zoom started there)
    const kh = enter(v, phrase(B, 1), 0.7) * L.clamp(L.invLerp(2.55, 2.75, lf));
    const hx = v.wx(0), hy = v.wy(0);
    const lx = hx + 150, ly = hy + 120;
    if (safe(lx + 200, ly)) callout(c, hx, hy, lx, ly, kh, 'THE HAND', { sub: 'WHERE WE STARTED', size: 18, ring: 6 });
    // the Mall's elm canopy and Bethesda Terrace (small, along the promenade)
    const km = enter(v, phrase(B, 1) + 0.5, 0.7) * L.clamp(L.invLerp(2.6, 2.8, lf));
    const a = toWorld(40, 163);
    const ax = v.wx(a.x), ay = v.wy(a.y);
    if (km > 0 && safe(ax, ay)) {
      c.save(); c.translate(ax, ay); c.rotate(-61 * Math.PI / 180);
      text(c, 'THE MALL · AMERICAN ELMS', 0, 0, { size: 16, alpha: km * 0.95, align: 'center', track: 3 });
      c.restore();
    }
  },
};
