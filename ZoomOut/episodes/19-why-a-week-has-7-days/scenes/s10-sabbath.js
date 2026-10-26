// Beat 10 — "The Jewish week, six days of work, then a Sabbath, | made seven a steady rhythm."
// Above the arc of the seven lights, a row of seven clay day-tiles hangs in the night sky (world space, so it rides
// the camera's drift and is carried away by the pull-back in beat 11):
//   * the seven empty slots draw in as hairlines at the beat start;
//   * on "six days of work" tiles 1-6 press in left to right (clay, an impressed numeral, WORK);
//   * on "Sabbath" the seventh lights up: pale gold clay, a candle flame, a warm glow;
//   * phrase 2 "made seven a steady rhythm": a pulse walks the row 1 → 7 like a metronome and the Sabbath flares.
// Label "6 + 1" / "days of work, then a Sabbath" (top left).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, skyK } from '../env.js';
import { KEYS } from '../camera.js';
import { TL, wordStart } from './s12-roman-days.js';

const K = KEYS[10];
const SX = (sx) => K.x + (sx - 540) * K.mpp;          // the tiles are laid out on the beat-10 frame, in world units
const SY = (sy) => K.y + (sy - 960) * K.mpp;
const ROW = { x0: 120, x1: 940, y0: 618, y1: 750, gap: 14 };   // hangs between the label and the arc (horizon at y 1530)
const TW = (ROW.x1 - ROW.x0 - 6 * ROW.gap) / 7;
const TILES = Array.from({ length: 7 }, (_, i) => {
  const sx0 = ROW.x0 + i * (TW + ROW.gap);
  return { x0: SX(sx0), x1: SX(sx0 + TW), y0: SY(ROW.y0), y1: SY(ROW.y1) };
});

// ------------------------------------------------------------------ timing (global s, from the timeline)
const P0 = TL.lines[10].phrases[0], P1 = TL.lines[10].phrases[1];
const T10 = TL.scenes[10].start, T11 = TL.scenes[11].start;
const W_SIX = wordStart(P0, 3), W_THEN = wordStart(P0, 7), W_SAB = wordStart(P0, 9);
const FILL = Array.from({ length: 6 }, (_, i) => W_SIX + 0.02 + i * (W_THEN - W_SIX - 0.12) / 5);
FILL.push(W_SAB - 0.12);
const PULSE0 = P1.start + 0.05, PULSE_DT = 0.15;
const T_LABEL = FILL[6] + 0.35 - T10;

const CLAY_T = [150, 108, 72], CLAY_B = [92, 62, 42];
const GOLD_T = [252, 230, 184], GOLD_B = [214, 166, 98];
const IMPRESS = [48, 30, 18];

function flameShape(c, x, y, h, sway) {
  const w = h * 0.36;
  c.beginPath();
  c.moveTo(x + sway * h * 0.25, y - h);
  c.bezierCurveTo(x + w * 0.9, y - h * 0.45, x + w, y - h * 0.05, x, y);
  c.bezierCurveTo(x - w, y - h * 0.05, x - w * 0.9, y - h * 0.45, x + sway * h * 0.25, y - h);
  c.closePath();
}

function drawTile(c, v, i, kAll) {
  const T = TILES[i];
  const x = v.wx(T.x0), y = v.wy(T.y0), w = v.ws(T.x1 - T.x0), h = v.ws(T.y1 - T.y0);
  if (x > L.W + 20 || x + w < -20 || y > L.H + 20 || y + h < -20) return;
  const gt = v.gt;
  const sab = i === 6;
  const s = w / TW;                                       // 1 at the beat-10 framing
  // slot (hairline) draws in at the beat start
  const ks = L.ease.outCubic(L.prog(gt, T10 + 0.15 + 0.06 * i, 0.45));
  const kf = L.prog(gt, FILL[i], 0.5);
  const ef = L.ease.outBack(kf, 1.4), af = L.ease.outCubic(L.prog(gt, FILL[i], 0.3));
  // the rhythm pulse (phrase 2)
  const dp = gt - (PULSE0 + i * PULSE_DT);
  const pulse = dp > -0.05 ? Math.exp(-Math.pow((dp - 0.08) / 0.11, 2)) : 0;
  const flare = sab ? Math.exp(-Math.pow((gt - (PULSE0 + 6 * PULSE_DT + 0.15)) / 0.35, 2)) : 0;
  c.save();
  c.globalAlpha = kAll;
  const r = 10 * s;
  if (af < 1) {
    c.strokeStyle = L.rgba([235, 220, 190], 0.28 * ks * (1 - af));
    c.lineWidth = 1.5;
    c.setLineDash([6 * s, 5 * s]);
    L.roundRect(c, x + 0.75, y + 0.75, w - 1.5, h - 1.5, r);
    c.stroke();
    c.setLineDash([]);
  }
  if (af <= 0) { c.restore(); return; }
  // pressed in: drops a little and settles with an overshoot
  const sc = L.lerp(0.84, 1, ef) * (1 + 0.04 * pulse);
  const lift = (1 - L.ease.outCubic(kf)) * -22 * s - 6 * s * pulse;
  const cx = x + w / 2, cy = y + h / 2 + lift;
  c.translate(cx, cy); c.scale(sc, sc); c.translate(-w / 2, -h / 2);
  c.globalAlpha = kAll * af;
  // Sabbath glow behind the tile (candle light), flickering
  const fl = 1 + 0.12 * L.noise1(gt * 7, 3) + 0.06 * L.noise1(gt * 17, 5);
  if (sab) {
    L.lightBlob(c, w / 2, h * 0.3, w * (1.9 + 0.8 * flare) * fl, [255, 196, 110], (0.42 + 0.35 * flare) * af);
  }
  if (pulse > 0.01 && !sab) L.lightBlob(c, w / 2, h / 2, w * 1.1, ACCENT, 0.22 * pulse);
  // drop shadow + body
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 16 * s; c.shadowOffsetY = 6 * s;
  const g = c.createLinearGradient(0, 0, w * 0.3, h);
  const top = sab ? GOLD_T : L.mix(CLAY_T, [205, 160, 110], 0.5 * pulse), bot = sab ? GOLD_B : L.mix(CLAY_B, [150, 108, 70], 0.5 * pulse);
  g.addColorStop(0, L.rgba(top)); g.addColorStop(1, L.rgba(bot));
  c.fillStyle = g;
  L.roundRect(c, 0, 0, w, h, r);
  c.fill();
  c.restore();
  // edges: a lit top lip, a darker rim
  c.strokeStyle = 'rgba(30,18,10,0.55)'; c.lineWidth = 1.5;
  L.roundRect(c, 0.75, 0.75, w - 1.5, h - 1.5, r); c.stroke();
  c.strokeStyle = L.rgba([255, 228, 180], sab ? 0.7 : 0.35); c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(r, 1.5); c.lineTo(w - r, 1.5); c.stroke();
  // faint ruled lines like a tablet
  c.strokeStyle = L.rgba(IMPRESS, 0.1); c.lineWidth = 1;
  for (let k = 1; k <= 3; k++) { const ly = h * (0.18 * k + 0.02); c.beginPath(); c.moveTo(w * 0.12, ly); c.lineTo(w * 0.88, ly); c.stroke(); }
  // impressed text: dark glyph + a light lower edge
  const impress = (str, px, py, f, track, a = 0.85) => {
    c.font = f;
    c.fillStyle = L.rgba([255, 226, 180], 0.28 * a);
    L.trackedText(c, str, px, py + 1.4 * s, track, 'center');
    c.fillStyle = L.rgba(IMPRESS, a);
    L.trackedText(c, str, px, py, track, 'center');
  };
  c.textBaseline = 'alphabetic';
  if (!sab) {
    impress(String(i + 1), w / 2, h * 0.6, L.font(58 * s, 700, L.FONT.din), 0);
    impress('WORK', w / 2, h * 0.87, L.font(21 * s, 700, L.FONT.body), 2.5 * s, 0.86);
  } else {
    // candle: a short wax stick, a wick and a flickering flame
    const bx = w / 2, by = h * 0.66;
    c.fillStyle = 'rgba(255,248,232,0.95)';
    L.roundRect(c, bx - 6 * s, by - 18 * s, 12 * s, 26 * s, 2 * s); c.fill();
    c.fillStyle = 'rgba(120,80,40,0.35)';
    c.fillRect(bx + 2 * s, by - 18 * s, 4 * s, 26 * s);
    c.strokeStyle = 'rgba(40,24,12,0.9)'; c.lineWidth = 1.5 * s;
    c.beginPath(); c.moveTo(bx, by - 18 * s); c.lineTo(bx, by - 23 * s); c.stroke();
    const fh = 40 * s * fl * (1 + 0.25 * flare) * L.ease.outBack(L.prog(gt, FILL[6] + 0.15, 0.5));
    const sway = 0.35 * L.noise1(gt * 3.1, 9);
    if (fh > 0.5) {
      L.lightBlob(c, bx, by - 23 * s - fh * 0.45, fh * 1.6, [255, 190, 90], 0.75);
      flameShape(c, bx, by - 22 * s, fh, sway);
      const fg = c.createLinearGradient(0, by - 22 * s - fh, 0, by - 22 * s);
      fg.addColorStop(0, 'rgba(255,240,200,0.95)'); fg.addColorStop(0.55, 'rgba(255,196,96,0.95)'); fg.addColorStop(1, 'rgba(230,110,40,0.9)');
      c.fillStyle = fg; c.fill();
      flameShape(c, bx, by - 24 * s, fh * 0.5, sway * 0.6);
      c.fillStyle = 'rgba(255,255,245,0.9)'; c.fill();
    }
    impress('SABBATH', w / 2, h * 0.89, L.font(18.5 * s, 700, L.FONT.body), 0.5 * s, 0.9);
    impress('7', w * 0.17, h * 0.2, L.font(22 * s, 700, L.FONT.din), 0, 0.7);
  }
  c.restore();
}

export default {
  beat: 10,
  chapter: { num: '10', title: 'The Sabbath', sub: 'The Jewish week' },
  captions: true,
  layer: 1,
  cues(d) {
    const out = [{ t: 0.15, name: 'swish', gain: 0.14, pitch: 1.1 }];
    FILL.slice(0, 6).forEach((t, i) => out.push({ t: t - T10 + 0.05, name: 'tick', gain: 0.16, pitch: 0.8 + i * 0.05 }));
    out.push({ t: FILL[6] - T10 + 0.1, name: 'bloom', gain: 0.3, pitch: 0.9 });
    out.push({ t: FILL[6] - T10 + 0.2, name: 'shimmer', gain: 0.14, pitch: 1.2 });
    out.push({ t: T_LABEL + 0.05, name: 'ping', gain: 0.16, pitch: 1.0 });
    for (let i = 0; i < 7; i++) out.push({ t: PULSE0 - T10 + i * PULSE_DT, name: 'blip', gain: i === 6 ? 0.2 : 0.1, pitch: i === 6 ? 0.8 : 1.25 });
    return out;
  },
  drawWorld(c, v) {
    const gt = v.gt;
    if (gt < T10 - 0.05 || gt > T11 + 0.8) return;
    const kAll = skyK(v) * (1 - L.ease.inCubic(L.prog(gt, T11 - 0.05, 0.5)));
    if (kAll <= 0.002) return;
    for (let i = 0; i < 7; i++) drawTile(c, v, i, kAll);
  },
  drawOverlay(c, v) {
    const k = v.k * L.enter(v.t, T_LABEL, 0.55);
    L.bigLabel(c, { x: 100, y: 470, big: '6 + 1', small: 'days of work, then a Sabbath', k, accent: v.accent, size: 110 });
  },
};
