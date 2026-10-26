// Beat 8 — the Kármán line at 100 km.
// A glowing line draws across the black sky (left to right, a bright spark at its head) while the camera
// settles on it. Beneath it a faint green airglow layer (the real ~90–100 km airglow) breathes. On
// "Officially, space." a light sweep runs along the line and extra stars come out, but only above it.
// The line stays in the world for the rest of the film: in the globe pull-back it becomes a thin circle
// at R + 100 km (s11 calls drawKarman() again inside its magnifier).
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, ALT } from '../camera.js';

const { W, H } = L;
const ACC = [150, 170, 255];
const GLOW = [120, 150, 255];
const AIRGLOW = [110, 235, 170];
const DRAW = [0.6, 1.3];            // line draws across (beat time): starts as it enters the frame on "one hundred kilometers"
const OFFICIAL = 3.62;              // "Officially, space."
const STARS = (() => { const r = L.rng(808); return Array.from({ length: 70 }, () => [r(), r(), r(), r()]); })();

/** Draw progress of the line (0..1) at beat-8 time t. Before the beat it is not drawn; after, it is full. */
export const drawK = (t) => L.ease.inOutCubic(L.prog(t, DRAW[0], DRAW[1]));

/**
 * The Kármán line in world space for any view (also used by s11's magnifier with a scaled view).
 * k = draw progress (0..1, wipes left to right), a = overall alpha, pulse = 0..1 extra glow.
 */
export function drawKarman(c, v, k = 1, a = 1, pulse = 0, opts = {}) {
  if (k <= 0 || a <= 0) return;
  const mpp = v.cam.mpp;
  const rr = v.ws(R_EARTH + ALT.karman);
  const cx = v.wx(0), cy = v.wy(R_EARTH);
  const far = L.clamp(L.invLerp(Math.log(1500), Math.log(6000), Math.log(mpp)));   // 0 = side view line, 1 = globe ring
  c.save();
  c.globalAlpha *= a;
  if (rr > 2e5 || far <= 0) {
    // side view: a (very slightly curved) line across the frame
    const y0 = v.wy(-ALT.karman);
    if (y0 < -200 || y0 > H + 200) { c.restore(); return; }
    const sag = (x) => ((x - cx) * (x - cx)) / (2 * rr);   // circle approximated by a parabola (sub-pixel exact)
    const x1 = L.lerp(-20, W + 20, k);
    const pts = [];
    for (let x = -20; x <= x1 + 0.1; x += 30) pts.push([x, y0 + sag(x)]);
    pts.push([x1, y0 + sag(x1)]);
    const line = () => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); };
    // airglow layer just below the line (thin green, ~90–100 km)
    const agH = Math.min(70, Math.max(5, (ALT.karman - 94000) / mpp));
    const ag = c.createLinearGradient(0, y0, 0, y0 + agH);
    const breathe = 0.75 + 0.25 * Math.sin(v.gt * 1.3);
    ag.addColorStop(0, L.rgba(AIRGLOW, 0));
    ag.addColorStop(0.3, L.rgba(AIRGLOW, 0.07 * breathe * (1 + pulse)));
    ag.addColorStop(1, L.rgba(AIRGLOW, 0));
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = ag;
    c.fillRect(-20, y0, x1 + 20, agH + 4);
    // wide soft band (above and below)
    const bh = 74 + 40 * pulse;
    const bg = c.createLinearGradient(0, y0 - bh, 0, y0 + bh);
    bg.addColorStop(0, L.rgba(GLOW, 0));
    bg.addColorStop(0.5, L.rgba(GLOW, 0.16 + 0.14 * pulse));
    bg.addColorStop(1, L.rgba(GLOW, 0));
    c.fillStyle = bg;
    c.fillRect(-20, y0 - bh, x1 + 20, bh * 2);
    c.restore();
    // the line: a blurred glow pass + crisp core
    L.glow(c, GLOW, 18, () => { line(); c.strokeStyle = L.rgba(ACC, 0.55); c.lineWidth = 4; c.stroke(); }, 0.8 + 0.2 * pulse);
    line();
    c.strokeStyle = L.rgba([225, 232, 255], 0.95);
    c.lineWidth = 2;
    c.stroke();
    // fine dash ticks hanging under the line (instrument feel)
    if (!opts.noTicks) {
      c.fillStyle = L.rgba(ACC, 0.45);
      for (let x = 180; x < x1; x += 60) c.fillRect(x, y0 + sag(x) + 6, 1.5, 7);
    }
    // the drawing head: a bright spark while it travels
    if (k < 1) {
      const hx = x1, hy = y0 + sag(x1);
      L.lightBlob(c, hx, hy, 90, GLOW, 0.55);
      L.lightBlob(c, hx, hy, 18, [255, 255, 255], 0.95);
    }
  } else {
    // globe view: a circle at R + 100 km
    c.strokeStyle = L.rgba(ACC, 0.75 * far);
    c.lineWidth = opts.width ?? 1.5;
    c.beginPath(); c.arc(cx, cy, Math.max(0, rr), 0, Math.PI * 2); c.stroke();
  }
  c.restore();
}

export default {
  beat: 8,
  chapter: { num: '08', title: 'Kármán line', sub: 'Where space officially begins' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: DRAW[0] - 0.1, name: 'riser', gain: 0.22, pitch: 1.1 },
      { t: DRAW[0] + 0.05, name: 'swish', gain: 0.3, pitch: 0.8 },
      { t: DRAW[0] + DRAW[1] - 0.05, name: 'bloom', gain: 0.35, pitch: 0.9 },
      { t: 1.9, name: 'ping', gain: 0.22, pitch: 1.3 },
      { t: OFFICIAL, name: 'shimmer', gain: 0.4, pitch: 1.0 },
    ];
  },

  drawWorld(ctx, v) {
    if (v.t < 0) return;
    const pulse = Math.exp(-Math.pow((v.t - OFFICIAL - 0.35) / 0.55, 2)) * (v.t < 20 ? 1 : 0);
    drawKarman(ctx, v, drawK(v.t), 1, pulse);
    // "officially space": a light sweep travels along the line, and stars come out above it
    if (v.t > OFFICIAL - 0.2 && v.t < OFFICIAL + 2.5 && v.cam.mpp < 1500) {
      const y0 = v.wy(-ALT.karman);
      const sp = L.prog(v.t, OFFICIAL, 1.4);
      const sx = L.lerp(-150, W + 150, L.ease.inOutCubic(sp));
      if (sp > 0 && sp < 1) {
        L.lightBlob(ctx, sx, y0, 160, [170, 190, 255], 0.35);
        L.lightBlob(ctx, sx, y0, 26, [255, 255, 255], 0.8);
      }
    }
  },

  drawOverlay(ctx, v) {
    // extra stars above the line (screen space, so they read as "space begins here")
    const sk = L.enter(v.t, OFFICIAL, 0.9) * v.k;
    if (sk > 0) {
      const y0 = v.wy(-ALT.karman);
      ctx.save();
      for (const [a, b, s, ph] of STARS) {
        const y = 300 + b * (y0 - 330);
        const x = a * W;
        const tw = 0.5 + 0.5 * Math.sin(v.gt * 2.2 + ph * 6.28);
        const st = L.clamp(sk * 1.6 - b * 0.6);   // appear from the top down towards the line
        if (st <= 0) continue;
        ctx.fillStyle = `rgba(235,240,255,${st * (0.35 + 0.45 * tw)})`;
        ctx.beginPath(); ctx.arc(x, y, Math.max(0, 0.8 + s * 1.6), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    const k = L.enter(v.t, 1.85, 0.55) * v.k;
    L.bigLabel(ctx, { x: 150, y: 790, big: '100 km', small: '62 mi · the Kármán line', k, accent: v.accent });
    // second line of the label lands on "Officially, space."
    const k2 = L.enter(v.t, OFFICIAL - 0.05, 0.5) * v.k;
    if (k2 > 0) {
      ctx.save();
      ctx.globalAlpha = k2;
      ctx.font = L.font(30, 700, L.FONT.body);
      ctx.fillStyle = L.rgba([235, 240, 255], 0.95);
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 8;
      L.trackedText(ctx, 'OFFICIALLY SPACE', 150, 890 + (1 - L.ease.outCubic(k2)) * 14, 3);
      ctx.restore();
    }
  },
};
