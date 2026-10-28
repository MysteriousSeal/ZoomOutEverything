// Beat 5 — "By day eleven, his speech slurs | and his memory fails. | Yet he still beats a Stanford sleep scientist at pinball."
// DAY counts 04 → 11 on "eleven" (env); the figure is slumped. Phrases 0–1, stage right: a speech bubble whose crisp
// waveform smears into a slow, blurred line on "slurs", then crumbles into drifting dots on "fails". Tags SPEECH
// SLURRED (letters wander) and MEMORY FAILING (letters fade out). Phrase 2: a clean pinball machine (side view: cabinet,
// legs, lit backbox) slides in; Randy's hands go to the flipper buttons (env "play" pose). Lower zone: a HUD scoreboard
// — LAST NIGHT · PINBALL; RANDY GARDNER vs W. DEMENT · STANFORD SLEEP SCIENTIST — two score bars race (no invented
// scores), Randy's pulls ahead and lands on "beats", then a WINS chip.
import * as L from '../../../../engine/runtime/lib.js';
import { VIOLET, PAPER, INKP, TEXT, GREYT, GROUND, B, BE, PH, Wd, inWorld, tag, win, figureHead, exitK, collapse, seg7 } from '../env.js';

const TAU = Math.PI * 2;
const SB = { x: 500, y: 520, w: 470, h: 230 };

function speech(c, gt, tl, k, ex) {
  if (k <= 0 || ex.u >= 1) return;
  const head = figureHead(tl, gt);
  const slur = L.ease.inOutCubic(L.prog(gt, Wd(tl, 'slurs', -0.15), 0.8));
  const crumble = L.ease.inOutCubic(L.prog(gt, Wd(tl, 'fails', -0.2), 1.0));
  const e = L.ease.outBack(L.clamp(k), 1.4);
  c.save();
  c.globalAlpha *= L.clamp(k * 3);
  const { x, y, w, h } = SB;
  c.translate(x, y + h); c.scale(e, e); c.translate(-x, -(y + h));
  collapse(c, x + w / 2, y + h / 2, ex.pk);
  const a0 = c.globalAlpha;
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 26; c.shadowOffsetY = 8;
  c.fillStyle = L.rgba(PAPER);
  L.roundRect(c, x, y, w, h, 40); c.fill();
  // tail toward the mouth side of the head
  c.beginPath(); c.moveTo(x + 40, y + h - 30); c.lineTo(head.x + 48, head.y - 6); c.lineTo(x + 110, y + h - 2); c.closePath(); c.fill();
  c.shadowColor = 'transparent';
  // waveform: 36 bars of a speech-like envelope; slurred = smoothed, lower, stretched, soft-edged
  const n = 36, cx0 = x + 40, cw = w - 80, cy = y + h / 2;
  const amp = (i, t) => {
    const env = 0.25 + 0.75 * Math.abs(Math.sin(i * 0.55 + 0.3)) * (0.6 + 0.4 * Math.sin(i * 1.7 + 1.1));
    return env * (0.85 + 0.15 * Math.sin(t * 9 + i * 1.3));
  };
  const crisp = Array.from({ length: n }, (_, i) => amp(i, gt));
  const smooth = crisp.map((_, i) => { let s = 0, ws = 0; for (let j = -4; j <= 4; j++) { const q = crisp[Math.min(n - 1, Math.max(0, i + j))]; const wt = 5 - Math.abs(j); s += q * wt; ws += wt; } return s / ws * 0.6; });
  c.globalAlpha = a0 * ex.ca;
  if (slur > 0.01) c.filter = `blur(${(slur * 2.2).toFixed(2)}px)`;
  const r = L.rng(51);
  for (let i = 0; i < n; i++) {
    const a = L.lerp(crisp[i], smooth[i], slur) * 78;
    const bw = L.lerp(cw / n * 0.55, cw / n * 1.05, slur);
    let bx = cx0 + (i + 0.5) * cw / n - bw / 2 + slur * Math.sin(gt * 2 + i * 0.4) * 4;
    let by = cy - a, bh = a * 2;
    // crumble: bars break into dots that drift down and fade
    const rr = r(), rd = r();
    const ck = L.clamp((crumble - rr * 0.6) / 0.4);
    c.fillStyle = L.rgba(L.mix(INKP, VIOLET, 0.35));
    if (ck <= 0) { L.roundRect(c, bx, by, bw, bh, bw / 2); c.fill(); }
    else {
      c.globalAlpha = a0 * ex.ca * (1 - ck * 0.85);
      for (let d = 0; d < 3; d++) {
        const dy = (d - 1) * a * 0.6 + ck * (20 + rd * 40) * (d + 1) * 0.5;
        c.beginPath(); c.arc(bx + bw / 2 + Math.sin(i + d) * ck * 10, cy + dy, Math.max(0, bw * 0.45), 0, TAU); c.fill();
      }
      c.globalAlpha = a0 * ex.ca;
    }
  }
  c.filter = 'none';
  c.restore();
}
/** pinball machine in a ¾ view from the player's side: the near side panel and the front face, the playfield seen from
 *  above (a trapezoid: two flippers, three pop bumpers, the ball in play), legs to the floor, and at the back a backbox
 *  whose front backglass (art + score window) faces the player. Randy's hands rest ON the near flipper button. */
const PB = { F: { x: 392, y: 825 }, U: { x: 432, y: -40 }, Wf: { x: -118, y: -74 }, wb: 0.8, Hc: 96, Hb: 236 };
function pbP(u, w) {
  const s = L.lerp(1, PB.wb, u);
  return { x: PB.F.x + PB.U.x * u + PB.Wf.x * s * w, y: PB.F.y + PB.U.y * u + PB.Wf.y * s * w };
}
export const PB_BUTTON = (() => { const p = pbP(0.035, 0); return { x: p.x, y: p.y + 24 }; })();
function quad(c, pts) { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); }
const dn = (p, d) => ({ x: p.x, y: p.y + d });
/** run fn in the playfield's local frame at (u, w): x = along the table (px), y = across (px) */
function local(c, u, w, fn) {
  const p = pbP(u, w), s = L.lerp(1, PB.wb, u), ul = Math.hypot(PB.U.x, PB.U.y), wl = Math.hypot(PB.Wf.x, PB.Wf.y) * s;
  c.save();
  c.transform(PB.U.x / ul, PB.U.y / ul, PB.Wf.x * s / wl, PB.Wf.y * s / wl, p.x, p.y);
  fn(c, ul, wl);
  c.restore();
}
function pinball(c, gt, tl, ka, ex) {
  if (ka <= 0 || ex.u >= 1) return;
  const slide = (1 - L.ease.outCubic(L.clamp(ka))) * 80;
  c.save();
  c.translate(slide, 0);
  collapse(c, 620, 860, ex.pk);
  const a0 = c.globalAlpha;
  const { Hc, Hb } = PB;
  const F0 = pbP(0, 0), F1 = pbP(0, 1), B0 = pbP(1, 0), B1 = pbP(1, 1);
  const G = GROUND;
  // far legs first (they stand further back on the floor), then the near ones
  c.fillStyle = 'rgb(30,34,58)';
  for (const [p, gy] of [[pbP(0.04, 0.92), G + PB.Wf.y * 0.92], [pbP(0.92, 0.92), G + PB.Wf.y * PB.wb * 0.92]]) {
    c.fillRect(p.x - 8, p.y + Hc - 6, 16, gy - p.y - Hc + 6); c.fillRect(p.x - 14, gy - 6, 28, 6);
  }
  // front face (toward the player): darker, a coin door
  c.fillStyle = 'rgb(38,42,74)';
  quad(c, [F0, F1, dn(F1, Hc), dn(F0, Hc)]); c.fill();
  {
    const m = pbP(0, 0.5), s = 1;
    c.save();
    c.transform(PB.Wf.x / Math.hypot(PB.Wf.x, PB.Wf.y), PB.Wf.y / Math.hypot(PB.Wf.x, PB.Wf.y), 0, 1, m.x, m.y);
    c.fillStyle = 'rgb(28,31,56)'; c.fillRect(-26 * s, 28, 52, 52);
    c.fillStyle = L.rgba(VIOLET, 0.8); c.fillRect(-14, 40, 8, 14); c.fillRect(6, 40, 8, 14);
    c.restore();
  }
  // near side panel: cabinet blue, violet art stripe, the flipper button
  c.fillStyle = 'rgb(54,60,100)';
  quad(c, [F0, B0, dn(B0, Hc), dn(F0, Hc)]); c.fill();
  c.fillStyle = L.rgba(VIOLET, 0.7);
  quad(c, [dn(pbP(0.06, 0), 40), dn(pbP(0.94, 0), 40), dn(pbP(0.94, 0), 52), dn(pbP(0.06, 0), 52)]); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.10)';
  quad(c, [F0, B0, dn(B0, 5), dn(F0, 5)]); c.fill();
  // near legs
  c.fillStyle = 'rgb(40,45,74)';
  for (const u of [0.04, 0.93]) { const p = pbP(u, 0); c.fillRect(p.x - 9, p.y + Hc - 6, 18, G - p.y - Hc + 6); c.fillRect(p.x - 16, G - 6, 32, 6); }
  // playfield (glass top): dark violet field, rails, lanes
  const pg = c.createLinearGradient(F0.x, F0.y, B1.x, B1.y);
  pg.addColorStop(0, 'rgb(44,30,92)'); pg.addColorStop(1, 'rgb(26,22,60)');
  c.fillStyle = pg;
  quad(c, [F0, B0, B1, F1]); c.fill();
  c.strokeStyle = 'rgb(88,96,140)'; c.lineWidth = 4; c.lineJoin = 'round';
  quad(c, [F0, B0, B1, F1]); c.stroke();
  // contents (lights, bumpers, flippers, ball) fade first on the way out
  c.globalAlpha = a0 * ex.ca;
  // lane guides near the flippers (inlanes)
  c.strokeStyle = 'rgba(220,210,255,0.55)'; c.lineWidth = 2.5;
  for (const [w0, w1] of [[0.08, 0.27], [0.92, 0.73]]) { const a = pbP(0.44, w0), b = pbP(0.31, w1); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
  // pop bumpers: little lit cylinders (flattened in perspective)
  const pulse = (i) => 0.5 + 0.5 * Math.max(0, Math.sin(gt * 7 - i * 2.1));
  [[0.6, 0.3], [0.6, 0.7], [0.76, 0.5]].forEach(([u, w], i) => {
    local(c, u, w, (g) => {
      g.fillStyle = 'rgb(16,14,36)'; g.beginPath(); g.ellipse(0, 0, 17, 15, 0, 0, TAU); g.fill();
    });
    const p = pbP(u, w);
    c.fillStyle = 'rgb(70,60,130)'; c.fillRect(p.x - 13, p.y - 12, 26, 12);
    c.save(); c.translate(0, -12);
    local(c, u, w, (g) => {
      g.fillStyle = L.rgba(L.mix(VIOLET, [255, 230, 170], 0.5 * pulse(i)));
      g.beginPath(); g.ellipse(0, 0, 16, 14, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(0, 0, 6, 5, 0, 0, TAU); g.fill();
    });
    c.restore();
    L.lightBlob(c, p.x, p.y - 12, 46, VIOLET, 0.2 * pulse(i));
  });
  // flippers: two paper-white bats near the front, pivots at the lane ends, tips toward the centre drain
  const flip = Math.max(0, Math.sin(gt * 5.2)) ** 6;   // a quick flick now and then
  [[0.3, 0.27, -1], [0.3, 0.73, 1]].forEach(([u, w, sd], i) => {
    local(c, u, w, (g) => {
      const ang = sd * (0.55 - 0.9 * (i ? flip : Math.max(0, Math.sin(gt * 5.2 + 1.7)) ** 6));
      g.rotate(Math.PI + ang);
      g.fillStyle = L.rgba(PAPER);
      g.beginPath(); g.arc(0, 0, 11, Math.PI / 2, -Math.PI / 2, true); g.lineTo(40, -5.5); g.arc(40, 0, 5.5, -Math.PI / 2, Math.PI / 2); g.closePath(); g.fill();
      g.fillStyle = L.rgba(VIOLET); g.beginPath(); g.arc(0, 0, 3.5, 0, TAU); g.fill();
    });
  });
  // the ball: a steel ball rolling around the bumpers (deterministic path)
  const bu = 0.44 + 0.2 * Math.sin(gt * 2.3), bw = 0.5 + 0.32 * Math.sin(gt * 3.1 + 0.6);
  const bp = pbP(bu, bw);
  const bg = c.createRadialGradient(bp.x - 3, bp.y - 10, 1, bp.x, bp.y - 7, 9);
  bg.addColorStop(0, 'rgb(255,255,255)'); bg.addColorStop(1, 'rgb(150,156,180)');
  c.fillStyle = bg; c.beginPath(); c.arc(bp.x, bp.y - 7, 8, 0, TAU); c.fill();
  // chase lights along the near rail
  for (let i = 0; i < 9; i++) {
    const p = pbP((i + 0.5) / 9, 0);
    const on = 0.35 + 0.65 * Math.max(0, Math.sin(gt * 9 - i * 0.9));
    c.fillStyle = L.rgba(L.mix([255, 220, 160], VIOLET, i % 2 ? 0.7 : 0), on);
    c.beginPath(); c.arc(p.x, p.y + 20, 4, 0, TAU); c.fill();
  }
  c.globalAlpha = a0;
  // the flipper button on the near side (Randy's hand rests on it)
  c.fillStyle = L.rgba(VIOLET);
  L.roundRect(c, PB_BUTTON.x - 7, PB_BUTTON.y - 10, 14, 20, 4); c.fill();
  // backbox: stands on the back end (u 0.9 … 1.02); near side, top, then the backglass facing the player
  const u0 = 0.9, u1 = 1.0;
  const b00 = pbP(u0, 0), b01 = pbP(u0, 1), b10 = pbP(u1, 0), b11 = pbP(u1, 1);
  const up = (p) => dn(p, -Hb);
  c.fillStyle = 'rgb(40,45,80)';
  quad(c, [b00, b10, up(b10), up(b00)]); c.fill();                  // near side
  c.fillStyle = 'rgb(62,68,110)';
  quad(c, [up(b00), up(b10), up(b11), up(b01)]); c.fill();          // top
  c.fillStyle = 'rgb(30,34,62)';
  quad(c, [b00, b01, up(b01), up(b00)]); c.fill();                  // front frame
  // the backglass in the front face's own frame: x across (near → far), y up the glass
  const wl = Math.hypot(PB.Wf.x, PB.Wf.y) * L.lerp(1, PB.wb, u0);
  c.save();
  c.transform((b01.x - b00.x) / wl, (b01.y - b00.y) / wl, 0, 1, b00.x, b00.y);
  const gw = wl, top = -Hb;
  const art = c.createLinearGradient(0, top, 0, 0);
  art.addColorStop(0, 'rgb(120,80,220)'); art.addColorStop(1, 'rgb(46,30,96)');
  c.fillStyle = art; c.fillRect(8, top + 8, gw - 16, Hb - 30);
  c.globalAlpha = a0 * ex.ca;
  // art: a crescent moon and stars (a night theme), lit
  const pls = 0.6 + 0.4 * Math.sin(gt * 5);
  c.fillStyle = L.rgba([255, 236, 190], 0.9);
  c.beginPath(); c.arc(gw * 0.5, top + 130, 26, 0, TAU); c.fill();
  c.fillStyle = 'rgb(78,52,150)'; c.beginPath(); c.arc(gw * 0.5 + 12, top + 122, 22, 0, TAU); c.fill();
  c.fillStyle = L.rgba([255, 236, 190], pls);
  for (const [sx, sy] of [[0.22, 168], [0.78, 176], [0.3, 100], [0.75, 92]]) { c.beginPath(); c.arc(gw * sx, top + sy, 3, 0, TAU); c.fill(); }
  // score window: an LED panel in attract mode (one segment chasing around each digit — no score is claimed)
  c.fillStyle = 'rgb(8,8,18)'; c.fillRect(14, top + 20, gw - 28, 46);
  const segs = ['A', 'B', 'C', 'D', 'E', 'F'], ph = Math.floor(gt * 10) % 6;
  for (let i = 0; i < 3; i++) {
    const dx = 22 + i * ((gw - 44) / 3), dw = (gw - 44) / 3 - 8;
    seg7(c, dx, top + 26, dw, 34, 5, ' ', { on: [255, 190, 90], ghost: 0.14, glow: 0 });
    // the chasing lit segment, drawn as its own digit mask
    seg7(c, dx, top + 26, dw, 34, 5, segs[(ph + i) % 6], { on: [255, 190, 90], ghost: 0, glow: 0.6 });
  }
  c.restore();
  c.globalAlpha = a0;
  L.lightBlob(c, (b00.x + b01.x) / 2, (b00.y + b01.y) / 2 - Hb * 0.55, 150, VIOLET, 0.16 * (0.6 + 0.4 * Math.sin(gt * 5)) * ex.ca);
  c.restore();
}

export default {
  beat: 5,
  chapter: null,
  captions: true,
  layer: 2,
  drawWorld(c, v) {
    const tl = v.tl, gt = v.gt;
    const p2 = PH(tl, 5, 2);
    // speech bubble in at B5 (the thought bubble is gone by B5 − 0.05); out by p2 − 0.32; the machine slides in right
    // after (p2 − 0.3) and leaves before the clock flies to centre stage (B6 − 0.12)
    const sk = L.prog(gt, B(tl, 5, -0.18), 0.3), sex = exitK(gt, p2 - 0.32, 0.3);
    const pk = L.prog(gt, p2 - 0.3, 0.5), pex = exitK(gt, B(tl, 6, -0.13), 0.3);
    inWorld(c, v, (g) => {
      speech(g, gt, tl, sk, sex);
      pinball(g, gt, tl, pk, pex);
    });
  },
  drawOverlay(c, v) {
    const tl = v.tl, gt = v.gt;
    const p2 = PH(tl, 5, 2);
    const tout = p2 - 0.3;
    const drift = L.ease.inOutCubic(L.prog(gt, Wd(tl, 'slurs', 0), 1.0));
    const fade = L.ease.inOutCubic(L.prog(gt, Wd(tl, 'fails', -0.1), 1.0));
    tag(c, 'SPEECH SLURRED', 300, 1215, { maxW: 430, k: L.prog(gt, Wd(tl, 'slurs', -0.15), 0.4), out: exitK(gt, tout + 0.2, 0.3), size: 42, rot: -0.02, drift, gt, kicker: 'DAY 11 · SPEECH', seed: 11 });
    tag(c, 'MEMORY FAILING', 740, 1215, { maxW: 400, k: L.prog(gt, Wd(tl, 'memory', -0.15), 0.4), out: exitK(gt, tout + 0.26, 0.3), size: 42, rot: 0.018, fade, gt, kicker: 'DAY 11 · MEMORY', seed: 12 });
    // scoreboard (HUD style): from "Yet"
    const sk = L.prog(gt, Wd(tl, 'yet', 0.15), 0.4);
    const sx = exitK(gt, BE(tl, 5, -0.02), 0.3);
    if (sk <= 0 || sx.u >= 1) return;
    const x = 90, y = 1110, w = 900, h = 250;
    c.save();
    const e = L.ease.outCubic(L.clamp(sk));
    c.translate(0, (1 - e) * 20);
    collapse(c, x + w / 2, y + h / 2, sx.pk);
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 24; c.shadowOffsetY = 8;
    c.fillStyle = 'rgb(17,21,42)';
    L.roundRect(c, x, y, w, h, 18); c.fill();
    c.shadowColor = 'transparent';
    c.strokeStyle = L.rgba(VIOLET, 0.35); c.lineWidth = 1.5;
    L.roundRect(c, x, y, w, h, 18); c.stroke();
    c.globalAlpha *= L.clamp(sk * 2.5) * sx.ca;
    c.textBaseline = 'alphabetic';
    c.font = L.font(22, 700, L.FONT.body);
    c.fillStyle = L.rgba(GREYT);
    L.trackedText(c, 'NEAR THE END  ·  PINBALL', x + 36, y + 46, 4);
    // bars race from "Yet" to "beats": Randy's ends ahead
    const t0 = Wd(tl, 'yet', 0.2), t1 = Wd(tl, 'beats');
    const u = L.clamp((gt - t0) / (t1 - t0));
    const rows = [
      { name: 'RANDY GARDNER', sub: 'AWAKE 11 DAYS', col: VIOLET, fin: 1.0, wob: 0.06 },
      { name: 'W. DEMENT', sub: 'STANFORD SLEEP SCIENTIST', col: [150, 160, 190], fin: 0.8, wob: -0.05 },
    ];
    const bx0 = x + 36, bw = w - 72 - 190;
    rows.forEach((r, i) => {
      const ry = y + 98 + i * 82;
      c.font = L.font(30, 800, L.FONT.display);
      c.fillStyle = L.rgba(TEXT);
      c.fillText(r.name, bx0, ry);
      const nw = c.measureText(r.name).width;
      c.font = L.font(22, 700, L.FONT.body);
      c.fillStyle = L.rgba(GREYT);
      L.trackedText(c, '·  ' + r.sub, bx0 + nw + 14, ry - 2, 2.5);
      // the bar (eased, with a little back-and-forth lead change mid-race)
      const p = L.ease.outCubic(u) * r.fin + Math.sin(Math.PI * u) * r.wob;
      c.fillStyle = 'rgba(255,255,255,0.07)';
      L.roundRect(c, bx0, ry + 14, bw, 16, 8); c.fill();
      c.fillStyle = L.rgba(r.col, i ? 0.8 : 1);
      L.roundRect(c, bx0, ry + 14, Math.max(16, bw * L.clamp(p)), 16, 8); c.fill();
    });
    // WINS chip on Randy's row
    const wk = L.prog(gt, Wd(tl, 'beats', 0.05), 0.35);
    if (wk > 0) {
      const e2 = L.ease.outBack(L.clamp(wk), 2.2);
      const cx = 862, cy = y + 98 + 22;   // chip x 802–922: inside the x ≤ 940 safe zone
      c.save();
      c.translate(cx, cy); c.scale(e2, e2);
      c.fillStyle = L.rgba(VIOLET);
      L.roundRect(c, -60, -24, 120, 48, 24); c.fill();
      c.fillStyle = 'rgb(16,10,30)';
      c.font = L.font(30, 800, L.FONT.display);
      c.textAlign = 'center';
      c.fillText('WINS', 0, 11);
      c.restore();
      L.lightBlob(c, cx, cy, 120, VIOLET, 0.25 * (1 - L.clamp(wk * 1.5 - 0.5)));
    }
    c.restore();
  },
};
