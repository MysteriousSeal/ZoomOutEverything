// Beat 6 — "Next to Earth, it's a small blue bead."
// The camera pulls back to Earth + the water ball (drawn by s04). On "small blue bead" a soft ring
// pulses around the bead and a thin leader draws out to a quiet tag below Earth, left of the bead.
import * as L from '../../../../engine/runtime/lib.js';
import { ALL } from '../camera.js';

const T_RING = 1.25;    // just before "small blue bead"
const T_TAG = 1.2;     // tag lands with the ping so it reads for ~1.8 s

export default {
  beat: 6,
  chapter: { num: '06', title: 'A small blue bead', sub: 'Earth: 12,742 km across' },
  captions: true,
  layer: 3,
  cues(d) {
    return [
      { t: T_RING, name: 'ping', gain: 0.3, pitch: 1.15 },
      { t: T_TAG + 0.1, name: 'blip', gain: 0.22, pitch: 1.2 },
      { t: T_RING + 0.4, name: 'shimmer', gain: 0.16, pitch: 1.4 },
    ];
  },

  drawWorld(ctx, v) {
    // a gentle glint that rolls across the bead as the camera settles
    if (v.t < 0 || v.t > v.d + 0.6) return;
    const cx = v.wx(ALL.x), cy = v.wy(ALL.y), r = v.ws(ALL.d / 2);
    const g = L.prog(v.t, T_RING - 0.1, 0.9);
    if (g > 0 && g < 1) L.lightBlob(ctx, cx - r * 0.3, cy - r * 0.35, r * (0.8 + 1.4 * g), [190, 235, 255], 0.35 * Math.sin(Math.PI * g));
  },

  drawOverlay(ctx, v) {
    const cx = v.wx(ALL.x), cy = v.wy(ALL.y), r = v.ws(ALL.d / 2);
    // pulse rings
    for (let i = 0; i < 2; i++) {
      const p = L.prog(v.t, T_RING + i * 0.35, 1.3);
      if (p <= 0 || p >= 1) continue;
      ctx.save();
      ctx.globalAlpha = v.k * (1 - p) * 0.8;
      ctx.strokeStyle = L.rgba(v.accent);
      ctx.lineWidth = 2.5 * (1 - p) + 1;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r + 6 + L.ease.outCubic(p) * 70), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    // steady thin ring that stays
    const sk = L.enter(v.t, T_RING + 0.15, 0.5) * v.k;
    if (sk > 0) {
      ctx.save();
      ctx.globalAlpha = sk * 0.7;
      ctx.strokeStyle = L.rgba([215, 235, 250]);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r + 12), -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * L.ease.outCubic(sk)); ctx.stroke();
      ctx.restore();
    }
    // leader down-left, under Earth, to a two-line tag
    const lk = L.prog(v.t, T_TAG, 0.55) * v.k;
    const a = Math.PI * 0.78;   // leader angle (down-left)
    const x1 = cx + Math.cos(a) * (r + 12), y1 = cy + Math.sin(a) * (r + 12);
    const x2 = x1 - 90, y2 = Math.min(y1 + 90, 1200);
    L.leader(ctx, x1, y1, x2, y2, lk, [215, 235, 250], 0.75);
    const tk = L.enter(v.t, T_TAG + 0.15, 0.5) * v.k;
    if (tk > 0) {
      ctx.save();
      ctx.globalAlpha = tk;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 8;
      ctx.textBaseline = 'middle';
      const tx = x2 - 14, ty = y2 + (1 - tk) * 8;
      ctx.font = L.font(30, 700, L.FONT.body);
      ctx.fillStyle = L.rgba(v.accent);
      L.trackedText(ctx, 'EVERY DROP', tx, ty - 17, 3, 'right');
      ctx.font = L.font(23, 600, L.FONT.body);
      ctx.fillStyle = 'rgba(205,215,230,0.92)';
      L.trackedText(ctx, 'OF WATER ON EARTH', tx, ty + 17, 2.5, 'right');
      ctx.restore();
    }
  },
};
