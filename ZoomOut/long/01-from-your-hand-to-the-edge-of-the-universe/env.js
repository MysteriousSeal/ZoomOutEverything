// Environment for "From Your Hand to the Edge of the Universe" (landscape 1920x1080, ~5 min, one continuous zoom).
// Owned by the orchestrator — builders: read, don't edit.
//
// The world is a STACK OF LAYERS (layers/*.js), one per range of scale, drawn far-to-near every frame:
//   cosmos  (lf 23.0 → 28)   clusters, Laniakea, the cosmic web, the observable universe, the CMB
//   galaxy  (lf 19.2 → 24.6) the Milky Way, its satellites, the Local Group
//   stars   (lf 15.8 → 20.6) the nearest stars, the naked-eye bubble
//   solar   (lf  9.4 → 17.4) the Sun, planets, belts, Voyager 1, the Oort cloud
//   earth   (lf  5.0 → 10.2) the globe, the ISS, the Moon
//   city    (lf  1.4 →  6.6) the meadow, Central Park, Manhattan, the New York coast
//   hand    (lf -1.0 →  2.4) the hand, the person, the blanket, the grass
// lf = log10(F), F = field of view in metres across the frame (v.cam.F; v.cam.lf). Each layer culls itself outside its
// range and owns its own cross-fades; at every handoff the two layers must agree (HANDOFF below).
import * as L from '../../../engine/runtime/lib.js';
import { topBar } from '../../../engine/runtime/kit.js';
import hand from './layers/hand.js';
import city from './layers/city.js';
import earth from './layers/earth.js';
import solar from './layers/solar.js';
import stars from './layers/stars.js';
import galaxy from './layers/galaxy.js';
import cosmos from './layers/cosmos.js';

const { W, H } = L;
export { ACCENT, INK, SPACE, HANDOFF, GRASS, band, worldRect, onScreen, fmtField, fmtImperial } from './world.js';
import { ACCENT, INK, SPACE, band, fmtField, fmtImperial } from './world.js';

// ------------------------------------------------------------------ background
let starTile = null;
function backdropTile() {
  // a fixed, very faint field of distant stars for the "black of space" scales (Earth → the Oort cloud)
  if (starTile) return starTile;
  const c = new OffscreenCanvas(W, H), g = c.getContext('2d'), r = L.rng(404);
  for (let i = 0; i < 900; i++) {
    const x = r() * W, y = r() * H, m = Math.pow(r(), 3.2), s = 0.5 + m * 1.4;
    const tint = r();
    const col = tint < 0.15 ? [255, 214, 170] : tint < 0.3 ? [180, 205, 255] : [235, 238, 245];
    g.fillStyle = L.rgba(col, 0.18 + m * 0.6);
    g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
  }
  starTile = c;
  return c;
}

const LAYERS = [cosmos, galaxy, stars, solar, earth, city, hand];

export function drawBackground(c, v) {
  const lf = v.cam.lf;
  c.fillStyle = L.rgba(SPACE);
  c.fillRect(0, 0, W, H);
  const k = band(lf, 5.6, 6.6, 15.9, 16.9);
  if (k > 0) {
    c.save();
    c.globalAlpha = k;
    // slow parallax: the backdrop creeps outward as the zoom passes through each decade
    const s = 1 + 0.06 * ((lf % 1) + 1) / 2;
    c.translate(W / 2, H / 2); c.scale(s, s); c.translate(-W / 2, -H / 2);
    c.drawImage(backdropTile(), 0, 0);
    c.restore();
  }
  for (const layer of LAYERS) {
    c.save();
    layer.draw(c, v);
    c.restore();
  }
}

export function drawForeground() {}

// ------------------------------------------------------------------ HUD
// Powers-of-ten ladder down the right edge: 10^-1 (bottom) → 10^27 (top), with landmark ticks and a live marker.
const LADDER = { x: W - 104, y0: 900, y1: 196, lo: -1, hi: 27.3 };
const MARKS = [[-1, 'HAND'], [0.3, 'YOU'], [4.3, 'CITY'], [7.1, 'EARTH'], [8.9, 'MOON'], [11.5, 'SUN'],
  [13, 'NEPTUNE'], [16.6, 'NEAREST STAR'], [21, 'MILKY WAY'], [22.7, 'LOCAL GROUP'], [24.7, 'LANIAKEA'], [26.9, 'UNIVERSE']];
const ladderY = (lf) => L.lerp(LADDER.y0, LADDER.y1, L.invLerp(LADDER.lo, LADDER.hi, lf));

function drawLadder(c, v, k) {
  const lf = v.cam.lf;
  const { x } = LADDER;
  c.save();
  c.globalAlpha = k;
  // rail
  c.fillStyle = L.rgba(INK, 0.16);
  c.fillRect(x, LADDER.y1, 2, LADDER.y0 - LADDER.y1);
  const yNow = ladderY(L.clamp(lf, LADDER.lo, LADDER.hi));
  c.fillStyle = L.rgba(ACCENT, 0.85);
  c.fillRect(x, yNow, 2, LADDER.y0 - yNow);
  // decade ticks
  for (let p = -1; p <= 27; p++) {
    const y = ladderY(p), passed = lf >= p - 0.02;
    c.fillStyle = passed ? L.rgba(ACCENT, 0.75) : L.rgba(INK, 0.28);
    c.fillRect(x - (p % 5 === 0 ? 10 : 5), y - 1, p % 5 === 0 ? 10 : 5, 2);
  }
  // landmarks (labels left of the rail, the one we're nearest to brightest)
  c.font = L.font(13, 700, L.FONT.body);
  c.textAlign = 'right';
  c.textBaseline = 'middle';
  for (const [p, name] of MARKS) {
    const near = 1 - L.clamp(Math.abs(lf - p) / 1.6);
    const y = ladderY(p);
    c.fillStyle = L.rgba(near > 0.01 ? L.mix(INK, ACCENT, near) : INK, 0.22 + 0.7 * near);
    L.trackedText(c, name, x - 18, y, 1.6, 'right');
  }
  // live marker: dot + 10^n readout to the right of the rail
  c.fillStyle = L.rgba(ACCENT);
  c.beginPath(); c.arc(x + 1, yNow, 6, 0, Math.PI * 2); c.fill();
  c.strokeStyle = L.rgba(ACCENT, 0.35);
  c.lineWidth = 2;
  c.beginPath(); c.arc(x + 1, yNow, 11, 0, Math.PI * 2); c.stroke();
  const e = Math.round(lf);
  c.textAlign = 'left';
  c.fillStyle = L.rgba(INK, 0.95);
  c.font = L.font(30, 700, L.FONT.din);
  c.fillText('10', x + 22, yNow + 3);
  const w10 = c.measureText('10').width;
  c.font = L.font(19, 700, L.FONT.din);
  c.fillText(String(e).replace('-', '−'), x + 24 + w10, yNow - 9);
  c.restore();
}

/** Field-of-view readout, top left under the bar. */
function drawField(c, v, k) {
  const F = v.cam.F;
  c.save();
  c.globalAlpha = k;
  const x = 96, y = 136;
  c.font = L.font(15, 700, L.FONT.body);
  c.fillStyle = L.rgba(ACCENT, 0.9);
  L.trackedText(c, 'FIELD OF VIEW', x, y, 3);
  c.font = L.font(40, 700, L.FONT.display);
  c.fillStyle = L.rgba(INK, 0.96);
  c.textBaseline = 'alphabetic';
  const main = fmtField(F);
  c.fillText(main.toUpperCase(), x, y + 44);
  const imp = fmtImperial(F);
  if (imp) {
    const mw = c.measureText(main.toUpperCase()).width;
    c.font = L.font(20, 600, L.FONT.body);
    c.fillStyle = L.rgba(INK, 0.5);
    c.fillText(imp, x + mw + 14, y + 42);
  }
  // a bracket the width of the readout, echoing "edge to edge"
  c.fillStyle = L.rgba(INK, 0.25);
  c.fillRect(x, y + 60, 150, 1.5);
  c.fillRect(x, y + 54, 1.5, 7); c.fillRect(x + 148.5, y + 54, 1.5, 7);
  c.restore();
}

/** Soft dark backing behind the HUD zones, so the readouts stay legible over bright lawns, galaxies or the cosmic web. */
function drawScrims(c, k) {
  c.save();
  c.globalAlpha = k;
  let g = c.createLinearGradient(0, 0, 0, 230);            // top bar + field-of-view readout
  g.addColorStop(0, 'rgba(2,4,10,0.62)');
  g.addColorStop(0.55, 'rgba(2,4,10,0.32)');
  g.addColorStop(1, 'rgba(2,4,10,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, 230);
  g = c.createLinearGradient(W - 340, 0, W, 0);            // the ladder
  g.addColorStop(0, 'rgba(2,4,10,0)');
  g.addColorStop(0.6, 'rgba(2,4,10,0.38)');
  g.addColorStop(1, 'rgba(2,4,10,0.5)');
  c.fillStyle = g;
  c.fillRect(W - 340, 0, 340, H);
  g = c.createRadialGradient(150, H - 70, 40, 150, H - 70, 760);   // chapter card corner
  g.addColorStop(0, 'rgba(2,4,10,0.5)');
  g.addColorStop(0.5, 'rgba(2,4,10,0.25)');
  g.addColorStop(1, 'rgba(2,4,10,0)');
  c.fillStyle = g;
  c.fillRect(0, H - 830, 910, 830);
  c.restore();
}

export function drawHud(c, v) {
  // the HUD steps aside for the hook's first seconds and the end screen
  const endT = v.tl.lines[v.tl.lines.length - 1].end;
  const k = L.clamp(L.invLerp(0.8, 2.2, v.gt)) * (1 - L.clamp(L.invLerp(endT + 0.6, endT + 2.0, v.gt)));
  if (k <= 0) return;
  drawScrims(c, k);
  c.save();
  c.globalAlpha = k;
  topBar(c, v, ACCENT, INK);
  c.restore();
  drawField(c, v, k);
  drawLadder(c, v, k);
}

// ------------------------------------------------------------------ sound
export function cues(tl) {
  const out = [];
  tl.scenes.forEach((s, i) => {
    if (i === 0 || i === 35 || i === 36) return;
    out.push({ t: s.start - 0.05, name: 'whoosh', gain: 0.12, pitch: i % 2 ? 0.8 : 0.9 });
  });
  return out;
}
