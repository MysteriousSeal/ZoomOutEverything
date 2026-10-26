// Beat 5 — "If you fall, get up fast. | If you can't, curl up on your side and cover your head."
// Times (59.00 s timeline: beat 34.83–41.47, d 6.63; phrase 0 +0.15, phrase 1 +2.83). overlayIn false: from its first
// frame this scene draws the very card, dim and boxer pose s04 ended on (s04 holds them to its last frame), so the
// hand-over is invisible; before t = 0 it draws nothing (s04 covers it, no double dim).
//   phrase 0   STEP 5 badge IF YOU FALL, GET UP FAST (+ −0.1; one title for the whole beat). The pictogram falls:
//              boxer → on one knee → face down (+0.3 → +0.85, a small dust tick where it lands), holds, then gets straight
//              back up: prone → rise → stand (+1.15 → +2.3) with a dashed yellow arc + arrowhead tracing the head.
//              Lying poses scale up to ≈ 780 px (fit to the card width) and the card's top edge drops 300 px while the
//              figure is low, so the low poses fill the card.
//   phrase 1   sub CURL UP · COVER YOUR HEAD (+0.05). stand → crouch → curl (+0.2 → +1.6: side-lying fetal, back rounded,
//              knees drawn up, both forearms wrapped over the head); on "cover your head" (+2.55) a yellow dashed ring
//              locks onto the head (pulses once). Holds ≥ 1 s.
//   exit       staged so nothing floats over the map: figure + ring fade d−0.64…d−0.48, the badge plate un-wipes
//              (d−0.62, 0.2 s) with its tile leaving right behind it (d−0.5, 0.12 s), the card plate goes in 0.12 s
//              (d−0.47), the dim last (d−0.38 → d−0.06).
import * as L from '../../../../engine/runtime/lib.js';
import { stepBadge, badgeSub, CD, pathPose, joints, poseBox, drawPicto, picLayer, motionArc, mixPose, rollJ } from '../env.js';
import { CARD, DIM, GROUND_Y, card, badgeOut } from './s04-arms.js';

const { W, H } = L;
const TAU = Math.PI * 2;
const ph = (v, j) => v.tl.lines[v.index].phrases[j].start - v.tl.scenes[v.index].start;
const FIG_X = CARD.x + CARD.w / 2 - 70;      // same ground point as s04
const FALL = ['boxer', 'rise', 'prone'], UP = ['prone', 'rise', 'stand'];
/** how low the pose is (0 standing … 1 lying), from its drawn height */
const lowK = (q) => { const b = poseBox(q); return L.smoothstep(L.invLerp(0.95, 0.42, -b.y0)); };
/** figure size: s04's 540 standing; lying poses scale up to ≈ 780 px (capped so they fit the card's width) */
const sizeFor = (q) => { const b = poseBox(q); return L.lerp(540, Math.min(780, 700 / (b.x1 - b.x0)), lowK(q)); };
// standing poses stand exactly where s04's do (ground point FIG_X); lying poses centre their box on the card
const xFor = (q) => { const b = poseBox(q), s = sizeFor(q); return L.lerp(FIG_X, CARD.x + CARD.w / 2 - ((b.x0 + b.x1) / 2) * s, lowK(q)); };
/** the card's top edge drops while the figure lies down (the card hugs the low pose: no empty top half) */
const CARD_DROP = 300;

export default {
  beat: 5,
  chapter: null,
  captions: true,
  overlayIn: false,
  layer: 5,
  cues(d) {
    return [
      { t: 0.75, name: 'impact', gain: 0.2, pitch: 1.4 },
      { t: 1.3, name: 'whoosh', gain: 0.2, pitch: 1.2 },
      { t: 3.1, name: 'swish', gain: 0.18, pitch: 0.9 },
      { t: 4.85, name: 'tick', gain: 0.2, pitch: 1.1 },
      { t: d - 0.6, name: 'swish', gain: 0.16, pitch: 0.8 },
    ];
  },
  drawOverlay(c, v) {
    const t = v.t, d = v.d, p0 = ph(v, 0), p1 = ph(v, 1);
    if (t < 0) return;
    // exit, staged so nothing floats over the map: figure + ring fade first, then the plate goes fast (0.12 s), the dim last
    const figOut = 1 - L.smoothstep(L.prog(t, d - 0.64, 0.16));
    const plate = 1 - L.prog(t, d - 0.47, 0.12);
    const dimK = 1 - L.ease.inOutCubic(L.prog(t, d - 0.38, 0.32));
    c.save();
    c.globalAlpha = DIM * dimK; c.fillStyle = '#02040a'; c.fillRect(0, 0, W, H);
    c.globalAlpha = 1;
    // ---- badge: one STEP 5 title for the whole beat; phrase 1 lives in the sub line
    const bIn = L.prog(t, p0 - 0.1, 0.75);
    if (bIn > 0 && bIn < 1) stepBadge(c, v, 5, 'IF YOU FALL, GET UP FAST', { k: L.ease.outCubic(bIn) });
    else if (bIn >= 1) badgeOut(c, v, 5, 'IF YOU FALL, GET UP FAST', 1 - L.ease.inCubic(L.prog(t, d - 0.62, 0.2)), 1 - L.ease.inCubic(L.prog(t, d - 0.5, 0.12)));
    badgeSub(c, 'CURL UP · COVER YOUR HEAD', L.ease.outCubic(L.prog(t, p1 + 0.05, 0.45)) * (1 - L.ease.inCubic(L.prog(t, d - 0.64, 0.2))));
    // ---- the pose
    let q, trail = null;
    if (t < p1 + 0.2) {
      if (t < 1.15) q = pathPose(FALL, L.ease.inOutCubic(L.prog(t, 0.3, 0.55)));
      else {
        const u = L.ease.inOutCubic(L.prog(t, 1.15, 1.15));
        q = pathPose(UP, u);
        trail = { u, a: 0.85 * (1 - L.smoothstep(L.prog(t, 2.5, 0.5))) };
      }
    } else {
      // stand → crouch (IK), then a short smooth roll down onto the side: crouch's joints blend into the hand-built curl
      const a = L.prog(t, p1 + 0.2, 0.6), b = L.prog(t, p1 + 0.7, 1.1);
      q = b <= 0 ? mixPose('stand', 'crouch', L.ease.inOutCubic(a)) : rollJ(b);
    }
    const s = sizeFor(q), gx = xFor(q), gy = GROUND_Y, lk = lowK(q);
    // ---- the card (its top drops while the figure is low)
    card(c, plate, 0, 1, () => {
      // landing dust: short ticks either side of the impact point
      const dk = L.prog(t, 0.8, 0.4);
      if (dk > 0 && dk < 1) {
        const b = poseBox('prone');
        c.save();
        c.globalAlpha *= Math.sin(dk * Math.PI) * 0.8;
        c.strokeStyle = L.rgba(CD.yellow); c.lineWidth = 4; c.lineCap = 'round';
        for (const [sx, a] of [[-1, -2.6], [-1, -2.2], [1, -0.55], [1, -0.95]]) {
          const r0 = 30 + 40 * dk, r1 = r0 + 22;
          const cx = sx < 0 ? gx + b.x0 * s + 20 : gx + b.x1 * s - 20;
          c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, gy - 6 + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * r1, gy - 6 + Math.sin(a) * r1); c.stroke();
        }
        c.restore();
      }
      picLayer(c, figOut, (g) => drawPicto(g, gx, gy, s, q));
      // getting-up arc (head path prone → stand)
      if (trail && trail.a > 0) {
        const pts = [];
        for (let i = 0; i <= 30; i++) {
          const qq = pathPose(UP, 0.04 + 0.92 * (i / 30)), jj = joints(qq), ss = sizeFor(qq), xx = xFor(qq);
          pts.push([xx + (jj.ox + jj.head.x) * ss - 0.04 * ss, gy + jj.head.y * ss - 0.15 * ss]);
        }
        motionArc(c, pts, trail.u, 560, trail.a);
      }
      // head-protection ring (curl), on "cover your head"
      const rk = L.ease.outBack(L.prog(t, p1 + 2.55, 0.45), 1.6);
      if (rk > 0 && figOut > 0) {
        const J = joints(q), hx = gx + (J.ox + J.head.x) * s, hy = gy + J.head.y * s;   // centred on the head
        const pulse = 1 + 0.12 * Math.sin(Math.PI * L.prog(t, p1 + 2.75, 0.6));
        const r = 0.145 * s * rk * pulse;
        c.save();
        c.globalAlpha *= figOut;
        c.strokeStyle = L.rgba(CD.yellow, 0.95); c.lineWidth = 5; c.setLineDash([16, 11]);
        c.lineDashOffset = -t * 14;
        c.beginPath(); c.arc(hx, hy, Math.max(0, r), 0, TAU); c.stroke();
        c.restore();
      }
    }, Math.max(0, Math.min(CARD_DROP * lk, gy + poseBox(q).y0 * s - CARD.y - 48)));   // never drop the card top into the figure
    c.restore();
  },
};
