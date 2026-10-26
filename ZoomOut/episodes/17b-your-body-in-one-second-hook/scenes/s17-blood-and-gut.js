// Beat 17 — "Mostly blood and gut. | In about three months, most of your blood is new."
// The camera pushes into the belly. On "blood" the arterial tree draws itself out of the heart to the limbs and glows;
// on "gut" the coiled intestine lights from inside. The other sparks dim so the renewal visibly concentrates there.
// Phrase 2: a wave of fresh blood spreads from the red marrow in the hips, turning the whole network a paler, brighter
// red as it passes ("most of your blood is new"), and "≈ 3 months" lands above.
// The network and the gut stay on (softer) through beat 18, so this file draws them to the end of the film.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, bodyPath } from '../env.js';
import { TT, FRESH, drawVessels, drawGut } from './s14-strangest.js';

const V0 = TT.blood - 0.15;       // vessels draw out on "blood"
const G0 = TT.gut - 0.1;          // the gut lights on "gut"
const W0 = TT.inAbout + 0.05;     // the fresh-blood wave
const W_DUR = 2.5;
const LBL = TT.months - 0.15;     // "≈ 3 months"
const WAVE_C = { x: 0, y: -0.975 };   // red marrow in the pelvis

/** Brightness of the network/gut after beat 17: they soften under the beat-18 counter, then glint with the body. */
const later = (gt) => 1 - 0.45 * L.ease.inOutCubic(L.prog(gt, TT.b18 + 0.2, 1.4));

export default {
  beat: 17,
  chapter: { num: '17', title: 'Blood and gut', sub: 'where most of the renewal happens' },
  captions: true,
  layer: 1,
  cues() {
    const b = TT.b17;
    return [
      { t: 0.02, name: 'whoosh', gain: 0.24, pitch: 0.85 },
      { t: V0 - b, name: 'bloom', gain: 0.3, pitch: 1.0 },
      { t: G0 - b, name: 'shimmer', gain: 0.22, pitch: 0.9 },
      { t: W0 - b, name: 'swell', gain: 0.3, pitch: 0.95 },
      { t: LBL - b + 0.1, name: 'ping', gain: 0.3, pitch: 1.0 },
    ];
  },
  drawWorld(c, v) {
    const gt = v.gt;
    if (gt < V0 || v.cam.mpp < 3e-4) return;
    const draw = L.ease.inOutCubic(L.prog(gt, V0, 1.3));
    const vk = L.ease.outCubic(L.prog(gt, V0, 0.5)) * later(gt);
    const r = W_DUR > 0 ? 1.05 * L.ease.inOutCubic(L.prog(gt, W0, W_DUR)) : 0;
    c.save();
    c.beginPath(); bodyPath(c, v); c.clip();
    // the fresh-blood wavefront: a soft band in the body, just inside the wave radius
    if (r > 0 && r < 1.04) {
      const x = v.wx(WAVE_C.x), y = v.wy(WAVE_C.y), R = v.ws(r);
      const fade = 1 - L.prog(r, 0.8, 0.24);
      const g = c.createRadialGradient(x, y, Math.max(0, R - v.ws(0.09)), x, y, Math.max(1, R));
      g.addColorStop(0, L.rgba(FRESH, 0)); g.addColorStop(0.8, L.rgba(FRESH, 0.16 * fade)); g.addColorStop(1, L.rgba(FRESH, 0));
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = g; c.fillRect(0, 0, L.W, L.H);
      c.globalCompositeOperation = 'source-over';
    }
    drawGut(c, v, L.ease.outCubic(L.prog(gt, G0, 0.6)) * later(gt));
    // the carotids sit under the "≈ 3 months" label at this framing: they step back while it is up
    const headK = 1 - 0.8 * L.ease.inOutCubic(L.prog(gt, LBL - 0.3, 0.6)) * (1 - L.ease.inOutCubic(L.prog(gt, TT.b18, 0.8)));
    drawVessels(c, v, { draw, k: vk, wave: r > 0 ? { ...WAVE_C, r } : null, headK });
    c.restore();
  },
  drawOverlay(c, v) {
    // a quiet top band for the whole beat: the head reaches up under the chapter card at this framing
    if (v.k > 0) {
      const tb = c.createLinearGradient(0, 170, 0, 380);
      tb.addColorStop(0, `rgba(6,8,14,${0.6 * v.k})`); tb.addColorStop(1, 'rgba(6,8,14,0)');
      c.fillStyle = tb; c.fillRect(0, 170, 1080, 210);
    }
    // a soft dark scrim behind the label (the head sits below it at this framing)
    const sk = v.k * L.ease.outCubic(L.prog(v.gt, LBL - 0.2, 0.6));
    if (sk > 0) {
      const g = c.createRadialGradient(540, 400, 0, 540, 400, 420);
      g.addColorStop(0, `rgba(6,8,14,${0.55 * sk})`); g.addColorStop(0.55, `rgba(6,8,14,${0.4 * sk})`); g.addColorStop(1, 'rgba(6,8,14,0)');
      c.save(); c.translate(540, 400); c.scale(1.3, 0.45); c.translate(-540, -400);
      c.fillStyle = g; c.fillRect(0, 0, 1080, 840); c.restore();
    }
    L.bigLabel(c, { x: 540, y: 440, big: '≈ 3 MONTHS', small: 'most of your blood is new', k: v.k * L.prog(v.gt, LBL, 0.5), accent: ACCENT, align: 'center', size: 116 });
  },
};
