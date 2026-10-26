// Beat 1 — "Oceans cover seventy-one percent of the planet."
// The oceans light up and pulse (painted by s00's surface, see oceanGlow), while a fine ring around the globe
// sweeps clockwise from the north to 71% in step with the voice. Its glowing head carries the count; when it
// lands the arc flashes once and the remaining 29% (land) stays as a faint dotted track.
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH } from '../env.js';
import { wordTime } from './s00-hook.js';

const TAU = Math.PI * 2;
const PCT = 0.71;
const RING = 1.075;                 // ring radius / Earth radius

function sweep(v) {
  const t0 = wordTime(v.tl, 1, /^seventy/i) - 0.45;
  const t1 = wordTime(v.tl, 1, /^percent/i) + 0.3;
  return { k: L.ease.inOutCubic(L.prog(v.gt, t0, t1 - t0)), t1 };
}
/** Ring visibility: in with the beat, out as the camera leaves in beat 2. */
function ringVis(v) {
  const s = v.tl.scenes[1];
  return L.ease.outCubic(L.prog(v.gt, s.start + 0.1, 0.6)) * (1 - L.ease.inCubic(L.prog(v.gt, s.end - 0.15, 0.5)));
}

function drawRing(c, v) {
  const vis = ringVis(v);
  if (vis <= 0.001) return;
  const cx = v.wx(0), cy = v.wy(0), R = v.ws(R_EARTH) * RING;
  const { k, t1 } = sweep(v);
  const a0 = -Math.PI / 2, a1 = a0 + TAU * PCT * k, aEnd = a0 + TAU * PCT;
  const acc = v.accent;
  c.save();
  c.globalAlpha *= vis;
  // track: dotted, with a tick every 10%
  c.strokeStyle = 'rgba(200,215,235,0.22)';
  c.lineWidth = 1.5;
  c.setLineDash([2, 7]);
  c.beginPath(); c.arc(cx, cy, Math.max(0, R), 0, TAU); c.stroke();
  c.setLineDash([]);
  for (let i = 0; i < 10; i++) {
    const a = a0 + (TAU * i) / 10, on = i / 10 <= PCT * k + 1e-6;
    c.strokeStyle = on ? L.rgba(acc, 0.85) : 'rgba(200,215,235,0.35)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(cx + Math.cos(a) * (R - 7), cy + Math.sin(a) * (R - 7));
    c.lineTo(cx + Math.cos(a) * (R + 7), cy + Math.sin(a) * (R + 7));
    c.stroke();
  }
  if (k > 0) {
    // the arc: a soft glow under a crisp line
    c.lineCap = 'round';
    L.glow(c, acc, 18, () => {
      c.strokeStyle = L.rgba(acc, 0.55);
      c.lineWidth = 5;
      c.beginPath(); c.arc(cx, cy, Math.max(0, R), a0, a1); c.stroke();
    });
    c.strokeStyle = L.rgba([170, 225, 255], 0.95);
    c.lineWidth = 3;
    c.beginPath(); c.arc(cx, cy, Math.max(0, R), a0, a1); c.stroke();
    // landing flash travels the whole arc once
    const fp = L.prog(v.gt, t1 - 0.05, 0.7);
    if (fp > 0 && fp < 1) {
      const fa = a0 + (aEnd - a0) * L.ease.inOutCubic(fp);
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = `rgba(230,246,255,${0.9 * Math.sin(Math.PI * fp)})`;
      c.lineWidth = 5;
      c.beginPath(); c.arc(cx, cy, Math.max(0, R), Math.max(a0, fa - 0.5), fa); c.stroke();
      c.restore();
    }
    // head
    const hx = cx + Math.cos(a1) * R, hy = cy + Math.sin(a1) * R;
    const land = L.prog(v.gt, t1 - 0.1, 0.5);
    L.lightBlob(c, hx, hy, 46 + 30 * Math.sin(Math.PI * land), acc, 0.55);
    c.fillStyle = 'rgb(235,248,255)';
    c.beginPath(); c.arc(hx, hy, 5.5, 0, TAU); c.fill();
    // a ring pulse when it lands
    if (land > 0 && land < 1) {
      c.strokeStyle = L.rgba(acc, 0.7 * (1 - land));
      c.lineWidth = 2;
      c.beginPath(); c.arc(hx, hy, Math.max(0, 8 + 40 * L.ease.outCubic(land)), 0, TAU); c.stroke();
    }
  }
  c.restore();
}

export default {
  beat: 1,
  chapter: { num: '01', title: 'Ocean planet', sub: 'Salt water, seas and bays' },
  captions: true,
  layer: 2,
  cues(d) {
    // relative to the beat; matches the VO at the default voice settings
    return [
      { t: 0.15, name: 'bloom', gain: 0.3, pitch: 0.9 },
      { t: 0.45, name: 'shimmer', gain: 0.16, pitch: 1.2 },
      { t: 0.5, name: 'count', gain: 0.24, pitch: 1.0 },
      { t: 1.78, name: 'ping', gain: 0.36, pitch: 1.0 },
      { t: 1.82, name: 'swell', gain: 0.16, pitch: 1.1 },
    ];
  },
  drawWorld(ctx, v) {
    drawRing(ctx, v);
  },
  drawOverlay(ctx, v) {
    const { k, t1 } = sweep(v);
    const kin = L.prog(v.gt, wordTime(v.tl, 1, /^seventy/i) - 0.45, 0.5) * v.k;
    if (kin <= 0) return;
    const size = 112;
    const ringTop = v.wy(-R_EARTH * RING);
    // as high as the chapter card allows (rule line at ~288), so the numerals clear the ring's top
    const y = L.clamp(ringTop - 78, 288 + size * 0.92 + 26, 700);
    // soft dark scrim: the sub-label sits on the bright limb / ice cap, and the ring passes under the block
    ctx.save();
    ctx.globalAlpha *= L.clamp(kin * 1.4);
    ctx.translate(540, y - 6);
    ctx.scale(1, 0.36);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 430);
    g.addColorStop(0, 'rgba(3,8,18,0.82)');
    g.addColorStop(0.55, 'rgba(3,8,18,0.62)');
    g.addColorStop(1, 'rgba(3,8,18,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 430, 0, TAU); ctx.fill();
    ctx.restore();
    const n = Math.round(71 * k);
    // the number "lands" with a little scale pop
    const pop = 1 + 0.06 * Math.sin(Math.PI * L.prog(v.gt, t1 - 0.05, 0.35));
    ctx.save();
    ctx.translate(540, y);
    ctx.scale(pop, pop);
    L.bigLabel(ctx, { x: 0, y: 0, big: `${n}%`, small: 'of the surface is ocean', k: kin, accent: v.accent, align: 'center', size });
    ctx.restore();
  },
};
