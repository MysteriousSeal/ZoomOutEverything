// Beat 15 — "Up there, weaker gravity makes their clocks run faster, | by about forty-five microseconds a day."
// Same frame, pushing in. On "Up there" the light climbs out of the well to B: the grid around the satellite is
// almost flat (weaker gravity) and B's ring turns clock-gold. Its clock starts to pull ahead of the ground clock (a
// gold wedge opens between the ghost ground-time hand and its own hand) while the tally counts up with it and locks
// on "forty-five": +45 µs, per day.
//
// SHARED: drawTally(ctx, v) — the act's running total (+45 → +38 µs). s15 draws it in beat 15, s16 in beat 16, both
// from the same function of gt, so it never fades between the beats.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, beatStart } from '../env.js';
import { T, leadAt } from './s14-einstein.js';

const TX = 80, TY = 800;   // tally baseline (left column, between B and the Earth)

/** The tally: rule, big number (counts with the satellite clock's lead), small line that changes with the story. */
export function drawTally(c, v) {
  const kk = T(v.tl), gt = v.gt;
  // fade in once the count is already climbing (≈ +5), so the first read is a moving number, not a big zero
  const tIn = kk.gainA + 0.37 * (kk.g45 - kk.gainA);
  const kin = L.prog(gt, tIn - 0.25, 0.5);
  const kout = L.ease.inCubic(L.prog(gt, kk.b17 - 0.05, 0.35));
  const k = L.ease.outCubic(kin) * (1 - kout);
  if (k <= 0.002) return;
  const lead = leadAt(gt, v.tl);
  const n = Math.round(lead);
  // lock pulses: on 45 and on 38
  const lk45 = gt > kk.g45 ? Math.exp(-(gt - kk.g45) * 3) : 0;
  const lk38 = gt > kk.t38 ? Math.exp(-(gt - kk.t38) * 3) : 0;
  const lock = Math.max(lk45, lk38);
  c.save();
  c.globalAlpha = L.clamp(k * 1.4);
  c.textBaseline = 'alphabetic';
  // soft backing over the grid
  c.save();
  c.translate(TX + 170, TY - 40); c.scale(1, 0.55);
  const bg = c.createRadialGradient(0, 0, 10, 0, 0, 340);
  bg.addColorStop(0, 'rgba(2,4,10,0.6)'); bg.addColorStop(0.6, 'rgba(2,4,10,0.3)'); bg.addColorStop(1, 'rgba(2,4,10,0)');
  c.fillStyle = bg; c.fillRect(-340, -340, 680, 680);
  c.restore();
  const e = L.ease.outCubic(k);
  c.fillStyle = L.rgba(ACCENT, 0.9);
  c.fillRect(TX, TY - 136, 90 * e, 4);
  // the number: tabular digits so the count never jitters sideways
  const size = 128;
  c.font = L.font(size, 800, L.FONT.display);
  const cell = c.measureText('0').width;
  const sign = '+';
  const digits = String(Math.max(0, n));
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 18;
  const bt = gt - (gt > kk.t38 ? kk.t38 : kk.g45);
  const bump = bt > 0 && bt < 0.35 ? 1 + 0.06 * Math.sin((bt / 0.35) * Math.PI) : 1;
  c.save();
  c.translate(TX, TY - size * 0.35 + (1 - e) * 26);
  c.scale(bump, bump);
  c.translate(-TX, -(TY - size * 0.35));
  c.fillStyle = L.rgba(L.mix(ACCENT, [255, 255, 255], 0.5 * lock));
  let x = TX;
  c.fillText(sign, x, TY); x += c.measureText(sign).width + 4;
  for (const ch of digits) { if (ch !== ' ') c.fillText(ch, x + (cell - c.measureText(ch).width) / 2, TY); x += cell; }
  x += 22;
  c.fillText('µs', x, TY);
  c.restore();
  if (lock > 0.02) L.lightBlob(c, TX + 150, TY - 45, 230, ACCENT, 0.22 * lock * k);
  // small line: what the number is, then (beat 16) the net
  c.shadowBlur = 8;
  c.font = L.font(30, 600, L.FONT.body);
  const sw = L.ease.inOutCubic(L.prog(gt, kk.so - 0.2, 0.5));   // "NET" as the count starts down from +45 (phrase 16.1)
  c.fillStyle = 'rgba(205,215,230,0.95)';
  if (sw < 1) {
    c.globalAlpha = L.clamp(k * 1.4) * (1 - L.clamp(sw * 2));
    L.trackedText(c, 'PER DAY · WEAKER GRAVITY', TX, TY + 52 + (1 - e) * 18, 3);
  }
  if (sw > 0) {
    c.globalAlpha = L.clamp(k * 1.4) * L.clamp(sw * 2 - 1);
    L.trackedText(c, 'EVERY DAY · NET', TX, TY + 52 + (1 - L.clamp(sw * 2 - 1)) * 10, 3);
  }
  c.restore();
}

export default {
  beat: 15,
  chapter: { num: '15', title: 'Weaker gravity', sub: 'general relativity' },
  captions: true,
  layer: 3,
  cues(d) {
    void d;
    // mirrors T(): "Up there" ≈ 0.15 s, the lead opens ≈ 0.95 s, locks on "forty-five" ≈ 4.85 s
    return [
      { t: 0.08, name: 'tick', gain: 0.16, pitch: 1.55 },        // the satellite clock opens
      { t: 0.1, name: 'shimmer', gain: 0.2, pitch: 0.9 },        // light climbs to B
      { t: 0.95, name: 'riser', gain: 0.16, pitch: 1.2 },        // the satellite clock pulls ahead
      { t: 1.0, name: 'count', gain: 0.14, pitch: 1.3 },
      { t: 4.85, name: 'ping', gain: 0.38, pitch: 1.1 },          // +45 µs
      { t: 4.86, name: 'tick', gain: 0.24, pitch: 1.3 },
    ];
  },
  drawWorld() {},
  drawOverlay(ctx, v) {
    if (v.gt < beatStart(v.tl, 16)) drawTally(ctx, v);
  },
};
