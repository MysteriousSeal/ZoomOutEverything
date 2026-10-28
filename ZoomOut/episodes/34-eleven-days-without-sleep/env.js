// Environment for "11 Days Without Sleep" (Zoom Out 34, Inside You). Owned by the orchestrator.
//
// LOOK: an EXPERIMENT LOG. A 1960s science-fair notebook (cream paper cards, typewriter ink, a red margin rule, punched
//   holes) laid over deep night-blue graph paper, with a modern data HUD: a split-flap DAY counter and a 7-segment
//   HOURS AWAKE clock in one strip under the top bar (y 252–420). Violet [170,120,255] is the only accent; a rubber-stamp
//   red appears once (the Guinness stamp) and in the ISO prohibition rings of the hook.
//
// THE FIGURE: Randy is never drawn as a person — only as the series' refined ISO / safety-card pictogram (ep 27–29
//   system, copied below: solid, no face, merged silhouette with knock-out edges). He stands on the stage's ground rule
//   (FIG, facing right) and his posture degrades with every day the counter lands on: stand → tired → weary → slumped;
//   at the pinball machine his arms go forward to the cabinet; on "sleeps" he is in bed under a blanket.
//
// LAYERS: drawBackground = night graph paper, margin, holes, dust; ground rule. Scenes' drawWorld = stage props in world
//   space (world = screen at rest; camera.js pushes about the stage). drawForeground = the figure (+ bed). Overlays =
//   per-beat tags and cards. drawHud = top bar + the experiment-log strip (crisp; the HOURS clock flies to centre stage
//   for "264 hours" and back — the film's signature move).
//
// TIMING: every time comes from build/timeline.json real word starts (WT / Wd), never hard-coded seconds.
import * as L from '../../../engine/runtime/lib.js';
import { topBar } from '../../../engine/runtime/kit.js';
import { zoomAt, AY, ANCHOR } from './camera.js';

const { W, H } = L;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ palette
export const VIOLET = [170, 120, 255];
export const PAPER = [238, 231, 214];        // notebook card stock
export const PAPER2 = [226, 218, 198];       // its shaded edge
export const INKP = [30, 34, 56];            // typewriter ink on paper
export const RULE = [120, 150, 200];         // notebook ruling (on paper, faint)
export const MARGIN = [214, 96, 104];        // the red margin rule
export const STAMP = [206, 52, 64];          // rubber-stamp red (Guinness stamp only)
export const TEXT = [236, 233, 226];         // HUD text
export const GREYT = [150, 160, 182];
export const BG = [11, 15, 32];              // night blue (the figure's knock-out colour)
export const FIG_INK = [240, 236, 226];
export const CD = { yellow: [255, 204, 0], ink: [10, 10, 12] };
export const TYPE = '"American Typewriter"';
export const tfont = (size, weight = 700) => `${weight} ${size}px ${TYPE}`;

// ------------------------------------------------------------------ timing
export const B = (tl, i, dt = 0) => tl.scenes[i].start + dt;
export const BE = (tl, i, dt = 0) => tl.scenes[i].end + dt;
export function PH(tl, i, j = 0, edge = 'start', dt = 0) {
  const ph = tl.lines[i].phrases ?? [tl.lines[i]];
  return ph[Math.min(j, ph.length - 1)][edge] + dt;
}
/** real start of word wi in phrase pj of line li (voice alignment) */
export const WT = (tl, li, pj, wi, dt = 0) => tl.lines[li].phrases[pj].words[wi][0] + dt;
const WORDS = {
  stayed: [0, 0, 5], eleven0: [0, 0, 8], days0: [0, 0, 9], noCaf: [0, 1, 0], caffeine: [0, 1, 1], noPills: [0, 1, 2], pills: [0, 1, 3],
  randy: [1, 0, 0], highSchool: [1, 0, 4], san: [1, 0, 7], science: [1, 1, 3], project: [1, 1, 4],
  day2: [2, 0, 0], two: [2, 0, 1], eyes: [2, 0, 3], focus: [2, 0, 5], objects: [2, 1, 3], apart: [2, 1, 4], touch: [2, 1, 6],
  day4: [3, 0, 0], four: [3, 0, 1], irritable: [3, 0, 3], forgetful: [3, 0, 5], starts: [3, 1, 2], see: [3, 1, 4], things: [3, 1, 5], arent: [3, 1, 7], there: [3, 1, 8],
  believes: [4, 0, 2], famous: [4, 0, 5], american: [4, 0, 6], football: [4, 0, 7], player: [4, 0, 8],
  day11: [5, 0, 1], eleven: [5, 0, 2], speech: [5, 0, 4], slurs: [5, 0, 5], memory: [5, 1, 2], fails: [5, 1, 3],
  yet: [5, 2, 0], beats: [5, 2, 3], stanford: [5, 2, 5], scientist: [5, 2, 7], pinball: [5, 2, 9],
  after: [6, 0, 0], twoH: [6, 0, 1], sixtyFour: [6, 0, 4], hours: [6, 0, 5], finally: [6, 0, 7], sleeps: [6, 0, 8], about: [6, 1, 0], fourteen: [6, 1, 1],
  today: [7, 0, 0], guinness: [7, 0, 1], accepts: [7, 0, 4], record: [7, 0, 6], its: [7, 1, 0], too: [7, 1, 1], dangerous: [7, 1, 2],
  longest: [8, 0, 2], awake: [8, 0, 6], tell: [8, 1, 0], comments: [8, 1, 4],
};
export const Wd = (tl, name, dt = 0) => { const [i, j, k] = WORDS[name]; return WT(tl, i, j, k, dt); };
/** frame-quantised time (digits never flicker between motion-blur sub-frames) */
export const gq = (gt) => Math.round(gt * 30) / 30;
/** 0→1 in [a, a+din], then 1→0 in [b, b+dout] (eased) */
export function win(gt, a, din, b = Infinity, dout = 0.3) {
  return L.ease.outCubic(L.prog(gt, a, din)) * (1 - L.ease.inCubic(L.prog(gt, b, dout)));
}

/** an exit over [tEnd − dur, tEnd] → { ca, pk }: contents fade over the first 70 %, then the plate collapses (pk 0 → 1:
 *  scale 1 → 0.88 + alpha, ≈ 0.09 s). Never a translucent plate with its contents still on it. */
export function exitK(gt, tEnd, dur = 0.3) {
  const u = L.prog(gt, tEnd - dur, dur);
  return { u, ca: 1 - L.clamp(u / 0.7), pk: L.clamp((u - 0.7) / 0.3) };
}
/** apply a plate collapse (pk 0..1) about (cx, cy): scale 1 → 0.9, alpha 1 → 0 */
export function collapse(c, cx, cy, pk) {
  if (pk <= 0) return;
  const s = 1 - 0.12 * L.ease.outCubic(pk);
  c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy);
  c.globalAlpha *= 1 - pk;
}

// ------------------------------------------------------------------ layout (1080 × 1920)
// vertical budget: top bar 160 · LOG STRIP 252–420 · STAGE 456–1040 (ground rule GROUND) · LOWER ZONE 1088–1370 ·
// captions ≈ 1410–1490 (captionY 1450).
export const STRIP = { x: 64, y: 252, w: 952, h: 168 };
export const GROUND = 1040;
export const FIG = { x: 300, y: GROUND, s: 380 };
export const LOW = { top: 1088, bot: 1370 };
/** world (= screen at rest) → canvas: run fn with the camera transform applied */
export function inWorld(c, v, fn) {
  c.save();
  c.translate(v.wx(0), v.wy(0));
  c.scale(1 / v.cam.mpp, 1 / v.cam.mpp);
  fn(c);
  c.restore();
}

// ------------------------------------------------------------------ background: night graph paper
const DUST = (() => {
  const r = L.rng(3401), out = [];
  for (let i = 0; i < 70; i++) out.push({ x: r() * W, y: 200 + r() * 1500, d: 0.3 + r() * 0.7, s: 0.6 + r() * 1.4, ph: r() * TAU, sp: 0.2 + r() * 0.4 });
  return out;
})();
let bgGrad = null;
/** 0..1 "lights out" (the sleep beat) */
export function nightK(tl, gt) { return win(gt, Wd(tl, 'sleeps', -0.2), 1.2, B(tl, 8, -0.2), 0.8); }
export function drawBackground(c, v) {
  const tl = v.tl, gt = v.gt;
  if (!bgGrad) {
    bgGrad = c.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, 'rgb(9,12,26)');
    bgGrad.addColorStop(0.45, 'rgb(13,18,38)');
    bgGrad.addColorStop(1, 'rgb(7,9,20)');
  }
  c.fillStyle = bgGrad;
  c.fillRect(0, 0, W, H);
  const nk = nightK(tl, gt);
  // a cool violet glow behind the stage (the "lab lamp"); it dims for the night
  L.lightBlob(c, 520, 760, 760, [60, 50, 120], 0.16 * (1 - 0.45 * nk));
  L.lightBlob(c, 880, 1500, 600, [40, 40, 90], 0.08);
  // graph paper in world space (pushes with the camera): minor 27 px, major every 5
  const step = 27;
  const x0 = Math.floor((v.cam.x - W * 0.55 * v.cam.mpp) / step) * step, x1 = v.cam.x + W * 0.55 * v.cam.mpp;
  const y0 = Math.floor((v.cam.y - H * 0.5 * v.cam.mpp) / step) * step, y1 = v.cam.y + H * 0.55 * v.cam.mpp;
  c.lineWidth = 1;
  for (let x = x0; x <= x1; x += step) {
    const major = Math.round(x / step) % 5 === 0;
    c.strokeStyle = `rgba(120,150,210,${major ? 0.085 : 0.035})`;
    const sx = Math.round(v.wx(x)) + 0.5;
    c.beginPath(); c.moveTo(sx, 0); c.lineTo(sx, H); c.stroke();
  }
  for (let y = y0; y <= y1; y += step) {
    const major = Math.round(y / step) % 5 === 0;
    c.strokeStyle = `rgba(120,150,210,${major ? 0.085 : 0.035})`;
    const sy = Math.round(v.wy(y)) + 0.5;
    c.beginPath(); c.moveTo(0, sy); c.lineTo(W, sy); c.stroke();
  }
  // the notebook's red margin rule + punched holes (world space, left edge)
  c.strokeStyle = L.rgba(MARGIN, 0.22); c.lineWidth = 2;
  const mx = v.wx(40);
  c.beginPath(); c.moveTo(mx, 0); c.lineTo(mx, H); c.stroke();
  for (const hy of [560, 960, 1360]) {
    const sx = v.wx(20), sy = v.wy(hy), r = v.ws(11);
    c.fillStyle = 'rgba(2,3,8,0.85)'; c.beginPath(); c.arc(sx, sy, Math.max(0, r), 0, TAU); c.fill();
    c.strokeStyle = 'rgba(150,170,220,0.12)'; c.lineWidth = 1.5; c.beginPath(); c.arc(sx, sy, Math.max(0, r), 0, TAU); c.stroke();
  }
  // night: the room darkens a touch under the sleep beat (a slow ease, no sudden luminance drop)
  if (nk > 0) { c.fillStyle = `rgba(3,4,12,${0.28 * nk})`; c.fillRect(0, 0, W, H); }
  // dust (3 parallax depths, drifting up slowly)
  const z = zoomAt(gt, tl);
  for (const p of DUST) {
    const zz = Math.pow(z, p.d);
    const sx = W / 2 + (p.x + Math.sin(gt * p.sp + p.ph) * 12 - W / 2) * zz;
    const sy = AY + (((p.y - gt * 5 * p.d) % 1700 + 1700) % 1700 + 150 - AY) * zz;
    const a = (0.08 + 0.14 * (0.5 + 0.5 * Math.sin(gt * 1.1 + p.ph))) * (0.5 + 0.5 * p.d);
    c.fillStyle = `rgba(200,205,240,${a})`;
    c.beginPath(); c.arc(sx, sy, Math.max(0, p.s), 0, TAU); c.fill();
  }
  // the stage's ground rule (a ruled notebook line, faded ends)
  inWorld(c, v, (g) => {
    const gk = 1 - L.ease.inCubic(L.prog(gt, B(tl, 7, -0.2), 0.5)) * 0.6;
    const gr = g.createLinearGradient(110, 0, 970, 0);
    gr.addColorStop(0, 'rgba(200,205,235,0)'); gr.addColorStop(0.12, `rgba(200,205,235,${0.34 * gk})`);
    gr.addColorStop(0.88, `rgba(200,205,235,${0.34 * gk})`); gr.addColorStop(1, 'rgba(200,205,235,0)');
    g.fillStyle = gr;
    g.fillRect(110, GROUND, 860, 2.5);
  });
}
// ------------------------------------------------------------------ the safety-card pictogram (series figure: ep 27's system)
// Copied from ep 29 (itself ported from ep 27 (How to Survive #1) drawFigure: ONE merged filled ISO 7010 / airline-safety-card silhouette, side view,
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
const DA = (p, a, l) => ({ x: p.x + Math.cos(a * RAD) * l, y: p.y + Math.sin(a * RAD) * l });
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
  const sh = floorP(DA(hip, q.torso, LEN.torso), FLOOR.sh);
  const head = floorP(DA(sh, q.neck, LEN.neck), FLOOR.head);
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
  nK: P_(0.04, -0.262), nA: P_(0.27, -0.212), fK: P_(0.0, -0.235), fA: P_(0.232, -0.19),   // knees bent open: the shins clear the thighs and the torso
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
/** draw at ground point (x, y), standing height s px. opts: ink, gap (card colour = knock-out), shadow (contact shadow 0..1),
 *  ground (rule 0..1), hi: { nArm, fArm } yellow tint 0..1 on the forearms · afterTorso(c, P, J): drawn over the torso,
 *  under the head and near arm. Everything opaque: fade the whole figure with picLayer, never limb by limb. */
export function drawPicto(c, x, y, s, pose, { ink = FIG_INK, gap = BG, shadow = 1, ground = 1, hi = null, afterTorso = null, armBehindHead = false, farMix = 0.42 } = {}) {
  const J = joints(pose);
  const ox = x + J.ox * s;
  const P = (p) => [ox + p.x * s, y + p.y * s];
  const inkS = L.rgba(ink), farInk = L.mix(ink, gap, farMix), farS = L.rgba(farInk), gapS = L.rgba(gap);
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
    if (J.legKO > 0.5) {   // lying: a short rounded foot (no sharp wedge sliver)
      const a = ang * RAD;
      line([A, { x: A.x + Math.cos(a) * 0.05, y: A.y + Math.sin(a) * 0.05 }], 0.062, col);
      return;
    }
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
  if (Math.hypot(J.fA.x - J.nA.x, J.fA.y - J.nA.y) > 0.012) {   // (a far leg exactly behind the near one is not drawn: no AA seam)
    line([J.hip, J.fK, J.fA], WID.leg, farS);
    foot(J.fA, J.fK, J.fFoot, farS);
  }
  const farArmHidden = Math.hypot(J.fH.x - J.nH.x, J.fH.y - J.nH.y) < 0.03;   // (behind the near arm: not drawn, no grey sliver)
  if (!farOver && !farArmHidden) { line([J.sh, J.fE], WID.arm, farS); line([J.fE, J.fH], WID.arm, fHi); disc(J.fH, WID.fist, fHi); }
  // the body: torso, near leg + foot — one ink, merged (no knock-out seams)
  spine(WID.torso, inkS);
  // (lying on the side, the curl's legs no longer cross the torso: the thigh merges into the hip like a standing leg and
  //  the open knee keeps the shin a separate shape, so no knock-out seam is needed)
  line([J.hip, J.nK, J.nA], WID.leg, inkS);
  foot(J.nA, J.nK, J.nFoot, inkS);
  afterTorso?.(c, (p) => P(p), J);
  // a hand raised clear above the head (armBehindHead): the near arm goes BEHIND the head, so the head disc (with its
  // knock-out ring) stays whole and readable; hands on the head (brace) keep the arm over it
  const nearUnder = armBehindHead && J.nH.y < J.head.y - WID.head;   // (only a hand raised clear above the head)
  const nearArm = () => {
    line([J.sh, J.nE, J.nH], WID.arm + 2 * WID.gap * 0.8, gapS); disc(J.nH, WID.fist + WID.gap * 0.8, gapS);
    disc(J.sh, WID.torso * 0.5, inkS);
    line([J.sh, J.nE], WID.arm, inkS); line([J.nE, J.nH], WID.arm, nHi); disc(J.nH, WID.fist, nHi);
  };
  if (nearUnder) nearArm();
  // head: knock-out ring (a clean neck gap), disc, nose cue toward the face direction
  disc(J.head, WID.head + WID.gap, gapS);
  disc(J.head, WID.head, inkS);
  // (a plain head disc, as ep 28: no nose cue)
  // far arm wrapped over the head (curl): its own knock-out so it reads as a separate capsule
  if (farOver) {
    line([J.fE, J.fH], WID.arm + 2 * WID.gap * 0.8, gapS); disc(J.fH, WID.fist + WID.gap * 0.8, gapS);
    line([J.sh, J.fE], WID.arm, farS); line([J.fE, J.fH], WID.arm, fHi); disc(J.fH, WID.fist, fHi);
  }
  // near arm over everything, with a thin knock-out edge; then re-close the shoulder (the knock-out must not notch the torso)
  if (!nearUnder) nearArm();
  c.restore();
  return J;
}

/** draw fn into a scratch layer at full opacity, then composite it with alpha (clean fades: no limb-overlap seams) */
let SCR = null;
export function picLayer(c, alpha, fn, force = false) {
  if (alpha <= 0) return;
  alpha *= c.globalAlpha;
  if ((alpha >= 0.999 && !force) || typeof document === 'undefined') { c.save(); fn(c); c.restore(); return; }
  if (!SCR) { SCR = document.createElement('canvas'); SCR.width = W; SCR.height = H; }
  const g = SCR.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
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

// ------------------------------------------------------------------ this episode's poses (figure units, facing LEFT;
// drawn mirrored so Randy faces RIGHT, toward the stage's props)
Object.assign(POSE, {
  // day 2: a slight hunch, the head starting to drop forward
  tired: { hx: 0, hy: -0.512, torso: -96, bend: 0.03, neck: -112, face: 168, nAx: -0.04, nAy: -0.042, fAx: 0.032, fAy: -0.042, nFoot: 180, fFoot: 180, nHx: -0.045, nHy: 0.328, fHx: -0.005, fHy: 0.328, over: 0, asg: -1, ksg: 1, legKO: 0, ox: 0 },
  // day 4: shoulders forward, knees soft, the head lower
  weary: { hx: 0.005, hy: -0.5, torso: -103, bend: 0.07, neck: -134, face: 150, nAx: -0.05, nAy: -0.042, fAx: 0.035, fAy: -0.042, nFoot: 180, fFoot: 180, nHx: -0.075, nHy: 0.318, fHx: -0.035, fHy: 0.318, over: 0, asg: -1, ksg: 1, legKO: 0, ox: 0 },
  // day 11: slumped — rounded back, the head hanging forward, arms dangling in front
  slump: { hx: 0.01, hy: -0.486, torso: -111, bend: 0.11, neck: -156, face: 132, nAx: -0.055, nAy: -0.042, fAx: 0.04, fAy: -0.042, nFoot: 180, fFoot: 180, nHx: -0.105, nHy: 0.305, fHx: -0.065, fHy: 0.305, over: 0, asg: -1, ksg: 1, legKO: 0, ox: 0 },
  // at the pinball machine: slumped, both hands forward on the cabinet's front edge (the flipper buttons)
  play: { hx: 0.01, hy: -0.49, torso: -118, bend: 0.08, neck: -146, face: 150, nAx: -0.06, nAy: -0.042, fAx: 0.04, fAy: -0.042, nFoot: 180, fFoot: 180, nHx: -0.15, nHy: 0.25, fHx: -0.175, fHy: 0.225, over: 0, asg: -1, ksg: 1, legKO: 0, ox: 0 },
  // the football player (in the thought bubble): mid-stride, torso leaning ≈ 20° into the run, the near knee driven
  // high (thigh near level), the rear leg extended with its toe pushing off the turf, the ball tucked, far arm driving
  run: { hx: 0, hy: -0.47, torso: -111, bend: 0.03, neck: -104, face: 180, nAx: -0.175, nAy: -0.2, fAx: 0.245, fAy: -0.072, nFoot: 200, fFoot: 62, nHx: -0.09, nHy: 0.11, fHx: -0.17, fHy: 0.07, over: 0, asg: -1, ksg: 1, legKO: 0, ox: 0 },
});

// ------------------------------------------------------------------ the figure's state
/** fatigue 0 (day 1) … 3 (day 11): each step eases in as the DAY counter lands */
export function fatigue(tl, gt) {
  return ['two', 'four', 'eleven'].reduce((a, w) => a + L.ease.inOutCubic(L.prog(gt, Wd(tl, w, -0.2), 1.1)), 0);
}
export const playK = (tl, gt) => win(gt, Wd(tl, 'yet', -0.35), 0.6, BE(tl, 5, -0.45), 0.5);
// on "sleeps": the standing figure dissolves first (lights going down), then the bed and the sleeper fade up
export const awayK = (tl, gt) => L.ease.inCubic(L.prog(gt, Wd(tl, 'sleeps', -0.3), 0.35));
export const sleepK = (tl, gt) => L.ease.inOutCubic(L.prog(gt, Wd(tl, 'sleeps', 0.0), 0.6));
export const bedK = (tl, gt) => L.ease.outCubic(L.prog(gt, Wd(tl, 'sleeps', -0.05), 0.5));
function figPose(tl, gt) {
  const f = fatigue(tl, gt);
  const base = pathPose(['stand', 'tired', 'weary', 'slump'], f / 3);
  return mixPose(base, 'play', playK(tl, gt));
}
/** the standing figure's ink: paper white, a touch greyer each day */
const figInk = (f) => L.mix(FIG_INK, [196, 196, 214], 0.45 * f / 3);
export function figureHead(tl, gt) {
  const J = joints(figPose(tl, gt));
  return { x: FIG.x - J.head.x * FIG.s, y: FIG.y + J.head.y * FIG.s, r: 0.086 * FIG.s };
}
function drawBed(c, k, gt) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= k;
  const g = GROUND, frame = [62, 70, 104], dark = [44, 50, 80];
  // legs + rails
  c.fillStyle = L.rgba(dark);
  c.fillRect(150, 990, 14, g - 990); c.fillRect(588, 990, 14, g - 990);
  // headboard (left) and footboard
  c.fillStyle = L.rgba(frame);
  L.roundRect(c, 138, 858, 26, g - 858, 8); c.fill();
  L.roundRect(c, 588, 930, 22, g - 930, 7); c.fill();
  // mattress
  c.fillStyle = L.rgba([92, 100, 138]);
  L.roundRect(c, 160, 958, 432, 40, 10); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(168, 962, 418, 6);
  // pillow
  c.fillStyle = L.rgba([206, 204, 222]);
  c.beginPath(); c.ellipse(212, 944, 50, 17, -0.05, 0, TAU); c.fill();
  c.restore();
}
/** Randy asleep: head on the pillow, a blanket over the body (shoulder, hip and knee humps) that breathes slowly */
function drawSleeper(c, k, gt) {
  if (k <= 0) return;
  const br = Math.sin(gt * TAU * 0.23) * 2.2;
  picLayer(c, k, (g) => {
    const ink = L.rgba(FIG_INK), far = L.rgba(L.mix(FIG_INK, BG, 0.3));
    // head (knock-out ring keeps it a separate shape from the blanket)
    g.fillStyle = L.rgba([92, 100, 138]);
    g.fillStyle = L.rgba(BG);
    g.beginPath(); g.arc(226, 918, 0.086 * FIG.s + 6, 0, TAU); g.fill();
    g.fillStyle = ink;
    g.beginPath(); g.arc(226, 918, 0.086 * FIG.s, 0, TAU); g.fill();
    // blanket: from the shoulder down to the mattress at the feet
    g.fillStyle = far;
    g.beginPath();
    g.moveTo(258, 962);
    g.bezierCurveTo(250, 920, 272, 902 - br, 312, 902 - br);
    g.bezierCurveTo(360, 902 - br, 382, 918 - br * 0.6, 430, 916 - br * 0.6);
    g.bezierCurveTo(480, 914, 512, 918, 540, 924);
    g.bezierCurveTo(566, 930, 584, 944, 586, 962);
    g.closePath(); g.fill();
    // the blanket's fold-over at the top (paper white band)
    g.fillStyle = ink;
    g.beginPath();
    g.moveTo(262, 950);
    g.bezierCurveTo(258, 925, 276, 908 - br, 312, 908 - br);
    g.lineTo(318, 926 - br); g.bezierCurveTo(296, 926, 282, 934, 280, 955);
    g.closePath(); g.fill();
    // one arm resting on the blanket
    g.strokeStyle = ink; g.lineCap = 'round'; g.lineWidth = 0.052 * FIG.s;
    g.beginPath(); g.moveTo(300, 918 - br); g.quadraticCurveTo(350, 924 - br, 392, 928 - br * 0.6); g.stroke();
  });
}
export function drawForeground(c, v) {
  const tl = v.tl, gt = v.gt;
  const sk = sleepK(tl, gt), bk = bedK(tl, gt);
  inWorld(c, v, (g) => {
    drawBed(g, bk, gt);
    drawSleeper(g, sk, gt);
    const a = 1 - awayK(tl, gt);
    if (a <= 0.001) return;
    const f = fatigue(tl, gt);
    const sway = (0.3 * f + 0.15 * Math.max(0, f - 1.5)) * L.noise1(gt * 0.55, 7) * Math.PI / 180;
    picLayer(g, a, (h) => {
      h.translate(FIG.x, FIG.y);
      h.rotate(sway);
      h.scale(-1, 1);
      drawPicto(h, 0, 0, FIG.s, figPose(tl, gt), { ink: figInk(f), ground: 0, shadow: 1 });
    });
  });
}

// ------------------------------------------------------------------ counters (DAY split-flap, HOURS 7-segment)
/** step schedule over segments [{from, to, t0, tL}] (frames): crisp eased count — quick steps first, then slower */
function makeSched(segs) {
  const steps = [];
  for (const sg of segs) {
    const f0 = Math.round(sg.t0 * 30), fL = Math.round(sg.tL * 30), F = Math.max(1, fL - f0);
    const units = sg.to - sg.from;
    const N = Math.max(1, Math.min(units, Math.round(F / 3.5) + 1));
    const wts = Array.from({ length: N - 1 }, (_, k) => 2 + 3 * (N > 2 ? k / (N - 2) : 0));
    const tot = wts.reduce((a, b) => a + b, 0) || 1;
    let acc = 0, prev = sg.from;
    for (let k = 1; k <= N; k++) {
      const f = N === 1 ? fL : k === 1 ? f0 : f0 + Math.round(F * (acc += wts[k - 2]) / tot);
      const u = k / N;
      let val = units === N ? sg.from + k : sg.from + Math.round(units * (1 - Math.pow(1 - u, 2.2)));
      val = k === N ? sg.to : Math.min(sg.to - (N - k), Math.max(val, prev + 1));
      steps.push({ f, v: val, p: prev });
      prev = val;
    }
  }
  steps.forEach((s, i) => { s.fl = i === 0 || steps[i - 1].f < s.f - 3 ? 2 : Math.max(1, Math.min(2, s.f - steps[i - 1].f - 1)); });
  return steps;
}
let SCH = null, SCH_TL = null;
function scheds(tl) {
  if (SCH_TL === tl) return SCH;
  const S = (w, d) => ({ t0: Wd(tl, w) - d, tL: Wd(tl, w) });
  SCH = {
    day: { init: 1, steps: makeSched([{ from: 1, to: 2, ...S('two', 0.1) }, { from: 2, to: 4, ...S('four', 0.5) }, { from: 4, to: 11, ...S('eleven', 1.0) }]) },
    hrs: { init: 0, steps: makeSched([{ from: 0, to: 24, ...S('two', 0.9) }, { from: 24, to: 72, ...S('four', 0.9) }, { from: 72, to: 240, ...S('eleven', 1.0) }, { from: 240, to: 264, ...S('sixtyFour', 0.9) }]) },
    sleep: { init: 0, steps: makeSched([{ from: 0, to: 14, t0: PH(tl, 6, 1, 'start', -0.04), tL: Wd(tl, 'fourteen') }]) },
  };
  SCH_TL = tl;
  return SCH;
}
/** {cur, prev, ph}: ph (0..1) only while a flip is in progress */
export function counter(tl, id, gt) {
  const { init, steps } = scheds(tl)[id], f = Math.round(gt * 30);
  let cur = init;
  for (const s of steps) {
    if (f >= s.f - s.fl && f < s.f) return { cur: s.v, prev: s.p, ph: (f - (s.f - s.fl) + 1) / (s.fl + 1) };
    if (f >= s.f) cur = s.v;
  }
  return { cur, prev: cur, ph: null };
}
/** first count frame of each run (for the tick cues) */
export function countStarts(tl) {
  const out = [];
  for (const id of ['day', 'hrs', 'sleep']) {
    let last = -99;
    for (const s of scheds(tl)[id].steps) { if (s.f - last > 12) out.push((s.f - s.fl) / 30); last = s.f; }
  }
  return out;
}

// split-flap (copied from ep 31's departures board; two zero-padded cells "01" … "11")
const pad2 = (n) => String(n).padStart(2, '0');
function flapCells(c, n, x0, size) {
  c.font = L.font(size, 800, L.FONT.display);
  const dw = Math.max(...'0123456789'.split('').map((d) => c.measureText(d).width));
  const cw = dw + size * 0.16, gap = size * 0.07;
  return { cells: Array.from({ length: n }, (_, i) => ({ x: x0 + i * (cw + gap), w: cw, r: n - 1 - i })), w: n * cw + (n - 1) * gap };
}
export function flapWidth(c, size) { return flapCells(c, 2, 0, size).w; }
export function drawFlaps(c, x0, y, size, st, { color = PAPER, a = 1 } = {}) {
  if (a <= 0.01) return;
  const { cells } = flapCells(c, 2, x0, size);
  const top = y - size * 0.86, h = size * 0.98, hy = top + h / 2, rad = size * 0.07;
  const dig = (n, r) => pad2(n)[1 - r];
  c.save();
  c.globalAlpha *= a;
  c.font = L.font(size, 800, L.FONT.display);
  c.textBaseline = 'alphabetic';
  c.textAlign = 'center';
  const glyph = (q, chr) => { c.fillStyle = L.rgba(color); c.fillText(chr, q.x + q.w / 2, y); };
  const half = (q, which) => { c.beginPath(); if (which === 'top') c.rect(q.x, top, q.w, h / 2); else c.rect(q.x, hy, q.w, h / 2); c.clip(); };
  for (const q of cells) {
    const dNew = dig(st.cur, q.r), dOld = dig(st.prev, q.r);
    const flipping = st.ph != null && dNew !== dOld;
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 14; c.shadowOffsetY = 4;
    c.fillStyle = 'rgb(26,31,54)';
    L.roundRect(c, q.x, top, q.w, h, rad); c.fill();
    c.restore();
    c.save();
    L.roundRect(c, q.x, top, q.w, h, rad); c.clip();
    c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(q.x, top, q.w, h / 2);
    c.strokeStyle = 'rgba(190,170,255,0.14)'; c.lineWidth = 2; L.roundRect(c, q.x + 1, top + 1, q.w - 2, h - 2, rad); c.stroke();
    if (!flipping) glyph(q, dNew);
    else {
      const cs = Math.cos(st.ph * Math.PI);
      c.save(); half(q, 'top'); glyph(q, dNew); c.restore();
      c.save(); half(q, 'bottom'); glyph(q, dOld);
      if (cs < 0) { c.fillStyle = `rgba(0,0,0,${0.3 * (1 + cs)})`; c.fillRect(q.x, hy, q.w, h / 2); }
      c.restore();
      if (cs >= 0) {
        c.save();
        c.translate(0, hy); c.scale(1, Math.max(0.001, cs)); c.translate(0, -hy);
        half(q, 'top');
        c.fillStyle = 'rgb(30,35,60)'; c.fillRect(q.x, top, q.w, h / 2);
        glyph(q, dOld);
        c.fillStyle = `rgba(0,0,0,${0.55 * (1 - cs)})`; c.fillRect(q.x, top, q.w, h / 2);
        c.restore();
      } else {
        const s2 = -cs;
        c.save();
        c.translate(0, hy); c.scale(1, Math.max(0.001, s2)); c.translate(0, -hy);
        half(q, 'bottom');
        c.fillStyle = 'rgb(26,31,54)'; c.fillRect(q.x, hy, q.w, h / 2);
        glyph(q, dNew);
        c.fillStyle = `rgba(255,255,255,${0.10 * (1 - s2)})`; c.fillRect(q.x, hy, q.w, h / 2);
        c.restore();
      }
    }
    c.fillStyle = 'rgba(0,0,0,0.8)'; c.fillRect(q.x, hy - 1, q.w, 2);
    c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(q.x, hy + 1, q.w, 1);
    c.fillStyle = 'rgba(80,84,110,1)';
    c.fillRect(q.x, hy - 5, 3, 10); c.fillRect(q.x + q.w - 3, hy - 5, 3, 10);
    c.restore();
  }
  c.restore();
}

// 7-segment digits (lit segments glow violet, unlit ones stay as faint ghosts — a real LCD/LED readout)
const SEGS = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg',
  A: 'a', B: 'b', C: 'c', D: 'd', E: 'e', F: 'f', G: 'g' };   // (A–G: one segment alone — the pinball display's attract chase)
function segPath(c, x0, y0, len, t, horiz) {
  const h = t / 2;
  c.beginPath();
  if (horiz) { c.moveTo(x0, y0); c.lineTo(x0 + h, y0 - h); c.lineTo(x0 + len - h, y0 - h); c.lineTo(x0 + len, y0); c.lineTo(x0 + len - h, y0 + h); c.lineTo(x0 + h, y0 + h); }
  else { c.moveTo(x0, y0); c.lineTo(x0 + h, y0 + h); c.lineTo(x0 + h, y0 + len - h); c.lineTo(x0, y0 + len); c.lineTo(x0 - h, y0 + len - h); c.lineTo(x0 - h, y0 + h); }
  c.closePath();
}
/** one digit, top-left (x, y), w × h, segment thickness t; skewed about its own bottom edge */
export function seg7(c, x, y, w, h, t, d, { on = VIOLET, ghost = 0.07, glow = 1 } = {}) {
  const lit = SEGS[d] ?? '';
  const g = t * 0.22;
  const xl = x + t / 2, xr = x + w - t / 2, ya = y + t / 2, yg = y + h / 2, yd = y + h - t / 2;
  const S = {
    a: [xl + g, ya, xr - xl - 2 * g, true], g: [xl + g, yg, xr - xl - 2 * g, true], d: [xl + g, yd, xr - xl - 2 * g, true],
    f: [xl, ya + g, yg - ya - 2 * g, false], b: [xr, ya + g, yg - ya - 2 * g, false],
    e: [xl, yg + g, yd - yg - 2 * g, false], c: [xr, yg + g, yd - yg - 2 * g, false],
  };
  c.save();
  c.translate(x, y + h); c.transform(1, 0, -0.08, 1, 0, 0); c.translate(-x, -(y + h));
  for (const [k, [sx, sy, len, hz]] of Object.entries(S)) {
    const isOn = lit.includes(k);
    segPath(c, sx, sy, len, t, hz);
    if (isOn) {
      c.shadowColor = L.rgba(on, 0.8 * glow); c.shadowBlur = t * 1.4;
      c.fillStyle = L.rgba(L.mix(on, [255, 255, 255], 0.35));
    } else { c.shadowBlur = 0; c.fillStyle = L.rgba(on, ghost); }
    c.fill();
  }
  c.restore();
}
/** the HOURS clock unit (content box 300 × 130 at scale 1, centred on (cx, cy)) */
export const CLOCK = { w: 330, h: 136 };
export function drawClock(c, cx, cy, sc, val, { k = 1, panel = true, label = 'HOURS AWAKE', gt = 0, color = VIOLET, approx = false, unit = 'H', pad = 0, labelSize = 21 } = {}) {
  if (k <= 0) return;
  c.save();
  c.translate(cx, cy); c.scale(sc, sc);
  c.globalAlpha *= k;
  const w = CLOCK.w, h = CLOCK.h;
  if (panel) {
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 20; c.shadowOffsetY = 6;
    c.fillStyle = 'rgb(7,9,20)';
    L.roundRect(c, -w / 2, -h / 2, w, h, 14); c.fill();
    c.shadowColor = 'transparent';
    c.strokeStyle = L.rgba(color, 0.4); c.lineWidth = 1.5;
    L.roundRect(c, -w / 2, -h / 2, w, h, 14); c.stroke();
  }
  // label row: a live dot (slow pulse) + tracked caps
  c.textBaseline = 'alphabetic';
  const ls = L.fitSize(c, label, w - 44 - 22 - label.length * 3, labelSize, 700, L.FONT.body, 14);
  c.font = L.font(ls, 700, L.FONT.body);
  c.fillStyle = L.rgba(GREYT);
  L.trackedText(c, label, -w / 2 + 44, -h / 2 + 35, 3);
  const pulse = 0.5 + 0.5 * Math.sin(gt * TAU * 0.8);
  c.fillStyle = L.rgba(color, 0.5 + 0.5 * pulse);
  c.beginPath(); c.arc(-w / 2 + 28, -h / 2 + 28, 5, 0, TAU); c.fill();
  // digits
  const dw = 44, dh = 70, t = 9.5, gap = 13;
  const s = pad ? String(val).padStart(pad, '0') : approx ? String(val) : String(val).padStart(3, '0');
  const n = s.length;
  c.font = L.font(40, 800, L.FONT.display);
  const hW = c.measureText(unit).width;
  const pre = approx ? '≈' : '';
  c.font = L.font(60, 800, L.FONT.display);
  const preW = pre ? c.measureText(pre).width + 12 : 0;
  const total = preW + n * dw + (n - 1) * gap + 22 + hW;
  let x = -total / 2;
  const y0 = -h / 2 + 50;
  if (pre) { c.fillStyle = L.rgba(L.mix(color, [255, 255, 255], 0.35)); c.fillText(pre, x, y0 + dh - 4); x += preW; }
  for (const ch of s) { seg7(c, x, y0, dw, dh, t, ch, { on: color }); x += dw + gap; }
  c.font = L.font(40, 800, L.FONT.display);
  c.fillStyle = L.rgba(L.mix(color, [255, 255, 255], 0.35));
  c.fillText(unit, x + 22 - gap, y0 + dh);
  c.restore();
}

// ------------------------------------------------------------------ the experiment-log strip (HUD)
export const stripK = (tl, gt) => L.ease.outCubic(L.prog(gt, B(tl, 1), 0.5));
export const CLOCK_SLOT = { x: 818, y: STRIP.y + STRIP.h / 2 };
/** the HOURS clock's flight to centre stage and back (beat 6) — 0 docked … 1 hero */
export function clockFly(tl, gt) {
  return L.ease.inOutCubic(L.prog(gt, B(tl, 6, -0.12), 0.6)) * (1 - L.ease.inOutCubic(L.prog(gt, Wd(tl, 'finally', -0.25), 0.6)));
}
export const CLOCK_HERO = { x: 710, y: 580, s: 1.6 };
function drawStrip(c, v) {
  const tl = v.tl, gt = v.gt;
  const k = stripK(tl, gt);
  if (k <= 0) return;
  const { x, y, w, h } = STRIP;
  c.save();
  // wipe in left → right; the plate is opaque from its first frame
  c.beginPath(); c.rect(0, y - 48, x + w * k + 4, h + 68); c.clip();
  // tab label above the plate
  c.font = L.font(21, 700, L.FONT.body);
  const tabTxt = 'EXPERIMENT LOG · 1963 – 64';
  const tabW = c.measureText(tabTxt).width + tabTxt.length * 3 + 40;
  c.fillStyle = 'rgb(24,29,54)';
  L.roundRect(c, x, y - 38, tabW, 48, 9); c.fill();
  c.fillStyle = L.rgba(TEXT, 0.86);
  c.textBaseline = 'middle';
  L.trackedText(c, tabTxt, x + 20, y - 15, 3);
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 24; c.shadowOffsetY = 8;
  c.fillStyle = 'rgb(17,21,42)';
  L.roundRect(c, x, y, w, h, 18); c.fill();
  c.shadowColor = 'transparent';
  c.strokeStyle = L.rgba(VIOLET, 0.32); c.lineWidth = 1.5;
  L.roundRect(c, x + 0.75, y + 0.75, w - 1.5, h - 1.5, 18); c.stroke();
  // DAY + flaps
  const g = gq(gt), cy = y + h / 2, fs = 112;
  c.textBaseline = 'alphabetic';
  c.font = L.font(86, 800, L.FONT.display);
  c.fillStyle = L.rgba(TEXT);
  const dayW = c.measureText('DAY').width;
  c.fillText('DAY', x + 40, cy + 31);
  const fx = x + 40 + dayW + 24;
  drawFlaps(c, fx, cy + fs * 0.86 - fs * 0.49, fs, counter(tl, 'day', g));
  // divider
  c.fillStyle = 'rgba(170,180,220,0.16)';
  c.fillRect(612, y + 26, 2, h - 52);
  // clock slot: the docked clock, or its empty recess while it is out on stage
  const fly = clockFly(tl, gt);
  c.strokeStyle = `rgba(170,120,255,${0.28 * Math.min(1, fly * 3)})`;
  c.setLineDash([6, 6]); c.lineWidth = 1.5;
  if (fly > 0.01) { L.roundRect(c, CLOCK_SLOT.x - CLOCK.w / 2, CLOCK_SLOT.y - CLOCK.h / 2, CLOCK.w, CLOCK.h, 14); c.stroke(); }
  c.setLineDash([]);
  c.restore();
}
function drawClockHud(c, v) {
  const tl = v.tl, gt = v.gt;
  const k = stripK(tl, gt);
  if (k <= 0) return;
  const fly = clockFly(tl, gt);
  const x = L.lerp(CLOCK_SLOT.x, CLOCK_HERO.x, fly), y = L.lerp(CLOCK_SLOT.y, CLOCK_HERO.y, fly) - Math.sin(Math.PI * fly) * 40;
  const s = L.lerp(1, CLOCK_HERO.s, fly);
  c.save();
  // revealed by the strip's wipe while it enters
  c.beginPath(); c.rect(0, 0, STRIP.x + STRIP.w * k + 4, H); c.clip();
  const sleepDim = 1 - 0.35 * nightK(tl, gt);
  drawClock(c, x, y, s, counter(tl, 'hrs', gq(gt)).cur, { gt, k: sleepDim });
  c.restore();
}

// ------------------------------------------------------------------ paper: tags, cards
/** a typed paper tag (notebook label), centred on (cx, cy); opaque plate from its first frame (it scales in);
 *  drift 0..1 = letters wander (slurred), fade 0..1 = some letters fade away (memory failing) */
export function tag(c, text, cx, cy, { k = 1, size = 40, rot = 0, drift = 0, fade = 0, gt = 0, seed = 1, maxW = 900, ink = INKP, paper = PAPER, kicker = null, out = null } = {}) {
  if (k <= 0 || (out && out.u >= 1)) return null;
  c.save();
  const s = L.fitSize(c, text, maxW - 56, size, 700, TYPE, 18);
  c.font = tfont(s, 700);
  c.letterSpacing = '1.5px';
  const tw = c.measureText(text).width;
  c.letterSpacing = '0px';
  const pw = Math.max(tw, kicker ? kickerW(c, kicker) : 0) + 56, ph = s + 34 + (kicker ? 30 : 0);
  const e = L.ease.outBack(L.clamp(k), 1.8);
  c.translate(cx, cy); c.rotate(rot); c.scale(L.lerp(0.86, 1, e), L.lerp(0.86, 1, e));
  if (out) collapse(c, 0, 0, out.pk);
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 18; c.shadowOffsetY = 6;
  c.fillStyle = L.rgba(paper);
  c.fillRect(-pw / 2, -ph / 2, pw, ph);
  c.shadowColor = 'transparent';
  // paper edge shade + a strip of violet tape
  c.fillStyle = L.rgba(PAPER2); c.fillRect(-pw / 2, ph / 2 - 4, pw, 4);
  c.fillStyle = L.rgba(VIOLET, 0.55);
  c.save(); c.translate(-pw / 2 + 26, -ph / 2 + 2); c.rotate(-0.5); c.fillRect(-26, -9, 52, 18); c.restore();
  const ca = L.clamp(k * 2.5) * (out ? out.ca : 1);
  c.textBaseline = 'alphabetic';
  let ty = ph / 2 - 17 - s * 0.12;
  if (kicker) {
    c.font = L.font(21, 700, L.FONT.body);
    c.fillStyle = L.rgba(VIOLET.map((x) => x * 0.62), ca);
    L.trackedText(c, kicker, -(pw - 56) / 2, -ph / 2 + 34, 3);
  }
  c.font = tfont(s, 700);
  // letter by letter (for the drift / fade states)
  let x = -tw / 2;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    c.letterSpacing = '0px';
    const cw = c.measureText(ch).width + 1.5;
    const dx = drift * L.noise1(gt * 0.9 + i * 1.7, seed) * 5, dy = drift * L.noise1(gt * 0.8 + i * 2.3, seed + 5) * 6;
    const rr = drift * L.noise1(gt * 0.7 + i * 1.1, seed + 9) * 0.12;
    const fr = L.rng(seed * 97 + i)();
    const fa = 1 - fade * L.clamp((fade * 1.6 - fr) * 3) * 0.72;
    c.save();
    c.translate(x + cw / 2 + dx, ty + dy); c.rotate(rr);
    c.fillStyle = L.rgba(ink, ca * fa);
    c.textAlign = 'center';
    c.fillText(ch, 0, 0);
    c.restore();
    x += cw;
  }
  c.restore();
  return { w: pw, h: ph };
}
function kickerW(c, txt) {
  c.save(); c.font = L.font(21, 700, L.FONT.body); const w = c.measureText(txt).width + txt.length * 3; c.restore();
  return w;
}
/** a cream notebook card (ruled, red margin), opaque from its first frame; fn() draws its contents (clipped);
 *  out = exitK(...) collapses it (contents first, then the plate) */
export function paperCard(c, box, k, fn, { rot = 0, rules = true, out = null } = {}) {
  if (k <= 0 || (out && out.u >= 1)) return;
  const { x, y, w, h } = box;
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  c.translate(x + w / 2, y + h / 2 + (1 - e) * 26); c.rotate(rot); c.scale(L.lerp(0.96, 1, e), L.lerp(0.96, 1, e)); c.translate(-(x + w / 2), -(y + h / 2));
  if (out) collapse(c, x + w / 2, y + h / 2, out.pk);
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 30; c.shadowOffsetY = 10;
  c.fillStyle = L.rgba(PAPER);
  L.roundRect(c, x, y, w, h, 6); c.fill();
  c.shadowColor = 'transparent';
  c.save();
  L.roundRect(c, x, y, w, h, 6); c.clip();
  // paper tone: a soft vignette
  const pg = c.createRadialGradient(x + w * 0.4, y + h * 0.3, 0, x + w / 2, y + h / 2, Math.max(w, h) * 0.8);
  pg.addColorStop(0, 'rgba(255,255,255,0.12)'); pg.addColorStop(1, 'rgba(120,100,70,0.12)');
  c.fillStyle = pg; c.fillRect(x, y, w, h);
  if (rules) {
    c.fillStyle = L.rgba(RULE, 0.22);
    for (let ry = y + 62; ry < y + h - 10; ry += 44) c.fillRect(x, ry, w, 1.5);
    c.fillStyle = L.rgba(MARGIN, 0.5);
    c.fillRect(x + 64, y, 2, h);
  }
  c.globalAlpha *= L.clamp(k * 2.2) * (out ? out.ca : 1);
  fn?.(c);
  c.restore();
  c.restore();
}
/** small tracked caps line */
export function subLine(c, txt, x, y, { k = 1, color = GREYT, size = 24, maxW = 900, align = 'center', track = 3, weight = 700 } = {}) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= k;
  const s = L.fitSize(c, txt, maxW - track * txt.length, size, weight, L.FONT.body, 14);
  c.font = L.font(s, weight, L.FONT.body);
  c.fillStyle = L.rgba(color);
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 10;
  c.textBaseline = 'alphabetic';
  L.trackedText(c, txt, x, y, track, align);
  c.restore();
}

// ------------------------------------------------------------------ HUD
export function drawHud(c, v) {
  topBar(c, v, VIOLET, [236, 232, 224]);
  drawStrip(c, v);
  drawClockHud(c, v);
}

// ------------------------------------------------------------------ sound
export function cues(tl) {
  const out = [];
  const onsets = tl.lines.flatMap((ln) => (ln.phrases ?? []).flatMap((p) => (p.words ?? []).map((w) => w[0])));
  const clear = (t0, span = 0.12) => Array.from({ length: 41 }, (_, i) => (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.01).map((d) => t0 + d).find((x) => !onsets.some((o) => x > o - 0.08 && x < o + span));
  const gap = (i) => (tl.lines[i - 1].end + tl.lines[i].start) / 2;
  // transitions: soft swishes in the silences between lines (never on a first word)
  for (let i = 1; i < tl.lines.length; i++) {
    if (i === 6) continue;   // the clock flight owns this gap
    out.push({ t: gap(i) - 0.16, name: 'swish', gain: 0.13, pitch: 0.75 * (i % 2 ? 0.88 : 1) });
  }
  const ph = (i, j, e = 'start') => PH(tl, i, j, e);
  out.push({ t: 0.0, name: 'deep', gain: 0.3, pitch: 0.7 });
  out.push({ t: (ph(0, 0, 'end') + ph(0, 1)) / 2 - 0.1, name: 'blip', gain: 0.1, pitch: 0.8 });
  // counters: one soft tick as each count run starts (kept off word onsets)
  for (const t0 of [...new Set(countStarts(tl).map((x) => x.toFixed(2)))].map(Number)) { const t = clear(t0); if (t != null) out.push({ t, name: 'tick', gain: 0.05, pitch: 0.9 }); }
  // eye goes out of focus
  out.push({ t: Wd(tl, 'focus', -0.3), name: 'shimmer', gain: 0.07, pitch: 0.8 });
  // hallucination: a hush swell in the pause before "and he starts" (never over the words), kept low
  out.push({ t: ph(3, 0, 'end') + 0.07, name: 'hush', gain: 0.05, pitch: 0.9 });
  // thought bubble
  out.push({ t: Wd(tl, 'believes', -0.35), name: 'bloom', gain: 0.1, pitch: 1.1 });
  // pinball: two bright pings in the pause before "Yet"
  out.push({ t: ph(5, 2) - 0.36, name: 'ping', gain: 0.08, pitch: 1.5 });
  out.push({ t: ph(5, 2) - 0.2, name: 'ping', gain: 0.06, pitch: 1.9 });
  // the clock flies to centre stage (in the gap before "After"), lands with a low swell
  out.push({ t: B(tl, 6, -0.18), name: 'whoosh', gain: 0.18, pitch: 0.8 });
  // lights out
  out.push({ t: (ph(6, 0, 'end') + ph(6, 1)) / 2 - 0.15, name: 'chime', gain: 0.09, pitch: 0.85 });
  // the stamp, just before "too"
  out.push({ t: clear(Wd(tl, 'too', -0.12), 0.05) ?? Wd(tl, 'too', -0.12), name: 'impact', gain: 0.16, pitch: 0.8 });
  // question card
  out.push({ t: (ph(8, 0, 'end') + ph(8, 1)) / 2 - 0.1, name: 'ping', gain: 0.14, pitch: 1.0 });
  return out.sort((a, b) => a.t - b.t);
}
export { ANCHOR };
