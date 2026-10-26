// Beat 12 — "Including the atoms that make up you."
// The stadium folds back into the atom, and the camera pulls all the way out: past the DNA, the virus, the
// bacterium, the blood cells and the hair, to a 1.75 m person whose crown sits at the origin. The atom stays a
// bright point the whole way (it ends up on the crown of the head: that's where we started). The person is a
// dark silhouette with a cool rim light, faintly textured with a fine lattice of "atoms". Then the closing
// number lands: ≈ 7 × 10^27 atoms in one human body.
import * as L from '../../../../engine/runtime/lib.js';
import { P, at as camAt } from '../camera.js';
import { drawBackground } from '../env.js';

const { ease, clamp, prog, lerp, rgba } = L;
const HEIGHT = 1.75;
/** The person stands with the crown 12 mm below the origin: the hair we started on grows out of the crown and
 *  arcs up through the origin (where the zoom began), horizontal there exactly like the 70 µm hair of beat 1. */
const OFF = 0.012;
const HAIR_W = 70e-6;
// the anchor hair: root in the scalp → up and over → through the origin heading +x → falls away to the right
const STRAND = [
  [[-0.017, OFF + 0.004], [-0.019, -0.007], [-0.011, 0], [0, 0]],
  [[0, 0], [0.014, 0], [0.036, 0.001], [0.062, 0.021]],
];
const bez = (q, t) => {
  const u = 1 - t;
  return [0, 1].map((i) => u * u * u * q[0][i] + 3 * u * u * t * q[1][i] + 3 * u * t * t * q[2][i] + t * t * t * q[3][i]);
};
const STRAND_PTS = (() => {
  const out = [];
  STRAND.forEach((q, si) => { for (let j = si ? 1 : 0; j <= 600; j++) out.push(bez(q, j / 600)); });
  return out;
})();
// ------------------------------------------------------------------ the figure
// A standing adult (1.75 m), front view, drawn as a dark silhouette with a cool rim light and a shimmering lattice
// of "atoms" inside. Figure coordinates: metres, x right, y DOWN from the crown (world y = y + OFF).
// Built from parts (torso with neck + trapezius, two legs, feet, two arms, hands with thumbs, ears, head, hair) so the
// anatomy reads: a neck that flares into a sloping trapezius, rounded deltoids, arms hanging free of the waist,
// defined hands and feet. Relaxed contrapposto: the weight is on his right leg (viewer's left), so that hip rides
// higher and that shoulder drops a touch; the free knee eases in and the free foot turns out.

/** limb tube along joints J (y down) with radii R[i] = [left, right] (left = −x side when the limb points down) */
function tube(J, R) {
  const A = [], B = [];
  for (let i = 0; i < J.length; i++) {
    const a = J[Math.max(0, i - 1)], b = J[Math.min(J.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const nx = -dy, ny = dx;
    const [r1, r2] = R[i];
    A.push([J[i][0] + nx * r1, J[i][1] + ny * r1]);
    B.push([J[i][0] - nx * r2, J[i][1] - ny * r2]);
  }
  return A.concat(B.reverse());
}
/** consistent winding for every part, so the union clip (nonzero) never cancels where parts overlap */
function wind(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; }
  return s < 0 ? pts.slice().reverse() : pts;
}
const mirror = (pts) => pts.map(([x, y]) => [-x, y]);
const shift = (pts, dx, dy = 0) => pts.map(([x, y]) => [x + dx, y + dy]);

const TORSO = [
  // free side (x > 0): shoulder a touch higher, hip a touch lower, flank long
  [0.045, 0.2], [0.047, 0.238], [0.055, 0.262], [0.086, 0.277], [0.13, 0.289], [0.17, 0.298], [0.19, 0.314],
  [0.18, 0.362], [0.16, 0.405], [0.153, 0.462], [0.144, 0.53], [0.13, 0.6], [0.133, 0.656], [0.149, 0.72],
  [0.158, 0.79], [0.156, 0.866], [0.12, 0.93], [0.04, 0.958], [0.0, 0.962],
  // weight side (x < 0): hip higher and out, flank compressed, shoulder lower
  [-0.04, 0.955], [-0.125, 0.918], [-0.17, 0.842], [-0.171, 0.776], [-0.153, 0.704], [-0.124, 0.622],
  [-0.13, 0.566], [-0.144, 0.53], [-0.153, 0.466], [-0.16, 0.416], [-0.18, 0.374], [-0.19, 0.326],
  [-0.17, 0.311], [-0.13, 0.3], [-0.086, 0.285], [-0.055, 0.266], [-0.047, 0.24], [-0.045, 0.2],
];
// legs: [outer/inner] radii; the weight leg runs straight under the body, the free knee eases in, the foot out
const LEG_L = tube(
  [[-0.085, 0.86], [-0.083, 1.06], [-0.075, 1.215], [-0.072, 1.27], [-0.07, 1.39], [-0.066, 1.52], [-0.062, 1.66]],
  [[0.09, 0.076], [0.077, 0.066], [0.055, 0.049], [0.05, 0.046], [0.058, 0.049], [0.04, 0.034], [0.031, 0.027]]);
const LEG_R = tube(
  [[0.085, 0.875], [0.078, 1.07], [0.064, 1.232], [0.062, 1.285], [0.07, 1.4], [0.083, 1.53], [0.098, 1.662]],
  [[0.075, 0.088], [0.066, 0.076], [0.048, 0.054], [0.045, 0.05], [0.048, 0.057], [0.034, 0.04], [0.027, 0.031]]);
// a foot seen from the front (left foot; big toe on the inner, +x side), ankle at (0, 1.66), sole on the floor
const FOOT = [
  [-0.03, 1.64], [-0.038, 1.668], [-0.037, 1.692], [-0.046, 1.722], [-0.052, 1.742], [-0.036, 1.75], [-0.004, 1.751],
  [0.026, 1.75], [0.046, 1.744], [0.046, 1.724], [0.036, 1.698], [0.034, 1.67], [0.028, 1.645],
];
const FOOT_L = shift(FOOT, -0.062);
const FOOT_R = shift(mirror(FOOT), 0.098).map(([x, y]) => [x + Math.max(0, y - 1.69) * 0.35, y]);   // turned out a little
// arms: radii [left, right]; the weight-side arm hangs straight, the free one with a soft elbow
const ARM_L = tube(
  [[-0.16, 0.302], [-0.19, 0.338], [-0.203, 0.43], [-0.214, 0.53], [-0.221, 0.6], [-0.225, 0.665], [-0.228, 0.76], [-0.23, 0.842]],
  [[0.018, 0.018], [0.045, 0.036], [0.042, 0.036], [0.036, 0.031], [0.032, 0.029], [0.039, 0.032], [0.03, 0.026], [0.023, 0.021]]);
const ARM_R = tube(
  [[0.16, 0.298], [0.19, 0.332], [0.203, 0.426], [0.214, 0.522], [0.22, 0.59], [0.218, 0.656], [0.21, 0.756], [0.202, 0.838]],
  [[0.018, 0.018], [0.036, 0.045], [0.036, 0.042], [0.031, 0.036], [0.029, 0.032], [0.032, 0.039], [0.026, 0.03], [0.021, 0.023]]);
// a relaxed hand, palm toward the thigh (left hand; the thumb lies along the front, +x side); wrist at (0, 0.842)
const HAND = [
  [-0.021, 0.838], [-0.025, 0.872], [-0.028, 0.91], [-0.027, 0.95], [-0.022, 0.988], [-0.014, 1.016], [-0.005, 1.028],
  [0.004, 1.024], [0.01, 1.004], [0.013, 0.975], [0.014, 0.945], [0.016, 0.905], [0.019, 0.87], [0.019, 0.838],
];
const THUMB = [[0.01, 0.868], [0.026, 0.888], [0.033, 0.918], [0.031, 0.948], [0.023, 0.955], [0.016, 0.932], [0.01, 0.905]];
const HAND_L = shift(HAND, -0.23), THUMB_L = shift(THUMB, -0.23);
const HAND_R = shift(mirror(HAND), 0.202), THUMB_R = shift(mirror(THUMB), 0.202);
// head (front): cranium, temples, cheekbones, jaw, chin; ears behind it
const HEAD = [
  [0, 0], [0.04, 0.006], [0.064, 0.026], [0.076, 0.058], [0.078, 0.095], [0.074, 0.13], [0.07, 0.158], [0.062, 0.182],
  [0.046, 0.206], [0.024, 0.226], [0, 0.231], [-0.024, 0.226], [-0.046, 0.206], [-0.062, 0.182], [-0.07, 0.158],
  [-0.074, 0.13], [-0.078, 0.095], [-0.076, 0.058], [-0.064, 0.026], [-0.04, 0.006],
];
const EAR = [[0.068, 0.108], [0.08, 0.104], [0.088, 0.118], [0.087, 0.142], [0.081, 0.162], [0.07, 0.168]];
// short hair, parted on his right (viewer's left) and combed across; tapered at the temples above the ears
const HAIR = [
  [-0.078, 0.106], [-0.082, 0.072], [-0.077, 0.036], [-0.058, 0.009], [-0.03, -0.006], [0.006, -0.011], [0.042, -0.005],
  [0.068, 0.014], [0.082, 0.046], [0.083, 0.08], [0.079, 0.108], [0.073, 0.106], [0.07, 0.08], [0.064, 0.06],
  [0.044, 0.05], [0.016, 0.047], [-0.012, 0.05], [-0.036, 0.056], [-0.058, 0.064], [-0.07, 0.08], [-0.073, 0.106],
];
const SILH = [LEG_L, LEG_R, FOOT_L, FOOT_R, TORSO, ARM_L, ARM_R, HAND_L, HAND_R, THUMB_L, THUMB_R, EAR, mirror(EAR), HEAD, HAIR].map(wind);
const HAIR_I = SILH.length - 1;

// fine strands combed from the parting across the crown (deterministic), and a few broad sheen bands
const LOCKS = (() => {
  const r = L.rng(1207), out = [];
  for (let i = 0; i < 120; i++) {
    const right = r() < 0.7, a = r();
    const x0 = -0.034 + (r() - 0.5) * 0.008, y0 = lerp(-0.004, 0.05, r());
    const x1 = right ? lerp(0.03, 0.085, a) : lerp(-0.06, -0.085, a);
    const y1 = right ? lerp(0.0, 0.1, a * 0.7 + 0.3 * r()) : lerp(0.03, 0.1, r());
    const cx = (x0 + x1) / 2 + (right ? 0.01 : -0.004), cy = Math.min(y0, y1) - 0.012 * r();
    out.push({ x0, y0, cx, cy, x1, y1, c: r() });
  }
  return out;
})();

/** Screen path of a figure part (smooth closed curve through the midpoints). */
function partPath(p, v, pts) {
  const n = pts.length;
  const X = (i) => v.wx(pts[(i + n) % n][0]), Y = (i) => v.wy(pts[(i + n) % n][1] + OFF);
  p.moveTo((X(0) + X(1)) / 2, (Y(0) + Y(1)) / 2);
  for (let i = 1; i <= n; i++) p.quadraticCurveTo(X(i), Y(i), (X(i) + X(i + 1)) / 2, (Y(i) + Y(i + 1)) / 2);
  p.closePath();
}
function silhouette(v, from = 0, to = SILH.length) {
  const p = new Path2D();
  for (let i = from; i < to; i++) partPath(p, v, SILH[i]);
  return p;
}
/** open polyline (quadratic through midpoints) in figure metres → screen, for the inner anatomy lines */
function strokeLine(ctx, v, pts) {
  const X = (i) => v.wx(pts[i][0]), Y = (i) => v.wy(pts[i][1] + OFF);
  ctx.beginPath();
  ctx.moveTo(X(0), Y(0));
  for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(X(i), Y(i), (X(i) + X(i + 1)) / 2, (Y(i) + Y(i + 1)) / 2);
  ctx.lineTo(X(pts.length - 1), Y(pts.length - 1));
  ctx.stroke();
}
// inner anatomy: soft form lines (shadow side) and highlight lines (key light from the upper right)
const SHADOW_LINES = [
  [[-0.012, 0.284], [-0.07, 0.298], [-0.15, 0.306]], [[0.012, 0.282], [0.07, 0.292], [0.148, 0.298]],        // clavicles
  [[-0.046, 0.19], [-0.03, 0.24], [-0.012, 0.282]], [[0.046, 0.19], [0.03, 0.238], [0.012, 0.28]],          // neck strap muscles
  [[-0.026, 0.438], [-0.09, 0.44], [-0.152, 0.408]], [[0.026, 0.432], [0.09, 0.434], [0.15, 0.4]],         // chest
  [[-0.126, 0.75], [-0.08, 0.83], [-0.024, 0.9]], [[0.13, 0.765], [0.08, 0.845], [0.024, 0.912]],          // groin lines
  [[-0.166, 0.34], [-0.162, 0.385], [-0.162, 0.418]], [[0.166, 0.336], [0.162, 0.38], [0.162, 0.408]],       // arm against chest
  [[-0.006, 0.93], [-0.01, 0.98], [-0.004, 1.02]], [[0.008, 0.94], [0.012, 0.985], [0.01, 1.03]],          // inner thighs
  [[-0.095, 1.25], [-0.072, 1.296], [-0.05, 1.255]], [[0.042, 1.265], [0.064, 1.31], [0.086, 1.27]],       // knees
  [[-0.246, 0.585], [-0.221, 0.612], [-0.198, 0.592]], [[0.196, 0.578], [0.22, 0.604], [0.244, 0.58]],     // elbows
  [[-0.22, 0.884], [-0.215, 0.92], [-0.217, 0.952]], [[0.192, 0.88], [0.187, 0.916], [0.189, 0.948]],      // thumbs against the hand
  [[-0.244, 0.966], [-0.24, 1.004]], [[-0.234, 0.97], [-0.23, 1.012]],                                     // finger splits
  [[0.216, 0.966], [0.212, 1.004]], [[0.206, 0.97], [0.202, 1.012]],
  [[-0.066, 1.716], [-0.064, 1.746]], [[-0.048, 1.722], [-0.047, 1.749]],                                  // toes
  [[0.114, 1.718], [0.118, 1.747]], [[0.13, 1.722], [0.135, 1.749]],
  [[-0.04, 0.214], [0, 0.236], [0.04, 0.214]],                                                             // under the jaw
];
const HIGHLIGHT_LINES = [
  [[0.058, 0.04], [0.072, 0.09], [0.068, 0.15], [0.05, 0.196]],                                             // cheek / temple plane
  [[0.1, 0.31], [0.165, 0.33], [0.2, 0.37]],                                                                // deltoid cap
  [[0.07, 0.31], [0.12, 0.36], [0.14, 0.42]],                                                               // chest plane
  [[0.105, 1.0], [0.11, 1.12], [0.098, 1.22]], [[0.098, 1.33], [0.11, 1.42], [0.112, 1.52]],               // free leg
  [[-0.04, 1.0], [-0.04, 1.14], [-0.04, 1.22]],                                                             // weight thigh front
];

/** Visibility of the person by camera scale: appears as the pull-out nears human scale. */
const personK = (v) => clamp(L.invLerp(Math.log(2.5e-5), Math.log(6e-4), Math.log(v.cam.mpp)));

function drawPerson(ctx, v, k, calm = 1) {
  const hpx = v.ws(HEIGHT);
  if (hpx < 2 || hpx > 3e5 || k <= 0.003) return;
  ctx.save();
  ctx.globalAlpha *= k;
  // halo behind the figure + floor shadow
  const cx = v.wx(0.015), my = v.wy(0.85 + OFF), fy = v.wy(HEIGHT + OFF);
  L.lightBlob(ctx, cx, my, hpx * 0.75, [60, 120, 130], 0.18);
  ctx.save();
  ctx.translate(cx, fy);
  ctx.scale(1, 0.16);
  const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, v.ws(0.42)));
  sg.addColorStop(0, 'rgba(0,0,0,0.6)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.arc(0, 0, Math.max(0, v.ws(0.42)), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // floor line glint
  const fl = ctx.createLinearGradient(cx - v.ws(0.9), 0, cx + v.ws(0.9), 0);
  fl.addColorStop(0, 'rgba(110,240,200,0)');
  fl.addColorStop(0.5, 'rgba(110,240,200,0.22)');
  fl.addColorStop(1, 'rgba(110,240,200,0)');
  ctx.fillStyle = fl;
  ctx.fillRect(cx - v.ws(0.9), fy - 0.5, v.ws(1.8), 1.5);

  const all = silhouette(v), body = silhouette(v, 0, HAIR_I);
  const px = clamp(hpx / 600, 0.6, 1.6);                  // line weight follows the figure's size (≈ 1 at 600 px)
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // rim: the whole outline stroked first and then covered by the fills, so only its OUTER half shows (one clean
  // contour round the union: no seams where the parts overlap), plus a key-light crescent from the upper right
  L.glow(ctx, [110, 240, 200], 12, () => {
    ctx.strokeStyle = `rgba(170,245,225,${(0.5 * calm).toFixed(3)})`;
    ctx.lineWidth = 3.2 * px;
    ctx.stroke(all);
  }, 0.85);
  ctx.save();
  ctx.translate(1.6 * px, -1.1 * px);
  ctx.fillStyle = `rgba(150,240,215,${(0.55 * (0.35 + 0.65 * calm)).toFixed(3)})`;
  ctx.fill(all);
  ctx.restore();
  // body: dark, with a soft top light
  const bg = ctx.createLinearGradient(0, v.wy(OFF), 0, fy);
  bg.addColorStop(0, 'rgb(38,60,64)');
  bg.addColorStop(0.45, 'rgb(23,37,41)');
  bg.addColorStop(1, 'rgb(12,18,21)');
  ctx.fillStyle = bg;
  ctx.fill(all);
  ctx.save();
  ctx.clip(body);
  // form: light from the upper right, the shadow side falls off to the left
  const sx = ctx.createLinearGradient(v.wx(-0.24), 0, v.wx(0.24), 0);
  sx.addColorStop(0, 'rgba(0,0,0,0.38)');
  sx.addColorStop(0.5, 'rgba(0,0,0,0)');
  sx.addColorStop(1, 'rgba(120,200,200,0.1)');
  ctx.fillStyle = sx;
  ctx.fillRect(v.wx(-0.3), v.wy(OFF - 0.02), v.ws(0.6), v.ws(HEIGHT + 0.04));
  // fine lattice of atoms inside the silhouette (screen-scaled dot grid, shimmering)
  const step = 9;
  const x0 = Math.max(0, v.wx(-0.3)), x1 = Math.min(L.W, v.wx(0.3)), y0 = Math.max(0, v.wy(OFF)), y1 = Math.min(L.H, fy);
  if (calm > 0.02 && (x1 - x0) * (y1 - y0) / (step * step) < 9000) {
    ctx.save();
    ctx.globalAlpha *= calm;
    for (let y = y0 - (y0 % step); y < y1; y += step) {
      for (let x = x0 - (x0 % step); x < x1; x += step) {
        const n = L.noise1(x * 0.05 + y * 0.031 + v.gt * 0.9, 5);
        const a = 0.07 + 0.24 * Math.max(0, n);
        ctx.fillStyle = `rgba(150,230,215,${a.toFixed(3)})`;
        ctx.fillRect(x, y, 1.6, 1.6);
      }
    }
    ctx.restore();
  }
  // inner anatomy, faint: it gives the planes of the body without drawing a cartoon
  const dk = (0.35 + 0.65 * calm);
  ctx.lineWidth = Math.max(0.8, 1.3 * px);
  ctx.strokeStyle = `rgba(2,6,8,${(0.5 * dk).toFixed(3)})`;
  for (const ln of SHADOW_LINES) strokeLine(ctx, v, ln);
  ctx.lineWidth = Math.max(0.8, 1.1 * px);
  ctx.strokeStyle = `rgba(170,240,225,${(0.13 * dk).toFixed(3)})`;
  for (const ln of HIGHLIGHT_LINES) strokeLine(ctx, v, ln);
  ctx.restore();
  drawHair(ctx, v, calm);
  ctx.restore();
}

/** Hair: brown like the strand we started on, darker at the roots, a sheen where the key light catches the crown,
 *  combed strands from the parting when close, and a few broad sheen bands at any size. */
function drawHair(ctx, v, calm = 1) {
  const hp = v.ws(0.2);                       // head-ish size in px
  if (hp < 3) return;
  const hair = new Path2D();
  partPath(hair, v, SILH[HAIR_I]);
  ctx.save();
  const g = ctx.createLinearGradient(v.wx(0.07), v.wy(OFF - 0.01), v.wx(-0.07), v.wy(OFF + 0.1));
  g.addColorStop(0, 'rgb(70,50,38)');
  g.addColorStop(0.5, 'rgb(38,27,21)');
  g.addColorStop(1, 'rgb(18,13,11)');
  ctx.fillStyle = g;
  ctx.fill(hair);
  ctx.clip(hair);
  const sh = ctx.createRadialGradient(v.wx(0.03), v.wy(OFF + 0.012), 0, v.wx(0.03), v.wy(OFF + 0.012), Math.max(1, v.ws(0.05)));
  sh.addColorStop(0, 'rgba(176,126,92,0.24)');
  sh.addColorStop(1, 'rgba(176,126,92,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(v.wx(-0.09), v.wy(OFF - 0.02), v.ws(0.18), v.ws(0.14));
  ctx.lineCap = 'round';
  // broad combed sheen bands (read at any size: the hair has a direction, not a helmet)
  // (only while the head is small: up close the real strands take over and broad bands would read as stripes)
  ctx.lineWidth = Math.max(0.8, v.ws(0.005));
  ctx.strokeStyle = `rgba(150,104,74,${(0.32 * clamp(1 - (hp - 70) / 120)).toFixed(3)})`;
  for (const [a, b, c] of [[[-0.03, 0.0], [0.02, -0.01], [0.07, 0.03]], [[-0.03, 0.02], [0.03, 0.012], [0.076, 0.06]], [[-0.034, 0.038], [0.02, 0.03], [0.066, 0.054]], [[-0.04, 0.01], [-0.066, 0.03], [-0.074, 0.07]]]) {
    ctx.beginPath(); ctx.moveTo(v.wx(a[0]), v.wy(a[1] + OFF)); ctx.quadraticCurveTo(v.wx(b[0]), v.wy(b[1] + OFF), v.wx(c[0]), v.wy(c[1] + OFF)); ctx.stroke();
  }
  // the parting
  ctx.strokeStyle = 'rgba(10,7,5,0.55)';
  ctx.lineWidth = Math.max(0.7, v.ws(0.003));
  ctx.beginPath(); ctx.moveTo(v.wx(-0.036), v.wy(OFF + 0.054)); ctx.quadraticCurveTo(v.wx(-0.035), v.wy(OFF + 0.02), v.wx(-0.03), v.wy(OFF - 0.004)); ctx.stroke();
  // strands, once a strand is a few pixels long
  const lk = clamp((hp - 120) / 200) * calm;
  if (lk > 0) {
    ctx.lineWidth = Math.max(0.8, Math.min(3, v.ws(HAIR_W)));
    for (const s of LOCKS) {
      ctx.strokeStyle = s.c < 0.5 ? `rgba(128,88,62,${0.5 * lk})` : `rgba(14,9,7,${0.55 * lk})`;
      ctx.beginPath();
      ctx.moveTo(v.wx(s.x0), v.wy(s.y0 + OFF));
      ctx.quadraticCurveTo(v.wx(s.cx), v.wy(s.cy + OFF), v.wx(s.x1), v.wy(s.y1 + OFF));
      ctx.stroke();
    }
  }
  // the hairline softens into the forehead
  ctx.restore();
}

/** Camera zoom speed: |Δ ln(mpp)| per frame, measured from the camera itself (pure function of time). */
function zoomSpeed(v) {
  const a = camAt(v.gt - 1 / 60, v.tl), b = camAt(v.gt + 1 / 60, v.tl);
  return Math.abs(Math.log(b.mpp / a.mpp));
}

/** The anchor hair, drawn at every scale through the pull-out so it never leaves us: a 70 µm strand that is
 *  straight and horizontal through the origin (as in beat 1) and, further out, grows from the crown. */
function drawStrand(ctx, v, veil) {
  const mpp = v.cam.mpp;
  const vis = clamp(L.invLerp(Math.log(6e-10), Math.log(4e-9), Math.log(mpp)));
  if (vis <= 0) return;
  const w = HAIR_W / mpp;
  if (w > 4000) return;
  // wide (close-up) hair is veiled with everything else while we fly; once it is a thin line it stays crisp
  const a = vis * lerp(1, 1 - 0.55 * veil, clamp((w - 4) / 40));
  if (a <= 0.003) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const path = () => {
    ctx.beginPath();
    let first = true;
    for (const [x, y] of STRAND_PTS) {
      const sx = v.wx(x), sy = v.wy(y);
      if (first) { ctx.moveTo(sx, sy); first = false; } else ctx.lineTo(sx, sy);
    }
  };
  const lw = Math.max(1.4, w);
  // soft body (no hard outline, so motion-blur sub-frames blend instead of stacking rings)
  if (lw > 6) {
    ctx.strokeStyle = 'rgba(70,44,30,0.55)';
    ctx.lineWidth = lw * 1.06;
    path(); ctx.stroke();
  }
  ctx.strokeStyle = 'rgb(122,80,54)';
  ctx.lineWidth = lw * (lw > 6 ? 0.9 : 1);
  path(); ctx.stroke();
  ctx.strokeStyle = 'rgba(230,180,140,0.45)';
  ctx.lineWidth = Math.max(0.6, lw * 0.28);
  ctx.save();
  ctx.translate(0, -lw * 0.18);
  path(); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/** Radial speed streaks while the levels rush past (screen space, deterministic). */
function drawStreaks(ctx, v, k) {
  if (k <= 0.01) return;
  const r = L.rng(4401);
  const cx = v.wx(P.atom.x), cy = v.wy(P.atom.y);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const ang = r() * Math.PI * 2, sp = 0.6 + r() * 0.8, ph = r();
    const q = ((v.gt * sp * 0.9 + ph) % 1);
    const d0 = 60 + q * q * 1100, len = 30 + q * 160;
    const a = k * 0.22 * Math.sin(Math.PI * q);
    ctx.strokeStyle = `rgba(170,240,220,${a.toFixed(3)})`;
    ctx.lineWidth = 1 + q * 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * d0, cy + Math.sin(ang) * d0);
    ctx.lineTo(cx + Math.cos(ang) * (d0 + len), cy + Math.sin(ang) * (d0 + len));
    ctx.stroke();
  }
  ctx.restore();
}

/** The atom we zoomed out of: a fixed-size bright point that rides out to the crown of the head. */
function drawAtomPoint(ctx, v, t) {
  const a = ease.outCubic(prog(t, 0.2, 0.4));
  if (a <= 0) return;
  const x = v.wx(P.atom.x), y = v.wy(P.atom.y);
  const settle = ease.inOutCubic(prog(t, 3.0, 0.8));
  ctx.save();
  L.lightBlob(ctx, x, y, lerp(46, 26, settle), [190, 255, 235], 0.55 * a);
  ctx.fillStyle = `rgba(255,255,255,${0.95 * a})`;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, lerp(3.2, 2.6, settle)), 0, Math.PI * 2); ctx.fill();
  // once we are out: a slow "you are here" ring around the crown
  const rk = prog(t, 3.4, 1.4);
  if (rk > 0 && rk < 1) {
    ctx.strokeStyle = rgba(v.accent, 0.6 * (1 - rk));
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, 6 + 40 * ease.outCubic(rk)), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

/** House big label with a hand-set superscript: "≈ 7 × 10^27". */
function powerLabel(ctx, { x, y, k, accent, small, out = 1 }) {
  if (k <= 0 || out <= 0) return;
  const e = ease.outCubic(clamp(k)), size = 120;
  ctx.save();
  ctx.globalAlpha *= clamp(k * 1.4) * out;   // out: a proper fade that ends at the beat change (no 1-frame cut)
  ctx.fillStyle = rgba(accent, 0.9);
  ctx.fillRect(x, y - size * 0.92 - 26, 90 * e, 4);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = rgba(accent);
  ctx.font = L.font(size, 800, L.FONT.display);
  const yy = y + (1 - e) * 30;
  const w = L.trackedText(ctx, '≈ 7 × 10', x, yy, -1, 'left');
  ctx.font = L.font(size * 0.5, 800, L.FONT.display);
  L.trackedText(ctx, '27', x + w + 6, yy - size * 0.5, 0, 'left');
  ctx.shadowBlur = 8;
  ctx.font = L.font(30, 600, L.FONT.body);
  ctx.fillStyle = rgba([205, 215, 230], 0.95);
  L.trackedText(ctx, small.toUpperCase(), x, y + 52 + (1 - e) * 18, 3, 'left');
  ctx.restore();
}

const T = { settle: 3.15, label: 2.9 };
/** Beat-13 framing (screen px): the whole figure stands above the question card, feet at y = feet, h px tall. */
export const FRAME13 = { feet: 704, h: 372 };

export default {
  beat: 12,
  chapter: { num: '12', title: 'You', sub: 'Built from the same empty atoms' },
  captions: true,
  layer: 5,
  cues(d) {
    return [
      { t: 0.05, name: 'whoosh', gain: 0.35, pitch: 0.6 },    // the stadium folds back into the atom
      { t: 0.35, name: 'riser', gain: 0.3, pitch: 0.8 },      // pulling out through every level
      { t: T.settle, name: 'impact', gain: 0.5, pitch: 0.7 }, // human scale: you
      { t: T.settle + 0.02, name: 'bloom', gain: 0.4, pitch: 0.85 },
      { t: T.label, name: 'blip', gain: 0.25, pitch: 1.0 },
    ].filter((c) => c.t < d);
  },
  drawWorld(ctx, v) {
    if (v.t < -0.1) return;
    // the pull-out covers ~23 e-folds of scale in ~3 s: anything changing size by more than ~10% a frame is
    // veiled behind the background (it would only smear into stacked rings) and only the anchors stay crisp:
    // the atom point, the hair strand and then the person.
    const spd = v.t > 0 ? zoomSpeed(v) : 0;
    const veil = 0.9 * L.smoothstep(clamp((spd - 0.05) / 0.09));
    const calm = 1 - L.smoothstep(clamp((spd - 0.015) / 0.05));   // thin outlines wait until the camera settles
    if (veil > 0.003) {
      ctx.save();
      ctx.globalAlpha = veil;
      drawBackground(ctx, v);
      ctx.restore();
      drawStreaks(ctx, v, veil);
    }
    // beat 13: the figure steps up and shrinks into a deliberate full-length frame above the question card
    // (a no-op if the camera already frames it that small)
    ctx.save();
    const s13 = v.tl.scenes[13];
    const q = s13 ? ease.inOutCubic(prog(v.gt, s13.start + 0.05, 0.6)) : 0;   // settles as the card lands (0.3–0.7 s)
    if (q > 0) {
      const top = v.wy(OFF - 0.012), bot = v.wy(HEIGHT + OFF), cx = v.wx(0.015);
      const S = lerp(1, Math.min(1, FRAME13.h / Math.max(1, bot - top)), q);
      ctx.translate(lerp(cx, L.W / 2, q), lerp(bot, FRAME13.feet, q));
      ctx.scale(S, S);
      ctx.translate(-cx, -bot);
    }
    drawPerson(ctx, v, personK(v), calm);
    drawStrand(ctx, v, veil);
    drawAtomPoint(ctx, v, v.t);
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    // (the "1.75 m" height bracket was dropped: one number, one line, beside the caption)
    powerLabel(ctx, { x: 100, y: 470, k: Math.min(v.k, prog(v.t, T.label, 0.55)), out: 1 - ease.inOutCubic(prog(v.t, v.d - 0.32, 0.32)), accent: v.accent, small: 'atoms in one human body' });
  },
};
