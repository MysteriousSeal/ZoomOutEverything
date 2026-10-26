// Builder B — Central Park content in the GRID frame (gu = metres north from 59th St along the avenues, gw = metres east
// from Central Park West), merged with park-data.js (the meadow area) so trees, paths and water match builder A exactly.
// Real layout (approximate to tens of metres): the Pond (59th-62nd, SE), Heckscher Ballfields, the Sheep Meadow, the
// Mall, Bethesda Terrace, the Lake, the Ramble, Turtle Pond, Belvedere Castle, the Great Lawn (79th-85th), the Met,
// the Jacqueline Kennedy Onassis Reservoir (86th-96th), the North Meadow, the Conservatory Garden, Harlem Meer, the drives.
import * as L from '../../../../engine/runtime/lib.js';
import { TREES, PATHS, LAKE, MEADOW_POLY, toWorld, toPark, inMeadow, nearPath, inLake, PAL } from './park-data.js';
import { streetU, fromGrid, toGrid, PARK_LEN, PARK_WID } from './b-geo.js';

// park frame (park-data u, w) -> grid frame: the meadow centre sits at grid (694, 246)
const MC = toGrid(toWorld(0, 0).x, toWorld(0, 0).y);
export const parkToGrid = (u, w) => ({ u: u + MC.u, w: w + MC.w });
export const gridToPark = (gu, gw) => ({ u: gu - MC.u, w: gw - MC.w });
const S = streetU;

// ------------------------------------------------------------------ features (grid frame: [gw, gu] point lists)
const ell = (cw, cu, rw, ru, n = 28, wob = 0, seed = 1) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, k = 1 + wob * L.noise1(i * 0.7 + seed * 13, seed);
    out.push([cw + Math.cos(a) * rw * k, cu + Math.sin(a) * ru * k]);
  }
  return out;
};
// water bodies
export const WATERS = [
  { name: 'reservoir', pts: [[150, S(85.6)], [420, S(85.3)], [690, S(85.7)], [770, S(87.5)], [775, S(90.5)], [745, S(93.5)], [660, S(95.6)],
    [520, S(96.3)], [340, S(96)], [190, S(94.6)], [120, S(92)], [105, S(89)], [115, S(87)]] },
  { name: 'lake', pts: LAKE.map(([u, w]) => { const g = parkToGrid(u, w); return [g.w, g.u]; }) },
  { name: 'meer', pts: [[520, S(106.4)], [640, S(106.1)], [790, S(106.6)], [820, S(108.2)], [760, S(109.6)], [600, S(109.7)], [470, S(109.2)], [430, S(108.1)], [470, S(107)]] },
  { name: 'pond', pts: [[620, S(59.5)], [760, S(59.6)], [800, S(60.5)], [770, S(61.6)], [700, S(62.1)], [640, S(61.5)], [660, S(60.7)], [600, S(60.1)]] },
  { name: 'turtle', pts: ell(470, S(79.15), 125, 30, 20, 0.12, 4) },
  { name: 'harlem-pool', pts: [[300, S(102.3)], [380, S(102.2)], [390, S(103.0)], [300, S(103.1)]] },
];
// open lawns (no trees): [gw, gu] polygons
export const LAWNS = [
  { name: 'great lawn', pts: ell(455, (S(79.9) + S(85.2)) / 2, 170, (S(85.2) - S(79.9)) / 2, 32), fields: 8 },
  { name: 'north meadow', pts: [[200, S(97.3)], [640, S(97.2)], [660, S(101.4)], [210, S(101.6)]], fields: 6 },
  { name: 'east meadow', pts: [[690, S(97.3)], [810, S(97.2)], [815, S(100.2)], [700, S(100.4)]] },
  { name: 'heckscher', pts: [[140, S(62.3)], [440, S(62.1)], [450, S(64.6)], [150, S(64.8)]], fields: 5 },
  { name: 'cedar hill', pts: ell(690, S(77.8), 70, 110, 20) },
  { name: 'pilgrim hill', pts: ell(720, S(72.5), 60, 70, 18) },
  { name: 'strawberry fields', pts: ell(110, S(72.4), 45, 50, 16) },
  { name: 'arthur ross pinetum', pts: ell(520, S(86.0) - 40, 120, 30, 16) },
  { name: 'conservatory garden', pts: [[770, S(104.2)], [850, S(104.2)], [850, S(105.9)], [770, S(105.9)]], formal: true },
  { name: 'rumsey', pts: ell(600, S(70.2), 40, 30, 14) },
];
// buildings / hard surfaces inside the park
export const STRUCTURES = [
  { name: 'met', pts: [[740, S(80.1)], [856, S(80.1)], [856, S(84.2)], [748, S(84.2)], [748, S(83.4)], [700, S(83.4)], [700, S(80.9)], [740, S(80.9)]], col: [186, 180, 168], h: 30 },
  { name: 'belvedere', pts: ell(400, S(79.1) - 18, 16, 12, 10), col: [150, 142, 126], h: 12 },
  { name: 'delacorte', pts: ell(300, S(80.2), 26, 24, 18), col: [120, 112, 100], h: 8 },
  { name: 'wollman', pts: [[470, S(62.1)], [560, S(62.1)], [560, S(63.4)], [470, S(63.4)]], col: [160, 170, 176], h: 3 },
  { name: 'lasker', pts: [[470, S(106.0)], [570, S(106.0)], [570, S(106.9)], [470, S(106.9)]], col: [150, 170, 184], h: 3 },
  { name: 'zoo', pts: [[700, S(63.4)], [830, S(63.4)], [830, S(65.2)], [700, S(65.2)]], col: [150, 140, 122], h: 8 },
];
// park drives (car-free since 2018) and the four sunken transverse roads; [gw, gu] polylines, width m
export const DRIVES = [
  // (south of 79th St the drives near the meadow come from park-data.js, so they are drawn exactly once)
  { w: 10, pts: [[96, S(78.6)], [110, S(79.5)], [96, S(82)], [70, S(86)], [62, S(92)],
    [70, S(97)], [110, S(101)], [150, S(104)], [240, S(107)], [380, S(109.3)], [560, S(109.4)], [700, S(108.6)], [790, S(106)],
    [800, S(102)], [790, S(97)], [800, S(92)], [800, S(87)], [790, S(84.4)], [690, S(80)], [620, S(79)], [582, S(78.6)]] },
  { w: 9, pts: [[856, 0], [800, S(60)], [700, S(62.4)], [640, S(63.3)], [600, S(64.4)]] },
  { w: 9, pts: [[110, S(102.2)], [380, S(102.4)], [560, S(102.5)], [800, S(102.2)]] },
];
export const TRANSVERSES = [S(65.4), S(79.3), S(85.9), S(97)].map((u) => ({ w: 11, pts: [[0, u], [PARK_WID, u + 6]] }));

// ------------------------------------------------------------------ geometry helpers
export function inPolyGW(pts, w, u) {
  let ins = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [wi, ui] = pts[i], [wj, uj] = pts[j];
    if ((ui > u) !== (uj > u) && w < ((wj - wi) * (u - ui)) / (uj - ui) + wi) ins = !ins;
  }
  return ins;
}
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
  const t = L.clamp(((px - ax) * dx + (py - ay) * dy) / l2);
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
const nearLine = (lines, w, u, pad) => lines.some((d) => d.pts.some((p, i) => i > 0 && distSeg(w, u, d.pts[i - 1][0], d.pts[i - 1][1], p[0], p[1]) < d.w / 2 + pad));

// the park-data domain (where park-data.js TREES are authoritative): park frame |u| <= 900, |w| <= 420
const inDomain = (gu, gw) => { const p = gridToPark(gu, gw); return Math.abs(p.u) <= 904 && Math.abs(p.w) <= 424; };

// ------------------------------------------------------------------ all trees of the park (world coords + grid coords)
export const PARK_TREES = (() => {
  const out = TREES.map((t) => ({ x: t.x, y: t.y, r: t.r, h: t.h, tone: t.tone, elm: t.elm }));
  const rnd = L.rng(5150), Sp = 8.5;
  for (let gu = 6; gu <= PARK_LEN - 6; gu += Sp) {
    for (let gw = 6; gw <= PARK_WID - 6; gw += Sp) {
      const ju = gu + (rnd() - 0.5) * Sp * 0.9, jw = gw + (rnd() - 0.5) * Sp * 0.9, r = 3.2 + rnd() * 3.4, keep = rnd();
      if (inDomain(ju, jw)) continue;
      if (ju < 8 || ju > PARK_LEN - 8 || jw < 8 || jw > PARK_WID - 8) continue;
      // density: woods (the Ramble, North Woods) dense; elsewhere groves
      let dens = 0.32 + 0.5 * L.noise1(ju * 0.011 + jw * 0.007, 5) + 0.25 * L.noise1(jw * 0.013 - ju * 0.004, 9);
      if (ju > S(73) && ju < S(79) && jw > 150 && jw < 520) dens += 0.45;          // the Ramble
      if (ju > S(101.5) && ju < S(106.5) && jw < 520) dens += 0.45;                 // the North Woods
      if (keep > dens) continue;
      if (WATERS.some((q) => inPolyGW(q.pts, jw, ju))) continue;
      if (LAWNS.some((q) => inPolyGW(q.pts, jw, ju))) continue;
      if (STRUCTURES.some((q) => inPolyGW(q.pts, jw, ju))) continue;
      if (nearLine(DRIVES, jw, ju, r * 0.5 + 1) || nearLine(TRANSVERSES, jw, ju, r * 0.4)) continue;
      const p = fromGrid(ju, jw);
      out.push({ x: p.x, y: p.y, r, h: 10 + r * 2.4, tone: (rnd() * 4) | 0, elm: false });
    }
  }
  return out;
})();
// spatial buckets (world, 100 m)
const BK = 100;
const BUCKETS = new Map();
for (const t of PARK_TREES) {
  const k = `${Math.floor(t.x / BK)},${Math.floor(t.y / BK)}`;
  let a = BUCKETS.get(k); if (!a) BUCKETS.set(k, a = []); a.push(t);
}
export function treesIn(x0, y0, x1, y1) {
  const out = [];
  for (let i = Math.floor(x0 / BK); i <= Math.floor(x1 / BK); i++) {
    for (let j = Math.floor(y0 / BK); j <= Math.floor(y1 / BK); j++) {
      const a = BUCKETS.get(`${i},${j}`); if (a) for (const t of a) out.push(t);
    }
  }
  return out;
}
export { PATHS, MEADOW_POLY, toWorld, toPark, inMeadow, nearPath, inLake, PAL };
