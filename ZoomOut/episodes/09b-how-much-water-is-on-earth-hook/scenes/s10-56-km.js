// Beat 10 — "A tiny drop, about fifty-six kilometers across. | Roughly the width of London."
// The camera dives onto the lakes-and-rivers ball (drawn by s09). A horizontal dimension draws itself under it
// and the big label lands. On the second phrase the outline of Greater London (real boundary, true scale,
// about 58 x 45 km) traces itself over the ball with the Thames winding through it: the same width.
import * as L from '../../../../engine/runtime/lib.js';
import { LAKES } from '../camera.js';

const { W } = L;
const BEAT = 10;
const R_L = LAKES.d / 2;

// Greater London boundary (OpenStreetMap relation 175342, simplified to 155 points), clockwise from the north (lon, lat)
const BOUNDARY = [
  [-0.1049, 51.6918], [-0.0620, 51.6830], [-0.0111, 51.6809], [-0.0123, 51.6462], [0.0227, 51.6411], [0.0257, 51.6346], [0.0218, 51.6288],
  [0.0409, 51.6157], [0.0537, 51.6183], [0.0481, 51.6133], [0.0728, 51.6047], [0.0889, 51.6049], [0.0948, 51.6108], [0.0923, 51.6136],
  [0.1193, 51.6154], [0.1361, 51.6236], [0.1689, 51.6214], [0.2241, 51.6317], [0.2641, 51.6089], [0.2540, 51.6016], [0.2699, 51.5996],
  [0.2713, 51.5890], [0.2903, 51.5643], [0.3130, 51.5658], [0.3153, 51.5578], [0.3339, 51.5425], [0.2653, 51.5321], [0.2637, 51.5179],
  [0.2538, 51.5179], [0.2508, 51.5288], [0.2410, 51.5226], [0.2449, 51.5188], [0.2371, 51.5193], [0.2419, 51.5080], [0.2266, 51.5066],
  [0.2299, 51.4994], [0.2150, 51.4965], [0.2105, 51.4902], [0.2103, 51.4859], [0.2237, 51.4823], [0.2115, 51.4751], [0.2106, 51.4625],
  [0.2032, 51.4587], [0.2034, 51.4543], [0.1728, 51.4433], [0.1644, 51.4286], [0.1558, 51.4309], [0.1537, 51.4275], [0.1511, 51.4204],
  [0.1546, 51.4185], [0.1491, 51.4124], [0.1537, 51.4113], [0.1487, 51.4081], [0.1624, 51.3925], [0.1477, 51.3928], [0.1532, 51.3780],
  [0.1426, 51.3507], [0.1369, 51.3442], [0.1184, 51.3441], [0.1217, 51.3336], [0.1179, 51.3297], [0.0850, 51.3160], [0.0828, 51.3056],
  [0.0911, 51.2968], [0.0586, 51.2894], [0.0424, 51.2927], [0.0423, 51.3019], [0.0329, 51.3075], [0.0150, 51.2918], [0.0084, 51.3104],
  [0.0103, 51.3161], [0.0066, 51.3157], [0.0023, 51.3291], [-0.0088, 51.3339], [-0.0144, 51.3298], [-0.0221, 51.3381], [-0.0379, 51.3387],
  [-0.0503, 51.3326], [-0.0479, 51.3252], [-0.0513, 51.3224], [-0.0790, 51.3198], [-0.0912, 51.3015], [-0.1243, 51.2868], [-0.1373, 51.3008],
  [-0.1553, 51.3013], [-0.1543, 51.3103], [-0.1619, 51.3196], [-0.1565, 51.3214], [-0.1642, 51.3260], [-0.1631, 51.3303], [-0.1729, 51.3300],
  [-0.1973, 51.3436], [-0.2161, 51.3298], [-0.2292, 51.3359], [-0.2178, 51.3456], [-0.2269, 51.3626], [-0.2454, 51.3669], [-0.2462, 51.3802],
  [-0.2610, 51.3796], [-0.2841, 51.3651], [-0.3041, 51.3431], [-0.3060, 51.3352], [-0.3283, 51.3265], [-0.3305, 51.3484], [-0.3200, 51.3596],
  [-0.3169, 51.3729], [-0.3074, 51.3784], [-0.3173, 51.3934], [-0.3278, 51.3918], [-0.3591, 51.4119], [-0.3781, 51.4079], [-0.3892, 51.4103],
  [-0.3867, 51.4201], [-0.3914, 51.4223], [-0.4059, 51.4227], [-0.4191, 51.4324], [-0.4400, 51.4306], [-0.4398, 51.4346], [-0.4477, 51.4350],
  [-0.4463, 51.4400], [-0.4565, 51.4381], [-0.4575, 51.4491], [-0.4615, 51.4490], [-0.4587, 51.4563], [-0.5104, 51.4681], [-0.4832, 51.5066],
  [-0.4920, 51.5160], [-0.4890, 51.5291], [-0.4955, 51.5385], [-0.4766, 51.5580], [-0.4848, 51.5668], [-0.4840, 51.5751], [-0.4996, 51.5922],
  [-0.4954, 51.6187], [-0.5002, 51.6221], [-0.4991, 51.6306], [-0.4916, 51.6308], [-0.4572, 51.6123], [-0.4406, 51.6201], [-0.3995, 51.6134],
  [-0.3383, 51.6295], [-0.3167, 51.6405], [-0.2962, 51.6354], [-0.2737, 51.6387], [-0.2633, 51.6448], [-0.2574, 51.6418], [-0.2506, 51.6561],
  [-0.2122, 51.6614], [-0.2079, 51.6629], [-0.2112, 51.6670], [-0.2034, 51.6701], [-0.1911, 51.6639], [-0.1725, 51.6731], [-0.1635, 51.6881],
  [-0.1494, 51.6855],
];
// the Thames through London (OpenStreetMap, Hampton Court to Erith)
const THAMES = [
  [-0.3735, 51.4101], [-0.3631, 51.4119], [-0.3598, 51.4120], [-0.3591, 51.4119], [-0.3583, 51.4116], [-0.3578, 51.4115], [-0.3577, 51.4115],
  [-0.3556, 51.4109], [-0.3551, 51.4098], [-0.3482, 51.4060], [-0.3405, 51.4030], [-0.3321, 51.3958], [-0.3300, 51.3933], [-0.3260, 51.3914],
  [-0.3188, 51.3930], [-0.3130, 51.3971], [-0.3119, 51.3985], [-0.3097, 51.4000], [-0.3084, 51.4146], [-0.3060, 51.4213], [-0.3067, 51.4229],
  [-0.3070, 51.4234], [-0.3071, 51.4236], [-0.3073, 51.4238], [-0.3075, 51.4240], [-0.3079, 51.4246], [-0.3085, 51.4251], [-0.3119, 51.4272],
  [-0.3182, 51.4299], [-0.3228, 51.4311], [-0.3233, 51.4312], [-0.3260, 51.4320], [-0.3278, 51.4338], [-0.3308, 51.4410], [-0.3282, 51.4437],
  [-0.3204, 51.4459], [-0.3155, 51.4464], [-0.3133, 51.4469], [-0.3113, 51.4474], [-0.3092, 51.4479], [-0.3083, 51.4481], [-0.3038, 51.4510],
  [-0.3033, 51.4526], [-0.3039, 51.4544], [-0.3061, 51.4568], [-0.3072, 51.4576], [-0.3081, 51.4582], [-0.3161, 51.4616], [-0.3172, 51.4622],
  [-0.3180, 51.4628], [-0.3185, 51.4631], [-0.3200, 51.4642], [-0.3208, 51.4654], [-0.3185, 51.4710], [-0.3072, 51.4754], [-0.2956, 51.4852],
  [-0.2882, 51.4870], [-0.2961, 51.4859], [-0.2982, 51.4835], [-0.2882, 51.4870], [-0.2840, 51.4863], [-0.2785, 51.4834], [-0.2738, 51.4766],
  [-0.2696, 51.4729], [-0.2597, 51.4709], [-0.2548, 51.4722], [-0.2519, 51.4748], [-0.2502, 51.4825], [-0.2481, 51.4853], [-0.2405, 51.4892],
  [-0.2334, 51.4895], [-0.2273, 51.4856], [-0.2252, 51.4761], [-0.2178, 51.4692], [-0.2053, 51.4648], [-0.1932, 51.4640], [-0.1830, 51.4674],
  [-0.1778, 51.4776], [-0.1722, 51.4814], [-0.1500, 51.4845], [-0.1376, 51.4839], [-0.1294, 51.4860], [-0.1240, 51.4912], [-0.1207, 51.5058],
  [-0.1181, 51.5083], [-0.1139, 51.5095], [-0.0960, 51.5093], [-0.0806, 51.5070], [-0.0602, 51.5017], [-0.0549, 51.5028], [-0.0439, 51.5084],
  [-0.0361, 51.5081], [-0.0315, 51.5064], [-0.0297, 51.5041], [-0.0301, 51.4947], [-0.0273, 51.4894], [-0.0200, 51.4854], [-0.0134, 51.4845],
  [-0.0058, 51.4858], [-0.0008, 51.4893], [-0.0008, 51.4927], [-0.0045, 51.4983], [-0.0050, 51.5015], [-0.0028, 51.5049], [0.0005, 51.5065],
  [0.0076, 51.5055], [0.0162, 51.4988], [0.0240, 51.4961], [0.0442, 51.4974], [0.0662, 51.4968], [0.0771, 51.4995], [0.0849, 51.5075],
  [0.0909, 51.5110], [0.1082, 51.5116], [0.1290, 51.5155], [0.1380, 51.5141], [0.1499, 51.5099], [0.1636, 51.5080], [0.1697, 51.5057],
  [0.1750, 51.5012], [0.1800, 51.4890], [0.1851, 51.4854], [0.1920, 51.4842],
];
const LON0 = -0.086, LAT0 = 51.49;
const KM_LON = 111.32 * Math.cos(LAT0 * Math.PI / 180), KM_LAT = 111.2;
const toWorld = ([lon, lat]) => [LAKES.x + (lon - LON0) * KM_LON * 1000, LAKES.y - (lat - LAT0) * KM_LAT * 1000];
const B = BOUNDARY.map(toWorld), TH = THAMES.map(toWorld);
const xs = B.map((p) => p[0]);
export const LONDON_W = Math.max(...xs) - Math.min(...xs);   // ≈ 58 km

/** Stroke the first fraction k of a world-space polyline. */
function partial(ctx, v, pts, k, closed) {
  const P = closed ? [...pts, pts[0]] : pts;
  const segs = [];
  let tot = 0;
  for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); segs.push(l); tot += l; }
  let left = tot * L.clamp(k);
  ctx.beginPath();
  ctx.moveTo(v.wx(P[0][0]), v.wy(P[0][1]));
  let end = P[0];
  for (let i = 1; i < P.length && left > 0; i++) {
    const f = Math.min(1, left / segs[i - 1]);
    end = [L.lerp(P[i - 1][0], P[i][0], f), L.lerp(P[i - 1][1], P[i][1], f)];
    ctx.lineTo(v.wx(end[0]), v.wy(end[1]));
    left -= segs[i - 1];
  }
  return end;
}

// timing (seconds into beat 10)
const T_DIM = 1.45, T_LABEL = 1.6;
function londonK(v) {
  const s = v.tl.scenes[BEAT];
  const ph = v.tl.lines[BEAT].phrases?.[1]?.start ?? s.start + 4.2;
  const t0 = ph - s.start - 0.45;
  const t = v.gt - s.start;
  const draw = L.ease.inOutCubic(L.prog(t, t0, 1.25));
  const fade = 1 - L.ease.inCubic(L.prog(v.gt, v.tl.scenes[11].start - 0.35, 0.3));   // gone with the beat: nothing ghosts into s11
  return { draw, fill: L.ease.outCubic(L.prog(t, t0 + 1.0, 0.8)), fade, t0, t };
}

export default {
  beat: BEAT,
  chapter: { num: '10', title: 'A tiny drop', sub: 'Fresh water in every lake and river' },   // no number before the voice says it
  captions: true,
  layer: 3,
  chapterUntil(d) { return d - 0.6; },
  cues(d) {
    return [
      { t: 1.25, name: 'bloom', gain: 0.32, pitch: 1.1 },
      { t: T_DIM, name: 'swish', gain: 0.2, pitch: 1.4 },
      { t: T_LABEL + 0.05, name: 'tick', gain: 0.22, pitch: 1.0 },
      { t: 3.75, name: 'shimmer', gain: 0.3, pitch: 1.0 },
      { t: 5.0, name: 'ping', gain: 0.22, pitch: 1.2 },
    ];
  },
  drawWorld(ctx, v) {
    const lk = londonK(v);
    if (lk.draw <= 0 || lk.fade <= 0) return;
    if (v.cam.mpp > 600) return;                         // only when we are close to the drop
    const a = lk.fade;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // faint fill once the outline closes
    if (lk.fill > 0) {
      ctx.beginPath();
      B.forEach(([x, y], i) => (i ? ctx.lineTo(v.wx(x), v.wy(y)) : ctx.moveTo(v.wx(x), v.wy(y))));
      ctx.closePath();
      ctx.fillStyle = `rgba(255,214,150,${0.1 * lk.fill * a})`;
      ctx.fill();
    }
    // the Thames
    // the Thames winds through once the outline has closed (west to east)
    const tk = L.ease.inOutCubic(L.prog(lk.t, lk.t0 + 1.0, 0.9));
    if (tk > 0) {
      partial(ctx, v, TH, tk, false);
      ctx.strokeStyle = `rgba(150,215,255,${0.3 * a})`;
      ctx.lineWidth = 14;
      ctx.stroke();
      ctx.strokeStyle = `rgba(190,232,255,${0.9 * a})`;
      ctx.lineWidth = 5;
      ctx.stroke();
    }
    // boundary: glow pass + crisp pass, with a bright head while it draws
    const end = partial(ctx, v, B, lk.draw, true);
    ctx.strokeStyle = `rgba(255,200,120,${0.22 * a})`;
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,226,180,${0.95 * a})`;
    ctx.lineWidth = 3.2;
    ctx.stroke();
    if (lk.draw < 1) L.lightBlob(ctx, v.wx(end[0]), v.wy(end[1]), 34, [255, 220, 170], 0.7 * a);
    ctx.restore();
    // the tag lives exactly as long as the outline (it names the comparison of the beat)
    const gk = L.ease.outCubic(L.prog(lk.t, lk.t0 + 0.5, 0.5)) * a;
    if (gk > 0) {
      const cx = v.wx(LAKES.x), cy = v.wy(LAKES.y), pr = v.ws(R_L);
      const ty = cy - pr * 0.3 + (1 - gk) * 10;
      ctx.save();
      ctx.globalAlpha *= gk;
      ctx.font = L.font(28, 700, L.FONT.body);
      ctx.textBaseline = 'middle';
      const label = 'GREATER LONDON', track = 3.5;
      const tw = ctx.measureText(label).width + track * (label.length - 1);
      ctx.fillStyle = 'rgba(6,18,40,0.62)';
      L.roundRect(ctx, cx - tw / 2 - 22, ty - 25, tw + 44, 50, 25);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,214,150,0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,226,180,0.98)';
      L.trackedText(ctx, label, cx, ty + 1, track, 'center');
      ctx.restore();
    }
  },
  drawOverlay(ctx, v) {
    const cx = v.wx(LAKES.x), cy = v.wy(LAKES.y), pr = v.ws(R_L);
    const ko = 1 - L.ease.inCubic(L.prog(v.t, v.d - 0.35, 0.3));   // stat + dimension out over the last 0.3 s (with London)
    if (ko <= 0) return;
    ctx.save();
    ctx.globalAlpha *= ko;
    // horizontal dimension under the ball
    const dk = Math.min(v.k, L.prog(v.t, T_DIM, 0.7));
    if (dk > 0) {
      const e = L.ease.outCubic(dk);
      const y = cy + pr + 46, x0 = cx - pr, x1 = cx + pr;
      ctx.save();
      ctx.strokeStyle = 'rgba(225,238,252,0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(L.lerp(cx, x0, e), y); ctx.lineTo(L.lerp(cx, x1, e), y);
      for (const x of [x0, x1]) { ctx.moveTo(L.lerp(cx, x, e), y - 14 * e); ctx.lineTo(L.lerp(cx, x, e), y + 14 * e); }
      ctx.stroke();
      // fine extension lines up to the ball's widest point
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = `rgba(225,238,252,${0.35 * L.clamp(dk * 2 - 1)})`;
      ctx.beginPath();
      ctx.moveTo(x0, cy); ctx.lineTo(x0, y - 16);
      ctx.moveTo(x1, cy); ctx.lineTo(x1, y - 16);
      ctx.stroke();
      ctx.restore();
    }
    // big label above the ball
    const k = Math.min(v.k, L.prog(v.t, T_LABEL, 0.5));
    L.bigLabel(ctx, { x: W / 2, y: Math.min(560, cy - pr - 120), big: '56 km', small: '35 mi · fresh lakes and rivers', k, accent: v.accent, align: 'center' });
    ctx.restore();
  },
};
