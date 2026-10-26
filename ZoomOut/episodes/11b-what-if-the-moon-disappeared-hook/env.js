// Environment for "What If the Moon Disappeared?". Owned by the orchestrator — builders: read, don't edit.
//
// One world, two looks that hand over during the beat-4 pull-back:
//   BEACH (mpp < ~3): a side-on cross-section of a night coast — dune with grass on the left, wet sand, a calm sea
//     on the right with the water body and seabed in section. The night sky above (screen-space gradient + stars +
//     Milky Way) and a moon halo whose strength is moonlight(). The sky-Moon DISC is NOT drawn here: scenes draw it
//     with drawSkyMoon() so they own its entrances and its vanishing.
//   GLOBE (mpp > ~300): the REAL Earth (engine/runtime/earth.js), night side up (the beach, a real Icelandic shore, is
//     on the top limb), lit from the lower-left, real city lights on the dark side and a thin atmosphere.
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, scaleBar, stars, topBar } from '../../../engine/runtime/kit.js';
import { drawEarth } from '../../../engine/runtime/earth.js';
import { moonTexture } from './moon-tex.js';
import { R_EARTH, R_MOON, D_MOON, RECEDE, EARTH, MOON, MOON_DIR, SUN_DIR } from './camera.js';

const { W, H } = L;
export const ACCENT = [175, 195, 255];
export { R_EARTH, R_MOON, D_MOON, RECEDE, EARTH, MOON, MOON_DIR, SUN_DIR };

// ------------------------------------------------------------------ time helpers
/** beat index playing at global time gt */
export function beatAt(tl, gt) { let b = 0; tl.scenes.forEach((s, i) => { if (s.start <= gt) b = i; }); return b; }
const tIn = (tl, gt, b) => gt - tl.scenes[b].start;

/** Seconds into beat 0 at which the sky-Moon blinks out (on "disappeared"). */
export const BLINK = 1.55;   // on the stressed "-PEARED" of "disappeared"

/**
 * Moonlight on the beach, 0 (starlight only) .. 1 (full Moon). A pure function of time:
 *   beat 0: 1, gone at BLINK (0.26 s) · beat 1: 0 · beat 2: back to 1 ("Today, a full Moon…", t 0.25-1.35)
 *   beat 3: 1, then falls over t 0.3-3.7 ("Without it… a hundred times darker") · after: 0
 */
export function moonlight(v) {
  const gt = v.gt, tl = v.tl, b = beatAt(tl, gt), t = tIn(tl, gt, b);
  if (b === 0) return 1 - L.ease.inOutCubic(L.prog(t, BLINK, 0.26));   // ~8 frames: a fast dim, not a 1-frame flash
  if (b === 1) return 0;
  if (b === 2) return L.smoothstep(L.prog(t, 0.25, 1.1));
  if (b === 3) return 1 - L.smoothstep(L.prog(t, 0.3, 2.55));   // fully dark (0.002 lux) before "hundred" (t ≈ 2.97)
  return 0;
}

// ------------------------------------------------------------------ scale helpers
/** 1 at beach scale, 0 once the camera has left the ground (sky, sky-Moon, beach detail). */
export const skyK = (v) => 1 - L.clamp(L.invLerp(Math.log(0.4), Math.log(40), Math.log(v.cam.mpp)));
/** 0 at beach scale, 1 at globe scale (space background, globe shading, atmosphere). */
export const spaceK = (v) => L.clamp(L.invLerp(Math.log(40), Math.log(2500), Math.log(v.cam.mpp)));
/** Beach-section .. globe-map crossfade (earlier than spaceK, so the fractal coast and the ocean take over the ground
 *  below the horizon while the camera is still only a few km up). */
export const globeK = (v) => L.clamp(L.invLerp(Math.log(1.5), Math.log(150), Math.log(v.cam.mpp)));
/** Earth on screen: centre and radius in px. */
export const globePx = (v) => ({ cx: v.wx(EARTH.x), cy: v.wy(EARTH.y), r: v.ws(R_EARTH) });
/** Moon on screen (true position and size): centre and radius in px. */
export const moonPx = (v) => ({ cx: v.wx(MOON.x), cy: v.wy(MOON.y), r: v.ws(R_MOON) });

// ------------------------------------------------------------------ beach terrain (metres above mean sea level)
/** Ground height at x (m): seabed below 0 for x > 0 (1:10 shelf, then a drop to ~9 m), a wide, gently sloping sand
 *  beach (1:12), then a low dune (crest ~2.2 m at x ≈ -11) and a grassy hinterland. */
export function terrain(x) {
  if (x >= 0) return -(x / 10) - 6 * L.smoothstep(L.clamp((x - 8) / 16)) - 0.03 * Math.max(0, x - 24);   // shelf, then a drop
  if (x > -6.5) return -x / 12;                                       // wet/dry sand, 1:12
  if (x > -11) return 0.54 + 1.66 * L.smoothstep((-6.5 - x) / 4.5);   // dune face
  if (x > -24) return 2.2 - 0.5 * L.smoothstep((-11 - x) / 13);       // back-dune
  return 1.7 + 0.3 * Math.sin(x * 0.11) + 0.2 * Math.sin(x * 0.37);   // grassy hinterland
}
/** Gentle sea surface (m above mean sea level) at x, time gt. */
export function seaLevel(x, gt) {
  return 0.07 * Math.sin(x * 0.55 - gt * 1.1) + 0.035 * Math.sin(x * 1.7 + gt * 0.9);
}
/** Where the water meets the sand (x, metres): a slow swash. */
export const shoreX = (gt) => 0.55 * Math.sin(gt * 0.7) + 0.2 * Math.sin(gt * 1.9 + 1);

// ------------------------------------------------------------------ sky Moon (screen space, for the beach shots)
export const SKY_MOON = { x: 770, y: 470, r: 54 };
// The real near side (moon-tex.js, ported from 09b): maria at their true selenographic places, craters and ray
// systems, north up as seen from the northern hemisphere. Built once per page, then drawn as an image.
let moonCanvas = null;
function moonLayer(size) {
  if (typeof OffscreenCanvas === 'undefined') return null;
  if (!moonCanvas || moonCanvas.width < size) moonCanvas = new OffscreenCanvas(size, size);
  return moonCanvas;
}
/** The textured disc drawn centred at (x, y), radius r. mk (0..1) lifts it from a softer, paler disc (low k)
 *  to the full-contrast face, so a half-faded Moon reads dimmer, never blotchy; the craters stay in throughout. */
function moonDisc(c, x, y, r, mk) {
  const tex = moonTexture();
  if (r <= 0.5) return;
  const s = r / tex.R;
  c.save();
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  // a full Moon in a night sky reads bright: lift the albedo-true texture, a touch less contrast while it fades in
  // (and a hair of softening: at ~54 px the texture's fine relief would otherwise sparkle along the limb)
  c.filter = `brightness(${(1.5 + 0.06 * mk).toFixed(3)}) contrast(${(0.72 + 0.1 * mk).toFixed(3)}) blur(${(0.35 * r / 54).toFixed(2)}px)`;
  c.drawImage(tex.cv, x - (tex.N / 2) * s, y - (tex.N / 2) * s, tex.N * s, tex.N * s);
  c.filter = 'none';
  // soft limb: gentle darkening over the outer ~12% (source-atop: only on the disc), no bright rim
  c.globalCompositeOperation = 'source-atop';
  const lg = c.createRadialGradient(x, y, r * 0.84, x, y, r * 1.01);
  lg.addColorStop(0, 'rgba(40,48,70,0)'); lg.addColorStop(1, 'rgba(40,48,70,0.32)');
  c.fillStyle = lg;
  c.fillRect(x - r - 2, y - r - 2, 2 * r + 4, 2 * r + 4);
  c.globalCompositeOperation = 'source-over';
  c.restore();
}
/**
 * Draw the full Moon in the night sky. k 0..1 visibility (also scaled by skyK), s = scale of the disc
 * (1 = SKY_MOON.r), (x, y) override the position. Scenes call this; env never draws the disc itself.
 * The textured disc is composited as one layer (moonDisc), so a half-faded Moon reads dimmer, not blotchy.
 */
export function drawSkyMoon(c, v, { k = 1, s = 1, x = SKY_MOON.x, y = SKY_MOON.y } = {}) {
  const kk = k * skyK(v);
  const r = Math.max(0, SKY_MOON.r * s);
  if (kk <= 0 || r <= 0) return;
  c.save();
  c.globalAlpha *= kk;
  L.lightBlob(c, x, y, r * 4.2, [170, 190, 235], 0.22);
  L.lightBlob(c, x, y, r * 1.8, [220, 228, 255], 0.35);
  const mk = Math.pow(L.clamp(kk), 1.5);
  const size = Math.ceil(2 * r + 8);
  const oc = moonLayer(size);
  if (oc) {
    const o = oc.getContext('2d');
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.globalAlpha = 1; o.globalCompositeOperation = 'source-over';
    o.clearRect(0, 0, size + 2, size + 2);
    moonDisc(o, size / 2, size / 2, r, mk);
    c.drawImage(oc, 0, 0, size, size, x - size / 2, y - size / 2, size, size);
  } else moonDisc(c, x, y, r, mk);
  c.restore();
}

// ------------------------------------------------------------------ palette (dark night .. moonlit)
// m = 0 is a starlit night: lifted a little so the beach still reads on a phone
const P = {
  skyLow: [[8, 13, 28], [40, 56, 92]], skyHigh: [[2, 4, 10], [12, 20, 42]],
  sand: [[58, 64, 82], [152, 158, 174]], dune: [[30, 34, 46], [70, 76, 92]], grass: [[3, 4, 7], [14, 18, 24]],
  under: [[15, 17, 23], [38, 40, 50]], deep: [[7, 8, 12], [16, 16, 22]], water: [[14, 28, 56], [22, 50, 92]], waterDeep: [[4, 8, 18], [6, 16, 34]],
  surf: [[85, 105, 145], [210, 225, 250]],
};
const pc = (key, m, a = 1) => L.rgba(L.mix(P[key][0], P[key][1], m), a);

// ------------------------------------------------------------------ the REAL Earth (engine/runtime/earth.js)
// The beach is a real shore: the north coast of Iceland at 66.05°N 19.36°W (land to the south, the Greenland Sea to the
// north). GLOBE0 is the orientation that puts that exact point of the ETOPO1 coastline (elevation 0) on the TOP LIMB,
// with the land to screen-left and the sea to screen-right (as in the beach section), centred on India with the north
// pole leaning 23.45° to the right (the classic tilted-axis view). The coast runs straight toward the viewer for
// ~100 km, so it still reads as "land left, sea right" on the rise. After the beach pin has gone (beat 4, ~3 s in) the
// planet spins slowly the real way (east), and in beats 7-9 the whole globe rolls with the axis that s07-s09 draw
// (they register it through setGlobeTilt), so their axis always runs through the real poles.
export const GLOBE0 = { lat0: 5, lon0: 82, tilt: 23.4522 };
let tiltHook = null;
/** Scenes register (v) => tilt in degrees (or null for GLOBE0.tilt). Called once at module load, not per frame. */
export function setGlobeTilt(fn) { tiltHook = fn; }
/** Spin (deg, + = east) at global time gt: still until the beach pin has gone, then ~1.1°/s (a time-lapse). */
export function globeSpin(tl, gt) {
  const t0 = tl.scenes[4].start + 3.0, u = gt - t0;
  if (u <= 0) return 0;
  const ramp = 1.6;   // ease-in: integral of a smoothstep speed ramp
  const w = 1.1;
  return u < ramp ? w * (u * u * u / (ramp * ramp) - u * u * u * u / (2 * ramp * ramp * ramp)) : w * (u - ramp / 2);
}
/** The globe's view for drawEarth / project: {cx, cy, r, lat0, lon0, rot, tilt}. */
export function globeView(v) {
  const g = globePx(v);
  const tt = tiltHook ? tiltHook(v) : null;
  return { ...g, lat0: GLOBE0.lat0, lon0: GLOBE0.lon0, rot: globeSpin(v.tl, v.gt), tilt: tt ?? GLOBE0.tilt };
}
/** The Sun as a screen-space light (x right, y up, z toward the viewer): lower-left, a little in front. */
export const SUN_LIGHT = [SUN_DIR.x, -SUN_DIR.y, 0.5];

/** The globe: a dim 'night' layer (dark land that stays readable on the night side + real city lights), with the
 *  Blue-Marble 'day' layer screened over it on the sunlit side. Atmosphere only once the globe is small enough. */
function drawGlobe(c, v, k) {
  const view = globeView(v);
  if (view.r < 1) return;
  const atm = L.clamp(L.invLerp(5000, 1600, view.r));
  c.save();
  c.globalAlpha *= k;
  const lightsK = L.clamp(L.invLerp(9000, 2500, view.r));
  // full-resolution raster while the globe overfills the frame (the default 1.1 Mpx cap downsamples it ~0.75x)
  const maxPixels = 2.2e6;
  // (audit fix) during the fast climb (globe still overfilling the frame) the night side is a true night: darker
  // land and sea with less relief, so the upscaled, motion-blurred surface doesn't read as a muddy wash; the
  // usual readable night tones are back by the time the globe settles
  const nk = L.ease.inOutCubic(L.clamp(L.invLerp(3600, 1100, view.r)));
  const land = L.mix([30, 33, 42], [74, 80, 96], nk), ocean = L.mix([7, 13, 28], [18, 36, 74], nk);
  drawEarth(c, { ...view, style: 'night', sun: SUN_LIGHT, lights: lightsK, land, ocean, relief: L.lerp(0.5, 1.6, nk), atmosphere: false, maxPixels });
  // (audit fix) exposed for the night side while the rise is still fast: the sunlit far side (and its upscaled,
  // motion-blurred texture) only comes up as the zoom slows, so the climb reads as a dark planet with city lights
  // instead of a smeared beige/blue wash
  const dayK = L.ease.inOutCubic(L.clamp(L.invLerp(3600, 1100, view.r)));
  if (dayK > 0.003) {
    c.globalCompositeOperation = 'screen';
    c.globalAlpha *= dayK;
    drawEarth(c, { ...view, style: 'day', sun: SUN_LIGHT, lights: false, atmosphere: atm, maxPixels });
  }
  c.restore();
}


// ------------------------------------------------------------------ milky way (screen space, deterministic)
const MW = (() => {
  const r = L.rng(5), pts = [];
  for (let i = 0; i < 520; i++) {
    const u = r(), off = (r() + r() + r() - 1.5) * 150;
    pts.push([L.lerp(-60, W + 60, u), L.lerp(1050, 120, u) + off, 0.4 + r() * 1.1, r()]);
  }
  return pts;
})();
function milkyWay(c, v, k) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha = k;
  for (let i = 0; i <= 8; i++) {
    const u = i / 8;
    L.lightBlob(c, L.lerp(-60, W + 60, u), L.lerp(1050, 120, u), 230, [140, 150, 200], 0.05 + 0.04 * Math.sin(i * 1.7) ** 2);
  }
  for (const [x, y, s, b] of MW) {
    c.fillStyle = `rgba(225,230,255,${0.18 + 0.4 * b})`;
    c.fillRect(x, y, s, s);
  }
  c.restore();
}

// ------------------------------------------------------------------ background
export function drawBackground(c, v) {
  const m = moonlight(v), sk = skyK(v), sp = spaceK(v);
  c.fillStyle = '#020308';
  c.fillRect(0, 0, W, H);
  // night sky (screen space), brighter near the horizon and under a full Moon
  if (sk > 0) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, pc('skyHigh', m)); g.addColorStop(0.62, pc('skyLow', m)); g.addColorStop(1, pc('skyLow', m));
    c.save(); c.globalAlpha = sk; c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
  }
  // stars: more of them, and the Milky Way, once the Moon is gone
  stars(c, v, L.lerp(0.75, 0.25, m * sk), 170, 11);
  stars(c, v, L.lerp(0.5, 0.0, m * sk), 120, 29);
  milkyWay(c, v, L.lerp(0.55, 0.0, m) * sk + 0.35 * sp);
  // moon halo in the sky (the disc itself is drawn by scenes)
  if (sk > 0 && m > 0) L.lightBlob(c, SKY_MOON.x, SKY_MOON.y, 520, [120, 145, 200], 0.28 * m * sk);

  const { cx, cy, r } = globePx(v);
  if (cy - r > H + 50) return;
  // an opaque ground base so stars never show through the beach/globe crossfade
  c.fillStyle = '#04060b';
  if (r < 3e6) { c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2); c.fill(); }
  else c.fillRect(-10, cy - r, W + 20, H + 20 - (cy - r));
  // GLOBE look (fades in on the pull-back)
  const gk = globeK(v);
  if (gk > 0) drawGlobe(c, v, gk);
  if (gk > 0) altitudeHaze(c, v, cx, cy, r);
  // BEACH look: flat ground + sea in section (fades out on the pull-back; clipped to the limb once it curves)
  const bk = 1 - L.smoothstep(L.clamp(gk * 1.6));
  if (bk > 0) {
    c.save();
    if (r < 2e5) { c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2); c.clip(); }
    drawBeach(c, v, m, bk);
    c.restore();
  }
  // airglow: the atmosphere seen edge-on, a soft band that follows the (curving) horizon as the camera rises
  limbGlow(c, v, cx, cy, r);
}

/** Beat 4 pull-back, ~100-5,000 km up (scale bar 20 km - 1,000 km): the elevation data is coarser than the screen there
 *  and the fast zoom smears it, so the map would read as blocky mush. Look down through a thin, cool atmospheric veil
 *  (densest toward the horizon) that thins out as the whole globe comes into view. */
function altitudeHaze(c, v, cx, cy, r) {
  const u = L.invLerp(Math.log(150), Math.log(9000), Math.log(v.cam.mpp));
  if (u <= 0 || u >= 1) return;
  const h = 0.5 * Math.sin(Math.PI * u) ** 1.3;
  c.save();
  if (r < 3e6) { c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2); c.clip(); }
  const top = Math.max(0, cy - r);
  const g = c.createLinearGradient(0, top, 0, Math.min(H, top + 1400));
  g.addColorStop(0, `rgba(120,150,205,${h})`);
  g.addColorStop(0.35, `rgba(70,95,150,${0.75 * h})`);
  g.addColorStop(1, `rgba(30,45,85,${0.55 * h})`);
  c.fillStyle = g;
  c.fillRect(0, top, W, H - top);
  c.restore();
}

/** Layered soft lines following the top limb, from the surface up `band` px (works for any radius). */
function limbGlow(c, v, cx, cy, r) {
  const lm = Math.log(v.cam.mpp);
  const rise = L.clamp(L.invLerp(Math.log(0.1), Math.log(2), lm));
  const settle = L.clamp(L.invLerp(700, 2600, r));     // the globe's own rim takes over
  const a = rise * settle;
  if (a <= 0.01) return;
  const band = L.lerp(80, 260, L.smoothstep(L.clamp(L.invLerp(Math.log(0.3), Math.log(60), lm)))) * L.lerp(0.45, 1, settle);
  const yAt = (x, R) => { const dx = x - cx; if (Math.abs(dx) >= R) return null; return cy - R + (dx * dx) / (R + Math.sqrt(R * R - dx * dx)); };
  const STOPS = [[0, 0.62, [200, 222, 255]], [0.06, 0.4, [160, 195, 255]], [0.25, 0.17, [110, 150, 240]], [0.6, 0.05, [80, 110, 220]], [1, 0, [70, 100, 210]]];
  c.save();
  c.globalCompositeOperation = 'lighter';
  // the band: horizon to horizon + band, filled with a gradient that follows the curve (radial while it visibly curves)
  c.beginPath();
  let pen = false, last = null;
  for (let x = -30; x <= W + 30; x += 12) {
    const y = yAt(x, r);
    if (y === null) continue;
    if (!pen) { c.moveTo(x, y); pen = true; } else c.lineTo(x, y);
    last = x;
  }
  if (!pen) { c.restore(); return; }
  for (let x = last; x >= -30; x -= 12) {
    const y = yAt(x, r + band);
    if (y !== null) c.lineTo(x, y);
  }
  c.closePath();
  let g;
  if (r < 6e4) g = c.createRadialGradient(cx, cy, r, cx, cy, r + band);
  else { const hy = yAt(cx < -30 || cx > W + 30 ? L.clamp(cx, 0, W) : cx, r) ?? cy - r; g = c.createLinearGradient(0, hy, 0, hy - band); }
  for (const [u, al, col] of STOPS) g.addColorStop(u, L.rgba(col, al * a));
  c.fillStyle = g;
  c.fill();
  // the bright skin right on the horizon
  c.strokeStyle = `rgba(210,228,255,${0.6 * a})`;
  c.lineWidth = 2;
  c.beginPath();
  pen = false;
  for (let x = -30; x <= W + 30; x += 12) {
    const y = yAt(x, r + 1);
    if (y === null) { pen = false; continue; }
    if (!pen) { c.moveTo(x, y); pen = true; } else c.lineTo(x, y);
  }
  c.stroke();
  c.restore();
}

// ------------------------------------------------------------------ the beach
// Above the horizon (y < 0 in the world) the beach is a side view: the dune and the sand slope in silhouette against the
// sky, meeting the sea at the swash point (shoreX, on the horizon line). BELOW the horizon we look out from the beach:
// the sea in a band under the horizon (swell lines rolling in, a glitter path under a full Moon), a lacy foam line
// where it meets the sand, and dark, rippled sand in front of us, curving up to the swash point (a small cove).
/** The shoreline below the horizon (screen space): it leaves the swash point (hx, top) on the horizon, curves down to
 *  the right and runs across the frame ~0.33 of the way from the horizon to the bottom (a small cove: the sea in a band
 *  under the horizon, the sand in front of us). The swash breathes in and out with shoreX. */
function shoreY(v, hx, top, x) {
  const D = 0.4 * (H - top) * (1 + 0.025 * Math.sin(v.gt * 0.7)) + 6 * Math.sin(x * 0.006 + 0.8);
  const u = Math.max(0, x - hx);
  return top + D * (1 - Math.exp(-u / 210));
}

function drawBeach(c, v, m, k) {
  const terrY = (x) => v.wy(-terrain(x));
  const sx = shoreX(v.gt);
  const x0 = v.cam.x - (W / 2 + 40) * v.cam.mpp, x1 = v.cam.x + (W / 2 + 40) * v.cam.mpp;
  const N = 140, X = (i) => L.lerp(x0, x1, i / N);
  const top = v.wy(0), hx = v.wx(sx);
  const lit = 0.3 + 0.7 * m;
  const close = 1 - L.clamp(L.invLerp(Math.log(0.12), Math.log(0.6), Math.log(v.cam.mpp)));   // beach-scale detail
  c.save();
  c.globalAlpha *= k;
  const bot = H + 40, XR = W + 40;
  const shoreLine = (dy = 0, from = hx) => { for (let x = from; x <= XR; x += 12) c.lineTo(x, shoreY(v, hx, top, x) + dy); };
  if (top < H + 20) {
    const ySh = shoreY(v, hx, top, XR);
    // ---- the sea: a band under the horizon, sky-lit far off and darker close in
    const sg = c.createLinearGradient(0, top, 0, ySh);
    sg.addColorStop(0, L.rgba(L.mix(L.mix(P.skyLow[0], P.skyLow[1], m), L.mix(P.surf[0], P.surf[1], m), 0.18)));
    sg.addColorStop(0.12, pc('water', m));
    sg.addColorStop(1, L.rgba(L.mix(L.mix(P.water[0], P.water[1], m), L.mix(P.waterDeep[0], P.waterDeep[1], m), 0.45)));
    const seaPath = () => { c.beginPath(); c.moveTo(hx, top); c.lineTo(XR, top); c.lineTo(XR, ySh + 30); for (let x = XR; x >= hx; x -= 12) c.lineTo(x, shoreY(v, hx, top, x) + 30); c.closePath(); };
    seaPath();
    c.fillStyle = sg;
    c.fill();
    c.save();
    c.clip();
    // incoming swell lines: crowded near the horizon, wider and brighter close in (perspective), rolling toward us
    c.lineCap = 'round';
    const NL = 18, span = ySh - top;
    for (let i = 0; i < NL; i++) {
      const p = ((i / NL + v.gt * 0.035) % 1 + 1) % 1, d = Math.pow(p, 1.8) * span, y = top + d;
      if (d < 2) continue;
      const a = (0.06 + 0.14 * m) * Math.sin(Math.PI * Math.min(1, p * 1.15)) * (0.6 + 0.4 * Math.sin(i * 2.7));
      if (a < 0.01) continue;
      c.strokeStyle = L.rgba(L.mix(P.surf[0], P.surf[1], m), a);
      c.lineWidth = 0.8 + 2 * p;
      c.beginPath();
      for (let x = hx - 20, j = 0; x <= XR; x += 24, j++) {
        const yy = y + Math.sin(x * 0.011 + i * 1.3 + v.gt * 0.6) * (1 + 4 * p);
        j ? c.lineTo(x, yy) : c.moveTo(x, yy);
      }
      c.stroke();
    }
    // moon glitter path under the sky-Moon: twinkling dashes in a column that widens toward us
    if (m > 0.02) {
      const r = L.rng(12);
      c.fillStyle = 'rgb(235,240,255)';
      for (let i = 0; i < 150; i++) {
        const u = r(), d = Math.pow(u, 1.7) * span, y = top + 2 + d, spread = 10 + d * 0.45;
        const x = SKY_MOON.x + (r() + r() + r() - 1.5) * spread, ph = r() * 6.28, sp = 1.6 + r() * 1.6;
        const a = m * Math.max(0, Math.sin(v.gt * sp + ph)) ** 3 * (0.55 + 0.45 * u);
        if (a < 0.02) continue;
        c.globalAlpha = k * a;
        const w = 4 + 18 * u;
        c.fillRect(x - w / 2, y - 0.8, w, 1.2 + 1.8 * u);
      }
      c.globalAlpha = k;
      c.save();
      c.translate(SKY_MOON.x, top + span * 0.5);
      c.scale(0.7, 1.6);
      L.lightBlob(c, 0, 0, span * 0.55, [170, 195, 245], 0.18 * m);
      c.restore();
    } else {
      // starlight: a few dim glints scattered on the dark water
      const r = L.rng(19);
      for (let i = 0; i < 40; i++) {
        const u = r(), y = top + 3 + Math.pow(u, 1.6) * span, x = L.lerp(hx, W, r()), ph = r() * 6.28;
        const a = 0.35 * Math.max(0, Math.sin(v.gt * (0.9 + r()) + ph)) ** 4;
        if (a < 0.02) continue;
        c.fillStyle = `rgba(200,215,255,${a})`;
        c.fillRect(x - 3 - 6 * u, y, 6 + 12 * u, 1.2);
      }
    }
    c.restore();
    // ---- the sand in front of us: dark and grainy, with a wet, sky-lit band along the water's edge
    const sandPath = () => { c.beginPath(); c.moveTo(-40, top); c.lineTo(hx, top); shoreLine(); c.lineTo(XR, bot); c.lineTo(-40, bot); c.closePath(); };
    const dg = c.createLinearGradient(0, top, 0, H);
    const dune = L.mix(P.dune[0], P.dune[1], m), sand = L.mix(P.sand[0], P.sand[1], m);
    dg.addColorStop(0, L.rgba(dune)); dg.addColorStop(0.42, L.rgba(L.mix(dune, sand, 0.62))); dg.addColorStop(1, L.rgba(dune.map((q) => q * 0.7)));
    sandPath();
    c.fillStyle = dg;
    c.fill();
    c.save();
    c.clip();
    // wet sand: a darker, glossy band just behind the foam, catching the sky (and the Moon)
    c.lineJoin = 'round';
    for (const [dy, w, col] of [[22, 46, 'rgba(6,10,22,0.34)'], [9, 12, `rgba(190,208,245,${0.1 + 0.25 * m})`]]) {
      c.beginPath(); c.moveTo(hx, top); shoreLine(dy, hx);
      c.strokeStyle = col; c.lineWidth = w; c.filter = 'blur(7px)'; c.stroke(); c.filter = 'none';
    }
    // wind ripples: faint shore-parallel ridges (dark trough + moonlit crest), wider close in
    for (let i = 1; i < 16; i++) {
      const p = i / 16, y0 = ySh + 40 + Math.pow(p, 1.7) * (H - ySh);
      for (const [dy, col] of [[0, `rgba(0,0,0,${0.12 + 0.08 * p})`], [-1.5 - 2.5 * p, L.rgba([215, 222, 240], (0.04 + 0.07 * p) * lit)]]) {
        c.beginPath();
        for (let x = -40, j = 0; x <= XR; x += 24, j++) {
          const yy = Math.max(shoreY(v, hx, top, x) + 30, y0 + dy + Math.sin(x * 0.009 + i * 2.1) * (2 + 9 * p) - (XR - x) * 0.06 * (1 - p));
          j ? c.lineTo(x, yy) : c.moveTo(x, yy);
        }
        c.strokeStyle = col;
        c.lineWidth = 0.8 + 1.8 * p;
        c.stroke();
      }
    }
    // grain
    const r = L.rng(9001);
    for (let i = 0; i < 420; i++) {
      const u = r(), x = r() * W, y = ySh + 20 + Math.pow(u, 1.3) * (H - ySh), light = r() < 0.5, al = (0.05 + 0.1 * r()) * (0.4 + 0.6 * u), s = 1 + 2.2 * u;
      c.fillStyle = light ? L.rgba([220, 226, 240], al * lit) : `rgba(0,0,0,${al * 1.2})`;
      c.fillRect(x, y, s * (1 + 2 * r()), s * 0.7);
    }
    // scattered pebbles and shell fragments (perspective: larger close in), each with a soft shadow and a sky-lit top,
    // plus a few strands of washed-up weed: detail for the otherwise flat near sand
    const pr = L.rng(9013);
    for (let i = 0; i < 120; i++) {
      const u = Math.pow(pr(), 0.7), x = pr() * W, y = ySh + 30 + u * (H - ySh - 30);
      const sz = 1.4 + 6.5 * Math.pow(u, 1.5) * (0.5 + pr()), sq = 0.45 + 0.2 * pr(), shell = pr() < 0.3;
      if (y < shoreY(v, hx, top, x) + 26) continue;
      c.fillStyle = `rgba(0,0,0,${0.22 + 0.12 * u})`;
      c.beginPath(); c.ellipse(x + sz * 0.35, y + sz * sq * 0.45, sz * 1.1, sz * sq, 0, 0, Math.PI * 2); c.fill();
      const base = shell ? [150, 152, 160] : [58, 62, 74];
      c.fillStyle = L.rgba(base.map((q) => q * (0.55 + 0.45 * lit)), 0.9);
      c.beginPath(); c.ellipse(x, y, sz, sz * sq, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = L.rgba([215, 225, 245], (shell ? 0.35 : 0.18) * lit);
      c.beginPath(); c.ellipse(x - sz * 0.15, y - sz * sq * 0.35, sz * 0.6, sz * sq * 0.35, 0, 0, Math.PI * 2); c.fill();
    }
    c.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const u = 0.15 + 0.8 * pr(), x0 = pr() * W, y0 = ySh + 50 + u * (H - ySh - 50);
      if (y0 < shoreY(v, hx, top, x0) + 40) continue;
      const len = 40 + 110 * u, ang = (pr() - 0.5) * 0.5;
      c.strokeStyle = `rgba(14,18,22,${0.5 + 0.2 * u})`;
      c.lineWidth = 1.5 + 2.5 * u;
      c.beginPath();
      for (let j = 0; j <= 8; j++) {
        const q = j / 8, xx = x0 + Math.cos(ang) * len * q, yy = y0 + Math.sin(ang) * len * q + Math.sin(q * 6 + i) * 4 * u;
        j ? c.lineTo(xx, yy) : c.moveTo(xx, yy);
      }
      c.stroke();
    }
    c.restore();
    // ---- the foam: lacy bands of white water riding the edge, thicker close in, coming and going
    c.save();
    c.lineJoin = 'round';
    c.lineCap = 'round';
    const fa = 0.32 + 0.45 * m;
    for (const [off, lw, al, sd] of [[0, 2.4, 1, 3], [-7, 1.6, 0.6, 7], [-16, 1.2, 0.35, 11]]) {
      let pen = false;
      c.beginPath();
      for (let x = hx; x <= XR; x += 6) {
        const y0 = shoreY(v, hx, top, x), sc = 0.2 + (y0 - top) / 220;
        const on = L.noise1(x * 0.012 + v.gt * 0.3 * (sd % 2 ? 1 : -1), sd) > (off < 0 ? -0.05 : -0.65);
        const y = y0 + off * sc + 1.5 * sc * Math.sin(x * 0.05 + v.gt * (1.1 + sd * 0.1));
        if (on) { if (!pen) { c.moveTo(x, y); pen = true; } else c.lineTo(x, y); } else pen = false;
      }
      c.strokeStyle = `rgba(232,240,255,${fa * al})`;
      c.lineWidth = lw;
      c.stroke();
    }
    c.restore();
  }

  // ---- above the horizon: the dune and the sand slope in silhouette (side view)
  const ground = () => {
    c.beginPath();
    c.moveTo(v.wx(x0), top + 1);
    for (let i = 0; i <= N; i++) { const x = X(i); if (x > sx) { c.lineTo(hx, top + 1); break; } c.lineTo(v.wx(x), terrY(x)); }
    c.lineTo(v.wx(x0), top + 1);
    c.closePath();
  };
  const gg = c.createLinearGradient(0, v.wy(-2.4), 0, top);
  gg.addColorStop(0, L.rgba(L.mix(L.mix(P.dune[0], P.dune[1], m), L.mix(P.sand[0], P.sand[1], m), 0.5))); gg.addColorStop(1, pc('dune', m));
  ground();
  c.fillStyle = gg;
  c.fill();
  // moonlit skin on the sand: a soft pale band under the surface line
  if (close > 0) {
    c.save();
    ground();
    c.clip();
    c.beginPath();
    let pen = false;
    for (let i = 0; i <= N; i++) { const x = X(i); if (x > sx) break; if (!pen) { c.moveTo(v.wx(x), terrY(x)); pen = true; } else c.lineTo(v.wx(x), terrY(x)); }
    c.lineJoin = 'round';
    c.filter = 'blur(10px)'; c.strokeStyle = pc('sand', m, 0.35 * lit * close); c.lineWidth = 34; c.stroke();
    c.filter = 'none';
    c.restore();
  }
  // the crest line: pale sand where it faces the Moon (upper right), and a crisp skin all along
  c.lineCap = 'round';
  const Lx = 0.55, Ly = -0.83;
  for (let i = 0; i < N; i++) {
    const xa = X(i), xb = X(i + 1);
    if (xa > sx) break;
    const xe = Math.min(xb, sx);
    const ax = v.wx(xa), ay = terrY(xa), bx = v.wx(xe), by = terrY(xe);
    const dx = bx - ax, dy = by - ay, dl = Math.hypot(dx, dy) || 1;
    const f = Math.max(0, (dy / dl) * Lx + (-dx / dl) * Ly);
    const al = (0.25 + 0.75 * m) * (0.35 + 0.65 * f ** 4);
    c.strokeStyle = L.rgba(L.mix(P.sand[0], P.sand[1], m), Math.min(1, 0.9 * al + 0.25));
    c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
  }
  // dune grass: tufts along the crest and back-dune, dark silhouettes against the sky (one tuft per ~0.45 m)
  if (v.cam.mpp < 0.12) {
    const r = L.rng(4);
    c.strokeStyle = pc('grass', m, 0.97);
    for (let gx = -60; gx < -8.6; gx += 0.42) {
      const jx = gx + r() * 0.4, hgt = 0.5 + r() * 0.75, lean = (r() - 0.5) * 0.5 + 0.12 * Math.sin(v.gt * 0.9 + gx), nb = 3 + Math.floor(r() * 3);
      if (jx < x0 || jx > x1) continue;
      const bx = v.wx(jx), by = terrY(jx) + 2;
      for (let b = 0; b < nb; b++) {
        const u = nb > 1 ? b / (nb - 1) * 2 - 1 : 0, hh = hgt * (1 - 0.3 * Math.abs(u));
        c.lineWidth = 2.4 - Math.abs(u) * 0.8;
        c.beginPath(); c.moveTo(bx + u * 4, by);
        c.quadraticCurveTo(bx + u * 6, by - v.ws(hh) * 0.6, bx + u * 13 + v.ws(lean + u * 0.12), by - v.ws(hh));
        c.stroke();
      }
    }
  }
  // the horizon: a thin bright line of sky on the far sea
  c.strokeStyle = pc('surf', m, 0.3 + 0.4 * m);
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(hx, top); c.lineTo(W + 40, top); c.stroke();
  L.lightBlob(c, hx + 10, top, 40, [205, 220, 250], 0.1 + 0.12 * m);
  c.restore();
}

// ------------------------------------------------------------------ foreground: the beach pin on the pull-back
// A small accent glint that rides the shoreline (0, 0) from the start of the rise until the globe has settled, so the
// beach visibly becomes a point on the limb.
export function drawForeground(c, v) {
  const s4 = v.tl.scenes[4].start, t = v.gt - s4;
  const k = L.ease.outCubic(L.prog(t, 0.05, 0.45)) * (1 - L.ease.inCubic(L.prog(t, 2.55, 0.5)));
  if (k <= 0) return;
  const x = v.wx(0), y = v.wy(0);
  if (x < -40 || x > W + 40 || y < -40 || y > H + 40) return;
  c.save();
  L.lightBlob(c, x, y, 30, [200, 215, 255], 0.55 * k);
  const ph = ((t * 0.9) % 1 + 1) % 1;
  c.strokeStyle = L.rgba(ACCENT, 0.7 * k * (1 - ph));
  c.lineWidth = 1.6;
  c.beginPath(); c.arc(x, y, Math.max(0, 8 + 22 * L.ease.outCubic(ph)), 0, Math.PI * 2); c.stroke();
  c.strokeStyle = L.rgba(ACCENT, 0.9 * k);
  c.lineWidth = 2;
  c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.stroke();
  c.fillStyle = `rgba(240,245,255,${k})`;
  c.beginPath(); c.arc(x, y, 3.2, 0, Math.PI * 2); c.fill();
  c.restore();
}

// ------------------------------------------------------------------ HUD
export function drawHud(c, v) {
  topBar(c, v, ACCENT);
  // beat-relative (11b: the film starts after the preroll); out over the first 0.4 s of beat 12 (the cm-scale
  // fingernail comparison) and hidden through the question card: a "100,000 km" bar there would be meaningless
  const sbOut = 1 - L.ease.inOutCubic(L.prog(v.gt - v.tl.scenes[12].start, 0.0, 0.4));
  scaleBar(c, v, { k: L.ease.outCubic(L.prog(v.gt - v.tl.scenes[0].start, 1.2, 0.6)) * sbOut });
}
export const cues = (tl) => beatCues(tl, { gain: 0.16, pitch: 0.75 });
