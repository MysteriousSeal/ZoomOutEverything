// Beat 1 (11c) — "Without it, | moonlit nights would be about a hundred times darker."
// 11c: the moonlight flashback (s01/s02) was cut, so this beat opens straight on the dark beach right after the
// blink. A refined log lux meter (1 → 0.001 lux) draws out from a "≈ 0.2 lux" full-Moon mark while the stars come
// out (s01's adaptedSky, drawn here); the marker then sinks two decades on its own clock (meterDrop),
// leaving a small Moon icon at 0.2 and a bracket that grows between the two levels. On "a hundred times darker"
// the bracket closes and the big label lands beside it: "100× darker" / "starlight only · ~0.002 lux".
import * as L from '../../../../engine/runtime/lib.js';
import { adaptedSky } from './s01-the-nights.js';
import { wordTime } from './s00-hook.js';
import { LUX, luxY, fmtLux, drawLux } from './s02-moonlight.js';

const TAU = Math.PI * 2;
const LUX0 = 0.2, LUX1 = 0.002;
const luxAt = (m) => Math.pow(10, L.lerp(Math.log10(LUX1), Math.log10(LUX0), m));
const landT = (v) => wordTime(v.tl, 1, /^(hundred|100\b)/i) - v.tl.scenes[1].start - 0.08;
/** 1 (full-Moon level) .. 0 (starlight): the marker holds at 0.2 lux while the meter draws out, then sinks two
 *  decades and is fully down (0.002 lux) by land − 0.35, before the readout fades on "hundred" (11b fix: the readout
 *  must land on 0.002). Beat-1 relative, pure function of time. */
function meterDrop(v) {
  const s = v.tl.scenes[1].start, t = v.gt - s;
  if (t < 0) return 1;
  const t0 = 0.7, t1 = landT(v) - 0.35;
  return 1 - L.smoothstep(L.prog(t, t0, Math.max(0.5, t1 - t0)));
}

function meter(c, v) {
  const t = v.t, acc = v.accent;
  const m = meterDrop(v);
  const lux = luxAt(m);
  const ym = luxY(lux), y02 = luxY(LUX0);
  const yTop = luxY(1), yBot = luxY(0.001);
  const land = landT(v);
  const tk = L.enter(t, 0.05, 0.9, L.ease.inOutCubic);   // track draws out from the 0.2 mark, both ways
  c.save();
  // track
  const ya = L.lerp(y02, yTop, tk), yb = L.lerp(y02, yBot, tk);
  c.strokeStyle = 'rgba(200,212,235,0.35)';
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(LUX.gx, ya); c.lineTo(LUX.gx, yb); c.stroke();
  // ticks: decades (labelled) and log minors
  c.textBaseline = 'middle';
  c.textAlign = 'right';
  c.font = L.font(25, 700, L.FONT.din);
  for (let dcd = 0; dcd >= -3; dcd--) {
    for (let n = 1; n <= 9; n++) {
      const val = n * Math.pow(10, dcd - 1) * 10;
      if (val > 1 + 1e-9 || val < 0.001 - 1e-12) continue;
      const y = luxY(val);
      if (y < ya - 0.5 || y > yb + 0.5) continue;
      const major = n === 1;
      const al = L.clamp(1 - Math.abs(y - y02) / 600 + tk * 1.2 - 0.2);
      c.strokeStyle = `rgba(200,212,235,${(major ? 0.75 : 0.35) * al})`;
      c.lineWidth = major ? 2 : 1.4;
      c.beginPath(); c.moveTo(LUX.gx - (major ? 14 : 7), y); c.lineTo(LUX.gx, y); c.stroke();
      if (major) {
        c.fillStyle = `rgba(190,202,225,${0.85 * al})`;
        c.fillText(fmtLux(val), LUX.gx - 22, y + 2);
      }
    }
  }
  c.textAlign = 'left';
  // unit tag at the top of the scale
  const uk = L.enter(t, 0.6, 0.5);
  if (uk > 0) {
    c.font = L.font(18, 700, L.FONT.body);
    c.textBaseline = 'middle';
    c.fillStyle = `rgba(175,190,215,${0.8 * uk})`;
    L.trackedText(c, 'LUX · LOG SCALE', LUX.gx + 16, yTop + 1, 2.5, 'left');
  }
  // level fill from the bottom of the scale up to the marker
  if (tk > 0) {
    const fg = c.createLinearGradient(0, ym, 0, yb);
    fg.addColorStop(0, L.rgba(acc, 0.9));
    fg.addColorStop(1, L.rgba(acc, 0.15));
    c.fillStyle = fg;
    c.fillRect(LUX.gx - 2.5, ym, 5, Math.max(0, yb - ym));
  }
  // the Moon icon left behind at 0.2 lux
  const gk = L.clamp((y02 - ym) / -30) * tk;
  if (gk > 0) {
    c.fillStyle = `rgba(232,234,236,${0.9 * gk})`;
    c.beginPath(); c.arc(LUX.gx, y02, Math.max(0, 7 * gk), 0, TAU); c.fill();
    L.lightBlob(c, LUX.gx, y02, 24, [200, 215, 255], 0.3 * gk);
    const fk = L.enter(t, 1.3, 0.5);
    if (fk > 0) {
      c.font = L.font(20, 600, L.FONT.body);
      c.fillStyle = `rgba(185,198,220,${0.85 * fk})`;
      L.trackedText(c, 'FULL MOON', LUX.lx + 4, y02 + 1, 2.5, 'left');
    }
  }
  // the bracket between the two levels (×100 once it closes)
  const span = ym - y02;
  if (span > 6) {
    const bx = LUX.gx + 22;
    c.strokeStyle = L.rgba(acc, 0.8);
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(bx - 8, y02); c.lineTo(bx, y02); c.lineTo(bx, ym); c.lineTo(bx - 8, ym); c.stroke();
  }
  // marker: an accent notch + glowing dot riding the level
  const pulse = L.prog(t, land - 0.05, 0.8);
  c.fillStyle = L.rgba(acc);
  const mk = L.ease.outBack(L.prog(t, 0.0, 0.4));   // the marker grows in with the track
  c.beginPath(); c.arc(LUX.gx, ym, Math.max(0, mk * 6.5 + (pulse > 0 && pulse < 1 ? 3 * Math.sin(Math.PI * pulse) : 0)), 0, TAU); c.fill();
  L.lightBlob(c, LUX.gx, ym, 30, acc, 0.22 * L.clamp(mk));
  if (pulse > 0 && pulse < 1) {
    c.strokeStyle = L.rgba(acc, 0.7 * (1 - pulse));
    c.lineWidth = 2;
    c.beginPath(); c.arc(LUX.gx, ym, Math.max(0, 8 + 36 * L.ease.outCubic(pulse)), 0, TAU); c.stroke();
  }
  c.restore();
  return { lux, ym, y02, land };
}

export default {
  beat: 1,
  chapter: { num: '01', title: 'Darker nights', sub: 'what starlight alone gives you' },
  captions: true,
  layer: 3,
  cues(d) {
    // 11c: the marker drops over t 0.7 – 2.56 (down before the readout fades); it crosses 0.1 lux at ≈ 1.17 and
    // 0.01 lux at ≈ 1.82; "hundred" ≈ 2.99 (label lands ≈ 2.95)
    return [
      { t: 0.2, name: 'deep', gain: 0.22, pitch: 0.7 },
      { t: 0.7, name: 'dive', gain: 0.2, pitch: 0.75 },
      { t: 1.17, name: 'tick', gain: 0.22, pitch: 1.1 },
      { t: 1.82, name: 'tick', gain: 0.22, pitch: 0.9 },
      { t: 2.93, name: 'impact', gain: 0.32, pitch: 0.7 },
      { t: 2.98, name: 'bloom', gain: 0.2, pitch: 0.6 },
    ];
  },
  drawWorld(ctx, v) {
    // the dark-adapted sky (stars, Milky Way, starlit shore): s01's, drawn every frame; it fades with skyK on the rise
    adaptedSky(ctx, v);
  },
  drawOverlay(ctx, v) {
    const t = v.t, acc = v.accent;
    // 11c: no s02 hand-off any more, so the overlay fades in with the engine's v.k (and out with it)
    const kout = v.k;
    ctx.save();
    ctx.globalAlpha *= kout;
    const { ym, y02, land } = meter(ctx, v);
    // the readout: sits on the marker at its final size from the start, counts down, then gives way to the big label
    const sh = 1;
    // it enters once the track has drawn out past the decades (never a number floating with no scale under it)
    const rk = L.enter(t, 0.5, 0.4) * (1 - L.ease.inCubic(L.prog(t, land - 0.28, 0.3)));
    // the digits are read at the frame time (not the motion-blur sub-frame), so they never ghost
    const luxF = luxAt(meterDrop({ ...v, gt: Math.round(v.gt * 30) / 30 }));
    drawLux(ctx, { x: LUX.lx + 16 * sh, yMark: ym, size: L.lerp(110, 60, sh), value: fmtLux(luxF), k: rk, accent: acc });
    // the big label beside the closed bracket
    const bk = L.prog(t, land + 0.04, 0.6);   // starts only once the readout has gone: no cross-fade overlap
    if (bk > 0) {
      const mid = (y02 + ym) / 2;
      L.bigLabel(ctx, { x: LUX.lx + 6, y: mid + 40, big: '100× DARKER', small: 'starlight only · ~0.002 lux', k: bk, accent: acc, size: 104 });
    }
    ctx.restore();
  },
};
