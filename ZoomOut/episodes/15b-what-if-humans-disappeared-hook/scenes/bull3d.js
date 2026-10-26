// 15b — The Charging Bull (Arturo Di Modica, 1989: bronze, ~4.9 m long, ~3.4 m tall) as a real 3D sculpture.
// The bull is a signed-distance model (smooth-blended ellipsoids and tapered capsules: barrel, shoulder hump, deep
// chest and dewlap, raised hindquarters, lowered and turned head, forward-thrust horns, a tail lashed up in an S, four
// legs with forearms/gaskins, knees and hocks, cannons and cloven hooves). It is ray-marched ONCE into a cached
// normal / material buffer for the loupe's fixed orthographic camera, then RELIT every frame from the scene's sun
// (bronze: dark brown body, verdigris in the recesses, polished gold highlights on the horns, brow, muzzle and the
// top of the back). Its cast shadow is the true projection of the same solid (a cached cloud of interior points).
// Pure functions of the inputs: no randomness, nothing time-based except the sun direction passed in.
// Bull-local metres: x from the rump (0) to the muzzle (~4.8), y toward the viewer's side, z up from the plinth top.

// ------------------------------------------------------------------ the model
const v3 = (x, y, z) => [x, y, z];
function sdEll(px, py, pz, c, r) {
  const ax = (px - c[0]) / r[0], ay = (py - c[1]) / r[1], az = (pz - c[2]) / r[2];
  const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
  const bx = ax / r[0], by = ay / r[1], bz = az / r[2];
  const k1 = Math.sqrt(bx * bx + by * by + bz * bz);
  return k1 < 1e-9 ? -Math.min(r[0], r[1], r[2]) : (k0 * (k0 - 1)) / k1;
}
function sdCap(px, py, pz, a, b, ra, rb) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const pax = px - a[0], pay = py - a[1], paz = pz - a[2];
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
  const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (ra + (rb - ra) * h);
}
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };

// head turned toward the viewer (its left), growing along the neck
const TW = (x) => 0.2 * Math.max(0, Math.min(1, (x - 3.5) / 1.1));
// body masses: [centre, radii, blend]
const MASS = [
  [v3(2.15, 0, 1.92), v3(1.05, 0.58, 0.56), 0],      // barrel (ribcage)
  [v3(3.15, 0, 1.96), v3(0.78, 0.68, 0.9), 0.45],    // chest and shoulders (the heaviest part)
  [v3(2.95, 0, 2.55), v3(0.9, 0.52, 0.44), 0.45],    // the hump over the withers, merging into the crest (15b: heavier)
  [v3(0.82, 0, 2.0), v3(0.66, 0.55, 0.6), 0.45],     // hindquarters (raised)
  [v3(1.55, 0, 2.3), v3(0.95, 0.5, 0.3), 0.45],      // loin: the back line runs on from the rump to the withers
  [v3(0.45, 0, 2.18), v3(0.36, 0.44, 0.26), 0.3],    // hip bones / rump top
  [v3(3.72, 0, 1.16), v3(0.36, 0.34, 0.42), 0.3],    // brisket and dewlap
  [v3(2.4, 0, 1.5), v3(1.0, 0.5, 0.32), 0.4],       // belly (rising toward the flank: the waist tucks up)
];
// paired muscles (mirrored in y): shoulder blade + triceps, thigh, forearm root
const MUSCLE = [
  [v3(3.2, 0.48, 2.0), v3(0.5, 0.22, 0.62), 0.3],
  [v3(3.42, 0.4, 1.5), v3(0.34, 0.24, 0.38), 0.35],
  [v3(1.0, 0.44, 1.8), v3(0.58, 0.2, 0.58), 0.28],
  [v3(0.5, 0.36, 1.62), v3(0.3, 0.2, 0.45), 0.2],
  // 15b: definition — triceps bulge behind the shoulder, the forearm root, biceps femoris and gaskin on the haunch,
  // the heavy neck crest folds, the dewlap fold under the throat
  [v3(3.0, 0.58, 1.62), v3(0.34, 0.14, 0.32), 0.07],
  [v3(3.55, 0.5, 1.18), v3(0.2, 0.14, 0.32), 0.07],
  [v3(0.72, 0.56, 1.95), v3(0.36, 0.14, 0.4), 0.07],
  [v3(1.15, 0.5, 1.36), v3(0.24, 0.14, 0.32), 0.07],
  [v3(3.62, 0.48, 1.92), v3(0.26, 0.15, 0.32), 0.07],
  [v3(3.4, 0.55, 2.16), v3(0.32, 0.13, 0.24), 0.06],
  [v3(2.6, 0.6, 2.0), v3(0.42, 0.1, 0.28), 0.08],
];
// the body's twist: the hindquarters swing away from the viewer while the head turns toward us (an S through the spine)
const REAR = (x) => -0.17 * Math.max(0, Math.min(1, (2.4 - x) / 1.9));
// face: brow ridges, eyes (deep sockets, dark glossy eyeballs) and flared nostrils (mirrored, head frame)
const BROW = [v3(4.24, 0.25, 1.42), v3(0.11, 0.07, 0.055)];
const EYE = [v3(4.31, 0.285, 1.32), 0.052];
const SOCKET = [v3(4.33, 0.33, 1.31), 0.075];
const NOSTRIL = [v3(4.75, 0.085, 0.64), v3(0.05, 0.034, 0.045)];
// legs: chains of tapered capsules [a, b, ra, rb]; hooves separately (cloven: two toes)
const LEGS = [
  // near fore, braced forward (the weight is thrown onto the forelegs)
  { y: 0.36, segs: [[v3(3.5, 0, 1.55), v3(3.9, 0, 0.66), 0.38, 0.2], [v3(3.9, 0, 0.66), v3(4.08, 0, 0.18), 0.16, 0.115]], hoof: v3(4.14, 0, 0.07) },
  // far fore, planted under the shoulder
  { y: -0.36, segs: [[v3(3.3, 0, 1.55), v3(3.44, 0, 0.66), 0.38, 0.2], [v3(3.44, 0, 0.66), v3(3.48, 0, 0.18), 0.16, 0.115]], hoof: v3(3.52, 0, 0.07) },
  // near hind, driving back: gaskin to a hock angled back, cannon down to the hoof
  { y: 0.4, segs: [[v3(1.2, 0, 1.55), v3(0.5, 0, 0.74), 0.4, 0.19], [v3(0.5, 0, 0.74), v3(0.56, 0, 0.18), 0.15, 0.11]], hoof: v3(0.62, 0, 0.07) },
  // far hind, set further under
  { y: -0.4, segs: [[v3(1.45, 0, 1.55), v3(0.98, 0, 0.74), 0.4, 0.19], [v3(0.98, 0, 0.74), v3(1.08, 0, 0.18), 0.15, 0.11]], hoof: v3(1.14, 0, 0.07) },
];
// neck and head (centre line y = 0 before the twist)
const NECK = [v3(3.4, 0, 2.2), v3(4.0, 0, 1.55), 0.56, 0.4];
const HEAD = [v3(4.12, 0, 1.55), v3(4.54, 0, 0.83), 0.34, 0.26];
const FOREHEAD = [v3(4.2, 0, 1.5), v3(0.28, 0.37, 0.34)];
const MUZZLE = [v3(4.58, 0, 0.74), v3(0.22, 0.26, 0.2)];
const JAW = [v3(4.3, 0, 0.95), v3(0.34, 0.27, 0.25)];
// horns (mirrored): from the poll, out sideways, then forward with the tips turned up
const HORN = [v3(4.14, 0.22, 1.7), v3(4.08, 0.52, 1.84), v3(4.22, 0.8, 1.94), v3(4.5, 0.86, 1.98), v3(4.76, 0.7, 2.12)];
const HORN_R = [0.14, 0.115, 0.09, 0.065, 0.03];
const EAR = [v3(4.0, 0.36, 1.68), v3(3.86, 0.56, 1.66), 0.07, 0.04];
// tail: lashed up and over in an S toward the far side, ending in a switch
const TAIL = [v3(0.2, -0.04, 2.36), v3(0.0, -0.1, 2.62), v3(-0.08, -0.16, 2.96), v3(0.06, -0.2, 3.26), v3(0.34, -0.22, 3.4), v3(0.62, -0.2, 3.3)];
// the tail as a smooth curve: Catmull-Rom resampled into short segments (no visible joints)
const TAILS = (() => {
  const P = TAIL, out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < 4; k++) {
      const t = k / 4, t2 = t * t, t3 = t2 * t;
      out.push([0, 1, 2].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  out.push(P[P.length - 1]);
  return out;
})();
const SWITCH = [v3(0.62, -0.2, 3.3), v3(0.7, -0.2, 2.98), 0.035, 0.1];   // the switch: a tuft flaring to its end

/** distance + material (0 bronze body, 1 horn, 2 hoof) */
function sdf(x, y, z, out) {
  y -= REAR(x);                                           // 15b: the twist through the spine
  const yt = y - TW(x);                                   // untwisted y for the head and neck
  let d = 1e9;
  for (const [c, r, k] of MASS) d = k ? smin(d, sdEll(x, y, z, c, r), k) : Math.min(d, sdEll(x, y, z, c, r));
  const ay = Math.abs(y);
  for (const [c, r, k] of MUSCLE) d = smin(d, sdEll(x, ay, z, c, r), k);
  d = smin(d, sdCap(x, yt, z, NECK[0], NECK[1], NECK[2], NECK[3]), 0.3);
  let h = sdCap(x, yt, z, HEAD[0], HEAD[1], HEAD[2], HEAD[3]);
  h = smin(h, sdEll(x, yt, z, FOREHEAD[0], FOREHEAD[1]), 0.12);
  h = smin(h, sdEll(x, yt, z, MUZZLE[0], MUZZLE[1]), 0.12);
  h = smin(h, sdEll(x, yt, z, JAW[0], JAW[1]), 0.12);
  const ayt = Math.abs(yt);
  h = smin(h, sdCap(x, ayt, z, EAR[0], EAR[1], EAR[2], EAR[3]), 0.05);
  h = smin(h, sdEll(x, ayt, z, BROW[0], BROW[1]), 0.05);                       // brow ridge
  h = Math.max(h, -(Math.hypot(x - SOCKET[0][0], ayt - SOCKET[0][1], z - SOCKET[0][2]) - SOCKET[1]));   // eye socket
  h = Math.max(h, -sdEll(x, ayt, z, NOSTRIL[0], NOSTRIL[1]));                  // flared nostrils
  d = smin(d, h, 0.18);
  // ribs and the folds of the neck: shallow ridges that catch the light along the flank
  if (x > 1.4 && x < 3.1 && z > 1.3 && z < 2.2 && Math.abs(y) > 0.25) {
    const w = Math.min(1, (x - 1.4) / 0.3, (3.1 - x) / 0.3, (z - 1.3) / 0.25, (2.2 - z) / 0.25);
    d += 0.026 * w * Math.sin(x * 17 + z * 2.5);
  }
  if (x > 3.45 && x < 4.05 && z > 1.4 && Math.abs(yt) > 0.2) {
    const w = Math.min(1, (x - 3.45) / 0.15, (4.05 - x) / 0.15);
    d += 0.028 * w * Math.sin((x * 0.6 + z) * 16);
  }
  for (const lg of LEGS) {
    const ly = y - lg.y;
    if (Math.abs(ly) > 0.6) continue;
    let l = 1e9;
    for (const [a, b, ra, rb] of lg.segs) l = smin(l, sdCap(x, ly, z, a, b, ra, rb), 0.08);
    const j = lg.segs[0][1];
    l = smin(l, Math.hypot(x - j[0], ly, z - j[2]) - 0.165, 0.06);                 // knee / hock
    d = smin(d, l, 0.3);
  }
  if (x < 1.1 && z > 2.0) {
    const n = TAILS.length - 1, rr = (i) => (i < 3 ? 0.1 - 0.013 * i : 0.062 - 0.0016 * i);
    for (let i = 0; i < n; i++) d = smin(d, sdCap(x, y, z, TAILS[i], TAILS[i + 1], rr(i), rr(i + 1)), i < 3 ? 0.1 : 0.06);
  }
  d = smin(d, sdCap(x, y, z, SWITCH[0], SWITCH[1], SWITCH[2], SWITCH[3]), 0.05);
  // hooves: cloven (two toes), dark
  let hf = 1e9;
  for (const lg of LEGS) {
    const ly = y - lg.y;
    if (Math.abs(ly) > 0.4) continue;
    for (const s of [-1, 1]) hf = Math.min(hf, sdEll(x, ly - s * 0.05, z, lg.hoof, [0.125, 0.056, 0.075]));
  }
  let hn = 1e9;
  for (let i = 0; i < HORN.length - 1; i++) hn = Math.min(hn, sdCap(x, ayt, z, HORN[i], HORN[i + 1], HORN_R[i], HORN_R[i + 1]));
  let m = 0, best = d;
  const eye = Math.hypot(x - EYE[0][0], ayt - EYE[0][1], z - EYE[0][2]) - EYE[1];
  if (eye < best) { m = 3; best = eye; }
  if (hf < best + 0.01) { m = 2; best = smin(best, hf, 0.04); }
  if (hn < best) { m = 1; best = smin(best, hn, 0.03); } else best = smin(best, hn, 0.03);
  if (out) out.m = m;
  return Math.max(best, -z);                                 // flat underside of the hooves on the plinth
}

// ------------------------------------------------------------------ cached render
const KC = 104;                       // cache resolution: px per metre (≥ 2x the loupe's ~46-52 for antialiasing)
let CACHE = null;
function build(YAW, ELEV) {
  const se = Math.sin(ELEV), ce = Math.cos(ELEV), cy0 = Math.cos(YAW), sy0 = Math.sin(YAW);
  // screen (u, v) in metres: u = gx, v = gy*se - z*ce (proj convention); view ray into the scene d = (gy: -ce, z: -se)
  const toLocal = (gx, gy) => [gx * cy0 + gy * sy0, -gx * sy0 + gy * cy0];
  const U0 = -3.2, U1 = 3.3, V0 = -4.0, V1 = 1.4;
  const W = Math.ceil((U1 - U0) * KC), H = Math.ceil((V1 - V0) * KC);
  const N = new Float32Array(W * H * 3), MAT = new Int8Array(W * H).fill(-1), AO = new Float32Array(W * H), POS = new Float32Array(W * H * 3);
  const o = { m: 0 };
  const XC = 2.4;
  for (let j = 0; j < H; j++) {
    const vv = V0 + (j + 0.5) / KC;
    for (let i = 0; i < W; i++) {
      const u = U0 + (i + 0.5) / KC;
      // ray origin: back along -d from the screen plane point (gx = u, gy = vv*se, z = -vv*ce)
      let gy = vv * se + ce * 8, z = -vv * ce + se * 8;
      let t = 0, hit = false, px = 0, py = 0;
      for (let s = 0; s < 140 && t < 16; s++) {
        const cgy = gy - ce * t, cz = z - se * t;
        [px, py] = toLocal(u, cgy);
        const bx = px + XC;
        // bounding box of the statue (cheap skip)
        const db = Math.max(-0.5 - bx, bx - 5.25, Math.abs(py) - 1.15, -cz - 0.02, cz - 3.75);
        const dd = db > 0.05 ? db : sdf(bx, py, cz, null);
        if (dd < 0.0025) { hit = db <= 0.05; if (hit) { z = cz; gy = cgy; } break; }
        t += Math.max(0.002, dd * 0.75);
      }
      if (!hit) continue;
      const bx = px + XC, k = j * W + i, e = 0.006;
      sdf(bx, py, z, o);
      const nx = sdf(bx + e, py, z) - sdf(bx - e, py, z), ny = sdf(bx, py + e, z) - sdf(bx, py - e, z), nz = sdf(bx, py, z + e) - sdf(bx, py, z - e);
      const nl = Math.hypot(nx, ny, nz) || 1;
      N[k * 3] = nx / nl; N[k * 3 + 1] = ny / nl; N[k * 3 + 2] = nz / nl;
      MAT[k] = o.m;
      POS[k * 3] = bx; POS[k * 3 + 1] = py; POS[k * 3 + 2] = z;
      // ambient occlusion: how open the surface is along its normal
      let ao = 1;
      for (const [h, w] of [[0.05, 0.35], [0.14, 0.35], [0.3, 0.3]]) {
        const s2 = sdf(bx + N[k * 3] * h, py + N[k * 3 + 1] * h, z + N[k * 3 + 2] * h);
        ao -= w * Math.max(0, (h - s2) / h);
      }
      AO[k] = Math.max(0.15, Math.min(1, ao));
    }
  }
  // shadow cloud: interior points on a 7 cm grid (bull-local)
  const pts = [];
  for (let x = -0.4; x <= 5.2; x += 0.07) for (let y = -1.1; y <= 1.1; y += 0.07) for (let z = 0.02; z <= 3.6; z += 0.07) {
    if (sdf(x, y, z) < 0) pts.push(x, y, z);
  }
  const canvas = new OffscreenCanvas(W, H);
  const img = canvas.getContext('2d').createImageData(W, H);
  // the anchor: bull-local (XC, 0, 0) is at u = 0, v = 0
  return { W, H, N, MAT, AO, POS, ax: -U0 * KC, ay: -V0 * KC, canvas, img, pts: new Float32Array(pts), key: null, YAW, ELEV };
}
const get = (YAW, ELEV) => (CACHE && CACHE.YAW === YAW && CACHE.ELEV === ELEV ? CACHE : (CACHE = build(YAW, ELEV)));

/** relight the cached buffers for a sun whose ground shadow runs along S (bull-local, unit), cot = shadow length / height */
function relight(C, S0, cot) {
  // the sun's azimuth quantised to 0.015 rad (invisible under motion blur; halves the relights while it sweeps)
  const az = Math.round(Math.atan2(S0.y, S0.x) / 0.015) * 0.015, S = { x: Math.cos(az), y: Math.sin(az) };
  const key = `${az.toFixed(3)}`;
  if (C.key === key) return;
  C.key = key;
  const se = Math.sin(C.ELEV), ce = Math.cos(C.ELEV), cy0 = Math.cos(C.YAW), sy0 = Math.sin(C.YAW);
  let lx = -S.x, ly = -S.y, lz = 1 / cot; const ll = Math.hypot(lx, ly, lz); lx /= ll; ly /= ll; lz /= ll;
  const vx = ce * sy0, vy = ce * cy0, vz = se;          // toward the viewer (bull-local)
  let hx = lx + vx, hy = ly + vy, hz = lz + vz; const hl = Math.hypot(hx, hy, hz); hx /= hl; hy /= hl; hz /= hl;
  const { N, MAT, AO, POS, img, W, H } = C, D = img.data;
  const g = (c) => Math.round(255 * Math.pow(Math.max(0, Math.min(1, c)), 1 / 2.2));
  // sun self-shadowing: march a few steps toward the sun from each lit surface point
  for (let k = 0, n = W * H; k < n; k++) {
    const m = MAT[k], q = k * 4;
    if (m < 0) { D[q + 3] = 0; continue; }
    const nx = N[k * 3], ny = N[k * 3 + 1], nz = N[k * 3 + 2], ao = AO[k];
    const px = POS[k * 3], py = POS[k * 3 + 1], pz = POS[k * 3 + 2];
    let dif = Math.max(0, nx * lx + ny * ly + nz * lz);
    if (dif > 0) {
      let t = 0.04, sh = 1;
      for (let s = 0; s < 22 && t < 3.5; s++) {
        const d = sdf(px + lx * t, py + ly * t, pz + lz * t);
        if (d < 0.004) { sh = 0; break; }
        sh = Math.min(sh, (8 * d) / t);
        t += Math.max(0.02, d);
      }
      dif *= Math.max(0, Math.min(1, sh));
    }
    let shad = 1;
    if (dif <= 0) shad = 0;
    const nh = Math.max(0, nx * hx + ny * hy + nz * hz);
    const nv = Math.max(0, nx * vx + ny * vy + nz * vz);
    const rz = 2 * nv * nz - vz;                                // reflected view ray, its height component
    // 15b: weathered bronze. Albedo is low (it is a metal): the look comes from tinted reflections of the sky above and
    // the dark forest below, plus a sharp sun highlight. The body is dark chocolate bronze with a green-black patina in
    // the recesses; the nose, brow, horns and the top of the back are rubbed to bright gold.
    let ar, ag, ab, fr, fg, fb, pw, rough;
    if (m === 1) { ar = 0.03; ag = 0.02; ab = 0.01; fr = 0.92; fg = 0.66; fb = 0.34; pw = 220; rough = 0.25; }       // horns: polished gold
    else if (m === 2) { ar = 0.012; ag = 0.01; ab = 0.008; fr = 0.08; fg = 0.07; fb = 0.06; pw = 30; rough = 1; }   // hooves: dark
    else if (m === 3) { ar = 0.004; ag = 0.004; ab = 0.004; fr = 0.35; fg = 0.33; fb = 0.3; pw = 400; rough = 0.1; } // eyes: wet black
    else {
      const pat = Math.max(0, Math.min(1, (0.8 - ao) * 2.2));
      const rub = Math.min(1, Math.max(0, Math.min(1, (px - 4.4) / 0.18))                       // nose and muzzle
        + Math.max(0, Math.min(1, (pz - 2.45) / 0.2)) * 0.85                                       // top of the hump and back
        + (Math.hypot(px - 4.24, Math.abs(py) - 0.25, pz - 1.42) < 0.16 ? 0.7 : 0));             // the brow
      const b0 = [0.02, 0.011, 0.005], b1 = [0.009, 0.014, 0.011];                                  // bronze / patina albedo
      ar = b0[0] + (b1[0] - b0[0]) * pat; ag = b0[1] + (b1[1] - b0[1]) * pat; ab = b0[2] + (b1[2] - b0[2]) * pat;
      const k = rub * (1 - pat);
      fr = 0.2 + (0.92 - 0.2) * k; fg = 0.115 + (0.64 - 0.115) * k; fb = 0.055 + (0.3 - 0.055) * k;     // F0: dull bronze -> rubbed gold
      fr *= 1 - 0.55 * pat; fg *= 1 - 0.45 * pat; fb *= 1 - 0.45 * pat;
      pw = 120 + 180 * k; rough = 0.75 - 0.5 * k;
    }
    const fres = Math.pow(1 - nv, 5);
    // environment: a bright warm sky (strongest just above the horizon on the sun side), the dark green forest below
    const sky = Math.max(0, Math.min(1, (rz + 0.05) / 0.45));
    const envC = (0.01 + (m === 0 ? 0.16 : 0.42) * sky * sky * sky) * ao;   // the dull body reflects little; rubbed gold and horns mirror the sky
    const env = envC * (1 - 0.6 * rough) + 0.025 * ao * rough;
    const spec = (Math.pow(nh, pw) * (pw + 8) / 30 + Math.pow(nh, pw * 0.15) * 0.16) * shad * Math.max(0, Math.min(1, dif * 3));
    const fk = 1 + 1.5 * fres;
    // the low sun behind the statue: a hot rim along every silhouette edge that faces it, and its glare on the back
    const ldn = nx * lx + ny * ly + nz * lz;
    const rim = Math.pow(1 - nv, 2.5) * Math.max(0, ldn + 0.45) * 3.2 * ao;
    const amb = (0.12 + 0.12 * nz) * ao;
    D[q] = g(ar * (2.6 * dif + amb) + fr * fk * (spec + env) + fr * rim);
    D[q + 1] = g(ag * (2.6 * dif * 0.97 + amb) + fg * fk * (spec + env) + fg * rim * 0.95);
    D[q + 2] = g(ab * (2.6 * dif * 0.9 + amb * 1.1) + fb * fk * (spec + env) + fb * rim * 0.85 + 0.004 * env);
    D[q + 3] = 255;
  }
  C.canvas.getContext('2d').putImageData(img, 0, 0);
}

/** Draw the statue. (ox, oy): screen position of the plinth centre at the plinth TOP; K: px per metre. */
export function drawBull(ctx, { ox, oy, K, S, cot, YAW, ELEV }) {
  const C = get(YAW, ELEV);
  relight(C, S, cot);
  const s = K / KC;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(C.canvas, ox - C.ax * s, oy - C.ay * s, C.W * s, C.H * s);
  ctx.restore();
}
/** Fill the statue's cast shadow into `g`: every interior point projected along the sun through `shadowOf(x, y, z)`
 *  (bull-local x relative to the plinth centre, y, height above the plinth top) -> screen. */
export function drawBullShadow(g, shadowOf, K, YAW, ELEV) {
  const C = get(YAW, ELEV), P = C.pts, r = Math.max(1.2, 0.06 * K);
  for (let i = 0; i < P.length; i += 3) {
    const [x, y] = shadowOf(P[i] - 2.4, P[i + 1], P[i + 2]);
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
}
/** a point on the statue (bull-local) -> screen, for overlays (the spine glint) */
export const SPINE = [[0.6, 2.5], [1.6, 2.44], [2.4, 2.62], [3.0, 2.95]];
