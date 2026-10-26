// Beat 12 — "A blue planet, | with surprisingly little water."
// The long pull-back from the 56 km drop to the whole planet. When the camera settles, the three water beads beside
// Earth get a soft pulse ring each and a tidy stack of tags (nested elbow leaders, no crossings):
// every drop (1,385 km), liquid fresh water (273 km), lakes and rivers (56 km). Then a long, still final hold.
import * as L from '../../../../engine/runtime/lib.js';
import { ALL, FRESH, LAKES } from '../camera.js';

const BEAT = 12;
const BEADS = [
  { ...ALL, value: '1,385 km', name: 'ALL WATER' },
  { ...FRESH, value: '273 km', name: 'FRESH WATER' },
  { ...LAKES, value: '56 km', name: 'LAKES + RIVERS' },
];
const T_TAG = 2.35, STAGGER = 0.28;

function tagK(t, i) { return L.prog(t, T_TAG + i * STAGGER, 0.6); }
/** When the last caption has gone (the VO's last line end + the caption tail): the closing line takes over. */
function closeTime(tl) { return tl.lines[tl.lines.length - 1].end + 0.95; }

export default {
  beat: BEAT,
  chapter: { num: '12', title: 'A blue planet', sub: 'With surprisingly little water' },
  captions: true,
  layer: 4,
  chapterUntil(d) { return 2.2; },
  cues(d) {
    return [
      { t: 0.1, name: 'riser', gain: 0.22, pitch: 0.8 },
      { t: 2.3, name: 'deep', gain: 0.3, pitch: 0.9 },
      ...BEADS.map((_, i) => ({ t: T_TAG + i * STAGGER + 0.05, name: 'ping', gain: 0.16, pitch: 1 + i * 0.25 })),
      { t: 3.6, name: 'swell', gain: 0.28, pitch: 0.8 },
    ];
  },
  drawWorld(ctx, v) {
    // pulse rings around each bead as its tag lands
    if (v.t < T_TAG - 0.1 || v.cam.mpp < 5e3) return;
    // final hold: once the VO ends, the three beads breathe softly in turn so the eye rests on them
    const hold = L.ease.inOutCubic(L.prog(v.gt, closeTime(v.tl) - 0.4, 0.8));
    if (hold > 0) {
      BEADS.forEach((b, i) => {
        const ph = (v.gt - closeTime(v.tl)) * 0.9 - i * 0.22;
        const p = 0.5 - 0.5 * Math.cos(Math.PI * 2 * ph);
        const r = Math.max(v.ws(b.d / 2), 3);
        L.lightBlob(ctx, v.wx(b.x), v.wy(b.y), r * 2.2 + 14, [120, 200, 255], hold * (0.18 + 0.22 * p));
      });
    }
    ctx.save();
    BEADS.forEach((b, i) => {
      const p = L.prog(v.t, T_TAG + i * STAGGER, 1.3);
      if (p <= 0 || p >= 1) return;
      const r = Math.max(v.ws(b.d / 2), 3) + 6 + 34 * L.ease.outCubic(p);
      ctx.strokeStyle = `rgba(150,215,255,${0.55 * (1 - p)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(v.wx(b.x), v.wy(b.y), Math.max(0, r), 0, Math.PI * 2); ctx.stroke();
    });
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    if (v.cam.mpp < 5e3) return;
    const P = BEADS.map((b) => ({ x: v.wx(b.x), y: v.wy(b.y), r: Math.max(2, v.ws(b.d / 2)) }));
    const bottom = Math.max(...P.map((p) => p.y + p.r));
    const xText = Math.min(...P.map((p) => p.x - p.r)) - 34;
    ctx.save();
    ctx.textBaseline = 'middle';
    BEADS.forEach((b, i) => {
      const k = Math.min(v.k, tagK(v.t, i));
      if (k <= 0) return;
      const e = L.ease.outCubic(k);
      const p = P[i];
      const ry = bottom + 54 + i * 50;
      // elbow leader: down from the bead, then left to the text
      ctx.strokeStyle = `rgba(200,225,250,${0.7 * L.clamp(k * 2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const y0 = p.y + p.r + 5;
      const down = L.clamp(e * 1.6);
      const across = L.clamp(e * 1.6 - 0.6);
      ctx.moveTo(p.x, y0);
      ctx.lineTo(p.x, L.lerp(y0, ry, down));
      if (across > 0) ctx.lineTo(L.lerp(p.x, xText + 12, across), ry);
      ctx.stroke();
      // text: value (white) + name (grey), right-aligned against the elbow
      const ta = L.clamp(k * 1.8 - 0.6);
      if (ta <= 0) return;
      ctx.save();
      ctx.globalAlpha *= ta;
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 8;
      ctx.font = L.font(25, 600, L.FONT.body);
      ctx.fillStyle = 'rgba(175,190,210,0.95)';
      const nw = L.trackedText(ctx, b.name, xText, ry + 1, 2.5, 'right');
      ctx.font = L.font(34, 800, L.FONT.display);
      ctx.fillStyle = i === 2 ? L.rgba(v.accent) : 'rgba(240,245,252,0.98)';
      L.trackedText(ctx, b.value, xText - nw - 14 + (1 - e) * 12, ry + 2, 0.5, 'right');
      ctx.restore();
    });
    ctx.restore();
    // closing line in the (now empty) caption slot: SURPRISINGLY LITTLE WATER
    const ck = L.enter(v.gt, closeTime(v.tl), 0.7) * v.k;
    if (ck > 0) {
      ctx.save();
      ctx.globalAlpha = ck;
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 12;
      ctx.font = L.font(52, 800, L.FONT.display);
      const a = 'SURPRISINGLY LITTLE ', b = 'WATER';
      const sp = 4;
      const wa = L.trackedText(ctx, a, -9999, -9999, sp, 'left'), wb = L.trackedText(ctx, b, -9999, -9999, sp, 'left');
      const x0 = L.W / 2 - (wa + wb) / 2, y = 1335 + (1 - ck) * 12;
      ctx.fillStyle = 'rgba(240,245,252,0.96)';
      L.trackedText(ctx, a, x0, y, sp, 'left');
      ctx.fillStyle = L.rgba(v.accent);
      L.trackedText(ctx, b, x0 + wa, y, sp, 'left');
      ctx.restore();
    }
  },
};
