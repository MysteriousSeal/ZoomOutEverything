// Environment for "How to Survive a Riot" (EP 28, How to Survive #2). Owned by the setup agent / orchestrator —
// builders: read, don't edit. Put shared needs in "sharedRequests".
//
// LOOK: a night city block seen from directly above, deep blue-black, warm sodium pools, the crowd as thousands of
//   glowing particles (1 particle = 1 person) coloured by their MEASURED local density (DENS ramp: cool ≤ 1.2 → warm
//   white 2.4 → pale amber 3.6 → amber 4.4 → red ≥ 5 people/m²). Safe/exit = SAFE green, crush/hazard = DANGER red, civil-defence yellow
//   STEP badges (CD) — the How to Survive series system copied from ep 27 (stepBadge, badgeSub, hazardTile, safetyCard)
//   + the safety-card pictogram (POSE, joints, drawPicto, picLayer, motionArc; used by s04/s05). No human figures anywhere except the safety-card pictograms.
//
// WORLD (metres, x east/right, y SOUTH/down; camera.js header has the story layout):
//   PLAZA x −26…26, y −22…22 (paved, 4 m grid) · AVENUE carriageway x −9…9 north of it (crowd to y ≈ −82; sidewalks
//   to ±12; parked cars beyond the crowd's tail) · WALL x 26 (y −22…22, the warehouse's blank west wall, x 26…26.7) ·
//   FENCE y 22, x −26…−3.5 (construction hoarding; the site lies behind it) · STREET (the narrow street, the pinch)
//   x −3…3, y 22 → 140 · MOUTH (0, 22) = the funnel · UNDERPASS: the rail viaduct crosses y 62…74 (drawn OVER the
//   crowd) · PARK x −95…−26, y −24…36, rising west (elevation(x, y): 0 m at the plaza edge → ≈ 6.5 m at x −58;
//   contours every 0.5 m, majors every 1 m) · FOOTPATH from the plaza edge (−26, 3.5) up to the REFUGE door
//   (−46, −3) · REFUGE x −60…−46, y −12…6: roof fades (roofK) in beat 7 to its floor plan: central corridor
//   y −4.5…−2 (YOU ends at REFUGE.safe (−53, −3.5)), rooms N and S, WINDOWS = 1.4 m panes on the outer walls
//   (array of {x0, y0, x1, y1, side}) · SW road y 36…46 with parked cars · buildings everywhere else (procedural
//   blocks, rooftop detail) · lamps (LAMPS) with sodium pools.
//
// THE CROWD (crowdAt(gt, tl) → {n, x, y, rho, vis}: Float32Arrays, world metres, people/m²; cached per gt):
//   ≈ 9 k particles. Homes are laid out ONCE by error diffusion from a designed density map (plaza core ≈ 3.5/m²,
//   thinning west to ≈ 1.6, avenue 2.3, the funnel ≈ 4–5, the narrow street 4.1). Position = home + CLOSED-FORM
//   displacement (pure function of gt: every frame is identical in any order / any worker):
//     personal sway (noise1; amplitude grows with moodK) · street particles stream south at 0.45 m/s (wrap hidden
//     under the viaduct) · hook PINCH WAVES: wobbly converging rings on MOUTH (one every 1.5 s, t0 −6 … 3, 6.5 m/s;
//     the last reaches the mouth ≈ 9.2 s), each continuing as a pulse down the narrow street · moodK: the plaza crowd
//     packs in toward its core (≈ 7 %) + three pulsing HOTSPOTS (HOTSPOTS, east half) · pressure toward the wall / fence / funnel (pressK) · SURGE WAVES in beat 3 (planar fronts
//     travelling SOUTH at 6 m/s, arriving at y 0 at T.surgeHits, fronts bowed; steep front, slow relaxation) · gas
//     dispersal (beat 6) · a 1.3 m keep-out around YOU · then a soft clamp into the walkable domain (people pile up
//     against the wall/fence/funnel instead of passing through them).
//   Density is MEASURED every frame (0.5 m grid, normalised blur ≈ 2.5 m footprint), so the heat really follows the
//   particles: compression fronts of the waves read as moving red bands; the wall, fence and funnel go red under
//   pressure. densityAt(x, y, gt, tl) samples it.
//   waveFronts(gt, tl) → active fronts for drawing: {kind:'ring', x, y, R, k} | {kind:'line', yAt(x), x0, x1, k}.
//
// YOU: youAt(gt, tl) → {x, y} = camera.js youBase + the same crowd displacement (so the surge carries it);
//   youTrail(t0, t1, tl, n) → [[x, y], …] for the dashed zig-zag; youScreen(v) → [sx, sy]. env draws the YOU dot (white,
//   always), its ring + "YOU" chip from T.youOn (youK). The ring is screen-size (r ≈ 26 px).
//
// GAS (beat 6): gasPuffs(gt, tl) → [{x, y, r, a}] (pale CS cloud venting from GAS_SRC (4, 6) at T.gas0, drifting with
//   WIND (1.6, 0.25) m/s = blowing EAST: upwind is WEST, also uphill); gasCentre, gasK. env draws it over the crowd.
//
// TIME STATE (all from timesFor(tl), camera.js; pass v.tl): moodK (10.69 +1.6 s) · pressK (17.04 → eases from 29.9) ·
//   contourK (faint 0.18 always → 1 from T.uphill 42.86) · roofK (T.indoors 48.38 +1.2 s) · youK (T.youOn 8.22) · gasK.
//
// LAYERS: drawBackground = ground, plaza, park (+ contours), site, lamp pools, buildings, trees, cars, refuge (roof /
//   plan), heat glow, crowd particles. drawForeground = gas, the viaduct (over the narrow street), YOU.
//   drawHud = top bar + a CROWD DENSITY legend (top right, y 246–334, from T.youOn to beat 8) with a YOU marker.
//   Scenes draw everything beat-specific: headline (s00), STEP badges + glyphs, zone highlights (s02, from ZONES),
//   wave labels / zig-zag path (s03), pictogram cards (s04, s05), wind arrow + contour labels + eye/water glyph (s06),
//   window marks (s07), the question card (s08).
//
// HELPERS: toWorld(c, v) (multiply the canvas into world metres; line widths then in metres: use px * v.cam.mpp) ·
//   wpt(v, x, y) → [sx, sy] · densColor(rho) · arrow(c, x0, y0, x1, y1, w, head, col) · prohibition(c, cx, cy, r, k,
//   slashK, glyph) + glyphPhone / glyphEye / glyphDrop / glyphWindow (glyph(c, s): centred at 0,0, size s, current fill).
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, topBar } from '../../../engine/runtime/kit.js';
import { KEYS, SHOT, SHOTS, MPP, AY, ANCHOR, rowAt, colAt, timesFor, shotAt, youBase, youSmooth } from './camera.js';

export { KEYS, SHOT, SHOTS, MPP, AY, rowAt, colAt, timesFor, shotAt, youBase, youSmooth };
const { W, H } = L;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ palette
export const ACCENT = [255, 200, 60];
export const CD = { yellow: [255, 204, 0], black: [14, 14, 16], ink: [10, 10, 12] };   // civil-defence yellow/black
export const SAFE = [70, 220, 130];
export const DANGER = [240, 72, 56];
export const AMBER = [255, 170, 60];
export const SODIUM = [255, 176, 88];
export const TEXT = [238, 236, 230];
export const GAS = [214, 224, 192];
const GROUND = [9, 12, 21], ASPHALT = [14, 17, 27], WALK = [22, 25, 36], PAVING = [24, 27, 39], LAWN = [11, 21, 25];
const ROOF = [24, 28, 41], PARAPET = [50, 56, 76];

/** people/m² → colour */
export const DENS_STOPS = [[0, [110, 150, 215]], [1.2, [168, 198, 238]], [2.4, [252, 242, 226]], [3.6, [255, 214, 152]], [4.4, [255, 158, 54]], [5, [244, 74, 48]], [6.5, [255, 44, 70]]];
export const densColor = (rho) => L.ramp(DENS_STOPS, rho);

// ------------------------------------------------------------------ timing (derived from build/timeline.json)
/** Story times for the current timeline (camera.js timesFor). Live binding set by sync(tl) (env calls it at every entry
 *  point); scenes should use timesFor(v.tl). */
export let T = null;
let TL = null;
export function sync(tl) { if (tl && tl !== TL) { TL = tl; T = timesFor(tl); WAVES = buildWaves(tl, T); } return T; }
const S = (tl, i) => tl.scenes[i].start;

export const moodK = (gt, tl) => (sync(tl), L.smoothstep(L.prog(gt, T.mood0, 1.6)));
export const pressK = (gt, tl) => (sync(tl), L.smoothstep(L.prog(gt, T.zones - 0.3, 1.8)) * (1 - 0.75 * L.smoothstep(L.prog(gt, T.calm0, 3))));
export const contourK = (gt, tl) => (sync(tl), 0.18 + 0.82 * L.smoothstep(L.prog(gt, T.uphill - 0.2, 1.2)));
export const roofK = (gt, tl) => (sync(tl), L.ease.inOutCubic(L.prog(gt, T.indoors, 1.2)));
export const youK = (gt, tl) => (sync(tl), L.ease.outCubic(L.prog(gt, T.youOn, 0.5)));
export const gasK = (gt, tl) => (sync(tl), L.smoothstep(L.prog(gt, T.gas0 + 0.2, 2.5)));

// ------------------------------------------------------------------ geometry
export const PLAZA = { x0: -26, x1: 26, y0: -22, y1: 22 };
export const AVENUE = { x0: -9, x1: 9, walk0: -12, walk1: 12, y0: -160, y1: -22, crowdTail: -82 };
export const WALL = { x: 26, t: 0.7, y0: -22, y1: 22 };
export const FENCE = { y: 22, x0: -26, x1: -3.5 };
export const STREET = { x0: -3, x1: 3, y0: 22, y1: 160, walk: 1.6 };
export const MOUTH = { x: 0, y: 22 };
export const UNDERPASS = { y0: 62, y1: 74 };
export const PARK = { x0: -95, x1: -26, y0: -24, y1: 36 };
export const SITE = { x0: -26, x1: -3.5, y0: 22.4, y1: 46 };
export const SWROAD = { x0: -140, x1: -26, y0: 36, y1: 46 };
export const EXIT = { x: -26, y: 3.5 };   // where the footpath leaves the plaza: the green exit route
export const FOOTPATH = [[-26, 3.5], [-29.5, 3.5], [-35.5, 0.6], [-41, -2], [-46, -3]];
export const REFUGE = { x0: -60, x1: -46, y0: -12, y1: 6, door: { x: -46, y: -3, w: 1.6 }, safe: { x: -53, y: -3.5 }, corridor: { y0: -4.5, y1: -2 } };
/** crush zones for s02: rects (world) + a label anchor */
export const ZONES = [
  { name: 'WALL', x0: 23.5, x1: 26, y0: -22, y1: 22, lx: 24, ly: -14 },
  { name: 'FENCE', x0: -26, x1: -3.5, y0: 19.5, y1: 22, lx: -16, ly: 19 },
  { name: 'NARROW STREET', x0: -3, x1: 3, y0: 18, y1: 62, lx: 3.5, ly: 40 },
];

// refuge plan: rooms, interior walls, windows
export const WINDOWS = (() => {
  const o = [], { x0, x1, y0, y1 } = REFUGE;
  for (let x = x0 + 1.4; x <= x1 - 2.6; x += 2.6) { o.push({ x0: x, y0, x1: x + 1.4, y1: y0, side: 'N' }); o.push({ x0: x, y0: y1, x1: x + 1.4, y1, side: 'S' }); }
  for (let y = y0 + 1.6; y <= y1 - 2.4; y += 2.6) {
    if (y < -1 && y + 1.4 > -5) continue;   // the corridor ends: door (east) and stair core (west) — no panes
    o.push({ x0, y0: y, x1: x0, y1: y + 1.4, side: 'W' }); o.push({ x0: x1, y0: y, x1, y1: y + 1.4, side: 'E' });
  }
  return o;
})();
const REFUGE_WALLS = [   // interior partitions [x0, y0, x1, y1]
  [-60, -4.5, -47.5, -4.5], [-60, -2, -47.5, -2],   // corridor
  [-55.2, -12, -55.2, -4.5], [-50.6, -12, -50.6, -4.5], [-54.5, -2, -54.5, 6], [-50, -2, -50, 6],
  [-57.5, -4.5, -57.5, -2],   // stair core end
];

// ------------------------------------------------------------------ procedural city
const BUILDINGS = (() => {
  const r = L.rng(2801), out = [];
  const blocks = [
    [-140, -12.5, -170, -25.5], [12.5, 140, -170, -25.5],   // NW, NE (north of the plaza, either side of the avenue)
    [26.7, 140, -23.5, 23.5],                              // the warehouse east of the wall (one big roof)
    [4, 140, 23, 60], [4, 140, 76, 170],                   // SE, S of the viaduct
    [-140, -4, 47.5, 60], [-140, -4, 76, 170],             // SW
    [-140, -96.5, -24, 35],                                // far west, beyond the park
  ];
  function split(x0, x1, y0, y1, depth) {
    const w = x1 - x0, h = y1 - y0;
    if ((w < 30 && h < 30) || depth > 5) {
      const ins = 0.35 + r() * 0.5;
      out.push({ x0: x0 + ins, x1: x1 - ins, y0: y0 + ins, y1: y1 - ins, tone: r(), seed: (r() * 1e9) | 0 });
      return;
    }
    const gap = r() < 0.3 ? 3 + r() * 2 : 0.2;   // sometimes an alley
    if (w > h) { const m = x0 + w * (0.35 + r() * 0.3); split(x0, m - gap / 2, y0, y1, depth + 1); split(m + gap / 2, x1, y0, y1, depth + 1); }
    else { const m = y0 + h * (0.35 + r() * 0.3); split(x0, x1, y0, m - gap / 2, depth + 1); split(x0, x1, m + gap / 2, y1, depth + 1); }
  }
  for (const [x0, x1, y0, y1] of blocks) {
    if (x0 === 26.7) { out.push({ x0, x1: 70, y0, y1, tone: 0.3, seed: 77, big: true }); out.push({ x0: 72, x1, y0, y1, tone: 0.6, seed: 78 }); continue; }
    split(x0, x1, y0, y1, 0);
  }
  for (const b of out) {   // rooftop detail
    const q = L.rng(b.seed), d = [];
    const w = b.x1 - b.x0, h = b.y1 - b.y0, n = Math.min(7, 1 + Math.floor(w * h / 120));
    for (let i = 0; i < n; i++) {
      const kind = q() < 0.55 ? 'hvac' : q() < 0.6 ? 'sky' : 'tank';
      const s = kind === 'tank' ? 1 + q() * 0.8 : 1.4 + q() * 2.6, s2 = kind === 'tank' ? s : 1.2 + q() * 2.2;
      const x = b.x0 + 1.2 + q() * Math.max(0, w - 2.4 - s), y = b.y0 + 1.2 + q() * Math.max(0, h - 2.4 - s2);
      d.push({ kind, x, y, w: s, h: s2 });
    }
    if (b.big) for (let i = 0; i < 6; i++) d.push({ kind: 'sky', x: b.x0 + 6, y: b.y0 + 4 + i * 7, w: 30, h: 2.2 });
    b.detail = d;
  }
  return out;
})();

export const LAMPS = (() => {
  const o = [];
  for (let y = -30; y >= -150; y -= 18) { o.push([-11, y]); o.push([11, y]); }
  for (const p of [[-24.5, -20.5], [-24.5, 0], [-24.5, 20.5], [24.5, -20.5], [24.5, 0], [24.5, 20.5], [-12, -20.5], [12, -20.5], [12, 20.5], [0, 0]]) o.push(p);
  for (const y of [30, 46, 82, 98, 114]) o.push([3.6, y]);
  for (const p of [[-33, 0.4], [-40.5, -4.2], [-44.5, -7.5], [-31, -12], [-38, 18], [-52, 22]]) o.push(p);
  for (let x = -32; x >= -140; x -= 20) o.push([x, 36.6]);
  return o;
})();

export const CARS = (() => {
  const r = L.rng(2803), o = [];
  const cols = [[120, 30, 34], [40, 60, 98], [170, 170, 176], [30, 32, 38], [90, 96, 108], [140, 118, 70], [60, 86, 70], [200, 200, 204]];
  const add = (x, y, rot) => o.push({ x, y, rot, l: 4.2 + r() * 0.6, w: 1.8, col: cols[(r() * cols.length) | 0] });
  for (let x = -30; x > -140; x -= 5.6 + r() * 2.5) { if (r() < 0.85) add(x, 37.5 + 0.2, 0); if (r() < 0.8) add(x - 2, 44.5, 0); }
  for (let y = -96; y > -160; y -= 5.6 + r() * 2.5) { if (r() < 0.85) add(-7.6, y, Math.PI / 2); if (r() < 0.85) add(7.6, y, Math.PI / 2); }
  for (let y = 80; y < 160; y += 5.8 + r() * 2) if (r() < 0.6) add(-1.9, y, Math.PI / 2);
  return o;
})();

// ------------------------------------------------------------------ terrain (the park hill)
export function elevation(x, y) {
  if (x > -26) return (y > 22 && Math.abs(x) < 6) ? -Math.min(2.4, (y - 22) * 0.05) : 0;
  const w = L.clamp((-26 - x) / 32);
  return 6.5 * (0.35 * w + 0.65 * L.smoothstep(w)) + 2.4 * Math.sin(y / 7 + x / 13) * w * (1 - w);
}
const CONTOURS = (() => {
  const minor = new Path2D(), major = new Path2D();
  const st = 0.5, x0 = PARK.x0, y0 = PARK.y0, nx = Math.round((PARK.x1 - 0.5 - x0) / st), ny = Math.round((PARK.y1 - y0) / st);
  const E = new Float32Array((nx + 1) * (ny + 1));
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) E[j * (nx + 1) + i] = elevation(x0 + i * st, y0 + j * st);
  for (let lv = 0.5; lv <= 7; lv += 0.5) {
    const P = Math.abs(lv - Math.round(lv)) < 1e-6 ? major : minor;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = E[j * (nx + 1) + i], b = E[j * (nx + 1) + i + 1], c = E[(j + 1) * (nx + 1) + i + 1], d = E[(j + 1) * (nx + 1) + i];
      const pts = [];
      const X = x0 + i * st, Y = y0 + j * st;
      if ((a < lv) !== (b < lv)) pts.push([X + st * (lv - a) / (b - a), Y]);
      if ((b < lv) !== (c < lv)) pts.push([X + st, Y + st * (lv - b) / (c - b)]);
      if ((d < lv) !== (c < lv)) pts.push([X + st * (lv - d) / (c - d), Y + st]);
      if ((a < lv) !== (d < lv)) pts.push([X, Y + st * (lv - a) / (d - a)]);
      if (pts.length >= 2) { P.moveTo(pts[0][0], pts[0][1]); P.lineTo(pts[1][0], pts[1][1]); }
      if (pts.length === 4) { P.moveTo(pts[2][0], pts[2][1]); P.lineTo(pts[3][0], pts[3][1]); }
    }
  }
  return { minor, major };
})();
/** where each whole-metre contour crosses y = 14 (label anchors for s06) */
export const CONTOUR_LABELS = (() => {
  const o = [];
  for (let lv = 1; lv <= 6; lv++) {
    let a = -26, b = -94;
    for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (elevation(m, 14) < lv) a = m; else b = m; }
    o.push({ level: lv, x: (a + b) / 2, y: 14 });
  }
  return o;
})();

export const TREES = (() => {
  const r = L.rng(2804), o = [];
  const segD = (px, py) => {
    let best = 1e9;
    for (let i = 1; i < FOOTPATH.length; i++) {
      const [ax, ay] = FOOTPATH[i - 1], [bx, by] = FOOTPATH[i];
      const t = L.clamp(((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2));
      best = Math.min(best, Math.hypot(px - ax - t * (bx - ax), py - ay - t * (by - ay)));
    }
    return best;
  };
  for (let k = 0; k < 900 && o.length < 70; k++) {
    const x = L.lerp(PARK.x0 + 2, -29.5, r()), y = L.lerp(PARK.y0 + 2, PARK.y1 - 2, r()), rad = 1.8 + r() * 1.7;
    if (segD(x, y) < rad + 2.2) continue;
    if (x > REFUGE.x0 - 3 - rad && x < REFUGE.x1 + 3 + rad && y > REFUGE.y0 - 3 - rad && y < REFUGE.y1 + 3 + rad) continue;
    if (o.some((t) => Math.hypot(t.x - x, t.y - y) < (t.r + rad) * 0.85)) continue;
    o.push({ x, y, r: rad, tone: r() });
  }
  return o;
})();

// ------------------------------------------------------------------ the crowd: homes
const DOM = [   // walkable rects (overlapping so the openings never act as walls)
  [PLAZA.x0, PLAZA.x1, PLAZA.y0, PLAZA.y1],
  [AVENUE.x0, AVENUE.x1, -95, -14],
  [STREET.x0, STREET.x1, 14, 80],
];
function inDomain(x, y) {
  return (x >= PLAZA.x0 && x <= PLAZA.x1 && y >= PLAZA.y0 && y <= PLAZA.y1)
    || (x >= AVENUE.x0 && x <= AVENUE.x1 && y >= -95 && y <= -14) || (x >= STREET.x0 && x <= STREET.x1 && y >= 14 && y <= 80);
}
function rhoOpen(x, y) {
  if (x >= PLAZA.x0 && x <= PLAZA.x1 && y >= PLAZA.y0 && y <= PLAZA.y1) {
    let r = 2.3 + 1.2 * Math.exp(-((x - 2) ** 2 + (y + 5) ** 2) / 180);
    r *= L.lerp(0.72, 1, L.smoothstep(L.clamp((x + 26) / 18)));
    r += 1.4 * Math.exp(-(x * x) / 40 - (y - 21) ** 2 / 30);
    r += 0.7 * Math.exp(-(26 - x) / 2.5);
    return r;
  }
  if (x >= AVENUE.x0 && x <= AVENUE.x1 && y < PLAZA.y0 && y >= AVENUE.crowdTail) return 2.3 * L.smoothstep(L.clamp((y - AVENUE.crowdTail) / 16));
  return 0;
}
/** error-diffusion scatter: blue-noise points whose local count matches rho (people/m²) */
function scatter(x0, x1, y0, y1, rho, seed, out, kind) {
  const st = 0.2, nx = Math.ceil((x1 - x0) / st), ny = Math.ceil((y1 - y0) / st), r = L.rng(seed);
  let cur = new Float32Array(nx + 2), nxt = new Float32Array(nx + 2);
  for (let j = 0; j < ny; j++) {
    const ltr = j % 2 === 0;
    for (let k = 0; k < nx; k++) {
      const i = ltr ? k : nx - 1 - k, x = x0 + (i + 0.5) * st, y = y0 + (j + 0.5) * st;
      const val = rho(x, y) * st * st + cur[i + 1];
      let e = val;
      if (val >= 0.5) { out.push([x + (r() - 0.5) * st * 1.6, y + (r() - 0.5) * st * 1.6, kind]); e = val - 1; }
      const dx = ltr ? 1 : -1;
      cur[i + 1 + dx] += e * 7 / 16; nxt[i + 1 - dx] += e * 3 / 16; nxt[i + 1] += e * 5 / 16; nxt[i + 1 + dx] += e / 16;
    }
    [cur, nxt] = [nxt, cur]; nxt.fill(0);
  }
}
const STREAM = { y0: 22, len: 48, v: 0.45 };   // street particles: y = 22 + (home + v t) mod 48 (wrap under the viaduct)
const CR = (() => {
  const pts = [];
  scatter(-26, 26, AVENUE.crowdTail, 22, rhoOpen, 2811, pts, 0);
  scatter(-3, 3, STREAM.y0, STREAM.y0 + STREAM.len, () => 4.1, 2812, pts, 1);
  const n = pts.length, r = L.rng(2813);
  const o = { n, hx: new Float32Array(n), hy: new Float32Array(n), kind: new Uint8Array(n), f: new Float32Array(n), p: new Float32Array(n), h: new Float32Array(n) };
  pts.forEach(([x, y, k], i) => { o.hx[i] = x; o.hy[i] = y; o.kind[i] = k; o.f[i] = 0.25 + r() * 0.35; o.p[i] = r() * 100; o.h[i] = r(); });
  return o;
})();
export const CROWD_N = CR.n;

// ------------------------------------------------------------------ the crowd: displacement field
export const WIND = { x: 1.6, y: 0.25 };                 // m/s: blowing EAST (upwind = west)
export const GAS_SRC = { x: 4, y: 6 };
const WXN = 1.6 / Math.hypot(1.6, 0.25), WYN = 0.25 / Math.hypot(1.6, 0.25);   // wind direction (unit)
export const HOTSPOTS = [{ x: 11, y: -10, ph: 0 }, { x: 16, y: 7, ph: 2.1 }, { x: 2, y: 11, ph: 4.2 }];
export const PINCH = { speed: 6.5, R0: 40, A: 1.25, w1: 1.7, w2: 3.6, every: 1.5, first: -6, last: 3.0, As: 0.85, s1: 1.4, s2: 3.2 };   // As/s1/s2: the pulse continuing down the street
export const SURGE = { speed: 6, A: 2.3, w1: 1.6, w2: 4.4, from: -30, bow: 0.012, bowX: -8 };
let WAVES = [];
function buildWaves(tl, T) {
  const w = [];
  const r = L.rng(2806);
  for (let t0 = PINCH.first; t0 <= PINCH.last + 1e-6; t0 += PINCH.every) w.push({ kind: 'ring', t0, A: PINCH.A, p1: r() * TAU, p2: r() * TAU, p3: r() * TAU });
  T.surgeHits.forEach((h, i) => w.push({ kind: 'line', hit: h, t0: h + SURGE.from / SURGE.speed, A: SURGE.A * (i === 0 ? 0.85 : 1) }));
  return w;
}
const bump = (xi, w1, w2) => (xi > 0 ? Math.exp(-(xi * xi) / (w1 * w1)) : Math.exp(-(xi * xi) / (w2 * w2)));
/** surge-front y (world) at column x for wave w at gt */
const lineFront = (w, x, gt) => SURGE.speed * (gt - w.hit) - SURGE.bow * (x - SURGE.bowX) ** 2;
const lineWin = (x) => L.smoothstep(L.clamp((x + 30) / 6)) * (1 - 0.65 * L.smoothstep(L.clamp((x - 8) / 16)));

// per-frame field state (filled by fieldState)
const FS = { gt: NaN, mood: 0, press: 0, gas: 0, gx: 0, gy: 0, gr: 1, waves: [], hot: [0, 0, 0] };
function fieldState(gt, tl) {
  if (FS.gt === gt && FS.tl === tl) return FS;
  sync(tl);
  FS.gt = gt; FS.tl = tl;
  FS.mood = moodK(gt); FS.press = pressK(gt); FS.gas = gasK(gt);
  const age = Math.max(0, gt - T.gas0);
  FS.gx = GAS_SRC.x + WIND.x * 0.55 * age; FS.gy = GAS_SRC.y + WIND.y * 0.55 * age + 0.2 * age; FS.gr = 3 + 2.4 * Math.sqrt(age);
  FS.waves = [];
  for (const w of WAVES) {
    if (w.kind === 'ring') {
      const R = PINCH.R0 - PINCH.speed * (gt - w.t0);
      if (R < -50 || R > PINCH.R0 + 8) continue;
      const kin = L.smoothstep(L.prog(gt, w.t0, 0.9)), k = kin * L.smoothstep(L.clamp((R + 3) / 6));
      const ks = kin * (1 - L.smoothstep(L.clamp((-R - 26) / 20)));   // the street pulse fades out ≈ 30–45 m down the street
      FS.waves.push({ kind: 'ring', R, A: w.A * k, k, As: PINCH.As * ks, w });
    } else {
      const yf = SURGE.speed * (gt - w.hit);
      if (yf < SURGE.from - 2 || yf > 34) continue;
      // no surge before beat 3: a wave already under way fades in mid-plaza from B3 − 0.1 (its hit time is unchanged)
      const k = L.smoothstep(L.prog(gt, Math.max(w.t0, S(tl, 3) - 0.1), 0.8)) * (1 - L.smoothstep(L.clamp((yf - 22) / 10)));
      if (k > 0) FS.waves.push({ kind: 'line', w, A: w.A * k, k });
    }
  }
  for (let i = 0; i < 3; i++) FS.hot[i] = FS.mood * (0.6 + 0.4 * Math.sin(gt * 1.9 + HOTSPOTS[i].ph)) * (1 - 0.7 * L.smoothstep(L.prog(gt, T.zones, 2)));
  return FS;
}
let DX = 0, DY = 0;
/** displacement (DX, DY) of a point whose home is (hx, hy) at the state F (no sway, no keep-out, no clamp) */
function field(hx, hy, F, gt) {
  let dx = 0, dy = 0;
  for (let k = 0; k < F.waves.length; k++) {
    const wv = F.waves[k];
    if (wv.kind === 'ring') {
      if (hy > MOUTH.y - 0.5) {   // in the street: the pulse carries on down it
        if (wv.As <= 0.001) continue;
        const xi = hy - (MOUTH.y - wv.R);
        if (xi > 5 || xi < -12) continue;
        dy += wv.As * bump(xi, PINCH.s1, PINCH.s2);
        continue;
      }
      if (wv.k <= 0.001) continue;
      const ox = MOUTH.x - hx, oy = MOUTH.y - hy, d = Math.hypot(ox, oy);
      if (d < 0.05 || oy < -2) continue;
      const th = Math.atan2(ox, oy), W0 = wv.w;   // organic fronts: the radius wobbles and the strength varies round the ring
      const xi = wv.R + 1.3 * Math.sin(3 * th + W0.p1) + 0.7 * Math.sin(7 * th + W0.p2) - d;
      if (xi > 6 || xi < -14) continue;
      const cos = oy / d, win = L.smoothstep(L.clamp((cos - 0.05) / 0.5)) * (0.72 + 0.28 * Math.sin(4 * th + W0.p3));
      const u = Math.min(wv.A * bump(xi, PINCH.w1, PINCH.w2) * win, 0.42 * d);
      dx += (ox / d) * u; dy += (oy / d) * u;
    } else {
      const xi = hy - lineFront(wv.w, hx, gt);
      if (xi > 7 || xi < -16) continue;
      dy += wv.A * bump(xi, SURGE.w1, SURGE.w2) * lineWin(hx);
    }
  }
  if (F.mood > 0 && hy > PLAZA.y0 && hy < PLAZA.y1) {   // as the mood turns the plaza crowd packs in toward its core
    const cK = 0.07 * F.mood * L.smoothstep(L.clamp((hy - PLAZA.y0) / 4));
    dx -= (hx - 4) * cK; dy -= (hy + 2) * cK;
  }
  if (F.mood > 0) for (let i = 0; i < 3; i++) {
    const a = F.hot[i];
    if (a <= 0.01) continue;
    const ox = HOTSPOTS[i].x - hx, oy = HOTSPOTS[i].y - hy, e = Math.exp(-(ox * ox + oy * oy) / 25);
    dx += ox * 0.34 * a * e; dy += oy * 0.34 * a * e;
  }
  if (F.press > 0) {
    dx += F.press * 1.6 * L.smoothstep(L.clamp((hx - 2) / 22));
    dy += F.press * 1.7 * L.smoothstep(L.clamp((hy + 8) / 28)) * (hy < 22 ? 1 : 0);
  }
  if (F.gas > 0) {   // people clear out of the cloud: an irregular clearing stretched DOWNWIND (east), not a circle
    const ox = hx - F.gx, oy = hy - F.gy, d = Math.hypot(ox, oy) + 0.01;
    const al = ox * WXN + oy * WYN, cr = -ox * WYN + oy * WXN, th = Math.atan2(cr, al);
    const a2 = al / (al > 0 ? 1.9 : 1.05), rf = 1 + 0.2 * Math.sin(3 * th + 0.7) + 0.12 * Math.sin(5 * th + 2.1) + 0.07 * Math.sin(8 * th + 4.4);
    const dn2 = (a2 * a2 + cr * cr) / (rf * rf), m = 4.2 * F.gas * Math.exp(-dn2 / (F.gr * F.gr * 1.5));
    dx += (ox / d) * m; dy += (oy / d) * m;
  }
  DX = dx; DY = dy;
}
// soft clamp into the walkable domain: people compress against walls instead of crossing them
const CM = 0.28, CB = 0.55;
let CX = 0, CY = 0;
function clampDom(x, y) {
  let best = -1e9, ax = 0, ay = 0;
  for (let k = 0; k < 3; k++) {
    const R = DOM[k];
    const a = x - R[0], b = R[1] - x, c = y - R[2], d = R[3] - y;
    let m = a, nx = 1, ny = 0;
    if (b < m) { m = b; nx = -1; ny = 0; }
    if (c < m) { m = c; nx = 0; ny = 1; }
    if (d < m) { m = d; nx = 0; ny = -1; }
    if (m > best) { best = m; ax = nx; ay = ny; }
  }
  if (best < CM + 5 * CB) {
    const z = (best - CM) / CB, f = CM + CB * (z > 30 ? z : Math.log1p(Math.exp(z)));
    x += ax * (f - best); y += ay * (f - best);
  }
  CX = x; CY = y;
}

// ------------------------------------------------------------------ YOU
const youCache = { gt: NaN, tl: null, x: 0, y: 0 };
/** YOU's position at gt (world m): the base path + the crowd's displacement (so surges carry it). Pure. */
export function youAt(gt, tl) {
  if (youCache.gt === gt && youCache.tl === tl) return youCache;
  const b = youBase(gt, tl), F = fieldState(gt, tl);
  let x = b.x, y = b.y;
  if (inDomain(x, y)) {
    const sav = F.gas; F.gas = 0;   // the gas never pushes YOU (it walks out on its own path)
    field(x, y, F, gt); F.gas = sav;
    clampDom(x + DX, y + DY); x = CX; y = CY;
  }
  youCache.gt = gt; youCache.tl = tl; youCache.x = x; youCache.y = y;
  return youCache;
}
/** YOU's trail over [t0, t1] as [[x, y], …] (n + 1 samples) — e.g. s03's dashed zig-zag */
export function youTrail(t0, t1, tl, n = 60) {
  const o = [];
  for (let i = 0; i <= n; i++) { const p = youAt(L.lerp(t0, t1, i / n), tl); o.push([p.x, p.y]); }
  return o;
}
export const youScreen = (v) => { const p = youAt(v.gt, v.tl); return [v.wx(p.x), v.wy(p.y)]; };

// ------------------------------------------------------------------ the crowd: per frame
const OUT = { n: CR.n, x: new Float32Array(CR.n), y: new Float32Array(CR.n), rho: new Float32Array(CR.n), vis: new Uint8Array(CR.n), gt: NaN, tl: null };
export const GRID = { x0: -27, y0: -86, st: 0.5, nx: 108, ny: 316 };
const GN = GRID.nx * GRID.ny;
const G_CNT = new Float32Array(GN), G_TMP = new Float32Array(GN), G_RHO = new Float32Array(GN);
const G_MASK = (() => {
  const m = new Float32Array(GN);
  for (let j = 0; j < GRID.ny; j++) for (let i = 0; i < GRID.nx; i++) {
    let s = 0;
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) s += inDomain(GRID.x0 + (i + (a + 0.5) / 4) * GRID.st, GRID.y0 + (j + (b + 0.5) / 4) * GRID.st) ? 1 : 0;
    m[j * GRID.nx + i] = s / 16;
  }
  const t = new Float32Array(GN);
  blur(m, t); blur(m, t);
  return m;
})();
function blur(a, t) {   // separable box blur radius 1 (in place, via t)
  const { nx, ny } = GRID;
  for (let j = 0; j < ny; j++) {
    const o = j * nx;
    for (let i = 0; i < nx; i++) t[o + i] = (a[o + i] + (i > 0 ? a[o + i - 1] : 0) + (i < nx - 1 ? a[o + i + 1] : 0)) / 3;
  }
  for (let j = 0; j < ny; j++) {
    const o = j * nx;
    for (let i = 0; i < nx; i++) a[o + i] = (t[o + i] + (j > 0 ? t[o + i - nx] : 0) + (j < ny - 1 ? t[o + i + nx] : 0)) / 3;
  }
}

/** The crowd at gt: {n, x, y, rho, vis} (world metres, people/m², visible flag). Pure; cached for the last gt. */
export function crowdAt(gt, tl) {
  if (OUT.gt === gt && OUT.tl === tl) return OUT;
  const F = fieldState(gt, tl);
  const you = youAt(gt, tl), yx = you.x, yy = you.y, kr = 0.45 + 0.85 * youK(gt, tl), kr2 = kr * kr;
  const sway = 0.1 + 0.2 * F.mood + 0.06 * F.press, swF = 1 + 0.6 * F.mood;
  const { hx, hy, kind, f, p, h } = CR;
  G_CNT.fill(0);
  for (let i = 0; i < CR.n; i++) {
    let x = hx[i], y = hy[i], vis = 1;
    if (kind[i] === 1) {
      let s = (y - STREAM.y0 + STREAM.v * gt) % STREAM.len;
      if (s < 0) s += STREAM.len;
      y = STREAM.y0 + s;
      if (s < 2 && h[i] > s / 2) vis = 0;   // dithered fade-in at the funnel
    }
    field(x, y, F, gt);
    const ph = p[i], fq = f[i] * swF;
    x += DX + L.noise1(gt * fq + ph, 3) * sway;
    y += DY + L.noise1(gt * fq + ph + 37.3, 4) * sway;
    const ox = x - yx, oy = y - yy, dd = ox * ox + oy * oy;
    if (dd < kr2) { const d = Math.sqrt(dd) + 1e-3, push = (kr - d) * 0.9; x += (ox / d) * push; y += (oy / d) * push; }
    clampDom(x, y);
    OUT.x[i] = CX; OUT.y[i] = CY; OUT.vis[i] = vis;
    const gi = ((CX - GRID.x0) / GRID.st) | 0, gj = ((CY - GRID.y0) / GRID.st) | 0;
    if (vis && gi >= 0 && gj >= 0 && gi < GRID.nx && gj < GRID.ny) G_CNT[gj * GRID.nx + gi] += 1;
  }
  blur(G_CNT, G_TMP); blur(G_CNT, G_TMP);
  const area = GRID.st * GRID.st;
  for (let k = 0; k < GN; k++) G_RHO[k] = G_MASK[k] > 0.12 ? G_CNT[k] / (G_MASK[k] * area) : 0;
  for (let i = 0; i < CR.n; i++) {
    const gi = ((OUT.x[i] - GRID.x0) / GRID.st) | 0, gj = ((OUT.y[i] - GRID.y0) / GRID.st) | 0;
    OUT.rho[i] = gi >= 0 && gj >= 0 && gi < GRID.nx && gj < GRID.ny ? G_RHO[gj * GRID.nx + gi] : 0;
  }
  OUT.gt = gt; OUT.tl = tl;
  return OUT;
}
/** measured density (people/m²) at world (x, y) at gt */
export function densityAt(x, y, gt, tl) {
  crowdAt(gt, tl);
  const gi = ((x - GRID.x0) / GRID.st) | 0, gj = ((y - GRID.y0) / GRID.st) | 0;
  return gi >= 0 && gj >= 0 && gi < GRID.nx && gj < GRID.ny ? G_RHO[gj * GRID.nx + gi] : 0;
}
/** active wave fronts at gt (for labels / guide lines): ring {kind, x, y, R, k} or line {kind, yAt(x), x0, x1, k} */
export function waveFronts(gt, tl) {
  const F = fieldState(gt, tl);
  return F.waves.map((w) => (w.kind === 'ring'
    ? { kind: 'ring', x: MOUTH.x, y: MOUTH.y, R: Math.max(0, w.R), k: w.k }
    : { kind: 'line', yAt: (x) => lineFront(w.w, x, gt), x0: PLAZA.x0, x1: PLAZA.x1, k: w.k, hit: w.w.hit }));
}

// ------------------------------------------------------------------ gas
const PUFFS = (() => { const r = L.rng(2805); return Array.from({ length: 80 }, (_, i) => ({ dt: i * 0.07 + r() * 0.06, a: r() * TAU, sp: 0.45 + r() * 0.9, sh: r() })); })();
/** tear-gas puffs at gt: [{x, y, r, a}] (world m; a = opacity 0..1) */
export function gasPuffs(gt, tl) {
  sync(tl);
  const o = [];
  for (const q of PUFFS) {
    const age = gt - (T.gas0 + q.dt);
    if (age <= 0) continue;
    const sq = Math.sqrt(age);
    o.push({
      x: GAS_SRC.x + WIND.x * age * q.sp + Math.cos(q.a) * 2.2 * sq,
      y: GAS_SRC.y + WIND.y * age * q.sp + Math.sin(q.a) * 1.5 * sq + 0.22 * age,   // CS is heavy: it slumps toward the low street
      r: 1.6 + 2.0 * sq,
      a: Math.min(1, age / 0.5) * Math.exp(-age / 14),
    });
  }
  return o;
}
export const gasCentre = (gt, tl) => { const F = fieldState(gt, tl); return { x: F.gx, y: F.gy, r: F.gr }; };

// ------------------------------------------------------------------ drawing helpers
/** multiply the canvas into world metres for camera v.cam (call inside save/restore) */
export function toWorld(c, v) {
  const s = 1 / v.cam.mpp;
  c.transform(s, 0, 0, s, W / 2 - v.cam.x * s, H * (v.cam.anchor ?? ANCHOR) - v.cam.y * s);
}
export const wpt = (v, x, y) => [v.wx(x), v.wy(y)];
function viewRect(v, pad = 6) {
  const m = v.cam.mpp, ay = H * (v.cam.anchor ?? ANCHOR);
  return { x0: v.cam.x - (W / 2) * m - pad, x1: v.cam.x + (W / 2) * m + pad, y0: v.cam.y - ay * m - pad, y1: v.cam.y + (H - ay) * m + pad };
}
const hit = (V, x0, x1, y0, y1) => x1 > V.x0 && x0 < V.x1 && y1 > V.y0 && y0 < V.y1;

/** a drawn arrow from (x0,y0) to the tip (x1,y1) (screen px) */
export function arrow(c, x0, y0, x1, y1, w, head, col) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  c.strokeStyle = col; c.fillStyle = col;
  c.lineWidth = w; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1 - Math.cos(a) * head * 0.6, y1 - Math.sin(a) * head * 0.6); c.stroke();
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x1 - Math.cos(a - 0.45) * head, y1 - Math.sin(a - 0.45) * head);
  c.lineTo(x1 - Math.cos(a + 0.45) * head, y1 - Math.sin(a + 0.45) * head);
  c.closePath(); c.fill();
}

// ------------------------------------------------------------------ map
function drawMap(c, v) {
  const V = viewRect(v), m = v.cam.mpp;
  c.fillStyle = L.rgba(GROUND);
  c.fillRect(0, 0, W, H);
  c.save();
  toWorld(c, v);
  // roads (asphalt) under everything, sidewalks
  c.fillStyle = L.rgba(ASPHALT);
  c.fillRect(-140, -170, 280, 340);
  c.fillStyle = L.rgba(WALK);
  c.fillRect(AVENUE.walk0, -170, 3, 148); c.fillRect(AVENUE.x1, -170, 3, 148);
  c.fillRect(STREET.x0 - STREET.walk, 22, STREET.walk, 140); c.fillRect(STREET.x1, 22, STREET.walk, 140);
  c.fillRect(-140, SWROAD.y0 - 2, 114, 2); c.fillRect(-140, SWROAD.y1, 136, 1.5);
  // avenue markings (centre dashes, beyond and under the crowd)
  c.fillStyle = 'rgba(210,205,190,0.16)';
  for (let y = -160; y < -24; y += 6) if (y < AVENUE.crowdTail - 3) c.fillRect(-0.08, y, 0.16, 3);   // (none under the crowd)
  c.fillStyle = 'rgba(210,205,190,0.035)';   // the crossing at the plaza and the dashes under the crowd: barely there
  for (let y = AVENUE.crowdTail - 3; y < -24; y += 6) c.fillRect(-0.08, y, 0.16, 3);
  for (let i = 0; i < 9; i++) c.fillRect(-8 + i * 2, -26.5, 1, 3.5);
  for (let x = -138; x < -28; x += 6) c.fillRect(x, 40.9, 3, 0.16);
  // plaza paving + joints
  c.fillStyle = L.rgba(PAVING);
  c.fillRect(PLAZA.x0, PLAZA.y0, PLAZA.x1 - PLAZA.x0, PLAZA.y1 - PLAZA.y0);
  c.strokeStyle = 'rgba(120,135,170,0.10)'; c.lineWidth = Math.max(0.05, 1 * m);
  c.beginPath();
  for (let x = PLAZA.x0; x <= PLAZA.x1; x += 4) { c.moveTo(x, PLAZA.y0); c.lineTo(x, PLAZA.y1); }
  for (let y = PLAZA.y0; y <= PLAZA.y1; y += 4) { c.moveTo(PLAZA.x0, y); c.lineTo(PLAZA.x1, y); }
  c.stroke();
  c.strokeStyle = 'rgba(140,155,190,0.16)'; c.lineWidth = 0.18;
  c.strokeRect(PLAZA.x0, PLAZA.y0, PLAZA.x1 - PLAZA.x0, PLAZA.y1 - PLAZA.y0);
  // the park: lawn, footpath, contours
  if (hit(V, PARK.x0, PARK.x1, PARK.y0, PARK.y1)) {
    c.fillStyle = L.rgba(LAWN);
    c.fillRect(PARK.x0, PARK.y0, PARK.x1 - PARK.x0, PARK.y1 - PARK.y0);
    const ck = contourK(v.gt, v.tl);
    c.save();
    c.beginPath(); c.rect(PARK.x0, PARK.y0, PARK.x1 - PARK.x0 - 0.6, PARK.y1 - PARK.y0); c.clip();
    c.strokeStyle = `rgba(150,205,190,${0.10 + 0.22 * ck})`; c.lineWidth = Math.max(0.04, 1.2 * m);
    c.stroke(CONTOURS.minor);
    c.strokeStyle = `rgba(170,225,205,${0.2 + 0.45 * ck})`; c.lineWidth = Math.max(0.06, (1.6 + 1.2 * ck) * m);
    c.stroke(CONTOURS.major);
    c.restore();
    c.strokeStyle = 'rgb(40,45,56)'; c.lineWidth = 2.2; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); FOOTPATH.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
    c.strokeStyle = 'rgba(90,96,112,0.5)'; c.lineWidth = Math.max(0.05, 1 * m);
    c.beginPath(); FOOTPATH.forEach(([x, y], i) => (i ? c.lineTo(x, y + 1.1) : c.moveTo(x, y + 1.1))); c.stroke();
    c.beginPath(); FOOTPATH.forEach(([x, y], i) => (i ? c.lineTo(x, y - 1.1) : c.moveTo(x, y - 1.1))); c.stroke();
  }
  // construction site behind the fence
  if (hit(V, SITE.x0, SITE.x1, SITE.y0, SITE.y1)) {
    c.fillStyle = 'rgb(19,19,23)'; c.fillRect(SITE.x0, SITE.y0, SITE.x1 - SITE.x0, SITE.y1 - SITE.y0);
    c.fillStyle = 'rgba(70,60,40,0.35)'; c.fillRect(-20, 27, 9, 6);
    for (const [x, y, w, h, col] of [[-24, 36, 6, 2.4, [110, 70, 40]], [-17.5, 38, 6, 2.4, [44, 70, 100]], [-9, 25, 2.4, 6, [120, 120, 126]]]) {
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(x + 0.4, y + 0.5, w, h);
      c.fillStyle = L.rgba(col, 0.75); c.fillRect(x, y, w, h);
    }
    c.strokeStyle = 'rgba(255,204,0,0.35)'; c.lineWidth = 0.25; c.strokeRect(-14, 29, 4, 4);   // crane base
  }
  // lamp pools (additive)
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const [x, y] of LAMPS) {
    if (!hit(V, x - 10, x + 10, y - 10, y + 10)) continue;
    const g = c.createRadialGradient(x, y, 0, x, y, 10);
    g.addColorStop(0, L.rgba(SODIUM, 0.2)); g.addColorStop(0.35, L.rgba(SODIUM, 0.08)); g.addColorStop(1, L.rgba(SODIUM, 0));
    c.fillStyle = g; c.fillRect(x - 10, y - 10, 20, 20);
  }
  c.restore();
  // buildings
  for (const b of BUILDINGS) {
    if (!hit(V, b.x0, b.x1 + 2, b.y0, b.y1 + 2)) continue;
    const w = b.x1 - b.x0, h = b.y1 - b.y0;
    c.fillStyle = 'rgba(0,0,0,0.42)'; c.fillRect(b.x0 + 0.9, b.y0 + 1.2, w, h);
    c.fillStyle = L.rgba(L.mix(ROOF, [34, 38, 52], b.tone)); c.fillRect(b.x0, b.y0, w, h);
    c.strokeStyle = L.rgba(PARAPET, 0.9); c.lineWidth = 0.35; c.strokeRect(b.x0 + 0.18, b.y0 + 0.18, w - 0.36, h - 0.36);
    if (m < 0.2) for (const d of b.detail) {
      if (d.kind === 'tank') { c.fillStyle = 'rgb(46,50,64)'; c.beginPath(); c.arc(d.x + d.w / 2, d.y + d.w / 2, Math.max(0, d.w / 2), 0, TAU); c.fill(); continue; }
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(d.x + 0.25, d.y + 0.35, d.w, d.h);
      c.fillStyle = d.kind === 'sky' ? 'rgba(120,112,90,0.28)' : 'rgb(44,49,64)'; c.fillRect(d.x, d.y, d.w, d.h);
      if (d.kind === 'hvac') { c.strokeStyle = 'rgba(110,120,145,0.35)'; c.lineWidth = 0.08; c.strokeRect(d.x + 0.15, d.y + 0.15, d.w - 0.3, d.h - 0.3); }
    }
  }
  // the WALL (concrete, a light edge facing the plaza)
  c.fillStyle = 'rgb(70,74,86)'; c.fillRect(WALL.x, WALL.y0 - 1.5, WALL.t, WALL.y1 - WALL.y0 + 3);
  c.fillStyle = 'rgba(200,205,220,0.35)'; c.fillRect(WALL.x, WALL.y0 - 1.5, 0.12, WALL.y1 - WALL.y0 + 3);
  // the FENCE (hoarding panels + posts)
  c.fillStyle = 'rgb(88,90,98)'; c.fillRect(FENCE.x0, FENCE.y - 0.06, FENCE.x1 - FENCE.x0, 0.32);
  c.fillStyle = 'rgb(150,150,156)';
  for (let x = FENCE.x0 + 0.4; x < FENCE.x1; x += 2.5) c.fillRect(x - 0.12, FENCE.y - 0.15, 0.24, 0.5);
  // trees (park)
  for (const t of TREES) {
    if (!hit(V, t.x - t.r - 1, t.x + t.r + 1, t.y - t.r - 1, t.y + t.r + 1)) continue;
    c.fillStyle = 'rgba(0,0,0,0.4)'; c.beginPath(); c.arc(t.x + 0.7, t.y + 0.9, Math.max(0, t.r), 0, TAU); c.fill();
    const g = c.createRadialGradient(t.x - t.r * 0.3, t.y - t.r * 0.3, 0, t.x, t.y, t.r);
    g.addColorStop(0, L.rgba(L.mix([30, 58, 52], [44, 66, 50], t.tone))); g.addColorStop(1, L.rgba([12, 28, 30]));
    c.fillStyle = g; c.beginPath(); c.arc(t.x, t.y, Math.max(0, t.r), 0, TAU); c.fill();
  }
  // cars
  for (const k of CARS) {
    if (!hit(V, k.x - 3, k.x + 3, k.y - 3, k.y + 3)) continue;
    c.save();
    c.translate(k.x, k.y); c.rotate(k.rot);
    c.fillStyle = 'rgba(0,0,0,0.45)'; L.roundRect(c, -k.l / 2 + 0.3, -k.w / 2 + 0.35, k.l, k.w, 0.5); c.fill();
    c.fillStyle = L.rgba(L.mix(k.col, [10, 12, 20], 0.35)); L.roundRect(c, -k.l / 2, -k.w / 2, k.l, k.w, 0.55); c.fill();
    c.fillStyle = 'rgba(8,10,16,0.85)';
    c.fillRect(-k.l * 0.2, -k.w * 0.4, k.l * 0.14, k.w * 0.8); c.fillRect(k.l * 0.2, -k.w * 0.38, k.l * 0.1, k.w * 0.76);
    c.fillStyle = L.rgba(L.mix(k.col, [255, 255, 255], 0.12), 0.9); c.fillRect(-k.l * 0.06, -k.w * 0.36, k.l * 0.26, k.w * 0.72);
    c.restore();
  }
  drawRefuge(c, v);
  // lamp heads
  c.fillStyle = 'rgba(255,226,170,0.9)';
  for (const [x, y] of LAMPS) if (hit(V, x - 1, x + 1, y - 1, y + 1)) { c.beginPath(); c.arc(x, y, Math.max(0.18, 2.2 * m), 0, TAU); c.fill(); }
  c.restore();
}

function drawRefuge(c, v) {
  const { x0, x1, y0, y1 } = REFUGE, w = x1 - x0, h = y1 - y0, rk = roofK(v.gt, v.tl), m = v.cam.mpp;
  c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(x0 + 0.9, y0 + 1.2, w, h);
  if (rk > 0) {   // the plan: floor, walls, corridor, door, window panes
    c.fillStyle = 'rgb(30,33,42)'; c.fillRect(x0, y0, w, h);
    c.fillStyle = 'rgba(255,214,150,0.06)'; c.fillRect(x0, REFUGE.corridor.y0, w, REFUGE.corridor.y1 - REFUGE.corridor.y0);
    c.fillStyle = 'rgb(54,58,70)'; c.fillRect(x0, -4.5, 2.5, 2.5);   // stair core
    c.strokeStyle = 'rgb(176,184,204)'; c.lineWidth = 0.18; c.lineCap = 'butt';
    c.beginPath();
    for (const [a, b, cc, d] of REFUGE_WALLS) { c.moveTo(a, b); c.lineTo(cc, d); }
    c.stroke();
    c.lineWidth = 0.4; c.strokeStyle = 'rgb(196,204,222)';
    c.beginPath();   // outer walls with the door gap on the east face
    c.moveTo(x1, REFUGE.door.y - REFUGE.door.w / 2); c.lineTo(x1, y0); c.lineTo(x0, y0); c.lineTo(x0, y1); c.lineTo(x1, y1); c.lineTo(x1, REFUGE.door.y + REFUGE.door.w / 2);
    c.stroke();
    c.strokeStyle = 'rgba(150,200,240,0.9)'; c.lineWidth = Math.max(0.12, 2 * m);
    c.beginPath();
    for (const p of WINDOWS) { c.moveTo(p.x0, p.y0); c.lineTo(p.x1, p.y1); }
    c.stroke();
  }
  if (rk < 1) {
    c.save();
    c.globalAlpha *= 1 - rk;
    c.fillStyle = 'rgb(38,42,58)'; c.fillRect(x0, y0, w, h);
    c.strokeStyle = L.rgba(PARAPET); c.lineWidth = 0.4; c.strokeRect(x0 + 0.2, y0 + 0.2, w - 0.4, h - 0.4);
    c.fillStyle = 'rgb(48,53,70)'; c.fillRect(x0 + 3, y0 + 3, 4, 3); c.fillRect(x0 + 8.5, y0 + 11, 3, 4);
    c.fillStyle = 'rgba(120,112,90,0.3)'; c.fillRect(x0 + 2.5, y0 + 9, 4.5, 6);
    c.restore();
  }
  c.fillStyle = L.rgba(SAFE, 0.75); c.fillRect(x1 - 0.15, REFUGE.door.y - REFUGE.door.w / 2, 0.5, REFUGE.door.w);   // door, a small green light
}

// ------------------------------------------------------------------ crowd drawing
const NB = 18, BSTEP = 0.4;
const BCOL = Array.from({ length: NB }, (_, b) => L.rgba(densColor((b + 0.5) * BSTEP), 0.95));
const BIDX = new Int32Array(CR.n), BCNT = new Int32Array(NB + 1);
const HEAT = (() => { try { return new OffscreenCanvas(GRID.nx, GRID.ny); } catch { return null; } })();
const HCTX = HEAT?.getContext('2d');
const HIMG = HCTX ? HCTX.createImageData(GRID.nx, GRID.ny) : null;
const HLUT = Array.from({ length: 64 }, (_, i) => { const rho = i * 0.12; const c = densColor(rho); return [c[0], c[1], c[2], Math.round(255 * L.clamp((rho - 1.2) / 4.5) ** 1.3)]; });

/** the heat glow under the crowd (additive), alpha k */
export function drawHeat(c, v, k = 1) {
  if (!HEAT || k <= 0) return;
  crowdAt(v.gt, v.tl);
  const d = HIMG.data;
  for (let i = 0; i < GN; i++) { const q = HLUT[Math.min(63, (G_RHO[i] / 0.12) | 0)]; d[i * 4] = q[0]; d[i * 4 + 1] = q[1]; d[i * 4 + 2] = q[2]; d[i * 4 + 3] = q[3]; }
  HCTX.putImageData(HIMG, 0, 0);
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha *= 0.5 * k;
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  const x0 = v.wx(GRID.x0), y0 = v.wy(GRID.y0), s = GRID.st / v.cam.mpp;
  c.drawImage(HEAT, x0, y0, GRID.nx * s, GRID.ny * s);
  c.restore();
}

/** the particles (screen space). alpha multiplies; YOU is drawn separately (drawYou). */
export function drawCrowd(c, v, alpha = 1) {
  const C = crowdAt(v.gt, v.tl), m = v.cam.mpp, ax = W / 2 - v.cam.x / m, ay = H * (v.cam.anchor ?? ANCHOR) - v.cam.y / m, s = 1 / m;
  const r = Math.max(1.05, 0.15 / m) * (1 + 0.3 * L.smoothstep(L.clamp((0.06 - m) / 0.02))), pad = r + 2;   // close shots: dots grow so the packing reads tight
  BCNT.fill(0);
  const SX = OUT_SX, SY = OUT_SY;
  let n = 0;
  for (let i = 0; i < C.n; i++) {
    if (!C.vis[i]) continue;
    const sx = ax + C.x[i] * s, sy = ay + C.y[i] * s;
    if (sx < -pad || sx > W + pad || sy < -pad || sy > H + pad) continue;
    if (sy > ay + UNDERPASS.y0 * s && sy < ay + UNDERPASS.y1 * s && C.y[i] > UNDERPASS.y0 && C.y[i] < UNDERPASS.y1) continue;   // under the viaduct
    const b = Math.min(NB - 1, (C.rho[i] / BSTEP) | 0);
    SX[n] = sx; SY[n] = sy; SB[n] = b; BCNT[b + 1]++; n++;
  }
  for (let b = 1; b <= NB; b++) BCNT[b] += BCNT[b - 1];
  const pos = BCNT.slice(0, NB);
  for (let k = 0; k < n; k++) BIDX[pos[SB[k]]++] = k;
  c.save();
  c.globalAlpha *= alpha;
  const round = r >= 1.3;   // round dots from mid zoom (squares only for the tiniest specks)
  for (let b = 0; b < NB; b++) {
    const a0 = BCNT[b], a1 = BCNT[b + 1];
    if (a1 <= a0) continue;
    c.fillStyle = BCOL[b];
    c.beginPath();
    for (let q = a0; q < a1; q++) {
      const k = BIDX[q];
      if (round) { c.moveTo(SX[k] + r, SY[k]); c.arc(SX[k], SY[k], r, 0, TAU); } else c.rect(SX[k] - r, SY[k] - r, 2 * r, 2 * r);
    }
    c.fill();
  }
  c.restore();
}
const OUT_SX = new Float32Array(CR.n), OUT_SY = new Float32Array(CR.n), SB = new Uint8Array(CR.n);

// ------------------------------------------------------------------ gas, viaduct, YOU
// noise-textured puff sprites (deterministic value noise, 4 variants): the gas is built from many soft, semi-transparent,
// mottled puffs instead of smooth gradients
const PUFF_SPR = (() => {
  const out = [];
  try {
    for (let k = 0; k < 4; k++) {
      const N = 96, cv = new OffscreenCanvas(N, N), g = cv.getContext('2d'), img = g.createImageData(N, N), r = L.rng(2870 + k);
      const oct = [[6, 0.55], [12, 0.3], [24, 0.15]].map(([n, w]) => ({ n, w, v: Array.from({ length: (n + 1) * (n + 1) }, () => r()) }));
      const val = (o, x, y) => {
        const fx = x * o.n, fy = y * o.n, i = Math.min(o.n - 1, fx | 0), j = Math.min(o.n - 1, fy | 0), u = L.smoothstep(fx - i), w = L.smoothstep(fy - j), V = o.v, R = o.n + 1;
        return L.lerp(L.lerp(V[j * R + i], V[j * R + i + 1], u), L.lerp(V[(j + 1) * R + i], V[(j + 1) * R + i + 1], u), w);
      };
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const px = (x + 0.5) / N, py = (y + 0.5) / N, rr = Math.hypot(px - 0.5, py - 0.5) * 2;
        let n = 0; for (const o of oct) n += o.w * val(o, px, py);
        const fall = L.clamp(1 - rr) ** 1.6, a = fall * L.clamp((n - 0.28) / 0.5) ** 1.3;
        const q = (y * N + x) * 4;
        img.data[q] = GAS[0]; img.data[q + 1] = GAS[1]; img.data[q + 2] = GAS[2]; img.data[q + 3] = Math.round(255 * L.clamp(a * 1.25));
      }
      g.putImageData(img, 0, 0);
      out.push(cv);
    }
  } catch { /* no OffscreenCanvas: gas is skipped */ }
  return out;
})();
/** one gas puff (world or screen units, whatever the transform): centre (x, y), radii rx (along the wind) × ry, alpha a, variant i */
export function drawPuff(c, x, y, rx, ry, a, i = 0) {
  if (!PUFF_SPR.length || a <= 0.004 || rx <= 0 || ry <= 0) return;
  c.globalAlpha = a;
  c.drawImage(PUFF_SPR[((i % 4) + 4) % 4], x - rx, y - ry, 2 * rx, 2 * ry);
}

function drawGas(c, v) {
  const puffs = gasPuffs(v.gt, v.tl);
  if (!puffs.length) return;
  const V = viewRect(v, 12);
  c.save();
  toWorld(c, v);
  // the source cloud: young puffs crowd round the canister (dense there), older ones grow, stretch east and thin out
  puffs.forEach((p, i) => {
    if (p.a <= 0.01 || !hit(V, p.x - 1.7 * p.r, p.x + 1.7 * p.r, p.y - p.r, p.y + p.r)) return;
    drawPuff(c, p.x, p.y, p.r * (1.15 + 0.5 * Math.min(1, p.r / 8)), p.r * 0.9, 0.16 * p.a, i);
  });
  c.globalAlpha = 1;
  // the canister: a small hot dot at the source while it vents
  const age = v.gt - T.gas0;
  if (age > 0 && age < 7) { c.fillStyle = `rgba(255,236,200,${0.9 * (1 - age / 7)})`; c.beginPath(); c.arc(GAS_SRC.x, GAS_SRC.y, 0.35, 0, TAU); c.fill(); }
  c.restore();
}

function drawViaduct(c, v) {
  const V = viewRect(v);
  if (!hit(V, -200, 200, UNDERPASS.y0 - 3, UNDERPASS.y1 + 3)) return;
  c.save();
  toWorld(c, v);
  const { y0, y1 } = UNDERPASS, x0 = V.x0, w = V.x1 - V.x0;
  c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(x0, y1, w, 2.2);
  c.fillStyle = 'rgb(36,38,46)'; c.fillRect(x0, y0, w, y1 - y0);
  c.fillStyle = 'rgb(56,58,68)'; c.fillRect(x0, y0, w, 0.5); c.fillRect(x0, y1 - 0.5, w, 0.5);
  // ballast + two tracks with sleepers
  for (const ty of [y0 + 3.2, y1 - 3.2]) {
    c.fillStyle = 'rgb(44,44,50)'; c.fillRect(x0, ty - 1.6, w, 3.2);
    c.fillStyle = 'rgb(60,56,52)';
    for (let x = Math.floor(x0 / 0.65) * 0.65; x < V.x1; x += 0.65) c.fillRect(x, ty - 1.2, 0.24, 2.4);
    c.fillStyle = 'rgb(150,156,170)'; c.fillRect(x0, ty - 0.75, w, 0.09); c.fillRect(x0, ty + 0.66, w, 0.09);
  }
  c.restore();
}

/** YOU: white dot always; ring + "YOU" chip with youK (opts.k multiplies; opts.label false hides the chip) */
export function drawYou(c, v, { k = 1, label = true } = {}) {
  const p = youAt(v.gt, v.tl), sx = v.wx(p.x), sy = v.wy(p.y), m = v.cam.mpp;
  const yk = youK(v.gt, v.tl), r = L.lerp(Math.max(1.05, 0.15 / m), Math.max(2.2, 0.24 / m), yk);
  c.save();
  c.globalAlpha *= k;
  // before the reveal YOU is just another particle (density colour); it turns white as the ring lands
  c.fillStyle = L.rgba(L.mix(densColor(densityAt(p.x, p.y, v.gt, v.tl)), [255, 255, 255], yk), 0.95);
  c.shadowColor = `rgba(255,255,255,${0.9 * yk})`; c.shadowBlur = 10 * yk;
  c.beginPath(); c.arc(sx, sy, r, 0, TAU); c.fill();
  c.shadowBlur = 0;
  if (yk > 0) {
    const pulse = 0.5 + 0.5 * Math.sin(v.gt * 4.2);
    const rr = 22 + 12 * (1 - yk);
    c.globalAlpha *= yk;
    c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 2.5;
    c.beginPath(); c.arc(sx, sy, Math.max(0, rr), 0, TAU); c.stroke();
    c.strokeStyle = `rgba(255,255,255,${0.35 * (1 - pulse)})`; c.lineWidth = 1.5;
    c.beginPath(); c.arc(sx, sy, Math.max(0, rr + 6 + 10 * pulse), 0, TAU); c.stroke();
    // the chip fades out before the drift shot's zoom (no ghosting through the move), then comes back below-left of the
    // ring (clear of the zig-zag, which runs west and slightly south) through beats 4–5; from beat 6 it is back upper-right
    const mv = T.drift0 - 0.55, b6 = S(v.tl, 6), low = v.gt >= mv && v.gt < b6;   // below-left from the drift shot to beat 6
    const lk = label ? (1 - L.smoothstep(L.prog(v.gt, mv - 0.32, 0.26)) + L.smoothstep(L.prog(v.gt, mv + 0.95, 0.35)) * (1 - L.smoothstep(L.prog(v.gt, b6 - 0.3, 0.25)))
      + L.smoothstep(L.prog(v.gt, b6 + 0.35, 0.35))) : 0;
    if (lk > 0.01) {
      c.save();
      c.globalAlpha *= L.clamp(lk);
      c.font = L.font(22, 700, L.FONT.body);
      c.letterSpacing = '4px';
      const tw = c.measureText('YOU').width - 4;
      c.letterSpacing = '0px';
      const ex = sx + (low ? -1 : 1) * rr * 0.72, ey = sy + (low ? 1 : -1) * rr * 0.72;
      const lx = low ? ex - 22 - (tw + 22) : sx + rr * 0.72 + 10, ly = low ? ey + 22 : sy - rr * 0.72 - 22;
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(ex, ey); c.lineTo(low ? lx + tw + 20 : lx, ly + 15); c.stroke();
      c.fillStyle = 'rgba(8,10,16,0.82)';
      L.roundRect(c, lx - 2, ly - 2, tw + 22, 34, 6); c.fill();
      c.fillStyle = '#fff';
      c.textBaseline = 'middle';
      L.trackedText(c, 'YOU', lx + 9, ly + 15, 4);
      c.restore();
    }
  }
  c.restore();
}

// ------------------------------------------------------------------ frame
export function drawBackground(c, v) {
  sync(v.tl);
  drawMap(c, v);
  drawHeat(c, v, 1);
  drawCrowd(c, v, 1);
}

export function drawForeground(c, v) {
  sync(v.tl);
  drawGas(c, v);
  drawViaduct(c, v);
  drawYou(c, v);
}

// ------------------------------------------------------------------ STEP badge (How to Survive series system, ep 27)
export const BADGE = { x: 64, y: 372, h: 104 };
/**
 * STEP badge: a civil-defence yellow tile ("STEP" + big numeral) joined to a black plate with the instruction in white,
 * a fine yellow keyline and a hazard-stripe foot. Screen space. Returns its box {x, y, w, h} (null when k ≤ 0).
 *   n     step number (1…)        text   'LEAVE EARLY' (upper case recommended)
 *   opts  x, y (top-left; align 'center' → x is the centre) · k 0..1 (staged entrance: tile pops 0–0.6, plate wipes
 *         0.25–1; pass an eased in/out value) · size (1 = 104 px tall) · maxW (whole badge, default 940 − x) ·
 *         sub (optional small grey line under the plate) · accent (tile colour, default CD.yellow) · dim (0..1 grey-out)
 */
export function stepBadge(c, v, n, text, opts = {}) {
  const { y = BADGE.y, k = 1, size = 1, align = 'left', sub = null, accent = CD.yellow, dim = 0 } = opts;
  if (k <= 0) return null;
  const h = 104 * size, tile = h, pad = 30 * size;
  let x = opts.x ?? BADGE.x;
  const maxW = opts.maxW ?? (align === 'center' ? 880 : 940 - x);
  c.save();
  const fs = L.fitSize(c, text, maxW - tile - 2 * pad, 76 * size, 800, L.FONT.display, 26);
  c.font = L.font(fs, 800, L.FONT.display);
  c.letterSpacing = `${1 * size}px`;
  const tw = c.measureText(text).width;
  c.letterSpacing = '0px';
  const pw = tw + 2 * pad, w = tile + pw;
  if (align === 'center') x -= w / 2;
  const kt = L.clamp(k / 0.6), kp = L.ease.outCubic(L.clamp((k - 0.07) / 0.93));   // the plate wipes right behind the tile: no tile-only hold
  const pop = L.ease.outBack(kt, 2.2);
  c.globalAlpha *= L.clamp(k * 2.5) * (1 - 0.55 * dim);
  if (kp > 0) {
    c.save();
    c.beginPath(); c.rect(x + tile - 4, y - 4, (pw + 8) * kp + 4, h + 8); c.clip();
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 24 * size; c.shadowOffsetY = 6 * size;
    c.fillStyle = L.rgba(CD.black, 0.94);
    L.roundRect(c, x + tile - 12, y, pw + 12, h, 10 * size); c.fill();
    c.shadowColor = 'transparent';
    c.strokeStyle = L.rgba(accent, 0.55);
    c.lineWidth = 1.5;
    L.roundRect(c, x + tile - 12 + 6 * size, y + 6 * size, pw + 12 - 12 * size, h - 12 * size, 6 * size); c.stroke();
    const fy = y + h - 12 * size, fh = 6 * size;
    c.save();
    c.beginPath(); c.rect(x + tile + 6 * size, fy, pw - 18 * size, fh); c.clip();
    c.fillStyle = L.rgba(accent, 0.9);
    c.fillRect(x + tile, fy, pw, fh);
    c.fillStyle = L.rgba(CD.black);
    const sw = 10 * size;
    c.beginPath();
    for (let sx = x + tile - fh; sx < x + tile + pw + fh; sx += sw * 2) { c.moveTo(sx, fy + fh); c.lineTo(sx + sw, fy + fh); c.lineTo(sx + sw + fh, fy); c.lineTo(sx + fh, fy); c.closePath(); }
    c.fill();
    c.restore();
    c.fillStyle = L.rgba(TEXT);
    c.font = L.font(fs, 800, L.FONT.display);
    c.textBaseline = 'middle';
    c.letterSpacing = `${1 * size}px`;
    c.fillText(text, x + tile + pad + (1 - kp) * -20, y + h * 0.47 + fs * 0.04);
    c.letterSpacing = '0px';
    c.restore();
  }
  c.save();
  c.translate(x + tile / 2, y + h / 2);
  c.scale(Math.max(0.001, pop), Math.max(0.001, pop));
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 18 * size; c.shadowOffsetY = 4 * size;
  c.fillStyle = L.rgba(accent);
  L.roundRect(c, -tile / 2, -h / 2, tile, h, 12 * size); c.fill();
  c.shadowColor = 'transparent';
  c.fillStyle = L.rgba(CD.ink);
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.font = L.font(Math.round(17 * size), 700, L.FONT.body);
  L.trackedText(c, 'STEP', 0, -h / 2 + 27 * size, 4 * size, 'center');
  c.font = L.font(Math.round(66 * size), 700, L.FONT.din);
  c.fillText(String(n), 0, h / 2 - 14 * size);
  c.restore();
  if (sub && kp > 0) {
    c.globalAlpha *= kp;
    c.font = L.font(Math.round(24 * size), 600, L.FONT.body);
    c.fillStyle = 'rgba(214,218,226,0.92)';
    c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 10;
    c.textBaseline = 'alphabetic';
    L.trackedText(c, sub, x + 4, y + h + 40 * size, 3 * size);
  }
  c.restore();
  return { x, y, w, h };
}

/** the small grey line under a badge, on a soft dark chip so it reads over the busy map (ep 27 s01) */
export function badgeSub(c, text, k, col = [214, 218, 226], { x = BADGE.x + 4, y = BADGE.y + BADGE.h + 40 } = {}) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= L.clamp(k);
  c.font = L.font(24, 600, L.FONT.body);
  c.letterSpacing = '3px';
  const w = c.measureText(text).width - 3;
  c.letterSpacing = '0px';
  const yy = y + (1 - k) * 8;
  c.fillStyle = 'rgba(8,8,12,0.62)';
  L.roundRect(c, x - 12, yy - 27, w + 24, 38, 8); c.fill();
  c.fillStyle = L.rgba(col, 0.95);
  c.textBaseline = 'alphabetic';
  L.trackedText(c, text, x, yy, 3);
  c.restore();
}

/** a hazard tile (same size/pop as a STEP tile, red by default) with a glyph(c, s) drawn white at its centre */
export function hazardTile(c, k, glyph, { x = BADGE.x, y = BADGE.y, h = BADGE.h, color = DANGER } = {}) {
  if (k <= 0) return;
  const pop = L.ease.outBack(L.clamp(k / 0.6), 2.2);
  c.save();
  c.translate(x + h / 2, y + h / 2);
  c.scale(Math.max(0.001, pop), Math.max(0.001, pop));
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 18; c.shadowOffsetY = 4;
  c.fillStyle = L.rgba(color);
  L.roundRect(c, -h / 2, -h / 2, h, h, 12); c.fill();
  c.shadowColor = 'transparent';
  c.fillStyle = 'rgb(250,246,240)'; c.strokeStyle = 'rgb(250,246,240)';
  glyph?.(c, h * 0.62);
  c.restore();
}

// ------------------------------------------------------------------ glyphs + ISO prohibition sign
/** smartphone seen front-on, with a record dot (centred, height s) — uses the current fill/stroke */
export function glyphPhone(c, s) {
  const w = s * 0.52, h = s;
  c.save();
  c.lineWidth = s * 0.08; c.lineJoin = 'round';
  L.roundRect(c, -w / 2, -h / 2, w, h, s * 0.1); c.stroke();
  c.fillRect(-w * 0.16, -h / 2 + s * 0.07, w * 0.32, s * 0.035);
  c.beginPath(); c.arc(0, s * 0.06, Math.max(0, s * 0.12), 0, TAU); c.fill();
  c.restore();
}
/** an open eye (almond + iris), width s */
export function glyphEye(c, s) {
  const ew = s * 0.5, eh = s * 0.27, R = (ew * ew + eh * eh) / (2 * eh);
  c.save();
  c.lineWidth = s * 0.07;
  c.beginPath();
  c.arc(0, -eh + R, R, -Math.PI / 2 - Math.asin(ew / R), -Math.PI / 2 + Math.asin(ew / R));
  c.arc(0, eh - R, R, Math.PI / 2 - Math.asin(ew / R), Math.PI / 2 + Math.asin(ew / R));
  c.closePath(); c.stroke();
  c.beginPath(); c.arc(0, 0, Math.max(0, eh * 0.62), 0, TAU); c.fill();
  c.restore();
}
/** a water drop, height s */
export function glyphDrop(c, s) {
  const r = s * 0.3;
  c.beginPath();
  c.moveTo(0, -s / 2);
  c.bezierCurveTo(r * 0.5, -s * 0.2, r * 1.05, s * 0.02, r, s * 0.2);
  c.arc(0, s * 0.2, Math.max(0, r), 0, Math.PI);
  c.bezierCurveTo(-r * 1.05, s * 0.02, -r * 0.5, -s * 0.2, 0, -s / 2);
  c.closePath(); c.fill();
}
/** a window pane with a crack star (ep 27's hazard glyph), height s */
export function glyphWindow(c, s) {
  const pw = s * 0.84, ph = s;
  c.save();
  c.lineWidth = s * 0.09; c.lineJoin = 'round';
  L.roundRect(c, -pw / 2, -ph / 2, pw, ph, s * 0.06); c.stroke();
  const ix = pw * 0.12, iy = -ph * 0.12;
  c.lineWidth = s * 0.05; c.lineCap = 'round';
  c.beginPath();
  for (const [a, l] of [[-2.6, 0.31], [-1.4, 0.27], [-0.2, 0.24], [0.9, 0.33], [2.0, 0.37], [2.9, 0.28]]) { c.moveTo(ix, iy); c.lineTo(ix + Math.cos(a) * l * s, iy + Math.sin(a) * l * s); }
  c.stroke();
  c.restore();
}
/** ISO-style prohibition sign: white disc, red ring + slash (wipes in with slashK), a black glyph(c, s) */
export function prohibition(c, cx, cy, r, k, slashK, glyph) {
  if (k <= 0) return;
  const s = L.ease.outBack(L.clamp(k), 1.6);
  c.save();
  c.translate(cx, cy);
  c.scale(Math.max(0.001, s), Math.max(0.001, s));
  c.globalAlpha *= L.clamp(k * 2);
  const ring = r * 0.17;
  c.fillStyle = 'rgb(246,244,238)';
  c.beginPath(); c.arc(0, 0, Math.max(0, r - ring * 0.5), 0, TAU); c.fill();
  c.fillStyle = L.rgba(CD.ink); c.strokeStyle = L.rgba(CD.ink);
  glyph?.(c, r * 1.05);
  c.strokeStyle = L.rgba(DANGER);
  c.lineWidth = ring;
  c.beginPath(); c.arc(0, 0, Math.max(0, r - ring / 2), 0, TAU); c.stroke();
  const sk = L.ease.outCubic(L.clamp(slashK));
  if (sk > 0) {
    const a = Math.PI * 0.25, rr = r - ring * 0.6;
    c.lineCap = 'butt';
    c.beginPath();
    c.moveTo(-Math.cos(a) * rr, -Math.sin(a) * rr);
    c.lineTo(-Math.cos(a) * rr + 2 * Math.cos(a) * rr * sk, -Math.sin(a) * rr + 2 * Math.sin(a) * rr * sk);
    c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------------ safety card (ep 27 s01)
export const CARD_BG = [16, 17, 21];
/** the safety card backing: opaque off-black, fine yellow keyline. box {x, y, w, h, r}; k = entrance 0..1; fn draws inside (clipped) */
export function safetyCard(c, k, box, fn) {
  if (k <= 0) return;
  const { x, y, w, h, r = 18 } = box;
  c.save();
  c.globalAlpha *= L.clamp(k * 1.6);
  c.translate(0, (1 - k) * 24);
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 26; c.shadowOffsetY = 8;
  c.fillStyle = L.rgba(CARD_BG);
  L.roundRect(c, x, y, w, h, r); c.fill();
  c.shadowColor = 'transparent';
  c.strokeStyle = L.rgba(CD.yellow, 0.42); c.lineWidth = 1.5;
  L.roundRect(c, x + 7, y + 7, w - 14, h - 14, r - 6); c.stroke();
  c.save();
  L.roundRect(c, x + 8, y + 8, w - 16, h - 16, r - 7); c.clip();
  fn?.();
  c.restore();
  c.restore();
}

// ------------------------------------------------------------------ the safety-card pictogram (series figure: ep 27's system)
// Ported from ep 27 (How to Survive #1) drawFigure: ONE merged filled ISO 7010 / airline-safety-card silhouette, side view,
// facing LEFT — a head disc with a clean neck gap (knock-out ring in the card colour) and a nose cue, a constant-width
// torso (a gently curved capsule here, so the curl's back can round into a C), legs as merged capsules with foot wedges,
// far limbs one tone down; the near arm carries a thin knock-out edge where it crosses the body or the head, and the
// shoulder is re-closed after it (no notch). Limbs are solved by 2-bone IK toward interpolated targets (lengths never
// stretch between keys; knees bend forward, elbows down/back), and every joint is clamped to the ground line.
// API kept for s04/s05: POSE, mixPose, pathPose, joints, drawPicto, picLayer, motionArc, poseBox.
const RAD = Math.PI / 180;
// Figure units: s = standing height, origin = ground point under the hips (standing), y down. Angles in degrees, screen
// convention (0 right, 90 down, −90 up, 180 left). Hand targets are relative to the shoulder; ankle targets absolute.
const LEN = { torso: 0.30, neck: 0.172, thigh: 0.245, shin: 0.235, ul: 0.17, fl: 0.16, foot: 0.08 };
const WID = { torso: 0.13, leg: 0.088, arm: 0.052, head: 0.086, fist: 0.036, gap: 0.02 };
const FLOOR = { hip: WID.torso / 2, sh: WID.torso / 2, head: WID.head + 0.004, knee: WID.leg / 2, ankle: 0.042, elbow: WID.arm / 2, hand: WID.fist };
export const POSE = {
  // stand: arms hang, feet flat, a hair apart
  stand: { hx: 0, hy: -0.518, torso: -90, bend: 0, neck: -90, face: 180, nAx: -0.035, nAy: -0.042, fAx: 0.03, fAy: -0.042, nFoot: 180, fFoot: 180, nHx: -0.03, nHy: 0.33, fHx: 0.012, fHy: 0.33, over: 0, asg: -1, ksg: 1, legKO: 0, ox: 0 },
  // boxer's stance: knees soft, feet staggered, a slight forward hunch; both forearms up in front of the chest as a frame,
  // fists below the chin — the near fist low and close, the far (lead) fist higher and further out, so two fists read
  boxer: { hx: 0.01, hy: -0.472, torso: -97, bend: 0.03, neck: -94, face: 172, nAx: -0.11, nAy: -0.042, fAx: 0.1, fAy: -0.042, nFoot: 180, fFoot: 180, nHx: -0.105, nHy: 0.03, fHx: -0.19, fHy: -0.04, over: 0, asg: -1, ksg: 1, legKO: 0, ox: 0 },
  // fallen, face down: a slight hip/knee break (heels lifted), the far forearm along the ground beyond the head, the near
  // arm cocked to push up (hand planted under the chest, elbow up) — clear of the head
  prone: { hx: 0.15, hy: -0.07, torso: -180, bend: 0.03, neck: -155, face: 110, nAx: 0.6, nAy: -0.1, fAx: 0.625, fAy: -0.065, nFoot: 70, fFoot: 80, nHx: -0.3, nHy: 0.036, fHx: -0.37, fHy: 0.0, over: 0, asg: -1, ksg: 1, legKO: 0, ox: 0 },
  // pushing up: the near foot planted forward (knee up), the far knee down, a hand on the knee
  rise: { hx: 0.06, hy: -0.3, torso: -112, bend: 0.04, neck: -104, face: 168, nAx: -0.16, nAy: -0.042, fAx: 0.33, fAy: -0.045, nFoot: 180, fFoot: 0, nHx: -0.12, nHy: 0.27, fHx: -0.06, fHy: 0.29, over: 0, asg: -1, ksg: 1, legKO: 0, ox: 0 },
  // going down to the side: deep crouch, chin tucking, the near hand reaching for the ground
  crouch: { hx: 0.08, hy: -0.25, torso: -148, bend: 0.1, neck: -170, face: 120, nAx: -0.05, nAy: -0.042, fAx: 0.06, fAy: -0.042, nFoot: 180, fFoot: 180, nHx: -0.1, nHy: 0.3, fHx: -0.13, fHy: -0.03, over: 0.4, asg: 0.3, ksg: 1, legKO: 0, ox: 0 },
  // curled up on the side (fetal): body horizontal, back rounded into a gentle C, knees drawn up under the chest (thighs
  // ≈ 70–90° to the chest), shins folded back, the head tucked low near the ground; both forearms wrapped over the
  // top/back of the head as clean capsules, hands at the nape
  curl: { hx: 0.16, hy: -0.23, torso: -177, bend: 0.25, neck: 150, face: 60, nAx: 0.24, nAy: -0.045, fAx: 0.28, fAy: -0.05, nFoot: 0, fFoot: 0, nHx: -0.17, nHy: -0.02, fHx: -0.165, fHy: -0.075, over: 1, asg: 0.3, ksg: 1, legKO: 0, ox: 0 },
};
const PK = Object.keys(POSE.stand);
export function mixPose(a, b, k) {
  const A = typeof a === 'string' ? POSE[a] : a, B = typeof b === 'string' ? POSE[b] : b, o = {};
  for (const key of PK) o[key] = L.lerp(A[key], B[key], k);
  return o;
}
/** Catmull-Rom through poses (names or objects), u 0..1 */
export function pathPose(list, u) {
  const K = list.map((n) => (typeof n === 'string' ? POSE[n] : n)), N = K.length - 1;
  u = L.clamp(u) * N;
  const seg = Math.min(N - 1, Math.floor(u)), f = u - seg;
  const P = (i) => K[Math.max(0, Math.min(N, i))];
  const p0 = P(seg - 1), p1 = P(seg), p2 = P(seg + 1), p3 = P(seg + 2), o = {};
  for (const k of PK) {
    const a = p0[k], b = p1[k], cc = p2[k], d = p3[k];
    o[k] = 0.5 * (2 * b + (-a + cc) * f + (2 * a - 5 * b + 4 * cc - d) * f * f + (-a + 3 * b - 3 * cc + d) * f * f * f);
  }
  return o;
}
const D = (p, a, l) => ({ x: p.x + Math.cos(a * RAD) * l, y: p.y + Math.sin(a * RAD) * l });
/** 2-bone IK: joint between root A and target T2 (lengths l1, l2), bending to side sg (±1); returns [joint, end] */
function ik(A, T2, l1, l2, sg) {
  const dx = T2.x - A.x, dy = T2.y - A.y, d0 = Math.hypot(dx, dy) || 1e-6;
  const d = L.clamp(d0, Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-4), a = Math.atan2(dy, dx);
  const b = Math.acos(L.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const J = { x: A.x + Math.cos(a + sg * b) * l1, y: A.y + Math.sin(a + sg * b) * l1 };
  const e = Math.atan2(T2.y - J.y, T2.x - J.x);
  return [J, { x: J.x + Math.cos(e) * l2, y: J.y + Math.sin(e) * l2 }];
}
const floorP = (p, r) => { if (p.y > -r) p.y = -r; return p; };
/** joint positions (figure units), clamped to the ground line */
export function joints(q) {
  q = typeof q === 'string' ? POSE[q] : q;
  if (q.hip) return q;   // already a joint set (CURL_J, lerpJ)
  const hip = floorP({ x: q.hx, y: q.hy }, FLOOR.hip);
  const sh = floorP(D(hip, q.torso, LEN.torso), FLOOR.sh);
  const head = floorP(D(sh, q.neck, LEN.neck), FLOOR.head);
  // legs: knee side blend (ksg +1 knees forward … −1 knees drawn up over the body when lying on the side)
  const [nK, nA] = ik(hip, { x: q.nAx, y: q.nAy }, LEN.thigh, LEN.shin, q.ksg);
  const [fK, fA] = ik(hip, { x: q.fAx, y: q.fAy }, LEN.thigh, LEN.shin, q.ksg);
  // arms: the elbow side is a continuous blend (asg −1 elbow down/back … +1 elbow up/forward); lengths stay exact
  const [nE, nH] = ik(sh, { x: sh.x + q.nHx, y: sh.y + q.nHy }, LEN.ul, LEN.fl, q.asg);
  const [fE, fH] = ik(sh, { x: sh.x + q.fHx, y: sh.y + q.fHy }, LEN.ul * 0.98, LEN.fl * 0.98, q.asg);
  floorP(nK, FLOOR.knee); floorP(fK, FLOOR.knee); floorP(nA, FLOOR.ankle); floorP(fA, FLOOR.ankle);
  floorP(nE, FLOOR.elbow); floorP(fE, FLOOR.elbow); floorP(nH, FLOOR.hand); floorP(fH, FLOOR.hand);
  // spine control point (quadratic): chord midpoint pushed along the back normal (+bend = the back bulges out)
  const ang = Math.atan2(sh.y - hip.y, sh.x - hip.x), nb = { x: -Math.sin(ang), y: Math.cos(ang) };
  const mid = floorP({ x: (hip.x + sh.x) / 2 + nb.x * q.bend * LEN.torso, y: (hip.y + sh.y) / 2 + nb.y * q.bend * LEN.torso }, FLOOR.hip);
  return { hip, sh, head, nK, nA, fK, fA, nE, nH, fE, fH, mid, face: q.face, nFoot: q.nFoot, fFoot: q.fFoot, over: q.over, legKO: q.legKO, ox: q.ox };
}
// The curl is hand-built (explicit joints, no IK): lying on the side, fetal, head LEFT on the ground. Hip and shoulder
// rest on the ground line, the spine a gentle C opening toward the front (up), the head resting on the ground at the
// left end; thighs drawn up toward the chest (≈ 75° to the torso), shins folded back, feet together near the seat; both
// forearms wrapped over the crown/back of the head, elbows forward in front of the face, the knees pointing the same way.
const P_ = (x, y) => ({ x, y });
export const CURL_J = {
  hip: P_(0.215, -0.08), sh: P_(-0.075, -0.08), mid: P_(0.07, -0.06), head: P_(-0.228, -0.094),
  nK: P_(0.04, -0.262), nA: P_(0.255, -0.14), fK: P_(-0.005, -0.235), fA: P_(0.225, -0.096),
  nE: P_(-0.16, -0.25), nH: P_(-0.295, -0.128), fE: P_(-0.1, -0.262), fH: P_(-0.265, -0.205),
  face: -60, nFoot: 12, fFoot: 15, over: 1, legKO: 1, ox: 0,
};
/** joint-space blend (positions lerp; angles + flags lerp too) */
export function lerpJ(a, b, k) {
  const A = joints(a), B = joints(b), o = {};
  for (const key of Object.keys(B)) {
    const u = A[key], w = B[key];
    o[key] = typeof w === 'object' ? { x: L.lerp(u.x, w.x, k), y: L.lerp(u.y, w.y, k) } : L.lerp(u, w, k);
  }
  return o;
}
/** the roll from the IK "crouch" down onto the side (b 0..1 → CURL_J): the torso and neck rotate about the hip with their
 *  lengths kept (no shrinking blob frames), the arms come up to the head first, the legs fold up last; limbs blend in
 *  their parent's frame; every joint stays above the ground line. */
export function rollJ(b) {
  const A = joints('crouch'), B = CURL_J;
  const e = (u) => L.ease.inOutCubic(L.clamp(u));
  const kt = e(b / 0.95), kh = e(b / 0.6), ka = e(b / 0.75), kl = e(b / 0.85);   // the seat drops first, then the roll
  const polar = (p, o) => ({ a: Math.atan2(p.y - o.y, p.x - o.x), l: Math.hypot(p.x - o.x, p.y - o.y) });
  const lerpA = (a0, a1, k) => { let d = a1 - a0; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return a0 + d * k; };
  const along = (o, P0, P1, k) => { const l = L.lerp(P0.l, P1.l, k), a = lerpA(P0.a, P1.a, k); return { x: o.x + Math.cos(a) * l, y: o.y + Math.sin(a) * l }; };
  const tA = polar(A.sh, A.hip), tB = polar(B.sh, B.hip), tN = lerpA(tA.a, tB.a, kt);
  const rot = (p, o, a) => { const x = p.x - o.x, y = p.y - o.y, c0 = Math.cos(a), s0 = Math.sin(a); return { x: x * c0 - y * s0, y: x * s0 + y * c0 }; };
  // limb offsets blend in the torso's own frame (so the limbs ride the roll instead of sweeping across it)
  const rel = (o, a, ao, b2, bo, k) => {
    const u = rot(a, ao, -tA.a), w = rot(b2, bo, -tB.a), m = { x: L.lerp(u.x, w.x, k), y: L.lerp(u.y, w.y, k) };
    const r = rot(m, { x: 0, y: 0 }, tN);
    return { x: o.x + r.x, y: o.y + r.y };
  };
  const hip = { x: L.lerp(A.hip.x, B.hip.x, kt), y: L.lerp(A.hip.y, B.hip.y, kh) };
  const sh = along(hip, tA, tB, kt);
  const head = rel(sh, A.head, A.sh, B.head, B.sh, kt);
  const cm = (J) => ({ x: (J.hip.x + J.sh.x) / 2, y: (J.hip.y + J.sh.y) / 2 });
  const mid = rel(cm({ hip, sh }), A.mid, cm(A), B.mid, cm(B), kt);
  const nK = rel(hip, A.nK, A.hip, B.nK, B.hip, kl), fK = rel(hip, A.fK, A.hip, B.fK, B.hip, kl);
  const nA = rel(nK, A.nA, A.nK, B.nA, B.nK, kl), fA = rel(fK, A.fA, A.fK, B.fA, B.fK, kl);
  const nE = rel(sh, A.nE, A.sh, B.nE, B.sh, ka), fE = rel(sh, A.fE, A.sh, B.fE, B.sh, ka);
  const nH = rel(nE, A.nH, A.nE, B.nH, B.nE, ka), fH = rel(fE, A.fH, A.fE, B.fH, B.fE, ka);
  floorP(hip, FLOOR.hip); floorP(sh, FLOOR.sh); floorP(head, FLOOR.head); floorP(mid, FLOOR.hip);
  floorP(nK, FLOOR.knee); floorP(fK, FLOOR.knee); floorP(nA, FLOOR.ankle); floorP(fA, FLOOR.ankle);
  floorP(nE, FLOOR.elbow); floorP(fE, FLOOR.elbow); floorP(nH, FLOOR.hand); floorP(fH, FLOOR.hand);
  return { hip, sh, head, mid, nK, nA, fK, fA, nE, nH, fE, fH, face: L.lerp(A.face, B.face, kt), nFoot: L.lerp(A.nFoot, B.nFoot, kl), fFoot: L.lerp(A.fFoot, B.fFoot, kl),
    over: L.lerp(A.over, B.over, ka), legKO: kl > 0.5 ? 1 : 0, ox: 0 };
}
/** the drawn silhouette's bounds (figure units, incl. limb radii): {x0, x1, y0, y1} */
export function poseBox(q) {
  const J = joints(q);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9;
  for (const [p, r] of [[J.head, WID.head], [J.sh, WID.torso / 2], [J.mid, WID.torso / 2], [J.hip, WID.torso / 2], [J.nK, WID.leg / 2], [J.fK, WID.leg / 2], [J.nA, 0.06], [J.fA, 0.06], [J.nE, WID.arm / 2], [J.fE, WID.arm / 2], [J.nH, WID.fist], [J.fH, WID.fist]]) {
    x0 = Math.min(x0, p.x - r); x1 = Math.max(x1, p.x + r); y0 = Math.min(y0, p.y - r);
  }
  return { x0: x0 + J.ox, x1: x1 + J.ox, y0, y1: 0 };
}

// ------------------------------------------------------------------ pictogram: renderer
export const INK = [246, 244, 238];
/** draw at ground point (x, y), standing height s px. opts: ink, gap (card colour = knock-out), shadow (contact shadow 0..1),
 *  ground (rule 0..1), hi: { nArm, fArm } yellow tint 0..1 on the forearms · afterTorso(c, P, J): drawn over the torso,
 *  under the head and near arm. Everything opaque: fade the whole figure with picLayer, never limb by limb. */
export function drawPicto(c, x, y, s, pose, { ink = INK, gap = CARD_BG, shadow = 1, ground = 1, hi = null, afterTorso = null } = {}) {
  const J = joints(pose);
  const ox = x + J.ox * s;
  const P = (p) => [ox + p.x * s, y + p.y * s];
  const inkS = L.rgba(ink), farInk = L.mix(ink, gap, 0.42), farS = L.rgba(farInk), gapS = L.rgba(gap);
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  // ground rule + soft contact glow under whatever touches the ground
  if (ground > 0) {
    const g = c.createLinearGradient(x - 0.78 * s, 0, x + 0.78 * s, 0);
    g.addColorStop(0, L.rgba(ink, 0)); g.addColorStop(0.18, L.rgba(ink, 0.42 * ground)); g.addColorStop(0.82, L.rgba(ink, 0.42 * ground)); g.addColorStop(1, L.rgba(ink, 0));
    c.fillStyle = g;
    c.fillRect(x - 0.78 * s, y + 0.006 * s, 1.56 * s, Math.max(2, 0.011 * s));
  }
  if (shadow > 0) {
    const low = [J.nA, J.fA, J.nK, J.fK, J.hip, J.head, J.nH, J.fH].filter((p) => p.y > -0.12);
    const xs = (low.length ? low : [J.nA, J.fA]).map((p) => p.x), x0 = Math.min(...xs), x1 = Math.max(...xs);
    const cx = ox + ((x0 + x1) / 2) * s, rx = Math.max(0.1 * s, ((x1 - x0) / 2 + 0.1) * s);
    c.save();
    c.translate(cx, y + 0.008 * s); c.scale(1, 0.09);
    const sg = c.createRadialGradient(0, 0, 0, 0, 0, rx);
    sg.addColorStop(0, L.rgba(ink, 0.16 * shadow)); sg.addColorStop(1, L.rgba(ink, 0));
    c.fillStyle = sg; c.beginPath(); c.arc(0, 0, Math.max(0, rx), 0, TAU); c.fill();
    c.restore();
  }
  const line = (pts, w, col) => { c.strokeStyle = col; c.lineWidth = w * s; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(...P(p)) : c.moveTo(...P(p)))); c.stroke(); };
  const disc = (p, r, col) => { const [px, py] = P(p); c.fillStyle = col; c.beginPath(); c.arc(px, py, Math.max(0, r * s), 0, TAU); c.fill(); };
  const foot = (A, K, ang, col) => {   // a wedge: heel under the ankle, toe along the foot direction, sole flat
    const a = ang * RAD, ax = Math.cos(a), ay = Math.sin(a), px = Math.sin(a), py = -Math.cos(a);
    const pt = (fx, fy) => P({ x: A.x + ax * fx + px * fy, y: A.y + ay * fx + py * fy });
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(...pt(-0.03, -0.032)); c.lineTo(...pt(-0.036, 0.036)); c.lineTo(...pt(LEN.foot, 0.036)); c.lineTo(...pt(LEN.foot * 0.7, 0.0)); c.lineTo(...pt(0.02, -0.034));
    c.closePath(); c.fill();
  };
  const spine = (w, col) => {
    c.strokeStyle = col; c.lineWidth = w * s;
    c.beginPath(); c.moveTo(...P(J.hip)); c.quadraticCurveTo(...P(J.mid), ...P(J.sh)); c.stroke();
  };
  const fHi = L.rgba(L.mix(farInk, CD.yellow, 0.9 * (hi?.fArm ?? 0))), nHi = L.rgba(L.mix(ink, CD.yellow, 0.9 * (hi?.nArm ?? 0)));
  const farOver = J.over > 0.5;
  // far side (one tone down): leg + foot; the arm too unless it wraps over the head (curl)
  line([J.hip, J.fK, J.fA], WID.leg, farS);
  foot(J.fA, J.fK, J.fFoot, farS);
  if (!farOver) { line([J.sh, J.fE], WID.arm, farS); line([J.fE, J.fH], WID.arm, fHi); disc(J.fH, WID.fist, fHi); }
  // the body: torso, near leg + foot — one ink, merged (no knock-out seams)
  spine(WID.torso, inkS);
  if (J.legKO > 0.5) {   // lying on the side: the near leg is drawn up over the body — a thin knock-out keeps it a separate shape
    line([J.nK, J.nA], WID.leg + 2 * WID.gap * 0.8, gapS);
    line([J.hip, J.nK], WID.leg + 2 * WID.gap * 0.8, gapS);
    disc(J.hip, WID.torso * 0.5, inkS);
  }
  line([J.hip, J.nK, J.nA], WID.leg, inkS);
  foot(J.nA, J.nK, J.nFoot, inkS);
  afterTorso?.(c, (p) => P(p), J);
  // head: knock-out ring (a clean neck gap), disc, nose cue toward the face direction
  disc(J.head, WID.head + WID.gap, gapS);
  disc(J.head, WID.head, inkS);
  if (J.over < 0.5) {   // (no nose cue when the arms wrap the head)
    const a = J.face * RAD, r = WID.head;
    const pt = (ang, rr) => P({ x: J.head.x + Math.cos(ang) * rr, y: J.head.y + Math.sin(ang) * rr });
    c.fillStyle = inkS;
    c.beginPath(); c.moveTo(...pt(a - 0.5, r * 0.92)); c.lineTo(...pt(a, r * 1.32)); c.lineTo(...pt(a + 0.5, r * 0.92)); c.closePath(); c.fill();
  }
  // far arm wrapped over the head (curl): its own knock-out so it reads as a separate capsule
  if (farOver) {
    line([J.fE, J.fH], WID.arm + 2 * WID.gap * 0.8, gapS); disc(J.fH, WID.fist + WID.gap * 0.8, gapS);
    line([J.sh, J.fE], WID.arm, farS); line([J.fE, J.fH], WID.arm, fHi); disc(J.fH, WID.fist, fHi);
  }
  // near arm over everything, with a thin knock-out edge; then re-close the shoulder (the knock-out must not notch the torso)
  line([J.sh, J.nE, J.nH], WID.arm + 2 * WID.gap * 0.8, gapS); disc(J.nH, WID.fist + WID.gap * 0.8, gapS);
  disc(J.sh, WID.torso * 0.5, inkS);
  line([J.sh, J.nE], WID.arm, inkS); line([J.nE, J.nH], WID.arm, nHi); disc(J.nH, WID.fist, nHi);
  c.restore();
  return J;
}

/** draw fn into a scratch layer at full opacity, then composite it with alpha (clean fades: no limb-overlap seams) */
let SCR = null;
export function picLayer(c, alpha, fn) {
  if (alpha <= 0) return;
  alpha *= c.globalAlpha;
  if (alpha >= 0.999 || typeof document === 'undefined') { c.save(); fn(c); c.restore(); return; }
  if (!SCR) { SCR = document.createElement('canvas'); SCR.width = W; SCR.height = H; }
  const g = SCR.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);
  g.setTransform(c.getTransform());
  fn(g);
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = alpha;
  c.drawImage(SCR, 0, 0);
  c.restore();
}

/** dashed yellow motion arc through screen points, revealed up to k (0..1), arrowhead at the head end */
export function motionArc(c, pts, k, s, alpha = 1) {
  if (k <= 0.02 || alpha <= 0 || pts.length < 3) return;
  const n = Math.max(2, Math.round((pts.length - 1) * L.clamp(k)));
  c.save();
  c.globalAlpha *= alpha;
  c.strokeStyle = L.rgba(CD.yellow, 0.92);
  c.lineWidth = Math.max(2.5, 0.012 * s); c.lineCap = 'round';
  c.setLineDash([0.03 * s, 0.026 * s]);
  c.beginPath();
  for (let i = 0; i <= n; i++) (i ? c.lineTo(...pts[i]) : c.moveTo(...pts[i]));
  c.stroke();
  c.setLineDash([]);
  const [ax, ay] = pts[n], [bx, by] = pts[Math.max(0, n - 2)];
  const a = Math.atan2(ay - by, ax - bx), hs = 0.042 * s;
  c.fillStyle = L.rgba(CD.yellow, 0.95);
  c.beginPath();
  c.moveTo(ax + Math.cos(a) * hs * 0.7, ay + Math.sin(a) * hs * 0.7);
  c.lineTo(ax + Math.cos(a + 2.45) * hs, ay + Math.sin(a + 2.45) * hs);
  c.lineTo(ax + Math.cos(a - 2.45) * hs, ay + Math.sin(a - 2.45) * hs);
  c.closePath(); c.fill();
  c.restore();
}

// ------------------------------------------------------------------ HUD
export const LEGEND = { x1: W - 64, w: 400, y: 300 };
export function drawHud(c, v) {
  sync(v.tl);
  const sg = c.createLinearGradient(0, 0, 0, 360);   // a soft scrim keeps the top bar + legend readable over the bright crowd
  sg.addColorStop(0, 'rgba(4,6,12,0.62)'); sg.addColorStop(0.6, 'rgba(4,6,12,0.3)'); sg.addColorStop(1, 'rgba(4,6,12,0)');
  c.fillStyle = sg; c.fillRect(0, 0, W, 360);
  topBar(c, v, ACCENT, [236, 232, 224]);
  const k = L.ease.outCubic(L.prog(v.gt, T.youOn + 0.2, 0.6)) * (1 - L.ease.inCubic(L.prog(v.gt, S(v.tl, 8) - 0.35, 0.35)));
  if (k <= 0) return;
  const { x1, w, y } = LEGEND, x0 = x1 - w, MAX = 7;
  c.save();
  c.globalAlpha = k;
  // an opaque plate keeps the legend readable over the brightest crowd
  c.fillStyle = 'rgba(8,10,16,0.82)';
  L.roundRect(c, x0 - 20, y - 64, w + 40, 108, 12); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 1.5; c.stroke();
  c.shadowColor = 'rgba(2,6,14,0.85)'; c.shadowBlur = 8;
  c.font = L.font(18, 700, L.FONT.body);
  c.fillStyle = 'rgba(232,228,220,0.92)';
  c.textBaseline = 'alphabetic';
  L.trackedText(c, 'CROWD DENSITY', x0, y - 41, 3);
  c.font = L.font(16, 600, L.FONT.body);
  c.fillStyle = 'rgba(232,228,220,0.62)';
  L.trackedText(c, 'PEOPLE / m²', x1, y - 41, 2, 'right');
  c.shadowBlur = 0;
  const g = c.createLinearGradient(x0, 0, x1, 0);
  for (let i = 0; i <= 14; i++) g.addColorStop(i / 14, L.rgba(densColor((i / 14) * MAX)));
  c.fillStyle = g;
  L.roundRect(c, x0, y - 6, w, 10, 5); c.fill();
  c.font = L.font(22, 700, L.FONT.din);
  c.textAlign = 'center';
  for (const n of [1, 3, 5]) {
    const tx = x0 + (n / MAX) * w;
    c.fillStyle = n === 5 ? L.rgba(DANGER) : 'rgba(232,228,220,0.85)';
    c.fillRect(tx - 1, y + 6, 2, 6);
    c.fillText(n === 5 ? '5+' : String(n), tx, y + 32);
  }
  // YOU marker: the peak density within 2 m of YOU (YOU's own cell is its keep-out bubble), with a short peak-hold
  // (samples over the last 0.4 s, decaying) so each surge hit spikes the pointer. Pure function of film time.
  const d = L.clamp(youDensity(v.gt, v.tl) / MAX), mx = x0 + d * w;
  c.fillStyle = '#fff';
  c.beginPath(); c.moveTo(mx, y - 9); c.lineTo(mx - 7, y - 19); c.lineTo(mx + 7, y - 19); c.closePath(); c.fill();
  c.font = L.font(13, 800, L.FONT.body);
  c.textAlign = 'center';
  c.fillStyle = '#fff';
  L.trackedText(c, 'YOU', mx, y - 23, 2, 'center');
  c.restore();
}
/** the density the HUD reports for YOU at gt: max over a 2 m radius around YOU, peak-held over 0.4 s */
const YD = { gt: NaN, tl: null, v: 0 };
export function youDensity(gt, tl) {
  if (YD.gt === gt && YD.tl === tl) return YD.v;
  const at = (t) => {
    const p = youAt(t, tl), px = p.x, py = p.y;
    let mx = 0;
    for (let dx = -2; dx <= 2; dx += 0.5) for (let dy = -2; dy <= 2; dy += 0.5) if (dx * dx + dy * dy <= 4) mx = Math.max(mx, densityAt(px + dx, py + dy, t, tl));
    return mx;
  };
  let val = 0;
  for (let i = 4; i >= 0; i--) val = Math.max(val, at(gt - 0.1 * i) * Math.pow(0.82, i));
  YD.gt = gt; YD.tl = tl; YD.v = val;
  return val;
}

export const cues = (tl) => (sync(tl), [
  ...beatCues(tl, { gain: 0.16, pitch: 0.9 }),
  ...T.surgeHits.map((h, i) => ({ t: h - 0.15, name: 'deep', gain: 0.3 - 0.03 * i, pitch: 0.65 + 0.04 * i })),
  { t: T.mood0, name: 'riser', gain: 0.18, pitch: 0.7 },
  { t: T.gas0, name: 'swish', gain: 0.22, pitch: 0.5 },
  { t: T.door, name: 'tick', gain: 0.2, pitch: 0.9 },
]);
