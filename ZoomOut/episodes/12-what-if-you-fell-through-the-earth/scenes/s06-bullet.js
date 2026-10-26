// Beat 6 — eight times faster than a rifle bullet. As the faller leaves the inner core (its boundary rings again), a
// comparison plate slides in under them: two lanes, "the same second". A rifle bullet (~1 km/s) and the faller
// (~8 km/s) launch together; the faller's dot streaks the full lane while the bullet only covers an eighth of it. The
// faller's dot arrives under "≈ 8×", which lands on "eight times".
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, RADIUS } from '../camera.js';
import { plate, boundaryFlash, crossTime } from './s04-inner-core.js';

const COOL = [215, 232, 255];
const BRASS = [214, 178, 112];
const RACE = [0.5, 0.6];          // beat-local start, duration
const EIGHT = 1.12;               // "≈ 8×" lands as the dot arrives ("eight times")
const ICB_OUT = crossTime(R_EARTH + RADIUS.icb, 24.4, 31.4);   // global: leaves the inner core

const BOX = { x: 214, y: 690, w: 744, h: 420 };
const X0 = BOX.x + 46, X1 = BOX.x + BOX.w - 46;
const LANE_A = BOX.y + 250, LANE_B = BOX.y + 360;

function bullet(ctx, x, y, a) {
  ctx.save();
  ctx.globalAlpha *= a;
  const g = ctx.createLinearGradient(0, y - 6, 0, y + 6);
  g.addColorStop(0, 'rgb(250,226,170)'); g.addColorStop(0.5, L.rgba(BRASS)); g.addColorStop(1, 'rgb(120,92,52)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 26, y - 5.5); ctx.lineTo(x - 8, y - 5.5);
  ctx.quadraticCurveTo(x + 6, y - 5, x + 12, y);
  ctx.quadraticCurveTo(x + 6, y + 5, x - 8, y + 5.5);
  ctx.lineTo(x - 26, y + 5.5); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(60,40,20,0.6)';
  ctx.fillRect(x - 20, y - 5.5, 1.5, 11);
  ctx.restore();
}

function lane(ctx, y, x, head, col, label, k) {
  // track
  ctx.fillStyle = 'rgba(255,236,220,0.14)';
  ctx.fillRect(X0, y - 0.5, (X1 - X0) * L.ease.outCubic(k), 1);
  // start notch + end notch
  ctx.fillStyle = 'rgba(255,236,220,0.45)';
  ctx.fillRect(X0 - 1, y - 9, 2, 18);
  // trail behind the head
  if (x > X0 + 2) {
    const g = ctx.createLinearGradient(X0, 0, x, 0);
    g.addColorStop(0, L.rgba(col, 0));
    g.addColorStop(1, L.rgba(col, 0.75));
    ctx.fillStyle = g;
    ctx.fillRect(X0, y - 1.5, x - X0, 3);
  }
  head();
  // label above the lane
  ctx.save();
  ctx.font = L.font(21, 700, L.FONT.body);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = L.rgba(col, 0.95 * L.clamp(k * 1.5));
  L.trackedText(ctx, label, X0 + (1 - L.ease.outCubic(k)) * 14, y - 26, 3);
  ctx.restore();
}

export default {
  beat: 6,
  chapter: { num: '06', title: 'Faster than a bullet', sub: 'A rifle bullet: about 1 km/s' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: ICB_OUT - 27.717, name: 'shimmer', gain: 0.22, pitch: 0.9 },
      { t: 0.32, name: 'blip', gain: 0.18, pitch: 1.1 },
      { t: RACE[0], name: 'swish', gain: 0.42, pitch: 1.4 },
      { t: RACE[0] + 0.02, name: 'tick', gain: 0.22, pitch: 0.8 },
      { t: EIGHT, name: 'impact', gain: 0.42, pitch: 1.1 },
      { t: EIGHT + 0.08, name: 'bloom', gain: 0.24, pitch: 1.2 },
    ];
  },

  drawWorld(ctx, v) {
    if (v.gt < ICB_OUT - 0.2 || v.gt > ICB_OUT + 1.8) return;
    boundaryFlash(ctx, v, RADIUS.icb, v.gt - ICB_OUT);
  },

  drawOverlay(ctx, v) {
    const t = v.t;
    const pk = L.enter(t, 0.3, 0.42) * v.k;   // after s05's gauge plate has fully gone
    if (pk <= 0) return;
    plate(ctx, BOX.x, BOX.y + (1 - L.ease.outCubic(pk)) * 26, BOX.w, BOX.h, pk, 20, 0.96);
    ctx.save();
    ctx.globalAlpha *= L.clamp(pk * 1.3);
    // header
    ctx.font = L.font(20, 700, L.FONT.body);
    ctx.fillStyle = 'rgba(225,215,205,0.7)';
    ctx.textBaseline = 'alphabetic';
    L.trackedText(ctx, 'IN THE SAME ONE SECOND', X0, BOX.y + 70, 4);
    // race: constant speed (a brief ease-in so it doesn't jump)
    const p = L.clamp((t - RACE[0]) / RACE[1]);
    const pe = p < 0.12 ? (p * p) / 0.24 : p - 0.06;      // C1 ease-in, then linear
    const pf = L.clamp(pe / 0.94);
    const xb = L.lerp(X0, X1, pf), xa = L.lerp(X0, X0 + (X1 - X0) / 8, pf);
    const ka = L.prog(t, 0.36, 0.42), kb = L.prog(t, 0.42, 0.42);
    lane(ctx, LANE_A, xa, () => bullet(ctx, Math.max(X0 + 26, xa), LANE_A, ka), BRASS, 'RIFLE BULLET  ·  1 KM/S', ka);
    lane(ctx, LANE_B, xb, () => {
      const arrive = Math.exp(-Math.max(0, t - RACE[0] - RACE[1]) * 3) * (t > RACE[0] + RACE[1] ? 1 : 0);
      L.lightBlob(ctx, xb, LANE_B, 40 + 60 * arrive, [170, 200, 255], 0.5 + 0.4 * arrive);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(190,215,255,0.9)'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(xb, LANE_B, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }, COOL, 'YOU  ·  8 KM/S', kb);
    // eighths: tick marks under the faller lane, the first one shared with the bullet
    const tk = L.prog(t, RACE[0] + RACE[1] + 0.05, 0.6);
    for (let i = 1; i <= 8; i++) {
      const a = L.clamp(tk * 8 - (i - 1));
      if (a <= 0) continue;
      const x = L.lerp(X0, X1, i / 8);
      ctx.fillStyle = `rgba(255,236,220,${0.45 * a})`;
      ctx.fillRect(x - 0.75, LANE_B + 14, 1.5, 10);
    }
    const ek = L.prog(t, RACE[0] + RACE[1] + 0.05, 0.4);
    if (ek > 0) {
      // dashed guide: the bullet's reach is one eighth of yours
      const xe = L.lerp(X0, X1, 1 / 8);
      ctx.strokeStyle = `rgba(214,178,112,${0.5 * ek})`;
      ctx.setLineDash([3, 5]);
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(xe, LANE_A + 10); ctx.lineTo(xe, LANE_B + 24); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    L.bigLabel(ctx, { x: X1, y: BOX.y + 148, big: '≈ 8×', small: '', k: L.enter(t, EIGHT, 0.5) * v.k, accent: v.accent, size: 116, align: 'right' });
  },
};
