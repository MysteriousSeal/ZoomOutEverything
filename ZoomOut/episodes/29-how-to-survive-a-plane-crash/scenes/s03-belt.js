// Beat 3 — "Keep your seatbelt low and tight, | and keep your shoes on."
// Camera 'card' pushes in on YOU's seat; the cabin dims under a safety card (x 140–940, y 560–1300; the same card
// carries on into s04, which takes it over seamlessly).
//   0.00–0.45  the cabin dims (0 → 0.62); the card plate is OPAQUE from its first frame (overlayIn false) and scales /
//              slides in (0.9 → 1, +40 → 0 px, 0.3 s); the seated pictogram + both seats appear once the plate is solid.
//   badge      STEP 2 BELT LOW & TIGHT (+0.05).
//   "seatbelt" the lap belt appears (yellow) HIGH on the stomach (wrong) … "low" it slides down onto the hips;
//              "tight" it pulls snug (two inward ticks) · tag ACROSS THE HIP BONES under the floor line, leader to the buckle.
//   "shoes"    sub chip STURDY SHOES: THE FLOOR MAY BE STREWN WITH DEBRIS; the shoes light yellow.
//   exit       d−0.62…: tag, sub and highlights fade, the badge plate un-wipes, its tile leaves; the dim + card + seated
//              figure (neutral belt) hold to the last frame — s04 draws the identical card from its first frame.
// Exports the shared card (CARD, DIM, GY, FX, FIG_S, card, badgeOut, drawScene) used by s04.
import * as L from '../../../../engine/runtime/lib.js';
import { stepBadge, stepSub, BADGE, CARD_BG, CD, POSE, mixPose, joints, drawPicto, picLayer, cardSeat, SEAT_PITCH, wordTime } from '../env.js';

const { W, H } = L;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ shared card layout (s03 + s04)
export const CARD = { x: 140, y: 560, w: 800, h: 740, r: 20 };
export const DIM = 0.62;
export const SUB2 = 'STURDY SHOES: THERE MAY BE DEBRIS';
export const GY = CARD.y + CARD.h - 96;        // the cabin floor line on the card
export const FIG_S = 560;                       // pictogram scale (standing height px)
export const FX = 417;                          // the mirror axis: figure x 0 (the hip) on screen
/** figure units → screen (the figure faces RIGHT: mirrored) */
export const fpt = (u, w) => [FX - u * FIG_S, GY + w * FIG_S];

export function card(c, a, dy, sc, fn) {
  if (a <= 0) return;
  const { x, y, w, h, r } = CARD;
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
  c.save();
  c.beginPath(); c.moveTo(x + 24, y + 36); c.lineTo(x + 34, y + 26); c.lineTo(x + 90, y + 26); c.lineTo(x + 80, y + 36); c.closePath(); c.clip();
  c.fillStyle = L.rgba(CD.yellow, 0.85); c.fillRect(x + 20, y + 26, 80, 10);
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

// lap-belt geometry (figure units, relative to the hip joint; the figure faces LEFT, so −x is the front): a thin strap
// almost level across the hip crease, ≈ 13° down to the rear, clipped to the body; the buckle at the front of the pelvis
export const BELT_LOW = { fx: -0.05, fy: -0.04, rx: 0.16, ry: -0.0 };     // on the hip bones (right)
const BELT_HIGH = { fx: -0.055, fy: -0.155, rx: 0.16, ry: -0.118 };       // on the stomach (wrong)
export const NEUTRAL_BELT = [150, 156, 172];
/** the belt's buckle point (figure units) for hip h and belt u (0 high … 1 low) */
export const buckleAt = (h, u = 1) => ({ x: h.x + L.lerp(BELT_HIGH.fx, BELT_LOW.fx, u), y: h.y + L.lerp(BELT_HIGH.fy, BELT_LOW.fy, u) });

/**
 * The card's content: both seats, the pictogram (pose q), the lap belt and optional shoe highlight. Screen space.
 * o: { figA, seatA, frontA, frontDx, belt: {u (0 high → 1 low), tight 0..1, col, a}, shoes 0..1 }
 */
export function drawScene(c, q, o) {
  const s = FIG_S;
  // seats (behind the figure): ours, and the one in front (slides in from the right with frontDx)
  c.save();
  c.translate(FX, 0); c.scale(-1, 1); c.translate(-FX, 0);
  cardSeat(c, FX, GY, s, 0.075, { alpha: o.seatA ?? 1 });
  if ((o.frontA ?? 0) > 0) {
    c.save(); c.translate(-(o.frontDx ?? 0), 0);
    cardSeat(c, FX, GY, s, 0.075 - SEAT_PITCH, { alpha: o.frontA });
    c.restore();
  }
  c.restore();
  // floor line
  c.fillStyle = 'rgba(246,244,238,0.4)'; c.fillRect(CARD.x + 40, GY + 3, CARD.w - 80, 3);
  const belt = o.belt;
  const J = joints(q);
  const beltFn = (g, P, JJ) => {
    if (!belt || belt.a <= 0) return;
    const h = JJ.hip, u = belt.u;
    const F = buckleAt(h, u), R = { x: h.x + L.lerp(BELT_HIGH.rx, BELT_LOW.rx, u), y: h.y + L.lerp(BELT_HIGH.ry, BELT_LOW.ry, u) };
    const sag = 0.022 * (1 - belt.tight);
    const M = { x: (F.x + R.x) / 2, y: (F.y + R.y) / 2 + sag };
    g.save();
    g.globalAlpha *= belt.a;
    g.lineCap = 'butt'; g.lineJoin = 'round';
    // the strap only where it lies on the body (source-atop on the figure's own layer)
    g.globalCompositeOperation = 'source-atop';
    g.strokeStyle = L.rgba(CARD_BG); g.lineWidth = 0.034 * s;    // knock-out edge
    g.beginPath(); g.moveTo(...P(R)); g.quadraticCurveTo(...P(M), ...P(F)); g.stroke();
    g.strokeStyle = L.rgba(belt.col); g.lineWidth = 0.021 * s;
    g.beginPath(); g.moveTo(...P(R)); g.quadraticCurveTo(...P(M), ...P(F)); g.stroke();
    g.globalCompositeOperation = 'source-over';
    // buckle (a small plate on the strap, at the front of the pelvis)
    const [bx, by] = P(F), [mx, my] = P(M), ang = Math.atan2(my - by, mx - bx);
    g.translate(bx, by); g.rotate(ang);
    g.fillStyle = L.rgba(CARD_BG);
    L.roundRect(g, -0.012 * s, -0.024 * s, 0.062 * s, 0.048 * s, 0.01 * s); g.fill();
    g.fillStyle = L.rgba(L.mix(belt.col, [255, 255, 255], 0.35));
    L.roundRect(g, -0.004 * s, -0.017 * s, 0.046 * s, 0.034 * s, 0.006 * s); g.fill();
    g.restore();
  };
  picLayer(c, o.figA ?? 1, (g) => {   // (always on its own layer: the strap is clipped to the figure)
    g.save();
    g.translate(FX, 0); g.scale(-1, 1); g.translate(-FX, 0);
    drawPicto(g, FX, GY, s, q, { ground: 0, armBehindHead: true, afterTorso: (gg, P, JJ) => beltFn(gg, P, JJ) });
    // shoes: a yellow shoe over each foot (sole on the floor)
    if ((o.shoes ?? 0) > 0) {
      for (const [A, far] of [[J.fA, true], [J.nA, false]]) {
        const [ax] = [FX + A.x * s];
        const col = far ? L.mix(CD.yellow, CARD_BG, 0.3) : CD.yellow;
        g.save();
        g.globalAlpha *= L.clamp(o.shoes);
        g.fillStyle = L.rgba(col);
        g.beginPath();
        const heel = ax + 0.045 * s, toe = ax - 0.115 * s, top = GY - 0.075 * s;
        g.moveTo(heel, GY); g.lineTo(toe + 0.02 * s, GY);
        g.quadraticCurveTo(toe - 0.008 * s, GY - 0.006 * s, toe, GY - 0.03 * s);
        g.quadraticCurveTo(toe + 0.03 * s, GY - 0.05 * s, ax - 0.03 * s, top + 0.012 * s);
        g.lineTo(ax - 0.01 * s, top);
        g.lineTo(heel - 0.004 * s, top + 0.004 * s);
        g.quadraticCurveTo(heel + 0.008 * s, GY - 0.03 * s, heel, GY);
        g.closePath(); g.fill();
        g.fillStyle = L.rgba(L.mix(col, [20, 16, 6], 0.55));   // sole
        g.fillRect(toe + 0.01 * s, GY - 0.014 * s, heel - toe - 0.01 * s, 0.014 * s);
        g.restore();
      }
    }
    g.restore();
  }, true);
  return J;
}

/** a tag plate with a leader from (lx, ly) to the plate edge; returns nothing. align: plate centred on (x, y) */
export function tag(c, x, y, text, k, lx, ly, { col = CD.yellow } = {}) {
  if (k <= 0) return;
  c.save();
  k = L.clamp(k);
  c.font = L.font(28, 800, L.FONT.display); c.letterSpacing = '2px';
  const tw = c.measureText(text).width - 2; c.letterSpacing = '0px';
  const w = tw + 40, h = 50, bx = x - w / 2, by = y - h / 2;
  // leader (dark halo, then the line) from the nearest plate edge to its target — whole from the first frame
  const ex = L.clamp(lx, bx + 12, bx + w - 12), ey = ly < by ? by : by + h;
  const a0 = c.globalAlpha;
  c.globalAlpha = a0 * L.clamp(k * 3);
  c.lineCap = 'round';
  c.strokeStyle = L.rgba(CARD_BG); c.lineWidth = 7;
  c.beginPath(); c.moveTo(ex, ey); c.lineTo(lx, ly); c.stroke();
  c.strokeStyle = L.rgba(col, 0.95); c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(ex, ey); c.lineTo(lx, ly); c.stroke();
  c.fillStyle = L.rgba(CARD_BG); c.beginPath(); c.arc(lx, ly, 8.5, 0, TAU); c.fill(); c.fillStyle = L.rgba(col); c.beginPath(); c.arc(lx, ly, 6, 0, TAU); c.fill();
  // the plate: opaque, scales in/out about its centre; only the text fades
  const sc = Math.max(0.001, L.ease.outBack(k, 1.4));
  c.globalAlpha = a0;
  c.translate(x, y); c.scale(sc, sc); c.translate(-x, -y);
  c.fillStyle = 'rgb(30,26,10)';
  L.roundRect(c, bx, by, w, h, 10); c.fill();
  c.strokeStyle = L.rgba(col, 0.85); c.lineWidth = 2; c.stroke();
  c.globalAlpha *= L.clamp((k - 0.35) / 0.5);
  c.fillStyle = L.rgba(L.mix(col, [255, 255, 255], 0.25));
  c.textBaseline = 'middle';
  L.trackedText(c, text, x, by + h / 2 + 1, 2, 'center');
  c.restore();
}

export default {
  beat: 3,
  chapter: null,
  captions: true,
  overlayIn: false,
  layer: 6,
  cues(d) { return [{ t: 0.03, name: 'swish', gain: 0.2, pitch: 0.9 }, { t: 1.1, name: 'tick', gain: 0.16, pitch: 1.2 }, { t: 1.72, name: 'tick', gain: 0.14, pitch: 0.9 }, { t: 3.3, name: 'blip', gain: 0.14, pitch: 1.1 }]; },
  drawOverlay(c, v) {
    const t = Math.max(0, v.t), d = v.d;
    const b = v.tl.scenes[v.index].start, w = (pj, wi) => wordTime(v.tl, 3, pj, wi) - b;
    const tBelt = w(0, 2) - 0.1, tLow = w(0, 3) - 0.1, tTight = w(0, 5) - 0.1, tShoes = w(1, 3) - 0.15;
    const kin = L.smoothstep(L.prog(t, 0, 0.75));   // a gradual dim (no luma step as the card covers the lit cabin)
    const exE = L.ease.inCubic(L.prog(t, d - 0.62, 0.22));
    c.save();
    c.globalAlpha = kin * DIM; c.fillStyle = '#02040a'; c.fillRect(0, 0, W, H);
    c.globalAlpha = 1;
    // badge + sub
    const bIn = L.prog(t, 0.05, 0.75);
    // (badge + sub hold to the last frame: s04 draws them identically and hands over to STEP 3 on "brace")
    if (bIn > 0) stepBadge(c, v, 2, 'BELT LOW & TIGHT', { k: L.ease.outCubic(bIn) });
    stepSub(c, SUB2, L.ease.outCubic(L.prog(t, tShoes + 0.05, 0.45)));
    const cIn = L.ease.outCubic(L.prog(t, 0, 0.4));
    card(c, 1, (1 - cIn) * 40, L.lerp(0.25, 1, cIn), () => {   // opaque, grows in (covers the cabin gradually)
      const figA = L.smoothstep(L.prog(t, 0.16, 0.14));   // with the plate (≤ 0.3 s empty)
      const bu = L.ease.inOutCubic(L.prog(t, tLow, 0.5)), tight = L.ease.outBack(L.prog(t, tTight, 0.35), 2);
      const hiB = L.smoothstep(L.prog(t, tBelt, 0.25)) * (1 - L.smoothstep(L.prog(t, d - 0.62, 0.4)));
      const belt = { u: bu, tight: L.clamp(tight), a: L.smoothstep(L.prog(t, tBelt, 0.25)) * 0 + (t >= tBelt ? 1 : 0) * L.smoothstep(L.prog(t, tBelt, 0.2)), col: L.mix(NEUTRAL_BELT, CD.yellow, hiB) };
      const shoes = L.smoothstep(L.prog(t, tShoes, 0.3)) * (1 - L.smoothstep(L.prog(t, d - 0.62, 0.35)));
      const J = drawScene(c, POSE.seat, { figA, seatA: figA, frontA: figA, belt, shoes });
      // "tight": two inward ticks along the strap
      const tk = L.prog(t, tTight, 0.7);
      if (tk > 0 && tk < 1) {
        const B = buckleAt(J.hip), [bx, by] = fpt(B.x, B.y), [ax, ay] = fpt(J.hip.x + 0.05, J.hip.y + BELT_LOW.ry - 0.012);
        const a = Math.atan2(by - ay, bx - ax), al = Math.sin(Math.PI * tk);
        c.save(); c.globalAlpha *= al; c.strokeStyle = L.rgba(CD.yellow); c.lineWidth = 3.5; c.lineCap = 'round';
        for (const [px, py, dir] of [[bx + Math.cos(a) * 30, by + Math.sin(a) * 30 - 26, -1], [ax - Math.cos(a) * 12, ay - Math.sin(a) * 12 - 26, 1]]) {
          const ux = Math.cos(a) * dir, uy = Math.sin(a) * dir;
          c.beginPath(); c.moveTo(px - ux * 16 - uy * 10, py - uy * 16 + ux * 10); c.lineTo(px, py); c.lineTo(px - ux * 16 + uy * 10, py - uy * 16 - ux * 10); c.stroke();
        }
        c.restore();
      }
      // tag: across the hip bones (under the floor line), leader up to the buckle
      const tgk = L.ease.outCubic(L.prog(t, tLow + 0.35, 0.45)) * (1 - exE);
      const Bk = buckleAt(J.hip), [bx, by] = fpt(Bk.x, Bk.y);
      tag(c, 540, GY + 38, 'ACROSS THE HIP BONES', tgk, bx, by);
    });
    c.restore();
  },
};
