// Beat 12 — "Space isn't far away. | It's just straight up."
// The globe holds (gentle push from the camera). The magnifier stays on the thin skin (handed over from
// s11 without a blink); its bracket slides from the ISS gap down to the Kármán line ("100 KM") and the
// ISS dims inside it. A "you are here" beacon pulses at the top of the globe, where the film began (the
// world ISS dot fades out there); the loupe's source ring and connectors clear away, and on "It's just
// straight up" a two-layer beam shoots straight up from it. Closing label: "100 km" / "straight up".
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH } from '../camera.js';
import { drawLoupe } from './s11-globe.js';

const { W, H } = L;
const ACC = [150, 170, 255];
const BEACON = 0.25;
const BEAM = 2.15;          // "It's just straight up."
const LABEL = 2.45;
const TARGET = [0.45, 0.8];  // lens bracket slides from the ISS gap down to the Kármán line ("Space isn't far away")
const LINK_OUT = BEAM - 0.55; // loupe source ring + connectors fade out before the beam
const BEAM_TOP = 280;         // screen y where the beam has faded out

export default {
  beat: 12,
  chapter: { num: '12', title: 'Straight up', sub: '' },
  captions: true,
  layer: 4,
  chapterUntil(d) { return 2.2; },
  cues(d) {
    return [
      { t: BEACON, name: 'blip', gain: 0.2, pitch: 0.8 },
      { t: BEAM - 0.15, name: 'riser', gain: 0.25, pitch: 1.2 },
      { t: BEAM, name: 'swish', gain: 0.35, pitch: 1.1 },
      { t: BEAM + 0.1, name: 'bloom', gain: 0.45, pitch: 0.8 },
      { t: LABEL, name: 'impact', gain: 0.3, pitch: 0.7 },
      { t: LABEL + 0.2, name: 'shimmer', gain: 0.25, pitch: 1.0 },
    ];
  },

  drawWorld(ctx, v) {
    if (v.t < 0) return;
    const x = v.wx(0), y = v.wy(0);
    // "you are here" beacon at the top of the globe (s10 fades the ISS dot out here, so this is the only point)
    const bk = L.enter(v.t, BEACON, 0.5);
    if (bk > 0) {
      for (let i = 0; i < 2; i++) {
        const ph = ((v.t * 0.6 + i * 0.5) % 1 + 1) % 1;
        ctx.strokeStyle = `rgba(255,236,190,${0.6 * bk * (1 - ph)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, Math.max(0, 4 + ph * 26), 0, Math.PI * 2); ctx.stroke();
      }
      L.lightBlob(ctx, x, y, 22, [255, 230, 180], 0.7 * bk);
      ctx.fillStyle = `rgba(255,248,230,${bk})`;
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    }
    // the beam: a two-layer ray (soft halo + bright core) shoots straight up, holds, then settles
    const sk = L.prog(v.t, BEAM, 0.5);
    if (sk > 0) {
      const head = L.lerp(y, BEAM_TOP, L.ease.outCubic(sk));
      const settle = 1 - 0.5 * L.ease.inOutCubic(L.prog(v.t, BEAM + 0.5 + 0.8, 1.2));
      const len = y - head;
      const grad = (a0, a1) => {
        const g = ctx.createLinearGradient(0, y, 0, head);
        g.addColorStop(0, `rgba(255,240,210,${a0})`);
        g.addColorStop(0.2, L.rgba(ACC, a1));
        g.addColorStop(0.62, L.rgba(ACC, a1 * 0.75));
        g.addColorStop(1, L.rgba(ACC, 0));     // soft fade at the top, never a hard stop
        return g;
      };
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // halo: stacked widths so the edges fall off softly (~40 px across)
      for (const [w, a] of [[44, 0.12], [28, 0.16], [16, 0.24]]) {
        ctx.fillStyle = grad(a * settle, a * settle);
        ctx.fillRect(x - w / 2, head, w, len);
      }
      ctx.restore();
      L.glow(ctx, ACC, 18, () => {
        ctx.fillStyle = grad(0.98 * settle, 0.9 * settle);
        ctx.fillRect(x - 3, head, 6, len);
      }, 0.9);
      ctx.fillStyle = grad(0.9 * settle, 0.55 * settle);
      ctx.fillRect(x - 1, head, 2, len);
      if (sk < 1) L.lightBlob(ctx, x, head + len * 0.12, 60, [210, 220, 255], 0.8 * (1 - sk));
      // a flash as it pierces the skin
      const fl = Math.exp(-Math.pow((v.t - BEAM - 0.08) / 0.2, 2));
      if (fl > 0.01) L.lightBlob(ctx, x, y - 6, 140, [170, 200, 255], 0.65 * fl);
    }
  },

  drawOverlay(ctx, v) {
    if (v.t >= 0) {
      drawLoupe(ctx, v, 1, 1, {
        target: L.prog(v.t, TARGET[0], TARGET[1]),          // bracket moves to the Kármán line
        link: 1 - L.ease.inOutCubic(L.prog(v.t, LINK_OUT, 0.4)), // ring + connectors clear the beam's path
        issA: 0.3,
      });
    }
    // "YOU ARE HERE" tag at the beacon, on a short leader down and to the right
    const yk = L.enter(v.t, BEACON + 0.35, 0.5) * v.k;
    if (yk > 0) {
      const bx = v.wx(0), by = v.wy(0);
      const tx = bx + 46, ty = by + 62;
      const e = L.ease.outCubic(yk);
      ctx.save();
      ctx.globalAlpha = L.clamp(yk);
      ctx.strokeStyle = 'rgba(255,236,200,0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(bx + 6, by + 8); ctx.lineTo(L.lerp(bx + 6, tx, e), L.lerp(by + 8, ty - 16, e)); ctx.stroke();
      ctx.font = L.font(22, 700, L.FONT.body);
      const str = 'YOU ARE HERE';
      ctx.letterSpacing = '3px';
      const tw = ctx.measureText(str).width + 26;
      ctx.letterSpacing = '0px';
      ctx.globalAlpha = L.clamp(yk * 2 - 0.5);
      ctx.fillStyle = 'rgba(6,10,24,0.82)';
      L.roundRect(ctx, tx - 8, ty - 17 + (1 - e) * 8, tw, 36, 18); ctx.fill();
      ctx.fillStyle = 'rgb(255,240,214)';
      ctx.textBaseline = 'middle';
      L.trackedText(ctx, str, tx + 5, ty + 2 + (1 - e) * 8, 3);
      ctx.restore();
    }
    const k = L.enter(v.t, LABEL, 0.6) * v.k;
    L.bigLabel(ctx, { x: 110, y: 432, big: '100 km', small: 'straight up', k, accent: v.accent, size: 110 });
  },
};
