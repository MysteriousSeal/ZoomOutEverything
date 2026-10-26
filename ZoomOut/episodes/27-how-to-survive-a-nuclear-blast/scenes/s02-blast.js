// Beat 2 — "Seconds later, the blast wave hits. | Stay down until it passes. | Then stay away from windows: flying glass kills."
// Times (current 60.06 s timeline, beat 15.18–24.73). env draws the pressure dome + dust sheet (T.blast0 ≈ 16.53), the
// impact on the building (T.impact ≈ 17.48: shake, facade glass shatters, shards fall), lights going out.
//   15.38     a calm chip in the slot: stopwatch + FLASH +6 S, counting whole seconds since the flash, out at impact.
//   phrase 0  a small BLAST WAVE tag (drawn arrow + tracked label) rides the dome's leading shoulder (30° up the
//             shell, outward-pointing arrow), T.blast0 → T.impact + 0.74 (≈ 16.55–18.22, gone before the STAY DOWN card).
//   phrase 1 (18.16) STEP 2 badge STAY DOWN (same place as STEP 1: env stepBadge y 372) + sub UNTIL IT PASSES; the
//             safety card from s01 returns with the face-down pictogram while wind streaks + dust sweep over it right →
//             left, then calm (the front has passed). Leaves just before the windows push (≈ 20.3).
//   phrase 2 (20.68, camera 'windows' close-up) a HAZARD badge in the same slot: red tile with a shattered-pane icon +
//             AWAY FROM WINDOWS, sub FLYING GLASS KILLS (red); red corner brackets lock onto the shattered window
//             (world x 4.1–5.7, y −9.2…−7.4) with two one-off glints on its jagged glass. Holds to the beat end.
import * as L from '../../../../engine/runtime/lib.js';
import { stepBadge, stepSub, drawFigure, BADGE, ACCENT, DANGER, CD, timesFor, fireScreen, frontScreenX, sparkle, TEXT } from '../env.js';
import { at as camAt } from '../camera.js';
import { CARD, safetyCard } from './s01-flash.js';

const { W } = L;
const ph = (v, j) => v.tl.lines[v.index].phrases[j].start - v.tl.scenes[v.index].start;
const WIN = { x0: 4.1, x1: 5.7, y0: -9.2, y1: -7.4 };

// wind streaks for the STAY DOWN card (fixed table: no Math.random)
const STREAKS = (() => {
  const r = L.rng(2702);
  return Array.from({ length: 14 }, () => ({ y: 0.02 + r() * 0.5, len: 0.25 + r() * 0.45, ph: r(), sp: 0.85 + r() * 0.5, w: 1.5 + r() * 2 }));
})();

/** a drawn arrow from (x0,y0) to the tip (x1,y1) */
function arrow(c, x0, y0, x1, y1, w, head, col) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  c.strokeStyle = col; c.fillStyle = col;
  c.lineWidth = w; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1 - Math.cos(a) * head * 0.6, y1 - Math.sin(a) * head * 0.6); c.stroke();
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x1 - Math.cos(a - 0.45) * head, y1 - Math.sin(a - 0.45) * head);
  c.lineTo(x1 - Math.cos(a + 0.45) * head, y1 - Math.sin(a + 0.45) * head);
  c.closePath(); c.fill();
}

/** hazard icon for the slot card's tile (env stepBadge opts.icon): a white window pane with a crack star and two
 *  flying shards. Drawn around the tile centre. */
function hazardIcon(c, h) {
  // WARNING kicker where a STEP tile has "STEP": reads as an intentional hazard type, not a missing number
  c.save();
  c.fillStyle = 'rgb(250,246,240)';
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.font = L.font(15, 700, L.FONT.body);
  L.trackedText(c, 'WARNING', 0, -h / 2 + 24, 2, 'center');
  c.restore();
  c.save();
  c.translate(0, 11);
  c.scale(0.7, 0.7);
  hazardPane(c);
  c.restore();
}
function hazardPane(c) {
  const pw = 54, phh = 64, px = -pw / 2 - 7, py = -phh / 2 + 1;
  c.strokeStyle = 'rgb(250,246,240)'; c.lineWidth = 6; c.lineJoin = 'round';
  L.roundRect(c, px, py, pw, phh, 4); c.stroke();
  const ix = px + pw * 0.62, iy = py + phh * 0.38;
  c.lineWidth = 3.2; c.lineCap = 'round';
  c.beginPath();
  for (const [a, l] of [[-2.6, 20], [-1.4, 17], [-0.2, 15], [0.9, 21], [2.0, 24], [2.9, 18]]) {
    const mx = ix + Math.cos(a) * l * 0.55 + Math.cos(a + 1.3) * 3, my = iy + Math.sin(a) * l * 0.55 + Math.sin(a + 1.3) * 3;
    c.moveTo(ix, iy); c.lineTo(mx, my); c.lineTo(ix + Math.cos(a) * l, iy + Math.sin(a) * l);
  }
  c.stroke();
  c.fillStyle = 'rgb(250,246,240)';
  for (const [sx, sy, s, r] of [[px + pw + 13, py + 16, 11, 0.4], [px + pw + 21, py + 38, 8, -0.6]]) {
    c.save(); c.translate(sx, sy); c.rotate(r);
    c.beginPath(); c.moveTo(-s * 0.6, s * 0.4); c.lineTo(s * 0.7, 0); c.lineTo(-s * 0.1, -s * 0.6); c.closePath(); c.fill();
    c.restore();
  }
}

/** corner brackets around a screen rect, drawn in from the corners (k 0..1) */
function brackets(c, x0, y0, x1, y1, k, col, lw = 5) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  const pad = 22 + 28 * (1 - e), arm = Math.min(x1 - x0, y1 - y0) * 0.32 * e;
  const X0 = x0 - pad, Y0 = y0 - pad, X1 = x1 + pad, Y1 = y1 + pad;
  c.save();
  c.globalAlpha *= L.clamp(k * 2);
  c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 10;
  c.beginPath();
  c.moveTo(X0, Y0 + arm); c.lineTo(X0, Y0); c.lineTo(X0 + arm, Y0);
  c.moveTo(X1 - arm, Y0); c.lineTo(X1, Y0); c.lineTo(X1, Y0 + arm);
  c.moveTo(X1, Y1 - arm); c.lineTo(X1, Y1); c.lineTo(X1 - arm, Y1);
  c.moveTo(X0 + arm, Y1); c.lineTo(X0, Y1); c.lineTo(X0, Y1 - arm);
  c.stroke();
  c.restore();
}

export default {
  beat: 2,
  chapter: null,
  captions: true,
  layer: 5,
  cues(d) {
    return [];
  },
  drawOverlay(c, v) {
    const T = timesFor(v.tl), s0 = v.tl.scenes[v.index].start;
    const p1 = ph(v, 1), p2 = ph(v, 2);
    c.save();
    c.globalAlpha = v.k;

    // ---- phrase 0 lead-in: a calm "since the flash" card in the slot (a ticking watch, no number: the delay depends on
    //      the distance), so the seconds between the flash and the blast read on screen; it clears at the impact
    const sinceK = L.ease.outCubic(L.prog(v.t, 0.12, 0.45)) * (1 - L.smoothstep(L.prog(v.gt, T.impact + 0.05, 0.25)));
    if (sinceK > 0) {
      const q = Math.round(v.gt * 30) / 30;
      const X = BADGE.x, Y = BADGE.y + (1 - sinceK) * -10, Hh = 104;
      c.save();
      c.globalAlpha *= sinceK;
      c.font = L.font(34, 800, L.FONT.display);
      c.letterSpacing = '2px';
      const w1 = c.measureText('SINCE THE FLASH').width;
      c.font = L.font(21, 700, L.FONT.body);
      c.letterSpacing = '3px';
      const w2 = c.measureText('DELAY DEPENDS ON DISTANCE').width;
      c.letterSpacing = '0px';
      const Wc = 120 + Math.max(w1, w2) + 30;
      c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 18; c.shadowOffsetY = 4;
      c.fillStyle = L.rgba(CD.black, 0.94);
      L.roundRect(c, X, Y, Wc, Hh, 12); c.fill();
      c.shadowColor = 'transparent';
      c.fillStyle = L.rgba(ACCENT); c.fillRect(X, Y + 14, 5, Hh - 28);
      // watch: case, crown, 12 ticks, a sweeping hand (frame-stable)
      const wx = X + 62, wy = Y + Hh / 2 + 4, wr = 30;
      c.strokeStyle = L.rgba(ACCENT); c.fillStyle = L.rgba(ACCENT); c.lineCap = 'round';
      c.lineWidth = 4; c.beginPath(); c.arc(wx, wy, wr, 0, Math.PI * 2); c.stroke();
      c.fillRect(wx - 6, wy - wr - 11, 12, 7); c.fillRect(wx - 2, wy - wr - 5, 4, 5);
      c.lineWidth = 2;
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.beginPath(); c.moveTo(wx + Math.cos(a) * (wr - 8), wy + Math.sin(a) * (wr - 8)); c.lineTo(wx + Math.cos(a) * (wr - 4), wy + Math.sin(a) * (wr - 4)); c.stroke(); }
      const ha = -Math.PI / 2 + Math.floor((q % 1) * 8) / 8 * Math.PI * 2 + Math.floor(q) * Math.PI / 4;
      c.lineWidth = 4; c.beginPath(); c.moveTo(wx, wy); c.lineTo(wx + Math.cos(ha) * (wr - 10), wy + Math.sin(ha) * (wr - 10)); c.stroke();
      c.beginPath(); c.arc(wx, wy, 4, 0, Math.PI * 2); c.fill();
      c.textBaseline = 'alphabetic'; c.textAlign = 'left';
      c.font = L.font(34, 800, L.FONT.display);
      c.fillStyle = L.rgba(TEXT);
      L.trackedText(c, 'SINCE THE FLASH', X + 120, Y + 52, 2);
      c.font = L.font(21, 700, L.FONT.body);
      c.fillStyle = L.rgba(L.mix(ACCENT, [255, 255, 255], 0.25), 0.95);
      L.trackedText(c, 'DELAY DEPENDS ON DISTANCE', X + 120, Y + 84, 3);
      c.restore();
    }

    // ---- phrase 0: BLAST WAVE tag riding the dome's shoulder
    // positions from the frame's own time (every motion-blur sub-frame draws it in the same place: sharp text)
    const gq = Math.round(v.gt * 30) / 30, cq = camAt(gq, v.tl);
    const vq = { ...v, gt: gq, cam: cq, wy: (y) => L.H * (cq.anchor ?? 0.47) + (y - cq.y) / cq.mpp };
    const tagK = L.ease.outCubic(L.prog(gq, T.blast0 + 0.02, 0.3)) * (1 - L.smoothstep(L.prog(gq, T.impact + 0.12, 0.25)));
    const ex = frontScreenX(vq, 1);
    if (tagK > 0 && ex != null) {
      const fs = fireScreen(vq), gy = vq.wy(0);
      // ride the shell at least 30° up, and never below y ≈ 1290 (the caption band)
      const R = Math.max(0, fs.x - ex), a = R > 1 ? Math.asin(L.clamp((gy - 1290) / R, 0.5, 1)) : Math.PI / 2;
      const dx = -Math.cos(a), dy = -Math.sin(a);
      const tx = fs.x + dx * (R + 16), ty = gy + dy * (R + 16);
      c.save();
      c.globalAlpha *= tagK;
      c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 10;
      arrow(c, tx - dx * 74, ty - dy * 74, tx, ty, 4, 18, 'rgba(255,240,220,0.95)');
      c.font = L.font(28, 800, L.FONT.body);
      c.textBaseline = 'alphabetic';
      c.letterSpacing = '4px';
      const lw = c.measureText('BLAST WAVE').width - 4;
      c.letterSpacing = '0px';
      const lx = Math.round(Math.min(tx - dx * 74 + 14, 940 - lw - 14)), ly = Math.round(Math.min(ty - dy * 74 + 38, 1340));
      c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 12;
      c.fillStyle = 'rgba(8,8,12,0.93)';
      L.roundRect(c, lx - 14, ly - 31, lw + 28, 44, 9); c.fill();
      c.shadowColor = 'transparent';
      c.fillStyle = L.rgba(ACCENT); c.fillRect(lx - 14, ly - 21, 4, 24);
      c.fillStyle = 'rgba(255,240,220,0.97)';
      L.trackedText(c, 'BLAST WAVE', lx, ly, 4);
      c.restore();
    }

    // ---- phrase 1: STEP 2 STAY DOWN + the card (prone figure, wind passing over)
    const out1 = L.smoothstep(L.prog(v.t, p2 - 0.4, 0.24));   // ≈ 0.24 s exit with a slight upward drift
    const kIn = L.prog(v.t, p1 - 0.1, 0.75);
    if (kIn > 0 && out1 < 1) {
      c.save();
      c.globalAlpha *= 1 - out1;
      c.translate(0, -14 * out1);
      stepBadge(c, v, 2, 'STAY DOWN', { k: L.ease.outCubic(kIn) });
      stepSub(c, 'UNTIL IT PASSES', L.ease.outCubic(L.prog(v.t, p1 + 0.3, 0.45)));
      const ck = L.ease.outCubic(L.prog(v.t, p1 + 0.1, 0.5));
      safetyCard(c, ck, () => {
        const cx = CARD.x + CARD.w / 2, gy = CARD.y + CARD.h - 50, s = 318;
        // wind: ramps in, holds while the front passes, then dies away
        const wk = L.smoothstep(L.prog(v.t, p1 + 0.1, 0.3)) * (1 - L.smoothstep(L.prog(v.t, p1 + 1.3, 0.7)));
        // a faint dust veil hugging the ground during the gust
        if (wk > 0) {
          const g = c.createLinearGradient(0, gy - 0.55 * s, 0, gy);
          g.addColorStop(0, 'rgba(190,160,130,0)');
          g.addColorStop(1, `rgba(190,160,130,${0.22 * wk})`);
          c.fillStyle = g;
          c.fillRect(CARD.x, gy - 0.55 * s, CARD.w, 0.55 * s);
        }
        drawFigure(c, cx, gy, s, 1, {});
        if (wk > 0) {
          c.save();
          c.lineCap = 'round';
          for (const q of STREAKS) {
            const span = CARD.w + q.len * s;
            const u = ((v.t * q.sp * 1.6 + q.ph) % 1);
            const x1 = CARD.x + CARD.w + 20 - u * (span + 40), x0 = x1 + q.len * s * 0.6;
            const y = gy - q.y * s - 0.09 * s;
            const g = c.createLinearGradient(x1, 0, x0, 0);
            g.addColorStop(0, `rgba(255,236,214,${0.75 * wk})`);
            g.addColorStop(1, 'rgba(255,236,214,0)');
            c.strokeStyle = g; c.lineWidth = q.w;
            c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
          }
          // direction chevron (drawn) in the card's top-right
          c.globalAlpha *= wk;
          arrow(c, CARD.x + CARD.w - 40, CARD.y + 48, CARD.x + CARD.w - 120, CARD.y + 48, 4, 16, L.rgba(CD.yellow, 0.9));
          c.restore();
        }
      });
      c.restore();
    }

    // ---- phrase 2: AWAY FROM WINDOWS (hazard badge in the STEP slot) + brackets on the shattered window
    const k3 = L.prog(v.t, p2 + 0.15, 0.75);
    if (k3 > 0) {
      const ke = L.ease.outCubic(k3);
      stepBadge(c, v, null, 'AWAY FROM WINDOWS', {
        k: ke, accent: DANGER, icon: hazardIcon,
        sub: 'FLYING GLASS KILLS', subK: L.ease.outCubic(L.prog(v.t, p2 + 1.2, 0.45)), subCol: [255, 160, 146],
      });
      const bx0 = v.wx(WIN.x0), bx1 = v.wx(WIN.x1), by0 = v.wy(WIN.y0), by1 = v.wy(WIN.y1);
      const bk = L.prog(v.t, p2 + 0.75, 0.5);
      brackets(c, bx0, by0, bx1, by1, bk, L.rgba(DANGER));
      // two one-off glints on the jagged glass left in the frame
      for (const [fx, fy, dt] of [[0.86, 0.12, 1.1], [0.1, 0.78, 1.45]]) {
        const gk = L.prog(v.t, p2 + dt, 0.5), a = Math.sin(Math.PI * gk);
        if (a > 0.01) sparkle(c, L.lerp(bx0, bx1, fx), L.lerp(by0, by1, fy), 26, a * 0.9);
      }
    }
    c.restore();
  },
};
