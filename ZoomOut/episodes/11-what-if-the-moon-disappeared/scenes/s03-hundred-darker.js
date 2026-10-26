// Beat 3 — "Without it, | those nights would be about a hundred times darker."
// The "≈ 0.2 lux" readout from s02 tightens into a refined log lux meter (1 → 0.001 lux) that draws down from it.
// "Without it": the Moon (and its beams) drain away with moonlight(); the meter's marker sinks two decades,
// leaving a small Moon icon at 0.2 and a bracket that grows between the two levels. On "a hundred times darker"
// the bracket closes and the big label lands beside it: "100× darker" / "starlight only · ~0.002 lux".
import * as L from '../../../../engine/runtime/lib.js';
import { drawSkyMoon, moonlight } from '../env.js';
import { wordTime } from './s00-hook.js';
import { LUX, luxY, fmtLux, drawLux, subLines } from './s02-moonlight.js';

const TAU = Math.PI * 2;
const LUX0 = 0.2, LUX1 = 0.002;
const luxAt = (m) => Math.pow(10, L.lerp(Math.log10(LUX1), Math.log10(LUX0), m));
const landT = (v) => wordTime(v.tl, 3, /^hundred/i) - v.tl.scenes[3].start - 0.08;

function meter(c, v) {
  const t = v.t, acc = v.accent;
  const m = moonlight(v);
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
  c.beginPath(); c.arc(LUX.gx, ym, Math.max(0, 6.5 + (pulse > 0 && pulse < 1 ? 3 * Math.sin(Math.PI * pulse) : 0)), 0, TAU); c.fill();
  L.lightBlob(c, LUX.gx, ym, 30, acc, 0.22);
  if (pulse > 0 && pulse < 1) {
    c.strokeStyle = L.rgba(acc, 0.7 * (1 - pulse));
    c.lineWidth = 2;
    c.beginPath(); c.arc(LUX.gx, ym, Math.max(0, 8 + 36 * L.ease.outCubic(pulse)), 0, TAU); c.stroke();
  }
  c.restore();
  return { lux, ym, y02, land };
}

export default {
  beat: 3,
  chapter: { num: '03', title: 'Darker nights', sub: 'what starlight alone gives you' },
  captions: true,
  layer: 3,
  cues(d) {
    // moonlight falls over t 0.3–3.7; the marker crosses 0.1 lux at t ≈ 1.16 and 0.01 lux at t ≈ 2.34; "hundred" ≈ 3.0
    return [
      { t: 0.2, name: 'deep', gain: 0.22, pitch: 0.7 },
      { t: 0.45, name: 'dive', gain: 0.2, pitch: 0.75 },
      { t: 1.16, name: 'tick', gain: 0.22, pitch: 1.1 },
      { t: 2.34, name: 'tick', gain: 0.22, pitch: 0.9 },
      { t: 2.95, name: 'impact', gain: 0.32, pitch: 0.7 },
      { t: 3.0, name: 'bloom', gain: 0.2, pitch: 0.6 },
    ];
  },
  drawWorld(ctx, v) {
    if (!v.active) return;
    const m = moonlight(v);
    drawSkyMoon(ctx, v, { k: m, s: L.lerp(0.9, 1, m) });
  },
  drawOverlay(ctx, v) {
    const t = v.t, acc = v.accent;
    // the overlay arrives already in place (hand-off from s02); only the exit uses v.k
    const kout = t < v.d ? 1 : v.k;
    ctx.save();
    ctx.globalAlpha *= kout;
    const { ym, y02, land } = meter(ctx, v);
    // the readout: shrinks from s02's big label onto the marker, counts down, then gives way to the big label
    const sh = L.ease.inOutCubic(L.prog(t, 0.05, 0.7));
    const rk = 1 - L.ease.inCubic(L.prog(t, land - 0.2, 0.4));
    // the digits are read at the frame time (not the motion-blur sub-frame), so they never ghost
    const luxF = luxAt(moonlight({ ...v, gt: Math.round(v.gt * 30) / 30 }));
    drawLux(ctx, { x: LUX.lx + 16 * sh, yMark: ym, size: L.lerp(110, 60, sh), value: fmtLux(luxF), k: rk, accent: acc });
    // s02's sub-line fades as the meter takes over
    const sk = 1 - L.prog(t, 0.0, 0.35);
    if (sk > 0) {
      ctx.save();
      ctx.globalAlpha *= sk;
      subLines(ctx, y02, (1 - sk) * 10);
      ctx.restore();
    }
    // the big label beside the closed bracket
    const bk = L.prog(t, land, 0.7);
    if (bk > 0) {
      const mid = (y02 + ym) / 2;
      L.bigLabel(ctx, { x: LUX.lx + 6, y: mid + 40, big: '100× DARKER', small: 'starlight only · ~0.002 lux', k: bk, accent: acc, size: 104 });
    }
    ctx.restore();
  },
};
