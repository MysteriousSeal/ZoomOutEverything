// Beat 3 — "Pack in like a concert crowd, four per square meter, | and we'd all fit inside Rhode Island, with room to spare."
// The Puerto Rico-shaped crowd squeezes ×4 into a 45.3 km square, glowing brighter as it densifies, while the camera
// pushes in (210 → 105 m/px). A round lens above it shows the reason: one person on one square metre, then three more
// shuffle in, 2 × 2, shoulder to shoulder. Rhode Island's coastline (mainland, Aquidneck, Conanicut, Block Island)
// draws itself; the square lifts and pours inside it and still leaves a clear margin, which shimmers: room to spare.
// The crowd keeps its Rhode Island shape into beat 4 and fades as the view tilts to the side (see crowdPolygon()).
import * as L from '../../../../engine/runtime/lib.js';
import { CORAL, SHIRTS, HAIRS, drawPerson, drawTile, hash2 } from './s00-hook.js';
import { HF, fillCrowd } from './s01-eight-billion.js';
import {
  project, polyArea, resample, align, squarePoly, polyPath, morph, drawOutline,
  PR_FILL_PTS, N_PTS,
} from './s02-puerto-rico.js';

const { W, ease, clamp, lerp, prog, rgba, mix } = L;

// ------------------------------------------------------------------ Rhode Island (simplified real coastline)
const LON0 = -71.49, LAT0 = 41.67;
// US Census cartographic boundary (1:500k), simplified to ~120 m: the real coast. Block Island is left out: it sits
// 20 km offshore, right on the caption band.
const wind = (P) => (polyArea(P) > 0 ? P : P.slice().reverse());   // same winding as squarePoly (positive area)
export const RI = wind(project([[-71.86267,41.31086],[-71.86051,41.32025],[-71.85192,41.32466],[-71.84771,41.3296],[-71.83616,41.33601],[-71.82938,41.34241],[-71.8313,41.3513],[-71.8357,41.35357],[-71.83787,41.36014],[-71.83763,41.3655],[-71.83161,41.3709],[-71.83267,41.37562],[-71.83064,41.37877],[-71.83353,41.38237],[-71.83266,41.38716],[-71.84213,41.39536],[-71.84256,41.40986],[-71.83965,41.41212],[-71.83411,41.41158],[-71.82457,41.41523],[-71.82033,41.41938],[-71.8169,41.41993],[-71.80681,41.41667],[-71.80368,41.41743],[-71.80144,41.41555],[-71.79768,41.41671],[-71.78699,41.65599],[-71.79924,42.00806],[-71.52761,42.015],[-71.4999,42.0172],[-71.3814,42.0188],[-71.3817,41.8932],[-71.3387,41.8984],[-71.3408,41.8816],[-71.334,41.8623],[-71.3422,41.8448],[-71.3352,41.8355],[-71.3449,41.828],[-71.3472,41.8231],[-71.3389,41.8083],[-71.3407,41.7983],[-71.3322,41.7923],[-71.3279,41.7805],[-71.26139,41.7523],[-71.2248,41.7105],[-71.23297,41.70195],[-71.24099,41.69774],[-71.24581,41.69716],[-71.24248,41.68793],[-71.23464,41.67746],[-71.23844,41.66557],[-71.24438,41.66912],[-71.25033,41.66503],[-71.25956,41.6426],[-71.26316,41.64301],[-71.26705,41.64494],[-71.27007,41.65244],[-71.26768,41.6574],[-71.2691,41.66006],[-71.27766,41.66627],[-71.28037,41.67257],[-71.27885,41.67835],[-71.2855,41.68243],[-71.28907,41.67959],[-71.28764,41.67246],[-71.29055,41.66239],[-71.29786,41.65828],[-71.29916,41.64953],[-71.3014,41.64998],[-71.30499,41.65935],[-71.30609,41.67257],[-71.30263,41.68175],[-71.29894,41.68152],[-71.29312,41.68835],[-71.29122,41.70267],[-71.2988,41.71101],[-71.30145,41.70644],[-71.30547,41.70852],[-71.30798,41.71276],[-71.30576,41.71866],[-71.30713,41.72165],[-71.32419,41.72538],[-71.33946,41.72484],[-71.34112,41.73477],[-71.35229,41.74506],[-71.3599,41.74506],[-71.36013,41.74949],[-71.36235,41.75089],[-71.3618,41.76066],[-71.36465,41.76474],[-71.36964,41.76456],[-71.36512,41.7775],[-71.37154,41.78335],[-71.38129,41.7853],[-71.39056,41.78371],[-71.39175,41.78105],[-71.38549,41.76866],[-71.38557,41.76031],[-71.38105,41.7557],[-71.38057,41.74595],[-71.37606,41.74417],[-71.38081,41.73885],[-71.38105,41.72732],[-71.37653,41.72165],[-71.36988,41.71828],[-71.35728,41.71819],[-71.35728,41.71659],[-71.36572,41.71161],[-71.3656,41.6937],[-71.36275,41.69193],[-71.36489,41.68838],[-71.37154,41.68536],[-71.37299,41.67257],[-71.37791,41.66665],[-71.38988,41.6719],[-71.39055,41.6841],[-71.41807,41.68421],[-71.43381,41.68696],[-71.44134,41.68645],[-71.44308,41.6883],[-71.4419,41.69002],[-71.44592,41.69114],[-71.44932,41.6874],[-71.44689,41.68554],[-71.44716,41.67719],[-71.44142,41.67506],[-71.44094,41.67293],[-71.44592,41.67128],[-71.44447,41.66441],[-71.44023,41.66672],[-71.43004,41.66754],[-71.42545,41.67078],[-71.41765,41.6653],[-71.40862,41.66317],[-71.40752,41.63333],[-71.40315,41.62747],[-71.40862,41.62196],[-71.40244,41.61556],[-71.40434,41.61183],[-71.41195,41.61112],[-71.41694,41.6049],[-71.41432,41.60259],[-71.40361,41.60296],[-71.40377,41.58932],[-71.43025,41.58339],[-71.43952,41.57735],[-71.43881,41.58144],[-71.44094,41.58499],[-71.44641,41.58321],[-71.44427,41.57895],[-71.44705,41.57843],[-71.44641,41.5745],[-71.43809,41.57059],[-71.44341,41.5676],[-71.44257,41.56508],[-71.42954,41.55832],[-71.42787,41.55548],[-71.43104,41.5501],[-71.42865,41.54699],[-71.42478,41.54943],[-71.42336,41.54818],[-71.42667,41.54356],[-71.42312,41.53875],[-71.41765,41.53626],[-71.41813,41.53217],[-71.41551,41.52986],[-71.41494,41.5163],[-71.42142,41.49863],[-71.42086,41.49321],[-71.4186,41.49213],[-71.42076,41.48998],[-71.42027,41.48358],[-71.41796,41.48207],[-71.4184,41.47265],[-71.42116,41.46989],[-71.42299,41.47268],[-71.43074,41.47064],[-71.43001,41.46114],[-71.42582,41.456],[-71.43026,41.45304],[-71.43114,41.4473],[-71.43833,41.43959],[-71.4406,41.43837],[-71.44279,41.4414],[-71.45584,41.43299],[-71.45297,41.40968],[-71.46232,41.40128],[-71.46374,41.39575],[-71.46898,41.39362],[-71.4842,41.37184],[-71.48087,41.36025],[-71.48922,41.36237],[-71.48896,41.36435],[-71.50293,41.3742],[-71.52643,41.37692],[-71.53155,41.37649],[-71.53724,41.37333],[-71.55157,41.37442],[-71.59476,41.36516],[-71.62416,41.36121],[-71.63831,41.35543],[-71.64285,41.35566],[-71.69669,41.34098],[-71.70517,41.33429],[-71.71604,41.33109],[-71.73072,41.33164],[-71.74676,41.32809],[-71.75166,41.3254],[-71.76103,41.32849],[-71.7737,41.32798],[-71.83375,41.31563],[-71.85743,41.30632]], LON0, LAT0));
export const RI_ISLES = [   // Aquidneck, Conanicut, Prudence
  wind(project([[-71.36152,41.46483],[-71.34782,41.4709],[-71.33644,41.48199],[-71.33438,41.4782],[-71.33599,41.46965],[-71.32353,41.47583],[-71.31652,41.47756],[-71.31806,41.48776],[-71.32115,41.48812],[-71.32282,41.49115],[-71.32312,41.50309],[-71.3278,41.50426],[-71.33069,41.5077],[-71.33019,41.51322],[-71.32662,41.5166],[-71.33083,41.51836],[-71.32709,41.52211],[-71.32329,41.52336],[-71.32038,41.51946],[-71.31545,41.51998],[-71.31212,41.52212],[-71.31948,41.52972],[-71.30808,41.53938],[-71.30808,41.54293],[-71.31113,41.54405],[-71.31053,41.54692],[-71.30365,41.55992],[-71.29436,41.57142],[-71.28838,41.57327],[-71.28514,41.57713],[-71.28408,41.57939],[-71.28574,41.58277],[-71.28907,41.58271],[-71.28526,41.59237],[-71.28065,41.59285],[-71.27344,41.60699],[-71.27241,41.61504],[-71.27523,41.61944],[-71.27186,41.62399],[-71.26102,41.62738],[-71.25888,41.63323],[-71.25108,41.63878],[-71.24629,41.63981],[-71.23654,41.63839],[-71.23323,41.64023],[-71.23226,41.64337],[-71.22537,41.6471],[-71.22033,41.65557],[-71.21657,41.6391],[-71.21182,41.6391],[-71.20802,41.65313],[-71.19564,41.67509],[-71.17599,41.6714],[-71.17609,41.6681],[-71.13289,41.6601],[-71.13569,41.6284],[-71.14047,41.62389],[-71.14091,41.6074],[-71.13131,41.59231],[-71.12057,41.49745],[-71.13687,41.49394],[-71.14109,41.48994],[-71.13909,41.48344],[-71.14244,41.48121],[-71.14575,41.48118],[-71.14646,41.4785],[-71.15086,41.47582],[-71.15927,41.47599],[-71.1631,41.47174],[-71.16734,41.4714],[-71.17023,41.46838],[-71.16865,41.46145],[-71.17362,41.46142],[-71.17553,41.45985],[-71.18628,41.46028],[-71.19398,41.4564],[-71.19686,41.46112],[-71.19661,41.46476],[-71.19235,41.46656],[-71.19017,41.48428],[-71.19939,41.49177],[-71.19969,41.49551],[-71.20226,41.49838],[-71.20638,41.49921],[-71.20079,41.51437],[-71.20477,41.5191],[-71.2048,41.52334],[-71.20826,41.52888],[-71.20493,41.5408],[-71.20683,41.54347],[-71.21563,41.54667],[-71.21586,41.55325],[-71.21348,41.55539],[-71.21444,41.5577],[-71.22062,41.5593],[-71.22062,41.56197],[-71.21871,41.56268],[-71.21021,41.56304],[-71.20835,41.58117],[-71.21444,41.58366],[-71.21467,41.58597],[-71.20945,41.59059],[-71.20921,41.59397],[-71.2054,41.59432],[-71.20374,41.5961],[-71.21266,41.61007],[-71.212,41.62299],[-71.21616,41.62549],[-71.24071,41.61923],[-71.2436,41.58751],[-71.23779,41.57759],[-71.23488,41.57655],[-71.2382,41.55877],[-71.23702,41.55485],[-71.23384,41.55379],[-71.23369,41.55236],[-71.23652,41.54489],[-71.23488,41.54169],[-71.23664,41.53585],[-71.23477,41.53254],[-71.22893,41.5303],[-71.22799,41.5283],[-71.23346,41.51405],[-71.24074,41.50555],[-71.24074,41.5017],[-71.24667,41.49426],[-71.24611,41.48684],[-71.24203,41.48534],[-71.23717,41.48655],[-71.23725,41.47957],[-71.23949,41.48006],[-71.24071,41.47487],[-71.24605,41.47174],[-71.24787,41.47301],[-71.24599,41.4813],[-71.25771,41.48762],[-71.26764,41.48821],[-71.26886,41.48402],[-71.27445,41.47986],[-71.27664,41.48004],[-71.28226,41.48798],[-71.29097,41.48759],[-71.2962,41.48474],[-71.29739,41.47344],[-71.29588,41.46858],[-71.30044,41.46722],[-71.30387,41.46312],[-71.30276,41.45975],[-71.30439,41.4545],[-71.31139,41.4508],[-71.31269,41.4514],[-71.31117,41.45446],[-71.31284,41.45589],[-71.31688,41.45393],[-71.32141,41.4556],[-71.32638,41.45161],[-71.33137,41.4525],[-71.33769,41.4489],[-71.3397,41.45258],[-71.34418,41.45403],[-71.35603,41.44933],[-71.35966,41.4598],[-71.3633,41.46063]], LON0, LAT0)),
  wind(project([[-71.40056,41.46094],[-71.39442,41.46722],[-71.39758,41.47376],[-71.39665,41.47892],[-71.39751,41.48698],[-71.40055,41.49033],[-71.39943,41.49298],[-71.39237,41.49186],[-71.38401,41.49381],[-71.38345,41.50105],[-71.37891,41.50495],[-71.391,41.51458],[-71.39214,41.52447],[-71.38568,41.53904],[-71.38661,41.54583],[-71.38448,41.55674],[-71.38141,41.55879],[-71.37902,41.56777],[-71.37362,41.57321],[-71.37019,41.57396],[-71.36356,41.57086],[-71.35987,41.55631],[-71.36041,41.54779],[-71.36468,41.5414],[-71.36134,41.52638],[-71.36561,41.51399],[-71.36338,41.5101],[-71.35985,41.51065],[-71.35762,41.5087],[-71.35892,41.50328],[-71.36598,41.49882],[-71.36654,41.49479],[-71.35948,41.48309],[-71.35409,41.48045],[-71.35431,41.47889],[-71.35706,41.47919],[-71.35874,41.47711],[-71.36424,41.47648],[-71.37174,41.47752],[-71.37509,41.47376],[-71.37676,41.47488],[-71.38066,41.4888],[-71.38624,41.48769],[-71.38159,41.46805],[-71.3845,41.46411],[-71.38903,41.46555],[-71.39028,41.45504],[-71.39957,41.4486]], LON0, LAT0)),
  wind(project([[-71.35382,41.64747],[-71.35283,41.64925],[-71.3503,41.64904],[-71.34763,41.65282],[-71.34327,41.65377],[-71.35157,41.6586],[-71.34693,41.66333],[-71.3489,41.66532],[-71.34482,41.667],[-71.34402,41.66149],[-71.33765,41.65797],[-71.33934,41.65503],[-71.33807,41.65083],[-71.33245,41.64379],[-71.33343,41.64179],[-71.33652,41.6419],[-71.33498,41.64421],[-71.33709,41.64673],[-71.34468,41.64253],[-71.34367,41.6399],[-71.3406,41.63969],[-71.3347,41.63444],[-71.32682,41.6317],[-71.31712,41.63139],[-71.31403,41.62792],[-71.30812,41.62624],[-71.30405,41.61878],[-71.30433,41.60795],[-71.30264,41.60553],[-71.30489,41.60448],[-71.3167,41.58313],[-71.3261,41.57858],[-71.3312,41.58032],[-71.33595,41.5859],[-71.33705,41.59469],[-71.33375,41.60586],[-71.32956,41.6091],[-71.33006,41.6111],[-71.32661,41.61611],[-71.32556,41.62414],[-71.33737,41.63128],[-71.34496,41.63233],[-71.34735,41.63128],[-71.35073,41.63391]], LON0, LAT0)),
];
export const AREA4 = 8.2e9 / 4 / 1e6;                  // 2,050 km²
export const H4 = HF / 2;                               // 22.6 km half-side of the concert-crowd square
// fill shape: the crowd settles in a band that follows the whole coast inward (an inward offset of the mainland
// by ~1.6 km, computed from the coastline with a distance transform), covering exactly 2,050 km² and leaving a
// margin of empty land all round the state and in the bay: room to spare
const RI_FILL_RAW = wind(project([[-71.40564,42.00478],[-71.40354,42.00478],[-71.40196,41.99755],[-71.39955,41.9101],[-71.3979,41.89439],[-71.39542,41.88529],[-71.39211,41.8828],[-71.38279,41.88003],[-71.36438,41.87952],[-71.36032,41.87772],[-71.35769,41.87478],[-71.35649,41.87071],[-71.35611,41.86291],[-71.36009,41.84866],[-71.36009,41.83934],[-71.36438,41.83012],[-71.36551,41.82492],[-71.36438,41.81644],[-71.35987,41.80587],[-71.35949,41.79971],[-71.36039,41.79762],[-71.3622,41.79661],[-71.37933,41.79949],[-71.38648,41.79926],[-71.39662,41.79723],[-71.40474,41.79282],[-71.40947,41.7857],[-71.41,41.77925],[-71.40887,41.77315],[-71.40512,41.76552],[-71.40369,41.75653],[-71.40008,41.74901],[-71.39805,41.72194],[-71.39542,41.71662],[-71.3879,41.71018],[-71.38527,41.70662],[-71.38475,41.70193],[-71.38655,41.70006],[-71.39557,41.6982],[-71.41474,41.69871],[-71.42699,41.70069],[-71.43879,41.70459],[-71.44758,41.70543],[-71.45615,41.70306],[-71.46119,41.69989],[-71.46592,41.69515],[-71.46675,41.68723],[-71.46547,41.67299],[-71.46186,41.66123],[-71.45916,41.65739],[-71.45194,41.65315],[-71.44743,41.65213],[-71.43661,41.6523],[-71.43217,41.65106],[-71.42902,41.64812],[-71.42714,41.64348],[-71.42609,41.62494],[-71.42834,41.61901],[-71.4336,41.61155],[-71.43518,41.60024],[-71.43683,41.59877],[-71.43946,41.59815],[-71.45119,41.5977],[-71.45637,41.59533],[-71.46201,41.59007],[-71.46464,41.5834],[-71.46509,41.57226],[-71.46306,41.56446],[-71.45968,41.55966],[-71.45044,41.55107],[-71.44871,41.54525],[-71.43698,41.52806],[-71.43405,41.5206],[-71.43886,41.50596],[-71.43976,41.48788],[-71.44097,41.48414],[-71.44766,41.47544],[-71.44901,41.47171],[-71.45029,41.45843],[-71.45329,41.45357],[-71.46141,41.44899],[-71.46833,41.44283],[-71.47096,41.43881],[-71.47261,41.43418],[-71.47359,41.41784],[-71.47509,41.41332],[-71.49178,41.39252],[-71.49471,41.39003],[-71.49816,41.38868],[-71.51305,41.38986],[-71.53146,41.38969],[-71.56596,41.38647],[-71.59542,41.38048],[-71.62917,41.37522],[-71.64495,41.37019],[-71.69231,41.35759],[-71.70133,41.35465],[-71.71869,41.34696],[-71.73515,41.34555],[-71.75041,41.34278],[-71.77446,41.34221],[-71.80505,41.33843],[-71.80926,41.33922],[-71.81121,41.3412],[-71.81166,41.35035],[-71.81542,41.36047],[-71.81241,41.37274],[-71.81256,41.38653],[-71.81948,41.4006],[-71.81858,41.40168],[-71.81422,41.40275],[-71.79798,41.40207],[-71.79032,41.40326],[-71.78235,41.40936],[-71.77949,41.41377],[-71.77844,41.41863],[-71.77198,41.58063],[-71.77092,41.64806],[-71.77123,41.71962],[-71.77589,41.87512],[-71.75492,41.9356],[-71.70997,41.97674],[-71.64105,41.99856]], LON0, LAT0));
export const RI_FILL = (() => {
  const k = Math.sqrt(AREA4 / (polyArea(RI_FILL_RAW) / 1e6));   // exact area (the smoothing shaved ~2%)
  let cx = 0, cy = 0;
  RI_FILL_RAW.forEach(([x, y]) => { cx += x; cy += y; });
  cx /= RI_FILL_RAW.length; cy /= RI_FILL_RAW.length;
  return RI_FILL_RAW.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
})();
const SQ4 = align(PR_FILL_PTS, resample(squarePoly(H4), N_PTS));
const RI_PTS = resample(RI, N_PTS);
const RI_FILL_PTS = align(SQ4, resample(RI_FILL, N_PTS));
const D_SQ = PR_FILL_PTS.map(() => 0);   // squeeze: one clock for every point (no creases)
const D_RI = RI_FILL_PTS.map(([x, y]) => clamp((y + 40000) / 80000));        // pour: runs north → south

// ------------------------------------------------------------------ timing (beat-relative)
export const T = {
  squeeze: 0.0, squeezeDur: 1.3,
  lens: 0.75, lensOut: 3.35,
  pack: 1.3,                       // three more people shuffle into the square metre ("four per square meter")
  draw: 3.6, drawDur: 1.3,         // Rhode Island draws itself
  pour: 4.85, pourDur: 1.15,
  label: 4.5,                      // lands on "Rhode Island" (≈ 16.9 s), readable ≈ 3 s before the tilt
  spare: 5.9,                      // the leftover margin shimmers: room to spare
};

/** Crowd outline (world) at beat-3 time t. */
export function crowdPts3(t) {
  const sq = morph(PR_FILL_PTS, SQ4, prog(t, T.squeeze, T.squeezeDur), D_SQ, 0.25, 0);
  const p = prog(t, T.pour, T.pourDur);
  return p > 0 ? morph(SQ4, RI_FILL_PTS, p, D_RI, 0, 0) : sq;
}
/** Crowd polygon in world metres at global time gt (for s04's hand-off). */
export function crowdPolygon(gt, tl) { return crowdPts3(gt - tl.scenes[3].start); }
export const densityAt = (t) => lerp(1, 4, ease.inOutCubic(prog(t, T.squeeze, T.squeezeDur)));

function riPath(v) {
  return (ctx) => {
    ctx.beginPath();
    RI.forEach(([x, y], i) => (i ? ctx.lineTo(v.wx(x), v.wy(y)) : ctx.moveTo(v.wx(x), v.wy(y))));
    ctx.closePath();
  };
}

/** Room to spare: the uncovered land (mainland south coast + the islands) gets a cool tint and diagonal hatching, swept by two glints. */
function spare(ctx, v, t, a) {
  const k = ease.outCubic(prog(t, T.spare, 0.7)) * a;
  if (k <= 0) return;
  const x0 = v.wx(-32000), x1 = v.wx(32000), y0 = v.wy(-40000), y1 = v.wy(40000);
  // each region clipped on its own (the islands sit beside the mainland outline, never inside it)
  for (const P of [RI, ...RI_ISLES]) {
    ctx.save();
    polyPath(v, P)(ctx);
    ctx.clip();
    ctx.globalAlpha *= k;
    ctx.fillStyle = 'rgba(160,200,215,0.1)';
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.beginPath();
    for (let x = x0 - (y1 - y0); x < x1; x += 13) { ctx.moveTo(x, y1); ctx.lineTo(x + (y1 - y0), y0); }
    ctx.strokeStyle = 'rgba(200,230,240,0.36)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    for (const [st, dur, amp] of [[T.spare + 0.1, 1.0, 0.4], [T.spare + 0.75, 1.4, 0.26]]) {
      const sw = prog(t, st, dur);
      if (sw <= 0 || sw >= 1) continue;
      const u = lerp(x0 - 300, x1 + 300, ease.inOutCubic(sw));
      const g = ctx.createLinearGradient(u - 180, 0, u + 180, 0);
      g.addColorStop(0, 'rgba(200,235,245,0)');
      g.addColorStop(0.5, `rgba(200,235,245,${amp * Math.sin(Math.PI * sw)})`);
      g.addColorStop(1, 'rgba(200,235,245,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x0 - 400, y0, x1 - x0 + 800, y1 - y0);
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------------ the density lens (screen space)
const LENS = { x: W / 2, y: 484, r: 172 };   // its bottom (656) stays ≥ 20 px clear of the crowd's top edge
const LENS_AIM = 742;    // leader ends on the crowd's top edge
// the 2 × 2 packing: where each of the four people ends (metres in the 1 m tile) and where they come from. Seen from
// straight above (like the carpet), each person at 0.88 scale takes ≈ 0.44 × 0.4 m: four fit inside the tile, shoulder
// to shoulder, nobody overlapping and nobody spilling over its edge.
const PACK = [
  { to: [-0.235, -0.235], from: [0, 0], rot: -0.08 },
  { to: [0.235, -0.235], from: [1.25, -0.55], rot: 0.1, d: 0 },
  { to: [-0.235, 0.235], from: [-1.25, 0.6], rot: -0.12, d: 0.1 },
  { to: [0.235, 0.235], from: [0.7, 1.3], rot: 0.06, d: 0.2 },
];
const PACK_SC = 0.88;

function drawLens(ctx, v, t) {
  const kin = ease.outBack(prog(t, T.lens, 0.55), 1.3), kout = ease.inCubic(prog(t, T.lensOut, 0.35));
  const k = clamp(kin) * (1 - kout) * v.k;
  if (k <= 0.002) return;
  const { x, y } = LENS, r = LENS.r * lerp(0.6, 1, kin) * (1 - 0.15 * kout);
  ctx.save();
  ctx.globalAlpha *= clamp(k * 1.5);
  // leader from the lens down to the crowd
  const lk = ease.outCubic(prog(t, T.lens + 0.25, 0.5)) * (1 - kout);
  if (lk > 0) {
    ctx.strokeStyle = 'rgba(255,225,215,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y + r); ctx.lineTo(x, lerp(y + r, LENS_AIM, lk)); ctx.stroke();
    ctx.fillStyle = 'rgba(255,225,215,0.9)';
    ctx.beginPath(); ctx.arc(x, lerp(y + r, LENS_AIM, lk), Math.max(0, 5 * lk), 0, Math.PI * 2); ctx.fill();
  }
  // glass: dark floor, soft shadow, coral rim
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
  ctx.fillStyle = '#140d0f';
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r - 1), 0, Math.PI * 2); ctx.clip();
  // inside: a 1 m tile at ~180 px/m, viewed from above, with a slow drift for life
  const s = r * 1.0, cx = x + 4 * Math.sin(v.gt * 0.7), cy = y + 3 * Math.cos(v.gt * 0.6);
  const lv = { cam: { mpp: 1 / s }, wx: (m) => cx + m * s, wy: (m) => cy + m * s };
  // neighbours' tiles at the lens edge, dim
  for (const [i, j] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) drawTile(ctx, lv, i, j, { a: 0.35 });
  const pk = prog(t, T.pack, 0.9);
  drawTile(ctx, lv, 0, 0, { rim: 0.55 + 0.45 * ease.outCubic(pk) });
  // back row first (painter's order), seen from straight above like the carpet below
  PACK.map((p, i) => [p, i]).sort((a, b) => a[0].to[1] - b[0].to[1]).forEach(([p, i]) => {
    const q = i === 0 ? ease.inOutCubic(prog(t, T.pack, 0.6)) : ease.outCubic(prog(t, T.pack + (p.d ?? 0), 0.7));
    const mx = lerp(p.from[0], p.to[0], q), my = lerp(p.from[1], p.to[1], q);
    // a little shuffle once packed: weight shifts, heads turn
    const jig = 0.006 * Math.sin(v.gt * 3 + i * 2);
    drawPerson(ctx, lv.wx(mx + jig), lv.wy(my), s * PACK_SC, p.rot + 0.04 * Math.sin(v.gt * 1.3 + i), {
      shirt: i === 0 ? CORAL : SHIRTS[[1, 3, 4][i - 1]], hair: HAIRS[i % HAIRS.length],
      breathe: Math.sin(v.gt * 1.8 + i * 1.7), head: 0.25 * L.noise1(v.gt * 0.6 + i * 4, 8 + i),
    });
  });
  // vignette inside the glass
  const g = ctx.createRadialGradient(x, y, r * 0.55, x, y, r);
  g.addColorStop(0, 'rgba(10,6,8,0)');
  g.addColorStop(1, 'rgba(10,6,8,0.75)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  // glass: a soft highlight in the upper left (no hard glint line)
  L.lightBlob(ctx, x - r * 0.42, y - r * 0.48, r * 0.45, [255, 236, 226], 0.08);
  // count chip: "1" → "4" per m², counted as each person lands; on a light pill at the bottom of the glass
  const n = 1 + PACK.slice(1).filter((p) => t >= T.pack + (p.d ?? 0) + 0.3).length;
  const bump = Math.max(0, ...PACK.slice(1).map((p) => { const u = t - (T.pack + p.d + 0.3); return u >= 0 && u < 0.3 ? Math.sin(Math.PI * u / 0.3) : 0; }));
  ctx.font = L.font(30, 700, L.FONT.body);
  ctx.textBaseline = 'middle';
  const chip = `${n} PER m²`, cw = ctx.measureText(chip).width + 2 * (chip.length - 1) + 40, chy = y + r - 44;
  ctx.fillStyle = 'rgba(246,232,226,0.94)';
  L.roundRect(ctx, x - cw / 2, chy - 22, cw, 44, 22); ctx.fill();
  ctx.fillStyle = n === 4 ? rgba(mix(CORAL, [120, 30, 26], 0.55 + 0.2 * bump)) : 'rgba(40,22,24,0.95)';
  ctx.save();
  ctx.translate(x, chy); ctx.scale(1 + 0.08 * bump, 1 + 0.08 * bump);
  L.trackedText(ctx, chip, 0, 1, 2, 'center');
  ctx.restore();
  ctx.restore();
  // rim
  ctx.strokeStyle = rgba(CORAL, 0.95);
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = rgba(CORAL, 0.18);
  ctx.lineWidth = 12;
  ctx.stroke();
  ctx.restore();
}

export default {
  beat: 3,
  chapter: { num: '03', title: 'Concert crowd', sub: '4 people per m²' },
  captions: true,
  chapterUntil() { return T.label - 0.55; },   // the card clears the top band for the label
  layer: 1,
  cues(d) {
    return [
      { t: T.squeeze, name: 'swish', gain: 0.24, pitch: 0.7 },
      { t: T.squeeze + T.squeezeDur - 0.1, name: 'creak', gain: 0.16, pitch: 1.1 },
      { t: T.lens, name: 'blip', gain: 0.2, pitch: 1.0 },
      ...PACK.slice(1).map((p, i) => ({ t: T.pack + p.d + 0.3, name: 'tick', gain: 0.24, pitch: 1.0 + i * 0.12 })),
      { t: T.lensOut, name: 'swish', gain: 0.12, pitch: 1.3 },
      { t: T.draw, name: 'swish', gain: 0.22, pitch: 0.8 },
      { t: T.pour, name: 'swell', gain: 0.3, pitch: 1.0 },
      { t: T.pour + T.pourDur - 0.1, name: 'bloom', gain: 0.32, pitch: 1.1 },
      { t: T.label, name: 'ping', gain: 0.24, pitch: 1.05 },
      { t: T.spare + 0.1, name: 'shimmer', gain: 0.22, pitch: 1.2 },
      { t: T.spare + 0.8, name: 'shimmer', gain: 0.14, pitch: 1.35 },
    ];
  },
  drawWorld(ctx, v) {
    const t = v.t, sc = v.tl.scenes;
    if (t < 0) return;
    const t4 = v.gt - sc[4].start;
    const out = 1 - ease.inCubic(prog(t4, 0.1, 0.6));      // tilt to the side view: the map leaves
    if (out <= 0) return;
    // Rhode Island
    const f = ease.inOutCubic(prog(t, T.draw, T.drawDur));
    if (f > 0) {
      ctx.save();
      ctx.globalAlpha *= out;
      drawOutline(ctx, v, RI_PTS, f, { fill: [120, 140, 150], fillA: 0.1 * ease.outCubic(prog(t, T.draw + T.drawDur - 0.2, 0.6)) });
      const ik = ease.outCubic(prog(t, T.draw + T.drawDur - 0.3, 0.6));
      RI_ISLES.forEach((P) => drawOutline(ctx, v, P, 1, { a: ik, lw: 2, fill: [120, 140, 150], fillA: 0.1 }));
      spare(ctx, v, t, 1);
      ctx.restore();
    }
    // the crowd (s04 takes it over, same outline via crowdPts3, the moment beat 4 starts)
    if (t4 >= 0) return;
    const p = prog(t, T.pour, T.pourDur);
    const lift = Math.max(Math.sin(Math.PI * clamp(p * 1.15)) * 0.8, 0.35 * Math.sin(Math.PI * prog(t, T.squeeze, T.squeezeDur)));
    const P = crowdPts3(t);
    fillCrowd(ctx, v, polyPath(v, P), { density: densityAt(t), lift });
    // landing ring
    const sp = prog(t, T.pour + T.pourDur - 0.12, 0.9);
    if (sp > 0 && sp < 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      polyPath(v, RI_FILL_PTS)(ctx);
      ctx.lineJoin = 'round';   // no miter spikes at sharp capes
      ctx.strokeStyle = rgba(CORAL, 0.5 * (1 - sp));
      ctx.lineWidth = 2 + 28 * ease.outCubic(sp);
      ctx.stroke();
      ctx.restore();
    }
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    drawLens(ctx, v, t);
    // the label fades out over the beat's last 0.4 s (gone at the boundary, no pop)
    const lk = prog(t, T.label, 0.55), lo = 1 - ease.inOutCubic(prog(t, v.d - 0.4, 0.38));
    if (lk > 0 && lo > 0) {
      ctx.save();
      ctx.globalAlpha *= lo;
      L.bigLabel(ctx, { x: W / 2, y: 392, align: 'center', big: '≈ 2,050 km²', small: '4 per m² · fits in Rhode Island', k: lk, accent: v.accent, size: 100 });
      ctx.restore();
    }
  },
};
