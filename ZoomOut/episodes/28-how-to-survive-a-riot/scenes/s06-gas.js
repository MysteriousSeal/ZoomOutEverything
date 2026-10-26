// Beat 6 — "Tear gas? | Move upwind and uphill. | Don't rub your eyes: flush them with water."
// Camera 'gas' (fixed, mpp 0.075, x −56…24): env vents the gas cloud from GAS_SRC (4, 6) at T.gas0 (41.62) drifting EAST
// with WIND; the crowd disperses from it; contours brighten from T.uphill (42.86); YOU walks west up the footpath
// (−29.5, 3.5) → (−41, −2).
//   drawWorld (layer −1, under env's gas): from T.gas0 a long DOWNWIND PLUME streams east from the canister to the wall
//            (≈ 110 seeded puffs, pure function of time: each born at a fixed time, drifting with the wind + noise
//            meander, growing, fading; they pile and spread along the wall at x 25.5); plus faint WIND STREAKS (short
//            dashes gliding east over the whole map, ramping in with the gas).
//   phrase 0 (41.62) STEP 6 badge UPWIND · UPHILL (full 76 px; TEAR GAS is in the caption); at + 0.4 a WIND chip with a long arrow (east) above the
//            plume (screen y ≈ 800, x 600–930).
//   phrase 1 (42.86) contour labels +1 m … +4 m on dark chips along y = 14 (env CONTOUR_LABELS) + an UPHILL arrow
//            (pointing west) above them; a green dashed route from YOU up the footpath to (−41, −2) with arrowhead.
//   phrase 2 (45.46) sub DON'T RUB YOUR EYES · FLUSH WITH WATER; a safety card (x 600–930, y 570–750) with an eye
//            (red ✕ badge: don't rub) and a water drop with falling droplets (green ✓ badge: flush).
import * as L from '../../../../engine/runtime/lib.js';
import { stepBadge, stepSub, youAt, CONTOUR_LABELS, FOOTPATH, SAFE, DANGER, GAS, GAS_SRC, WIND, WALL, glyphEye, glyphDrop, safetyCard, timesFor, toWorld, drawPuff, elevation } from '../env.js';

const TAU = Math.PI * 2;
const ph = (v, j) => v.tl.lines[v.index].phrases[j].start - v.tl.scenes[v.index].start;

// ------------------------------------------------------------------ plume puffs (seeded, fixed birth times)
const PLUME = (() => {
  const r = L.rng(2861), o = [];
  for (let i = 0; i < 110; i++) o.push({ dt: i * 0.075 + r() * 0.05, sp: 2.2 + r() * 1.6, lat: (r() - 0.5) * 2, ph: r() * 50, rs: 0.8 + r() * 0.5 });
  return o;
})();
const STREAKS = (() => {
  const r = L.rng(2862), o = [];
  for (let i = 0; i < 70; i++) o.push({ x: r(), y: r(), sp: 0.8 + r() * 0.6, len: 3.5 + r() * 4, a: 0.5 + r() * 0.5 });
  return o;
})();
const WSPD = Math.hypot(WIND.x, WIND.y), WX = WIND.x / WSPD, WY = WIND.y / WSPD;

function plume(gt, T) {
  const out = [];
  for (const q of PLUME) {
    const age = gt - (T.gas0 + 0.15 + q.dt);
    if (age <= 0) continue;
    const d = q.sp * age;                                       // metres travelled downwind
    let x = GAS_SRC.x + WX * d, y = GAS_SRC.y + WY * d + 0.25 * age;   // CS is heavy: a slight slump south
    y += q.lat * (0.6 + 0.5 * d) * 0.45 + L.noise1(q.ph + age * 0.7, 9) * (0.4 + 0.12 * d);   // spreading, meandering
    const over = x - (WALL.x - 1.2);
    if (over > 0) { x = WALL.x - 1.2 - over * 0.15; y += Math.sign(q.lat || 1) * over * 0.8; }   // piles + spreads along the wall
    const r = (1.2 + 0.32 * d) * q.rs;
    const a = Math.min(1, age / 0.4) * Math.exp(-age / 9);
    out.push({ x, y, r, a });
  }
  return out;
}

function chip(c, text, x, y, col, k, size = 28) {
  if (k <= 0) return 0;
  c.save();
  c.globalAlpha *= L.clamp(k);
  c.font = L.font(size, 800, L.FONT.display);
  c.letterSpacing = '1px';
  const w = c.measureText(text).width + 34, h = size + 14, y0 = y - h / 2;
  c.fillStyle = 'rgba(10,10,14,0.88)'; L.roundRect(c, x, y0, w, h, 8); c.fill();
  c.fillStyle = L.rgba(col); c.fillRect(x + 8, y0 + 9, 4, h - 18);
  c.fillStyle = '#fff'; c.textBaseline = 'middle';
  c.fillText(text, x + 22, y0 + h / 2 + 1);
  c.letterSpacing = '0px';
  c.restore();
  return w;
}
function arrowLine(c, x0, y0, x1, y1, w, hd, col) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = w; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1 - Math.cos(a) * hd * 0.6, y1 - Math.sin(a) * hd * 0.6); c.stroke();
  c.beginPath();
  c.moveTo(x1 + Math.cos(a) * 3, y1 + Math.sin(a) * 3);
  c.lineTo(x1 - Math.cos(a - 0.5) * hd, y1 - Math.sin(a - 0.5) * hd);
  c.lineTo(x1 - Math.cos(a + 0.5) * hd, y1 - Math.sin(a + 0.5) * hd);
  c.closePath(); c.fill();
}

export default {
  beat: 6,
  chapter: null,
  captions: true,
  layer: -1,
  cues() { return []; },
  drawWorld(c, v) {
    const T = timesFor(v.tl);
    if (v.gt < T.gas0 || v.gt > v.tl.scenes[7].start + 2.5) return;
    const m = v.cam.mpp, V = { x0: v.cam.x - 540 * m - 10, x1: v.cam.x + 540 * m + 10, y0: v.cam.y - 902 * m - 10, y1: v.cam.y + 1018 * m + 10 };
    if (GAS_SRC.x + 30 < V.x0 || GAS_SRC.x - 10 > V.x1) return;
    const out = L.smoothstep(L.clamp((v.tl.scenes[7].start + 2.5 - v.gt) / 1.5));
    c.save();
    toWorld(c, v);
    // the plume
    plume(v.gt, T).forEach((p, i) => {   // noise-textured puffs, stretched along the wind; alpha 0.15–0.3 each
      if (p.a <= 0.01 || p.x + 1.7 * p.r < V.x0 || p.x - 1.7 * p.r > V.x1 || p.y + p.r < V.y0 || p.y - p.r > V.y1) return;
      drawPuff(c, p.x, p.y, 1.7 * p.r, p.r, (0.15 + 0.15 * ((i * 0.618) % 1)) * p.a * out, i + 1);
    });
    c.globalAlpha = 1;
    // wind streaks over the whole view
    const wk = L.smoothstep(L.prog(v.gt, T.gas0 + 0.3, 1.2)) * out;
    if (wk > 0) {
      const Wd = V.x1 - V.x0, Hd = V.y1 - V.y0;
      c.lineCap = 'round';
      c.lineWidth = 2.6 * m;
      for (const s of STREAKS) {
        const u = (s.x + (v.gt * s.sp * WSPD * 2.2) / Wd) % 1;
        const x = V.x0 + u * Wd, y = V.y0 + s.y * Hd;
        const fade = Math.sin(Math.PI * u);
        c.strokeStyle = `rgba(225,232,245,${0.32 * s.a * fade * wk})`;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + WX * s.len, y + WY * s.len); c.stroke();
      }
    }
    c.restore();
  },
  drawOverlay(c, v) {
    const T = timesFor(v.tl);
    c.save();
    c.globalAlpha = v.k;

    // ---- WIND (above the plume)
    const wk = L.ease.outCubic(L.prog(v.t, ph(v, 0) + 0.4, 0.7));
    if (wk > 0) {
      const y = 812, x0 = 606, x1 = 930;
      const cw = chip(c, 'WIND', x0, y, GAS, L.clamp(wk * 1.5));
      c.save();
      c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 8;
      const ax0 = x0 + cw + 14;
      arrowLine(c, ax0, y, L.lerp(ax0 + 20, x1, wk), y, 6, 26, L.rgba([236, 240, 226]));
      c.restore();
    }

    // ---- uphill: contour labels + UPHILL arrow
    const uk = L.ease.outCubic(L.prog(v.t, ph(v, 1) + 0.15, 0.6));
    if (uk > 0) {
      // chips evenly spaced between the +1 m and +4 m crossings, each nudged onto its own contour line
      const L4 = CONTOUR_LABELS.slice(0, 4), xa0 = L4[0].x, xb0 = L4[3].x;
      const labs = L4.map((lb, i) => {
        const y = i % 2 ? 16.6 : 13;   // two staggered rows (+1/+3 high, +2/+4 low): neighbours never crowd each other
        let x = L.lerp(xa0, xb0, i / 3);
        for (let k = 0; k <= 60; k++) {   // nearest crossing of this level along the row
          let hitX = null;
          for (const sg of [1, -1]) { const x0 = x + sg * k * 0.25, x1 = x0 + sg * 0.25; if ((elevation(x0, y) - lb.level) * (elevation(x1, y) - lb.level) <= 0) { hitX = (x0 + x1) / 2; break; } }
          if (hitX != null) { x = hitX; break; }
        }
        return [v.wx(x), v.wy(y), lb.level];
      }).filter(([x]) => x > 70 && x < 1000);
      c.save();
      c.font = L.font(22, 700, L.FONT.din);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      labs.forEach(([x, y, lv], i) => {
        const k = L.ease.outCubic(L.prog(v.t, ph(v, 1) + 0.15 + i * 0.12, 0.4));
        if (k <= 0) return;
        c.save();
        c.globalAlpha *= k;
        const s = `+${lv} m`, w = c.measureText(s).width + 14;
        c.fillStyle = 'rgba(8,14,16,0.85)'; L.roundRect(c, x - w / 2, y - 15, w, 30, 6); c.fill();
        c.fillStyle = 'rgba(196,244,222,0.98)'; c.fillText(s, x, y + 1);
        c.restore();
      });
      c.restore();
      if (labs.length >= 2) {
        const xa = labs[0][0] + 10, xb = labs[labs.length - 1][0] - 20, ya = labs[0][1] - 54;
        c.save();
        c.globalAlpha *= uk;
        c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 8;
        arrowLine(c, xa, ya, L.lerp(xa, xb, uk), ya, 6, 24, 'rgb(196,244,222)');
        c.shadowBlur = 0;
        c.font = L.font(26, 800, L.FONT.display); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
        c.fillStyle = 'rgba(8,14,16,0.85)';
        c.letterSpacing = '2px';
        const tw = c.measureText('UPHILL').width;
        L.roundRect(c, (xa + xb) / 2 - tw / 2 - 12, ya - 52, tw + 24, 36, 7); c.fill();
        c.fillStyle = 'rgb(196,244,222)'; c.fillText('UPHILL', (xa + xb) / 2 - tw / 2, ya - 25);
        c.letterSpacing = '0px';
        c.restore();
      }
      // YOU's route: up the footpath, away from the gas
      const p = { ...youAt(v.gt, v.tl) };
      const goal = FOOTPATH[3];   // (−41, −2)
      const pts = [[p.x, p.y]];
      for (const fp of FOOTPATH) if (fp[0] < p.x - 0.5 && fp[0] >= goal[0]) pts.push(fp);
      if (pts.length >= 2 && Math.hypot(goal[0] - p.x, goal[1] - p.y) > 1.5) {
        const sp = pts.map(([x, y]) => [v.wx(x), v.wy(y)]);
        const d0 = Math.hypot(sp[1][0] - sp[0][0], sp[1][1] - sp[0][1]) || 1;
        sp[0] = [sp[0][0] + (sp[1][0] - sp[0][0]) * Math.min(0.8, 32 / d0), sp[0][1] + (sp[1][1] - sp[0][1]) * Math.min(0.8, 32 / d0)];
        c.save();
        c.globalAlpha *= uk;
        c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 8;
        c.strokeStyle = L.rgba(SAFE, 0.95); c.fillStyle = L.rgba(SAFE, 0.95);
        c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
        c.setLineDash([14, 11]); c.lineDashOffset = -v.gt * 40;
        const n = sp.length, last = sp[n - 1], prev = sp[n - 2], a = Math.atan2(last[1] - prev[1], last[0] - prev[0]);
        c.beginPath(); sp.forEach(([x, y], i) => (i < n - 1 ? (i ? c.lineTo(x, y) : c.moveTo(x, y)) : c.lineTo(x - Math.cos(a) * 14, y - Math.sin(a) * 14))); c.stroke();
        c.setLineDash([]);
        c.beginPath();
        c.moveTo(last[0] + Math.cos(a) * 4, last[1] + Math.sin(a) * 4);
        c.lineTo(last[0] - Math.cos(a - 0.5) * 26, last[1] - Math.sin(a - 0.5) * 26);
        c.lineTo(last[0] - Math.cos(a + 0.5) * 26, last[1] - Math.sin(a + 0.5) * 26);
        c.closePath(); c.fill();
        c.restore();
      }
    }

    // ---- badge, sub, eye/water card
    stepBadge(c, v, 6, 'UPWIND · UPHILL', { k: L.enter(v.t, ph(v, 0) - 0.1, 0.75) });
    const fk = L.enter(v.t, ph(v, 2) + 0.05, 0.5);
    stepSub(c, "DON'T RUB YOUR EYES · FLUSH WITH WATER", fk);
    const box = { x: 606, y: 572, w: 324, h: 176 };
    safetyCard(c, fk, box, () => {
      const cy = box.y + box.h / 2 + 4, ex = box.x + 92, dx = box.x + 240;
      // divider first (under everything), stopping short above the finger's level
      c.fillStyle = 'rgba(255,204,0,0.25)'; c.fillRect(box.x + box.w / 2 - 1, box.y + 30, 2, box.h - 88);
      // eye + red ✕ badge
      c.fillStyle = 'rgb(246,244,238)'; c.strokeStyle = 'rgb(246,244,238)';
      c.save(); c.translate(ex, cy); glyphEye(c, 120); c.restore();
      // a fingertip reaching up into the lower lid (what NOT to do), under the red ✕: it enters from the card's bottom
      // edge, stays left of the divider; its knock-out is clipped to the almond (the lid line is never notched elsewhere)
      const fx0 = ex + 50, fy0 = cy + 84, fx1 = ex + 32, fy1 = cy + 18;
      c.save();
      c.lineCap = 'round';
      c.save();
      { const ew = 60, eh = 120 * 0.27, R = (ew * ew + eh * eh) / (2 * eh);   // glyphEye(120) almond
        c.translate(ex, cy); c.scale(1.08, 1.22);   // the almond + its lid line: the finger is cut free where it crosses the lid
        c.beginPath();
        c.arc(0, -eh + R, R, -Math.PI / 2 - Math.asin(ew / R), -Math.PI / 2 + Math.asin(ew / R));
        c.arc(0, eh - R, R, Math.PI / 2 - Math.asin(ew / R), Math.PI / 2 + Math.asin(ew / R));
        c.closePath(); c.scale(1 / 1.08, 1 / 1.22); c.translate(-ex, -cy); c.clip(); }
      c.strokeStyle = 'rgb(16,17,21)'; c.lineWidth = 30;
      c.beginPath(); c.moveTo(fx0, fy0); c.lineTo(fx1, fy1); c.stroke();
      c.restore();
      c.strokeStyle = 'rgb(246,244,238)'; c.lineWidth = 20;
      c.beginPath(); c.moveTo(fx0, fy0); c.lineTo(fx1, fy1); c.stroke();
      { const a = Math.atan2(fy0 - fy1, fx0 - fx1), nx = -Math.sin(a), ny = Math.cos(a), bx = fx1 + Math.cos(a) * 13, by = fy1 + Math.sin(a) * 13;
        c.strokeStyle = 'rgb(16,17,21)'; c.lineWidth = 3;   // nail line across the fingertip
        c.beginPath(); c.moveTo(bx + nx * 6, by + ny * 6); c.lineTo(bx - nx * 6, by - ny * 6); c.stroke(); }
      c.restore();
      const xk = L.ease.outBack(L.clamp((v.t - ph(v, 2) - 0.25) / 0.35), 2);
      if (xk > 0) {
        c.save(); c.translate(ex + 44, cy - 38); c.scale(Math.max(0.001, xk), Math.max(0.001, xk));
        c.fillStyle = L.rgba(DANGER); c.beginPath(); c.arc(0, 0, 17, 0, TAU); c.fill();
        c.strokeStyle = '#fff'; c.lineWidth = 4; c.lineCap = 'round';
        c.beginPath(); c.moveTo(-6.5, -6.5); c.lineTo(6.5, 6.5); c.moveTo(6.5, -6.5); c.lineTo(-6.5, 6.5); c.stroke();
        c.restore();
      }
      // water drop + falling droplets + green ✓ badge
      c.fillStyle = 'rgb(110,190,255)';
      c.save(); c.translate(dx, cy - 4); glyphDrop(c, 96); c.restore();
      for (let i = 0; i < 3; i++) {
        const u = ((v.t - ph(v, 2)) * 1.4 + i / 3) % 1;
        if (u < 0) continue;
        c.fillStyle = `rgba(150,210,255,${0.9 * Math.sin(Math.PI * u)})`;
        c.save(); c.translate(dx - 22 + i * 22, cy + 48 + u * 12); glyphDrop(c, 14); c.restore();   // travel capped: never clipped by the card edge
      }
      const ck = L.ease.outBack(L.clamp((v.t - ph(v, 2) - 1.0) / 0.35), 2);
      if (ck > 0) {
        c.save(); c.translate(dx + 42, cy - 38); c.scale(Math.max(0.001, ck), Math.max(0.001, ck));
        c.fillStyle = L.rgba(SAFE); c.beginPath(); c.arc(0, 0, 17, 0, TAU); c.fill();
        c.strokeStyle = '#fff'; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(-7, 0); c.lineTo(-2, 5.5); c.lineTo(7.5, -6); c.stroke();
        c.restore();
      }
    });
    c.restore();
  },
};
