// Beat 12 — "And all of written history? | Thinner than a human hair."
// The camera dives the last decade to 0.3 mm of track. Lying on one rubber grain just before the finish line: a
// single human hair, 0.07 mm (world space: a translucent brown-black cylinder with shading across its width, a
// primary white specular streak, a warmer secondary one, cuticle scale edges, a soft contact shadow). Between the
// hair and the white finish paint: written history, a glowing accent sliver 0.038 mm wide ending exactly at the
// finish edge (now). It wipes in from the edge as the camera lands; its tag reads "WRITTEN HISTORY / 0.04 mm".
// On "Thinner than a human hair" (59.24) the hair's bracket + tag "0.07 mm / A HUMAN HAIR" land under it and the
// sliver pulses. Both stay through the question beat (world layer) and the preroll replays this moment.
import * as L from '../../../../engine/runtime/lib.js';
import { TRACK_AT, HAIR_M, YR_PER_M, CAM_W } from '../camera.js';
import { mx, ACCENT, hBracket } from '../env.js';

const GAP = 0.000012;                                 // m between the hair's right edge and the sliver
const HAIR = { u: TRACK_AT.writing + GAP + HAIR_M / 2, w: CAM_W, tilt: 0.022 };   // centre (m before the finish), lane coord, rad
const TIER = { sliver: 1004, hair: 1062 };            // bracket rows (screen y): sliver above, hair below

function times(v) {
  const s0 = v.tl.scenes[12].start, ph = v.tl.lines[12].phrases ?? [v.tl.lines[12]];
  return { s0, p1: ph[0].start, p2: ph[Math.min(1, ph.length - 1)].start };
}

// ------------------------------------------------------------------ the hair (world space)
function drawHair(c, v, alpha) {
  if (alpha <= 0) return;
  const s = YR_PER_M / v.cam.mpp;                     // px per metre
  const r = (HAIR_M / 2) * s;                          // radius, px
  const cx = mx(v, HAIR.u), cy = v.wy(HAIR.w * YR_PER_M);
  if (cx + r + 40 < 0 || cx - r - 40 > L.W) return;
  c.save();
  c.globalAlpha *= alpha;
  c.translate(cx, cy);
  c.rotate(HAIR.tilt);
  const Ln = 1500;                                     // half length on screen (covers the frame)
  if (r < 1.2) {                                       // sub-pixel: a faint dark thread
    c.fillStyle = `rgba(24,14,10,${0.35 + 0.5 * L.clamp(r / 1.2)})`;
    c.fillRect(-Math.max(0.5, r), -Ln, Math.max(1, 2 * r), 2 * Ln);
    c.restore();
    return;
  }
  // contact shadow on the rubber (light from the top left → falls right)
  c.save();
  c.filter = `blur(${Math.max(1, r * 0.35).toFixed(1)}px)`;
  c.fillStyle = 'rgba(12,3,2,0.55)';
  c.fillRect(-r * 0.55 + r * 0.42, -Ln, r * 2.1, 2 * Ln);
  c.restore();
  // body: a cylinder seen side-on: translucent rims, denser core, warm brown where light passes through
  const g = c.createLinearGradient(-r, 0, r, 0);
  g.addColorStop(0.0, 'rgba(36,22,15,0.55)');
  g.addColorStop(0.07, 'rgba(58,36,24,0.9)');
  g.addColorStop(0.3, 'rgb(74,48,32)');
  g.addColorStop(0.55, 'rgb(52,33,22)');
  g.addColorStop(0.85, 'rgb(30,19,13)');
  g.addColorStop(1.0, 'rgba(18,11,8,0.7)');
  c.fillStyle = g;
  c.fillRect(-r, -Ln, 2 * r, 2 * Ln);
  c.save();
  c.beginPath(); c.rect(-r, -Ln, 2 * r, 2 * Ln); c.clip();
  // cuticle: overlapping scale edges, a few µm apart, each a slightly irregular arc convex toward the tip (up),
  // with a fine bright lip and a soft shadow under it
  const pitch = 6.5e-6 * s;                            // px between scale edges
  if (pitch > 5) {
    // irregular scale margins: uneven spacing, each a wavy partial arc (scales overlap like roof tiles, edges break)
    const y0 = Math.floor((-Ln) / pitch) - 1, y1 = Math.ceil(Ln / pitch) + 1;
    for (let i = y0; i <= y1; i++) {
      const h = (k) => { const x = Math.sin(i * 91.7 + k * 13.3) * 43758.5453; return x - Math.floor(x); };
      const y = i * pitch + (h(1) - 0.5) * pitch * 0.9;
      const xa = -r * (1.05 - 0.5 * h(6) * h(6)), xb = r * (1.05 - 0.6 * h(7) * h(7));
      const n = 7, pts = [];
      for (let q = 0; q <= n; q++) {
        const f = q / n, x = L.lerp(xa, xb, f);
        const bowY = pitch * (0.5 + 0.4 * h(2)) * (1 - Math.pow((x / r), 2));   // convex toward the tip (up)
        pts.push([x, y - bowY + (h(10 + q) - 0.5) * pitch * 0.35 + (h(3) - 0.5) * pitch * 0.8 * (x / r)]);
      }
      const path = (dy) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1] + dy); for (let q = 1; q < pts.length; q++) { const m = [(pts[q - 1][0] + pts[q][0]) / 2, (pts[q - 1][1] + pts[q][1]) / 2]; c.quadraticCurveTo(pts[q - 1][0], pts[q - 1][1] + dy, m[0], m[1] + dy); } c.lineTo(pts[n][0], pts[n][1] + dy); };
      path(0);
      c.strokeStyle = `rgba(16,9,6,${0.12 + 0.16 * h(4)})`; c.lineWidth = Math.max(1, pitch * 0.09); c.stroke();
      path(-Math.max(1, pitch * 0.09));
      c.strokeStyle = `rgba(255,222,190,${0.04 + 0.07 * h(5)})`; c.lineWidth = Math.max(0.8, pitch * 0.05); c.stroke();
    }
  }
  // speculars: primary (white, narrow, lit side) and secondary (warm, broader, shifted)
  const spec = (xc, w, col, a) => {
    const sg = c.createLinearGradient(xc - w, 0, xc + w, 0);
    sg.addColorStop(0, `rgba(${col},0)`); sg.addColorStop(0.5, `rgba(${col},${a})`); sg.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = sg; c.fillRect(xc - w, -Ln, 2 * w, 2 * Ln);
  };
  c.globalCompositeOperation = 'lighter';
  spec(-r * 0.36, r * 0.16, '255,246,236', 0.34);
  spec(r * 0.2, r * 0.3, '190,120,70', 0.16);
  c.globalCompositeOperation = 'source-over';
  c.restore();
  // edges: a hairline of rim light on the lit side, a dark line on the shade side
  c.fillStyle = 'rgba(255,236,220,0.22)'; c.fillRect(-r, -Ln, Math.max(1, r * 0.02), 2 * Ln);
  c.fillStyle = 'rgba(8,4,3,0.45)'; c.fillRect(r - Math.max(1, r * 0.025), -Ln, Math.max(1, r * 0.025), 2 * Ln);
  c.restore();
}

/** screen x range of the hair at screen row y (it is tilted slightly) */
function hairSpan(v, y) {
  const s = YR_PER_M / v.cam.mpp, r = (HAIR_M / 2) * s, cx = mx(v, HAIR.u), cy = v.wy(HAIR.w * YR_PER_M);
  const xc = cx - Math.tan(HAIR.tilt) * (y - cy);
  return [xc - r / Math.cos(HAIR.tilt), xc + r / Math.cos(HAIR.tilt)];
}

// ------------------------------------------------------------------ the written-history sliver (world space)
function drawSliver(c, v, k, pulse) {
  if (k <= 0) return;
  const x1 = mx(v, 0), wFull = mx(v, 0) - mx(v, TRACK_AT.writing), x0 = x1 - wFull * L.ease.inOutCubic(L.clamp(k));
  if (x1 < -20 || x0 > L.W + 20) return;
  const w = x1 - x0, H = L.H;
  c.save();
  // tint: the rubber under it glows in the accent colour
  c.fillStyle = L.rgba([40, 150, 185], 0.62 + 0.1 * pulse);
  c.fillRect(x0, 0, w, H);
  c.globalCompositeOperation = 'lighter';
  const g = c.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, L.rgba(ACCENT, 0.55 + 0.3 * pulse));
  g.addColorStop(0.18, L.rgba(ACCENT, 0.2 + 0.15 * pulse));
  g.addColorStop(0.6, L.rgba(ACCENT, 0.12 + 0.12 * pulse));
  g.addColorStop(1, L.rgba(ACCENT, 0.4 + 0.25 * pulse));
  c.fillStyle = g;
  c.fillRect(x0, 0, w, H);
  // a slow light sweep travelling down the band
  const sy = ((v.gt * 260) % (H + 600)) - 300;
  const sw = c.createLinearGradient(0, sy - 260, 0, sy + 260);
  sw.addColorStop(0, 'rgba(200,240,250,0)'); sw.addColorStop(0.5, 'rgba(200,240,250,0.10)'); sw.addColorStop(1, 'rgba(200,240,250,0)');
  c.fillStyle = sw;
  c.fillRect(x0, sy - 260, w, 520);
  // outer glow just outside the leading edge
  const og = c.createLinearGradient(x0 - 46, 0, x0, 0);
  og.addColorStop(0, L.rgba(ACCENT, 0)); og.addColorStop(1, L.rgba(ACCENT, 0.3 + 0.25 * pulse));
  c.fillStyle = og;
  c.fillRect(x0 - 46, 0, 46, H);
  c.globalCompositeOperation = 'source-over';
  // crisp edges
  c.fillStyle = L.rgba([200, 244, 252], 0.95);
  c.fillRect(x0 - 1, 0, 2.5, H);
  c.fillStyle = L.rgba(ACCENT, 0.9);
  c.fillRect(x1 - 1.5, 0, 2, H);
  c.restore();
}

// ------------------------------------------------------------------ a measured tag (screen space)
/** plate with a small caps line + a big number, centred on cx; side 'above' = plate bottom at yEdge, 'below' = top */
export function tag(c, cx, yEdge, side, small, big, color, k) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  c.globalAlpha *= L.clamp(k * 1.6);
  const ss = L.fitSize(c, small, 300, 22, 700, L.FONT.body, 14);
  c.font = L.font(ss, 700, L.FONT.body); c.letterSpacing = '3px';
  const sw = c.measureText(small).width - 3; c.letterSpacing = '0px';
  const bs = L.fitSize(c, big, 300, 62, 800, L.FONT.display, 30);
  c.font = L.font(bs, 800, L.FONT.display);
  const bw = c.measureText(big).width;
  const pw = Math.max(sw, bw) + 44, ph = 22 + ss + 12 + bs * 0.74 + 22;
  const x = L.clamp(cx - pw / 2, 64, 940 - pw);
  const y = side === 'above' ? yEdge - ph - 10 + (1 - e) * 14 : yEdge + 10 - (1 - e) * 14;
  c.fillStyle = 'rgba(5,9,16,0.84)';
  L.roundRect(c, x, y, pw, ph, 14); c.fill();
  c.strokeStyle = L.rgba(color, 0.35); c.lineWidth = 1.5; c.stroke();
  c.textBaseline = 'alphabetic';
  const mid = x + pw / 2;
  if (side === 'above') {   // small caps on top, the number next to the bracket
    c.font = L.font(ss, 700, L.FONT.body); c.fillStyle = 'rgba(214,224,232,0.95)';
    L.trackedText(c, small, mid, y + 22 + ss * 0.8, 3, 'center');
    c.font = L.font(bs, 800, L.FONT.display); c.fillStyle = L.rgba(color);
    L.trackedText(c, big, mid, y + ph - 22, 0, 'center');
  } else {                  // the number next to the bracket, small caps under it
    c.font = L.font(bs, 800, L.FONT.display); c.fillStyle = L.rgba(color);
    L.trackedText(c, big, mid, y + 22 + bs * 0.74, 0, 'center');
    c.font = L.font(ss, 700, L.FONT.body); c.fillStyle = 'rgba(214,224,232,0.95)';
    L.trackedText(c, small, mid, y + ph - 22, 3, 'center');
  }
  c.restore();
}

export default {
  beat: 12,
  chapter: { num: '12', title: 'Written history', sub: 'about 5,200 years' },
  layer: 12,
  cues(d) {
    // beat starts 57.18: sliver wipes ~0.95 s in, tag ~1.35 s; the payoff "Thinner than a human hair" at ~2.07 s
    return [
      { t: 0.95, name: 'shimmer', gain: 0.3, pitch: 1.1 },
      { t: 1.35, name: 'tick', gain: 0.22, pitch: 1.2 },
      { t: 2.03, name: 'bloom', gain: 0.38, pitch: 0.95 },
      { t: 2.07, name: 'impact', gain: 0.32, pitch: 1.1 },
    ];
  },
  drawWorld(ctx, v) {
    const T = times(v), gt = v.gt;
    if (gt < T.s0 - 0.1) return;
    drawHair(ctx, v, L.clamp((gt - T.s0 + 0.1) / 0.5));
    const pulse = Math.exp(-Math.max(0, gt - T.p2 + 0.05) * 2.2) * (gt > T.p2 - 0.05 ? 1 : 0);
    drawSliver(ctx, v, L.prog(gt, T.s0 + 0.9, 0.7), pulse);
  },
  drawOverlay(ctx, v) {
    const T = times(v), gt = v.gt;
    const x1 = mx(v, 0), x0 = mx(v, TRACK_AT.writing);
    // sliver: bracket above, tag over it
    const ks = L.prog(gt, T.s0 + 1.3, 0.55) * v.k;
    if (ks > 0) {
      ctx.save(); ctx.globalAlpha *= v.k;
      hBracket(ctx, x0, x1, TIER.sliver, L.prog(gt, T.s0 + 1.3, 0.5), ACCENT, '', 'above');
      ctx.restore();
      tag(ctx, (x0 + x1) / 2, TIER.sliver - 4, 'above', 'WRITTEN HISTORY', '0.04 mm', ACCENT, ks);
    }
    // hair: bracket below, tag under it, on the payoff
    const kh = L.prog(gt, T.p2 - 0.06, 0.45) * v.k;
    if (kh > 0) {
      const [a, b] = hairSpan(v, TIER.hair);
      ctx.save(); ctx.globalAlpha *= v.k;
      hBracket(ctx, a, b, TIER.hair, L.prog(gt, T.p2 - 0.06, 0.45), [240, 240, 240], '', 'below');
      ctx.restore();
      tag(ctx, (a + b) / 2, TIER.hair + 4, 'below', 'A HUMAN HAIR', '0.07 mm', [240, 240, 240], kh);
    }
  },
};
