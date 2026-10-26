// Beat 12 — "A thin blue skin, | and it's what keeps this planet alive."
// The oceans flow back (env refills 65.77 → 67.59) while the camera moves in to the blue planet (shot `blue`).
// Story layer:
//   * a crisp accent RIM on the globe's limb — the "skin" — that traces itself around the disc from the upper-left on
//     "a thin blue skin", with a soft additive under-glow; its strength follows the refill (wetFraction);
//   * one slow light sweep across the returning water (a gentle specular band, clipped to the disc);
//   * A THIN BLUE SKIN set ON the skin: tracked accent caps running along the limb at the upper-left (radius r + 34,
//     ≤ 0.78 rad of arc, fitted), letters rising out from the centre as the rim trace starts there. Attached to the
//     disc, so it rides the camera move; ≥ 3.5 s on screen; x 140–420, y 355–545 at the held framing (clear of the HUD
//     block, the chapter area and the captions).
import * as L from '../../../../engine/runtime/lib.js';
import { globeDisc, seaLevel } from '../env.js';

const { ease, clamp, prog, smoothstep } = L;
const RIM_ANG = (236 * Math.PI) / 180;     // where the rim trace starts = the centre of the curved tag (upper-left)

function phrase(v, i) {
  const ln = v.tl.lines[v.index], s0 = v.tl.scenes[v.index].start, ph = ln.phrases ?? [ln];
  const p = ph[Math.min(i, ph.length - 1)];
  return { start: p.start - s0, end: p.end - s0 };
}

export default {
  beat: 12,
  chapter: null,
  layer: 12,
  cues(d) {
    // beat 65.67: refill 65.77 → 67.59 (env plays the swell); phrase 0 "A thin blue skin" 65.82; phrase 1 67.45
    return [
      { t: 0.2, name: 'shimmer', gain: 0.2, pitch: 1.0 },     // the rim starts tracing
      { t: 0.55, name: 'blip', gain: 0.16, pitch: 1.3 },      // tag
      { t: 1.9, name: 'bloom', gain: 0.2, pitch: 0.9 },       // the oceans are full: light sweep
    ];
  },
  drawWorld(ctx, v) {
    if (v.t < 0 || v.t > v.d + 0.6) return;
    const D = globeDisc(v);
    if (D.r < 60 || D.r > 1500) return;
    const s = seaLevel(v);
    const wet = smoothstep(clamp(1 + s / 4000));               // rises as the water returns
    const kOut = 1 - smoothstep(prog(v.t, v.d - 0.2, 0.7));
    const tr = ease.inOutCubic(prog(v.t, 0.15, 1.6));         // rim trace progress
    const k = kOut;
    if (k <= 0) return;
    ctx.save();
    // under-glow just inside the limb
    if (wet > 0) {
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(D.x, D.y, D.r * 0.86, D.x, D.y, D.r * 1.04);
      g.addColorStop(0, 'rgba(70,180,255,0)');
      g.addColorStop(0.8, `rgba(70,180,255,${0.16 * wet * k})`);
      g.addColorStop(1, 'rgba(70,180,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(D.x, D.y, Math.max(0, D.r * 1.04), 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    // the crisp rim (the "skin"), traced both ways round from the upper-left
    if (tr > 0) {
      const a0 = RIM_ANG - Math.PI * tr, a1 = RIM_ANG + Math.PI * tr;
      const al = k * (0.45 + 0.5 * wet);
      ctx.lineCap = 'round';
      ctx.strokeStyle = L.rgba(v.accent, 0.25 * al);
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.arc(D.x, D.y, Math.max(0, D.r + 1), a0, a1); ctx.stroke();
      ctx.strokeStyle = L.rgba([170, 225, 255], 0.9 * al);
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(D.x, D.y, Math.max(0, D.r + 1), a0, a1); ctx.stroke();
      // bright travelling heads while tracing
      if (tr < 1) for (const a of [a0, a1]) L.lightBlob(ctx, D.x + Math.cos(a) * D.r, D.y + Math.sin(a) * D.r, 30, [150, 215, 255], 0.7 * k);
    }
    // a slow specular sweep over the refilled water (left → right, slightly descending)
    const sw = ease.inOutCubic(prog(v.t, 1.9, 2.0));
    if (sw > 0 && sw < 1) {
      ctx.save();
      ctx.beginPath(); ctx.arc(D.x, D.y, Math.max(0, D.r), 0, Math.PI * 2); ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      const c = L.lerp(-1.3, 1.3, sw) * D.r, bw = D.r * 0.4;
      const ux = 0.94, uy = 0.34;
      const g = ctx.createLinearGradient(D.x + ux * (c - bw), D.y + uy * (c - bw), D.x + ux * (c + bw), D.y + uy * (c + bw));
      const a = 0.12 * k * Math.sin(Math.PI * sw);
      g.addColorStop(0, 'rgba(160,215,255,0)');
      g.addColorStop(0.5, `rgba(160,215,255,${a})`);
      g.addColorStop(1, 'rgba(160,215,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(D.x - D.r, D.y - D.r, D.r * 2, D.r * 2);
      ctx.restore();
    }
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    if (v.k <= 0) return;
    const D = globeDisc(v);
    if (D.r < 60 || D.r > 1500) return;
    const p0 = phrase(v, 0);
    // A THIN BLUE SKIN set ON the skin: tracked caps running along the limb (upper-left), letters revealed by the
    // rim trace as it passes them (the trace starts at RIM_ANG = the text's centre), then held to the beat's end.
    const txt = 'A THIN BLUE SKIN', track = 6;
    const R = D.r + 34;
    const size = L.fitSize(ctx, txt, R * 0.78 - track * txt.length, 40, 800, L.FONT.display, 22);   // arc ≤ 0.78 rad
    ctx.save();
    ctx.globalAlpha = v.k;
    ctx.font = L.font(size, 800, L.FONT.display);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = L.rgba(v.accent);
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 10;
    const ws = [...txt].map((ch) => ctx.measureText(ch).width + track);
    const total = ws.reduce((a, b) => a + b, 0) - track;
    const t0 = Math.max(0.15, p0.start - 0.1);
    let a = RIM_ANG - total / 2 / R;
    [...txt].forEach((ch, i) => {
      const w = ws[i] - track, ac = a + w / 2 / R;
      a += ws[i] / R;
      // revealed when the trace head reaches it (|angle from the centre| / π ≤ trace progress)
      const reach = Math.abs(ac - RIM_ANG) / Math.PI;
      const kc = ease.outCubic(prog(v.t, t0 + reach * 5, 0.35));
      if (kc <= 0 || ch === ' ') return;
      ctx.save();
      ctx.globalAlpha = v.k * kc;
      const rr = R + (1 - kc) * 10;
      ctx.translate(D.x + Math.cos(ac) * rr, D.y + Math.sin(ac) * rr);
      ctx.rotate(ac + Math.PI / 2);
      ctx.fillStyle = i < 7 ? 'rgb(236,242,248)' : L.rgba(v.accent);   // "A THIN " white, "BLUE SKIN" accent
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    });
    ctx.restore();
  },
};
