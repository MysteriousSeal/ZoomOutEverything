// Beat 0 (0.00–7.40 with the v4 voice) — "In 1983, one man stopped a nuclear war | by refusing to believe a computer."
//
// HOOK. Headline 1 MAN STOPPED / A NUCLEAR WAR is on screen at full strength from FRAME 1 (overlayIn false, no fade),
// accent words in alarm red, one shared size fitted ≤ 940 px, band y 268–500.
// THE СТАРТ BOARD (drawWorld, every frame while the room exists: beats 0–2 until the match-cut): this file paints
// the finished launch-warning board ON TOP of env's placeholder, in wall metres (env.plane, dz 0), so it follows the
// pinhole camera through the hook, the crane-back (beat 1) and the push into the map (beat 2):
//   hammertone-enamel steel housing with bevel light + slotted screws · a recessed frosted-glass window lit from
//   behind by three bulbs (env.lampK: slow 0.7 Hz breathing, dark in beat 1, relit on "The alarm goes off") ·
//   "СТАРТ" burning through the red film with a white-hot core · faint diffuser scanlines + a glass sheen ·
//   an engraved ДОСТОВЕРНОСТЬ plate and the amber ВЫСОКАЯ window. Fades with env.roomK; gets env's red alarm wash.
// Phrase 1 (env.moments.tag): a teleprinter readout types in between the headline and the board (y ≈ 660):
//   COMPUTER: LAUNCH DETECTED · RELIABILITY HIGH   (typed in 0.5 s, then holds ≥ 1.6 s).
// No captions, no chapter card.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, COLD, AMBER, CYR, BOARD, plane, boardRect, boardK, lampK, alarmK, roomK } from '../env.js';

const { W } = L;
const TAU = Math.PI * 2;
const MAXW = 940, TOP = 268;
const L1 = [['1 MAN', 'acc'], [' STOPPED', 'w']];
const L2 = [['A ', 'w'], ['NUCLEAR WAR', 'acc']];
const txt = (p) => p.map((q) => q[0]).join('');
const TAG = 'COMPUTER: LAUNCH DETECTED · RELIABILITY HIGH';

// ------------------------------------------------------------------ the board (wall metres, y down)
const BX = BOARD.x, BY = BOARD.y, BW = BOARD.w, BH = BOARD.h;          // centre (0, −4.35), 2.3 × 1.1 m
const X0 = BX - BW / 2, Y0 = BY - BH / 2;
const GX = BX - 1.0, GY = BY - 0.47, GW = 2.0, GH = 0.6;                 // the СТАРТ glass (same as env)
const SY = BY + 0.2, SH = 0.22;
const PAD = 0.022;                                          // the reliability strip
// hammertone speckle (deterministic)
const SPECK = (() => { const r = L.rng(1983), out = []; for (let i = 0; i < 420; i++) out.push([X0 + r() * BW, Y0 + r() * BH, 0.004 + r() * 0.006, r()]); return out; })();

/** text in metres (inside plane()): size ≈ the font's em in metres */
function mtext(c, str, x, y, size, color, { weight = 700, track = 0, family = CYR, align = 'center' } = {}) {
  c.save();
  c.translate(x, y);
  c.scale(size / 100, size / 100);
  c.font = `${weight} 100px ${family}`;
  c.fillStyle = color;
  c.textBaseline = 'middle';
  L.trackedText(c, str, 0, 0, track, align);
  c.restore();
}
function screw(c, x, y, r, a) {
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgb(150,156,150)'); g.addColorStop(1, 'rgb(52,56,54)');
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(10,12,12,0.85)'; c.lineWidth = r * 0.28;
  c.beginPath(); c.moveTo(x - Math.cos(a) * r * 0.75, y - Math.sin(a) * r * 0.75); c.lineTo(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75); c.stroke();
}

function drawBoard(c, lit, wash, gt) {
  // ---- housing: hammertone enamel, bevel lit from above
  c.fillStyle = 'rgba(0,0,0,0.55)';                                     // contact shadow on the wall
  c.fillRect(X0 - 0.05, Y0 + 0.03, BW + 0.1, BH + 0.05);
  const hg = c.createLinearGradient(0, Y0, 0, Y0 + BH);
  hg.addColorStop(0, 'rgb(64,72,70)'); hg.addColorStop(0.08, 'rgb(46,53,52)'); hg.addColorStop(0.9, 'rgb(33,38,38)'); hg.addColorStop(1, 'rgb(20,23,23)');
  c.fillStyle = hg;
  L.roundRect(c, X0 - PAD, Y0 - PAD, BW + 2 * PAD, BH + 2 * PAD, 0.035); c.fill();   // PAD: covers env's placeholder stroke
  for (const [x, y, r, k] of SPECK) { c.fillStyle = k < 0.5 ? 'rgba(0,0,0,0.16)' : 'rgba(170,190,185,0.07)'; c.fillRect(x, y, r, r); }
  // bevel highlight (top + left) and shade (bottom + right)
  c.lineWidth = 0.012;
  c.strokeStyle = 'rgba(190,205,200,0.28)';
  c.beginPath(); c.moveTo(X0 + 0.03, Y0 + BH - 0.02); c.lineTo(X0 + 0.012, Y0 + 0.012); c.lineTo(X0 + BW - 0.03, Y0 + 0.012); c.stroke();
  c.strokeStyle = 'rgba(0,0,0,0.6)';
  c.beginPath(); c.moveTo(X0 + BW - 0.012, Y0 + 0.03); c.lineTo(X0 + BW - 0.012, Y0 + BH - 0.012); c.lineTo(X0 + 0.03, Y0 + BH - 0.012); c.stroke();
  // inner frame groove
  c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 0.008;
  L.roundRect(c, X0 + 0.055, Y0 + 0.05, BW - 0.11, BH - 0.1, 0.02); c.stroke();
  c.strokeStyle = 'rgba(160,180,175,0.08)';
  L.roundRect(c, X0 + 0.062, Y0 + 0.058, BW - 0.124, BH - 0.116, 0.02); c.stroke();
  screw(c, X0 + 0.04, Y0 + 0.04, 0.022, 0.6); screw(c, X0 + BW - 0.04, Y0 + 0.04, 0.022, 2.1);
  screw(c, X0 + 0.04, Y0 + BH - 0.04, 0.022, 1.2); screw(c, X0 + BW - 0.04, Y0 + BH - 0.04, 0.022, 0.2);

  // ---- the window: a recessed bezel, then the glass
  c.fillStyle = 'rgb(8,9,9)';
  L.roundRect(c, GX - 0.035, GY - 0.035, GW + 0.07, GH + 0.07, 0.02); c.fill();
  c.save();
  c.beginPath(); c.rect(GX, GY, GW, GH); c.clip();
  // unlit red film → lit: deep red with three bulb hot spots behind the diffuser
  const base = L.mix([38, 8, 8], [176, 20, 14], lit);
  c.fillStyle = L.rgba(base);
  c.fillRect(GX, GY, GW, GH);
  if (lit > 0.02) {
    for (const [bx, a] of [[-0.62, 0.9], [0.0, 1.0], [0.62, 0.88]]) {
      const g = c.createRadialGradient(BX + bx, GY + GH * 0.5, 0.02, BX + bx, GY + GH * 0.5, 0.62);
      g.addColorStop(0, L.rgba([255, 120, 84], 0.85 * a * lit));
      g.addColorStop(0.45, L.rgba([236, 62, 40], 0.5 * a * lit));
      g.addColorStop(1, L.rgba([200, 30, 20], 0));
      c.fillStyle = g;
      c.fillRect(GX, GY, GW, GH);
    }
  }
  // the lettering: light passes through clear letters (bloom → body → white-hot core)
  const ly = GY + GH / 2 + 0.012;
  if (lit > 0.02) {
    c.save();
    c.shadowColor = L.rgba([255, 90, 60], 0.95 * lit);
    c.shadowBlur = 46;                                                  // px (shadow is unscaled)
    mtext(c, 'СТАРТ', BX, ly, 0.47, L.rgba(L.mix([120, 30, 26], [255, 196, 170], lit)), { track: 16 });
    c.shadowColor = L.rgba([255, 200, 170], 0.8 * lit);
    c.shadowBlur = 12;
    mtext(c, 'СТАРТ', BX, ly, 0.47, L.rgba(L.mix([120, 30, 26], [255, 246, 236], lit)), { track: 16 });
    c.restore();
  } else mtext(c, 'СТАРТ', BX, ly, 0.47, 'rgb(70,22,20)', { track: 16 });
  // diffuser scanlines (subtle) + a vignette inside the recess + one diagonal glass sheen
  c.fillStyle = `rgba(0,0,0,${0.1 + 0.06 * lit})`;
  for (let yy = GY + 0.004; yy < GY + GH; yy += 0.018) c.fillRect(GX, yy, GW, 0.006);
  const ig = c.createLinearGradient(0, GY, 0, GY + GH);
  ig.addColorStop(0, 'rgba(0,0,0,0.45)'); ig.addColorStop(0.12, 'rgba(0,0,0,0)'); ig.addColorStop(0.86, 'rgba(0,0,0,0)'); ig.addColorStop(1, 'rgba(0,0,0,0.4)');
  c.fillStyle = ig; c.fillRect(GX, GY, GW, GH);
  const sg = c.createLinearGradient(GX, GY, GX + 0.9, GY + GH);
  sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.45, 'rgba(255,255,255,0.07)'); sg.addColorStop(0.55, 'rgba(255,255,255,0.0)');
  c.fillStyle = sg;
  c.beginPath(); c.moveTo(GX, GY); c.lineTo(GX + 0.8, GY); c.lineTo(GX + 0.45, GY + GH); c.lineTo(GX, GY + GH); c.closePath(); c.fill();
  c.restore();
  // bezel lip
  c.strokeStyle = 'rgba(120,130,128,0.35)'; c.lineWidth = 0.006;
  c.strokeRect(GX - 0.034, GY - 0.034, GW + 0.068, GH + 0.068);

  // ---- reliability strip: engraved plate (left) + amber lit window (right)
  const pw = 1.02;
  const pg = c.createLinearGradient(0, SY, 0, SY + SH);
  pg.addColorStop(0, 'rgb(22,24,24)'); pg.addColorStop(1, 'rgb(10,11,11)');
  c.fillStyle = pg;
  L.roundRect(c, GX, SY, pw, SH, 0.012); c.fill();
  c.strokeStyle = 'rgba(150,160,156,0.22)'; c.lineWidth = 0.005;
  L.roundRect(c, GX + 0.012, SY + 0.012, pw - 0.024, SH - 0.024, 0.008); c.stroke();
  mtext(c, 'ДОСТОВЕРНОСТЬ', GX + pw / 2, SY + SH / 2 + 0.004, 0.118, 'rgb(214,218,210)', { track: 3 });
  const ax = GX + 1.1, aw = GW - 1.1;
  c.fillStyle = 'rgb(8,9,9)';
  L.roundRect(c, ax - 0.02, SY - 0.02, aw + 0.04, SH + 0.04, 0.014); c.fill();
  const ag = c.createRadialGradient(ax + aw / 2, SY + SH / 2, 0.02, ax + aw / 2, SY + SH / 2, aw * 0.65);
  ag.addColorStop(0, L.rgba(L.mix([70, 46, 18], [255, 214, 120], lit)));
  ag.addColorStop(1, L.rgba(L.mix([44, 30, 12], [236, 150, 40], lit)));
  c.fillStyle = ag;
  c.fillRect(ax, SY, aw, SH);
  c.fillStyle = `rgba(0,0,0,${0.08 + 0.05 * lit})`;
  for (let yy = SY + 0.004; yy < SY + SH; yy += 0.018) c.fillRect(ax, yy, aw, 0.006);
  mtext(c, 'ВЫСОКАЯ', ax + aw / 2, SY + SH / 2 + 0.004, 0.135, L.rgba(L.mix([96, 72, 40], [52, 22, 6], lit)), { track: 4 });
  // two small status lamps in the housing's lower corners (steady: no strobe)
  for (const [x, col] of [[X0 + 0.1, [255, 80, 56]], [X0 + BW - 0.1, AMBER]]) {
    c.fillStyle = L.rgba(L.mix([40, 20, 16], col, lit));
    c.beginPath(); c.arc(x, SY + SH / 2, 0.022, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath(); c.arc(x - 0.007, SY + SH / 2 - 0.007, 0.007, 0, TAU); c.fill();
  }
  // env's red alarm wash, applied to this layer too (it is drawn over the board, after env)
  if (wash > 0) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = L.rgba([150, 18, 12], 0.16 * wash);
    c.fillRect(X0 - 0.04, Y0 - 0.04, BW + 0.08, BH + 0.1);
    c.restore();
  }
  void gt;
}

function line(c, parts, y) {
  let x = W / 2 - c.measureText(txt(parts)).width / 2;
  for (const [t, col] of parts) { c.fillStyle = col === 'acc' ? L.rgba(ACCENT) : L.rgba(COLD); c.fillText(t, x, y); x += c.measureText(t).width; }
}

export default {
  beat: 0,
  chapter: null,
  captions: false,
  overlayIn: false,
  layer: 5,
  cues() {
    // beat-relative only; the teleprinter's blip/tick are tied to phrase 1: env.cues(tl) from env.moments
    return [{ t: 0.0, name: 'impact', gain: 0.32, pitch: 0.7 }];
  },
  drawWorld(c, v) {
    const rk = roomK(v.gt, v.tl);
    if (rk <= 0) return;
    const br = boardRect(v);
    if (!br || br.y > L.H + 40 || br.y + br.h < -40 || br.x > W + 40 || br.x + br.w < -40) return;
    const bk = boardK(v);                 // fades before it can slide under the HUD band (the push into the map)
    if (bk <= 0) return;
    c.save();
    c.globalAlpha *= rk * bk;
    plane(c, v, 0, () => drawBoard(c, L.clamp(lampK(v.gt, v.tl)), alarmK(v.gt, v.tl) * rk, v.gt));
    c.restore();
  },
  drawOverlay(c, v) {
    if (v.k <= 0) return;
    c.save();
    c.globalAlpha = v.k;
    // ---- headline (frame 1, no fade)
    const size = Math.min(L.fitSize(c, txt(L1), MAXW, 140, 800, L.FONT.display, 50), L.fitSize(c, txt(L2), MAXW, 140, 800, L.FONT.display, 50));
    c.font = L.font(size, 800, L.FONT.display);
    c.textBaseline = 'alphabetic';
    c.shadowColor = 'rgba(0,0,0,0.8)';
    c.shadowBlur = 22;
    c.shadowOffsetY = 4;
    const b1 = TOP + size * 0.72, b2 = b1 + size * 0.98;
    line(c, L1, b1);
    line(c, L2, b2);
    c.shadowBlur = 0; c.shadowOffsetY = 0;

    // ---- phrase 1: the computer's verdict, typed like a teleprinter readout between headline and board
    const ph = v.tl.lines[0].phrases[1].start - v.tl.scenes[0].start;
    const kIn = L.enter(v.t, ph - 0.08, 0.3);
    if (kIn > 0) {
      const br = boardRect(v);
      const fs = L.fitSize(c, TAG, 760, 26, 700, L.FONT.mono, 16);
      c.font = L.font(fs, 700, L.FONT.mono);
      const tw = c.measureText(TAG).width;
      const padX = 26, bh = 58, cardW = tw + padX * 2 + 30;
      const yMid = br ? Math.min(br.y - 70, 700) : 690;
      const x0 = W / 2 - cardW / 2;
      const n = Math.min(TAG.length, Math.floor(L.clamp((v.t - ph) / 0.5) * TAG.length + 1e-6));
      c.globalAlpha = v.k * kIn;
      c.translate(0, (1 - kIn) * 10);
      // opaque card, red status block, hairline
      c.fillStyle = 'rgba(5,7,8,0.92)';
      L.roundRect(c, x0, yMid - bh / 2, cardW, bh, 6); c.fill();
      c.strokeStyle = L.rgba(ACCENT, 0.75); c.lineWidth = 1.5;
      L.roundRect(c, x0 + 0.75, yMid - bh / 2 + 0.75, cardW - 1.5, bh - 1.5, 6); c.stroke();
      const pulse = 0.6 + 0.4 * Math.sin(v.gt * TAU * 0.7);
      c.fillStyle = L.rgba(ACCENT, pulse);
      c.fillRect(x0 + 16, yMid - 9, 14, 18);
      c.fillStyle = L.rgba(COLD);
      c.textBaseline = 'middle';
      c.textAlign = 'left';
      const tx = x0 + 16 + 14 + 16;
      c.fillText(TAG.slice(0, n), tx, yMid + 1);
      if (n < TAG.length) {   // the carriage block while typing
        const cx = tx + c.measureText(TAG.slice(0, n)).width + 2;
        c.fillStyle = L.rgba(COLD, 0.8);
        c.fillRect(cx, yMid - fs * 0.45, fs * 0.55, fs * 0.9);
      }
      // a short drop line from the card to the board (the readout belongs to the panel)
      if (br) {
        const y1 = yMid + bh / 2, y2 = br.y - 6;
        if (y2 > y1 + 6) {
          c.strokeStyle = L.rgba(ACCENT, 0.6); c.lineWidth = 2;
          c.beginPath(); c.moveTo(W / 2, y1); c.lineTo(W / 2, L.lerp(y1, y2, L.ease.outCubic(L.prog(v.t, ph + 0.1, 0.35)))); c.stroke();
        }
      }
    }
    c.restore();
  },
};
