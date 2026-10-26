// Beat 0 — "If a nuclear bomb goes off near you, | you have about ten minutes to save your life. | Here's exactly what to do."
// Times (current 60.06 s timeline, beat 0.00–8.26). No captions, no chapter, overlayIn false: frame 1 is complete.
//   0.00        headline YOU HAVE / 10 MINUTES (accent; one shared size fitted ≤ 900 px; band y 268–≈525) and a
//               civil-defence countdown plate (black, yellow keyline, hazard foot; x ≈ 300–780, y 566–762) reading
//               10:00 in DIN, ticking whole seconds (env countdownAt, frame-stable; the colon never moves: digits are
//               tabular and the string is anchored on the colon, placed so m:ss sits centred). A fine seconds-sweep hairline under the digits.
//   phrase 2 (6.07) kicker: four mini STEP tiles 1–4 pop in (60 ms stagger) + HERE'S EXACTLY WHAT TO DO wipes in
//               (y ≈ 800–850): tees up the STEP badges of beats 1–6.
//   d − 0.92 (7.34) the headline lifts away (0.32 s) so the flight crosses clean sky; the kicker stays to the end.
//   The clock holds 10:00 until the flash (env countdownAt); the plate breathes and its scan line idles. The string is
//   centred on the plate.
//   d − 0.78 → d − 0.14 (7.48 → 8.12) the plate travels + shrinks with the digits (fading) into env's HUD readout spot
//               (COUNT_HUD, 64 px, right-aligned); they hold there at full strength (ignoring the overlay fade) so
//               s01 + env's HUD take over without a dip. Headline + kicker leave with the overlay fade (last 0.3 s).
import * as L from '../../../../engine/runtime/lib.js';
import { countdownAt, fmtClock, TEXT, CD, COUNT_HUD } from '../env.js';

const { W } = L;
const TAU = Math.PI * 2;
const MAXW = 900, TOP = 268;
const L1 = 'YOU HAVE', L2 = '10 MINUTES';
const PLATE = { cx: W / 2, y: 566, h: 212, w: 480 };   // the countdown string is centred on cx
const DIG = 178;                 // countdown digit size (DIN Condensed; tabular digits 0.372 em, colon 0.186 em)
const ph = (v, j) => v.tl.lines[v.index].phrases[j].start - v.tl.scenes[v.index].start;

/** countdown string drawn right-aligned at (rx, by), size sz (the env HUD's exact glyph setup) */
function clock(c, str, rx, by, sz, alpha) {
  c.save();
  c.globalAlpha = alpha;
  c.textAlign = 'right';
  c.textBaseline = 'alphabetic';
  c.shadowColor = 'rgba(2,6,14,0.8)';
  c.shadowBlur = 14 * Math.max(1, sz / 64) ** 0.5;
  c.font = L.font(sz, 700, L.FONT.din);
  c.fillStyle = L.rgba(TEXT);
  c.fillText(str, rx, by);
  c.restore();
}

/** a mini STEP tile (the badge tile at small scale) */
function miniTile(c, x, y, s, n, k) {
  if (k <= 0) return;
  const p = L.ease.outBack(L.clamp(k), 2.2);
  c.save();
  c.translate(x + s / 2, y + s / 2);
  c.scale(Math.max(0.001, p), Math.max(0.001, p));
  c.globalAlpha *= L.clamp(k * 3);
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 10; c.shadowOffsetY = 3;
  c.fillStyle = L.rgba(CD.yellow);
  L.roundRect(c, -s / 2, -s / 2, s, s, s * 0.12); c.fill();
  c.shadowColor = 'transparent';
  c.fillStyle = L.rgba(CD.ink);
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.font = L.font(Math.round(s * 0.17), 700, L.FONT.body);
  L.trackedText(c, 'STEP', 0, -s / 2 + s * 0.27, s * 0.035, 'center');
  c.font = L.font(Math.round(s * 0.62), 700, L.FONT.din);
  c.fillText(String(n), 0, s / 2 - s * 0.12);
  c.restore();
}

export default {
  beat: 0,
  chapter: null,
  captions: false,
  overlayIn: false,
  layer: 5,
  cues(d) {
    return [
      { t: 0.0, name: 'impact', gain: 0.3, pitch: 0.7 },
      { t: 6.0, name: 'blip', gain: 0.16, pitch: 1.0 },
      { t: 6.06, name: 'blip', gain: 0.14, pitch: 1.12 },
      { t: 6.12, name: 'blip', gain: 0.14, pitch: 1.24 },
      { t: 6.18, name: 'blip', gain: 0.14, pitch: 1.36 },
      { t: d - 0.78, name: 'swish', gain: 0.16, pitch: 1.2 },
    ];
  },
  drawOverlay(c, v) {
    const d = v.d;
    c.save();
    c.globalAlpha = v.k;
    c.textBaseline = 'alphabetic';
    // ---- headline (static from frame 1)
    const size = Math.min(L.fitSize(c, L1, MAXW, 150, 800, L.FONT.display, 60), L.fitSize(c, L2, MAXW, 150, 800, L.FONT.display, 60));
    const b1 = TOP + size * 0.72, b2 = b1 + size * 0.98;
    // the headline steps aside just before the countdown flies through its band (voice is on the kicker by then)
    const hOut = L.ease.inCubic(L.prog(v.t, d - 0.92, 0.32));
    c.save();
    c.globalAlpha *= 1 - hOut;
    c.translate(0, -16 * hOut);
    c.textAlign = 'center';
    c.shadowColor = 'rgba(0,0,0,0.65)';
    c.shadowBlur = 22;
    c.font = L.font(size, 800, L.FONT.display);
    c.fillStyle = L.rgba(TEXT);
    c.fillText(L1, W / 2, b1);
    c.fillStyle = L.rgba(v.accent);
    c.fillText(L2, W / 2, b2);
    c.restore();

    // ---- countdown plate + digits. The clock holds 10:00 until the flash (env countdownAt); the plate breathes and its
    //      sweep line idles. On the dock the plate travels and shrinks WITH the digits (never an empty box) and fades
    //      out as they land in the HUD slot. Flight timing is frame-quantised (0.25 of the sub-frame spread kept), so the
    //      digits keep only a trace of motion blur.
    const tq0 = Math.round(v.gt * 30) / 30 - v.tl.scenes[v.index].start, tq = tq0 + 0.25 * (v.t - tq0);
    const dock = L.ease.inOutCubic(L.prog(tq, d - 0.78, 0.64));
    const str = fmtClock(countdownAt(v.gt, v.tl));
    c.font = L.font(DIG, 700, L.FONT.din);
    const cw = c.measureText(str).width;
    const { cx, y, h } = PLATE, base = y + 146;
    const sz = L.lerp(DIG, 64, dock), sc = sz / DIG;
    const rx = L.lerp(cx + cw / 2, COUNT_HUD.x, dock), by = L.lerp(base, COUNT_HUD.y, dock);
    const pa = 1 - L.smoothstep(L.prog(dock, 0.3, 0.55));
    if (pa > 0) {
      const breathe = 0.5 + 0.5 * Math.sin(v.gt * 2.2);
      const pw = PLATE.w * sc, ph2 = h * sc, x0 = rx - (cw / 2) * sc - pw / 2, py = by - 146 * sc;
      c.save();
      c.globalAlpha *= pa;
      c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 30 * sc; c.shadowOffsetY = 8 * sc;
      c.fillStyle = L.rgba(CD.black, 0.93);
      L.roundRect(c, x0, py, pw, ph2, 14 * sc); c.fill();
      c.shadowColor = 'transparent';
      c.strokeStyle = L.rgba(CD.yellow, 0.38 + 0.3 * breathe); c.lineWidth = 1.5;
      L.roundRect(c, x0 + 8 * sc, py + 8 * sc, pw - 16 * sc, ph2 - 16 * sc, 9 * sc); c.stroke();
      // hazard foot
      const fy = py + ph2 - 16 * sc, fh = 7 * sc;
      c.save();
      c.beginPath(); c.rect(x0 + 18 * sc, fy, pw - 36 * sc, fh); c.clip();
      c.fillStyle = L.rgba(CD.yellow, 0.92); c.fillRect(x0, fy, pw, fh);
      c.fillStyle = L.rgba(CD.black);
      c.beginPath();
      for (let sx = x0; sx < x0 + pw + fh; sx += 22 * sc) { c.moveTo(sx, fy + fh); c.lineTo(sx + 11 * sc, fy + fh); c.lineTo(sx + 11 * sc + fh, fy); c.lineTo(sx + fh, fy); c.closePath(); }
      c.fill();
      c.restore();
      // idle scan: a hairline with a bright head gliding back and forth (frame-stable: from gt)
      const ph = ((Math.round(v.gt * 30) / 30) / 2.4) % 1, sweep = L.ease.inOutCubic(ph < 0.5 ? ph * 2 : 2 - ph * 2);
      const lx0 = x0 + 44 * sc, lx1 = x0 + pw - 44 * sc, ly = py + ph2 - 40 * sc;
      c.fillStyle = 'rgba(238,236,230,0.16)';
      c.fillRect(lx0, ly, lx1 - lx0, 2 * sc);
      const hx = L.lerp(lx0, lx1, sweep), dir = ph < 0.5 ? 1 : -1, tail = 90 * sc;
      const g = c.createLinearGradient(hx - dir * tail, 0, hx, 0);
      g.addColorStop(0, 'rgba(255,204,0,0)'); g.addColorStop(1, 'rgba(255,204,0,0.85)');
      c.fillStyle = g;
      const a0 = L.clamp(hx - dir * tail, lx0, lx1);
      c.fillRect(Math.min(a0, hx), ly, Math.abs(hx - a0), 2 * sc);
      c.restore();
    }
    // the overlay fade is ignored once docked: s01 holds the same glyphs until env's HUD readout is fully in
    const a = L.lerp(v.k, 1, dock);
    c.restore();
    clock(c, str, rx, by, sz, a);

    // ---- kicker on phrase 2: four mini STEP tiles + HERE'S EXACTLY WHAT TO DO
    const p2 = ph(v, 2);
    c.save();
    c.globalAlpha = v.k;
    const TS = 62, TG = 10, txt = "HERE'S EXACTLY WHAT TO DO";
    c.letterSpacing = '3px';
    const ks = L.fitSize(c, txt, 900 - (4 * TS + 3 * TG + 22) - 20, 40, 700, L.FONT.body, 26);
    c.letterSpacing = '0px';
    c.font = L.font(ks, 700, L.FONT.body);
    c.letterSpacing = '3px';
    const tw = c.measureText(txt).width - 3;
    c.letterSpacing = '0px';
    const rowW = 4 * TS + 3 * TG + 22 + tw;
    const rx0 = W / 2 - rowW / 2, ry = 800;
    for (let i = 0; i < 4; i++) miniTile(c, rx0 + i * (TS + TG), ry, TS, i + 1, L.prog(v.t, p2 - 0.08 + i * 0.06, 0.4));
    const wk = L.ease.outCubic(L.prog(v.t, p2 + 0.12, 0.5));
    if (wk > 0) {
      // the pill grows out of the tiles with rounded ends; the text is clipped to it (never runs past its edge)
      const tx = rx0 + 4 * TS + 3 * TG + 22, ph = TS - 8, pw = Math.max(ph, (tw + 26) * wk);
      c.save();
      L.roundRect(c, tx - 12, ry + 4, pw, ph, 8);
      c.fillStyle = 'rgba(8,8,12,0.62)';
      c.fill();
      c.clip();
      c.fillStyle = L.rgba(TEXT);
      c.textBaseline = 'middle';
      L.trackedText(c, txt, tx + (1 - wk) * -14, ry + TS / 2 + 2, 3);
      c.restore();
    }
    c.restore();
  },
};
