// Beat 2 — "Give everyone a square meter, | and we'd cover an area the size of Puerto Rico."
// The camera pulls back (0.9 → 210 m/px) and the carpet resolves into one crisp 90.5 km square: a light traces its
// rim and the odometer hands over to "≈ 8,200 km²". Puerto Rico's coastline draws itself around it (pen-tip glow,
// Vieques + Culebra settle in), then the square lifts and pours, liquid, into the island's shape: it fills ~91% of
// it, a thin sliver of coast left over. Exports the map/morph toolkit for s03 (Rhode Island).
import * as L from '../../../../engine/runtime/lib.js';
import { CORAL } from './s00-hook.js';
import { HF, PEOPLE, fillCrowd, drawCounter, COUNTER, hAt2, FULL2, frontPath, capView, zoomRate } from './s01-eight-billion.js';

const { W, ease, clamp, lerp, prog, rgba, mix } = L;

// ------------------------------------------------------------------ geography helpers (metres, x east, y south)
export function project(lonlat, lon0, lat0) {
  const c = Math.cos((lat0 * Math.PI) / 180);
  return lonlat.map(([lo, la]) => [(lo - lon0) * 111320 * c, -(la - lat0) * 110574]);
}
export function polyArea(P) {
  let a = 0;
  for (let i = 0; i < P.length; i++) { const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length]; a += x1 * y2 - x2 * y1; }
  return a / 2;
}
export function centroid(P) {
  let cx = 0, cy = 0, a = 0;
  for (let i = 0; i < P.length; i++) {
    const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length], f = x1 * y2 - x2 * y1;
    a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f;
  }
  return [cx / (3 * a), cy / (3 * a)];
}
export const scalePoly = (P, k, [ax, ay]) => P.map(([x, y]) => [ax + (x - ax) * k, ay + (y - ay) * k]);
/** Resample a closed polygon to N points evenly spaced along its perimeter. */
export function resample(P, N) {
  const segs = [], n = P.length;
  let total = 0;
  for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push([a, b, total, l]); total += l; }
  const out = [];
  let si = 0;
  for (let k = 0; k < N; k++) {
    const d = (k / N) * total;
    while (si < n - 1 && segs[si][2] + segs[si][3] < d) si++;
    const [a, b, s0, l] = segs[si], u = l > 0 ? (d - s0) / l : 0;
    out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]);
  }
  return out;
}
/** Rotate B's start index so it best matches A point-for-point (both resampled to the same N, same winding). */
export function align(A, B) {
  const N = A.length;
  let best = 0, bestE = Infinity;
  for (let s = 0; s < N; s += 2) {
    let e = 0;
    for (let i = 0; i < N; i += 3) { const p = A[i], q = B[(i + s) % N]; e += (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; }
    if (e < bestE) { bestE = e; best = s; }
  }
  return B.map((_, i) => B[(i + best) % N]);
}
export const squarePoly = (h) => [[-h, -h], [h, -h], [h, h], [-h, h]];
/** Screen path builder for a world polygon. */
export const polyPath = (v, P) => (ctx) => {
  ctx.beginPath();
  P.forEach(([x, y], i) => (i ? ctx.lineTo(v.wx(x), v.wy(y)) : ctx.moveTo(v.wx(x), v.wy(y))));
  ctx.closePath();
};
/**
 * Liquid morph A → B: each point travels on its own clock (delay[i] in 0..1 of the spread), with a soft outward
 * bulge mid-flight so the edge reads as fluid rather than a linear tween.
 */
export function morph(A, B, p, delay, spread = 0.35, bulge = 0) {
  const N = A.length, out = new Array(N);
  for (let i = 0; i < N; i++) {
    const k = ease.inOutCubic(clamp((p - delay[i] * spread) / (1 - spread)));
    let x = lerp(A[i][0], B[i][0], k), y = lerp(A[i][1], B[i][1], k);
    if (bulge) {
      const a = A[(i + N - 1) % N], b = A[(i + 1) % N], c = B[(i + N - 1) % N], d = B[(i + 1) % N];
      const tx = lerp(b[0] - a[0], d[0] - c[0], k), ty = lerp(b[1] - a[1], d[1] - c[1], k), tl = Math.hypot(tx, ty) || 1;
      const sw = Math.sin(Math.PI * k) * bulge;
      x += (ty / tl) * sw; y -= (tx / tl) * sw;
    }
    out[i] = [x, y];
  }
  return out;
}
/** Draw the first fraction f of a closed outline (with a glowing pen tip). */
export function drawOutline(ctx, v, P, f, o = {}) {
  if (f <= 0) return;
  const a = o.a ?? 1, col = o.color ?? [236, 228, 224];
  const n = P.length, upto = f * n;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const trace = () => {
    ctx.beginPath();
    for (let i = 0; i <= Math.floor(upto) && i <= n; i++) {
      const p = P[i % n];
      if (i) ctx.lineTo(v.wx(p[0]), v.wy(p[1])); else ctx.moveTo(v.wx(p[0]), v.wy(p[1]));
    }
    if (upto < n) {
      const i0 = Math.floor(upto), u = upto - i0, p = P[i0 % n], q = P[(i0 + 1) % n];
      ctx.lineTo(v.wx(lerp(p[0], q[0], u)), v.wy(lerp(p[1], q[1], u)));
    } else ctx.closePath();
  };
  if (o.fill && f >= 1) {
    trace();
    ctx.fillStyle = rgba(o.fill, o.fillA ?? 0.12);
    ctx.fill();
  }
  trace();
  ctx.strokeStyle = rgba(col, 0.16);
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.strokeStyle = rgba(col, 0.92);
  ctx.lineWidth = o.lw ?? 2.5;
  ctx.stroke();
  if (f < 1) {
    const i0 = Math.floor(upto), u = upto - i0, p = P[i0 % n], q = P[(i0 + 1) % n];
    L.lightBlob(ctx, v.wx(lerp(p[0], q[0], u)), v.wy(lerp(p[1], q[1], u)), 46, [255, 230, 220], 0.7);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ Puerto Rico (simplified real coastline)
// The island group (main island + Vieques + Culebra, 215 km end to end) is laid out 16 km west of the crowd square's
// centre so the whole group, out to Culebra's east tip, stays inside the frame.
const LON0 = -66.43 + 16000 / (111320 * Math.cos((18.225 * Math.PI) / 180)), LAT0 = 18.225;
export const PR_DX = -16000;   // world x of LON −66.43 (the island's middle)
// US Census cartographic boundary (1:500k), Douglas-Peucker simplified to ~150 m: the real coast
const wind = (P) => (polyArea(P) > 0 ? P : P.slice().reverse());   // same winding as squarePoly (positive area)
export const PR = wind(project([[-67.27067,18.36619],[-67.26116,18.37093],[-67.22646,18.37928],[-67.19485,18.39258],[-67.18914,18.4007],[-67.15729,18.41784],[-67.15539,18.42438],[-67.15682,18.43994],[-67.16181,18.45482],[-67.1687,18.46361],[-67.16965,18.47511],[-67.16775,18.48323],[-67.16324,18.48954],[-67.15539,18.49112],[-67.14802,18.50058],[-67.1378,18.50757],[-67.12045,18.51275],[-67.10809,18.51208],[-67.10025,18.51501],[-67.0665,18.5132],[-67.05129,18.51501],[-67.02491,18.50892],[-67.02015,18.51095],[-66.99757,18.50284],[-66.97642,18.49202],[-66.97285,18.49314],[-66.95408,18.48909],[-66.94766,18.49179],[-66.94172,18.49134],[-66.90488,18.48368],[-66.86756,18.49157],[-66.82763,18.48751],[-66.82335,18.49112],[-66.7896,18.49292],[-66.78105,18.49134],[-66.74753,18.47669],[-66.7366,18.47443],[-66.72258,18.47646],[-66.70618,18.47263],[-66.70214,18.47511],[-66.70238,18.48029],[-66.69952,18.48323],[-66.68597,18.4812],[-66.67433,18.48976],[-66.66886,18.48773],[-66.64533,18.48886],[-66.64129,18.49247],[-66.62655,18.49337],[-66.57854,18.48435],[-66.56809,18.48661],[-66.56214,18.49044],[-66.54978,18.48818],[-66.53505,18.4821],[-66.52792,18.4848],[-66.51318,18.47917],[-66.47991,18.47173],[-66.46636,18.46902],[-66.45448,18.46925],[-66.44948,18.47105],[-66.44283,18.47781],[-66.44093,18.4848],[-66.43831,18.48593],[-66.40456,18.48886],[-66.3991,18.49269],[-66.38246,18.48458],[-66.38008,18.48458],[-66.37842,18.48818],[-66.36582,18.4848],[-66.35417,18.4857],[-66.34063,18.48165],[-66.33967,18.48525],[-66.33611,18.48616],[-66.31781,18.47601],[-66.29903,18.47736],[-66.29071,18.4724],[-66.28643,18.4724],[-66.27621,18.47872],[-66.26956,18.48007],[-66.24175,18.46947],[-66.22012,18.46609],[-66.19921,18.46632],[-66.18613,18.47015],[-66.18328,18.46406],[-66.16237,18.45324],[-66.15452,18.45437],[-66.14097,18.46496],[-66.1386,18.47398],[-66.09772,18.46654],[-66.08869,18.46812],[-66.07133,18.45775],[-66.04828,18.45324],[-66.03853,18.45459],[-66.03663,18.45031],[-66.02166,18.44422],[-66.01619,18.44648],[-66.00954,18.44467],[-66.00169,18.44693],[-65.99647,18.45031],[-65.99195,18.46158],[-65.9872,18.45888],[-65.98078,18.46023],[-65.96153,18.45324],[-65.92469,18.44535],[-65.91613,18.44513],[-65.90401,18.45324],[-65.8964,18.45144],[-65.89403,18.4476],[-65.87905,18.43971],[-65.83223,18.43024],[-65.83009,18.42506],[-65.82082,18.42077],[-65.81916,18.41378],[-65.8144,18.40995],[-65.80751,18.40995],[-65.78968,18.4219],[-65.7885,18.41852],[-65.79586,18.41085],[-65.79539,18.40657],[-65.78208,18.40927],[-65.77495,18.41468],[-65.77043,18.41311],[-65.77162,18.4016],[-65.7614,18.39822],[-65.75926,18.39326],[-65.74096,18.38063],[-65.73027,18.38379],[-65.72979,18.38762],[-65.73264,18.39258],[-65.73027,18.39484],[-65.71862,18.39191],[-65.71743,18.38717],[-65.71909,18.38424],[-65.71434,18.37634],[-65.69984,18.36935],[-65.68986,18.36687],[-65.68439,18.3689],[-65.67417,18.36394],[-65.66633,18.36281],[-65.65635,18.36461],[-65.64375,18.3795],[-65.63947,18.37657],[-65.639,18.37183],[-65.63638,18.37003],[-65.62759,18.37634],[-65.62711,18.38334],[-65.62402,18.38717],[-65.61784,18.38785],[-65.61451,18.38424],[-65.61451,18.38018],[-65.61927,18.36732],[-65.63329,18.34747],[-65.63091,18.34341],[-65.63258,18.33732],[-65.6264,18.3319],[-65.62854,18.31182],[-65.62402,18.30438],[-65.63163,18.2888],[-65.63091,18.28519],[-65.62378,18.28158],[-65.62212,18.27256],[-65.62973,18.27007],[-65.62996,18.26669],[-65.62474,18.25766],[-65.62046,18.25563],[-65.60643,18.26217],[-65.60429,18.25969],[-65.60833,18.25405],[-65.60073,18.23734],[-65.58908,18.22854],[-65.59265,18.22425],[-65.60144,18.22899],[-65.60501,18.22673],[-65.60437,18.21753],[-65.61119,18.21047],[-65.61194,18.21911],[-65.61713,18.22741],[-65.62402,18.23238],[-65.63377,18.23193],[-65.63567,18.21973],[-65.63115,18.21635],[-65.63115,18.21206],[-65.62759,18.20799],[-65.6321,18.20054],[-65.64684,18.19896],[-65.65825,18.20461],[-65.66799,18.2028],[-65.68938,18.19309],[-65.69271,18.18677],[-65.69152,18.18022],[-65.69485,18.17887],[-65.70127,18.18293],[-65.70816,18.18293],[-65.71244,18.18858],[-65.716,18.18948],[-65.72527,18.18722],[-65.73335,18.1818],[-65.73716,18.17774],[-65.74239,18.16396],[-65.7557,18.15809],[-65.76687,18.14928],[-65.76711,18.14386],[-65.77923,18.12579],[-65.78065,18.1206],[-65.77756,18.11495],[-65.78873,18.10049],[-65.78992,18.09416],[-65.78802,18.09168],[-65.79515,18.08716],[-65.79515,18.07112],[-65.80228,18.05779],[-65.80894,18.05711],[-65.81821,18.06276],[-65.8308,18.05055],[-65.83365,18.04355],[-65.83033,18.03044],[-65.83294,18.02592],[-65.83033,18.01982],[-65.83508,18.01259],[-65.84459,18.01553],[-65.85742,18.00513],[-65.86907,18.00671],[-65.87525,18.00219],[-65.88547,17.9884],[-65.8907,17.99202],[-65.8945,17.99111],[-65.91637,17.97619],[-65.93063,17.97664],[-65.93823,17.97212],[-65.9582,17.97099],[-65.96961,17.97393],[-65.97412,17.97257],[-65.97745,17.9676],[-65.98173,17.96783],[-65.99385,17.97868],[-66.01643,17.98004],[-66.02927,17.97167],[-66.03521,17.96127],[-66.03806,17.9624],[-66.04067,17.96059],[-66.04709,17.95268],[-66.05707,17.95901],[-66.06397,17.96059],[-66.06896,17.96602],[-66.08155,17.96692],[-66.11222,17.94929],[-66.13052,17.94635],[-66.13503,17.94137],[-66.14264,17.93843],[-66.15381,17.93007],[-66.1588,17.92984],[-66.17663,17.93617],[-66.19208,17.93753],[-66.19612,17.93527],[-66.19707,17.93007],[-66.20182,17.92577],[-66.2244,17.91243],[-66.2408,17.91288],[-66.25007,17.91627],[-66.25435,17.92057],[-66.24793,17.93074],[-66.25768,17.93685],[-66.26433,17.94454],[-66.27812,17.94816],[-66.28834,17.94386],[-66.3102,17.96828],[-66.31139,17.97393],[-66.31519,17.97845],[-66.32993,17.97845],[-66.34728,17.97122],[-66.38674,17.9373],[-66.40456,17.95268],[-66.4105,17.95403],[-66.41146,17.95697],[-66.41668,17.95969],[-66.42667,17.95946],[-66.42952,17.96127],[-66.44164,17.97596],[-66.45115,17.98117],[-66.45923,17.9893],[-66.46469,17.99089],[-66.47848,17.98682],[-66.48157,17.98976],[-66.49654,17.98976],[-66.54218,17.9737],[-66.5486,17.97461],[-66.55882,17.96828],[-66.56927,17.96647],[-66.57902,17.96172],[-66.58353,17.96195],[-66.58615,17.9667],[-66.59471,17.97031],[-66.6073,17.96851],[-66.61277,17.96285],[-66.62109,17.96737],[-66.61705,17.97077],[-66.618,17.97777],[-66.62751,17.98275],[-66.64961,17.97936],[-66.6603,17.97303],[-66.66339,17.96873],[-66.6729,17.96715],[-66.68075,17.9737],[-66.70071,17.978],[-66.71307,17.98727],[-66.72662,17.99179],[-66.74634,17.98976],[-66.75134,17.98682],[-66.75443,17.97664],[-66.75657,17.97574],[-66.76274,17.98071],[-66.76274,17.9841],[-66.75704,17.98614],[-66.75657,17.99111],[-66.76346,17.99993],[-66.76488,18.0058],[-66.76702,18.00626],[-66.78509,17.99586],[-66.78366,17.98026],[-66.78723,17.97212],[-66.80743,17.96602],[-66.81789,17.95607],[-66.84142,17.94974],[-66.85544,17.9563],[-66.86138,17.95313],[-66.86305,17.94567],[-66.86518,17.94522],[-66.87731,17.94793],[-66.8804,17.95245],[-66.89727,17.94906],[-66.90892,17.94929],[-66.93055,17.94318],[-66.93126,17.9373],[-66.91914,17.93391],[-66.91843,17.93187],[-66.92413,17.92667],[-66.946,17.93368],[-66.95645,17.93142],[-66.95622,17.93527],[-66.95907,17.93934],[-66.9681,17.94725],[-66.98165,17.952],[-66.98426,17.96647],[-66.98997,17.96918],[-67.00042,17.96647],[-67.00114,17.96104],[-67.0047,17.96082],[-67.01302,17.96715],[-67.02918,17.97144],[-67.03988,17.97144],[-67.04273,17.96896],[-67.06032,17.97325],[-67.0665,17.97257],[-67.07529,17.96737],[-67.07743,17.9633],[-67.07696,17.9572],[-67.08195,17.95923],[-67.0867,17.95743],[-67.08955,17.95109],[-67.10144,17.9459],[-67.11023,17.94522],[-67.12853,17.9468],[-67.14185,17.95403],[-67.15848,17.95381],[-67.16989,17.96579],[-67.18059,17.96443],[-67.18581,17.96172],[-67.19081,17.95313],[-67.19081,17.9477],[-67.18249,17.93775],[-67.18344,17.93097],[-67.18677,17.9312],[-67.19366,17.93233],[-67.19722,17.93708],[-67.19461,17.94883],[-67.19936,17.95268],[-67.21315,17.95245],[-67.21481,17.9633],[-67.21267,17.9719],[-67.21529,17.98749],[-67.21291,17.99382],[-67.20792,17.99857],[-67.17441,18.011],[-67.17179,18.0214],[-67.17393,18.02502],[-67.17892,18.02705],[-67.2103,18.03564],[-67.19889,18.0492],[-67.20269,18.05643],[-67.19651,18.0666],[-67.20103,18.07699],[-67.20008,18.091],[-67.19508,18.0971],[-67.18391,18.10388],[-67.18225,18.10998],[-67.1832,18.12692],[-67.18605,18.13031],[-67.18653,18.13663],[-67.17821,18.14409],[-67.17678,18.15041],[-67.17845,18.15832],[-67.18558,18.16396],[-67.15729,18.19354],[-67.15373,18.19851],[-67.15349,18.20438],[-67.15492,18.20867],[-67.15896,18.21161],[-67.15896,18.21702],[-67.16704,18.22019],[-67.17322,18.22673],[-67.17417,18.24479],[-67.18914,18.26556],[-67.19033,18.28271],[-67.19556,18.28971],[-67.20126,18.29264],[-67.22384,18.29648],[-67.23644,18.30144],[-67.25308,18.33145],[-67.2545,18.33867],[-67.269,18.35536],[-67.27162,18.36213]], LON0, LAT0));
export const PR_ISLES = [   // Vieques, Culebra
  wind(project([[-65.57617,18.1079],[-65.57807,18.11957],[-65.54452,18.12],[-65.52521,18.12797],[-65.51682,18.12925],[-65.51188,18.13337],[-65.4451,18.14703],[-65.44315,18.15059],[-65.4451,18.15543],[-65.43701,18.15884],[-65.41545,18.16112],[-65.39778,18.16268],[-65.3834,18.16112],[-65.37936,18.15899],[-65.36588,18.15842],[-65.36079,18.15358],[-65.3572,18.15571],[-65.33249,18.14789],[-65.32485,18.14988],[-65.32066,18.14675],[-65.30868,18.14561],[-65.30449,18.14262],[-65.29551,18.14262],[-65.28847,18.14803],[-65.27469,18.13522],[-65.26721,18.13551],[-65.26735,18.1338],[-65.27334,18.12967],[-65.28173,18.13238],[-65.29281,18.1301],[-65.29595,18.12711],[-65.3009,18.13366],[-65.30733,18.13394],[-65.30629,18.12612],[-65.30913,18.12398],[-65.31213,18.12569],[-65.31692,18.12355],[-65.31916,18.12583],[-65.32605,18.12512],[-65.32815,18.1217],[-65.33414,18.12099],[-65.33788,18.11473],[-65.34642,18.11103],[-65.356,18.11231],[-65.35091,18.12284],[-65.3554,18.12512],[-65.37053,18.12398],[-65.37367,18.12142],[-65.37277,18.11701],[-65.37607,18.11473],[-65.37442,18.10804],[-65.3831,18.10605],[-65.3879,18.11231],[-65.39089,18.1116],[-65.39239,18.10776],[-65.40212,18.11003],[-65.412,18.10576],[-65.42713,18.09352],[-65.43716,18.09125],[-65.44225,18.09267],[-65.44465,18.0911],[-65.44465,18.08897],[-65.45228,18.08612],[-65.45753,18.08797],[-65.4734,18.08669],[-65.4743,18.09509],[-65.47924,18.09623],[-65.50394,18.09295],[-65.52446,18.08228],[-65.53284,18.08014],[-65.54168,18.08085],[-65.56025,18.08612],[-65.57088,18.09381],[-65.57252,18.09893],[-65.57807,18.10206]], LON0, LAT0)),
  wind(project([[-65.34703,18.34942],[-65.34323,18.3519],[-65.338,18.35043],[-65.33348,18.34163],[-65.33039,18.3387],[-65.32504,18.33757],[-65.31946,18.32968],[-65.31732,18.329],[-65.31352,18.33024],[-65.31031,18.33836],[-65.30508,18.33272],[-65.29724,18.3308],[-65.29022,18.33746],[-65.28987,18.33284],[-65.28773,18.33171],[-65.2825,18.33035],[-65.27763,18.33272],[-65.2737,18.33114],[-65.25196,18.31907],[-65.24518,18.31106],[-65.24411,18.30418],[-65.24899,18.29718],[-65.26028,18.28974],[-65.26384,18.28996],[-65.2642,18.29594],[-65.26883,18.29662],[-65.27679,18.2912],[-65.27917,18.28331],[-65.28595,18.27687],[-65.29462,18.29098],[-65.30104,18.29414],[-65.30746,18.30113],[-65.3109,18.30158],[-65.31197,18.30553],[-65.31542,18.307],[-65.31732,18.30971],[-65.31768,18.31749],[-65.32599,18.32313],[-65.33134,18.32201],[-65.33051,18.32595],[-65.33574,18.33757],[-65.3399,18.34423]], LON0, LAT0)),
];
export const N_PTS = 480;
export const AREA1 = PEOPLE / 1e6;                       // km² at 1 per m²
/**
 * Inset a closed polygon by d metres (vertex normals from a smoothed tangent, then a light relaxation so narrow bays
 * never fold over). Same point count and order as the input, so it registers with the outline drawn from it.
 */
function inset(P, d) {
  const n = P.length;
  const normalAt = (i, w) => {
    const a = P[(i + n - w) % n], b = P[(i + w) % n];
    const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
    return [-ty / tl, tx / tl];   // positive-area winding (y down): the interior side
  };
  let out = P.map((p, i) => { const [nx, ny] = normalAt(i, 3); return [p[0] + nx * d, p[1] + ny * d]; });
  const inPoly = (Q, x, y) => {
    let c = false;
    for (let i = 0, j = Q.length - 1; i < Q.length; j = i++) {
      const [xi, yi] = Q[i], [xj, yj] = Q[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const relax = (k) => {
    for (let it = 0; it < k; it++) {
      const q = out.map((p) => p.slice());
      for (let i = 0; i < n; i++) {
        const a = q[(i + n - 1) % n], b = q[(i + 1) % n];
        out[i] = [0.5 * q[i][0] + 0.25 * (a[0] + b[0]), 0.5 * q[i][1] + 0.25 * (a[1] + b[1])];
      }
    }
  };
  relax(2);
  // narrow points and capes: an offset point that left the island (or folded over) is pulled back along a wider,
  // smoother normal, then relaxed with its neighbours, so the rim never spikes out past the coast
  for (let pass = 0; pass < 3; pass++) {
    let bad = 0;
    for (let i = 0; i < n; i++) {
      if (inPoly(P, out[i][0], out[i][1])) continue;
      const [nx, ny] = normalAt(i, 10);
      out[i] = [P[i][0] + nx * d * 0.6, P[i][1] + ny * d * 0.6];
      if (!inPoly(P, out[i][0], out[i][1])) out[i] = [lerp(out[(i + n - 1) % n][0], out[(i + 1) % n][0], 0.5), lerp(out[(i + n - 1) % n][1], out[(i + 1) % n][1], 0.5)];
      bad++;
    }
    if (!bad) break;
    relax(2);
  }
  return out;
}
export const PR_PTS = resample(PR, N_PTS);
// the crowd's island: the same resampled coastline, inset evenly so it covers exactly 8,200 km² (a ~1 km rim of the
// island stays uncovered all round, instead of uneven gaps at the tips)
export const PR_FILL = (() => {
  let lo = 0, hi = 4000;
  const sgn = polyArea(inset(PR_PTS, 500)) < polyArea(PR_PTS) ? 1 : -1;
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (polyArea(inset(PR_PTS, sgn * m)) / 1e6 > AREA1) lo = m; else hi = m; }
  return inset(PR_PTS, sgn * (lo + hi) / 2);
})();
export const SQ1 = resample(squarePoly(HF), N_PTS);
export const PR_FILL_PTS = align(SQ1, PR_FILL);
// one clock for every point: equal-count, aligned point sets interpolate into each other without the edges
// buckling (staggered clocks folded the square's edges like paper)
const DELAY = PR_FILL_PTS.map(() => 0);

// ------------------------------------------------------------------ timing (beat-relative)
export const T = {
  rim: 1.52, rimDur: 0.9,   // as the front completes the square (FULL2 ≈ 1.56); a light traces its edge (time kept for the cues)
  cntOut: 1.75,                   // odometer leaves
  label: 2.3,                     // ≈ 8,200 km² (lands 0.15 s after the counter has fully gone: no cross-dissolve)
  draw: 2.3, drawDur: 1.35,       // Puerto Rico draws itself
  pour: 3.55, pourDur: 1.35,      // the square pours into the island
};

/** Crowd outline (world) at beat-2 time t. */
export function crowdPts2(t) {
  return morph(SQ1, PR_FILL_PTS, prog(t, T.pour, T.pourDur), DELAY, 0, 0);
}

function rimTrace(ctx, v, t) {
  const p = prog(t, T.rim, T.rimDur);
  if (p <= 0 || p >= 1) return;
  const e = ease.inOutCubic(p), fade = Math.sin(Math.PI * p);
  // two comets running round the square from opposite corners
  const per = 8 * HF;
  const at = (u) => {
    u = ((u % 1) + 1) % 1;
    const d = u * per, side = Math.floor(d / (2 * HF)), r = d - side * 2 * HF;
    return [[-HF + r, -HF], [HF, -HF + r], [HF - r, HF], [-HF, HF - r]][side];
  };
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const off of [0, 0.5]) {
    const head = off + e * 0.5;
    ctx.beginPath();
    for (let k = 0; k <= 24; k++) {
      const [x, y] = at(head - 0.12 * (k / 24));
      if (k) ctx.lineTo(v.wx(x), v.wy(y)); else ctx.moveTo(v.wx(x), v.wy(y));
    }
    ctx.strokeStyle = rgba([255, 228, 218], 0.8 * fade);
    ctx.lineWidth = 3;
    ctx.stroke();
    const [hx, hy] = at(head);
    L.lightBlob(ctx, v.wx(hx), v.wy(hy), 60, CORAL, 0.7 * fade);
  }
  ctx.restore();
}

export default {
  beat: 2,
  chapter: { num: '02', title: 'One square meter each', sub: 'Everyone, side by side' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: T.rim, name: 'shimmer', gain: 0.2, pitch: 0.9 },
      { t: T.label, name: 'ping', gain: 0.24, pitch: 1.0 },
      { t: T.draw, name: 'swish', gain: 0.22, pitch: 0.75 },
      { t: T.draw + T.drawDur * 0.5, name: 'swish', gain: 0.14, pitch: 0.9 },
      { t: T.pour, name: 'swell', gain: 0.3, pitch: 0.9 },
      { t: T.pour + T.pourDur - 0.1, name: 'bloom', gain: 0.3, pitch: 1.0 },
    ];
  },
  drawWorld(ctx, v) {
    const sc = v.tl.scenes;
    const t = v.t, t3 = v.gt - sc[3].start;
    if (t < -0.01 || t3 > 1.0) return;
    // the island (drawn under the crowd); it dims away as beat 3 starts
    const mapK = 1 - ease.outCubic(prog(t3, 0, 0.45));
    const f = ease.inOutCubic(prog(t, T.draw, T.drawDur));
    if (f > 0 && mapK > 0) {
      drawOutline(ctx, v, PR_PTS, f, { a: mapK, fill: [120, 140, 150], fillA: 0.1 * ease.outCubic(prog(t, T.draw + T.drawDur - 0.2, 0.6)) });
      const ik = ease.outCubic(prog(t, T.draw + T.drawDur - 0.25, 0.6)) * mapK;
      PR_ISLES.forEach((P) => drawOutline(ctx, v, P, 1, { a: ik, lw: 2, fill: [120, 140, 150], fillA: 0.1 }));
    }
    // the crowd (s01 owns it before this beat, s03 after)
    if (t < 0 || t3 >= 0) return;
    const pk = prog(t, T.pour, T.pourDur);
    const lift = Math.sin(Math.PI * clamp(pk * 1.15)) * 0.7;
    const growing = t < FULL2;
    v = capView(v, clamp(zoomRate(v) / 0.06) * 0.75);   // the pull-back continues: keep the carpet crisp
    const path = growing ? frontPath(v, hAt2(t)) : polyPath(v, crowdPts2(t));
    fillCrowd(ctx, v, path, { density: 1, lift, rim: lerp(0.55, 1, ease.outCubic(prog(t, 1.2, 0.8))), front: 1 - ease.inCubic(prog(t, FULL2 - 0.2, 0.4)) });
    rimTrace(ctx, v, t);
    // settle: a soft ring of light runs out from the coast as the pour lands
    const sp = prog(t, T.pour + T.pourDur - 0.15, 0.9);
    if (sp > 0 && sp < 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      polyPath(v, PR_FILL_PTS)(ctx);
      ctx.lineJoin = 'round';   // no miter spikes at sharp capes
      ctx.strokeStyle = rgba(CORAL, 0.5 * (1 - sp));
      ctx.lineWidth = 2 + 30 * ease.outCubic(sp);
      ctx.stroke();
      ctx.restore();
    }
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    // island name under the south coast, drawn above the crowd (it lands once the pour has cleared it)
    {
      const t3 = v.gt - v.tl.scenes[3].start;
      const nk = ease.outCubic(prog(t, T.pour + 0.6, 0.6)) * (1 - ease.inCubic(prog(t3, 0, 0.6)));
      if (nk > 0) {
        ctx.save();
        ctx.globalAlpha *= nk;
        ctx.font = L.font(26, 600, L.FONT.body);
        ctx.fillStyle = 'rgba(225,232,236,0.9)';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 8;
        ctx.textBaseline = 'top';
        L.trackedText(ctx, 'PUERTO RICO', v.wx(PR_DX), v.wy(40000) + (1 - nk) * 10, 8, 'center');
        ctx.restore();
      }
    }
    // caption scrim: while the growing square covers the caption band, a soft dark band keeps the words readable
    const bottom = v.wy(t < FULL2 ? hAt2(t) : HF);
    const sk = clamp((bottom - 1230) / 60) * (1 - prog(t, FULL2 + 0.3, 0.6)) * v.k;
    if (sk > 0) {
      const g = ctx.createLinearGradient(0, 1220, 0, 1450);
      g.addColorStop(0, 'rgba(10,6,8,0)');
      g.addColorStop(0.3, `rgba(10,6,8,${0.5 * sk})`);
      g.addColorStop(0.7, `rgba(10,6,8,${0.5 * sk})`);
      g.addColorStop(1, 'rgba(10,6,8,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 1220, W, 230);
    }
    // "a square meter": a coral pin on the hero's own 1 m tile at the origin, while the camera pulls away from it
    // the tag must sit on the carpet: it fades out completely before the square's edge shrinks past its far end
    const half = (t < FULL2 ? hAt2(t) : HF) / v.cam.mpp;
    const fit = clamp((half - 290) / 40);
    const pinK = ease.outBack(prog(t, 0.05, 0.45), 1.6) * Math.min(1 - ease.inCubic(prog(t, 1.75, 0.35)), fit) * v.k;
    if (pinK > 0.002) {
      const px = v.wx(0), py = v.wy(0), pulse = prog((t + 0.6) % 1.1, 0, 1.1);
      ctx.save();
      ctx.globalAlpha *= clamp(pinK);
      // dark disc so the ring separates from the crowd texture
      L.lightBlob(ctx, px, py, 70, [8, 4, 6], 0.55);
      ctx.strokeStyle = rgba(CORAL, 0.55 * (1 - pulse));
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, 22 + 34 * ease.outCubic(pulse), 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = rgba(CORAL, 1);
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(px, py, Math.max(0, 20 * pinK), 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = rgba([255, 214, 200]);
      ctx.fillRect(px - 4, py - 4, 8, 8);
      // tag: a short leader to "1 m² EACH"
      const lx = px + 26, tx = px + 92;
      ctx.strokeStyle = 'rgba(255,225,215,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(lx, py); ctx.lineTo(lerp(lx, tx - 10, clamp(pinK)), py); ctx.stroke();
      ctx.font = L.font(32, 700, L.FONT.body);
      ctx.textBaseline = 'middle';
      // pill width = the TRACKED text (2 px per gap) + 15 px padding each side
      const label = '1 m² EACH', tw = ctx.measureText(label).width + 2 * (label.length - 1) + 30;
      ctx.fillStyle = 'rgba(14,8,10,0.82)';
      L.roundRect(ctx, tx - 8, py - 26, tw, 52, 26); ctx.fill();
      ctx.fillStyle = rgba(CORAL);
      L.trackedText(ctx, label, tx + 7, py + 1, 2, 'left');
      ctx.restore();
    }
    // the odometer carries on from s01 (no fade-in), holds on 8.2 B, then lifts away
    const ck = 1 - ease.inCubic(prog(t, T.cntOut, 0.4));
    if (ck > 0) {
      ctx.save();
      ctx.translate(0, -40 * ease.inCubic(prog(t, T.cntOut, 0.4)));
      drawCounter(ctx, v, PEOPLE, ck, 'people alive today', 0, 0, PEOPLE, 1);
      ctx.restore();
    }
    const lk = v.k * prog(t, T.label, 0.55);
    L.bigLabel(ctx, { x: COUNTER.x, y: COUNTER.y, align: 'center', big: '≈ 8,200 km²', small: '1 m² each · 3,200 sq mi', k: lk, accent: v.accent, size: 120 });
  },
};
