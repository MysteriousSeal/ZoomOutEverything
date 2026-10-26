// Beat 3 — "Then get inside. | Brick or concrete, in the basement or the middle of the building. | Not your car: it barely protects you."
// Camera 'inside' pulls back through the dissolving facade (env cutK) into the section; 'car' slides right on phrase 2.
//   phrase 0  STEP 3 badge GET INSIDE (top-left, y 372; same slot as every STEP badge)
//   phrase 1  sub pill BRICK · CONCRETE (with material swatches) under the badge; the PROTECTION HEAT-MAP sweeps in from
//             the outside in (roof/outer rooms red first → middle → basement green last, env ZONES + heatColor);
//             BASEMENT (≈ "in the basement") then MIDDLE (≈ "the middle of the building") get a drawn-on green outline +
//             an opaque pill label with a check mark.
//   phrase 2  ('car' shot) the labels leave; the parked car gets a red exposure tint, a pulsing red halo and target
//             brackets; an opaque callout card NOT YOUR CAR / BARELY PROTECTS YOU (prohibition icon) with a leader.
// The heat-map fades out at the end of the beat (env keeps the core + basement green: safeK).
import * as L from '../../../../engine/runtime/lib.js';
import { stepBadge, stepSub, ZONES, CAR_ZONE, heatColor, toScreen, RECTS, BLD, FLOOR_Y, DANGER, SAFE, BRICK, CONCRETE, CD, TEXT } from '../env.js';

const ph = (v, j) => v.tl.lines[v.index].phrases[j].start - v.tl.scenes[v.index].start;
const TAU = Math.PI * 2;

// the MIDDLE highlight: the centre rooms of floors 1–3 (the best-protected floors above ground)
const MIDDLE = { x0: -6.5, y0: FLOOR_Y(4) + BLD.slab, x1: 6.5, y1: FLOOR_Y(1) };
const BASE = RECTS.basement;

// material swatches for the BRICK · CONCRETE sub chip (stepSub parts: (c, x, cy) → width; c null = measure only)
const BRICK_SW = [196, 98, 70], CONC_SW = L.mix(CONCRETE, [255, 255, 255], 0.2);
const swatch = (col, brick) => (c, x, cy) => {
  const sw = 20, gap = 12;
  if (!c) return sw + gap;
  const y = cy - sw / 2;
  c.fillStyle = L.rgba(col);
  c.fillRect(x, y, sw, sw);
  c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 1.5;
  c.beginPath();
  if (brick) {
    for (let i = 1; i < 3; i++) { c.moveTo(x, y + (sw * i) / 3); c.lineTo(x + sw, y + (sw * i) / 3); }
    c.moveTo(x + sw / 2, y); c.lineTo(x + sw / 2, y + sw / 3); c.moveTo(x + sw / 3, y + sw / 3); c.lineTo(x + sw / 3, y + (2 * sw) / 3);
  } else { c.moveTo(x + 4, y + sw - 4); c.lineTo(x + sw - 4, y + 4); }
  c.stroke();
  return sw + gap;
};
const sepDot = (c, x, cy) => {
  if (!c) return 30;
  c.fillStyle = 'rgba(214,218,226,0.6)'; c.beginPath(); c.arc(x + 12, cy, 3, 0, TAU); c.fill();
  return 30;
};

/** label times (beat-local s) */
function times(v) {
  const p1 = ph(v, 1), p2 = ph(v, 2);
  return { p1, p2, base: p1 + 1.2, mid: p1 + 2.3, labelsOut: p2 - 0.45, car: p2 + 0.3 };
}

/** rectangle outline drawn on clockwise from the top-left corner (k 0..1) */
function drawOnRect(c, r, k) {
  if (k <= 0) return;
  const per = 2 * (r.w + r.h);
  let len = per * L.clamp(k);
  const pts = [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1], [r.x0, r.y0]];
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && len > 0; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const seg = Math.hypot(bx - ax, by - ay);
    const f = Math.min(1, len / seg);
    c.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f);
    len -= seg;
  }
  c.stroke();
}

/** opaque pill with a check mark + label, centred at (x, y) */
function checkPill(c, x, y, text, k, col = SAFE) {
  if (k <= 0) return;
  const e = L.ease.outBack(L.clamp(k), 1.6);
  c.save();
  c.globalAlpha *= L.clamp(k * 2);
  c.font = L.font(46, 800, L.FONT.display);
  c.letterSpacing = '2px';
  const tw = c.measureText(text).width;
  const h = 70, icon = 40, w = tw + icon + 18 + 2 * 24;
  c.translate(x, y);
  c.scale(0.86 + 0.14 * e, 0.86 + 0.14 * e);
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 20; c.shadowOffsetY = 5;
  c.fillStyle = 'rgba(8,16,12,0.92)';
  L.roundRect(c, -w / 2, -h / 2, w, h, h / 2); c.fill();
  c.shadowColor = 'transparent';
  c.strokeStyle = L.rgba(col, 0.85); c.lineWidth = 2.5;
  L.roundRect(c, -w / 2, -h / 2, w, h, h / 2); c.stroke();
  // check disc
  const ix = -w / 2 + 24 + icon / 2;
  c.fillStyle = L.rgba(col);
  c.beginPath(); c.arc(ix, 0, icon / 2, 0, TAU); c.fill();
  c.strokeStyle = 'rgb(8,16,12)'; c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
  const ck = L.clamp((k - 0.3) / 0.5);
  if (ck > 0) {
    c.beginPath();
    c.moveTo(ix - 9, 1);
    const m = [ix - 3, 8], e2 = [ix + 10, -8];
    if (ck < 0.4) { const f = ck / 0.4; c.lineTo(ix - 9 + (m[0] - ix + 9) * f, 1 + 7 * f); }
    else { c.lineTo(m[0], m[1]); const f = (ck - 0.4) / 0.6; c.lineTo(m[0] + (e2[0] - m[0]) * f, m[1] + (e2[1] - m[1]) * f); }
    c.stroke();
  }
  c.fillStyle = L.rgba(col);
  c.textBaseline = 'middle';
  c.textAlign = 'left';
  c.fillText(text, ix + icon / 2 + 18, 3);
  c.letterSpacing = '0px';
  c.restore();
}

/** a small car silhouette (side view, facing left) centred at (x, y), width w */
function carGlyph(c, x, y, w) {
  const s = w / 44;
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.beginPath();
  c.moveTo(-22, 5); c.lineTo(-22, -2); c.quadraticCurveTo(-21, -5, -15, -5.5); c.lineTo(-9, -6);
  c.quadraticCurveTo(-5, -13, 1, -13); c.lineTo(8, -13); c.quadraticCurveTo(13, -12, 16, -6);
  c.quadraticCurveTo(22, -5.5, 22, -1); c.lineTo(22, 5); c.closePath(); c.fill();
  c.beginPath(); c.arc(-12, 6, 4.4, 0, TAU); c.arc(12, 6, 4.4, 0, TAU); c.fill();
  c.restore();
}

export default {
  beat: 3,
  chapter: null,
  captions: true,
  layer: 5,
  cues(d) { return []; },

  drawWorld(c, v) {
    const tm = times(v);
    // whole heat-map visibility: on with phrase 1, off through the end of the beat (the pull-back into beat 4)
    const out = 1 - L.enter(v.t, v.d - 0.35, 0.7, L.ease.inOutCubic);
    if (v.t < tm.p1 - 0.2 || out <= 0) return;
    c.save();
    // ---- heat-map: zones sweep in from the outside in (exposed first, safest last)
    for (const z of ZONES) {
      const zk = L.ease.outCubic(L.prog(v.t, tm.p1 + 0.05 + z.level * 1.15, 0.6)) * out;
      if (zk <= 0) continue;
      const r = toScreen(v, z), col = heatColor(z.level);
      const g = c.createLinearGradient(0, r.y0, 0, r.y1);
      g.addColorStop(0, L.rgba(col, 0.52 * zk));
      g.addColorStop(1, L.rgba(col, 0.36 * zk));
      c.fillStyle = g;
      c.fillRect(r.x, r.y, r.w, r.h);
    }
    // exposure edge: a red inner glow along the roof and both outer walls (where radiation gets in)
    const ek = L.ease.outCubic(L.prog(v.t, tm.p1 + 0.05, 0.7)) * out;
    if (ek > 0) {
      const b = toScreen(v, RECTS.above), dw = Math.max(8, v.ws(2.2));
      const pulse = 0.85 + 0.15 * Math.sin(v.gt * 3.2);
      const gl = c.createLinearGradient(b.x0, 0, b.x0 + dw, 0);
      gl.addColorStop(0, L.rgba(DANGER, 0.55 * ek * pulse)); gl.addColorStop(1, L.rgba(DANGER, 0));
      c.fillStyle = gl; c.fillRect(b.x0, b.y0, dw, b.h);
      const gr = c.createLinearGradient(b.x1, 0, b.x1 - dw, 0);
      gr.addColorStop(0, L.rgba(DANGER, 0.55 * ek * pulse)); gr.addColorStop(1, L.rgba(DANGER, 0));
      c.fillStyle = gr; c.fillRect(b.x1 - dw, b.y0, dw, b.h);
      const gt = c.createLinearGradient(0, b.y0, 0, b.y0 + dw);
      gt.addColorStop(0, L.rgba(DANGER, 0.6 * ek * pulse)); gt.addColorStop(1, L.rgba(DANGER, 0));
      c.fillStyle = gt; c.fillRect(b.x0, b.y0, b.w, dw);
    }
    // ---- BASEMENT / MIDDLE highlights: drawn-on outline + soft inner light
    const lout = 1 - L.enter(v.t, tm.labelsOut, 0.4, L.ease.inCubic);
    const hl = (rect, at) => {
      const k = L.prog(v.t, at - 0.1, 0.7);
      if (k <= 0) return;
      const r = toScreen(v, rect), a = out * (0.45 + 0.55 * lout);
      L.lightBlob(c, r.cx, r.cy, Math.max(r.w, r.h) * 0.55, SAFE, 0.22 * L.ease.outCubic(k) * a);
      c.save();
      c.strokeStyle = L.rgba(SAFE, 0.95 * a);
      c.lineWidth = 4;
      c.shadowColor = L.rgba(SAFE, 0.8); c.shadowBlur = 14;
      drawOnRect(c, { x0: r.x0 + 2, y0: r.y0 + 2, x1: r.x1 - 2, y1: r.y1 - 2, w: r.w - 4, h: r.h - 4 }, L.ease.inOutCubic(k));
      c.restore();
    };
    hl(BASE, tm.base);
    hl(MIDDLE, tm.mid);
    // ---- the car: red exposure tint, halo, target brackets
    const ck = L.ease.outCubic(L.prog(v.t, tm.car - 0.15, 0.55)) * out;
    if (ck > 0) {
      const r = toScreen(v, CAR_ZONE), pad = Math.max(6, v.ws(0.35));
      const pulse = 0.75 + 0.25 * Math.sin((v.gt - 30) * 4.2);
      L.lightBlob(c, r.cx, r.cy, r.w * 0.95, DANGER, 0.5 * ck * pulse);
      c.save();
      c.globalCompositeOperation = 'screen';
      c.fillStyle = L.rgba(DANGER, 0.7 * ck);
      L.roundRect(c, r.x0 - pad * 0.4, r.y0 - pad * 0.4, r.w + pad * 0.8, r.h + pad * 0.4, 8); c.fill();
      c.restore();
      // corner brackets
      const bx0 = r.x0 - pad, by0 = r.y0 - pad, bx1 = r.x1 + pad, by1 = r.y1 + pad * 0.6, arm = 18 * (0.6 + 0.4 * ck);
      const sh = (1 - ck) * 14;
      c.strokeStyle = L.rgba(DANGER, ck);
      c.lineWidth = 4; c.lineCap = 'square';
      c.beginPath();
      c.moveTo(bx0 - sh, by0 - sh + arm); c.lineTo(bx0 - sh, by0 - sh); c.lineTo(bx0 - sh + arm, by0 - sh);
      c.moveTo(bx1 + sh - arm, by0 - sh); c.lineTo(bx1 + sh, by0 - sh); c.lineTo(bx1 + sh, by0 - sh + arm);
      c.moveTo(bx1 + sh, by1 + sh - arm); c.lineTo(bx1 + sh, by1 + sh); c.lineTo(bx1 + sh - arm, by1 + sh);
      c.moveTo(bx0 - sh + arm, by1 + sh); c.lineTo(bx0 - sh, by1 + sh); c.lineTo(bx0 - sh, by1 + sh - arm);
      c.stroke();
    }
    c.restore();
  },

  drawOverlay(c, v) {
    const tm = times(v);
    c.save();
    c.globalAlpha = v.k;
    // ---- STEP 3 badge + material sub pill
    stepBadge(c, v, 3, 'GET INSIDE', { k: L.enter(v.t, 0.1, 0.7) });
    // the series sub chip (env stepSub) with drawn material swatches: BRICK · CONCRETE
    stepSub(c, [{ sw: swatch(BRICK_SW, true) }, { t: 'BRICK' }, { sw: sepDot }, { sw: swatch(CONC_SW, false) }, { t: 'CONCRETE' }], L.enter(v.t, tm.p1 + 0.05, 0.5) * (1 - L.enter(v.t, tm.labelsOut, 0.35, L.ease.inCubic)));   // clears for the car shot
    // ---- BASEMENT / MIDDLE labels (world-anchored, opaque pills)
    const lout = 1 - L.enter(v.t, tm.labelsOut, 0.35, L.ease.inCubic);
    if (lout > 0) {
      const b = toScreen(v, BASE), m = toScreen(v, MIDDLE);
      checkPill(c, b.cx, b.cy, 'BASEMENT', L.prog(v.t, tm.base, 0.55) * lout);
      checkPill(c, m.cx, m.cy, 'MIDDLE', L.prog(v.t, tm.mid, 0.55) * lout);
    }
    // ---- NOT YOUR CAR callout (screen card above the car, leader to the car's live position)
    const ck = L.prog(v.t, tm.car + 0.25, 0.55);
    if (ck > 0) {
      const e = L.ease.outCubic(ck);
      const r = toScreen(v, CAR_ZONE);
      const cw = 360, chh = 156, cx1 = 930, cx0 = cx1 - cw, cy0 = 840 + (1 - e) * 24;
      // leader: from card bottom (above the car) down to the bracket top
      const lx = L.clamp(r.cx, cx0 + 40, cx1 - 40);
      c.save();
      c.globalAlpha *= e;
      c.strokeStyle = L.rgba(DANGER, 0.95); c.lineWidth = 3;
      const ly1 = r.y0 - Math.max(6, v.ws(0.35)) - 12;
      if (ly1 > cy0 + chh + 6) {
        c.beginPath(); c.moveTo(lx, cy0 + chh); c.lineTo(lx, L.lerp(cy0 + chh, ly1, L.ease.outCubic(L.clamp(ck * 1.4 - 0.2)))); c.stroke();
        // arrow head (drawn)
        if (ck > 0.7) {
          c.fillStyle = L.rgba(DANGER, 0.95);
          c.beginPath(); c.moveTo(lx - 9, ly1 - 12); c.lineTo(lx + 9, ly1 - 12); c.lineTo(lx, ly1); c.closePath(); c.fill();
        }
      }
      // card
      c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 24; c.shadowOffsetY = 6;
      c.fillStyle = 'rgba(16,8,10,0.95)';
      L.roundRect(c, cx0, cy0, cw, chh, 14); c.fill();
      c.shadowColor = 'transparent';
      c.strokeStyle = L.rgba(DANGER, 0.7); c.lineWidth = 2;
      L.roundRect(c, cx0 + 5, cy0 + 5, cw - 10, chh - 10, 10); c.stroke();
      // prohibition sign with a car inside
      const ix = cx0 + 62, iy = cy0 + 66, ir = 38;
      c.fillStyle = 'rgba(245,245,240,0.95)';
      carGlyph(c, ix, iy + 2, 50);
      c.strokeStyle = L.rgba(DANGER); c.lineWidth = 8;
      c.beginPath(); c.arc(ix, iy, ir, 0, TAU); c.stroke();
      c.beginPath(); c.moveTo(ix - ir * 0.7, iy - ir * 0.7); c.lineTo(ix + ir * 0.7, iy + ir * 0.7); c.stroke();
      // text
      const tx = cx0 + 120, tmax = cx1 - 22 - tx;
      const fs = L.fitSize(c, 'NOT YOUR CAR', tmax, 60, 800, L.FONT.display, 30);
      c.font = L.font(fs, 800, L.FONT.display);
      c.fillStyle = L.rgba(DANGER);
      c.textBaseline = 'alphabetic';
      c.fillText('NOT YOUR CAR', tx + (1 - e) * 12, cy0 + 82);
      // second line, under the whole card width (with the icon)
      const k2 = L.clamp((ck - 0.35) / 0.65);
      c.globalAlpha *= k2;
      const fs2 = L.fitSize(c, 'BARELY PROTECTS YOU', cw - 84, 27, 700, L.FONT.body, 18);
      c.font = L.font(fs2, 700, L.FONT.body);
      c.fillStyle = L.rgba(TEXT, 0.92);
      L.trackedText(c, 'BARELY PROTECTS YOU', cx0 + cw / 2, cy0 + 134, 2, 'center');
      c.restore();
    }
    c.restore();
  },
};
