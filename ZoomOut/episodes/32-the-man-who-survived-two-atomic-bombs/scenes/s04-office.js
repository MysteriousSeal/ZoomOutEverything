// Beat 4 — "August ninth. | Bandaged, he goes back to work, | and tells his boss about the blinding flash in Hiroshima."
// Phrase 0: the calendar page 9 (env.calendar), docking into the date chip (→ 9 AUG 1945) as phrase 1 starts.
// Phrase 1: the office, told through objects (no people): a window on Nagasaki harbour with the shipyard's
// cantilever crane, a wall clock just before 11, a wall calendar on 9, the desk with a ship blueprint, a lamp, a
// telephone, and a soft gauze roll (open-weave tail) + a small first-aid tin that land on "Bandaged". Card x 80–1000, y 372–1092; its bottom strip reads
// MITSUBISHI OFFICE · NAGASAKI and, typed on "tells", TELLING HIS BOSS ABOUT HIROSHIMA.
// The wall clock never fades with the card: beat 5 lifts it off the wall into the 11:02 clock card (OFFICE_CLOCK).
import * as L from '../../../../engine/runtime/lib.js';
import { ACC, EMBER, IVORY, PAPER, INKP, MUTED, PLATE, kfont, moments, calendar, life, clockFace, txt, tw, BE } from '../env.js';

export const OFFICE = { x: 80, y: 372, w: 920, h: 720, art: 600 };
export const OFFICE_CLOCK = { x: 806, y: 498, r: 64 };
export const officeOut = (tl) => BE(tl, 4, -0.02);

/** the wall clock's minutes during beat 4: 10:58 → 10:59 */
export const officeMins = (gt, tl) => 10 * 60 + 58 + L.smoothstep(L.prog(gt, moments(tl).dock2 + 0.3, officeOut(tl) - moments(tl).dock2 - 0.3));

function hillPath(c, x0, x1, base, amp, seed, bottom) {
  const hy = (x) => base - amp * (0.5 + 0.5 * (L.noise1(x * 0.012, seed) * 0.6 + L.noise1(x * 0.031, seed + 3) * 0.3 + L.noise1(x * 0.09, seed + 7) * 0.1));
  c.beginPath();
  c.moveTo(x0, bottom);
  for (let x = x0; x < x1; x += 6) c.lineTo(x, hy(x));
  c.lineTo(x1 + 2, hy(x1));   // the ridge runs right into the window frame (no pale sliver)
  c.lineTo(x1 + 2, bottom);
  c.closePath();
}

function art(c, v) {
  const { x, y, w, art: ah } = OFFICE;
  c.save();
  L.roundRect(c, x, y, w, OFFICE.h, 22); c.clip();
  // wall
  let g = c.createLinearGradient(0, y, 0, y + ah);
  g.addColorStop(0, 'rgb(50,57,70)'); g.addColorStop(1, 'rgb(38,43,54)');
  c.fillStyle = g; c.fillRect(x, y, w, ah);
  // wainscot line
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(x, y + 452, w, 4);
  // ---- window
  const fx0 = 116, fy0 = 408, fx1 = 596, fy1 = 806, ft = 16;
  const gx0 = fx0 + ft, gy0 = fy0 + ft, gx1 = fx1 - ft, gy1 = fy1 - ft;
  c.save();
  c.beginPath(); c.rect(gx0, gy0, gx1 - gx0, gy1 - gy0); c.clip();
  g = c.createLinearGradient(0, gy0, 0, 650);
  g.addColorStop(0, 'rgb(170,190,208)'); g.addColorStop(1, 'rgb(226,218,200)');
  c.fillStyle = g; c.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
  // far hills, near hills across the harbour
  c.fillStyle = 'rgb(128,144,156)'; hillPath(c, gx0, gx1, 610, 90, 3, gy1); c.fill();
  c.fillStyle = 'rgb(92,108,120)'; hillPath(c, gx0, gx1, 652, 60, 9, gy1); c.fill();
  // water
  g = c.createLinearGradient(0, 652, 0, gy1);
  g.addColorStop(0, 'rgb(118,140,156)'); g.addColorStop(1, 'rgb(84,108,128)');
  c.fillStyle = g; c.fillRect(gx0, 652, gx1 - gx0, gy1 - 652);
  const r = L.rng(11);
  c.fillStyle = 'rgba(240,236,224,0.35)';
  for (let i = 0; i < 26; i++) {
    const yy = 662 + r() * (gy1 - 670), xx = gx0 + r() * (gx1 - gx0);
    const sh = Math.sin(v.gt * 1.3 + i) * 6;
    c.fillRect(xx + sh, yy, 12 + r() * 40, 1.5);
  }
  // the shipyard's cantilever crane on the far shore + a hull in the slip
  const ink = 'rgb(44,52,62)';
  c.fillStyle = ink; c.strokeStyle = ink;
  c.fillRect(262, 540, 14, 116);                   // tower
  c.fillRect(196, 532, 190, 12);                   // jib
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i < 9; i++) { c.moveTo(200 + i * 20, 544); c.lineTo(210 + i * 20, 532); }
  c.moveTo(269, 520); c.lineTo(206, 532); c.moveTo(269, 520); c.lineTo(380, 532);
  c.stroke();
  c.fillRect(264, 512, 10, 22);                    // king post
  c.fillRect(366, 544, 2, 40);                     // hook line
  c.beginPath(); c.moveTo(300, 664); c.lineTo(470, 664); c.lineTo(456, 680); c.lineTo(318, 680); c.closePath(); c.fill();   // hull
  c.fillRect(392, 648, 30, 16);
  // glass sheen
  g = c.createLinearGradient(gx0, gy0, gx1, gy1);
  g.addColorStop(0, 'rgba(255,255,255,0.0)'); g.addColorStop(0.45, 'rgba(255,255,255,0.07)'); g.addColorStop(0.5, 'rgba(255,255,255,0.0)');
  c.fillStyle = g; c.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
  c.restore();
  // frame + muntins
  c.fillStyle = 'rgb(72,56,42)';
  c.fillRect(fx0, fy0, fx1 - fx0, ft); c.fillRect(fx0, fy1 - ft, fx1 - fx0, ft);
  c.fillRect(fx0, fy0, ft, fy1 - fy0); c.fillRect(fx1 - ft, fy0, ft, fy1 - fy0);
  c.fillRect(gx0 + (gx1 - gx0) / 3 - 4, gy0, 8, gy1 - gy0); c.fillRect(gx0 + (2 * (gx1 - gx0)) / 3 - 4, gy0, 8, gy1 - gy0);
  c.fillRect(gx0, (gy0 + gy1) / 2 - 4, gx1 - gx0, 8);
  c.fillStyle = 'rgb(86,68,52)'; c.fillRect(fx0 - 14, fy1, fx1 - fx0 + 28, 14);   // sill
  // ---- wall calendar (on 9)
  const cx0 = 760, cy0 = 600, cw = 96, ch = 116;
  c.fillStyle = L.rgba(PAPER); L.roundRect(c, cx0, cy0, cw, ch, 6); c.fill();
  c.fillStyle = L.rgba(EMBER); c.fillRect(cx0, cy0, cw, 30);
  txt(c, 'AUG', cx0 + cw / 2, cy0 + 16, L.font(20, 800, L.FONT.display), IVORY, { track: 3, align: 'center', base: 'middle' });
  txt(c, '9', cx0 + cw / 2, cy0 + 30 + 43, L.font(64, 800, L.FONT.display), INKP, { align: 'center', base: 'middle' });
  // ---- desk
  const dy0 = 852, dy1 = y + ah;
  g = c.createLinearGradient(0, dy0, 0, dy1);
  g.addColorStop(0, 'rgb(92,70,52)'); g.addColorStop(1, 'rgb(62,46,34)');
  c.fillStyle = g; c.fillRect(x, dy0, w, dy1 - dy0);
  c.fillStyle = 'rgba(255,230,190,0.18)'; c.fillRect(x, dy0, w, 3);
  c.strokeStyle = 'rgba(30,20,12,0.25)'; c.lineWidth = 1;
  for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(x, dy0 + 16 + i * 18); c.bezierCurveTo(x + 300, dy0 + 10 + i * 18, x + 600, dy0 + 24 + i * 18, x + w, dy0 + 14 + i * 18); c.stroke(); }
  // window light on the desk
  c.fillStyle = 'rgba(255,236,200,0.07)';
  c.beginPath(); c.moveTo(150, dy0); c.lineTo(560, dy0); c.lineTo(690, dy1); c.lineTo(240, dy1); c.closePath(); c.fill();
  // blueprint (a ship's lines)
  c.save();
  c.translate(470, 912); c.rotate(-0.05);
  c.fillStyle = 'rgb(42,82,132)'; c.fillRect(-160, -46, 320, 92);
  c.strokeStyle = 'rgba(230,240,255,0.18)'; c.lineWidth = 1;
  for (let i = -150; i <= 150; i += 20) { c.beginPath(); c.moveTo(i, -46); c.lineTo(i, 46); c.stroke(); }
  c.strokeStyle = 'rgba(236,244,255,0.85)'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(-130, -14); c.lineTo(120, -14); c.quadraticCurveTo(142, -12, 134, 4); c.quadraticCurveTo(110, 26, -100, 24); c.quadraticCurveTo(-132, 18, -130, -14); c.stroke();
  c.beginPath(); c.moveTo(-60, -14); c.lineTo(-60, -30); c.lineTo(0, -30); c.lineTo(0, -14); c.stroke();
  c.beginPath(); c.moveTo(-130, 4); c.lineTo(134, 4); c.stroke();
  c.restore();
  // desk lamp (left)
  c.fillStyle = 'rgb(28,32,30)'; c.strokeStyle = 'rgb(28,32,30)'; c.lineWidth = 7; c.lineCap = 'round';
  c.beginPath(); c.ellipse(190, 902, 40, 11, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(190, 896); c.lineTo(176, 830); c.lineTo(250, 800); c.stroke();
  c.beginPath(); c.moveTo(232, 792); c.lineTo(300, 806); c.lineTo(286, 838); c.lineTo(226, 812); c.closePath(); c.fill();
  L.lightBlob(c, 284, 840, 90, [255, 214, 150], 0.35);
  // telephone (right)
  c.fillStyle = 'rgb(20,20,22)';
  c.beginPath(); c.moveTo(800, 930); c.lineTo(910, 930); c.lineTo(896, 886); c.lineTo(814, 886); c.closePath(); c.fill();
  L.roundRect(c, 796, 864, 118, 22, 10); c.fill();
  c.fillStyle = 'rgb(46,46,50)'; c.beginPath(); c.arc(855, 910, 16, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgb(200,196,186)'; c.beginPath(); c.arc(855, 910, 5, 0, Math.PI * 2); c.fill();
  // the bandage lands on "Bandaged": a soft, loosely wound gauze roll with an open-weave tail, and a small first-aid tin
  const bk = L.ease.outBack(L.prog(v.gt, moments(v.tl).bandaged + 0.1, 0.45), 1.4);
  if (bk > 0) {
    c.save();
    c.globalAlpha *= L.clamp(bk * 3);
    c.translate(0, (1 - L.clamp(bk)) * -40);
    gauze(c);
    aidTin(c, 212, 944);
    c.restore();
  }
  c.restore();
}

/** gauze: a soft roll seen three-quarter (cylinder, loosely wound end face, a faint mesh) and its tail lying FLAT on
 *  the desk: a thin translucent band (foreshortened), a fine low-contrast open mesh, a loose frayed end */
function gauze(c) {
  const rx = 684, ry = 930;
  c.save();
  // ---- the tail: flat band from under the roll to the right, edges slightly irregular
  const top = (t) => [L.lerp(rx - 6, 806, t), L.lerp(ry + 12, ry + 21, t) - 3 * Math.sin(t * Math.PI) + 1.2 * Math.sin(t * 23)];
  const bot = (t) => [L.lerp(rx - 6, 812, t), L.lerp(ry + 18, ry + 32, t) - 2 * Math.sin(t * Math.PI) + 1.0 * Math.sin(t * 19 + 1)];
  const band = () => {
    c.beginPath();
    for (let i = 0; i <= 24; i++) { const [x, y] = top(i / 24); i ? c.lineTo(x, y) : c.moveTo(x, y); }
    for (let i = 24; i >= 0; i--) { const [x, y] = bot(i / 24); c.lineTo(x, y); }
    c.closePath();
  };
  c.save(); c.translate(1, 3); band(); c.fillStyle = 'rgba(20,12,6,0.22)'; c.fill(); c.restore();
  band(); c.fillStyle = 'rgba(240,236,226,0.72)'; c.fill();
  c.save();
  band(); c.clip();
  // a soft fold highlight along the band
  c.strokeStyle = 'rgba(255,255,250,0.35)'; c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i <= 24; i++) { const t = i / 24, [x0, y0] = top(t), [, y1] = bot(t); const y = L.lerp(y0, y1, 0.4); i ? c.lineTo(x0 + 2, y) : c.moveTo(x0 + 2, y); }
  c.stroke();
  // open mesh: a fine square grid at very low contrast (reads as weave, not as ruler ticks)
  c.strokeStyle = 'rgba(140,128,108,0.16)'; c.lineWidth = 0.6;
  for (let k = -40; k < 160; k += 3.2) { c.beginPath(); c.moveTo(rx + k, ry + 6); c.lineTo(rx + k + 26, ry + 46); c.stroke(); }
  for (let k = -40; k < 160; k += 3.2) { c.beginPath(); c.moveTo(rx + k + 26, ry + 6); c.lineTo(rx + k, ry + 46); c.stroke(); }
  c.restore();
  // frayed end: a few loose threads
  c.strokeStyle = 'rgba(240,236,226,0.6)'; c.lineWidth = 0.8;
  for (const [y0, dx, dy] of [[ry + 22, 9, -2], [ry + 25, 11, 0], [ry + 29, 8, 3], [ry + 32, 6, 4]]) {
    c.beginPath(); c.moveTo(808, y0); c.quadraticCurveTo(812 + dx / 2, y0 + dy / 2 - 1, 808 + dx, y0 + dy); c.stroke();
  }
  // ---- the roll: body (cream, lit from the window on the left) + end face with loosely wound turns
  c.fillStyle = 'rgba(20,12,6,0.3)'; c.beginPath(); c.ellipse(rx - 14, ry + 21, 28, 5, 0, 0, Math.PI * 2); c.fill();
  const g = c.createLinearGradient(rx - 30, 0, rx + 2, 0);
  g.addColorStop(0, 'rgb(244,240,230)'); g.addColorStop(1, 'rgb(210,203,188)');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(rx - 28, ry - 18); c.lineTo(rx, ry - 18); c.lineTo(rx, ry + 18); c.lineTo(rx - 28, ry + 18);
  c.ellipse(rx - 28, ry, 9, 18, 0, Math.PI / 2, Math.PI * 1.5); c.closePath(); c.fill();
  c.save();
  c.clip();
  c.strokeStyle = 'rgba(150,138,118,0.14)'; c.lineWidth = 0.6;   // faint mesh on the body
  for (let k = -60; k < 40; k += 3.2) { c.beginPath(); c.moveTo(rx + k, ry - 20); c.lineTo(rx + k + 40, ry + 20); c.stroke(); c.beginPath(); c.moveTo(rx + k + 40, ry - 20); c.lineTo(rx + k, ry + 20); c.stroke(); }
  c.restore();
  c.fillStyle = 'rgb(240,236,226)';
  c.beginPath(); c.ellipse(rx, ry, 9, 18, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(170,160,140,0.5)'; c.lineWidth = 0.8;
  for (const [a2, b2, ox] of [[7.4, 15.2, 0.2], [5.8, 12, 0.5], [4.4, 8.8, 0.3]]) { c.beginPath(); c.ellipse(rx + ox, ry + 0.3, a2, b2, 0, 0, Math.PI * 2); c.stroke(); }
  c.fillStyle = 'rgba(120,108,90,0.5)'; c.beginPath(); c.ellipse(rx + 0.6, ry + 0.5, 2.2, 4.6, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}

/** a small enamel first-aid tin with a red cross on the lid */
function aidTin(c, x, y) {
  c.save();
  c.fillStyle = 'rgba(20,12,6,0.3)'; c.beginPath(); c.ellipse(x + 4, y + 22, 50, 7, 0, 0, Math.PI * 2); c.fill();
  // body
  c.fillStyle = 'rgb(206,204,196)'; L.roundRect(c, x - 46, y - 4, 92, 26, 4); c.fill();
  c.fillStyle = 'rgba(0,0,0,0.14)'; c.fillRect(x - 46, y + 12, 92, 10);
  // lid (seen slightly from above)
  c.fillStyle = 'rgb(232,230,222)'; L.roundRect(c, x - 48, y - 22, 96, 22, 5); c.fill();
  c.strokeStyle = 'rgba(90,86,78,0.5)'; c.lineWidth = 1.2; L.roundRect(c, x - 48, y - 22, 96, 22, 5); c.stroke();
  c.fillStyle = 'rgb(196,40,36)';
  c.fillRect(x - 4, y - 19, 8, 16); c.fillRect(x - 11, y - 15, 22, 8);
  c.restore();
}

export default {
  beat: 4,
  chapter: null,
  captions: true,
  overlayIn: false,
  layer: 5,
  drawOverlay(c, v) {
    const tl = v.tl, m = moments(tl), gt = v.gt;
    calendar(c, v, { day: '9', tIn: W9(m), tStamp: W9(m) + 0.45, tDock: m.dock2 });
    const tOut = officeOut(tl);
    const lf = life(gt, m.dock2 + 0.3, tOut, { s0: 0.96, dur: 0.25, slide: 0, cLead: 0, cDur: 0.25 });
    // the art: IN WITH the plate at full alpha (an empty dark plate reads as a dark frame), and out ≈ 0.2 s BEFORE
    // the plate (contents first, then the plate)
    const artK = 1 - L.ease.inOutCubic(L.prog(gt, tOut - 0.34, 0.2));
    if (!lf.on) return;
    const { x, y, w, h, art: ah } = OFFICE;
    c.save();
    c.translate(x + w / 2, y + h / 2 + lf.dy); c.scale(lf.s, lf.s); c.translate(-(x + w / 2), -(y + h / 2));
    c.save();
    c.globalAlpha *= lf.a;
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 40; c.shadowOffsetY = 10;
    c.fillStyle = L.rgba(PLATE); L.roundRect(c, x, y, w, h, 22); c.fill();
    c.shadowColor = 'transparent';
    c.globalAlpha *= artK;
    art(c, v);
    c.restore();
    // strip text
    c.save();
    c.globalAlpha *= lf.ck * lf.a;
    c.fillStyle = L.rgba(ACC); c.fillRect(x, y + ah, w, 3);
    const k1 = 'MITSUBISHI OFFICE · NAGASAKI';
    txt(c, k1, x + 44, y + ah + 40, L.font(24, 700, L.FONT.body), MUTED, { track: 5 });
    txt(c, '長崎', x + 44 + tw(c, k1, L.font(24, 700, L.FONT.body), 5) + 14, y + ah + 39, kfont(23, 600), IVORY, { alpha: 0.7 });
    const line = [['TELLING HIS BOSS ABOUT ', IVORY], ['HIROSHIMA', ACC]];
    const full = line.map((q) => q[0]).join('');
    const fs = L.fitSize(c, full, w - 88, 48, 800, L.FONT.display, 30);
    const n = Math.floor(full.length * L.clamp((gt - (m.tells - 0.04)) / 0.6));
    if (n > 0) {
      let xx = x + 44, left = n;
      for (const [t, col] of line) {
        const part = t.slice(0, Math.max(0, left)); left -= t.length;
        if (!part) break;
        xx += txt(c, part, xx, y + ah + 88, L.font(fs, 800, L.FONT.display), col);
      }
    }
    c.restore();
    c.restore();
    // the wall clock: never fades with the card (beat 5 lifts it off the wall); it rides the entrance only
    const ck = OFFICE_CLOCK;
    c.save();
    if (gt < tOut - 0.5) { c.translate(x + w / 2, y + h / 2 + lf.dy); c.scale(lf.s, lf.s); c.translate(-(x + w / 2), -(y + h / 2)); }
    c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 14; c.shadowOffsetY = 4;
    c.fillStyle = L.rgba(PAPER); c.beginPath(); c.arc(ck.x, ck.y, ck.r, 0, Math.PI * 2); c.fill();
    c.shadowColor = 'transparent';
    clockFace(c, ck.x, ck.y, ck.r, 10, officeMins(gt, tl) - 600);
    c.restore();
  },
};
/** the 9 lands on "ninth" */
function W9(m) { return m.august9 + 0.15; }
