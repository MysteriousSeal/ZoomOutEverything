// Beat 4 — "Arms up, like a boxer. | Protect your chest, so you can keep breathing."
// Times (59.00 s timeline: beat 29.30–34.83, d 5.53; phrase 0 +0.15, phrase 1 +2.44). Camera 'arms' holds on YOU, the map
// dims under a safety card (x 140–940, y 560–1300; the same card carries on into s05, which takes it over seamlessly).
//   0.00–0.45  the map dims (0 → 0.62); the card plate is OPAQUE from its first frame (overlayIn false) and scales/slides
//              in (0.9 → 1, +40 → 0 px, 0.3 s); the standing pictogram appears only once the plate is solid (+0.24 → +0.42).
//   phrase 0   STEP 4 badge ARMS UP, LIKE A BOXER (+ −0.1); the figure goes stand → boxer (+0.05, 0.6 s: knees soften,
//              forearms come up in front of the chest as a protective frame, fists below the chin) with dashed yellow
//              motion arcs + arrowheads tracing both fists (fade out by +2.0).
//   phrase 1   sub PROTECT YOUR CHEST (+0.2); the forearms flash a yellow edge (+0.1); on "so you can keep breathing"
//              (+1.15) a cyan breathing-space bubble swells at the chest (breathes: ±6 %, 0.55 Hz) with a leader to the
//              tag ROOM TO BREATHE on the card's right.
//   exit       d−0.62…d−0.38: tag, bubble and sub fade, the badge plate un-wipes and its tile leaves right behind it. The
//              dim + card + boxer stay at full strength to the last frame (no v.k fade): s05 (overlayIn false) draws the
//              identical card and pose from its first frame, so the hand-over is invisible.
// Exports the shared card layout (CARD, DIM, GROUND_Y, card, badgeOut) used by s05; the pictogram (POSE, joints,
// drawPicto, picLayer, motionArc) lives in env.js.
import * as L from '../../../../engine/runtime/lib.js';
import { stepBadge, badgeSub, BADGE, CARD_BG, CD, POSE, mixPose, pathPose, joints, drawPicto, picLayer, motionArc } from '../env.js';
export { POSE, mixPose, pathPose, joints, drawPicto, picLayer, motionArc };

const { W, H } = L;
const TAU = Math.PI * 2;
const ph = (v, j) => v.tl.lines[v.index].phrases[j].start - v.tl.scenes[v.index].start;

// ------------------------------------------------------------------ shared card layout (s04 + s05)
export const CARD = { x: 140, y: 560, w: 800, h: 740, r: 20 };
export const DIM = 0.62;
export const GROUND_Y = CARD.y + CARD.h - 96;

/** the card backing (env safetyCard look: opaque off-black, fine yellow keyline) with a small hazard tick top-left.
 *  a: alpha 0..1, dy: vertical offset, sc: scale about the card centre; fn draws inside (clipped). */
export function card(c, a, dy, sc, fn, top = 0) {
  if (a <= 0) return;
  const { x, w, r } = CARD, y = CARD.y + top, h = CARD.h - top;
  c.save();
  c.globalAlpha *= L.clamp(a);
  const cx = x + w / 2, cy = y + h / 2;
  c.translate(cx, cy + dy); c.scale(sc, sc); c.translate(-cx, -cy);
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 30; c.shadowOffsetY = 10;
  c.fillStyle = L.rgba(CARD_BG);
  L.roundRect(c, x, y, w, h, r); c.fill();
  c.shadowColor = 'transparent';
  c.strokeStyle = L.rgba(CD.yellow, 0.42); c.lineWidth = 1.5;
  L.roundRect(c, x + 7, y + 7, w - 14, h - 14, r - 6); c.stroke();
  // hazard tick: a short yellow/black stripe block in the top-left corner (safety-card panel mark)
  c.save();
  c.beginPath(); c.rect(x + 26, y + 26, 64, 10); c.clip();
  c.fillStyle = L.rgba(CD.yellow, 0.85); c.fillRect(x + 26, y + 26, 64, 10);
  c.fillStyle = L.rgba(CARD_BG);
  c.beginPath();
  for (let sx = x + 16; sx < x + 100; sx += 16) { c.moveTo(sx, y + 36); c.lineTo(sx + 8, y + 36); c.lineTo(sx + 18, y + 26); c.lineTo(sx + 10, y + 26); c.closePath(); }
  c.fill();
  c.restore();
  c.save();
  L.roundRect(c, x + 8, y + 8, w - 16, h - 16, r - 7); c.clip();
  fn?.();
  c.restore();
  c.restore();
}

/** a STEP badge whose plate un-wipes into its tile (out 1 → 0), then the tile pops away (pop 1 → 0) */
export function badgeOut(c, v, n, text, out, pop) {
  if (pop <= 0) return;
  c.save();
  if (out < 1) { c.beginPath(); c.rect(0, 0, BADGE.x + BADGE.h - 2 + 900 * L.clamp(out), BADGE.y + BADGE.h + 20); c.clip(); }
  if (pop < 1) {
    const cx = BADGE.x + BADGE.h / 2, cy = BADGE.y + BADGE.h / 2, sc = Math.max(0.001, L.lerp(0.6, 1, pop));
    c.globalAlpha *= L.clamp(pop * 1.5);
    c.translate(cx, cy); c.scale(sc, sc); c.translate(-cx, -cy);
  }
  stepBadge(c, v, n, text, { k: 1 });
  c.restore();
}

// ------------------------------------------------------------------ the scene
const FIG_S = 540;
const FIG_X = CARD.x + CARD.w / 2 - 70;

export default {
  beat: 4,
  chapter: null,
  captions: true,
  overlayIn: false,   // drawn from the beat's first (sub-)frame: the card plate is opaque from its first frame (no ghost figure)
  layer: 5,
  cues(d) { return [{ t: 0.05, name: 'swish', gain: 0.22, pitch: 0.9 }, { t: 0.7, name: 'whoosh', gain: 0.18, pitch: 1.3 }, { t: 3.6, name: 'shimmer', gain: 0.14, pitch: 1.2 }]; },
  drawOverlay(c, v) {
    const t = Math.max(0, v.t), d = v.d, p0 = ph(v, 0), p1 = ph(v, 1);
    const kin = L.ease.outCubic(L.prog(t, 0, 0.45));
    const ex = L.prog(t, d - 0.62, 0.22);                        // labels exit (quick: no half-faded tail)
    const exE = L.ease.inCubic(ex);
    c.save();
    // dim (held to the last frame: s05 continues it)
    c.globalAlpha = kin * DIM; c.fillStyle = '#02040a'; c.fillRect(0, 0, W, H);
    c.globalAlpha = 1;
    // ---- badge + sub
    const bIn = L.prog(t, p0 - 0.1, 0.75);
    if (bIn > 0) {
      if (bIn < 1) stepBadge(c, v, 4, 'ARMS UP, LIKE A BOXER', { k: L.ease.outCubic(bIn) });
      else badgeOut(c, v, 4, 'ARMS UP, LIKE A BOXER', 1 - L.ease.inCubic(L.prog(t, d - 0.62, 0.2)), 1 - L.ease.inCubic(L.prog(t, d - 0.5, 0.12)));   // the tile leaves as the plate finishes: no orphan tile
    }
    badgeSub(c, 'PROTECT YOUR CHEST', L.ease.outCubic(L.prog(t, p1 + 0.2, 0.45)) * (1 - exE));
    // ---- card
    // the plate is fully opaque from its first frame: it scales/slides in (0.3 s); the figure only appears once it is solid
    const cIn = L.ease.outCubic(L.prog(t, 0, 0.3));
    card(c, 1, (1 - cIn) * 40, L.lerp(0.9, 1, cIn), () => {
      const u = L.ease.inOutCubic(L.prog(t, p0 + 0.05, 0.6));
      const q = mixPose('stand', 'boxer', u);
      const gx = FIG_X, gy = GROUND_Y, s = FIG_S;
      const hiK = L.smoothstep(L.prog(t, p1 + 0.1, 0.3)) * (1 - L.smoothstep(L.prog(t, p1 + 0.9, 0.6)));
      // breathing bubble: the space between the chest and the forearm frame; swells on "so you can keep breathing"
      const J = joints('boxer');
      const bx = gx + (J.ox + J.sh.x * 0.62 + J.hip.x * 0.38 - 0.045) * s, by = gy + (J.sh.y + 0.11) * s;
      const figA = L.smoothstep(L.prog(t, 0.24, 0.18));   // the figure appears once the plate is solid
      const bk = L.ease.outBack(L.prog(t, p1 + 1.15, 0.6), 1.4) * (1 - exE);
      const breath = 1 + 0.06 * Math.sin((t - p1 - 1.15) * TAU * 0.55);
      const rx = 0.125 * s * breath * Math.max(0, bk), ry = 0.135 * s * breath * Math.max(0, bk);
      const bubble = (g) => {
        if (!(bk > 0.001)) return;
        g.save();
        g.globalAlpha *= L.clamp(bk);
        g.fillStyle = 'rgba(80,195,250,0.4)';
        g.beginPath(); g.ellipse(bx, by, Math.max(0, rx), Math.max(0, ry), 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(130,225,255,0.95)'; g.lineWidth = 4; g.setLineDash([14, 10]);
        g.lineDashOffset = -t * 18;
        g.beginPath(); g.ellipse(bx, by, Math.max(0, rx), Math.max(0, ry), 0, 0, TAU); g.stroke();
        g.setLineDash([]);
        g.restore();
      };
      picLayer(c, figA, (g) => {
        drawPicto(g, gx, gy, s, q, { hi: hiK > 0 ? { nArm: hiK, fArm: hiK } : null, afterTorso: bubble });
      });
      if (bk > 0.001) {
        c.save();
        c.globalAlpha *= L.clamp(bk);
        // outward breath ticks (3 small arrows) on the bubble's front-left
        for (const a of [-2.55, -3.14, 2.55]) {
          const r0x = rx + 10, r0y = ry + 10, len = 22 + 8 * Math.sin((t - p1) * TAU * 0.55);
          const x0 = bx + Math.cos(a) * r0x, y0 = by + Math.sin(a) * r0y;
          c.strokeStyle = 'rgba(130,225,255,0.9)'; c.fillStyle = 'rgba(130,225,255,0.9)';
          c.lineWidth = 3.5; c.lineCap = 'round';
          const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
          c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1 - Math.cos(a) * 6, y1 - Math.sin(a) * 6); c.stroke();
          c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - Math.cos(a - 0.5) * 12, y1 - Math.sin(a - 0.5) * 12); c.lineTo(x1 - Math.cos(a + 0.5) * 12, y1 - Math.sin(a + 0.5) * 12); c.closePath(); c.fill();
        }
        // leader + tag ROOM TO BREATHE (below-left of the bubble, in front of the legs)
        const tk = L.ease.outCubic(L.prog(t, p1 + 1.35, 0.45)) * (1 - exE);
        if (tk > 0) {
          c.font = L.font(30, 800, L.FONT.display);
          c.letterSpacing = '2px';
          const tw = c.measureText('ROOM TO BREATHE').width;
          c.letterSpacing = '0px';
          const px = CARD.x + 44, py = by + 0.25 * s;
          c.globalAlpha = L.clamp(tk);
          // leader from the bubble edge to the tag
          const lx0 = bx - rx * 0.42, ly0 = by + ry * 0.9, lx1 = Math.min(px + tw + 10, lx0 - 14), ly1 = py;
          c.strokeStyle = 'rgba(130,225,255,0.8)'; c.lineWidth = 2.5;
          c.beginPath(); c.moveTo(lx0, ly0); c.lineTo(L.lerp(lx0, lx1, tk), L.lerp(ly0, ly1, tk)); c.stroke();
          c.fillStyle = 'rgba(130,225,255,0.95)'; c.beginPath(); c.arc(lx0, ly0, 6, 0, TAU); c.fill();
          c.fillStyle = 'rgba(14,40,52,0.96)';
          L.roundRect(c, px, py + (1 - tk) * 10, tw + 36, 54, 10); c.fill();
          c.strokeStyle = 'rgba(130,225,255,0.85)'; c.lineWidth = 2; c.stroke();
          c.fillStyle = 'rgb(170,236,255)';
          c.textBaseline = 'middle';
          L.trackedText(c, 'ROOM TO BREATHE', px + 18, py + 29 + (1 - tk) * 10, 2);
        }
        c.restore();
      }
    });
    c.restore();
  },
};
