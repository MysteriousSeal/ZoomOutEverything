// Beat 9 — Columbus sails just over one second before midnight.
// The camera dives into 23:59: sixty second cells, the last twelve still lit from beat 8 (recorded history).
// At −1.22 s (1492, 534 years ago) a marker drops through second :58 and a small carrack rises onto the top edge of the last row as if onto a sea line,
// bobbing gently with a wake. A bright bracket measures the 1.2 s left to midnight. Label "–1.2 s" / "Columbus, 1492".
import * as L from '../../../../engine/runtime/lib.js';
import { minuteRect, secondRect } from '../camera.js';

const { W, H } = L;
const YEARS_PER_S = 13.8e9 / 365 / 86400;
const POS = 60 - (2026 - 1492) / YEARS_PER_S;      // ≈ 58.78 s into 23:59
const SEC = Math.floor(POS), FR = POS - SEC;
const SR = secondRect(SEC);
const M59 = minuteRect(59);
const SHIP_LEN = SR.w * 1.5;                       // world length of the ship (hull spans :58 to :59, masts stay inside the row)
const WATER = { x: SR.x + SR.w * (0.05 + 0.9 * FR), y: SR.y + SR.h * 0.84 };   // keel point on a sea line low inside the last row
const END = secondRect(59);
const T_SHIP = 0.95, T_LAB = 1.45;               // the camera lands by ~1.4 s (key 9 travel 1.6): ship and label arrive on "one second"
const SAIL = [250, 240, 236];
const HULL = [34, 18, 34];

// ------------------------------------------------------------------ the carrack (local units: length 1, waterline y = 0, up = −y, bow = +x)
function hullPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-0.5, -0.215);                                  // sterncastle top
  ctx.lineTo(-0.33, -0.205);
  ctx.lineTo(-0.31, -0.135);                                 // step down to the waist
  ctx.quadraticCurveTo(0.05, -0.115, 0.27, -0.14);
  ctx.lineTo(0.3, -0.175);                                   // forecastle
  ctx.lineTo(0.43, -0.19);
  ctx.quadraticCurveTo(0.5, -0.19, 0.55, -0.21);             // bowsprit root
  ctx.quadraticCurveTo(0.47, -0.08, 0.36, 0.035);            // stem
  ctx.quadraticCurveTo(0.0, 0.075, -0.37, 0.045);            // keel line
  ctx.quadraticCurveTo(-0.47, 0.0, -0.5, -0.215);            // transom
  ctx.closePath();
}
/** square sail between yard at y0 and y1, centred on mast x, half-width hw; bulge to the bow */
function squareSail(ctx, x, y0, y1, hw, bulge) {
  ctx.beginPath();
  ctx.moveTo(x - hw, y0);
  ctx.quadraticCurveTo(x, y0 - 0.012, x + hw, y0);
  ctx.quadraticCurveTo(x + hw + bulge, (y0 + y1) / 2, x + hw * 0.92, y1);
  ctx.quadraticCurveTo(x + bulge * 0.6, y1 + 0.03, x - hw * 0.92, y1);
  ctx.quadraticCurveTo(x - hw + bulge * 0.7, (y0 + y1) / 2, x - hw, y0);
  ctx.closePath();
}
function drawShip(ctx, v, t, k) {
  if (k <= 0.002) return;
  const s = v.ws(SHIP_LEN);
  if (s < 12 || s > 1400) return;
  const px = 1 / s;
  const bob = 0.012 * Math.sin(t * 1.9), roll = 0.03 * Math.sin(t * 1.5 + 0.6) + 0.01 * L.noise1(t * 0.9, 31);
  const rise = (1 - L.ease.outCubic(k)) * 0.25;
  const bul = 0.035 + 0.012 * Math.sin(t * 2.3);
  ctx.save();
  ctx.translate(v.wx(WATER.x), v.wy(WATER.y));
  ctx.scale(s, s);
  ctx.translate(0, bob + rise);
  ctx.rotate(roll);
  ctx.globalAlpha *= L.clamp(k * 1.4);
  // the clip below the waterline makes the ship rise out of the sea line
  ctx.save();
  ctx.beginPath(); ctx.rect(-2, -2, 4, 2 + 0.03 - bob - rise); ctx.clip();
  // glow behind
  // dark bed behind the ship: separates the cream sails from the lit pink row
  const g0 = ctx.createRadialGradient(0.05, -0.42, 0, 0.05, -0.42, 0.8);
  g0.addColorStop(0, 'rgba(10,5,12,0.78)');
  g0.addColorStop(0.65, 'rgba(10,5,12,0.5)');
  g0.addColorStop(1, 'rgba(10,5,12,0)');
  ctx.fillStyle = g0; ctx.fillRect(-0.9, -1.25, 1.8, 1.35);
  // masts, yards and rigging
  ctx.strokeStyle = L.rgba([230, 205, 225], 0.85);
  ctx.lineWidth = 1.4 * px;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0.02, -0.12); ctx.lineTo(0.02, -0.9);            // main
  ctx.moveTo(0.29, -0.16); ctx.lineTo(0.29, -0.7);            // fore
  ctx.moveTo(-0.3, -0.2); ctx.lineTo(-0.3, -0.64);            // mizzen
  ctx.moveTo(0.55, -0.21); ctx.lineTo(0.72, -0.31);           // bowsprit
  ctx.stroke();
  ctx.lineWidth = 0.8 * px;
  ctx.strokeStyle = L.rgba([230, 205, 225], 0.4);
  ctx.beginPath();
  ctx.moveTo(0.02, -0.9); ctx.lineTo(0.5, -0.2);
  ctx.moveTo(0.02, -0.9); ctx.lineTo(-0.47, -0.21);
  ctx.moveTo(0.29, -0.7); ctx.lineTo(0.72, -0.31);
  ctx.stroke();
  // sails: warm cream, lit from the left
  const sg = ctx.createLinearGradient(-0.3, 0, 0.4, 0);
  sg.addColorStop(0, L.rgba(SAIL));
  sg.addColorStop(1, L.rgba(L.mix(SAIL, v.accent, 0.35)));
  ctx.fillStyle = sg;
  ctx.strokeStyle = L.rgba([90, 50, 80], 0.9);
  ctx.lineWidth = 1.2 * px;
  squareSail(ctx, 0.02, -0.5, -0.2, 0.17, bul); ctx.fill(); ctx.stroke();          // main course
  squareSail(ctx, 0.02, -0.82, -0.56, 0.12, bul * 0.8); ctx.fill(); ctx.stroke();  // main topsail
  squareSail(ctx, 0.29, -0.6, -0.25, 0.13, bul); ctx.fill(); ctx.stroke();         // fore
  ctx.beginPath();                                                    // lateen mizzen
  ctx.moveTo(-0.44, -0.24); ctx.lineTo(-0.22, -0.66); ctx.quadraticCurveTo(-0.26 + bul, -0.4, -0.3, -0.24); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0.56, -0.24); ctx.lineTo(0.7, -0.31); ctx.lineTo(0.6, -0.36); ctx.closePath(); ctx.fill();   // spritsail
  // the cross on the main course
  ctx.fillStyle = L.rgba(v.accent, 0.9);
  ctx.fillRect(0.02 + bul * 0.4 - 0.012, -0.44, 0.024, 0.18);
  ctx.fillRect(0.02 + bul * 0.4 - 0.07, -0.37, 0.14, 0.022);
  // yards
  ctx.strokeStyle = L.rgba([60, 36, 52]);
  ctx.lineWidth = 1.6 * px;
  ctx.beginPath();
  ctx.moveTo(-0.16, -0.5); ctx.lineTo(0.2, -0.5);
  ctx.moveTo(-0.1, -0.82); ctx.lineTo(0.14, -0.82);
  ctx.moveTo(0.15, -0.6); ctx.lineTo(0.43, -0.6);
  ctx.stroke();
  // pennants
  ctx.fillStyle = L.rgba(v.accent);
  for (const [mx, my, ph] of [[0.02, -0.9, 0], [0.29, -0.7, 1.3], [-0.3, -0.64, 2.4]]) {
    const w = Math.sin(t * 4 + ph) * 0.012;
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.quadraticCurveTo(mx - 0.06, my - 0.015 + w, mx - 0.12, my + w * 2); ctx.lineTo(mx, my + 0.03); ctx.closePath(); ctx.fill();
  }
  // hull
  const hg = ctx.createLinearGradient(0, -0.21, 0, 0.07);
  hg.addColorStop(0, L.rgba(L.mix(HULL, v.accent, 0.3)));
  hg.addColorStop(1, L.rgba(HULL));
  ctx.fillStyle = hg;
  hullPath(ctx); ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = L.rgba(v.accent, 1);
  ctx.shadowBlur = 8;
  ctx.strokeStyle = L.rgba(L.mix(v.accent, [255, 255, 255], 0.4), 0.8);
  ctx.lineWidth = 1.5 * px;
  hullPath(ctx); ctx.stroke();
  ctx.restore();
  // gunwale stripe
  ctx.strokeStyle = L.rgba([255, 220, 240], 0.35);
  ctx.lineWidth = 1 * px;
  ctx.beginPath(); ctx.moveTo(-0.3, -0.09); ctx.quadraticCurveTo(0.05, -0.07, 0.4, -0.1); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/** the sea line on the top edge of the last row, with a wake trailing the ship */
function drawSea(ctx, v, t, k) {
  if (k <= 0) return;
  const s = v.ws(SHIP_LEN);
  if (s < 12 || s > 1400) return;
  const y = v.wy(WATER.y);
  const xs = v.wx(secondRect(55).x), xe = v.wx(END.x + END.w * 0.97);
  const amp = s * 0.018;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(xs, 0, xe, 0);
  g.addColorStop(0, L.rgba(v.accent, 0));
  g.addColorStop(0.6, L.rgba(L.mix(v.accent, [255, 255, 255], 0.3), 0.6 * k));
  g.addColorStop(1, L.rgba(v.accent, 0.1 * k));
  ctx.strokeStyle = g;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let x = xs; x <= xe; x += 4) {
    const yy = y + Math.sin(x * 0.045 - t * 3.2) * amp * L.clamp((x - xs) / 120);
    x === xs ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
  }
  ctx.stroke();
  // wake: a few short strokes drifting back from the stern
  const sx = v.wx(WATER.x) - s * 0.5;
  for (let i = 0; i < 5; i++) {
    const u = ((t * 0.55 + i / 5) % 1);
    const x = sx - u * s * 0.9, len = s * 0.14 * (1 - u);
    ctx.strokeStyle = L.rgba([255, 235, 248], 0.55 * k * (1 - u));
    ctx.beginPath(); ctx.moveTo(x, y + 2 + u * 4); ctx.lineTo(x - len, y + 2 + u * 4); ctx.stroke();
  }
  ctx.restore();
}

/** the marker through :58 and the bracket that measures the 1.2 s to midnight */
function drawMarker(ctx, v, t) {
  const k = L.prog(t, T_SHIP - 0.1, 0.5);
  if (k <= 0) return;
  const s = v.ws(SR.w);
  if (s < 20 || s > 900) return;
  const x = v.wx(WATER.x), y0 = v.wy(SR.y + SR.h * 0.04), y1 = v.wy(SR.y + SR.h * 0.97);
  const e = L.ease.outCubic(k);
  L.glow(ctx, v.accent, 12, () => {
    ctx.fillStyle = L.rgba([255, 235, 250], 0.95);
    ctx.fillRect(x - 1.5, y0, 3, (y1 - y0) * e);
  });
  // bloom at the moment it lands
  const I = Math.exp(-Math.max(0, t - T_SHIP) / 0.45) * (t >= T_SHIP ? 1 : 0);
  L.lightBlob(ctx, x, v.wy(WATER.y), Math.max(0, s * 1.4), v.accent, 0.6 * I);
  // bracket: marker → midnight (the right edge of :59)
  const bk = L.ease.inOutCubic(L.prog(t, T_LAB - 0.1, 0.6));
  if (bk <= 0) return;
  const xe = v.wx(END.x + END.w * 0.95), by = v.wy(SR.y + SR.h) + 14;   // just under the grid, clear of the ship
  const xb = L.lerp(x, xe, bk);
  ctx.save();
  ctx.strokeStyle = L.rgba([255, 235, 250], 0.95);
  ctx.lineWidth = 2;
  ctx.shadowColor = L.rgba(v.accent, 1);
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(x, by); ctx.lineTo(xb, by);
  ctx.moveTo(x, by - 9); ctx.lineTo(x, by + 9);
  if (bk > 0.98) { ctx.moveTo(xe, by - 9); ctx.lineTo(xe, by + 9); }
  ctx.stroke();
  ctx.restore();
}

function plate(ctx, x, y, w, h, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.shadowColor = `rgba(7,4,9,${0.62 * a})`;
  ctx.shadowBlur = 50;
  ctx.shadowOffsetX = 5000;
  ctx.fillRect(x - 5000, y, w, h);
  ctx.restore();
}

export default {
  beat: 9,
  chapter: { num: '09', title: 'Columbus', sub: '1492: 1.2 seconds to midnight' },
  captions: true,
  layer: 4,
  cues() {
    return [
      { t: 0.05, name: 'dive', gain: 0.3, pitch: 1.1 },
      { t: T_SHIP, name: 'splash', gain: 0.2, pitch: 1.1 },
      { t: T_SHIP + 0.02, name: 'ping', gain: 0.2, pitch: 0.9 },
      { t: T_LAB - 0.05, name: 'swish', gain: 0.12, pitch: 1.2 },
      { t: T_LAB + 0.5, name: 'blip', gain: 0.12, pitch: 1.0 },
    ];
  },
  drawWorld(ctx, v) {
    const t = v.t;
    if (t < 0.5 || t > v.d + 1.2) return;
    const x0 = v.wx(M59.x), y0 = v.wy(M59.y), x1 = v.wx(M59.x + M59.w), y1 = v.wy(M59.y + M59.h);
    if (x1 < 0 || x0 > W || y1 < 0 || y0 > H) return;
    const out = 1 - L.ease.inCubic(L.prog(t, v.d - 0.05, 0.5));   // leaves as beat 10 dives into :59
    const sk = L.prog(t, T_SHIP, 0.8) * out;
    drawSea(ctx, v, t, sk);
    ctx.save();
    ctx.globalAlpha *= out;
    drawMarker(ctx, v, t);
    ctx.restore();
    drawShip(ctx, v, t, sk);
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    const out = 1 - L.ease.inCubic(L.prog(t, v.d - 0.45, 0.35));   // gone by the beat's end
    const k = Math.min(v.k, L.prog(t, T_LAB, 0.55)) * out;
    if (k <= 0) return;
    const s = v.ws(SHIP_LEN);
    const fx = v.wx(WATER.x + SHIP_LEN * 0.02), top = v.wy(WATER.y) - s * 0.92 - 10;
    const lx = Math.min(905, v.wx(M59.x + M59.w) - 8), ly = v.wy(SR.y) - 234;
    const SIZE = 112, BIG = '1.2 s', SMALL = 'Columbus, 1492';
    // measure the label so the backing hugs the text instead of smudging the second grid
    ctx.save();
    ctx.font = L.font(SIZE, 800, L.FONT.display); ctx.letterSpacing = '-1px';
    const bw = ctx.measureText(BIG).width + 1;
    ctx.font = L.font(30, 600, L.FONT.body); ctx.letterSpacing = '3px';
    const sw = ctx.measureText(SMALL.toUpperCase()).width - 3;
    ctx.letterSpacing = '0px';
    ctx.restore();
    const mW = 0.42 * SIZE, mH = 0.09 * SIZE, mGap = 0.08 * SIZE;   // the minus sign, drawn (the font's dash is too short)
    const tw = Math.max(bw + mGap + mW, sw);
    plate(ctx, lx - tw - 40, ly - 165, tw + 70, 225, k);   // wide enough to mute the :36/:37 second labels under the text
    L.leader(ctx, fx, top, fx, ly + 50, L.prog(t, T_LAB + 0.1, 0.5), [255, 225, 248], 0.7);   // stops under the small line
    L.bigLabel(ctx, { x: lx, y: ly - 18, big: BIG, small: SMALL, k, accent: v.accent, align: 'right', size: SIZE });
    // minus: same entrance as bigLabel's big line
    const e = L.ease.outCubic(L.clamp(k));
    ctx.save();
    ctx.globalAlpha *= L.clamp(k * 1.4);
    ctx.fillStyle = L.rgba(v.accent);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 18;
    const by = ly - 18 + (1 - e) * 30;
    ctx.fillRect(lx - bw - mGap - mW, by - 0.36 * SIZE - mH / 2, mW, mH);
    ctx.restore();
  },
};
