// Beat 4 — "If the crew shouts "brace", | head down against the seat in front, feet flat on the floor."
// The s03 safety card continues (overlayIn false: identical card, dim, seats and seated figure from the first frame).
//   "brace" (−0.1)  STEP 3 BRACE badge lands on the word.
//   phrase 1        the figure goes seat → brace (0.9 s): bends ≈ 50° forward from the hips, head bowed onto the back of
//                   the seat in front, forearms crossed over the back of the head, feet drawn back flat on the floor
//                   (dashed motion arc on the head).
//   "the seat"      a contact flash where the head meets the seat back + tag HEAD ON THE SEAT BACK (top right), its
//                   leader ending on that contact point.
//   "feet"          the feet glow; tag FEET FLAT, BEHIND THE KNEES (under the floor line), leader up to the feet.
//   exit            d−0.8: tags fade, badge un-wipes; d−0.55 the card content fades; d−0.42 the plate shrinks away
//                   (fast); d−0.35 the dim lifts — all gone before the beat's end (the camera pulls out in s05).
import * as L from '../../../../engine/runtime/lib.js';
import { stepBadge, stepSub, CD, CARD_BG, POSE, mixPose, joints, motionArc, wordTime } from '../env.js';
import { CARD, DIM, GY, FIG_S, fpt, card, badgeOut, drawScene, tag, NEUTRAL_BELT, SUB2 } from './s03-belt.js';

const { W, H } = L;
const TAU = Math.PI * 2;
const WID_HEAD = 0.086;   // env.js WID.head (the pictogram head-disc radius)

export default {
  beat: 4,
  chapter: null,
  captions: true,
  overlayIn: false,
  layer: 6,
  cues(d) { return [{ t: 1.0, name: 'deep', gain: 0.2, pitch: 0.8 }, { t: 2.05, name: 'whoosh', gain: 0.16, pitch: 1.2 }, { t: 3.12, name: 'tick', gain: 0.18, pitch: 0.8 }, { t: 4.2, name: 'tick', gain: 0.14, pitch: 1.0 }, { t: d - 0.45, name: 'swish', gain: 0.16, pitch: 1.1 }]; },
  drawOverlay(c, v) {
    const t = Math.max(0, v.t), d = v.d;
    const b = v.tl.scenes[v.index].start, w = (pj, wi) => wordTime(v.tl, 4, pj, wi) - b;
    const tBrace = w(0, 4) - 0.12, tHead = w(1, 0) - 0.05, tSeat = w(1, 4) - 0.1, tFeet = w(1, 7) - 0.2;
    const exTag = L.ease.inCubic(L.prog(t, d - 0.8, 0.22));
    const contentA = 1 - L.smoothstep(L.prog(t, d - 0.6, 0.18));
    const plate = L.ease.inCubic(L.prog(t, d - 0.42, 0.12));   // the opaque plate scales to nothing AFTER its contents
    const dimA = 1 - L.smoothstep(L.prog(t, d - 0.36, 0.3));
    c.save();
    c.globalAlpha = DIM * dimA; c.fillStyle = '#02040a'; c.fillRect(0, 0, W, H);
    c.globalAlpha = 1;
    // STEP 2 (taken over from s03, identical) holds until STEP 3 lands on "brace": the two overlap, no badge-free gap
    const o2 = L.ease.inCubic(L.prog(t, tBrace - 0.3, 0.2)), p2 = 1 - L.ease.inCubic(L.prog(t, tBrace - 0.06, 0.12));
    if (p2 > 0) {
      stepSub(c, SUB2, 1 - L.ease.inCubic(L.prog(t, tBrace - 0.4, 0.16)));
      badgeOut(c, v, 2, 'BELT LOW & TIGHT', 1 - o2, p2);
    }
    // STEP 3 badge: lands on "brace"; its sub on "head down"
    const bIn = L.prog(t, tBrace, 0.75);
    const bOut = 1 - L.ease.inCubic(L.prog(t, d - 0.8, 0.2));
    if (bIn > 0) {
      if (bIn < 1) stepBadge(c, v, 3, 'BRACE', { k: L.ease.outCubic(bIn) });
      else badgeOut(c, v, 3, 'BRACE', bOut, 1 - L.ease.inCubic(L.prog(t, d - 0.62, 0.08)));
    }
    const sk = L.ease.outCubic(L.prog(t, tHead, 0.45)) * (1 - L.ease.inCubic(L.prog(t, d - 0.85, 0.16)));
    if (sk > 0) stepSub(c, 'HEAD DOWN  ·  FEET FLAT', sk);
    if (plate < 1) {
      card(c, 1, 0, Math.max(0.001, 1 - plate), () => {
        if (contentA <= 0) return;
        c.save();
        c.globalAlpha *= contentA;
        const u = L.ease.inOutCubic(L.prog(t, tHead, 0.9));
        const q = mixPose('seat', 'brace', u);
        const feetK = L.smoothstep(L.prog(t, tFeet, 0.3)) * (1 - exTag);
        drawScene(c, q, { figA: 1, seatA: 1, frontA: 1, belt: { u: 1, tight: 1, a: 1, col: NEUTRAL_BELT }, shoes: feetK * 0.85 });
        // motion arc on the head (seat → brace)
        const arcK = L.prog(t, tHead + 0.05, 0.8), arcA = 1 - L.smoothstep(L.prog(t, tHead + 1.4, 0.5));
        if (arcK > 0 && arcA > 0) {
          const pts = [];
          for (let i = 0; i <= 24; i++) { const Jq = joints(mixPose('seat', 'brace', L.ease.inOutCubic(i / 24))); pts.push(fpt(Jq.head.x - 0.0, Jq.head.y - 0.11)); }
          motionArc(c, pts, arcK, FIG_S, arcA);
        }
        // head contact: a short flash on the seat back where the head rests
        const Jb = joints('brace');
        const [hx, hy] = fpt(Jb.head.x - WID_HEAD, Jb.head.y);   // the head / seat-back contact point
        const ck = L.prog(t, tSeat, 0.6);
        if (ck > 0 && ck < 1) {
          c.save();
          c.strokeStyle = L.rgba(CD.yellow, 0.9 * (1 - ck)); c.lineWidth = 3;
          c.beginPath(); c.arc(hx, hy, 10 + 34 * L.ease.outCubic(ck), 0, TAU); c.stroke();
          c.restore();
        }
        const tgk = L.ease.outCubic(L.prog(t, tSeat + 0.15, 0.45)) * (1 - exTag);
        tag(c, 725, CARD.y + 92, 'HEAD ON THE SEAT BACK', tgk, hx, hy);
        const [fx, fy] = fpt((Jb.nA.x + Jb.fA.x) / 2 - 0.03, -0.04);
        const fk = L.ease.outCubic(L.prog(t, tFeet + 0.1, 0.45)) * (1 - exTag);
        tag(c, 540, GY + 38, 'FEET FLAT, BEHIND THE KNEES', fk, fx, fy);
        c.restore();
      });
    }
    c.restore();
    void CARD_BG; void POSE; void H;
  },
};
