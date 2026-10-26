// Builder B — real New York geography in the world frame (orthographic about HAND, north up, metres: x east, y south).
// Pure data + maths (node-safe): land rings from geo.js with bboxes, a rasterised land mask, and REAL places given as
// lat/lon (bridges, airports' runways, parks, labels) projected exactly like earth.js does (lat0/lon0 = HAND, tilt 0).
import { HAND, FINE, MED, COARSE, CITY, CENTRAL_PARK } from '../geo.js';

export { HAND, CENTRAL_PARK };
const DEG = Math.PI / 180;
export const R_E = 6.371e6;

// ------------------------------------------------------------------ projection (identical to earth.js basis, tilt 0)
const lam = HAND.lon * DEG, phi = HAND.lat * DEG;
const BR = [-Math.sin(lam), Math.cos(lam), 0];
const BU = [-Math.sin(phi) * Math.cos(lam), -Math.sin(phi) * Math.sin(lam), Math.cos(phi)];
const BC = [Math.cos(phi) * Math.cos(lam), Math.cos(phi) * Math.sin(lam), Math.sin(phi)];
const vec = (lat, lon) => [Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG)];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** lat/lon (deg) -> world metres {x, y, z} (z > 0: on the hemisphere facing the camera). */
export function ll(lat, lon, alt = 0) {
  const p = vec(lat, lon), k = R_E + alt;
  return { x: dot(p, BR) * k, y: -dot(p, BU) * k, z: dot(p, BC) * k };
}
/** world metres -> lat/lon (visible hemisphere). */
export function unll(x, y) {
  const X = x / R_E, Y = -y / R_E, Z = Math.sqrt(Math.max(0, 1 - X * X - Y * Y));
  const p = [X * BR[0] + Y * BU[0] + Z * BC[0], X * BR[1] + Y * BU[1] + Z * BC[1], X * BR[2] + Y * BU[2] + Z * BC[2]];
  return { lat: Math.asin(Math.max(-1, Math.min(1, p[2]))) / DEG, lon: Math.atan2(p[1], p[0]) / DEG };
}

// ------------------------------------------------------------------ rings
const prep = (rings) => rings.map((r) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); y0 = Math.min(y0, r[i + 1]); y1 = Math.max(y1, r[i + 1]); }
  return { r, x0, y0, x1, y1 };
});
export const RINGS = { fine: prep(FINE), med: prep(MED), coarse: prep(COARSE), city: prep(CITY) };
// FINE only covers a rotated window (ep 15's source frame, x ±17 km, y -34..14 km); outside it MED takes over.
export const FINE_WIN = [-1612, -30503, 13252, -22255, 28117, -14007, 16473, 6979, 4828, 27965, -10037, 19716, -24902, 11468, -13257, -9518];
function inRing(r, x, y) {
  let ins = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
/** Winding-parity land test against a ring set. */
export function inSet(set, x, y) {
  let n = 0;
  for (const q of set) if (x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1 && inRing(q.r, x, y)) n++;
  return n % 2 === 1;
}
export const inFineWin = (x, y) => inRing(FINE_WIN, x, y);
export const onLandExact = (x, y) => (inRing(FINE_WIN, x, y) ? inSet(RINGS.fine, x, y) : inSet(RINGS.med, x, y));
/** Which NYC borough ring index (geo.js CITY) contains the point, or -1. */
export const inCity = (x, y) => inSet(RINGS.city, x, y);

// ------------------------------------------------------------------ the street grid (Manhattan, Commissioners' Plan)
// CENTRAL_PARK corners: [NW 110th/CPW, NE 110th/5th, SE 59th/5th, SW 59th/CPW]. Grid frame: gu = metres NORTH along
// the avenues from 59th St, gw = metres EAST across them from Central Park West / 8th Ave.
const [NW, NE, SE, SW] = CENTRAL_PARK;
export const GRID_O = { x: SW[0], y: SW[1] };
const LEN = Math.hypot(NW[0] - SW[0], NW[1] - SW[1]), WID = Math.hypot(SE[0] - SW[0], SE[1] - SW[1]);
export const GU = { x: (NW[0] - SW[0]) / LEN, y: (NW[1] - SW[1]) / LEN };   // north along the avenues (screen up-right)
export const GW = { x: (SE[0] - SW[0]) / WID, y: (SE[1] - SW[1]) / WID };   // east across them
export const PARK_LEN = LEN, PARK_WID = WID;                                   // 4,13x m x 85x m
export const STREET = LEN / 51;                                                // 59th -> 110th: 51 blocks (~81 m)
export const toGrid = (x, y) => ({ u: (x - GRID_O.x) * GU.x + (y - GRID_O.y) * GU.y, w: (x - GRID_O.x) * GW.x + (y - GRID_O.y) * GW.y });
export const fromGrid = (u, w) => ({ x: GRID_O.x + u * GU.x + w * GW.x, y: GRID_O.y + u * GU.y + w * GW.y });
export const streetU = (n) => (n - 59) * STREET;                               // street number -> gu
// avenues: gw positions (m). West side: 280 m blocks; east of Fifth: the narrower Madison/Park/Lexington blocks.
const F5 = WID;
export const AVENUES = [
  ['Riverside Dr', -1110], ['West End Ave', -840], ['Amsterdam Ave', -560], ['Columbus Ave', -280], ['Central Park W', 0],
  ['7th Ave', 280], ['6th Ave', 560], ['5th Ave', F5], ['Madison Ave', F5 + 128], ['Park Ave', F5 + 250],
  ['Lexington Ave', F5 + 375], ['3rd Ave', F5 + 565], ['2nd Ave', F5 + 760], ['1st Ave', F5 + 955], ['York Ave', F5 + 1150],
];
// Broadway: through Columbus Circle (59th / 8th), NNW to 72nd at Amsterdam, then between Amsterdam and West End to the
// north; south of the Circle diagonally SE: Times Square (7th, 45th), Herald Square (6th, 34th), Madison Square (5th,
// 23rd), Union Square (Park Ave S, 14th), then south down to Houston.
export const BROADWAY = [
  [222, -980], [168, -960], [125, -840], [110, -800], [96, -745], [79, -700], [72, -560], [65, -230], [59, 0],
  [53, 105], [45, 280], [42, 330], [34, 560], [23, F5], [14, F5 + 250], [8, F5 + 250], [1, F5 + 200],
].map(([s, w]) => [streetU(s), w]);
/** Where the regular grid applies (streets numbered 14th..155th; Washington Heights and Inwood keep the angle). */
export const GRID_SPAN = { u0: streetU(14), u1: streetU(220) };

// ------------------------------------------------------------------ real places (lat, lon)
// Bridges: shore-to-shore spans (anchorage to anchorage), checked against the coastline rings.
export const BRIDGES = [
  { name: 'GEORGE WASHINGTON BRIDGE', a: [40.8536, -73.9629], b: [40.8497, -73.9444], w: 36 },
  { name: 'BROOKLYN BRIDGE', a: [40.7096, -74.0010], b: [40.7022, -73.9925], w: 26 },
  { name: 'MANHATTAN BRIDGE', a: [40.7128, -73.9937], b: [40.7018, -73.9874], w: 30 },
  { name: 'WILLIAMSBURG BRIDGE', a: [40.7163, -73.9802], b: [40.7114, -73.9622], w: 36 },
  { name: 'QUEENSBORO BRIDGE', a: [40.7590, -73.9592], b: [40.7531, -73.9433], w: 30 },
  { name: 'VERRAZZANO-NARROWS BRIDGE', a: [40.6123, -74.0322], b: [40.6012, -74.0576], w: 36 },
];
// Major parks (approximate outlines, lat/lon).
export const PARKS_LL = [
  { name: 'PROSPECT PARK', pts: [[40.6738, -73.9699], [40.6610, -73.9797], [40.6514, -73.9731], [40.6527, -73.9637], [40.6566, -73.9620], [40.6620, -73.9622], [40.6703, -73.9650]] },
  { name: 'FLUSHING MEADOWS', pts: [[40.7600, -73.8470], [40.7540, -73.8370], [40.7380, -73.8360], [40.7290, -73.8400], [40.7330, -73.8510], [40.7450, -73.8500]] },
  { name: 'VAN CORTLANDT PARK', pts: [[40.9120, -73.8980], [40.9100, -73.8650], [40.8960, -73.8640], [40.8840, -73.8840], [40.8890, -73.9000]] },
  { name: 'PELHAM BAY PARK', pts: [[40.8820, -73.8180], [40.8790, -73.7960], [40.8660, -73.7840], [40.8520, -73.8000], [40.8480, -73.8200], [40.8640, -73.8270]] },
  { name: 'FOREST PARK', pts: [[40.7050, -73.8720], [40.7110, -73.8500], [40.7040, -73.8370], [40.6960, -73.8450], [40.6970, -73.8650]] },
  { name: 'BRONX PARK', pts: [[40.8720, -73.8820], [40.8680, -73.8700], [40.8480, -73.8710], [40.8460, -73.8800], [40.8600, -73.8830]] },
  { name: 'GREENBELT', pts: [[40.6000, -74.1500], [40.5960, -74.1150], [40.5780, -74.1100], [40.5650, -74.1350], [40.5780, -74.1550]] },
  { name: 'INWOOD HILL', pts: [[40.8735, -73.9270], [40.8720, -73.9180], [40.8650, -73.9240], [40.8665, -73.9300]] },
  { name: 'FORT TRYON', pts: [[40.8650, -73.9330], [40.8640, -73.9270], [40.8570, -73.9320], [40.8585, -73.9365]] },
  { name: 'LIBERTY STATE PARK', pts: [[40.7090, -74.0560], [40.7050, -74.0420], [40.6920, -74.0480], [40.6930, -74.0620]] },
];
// Airports: runways as centre-line segments (thresholds, lat/lon; OurAirports data) + width (m).
export const RUNWAYS = [
  // JFK 04L/22R, 04R/22L, 13L/31R, 13R/31L
  [[40.622002, -73.785599], [40.6488, -73.764702], 61], [[40.6254, -73.7703], [40.6452, -73.7549], 61],
  [[40.657799, -73.790199], [40.6437, -73.7593], 61], [[40.648399, -73.816704], [40.627899, -73.771599], 61],
  // LaGuardia 04/22, 13/31
  [[40.7692, -73.8841], [40.7854, -73.8707], 46], [[40.7823, -73.8785], [40.7721, -73.8571], 46],
  // Newark 04L/22R, 04R/22L, 11/29
  [[40.675392, -74.179456], [40.70257, -74.16217], 46], [[40.677588, -74.174253], [40.702299, -74.158539], 46],
  [[40.702815, -74.180748], [40.701203, -74.156502], 46],
];
