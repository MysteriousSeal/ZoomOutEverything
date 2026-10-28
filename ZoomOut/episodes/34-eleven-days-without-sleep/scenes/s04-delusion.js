// Beat 4 — "He even believes he's a famous American football player."
// A thought bubble (cream paper, scalloped) rises from Randy's head (three trailing circles), and inside it a refined
// pictogram American-football player (the same ISO figure system, in ink: helmet with face mask, shoulder pads, the ball
// tucked) runs in place with speed lines; small flash-bulb sparkles pop around him on "famous". Lower zone: a notebook
// card DAY 4 · DELUSION / BELIEVES HE'S A FAMOUS FOOTBALL PLAYER (on "believes") and, on "football", the fact-checked
// detail PAUL LOWE · SAN DIEGO CHARGERS.
import * as L from '../../../../engine/runtime/lib.js';
import { VIOLET, PAPER, PAPER2, INKP, B, BE, Wd, inWorld, win, drawPicto, paperCard, tfont, figureHead, exitK, collapse, joints } from '../env.js';

const TAU = Math.PI * 2;
const BUB = { x: 745, y: 640, rx: 238, ry: 166 };

function bubblePath(c, cx, cy, rx, ry, sc) {
  // a scalloped cloud: overlapping circles around an ellipse, unioned by filling them all
  const n = 14;
  c.beginPath();
  c.ellipse(cx, cy, rx * 0.92 * sc, ry * 0.88 * sc, 0, 0, TAU);
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU;
    const px = cx + Math.cos(a) * rx * 0.86 * sc, py = cy + Math.sin(a) * ry * 0.82 * sc;
    const r = (0.22 + 0.04 * Math.sin(i * 2.7)) * Math.min(rx, ry) * 1.15 * sc;
    c.moveTo(px + r, py); c.arc(px, py, Math.max(0, r), 0, TAU);
  }
}
/** the runner's back edge (screen x, mirrored: he runs right) at screen row yy, for the speed lines */
export function runnerBack(x, y, s, yy) {
  const J = joints('run');
  const hy = y + J.hip.y * s, sy = y + J.sh.y * s, hx = x - J.hip.x * s, sx = x - J.sh.x * s;
  const t = L.clamp((yy - hy) / (sy - hy));
  return L.lerp(hx, sx, t) - 0.065 * s;
}
function player(c, x, y, s, gt) {
  c.save();
  c.translate(x, y);   // (no bob: the rear toe stays planted on the turf)
  c.scale(-1, 1);   // runs to the right
  const J = drawPicto(c, 0, 0, s, 'run', {
    ink: INKP, gap: PAPER, ground: 0, shadow: 0, farMix: 0.35,
    afterTorso: (g, P, J) => {
      // shoulder pads: a broad cap centred ON the shoulder, its long axis across the torso (under the near arm)
      const [sx, sy] = P(J.sh), [hx, hy] = P(J.hip);
      const ang = Math.atan2(sy - hy, sx - hx) + Math.PI / 2;
      g.fillStyle = L.rgba(INKP);
      g.beginPath(); g.ellipse(sx, sy + 0.01 * s, 0.098 * s, 0.062 * s, ang, 0, TAU); g.fill();
    },
  });
  const P = (p) => [p.x * s, p.y * s];
  // helmet: a larger dome over the head, face mask bars in front (facing LEFT in figure space)
  const [hx, hy] = P(J.head);
  c.fillStyle = L.rgba(PAPER);
  c.beginPath(); c.arc(hx, hy, 0.112 * s, 0, TAU); c.fill();
  c.fillStyle = L.rgba(INKP);
  c.beginPath(); c.arc(hx + 0.006 * s, hy - 0.004 * s, 0.1 * s, 0, TAU); c.fill();
  c.strokeStyle = L.rgba(INKP); c.lineWidth = 0.018 * s; c.lineCap = 'round';
  c.beginPath();
  c.moveTo(hx - 0.075 * s, hy - 0.01 * s); c.lineTo(hx - 0.135 * s, hy - 0.005 * s);
  c.moveTo(hx - 0.07 * s, hy + 0.035 * s); c.lineTo(hx - 0.13 * s, hy + 0.04 * s);
  c.moveTo(hx - 0.13 * s, hy - 0.01 * s); c.lineTo(hx - 0.125 * s, hy + 0.05 * s);
  c.stroke();
  // helmet stripe
  c.strokeStyle = L.rgba(VIOLET.map((q) => q * 0.85)); c.lineWidth = 0.02 * s;
  c.beginPath(); c.arc(hx + 0.006 * s, hy - 0.004 * s, 0.07 * s, -2.6, -0.6); c.stroke();
  // the ball, tucked in the near hand
  const [bx, by] = P(J.nH);
  c.save();
  c.translate(bx - 0.02 * s, by - 0.01 * s); c.rotate(-0.5);
  c.fillStyle = 'rgb(126,76,48)';
  c.beginPath(); c.ellipse(0, 0, 0.075 * s, 0.045 * s, 0, 0, TAU); c.fill();
  c.strokeStyle = L.rgba(PAPER); c.lineWidth = 0.008 * s;
  c.beginPath(); c.moveTo(-0.03 * s, -0.012 * s); c.lineTo(0.03 * s, -0.012 * s); c.stroke();
  for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 0.012 * s, -0.022 * s); c.lineTo(i * 0.012 * s, -0.002 * s); c.stroke(); }
  c.restore();
  c.restore();
}
function sparkle(c, x, y, r, a) {
  if (a <= 0) return;
  c.save();
  c.globalAlpha *= a;
  c.fillStyle = L.rgba(VIOLET.map((q) => q * 0.8));
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = i / 8 * TAU - Math.PI / 2, rr = i % 2 ? r * 0.28 : r;
    c.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
  }
  c.closePath(); c.fill();
  c.restore();
}

export default {
  beat: 4,
  chapter: null,
  captions: true,
  layer: 3,
  drawWorld(c, v) {
    const tl = v.tl, gt = v.gt;
    // in right after the street has gone (≈ 0.25 s earlier than the beat); out: contents first, then the bubble and its
    // dots collapse fast, done by BE4 − 0.05 (beat 5's speech bubble starts at B5)
    const ex = exitK(gt, BE(tl, 4, -0.2), 0.3);
    if (gt < B(tl, 4, -0.24) || ex.u >= 1) return;
    const k = 1;
    const head = figureHead(tl, gt);
    inWorld(c, v, (g) => {
      g.save();
      collapse(g, BUB.x - 60, BUB.y + 40, ex.pk);
      // trailing circles from the head, then the bubble (scales up from its lower-left); the third dot keeps a clear gap
      // from the bubble's scallops (no lump)
      const dots = [[head.x + 56, head.y - 40, 10], [head.x + 92, head.y - 78, 15], [head.x + 116, head.y - 100, 17]];
      dots.forEach(([x, y, r], i) => {
        const dk = L.ease.outBack(L.prog(gt, B(tl, 4, -0.23 + i * 0.05), 0.25), 2);
        if (dk <= 0) return;
        g.globalAlpha = k * (1 - ex.pk);
        g.fillStyle = L.rgba(PAPER);
        g.beginPath(); g.arc(x, y, Math.max(0, r * dk), 0, TAU); g.fill();
      });
      const bk = L.ease.outBack(L.prog(gt, B(tl, 4, -0.2), 0.45), 1.4);
      if (bk > 0) {
        g.globalAlpha = k * (1 - ex.pk);
        g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 30; g.shadowOffsetY = 8;
        g.fillStyle = L.rgba(PAPER);
        bubblePath(g, BUB.x, BUB.y, BUB.rx, BUB.ry, bk);
        g.fill('nonzero');
        g.shadowColor = 'transparent';
        // contents arrive with the bubble
        const ck = L.clamp((bk - 0.4) / 0.5);
        if (ck > 0) {
          g.save();
          g.globalAlpha = k * ck * ex.ca * (1 - ex.pk);
          bubblePath(g, BUB.x, BUB.y, BUB.rx, BUB.ry, bk); g.clip();
          // a turf line + yard marks, then the player
          const gy = BUB.y + 112;
          g.fillStyle = L.rgba(INKP, 0.25);
          g.fillRect(BUB.x - 210, gy + 2, 420, 4);
          const off = (gt * 260) % 70;
          for (let x = BUB.x - 220 - off; x < BUB.x + 230; x += 70) g.fillRect(x, gy + 10, 30, 3);
          // speed lines behind him
          // speed lines: each starts ≈ 40 px behind his back at its own height (a small flicker, never further)
          g.strokeStyle = L.rgba(INKP, 0.35); g.lineWidth = 5; g.lineCap = 'round';
          const PX = BUB.x + 10, PS = 228;
          for (const [dy, len] of [[-150, 70], [-118, 100], [-86, 60]]) {
            const x0 = runnerBack(PX, gy, PS, gy + dy) - 40 - ((gt * 300 + dy * 3) % 12);
            g.beginPath(); g.moveTo(x0, gy + dy); g.lineTo(x0 - len, gy + dy); g.stroke();
          }
          player(g, PX, gy, PS, gt);
          g.restore();
          // flash-bulb sparkles on "famous"
          const fs = Wd(tl, 'famous', -0.1);
          [[BUB.x - 150, BUB.y - 95, 20, 0], [BUB.x + 165, BUB.y - 70, 24, 0.12], [BUB.x + 120, BUB.y + 60, 16, 0.24], [BUB.x - 175, BUB.y + 30, 14, 0.3]].forEach(([x, y, r, d]) => {
            const sk = L.prog(gt, fs + d, 0.35);
            const tw = 0.75 + 0.25 * Math.sin(gt * 8 + x);
            sparkle(g, x, y, r * L.ease.outBack(L.clamp(sk), 2.5) * tw, k * L.clamp(sk * 3) * ex.ca);
          });
        }
      }
      g.restore();
    });
  },
  drawOverlay(c, v) {
    const tl = v.tl, gt = v.gt;
    const box = { x: 90, y: 1112, w: 900, h: 236 };
    const k = L.prog(gt, Wd(tl, 'believes', -0.3), 0.45);
    paperCard(c, box, k, (g) => {
      g.textBaseline = 'alphabetic';
      g.font = L.font(22, 700, L.FONT.body);
      g.fillStyle = L.rgba(VIOLET.map((q) => q * 0.6));
      L.trackedText(g, 'DAY 4 · DELUSION', box.x + 92, box.y + 50, 3);
      const t1 = 'BELIEVES HE’S A FAMOUS';
      const t2 = 'FOOTBALL PLAYER';
      const s = Math.min(L.fitSize(g, t1, box.w - 140, 48, 700, '"American Typewriter"', 24), L.fitSize(g, t2, box.w - 140, 48, 700, '"American Typewriter"', 24));
      g.font = tfont(s, 700);
      g.fillStyle = L.rgba(INKP);
      g.fillText(t1, box.x + 92, box.y + 106);
      g.fillText(t2, box.x + 92, box.y + 106 + s * 1.12);
      const dk = L.ease.outCubic(L.prog(gt, Wd(tl, 'football', -0.1), 0.4));
      if (dk > 0) {
        g.globalAlpha *= dk;
        g.font = L.font(22, 700, L.FONT.body);
        g.fillStyle = L.rgba(VIOLET.map((q) => q * 0.6));
        L.trackedText(g, 'PAUL LOWE  ·  SAN DIEGO CHARGERS', box.x + 92 + (1 - dk) * 10, box.y + 210, 3);
      }
    }, { out: exitK(gt, BE(tl, 4, -0.02), 0.3) });
  },
};
