// Beat 0 — "If a crowd turns into a riot, | the biggest danger often isn't the violence. | It's the crowd itself."
// No captions, no chapter, overlayIn false: frame 1 is complete. Camera 'hook' (fixed (0, 10), slow pull-out); env draws
// the crowd with converging PINCH waves (red compression rings) closing on the narrow street's MOUTH (0, 22) ≈ (540, 1040).
//   0.00  headline THE CROWD / IS THE DANGER (accent), one shared size fitted ≤ 940 px, band y ≈ 268–525, on a soft scrim;
//         static from frame 1. Fine red chevrons ride each converging wave front, pointing at the pinch (the push).
//   phrase 2 (5.99, "It's the crowd itself"): a red reticle locks onto the mouth (ring shrinks 150 → 62 px + 4 ticks,
//         a soft red pulse inside), then a leader draws to a dark chip CRUSH POINT / 5+ PEOPLE PER m² (left of the
//         street, over the site, x ≤ 490, y ≈ 1118–1200). Holds ≥ 1.4 s; everything leaves with the beat's overlay fade.
import * as L from '../../../../engine/runtime/lib.js';
import { TEXT, MOUTH, DANGER, waveFronts, stepBadge } from '../env.js';
import { step1K } from './s01-leave.js';

const { W } = L;
const TAU = Math.PI * 2;
const MAXW = 940, TOP = 268, L1 = 'THE CROWD', L2 = 'IS THE DANGER';
const ph = (v, j) => v.tl.lines[v.index].phrases[j].start - v.tl.scenes[v.index].start;

function chevron(c, x, y, ang, s) {
  c.save();
  c.translate(x, y); c.rotate(ang);
  c.beginPath(); c.moveTo(-s * 0.5, -s * 0.6); c.lineTo(s * 0.4, 0); c.lineTo(-s * 0.5, s * 0.6); c.stroke();
  c.restore();
}

export default {
  beat: 0,
  chapter: null,
  captions: false,
  overlayIn: false,
  layer: 5,
  cues() { return [{ t: 0.0, name: 'impact', gain: 0.3, pitch: 0.7 }, { t: 5.75, name: 'ping', gain: 0.2, pitch: 0.8 }]; },
  drawOverlay(c, v) {
    c.save();
    c.globalAlpha = v.k;
    const mx = v.wx(MOUTH.x), my = v.wy(MOUTH.y);

    // ---- chevrons on the converging fronts (they point at the pinch: the crowd is being pushed into it)
    c.lineWidth = 3; c.lineCap = 'round'; c.lineJoin = 'round';
    for (const f of waveFronts(v.gt, v.tl)) {
      if (f.kind !== 'ring' || f.k <= 0.02) continue;
      const Rm = f.R + 3.2;   // just behind (outside) the compression band: the push comes from behind
      const Rpx = Rm / v.cam.mpp;
      if (Rpx < 70) continue;
      const fk = f.k * L.smoothstep(L.clamp((Rpx - 70) / 60));
      for (let i = 0; i < 3; i++) {
        const th = -Math.PI / 2 + (i - 1) * 0.5;   // a fan above the mouth (north of it)
        const x = mx + Math.cos(th) * Rpx, y = my + Math.sin(th) * Rpx;
        if (y < 560) continue;   // stay out of the headline band
        c.strokeStyle = `rgba(255,150,128,${0.9 * fk})`;
        chevron(c, x, y, th + Math.PI, 20);
      }
    }

    // ---- headline on a soft scrim
    const size = Math.min(L.fitSize(c, L1, MAXW, 150, 800, L.FONT.display, 60), L.fitSize(c, L2, MAXW, 150, 800, L.FONT.display, 60));
    const b1 = TOP + size * 0.72, b2 = b1 + size * 0.98;
    const sg = c.createLinearGradient(0, TOP - 70, 0, b2 + 70);
    sg.addColorStop(0, 'rgba(4,6,12,0)'); sg.addColorStop(0.3, 'rgba(4,6,12,0.42)'); sg.addColorStop(0.75, 'rgba(4,6,12,0.42)'); sg.addColorStop(1, 'rgba(4,6,12,0)');
    c.fillStyle = sg; c.fillRect(0, TOP - 70, W, b2 + 140 - TOP);
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 24;
    c.font = L.font(size, 800, L.FONT.display);
    c.fillStyle = L.rgba(TEXT); c.fillText(L1, W / 2, b1);
    c.fillStyle = L.rgba(v.accent); c.fillText(L2, W / 2, b2);
    c.shadowBlur = 0; c.shadowColor = 'transparent';

    // ---- phrase 2: lock onto the pinch
    const t2 = ph(v, 2) - 0.15;   // starts with the ping, in the pause before "It's the crowd itself" (no cue on a word onset)
    const rk = L.ease.outCubic(L.prog(v.t, t2, 0.6));
    if (rk > 0) {
      const R = Math.max(0, L.lerp(150, 62, rk));
      const pulse = 0.5 + 0.5 * Math.sin((v.t - t2) * 5.5);
      // soft red pulse in the reticle
      const g = c.createRadialGradient(mx, my - 6, 0, mx, my - 6, Math.max(1, R * 1.25));
      g.addColorStop(0, L.rgba(DANGER, 0.32 * rk * (0.6 + 0.4 * pulse))); g.addColorStop(1, L.rgba(DANGER, 0));
      c.fillStyle = g; c.beginPath(); c.arc(mx, my - 6, Math.max(0, R * 1.25), 0, TAU); c.fill();
      c.globalAlpha = v.k * L.clamp(rk * 2);
      c.strokeStyle = L.rgba(DANGER, 0.95); c.lineWidth = 3;
      c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 6;
      c.beginPath(); c.arc(mx, my - 6, R, 0, TAU); c.stroke();
      c.lineWidth = 3.5; c.lineCap = 'butt';
      c.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        c.moveTo(mx + Math.cos(a) * (R + 6), my - 6 + Math.sin(a) * (R + 6));
        c.lineTo(mx + Math.cos(a) * (R + 22), my - 6 + Math.sin(a) * (R + 22));
      }
      c.stroke();
      c.strokeStyle = `rgba(255,140,120,${0.5 * (1 - pulse)})`; c.lineWidth = 1.5;
      c.beginPath(); c.arc(mx, my - 6, Math.max(0, R + 10 + 16 * pulse), 0, TAU); c.stroke();
      c.shadowBlur = 0;
      c.globalAlpha = v.k;
    }
    // leader + chip
    const ck = L.ease.outCubic(L.prog(v.t, t2 + 0.3, 0.5));
    if (ck > 0) {
      const ax = mx - 66 * 0.72, ay = my - 6 + 66 * 0.72;   // the reticle's lower-left
      const ex = 470, ey = Math.max(ay + 40, 1124);
      const lk = L.clamp(ck * 1.6);
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(L.lerp(ax, ex, lk), L.lerp(ay, ey, lk)); c.stroke();
      const bk = L.clamp((ck - 0.35) / 0.65);
      if (bk > 0) {
        c.save();
        c.globalAlpha = v.k * bk;
        const f1 = L.font(44, 800, L.FONT.display), f2 = L.font(21, 700, L.FONT.body);
        c.font = f1; const w1 = c.measureText('CRUSH POINT').width;
        c.font = f2; c.letterSpacing = '3px'; const w2 = c.measureText('5+ PEOPLE PER m²').width - 3; c.letterSpacing = '0px';
        const bw = Math.max(w1, w2) + 40, bh = 96, bx = ex - bw, by = ey - 6 + (1 - bk) * 10;
        c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 18;
        c.fillStyle = 'rgba(10,10,14,0.9)'; L.roundRect(c, bx, by, bw, bh, 10); c.fill();
        c.shadowBlur = 0; c.shadowColor = 'transparent';
        c.fillStyle = L.rgba(DANGER); c.fillRect(bx, by + 12, 5, bh - 24);
        c.textAlign = 'left'; c.textBaseline = 'alphabetic';
        c.font = f1; c.fillStyle = L.rgba(DANGER); c.fillText('CRUSH POINT', bx + 22, by + 50);
        c.font = f2; c.fillStyle = 'rgba(232,228,220,0.92)'; L.trackedText(c, '5+ PEOPLE PER m²', bx + 23, by + 80, 3);
        c.restore();
      }
    }
    // the STEP 1 badge starts over the fading title (s01 continues it): no text-free gap at the cut
    const k1 = step1K(v);
    if (k1 > 0) { c.save(); c.globalAlpha = 1; stepBadge(c, v, 1, 'LEAVE EARLY', { k: k1 }); c.restore(); }
    c.restore();
  },
};
