// Beat 3 — "A leap day every four years made its average year | three hundred sixty-five and a quarter days."
// Full true-scale orbit; env laps ONE Earth 4 times (lapAt / LAPS). Inside the orbit, above the Sun, a parchment
// DAY TILE (one calendar day, engraved in four quarters) collects the year's leftover: each time the Earth comes back
// round to the equinox, a "+¼" spark leaves it and drops into the tile, filling one quarter. On the 4th lap the tile
// is whole and turns into the leaf FEB 29 (the leap day) with a soft bloom. Under the Sun, the tally lands:
// "365" on phrase 1, then the "¼" slides in on "quarter": 365¼ DAYS, the average Julian year.
// Placement: tile at y ≈ 700 (below env's SPRING EQUINOX label ≈ 383–471, above the Sun's glow); tally at y ≈ 1090,
// inside the ring (x 190–890 at that row), clear of the caption band (≥ 1380) and the HUD.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, PARCH, PARCH_DK, INKC, RUBRIC, LAPS, lapAt, orbitScreen, serif } from '../env.js';

const TAU = Math.PI * 2;
const TILE = { x: 540, y: 700, s: 136 };      // centre + side (px)
const TALLY_Y = 1095;                          // baseline of 365¼ DAYS
const FLY = 0.32;                              // quarter flight time (s)

/** inverse of L.ease.inOutCubic */
const invIO = (y) => (y < 0.5 ? Math.cbrt(y / 4) : 1 - Math.cbrt(2 * (1 - y)) / 2);
/** beat-relative time at which the Earth has completed `laps` laps (env: LAPS.t0 + LAPS.dur · ease) */
const lapTime = (laps) => LAPS.t0 + LAPS.dur * invIO(L.clamp(laps / LAPS.n));
/** quarter k (0..3) leaves the Earth as it comes round to the equinox (the last one a touch early, so FEB 29 holds) */
const launch = (k) => lapTime(k < 3 ? k + 1 - 0.04 : 3.86);
const LAUNCH = [0, 1, 2, 3].map(launch);
const LAND = LAUNCH.map((t) => t + FLY);
const WHOLE = LAND[3] + 0.05;                  // the tile becomes FEB 29

const ph = (v, j) => v.tl.lines[v.index].phrases[j].start - v.tl.scenes[v.index].start;
const phd = (v, j) => v.tl.lines[v.index].phrases[j].end - v.tl.lines[v.index].phrases[j].start;

// quarter k occupies the tile's quadrant: 0 top-left, 1 top-right, 2 bottom-right, 3 bottom-left (clockwise)
const QX = [-1, 1, 1, -1], QY = [-1, -1, 1, 1];

function dayTile(c, t, k) {
  const { x, y, s } = TILE, h = s / 2;
  const whole = L.ease.outCubic(L.prog(t, WHOLE, 0.45));
  c.save();
  c.globalAlpha *= k;
  // bloom when it becomes whole
  const bl = L.prog(t, WHOLE - 0.05, 1.2);
  if (bl > 0 && bl < 1) L.lightBlob(c, x, y, s * 1.6, [255, 214, 140], 0.55 * Math.sin(Math.PI * Math.min(1, bl * 1.6)) );
  if (whole > 0) L.lightBlob(c, x, y, s * 1.05, [255, 210, 140], 0.16 * whole);
  // the empty tile: engraved outline + quarter dividers on navy
  c.lineWidth = 1.6;
  c.strokeStyle = L.rgba(ACCENT, 0.85);
  c.strokeRect(x - h, y - h, s, s);
  c.lineWidth = 1;
  c.strokeStyle = L.rgba(ACCENT, 0.35);
  c.strokeRect(x - h - 7, y - h - 7, s + 14, s + 14);
  // corner graduations
  c.beginPath();
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    c.moveTo(x + sx * (h + 7), y + sy * (h - 10)); c.lineTo(x + sx * (h + 7), y + sy * (h + 7)); c.lineTo(x + sx * (h - 10), y + sy * (h + 7));
  }
  c.strokeStyle = L.rgba(ACCENT, 0.8);
  c.stroke();
  // quarters: parchment fills that land with a small settle
  for (let q = 0; q < 4; q++) {
    const f = L.prog(t, LAND[q] - 0.04, 0.3);
    if (f <= 0) continue;
    const e = L.ease.outBack(f, 2.2);
    const cx = x + QX[q] * h / 2, cy = y + QY[q] * h / 2, w = (h - 3) * L.clamp(e, 0, 1.12);
    c.save();
    c.fillStyle = L.rgba(L.mix(PARCH, [250, 240, 214], 0.3 + 0.4 * (1 - L.clamp(f * 1.5))));
    c.fillRect(cx - w / 2, cy - w / 2, w, w);
    // the "¼" printed in each quarter (fades as the tile becomes one day)
    c.globalAlpha *= L.clamp(f * 2) * (1 - whole);
    c.fillStyle = L.rgba(INKC, 0.85);
    c.font = serif(Math.max(1, 34 * L.clamp(e, 0, 1.1)), 600);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('¼', cx, cy + 2);
    c.restore();
  }
  // whole: one parchment leaf, the dividers fade, FEB 29 prints
  if (whole > 0) {
    c.save();
    c.globalAlpha *= whole;
    const g = c.createLinearGradient(x - h, y - h, x + h, y + h);
    g.addColorStop(0, L.rgba(L.mix(PARCH, [252, 244, 222], 0.5))); g.addColorStop(1, L.rgba(PARCH_DK));
    c.fillStyle = g;
    c.fillRect(x - h, y - h, s, s);
    c.strokeStyle = L.rgba(INKC, 0.55);
    c.lineWidth = 1;
    c.strokeRect(x - h + 6, y - h + 6, s - 12, s - 12);
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    c.fillStyle = L.rgba(RUBRIC);
    c.font = serif(26, 700);
    L.trackedText(c, 'FEB', x, y - h + 38, 5, 'center');
    c.fillStyle = L.rgba(INKC);
    c.font = serif(70 + 6 * (1 - whole), 600);
    c.fillText('29', x, y + h - 22);
    c.restore();
  } else {
    // quarter dividers (on top of the fills)
    c.strokeStyle = L.rgba(ACCENT, 0.7);
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(x, y - h); c.lineTo(x, y + h); c.moveTo(x - h, y); c.lineTo(x + h, y);
    c.stroke();
  }
  c.restore();
}

/** the +¼ spark: from the Earth at the equinox down into its quadrant */
function spark(c, v, t, q) {
  const f = L.prog(t, LAUNCH[q], FLY);
  if (f <= 0 || f >= 1) return;
  const eq = orbitScreen(v, 0);
  const tx = TILE.x + QX[q] * TILE.s / 4, ty = TILE.y + QY[q] * TILE.s / 4;
  const e = L.ease.inOutCubic(f);
  const x = L.lerp(eq.x, tx, e) + Math.sin(Math.PI * e) * QX[q] * 26, y = L.lerp(eq.y + 14, ty, e);
  const a = Math.min(1, f * 5) * (1 - L.prog(f, 0.85, 0.15));
  c.save();
  // the trail
  c.strokeStyle = L.rgba(ACCENT, 0.5 * a);
  c.lineWidth = 2;
  c.lineCap = 'round';
  c.beginPath();
  for (let i = 0; i <= 12; i++) {
    const ee = Math.max(0, e - 0.22 * (i / 12));
    const px = L.lerp(eq.x, tx, ee) + Math.sin(Math.PI * ee) * QX[q] * 26, py = L.lerp(eq.y + 14, ty, ee);
    if (i) c.lineTo(px, py); else c.moveTo(px, py);
  }
  c.stroke();
  L.lightBlob(c, x, y, 34, [255, 214, 140], 0.6 * a);
  c.globalAlpha = a;
  c.font = L.font(30, 800, L.FONT.display);
  c.fillStyle = L.rgba(ACCENT);
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.shadowColor = 'rgba(2,6,14,0.9)';
  c.shadowBlur = 8;
  c.fillText('+¼', x + 16, y);
  c.restore();
}

/** the tally "365¼ DAYS": 365 lands on phrase 1, the ¼ slides in on "quarter" */
function tally(c, v, t) {
  const t365 = ph(v, 1) + 0.05, tQ = ph(v, 1) + phd(v, 1) * 0.64;
  const k = L.prog(t, t365, 0.55);
  if (k <= 0) return;
  const e = L.ease.outCubic(k), kq = L.ease.outBack(L.prog(t, tQ, 0.5), 1.6);
  const SZ = 124;
  c.save();
  c.globalAlpha *= L.clamp(k * 1.4);
  const size = L.fitSize(c, '365¼ DAYS', 640, SZ, 800, L.FONT.display, 60);
  c.font = L.font(size, 800, L.FONT.display);
  const wA = c.measureText('365').width, wQ = c.measureText('¼').width * L.clamp(kq, 0, 1.2), wB = c.measureText(' DAYS').width;
  const x0 = 540 - (wA + wQ + wB) / 2, y = TALLY_Y + (1 - e) * 26;
  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';
  c.shadowColor = 'rgba(2,6,14,0.75)';
  c.shadowBlur = 18;
  c.fillStyle = L.rgba(ACCENT);
  c.fillText('365', x0, y);
  if (kq > 0) {
    c.save();
    c.globalAlpha *= L.clamp(kq * 1.5);
    c.fillStyle = 'rgb(255,232,176)';
    c.fillText('¼', x0 + wA, y - (1 - L.clamp(kq)) * 30);
    c.restore();
    L.lightBlob(c, x0 + wA + wQ / 2, y - size * 0.35, 90, [255, 214, 140], 0.3 * (1 - L.prog(t, tQ + 0.2, 0.8)));
  }
  c.fillStyle = 'rgb(242,236,224)';
  c.fillText(' DAYS', x0 + wA + wQ, y);
  // engraved rule above (wipes in) and the small line under
  c.shadowBlur = 0;
  const rw = 220 * e;
  c.strokeStyle = L.rgba(ACCENT, 0.8);
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(540 - rw / 2, y - size * 0.86 - 22); c.lineTo(540 + rw / 2, y - size * 0.86 - 22); c.stroke();
  c.fillStyle = L.rgba(ACCENT);
  c.beginPath(); c.arc(540, y - size * 0.86 - 22, Math.max(0, 3.5 * e), 0, TAU); c.fill();
  const small = 'THE AVERAGE JULIAN YEAR';
  c.font = L.font(L.fitSize(c, small, 560, 28, 600, L.FONT.body, 16), 600, L.FONT.body);
  c.fillStyle = 'rgba(214,220,232,0.92)';
  c.shadowColor = 'rgba(2,6,14,0.8)'; c.shadowBlur = 8;
  L.trackedText(c, small, 540, y + 50 + (1 - e) * 14, 4, 'center');
  c.restore();
}

/** small tracked caption under the tile: YEAR 1 … YEAR 4, then LEAP DAY */
function yearLabel(c, v, t, k) {
  const lp = lapAt(v.gt, v.tl);
  const whole = L.prog(t, WHOLE, 0.4);
  const y = TILE.y + TILE.s / 2 + 52;
  // a navy plate under the label so env's dashed equinox radial does not run through the lettering
  c.save();
  c.globalAlpha *= k;
  const pg = c.createLinearGradient(TILE.x - 190, 0, TILE.x + 190, 0);
  pg.addColorStop(0, 'rgba(10,16,34,0)'); pg.addColorStop(0.2, 'rgba(10,16,34,0.92)'); pg.addColorStop(0.8, 'rgba(10,16,34,0.92)'); pg.addColorStop(1, 'rgba(10,16,34,0)');
  c.fillStyle = pg;
  c.fillRect(TILE.x - 190, y - 34, 380, 46);
  c.restore();
  c.save();
  c.globalAlpha *= k;
  c.textBaseline = 'alphabetic';
  c.shadowColor = 'rgba(2,6,14,0.85)'; c.shadowBlur = 8;
  if (whole < 1) {
    c.globalAlpha *= 1 - whole;
    const txt = `YEAR ${Math.min(4, lp.total < 0.02 ? 1 : lp.lap)}`;
    c.font = L.font(L.fitSize(c, txt, 300, 28, 700, L.FONT.body, 14), 700, L.FONT.body);
    c.fillStyle = 'rgba(226,230,238,0.9)';
    L.trackedText(c, txt, TILE.x, y, 5, 'center');
  }
  c.restore();
  if (whole > 0) {
    c.save();
    c.globalAlpha *= k * whole;
    c.shadowColor = 'rgba(2,6,14,0.85)'; c.shadowBlur = 8;
    c.font = L.font(L.fitSize(c, 'LEAP DAY', 300, 30, 800, L.FONT.body, 14), 800, L.FONT.body);
    c.fillStyle = L.rgba(ACCENT);
    L.trackedText(c, 'LEAP DAY', TILE.x, y + (1 - L.ease.outCubic(whole)) * 10, 6, 'center');
    c.restore();
  }
}

export default {
  beat: 3,
  chapter: { num: '03', title: 'The leap day', sub: 'every 4th year: February 29' },
  layer: 2,
  cues() {
    return [
      ...LAND.slice(0, 3).map((t, i) => ({ t: t - 0.03, name: 'tick', gain: 0.24, pitch: 1.0 + i * 0.12 })),
      { t: WHOLE, name: 'bloom', gain: 0.3, pitch: 1.0 },
      { t: 3.38, name: 'blip', gain: 0.2, pitch: 0.9 },     // "365" on phrase 1 (+3.33 s on the current timeline)
      { t: 5.07, name: 'ping', gain: 0.24, pitch: 1.25 },   // the ¼ on "quarter"
    ];
  },
  drawOverlay(c, v) {
    const k = v.k * L.prog(v.t, 1.5, 0.6);
    if (k <= 0) return;
    c.save();
    c.globalAlpha = k;
    dayTile(c, v.t, 1);
    for (let q = 0; q < 4; q++) spark(c, v, v.t, q);
    yearLabel(c, v, v.t, 1);
    tally(c, v, v.t);
    c.restore();
  },
};
