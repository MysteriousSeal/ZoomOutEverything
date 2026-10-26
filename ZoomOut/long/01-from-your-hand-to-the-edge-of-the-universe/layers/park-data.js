// Shared ground truth for the Sheep Meadow area (Central Park), used by BOTH the hand layer (lf < 2.4) and the city
// layer (lf > 1.6) so every tree, path and sunbather is in the same place at the handoff.
// Owned by the orchestrator — builders: read, don't edit (ask the orchestrator for changes).
//
// PARK FRAME: u = metres along the park's long axis (toward 110th St, i.e. NNE: the park grid is rotated 29° from true
// north), w = metres across it (toward Fifth Avenue, ESE). Origin = the meadow centre. The hand (world origin) is at
// u = 0, w = +91: four metres inside the meadow's east edge, near the perimeter path and the elms of the Mall, so
// "a blanket, a few trees, a path" are all within ~15 m of it.
// Layout follows the real park (approximate to a few tens of metres): Sheep Meadow (66th–69th St, ~330 x 190 m open
// lawn), its perimeter path, the Mall / Literary Walk with four rows of American elms east of it, Bethesda Terrace at
// its north end, the Lake beyond, West Drive to the west, East Drive to the east.
import * as L from '../../../../engine/runtime/lib.js';

const DEG = Math.PI / 180;
export const E_LONG = { x: Math.sin(29 * DEG), y: -Math.cos(29 * DEG) };   // +u on screen (up, slightly right)
export const E_CROSS = { x: Math.cos(29 * DEG), y: Math.sin(29 * DEG) };   // +w on screen (right, slightly down)
export const HAND_UW = { u: 0, w: 91 };
export const MEADOW_C = { x: -HAND_UW.w * E_CROSS.x, y: -HAND_UW.w * E_CROSS.y };   // meadow centre, world metres
/** park frame (u, w) -> world metres {x, y} */
export const toWorld = (u, w) => ({ x: MEADOW_C.x + u * E_LONG.x + w * E_CROSS.x, y: MEADOW_C.y + u * E_LONG.y + w * E_CROSS.y });
/** world metres -> park frame {u, w} */
export function toPark(x, y) {
  const dx = x - MEADOW_C.x, dy = y - MEADOW_C.y;
  return { u: dx * E_LONG.x + dy * E_LONG.y, w: dx * E_CROSS.x + dy * E_CROSS.y };
}

// ------------------------------------------------------------------ palette (summer afternoon, sun from the lower left)
export const PAL = {
  grass: [86, 128, 58], grassLight: [112, 154, 70], grassDark: [58, 92, 42], grassWorn: [128, 140, 84],
  path: [168, 160, 146], pathEdge: [128, 122, 110], road: [92, 94, 98], roadLine: [230, 214, 150],
  canopy: [[52, 92, 44], [62, 104, 48], [44, 80, 40], [72, 112, 52]], canopyLight: [118, 156, 78],
  water: [52, 86, 92], waterLight: [92, 128, 128], stone: [188, 178, 160],
  shadow: 'rgba(10,24,8,0.38)',   // tree/person shadows, offset along camera.js SHADOW (upper right)
};
export const SHADOW_LEN = 0.9;     // shadow offset = object height x this, along SHADOW (sun ~48° high)

// ------------------------------------------------------------------ the meadow (open lawn, rounded rectangle)
export const MEADOW = { u0: -165, u1: 165, w0: -95, w1: 95, r: 38 };
/** Meadow outline as world points (rounded rectangle, ~3 m steps on the corners). */
export const MEADOW_POLY = (() => {
  const out = [], { u0, u1, w0, w1, r } = MEADOW;
  const corner = (cu, cw, a0) => { for (let i = 0; i <= 12; i++) { const a = (a0 + i * 7.5) * DEG; out.push(toWorld(cu + Math.cos(a) * r, cw + Math.sin(a) * r)); } };
  corner(u1 - r, w1 - r, 0); corner(u0 + r, w1 - r, 90); corner(u0 + r, w0 + r, 180); corner(u1 - r, w0 + r, 270);
  return out;
})();
export function inMeadow(u, w, pad = 0) {
  const { u0, u1, w0, w1, r } = MEADOW;
  const cu = L.clamp(u, u0 + r, u1 - r), cw = L.clamp(w, w0 + r, w1 - r);
  return Math.hypot(u - cu, w - cw) < r - pad && u > u0 - 1e-9 && u < u1 && w > w0 && w < w1;
}

// ------------------------------------------------------------------ paths and roads (polylines in park frame, widths m)
// kind: 'path' (asphalt footpath), 'mall' (wide promenade), 'road' (park drive, cars banned in Central Park since 2018:
// cyclists and runners only), 'plaza'.
export const PATHS = [
  { kind: 'path', w: 4, pts: [[-190, 99], [190, 99]] },                         // meadow east perimeter path (hand side)
  { kind: 'path', w: 4, pts: [[-190, -101], [190, -101]] },                     // meadow west perimeter path
  { kind: 'path', w: 4, pts: [[-171, -101], [-171, 99]] },                      // south perimeter
  { kind: 'path', w: 4, pts: [[171, -101], [171, 99]] },                        // north perimeter
  { kind: 'mall', w: 11, pts: [[-260, 136], [250, 136]] },                      // the Mall / Literary Walk
  { kind: 'plaza', w: 70, pts: [[262, 140], [318, 140]] },                      // Bethesda Terrace
  { kind: 'path', w: 4, pts: [[-120, 99], [-150, 136]] }, { kind: 'path', w: 4, pts: [[60, 99], [90, 136]] },
  { kind: 'road', w: 9, pts: [[-700, -168], [-300, -172], [100, -170], [500, -160], [900, -150]] },   // West Drive
  { kind: 'road', w: 9, pts: [[-700, 320], [-300, 330], [100, 336], [500, 330], [900, 320]] },        // East Drive
  { kind: 'path', w: 4, pts: [[171, -40], [260, -60], [330, -40]] },             // toward the Lake (Cherry Hill)
  { kind: 'path', w: 4, pts: [[-171, 0], [-260, 20], [-380, 10], [-520, 30]] },  // south, toward the Carousel
];
/** The Lake (water polygon, park frame) north of Bethesda Terrace. */
export const LAKE = [[340, -120], [380, -40], [372, 60], [356, 150], [372, 230], [420, 270], [480, 250], [530, 170],
  [600, 150], [660, 90], [700, 0], [680, -80], [620, -150], [540, -170], [460, -200], [400, -190]];

// ------------------------------------------------------------------ deterministic content
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
  const t = L.clamp(((px - ax) * dx + (py - ay) * dy) / l2);
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
export function nearPath(u, w, pad = 0) {
  for (const p of PATHS) for (let i = 0; i + 1 < p.pts.length; i++) {
    const [a, b] = [p.pts[i], p.pts[i + 1]];
    if (distToSeg(u, w, a[0], a[1], b[0], b[1]) < p.w / 2 + pad) return true;
  }
  return false;
}
function inPoly(poly, u, w) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ui, wi] = poly[i], [uj, wj] = poly[j];
    if ((wi > w) !== (wj > w) && u < (uj - ui) * (w - wi) / (wj - wi) + ui) ins = !ins;
  }
  return ins;
}
export const inLake = (u, w) => inPoly(LAKE, u, w);

/** Trees: {x, y (world), u, w, r (crown radius m), h (height m), tone 0..3, elm}. ~ every tree within u ±900, w ±420. */
export const TREES = (() => {
  const out = [], rnd = L.rng(2911);
  // the Mall's four rows of American elms (crowns meet overhead into a cathedral canopy)
  for (const w of [123, 128.5, 143.5, 149]) for (let u = -255; u <= 245; u += 9.5) {
    const r = 6.2 + rnd() * 1.6;
    out.push({ u: u + (rnd() - 0.5) * 1.5, w: w + (rnd() - 0.5) * 1.0, r, h: 22 + rnd() * 6, tone: (rnd() * 4) | 0, elm: true });
  }
  // a few trees right by the hero, between the perimeter path and the Mall (what the 10 m shot shows)
  for (const [u, w, r] of [[2, 103.5, 4.4], [10, 102.8, 4.0], [-6, 104, 5.0], [20, 104, 5.5], [-17, 105, 5.2]]) {
    out.push({ u, w, r, h: 14 + r * 1.6, tone: (rnd() * 4) | 0, elm: false });
  }
  // the rest of the park: jittered grid, density from smooth noise (groves vs small lawns)
  const S = 8.5;
  for (let u = -900; u <= 900; u += S) for (let w = -420; w <= 420; w += S) {
    const ju = u + (rnd() - 0.5) * S * 0.9, jw = w + (rnd() - 0.5) * S * 0.9, r = 3.2 + rnd() * 3.4, keep = rnd();
    if (inMeadow(ju, jw, -6) || nearPath(ju, jw, r * 0.6 + 1.5) || inLake(ju, jw)) continue;
    if (Math.abs(jw - 136) < 22 && ju > -265 && ju < 255) continue;           // the Mall's elms are placed above
    if (Math.abs(jw - 105) < 9 && Math.abs(ju) < 40) continue;                // the hero's trees are placed above
    if (ju > 250 && ju < 330 && jw > 100 && jw < 180) continue;               // Bethesda Terrace
    const dens = 0.35 + 0.5 * L.noise1(ju * 0.011 + jw * 0.007, 5) + 0.25 * L.noise1(jw * 0.013 - ju * 0.004, 9);
    if (keep > dens) continue;
    out.push({ u: ju, w: jw, r, h: 10 + r * 2.4, tone: (rnd() * 4) | 0, elm: false });
  }
  for (const t of out) Object.assign(t, toWorld(t.u, t.w));
  return out;
})();

/** Sunbathers / picnickers on the meadow (static): {x, y, u, w, ang (body direction, rad, world), blanket: [r,g,b] | null,
 *  bw, bh (blanket size m), pose: 'lying'|'sitting', shirt: [r,g,b]}. The hero (camera.js PERSON) is NOT in this list:
 *  the hand layer draws them; nobody else lies within 9 m of the hand. */
export const PEOPLE = (() => {
  const out = [], rnd = L.rng(66);
  const shirts = [[230, 230, 225], [40, 60, 110], [190, 60, 60], [240, 200, 80], [70, 140, 120], [30, 30, 34], [220, 130, 160], [120, 160, 210]];
  const blankets = [[200, 70, 60], [60, 110, 170], [230, 220, 200], [240, 180, 60], [110, 160, 110], [170, 90, 160], [70, 70, 80], [230, 120, 90]];
  let tries = 0;
  while (out.length < 420 && tries++ < 20000) {
    const u = (rnd() * 2 - 1) * 158, w = (rnd() * 2 - 1) * 88;
    if (!inMeadow(u, w, 6)) continue;
    if (Math.hypot(u - HAND_UW.u, w - HAND_UW.w) < 9) continue;              // keep the hero's neighbourhood clear
    if (out.some((p) => Math.hypot(p.u - u, p.w - w) < 4.2)) continue;
    const group = rnd() < 0.45;
    const ang = rnd() * Math.PI * 2;
    out.push({ u, w, ang, blanket: rnd() < 0.7 ? blankets[(rnd() * blankets.length) | 0] : null, bw: 1.8 + rnd() * 0.6,
      bh: 1.5 + rnd() * 0.5, pose: rnd() < 0.55 ? 'lying' : 'sitting', shirt: shirts[(rnd() * shirts.length) | 0], group });
  }
  for (const p of out) Object.assign(p, toWorld(p.u, p.w));
  return out;
})();

/** Walkers / runners / cyclists on the paths: position at time t (s) is a pure function. Returns
 *  [{x, y, ang, kind: 'walk'|'run'|'bike', shirt}] for the paths whose kind is not 'plaza'. Cyclists only on roads. */
const MOVERS = (() => {
  const out = [], rnd = L.rng(808);
  const shirts = [[230, 230, 225], [40, 60, 110], [190, 60, 60], [240, 200, 80], [70, 140, 120], [30, 30, 34], [220, 130, 160]];
  PATHS.forEach((p, pi) => {
    if (p.kind === 'plaza') return;
    const len = p.pts.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - p.pts[i][0], q[1] - p.pts[i][1]), 0);
    const n = Math.round(len / (p.kind === 'mall' ? 7 : p.kind === 'road' ? 40 : 16));
    for (let i = 0; i < n; i++) {
      const kind = p.kind === 'road' ? (rnd() < 0.6 ? 'bike' : 'run') : (rnd() < 0.85 ? 'walk' : 'run');
      const speed = kind === 'walk' ? 1.3 + rnd() * 0.3 : kind === 'run' ? 2.8 + rnd() * 0.8 : 6 + rnd() * 2;
      out.push({ pi, s0: rnd() * len, len, dir: rnd() < 0.5 ? 1 : -1, lane: (rnd() - 0.5) * p.w * 0.7, speed, kind,
        shirt: shirts[(rnd() * shirts.length) | 0] });
    }
  });
  return out;
})();
export function moversAt(t) {
  return MOVERS.map((m) => {
    const p = PATHS[m.pi];
    let s = ((m.s0 + m.dir * m.speed * t) % m.len + m.len) % m.len;
    let i = 0;
    for (; i + 1 < p.pts.length; i++) {
      const seg = Math.hypot(p.pts[i + 1][0] - p.pts[i][0], p.pts[i + 1][1] - p.pts[i][1]);
      if (s <= seg) break;
      s -= seg;
    }
    i = Math.min(i, p.pts.length - 2);
    const [a, b] = [p.pts[i], p.pts[i + 1]];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const du = (b[0] - a[0]) / seg, dw = (b[1] - a[1]) / seg;
    const u = a[0] + du * s - dw * m.lane, w = a[1] + dw * s + du * m.lane;
    const wpos = toWorld(u, w);
    const dx = (du * E_LONG.x + dw * E_CROSS.x) * m.dir, dy = (du * E_LONG.y + dw * E_CROSS.y) * m.dir;
    return { x: wpos.x, y: wpos.y, ang: Math.atan2(dy, dx), kind: m.kind, shirt: m.shirt };
  });
}
