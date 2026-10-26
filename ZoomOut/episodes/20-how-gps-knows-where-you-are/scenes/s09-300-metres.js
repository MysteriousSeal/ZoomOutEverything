// Beat 9 — "Off by a millionth of a second, | and you'd miss by three hundred meters."
// The pull-back along the street (0.6 m/px). A gold readout names the error first: the clock is off by
// 0.000 001 s. Over you, a map-style location pin; on "miss by three hundred meters" its ghost peels away and slides
// 300 m east down the street (true scale), drawing a dimension bracket behind it, then "300 m" lands over the gap.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, DOT, CLOCK, beatStart } from '../env.js';
import { drawReadout, wordT } from './s04-atomic-clocks.js';

const MISS = 299.79;                    // metres: light in 1 µs
const SLIDE = 1.0;                      // s: the ghost's slide; it stops just as the VO says "three hundred"
const PIN_H = 34;                       // metres above the street where the pins float (≈ 57 px at 0.6 m/px)

function times(v) {
  const tErr = wordT(v.tl, 9, 0, 3) - 0.1;            // "millionth"
  const tGo = wordT(v.tl, 9, 1, 1);                    // "you'd"
  return { tErr, tGo, tStop: tGo + SLIDE };
}

/** A map location pin (screen px): ghost = hollow, dashed accuracy ring. */
function pin(ctx, x, y, gy, k, ghost, t) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha *= k;
  // a soft dark scrim so the pin holds over the lit skyline
  const sg = ctx.createRadialGradient(x, y, 4, x, y, 70);
  sg.addColorStop(0, 'rgba(4,7,16,0.65)'); sg.addColorStop(1, 'rgba(4,7,16,0)');
  ctx.fillStyle = sg; ctx.fillRect(x - 70, y - 70, 140, 140);
  // drop line to the street
  ctx.strokeStyle = L.rgba(DOT, ghost ? 0.35 : 0.5);
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 5]);
  ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x, gy); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = L.rgba(DOT, ghost ? 0.25 : 0.4);
  ctx.beginPath(); ctx.ellipse(x, gy, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
  if (!ghost) {
    L.lightBlob(ctx, x, y, 70 * (1 + 0.06 * Math.sin(t * 3)), DOT, 0.6);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = L.rgba(DOT);
    ctx.beginPath(); ctx.arc(x, y, 13.5, 0, Math.PI * 2); ctx.fill();
  } else {
    L.lightBlob(ctx, x, y, 60, DOT, 0.3);
    ctx.strokeStyle = L.rgba(L.mix(DOT, [255, 255, 255], 0.3), 0.75); ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -t * 12;
    ctx.beginPath(); ctx.arc(x, y, 44, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(235,242,255,0.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = L.rgba(DOT, 0.45);
    ctx.beginPath(); ctx.arc(x, y, 12.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export default {
  beat: 9,
  chapter: { num: '09', title: 'One microsecond', sub: 'a millionth of a second' },
  captions: true,
  layer: 6,
  cues(d) {
    // mirrors times() with the current timeline: tGo = wordT(9,1,1) = 2.47 ("you'd"), tStop = tGo + SLIDE
    const te = 0.5, tg = 2.47;
    return [
      { t: 0.05, name: 'whoosh', gain: 0.26, pitch: 0.9 },
      { t: te, name: 'tick', gain: 0.2, pitch: 1.2 },
      { t: tg - 0.05, name: 'swish', gain: 0.3, pitch: 1.1 },
      { t: tg + SLIDE, name: 'impact', gain: 0.3, pitch: 1.1 },
      { t: tg + SLIDE + 0.05, name: 'ping', gain: 0.26, pitch: 0.95 },
    ];
  },
  drawWorld(ctx, v) {
    const t = v.t;
    if (t < 0.6 || t > v.d + 1.2) return;
    const mpp = v.cam.mpp;
    // the pins read at street scale (≈ 0.05 – 3 m/px)
    const sk = L.clamp(L.invLerp(Math.log(0.04), Math.log(0.25), Math.log(mpp))) * (1 - L.clamp(L.invLerp(Math.log(4), Math.log(20), Math.log(mpp))));
    if (sk <= 0) return;
    const { tGo, tStop } = times(v);
    const out = 1 - L.ease.inCubic(L.prog(t, v.d - 0.1, 0.5));
    const k = sk * out * L.ease.outBack(L.clamp(L.prog(t, 1.0, 0.5)), 1.5);
    const gy = v.wy(0);
    const y = v.wy(-PIN_H);
    const x0 = v.wx(0);
    const mv = L.ease.inOutCubic(L.prog(t, tGo, tStop - tGo));
    const gx = v.wx(MISS * mv);
    // the bracket draws itself behind the ghost, then gets its end tick
    if (mv > 0) {
      const by = v.wy(-PIN_H - 34);
      ctx.save();
      ctx.globalAlpha = k;
      ctx.strokeStyle = 'rgba(235,240,250,0.85)'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x0, by + 14); ctx.lineTo(x0, by); ctx.lineTo(gx, by);
      if (mv >= 1) ctx.lineTo(gx, by + 14);
      ctx.stroke();
      // fine 50 m graduation ticks behind the ghost
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(235,240,250,0.45)';
      ctx.beginPath();
      for (let m = 50; m < MISS * mv - 1; m += 50) { const xx = v.wx(m); ctx.moveTo(xx, by); ctx.lineTo(xx, by + 7); }
      ctx.stroke();
      // the gap glows a little on arrival
      const land = L.prog(t, tStop, 0.8);
      if (land > 0 && land < 1) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = L.rgba(ACCENT, 0.8 * (1 - land)); ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x0, by); ctx.lineTo(gx, by); ctx.stroke();
      }
      ctx.restore();
    }
    // a faint motion trail behind the ghost while it slides
    if (mv > 0 && mv < 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const tx = v.wx(MISS * Math.max(0, mv - 0.12));
      const g = ctx.createLinearGradient(tx, 0, gx, 0);
      g.addColorStop(0, L.rgba(DOT, 0)); g.addColorStop(1, L.rgba(DOT, 0.5 * k));
      ctx.strokeStyle = g; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tx, y); ctx.lineTo(gx, y); ctx.stroke();
      ctx.restore();
    }
    const ghostK = k * L.clamp(L.prog(t, tGo - 0.3, 0.3));
    pin(ctx, gx, y, gy, ghostK, true, v.gt);
    pin(ctx, x0, y, gy, k, false, v.gt);
    // tiny tags under the street line: who is where
    ctx.save();
    ctx.font = L.font(19, 700, L.FONT.body);
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 6;
    ctx.globalAlpha = k;
    ctx.fillStyle = 'rgba(235,242,255,0.9)';
    L.trackedText(ctx, 'YOU', x0, gy + 40, 3, 'center');
    ctx.globalAlpha = ghostK * L.clamp(L.prog(t, tGo + 0.2, 0.4));
    ctx.fillStyle = L.rgba(L.mix(DOT, [255, 255, 255], 0.4));
    L.trackedText(ctx, 'WHERE GPS PUTS YOU', gx, gy + 40, 3, 'center');
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    const { tErr, tGo, tStop } = times(v);
    drawReadout(ctx, {
      x: 80, y: 560, align: 'left', size: 92, k: v.k * L.enter(t, tErr, 0.5),
      text: '0.000 001 s', label: 'clock off by one microsecond', lock: t - tErr - 0.35,
    });
    // "300 m" lands over the gap once the ghost stops
    const x0 = v.wx(0), x1 = v.wx(MISS);
    const lk = v.k * L.enter(t, tStop - 0.3, 0.5);      // on "three"
    if (lk > 0) {
      // dark scrim behind the label + bracket (the skyline is busy)
      const cx = (x0 + x1) / 2, cy = v.wy(-PIN_H - 34) - 80;
      ctx.save();
      ctx.globalAlpha = L.clamp(lk);
      ctx.translate(cx, cy); ctx.scale(1, 0.5);
      const g = ctx.createRadialGradient(0, 0, 20, 0, 0, 380);
      g.addColorStop(0, 'rgba(3,6,14,0.72)'); g.addColorStop(0.6, 'rgba(3,6,14,0.45)'); g.addColorStop(1, 'rgba(3,6,14,0)');
      ctx.fillStyle = g; ctx.fillRect(-380, -380, 760, 760);
      ctx.restore();
    }
    L.bigLabel(ctx, { x: (x0 + x1) / 2, y: v.wy(-PIN_H - 34) - 74, big: '300 m', small: 'about 1,000 ft', k: lk, accent: ACCENT, align: 'center', size: 120 });
  },
};
