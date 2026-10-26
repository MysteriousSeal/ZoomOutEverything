// Builder B — Manhattan's buildings on the real grid (Commissioners' Plan, 14th St and north), plus the downtown and
// Village fabric, plus the real supertalls at their real places with their real heights (so their afternoon shadows
// fall toward the upper right, onto the park, as they really do). Deterministic; built once.
import * as L from '../../../../engine/runtime/lib.js';
import { AVENUES, streetU, STREET, fromGrid, PARK_LEN, PARK_WID, ll, RINGS, inSet } from './b-geo.js';

const S = streetU;
const F5 = PARK_WID;
export const AVE_W = 30, ST_W = 18;           // avenue 100 ft, street 60 ft
const MANH = [RINGS.city[2]];                  // Manhattan (NYC DCP shoreline)
export const inManhattan = (x, y) => inSet(MANH, x, y);

// real towers: [name, gu, gw, height m, half-size w, half-size u] (grid frame) or lat/lon for those off the grid
export const TOWERS = [
  ['Central Park Tower', S(57.45), 205, 472, 22, 16], ['111 West 57th', S(57.45), 430, 435, 10, 18], ['One57', S(57.5), 350, 306, 20, 16],
  ['220 Central Park South', S(58.6), 70, 290, 16, 14], ['432 Park Avenue', S(56.6), F5 + 290, 426, 15, 15],
  ['53 West 53rd', S(53.5), 640, 320, 14, 14], ['30 Rockefeller Plaza', S(49.5), 690, 259, 30, 14],
  ['Bank of America Tower', S(42.35), 520, 366, 30, 24], ['One Vanderbilt', S(42.3), F5 + 190, 427, 26, 22],
  ['Chrysler Building', S(42.4), F5 + 420, 319, 18, 18], ['Empire State Building', S(33.6), F5 - 70, 381, 30, 26],
  ['Trump World Tower', S(47.4), F5 + 980, 262, 14, 14], ['Time Warner Center', S(59.4), -60, 229, 40, 24],
  ['432 neighbour: 425 Park', S(55.5), F5 + 290, 273, 14, 14], ['Hearst Tower', S(57), -40, 182, 22, 22],
  ['MetLife Building', S(44.6), F5 + 190, 246, 40, 18], ['Citigroup Center', S(53.4), F5 + 470, 279, 22, 22],
];
export const TOWERS_LL = [
  ['One World Trade Center', 40.7127, -74.0134, 541, 30], ['3 World Trade Center', 40.7110, -74.0119, 329, 24],
  ['4 World Trade Center', 40.7103, -74.0118, 298, 22], ['Woolworth Building', 40.7124, -74.0082, 241, 22],
  ['70 Pine Street', 40.7063, -74.0078, 290, 16], ['40 Wall Street', 40.7069, -74.0096, 283, 18],
  ['8 Spruce Street', 40.7111, -74.0056, 265, 18], ['30 Hudson Yards', 40.7540, -74.0012, 387, 28],
  ['35 Hudson Yards', 40.7558, -74.0018, 308, 22], ['The Spiral', 40.7569, -73.9998, 314, 24],
];

const hsh = (a, b, s = 0) => { const n = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); };

/** Typical height (m) of ordinary buildings at grid (gu, gw): Midtown and the avenues are tall, side streets low. */
function baseHeight(gu, gw, onAve, h1, h2) {
  const st = 59 + gu / STREET;
  let h;
  if (st > 30 && st < 60 && gw > -300 && gw < F5 + 900) {             // Midtown
    h = 50 + 120 * h1 * h1 + (onAve ? 60 : 0);
    if (h2 > 0.9) h += 80 + 110 * h1;
  } else if (st >= 60 && st < 97) {                                    // Upper West / Upper East Side
    h = onAve ? 40 + 70 * h1 : 16 + 16 * h1;
    if ((gw > F5 - 10 && gw < F5 + 40) || (gw < 10 && gw > -40)) h = 55 + 40 * h1;   // Fifth Ave / CPW frontage
    if (h2 > 0.965) h += 60;
  } else if (st >= 97) {                                               // Harlem, Washington Heights, Inwood
    h = onAve ? 22 + 30 * h1 : 14 + 10 * h1;
    if (h2 > 0.97) h = 50 + 40 * h1;                                   // housing towers
  } else {                                                             // Chelsea, Gramercy, Murray Hill
    h = onAve ? 35 + 60 * h1 : 18 + 26 * h1;
    if (h2 > 0.95) h += 70;
  }
  return h;
}
const ROOF = [[118, 116, 112], [138, 134, 126], [96, 96, 98], [156, 150, 138], [108, 104, 98], [128, 122, 112], [84, 86, 90], [146, 146, 144],
  [176, 172, 164], [196, 194, 190], [112, 98, 88], [90, 86, 82], [150, 136, 120], [124, 128, 130]];

// ------------------------------------------------------------------ the grid blocks and lots
// lot: [gw0, gu0, gw1, gu1, h, r, g, b]
const AV = AVENUES.map((a) => a[1]);
export const BLOCKS = (() => {
  const out = [];
  const nmax = 222;
  for (let n = 14; n < nmax; n++) {
    const u0 = S(n) + ST_W / 2, u1 = S(n + 1) - ST_W / 2;
    const cols = [[-1500, AV[0]], ...AV.slice(0, -1).map((a, i) => [a, AV[i + 1]]), [AV[AV.length - 1], AV[AV.length - 1] + 420]];
    for (let ci = 0; ci < cols.length; ci++) {
      let [a, b] = cols[ci];
      const w0 = a + (ci === 0 ? 0 : AVE_W / 2), w1 = b - (ci === cols.length - 1 ? 0 : AVE_W / 2);
      if (S(n) >= -1 && S(n + 1) <= PARK_LEN + 1 && w0 >= -1 && w1 <= F5 + 1) continue;                     // the park
      // keep blocks whose centre or corners touch Manhattan
      const pts = [[(w0 + w1) / 2, (u0 + u1) / 2], [w0, u0], [w1, u0], [w0, u1], [w1, u1]].map(([w, u]) => fromGrid(u, w));
      if (!pts.some((p) => inManhattan(p.x, p.y))) continue;
      // Riverside Park (west of Riverside Drive, 72nd-158th) and Morningside Park are green
      const green = (ci === 0 && n >= 72 && n < 158);
      const lots = [];
      if (!green) {
        const rows = [[u0 + 1, (u0 + u1) / 2 - 0.5], [(u0 + u1) / 2 + 0.5, u1 - 1]];
        rows.forEach(([ra, rb], ri) => {
          let w = w0 + 1, k = 0;
          while (w < w1 - 3 && k < 40) {
            const h1 = hsh(n * 7 + ri, ci * 31 + k, 1), h2 = hsh(n * 3 + ri, ci * 17 + k, 2);
            const width = Math.min(w1 - 1 - w, 8 + h1 * (n > 30 && n < 60 ? 46 : 26));
            const onAve = w - w0 < 26 || w1 - (w + width) < 26;
            const h = baseHeight(S(n), w + width / 2, onAve, h1, h2);
            const col = ROOF[(hsh(n, ci * 13 + k, 3) * ROOF.length) | 0].map((x) => x * (0.92 + 0.16 * hsh(k, n, 4)));
            lots.push([w + 0.6, ra + 0.6, w + width - 0.6, rb - 0.6, h, col[0], col[1], col[2]]);
            w += width; k++;
          }
        });
      }
      out.push({ n, ci, w0, w1, u0, u1, green, lots, tree: hsh(n, ci, 9) });
    }
  }
  return out;
})();
// grid index: by street row
export const BLOCK_ROWS = new Map();
for (const b of BLOCKS) { let a = BLOCK_ROWS.get(b.n); if (!a) BLOCK_ROWS.set(b.n, a = []); a.push(b); }

// tall-building records in WORLD coords: {x, y, hw, hu, h, name} (rotated with the grid for grid ones)
export const TALL = [
  ...TOWERS.map(([name, gu, gw, h, hw, hu]) => ({ name, ...fromGrid(gu, gw), grid: true, gu, gw, hw, hu, h })),
  ...TOWERS_LL.map(([name, lat, lon, h, r]) => ({ name, ...ll(lat, lon), grid: false, hw: r, hu: r, h })),
];
