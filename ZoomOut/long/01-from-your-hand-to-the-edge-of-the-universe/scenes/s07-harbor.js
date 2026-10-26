// Beat 7: The whole city, | wrapped around one of the largest natural harbors in the world.
// Builder B. The five boroughs and the water around them (real places): New York City's population, the harbour
// (Upper and Lower New York Bay), the Narrows and its bridge, the airports.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT } from '../world.js';
import { ll } from '../layers/b-geo.js';
import { phrase, enter, place, callout, text, safe } from '../layers/b-label.js';

const B = 7;
const BOROUGHS = [
  [ll(40.785, -73.966), 'MANHATTAN'], [ll(40.650, -73.950), 'BROOKLYN'], [ll(40.715, -73.825), 'QUEENS'],
  [ll(40.850, -73.870), 'THE BRONX'], [ll(40.580, -74.150), 'STATEN ISLAND'],
];
const OTHER = [[ll(40.80, -74.20), 'NEW JERSEY'], [ll(40.76, -73.58), 'LONG ISLAND']];
const WATER = [[ll(40.505, -74.060), 'LOWER BAY'], [ll(40.30, -73.70), 'ATLANTIC OCEAN'], [ll(40.95, -73.62), 'LONG ISLAND SOUND']];
const UPPER = ll(40.665, -74.045), NARROWS = ll(40.607, -74.045);
const AIRPORTS = [[ll(40.6413, -73.7781), 'JFK'], [ll(40.7769, -73.8740), 'LGA'], [ll(40.6895, -74.1745), 'EWR']];

export default {
  beat: 7,
  chapter: null,
  cues() {
    return [
      { t: phrase(B, 0) + 0.3, name: 'bloom', gain: 0.18, pitch: 0.9 },
      { t: phrase(B, 1) + 0.6, name: 'shimmer', gain: 0.14, pitch: 0.95 },
    ];
  },
  drawOverlay(c, v) {
    const lf = v.cam.lf;
    const zk = L.clamp(L.invLerp(4.95, 5.15, lf));
    // the five boroughs + NYC's population
    const kB = enter(v, Math.max(phrase(B, 0), 1.3), 0.8) * zk;
    BOROUGHS.forEach(([p, name], i) => {
      const x = v.wx(p.x), y = v.wy(p.y);
      if (safe(x, y)) place(c, name, x, y, L.clamp(kB * 1.2 - i * 0.05), { size: name === 'MANHATTAN' ? 15 : 17, color: [238, 236, 228], track: 4 });
    });
    if (kB > 0) {
      const x = 1250, y = 330;
      c.save();
      c.globalAlpha *= kB;
      c.font = L.font(60, 800, L.FONT.display);
      c.fillStyle = L.rgba(ACCENT);
      c.shadowColor = 'rgba(2,6,12,0.85)'; c.shadowBlur = 18;
      c.textBaseline = 'alphabetic';
      L.trackedText(c, '8,804,190', x, y, 0, 'left');
      c.restore();
      text(c, 'NEW YORK CITY · 2020 CENSUS', x + 2, y + 26, { size: 17, alpha: kB, weight: 600, color: [200, 212, 226], track: 2.5 });
    }
    // the harbour
    const kH = enter(v, phrase(B, 1) + 0.4, 0.9) * zk;
    const ux = v.wx(UPPER.x), uy = v.wy(UPPER.y);
    if (safe(ux - 260, uy - 150)) callout(c, ux, uy, ux - 250, uy - 150, kH, 'NEW YORK HARBOR', { sub: 'UPPER BAY', side: 'left', size: 20, ring: 8 });
    const kw = enter(v, phrase(B, 1) + 1.0, 0.9) * zk;
    for (const [p, name] of WATER) {
      const x = v.wx(p.x), y = v.wy(p.y);
      if (safe(x, y)) place(c, name, x, y, kw * 0.9, { size: 16, color: [160, 200, 222], track: 6 });
    }
    for (const [p, name] of OTHER) {
      const x = v.wx(p.x), y = v.wy(p.y);
      if (safe(x, y)) place(c, name, x, y, kw * 0.8, { size: 16, color: [215, 215, 205], track: 6 });
    }
    const nx = v.wx(NARROWS.x), ny = v.wy(NARROWS.y);
    if (safe(nx + 160, ny + 70)) callout(c, nx, ny, nx + 150, ny + 70, kw * 0.9, 'THE NARROWS', { sub: 'VERRAZZANO BRIDGE', size: 16, ring: 0 });
    // airports (small)
    const ka = enter(v, phrase(B, 1) + 1.5, 0.8) * zk;
    for (const [p, code] of AIRPORTS) {
      const x = v.wx(p.x), y = v.wy(p.y);
      if (safe(x, y + 22)) text(c, code, x, y + 22, { size: 16, alpha: ka * 0.85, align: 'center', color: [235, 232, 222], track: 3 });
    }
  },
};
