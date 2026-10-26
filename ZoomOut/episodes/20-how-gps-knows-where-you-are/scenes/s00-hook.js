// Beat 0 — "How does your phone know exactly where you are?"
// The phone at true size (7.5 × 15.5 cm, PHONE in camera.js), screen facing us: a refined dark night map of Midtown
// (the Manhattan grid rotated 29°, Broadway cutting across it, a park block, building footprints, road-name
// shapes, POI pins), a status bar, map buttons and a bottom sheet. The blue dot drops in with a halo pulse; its
// accuracy circle tightens as the fix locks. Masked headline HOW DOES GPS KNOW / WHERE YOU ARE? above the phone.
//
// The phone is PERSISTENT world: this scene draws it every frame wherever it is on screen (beats 8 and 18 come back
// to it) with LOD down to a glowing speck at street scale. Its map dot follows driftAt (beat 17-18).
//
// SHARED (import, do not copy):
//   drawPhone(ctx, v, { dotX, alpha })   draw the phone at PHONE (world space). dotX = the dot's eastward error in
//                                       metres (default driftAt). This scene already draws it every frame: call it
//                                       only for a second copy (e.g. an inset).
//   MAP_SPAN                            metres of city across the phone screen's width (the map scale)
//   phoneDotScreen(v, dotX)             screen {x, y, r} of the map's blue dot (r = its radius in px)
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, DOT, PHONE, driftAt } from '../env.js';

const { W } = L;
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

// ------------------------------------------------------------------ geometry (metres, phone-local, y down)
const PW = PHONE.w, PH = PHONE.h, PR = 0.0118;                 // body
const BZ = 0.0027;                                              // bezel
const SW = PW - 2 * BZ, SH = PH - 2 * BZ, SR = 0.0093;          // screen
/** Metres of city across the screen width. */
export const MAP_SPAN = 420;
const MK = SW / MAP_SPAN;                                       // phone metres per map metre
const GRID = 29 * DEG;                                          // Manhattan's grid, rotated from true north
const BWAY = 16.5 * DEG;                                       // Broadway, relative to the avenues

// the map is authored in "grid" coordinates: x across the avenues (east +), y along them (south +), metres
const AVES = [-560, -280, 0, 280, 560];                         // 9th, 8th, 7th, 6th, 5th Ave; the dot sits on 7th
const STREET_STEP = 80;
const PARK = { x0: 296, x1: 544, y0: 250, y1: 404 };             // a park block (between 6th & 5th, three streets south)

// building footprints: each block split into deterministic lots
const LOTS = (() => {
  const r = L.rng(2001), out = [];
  for (let a = 0; a < AVES.length - 1; a++) {
    for (let s = -8; s < 8; s++) {
      const x0 = AVES[a] + 15, x1 = AVES[a + 1] - 15, y0 = s * STREET_STEP + 9, y1 = (s + 1) * STREET_STEP - 9;
      if (x0 >= PARK.x0 - 20 && x1 <= PARK.x1 + 20 && y0 >= PARK.y0 - 20 && y1 <= PARK.y1 + 20) continue;
      let x = x0;
      while (x < x1 - 6) {
        const w = Math.min(x1 - x, 18 + r() * 46);
        const split = r() > 0.45;
        if (split) {
          const m = L.lerp(y0, y1, 0.35 + r() * 0.3);
          out.push([x + 1.2, y0 + 1.2, w - 2.4, m - y0 - 2.4, r()]);
          out.push([x + 1.2, m + 1.2, w - 2.4, y1 - m - 2.4, r()]);
        } else out.push([x + 1.2, y0 + 1.2, w - 2.4, y1 - y0 - 2.4, r()]);
        x += w;
      }
    }
  }
  return out;
})();
// POI pins (grid coords) and road-name shapes
const POIS = [[132, -118, [255, 150, 70]], [-178, 72, [190, 120, 255]], [372, -205, [255, 110, 130]], [-96, -262, [90, 200, 220]], [210, 152, [255, 150, 70]]];

// ------------------------------------------------------------------ the map
function drawMap(c, v, dotX, t) {
  // background: blocks; roads drawn on top
  c.fillStyle = 'rgb(17,21,31)';
  c.fillRect(-SW / 2, -SH / 2, SW, SH);
  c.save();
  c.scale(MK, MK);
  c.rotate(GRID);
  const detail = v.ws(PH) > 260;
  // building footprints (slightly lighter than the block, varied)
  if (detail) {
    for (const [x, y, w, h, s] of LOTS) {
      c.fillStyle = `rgb(${24 + s * 7 | 0},${29 + s * 8 | 0},${42 + s * 9 | 0})`;
      c.fillRect(x, y, w, h);
    }
  }
  // park
  c.fillStyle = 'rgb(20,44,36)';
  L.roundRect(c, PARK.x0, PARK.y0, PARK.x1 - PARK.x0, PARK.y1 - PARK.y0, 6); c.fill();
  if (detail) {
    c.strokeStyle = 'rgba(70,120,90,0.35)'; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(PARK.x0 + 20, (PARK.y0 + PARK.y1) / 2); c.lineTo(PARK.x1 - 20, (PARK.y0 + PARK.y1) / 2);
    c.moveTo((PARK.x0 + PARK.x1) / 2, PARK.y0 + 16); c.lineTo((PARK.x0 + PARK.x1) / 2, PARK.y1 - 16); c.stroke();
  }
  // streets (narrow), avenues (wide), Broadway (major, warm)
  c.lineCap = 'butt';
  c.strokeStyle = 'rgb(40,47,62)'; c.lineWidth = 15;
  c.beginPath();
  for (let s = -8; s <= 8; s++) { c.moveTo(-760, s * STREET_STEP); c.lineTo(760, s * STREET_STEP); }
  c.stroke();
  c.strokeStyle = 'rgb(52,61,80)'; c.lineWidth = 26;
  c.beginPath();
  for (const a of AVES) { c.moveTo(a, -760); c.lineTo(a, 760); }
  c.stroke();
  const bx = Math.sin(BWAY), by = Math.cos(BWAY);
  c.strokeStyle = 'rgb(96,86,64)'; c.lineWidth = 30;
  c.beginPath(); c.moveTo(-bx * 900, -by * 900); c.lineTo(bx * 900, by * 900); c.stroke();
  c.strokeStyle = 'rgb(150,128,82)'; c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(-bx * 900, -by * 900); c.lineTo(bx * 900, by * 900); c.stroke();
  // the plaza where Broadway crosses 7th Ave (the bow-tie), lighter paving
  c.fillStyle = 'rgba(120,128,150,0.16)';
  c.beginPath(); c.moveTo(-12, -150); c.lineTo(22, -150); c.lineTo(10, 150); c.lineTo(-22, 150); c.closePath(); c.fill();
  // road-name shapes (rounded pale bars along the roads)
  if (detail) {
    c.fillStyle = 'rgba(170,180,200,0.28)';
    for (const a of AVES) for (const yy of [-300, 180]) { L.roundRect(c, a - 3.2, yy + (a % 3) * 12, 6.4, 58, 3.2); c.fill(); }
    for (const s of [-5, -2, 3, 6]) { L.roundRect(c, 60 + s * 9, s * STREET_STEP - 2.6, 44, 5.2, 2.6); c.fill(); }
  }
  c.restore();
  // POI pins (screen-upright)
  if (detail) {
    for (const [gx, gy, col] of POIS) {
      const x = (gx * Math.cos(GRID) - gy * Math.sin(GRID)) * MK, y = (gx * Math.sin(GRID) + gy * Math.cos(GRID)) * MK;
      const r = 0.0019;
      c.fillStyle = L.rgba(col, 0.9);
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.beginPath(); c.arc(x, y, r * 0.38, 0, TAU); c.fill();
    }
  }
  // the blue dot: accuracy circle (tightens as the fix locks), heading cone, halo pulses, the dot
  const dx = L.clamp(dotX * MK, -SW / 2 + 0.006, SW / 2 - 0.006), dy = 0;
  // the dot is already there (pulsing) on frame 0, then settles with a small bounce as the fix locks
  const land = 0.8 + 0.2 * L.ease.outBack(L.prog(t, 0.05, 0.42), 2.4);
  const lock = L.ease.inOutCubic(L.prog(t, 0.5, 1.3));
  if (land > 0) {
    const acc = L.lerp(0.0175, 0.0062, lock) * L.clamp(land);
    const ag = c.createRadialGradient(dx, dy, 0, dx, dy, Math.max(0, acc));
    ag.addColorStop(0, L.rgba(DOT, 0.06)); ag.addColorStop(0.85, L.rgba(DOT, 0.16)); ag.addColorStop(1, L.rgba(DOT, 0.2));
    c.fillStyle = ag;
    c.beginPath(); c.arc(dx, dy, Math.max(0, acc), 0, TAU); c.fill();
    c.strokeStyle = L.rgba(DOT, 0.45); c.lineWidth = 0.00022;
    c.stroke();
    // heading cone (where the phone points: up the avenue)
    const hk = L.ease.outCubic(L.prog(t, 1.2, 0.8)), ha = GRID - Math.PI / 2 + 0.06 * L.noise1(v.gt * 0.4, 5);
    if (hk > 0) {
      const R = 0.0115 * hk;
      const cg = c.createRadialGradient(dx, dy, 0, dx, dy, R);
      cg.addColorStop(0, L.rgba(DOT, 0.55)); cg.addColorStop(1, L.rgba(DOT, 0));
      c.fillStyle = cg;
      c.beginPath(); c.moveTo(dx, dy); c.arc(dx, dy, R, ha - 0.42, ha + 0.42); c.closePath(); c.fill();
    }
    // landing ring + slow breathing halo
    const ring = L.prog(t, 0.08, 0.9);
    if (ring > 0 && ring < 1) {
      c.strokeStyle = L.rgba(DOT, 0.7 * (1 - ring)); c.lineWidth = 0.0006 * (1 - ring) + 0.0002;
      c.beginPath(); c.arc(dx, dy, Math.max(0, 0.003 + 0.016 * L.ease.outCubic(ring)), 0, TAU); c.stroke();
    }
    const ph = ((v.gt + 0.9) % 2.2 + 2.2) % 2.2 / 2.2;
    {
      c.fillStyle = L.rgba(DOT, 0.28 * (1 - ph) * land);
      c.beginPath(); c.arc(dx, dy, Math.max(0, 0.0032 + 0.0065 * L.ease.outCubic(ph)), 0, TAU); c.fill();
    }
    const r = 0.0021 * land;
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = Math.max(0, v.ws(0.0012)); c.shadowOffsetY = v.ws(0.0003);
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(dx, dy, Math.max(0, r * 1.36), 0, TAU); c.fill();
    c.restore();
    const dg = c.createRadialGradient(dx - r * 0.3, dy - r * 0.3, 0, dx, dy, Math.max(1e-6, r));
    dg.addColorStop(0, 'rgb(110,180,255)'); dg.addColorStop(1, L.rgba(DOT));
    c.fillStyle = dg;
    c.beginPath(); c.arc(dx, dy, Math.max(0, r), 0, TAU); c.fill();
  }
}

// ------------------------------------------------------------------ UI chrome (status bar, buttons, sheet)
/** Text inside the metre-scaled phone space, rasterised at its true pixel size (tiny fractional fonts render badly). */
function mtext(c, v, s, x, y, sizeM, weight) {
  const m = v.cam.mpp;
  c.save();
  c.translate(x, y);
  c.scale(m, m);
  c.font = L.font(sizeM / m, weight, L.FONT.body);
  c.fillText(s, 0, 0);
  c.restore();
}
function drawChrome(c, v) {
  const top = -SH / 2, bot = SH / 2, lft = -SW / 2, rgt = SW / 2;
  // a soft dark fade under the status bar
  const sg = c.createLinearGradient(0, top, 0, top + 0.016);
  sg.addColorStop(0, 'rgba(8,10,16,0.85)'); sg.addColorStop(1, 'rgba(8,10,16,0)');
  c.fillStyle = sg; c.fillRect(lft, top, SW, 0.016);
  // status bar: time, signal, battery
  c.fillStyle = 'rgba(240,244,250,0.95)';
  c.textBaseline = 'middle'; c.textAlign = 'center';
  mtext(c, v, '9:41', lft + 0.0105, top + 0.0062, 0.0034, 600);
  for (let i = 0; i < 4; i++) { const h = 0.0011 + i * 0.0006; c.fillRect(rgt - 0.0172 + i * 0.0012, top + 0.0074 - h, 0.0008, h); }
  c.strokeStyle = 'rgba(240,244,250,0.6)'; c.lineWidth = 0.00025;
  L.roundRect(c, rgt - 0.0105, top + 0.0049, 0.0052, 0.0026, 0.0007); c.stroke();
  L.roundRect(c, rgt - 0.0101, top + 0.0053, 0.0034, 0.0018, 0.0004); c.fill();
  // dynamic island
  c.fillStyle = '#000';
  L.roundRect(c, -0.0062, top + 0.0042, 0.0124, 0.0036, 0.0018); c.fill();
  // map buttons (top right): layers + locate (filled arrow = locked)
  const bx = rgt - 0.0078, by = top + 0.0152;
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = Math.max(0, v.ws(0.002));
  c.fillStyle = 'rgba(30,34,44,0.94)';
  L.roundRect(c, bx - 0.0042, by, 0.0084, 0.0168, 0.0016); c.fill();
  c.restore();
  c.fillStyle = 'rgba(70,78,96,0.8)'; c.fillRect(bx - 0.0032, by + 0.0084, 0.0064, 0.00018);
  c.strokeStyle = 'rgba(220,226,236,0.85)'; c.lineWidth = 0.00028;
  c.beginPath(); c.moveTo(bx - 0.0018, by + 0.0036); c.lineTo(bx, by + 0.0027); c.lineTo(bx + 0.0018, by + 0.0036); c.lineTo(bx, by + 0.0045); c.closePath(); c.stroke();
  c.beginPath(); c.moveTo(bx - 0.0018, by + 0.0050); c.lineTo(bx, by + 0.0059); c.lineTo(bx + 0.0018, by + 0.0050); c.stroke();
  c.fillStyle = L.rgba(DOT);
  c.beginPath(); c.moveTo(bx + 0.0019, by + 0.0105); c.lineTo(bx - 0.0018, by + 0.0124); c.lineTo(bx - 0.0001, by + 0.0127); c.lineTo(bx + 0.0002, by + 0.0145); c.closePath(); c.fill();
  // bottom sheet
  const sy = bot - 0.034;
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = Math.max(0, v.ws(0.004));
  c.fillStyle = 'rgba(24,27,35,0.97)';
  L.roundRect(c, lft, sy, SW, bot - sy + 0.01, 0.0055); c.fill();
  c.restore();
  c.fillStyle = 'rgba(120,128,145,0.6)';
  L.roundRect(c, -0.0045, sy + 0.0017, 0.009, 0.0007, 0.00035); c.fill();
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillStyle = 'rgba(244,246,250,0.97)';
  mtext(c, v, 'My Location', lft + 0.0045, sy + 0.0088, 0.0042, 700);
  c.fillStyle = 'rgba(160,168,184,0.95)';
  mtext(c, v, 'Times Sq  ·  New York, NY', lft + 0.0045, sy + 0.0128, 0.0027, 500);
  // two action pills
  c.fillStyle = L.rgba(DOT, 0.95);
  L.roundRect(c, lft + 0.0045, sy + 0.0158, 0.027, 0.0068, 0.0034); c.fill();
  c.fillStyle = 'rgba(60,66,82,0.95)';
  L.roundRect(c, lft + 0.0345, sy + 0.0158, 0.027, 0.0068, 0.0034); c.fill();
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
  mtext(c, v, 'Directions', lft + 0.0045 + 0.0135, sy + 0.0193, 0.0026, 600);
  c.fillStyle = 'rgba(225,230,240,0.95)';
  mtext(c, v, 'Share', lft + 0.0345 + 0.0135, sy + 0.0193, 0.0026, 600);
  // home indicator
  c.fillStyle = 'rgba(235,238,245,0.75)';
  L.roundRect(c, -0.0095, bot - 0.0028, 0.019, 0.0007, 0.00035); c.fill();
}

// ------------------------------------------------------------------ the phone
/** Screen position of the map's blue dot (for scenes that land things on it). */
export function phoneDotScreen(v, dotX = driftAt(v.gt, v.tl)) {
  const dx = L.clamp(dotX * MK, -SW / 2 + 0.006, SW / 2 - 0.006);
  return { x: v.wx(PHONE.x + dx), y: v.wy(PHONE.y), r: v.ws(0.0021) };
}

/** The phone at PHONE, world space, LOD from a full product shot down to a glowing speck. */
export function drawPhone(c, v, { dotX = driftAt(v.gt, v.tl), alpha = 1, t = v.gt } = {}) {
  const hp = v.ws(PH);
  const X = v.wx(PHONE.x), Y = v.wy(PHONE.y);
  // screen light spilling into the night (strong when the phone is small: it reads as a lit screen in a hand)
  const spill = L.clamp(L.invLerp(0.4, 3, hp)) * L.clamp(L.invLerp(400, 60, hp));
  if (spill > 0) {
    L.lightBlob(c, X, Y, Math.max(6, hp * 3.2), [150, 190, 255], 0.22 * spill * alpha);
    L.lightBlob(c, X, Y, Math.max(2.5, hp * 0.9), [200, 225, 255], 0.5 * spill * alpha);
  }
  if (hp < 1.2) return;
  if (X < -hp || X > W + hp || Y < -hp || Y > L.H + hp) return;
  c.save();
  c.globalAlpha *= alpha;
  c.translate(X, Y);
  c.scale(1 / v.cam.mpp, 1 / v.cam.mpp);
  if (hp < 46) {
    // small: a dark slab with a lit map-blue screen and the dot
    c.fillStyle = 'rgb(10,12,18)';
    L.roundRect(c, -PW / 2, -PH / 2, PW, PH, PR); c.fill();
    const g = c.createLinearGradient(0, -SH / 2, 0, SH / 2);
    g.addColorStop(0, 'rgb(46,58,84)'); g.addColorStop(0.75, 'rgb(34,42,62)'); g.addColorStop(0.78, 'rgb(28,31,40)'); g.addColorStop(1, 'rgb(28,31,40)');
    c.fillStyle = g;
    L.roundRect(c, -SW / 2, -SH / 2, SW, SH, SR); c.fill();
    const dx = L.clamp(dotX * MK, -SW / 2 + 0.006, SW / 2 - 0.006);
    c.fillStyle = L.rgba(DOT);
    c.beginPath(); c.arc(dx, 0, Math.max(0.0035, v.cam.mpp * 0.9), 0, TAU); c.fill();
    c.restore();
    return;
  }
  // drop shadow + body (titanium edge)
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = Math.max(0, v.ws(0.012)); c.shadowOffsetY = v.ws(0.004);
  c.fillStyle = 'rgb(18,20,26)';
  L.roundRect(c, -PW / 2, -PH / 2, PW, PH, PR); c.fill();
  c.restore();
  const eg = c.createLinearGradient(-PW / 2, -PH / 2, PW / 2, PH / 2);
  eg.addColorStop(0, 'rgb(112,118,132)'); eg.addColorStop(0.3, 'rgb(46,50,60)'); eg.addColorStop(0.62, 'rgb(30,33,40)'); eg.addColorStop(1, 'rgb(84,90,104)');
  c.strokeStyle = eg; c.lineWidth = 0.0011;
  L.roundRect(c, -PW / 2 + 0.00055, -PH / 2 + 0.00055, PW - 0.0011, PH - 0.0011, PR - 0.0005); c.stroke();
  // side buttons
  c.fillStyle = 'rgb(54,58,68)';
  for (const [y0, h] of [[-0.046, 0.007], [-0.034, 0.012], [-0.019, 0.012]]) { L.roundRect(c, -PW / 2 - 0.0007, y0, 0.0009, h, 0.0004); c.fill(); }
  L.roundRect(c, PW / 2 - 0.0002, -0.03, 0.0009, 0.018, 0.0004); c.fill();
  // black glass border
  c.fillStyle = 'rgb(3,4,7)';
  L.roundRect(c, -PW / 2 + 0.0011, -PH / 2 + 0.0011, PW - 0.0022, PH - 0.0022, PR - 0.0011); c.fill();
  // the screen
  c.save();
  L.roundRect(c, -SW / 2, -SH / 2, SW, SH, SR);
  c.clip();
  drawMap(c, v, dotX, t);
  drawChrome(c, v);
  // glass: a faint diagonal sheen and a cool top-edge reflection
  const gl = c.createLinearGradient(-SW / 2, -SH / 2, SW / 2, SH * 0.1);
  gl.addColorStop(0, 'rgba(255,255,255,0.07)'); gl.addColorStop(0.45, 'rgba(255,255,255,0.015)'); gl.addColorStop(0.46, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gl; c.fillRect(-SW / 2, -SH / 2, SW, SH);
  c.restore();
  c.restore();
}

// ------------------------------------------------------------------ the grip (fingertips + thumb, in FRONT of the phone)
/**
 * The hand that holds the phone, in the person's pose coordinates (metres, x forward = east, h = height above the
 * street; the phone centre is at (PHONE.x, -PHONE.y)). s01 draws the arm + palm BEHIND the phone; this scene draws the
 * fingertips curling round the right edge and the thumb pad on the left edge IN FRONT of it (they overlap the bezel).
 */
export const GRIP = {
  // four fingertips of different lengths curling round the right edge (index on top, the pinky smallest and lowest)
  fingers: [
    { a: [0.0336, 1.2885], b: [0.0482, 1.2862], r: 0.0050 },
    { a: [0.0326, 1.2728], b: [0.0490, 1.2700], r: 0.0055 },
    { a: [0.0334, 1.2575], b: [0.0486, 1.2545], r: 0.0052 },
    { a: [0.0352, 1.2432], b: [0.0474, 1.2405], r: 0.0044 },
  ],
  // the thumb: a slim pad on the left bezel, rising from the ball of the thumb (part of the palm)
  thumb: { a: [-0.0452, 1.2475], b: [-0.0347, 1.2690], r: 0.0056 },
};
/** True when the phone is big enough for this scene to draw the grip (s01 then leaves the fingers out). */
export const gripInFront = (v) => v.ws(PH) >= 46;
// The hand reads as a dark, rim-lit silhouette (documentary low light), not as skin-tone shapes: near-black warm
// greys, the screen's cool light falling off along each finger from the tip on the bezel, a faint warm rim from the
// shop light behind on the outer edges, and tapered fingers (narrow tips, wider knuckles) with soft creases.
const SK_D = [20, 15, 15], SK_M = [46, 35, 33], SK_LIT = [104, 100, 122], RIM_W = [190, 140, 112];
/** A tapered capsule A (radius ra) -> B (radius rb), pose coords (x, h up), as a path. */
function taperPath(c, A, ra, B, rb) {
  const ax = A[0], ay = -A[1], bx = B[0], by = -B[1];
  const d = Math.hypot(bx - ax, by - ay) || 1e-9;
  const ang = Math.atan2(by - ay, bx - ax);
  const off = Math.acos(L.clamp((ra - rb) / d, -1, 1));
  c.beginPath();
  c.arc(ax, ay, Math.max(0, ra), ang + off, ang + TAU - off);
  c.arc(bx, by, Math.max(0, rb), ang - off, ang + off);
  c.closePath();
}
function finger(c, v, tip, rt, base, rb) {
  const px = v.cam.mpp;
  c.save();
  // soft contact / crease shadow (falls down-right, away from the screen light)
  c.filter = `blur(${Math.max(1, 4 * 1.9e-4 / px).toFixed(1)}px)`;
  c.save(); c.translate(0.0006, 0.0016);
  taperPath(c, tip, rt * 1.04, base, rb * 1.04); c.fillStyle = 'rgba(0,0,0,0.6)'; c.fill();
  c.restore();
  c.filter = 'none';
  // rim: the shape filled with a warm-to-cool rim, then the body offset down-right leaves a 1-2 px crescent on top
  taperPath(c, tip, rt, base, rb);
  c.save(); c.clip();
  const rg = c.createLinearGradient(tip[0], -tip[1], base[0], -base[1]);
  rg.addColorStop(0, 'rgba(150,175,235,0.55)'); rg.addColorStop(1, L.rgba(RIM_W, 0.3));
  c.fillStyle = rg; c.fillRect(Math.min(tip[0], base[0]) - 0.03, -Math.max(tip[1], base[1]) - 0.03, 0.08, 0.08);
  c.translate(0.5 * px, 1.4 * px);
  const g = c.createLinearGradient(tip[0], -tip[1], base[0], -base[1]);
  g.addColorStop(0, L.rgba(L.mix(SK_M, SK_LIT, 0.55))); g.addColorStop(0.35, L.rgba(SK_M)); g.addColorStop(1, L.rgba(SK_D));
  taperPath(c, tip, rt, base, rb); c.fillStyle = g; c.fill();
  // across-the-finger volume: darker underside
  const vg = c.createLinearGradient(0, -tip[1] - rb, 0, -tip[1] + rb);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  c.fillStyle = vg; c.fillRect(Math.min(tip[0], base[0]) - 0.03, -tip[1] - rb * 1.5, 0.08, rb * 3);
  // the screen's light falling off from the tip (on the bezel)
  const sg = c.createRadialGradient(tip[0], -tip[1], 0, tip[0], -tip[1], rt * 2.6);
  sg.addColorStop(0, 'rgba(120,150,225,0.22)'); sg.addColorStop(1, 'rgba(120,150,225,0)');
  c.fillStyle = sg; c.fillRect(tip[0] - 0.03, -tip[1] - 0.03, 0.06, 0.06);
  c.restore();
  c.restore();
}
/** The palm + wrist outline (pose coords x, h): from the sleeve cuff, behind the phone's lower half, the ball of the
 *  thumb showing past the left edge, the knuckles past the right edge where the fingers wrap round. */
const PALM = [[-0.128, 1.197], [-0.085, 1.199], [-0.05, 1.197], [-0.012, 1.199], [0.022, 1.203], [0.043, 1.214], [0.0525, 1.236],
  [0.0545, 1.266], [0.0505, 1.292], [0.04, 1.302], [0.0, 1.296], [-0.036, 1.276], [-0.05, 1.262], [-0.068, 1.247], [-0.128, 1.236]];
function smoothPose(c, pts) {
  const n = pts.length;
  const m = (i) => { const a = pts[i % n], b = pts[(i + 1) % n]; return [(a[0] + b[0]) / 2, -(a[1] + b[1]) / 2]; };
  c.beginPath();
  const s0 = m(0); c.moveTo(s0[0], s0[1]);
  for (let i = 1; i <= n; i++) { const p = pts[i % n], e = m(i); c.quadraticCurveTo(p[0], -p[1], e[0], e[1]); }
  c.closePath();
}
function gripFrame(c, v) {
  if (!gripInFront(v)) return false;
  const X = v.wx(PHONE.x), Y = v.wy(0);
  const hp = v.ws(PH);
  if (X < -hp || X > W + hp || Y - v.ws(1.5) > L.H + hp || Y - v.ws(1.2) < -hp) return false;
  c.save();
  c.translate(X, Y);
  c.scale(1 / v.cam.mpp, 1 / v.cam.mpp);
  return true;
}
/** BEHIND the phone: one continuous palm + wrist, dark warm skin, a warm rim from the shop light on its upper edge and
 *  the screen's cool spill where it meets the phone. */
function drawPalm(c, v) {
  if (!gripFrame(c, v)) return;
  const px = v.cam.mpp;
  // soft shadow the hand casts on the sleeve
  c.save();
  c.filter = `blur(${Math.max(1, 6 * 1.9e-4 / px).toFixed(1)}px)`;
  c.translate(0.002, 0.003);
  smoothPose(c, PALM); c.fillStyle = 'rgba(0,0,0,0.45)'; c.fill();
  c.restore();
  // rim: fill with the rim light, then the body offset down-right leaves a thin crescent on the top edge
  smoothPose(c, PALM);
  c.save(); c.clip();
  const rg = c.createLinearGradient(-0.12, -1.25, 0.05, -1.25);
  rg.addColorStop(0, L.rgba(RIM_W, 0.35)); rg.addColorStop(0.6, L.rgba(RIM_W, 0.55)); rg.addColorStop(1, 'rgba(150,175,235,0.5)');
  c.fillStyle = rg; c.fillRect(-0.2, -1.4, 0.3, 0.3);
  c.translate(0.6 * px, 1.6 * px);
  const g = c.createLinearGradient(-0.128, 0, 0.055, 0);
  g.addColorStop(0, L.rgba(SK_D)); g.addColorStop(0.55, L.rgba(L.mix(SK_D, SK_M, 0.7))); g.addColorStop(1, L.rgba(SK_M));
  smoothPose(c, PALM); c.fillStyle = g; c.fill();
  // volume: the underside of the wrist and the heel of the hand fall into shadow
  const vg = c.createLinearGradient(0, -1.30, 0, -1.19);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.6, 'rgba(0,0,0,0.12)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  c.fillStyle = vg; c.fillRect(-0.2, -1.4, 0.3, 0.3);
  // the screen's cool light on the ball of the thumb and the knuckles (they sit right at its edges)
  for (const [x, h, r] of [[-0.042, 1.245, 0.02], [0.043, 1.268, 0.02]]) {
    const sg = c.createRadialGradient(x, -h, 0, x, -h, r);
    sg.addColorStop(0, 'rgba(125,155,225,0.22)'); sg.addColorStop(1, 'rgba(125,155,225,0)');
    c.fillStyle = sg; c.fillRect(x - r, -h - r, 2 * r, 2 * r);
  }
  c.restore();
  c.restore();
}
/** IN FRONT of the phone: the fingertips over the right bezel and the slim thumb pad on the left one. */
function drawGrip(c, v) {
  if (!gripFrame(c, v)) return;
  // fingers, lowest first so each overlaps the one below
  for (let i = GRIP.fingers.length - 1; i >= 0; i--) {
    const f = GRIP.fingers[i];
    finger(c, v, f.a, f.r * 0.82, f.b, f.r * 1.12);
  }
  // the thumb: rises from the ball of the thumb (the palm, behind) to a pad on the bezel, about the fingers' width
  finger(c, v, GRIP.thumb.b, GRIP.thumb.r * 0.78, GRIP.thumb.a, GRIP.thumb.r * 1.1);
  c.restore();
}

// ------------------------------------------------------------------ headline
function drawHeadline(c, v) {
  const t = v.t, d = v.d;
  // a soft dark band behind the type (keeps it clean over whatever sits under it)
  const sk = L.enter(t, 0.0, 0.5) * (1 - L.enter(t, d - 0.6, 0.4, L.ease.inCubic));
  if (sk > 0) {
    c.save();
    c.translate(W / 2, 445);
    c.scale(1, 0.2);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 640);
    g.addColorStop(0, `rgba(4,6,12,${0.72 * sk})`); g.addColorStop(0.6, `rgba(4,6,12,${0.5 * sk})`); g.addColorStop(1, 'rgba(4,6,12,0)');
    c.fillStyle = g; c.fillRect(-640, -640, 1280, 1280);
    c.restore();
  }
  const lines = [
    { s: 'HOW DOES GPS KNOW', y: 418, size: 78, t0: 0.12, col: [255, 255, 255] },
    { s: 'WHERE YOU ARE?', y: 508, size: 94, t0: 0.36, col: ACCENT },
  ];
  // accent hairline above (clear of the FIX readout, which ends at y ≈ 340)
  const rk = L.enter(t, 0.05, 0.6, L.ease.outExpo) * (1 - L.enter(t, d - 0.5, 0.25, L.ease.inCubic));
  if (rk > 0) { c.fillStyle = L.rgba(ACCENT, 0.9); c.fillRect(W / 2 - 46 * rk, 340, 92 * rk, 4); }
  lines.forEach((ln, i) => {
    const kin = L.enter(t, ln.t0, 0.7, L.ease.outExpo);
    const kout = L.enter(t, d - 0.5 + i * 0.06, 0.3, L.ease.inCubic);
    if (kin <= 0 || kout >= 1) return;
    const ty = ln.y + (1 - kin) * ln.size * 0.95 - kout * ln.size * 0.95;
    c.save();
    c.beginPath(); c.rect(0, ln.y - ln.size * 0.86, W, ln.size * 1.0); c.clip();
    c.font = L.font(ln.size, 800, L.FONT.display);
    c.textBaseline = 'alphabetic';
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 22;
    c.fillStyle = L.rgba(ln.col);
    L.trackedText(c, ln.s, W / 2, ty, 1, 'center');
    // a light sweep across the accent line once it lands: the same glyphs again, filled with a moving highlight
    // gradient and added on top, so the light exists only inside the letterforms
    if (i === 1) {
      const sw = L.prog(t, 1.15, 0.9);
      if (sw > 0 && sw < 1) {
        const gx = L.lerp(120, 960, L.ease.inOutCubic(sw));
        const g = c.createLinearGradient(gx - 110, 0, gx + 110, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${0.55 * Math.sin(Math.PI * sw)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.shadowColor = 'transparent'; c.shadowBlur = 0;
        c.globalCompositeOperation = 'lighter';
        c.fillStyle = g;
        L.trackedText(c, ln.s, W / 2, ty, 1, 'center');
      }
    }
    c.restore();
  });
}

export default {
  beat: 0,
  chapter: null,
  captions: false,
  layer: 5,
  cues(d) {
    return [
      { t: 0.05, name: 'swell', gain: 0.2, pitch: 0.9 },
      { t: 0.14, name: 'swish', gain: 0.2, pitch: 1.1 },
      { t: 0.08, name: 'blip', gain: 0.32, pitch: 1.25 },    // the dot settles
      { t: 0.1, name: 'ping', gain: 0.14, pitch: 1.5 },
      { t: 0.6, name: 'shimmer', gain: 0.1, pitch: 1.4 },   // the fix tightens
      { t: 2.2, name: 'tick', gain: 0.16, pitch: 1.3 },      // "locked"
      { t: d - 0.4, name: 'riser', gain: 0.22, pitch: 1.0 },  // into the pull-back
    ];
  },
  drawWorld(ctx, v) {
    drawPalm(ctx, v);
    drawPhone(ctx, v);
    drawGrip(ctx, v);
  },
  drawOverlay(ctx, v) {
    drawHeadline(ctx, v);
  },
};
