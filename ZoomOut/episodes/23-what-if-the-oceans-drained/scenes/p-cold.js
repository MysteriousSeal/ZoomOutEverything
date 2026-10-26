// Preroll (ep 23) — cold-open hook: "Drain the oceans, and Earth's longest mountain range rises out of the dark."
// The engine replays the Mid-Atlantic Ridge surfacing (film 33.33 → 34.76 at 0.25×) under this 2-line headline.
// Typography: a big white set-up line DRAIN THE OCEANS over a fitted pay-off line FIND EARTH'S LONGEST MOUNTAINS
// (MOUNTAINS in the accent). Both are fully drawn on FRAME 1 (no fade-in); the only motion is an accent rule that
// wipes in under MOUNTAINS and a slow 1.5 % scale breathe. Band: cap tops ≥ 170, baselines 256 / 344 — clear of the
// globe's top limb (y ≈ 375 in this window) and of the HUD (off during the preroll). Every line is fitted ≤ 940 px.
import * as L from '../../../../engine/runtime/lib.js';

const { W } = L;
const MAXW = 924;                 // ≤ 940 even at the end of the 1.5 % breathe
const INK = 'rgb(242,245,248)';
const L1 = { text: 'DRAIN THE OCEANS', y: 256, size: 122 };
const L2 = { parts: [["FIND EARTH'S LONGEST ", INK], ['MOUNTAINS', null]], y: 344, size: 80 };

/** centred multi-colour line; returns {x0, s, xs: [start x of each part], ws} */
function line(ctx, parts, y, size, accent) {
  const text = parts.map((p) => p[0]).join('');
  const s = L.fitSize(ctx, text, MAXW, size, 800, L.FONT.display, 40);
  ctx.font = L.font(s, 800, L.FONT.display);
  let x = W / 2 - ctx.measureText(text).width / 2;
  const xs = [], ws = [];
  ctx.textAlign = 'left';
  for (const [t, c] of parts) {
    const w = ctx.measureText(t).width;
    ctx.fillStyle = c ?? accent;
    ctx.fillText(t, x, y);
    xs.push(x); ws.push(w); x += w;
  }
  return { s, xs, ws };
}

export default {
  cues(d) {
    return [
      { t: 0.0, name: 'deep', gain: 0.28, pitch: 0.7 },        // the drain under the cold open
      { t: 0.0, name: 'riser', gain: 0.24, pitch: 0.8 },
      { t: 0.35, name: 'shimmer', gain: 0.16, pitch: 1.3 },    // the accent rule wipes under MOUNTAINS
      { t: d - 0.15, name: 'whoosh', gain: 0.35, pitch: 1.1 },
    ];
  },
  drawOverlay(ctx, v) {
    if (v.k <= 0) return;
    const acc = L.rgba(v.accent);
    ctx.save();
    ctx.globalAlpha = v.k;
    ctx.textBaseline = 'alphabetic';
    // a soft dark band behind the type so it reads over stars and the bright Arctic ice cap
    const g = ctx.createLinearGradient(0, 120, 0, 400);
    g.addColorStop(0, 'rgba(2,6,14,0)');
    g.addColorStop(0.35, 'rgba(2,6,14,0.45)');
    g.addColorStop(1, 'rgba(2,6,14,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 120, W, 280);
    // slow breathe about the band centre (≤ 1.5 %, so frame 1 is already final)
    const sc = 1 + 0.015 * L.smoothstep(L.clamp(v.t / Math.max(0.1, v.d)));
    ctx.translate(W / 2, 300); ctx.scale(sc, sc); ctx.translate(-W / 2, -300);
    ctx.shadowColor = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = 18;
    line(ctx, [[L1.text, INK]], L1.y, L1.size, acc);
    const r = line(ctx, L2.parts, L2.y, L2.size, acc);
    // accent rule under MOUNTAINS, wiping in left → right
    ctx.shadowBlur = 0;
    const e = L.ease.outCubic(L.prog(v.t, 0.3, 0.7));
    if (e > 0) {
      ctx.fillStyle = acc;
      ctx.fillRect(r.xs[1], L2.y + 12, r.ws[1] * e, 5);
    }
    ctx.restore();
  },
};
