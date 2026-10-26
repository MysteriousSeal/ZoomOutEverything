// Beat 0 — the hook: "How old is everything, really?" The ruler at human scale (≈ 20 years in view), NOW pulsing at
// the right edge with a small "2026" tag. Headline HOW OLD IS / EVERYTHING? (the second line on an accent bar) is fully
// readable on the beat's FIRST frame (overlayIn: false — the preroll hands straight over to it); a light sweep crosses
// the bar, and the lines rise out of their own masks at the end of the beat. No captions, no chapter card.
//
// This file also exports the small shared helpers used by beats 0–4 (fitted labels, tags, the collapse-into-now rule).
import * as L from '../../../../engine/runtime/lib.js';
import { tx, rulerY, timelineK, ACCENT } from '../env.js';

const { W } = L;
export const GOLD = [232, 196, 132];
export const GREYTXT = [205, 215, 228];

// ------------------------------------------------------------------ shared helpers (beats 0–4)
/** font size so `str` (with letter-spacing `tr` px) fits maxW */
export function fit(ctx, str, maxW, size, weight = 800, family = L.FONT.display, tr = 0, min = 12) {
  return L.fitSize(ctx, str, maxW - tr * str.length, size, weight, family, min);
}

/** The house big-number label (lib bigLabel look), with BOTH lines fitted to maxW. */
export function label(ctx, { x = 80, y = 560, big, small, k = 1, accent = ACCENT, size = 120, maxW = 860 }) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  ctx.save();
  ctx.globalAlpha *= L.clamp(k * 1.4);
  ctx.textBaseline = 'alphabetic';
  const s = fit(ctx, big, maxW, size, 800, L.FONT.display, -1);
  ctx.fillStyle = L.rgba(accent, 0.9);
  ctx.fillRect(x, y - s * 0.92 - 26, 90 * e, 4);
  ctx.font = L.font(s, 800, L.FONT.display);
  ctx.fillStyle = L.rgba(accent);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 18;
  L.trackedText(ctx, big, x, y + (1 - e) * 30, -1, 'left');
  if (small) {
    const str = small.toUpperCase();
    ctx.shadowBlur = 8;
    ctx.font = L.font(fit(ctx, str, maxW, 30, 600, L.FONT.body, 3, 16), 600, L.FONT.body);
    ctx.fillStyle = L.rgba(GREYTXT, 0.95);
    L.trackedText(ctx, str, x, y + 52 + (1 - e) * 18, 3, 'left');
  }
  ctx.restore();
}

/** A small tracked caps tag (dates over subjects). Returns nothing; fitted to maxW. */
export function tag(ctx, x, y, text, { k = 1, color = GREYTXT, size = 24, weight = 700, family = L.FONT.body, tr = 2, maxW = 260, align = 'center', alpha = 1 } = {}) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  ctx.save();
  ctx.globalAlpha *= L.clamp(k * 1.5) * alpha;
  ctx.font = L.font(fit(ctx, text, maxW, size, weight, family, tr, 10), weight, family);
  ctx.fillStyle = L.rgba(color);
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(2,6,12,0.85)';
  ctx.shadowBlur = 10;
  L.trackedText(ctx, text, x, y + (1 - e) * 10, tr, align);
  ctx.restore();
}

/** Subject size factor by its pixel distance from NOW: 1 = full size, 0 = collapsed into a landmark dot. */
export function sizeK(v, years, near = 40, far = 230) {
  const d = years / v.cam.mpp;
  return L.smoothstep(L.clamp((d - near) / (far - near)));
}
/** landmark visibility for a collapsed subject: grows as the subject shrinks, gone once it merges into NOW */
export function dotK(v, years) {
  const d = years / v.cam.mpp;
  return (1 - sizeK(v, years)) * L.clamp((d - 8) / 26);
}
/** global time of a beat's phrase i */
export function phraseAt(v, beat, i = 0) {
  const ln = v.tl.lines[beat], ph = ln?.phrases ?? [ln];
  return ph[Math.min(i, ph.length - 1)].start;
}
export const beatStart = (v, b) => v.tl.scenes[b].start;
/** visibility for world elements: 1 while the timeline exists (0 in the track phase / preroll replay) */
export const live = (v) => timelineK(v);

// ------------------------------------------------------------------ the hook
const MAXW = 900;
const BAND = { y1: 584, barTop: 620, padX: 30, padY: 24 };

export default {
  beat: 0,
  chapter: null,
  captions: false,
  overlayIn: false,
  layer: 0,
  cues(d) {
    return [
      { t: 0.0, name: 'impact', gain: 0.32, pitch: 0.8 },
      { t: 0.05, name: 'swell', gain: 0.22, pitch: 0.9 },
      { t: 0.45, name: 'shimmer', gain: 0.16, pitch: 1.2 },
      { t: d - 0.45, name: 'swish', gain: 0.24, pitch: 1.1 },
    ];
  },

  // "2026" above NOW: on through the hook and "Start with you", gone as the zoom-out starts
  drawWorld(ctx, v) {
    const lk = live(v);
    if (lk <= 0 || v.gt > beatStart(v, 2) + 1) return;
    const k = L.enter(v.gt, beatStart(v, 0) - 0.1, 0.3) * (1 - L.enter(v.gt, beatStart(v, 2) - 0.1, 0.45, L.ease.inCubic)) * lk;
    if (k <= 0) return;
    const x = tx(v, 0), y = rulerY(v);
    tag(ctx, x, y - 40, '2026', { k, color: ACCENT, size: 28, family: L.FONT.din, weight: 700, tr: 2, maxW: 120 });
  },

  drawOverlay(ctx, v) {
    const t = v.t, d = v.d;
    if (v.k <= 0) return;
    ctx.save();
    ctx.globalAlpha = v.k;
    ctx.textBaseline = 'alphabetic';
    // line sizes: both fitted to the 900 px column (line 2 includes its bar padding)
    const s1 = fit(ctx, 'HOW OLD IS', MAXW, 150, 800, L.FONT.display, -1);
    const s2 = fit(ctx, 'EVERYTHING?', MAXW - 2 * BAND.padX, 150, 800, L.FONT.display, -1);
    const cap2 = s2 * 0.72;
    const barH = cap2 + 2 * BAND.padY;
    // a soft dark band keeps the headline crisp over the dust
    const bg = ctx.createLinearGradient(0, 380, 0, 860);
    bg.addColorStop(0, 'rgba(3,8,14,0)'); bg.addColorStop(0.3, 'rgba(3,8,14,0.45)'); bg.addColorStop(0.7, 'rgba(3,8,14,0.45)'); bg.addColorStop(1, 'rgba(3,8,14,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 380, W, 480);

    const out = (i) => L.enter(t, d - 0.62 + i * 0.06, 0.3, L.ease.inCubic);
    // line 1: white
    {
      const ko = out(0);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, BAND.y1 - s1 * 0.8, W, s1 * 0.95); ctx.clip();
      ctx.font = L.font(s1, 800, L.FONT.display);
      ctx.fillStyle = 'rgb(240,244,247)';
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 16;
      L.trackedText(ctx, 'HOW OLD IS', W / 2, BAND.y1 - ko * s1 * 0.9, -1, 'center');
      ctx.restore();
    }
    // line 2: accent bar + dark ink word
    {
      const ko = out(1);
      ctx.font = L.font(s2, 800, L.FONT.display);
      ctx.letterSpacing = '-1px';
      const tw = ctx.measureText('EVERYTHING?').width;
      ctx.letterSpacing = '0px';
      const bw = tw + 2 * BAND.padX, bx = W / 2 - bw / 2;
      const top = BAND.barTop;
      ctx.save();
      ctx.beginPath(); ctx.rect(bx - 40, top - 6, bw + 80, barH + 12); ctx.clip();
      ctx.translate(0, -ko * (barH + 16));
      ctx.shadowColor = 'rgba(0,10,20,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 8;
      ctx.fillStyle = L.rgba(ACCENT);
      ctx.fillRect(bx, top, bw, barH);
      ctx.shadowColor = 'transparent';
      // a light sweep travels across the bar once, early in the beat
      const sw = L.prog(t, 0.35, 1.0);
      if (sw > 0 && sw < 1) {
        const gx = L.lerp(bx - 160, bx + bw + 160, L.ease.inOutCubic(sw));
        const g = ctx.createLinearGradient(gx - 110, 0, gx + 110, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(bx, top, bw, barH);
      }
      ctx.fillStyle = 'rgb(6,20,28)';
      L.trackedText(ctx, 'EVERYTHING?', W / 2, top + BAND.padY + cap2, -1, 'center');
      ctx.restore();
    }
    // a thin accent rule above the headline (draws out slowly: keeps the frame alive)
    const rk = L.enter(t, 0, 1.2, L.ease.outCubic) * (1 - out(0));
    ctx.fillStyle = L.rgba(ACCENT, 0.9 * (1 - out(0)));
    ctx.fillRect(W / 2 - 30 - 40 * rk, BAND.y1 - s1 * 0.72 - 44, 60 + 80 * rk, 4);
    ctx.restore();
  },
};
