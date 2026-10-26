// Beat 3 — the outer core. Right after the core-mantle flash (s02, 14.8 s) the faller is in liquid iron: bright
// streaks of molten metal flow round the planet in alternating jets with slow eddies, dark threads between them, and
// faint heat-shimmer rings. The tunnel slides to x 400; on "an ocean of liquid iron" a bracket spans CMB → inner core and
// the label lands right of the tunnel on a dark plate (bright core behind). The inner core rises into view below (env).
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, RADIUS, BS, PH, T_CMB, ICB_IN } from '../camera.js';
import { depthLabel } from './s01-crust.js';
import { qT } from './lib-core.js';

const { W, H } = L;
const BEAT = BS[3];
const P2 = PH(3, 1).start - BEAT;    // beat time: "an ocean of liquid iron"
const BRACKET = P2 - 0.25, LAND = P2 + 0.05;
const R0 = RADIUS.icb, R1 = RADIUS.cmb, SPAN = R1 - R0;

// ------------------------------------------------------------------ chapter card (delayed copy of the engine's card)
const CHAPTER = { num: '03', title: 'Outer core', sub: 'Liquid iron and nickel' };
const CARD_DELAY = T_CMB - BEAT + 0.04;   // just after the faller crosses the core-mantle boundary
function drawChapterCard(c, v, t, d) {
  const kin = L.prog(t, 0.05, 0.6);
  const kout = L.prog(t, d - 0.3, 0.3);
  const k = L.ease.outCubic(kin) * (1 - L.ease.inCubic(kout));
  if (k <= 0) return;
  const { num, title, sub } = CHAPTER;
  const x = 64, y = 238;
  c.save();
  c.globalAlpha = k;
  c.fillStyle = L.rgba(v.accent);
  L.roundRect(c, x, y - 32, 64 * L.ease.outBack(Math.min(1, kin * 1.3)), 64, 10);
  c.fill();
  c.fillStyle = L.rgba(L.INK);
  c.font = L.font(36, 700, L.FONT.din);
  c.textBaseline = 'middle';
  c.textAlign = 'center';
  if (kin > 0.3) c.fillText(num, x + 32, y + 3);
  c.save();
  c.beginPath();
  c.rect(x + 76, y - 60, 900 * L.ease.outCubic(L.prog(t, 0.15, 0.6)), 120);
  c.clip();
  c.textAlign = 'left';
  c.shadowColor = 'rgba(2,6,14,0.85)';
  c.shadowBlur = 14;
  c.fillStyle = L.rgba(L.WHITE);
  c.font = L.font(40, 700, L.FONT.display);
  c.textBaseline = 'alphabetic';
  L.trackedText(c, title.toUpperCase(), x + 94, y + 2, 4);
  c.fillStyle = L.rgba([175, 190, 210], 0.95);
  c.font = L.font(26, 500, L.FONT.body);
  L.trackedText(c, sub, x + 94, y + 34, 0.5);
  L.trackedText(c, sub, x + 94, y + 34, 0.5);
  c.restore();
  c.restore();
}

// ------------------------------------------------------------------ flow (world space, polar; pure functions of time)
const STREAKS = (() => {
  const r = L.rng(3303);
  return Array.from({ length: 96 }, (_, i) => {
    const u = 0.06 + 0.88 * Math.sqrt(r());                 // area-weighted toward the outside
    return { u, th: r() * Math.PI * 2, ph: r() * 6.3, dark: i % 3 === 0, w: 0.6 + r() * 0.8, len: 0.5 + r() * 0.6 };
  });
})();
/** Angular speed (rad/s) of the jets: bands alternate direction with radius. */
const omega = (u) => 0.075 * Math.sin(u * Math.PI * 3) + 0.015;
function flowPt(s, t) {
  const th = s.th + omega(s.u) * t;
  const r = R0 + SPAN * L.clamp(s.u + 0.06 * Math.sin(4 * th + s.ph + t * 0.25) + 0.015 * L.noise1(t * 0.3 + s.ph, 4), 0.02, 0.98);
  return { x: r * Math.sin(th), y: R_EARTH - r * Math.cos(th) };
}
const flowK = (gt) => L.ease.inOutCubic(L.prog(gt, BEAT - 0.339, 1.1)) * (1 - L.ease.inOutCubic(L.prog(gt, ICB_IN + 0.15, 1.2)));

function drawFlow(c, v, k) {
  const mpp = v.cam.mpp;
  if (SPAN / mpp < 120) return;
  const tx = v.wx(0);
  c.save();
  c.beginPath(); c.rect(-10, -10, tx - 6 + 10, H + 20); c.rect(tx + 6, -10, W - tx + 4, H + 20); c.clip();
  c.lineCap = 'round';
  // heat shimmer: faint rings breathing through the liquid layer
  const cx = v.wx(0), cy = v.wy(R_EARTH);
  for (let i = 0; i < 4; i++) {
    const u = ((i / 4 + v.gt * 0.035) % 1);
    const rp = (R0 + SPAN * u) / mpp;
    c.strokeStyle = `rgba(255,236,190,${0.07 * k * Math.sin(Math.PI * u)})`;
    c.lineWidth = 6;
    c.beginPath(); c.arc(cx, cy, Math.max(0, rp), Math.PI, Math.PI * 2); c.stroke();
  }
  // the streaks: tapered trails along the flow
  const N = 16;
  for (const s of STREAKS) {
    const head = flowPt(s, v.gt);
    const hx = v.wx(head.x), hy = v.wy(head.y);
    if (hx < -120 || hx > W + 120 || hy < -120 || hy > H + 120) continue;
    let prev = null;
    for (let i = 0; i <= N; i++) {
      const f = i / N;
      const p = flowPt(s, v.gt - (1 - f) * 8 * s.len);
      const q = [v.wx(p.x), v.wy(p.y)];
      if (prev) {
        if (s.dark) {
          c.globalCompositeOperation = 'source-over';
          c.strokeStyle = `rgba(96,30,10,${0.3 * f * k})`;
        } else {
          c.globalCompositeOperation = 'lighter';
          c.strokeStyle = `rgba(255,236,190,${0.42 * f * f * k})`;
        }
        c.lineWidth = (0.5 + 2.0 * f) * s.w;
        c.beginPath(); c.moveTo(prev[0], prev[1]); c.lineTo(q[0], q[1]); c.stroke();
      }
      prev = q;
    }
  }
  c.restore();
}

export default {
  beat: 3,
  // f12cv: the engine's card hands over in place from THE MANTLE as the narrator says "Next, the outer core" (no
  // empty-tile gap before a delayed copy, and the next beat hands over from it in place too)
  chapter: CHAPTER,
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: T_CMB - BEAT - 0.02, name: 'impact', gain: 0.34, pitch: 0.7 },
      { t: T_CMB - BEAT + 0.03, name: 'bloom', gain: 0.32, pitch: 1.15 },
      { t: 1.15, name: 'shimmer', gain: 0.16, pitch: 0.8 },
      { t: BRACKET, name: 'swish', gain: 0.2, pitch: 1.0 },
      { t: LAND - 0.1, name: 'bubbles', gain: 0.22, pitch: 0.8 },
      { t: LAND, name: 'tick', gain: 0.3, pitch: 0.95 },
      { t: LAND + 0.08, name: 'blip', gain: 0.18, pitch: 0.8 },
    ];
  },

  drawWorld(ctx, v) {
    const k = flowK(v.gt);
    if (k > 0) drawFlow(ctx, v, k);
  },

  drawOverlay(ctx, v) {
    const k = L.enter(qT(v), LAND, 0.55);   // output-frame time: the plate is fully on from its first frame
    const kb = L.enter(v.t, BRACKET, 0.6, L.ease.inOutCubic);
    depthLabel(ctx, v, {
      rTop: RADIUS.cmb, rBot: RADIUS.icb, k, kb, size: 80, dx: 46,
      big: 'LIQUID IRON', small: '2,260 km thick · 1,400 mi', plate: 1,
    });
  },
};
