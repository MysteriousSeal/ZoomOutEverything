// Beat 0 — "What happens on the internet in one single second?"
// Near-black at t 0: a dark bedroom at night. The phone (drawn by s01) wakes at WAKE (0.6 s) and its light finds the
// walnut nightstand. This scene owns the DARKNESS: a screen-space veil (drawn over env's room, under the phone and its
// light pool) whose hole is the phone's light; it lifts slowly through beats 1-2 and is gone once the camera has
// pulled back past the nightstand (beat 3), where the night city takes over.
// Headline ONE SECOND / ON THE INTERNET with a masked wipe-in, readable from ~0.8 s to ~3.6 s.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT } from '../env.js';
import { phoneLight, phraseAt, WAKE } from './s01-one-phone.js';

const { W, H } = L;

/** Darkness over the room as a function of time and zoom: {out (far alpha), in (alpha at the phone), r (m)}. */
function veil(v) {
  const gt = v.gt, tl = v.tl;
  const light = phoneLight(v);
  const lift1 = L.ease.inOutCubic(L.prog(gt, phraseAt(tl, 1, 1), 1.6));      // "lighting up in the dark"
  const lift2 = L.ease.inOutCubic(L.prog(gt, tl.scenes[2].start, 1.5));
  let out = 0.965 - 0.06 * L.clamp(light * 2) - 0.12 * lift1 - 0.12 * lift2;
  // the darkness belongs to the close-up: it dissolves as the camera pulls back over the bed
  const lm = Math.log(v.cam.mpp);
  out *= 1 - L.smoothstep(L.clamp(L.invLerp(Math.log(0.0011), Math.log(0.004), lm)));
  const inn = out * (1 - 0.85 * L.clamp(light * 1.6));
  const r = L.lerp(0.045, 0.13, L.clamp(light)) + 0.07 * lift1 + 0.12 * lift2;
  return { out, inn, r };
}

function drawVeil(c, v) {
  const { out, inn, r } = veil(v);
  if (out <= 0.003) return;
  const x = v.wx(0), y = v.wy(0), rp = Math.max(4, v.ws(r));
  const g = c.createRadialGradient(x, y, 0, x, y, rp * 2.4);
  g.addColorStop(0, `rgba(2,3,6,${inn})`);
  g.addColorStop(0.18, `rgba(2,3,6,${L.lerp(inn, out, 0.25)})`);
  g.addColorStop(0.45, `rgba(2,3,6,${L.lerp(inn, out, 0.7)})`);
  g.addColorStop(1, `rgba(2,3,6,${out})`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------------ headline
function drawHeadline(c, v) {
  const t = v.t;
  const kout = L.ease.inCubic(L.prog(t, v.d - 0.55, 0.42));
  if (kout >= 1) return;
  const lines = [
    { words: [['ONE', 0], ['SECOND', 1]], size: 118, yb: 470 },
    { words: [['ON', 0], ['THE', 0], ['INTERNET', 0]], size: 72, yb: 566 },
  ];
  c.save();
  c.textBaseline = 'alphabetic';
  // a faint dark backing keeps the type off the light pool
  const bg = c.createRadialGradient(W / 2, 500, 20, W / 2, 500, 520);
  bg.addColorStop(0, `rgba(1,2,5,${0.35 * (1 - kout)})`);
  bg.addColorStop(1, 'rgba(1,2,5,0)');
  c.fillStyle = bg;
  c.fillRect(0, 0, W, 1100);
  lines.forEach((ln, li) => {
    c.font = L.font(ln.size, li ? 600 : 800, L.FONT.display);
    const sp = li ? 22 : 30, track = li ? 10 : 2;
    c.letterSpacing = `${track}px`;
    const ws = ln.words.map(([w]) => c.measureText(w).width - track);
    const total = ws.reduce((a, b) => a + b, 0) + sp * (ln.words.length - 1);
    let x = W / 2 - total / 2;
    ln.words.forEach(([w, acc], wi) => {
      // line 1 is already mid-wipe at frame 0 (the first frame carries the title); line 2 follows at ~0.15 s
      const st = li ? 0.15 + wi * 0.08 : -0.3 + wi * 0.08;
      const e = L.ease.outQuint(L.prog(t, st, 0.8));
      if (e > 0) {
        c.save();
        c.beginPath(); c.rect(x - 14, ln.yb - ln.size * 1.02, ws[wi] + 28, ln.size * 1.28); c.clip();
        c.globalAlpha = L.clamp(e * 1.5) * (1 - kout);
        c.fillStyle = acc ? L.rgba(ACCENT) : li ? 'rgba(214,224,238,0.92)' : 'rgb(242,246,250)';
        c.shadowColor = 'rgba(0,0,0,0.6)';
        c.shadowBlur = 20;
        c.fillText(w, x, ln.yb + (1 - e) * ln.size * 0.95 - kout * 24);
        if (acc) {
          // a cool light sweep across SECOND once it has landed
          const gp = L.prog(t, 1.25, 0.9);
          if (gp > 0 && gp < 1) {
            c.globalCompositeOperation = 'lighter';
            c.shadowBlur = 0;
            const gx = x - 100 + (ws[wi] + 200) * L.ease.inOutCubic(gp);
            const gg = c.createLinearGradient(gx - 80, 0, gx + 80, 0);
            gg.addColorStop(0, 'rgba(255,255,255,0)');
            gg.addColorStop(0.5, 'rgba(220,240,255,0.85)');
            gg.addColorStop(1, 'rgba(255,255,255,0)');
            c.fillStyle = gg;
            c.fillText(w, x, ln.yb + (1 - e) * ln.size * 0.95 - kout * 24);
          }
        }
        c.restore();
      }
      x += ws[wi] + sp;
    });
    c.letterSpacing = '0px';
  });
  // accent rule between the lines, wiping out from the centre
  const re = L.ease.outCubic(L.prog(t, 0.2, 0.7)) * (1 - kout);
  if (re > 0) {
    c.fillStyle = L.rgba(ACCENT, 0.9 * re);
    c.fillRect(W / 2 - 60 * re, 492, 120 * re, 3);
  }
  c.restore();
}

export default {
  beat: 0,
  chapter: null,
  captions: false,
  layer: 0,     // over env's room, under the phone (s01, layer 1)
  cues(d) {
    return [
      { t: 0.0, name: 'swell', gain: 0.24, pitch: 0.6 },
      { t: 0.15, name: 'swish', gain: 0.18, pitch: 0.9 },
      { t: WAKE, name: 'blip', gain: 0.28, pitch: 1.5 },        // the screen wakes
      { t: WAKE + 0.05, name: 'bloom', gain: 0.18, pitch: 0.9 },
      { t: 0.72, name: 'swish', gain: 0.14, pitch: 1.2 },
      { t: 1.25, name: 'shimmer', gain: 0.16, pitch: 1.2 },
      { t: d - 0.7, name: 'riser', gain: 0.14, pitch: 1.0 },
    ];
  },
  drawWorld(ctx, v) {
    // 18c: 18 beats 3-5 are cut (zero length), so the pull-back to the city starts at beat 4's start: the veil dissolves
    // with the zoom (veil(): gone by 4 mm/px), not on a hard time cut
    if (v.cam.mpp > 0.01 || v.gt > v.tl.scenes[4].start + 2) return;
    drawVeil(ctx, v);
    // main.js skips overlays while their k is 0 (exactly gt 0), so the very first frame draws the headline here
    if (v.t <= 0.002) drawHeadline(ctx, v);   // 18c: beat-relative (the film starts after the cold open)
  },
  drawOverlay(ctx, v) {
    drawHeadline(ctx, v);
  },
};
