// Beat 5: The park is four kilometers long, | a green rectangle cut out of the city grid.
// Builder B. Dimension brackets on the real park rectangle (59th–110th St, Central Park West–Fifth Ave), then the
// landmarks inside it and the edge streets of the grid.
import * as L from '../../../../engine/runtime/lib.js';
import { CENTRAL_PARK, fromGrid, streetU } from '../layers/b-geo.js';
import { WATERS, LAWNS } from '../layers/b-park.js';
import { phrase, enter, bracket, callout, text, safe } from '../layers/b-label.js';

const B = 5;
const [NW, NE, SE, SW] = CENTRAL_PARK;
const centroid = (pts) => { let w = 0, u = 0; for (const p of pts) { w += p[0]; u += p[1]; } return fromGrid(u / pts.length, w / pts.length); };
const RES = centroid(WATERS[0].pts), LAKE = centroid(WATERS[1].pts), LAWN = centroid(LAWNS[0].pts);

export default {
  beat: 5,
  chapter: null,
  cues() {
    return [
      { t: Math.max(phrase(B, 0) + 0.6, 1.9), name: 'ping', gain: 0.16, pitch: 0.9 },
      { t: phrase(B, 1) + 0.3, name: 'shimmer', gain: 0.14, pitch: 1.0 },
    ];
  },
  drawOverlay(c, v) {
    const lf = v.cam.lf;
    const zk = L.clamp(L.invLerp(3.6, 3.85, lf));
    const P = (p, off = 0, nx = 0, ny = 0) => [v.wx(p[0]) + nx * off, v.wy(p[1]) + ny * off];
    // long side (west edge, offset outward: west-north-west on screen)
    const kL = enter(v, Math.max(phrase(B, 0) + 0.4, 1.8), 1.0) * zk;
    const nW = { x: -Math.cos(29 * Math.PI / 180), y: -Math.sin(29 * Math.PI / 180) };   // outward normal of the west edge
    const [ax, ay] = P(SW, 46, nW.x, nW.y), [bx, by] = P(NW, 46, nW.x, nW.y);
    bracket(c, ax, ay, bx, by, kL, '4 KM · 2.5 MI', { labelSide: -1, size: 22 });
    // short side (south edge, offset outward: south-south-west)
    const kS = enter(v, Math.max(phrase(B, 0) + 1.1, 2.4), 0.8) * zk;
    const nS = { x: -Math.sin(29 * Math.PI / 180), y: Math.cos(29 * Math.PI / 180) };
    const [cx0, cy0] = P(SW, 30, nS.x, nS.y), [cx1, cy1] = P(SE, 30, nS.x, nS.y);
    bracket(c, cx0, cy0, cx1, cy1, kS, '0.8 KM', { labelSide: 1, size: 18, tick: 8 });
    // landmarks inside the rectangle (to the east, over the Upper East Side's grid)
    const t1 = phrase(B, 1);
    const items = [[RES, 'THE RESERVOIR', '86TH–96TH ST', 0], [LAWN, 'THE GREAT LAWN', null, 0.35], [LAKE, 'THE LAKE', null, 0.7]];
    for (const [p, name, sub, dt] of items) {
      const k = enter(v, t1 + dt, 0.7) * zk;
      const x = v.wx(p.x), y = v.wy(p.y);
      const lx = x + 260, ly = y + 30;
      if (safe(lx + 220, ly)) callout(c, x, y, lx, ly, k, name, { sub, size: 18, ring: 5 });
    }
    // the city grid's edge streets
    const kG = enter(v, t1 + 0.9, 0.7) * zk;
    if (kG > 0) {
      const st = (n, w, label, dx, dy) => {
        const p = fromGrid(streetU(n), w), x = v.wx(p.x) + dx, y = v.wy(p.y) + dy;
        if (safe(x, y)) { c.save(); c.translate(x, y); c.rotate(29 * Math.PI / 180); text(c, label, 0, 0, { size: 16, alpha: kG * 0.95, align: 'center' }); c.restore(); }
      };
      st(110, 420, '110TH ST', 0, -22);
      st(59, 420, '59TH ST', 18, 34);
      const ave = (u, w, label, dx) => {
        const p = fromGrid(u, w), x = v.wx(p.x) + dx, y = v.wy(p.y);
        if (safe(x, y)) { c.save(); c.translate(x, y); c.rotate(-61 * Math.PI / 180); text(c, label, 0, 0, { size: 16, alpha: kG * 0.95, align: 'center' }); c.restore(); }
      };
      ave(streetU(66), 1010, 'FIFTH AVE', 0);
    }
  },
};
