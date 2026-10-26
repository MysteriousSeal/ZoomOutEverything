// Beat 10 — "So how small is a black hole with the Sun's mass?"
// THE DIVE: the camera zooms straight into SUN (seven orders of magnitude). On the way down it passes two TRUE-SIZE
// ghost rings centred on the hole: the Sun's old disc (R☉, warm) and an Earth-sized disc (R⊕, cool wireframe).
// Each ring carries a tag (title + one small line) with a leader to its rim; the camera holds at each scale and the
// tags are latched to those holds (>= 1.5 s each). A slow reticle marks the target
// (the hole, still a point) and a tunnel of dust streaks outward with the zoom speed. No label at the end of the
// beat: the answer is next.
import * as L from '../../../../engine/runtime/lib.js';
import { at as camAt, R_EARTH, R_SUN, RS, SUN } from '../camera.js';
import { ACCENT } from '../env.js';

const TAU = Math.PI * 2;
const SUN_COL = [255, 222, 178], EARTH_COL = [150, 200, 255];
const G0 = 39.6, G1 = 44.6;                  // global gate of the ghost rings
const TAG_X = 96, TAG_Y = 486;               // tag anchor (upper-left)

/** Visibility window by screen radius: in over [a, b] px, out over [c, d] px. */
const win = (r, a, b, c, d) => L.smoothstep(L.invLerp(a, b, r)) * (1 - L.smoothstep(L.invLerp(c, d, r)));

/** Zoom rate (ln of scale per second, > 0 = zooming in) from the camera itself (pure). */
function zoomRate(v) {
  const h = 0.03;
  const a = camAt(v.gt - h, v.tl).mpp, b = camAt(v.gt + h, v.tl).mpp;
  return Math.log(a / b) / (2 * h);
}

// ------------------------------------------------------------------ ghost rings (world, true size)
function sunGhost(c, v, cx, cy, r, k) {
  c.save();
  // a faint memory of the disc: limb-brightened, so it reads as a sphere's outline
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, L.rgba(SUN_COL, 0.05 * k));
  g.addColorStop(0.82, L.rgba(SUN_COL, 0.08 * k));
  g.addColorStop(1, L.rgba(SUN_COL, 0.2 * k));
  c.fillStyle = g;
  c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.fill();
  c.globalCompositeOperation = 'lighter';
  const og = c.createRadialGradient(cx, cy, r, cx, cy, r * 1.18);
  og.addColorStop(0, L.rgba([255, 200, 140], 0.18 * k)); og.addColorStop(1, 'rgba(255,200,140,0)');
  c.fillStyle = og;
  c.beginPath(); c.arc(cx, cy, r * 1.18, 0, TAU); c.arc(cx, cy, Math.max(0, r), 0, TAU, true); c.fill();
  // rim + a light sweep travelling around it
  c.strokeStyle = L.rgba(SUN_COL, 0.75 * k);
  c.lineWidth = 2;
  c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.stroke();
  const sw = v.gt * 1.6;
  for (let i = 0; i < 10; i++) {
    c.strokeStyle = L.rgba([255, 244, 226], k * 0.7 * (1 - i / 10));
    c.lineWidth = 3;
    c.beginPath(); c.arc(cx, cy, Math.max(0, r), sw - (i + 1) * 0.05, sw - i * 0.05); c.stroke();
  }
  // outer ticks every 5°, slowly turning (instrument feel)
  c.strokeStyle = L.rgba(SUN_COL, 0.32 * k);
  c.lineWidth = 1.2;
  c.beginPath();
  const rot = v.gt * 0.04;
  for (let i = 0; i < 72; i++) {
    const a = rot + (i / 72) * TAU, l = i % 6 === 0 ? 11 : 5;
    c.moveTo(cx + Math.cos(a) * (r + 6), cy + Math.sin(a) * (r + 6));
    c.lineTo(cx + Math.cos(a) * (r + 6 + l), cy + Math.sin(a) * (r + 6 + l));
  }
  c.stroke();
  c.restore();
}

function earthGhost(c, v, cx, cy, r, k) {
  c.save();
  const g = c.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  g.addColorStop(0, L.rgba(EARTH_COL, 0.1 * k)); g.addColorStop(1, L.rgba(EARTH_COL, 0.04 * k));
  c.fillStyle = g;
  c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.fill();
  // a fine graticule: parallels and slowly turning meridians
  c.save();
  c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.clip();
  c.strokeStyle = L.rgba(EARTH_COL, 0.2 * k);
  c.lineWidth = 1;
  c.beginPath();
  for (let i = -2; i <= 2; i++) {
    const s = Math.sin((i * Math.PI) / 6.5), y = cy + s * r, hw = Math.sqrt(Math.max(0, 1 - s * s)) * r;
    c.moveTo(cx - hw, y); c.lineTo(cx + hw, y);
  }
  c.stroke();
  const spin = v.gt * 0.35;
  for (let i = 0; i < 6; i++) {
    const lon = spin + (i / 6) * Math.PI;
    const rx = Math.abs(Math.cos(lon)) * r;
    const front = Math.sin(lon) > 0;
    c.strokeStyle = L.rgba(EARTH_COL, (front ? 0.24 : 0.1) * k);
    c.beginPath(); c.ellipse(cx, cy, Math.max(0, rx), Math.max(0, r), 0, 0, TAU); c.stroke();
  }
  c.restore();
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = L.rgba(EARTH_COL, 0.85 * k);
  c.lineWidth = 2;
  c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.stroke();
  L.lightBlob(c, cx, cy, r * 1.25, [90, 150, 255], 0.06 * k);
  c.restore();
}

// ------------------------------------------------------------------ the dust tunnel (screen space, driven by zoom)
const DUST = (() => { const r = L.rng(1010); return Array.from({ length: 70 }, () => ({ a: r() * TAU, u: r(), s: 0.6 + r() * 1.4 })); })();
function dust(c, v, rate) {
  const kr = L.smoothstep(L.invLerp(1.2, 5, rate));
  if (kr <= 0.01) return;
  const cx = v.wx(SUN.x), cy = v.wy(SUN.y);
  const zl = Math.log(1 / v.cam.mpp);            // grows as we zoom in
  const R0 = 30, R1 = 1300, span = Math.log(R1 / R0);
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  for (const p of DUST) {
    const u = (((p.u + zl / 2.2) % 1) + 1) % 1;   // each mote slides outward and wraps (endless tunnel)
    const rho = R0 * Math.exp(u * span);
    const len = Math.min(rho * 0.6, rho * (Math.exp(rate * 0.035) - 1));
    const a = kr * 0.3 * Math.sin(Math.PI * u) * Math.min(1, rho / 220);
    const x0 = cx + Math.cos(p.a) * rho, y0 = cy + Math.sin(p.a) * rho;
    c.strokeStyle = L.rgba([214, 206, 255], a);
    c.lineWidth = p.s;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 - Math.cos(p.a) * len, y0 - Math.sin(p.a) * len); c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------------ tags (screen space)
function tag(c, rimX, rimY, title, sub, col, k, lk = 1) {
  if (k <= 0.002) return;
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  c.globalAlpha = L.clamp(k * 1.3);
  // backing
  // 16c (ported from the 16b audit): a feathered elliptical pool of shadow (the blurred round-rect showed a hard box
  // edge once the growing ghost disc slid under the tag)
  c.save();
  c.translate(TAG_X + 205, TAG_Y - 10);
  c.scale(1, 0.4);
  const bg = c.createRadialGradient(0, 0, 0, 0, 0, 330);
  bg.addColorStop(0, `rgba(3,5,12,${0.6 * k})`); bg.addColorStop(0.55, `rgba(3,5,12,${0.5 * k})`); bg.addColorStop(1, 'rgba(3,5,12,0)');
  c.fillStyle = bg;
  c.fillRect(-330, -330, 660, 660);
  c.restore();
  // leader: underline, then a diagonal to the rim
  const ux1 = TAG_X + 300, uy = TAG_Y + 46;
  c.strokeStyle = L.rgba(col, 0.75);
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(TAG_X, uy); c.lineTo(L.lerp(TAG_X, ux1, e), uy);
  c.stroke();
  // the diagonal follows the rim, and fades once the rim has grown off past the tag
  const ek = L.ease.outCubic(L.clamp(k * 1.6 - 0.6));
  if (ek > 0 && lk > 0.002) {
    c.strokeStyle = L.rgba(col, 0.75 * lk);
    c.beginPath(); c.moveTo(ux1, uy); c.lineTo(L.lerp(ux1, rimX, ek), L.lerp(uy, rimY, ek)); c.stroke();
    if (ek > 0.98) { c.fillStyle = L.rgba(col, 0.95 * lk); c.beginPath(); c.arc(rimX, rimY, 4.5, 0, TAU); c.fill(); }
  }
  // text
  c.shadowColor = 'rgba(0,0,0,0.6)';
  c.shadowBlur = 12;
  c.textBaseline = 'alphabetic';
  c.font = L.font(58, 800, L.FONT.display);
  c.fillStyle = L.rgba(L.mix(col, [255, 255, 255], 0.55));
  L.trackedText(c, title, TAG_X, TAG_Y + (1 - e) * 16, 1);
  c.font = L.font(24, 600, L.FONT.body);
  c.fillStyle = 'rgba(205,215,230,0.92)';
  L.trackedText(c, sub, TAG_X, TAG_Y + 34 + (1 - e) * 10, 3);
  c.restore();
}

// tags are LATCHED IN TIME (global s): each enters as its ring reaches ~75 px on the camera's stepped dive and holds
// >= 1.5 s in screen space while the ring keeps growing; the leader follows the rim and fades as the rim leaves.
const SUN_TAG = [40.25, 41.62], EARTH_TAG = [41.85, 43.12];
const tagK = (gt, [a, b]) => L.ease.outCubic(L.prog(gt, a, 0.35)) * (1 - L.ease.inCubic(L.prog(gt, b, 0.25)));
const leadK = (r) => L.smoothstep(L.invLerp(6, 20, r)) * (1 - L.smoothstep(L.invLerp(420, 700, r)));
const RIM_A = -2.3;                               // rim point for the leaders (upper-left)

export default {
  beat: 10,
  chapter: { num: '10', title: 'How small?', sub: 'one Sun of mass, crushed' },
  captions: true,
  layer: 0,
  cues() {
    return [
      { t: 0.0, name: 'dive', gain: 0.34, pitch: 0.9 },
      { t: 0.45, name: 'shimmer', gain: 0.2, pitch: 0.9 },     // the Sun-scale hold
      { t: 2.05, name: 'ping', gain: 0.2, pitch: 1.25 },       // the Earth-scale hold
      { t: 2.8, name: 'riser', gain: 0.18, pitch: 0.85 },      // the final dive onto the horizon
    ];
  },
  drawWorld(c, v) {
    if (v.gt < G0 || v.gt > G1) return;
    const gate = L.prog(v.gt, G0, 0.4) * (1 - L.prog(v.gt, G1 - 0.5, 0.5));
    const cx = v.wx(SUN.x), cy = v.wy(SUN.y);
    dust(c, v, zoomRate(v));
    const rs = v.ws(R_SUN), re = v.ws(R_EARTH);
    const ks = gate * win(rs, 4, 30, 900, 1500);
    if (ks > 0.002) sunGhost(c, v, cx, cy, rs, ks);
    const ke = gate * win(re, 4, 30, 900, 1500);
    if (ke > 0.002) earthGhost(c, v, cx, cy, re, ke);
  },
  drawOverlay(c, v) {
    const cx = v.wx(SUN.x), cy = v.wy(SUN.y);
    const kOut = 1 - L.ease.inCubic(L.prog(v.t, v.d - 0.25, 0.35));
    // the target reticle: four brackets that close in and turn a quarter, while the hole is still a point
    const kr = v.k * kOut * L.enter(v.t, 0.15, 0.6) * (1 - L.smoothstep(L.invLerp(10, 30, v.ws(RS))));
    if (kr > 0.002) {
      const s = L.lerp(120, 44, L.ease.outCubic(L.prog(v.t, 0.15, 1.4))) + 3 * Math.sin(v.gt * 3);
      // a quarter turn that SETTLES square (0 rad), so the brackets rest as frame corners, not chevrons
      const rot = -(Math.PI / 2) * (1 - L.ease.inOutCubic(L.prog(v.t, 0.15, 1.4)));
      c.save();
      c.translate(cx, cy); c.rotate(rot);
      c.strokeStyle = L.rgba(L.mix(ACCENT, [255, 255, 255], 0.3), 0.85 * kr);
      c.lineWidth = 2;
      c.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        c.rotate(Math.PI / 2);
        c.beginPath(); c.moveTo(s, s - 22); c.lineTo(s, s); c.lineTo(s - 22, s); c.stroke();
      }
      c.restore();
    }
    // tags on the ghost rings
    const rs = v.ws(R_SUN), re = v.ws(R_EARTH);
    const k1 = tagK(v.gt, SUN_TAG);
    if (k1 > 0.002) tag(c, cx + Math.cos(RIM_A) * rs, cy + Math.sin(RIM_A) * rs, 'THE SUN', '1.4 MILLION KM ACROSS', SUN_COL, k1, leadK(rs));
    const k2 = tagK(v.gt, EARTH_TAG);
    if (k2 > 0.002) tag(c, cx + Math.cos(RIM_A) * re, cy + Math.sin(RIM_A) * re, 'EARTH', '12,742 KM ACROSS', EARTH_COL, k2, leadK(re));
  },
};
