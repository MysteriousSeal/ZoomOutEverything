// Beat 1 — "First, the flash. | Don't look: it can blind you. | Drop face down and cover your head."
// Times (current 60.06 s timeline, beat 8.26–15.18): env flash at T.flash ≈ 9.13 (one bloom, then decay).
//   8.26–8.91  the hook's countdown has just docked top right: this scene holds it at full strength while env's HUD
//              readout fades in on top (identical glyphs, so the handover is invisible).
//   phrase 1 (10.29) STEP 1 badge DON'T LOOK + sub IT CAN BLIND YOU; a safety card (x 64–504, y 552–892) shows an
//              ISO-style "do not look" prohibition sign (white disc, red ring + slash, black eye).
//   phrase 2 (12.73) the badge's plate un-wipes into the tile (tile stays: no re-pop) and re-wipes as
//              DROP · COVER YOUR HEAD, sub FACE DOWN; the sign shrinks away and the safety-card pictogram drops from
//              standing → kneeling → face down, hands over the back of the head (13.0 → 14.2), with a dashed motion
//              arc + arrowhead and a ground line. Prone pose holds ≥ 0.9 s to the beat end.
// The pictogram (drawFigure), the badge, the sub chip (stepSub) and BADGE/CARD_BG live in env.js (series system);
// CARD + safetyCard are exported here for s02 (STAY DOWN card).
import * as L from '../../../../engine/runtime/lib.js';
import { stepBadge, stepSub, drawFigure, BADGE, CARD_BG, CD, DANGER, TEXT, COUNT_HUD, countdownAt, fmtClock } from '../env.js';

const TAU = Math.PI * 2;
const ph = (v, j) => v.tl.lines[v.index].phrases[j].start - v.tl.scenes[v.index].start;

// ------------------------------------------------------------------ shared layout (s01 + s02)
export const CARD = { x: 64, y: 552, w: 440, h: 340, r: 18 };

/** the safety card backing: opaque off-black, fine yellow keyline, hazard corner tick. k = entrance 0..1 */
export function safetyCard(c, k, fn) {
  if (k <= 0) return;
  const { x, y, w, h, r } = CARD;
  c.save();
  c.globalAlpha *= L.clamp(k * 1.6);
  const dy = (1 - k) * 24;
  c.translate(0, dy);
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 26; c.shadowOffsetY = 8;
  c.fillStyle = L.rgba(CARD_BG);
  L.roundRect(c, x, y, w, h, r); c.fill();
  c.shadowColor = 'transparent';
  c.strokeStyle = L.rgba(CD.yellow, 0.42); c.lineWidth = 1.5;
  L.roundRect(c, x + 7, y + 7, w - 14, h - 14, r - 6); c.stroke();
  c.save();
  L.roundRect(c, x + 8, y + 8, w - 16, h - 16, r - 7); c.clip();
  fn();
  c.restore();
  c.restore();
}

/** ISO-style prohibition sign: white disc, red ring + slash, a black eye. (cx, cy) centre, r outer radius, k 0..1 */
function noLookSign(c, cx, cy, r, k, slashK) {
  if (k <= 0) return;
  const s = L.ease.outBack(L.clamp(k), 1.6);
  c.save();
  c.translate(cx, cy);
  c.scale(Math.max(0.001, s), Math.max(0.001, s));
  c.globalAlpha *= L.clamp(k * 2);
  const ring = r * 0.17;
  c.fillStyle = 'rgb(246,244,238)';
  c.beginPath(); c.arc(0, 0, Math.max(0, r - ring * 0.5), 0, TAU); c.fill();
  // the eye: almond outline (two arcs), iris, pupil highlight
  const ew = r * 0.56, eh = r * 0.3;
  const R = (ew * ew + eh * eh) / (2 * eh);   // circle through the corners and the lid apex
  c.fillStyle = L.rgba(CD.ink);
  c.beginPath();
  c.arc(0, -eh + R, R, -Math.PI / 2 - Math.asin(ew / R), -Math.PI / 2 + Math.asin(ew / R));
  c.arc(0, eh - R, R, Math.PI / 2 - Math.asin(ew / R), Math.PI / 2 + Math.asin(ew / R));
  c.closePath(); c.fill();
  c.fillStyle = 'rgb(246,244,238)';
  const ew2 = ew * 0.8, eh2 = eh * 0.66, R2 = (ew2 * ew2 + eh2 * eh2) / (2 * eh2);
  c.beginPath();
  c.arc(0, -eh2 + R2, R2, -Math.PI / 2 - Math.asin(ew2 / R2), -Math.PI / 2 + Math.asin(ew2 / R2));
  c.arc(0, eh2 - R2, R2, Math.PI / 2 - Math.asin(ew2 / R2), Math.PI / 2 + Math.asin(ew2 / R2));
  c.closePath(); c.fill();
  c.fillStyle = L.rgba(CD.ink);
  c.beginPath(); c.arc(0, 0, Math.max(0, eh * 0.74), 0, TAU); c.fill();
  c.fillStyle = 'rgb(246,244,238)';
  c.beginPath(); c.arc(eh * 0.26, -eh * 0.26, Math.max(0, eh * 0.17), 0, TAU); c.fill();
  // red ring + slash (top-left → bottom-right), the slash wipes in
  c.strokeStyle = L.rgba(DANGER);
  c.lineWidth = ring;
  c.beginPath(); c.arc(0, 0, Math.max(0, r - ring / 2), 0, TAU); c.stroke();
  const sk = L.ease.outCubic(L.clamp(slashK));
  if (sk > 0) {
    const a = Math.PI * 0.25, rr = r - ring * 0.6;
    c.lineCap = 'butt';
    c.beginPath();
    c.moveTo(-Math.cos(a) * rr, -Math.sin(a) * rr);
    c.lineTo(-Math.cos(a) * rr + 2 * Math.cos(a) * rr * sk, -Math.sin(a) * rr + 2 * Math.sin(a) * rr * sk);
    c.stroke();
  }
  c.restore();
}

/** badge whose plate can un-wipe (out 1→0) and re-wipe with new text while the STEP tile stays put (wipe 0 = tile only) */
function badgeWipe(c, v, n, text, wipe, opts = {}) {
  c.save();
  c.beginPath();
  c.rect(0, 0, BADGE.x + BADGE.h - 2 + 900 * L.clamp(wipe), BADGE.y + BADGE.h + 20);
  c.clip();
  stepBadge(c, v, n, text, { k: 1, ...opts });
  c.restore();
}

export default {
  beat: 1,
  chapter: null,
  captions: true,
  overlayIn: false,   // full strength from the first frame: holds the docked countdown under env's HUD fade-in
  layer: 5,
  cues(d) {
    return [];
  },
  drawOverlay(c, v) {
    const p1 = ph(v, 1), p2 = ph(v, 2);
    c.save();
    // ---- countdown handover (env HUD fades in from +0.15 s for 0.5 s; identical glyphs underneath until it is full)
    if (v.t < 0.7) {
      c.save();
      c.textAlign = 'right';
      c.textBaseline = 'alphabetic';
      c.shadowColor = 'rgba(2,6,14,0.8)'; c.shadowBlur = 14;
      c.font = L.font(64, 700, L.FONT.din);
      c.fillStyle = L.rgba(TEXT);
      c.fillText(fmtClock(countdownAt(v.gt, v.tl)), COUNT_HUD.x, COUNT_HUD.y);
      c.restore();
    }
    // exit: ≈ 0.22 s fade with a slight upward drift (no 2-frame cut at the beat end)
    const ex = L.smoothstep(L.prog(v.t, v.d - 0.27, 0.22));
    c.globalAlpha = v.k * (1 - ex);
    c.translate(0, -14 * ex);
    // ---- STEP 1 badge: DON'T LOOK (phrase 1) → DROP · COVER YOUR HEAD (phrase 2), tile stays
    const kIn = L.prog(v.t, p1 - 0.1, 0.75);                                   // stepBadge's staged entrance
    const out1 = 1 - L.ease.inCubic(L.prog(v.t, p2 - 0.28, 0.22));            // plate un-wipes into the tile
    const in2 = L.ease.outCubic(L.prog(v.t, p2 - 0.04, 0.45));                // new plate wipes out
    if (kIn > 0 && v.t < p2 - 0.06) {
      if (kIn < 1) stepBadge(c, v, 1, "DON'T LOOK", { k: L.ease.outCubic(kIn) });
      else badgeWipe(c, v, 1, "DON'T LOOK", out1);
    }
    if (v.t >= p2 - 0.06) {
      badgeWipe(c, v, 1, 'DROP · COVER YOUR HEAD', in2);
    }
    // subs
    stepSub(c, 'IT CAN BLIND YOU', L.ease.outCubic(L.prog(v.t, p1 + 0.3, 0.45)) * out1);
    stepSub(c, 'FACE DOWN · HANDS OVER YOUR HEAD', L.ease.outCubic(L.prog(v.t, p2 + 0.35, 0.45)));
    // ---- the safety card
    const ck = L.ease.outCubic(L.prog(v.t, p1 + 0.1, 0.5));
    safetyCard(c, ck, () => {
      const cx = CARD.x + CARD.w / 2, cy = CARD.y + CARD.h / 2;
      // phrase 1: do-not-look sign; leaves (shrinks, fades) as phrase 2 starts
      const signOut = L.ease.inCubic(L.prog(v.t, p2 - 0.2, 0.3));
      const signK = L.prog(v.t, p1 + 0.08, 0.5) * (1 - signOut);   // with the card (no empty card)
      noLookSign(c, cx, cy, 116 * (1 - 0.25 * signOut), signK, L.prog(v.t, p1 + 0.4, 0.35));
      // phrase 2: the figure drops (stand 0.3 s, then 1.2 s down), arc follows, then holds face down
      const fk = L.ease.outCubic(L.prog(v.t, p2 + 0.02, 0.3));
      if (fk > 0) {
        const u = L.prog(v.t, p2 + 0.3, 1.2);   // drawFigure eases each half (stand → kneel → face down)
        const arcK = L.prog(v.t, p2 + 0.3, 1.2);
        drawFigure(c, cx, CARD.y + CARD.h - 50, L.lerp(262, 318, L.smoothstep(u)), u, { alpha: fk, arc: arcK, arcAlpha: 0.75 * (1 - 0.55 * L.prog(v.t, p2 + 1.6, 0.5)) });
      }
    });
    c.restore();
  },
};
