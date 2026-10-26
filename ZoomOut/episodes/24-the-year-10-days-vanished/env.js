// Environment for "The Year 10 Days Vanished" (EP 24). Owned by the orchestrator — builders: read, don't edit.
//
// LOOK: "orrery + manuscript". Deep navy ground with a fine paper grain, faint engraved astrolabe rings (screen space,
// they turn slowly and breathe with the zoom), parchment-gold engraving lines, Baskerville serif for period lettering.
//
// WHAT ENV DRAWS (world, under every scene):
//   • the ORBIT (true scale, see camera.js): the ring, engraved tick tiers along it (days → hours → minutes, faded in
//     by on-screen spacing), the outer month ring with month names (far views only), the Sun, the spring-equinox
//     radial line + "SPRING EQUINOX" label, and the two EARTHS:
//       REAL EARTH      always AT the equinox (it defines it). Real-coastline globe (earth.js) when ≥ ~8 px radius,
//                       half-lit by the Sun (equinox terminator through both poles), else a pale-blue dot marker.
//       CALENDAR EARTH  where Earth really is when the CALENDAR says "March 21": driftU(v) units PAST the equinox
//                       (to the LEFT on screen). A gold-rimmed ghost globe up close, a gold ring marker far out.
//     In beat 3 there is only one Earth, lapping the Sun 4 times (lapPhi).
//   • NOTHING of the desk: the calendar pages, coin, grid, map are drawn by scenes (helpers below).
// HUD: topBar + a drift readout (top right, y 250–340) in the orbit beats: big "11 MIN" / "1 DAY" / "10 DAYS",
//   small "YEAR AD 1582".
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, topBar } from '../../../engine/runtime/kit.js';
import { drawEarth, warm } from '../../../engine/runtime/earth.js';
import {
  R_ORB, KM_PER_U, R_EARTH_U, R_SUN_U, TROPICAL, JULIAN, GREGORIAN, ERR_JUL, ERR_GREG, U_PER_DAY, G1, D1, D10, DRIFT_1582,
  SUN, EQX, orbitPos, arcPos, PAGE_W, PAGE_H, P_OCT, P_COIN, P_LEAP, P_FEB, P_UK, P_SEP, MPP, EARTH_SY, SUN_SY,
  SHOTS, at as camAt, shotAt, shotStart,
} from './camera.js';
warm();

export {
  R_ORB, KM_PER_U, R_EARTH_U, R_SUN_U, TROPICAL, JULIAN, GREGORIAN, ERR_JUL, ERR_GREG, U_PER_DAY, G1, D1, D10, DRIFT_1582,
  SUN, EQX, orbitPos, arcPos, PAGE_W, PAGE_H, P_OCT, P_COIN, P_LEAP, P_FEB, P_UK, P_SEP, MPP, EARTH_SY, SUN_SY, shotAt, shotStart,
};

const { W, H } = L;
const TAU = Math.PI * 2;
export const ACCENT = [230, 190, 110];                 // parchment gold
export const NAVY = [9, 15, 32];
export const NAVY_HI = [18, 28, 54];
export const PARCH = [236, 222, 190];                  // parchment paper
export const PARCH_DK = [196, 174, 132];               // aged paper edge
export const INKC = [52, 36, 22];                       // iron-gall ink (brown-black) for printing on parchment
export const RUBRIC = [150, 38, 30];                    // red "rubric" ink (period calendars print feast days in red)
export const EARTH_BLUE = [150, 200, 255];
export const SERIF = '"Baskerville", "Big Caslon", "Hoefler Text", Georgia, serif';
/** Period serif font string: serif(48) / serif(48, 700) / serif(30, 400, 'italic'). */
export const serif = (size, weight = 600, style = '') => `${style} ${weight} ${size}px ${SERIF}`.trim();
if (typeof document !== 'undefined') {
  await Promise.all([serif(40, 400), serif(40, 600), serif(40, 700), serif(40, 400, 'italic')].map((f) => document.fonts.load(f).catch(() => null)));
}

const lg = Math.log;
/** 0→1 as x goes from a to b (log scale, smoothstep). Use for every LOD crossfade (mpp or pixel sizes). */
export const band = (x, a, b) => L.smoothstep(L.clamp(L.invLerp(lg(a), lg(b), lg(Math.max(1e-12, x)))));
/** Desk props (pages, coin, grid, map) are only legible near mpp ≈ 1: multiply their alpha by this; skip when 0. */
export const deskK = (v) => 1 - band(v.cam.mpp, 1.6, 2.6);

// ------------------------------------------------------------------ story state (pure functions of time)
const S = (tl, i) => tl.scenes[i].start;
/** Beat 3: the single Earth laps the Sun 4 times (one per year; leap day on the 4th), ending at the equinox. */
export const LAPS = { n: 4, t0: 0.9, dur: 4.4 };
export function lapPhi(gt, tl) {
  const t = gt - S(tl, 3);
  return TAU * LAPS.n * L.ease.inOutCubic(L.prog(t, LAPS.t0, LAPS.dur));
}
/** Which lap (1..4) the beat-3 Earth is on, and the fraction through it. */
export function lapAt(gt, tl) {
  const f = lapPhi(gt, tl) / TAU;
  return { lap: Math.min(LAPS.n, Math.floor(f) + 1), frac: f - Math.floor(f), total: f };
}

// gap (px on screen) kept constant-ish while the camera pulls out (beats 6–7): drift = GAP × mpp, clamped
const GAP6 = G1 / (MPP.close * 0.975);   // beat 6 starts from the close-up's held mpp
const GAP7 = D1 / MPP.day;
/**
 * The calendar's slip along the orbit at film time gt.
 *   {u: arc units past the equinox, days, year (AD), mode: 'none'|'julian'|'gregorian', show: calendar Earth visible}
 * Julian (beats 4–7): counted from AD 325 (Council of Nicaea, when the church fixed the equinox on March 21).
 *   beat 4: 0 → 11 min 15 s as the dive lands · beat 5: holds · beat 6: → 1 day (AD 453) · beat 7: → 9.8 days (AD 1582).
 * Gregorian (beat 12 onward): from AD 1582, 26.8 s a year → 1 day by ≈ AD 4,800.
 */
export function driftAt(gt, tl) {
  const b4 = S(tl, 4), b6 = S(tl, 6), b7 = S(tl, 7), b8 = S(tl, 8), b12 = S(tl, 12);
  if (gt < b4) return { u: 0, days: 0, year: 325, mode: 'none', show: false };
  if (gt < b8 + 2.5) {
    let u;
    if (gt < b6) u = G1 * L.ease.inOutCubic(L.prog(gt, b4 + 1.1, 1.0));
    else if (gt >= b8) u = D10;   // the camera zooms back in: the slip stays at 10 days
    else {
      const mpp = camAt(gt, tl).mpp;
      u = gt < b7 ? L.clamp(GAP6 * mpp, G1, D1) : L.clamp(GAP7 * mpp, D1, D10);
    }
    const days = u / U_PER_DAY;
    return { u, days, year: 325 + Math.max(1, Math.round(days / ERR_JUL)), mode: 'julian', show: u > 1e-4 };
  }
  if (gt < b12) return { u: 0, days: 0, year: 1582, mode: 'gregorian', show: false };
  const k = L.ease.inOutCubic(L.prog(gt, b12 + 2.75, 1.8));   // during the dive to the equinox
  const years = k * (1 / ERR_GREG);                     // 0 → 3,226 years
  const days = years * ERR_GREG;
  return { u: days * U_PER_DAY, days, year: 1582 + years, mode: 'gregorian', show: k > 0 };
}
export const drift = (v) => driftAt(v.gt, v.tl);

/** Format a drift in days for labels: "11 MIN", "6 HOURS", "1 DAY", "10 DAYS". */
export function fmtDrift(days) {
  const min = days * 1440;
  if (min < 59.5) return `${Math.max(1, Math.round(min))} MIN`;
  if (days < 0.98) return `${Math.round(days * 24)} HOURS`;
  if (days < 1.5) return '1 DAY';
  return `${Math.round(days)} DAYS`;
}
/** Year label: "AD 1582" (Gregorian counts above 2000 rounded to the hundred while spinning). */
export function fmtYear(y, round = 1) {
  return `AD ${L.fmt(Math.round(y / round) * round)}`;
}

// ------------------------------------------------------------------ background: navy, grain, engraved rings
let GRAIN = null;
function grainTile() {
  if (GRAIN) return GRAIN;
  const n = 384, g = new OffscreenCanvas(n, n), gc = g.getContext('2d');
  const img = gc.createImageData(n, n), r = L.rng(2401);
  for (let i = 0; i < n * n; i++) {
    const fib = r() < 0.012 ? 60 : 0;                  // sparse paper fibres
    const v = 128 + (r() + r() - 1) * 70 + fib;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  gc.putImageData(img, 0, 0);
  GRAIN = g;
  return g;
}

function engravedRings(c, v) {
  // a faint astrolabe in screen space: concentric rings with graduations, turning slowly and breathing with the zoom
  const z = lg(v.cam.mpp);
  const cx = W * 0.5 + L.noise1(v.gt * 0.05, 3) * 20, cy = H * 0.47;
  const rot = v.gt * 0.012 + z * 0.08;
  const breathe = Math.exp(((z * 0.35) % 1 + 1) % 1 * 0.18);
  c.save();
  c.translate(cx, cy);
  c.strokeStyle = L.rgba(ACCENT, 0.055);
  c.lineWidth = 1;
  const RINGS = [260, 330, 470, 610, 640, 820, 1010];
  for (const r0 of RINGS) {
    const r = r0 * breathe;
    c.beginPath(); c.arc(0, 0, Math.max(0, r), 0, TAU); c.stroke();
  }
  // graduations on two rings
  for (const [r0, n, len] of [[470, 120, 10], [640, 360, 6], [1010, 72, 16]]) {
    const r = r0 * breathe;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const a = rot * (r0 === 640 ? -1 : 1) + (i / n) * TAU, l = i % 5 === 0 ? len * 1.8 : len;
      c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      c.lineTo(Math.cos(a) * (r - l), Math.sin(a) * (r - l));
    }
    c.stroke();
  }
  // a few engraved spokes
  c.strokeStyle = L.rgba(ACCENT, 0.035);
  c.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = rot * 0.5 + (i / 12) * TAU;
    c.moveTo(Math.cos(a) * 330 * breathe, Math.sin(a) * 330 * breathe);
    c.lineTo(Math.cos(a) * 1010 * breathe, Math.sin(a) * 1010 * breathe);
  }
  c.stroke();
  c.restore();
}

export function drawBackground(c, v) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, L.rgba(NAVY));
  g.addColorStop(0.55, L.rgba(L.mix(NAVY, NAVY_HI, 0.6)));
  g.addColorStop(1, L.rgba(NAVY));
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // paper grain: drifts with the camera (very slight parallax)
  c.save();
  c.globalCompositeOperation = 'overlay';
  c.globalAlpha = 0.09;
  const pat = c.createPattern(grainTile(), 'repeat');
  const ox = ((-(v.cam.x / v.cam.mpp) * 0.05) % 384 + 384) % 384, oy = ((-(v.cam.y / v.cam.mpp) * 0.05) % 384 + 384) % 384;
  c.translate(ox - 384, oy - 384);
  c.fillStyle = pat;
  c.fillRect(0, 0, W + 768, H + 768);
  c.restore();
  engravedRings(c, v);
  drawOrbit(c, v);
}

// ------------------------------------------------------------------ the orbit (world space, true scale)
/** Angle range of the orbit that is on screen: null if none. */
function visibleArc(v) {
  const cx = v.cam.x, cy = v.cam.y - (H * (v.cam.anchor ?? 0.5) - H / 2) * v.cam.mpp;   // world point at the screen centre
  const h = Math.hypot(W, H) * 0.5 * v.cam.mpp * 1.05;
  const d = Math.hypot(cx, cy);
  if (Math.abs(d - R_ORB) > h) return null;
  if (d < h || h > R_ORB * 0.7) return [-Math.PI, Math.PI];
  const phc = Math.atan2(-cx, -cy);
  const dl = Math.min(Math.PI, (h / R_ORB) * 1.6);
  return [phc - dl, phc + dl];
}
/** Screen point at orbit angle phi (+ px outward offset `out`). */
export function orbitScreen(v, phi, out = 0) {
  const p = orbitPos(phi), s = Math.hypot(p.x, p.y);
  return { x: v.wx(p.x) + (p.x / s) * out, y: v.wy(p.y) + (p.y / s) * out };
}
/** Screen point `u` arc units past the equinox. */
export const arcScreen = (v, u, out = 0) => orbitScreen(v, u / R_ORB, out);

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const EQX_DOY = 79.5;   // day-of-year of the equinox (≈ March 20/21) — day 0 on the ring
const doyPhi = (doy) => ((doy - EQX_DOY) / TROPICAL) * TAU;

function drawOrbit(c, v) {
  const span = visibleArc(v);
  const mpp = v.cam.mpp;
  if (span) {
    const [a0, a1] = span;
    // the ring: engraved double line (the outer hairline only at orbit scale)
    c.save();
    c.lineCap = 'round';
    const N = 260;
    const ringPath = (out) => {
      c.beginPath();
      for (let i = 0; i <= N; i++) {
        const p = orbitScreen(v, L.lerp(a0, a1, i / N), out);
        if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y);
      }
    };
    c.strokeStyle = L.rgba(ACCENT, 0.55);
    c.lineWidth = 1.6;
    ringPath(0); c.stroke();
    const farK = band(mpp, 5, 14);
    if (farK > 0) {
      c.strokeStyle = L.rgba(ACCENT, 0.18 * farK);
      c.lineWidth = 1;
      ringPath(10); c.stroke();
      ringPath(-10); c.stroke();
    }
    // engraved tick tiers: days, hours, minutes (each fades in by its on-screen spacing)
    const tiers = [
      { u: U_PER_DAY, len: 16, a: 0.6, w: 1.4 },
      { u: U_PER_DAY / 24, len: 9, a: 0.45, w: 1.1 },
      { u: U_PER_DAY / 1440, len: 7, a: 0.5, w: 1.1 },
    ];
    for (const t of tiers) {
      const px = t.u / mpp;
      const k = band(px, 5, 14);
      if (k <= 0) continue;
      const dphi = t.u / R_ORB;
      const i0 = Math.ceil(a0 / dphi), i1 = Math.floor(a1 / dphi);
      if (i1 - i0 > 1400) continue;
      c.strokeStyle = L.rgba(ACCENT, t.a * k);
      c.lineWidth = t.w;
      c.beginPath();
      for (let i = i0; i <= i1; i++) {
        const big = t === tiers[2] ? i % 10 === 0 : t === tiers[1] ? i % 6 === 0 : i % 7 === 0;
        const l = t.len * (big ? 1.6 : 1);
        const p = orbitScreen(v, i * dphi, l), q = orbitScreen(v, i * dphi, -l * 0.4);
        if ((p.x < -40 && q.x < -40) || (p.x > W + 40 && q.x > W + 40) || (p.y < -40 && q.y < -40) || (p.y > H + 40 && q.y > H + 40)) continue;
        c.moveTo(p.x, p.y); c.lineTo(q.x, q.y);
      }
      c.stroke();
    }
    // outer month ring (far views): month boundaries + names, engraved
    const mk = band(mpp, 7, 16);
    if (mk > 0) {
      c.strokeStyle = L.rgba(ACCENT, 0.22 * mk);
      c.lineWidth = 1;
      ringPath(34); c.stroke();
      ringPath(62); c.stroke();
      c.fillStyle = L.rgba(ACCENT, 0.55 * mk);
      c.font = serif(19, 600);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      let doy = 0;
      for (let m = 0; m < 12; m++) {
        const ph = doyPhi(doy);
        const p = orbitScreen(v, ph, 34), q = orbitScreen(v, ph, 62);
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke();
        const mid = doyPhi(doy + MDAYS[m] / 2), t = orbitScreen(v, mid, 48);
        c.save();
        c.translate(t.x, t.y);
        let ang = -mid;                                  // tangent to the ring
        if (Math.cos(mid) < 0) ang += Math.PI;           // keep lettering upright on the lower half
        c.rotate(ang);
        L.trackedText(c, MONTHS[m], 0, 0, 3, 'center');
        c.restore();
        doy += MDAYS[m];
      }
    }
    // spring-equinox radial (Sun → E, engraved, dashed) and its label
    const eq = orbitScreen(v, 0), sun = { x: v.wx(0), y: v.wy(0) };
    const er = R_EARTH_U / mpp;
    c.setLineDash([6, 7]);
    c.strokeStyle = L.rgba(ACCENT, 0.5);
    c.lineWidth = 1.4;
    c.beginPath();
    const dirx = (eq.x - sun.x), diry = (eq.y - sun.y), dl = Math.hypot(dirx, diry) || 1;
    const ext = Math.max(70, er + 60);
    const from = Math.min(dl, 900);   // only the last 900 px toward the Sun (keeps huge coordinates sane)
    c.moveTo(eq.x - (dirx / dl) * from, eq.y - (diry / dl) * from);
    c.lineTo(eq.x + (dirx / dl) * ext, eq.y + (diry / dl) * ext);
    c.stroke();
    c.setLineDash([]);
    if (eq.x > -200 && eq.x < W + 200 && eq.y > -200 && eq.y < H + 200) {
      const ly = eq.y - ext - 18;
      c.font = serif(26, 600);
      c.fillStyle = L.rgba(ACCENT, 0.9);
      c.textAlign = 'center';
      c.textBaseline = 'alphabetic';
      c.shadowColor = 'rgba(4,8,18,0.9)';
      c.shadowBlur = 10;
      L.trackedText(c, 'SPRING EQUINOX', eq.x, ly, 4, 'center');
      c.shadowBlur = 0;
    }
    c.restore();
  }
  // the Sun (true radius 41.9 u; never smaller than a 16 px glow)
  const sx = v.wx(SUN.x), sy = v.wy(SUN.y), sr = Math.max(9, R_SUN_U / mpp);
  if (sx > -sr * 6 && sx < W + sr * 6 && sy > -sr * 6 && sy < H + sr * 6) {
    L.lightBlob(c, sx, sy, sr * 7, [255, 196, 110], 0.5);
    c.save();
    const g = c.createRadialGradient(sx, sy, 0, sx, sy, sr);
    g.addColorStop(0, 'rgb(255,248,220)');
    g.addColorStop(0.7, 'rgb(255,214,130)');
    g.addColorStop(1, 'rgb(240,170,80)');
    c.fillStyle = g;
    c.beginPath(); c.arc(sx, sy, Math.max(0, sr), 0, TAU); c.fill();
    c.restore();
  }
  drawEarths(c, v);
}

// ------------------------------------------------------------------ the Earths
/** Draw one Earth at orbit angle phi. kind 'real' | 'cal'. */
export function drawEarthAt(c, v, phi, kind = 'real', alpha = 1) {
  if (alpha <= 0) return;
  const p = orbitPos(phi), sx = v.wx(p.x), sy = v.wy(p.y), r = R_EARTH_U / v.cam.mpp;
  const pad = Math.max(40, r * 1.3);
  if (sx < -pad || sx > W + pad || sy < -pad || sy > H + pad) return;
  const gk = band(r, 4, 12);   // 0 = marker, 1 = real globe
  const cal = kind === 'cal';
  c.save();
  if (gk > 0) {
    const d = Math.hypot(p.x, p.y);
    // sun direction in earth.js screen space (x right, y UP, z to viewer): toward the Sun at (0, 0)
    const sun = [-p.x / d, p.y / d, 0.04];
    drawEarth(c, {
      cx: sx, cy: sy, r, lat0: 66.56, lon0: -40 + v.gt * 6, tilt: 90, style: 'day', sun,
      atmosphere: 0.55, alpha: alpha * gk * (cal ? 0.42 : 1), maxPixels: 7e5,
    });
    if (cal) {   // the calendar's Earth: an engraved gold rim (double ring) + tick crown
      c.globalAlpha = alpha * gk;
      c.strokeStyle = L.rgba(ACCENT, 0.95);
      c.lineWidth = 3;
      c.beginPath(); c.arc(sx, sy, Math.max(0, r + 8), 0, TAU); c.stroke();
      c.lineWidth = 1.2;
      c.beginPath(); c.arc(sx, sy, Math.max(0, r + 16), 0, TAU); c.stroke();
      c.beginPath();
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * TAU, l = i % 4 === 0 ? 9 : 4;
        c.moveTo(sx + Math.cos(a) * (r + 16), sy + Math.sin(a) * (r + 16));
        c.lineTo(sx + Math.cos(a) * (r + 16 + l), sy + Math.sin(a) * (r + 16 + l));
      }
      c.stroke();
    }
  }
  const mk = 1 - gk;
  if (mk > 0) {
    c.globalAlpha = alpha * mk;
    if (cal) {
      L.lightBlob(c, sx, sy, 34, ACCENT, 0.35);
      c.strokeStyle = L.rgba(ACCENT);
      c.lineWidth = 3;
      c.beginPath(); c.arc(sx, sy, 12, 0, TAU); c.stroke();
      c.fillStyle = L.rgba(ACCENT);
      c.beginPath(); c.arc(sx, sy, 4.5, 0, TAU); c.fill();
    } else {
      L.lightBlob(c, sx, sy, 36, EARTH_BLUE, 0.45);
      c.fillStyle = 'rgb(205,228,255)';
      c.beginPath(); c.arc(sx, sy, 8, 0, TAU); c.fill();
      c.fillStyle = 'rgb(60,120,200)';               // night half (away from the Sun)
      const a = Math.atan2(v.wy(0) - sy, v.wx(0) - sx);
      c.beginPath(); c.arc(sx, sy, 8, a + Math.PI / 2, a + Math.PI * 1.5); c.fill();
    }
  }
  c.restore();
}

function drawEarths(c, v) {
  const tl = v.tl, gt = v.gt;
  if (gt >= S(tl, 3) && gt < S(tl, 4)) {         // beat 3: one Earth lapping the Sun
    drawEarthAt(c, v, lapPhi(gt, tl), 'real');
    return;
  }
  const d = drift(v);
  if (d.show) drawEarthAt(c, v, d.u / R_ORB, 'cal');
  drawEarthAt(c, v, 0, 'real');
}

export function drawForeground() {}

// ------------------------------------------------------------------ calendar-page helpers (for scenes)
export const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
/**
 * World-space layout of a month page centred at P (w × h u). Header band on top, a weekday row, then a rows × 7 grid.
 * Returns {x0, y0, x1, y1, gx0, gy0, cw, ch, headY, wdY, cell(r, c) → {x, y} (cell centre, world)}.
 */
export function pageLayout(P, w = PAGE_W, h = PAGE_H, rows = 5, head = 0.25) {
  const x0 = P.x - w / 2, y0 = P.y - h / 2;
  const mx = w * 0.055;
  const cw = (w - 2 * mx) / 7;
  const headH = h * head, wdH = h * 0.065;
  const gy0 = y0 + headH + wdH;
  const ch = (h - headH - wdH - h * 0.08) / rows;
  return {
    x0, y0, x1: x0 + w, y1: y0 + h, gx0: x0 + mx, gy0, cw, ch, rows,
    headY: y0 + headH * 0.5, wdY: y0 + headH + wdH * 0.55,
    cell: (r, col) => ({ x: x0 + mx + cw * (col + 0.5), y: gy0 + ch * (r + 0.5) }),
  };
}
/** Parchment sheet in screen space: aged gradient, soft deckled edge, drop shadow, engraved double rule. */
export function paper(c, x, y, w, h, { alpha = 1, seed = 1, rule = true, shadow = true } = {}) {
  if (alpha <= 0 || w <= 1 || h <= 1) return;
  c.save();
  c.globalAlpha *= alpha;
  const s = Math.min(w, h);
  const edge = (i, n) => L.noise1(i * 0.9, seed) * s * 0.006;
  c.beginPath();
  const n = 28;
  for (let i = 0; i <= n; i++) c.lineTo(x + (w * i) / n, y + edge(i, n));
  for (let i = 0; i <= n; i++) c.lineTo(x + w + edge(i + 50, n), y + (h * i) / n);
  for (let i = n; i >= 0; i--) c.lineTo(x + (w * i) / n, y + h + edge(i + 100, n));
  for (let i = n; i >= 0; i--) c.lineTo(x + edge(i + 150, n), y + (h * i) / n);
  c.closePath();
  if (shadow) { c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = s * 0.05; c.shadowOffsetY = s * 0.015; }
  const g = c.createRadialGradient(x + w * 0.45, y + h * 0.4, s * 0.1, x + w / 2, y + h / 2, Math.hypot(w, h) * 0.6);
  g.addColorStop(0, L.rgba(L.mix(PARCH, [250, 242, 222], 0.4)));
  g.addColorStop(0.7, L.rgba(PARCH));
  g.addColorStop(1, L.rgba(PARCH_DK));
  c.fillStyle = g;
  c.fill();
  c.shadowColor = 'transparent';
  if (rule) {
    const m = s * 0.03;
    c.strokeStyle = L.rgba(INKC, 0.55);
    c.lineWidth = Math.max(0.6, s * 0.0035);
    c.strokeRect(x + m, y + m, w - 2 * m, h - 2 * m);
    c.lineWidth = Math.max(0.4, s * 0.0015);
    c.strokeRect(x + m * 1.45, y + m * 1.45, w - 2.9 * m, h - 2.9 * m);
  }
  c.restore();
}
/**
 * A printed month page in WORLD space (uses v.wx/v.ws). spec:
 *   P, w, h, rows · title ('OCTOBER') · sub ('MDLXXXII · 1582') · days: [{d, r, col, color?, alpha?}] ·
 *   skip(d) → true to leave a day for the caller to draw (torn cells etc.) · alpha · seed · weekdays (WEEKDAYS)
 * Returns the layout (pageLayout) so callers can place extra marks.
 */
export function drawMonthPage(c, v, spec) {
  const { P, w = PAGE_W, h = PAGE_H, rows = 5, alpha = 1, seed = 3 } = spec;
  const lay = pageLayout(P, w, h, rows, spec.head ?? 0.25);
  if (alpha <= 0) return lay;
  const s = 1 / v.cam.mpp;
  const X = v.wx(lay.x0), Y = v.wy(lay.y0);
  if (X > W + 50 || Y > H + 50 || X + w * s < -50 || Y + h * s < -50) return lay;
  paper(c, X, Y, w * s, h * s, { alpha, seed });
  c.save();
  c.globalAlpha *= alpha;
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  // header: month in large caps, a fleuron rule, the year line
  if (spec.title) {
    c.fillStyle = L.rgba(INKC);
    c.font = serif(Math.max(1, w * 0.105 * s), 600);
    L.trackedText(c, spec.title, v.wx(P.x), v.wy(lay.headY) + w * 0.01 * s, w * 0.012 * s, 'center');
  }
  if (spec.sub) {
    c.fillStyle = L.rgba(RUBRIC);
    c.font = serif(Math.max(1, w * 0.04 * s), 600, 'italic');
    L.trackedText(c, spec.sub, v.wx(P.x), v.wy(lay.headY) + w * 0.075 * s, w * 0.004 * s, 'center');
  }
  // weekday row + rules
  c.font = serif(Math.max(1, w * 0.03 * s), 700);
  (spec.weekdays ?? WEEKDAYS).forEach((d, i) => {
    c.fillStyle = L.rgba(i === 0 ? RUBRIC : INKC, 0.9);
    L.trackedText(c, d, v.wx(lay.cell(0, i).x), v.wy(lay.wdY) + w * 0.012 * s, w * 0.003 * s, 'center');
  });
  c.strokeStyle = L.rgba(INKC, 0.5);
  c.lineWidth = Math.max(0.5, w * 0.0018 * s);
  c.beginPath();
  for (let r = 0; r <= rows; r++) {
    const y = v.wy(lay.gy0 + r * lay.ch);
    c.moveTo(v.wx(lay.gx0), y); c.lineTo(v.wx(lay.gx0 + 7 * lay.cw), y);
  }
  for (let i = 0; i <= 7; i++) {
    const x = v.wx(lay.gx0 + i * lay.cw);
    c.moveTo(x, v.wy(lay.gy0)); c.lineTo(x, v.wy(lay.gy0 + rows * lay.ch));
  }
  c.stroke();
  // days
  for (const dd of spec.days ?? []) {
    if (spec.skip?.(dd.d)) continue;
    const p = lay.cell(dd.r, dd.col);
    dayNumeral(c, v.wx(p.x), v.wy(p.y), lay.ch * s, dd.d, { color: dd.color ?? (dd.col === 0 ? RUBRIC : INKC), alpha: dd.alpha ?? 1 });
  }
  c.restore();
  return lay;
}
/** One printed day numeral centred at screen (x, y); cellPx = cell height in px. */
export function dayNumeral(c, x, y, cellPx, d, { color = INKC, alpha = 1, scale = 1 } = {}) {
  if (alpha <= 0) return;
  c.save();
  c.globalAlpha *= alpha;
  c.fillStyle = L.rgba(color);
  c.font = serif(Math.max(1, cellPx * 0.48 * scale), 600);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(String(d), x, y + cellPx * 0.03);
  c.restore();
}
/** Days of a month as grid entries: n days, first weekday col0 (0 = Sunday). [{d, r, col}] */
export function monthDays(n, col0, list = null) {
  const out = [];
  const ds = list ?? Array.from({ length: n }, (_, i) => i + 1);
  ds.forEach((d, i) => { const k = col0 + i; out.push({ d, r: Math.floor(k / 7), col: k % 7 }); });
  return out;
}
/** October 1582. Oct 1 was a Monday (col 1). JULIAN = all 31 days in place; GREGORIAN = 1–4 then 15–31 (15 = Friday). */
export const OCT_JULIAN = monthDays(31, 1);
export const OCT_GREGORIAN = monthDays(0, 1, [1, 2, 3, 4, ...Array.from({ length: 17 }, (_, i) => 15 + i)]);
/** September 1752 in Britain: Sep 1 was a Tuesday (col 2); 1, 2, then 14–30 (14 = Thursday). */
export const SEP_1752 = monthDays(0, 2, [1, 2, ...Array.from({ length: 17 }, (_, i) => 14 + i)]);

// ------------------------------------------------------------------ HUD
function readout(c, big, small, k) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha = k;
  c.textAlign = 'right';
  c.shadowColor = 'rgba(2,6,14,0.8)';
  c.shadowBlur = 14;
  c.font = L.font(L.fitSize(c, big, 400, 64, 700, L.FONT.din, 30), 700, L.FONT.din);
  c.fillStyle = L.rgba(ACCENT);
  c.fillText(big, W - 64, 302);
  c.font = L.font(L.fitSize(c, small, 420, 22, 600, L.FONT.body, 14), 600, L.FONT.body);
  c.fillStyle = 'rgba(232,226,210,0.9)';
  L.trackedText(c, small, W - 64, 336, 2.5, 'right');
  c.restore();
}

export function drawHud(c, v) {
  topBar(c, v, ACCENT, [236, 228, 210]);
  const tl = v.tl, gt = v.gt;
  // Julian drift: once the close-up lands in beat 4, until the camera leaves for the page in beat 8
  const kJ = L.ease.outCubic(L.prog(gt, S(tl, 4) + 1.3, 0.5)) * (1 - L.ease.inCubic(L.prog(gt, S(tl, 8) + 0.1, 0.4)));
  // Gregorian drift: beat 12 once the camera has settled, until the home move
  const kG = L.ease.outCubic(L.prog(gt, S(tl, 12) + 1.3, 0.5)) * (1 - L.ease.inCubic(L.prog(gt, S(tl, 13) + 0.05, 0.35)));
  const d = drift(v);
  if (kJ > 0 && d.mode === 'julian') readout(c, `DRIFT ${fmtDrift(Math.max(d.days, 0.0001))}`, `JULIAN CALENDAR · YEAR ${fmtYear(d.year)}`, kJ);
  if (kG > 0 && d.mode === 'gregorian') {
    const big = d.days < 0.004 ? 'DRIFT 0' : `DRIFT ${fmtDrift(d.days)}`;
    readout(c, big, `GREGORIAN CALENDAR · YEAR ${fmtYear(d.year, d.year > 1600 ? 100 : 1)}`, kG);
  }
}

export const cues = (tl) => [
  ...beatCues(tl, { gain: 0.18, pitch: 0.95 }),
  { t: tl.scenes[4].start + 0.1, name: 'dive', gain: 0.3, pitch: 0.9 },
  { t: tl.scenes[12].start + 0.1, name: 'swell', gain: 0.22, pitch: 0.9 },
];
