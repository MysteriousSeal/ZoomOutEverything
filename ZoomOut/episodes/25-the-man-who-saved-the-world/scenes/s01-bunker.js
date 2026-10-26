// Beat 1 — "September twenty-sixth. A secret bunker near Moscow. | Just after midnight. | Three weeks earlier, the
//          Soviets had shot down a passenger jet. Tension is at its peak."   (7.40–19.92 with the v4 voice)
// Every time here is derived from the timeline (phrase starts / env.moments): no absolute seconds.
//
// Camera 'room' cranes back + down to the whole control room (env draws the room; the СТАРТ board is s00's); on
// phrase 2 the camera's second move ('wall') pushes onto the wall map.
// drawWorld (every frame while the room exists, beats 0–2 until the match-cut):
//   THE EMPTY CHAIR, the officer's only presence: this file repaints env's placeholder chair as a period swivel chair
//   seen from behind (buttoned vinyl back, armrests, gas column, five-star base, casters), with a contact shadow on
//   the floor and a rim of the board's light. A single overhead work light falls on it: a faint volumetric shaft
//   with slow dust motes and a pool on the floor, rising from beat start + 1.5 s so the eye settles on the seat.
//   KAL 007 (phrase 2, moments.kal): on the green wall map, a dashed amber track from Anchorage over Kamchatka to the
//   shoot-down point off Sakhalin (≈ 46.6 N 141.3 E), a red cross + one slow ring. No aircraft, no gore.
// Overlay:
//   beat + 0.5  the date stamp in the HUD's top-right slot: 26 SEP 1983 / SERPUKHOV-15 · NEAR MOSCOW.
//   phrase 1    env's wall clock flips 00:14 → 00:15: amber brackets snap onto the clock + MOSCOW TIME.
//   phrase 2    (both gone first) a teleprinter card over the dark board, above the map:
//                 TELEX · 1 SEP 1983 / KOREAN AIR LINES FLIGHT 007 / SHOT DOWN · 269 KILLED (typed),
//               then on "Tension is at its peak" (moments.tension) a row TENSION: AT ITS PEAK with a gauge that fills
//               to its red end. A hairline leader drops from the card to the red cross.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, AMBER, COLD, CHAIR, CEIL_Y, clockRect, dateRect, plane, proj, lampK, alarmK, roomK, globeView, geo, path3, earth3, moments } from '../env.js';

const { W } = L;
const TAU = Math.PI * 2;
const R = 1016;                      // right edge of the HUD slot

// ------------------------------------------------------------------ the chair (metres, plane dz = CHAIR.dz)
const CX = CHAIR.x, TOPY = CHAIR.top - 0.04, SEAT = CHAIR.seat;
const BW = CHAIR.w + 0.08;           // a little wider than env's: covers the placeholder completely
const LEGS = [-0.36, -0.2, 0, 0.2, 0.36];

function drawChair(c, rim, wash) {
  const x0 = CX - BW / 2, bh = SEAT - TOPY - 0.04;
  // five-star base + casters (drawn first: the column and seat sit over them)
  c.lineCap = 'round';
  for (const dx of LEGS) {
    const yEnd = -0.045 + Math.abs(dx) * 0.03 - (dx === 0 ? 0.02 : 0);
    c.strokeStyle = 'rgb(18,19,19)'; c.lineWidth = 0.05;
    c.beginPath(); c.moveTo(CX, -0.12); c.lineTo(CX + dx, yEnd); c.stroke();
    c.strokeStyle = 'rgba(150,165,160,0.22)'; c.lineWidth = 0.01;
    c.beginPath(); c.moveTo(CX, -0.135); c.lineTo(CX + dx, yEnd - 0.016); c.stroke();
    c.fillStyle = 'rgb(10,10,10)';
    c.beginPath(); c.ellipse(CX + dx, yEnd + 0.022, 0.034, 0.026, 0, 0, TAU); c.fill();
  }
  // hub + gas column (chrome)
  c.fillStyle = 'rgb(22,23,23)';
  c.beginPath(); c.ellipse(CX, -0.12, 0.07, 0.03, 0, 0, TAU); c.fill();
  const cg = c.createLinearGradient(CX - 0.035, 0, CX + 0.035, 0);
  cg.addColorStop(0, 'rgb(40,44,44)'); cg.addColorStop(0.35, 'rgb(150,160,158)'); cg.addColorStop(0.6, 'rgb(70,76,76)'); cg.addColorStop(1, 'rgb(24,26,26)');
  c.fillStyle = cg;
  c.fillRect(CX - 0.032, SEAT + 0.04, 0.064, -0.12 - (SEAT + 0.04));
  // seat (only its sides show past the back)
  c.fillStyle = 'rgb(30,31,28)';
  L.roundRect(c, CX - BW / 2 - 0.07, SEAT - 0.03, BW + 0.14, 0.1, 0.045); c.fill();
  c.fillStyle = 'rgba(160,170,150,0.12)';
  c.fillRect(CX - BW / 2 - 0.05, SEAT - 0.028, BW + 0.1, 0.012);
  // armrests: posts + pads
  for (const s of [-1, 1]) {
    const ax = CX + s * (BW / 2 + 0.035);
    c.fillStyle = 'rgb(20,21,21)';
    c.fillRect(ax - 0.016, SEAT - 0.26, 0.032, 0.25);
    c.fillStyle = 'rgb(28,28,26)';
    L.roundRect(c, ax - 0.04, SEAT - 0.3, 0.08, 0.05, 0.02); c.fill();
    c.fillStyle = 'rgba(190,200,190,0.14)';
    c.fillRect(ax - 0.035, SEAT - 0.298, 0.07, 0.008);
  }
  // back post
  c.fillStyle = 'rgb(16,17,17)';
  c.fillRect(CX - 0.045, SEAT - 0.12, 0.09, 0.1);
  // the backrest: rear shell, slightly tapered, upholstered
  c.beginPath();
  const tw = BW * 0.94, r = 0.1;
  c.moveTo(CX - tw / 2 + r, TOPY);
  c.lineTo(CX + tw / 2 - r, TOPY);
  c.quadraticCurveTo(CX + tw / 2, TOPY, CX + tw / 2 + 0.005, TOPY + r);
  c.lineTo(CX + BW / 2, TOPY + bh - r);
  c.quadraticCurveTo(CX + BW / 2, TOPY + bh, CX + BW / 2 - r, TOPY + bh);
  c.lineTo(CX - BW / 2 + r, TOPY + bh);
  c.quadraticCurveTo(CX - BW / 2, TOPY + bh, CX - BW / 2, TOPY + bh - r);
  c.lineTo(CX - tw / 2 - 0.005, TOPY + r);
  c.quadraticCurveTo(CX - tw / 2, TOPY, CX - tw / 2 + r, TOPY);
  c.closePath();
  const bg = c.createLinearGradient(0, TOPY, 0, TOPY + bh);
  bg.addColorStop(0, 'rgb(58,56,48)'); bg.addColorStop(0.35, 'rgb(42,41,36)'); bg.addColorStop(1, 'rgb(24,24,22)');
  c.fillStyle = bg;
  c.fill();
  c.save();
  c.clip();
  // side shading (rounded upholstery)
  const sg = c.createLinearGradient(x0, 0, x0 + BW, 0);
  sg.addColorStop(0, 'rgba(0,0,0,0.45)'); sg.addColorStop(0.18, 'rgba(0,0,0,0)'); sg.addColorStop(0.8, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,0.5)');
  c.fillStyle = sg; c.fillRect(x0 - 0.02, TOPY, BW + 0.04, bh);
  // the overhead light catching the top of the back
  const tg = c.createRadialGradient(CX - 0.05, TOPY - 0.05, 0.02, CX - 0.05, TOPY - 0.05, 0.42);
  tg.addColorStop(0, `rgba(210,225,215,${0.22 * rim.top})`); tg.addColorStop(1, 'rgba(210,225,215,0)');
  c.fillStyle = tg; c.fillRect(x0, TOPY, BW, bh);
  // stitched panel seam + rear-shell screws
  c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 0.008;
  L.roundRect(c, x0 + 0.07, TOPY + 0.07, BW - 0.14, bh - 0.16, 0.06); c.stroke();
  c.strokeStyle = 'rgba(200,205,190,0.08)'; c.lineWidth = 0.004;
  c.setLineDash([0.018, 0.014]);
  L.roundRect(c, x0 + 0.078, TOPY + 0.078, BW - 0.156, bh - 0.176, 0.055); c.stroke();
  c.setLineDash([]);
  c.fillStyle = 'rgba(120,124,118,0.5)';
  for (const [dx, dy] of [[-0.12, bh - 0.06], [0.12, bh - 0.06]]) { c.beginPath(); c.arc(CX + dx, TOPY + dy, 0.009, 0, TAU); c.fill(); }
  c.restore();
  // rim: the board's red light on the upper edge (stronger when the alarm floods the room)
  c.strokeStyle = L.rgba([255, 118, 96], 0.12 + 0.3 * rim.red);
  c.lineWidth = 0.01;
  c.beginPath();
  c.moveTo(CX - BW / 2 + 0.01, TOPY + bh * 0.55);
  c.lineTo(CX - tw / 2 - 0.004, TOPY + r);
  c.quadraticCurveTo(CX - tw / 2, TOPY + 0.004, CX - tw / 2 + r, TOPY + 0.004);
  c.lineTo(CX + tw / 2 - r, TOPY + 0.004);
  c.stroke();
  if (wash > 0) {   // env's red alarm wash (it is drawn before scene layers)
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = L.rgba([150, 18, 12], 0.16 * wash);
    c.fillRect(CX - BW / 2 - 0.12, TOPY - 0.02, BW + 0.24, -TOPY + 0.04);
    c.restore();
  }
}

// dust motes in the work light (deterministic)
const MOTES = (() => { const r = L.rng(915), out = []; for (let i = 0; i < 26; i++) out.push({ u: r() * 2 - 1, y0: r(), sp: 0.02 + r() * 0.03, ph: r() * TAU, s: 0.8 + r() * 1.4 }); return out; })();

function drawLight(c, v, k) {
  if (k <= 0) return;
  const top = proj(v, CX, CEIL_Y, CHAIR.dz), seat = proj(v, CX, TOPY, CHAIR.dz), floor = proj(v, CX, 0, CHAIR.dz);
  if (!top || !seat || !floor) return;
  const yTop = Math.max(-40, top.y), yBot = floor.y;
  if (yBot < 0 || yTop > L.H) return;
  const wTop = 0.22 * top.s, wBot = 1.25 * floor.s;
  const wAt = (y) => L.lerp(wTop, wBot, L.invLerp(top.y, floor.y, y));
  c.save();
  c.globalCompositeOperation = 'lighter';
  // the shaft
  const g = c.createLinearGradient(0, yTop, 0, yBot);
  g.addColorStop(0, 'rgba(190,220,210,0)');
  g.addColorStop(0.55, `rgba(190,220,210,${0.035 * k})`);
  g.addColorStop(0.85, `rgba(200,225,215,${0.07 * k})`);
  g.addColorStop(1, `rgba(200,225,215,${0.03 * k})`);
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(top.x - wAt(yTop) / 2, yTop); c.lineTo(top.x + wAt(yTop) / 2, yTop);
  c.lineTo(floor.x + wBot / 2, yBot); c.lineTo(floor.x - wBot / 2, yBot);
  c.closePath(); c.fill();
  // a softer core
  c.fillStyle = g;
  c.globalAlpha = 0.8;
  c.beginPath();
  c.moveTo(top.x - wAt(yTop) * 0.22, yTop); c.lineTo(top.x + wAt(yTop) * 0.22, yTop);
  c.lineTo(floor.x + wBot * 0.22, yBot); c.lineTo(floor.x - wBot * 0.22, yBot);
  c.closePath(); c.fill();
  c.globalAlpha = 1;
  // pool of light on the floor around the base, and on the seat back
  c.save();
  c.translate(floor.x, floor.y - 0.02 * floor.s);
  c.scale(1, 0.22);
  const pg = c.createRadialGradient(0, 0, 0, 0, 0, 0.75 * floor.s);
  pg.addColorStop(0, `rgba(200,225,215,${0.13 * k})`); pg.addColorStop(1, 'rgba(200,225,215,0)');
  c.fillStyle = pg;
  c.fillRect(-0.8 * floor.s, -0.8 * floor.s, 1.6 * floor.s, 1.6 * floor.s);
  c.restore();
  // motes: slow fall + drift, fading at the shaft's ends
  for (const m of MOTES) {
    const f = (m.y0 + v.gt * m.sp) % 1;
    const y = L.lerp(seat.y - 0.9 * seat.s, seat.y + 0.15 * seat.s, f);
    const x = L.lerp(top.x, floor.x, L.invLerp(top.y, floor.y, y)) + m.u * wAt(y) * 0.38 + Math.sin(v.gt * 0.4 + m.ph) * 6;
    const a = k * 0.45 * Math.sin(Math.PI * f) * (0.6 + 0.4 * Math.sin(v.gt * 0.9 + m.ph));
    if (a <= 0.01) continue;
    c.fillStyle = `rgba(220,235,228,${a})`;
    c.beginPath(); c.arc(x, y, Math.max(0, m.s * seat.s / 300), 0, TAU); c.fill();
  }
  c.restore();
}

/** contact shadow under the chair (on the floor, under the light) */
function drawShadow(c, v) {
  const f = proj(v, CX, 0, CHAIR.dz);
  if (!f) return;
  c.save();
  c.translate(f.x, f.y - 0.01 * f.s);
  c.scale(1, 0.18);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 0.5 * f.s);
  g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(-0.5 * f.s, -0.5 * f.s, f.s, f.s);
  c.restore();
}

function brackets(c, x, y, w, h, len, col) {
  c.strokeStyle = col;
  c.lineWidth = 3;
  c.lineCap = 'square';
  c.beginPath();
  c.moveTo(x, y + len); c.lineTo(x, y); c.lineTo(x + len, y);
  c.moveTo(x + w - len, y); c.lineTo(x + w, y); c.lineTo(x + w, y + len);
  c.moveTo(x + w, y + h - len); c.lineTo(x + w, y + h); c.lineTo(x + w - len, y + h);
  c.moveTo(x + len, y + h); c.lineTo(x, y + h); c.lineTo(x, y + h - len);
  c.stroke();
}

// ------------------------------------------------------------------ KAL 007 (phrase 2)
const KAL = [{ lat: 61.17, lon: -150.0 }, { lat: 53.0, lon: 158.6 }, { lat: 46.57, lon: 141.28 }];   // Anchorage → over Kamchatka → off Sakhalin
const KAL_DOWN = KAL[2];
/** visibility of the KAL layer (world mark + card): in on moments.kal, out before the push into the map */
const kalOut = (v) => v.tl.scenes[2].start - 0.3;
function kalK(v, m) {
  return L.ease.outCubic(L.prog(v.gt, m.kal, 0.5)) * (1 - L.ease.inOutCubic(L.prog(v.gt, kalOut(v) - 0.55, 0.5)));
}
function drawKal(c, v, rk) {
  const m = moments(v.tl), k = kalK(v, m) * rk;
  if (k <= 0) return;
  const view = globeView(v);
  const draw = L.ease.inOutCubic(L.prog(v.gt, m.kal + 0.1, 1.1));
  c.save();
  c.globalAlpha = k;
  // the track: two great-circle legs on the surface, dashed amber, drawn on progressively
  const pts = [];
  for (let leg = 0; leg < 2; leg++) for (let i = 0; i <= 24; i++) pts.push(earth3(view, path3(KAL[leg], KAL[leg + 1], i / 24, 0)));
  const n = Math.max(1, Math.round(draw * (pts.length - 1)));
  c.setLineDash([Math.max(2, view.r * 0.018), Math.max(2, view.r * 0.014)]);
  c.strokeStyle = L.rgba(AMBER, 0.9);
  c.lineWidth = Math.max(1.5, view.r / 160);
  c.beginPath();
  for (let i = 0; i <= n; i++) (i ? c.lineTo(pts[i].x, pts[i].y) : c.moveTo(pts[i].x, pts[i].y));
  c.stroke();
  c.setLineDash([]);
  // the shoot-down point: a red cross + one slow ring
  const hit = L.prog(v.gt, m.kal + 1.2, 0.3);
  if (hit > 0) {
    const p = geo(view, KAL_DOWN.lat, KAL_DOWN.lon), s = Math.max(6, view.r * 0.035) * L.ease.outBack(hit);
    L.lightBlob(c, p.x, p.y, s * 3.2, ACCENT, 0.5 * hit);
    c.strokeStyle = L.rgba([255, 96, 80]);
    c.lineWidth = Math.max(2, view.r / 90);
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(p.x - s, p.y - s); c.lineTo(p.x + s, p.y + s); c.moveTo(p.x + s, p.y - s); c.lineTo(p.x - s, p.y + s); c.stroke();
    const ring = ((v.gt - m.kal - 1.2) % 2.2) / 2.2;
    if (ring > 0) {
      c.strokeStyle = L.rgba(ACCENT, 0.7 * (1 - ring));
      c.lineWidth = 2;
      c.beginPath(); c.arc(p.x, p.y, Math.max(0, s * (1.4 + 3 * L.ease.outCubic(ring))), 0, TAU); c.stroke();
    }
  }
  c.restore();
}

const TX = { x: 80, w: 860, y: 372, pad: 30 };
const KAL_L1 = 'KOREAN AIR LINES FLIGHT 007', KAL_L2 = 'SHOT DOWN · 269 KILLED', KAL_T = 'TENSION: AT ITS PEAK';
/** a typed line (teleprinter): n chars of str, with the carriage block while typing */
function typed(c, str, x, y, fs, t, dur) {
  const n = Math.min(str.length, Math.floor(L.clamp(t / dur) * str.length + 1e-6));
  if (n <= 0) return;
  c.fillText(str.slice(0, n), x, y);
  if (n < str.length) {
    const cx = x + c.measureText(str.slice(0, n)).width + 3;
    c.fillRect(cx, y - fs * 0.78, fs * 0.55, fs * 0.9);
  }
}
function kalCard(c, v, m) {
  // the card is OPAQUE from its first frame: revealed by a top-down wipe (paper feeding out of the teleprinter),
  // only its contents fade; it leaves by rolling back up over 0.5 s (never a see-through card, never a pop)
  if (v.k <= 0) return;
  const outT = kalOut(v);
  const wipe = L.ease.outCubic(L.prog(v.gt, m.kal, 0.35)) * (1 - L.ease.inOutCubic(L.prog(v.gt, outT - 0.55, 0.5)));
  if (wipe <= 0.001) return;
  const ca = L.prog(v.gt, m.kal + 0.12, 0.3) * (1 - L.ease.inCubic(L.prog(v.gt, outT - 0.6, 0.28)));
  const t = v.gt - m.kal;                                   // seconds since the card started
  const tT = v.gt - m.tension;
  const { x, w, y, pad } = TX;
  const inner = w - 2 * pad;
  c.save();
  c.font = L.font(40, 700, L.FONT.mono);
  const fs = Math.min(46, L.fitSize(c, KAL_L1, inner, 46, 700, L.FONT.mono, 24), L.fitSize(c, KAL_L2, inner, 46, 700, L.FONT.mono, 24));
  const r1 = y + 64, r2 = r1 + fs * 1.35, r3 = r2 + fs * 1.3, r4 = r3 + 66, h = r4 + 34 - y;
  // the leader to the cross (drawn first: it starts under the card)
  const p = geo(globeView(v), KAL_DOWN.lat, KAL_DOWN.lon);
  const lk = L.prog(t, 1.25, 0.4);
  if (lk > 0 && ca > 0 && p.y > y + h + 20) {
    c.globalAlpha = ca;
    c.strokeStyle = L.rgba(ACCENT, 0.7); c.lineWidth = 2;
    const x0 = L.clamp(p.x, x + 30, x + w - 30);
    c.beginPath(); c.moveTo(x0, y + h); c.lineTo(L.lerp(x0, p.x, lk), L.lerp(y + h, p.y - 16, lk)); c.stroke();
  }
  c.globalAlpha = 1;
  c.beginPath(); c.rect(x - 40, y - 2, w + 80, h * wipe + 2 + 40 * L.clamp((wipe - 0.9) / 0.1)); c.clip();
  // card: opaque, paper-dark, red hairline, perforation dots down the left edge (teleprinter roll)
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 30;
  c.fillStyle = 'rgb(8,11,12)';
  L.roundRect(c, x, y, w, h, 10); c.fill();
  c.shadowBlur = 0;
  c.strokeStyle = L.rgba(ACCENT, 0.6); c.lineWidth = 1.5;
  L.roundRect(c, x + 0.75, y + 0.75, w - 1.5, h - 1.5, 10); c.stroke();
  c.fillStyle = 'rgba(200,210,205,0.12)';
  for (let yy = y + 18; yy < y + h - 10; yy += 22) { c.beginPath(); c.arc(x + 14, yy, 3, 0, TAU); c.fill(); }
  c.globalAlpha = ca;
  // kicker
  c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  c.fillStyle = L.rgba(ACCENT);
  c.fillRect(x + pad, r1 - 22, 14, 18);
  c.font = L.font(24, 700, L.FONT.mono);
  c.fillStyle = L.rgba(AMBER);
  L.trackedText(c, 'TELEX · 1 SEP 1983', x + pad + 28, r1 - 4, 3, 'left');
  // the two typed lines
  c.font = L.font(fs, 700, L.FONT.mono);
  c.fillStyle = L.rgba(COLD);
  typed(c, KAL_L1, x + pad, r2, fs, t - 0.15, 0.7);
  c.fillStyle = L.rgba([255, 120, 104]);
  typed(c, KAL_L2, x + pad, r3, fs, t - 1.0, 0.55);
  // tension row: rule, label, gauge filling to the red end
  c.fillStyle = 'rgba(200,210,205,0.14)';
  c.fillRect(x + pad, r3 + 24, inner, 1.5);
  const kt = L.prog(tT, -0.05, 0.3);
  if (kt > 0) {
    c.globalAlpha = ca * kt;
    c.font = L.font(30, 700, L.FONT.mono);
    c.fillStyle = L.rgba(COLD);
    const lw = c.measureText(KAL_T).width;
    c.fillText(KAL_T, x + pad, r4);
    // gauge: 12 segments, frame-stable (integer segments from the frame index)
    const gx = x + pad + lw + 30, gw = x + w - pad - gx, segs = 12, gap = 5, sw = (gw - gap * (segs - 1)) / segs;
    const f = Math.round(v.gt * 30) - Math.round(m.tension * 30);
    const lit = L.clamp(Math.floor(f / 2), 0, segs);
    for (let i = 0; i < segs; i++) {
      const on = i < lit, col = L.mix(AMBER, [255, 70, 52], i / (segs - 1));
      c.fillStyle = L.rgba(col, on ? 0.95 : 0.14);
      c.fillRect(gx + i * (sw + gap), r4 - 24, sw, 24);
    }
    if (lit >= segs) L.lightBlob(c, gx + gw - sw / 2, r4 - 12, 40, [255, 70, 52], 0.45 * (0.75 + 0.25 * Math.sin(v.gt * TAU * 0.8)));
  }
  c.restore();
}

export default {
  beat: 1,
  chapter: { num: '01', title: 'The bunker', sub: 'Soviet early-warning command' },
  layer: 2,
  cues() {
    // beat-relative only; the clock flip + KAL cues are tied to words: env.cues(tl) from env.moments
    return [{ t: 0.5, name: 'blip', gain: 0.14, pitch: 0.8 }];
  },
  drawWorld(c, v) {
    const rk = roomK(v.gt, v.tl);
    if (rk <= 0) return;
    const k = L.ease.inOutCubic(L.prog(v.gt, v.tl.scenes[1].start + 1.5, 1.8));
    c.save();
    c.globalAlpha *= rk;
    drawShadow(c, v);
    const rim = { top: 0.35 + 0.65 * k, red: Math.max(0.25 * L.clamp(lampK(v.gt, v.tl)), alarmK(v.gt, v.tl)) };
    plane(c, v, CHAIR.dz, () => drawChair(c, rim, alarmK(v.gt, v.tl) * rk));
    drawLight(c, v, k);
    c.restore();
    drawKal(c, v, rk);
  },
  drawOverlay(c, v) {
    if (v.k <= 0) return;
    const ph0 = v.tl.lines[1].phrases[0].start - v.tl.scenes[1].start;
    const ph1 = v.tl.lines[1].phrases[1].start - v.tl.scenes[1].start;
    const m = moments(v.tl), b0 = v.tl.scenes[1].start;
    const kalT = m.kal - b0;
    const early = 1 - L.ease.inCubic(L.prog(v.t, kalT - 0.6, 0.35));   // date + clock labels leave before the KAL card
    c.save();
    // ---- the date stamp, top-right HUD slot
    const kd = v.k * L.enter(v.t, ph0 + 0.35, 0.5) * early;
    if (kd > 0) {
      const e = L.ease.outCubic(L.clamp(kd));
      c.globalAlpha = kd;
      c.textBaseline = 'alphabetic';
      c.shadowColor = 'rgba(2,6,10,0.85)';
      c.shadowBlur = 12;
      c.font = L.font(60, 800, L.FONT.display);
      c.fillStyle = L.rgba(COLD);
      const bw = L.trackedText(c, '26 SEP 1983', R, 270 + (1 - e) * 12, 1, 'right');
      c.font = L.font(19, 600, L.FONT.body);
      c.fillStyle = L.rgba(AMBER, 0.95);
      const sw = L.trackedText(c, 'SERPUKHOV-15 · NEAR MOSCOW', R, 302 + (1 - e) * 8, 2.5, 'right');
      c.shadowBlur = 0;
      c.fillStyle = L.rgba(ACCENT);
      c.fillRect(R - Math.max(bw, sw) * e, 203, 70 * e, 4);
      // tick down to the ДАТА panel once it has settled under the label
      const dr = dateRect(v);
      if (dr && dr.y > 330 && dr.y < 470) {
        const kt = L.enter(v.t, 2.0, 0.4);
        const x = Math.min(R - 30, dr.cx);
        c.strokeStyle = L.rgba(AMBER, 0.7 * kt);
        c.lineWidth = 2;
        c.beginPath(); c.moveTo(x, 318); c.lineTo(x, L.lerp(318, dr.y - 6, kt)); c.stroke();
        c.fillStyle = L.rgba(AMBER, 0.9 * kt);
        c.beginPath(); c.arc(x, dr.y - 6, 3.5, 0, TAU); c.fill();
      }
    }
    // ---- the clock flip on "Just after midnight"
    const cr = clockRect(v);
    const kc = v.k * L.enter(v.t, ph1 - 0.06, 0.35) * early;
    if (cr && kc > 0) {
      const flash = Math.exp(-Math.max(0, v.t - ph1) * 3.2) * (v.t >= ph1 - 0.03 ? 1 : 0);
      if (flash > 0.01) L.lightBlob(c, cr.cx, cr.cy, cr.w * 0.9, AMBER, 0.35 * flash * v.k);
      const pad = 10 + 16 * (1 - L.ease.outBack(L.clamp(kc)));
      c.globalAlpha = kc;
      brackets(c, cr.x - pad, cr.y - pad, cr.w + 2 * pad, cr.h + 2 * pad, 16, L.rgba(AMBER, 0.95));
      // MOSCOW TIME, left column, clear of the board (x < board's left edge − 16)
      const maxW = Math.max(120, 300 - Math.max(64, cr.x));
      c.font = L.font(L.fitSize(c, 'MOSCOW TIME', maxW, 22, 700, L.FONT.body, 14), 700, L.FONT.body);
      c.fillStyle = L.rgba(AMBER);
      c.textBaseline = 'alphabetic';
      c.shadowColor = 'rgba(2,6,10,0.9)'; c.shadowBlur = 10;
      L.trackedText(c, 'MOSCOW TIME', Math.max(64, cr.x), cr.y + cr.h + 72, 3, 'left');
    }
    c.restore();
    kalCard(c, v, m);
  },
};
void W;
