// Beat 6: Manhattan: an island twenty-one kilometers long, | home to more than one and a half million people.
// Builder B. The island's length as a bracket from the Battery to its northern tip (Spuyten Duyvil), its population
// (2020 census), and the waters and neighbours around it, all at their real places.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, INK } from '../world.js';
import { ll } from '../layers/b-geo.js';
import { phrase, enter, bracket, place, text, safe } from '../layers/b-label.js';

const B = 6;
const BATTERY = ll(40.7003, -74.0159), TIP = ll(40.8782, -73.9233);
const P = {
  hudson: ll(40.805, -73.972), east: ll(40.742, -73.966), harlem: ll(40.826, -73.933),
  nj: ll(40.775, -74.105), queens: ll(40.742, -73.885), bronx: ll(40.852, -73.880), brooklyn: ll(40.672, -73.955),
};

export default {
  beat: 6,
  chapter: { num: '04', title: "Manhattan", sub: "21.6 km long" },
  cues() {
    return [
      { t: Math.max(phrase(B, 0) + 0.8, 1.7), name: 'swell', gain: 0.16, pitch: 0.95 },
      { t: phrase(B, 1) + 0.2, name: 'ping', gain: 0.15, pitch: 1.1 },
    ];
  },
  drawOverlay(c, v) {
    const lf = v.cam.lf;
    const zk = L.clamp(L.invLerp(4.45, 4.65, lf));
    // the length: a bracket west of the island, parallel to it
    const ax = v.wx(BATTERY.x), ay = v.wy(BATTERY.y), bx = v.wx(TIP.x), by = v.wy(TIP.y);
    const len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len;
    const off = 120, nx = uy, ny = -ux;   // left of the island's axis (toward New Jersey)
    const kL = enter(v, Math.max(phrase(B, 0) + 0.6, 1.8), 1.1) * zk;
    bracket(c, ax + nx * off, ay + ny * off, bx + nx * off, by + ny * off, kL, '21.6 KM · 13.4 MI', { labelSide: -1, size: 22, sub: 'THE BATTERY → SPUYTEN DUYVIL' });
    // the population
    const kP = enter(v, phrase(B, 1) + 0.25, 0.8) * zk;
    if (kP > 0) {
      const x = 1240, y = 760;
      c.save();
      c.globalAlpha *= kP;
      c.font = L.font(64, 800, L.FONT.display);
      c.fillStyle = L.rgba(ACCENT);
      c.shadowColor = 'rgba(2,6,12,0.85)'; c.shadowBlur = 18;
      c.textBaseline = 'alphabetic';
      L.trackedText(c, '1,694,251', x, y + (1 - kP) * 14, 0, 'left');
      c.restore();
      text(c, 'PEOPLE IN MANHATTAN · 2020 CENSUS', x + 2, y + 28, { size: 17, alpha: kP, weight: 600, color: [200, 212, 226], track: 2.5 });
    }
    // waters and neighbours
    const kW = enter(v, Math.max(phrase(B, 0) + 1.5, 2.6), 0.9) * zk;
    const rot = (p, label, ang, size = 16, col = [170, 205, 225]) => {
      const x = v.wx(p.x), y = v.wy(p.y);
      if (!safe(x, y)) return;
      c.save(); c.translate(x, y); c.rotate(ang * Math.PI / 180);
      text(c, label, 0, 0, { size, alpha: kW * 0.95, align: 'center', color: col, track: 4, weight: 600 });
      c.restore();
    };
    rot(P.hudson, 'HUDSON RIVER', -63);
    rot(P.east, 'EAST RIVER', -70);
    rot(P.harlem, 'HARLEM RIVER', -58, 16);
    for (const [p, name] of [[P.nj, 'NEW JERSEY'], [P.queens, 'QUEENS'], [P.bronx, 'THE BRONX'], [P.brooklyn, 'BROOKLYN']]) {
      const x = v.wx(p.x), y = v.wy(p.y);
      if (safe(x, y) && !(x > 1180 && x < 1640 && y > 640 && y < 820)) place(c, name, x, y, kW * 0.85, { size: 17, color: [225, 225, 215], track: 5 });
    }
  },
};
