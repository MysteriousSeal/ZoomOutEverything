// Beat 4 — "It moves rain around the planet: | droughts in Australia and the Amazon, | floods in the Americas and
// East Africa. | Crops can fail, and food prices can climb."  (33.03–45.74, d 12.72; phrases at +0.15 / +2.98 / +5.82
// / +9.15). Shots: 'rain-a' (Pacific; Australia on the left limb, the Amazon on the right limb), 'rain-b' from
// phrase 2 − 0.5 (≈ +5.31, 1.3 s: rotates EAST 105° → the Americas left, East Africa right), 'crops' from phrase 3 − 0.3
// (≈ +8.84: eases back, turns east 3°/s).
//
// Builder B. Everything ON the planet is placed with geo() and fades with its z near the limb; every label sits in a
// tidy top band (y 324–436, above the globe) joined to its marker by an elbow leader that runs down OUTSIDE the disc.
//   +0.9 → 3.4   phrase 0: a cyan rain-band arrow sweeps east along the equator (150°E → 140°W), rain streaks fall
//                under it: the rain moves with the warm water.
//   +3.45 / 4.45 phrase 1: DROUGHT cards (sun + cracked ground icon) AUSTRALIA (left) and AMAZON (right); on the globe
//                an amber parched patch with cracks. Leaders fade as the globe starts to turn (+5.31), cards by +6.3.
//   +6.35 / 7.3  phrase 2: FLOODS cards (cloud + rain + water icon) THE AMERICAS (PERU · ECUADOR · SOUTHERN US; one
//                trunk, two branches) and EAST AFRICA; cyan ripples on the globe. Cards out by +9.35.
//   +9.3 → 12.4  phrase 3: a CROPS CAN FAIL card (wheat + text from its first frame) that grows right to reveal
//                FOOD PRICES CAN CLIMB (+10.5): a drawn wheat ear that wilts (+9.5) and a price line that climbs to a drawn arrowhead (+10.6 → 12.0). The impact markers
//                stay on the globe, dimmed, as context.
// Facts: script.md FACT-CHECK (typical El Niño impacts; "can"). Symbols are drawn in code (no emoji, no glyph arrows).
import * as L from '../../../../engine/runtime/lib.js';
import { IMPACTS, DROUGHT, FLOOD, ACCENT, INKW, geo, geoTrace, phrase, shotStart } from '../env.js';

const { ease, clamp, prog } = L;
const DEG = Math.PI / 180;
const LEFT = { x: 64, y: 324, w: 456, h: 112, lane: 96 };
const RIGHT = { x: 560, y: 324, w: 456, h: 112, lane: 984 };
const CARD_BG = 'rgba(6,10,24,0.92)';

// ------------------------------------------------------------------ geo helpers
/** point at angular distance d (deg) and bearing b (deg) from (lat, lon) */
function dest(lat, lon, d, b) {
  const la = lat * DEG, dd = d * DEG, bb = b * DEG;
  const la2 = Math.asin(Math.sin(la) * Math.cos(dd) + Math.cos(la) * Math.sin(dd) * Math.cos(bb));
  const lo2 = lon * DEG + Math.atan2(Math.sin(bb) * Math.sin(dd) * Math.cos(la), Math.cos(dd) - Math.sin(la) * Math.sin(la2));
  return [la2 / DEG, ((lo2 / DEG + 540) % 360) - 180];
}
const circlePts = (lat, lon, d, n = 36) => Array.from({ length: n }, (_, i) => dest(lat, lon, d, (i / n) * 360));
// the card icon's zig-zag crack motif, in a local tangent plane (x east, y north, degrees; patch radius 6.4°):
// two bold zig-zags running down the patch (no hair-thin random lines)
const CRACK_MOTIF = [
  [[-1.8, 4.6], [-0.5, 2.4], [-2.4, 0.6], [-0.8, -1.5], [-2.0, -3.4]],
  [[2.2, 3.4], [3.3, 1.2], [1.7, -0.4], [2.9, -2.4]],
];
const CRACKS = { australia: CRACK_MOTIF, amazon: CRACK_MOTIF.map((cr) => cr.map(([x, y]) => [-x, y])) };
const zFade = (z) => L.smoothstep(clamp((z - 0.03) / 0.17));

// ------------------------------------------------------------------ icons (drawn, centred at x, y; size s)
function droughtIcon(c, x, y, s, col, k = 1) {
  c.save();
  c.strokeStyle = L.rgba(col); c.fillStyle = L.rgba(col); c.lineCap = 'round'; c.lineWidth = Math.max(1, s * 0.055);
  const sx = x, sy = y - s * 0.12, sr = s * 0.15;
  c.beginPath(); c.arc(sx, sy, Math.max(0, sr), 0, Math.PI * 2); c.fill();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, r0 = sr + s * 0.07, r1 = sr + s * (0.07 + 0.1 * k);
    c.beginPath(); c.moveTo(sx + Math.cos(a) * r0, sy + Math.sin(a) * r0); c.lineTo(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1); c.stroke();
  }
  // cracked ground
  const gy = y + s * 0.3;
  c.beginPath(); c.moveTo(x - s * 0.42, gy); c.lineTo(x + s * 0.42, gy); c.stroke();
  c.lineWidth = Math.max(1, s * 0.04);
  c.beginPath(); c.moveTo(x - s * 0.08, gy); c.lineTo(x - s * 0.02, gy + s * 0.08); c.lineTo(x - s * 0.1, gy + s * 0.14); c.lineTo(x - s * 0.03, gy + s * 0.2); c.stroke();
  c.beginPath(); c.moveTo(x + s * 0.2, gy); c.lineTo(x + s * 0.25, gy + s * 0.09); c.lineTo(x + s * 0.18, gy + s * 0.15); c.stroke();
  c.restore();
}
function floodIcon(c, x, y, s, col, t = 0) {
  c.save();
  c.strokeStyle = L.rgba(col); c.fillStyle = L.rgba(col); c.lineCap = 'round';
  // cloud
  const cy = y - s * 0.2;
  c.beginPath();
  c.arc(x - s * 0.17, cy + s * 0.03, Math.max(0, s * 0.13), Math.PI * 0.5, Math.PI * 1.5);
  c.arc(x - s * 0.02, cy - s * 0.06, Math.max(0, s * 0.17), Math.PI * 1.05, Math.PI * 1.95);
  c.arc(x + s * 0.18, cy + s * 0.03, Math.max(0, s * 0.12), Math.PI * 1.5, Math.PI * 0.5);
  c.closePath(); c.fill();
  // rain streaks (falling, looped)
  c.lineWidth = Math.max(1, s * 0.045);
  for (let i = 0; i < 3; i++) {
    const ph = ((t * 1.6 + i * 0.37) % 1 + 1) % 1;
    const rx = x - s * 0.14 + i * s * 0.14 - ph * s * 0.04, ry = cy + s * 0.2 + ph * s * 0.14;
    c.globalAlpha *= 1;
    c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx - s * 0.05, ry + s * 0.12); c.stroke();
  }
  // water
  c.lineWidth = Math.max(1, s * 0.05);
  const wy = y + s * 0.36;
  c.beginPath();
  for (let i = 0; i <= 24; i++) {
    const px = x - s * 0.42 + (i / 24) * s * 0.84, py = wy + Math.sin(i / 24 * Math.PI * 4 - t * 4) * s * 0.035;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.stroke();
  c.restore();
}

// ------------------------------------------------------------------ label cards + leaders
function card(c, box, { kind, place, sub, subFs = 18, col, k, flash, icon, t }) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= clamp(k);
  const dx = (1 - ease.outCubic(clamp(k))) * (box.x < 540 ? -24 : 24);
  c.translate(dx, 0);
  c.fillStyle = CARD_BG;
  L.roundRect(c, box.x, box.y, box.w, box.h, 18); c.fill();
  c.strokeStyle = L.rgba(col, 0.35 + 0.5 * flash); c.lineWidth = 2;
  L.roundRect(c, box.x + 1, box.y + 1, box.w - 2, box.h - 2, 17); c.stroke();
  c.fillStyle = L.rgba(col, 0.9);
  c.fillRect(box.x + 18, box.y + 18, 4, box.h - 36);
  // icon tile
  const ix = box.x + 76, iy = box.y + box.h / 2;
  c.fillStyle = L.rgba(col, 0.12 + 0.18 * flash);
  c.beginPath(); c.arc(ix, iy, 38, 0, Math.PI * 2); c.fill();
  if (icon === 'drought') droughtIcon(c, ix, iy + 2, 62, col, 0.6 + 0.4 * flash); else floodIcon(c, ix, iy + 2, 62, col, t);
  // text
  const tx = box.x + 128, tw = box.w - 152;
  c.textAlign = 'left';
  c.font = L.font(20, 700, L.FONT.body);
  c.fillStyle = L.rgba(col);
  // baselines: no sub (h 112) 44 / 92; with a sub line (h 132) 37 / 83 / 111 (≈ 22 px top and bottom padding)
  L.trackedText(c, kind, tx, box.y + (sub ? 37 : 44), 4);
  c.font = L.font(L.fitSize(c, place, tw, 46, 800, L.FONT.display, 28), 800, L.FONT.display);
  c.fillStyle = L.rgba(INKW);
  c.fillText(place, tx, box.y + (sub ? 83 : 92));
  if (sub) {
    c.font = L.font(subFs, 600, L.FONT.body);
    c.fillStyle = L.rgba(INKW, 0.6);
    L.trackedText(c, sub, tx, box.y + 111, 1);
  }
  c.restore();
}
/** elbow leader: down the lane (outside the disc), then across to the marker; k = draw-in, a = alpha */
function leader(c, pts, k, a, col) {
  if (k <= 0 || a <= 0.01) return;
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let left = len * ease.outCubic(clamp(k));
  c.save();
  c.globalAlpha *= a;
  c.strokeStyle = L.rgba(col, 0.85); c.lineWidth = 2; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  let end = pts[0];
  for (let i = 1; i < pts.length && left > 0; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], s = Math.hypot(x1 - x0, y1 - y0), f = Math.min(1, left / Math.max(1e-6, s));
    end = [L.lerp(x0, x1, f), L.lerp(y0, y1, f)];
    c.lineTo(end[0], end[1]);
    left -= s;
  }
  c.stroke();
  c.fillStyle = L.rgba(col);
  c.beginPath(); c.arc(pts[0][0], pts[0][1], 4, 0, Math.PI * 2); c.fill();
  if (k >= 0.98) { c.beginPath(); c.arc(end[0], end[1], 4.5, 0, Math.PI * 2); c.fill(); }
  c.restore();
}
/** elbow leader that ends ON the marker's ring (radius rad°): the horizontal run stops where it meets the ring */
const elbow = (v, box, key, rad, side) => {
  const im = IMPACTS[key], p = geo(v, im.lat, im.lon);
  const ring = circlePts(im.lat, im.lon, rad, 72).map(([la, lo]) => geo(v, la, lo));
  let ex = p.x;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    if ((a.y - p.y) * (b.y - p.y) > 0 || a.y === b.y) continue;
    const x = L.lerp(a.x, b.x, (p.y - a.y) / (b.y - a.y));
    if (side < 0 ? x < ex : x > ex) ex = x;
  }
  return [[box.lane, box.y + box.h], [box.lane, p.y], [ex, p.y]];
};
/** largest sub-line size (≤ 18 px) at which every given string fits width w (shared, so paired cards match) */
function subSize(c, strs, w) {
  let fs = 18;
  for (; fs > 12; fs--) {
    c.font = L.font(fs, 600, L.FONT.body); c.letterSpacing = '1px';
    const ok = strs.every((s) => c.measureText(s).width <= w);
    c.letterSpacing = '0px';
    if (ok) break;
  }
  return fs;
}
const FLEFT = { ...LEFT, h: 132 }, FRIGHT = { ...RIGHT, h: 132 };   // flood cards: both carry a sub line, same height
const SUB_AM = 'PERU · ECUADOR · SOUTHERN US', SUB_EA = 'OCT–DEC SHORT RAINS';

// ------------------------------------------------------------------ on-globe markers
function droughtMarker(c, v, key, k, lit) {
  const im = IMPACTS[key], p = geo(v, im.lat, im.lon);
  const a = k * zFade(p.z);
  if (a <= 0.01) return;
  c.save();
  c.globalAlpha *= a;
  const rad = 6.4 * ease.outBack(clamp(k), 1.4);
  c.beginPath(); geoTrace(c, v, circlePts(im.lat, im.lon, Math.max(0.1, rad)));
  c.fillStyle = L.rgba([214, 150, 70], 0.5 + 0.15 * lit); c.fill();
  c.strokeStyle = L.rgba(DROUGHT, 0.95); c.lineWidth = 2.5; c.stroke();
  // heat shimmer ring
  const ph = ((v.t * 0.7) % 1 + 1) % 1;
  c.beginPath(); geoTrace(c, v, circlePts(im.lat, im.lon, rad + 1 + ph * 4));
  c.strokeStyle = L.rgba(DROUGHT, 0.5 * (1 - ph) * lit); c.lineWidth = 2; c.stroke();
  // cracks (clipped to the patch)
  c.save();
  c.beginPath(); geoTrace(c, v, circlePts(im.lat, im.lon, Math.max(0.1, rad - 0.3))); c.clip();
  c.strokeStyle = L.rgba([70, 36, 12], 0.85); c.lineWidth = 3.4; c.lineJoin = 'miter'; c.lineCap = 'round';
  for (const cr of CRACKS[key]) {
    c.beginPath(); geoTrace(c, v, cr.map(([x, y]) => [im.lat + y, im.lon + x / Math.cos(im.lat * DEG)]), false, 1);
    c.stroke();
  }
  c.restore();
  if (lit > 0.01) L.lightBlob(c, p.x, p.y, 46, DROUGHT, 0.5 * lit);
  c.restore();
}
function floodMarker(c, v, key, k, lit) {
  const im = IMPACTS[key], p = geo(v, im.lat, im.lon);
  const a = k * zFade(p.z);
  if (a <= 0.01) return;
  c.save();
  c.globalAlpha *= a;
  const rad = 3.2 * ease.outBack(clamp(k), 1.6);
  c.beginPath(); geoTrace(c, v, circlePts(im.lat, im.lon, Math.max(0.1, rad)));
  c.fillStyle = L.rgba(FLOOD, 0.45); c.fill();
  c.strokeStyle = L.rgba([200, 240, 255], 0.95); c.lineWidth = 2.2; c.stroke();
  for (let i = 0; i < 3; i++) {
    const ph = ((v.t * 0.55 + i / 3) % 1 + 1) % 1;
    c.beginPath(); geoTrace(c, v, circlePts(im.lat, im.lon, rad + 0.5 + ph * 7.5));
    c.strokeStyle = L.rgba(FLOOD, (0.25 + 0.55 * lit) * (1 - ph)); c.lineWidth = 2; c.stroke();
  }
  if (lit > 0.01) L.lightBlob(c, p.x, p.y, 40, FLOOD, 0.45 * lit);
  c.restore();
}

// ------------------------------------------------------------------ phrase 0: the rain band moves east
const BAND = Array.from({ length: 36 }, (_, i) => [1.5 + 3 * Math.sin(i / 35 * Math.PI), 150 + i * 2]);   // 150°E → 140°W
function rainBand(c, v, k, draw) {
  if (k <= 0.01 || draw <= 0.02) return;
  const n = Math.max(2, Math.round(BAND.length * draw));
  const pts = BAND.slice(0, n).map(([la, lo]) => [la, ((lo + 540) % 360) - 180]);
  const scr = pts.map(([la, lo]) => geo(v, la, lo, 0.03));
  c.save();
  c.globalAlpha *= k;
  c.lineCap = 'round'; c.lineJoin = 'round';
  const path = () => { c.beginPath(); scr.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); };
  path(); c.strokeStyle = L.rgba(FLOOD, 0.2); c.lineWidth = 40; c.stroke();
  path(); c.strokeStyle = L.rgba(FLOOD, 0.42); c.lineWidth = 16; c.stroke();
  path(); c.setLineDash([18, 14]); c.lineDashOffset = -v.t * 60; c.strokeStyle = L.rgba([215, 245, 255], 0.95); c.lineWidth = 4; c.stroke();
  c.setLineDash([]);
  // rain streaks under the band (deterministic, looped)
  c.strokeStyle = L.rgba([190, 235, 255], 0.75); c.lineWidth = 2;
  for (let i = 2; i < scr.length - 2; i += 2) {
    for (let j = 0; j < 2; j++) {
      const ph = ((v.t * 1.3 + i * 0.137 + j * 0.5) % 1 + 1) % 1, p = scr[i];
      const x = p.x + (j ? 9 : -7) - ph * 6, y = p.y + 8 + ph * 34;
      c.globalAlpha = k * (1 - ph) * 0.9;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - 4, y + 12); c.stroke();
    }
  }
  c.globalAlpha = k;
  // arrowhead
  const a = scr[scr.length - 1], b = scr[Math.max(0, scr.length - 3)];
  const ang = Math.atan2(a.y - b.y, a.x - b.x), hs = clamp(draw * 5);
  c.fillStyle = L.rgba([215, 245, 255]);
  c.beginPath();
  c.moveTo(a.x + Math.cos(ang) * 30 * hs, a.y + Math.sin(ang) * 30 * hs);
  c.lineTo(a.x + Math.cos(ang + 2.4) * 24 * hs, a.y + Math.sin(ang + 2.4) * 24 * hs);
  c.lineTo(a.x + Math.cos(ang - 2.4) * 24 * hs, a.y + Math.sin(ang - 2.4) * 24 * hs);
  c.closePath(); c.fill();
  c.restore();
}

// ------------------------------------------------------------------ phrase 3: crops + prices
const CROP = { x: 72, y: 324, w: 936, h: 176 };
const PRICE = [0.18, 0.22, 0.17, 0.24, 0.2, 0.26, 0.23, 0.3, 0.36, 0.47, 0.58, 0.74, 0.92];
function wheat(c, x, y, s, wilt) {
  // stem from (x, y) up; the ear bends over by `wilt` (0..1) and dries from gold to grey-brown
  const gold = [236, 190, 92], dry = [140, 110, 80];
  const col = L.mix(gold, dry, wilt);
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = L.rgba(L.mix([200, 170, 90], dry, wilt)); c.lineWidth = s * 0.05;
  const bend = wilt * 0.62;       // radians, the ear droops to the LEFT (away from the text)
  const kx = x, ky = y - s * 0.5;  // knee
  c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - s * 0.04, y - s * 0.3, kx, ky); c.stroke();
  c.translate(kx, ky); c.rotate(-bend);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -s * 0.62); c.stroke();
  // kernels
  c.fillStyle = L.rgba(col);
  c.strokeStyle = L.rgba(col, 0.85); c.lineWidth = s * 0.016;
  for (let i = 0; i < 6; i++) {
    const ky2 = -s * (0.12 + i * 0.085);
    for (const sd of [-1, 1]) {
      c.save();
      c.translate(sd * s * 0.045, ky2);
      c.rotate(sd * 0.5);
      c.beginPath(); c.ellipse(0, 0, Math.max(0, s * 0.04), Math.max(0, s * 0.075), 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(0, -s * 0.07); c.lineTo(sd * s * 0.03, -s * 0.24); c.stroke();   // awn
      c.restore();
    }
  }
  c.beginPath(); c.ellipse(0, -s * 0.66, Math.max(0, s * 0.035), Math.max(0, s * 0.06), 0, 0, Math.PI * 2); c.fill();
  c.restore();
  // leaf
  c.save();
  c.strokeStyle = L.rgba(L.mix([150, 170, 90], dry, wilt)); c.lineWidth = s * 0.04; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y - s * 0.16); c.quadraticCurveTo(x + s * 0.16, y - s * 0.26, x + s * 0.2, y - s * (0.4 - wilt * 0.22)); c.stroke();
  c.restore();
}
function cropsCard(c, v, k, p3) {
  if (k <= 0) return;
  const t = v.t;
  c.save();
  c.globalAlpha *= clamp(k);
  c.translate(0, (1 - ease.outCubic(clamp(k))) * -18);
  // the card holds only the CROPS cell at first, then grows right to reveal FOOD PRICES (no empty half)
  const grow = ease.inOutCubic(prog(t, p3 + 1.15, 0.5));
  const cw = L.lerp(540 - CROP.x, CROP.w, grow);
  c.fillStyle = CARD_BG;
  L.roundRect(c, CROP.x, CROP.y, cw, CROP.h, 22); c.fill();
  c.strokeStyle = L.rgba(INKW, 0.1); c.lineWidth = 1.5;
  L.roundRect(c, CROP.x + 0.5, CROP.y + 0.5, cw - 1, CROP.h - 1, 22); c.stroke();
  c.save(); c.globalAlpha *= grow;
  c.fillStyle = L.rgba(INKW, 0.12); c.fillRect(540, CROP.y + 26, 1.5, CROP.h - 52);
  c.restore();
  // left: wheat that wilts
  const wilt = ease.inOutCubic(prog(t, p3 + 0.35, 1.0));
  const sk = 1;   // the wheat is on the card from its first frame
  c.save();
  c.globalAlpha *= sk;
  wheat(c, 196, CROP.y + CROP.h - 12, 118, wilt);
  // two kernels drop as it fails
  for (let i = 0; i < 2; i++) {
    const f = prog(t, p3 + 0.8 + i * 0.25, 0.7);
    if (f <= 0 || f >= 1) continue;
    c.fillStyle = L.rgba([170, 130, 80], 1 - f);
    c.beginPath(); c.ellipse(150 + i * 16 - f * 6, CROP.y + 78 + f * f * 70, 4.5, 7, -0.4, 0, Math.PI * 2); c.fill();
  }
  c.restore();
  const tx1 = 252, tx2 = 576;
  const fs = Math.min(...[['CROPS', 262], ['CAN FAIL', 262], ['FOOD PRICES', 252], ['CAN CLIMB', 252]].map(([s0, w]) => L.fitSize(c, s0, w, 54, 800, L.FONT.display, 30)));
  c.font = L.font(fs, 800, L.FONT.display);
  c.textAlign = 'left';
  const l1 = 1;   // text with the card's first frame
  c.globalAlpha = clamp(k) * l1;
  c.fillStyle = L.rgba(INKW); c.fillText('CROPS', tx1, CROP.y + 82);
  c.fillStyle = L.rgba(DROUGHT); c.fillText('CAN FAIL', tx1, CROP.y + 140);
  // right: price line that climbs
  const r0 = ease.outCubic(prog(t, p3 + 1.4, 0.4));
  c.save();
  c.beginPath(); c.rect(CROP.x, CROP.y - 30, cw, CROP.h + 60); c.clip();
  c.globalAlpha = clamp(k) * r0;
  c.fillStyle = L.rgba(INKW); c.fillText('FOOD PRICES', tx2, CROP.y + 82);
  c.fillStyle = L.rgba(ACCENT); c.fillText('CAN CLIMB', tx2, CROP.y + 140);
  const gx0 = 846, gx1 = 980, gy0 = CROP.y + 150, gy1 = CROP.y + 34;
  c.strokeStyle = L.rgba(INKW, 0.3); c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(gx0, gy1 + 4); c.lineTo(gx0, gy0); c.lineTo(gx1 + 8, gy0); c.stroke();
  const dr = ease.inOutCubic(prog(t, p3 + 1.45, 1.5));
  if (dr > 0) {
    const n = PRICE.length - 1, upto = dr * n;
    const P = (i) => [gx0 + 8 + (i / n) * (gx1 - gx0 - 16), L.lerp(gy0 - 6, gy1 + 14, PRICE[i])];
    const pts = [];
    for (let i = 0; i <= Math.floor(upto); i++) pts.push(P(i));
    const fr = upto - Math.floor(upto);
    if (fr > 0 && Math.floor(upto) < n) { const a = P(Math.floor(upto)), b = P(Math.floor(upto) + 1); pts.push([L.lerp(a[0], b[0], fr), L.lerp(a[1], b[1], fr)]); }
    // area
    const g = c.createLinearGradient(0, gy1, 0, gy0);
    g.addColorStop(0, L.rgba(ACCENT, 0.35)); g.addColorStop(1, L.rgba(ACCENT, 0));
    c.fillStyle = g;
    c.beginPath(); c.moveTo(pts[0][0], gy0); pts.forEach((p) => c.lineTo(p[0], p[1])); c.lineTo(pts[pts.length - 1][0], gy0); c.closePath(); c.fill();
    c.strokeStyle = L.rgba(ACCENT); c.lineWidth = 4; c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
    if (pts.length >= 2) {
      const a = pts[pts.length - 1], b = pts[pts.length - 2];
      const ang = Math.atan2(a[1] - b[1], a[0] - b[0]);
      L.lightBlob(c, a[0], a[1], 40, ACCENT, 0.6);
      c.fillStyle = L.rgba(ACCENT);
      c.beginPath();
      c.moveTo(a[0] + Math.cos(ang) * 16, a[1] + Math.sin(ang) * 16);
      c.lineTo(a[0] + Math.cos(ang + 2.4) * 14, a[1] + Math.sin(ang + 2.4) * 14);
      c.lineTo(a[0] + Math.cos(ang - 2.4) * 14, a[1] + Math.sin(ang - 2.4) * 14);
      c.closePath(); c.fill();
    }
  }
  c.restore();
  c.restore();
}

// ------------------------------------------------------------------ scene
export default {
  beat: 4,
  chapter: { num: '04', title: 'Rain on the move', sub: 'Typical El Niño effects' },
  captions: true,
  layer: 4,
  cues(d) {
    return [
      // times for the 62.49 s timeline (beat 32.60): AUSTRALIA card ≈ 36.03, AMAZON ≈ 36.81 (dip before "Amazon"
      // 37.06), floods from the 38.02 → 38.37 gap, EAST AFRICA ≈ 39.76 (dip before "East")
      { t: 0.9, name: 'swish', gain: 0.2, pitch: 1.1 },
      { t: 3.45, name: 'blip', gain: 0.2, pitch: 0.85 },
      { t: 4.2, name: 'blip', gain: 0.18, pitch: 0.95 },
      { t: 5.47, name: 'splash', gain: 0.18, pitch: 1.1 },
      { t: 7.16, name: 'blip', gain: 0.16, pitch: 1.15 },
      { t: 9.5, name: 'creak', gain: 0.18, pitch: 1 },
      { t: 10.6, name: 'riser', gain: 0.12, pitch: 1.2 },   // peaks on "climb": kept low
    ];
  },
  drawOverlay(c, v) {
    const t = v.t;
    const p1 = phrase(v, 1), p2 = phrase(v, 2), p3 = phrase(v, 3);
    const rot = shotStart('rain-b', v.tl) - v.tl.scenes[v.index ?? v.beat].start;   // ≈ 5.31
    const T = {
      australia: p1 + 0.47, amazon: p1 + 1.3, americas: p2 - 0.05, eastAfrica: p2 + 1.48,
      dOut: p2 + 0.15, fOut: p3 - 0.45,
    };
    c.save();
    c.globalAlpha = v.k;

    // phrase 0: rain band
    const bk = ease.outCubic(prog(t, 0.8, 0.4)) * (1 - ease.inCubic(prog(t, p1 + 0.15, 0.4)));
    rainBand(c, v, bk, ease.inOutCubic(prog(t, 0.9, 1.6)));

    // markers (persist dimmed after their phrase)
    const mk = (at, out) => ease.outCubic(prog(t, at, 0.5)) * (1 - 0.45 * ease.inOutCubic(prog(t, out, 0.6)));
    const lit = (at, out) => clamp(prog(t, at, 0.2)) * (1 - prog(t, out, 0.5));
    droughtMarker(c, v, 'australia', mk(T.australia, T.dOut), lit(T.australia, T.dOut));
    droughtMarker(c, v, 'amazon', mk(T.amazon, T.dOut), lit(T.amazon, T.dOut));
    floodMarker(c, v, 'peru', mk(T.americas, T.fOut), lit(T.americas, T.fOut));
    floodMarker(c, v, 'usSouth', mk(T.americas + 0.15, T.fOut), lit(T.americas, T.fOut));
    floodMarker(c, v, 'eastAfrica', mk(T.eastAfrica, T.fOut), lit(T.eastAfrica, T.fOut));

    // drought cards + leaders
    const cardK = (at, out) => ease.outCubic(prog(t, at - 0.1, 0.45)) * (1 - ease.inCubic(prog(t, out, 0.25)));
    const flash = (at) => Math.exp(-Math.max(0, t - at) * 2.5) * (t >= at ? 1 : 0);
    const legOut = 1 - ease.inCubic(prog(t, rot, 0.3));
    const rotA = shotStart('rain-a2', v.tl) - v.tl.scenes[v.index ?? v.beat].start;   // ≈ +3.78: the turn to the Amazon
    const legOutA = 1 - ease.inCubic(prog(t, rotA, 0.3));
    {
      const pa = geo(v, IMPACTS.australia.lat, IMPACTS.australia.lon), pz = geo(v, IMPACTS.amazon.lat, IMPACTS.amazon.lon);
      const ka = cardK(T.australia, p2 - 0.3), kz = cardK(T.amazon, p2 - 0.25);
      const ra = 6.4 * ease.outBack(clamp(mk(T.australia, T.dOut)), 1.4), rz = 6.4 * ease.outBack(clamp(mk(T.amazon, T.dOut)), 1.4);
      if (ka > 0) leader(c, elbow(v, LEFT, 'australia', Math.max(0.1, ra), -1), prog(t, T.australia, 0.5), ka * legOutA * zFade(pa.z), DROUGHT);
      if (kz > 0) leader(c, elbow(v, RIGHT, 'amazon', Math.max(0.1, rz), 1), prog(t, T.amazon, 0.5), kz * legOut * zFade(pz.z), DROUGHT);
      card(c, LEFT, { kind: 'DROUGHT', place: IMPACTS.australia.label, col: DROUGHT, k: ka, flash: flash(T.australia), icon: 'drought', t });
      card(c, RIGHT, { kind: 'DROUGHT', place: IMPACTS.amazon.label, col: DROUGHT, k: kz, flash: flash(T.amazon), icon: 'drought', t });
    }
    // flood cards + leaders
    {
      const pu = geo(v, IMPACTS.usSouth.lat, IMPACTS.usSouth.lon), pp = geo(v, IMPACTS.peru.lat, IMPACTS.peru.lon);
      const pe = geo(v, IMPACTS.eastAfrica.lat, IMPACTS.eastAfrica.lon);
      const km = cardK(T.americas, T.fOut), ke = cardK(T.eastAfrica, T.fOut + 0.05);
      if (km > 0) {
        leader(c, elbow(v, FLEFT, 'usSouth', 3.2, -1), prog(t, T.americas, 0.45), km * zFade(pu.z), FLOOD);
        leader(c, elbow(v, FLEFT, 'peru', 3.2, -1), prog(t, T.americas + 0.1, 0.55), km * zFade(pp.z), FLOOD);
      }
      if (ke > 0) leader(c, elbow(v, FRIGHT, 'eastAfrica', 3.2, 1), prog(t, T.eastAfrica, 0.5), ke * zFade(pe.z), FLOOD);
      const sfs = subSize(c, [SUB_AM, SUB_EA], LEFT.w - 152);
      card(c, FLEFT, { kind: 'FLOODS', place: 'THE AMERICAS', sub: SUB_AM, subFs: sfs, col: FLOOD, k: km, flash: flash(T.americas), icon: 'flood', t });
      card(c, FRIGHT, { kind: 'FLOODS', place: IMPACTS.eastAfrica.label, sub: SUB_EA, subFs: sfs, col: FLOOD, k: ke, flash: flash(T.eastAfrica), icon: 'flood', t });
    }
    // phrase 3: crops / prices
    cropsCard(c, v, ease.outCubic(prog(t, p3 - 0.05, 0.45)), p3);
    c.restore();
  },
};
