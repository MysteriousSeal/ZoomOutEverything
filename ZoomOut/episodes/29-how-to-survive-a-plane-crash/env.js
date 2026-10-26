// Environment for "How to Survive a Plane Crash" (EP 29, How to Survive #3).
//
// LOOK: a calm, premium safety film. Dusk: deep navy sky with a low warm horizon band, a dark apron/runway, and ONE
//   modern narrow-body airliner (plain white, no livery, no logos) seen as a clean side CROSS-SECTION: the near hull is
//   cut away along the cabin, showing the far wall with its windows, overhead bins, warm ceiling light, seat rows in
//   profile (slate seats, pale headrest covers), floor-path lighting, the exits (doors + overwing hatch) with lit
//   green EXIT signs. Civil-defence yellow/black STEP badges and safety cards (series system, ep 27/28), EXIT green
//   for exits and escape flow, a warm red (RISK) for danger.
//
// WORLD (metres, x right = the aircraft's nose, y DOWN, ground y = 0): see camera.js. PLANE.* = the aircraft's local
//   geometry; planeAt(gt, tl) where it is; plane-local → world: (P.x + lx, P.y + ly) when parked (rot 0).
//
// LAYERS: drawBackground = sky, horizon lights, ground, runways. Scenes' drawWorld (s01: the flight-profile chart).
//   drawForeground = the aircraft (+ smoke in the cabin, evacuation slides + flow). Overlays: scenes.
//   drawHud = scrim + top bar (title on a dark pill).
//
// TIME STATE: smokeK (beat 2 phrase 2 → clears under the beat-3 card) · evacState (beat 5: doors, slides, flow dots).
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, topBar } from '../../../engine/runtime/kit.js';
import { KEYS, SHOT, SHOTS, MPP, AY, ANCHOR, rowAt, colAt, timesFor, shotAt, planeAt, profilePt, altAt, PHASES, D, A, XD, YOU_X, CHART, MC } from './camera.js';

export { KEYS, SHOT, SHOTS, MPP, AY, rowAt, colAt, timesFor, shotAt, planeAt, profilePt, altAt, PHASES, D, A, XD, YOU_X, CHART, MC };
const { W, H } = L;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ palette
export const ACCENT = [255, 200, 60];
export const CD = { yellow: [255, 204, 0], black: [14, 14, 16], ink: [10, 10, 12] };   // civil-defence yellow/black
export const SAFE = [70, 220, 130];
export const EXITG = [40, 215, 120];                  // EXIT-sign green
export const DANGER = [240, 72, 56];
export const RISK = [255, 112, 72];                   // the lit high-risk phases
export const AMBER = [255, 170, 60];
export const TEXT = [238, 236, 230];
export const WARM = [255, 214, 160];

export let T = null;
let TL = null;
export function sync(tl) { if (tl && tl !== TL) { TL = tl; T = timesFor(tl); } return T; }
const S = (tl, i) => tl.scenes[i].start;

export const smokeK = (gt, tl) => (sync(tl), L.smoothstep(L.prog(gt, T.smoke0, 1.3)) * (1 - L.smoothstep(L.prog(gt, T.smoke1, 1.2))));

// ------------------------------------------------------------------ the aircraft (local metres; origin = ground under the fuselage centre)
export const PLANE = {
  len: 39, x0: -19.5, x1: 19.4,
  belly: -1.25, top: -5.25, cy: -3.25,
  floor: -2.45, ceil: -4.75,
  cab0: -6.2, cab1: 11.95,                  // the cut-away cabin: between the rear and the front door
  winY: -3.55,
};
export const EXITS = [
  { name: 'FRONT', x: 12.55, w: 0.86, top: -4.38, bot: -2.45, kind: 'door' },
  { name: 'OVERWING', x: 2.4, w: 0.56, top: -3.95, bot: -2.9, kind: 'hatch' },
  { name: 'REAR', x: -6.9, w: 0.86, top: -4.38, bot: -2.45, kind: 'door' },
];
/** seat rows: {n, x} (x = the seat back's base, local) — rows 1–10 forward of the overwing exit, 11–20 aft */
export const ROWS = (() => {
  const r = [];
  for (let k = 0; k < 10; k++) r.push({ n: 10 - k, x: 3.0 + 0.8 * k });
  for (let k = 0; k < 10; k++) r.push({ n: 11 + k, x: 1.55 - 0.8 * k });
  return r.sort((a, b) => a.n - b.n);
})();
export const rowX = (n) => ROWS[n - 1].x;
export const YOU_ROW = 15;
export const SEAT = { cushTop: -2.98, headTop: -3.72, headBot: -3.5 };   // heights used for labels (local y)
/** a seat's headrest centre (local) */
export const headrest = (n) => ({ x: rowX(n) - 0.06, y: -3.6 });
const GALLEYS = [[10.86, 11.95]];

export function toLocal(c, v, P, sc = 1) {
  c.translate(v.wx(P.x), v.wy(P.y));
  if (P.rot) c.rotate(-P.rot);
  const k = sc / v.cam.mpp;
  c.scale(k, k);
  return 1 / k;   // metres per screen px
}
/** the aircraft's on-screen magnification: never smaller than ~64 px long (the profile icon) */
export const planeScale = (v) => Math.max(1, 64 / (PLANE.len / v.cam.mpp));
/** world → screen for a plane-local point of the PARKED aircraft (beats 2+) */
export const lpt = (v, lx, ly) => { const P = planeAt(v.gt, v.tl); return [v.wx(P.x + lx), v.wy(P.y + ly)]; };

// hull outline (local): fuselage + nose + tail cone, clockwise from the top of the nose join
function hullPath(c) {
  const p = PLANE;
  c.beginPath();
  c.moveTo(-12.5, p.top);
  c.lineTo(13.8, p.top);
  c.bezierCurveTo(16.4, p.top, 18.2, -4.6, 19.0, -3.6);            // nose crown → windscreen
  c.bezierCurveTo(19.55, -2.9, 19.4, -2.2, 18.6, -1.75);            // nose tip
  c.bezierCurveTo(17.4, -1.3, 15.8, p.belly, 14.0, p.belly);       // chin
  c.lineTo(-11.0, p.belly);
  c.bezierCurveTo(-14.2, p.belly, -17.4, -3.2, -19.5, -4.55);     // upswept tail cone
  c.lineTo(-19.6, -4.95);
  c.bezierCurveTo(-17.2, -5.15, -14.6, p.top, -12.5, p.top);
  c.closePath();
}
function finPath(c) {
  c.beginPath();
  c.moveTo(-12.6, -5.2);
  c.bezierCurveTo(-14.2, -6.4, -16.4, -10.2, -17.3, -12.35);
  c.lineTo(-19.15, -12.35);
  c.lineTo(-19.45, -5.0);
  c.closePath();
}
// the aircraft is seen from slightly below and to the left of broadside (3/4): the near wing and near stabiliser sweep
// back and toward the viewer (down on screen); the far stabiliser shows only as a swept tab rising out of the tail cone.
const WING = { rLE: [6.2, -1.97], rTE: [-2.0, -1.88], tLE: [-3.5, -0.62], tTE: [-5.5, -0.56] };
const wingAt = (f, edge) => {   // a point on the leading (edge 0) / trailing (edge 1) edge at span fraction f
  const r = edge ? WING.rTE : WING.rLE, t = edge ? WING.tTE : WING.tLE;
  return [L.lerp(r[0], t[0], f), L.lerp(r[1], t[1], f)];
};
export const OFFWING = { f0: 0.36, f1: 0.56 };   // the off-wing ramp leaves the trailing edge between these span fractions
/** the main gear leg (near side): oleo strut, torque link, strut door, two wheels (local; the inboard wheel darker) */
function mainGear(c, lw, x, k) {
  const top = -1.5, axle = -0.56, r = 0.56;
  c.save();
  c.globalAlpha *= k;
  // inboard wheel (behind)
  c.fillStyle = 'rgb(16,16,20)'; c.beginPath(); c.arc(x + 0.42, -r - 0.04, r, 0, TAU); c.fill();
  c.fillStyle = 'rgb(70,72,80)'; c.beginPath(); c.arc(x + 0.42, -r - 0.04, r * 0.4, 0, TAU); c.fill();
  // strut door (a panel hung on the leg, just ahead of it)
  c.fillStyle = 'rgb(200,204,212)';
  c.beginPath(); c.moveTo(x + 0.1, top + 0.02); c.lineTo(x + 0.62, top + 0.06); c.lineTo(x + 0.52, axle - 0.36); c.lineTo(x + 0.12, axle - 0.4); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(110,116,130,0.8)'; c.lineWidth = lw(1); c.stroke();
  // oleo: the outer cylinder, the chrome piston, the torque link
  c.fillStyle = 'rgb(88,92,102)'; c.fillRect(x - 0.12, top, 0.24, 0.62);
  c.fillStyle = 'rgb(176,182,192)'; c.fillRect(x - 0.075, top + 0.6, 0.15, axle - top - 0.6);
  c.strokeStyle = 'rgb(70,74,84)'; c.lineWidth = Math.max(lw(1.5), 0.035); c.lineJoin = 'round';
  c.beginPath(); c.moveTo(x - 0.12, top + 0.5); c.lineTo(x - 0.3, top + 0.72); c.lineTo(x - 0.075, axle - 0.12); c.stroke();
  // near wheel + hub
  c.fillStyle = 'rgb(24,24,28)'; c.beginPath(); c.arc(x, axle, r, 0, TAU); c.fill();
  c.fillStyle = 'rgb(120,124,134)'; c.beginPath(); c.arc(x, axle, r * 0.46, 0, TAU); c.fill();
  c.fillStyle = 'rgb(70,72,80)'; c.beginPath(); c.arc(x, axle, r * 0.16, 0, TAU); c.fill();
  c.restore();
}
function noseGear(c, lw, x, k) {
  const r = 0.4;
  c.save();
  c.globalAlpha *= k;
  // bay doors (open, hanging either side of the bay)
  c.fillStyle = 'rgb(196,200,208)';
  c.beginPath(); c.moveTo(x - 0.55, -1.32); c.lineTo(x - 0.42, -1.32); c.lineTo(x - 0.5, -0.86); c.lineTo(x - 0.6, -0.88); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(x + 0.42, -1.3); c.lineTo(x + 0.55, -1.3); c.lineTo(x + 0.6, -0.88); c.lineTo(x + 0.5, -0.86); c.closePath(); c.fill();
  c.fillStyle = 'rgb(88,92,102)'; c.fillRect(x - 0.08, -1.34, 0.16, 0.42);
  c.fillStyle = 'rgb(176,182,192)'; c.fillRect(x - 0.05, -0.94, 0.1, 0.5);
  c.fillStyle = 'rgb(16,16,20)'; c.beginPath(); c.arc(x + 0.22, -r - 0.03, r, 0, TAU); c.fill();
  c.fillStyle = 'rgb(24,24,28)'; c.beginPath(); c.arc(x, -r, r, 0, TAU); c.fill();
  c.fillStyle = 'rgb(120,124,134)'; c.beginPath(); c.arc(x, -r, r * 0.44, 0, TAU); c.fill();
  c.restore();
}

/** the airliner. P = planeAt(); opts: cut (0..1 cutaway interior), smoke (0..1), lights (cabin light 0..1), evac (state) */
export function drawPlane(c, v, P, { cut = 1, smoke = 0, evac = null, shadow = true } = {}) {
  const sc = planeScale(v);
  c.save();
  const m = toLocal(c, v, P, sc);   // metres per px
  const lw = (px) => px * m;
  const p = PLANE;
  // soft ground shadow
  if (shadow && (!P.flying || P.y > -40)) {
    c.save();
    const g = c.createRadialGradient(0, -P.y + 0.05, 0, 0, -P.y + 0.05, 20);
    g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.translate(0, -P.y + 0.05); c.scale(1, 0.08);
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 20, 0, TAU); c.fill();
    c.restore();
  }
  const gear = P.flying ? L.clamp(1 - (-P.y) / 25) : 1;
  const edge = 'rgba(110,116,130,0.7)';
  // far horizontal stabiliser: one swept tab rising out of the tail cone (its root hidden inside the cone)
  c.fillStyle = 'rgb(178,182,192)';
  c.beginPath(); c.moveTo(-15.4, -4.7); c.lineTo(-18.75, -5.62); c.lineTo(-19.85, -5.62); c.lineTo(-19.3, -4.7); c.closePath(); c.fill();
  c.strokeStyle = edge; c.lineWidth = lw(1); c.stroke();
  // fin
  const fg = c.createLinearGradient(0, -12.4, 0, -5);
  fg.addColorStop(0, 'rgb(208,212,220)'); fg.addColorStop(1, 'rgb(232,234,238)');
  c.fillStyle = fg; finPath(c); c.fill();
  c.strokeStyle = 'rgba(120,126,140,0.6)'; c.lineWidth = lw(1); c.stroke();
  // nose gear (behind the hull's chin line)
  if (gear > 0.01) noseGear(c, lw, 15.45, gear);
  // hull
  const hg = c.createLinearGradient(0, p.top, 0, p.belly);
  hg.addColorStop(0, 'rgb(246,247,249)'); hg.addColorStop(0.45, 'rgb(232,234,238)'); hg.addColorStop(0.75, 'rgb(204,207,214)'); hg.addColorStop(1, 'rgb(150,154,164)');
  c.fillStyle = hg; hullPath(c); c.fill();
  c.strokeStyle = 'rgba(110,116,130,0.7)'; c.lineWidth = lw(1.2); c.stroke();
  // belly fairing (the wing-to-body fairing bulge) + cargo line
  c.fillStyle = 'rgb(186,190,198)';
  c.beginPath(); c.moveTo(7.6, -1.5); c.bezierCurveTo(6.4, -1.12, -2.6, -1.1, -4.0, -1.42); c.lineTo(-4.0, -1.6); c.lineTo(7.6, -1.6); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(120,126,140,0.45)'; c.lineWidth = lw(1);
  c.beginPath(); c.moveTo(-10.5, -1.95); c.lineTo(14.6, -1.95); c.stroke();
  // windscreen
  c.fillStyle = 'rgb(28,36,52)';
  c.beginPath(); c.moveTo(17.15, -4.38); c.lineTo(18.45, -4.05); c.lineTo(18.75, -3.72); c.lineTo(17.25, -3.86); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(16.2, -4.5); c.lineTo(16.95, -4.43); c.lineTo(17.0, -3.9); c.lineTo(16.2, -3.92); c.closePath(); c.fill();
  // exterior cabin windows (outside the cut, and all of them when the interior is hidden)
  const winOut = (x) => { c.beginPath(); L.roundRect(c, x - 0.12, p.winY - 0.18, 0.24, 0.36, 0.1); c.fill(); };
  c.fillStyle = 'rgb(46,56,76)';
  for (let x = -10.6; x <= 13.2; x += 0.53) {
    if (EXITS.some((e) => Math.abs(x - e.x) < e.w / 2 + 0.1)) continue;
    winOut(x);
  }
  // exterior doors (the overwing hatch is inside the cut); open in the evacuation: a dark doorway + the panel swung out
  for (const e of EXITS) {
    const inCut = e.x > p.cab0 && e.x < p.cab1;
    if (inCut && cut > 0.5) continue;
    const open = evac ? evac.door : 0;
    if (open > 0 && e.kind === 'door') {
      const og = c.createLinearGradient(0, e.top, 0, e.bot);
      og.addColorStop(0, 'rgb(150,132,110)'); og.addColorStop(1, 'rgb(70,62,58)');
      c.fillStyle = og;
      L.roundRect(c, e.x - e.w / 2, e.top, e.w, e.bot - e.top, 0.12); c.fill();
      const pw = e.w * (1 - L.ease.inOutCubic(open)) * 0.96, sd = e.x > 0 ? 1 : -1;
      c.fillStyle = 'rgb(226,228,234)';
      L.roundRect(c, sd > 0 ? e.x + e.w / 2 - pw : e.x - e.w / 2, e.top, pw, e.bot - e.top, 0.1); c.fill();
    }
    c.strokeStyle = 'rgba(110,116,130,0.85)'; c.lineWidth = lw(1.2);
    L.roundRect(c, e.x - e.w / 2, e.top, e.w, e.bot - e.top, 0.12); c.stroke();
    if (open <= 0) { c.fillStyle = 'rgba(110,116,130,0.7)'; c.fillRect(e.x + e.w * 0.12, (e.top + e.bot) / 2 - 0.03, e.w * 0.22, 0.06); }
  }
  // ---- the cut-away cabin (between the front and rear doors)
  if (cut > 0.003) {
    c.save();
    c.globalAlpha *= cut;
    drawCabin(c, v, lw, smoke, evac);
    c.restore();
  }
  // ---- near side, in front of the hull: main gear, wing (underside + leading edge), pylon + engine, near stabiliser
  if (gear > 0.01) mainGear(c, lw, -1.15, gear);
  const wg = c.createLinearGradient(0, -1.95, 0, -0.9);
  wg.addColorStop(0, 'rgb(118,124,138)'); wg.addColorStop(1, 'rgb(168,174,186)');
  c.fillStyle = wg;
  c.beginPath(); c.moveTo(...WING.rLE); c.lineTo(...WING.tLE); c.lineTo(...WING.tTE); c.lineTo(...WING.rTE); c.closePath(); c.fill();
  c.strokeStyle = edge; c.lineWidth = lw(1); c.stroke();
  // flaps: a hinge line near the trailing edge + three flap-track fairings
  c.strokeStyle = 'rgba(120,126,140,0.6)'; c.lineWidth = lw(1);
  c.beginPath(); c.moveTo(...wingAt(0, 1).map((u, i) => u + (i ? -0.16 : 0.9))); c.lineTo(...wingAt(0.92, 1).map((u, i) => u + (i ? -0.1 : 0.55))); c.stroke();
  // flap-track fairings: slim pods along the chord, poking out behind the trailing edge
  for (const f of [0.22, 0.5, 0.76]) {
    const [tx, ty] = wingAt(f, 1);
    c.fillStyle = 'rgb(150,155,168)';
    c.beginPath(); c.ellipse(tx + 0.25, ty + 0.03, 1.05, 0.085, -0.03, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(96,102,116,0.7)'; c.lineWidth = lw(1); c.stroke();
  }
  // leading-edge highlight
  c.strokeStyle = 'rgba(250,251,253,0.9)'; c.lineWidth = Math.max(lw(1.5), 0.05);
  c.beginPath(); c.moveTo(...WING.rLE); c.lineTo(...WING.tLE); c.stroke();
  // winglet (rising from the tip)
  c.fillStyle = 'rgb(214,218,226)';
  c.beginPath(); c.moveTo(-3.55, -0.63); c.lineTo(-5.4, -0.57); c.lineTo(-6.25, -1.75); c.lineTo(-5.75, -1.8); c.closePath(); c.fill();
  c.strokeStyle = edge; c.lineWidth = lw(1); c.stroke();
  // pylon (from the wing's leading edge forward over the nacelle) + engine
  c.fillStyle = 'rgb(184,188,198)';
  c.beginPath(); c.moveTo(1.2, -1.66); c.lineTo(4.2, -1.75); c.lineTo(5.3, -1.62); c.lineTo(4.6, -1.42); c.lineTo(1.6, -1.36); c.closePath(); c.fill();
  c.strokeStyle = edge; c.lineWidth = lw(1); c.stroke();
  const eg = c.createLinearGradient(0, -1.5, 0, -0.12);
  eg.addColorStop(0, 'rgb(240,242,246)'); eg.addColorStop(0.55, 'rgb(212,216,224)'); eg.addColorStop(1, 'rgb(150,156,168)');
  c.fillStyle = eg;
  c.beginPath();
  c.moveTo(6.15, -1.52); c.bezierCurveTo(6.38, -1.3, 6.38, -0.38, 6.15, -0.16);   // inlet lip
  c.lineTo(2.9, -0.28); c.bezierCurveTo(2.3, -0.36, 2.0, -0.6, 1.9, -0.84);         // nozzle
  c.bezierCurveTo(2.0, -1.1, 2.3, -1.34, 2.9, -1.42); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(100,106,120,0.75)'; c.lineWidth = lw(1); c.stroke();
  c.fillStyle = 'rgb(36,40,50)'; c.beginPath(); c.ellipse(6.2, -0.84, 0.13, 0.62, 0, 0, TAU); c.fill();   // the fan face
  c.fillStyle = 'rgb(96,100,112)'; c.beginPath(); c.moveTo(1.95, -0.98); c.lineTo(1.3, -0.86); c.lineTo(1.95, -0.7); c.closePath(); c.fill();   // exhaust plug
  c.strokeStyle = 'rgba(120,126,140,0.55)'; c.lineWidth = lw(1);
  c.beginPath(); c.moveTo(3.6, -1.4); c.lineTo(3.6, -0.26); c.stroke();   // cowl seam
  // near horizontal stabiliser (swept back, toward the viewer)
  c.fillStyle = 'rgb(206,210,218)';
  c.beginPath(); c.moveTo(-15.2, -4.25); c.lineTo(-18.4, -3.32); c.lineTo(-19.55, -3.3); c.lineTo(-18.9, -4.3); c.closePath(); c.fill();
  c.strokeStyle = edge; c.lineWidth = lw(1); c.stroke();
  c.restore();
}

/** the cabin interior (local metres, already transformed) */
function drawCabin(c, v, lw, smoke, evac) {
  const p = PLANE, x0 = p.cab0, x1 = p.cab1, y0 = p.ceil - 0.2, y1 = p.floor + 0.2;
  const dim = 1 - 0.55 * smoke;   // cabin light drops in smoke
  // cut edge: the hull skin + frames around the opening (darker rim)
  c.fillStyle = 'rgb(54,58,68)';
  L.roundRect(c, x0 - 0.12, y0 - 0.14, x1 - x0 + 0.24, y1 - y0 + 0.28, 0.3); c.fill();
  c.save();
  L.roundRect(c, x0, y0, x1 - x0, y1 - y0, 0.22); c.clip();
  // far wall
  const wg = c.createLinearGradient(0, y0, 0, y1);
  const wcol = (k, a) => `rgb(${(a[0] * k) | 0},${(a[1] * k) | 0},${(a[2] * k) | 0})`;
  wg.addColorStop(0, wcol(dim, [236, 226, 206])); wg.addColorStop(0.18, wcol(dim, [214, 204, 186])); wg.addColorStop(0.55, wcol(dim, [168, 160, 150])); wg.addColorStop(1, wcol(dim, [120, 116, 112]));
  c.fillStyle = wg; c.fillRect(x0, y0, x1 - x0, y1 - y0);
  // dado line + sidewall panel seams
  c.fillStyle = wcol(dim, [140, 134, 126]); c.fillRect(x0, -3.08, x1 - x0, 0.03);
  // windows on the far wall (dusk sky through them)
  for (let x = -10.6; x <= 13.2; x += 0.53) {
    if (EXITS.some((e) => Math.abs(x - e.x) < e.w / 2 + 0.1)) continue;
    if (GALLEYS.some(([a, b]) => x > a - 0.1 && x < b + 0.1)) continue;
    c.fillStyle = wcol(dim, [196, 188, 176]);
    L.roundRect(c, x - 0.17, p.winY - 0.24, 0.34, 0.48, 0.14); c.fill();
    const sg = c.createLinearGradient(0, p.winY - 0.18, 0, p.winY + 0.18);
    sg.addColorStop(0, 'rgb(34,46,82)'); sg.addColorStop(1, 'rgb(122,96,104)');
    c.fillStyle = sg;
    L.roundRect(c, x - 0.115, p.winY - 0.18, 0.23, 0.36, 0.1); c.fill();
  }
  // overhead bins (far side): a continuous run with door seams, lit edge
  const bg = c.createLinearGradient(0, -4.62, 0, -4.02);
  bg.addColorStop(0, wcol(dim, [232, 230, 226])); bg.addColorStop(1, wcol(dim, [196, 194, 190]));
  c.fillStyle = bg;
  c.beginPath(); c.moveTo(x0, -4.62); c.lineTo(x1, -4.62); c.lineTo(x1, -4.12); c.quadraticCurveTo(x1, -4.02, x1 - 0.1, -4.02); c.lineTo(x0, -4.02); c.closePath(); c.fill();
  c.fillStyle = wcol(dim, [150, 148, 146]);
  for (let x = x0 + 0.8; x < x1; x += 1.6) c.fillRect(x, -4.6, 0.025, 0.56);
  c.fillStyle = wcol(dim, [120, 118, 116]); c.fillRect(x0, -4.04, x1 - x0, 0.03);
  // ceiling + warm cove light
  c.fillStyle = wcol(dim, [244, 238, 226]); c.fillRect(x0, y0, x1 - x0, -4.62 - y0);
  const lg = c.createLinearGradient(0, -4.02, 0, -3.3);
  lg.addColorStop(0, `rgba(255,214,160,${0.28 * dim})`); lg.addColorStop(1, 'rgba(255,214,160,0)');
  c.fillStyle = lg; c.fillRect(x0, -4.02, x1 - x0, 0.72);
  // galleys / lavatories (cabinet faces)
  for (const [a, b] of GALLEYS) {
    c.fillStyle = wcol(dim, [178, 174, 168]); c.fillRect(a, -4.62, b - a, 2.17);
    c.fillStyle = wcol(dim, [150, 146, 140]);
    for (let yy = -4.4; yy < -2.6; yy += 0.45) c.fillRect(a + 0.08, yy, b - a - 0.16, 0.02);
  }
  // exits: door panels / overwing hatch + EXIT signs
  for (const e of EXITS) {
    const open = evac ? evac.door : 0;
    c.fillStyle = wcol(dim, [206, 202, 194]);
    L.roundRect(c, e.x - e.w / 2 - 0.06, e.top - 0.06, e.w + 0.12, e.bot - e.top + 0.06, 0.16); c.fill();
    if (open > 0) {   // the open doorway: dusk outside
      const og = c.createLinearGradient(0, e.top, 0, e.bot);
      og.addColorStop(0, 'rgb(40,50,86)'); og.addColorStop(1, 'rgb(140,104,98)');
      c.fillStyle = og; c.globalAlpha *= 1;
      L.roundRect(c, e.x - e.w / 2, e.top, e.w, (e.bot - e.top), 0.12); c.fill();
      c.fillStyle = wcol(dim, [214, 210, 202]);   // the door panel swinging away (a narrowing slab)
      const pw = e.w * (1 - L.ease.inOutCubic(open)) * 0.96;
      L.roundRect(c, e.x - e.w / 2, e.top, pw, e.bot - e.top, 0.1); c.fill();
    } else {
      c.strokeStyle = wcol(dim, [130, 126, 120]); c.lineWidth = lw(1.2);
      L.roundRect(c, e.x - e.w / 2, e.top, e.w, e.bot - e.top, 0.12); c.stroke();
      c.fillStyle = wcol(dim, [110, 106, 100]); c.fillRect(e.x + e.w * 0.18, (e.top + e.bot) / 2 - 0.02, e.w * 0.2, 0.05);   // handle
      if (e.kind === 'hatch') { c.fillStyle = 'rgb(46,58,90)'; L.roundRect(c, e.x - 0.11, -3.7, 0.22, 0.32, 0.09); c.fill(); }
    }
  }
  // floor (aisle carpet) + floor beam
  c.fillStyle = 'rgb(58,60,70)'; c.fillRect(x0, p.floor - 0.05, x1 - x0, 0.09);
  c.fillStyle = 'rgb(36,38,46)'; c.fillRect(x0, p.floor + 0.04, x1 - x0, 0.3);
  // seats
  for (const r of ROWS) drawSeat(c, r.x, dim, lw);
  // floor-path lighting (the strip along the aisle floor): always faintly on, bright in smoke
  const fp = 0.35 + 0.65 * smoke;
  for (let x = x0 + 0.2; x < x1; x += 0.42) {
    if (GALLEYS.some(([a, b]) => x > a && x < b)) continue;
    c.fillStyle = `rgba(255,236,200,${0.55 + 0.45 * smoke})`;
    c.fillRect(x - 0.07, p.floor - 0.07, 0.14, 0.045);
    if (fp > 0.4) L.lightBlob(c, x, p.floor - 0.05, 0.35, [255, 220, 170], 0.25 * smoke);
  }
  c.restore();
  // EXIT signs (green), drawn after the clip so the glow can breathe; legible minimum size on screen
  for (const e of EXITS) if (e.x > p.cab0 && e.x < p.cab1) exitSign(c, e.x, -4.2, lw, 1 + 0.6 * smoke);
}

/** one aisle seat in profile (facing +x). x = the seat back's base */
export function drawSeat(c, x, dim = 1, lw = () => 0.01, hi = 0) {
  const col = (a, k = dim) => `rgb(${(a[0] * k) | 0},${(a[1] * k) | 0},${(a[2] * k) | 0})`;
  // legs + track
  c.fillStyle = col([70, 72, 80]);
  c.fillRect(x + 0.1, -2.88, 0.05, 0.43); c.fillRect(x + 0.4, -2.88, 0.05, 0.43);
  c.fillRect(x + 0.06, -2.5, 0.44, 0.04);
  // seat back (reclined a little toward −x), headrest cover
  const sb = hi > 0 ? L.mix([54, 62, 82], [255, 204, 0], hi) : [54, 62, 82];
  c.fillStyle = col(sb);
  c.beginPath(); c.moveTo(x, -2.86); c.lineTo(x + 0.15, -2.86); c.lineTo(x + 0.04, -3.6); c.lineTo(x - 0.12, -3.6); c.closePath(); c.fill();
  c.fillStyle = col(hi > 0 ? L.mix([226, 226, 230], [255, 226, 120], hi) : [226, 226, 230]);
  L.roundRect(c, x - 0.15, -3.74, 0.19, 0.26, 0.06); c.fill();
  // cushion
  c.fillStyle = col(sb.map((u) => u * 1.08));
  L.roundRect(c, x + 0.04, -3.0, 0.5, 0.14, 0.05); c.fill();
  // armrest
  c.fillStyle = col([84, 90, 106]);
  L.roundRect(c, x + 0.1, -3.2, 0.36, 0.045, 0.02); c.fill();
  c.fillRect(x + 0.4, -3.18, 0.035, 0.2);
}

/** a green EXIT sign centred at (x, y) local; at least ~62 × 24 px on screen */
function exitSign(c, x, y, lw, glow = 1) {
  const m = lw(1);   // metres per px
  const big = m < 0.02;   // close views: at least 62 × 24 px so EXIT reads; wide views: true size
  const w = big ? Math.max(0.46, 62 * m) : 0.46, h = big ? Math.max(0.17, 24 * m) : 0.17;
  L.lightBlob(c, x, y, w * 1.1, EXITG, (big ? 0.32 : 0.12) * glow);
  if (!big) { c.fillStyle = 'rgb(30,190,100)'; c.fillRect(x - w / 2, y - h / 2, w, h); return; }
  c.fillStyle = 'rgb(18,150,80)';
  L.roundRect(c, x - w / 2, y - h / 2, w, h, h * 0.18); c.fill();
  c.strokeStyle = 'rgb(160,255,200)'; c.lineWidth = Math.max(m * 1.2, 0.008);
  L.roundRect(c, x - w / 2, y - h / 2, w, h, h * 0.18); c.stroke();
  c.save();
  c.translate(x, y + h * 0.04);
  c.scale(m, m);   // type in screen px
  c.fillStyle = '#f4fff8';
  c.font = L.font(Math.round((h / m) * 0.66), 800, L.FONT.display);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('EXIT', 0, 1);
  c.restore();
}

// ------------------------------------------------------------------ evacuation model (beat 5)
// 3 dots per row (the row's three seats on this side), each walks the aisle to its nearest exit, queues, leaves through
// the door and slides down to the ground. Closed-form: a dot k-th in its exit's queue passes the door at t0 + k·h.
export const EVAC = { v: 3.0, lead: 0.55, last: 2.9 };   // walking speed (m per film-second), first / last dot through a door (s after evac0)
const EV = (() => {
  const dots = [];
  for (const r of ROWS) for (let j = 0; j < 3; j++) {
    const sx = r.x + 0.24 + j * 0.05;
    let best = EXITS[0], bd = 1e9;
    for (const e of EXITS) { const d = Math.abs(e.x - sx); if (d < bd) { bd = d; best = e; } }
    dots.push({ row: r.n, j, sx, exit: best, d0: bd });
  }
  for (const e of EXITS) {
    const q = dots.filter((d) => d.exit === e).sort((a, b) => a.d0 - b.d0 || a.j - b.j);
    // every exit's queue clears at the same moment (EVAC.last s after the doors open)
    q.forEach((d, k) => { d.k = k; d.tx = EVAC.lead + (k / Math.max(1, q.length - 1)) * (EVAC.last - EVAC.lead); });
  }
  return dots;
})();
export function evacState(gt, tl) {
  sync(tl);
  const t = gt - T.evac0;
  return {
    t,
    door: L.ease.inOutCubic(L.prog(t, 0.05, 0.4)),
    slide: L.ease.outBack(L.prog(t, 0.25, 0.55), 1.2),
    on: t > -0.3,
  };
}
/** positions of the evacuees (plane-local) at film time gt: [{x, y, a}] */
export function evacDots(gt, tl) {
  sync(tl);
  const t = gt - T.evac0, out = [];
  if (t < -0.3) return out;
  const show = L.smoothstep(L.prog(t, -0.3, 0.3));
  for (const d of EV) {
    const tx = d.tx;                               // when this dot reaches the door
    const dist = Math.min(d.d0, Math.max(0, (tx - t) * EVAC.v));
    const dir = Math.sign(d.exit.x - d.sx) || 1;
    if (t < tx) {
      const x = d.exit.x - dir * dist;
      const up = L.smoothstep(L.clamp((d.d0 - dist) / 0.35));   // stands up into the aisle as it starts to move
      out.push({ x, y: L.lerp(-3.1, -2.78, up), a: show, j: d.j });
      continue;
    }
    // through the exit, down the slide, away toward the viewer
    const u = t - tx, e = d.exit;
    if (e.kind === 'hatch') {
      // out through the hatch onto the wing root, aft/outboard along the wing to its trailing edge, down the off-wing
      // ramp (aft of the wing, clear of the main gear), then away along the ground
      const s1 = L.clamp(u / 0.25), s2 = L.clamp((u - 0.25) / 0.45), s3 = L.clamp((u - 0.7) / 0.35), s4 = L.clamp((u - 1.05) / 0.4);
      const fm = (OFFWING.f0 + OFFWING.f1) / 2, [tx, ty] = wingAt(fm, 1), [rx, ry] = [e.x - 0.9, -1.86];
      const gx = tx - 1.75, gy = -0.2;
      let x, y;
      if (s1 < 1) { x = L.lerp(e.x, rx, s1); y = L.lerp(-2.85, ry, s1); }
      else if (s2 < 1) { x = L.lerp(rx, tx + 0.1, s2); y = L.lerp(ry, ty - 0.12, s2); }
      else if (s3 < 1) { x = L.lerp(tx + 0.1, gx, s3); y = L.lerp(ty - 0.12, gy, s3); }
      else { x = gx - 1.8 * s4; y = gy; }
      out.push({ x, y, a: 1 - L.smoothstep(L.clamp((u - 1.2) / 0.3)), j: d.j });
    } else {
      const sd = e.x > 0 ? 1 : -1;   // slides angle away from the fuselage's middle
      const s1 = L.clamp(u / 0.18), s2 = L.clamp((u - 0.18) / 0.45), s3 = L.clamp((u - 0.63) / 0.6);
      const x = e.x + sd * (0.3 * s1 + 3.0 * s2 + 2.4 * s3), y = L.lerp(-2.78, -2.4, s1) + 2.22 * s2;
      out.push({ x, y, a: 1 - L.smoothstep(L.clamp((u - 0.9) / 0.35)), j: d.j });
    }
  }
  return out;
}
export const EVAC_END = () => EVAC.last + 1.2;

/** the inflatable slides (plane-local, k 0..1) */
function drawSlides(c, k, lw) {
  if (k <= 0) return;
  c.save();
  for (const e of EXITS) {
    const sd = e.kind === 'hatch' ? -1 : e.x > 0 ? 1 : -1;
    c.fillStyle = 'rgb(246,188,40)'; c.strokeStyle = 'rgb(196,128,20)'; c.lineWidth = lw(1.2);
    c.beginPath();
    if (e.kind === 'hatch') {   // off-wing ramp: hangs from the wing's trailing edge, aft of the wing, down to the ground
      const [ax, ay] = wingAt(OFFWING.f0, 1), [bx, by] = wingAt(OFFWING.f1, 1);
      c.moveTo(ax, ay); c.lineTo(bx, by);
      c.lineTo(bx - 1.9 * k, L.lerp(by, 0, k)); c.lineTo(ax - 1.6 * k, L.lerp(ay, 0, k));
    } else {
      const x0 = e.x + sd * e.w * 0.5, y0 = -2.4;
      c.moveTo(e.x - sd * e.w * 0.45, y0); c.lineTo(x0, y0);
      c.lineTo(x0 + sd * 3.4 * k, y0 + 2.4 * k); c.lineTo(e.x - sd * e.w * 0.45 + sd * 2.6 * k, y0 + 2.4 * k);
    }
    c.closePath(); c.fill(); c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------------ background
const HSTARS = (() => { const r = L.rng(2909); return Array.from({ length: 90 }, () => ({ x: r(), y: r(), s: 0.5 + r() * 1.3, ph: r() * 6.28 })); })();
const HLIGHTS = (() => { const r = L.rng(2911); return Array.from({ length: 140 }, () => ({ x: r(), s: 0.6 + r() * 1.4, w: r(), ph: r() * 6.28, col: r() })); })();
export function drawBackground(c, v) {
  sync(v.tl);
  const hy = v.wy(0);   // the horizon / ground line on screen
  // sky
  const top = Math.min(0, hy - 1500);
  const g = c.createLinearGradient(0, top, 0, hy);
  g.addColorStop(0, 'rgb(6,9,22)'); g.addColorStop(0.55, 'rgb(14,22,46)'); g.addColorStop(0.82, 'rgb(40,44,72)'); g.addColorStop(0.95, 'rgb(96,74,82)'); g.addColorStop(1, 'rgb(150,104,86)');
  c.fillStyle = g; c.fillRect(0, 0, W, Math.max(0, hy));
  // faint stars (top of the sky only)
  for (const s of HSTARS) {
    const y = s.y * Math.max(0, hy - 500);
    if (y > hy - 520) continue;
    c.fillStyle = `rgba(255,255,255,${0.12 + 0.22 * (0.5 + 0.5 * Math.sin(v.gt * 1.3 + s.ph))})`;
    c.beginPath(); c.arc(s.x * W, y, s.s, 0, TAU); c.fill();
  }
  // a low feathered haze band over the horizon
  const hz = c.createLinearGradient(0, hy - 140, 0, hy);
  hz.addColorStop(0, 'rgba(255,170,120,0)'); hz.addColorStop(1, 'rgba(255,170,120,0.16)');
  c.fillStyle = hz; c.fillRect(0, hy - 140, W, 140);
  // ground
  const gg = c.createLinearGradient(0, hy, 0, H);
  gg.addColorStop(0, 'rgb(24,24,30)'); gg.addColorStop(0.15, 'rgb(14,15,20)'); gg.addColorStop(1, 'rgb(7,8,11)');
  c.fillStyle = gg; c.fillRect(0, hy, W, H - hy);
  // distant airport / city lights on the horizon (slow parallax)
  for (const l of HLIGHTS) {
    const x = ((l.x * W * 1.6 - v.cam.x / v.cam.mpp * 0.0 - v.gt * 2) % (W * 1.6) + W * 1.6) % (W * 1.6) - W * 0.3;
    const y = hy - 2 - l.w * 5;
    const a = 0.35 + 0.35 * Math.sin(v.gt * 0.9 + l.ph);
    c.fillStyle = l.col < 0.7 ? `rgba(255,206,150,${a})` : `rgba(200,230,255,${a})`;
    c.fillRect(x, y, l.s * 1.6, l.s);
  }
  drawRunways(c, v, hy);
}

/** runways: the departure strip around x 0, the arrival strip around XD (edge lights, centreline) */
function drawRunways(c, v, hy) {
  const mpp = v.cam.mpp;
  for (const [a, b] of [[-260, 900], [D - 600, XD + 600]]) {
    const sx0 = v.wx(a), sx1 = v.wx(b);
    if (sx1 < -50 || sx0 > W + 50) continue;
    // surface (near side, a shallow band) — at least 3 px thick
    const th = Math.max(3, 2.2 / mpp);
    const rg = c.createLinearGradient(0, hy, 0, hy + th);
    rg.addColorStop(0, 'rgb(46,46,54)'); rg.addColorStop(1, 'rgb(26,27,33)');
    c.fillStyle = rg; c.fillRect(Math.max(-10, sx0), hy, Math.min(W + 10, sx1) - Math.max(-10, sx0), th);
    if (mpp < 0.6) {
      // centreline dashes (30 m on, 20 m off) and edge lights every 15 m
      c.fillStyle = 'rgba(235,235,230,0.55)';
      const yC = hy + 0.9 / mpp, dh = Math.max(1.5, 0.12 / mpp);
      const i0 = Math.floor((v.cam.x - W * mpp) / 50), i1 = Math.ceil((v.cam.x + W * mpp) / 50);
      for (let i = i0; i <= i1; i++) { const x = i * 50; if (x < a || x > b) continue; c.fillRect(v.wx(x), yC - dh / 2, 30 / mpp, dh); }
      const j0 = Math.floor((v.cam.x - W * mpp) / 15), j1 = Math.ceil((v.cam.x + W * mpp) / 15);
      for (let j = j0; j <= j1; j++) {
        const x = j * 15; if (x < a || x > b) continue;
        const sx = v.wx(x);
        for (const [yy, col] of [[0.05, [255, 236, 200]], [2.1, [255, 226, 180]]]) {
          const sy = hy + yy / mpp, r = Math.max(1.6, 0.09 / mpp);
          const cap = 1 - 0.88 * L.smoothstep(L.prog(sy, 1330, 40)) * (1 - L.smoothstep(L.prog(sy, 1540, 40)));   // dim under the captions
          c.fillStyle = L.rgba(col, 0.95 * cap); c.beginPath(); c.arc(sx, sy, r, 0, TAU); c.fill();
          L.lightBlob(c, sx, sy, r * 5, col, 0.22 * cap);
        }
      }
    } else {
      // far out: the strip reads as a fine lit line
      c.fillStyle = 'rgba(255,226,180,0.55)'; c.fillRect(sx0, hy, sx1 - sx0, 1.5);
    }
  }
}

export function drawForeground(c, v) {
  sync(v.tl);
  const P = planeAt(v.gt, v.tl);
  const lenPx = PLANE.len / v.cam.mpp;
  const cut = L.smoothstep(L.clamp((lenPx - 220) / 180));
  // cull: off screen
  const sx = v.wx(P.x), sy = v.wy(P.y), half = Math.max(lenPx, 70) * 0.7;
  if (sx + half < -50 || sx - half > W + 50 || sy + half < -50 || sy - half > H + 50) return;
  const ev = evacState(v.gt, v.tl);
  const smoke = smokeK(v.gt, v.tl);
  // a soft glow around the profile icon (reads as the aircraft on the chart)
  if (lenPx < 140) L.lightBlob(c, sx, sy - 10, 70, [255, 220, 170], 0.28);
  // a soft reflection on the wet apron (close views, aircraft on the ground)
  if (!P.flying && v.cam.mpp < 0.2 && v.cam.mpp > 0.022) {
    const gy = v.wy(0);
    c.save();
    c.beginPath(); c.rect(0, gy + 1, W, H - gy); c.clip();
    c.globalAlpha = 0.16;
    c.translate(0, 2 * gy); c.scale(1, -1);
    drawPlane(c, v, P, { cut, smoke, evac: null, shadow: false });
    c.restore();
    const rg = c.createLinearGradient(0, gy, 0, gy + 360);
    rg.addColorStop(0, 'rgba(10,11,15,0)'); rg.addColorStop(1, 'rgba(10,11,15,0.85)');
    c.fillStyle = rg; c.fillRect(0, gy + 1, W, 360);
  }
  drawPlane(c, v, P, { cut, smoke, evac: ev.on ? ev : null });
  if (ev.on || smoke > 0) {
    c.save();
    const m = toLocal(c, v, P, planeScale(v));
    const lw = (px) => px * m;
    if (smoke > 0.002) drawSmoke(c, v, smoke, lw);
    if (ev.on) {
      drawSlides(c, ev.slide, lw);
      const r = Math.max(0.2, 5.6 * m), pl = PLANE;   // ≥ 11 px dots
      for (const d of evacDots(v.gt, v.tl)) {
        if (d.a <= 0.01) continue;
        // inside the hull but outside the cut-away (the last steps to a door): hidden by the skin, except in the doorway
        if (d.y < -2.2 && (d.x < pl.cab0 || d.x > pl.cab1) && !EXITS.some((e) => Math.abs(d.x - e.x) < e.w / 2)) continue;
        c.fillStyle = `rgba(20,22,28,${0.8 * d.a})`;
        c.beginPath(); c.arc(d.x, d.y, r + 1.6 * m, 0, TAU); c.fill();
        c.fillStyle = `rgba(255,232,190,${d.a})`;
        c.beginPath(); c.arc(d.x, d.y, r, 0, TAU); c.fill();
      }
    }
    c.restore();
  }
}

// ------------------------------------------------------------------ smoke (beat 2): fills the cabin from the ceiling down
const PUFFS = (() => { const r = L.rng(2929); return Array.from({ length: 70 }, () => ({ x: r(), y: r(), s: 0.6 + r() * 0.9, sp: 0.15 + r() * 0.3, ph: r() * 6.28 })); })();
function drawSmoke(c, v, k, lw) {
  const p = PLANE, x0 = p.cab0, x1 = p.cab1;
  c.save();
  L.roundRect(c, x0, p.ceil - 0.2, x1 - x0, p.floor - p.ceil + 0.4, 0.22); c.clip();
  // the layer descends from the ceiling: its lower edge goes down to ≈ 0.55 m above the floor
  const edge = L.lerp(p.ceil, p.floor - 0.55, L.ease.outCubic(k));
  const g = c.createLinearGradient(0, p.ceil - 0.2, 0, edge + 0.35);
  g.addColorStop(0, `rgba(96,98,104,${0.94 * k})`); g.addColorStop(0.7, `rgba(110,112,118,${0.82 * k})`); g.addColorStop(1, 'rgba(120,122,128,0)');
  c.fillStyle = g; c.fillRect(x0, p.ceil - 0.2, x1 - x0, edge + 0.35 - (p.ceil - 0.2));
  // rolling puffs along the lower edge
  for (const q of PUFFS) {
    const x = x0 + ((q.x * (x1 - x0) + v.gt * q.sp) % (x1 - x0));
    const y = L.lerp(p.ceil, edge, 0.55 + 0.45 * q.y) + Math.sin(v.gt * 0.8 + q.ph) * 0.05;
    const r = q.s * 0.55;
    const pg = c.createRadialGradient(x, y, 0, x, y, r);
    pg.addColorStop(0, `rgba(128,130,136,${0.38 * k})`); pg.addColorStop(1, 'rgba(128,130,136,0)');
    c.fillStyle = pg; c.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  c.restore();
  // the floor-path lights and EXIT signs glow through (re-drawn over the smoke, dimmed by the haze)
  for (let x = x0 + 0.2; x < x1; x += 0.42) {
    if (GALLEYS.some(([a, b]) => x > a && x < b)) continue;
    c.fillStyle = `rgba(255,240,210,${0.9 * k})`;
    c.fillRect(x - 0.07, p.floor - 0.07, 0.14, 0.045);
  }
  for (const e of EXITS) {
    if (e.x < x0 || e.x > x1) continue;
    c.save(); c.globalAlpha *= 0.85 * k; exitSign(c, e.x, -4.2, lw, 1.6); c.restore();
  }
}

// ------------------------------------------------------------------ glyphs
/** a carry-on roller bag (front-on), height s, current fill/stroke; bg = the colour behind it (rib knock-outs) */
export function glyphBag(c, s, bg = 'rgb(246,244,238)') {
  const w = s * 0.56, h = s * 0.62, y0 = -s * 0.2;
  c.save();
  c.lineWidth = s * 0.075; c.lineJoin = 'round'; c.lineCap = 'round';
  // telescopic handle
  c.beginPath(); c.moveTo(-w * 0.2, y0); c.lineTo(-w * 0.2, -s * 0.45); c.lineTo(w * 0.2, -s * 0.45); c.lineTo(w * 0.2, y0); c.stroke();
  // body
  L.roundRect(c, -w / 2, y0, w, h, s * 0.08); c.fill();
  // ribs
  const fs = c.fillStyle;
  c.fillStyle = bg;
  c.fillRect(-w * 0.2 - s * 0.022, y0 + h * 0.16, s * 0.044, h * 0.68);
  c.fillRect(w * 0.2 - s * 0.022, y0 + h * 0.16, s * 0.044, h * 0.68);
  c.fillStyle = fs;
  // wheels
  c.beginPath(); c.arc(-w * 0.3, y0 + h + s * 0.05, Math.max(0, s * 0.05), 0, TAU); c.fill();
  c.beginPath(); c.arc(w * 0.3, y0 + h + s * 0.05, Math.max(0, s * 0.05), 0, TAU); c.fill();
  c.restore();
}
// ------------------------------------------------------------------ STEP badge (How to Survive series system, ep 27)
export const BADGE = { x: 64, y: 372, h: 104 };
export const SUB_Y = 490;                           // the sub chip's top (ep 27)
/**
 * STEP badge: a civil-defence yellow tile ("STEP" + big numeral) joined to a black plate with the instruction in white,
 * a fine yellow keyline and a hazard-stripe foot. Screen space. Returns its box {x, y, w, h} (null when k ≤ 0).
 *   n     step number (1…)        text   'LEAVE EARLY' (upper case recommended)
 *   opts  x, y (top-left; align 'center' → x is the centre) · k 0..1 (staged entrance: tile pops 0–0.6, plate wipes
 *         0.25–1; pass an eased in/out value) · size (1 = 104 px tall) · maxW (whole badge, default 940 − x) ·
 *         accent (tile colour, default CD.yellow) · dim (0..1 grey-out) · sub (string or stepSub parts: the series sub
 *         chip, enters with subK, default follows the plate) · subK · subCol (sub text colour)
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
  if (sub) stepSub(c, sub, opts.subK ?? kp, { bar: accent, col: opts.subCol, x: x });
  c.restore();
  return { x, y, w, h };
}

/**
 * The series sub line (ep 27 stepSub): an opaque chip under the slot card. Screen space. Returns its box (null when k ≤ 0).
 *   parts  a string, or an array of { t: 'TEXT', col?: [r,g,b] } and { sw: (c, x, cy) => widthPx } (a drawn swatch)
 *   k      0..1 entrance (fades + settles 8 px down)
 *   opts   bar (accent bar colour, default CD.yellow) · col (text colour) · x (64) · y (top, SUB_Y) · size (26)
 */
export function stepSub(c, parts, k, opts = {}) {
  if (k <= 0) return null;
  const { bar = CD.yellow, col = [226, 228, 234], x = BADGE.x, y = SUB_Y, size = 26 } = opts;
  const P = typeof parts === 'string' ? [{ t: parts }] : parts;
  const h = Math.round(size * 1.77), padL = 22, padR = 20, track = 3;
  c.save();
  c.globalAlpha *= L.clamp(k);
  c.font = L.font(size, 700, L.FONT.body);
  c.letterSpacing = `${track}px`;
  const ws = P.map((p) => (p.sw ? null : c.measureText(p.t).width));
  c.letterSpacing = '0px';
  let w = padL + padR - track;
  P.forEach((p, i) => { w += p.sw ? 0 : ws[i]; });
  const swW = P.map((p) => (p.sw ? p.sw(null, 0, 0) : 0));
  w += swW.reduce((a, b) => a + b, 0);
  const yy = y + (1 - L.clamp(k)) * -8;
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 16; c.shadowOffsetY = 4;
  c.fillStyle = L.rgba(CD.black, 0.93);
  L.roundRect(c, x, yy, w, h, 9); c.fill();
  c.shadowColor = 'transparent';
  c.fillStyle = L.rgba(bar);
  c.fillRect(x, yy + 10, 4, h - 20);
  c.textBaseline = 'middle';
  c.textAlign = 'left';
  let cx = x + padL;
  P.forEach((p, i) => {
    if (p.sw) { p.sw(c, cx, yy + h / 2); cx += swW[i]; return; }
    c.font = L.font(size, 700, L.FONT.body);
    c.letterSpacing = `${track}px`;
    c.fillStyle = L.rgba(p.col ?? col, 0.96);
    c.fillText(p.t, cx, yy + h / 2 + 1);
    c.letterSpacing = '0px';
    cx += ws[i];
  });
  c.restore();
  return { x, y: yy, w, h };
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
/** smartphone seen front-on, with a record dot low-left on the screen (off the prohibition slash's diagonal), height s */
export function glyphPhone(c, s) {
  const w = s * 0.52, h = s;
  c.save();
  c.lineWidth = s * 0.08; c.lineJoin = 'round';
  L.roundRect(c, -w / 2, -h / 2, w, h, s * 0.1); c.stroke();
  c.fillRect(-w * 0.16, -h / 2 + s * 0.07, w * 0.32, s * 0.035);
  c.beginPath(); c.arc(-s * 0.1, s * 0.28, Math.max(0, s * 0.085), 0, TAU); c.fill();
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
export const INK = [246, 244, 238];
/** draw at ground point (x, y), standing height s px. opts: ink, gap (card colour = knock-out), shadow (contact shadow 0..1),
 *  ground (rule 0..1), hi: { nArm, fArm } yellow tint 0..1 on the forearms · afterTorso(c, P, J): drawn over the torso,
 *  under the head and near arm. Everything opaque: fade the whole figure with picLayer, never limb by limb. */
export function drawPicto(c, x, y, s, pose, { ink = INK, gap = CARD_BG, shadow = 1, ground = 1, hi = null, afterTorso = null, armBehindHead = false } = {}) {
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


// ------------------------------------------------------------------ seated poses (this episode)
// Seated in an aircraft seat (figure units, facing LEFT = the aircraft's nose on the card; scenes mirror to face right):
// hip joint just above the cushion (cushion top y −0.265), feet on the floor.
//   seat:  upright, belt-ready, hands resting on the thighs, feet forward
//   brace: FAA alternative brace with a seat in front — torso bent ≈ 50° forward from the hips (back slightly rounded),
//          the head bowed forward-down and resting against the BACK of the seat in front (its rear surface at x −0.475
//          for a 0.62 pitch, the head centre at y ≈ −0.41, ≈ mid-height of that seat back), both forearms crossed over
//          the back of the head (hands at the nape, elbows down/forward beside the face — the far arm hidden behind the
//          near one), feet flat on the floor slightly behind the knees. neck −205 (≡ 155°) so the seat → brace blend
//          swings the head FORWARD (−90 → −205), never back through 0°; asg stays −1 (no elbow flip).
Object.assign(POSE, {
  seat: { hx: 0, hy: -0.29, torso: -88, bend: 0.02, neck: -90, face: 180, nAx: -0.275, nAy: -0.042, fAx: -0.275, fAy: -0.042, nFoot: 180, fFoot: 180, nHx: -0.17, nHy: 0.25, fHx: -0.17, fHy: 0.25, over: 0, asg: -1, ksg: 1, legKO: 0, ox: 0 },
  brace: { hx: 0, hy: -0.29, torso: -140, bend: 0.07, neck: -205, face: 70, nAx: -0.17, nAy: -0.042, fAx: -0.17, fAy: -0.042, nFoot: 180, fFoot: 180, nHx: -0.122, nHy: 0.000, fHx: -0.122, fHy: 0.000, over: 0, asg: -1, ksg: 1, legKO: 0, ox: 0 },
});
export const SEAT_PITCH = 0.62;
/** a card seat in figure units (facing LEFT), x = its seat back's front surface. ink colours on the card */
export function cardSeat(c, X, Y, s, x, { col = [66, 72, 92], head = [150, 156, 172], edge = [96, 104, 128], alpha = 1 } = {}) {
  const P = (u, w) => [X + u * s, Y + w * s];
  c.save();
  c.globalAlpha *= alpha;
  c.lineJoin = 'round';
  // legs + base rail
  c.fillStyle = L.rgba(L.mix(col, [20, 22, 28], 0.25));
  c.fillRect(...P(x - 0.2, -0.17), 0.026 * s, 0.17 * s);
  c.fillRect(...P(x + 0.02, -0.17), 0.026 * s, 0.17 * s);
  c.fillRect(...P(x - 0.26, -0.018), 0.33 * s, 0.018 * s);
  // seat back (upright for landing) + headrest
  c.fillStyle = L.rgba(col);
  L.roundRect(c, ...P(x, -0.72), 0.07 * s, 0.55 * s, 0.022 * s); c.fill();
  c.fillStyle = L.rgba(head);
  L.roundRect(c, ...P(x - 0.006, -0.8), 0.082 * s, 0.13 * s, 0.03 * s); c.fill();
  // cushion
  c.fillStyle = L.rgba(L.mix(col, [255, 255, 255], 0.06));
  L.roundRect(c, ...P(x - 0.3, -0.23), 0.36 * s, 0.065 * s, 0.025 * s); c.fill();
  // armrest
  c.fillStyle = L.rgba(edge);
  L.roundRect(c, ...P(x - 0.2, -0.34), 0.2 * s, 0.022 * s, 0.01 * s); c.fill();
  c.fillRect(...P(x - 0.03, -0.325), 0.018 * s, 0.1 * s);
  c.restore();
}

// ------------------------------------------------------------------ HUD
export function drawHud(c, v) {
  sync(v.tl);
  const sg = c.createLinearGradient(0, 0, 0, 360);   // a soft scrim keeps the top bar readable over the sky
  sg.addColorStop(0, 'rgba(4,6,12,0.62)'); sg.addColorStop(0.6, 'rgba(4,6,12,0.3)'); sg.addColorStop(1, 'rgba(4,6,12,0)');
  c.fillStyle = sg; c.fillRect(0, 0, W, 360);
  {
    const label = `${v.ep.channel}  ·  ${v.ep.episodeLabel ?? v.ep.title.toUpperCase()}`;
    let px = 20, tw = 0;
    for (; px > 14; px--) { c.font = L.font(px, 600, L.FONT.body); c.letterSpacing = '4px'; tw = c.measureText(label).width; c.letterSpacing = '0px'; if (tw <= W - 2 * 64 - 170) break; }
    c.fillStyle = 'rgba(4,6,12,0.72)';
    L.roundRect(c, 64 - 16, 160 - 21, tw + 28, 42, 21); c.fill();
  }
  topBar(c, v, ACCENT, [236, 232, 224]);
}

export const cues = (tl) => (sync(tl), [
  ...beatCues(tl, { gain: 0.15, pitch: 0.9 }),
]);

/** onset (film s) of word wi in phrase pj of line li — the same weighting as the engine's captions (spoken length) */
export function wordTime(tl, li, pj, wi) {
  const ph = tl.lines[li].phrases[pj];
  if (ph.words?.[wi]) return ph.words[wi][0];   // the voice alignment's real word onsets
  const words = ph.text.toUpperCase().split(/\s+/);
  const spokenLen = (w) => {
    const d = (w.match(/\d/g) || []).join('');
    if (!d) return w.replace(/\W/g, '').length;
    const core = d.replace(/0{3,}$/, ''), z = d.length - core.length;
    return core.length * 4 + (z >= 3 ? 8 : 0) + (w.includes('%') ? 7 : 0);
  };
  const wts = words.map((w) => spokenLen(w) + 1.5 + (/[,.?!:]$/.test(w) ? 3 : 0));
  const tot = wts.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < Math.min(wi, words.length); i++) acc += wts[i];
  return ph.start + (ph.end - ph.start) * acc / tot;
}
