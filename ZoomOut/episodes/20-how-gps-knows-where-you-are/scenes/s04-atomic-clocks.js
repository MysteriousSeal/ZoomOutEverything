// Beat 4 — "They carry atomic clocks on board."
// The camera dives from the planet into satellite B. The GPS III-style model (gold-foil bus, white radiator, two
// blue solar wings, the Earth-facing L-band helix array) takes over from env's glint as modelK rises, tilted 14° so
// its antenna points at the Earth's centre (honest nadir pointing). A magnifier lens opens off the bus: three
// rubidium clocks whose cells flash together on every second, over a crisp atomic-time readout.
//
// SHARED (act II, group 20B; also usable by s14):
//   drawSatellite(ctx, v, x, y, scale, opts)  the detailed model. x, y = SCREEN px of the bus centre, scale = px per
//                                              metre, opts {alpha, rot (rad, default B's nadir tilt), t (seconds)}.
//   satNadirRot                                B's tilt (rad): its antenna faces the Earth's centre.
//   antennaPoint(v)                            screen point of B's antenna face (the broadcast source) at any scale.
//   clockAt(gt, tl)                            atomic time of day (s) = 14:03:27.000 000 000 on "…the exact TIME".
//   fmtClock(sec, ns)                          'HH:MM:SS.mmm uuu nnn' pieces.
//   drawReadout(ctx, o)                        the gold time readout (tabular DIN digits, corner brackets, lock).
//   wordT(tl, line, phrase, word)              beat-local start of a VO word (same weighting as the captions).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, CLOCK, SAT_B, modelK, beatStart, phrase, R_EARTH } from '../env.js';

const { W } = L;
const DEG = Math.PI / 180;

// ====================================================================== shared helpers
/** Beat-local start time of word `w` in phrase `p` of line `li` (mirrors the caption timing in main.js). */
export function wordT(tl, li, p, w) {
  const ln = tl.lines[li], ph = ln.phrases ? ln.phrases[p] : ln;
  const words = ph.text.toUpperCase().split(/\s+/);
  const wt = words.map((x) => x.replace(/\W/g, '').length + 1.5 + (/[,.?!:]$/.test(x) ? 3 : 0));
  const tot = wt.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < w; i++) acc += wt[i];
  return ph.start + (ph.end - ph.start) * acc / tot - tl.scenes[li].start;
}

/** B's tilt: its antenna (local +y) points at the Earth's centre. */
export const satNadirRot = Math.atan2(SAT_B.x, R_EARTH - SAT_B.y);   // ≈ −14°: rotate(a) maps local +y onto the nadir

/** The atomic time of day, seconds: 14:03:27.000 000 000 exactly when the VO says "time" in beat 5. */
export function clockAt(gt, tl) {
  const t0 = beatStart(tl, 5) + wordT(tl, 5, 1, 3);
  return 14 * 3600 + 3 * 60 + 27 + (gt - t0);
}
/** Clock pieces: hh:mm:ss and the fraction as three groups of three digits. The frame index picks honest-looking
 *  sub-millisecond digits (a real readout is sampled, never .033 333 333), constant across motion-blur sub-frames. */
export function fmtClock(sec, gt) {
  const f = Math.floor(gt * 30 + 1e-6);
  const s = Math.floor(sec), frac = sec - s;
  const ms = Math.floor(frac * 1000);
  const r = L.rng(f * 7919 + 13);
  const us = Math.floor(r() * 1000), ns = Math.floor(r() * 1000);
  const p2 = (n) => String(n).padStart(2, '0'), p3 = (n) => String(n).padStart(3, '0');
  const hh = Math.floor(s / 3600) % 24, mm = Math.floor(s / 60) % 60, ss = s % 60;
  return { hms: `${p2(hh)}:${p2(mm)}:${p2(ss)}`, ms: p3(ms), us: p3(us), ns: p3(ns) };
}

/**
 * The house time readout: tabular DIN digits in clock gold, a small tracked label under it, corner brackets that
 * snap tight on lock, a dark soft backing. o = {x, y (baseline), text, label, label2, swap (0..1 label → label2),
 * k, lock (seconds since lock, <0 = running), align, size, color}.
 */
export function drawReadout(ctx, o) {
  const { x, y, text, label = '', label2 = null, swap = 0, k = 1, lock = -1, align = 'left', size = 96, color = CLOCK } = o;
  if (k <= 0.001) return;
  const ke = L.ease.outCubic(L.clamp(k));
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.font = L.font(size, 700, L.FONT.din);
  const cell = ctx.measureText('0').width;
  const cw = (ch) => (/[0-9]/.test(ch) ? cell : ctx.measureText(ch).width);
  const tw = [...text].reduce((a, ch) => a + cw(ch), 0);
  const x0 = align === 'right' ? x - tw : align === 'center' ? x - tw / 2 : x;
  const top = y - size * 0.72, bot = y + 8;
  // backing
  ctx.globalAlpha = ke;
  const bx = x0 + tw / 2, byc = y - size * 0.1, br = Math.max(220, tw * 0.85);
  const bg = ctx.createRadialGradient(bx, byc, 10, bx, byc, br);
  bg.addColorStop(0, 'rgba(2,4,10,0.6)'); bg.addColorStop(0.6, 'rgba(2,4,10,0.3)'); bg.addColorStop(1, 'rgba(2,4,10,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(bx - br, byc - br, br * 2, br * 2);
  const locked = lock >= 0;
  if (locked && lock < 1.4) L.lightBlob(ctx, bx, y - size * 0.35, tw * 0.75 + 70, color, 0.3 * Math.exp(-lock * 3) * ke);
  // brackets
  const snap = locked ? L.ease.outBack(L.prog(lock, 0, 0.4), 2.4) : 0;
  const pad = L.lerp(30, 20, snap) + (1 - ke) * 22, bl = 18;
  const bx0 = x0 - pad, bx1 = x0 + tw + pad, by0 = top - pad * 0.7, by1 = bot + pad * 0.4;
  ctx.strokeStyle = locked ? L.rgba(L.mix([235, 235, 235], color, Math.min(1, lock * 5)), 0.9) : 'rgba(225,230,240,0.4)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (const [cx, cy, sx, sy] of [[bx0, by0, 1, 1], [bx1, by0, -1, 1], [bx0, by1, 1, -1], [bx1, by1, -1, -1]]) {
    ctx.moveTo(cx + sx * bl, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * bl);
  }
  ctx.stroke();
  // digits (tabular), rising in
  const bump = locked ? 1 + 0.06 * Math.exp(-lock * 6) * Math.sin(Math.min(lock, 0.5) * 18) : 1;
  ctx.save();
  ctx.translate(x0 + tw / 2, y - size * 0.35 + (1 - ke) * 24);
  ctx.scale(bump, bump);
  ctx.translate(-(x0 + tw / 2), -(y - size * 0.35));
  ctx.font = L.font(size, 700, L.FONT.din);
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 14;
  ctx.fillStyle = L.rgba(locked ? L.mix([255, 255, 255], color, Math.min(1, lock * 3)) : color);
  ctx.textAlign = 'left';
  let cx = x0;
  for (const ch of text) { const w = cw(ch); ctx.fillText(ch, cx + (w - ctx.measureText(ch).width) / 2, y); cx += w; }
  ctx.restore();
  // label(s)
  ctx.font = L.font(24, 600, L.FONT.body);
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 8;
  const ly = y + 46 + (1 - ke) * 14;
  const lx = align === 'right' ? x : align === 'center' ? x : x0;
  if (label) {
    ctx.globalAlpha = ke * (1 - L.clamp(swap * 2));
    ctx.fillStyle = 'rgba(205,215,230,0.95)';
    L.trackedText(ctx, label.toUpperCase(), lx, ly, 3, align);
  }
  if (label2 && swap > 0) {
    ctx.globalAlpha = ke * L.clamp(swap * 2 - 1);
    ctx.fillStyle = 'rgba(205,215,230,0.95)';
    L.trackedText(ctx, label2.toUpperCase(), lx, ly + (1 - L.clamp(swap * 2 - 1)) * 10, 3, align);
  }
  ctx.restore();
}

// ====================================================================== the satellite model
// Local metres, origin at the bus centre, +y = toward the Earth (nadir). Fixed foil crinkles (seeded, never random).
const FOIL = (() => {
  const r = L.rng(404), out = [];
  for (let i = 0; i < 90; i++) {
    const x = L.lerp(-0.4, 1.0, r()), y = L.lerp(-1.2, 1.0, r());
    const w = L.lerp(0.08, 0.26, r()), h = L.lerp(0.06, 0.22, r()), sk = L.lerp(-0.1, 0.1, r());
    out.push({ x, y, w, h, sk, tone: r() * 2 - 1 });
  }
  return out;
})();
const HELIX = [-0.84, -0.5, -0.17, 0.17, 0.5, 0.84];

function wing(c, side, t, lod) {
  // yoke + 3 hinged panels, x from 1.05 to 4.0 (mirrored by side)
  c.save();
  c.scale(side, 1);
  c.strokeStyle = 'rgba(190,198,210,0.95)'; c.lineWidth = 0.05;
  c.beginPath(); c.moveTo(1.0, -0.05); c.lineTo(1.62, -0.05); c.stroke();
  c.fillStyle = '#9aa3b0';
  c.fillRect(1.55, -0.16, 0.1, 0.22);
  const P0 = 1.68, PW = 0.74, gap = 0.05, y0 = -0.72, y1 = 0.62;
  for (let p = 0; p < 3; p++) {
    const x0 = P0 + p * (PW + gap);
    // cell field
    const g = c.createLinearGradient(x0, y0, x0 + PW * 0.6, y1);
    g.addColorStop(0, '#24407e'); g.addColorStop(0.55, '#162a5c'); g.addColorStop(1, '#0d1a3e');
    c.fillStyle = g;
    c.fillRect(x0, y0, PW, y1 - y0);
    if (lod > 1) {
      c.strokeStyle = 'rgba(120,160,230,0.28)'; c.lineWidth = 0.012;
      c.beginPath();
      for (let i = 1; i < 4; i++) { c.moveTo(x0 + (PW * i) / 4, y0); c.lineTo(x0 + (PW * i) / 4, y1); }
      for (let j = 1; j < 7; j++) { c.moveTo(x0, y0 + ((y1 - y0) * j) / 7); c.lineTo(x0 + PW, y0 + ((y1 - y0) * j) / 7); }
      c.stroke();
    }
    // a slow specular sweep (the wing catching the Sun)
    const sp = ((t * 0.18 + p * 0.09) % 1.6) - 0.3;
    const sx = L.lerp(P0 - 0.5, P0 + 3 * PW + 0.5, sp);
    const sg = c.createLinearGradient(sx - 0.5, y0, sx + 0.5, y1);
    sg.addColorStop(0, 'rgba(160,200,255,0)'); sg.addColorStop(0.5, 'rgba(170,210,255,0.22)'); sg.addColorStop(1, 'rgba(160,200,255,0)');
    c.fillStyle = sg;
    c.fillRect(x0, y0, PW, y1 - y0);
    // frame
    c.strokeStyle = 'rgba(200,210,225,0.85)'; c.lineWidth = 0.025;
    c.strokeRect(x0, y0, PW, y1 - y0);
  }
  c.restore();
}

/**
 * The detailed GPS III-style satellite. x, y = screen px of the bus centre; scale = px per metre.
 * opts: alpha, rot (rad; default satNadirRot), t (seconds, for the specular sweep).
 */
export function drawSatellite(ctx, v, x, y, scale, { alpha = 1, rot = satNadirRot, t = v.gt } = {}) {
  if (alpha <= 0.002 || scale <= 0) return;
  const span = 8 * scale;
  if (x < -span || x > W + span || y < -span || y > L.H + span) return;
  const lod = span < 60 ? 0 : span < 200 ? 1 : 2;
  const c = ctx;
  c.save();
  c.globalAlpha *= alpha;
  // soft cool bloom behind the model (it is lit by a hard Sun, deep space around it)
  L.lightBlob(c, x, y, span * 0.65, [150, 175, 230], 0.12);
  c.translate(x, y);
  c.rotate(rot);
  c.scale(scale, scale);
  c.lineJoin = 'round';
  wing(c, -1, t, lod);
  wing(c, 1, t, lod);
  // ---- bus: top face, side face (depth), front face
  c.fillStyle = '#e8c878';
  c.beginPath(); c.moveTo(-1.0, -1.15); c.lineTo(1.0, -1.15); c.lineTo(1.38, -1.42); c.lineTo(-0.62, -1.42); c.closePath(); c.fill();
  const sg = c.createLinearGradient(1.0, 0, 1.38, 0);
  sg.addColorStop(0, '#7a5a22'); sg.addColorStop(1, '#4f3a16');
  c.fillStyle = sg;
  c.beginPath(); c.moveTo(1.0, -1.15); c.lineTo(1.38, -1.42); c.lineTo(1.38, 0.73); c.lineTo(1.0, 1.0); c.closePath(); c.fill();
  const fg = c.createLinearGradient(-1.0, -1.15, 1.0, 1.0);
  fg.addColorStop(0, '#f2cf7c'); fg.addColorStop(0.45, '#c9963e'); fg.addColorStop(1, '#8a6024');
  c.fillStyle = fg;
  c.fillRect(-1.0, -1.15, 2.0, 2.15);
  if (lod > 0) {
    // foil crinkles: bright and dark facets, clipped to the face
    c.save();
    c.beginPath(); c.rect(-1.0, -1.15, 2.0, 2.15); c.clip();
    for (const f of FOIL) {
      c.fillStyle = f.tone > 0 ? `rgba(255,240,190,${0.16 * f.tone})` : `rgba(80,45,10,${-0.2 * f.tone})`;
      c.beginPath();
      c.moveTo(f.x, f.y); c.lineTo(f.x + f.w, f.y + f.sk); c.lineTo(f.x + f.w * 0.3, f.y + f.h);
      c.closePath(); c.fill();
    }
    // a broad specular band across the foil
    const hb = c.createLinearGradient(-0.6, -1.15, 1.0, 1.0);
    hb.addColorStop(0, 'rgba(255,245,210,0)'); hb.addColorStop(0.32, 'rgba(255,245,210,0.28)'); hb.addColorStop(0.42, 'rgba(255,245,210,0)');
    hb.addColorStop(0.7, 'rgba(255,230,170,0)'); hb.addColorStop(0.78, 'rgba(255,230,170,0.14)'); hb.addColorStop(0.86, 'rgba(255,230,170,0)');
    c.fillStyle = hb; c.fillRect(-1.0, -1.15, 2.0, 2.15);
    c.restore();
    // white radiator (OSR mirror tiles) on the left of the face
    const rg = c.createLinearGradient(-0.95, -1.05, -0.35, 0.9);
    rg.addColorStop(0, '#eef2f6'); rg.addColorStop(1, '#a8b2c0');
    c.fillStyle = rg;
    c.fillRect(-0.92, -1.05, 0.58, 1.95);
    if (lod > 1) {
      c.strokeStyle = 'rgba(80,95,120,0.35)'; c.lineWidth = 0.01;
      c.beginPath();
      for (let j = 1; j < 9; j++) { c.moveTo(-0.92, -1.05 + j * 0.2167); c.lineTo(-0.34, -1.05 + j * 0.2167); }
      c.moveTo(-0.63, -1.05); c.lineTo(-0.63, 0.9);
      c.stroke();
    }
    // seams + rim light along the top/right edges (Sun upper right)
    c.strokeStyle = 'rgba(90,60,20,0.5)'; c.lineWidth = 0.015;
    c.beginPath(); c.moveTo(-0.3, -0.2); c.lineTo(1.0, -0.2); c.moveTo(-0.3, 0.45); c.lineTo(1.0, 0.45); c.stroke();
    c.strokeStyle = 'rgba(255,245,215,0.85)'; c.lineWidth = 0.03;
    c.beginPath(); c.moveTo(-0.62, -1.42); c.lineTo(1.38, -1.42); c.lineTo(1.38, 0.73); c.stroke();
  }
  // ---- top: crosslink dish + whip
  c.fillStyle = '#d9dee6';
  c.beginPath(); c.ellipse(-0.25, -1.55, 0.36, 0.11, 0, 0, Math.PI); c.fill();
  c.fillRect(-0.28, -1.5, 0.06, 0.1);
  c.strokeStyle = '#c9ced8'; c.lineWidth = 0.035;
  c.beginPath(); c.moveTo(0.75, -1.3); c.lineTo(0.75, -2.05); c.stroke();
  // ---- the Earth-facing L-band array: a plate and two rows of helices (back row darker, offset for depth)
  c.fillStyle = '#3a404c';
  c.fillRect(-1.05, 1.0, 2.25, 0.16);
  if (lod > 0) {
    for (const row of [1, 0]) {
      for (const hx of HELIX) {
        const xx = hx + row * 0.16, len = row ? 0.38 : 0.48, yy = 1.16 - row * 0.02;
        const hg = c.createLinearGradient(xx - 0.06, 0, xx + 0.06, 0);
        hg.addColorStop(0, row ? '#7b818c' : '#d8dde6'); hg.addColorStop(1, row ? '#555b66' : '#9aa1ad');
        c.fillStyle = hg;
        c.fillRect(xx - 0.055, yy, 0.11, len);
        if (lod > 1) {
          c.strokeStyle = row ? 'rgba(40,44,52,0.6)' : 'rgba(70,76,88,0.7)'; c.lineWidth = 0.012;
          c.beginPath();
          for (let s = 0.06; s < len; s += 0.075) { c.moveTo(xx - 0.055, yy + s); c.lineTo(xx + 0.055, yy + s + 0.04); }
          c.stroke();
        }
      }
    }
  } else {
    c.fillStyle = '#b8bec8';
    c.fillRect(-0.9, 1.16, 1.9, 0.42);
  }
  c.restore();
}

/** Screen point of B's antenna face (the broadcast source), at any camera scale. */
export function antennaPoint(v) {
  const x = v.wx(SAT_B.x), y = v.wy(SAT_B.y), s = v.ws(1);
  const d = 1.6 * s;
  return { x: x - Math.sin(satNadirRot) * d, y: y + Math.cos(satNadirRot) * d };
}

// ====================================================================== the clock lens
const LENS = { dx: 3.2, dy: -5.3, r: 3.0 };   // metres, in the bus frame (un-rotated), lens radius
function drawLens(ctx, v, k) {
  if (k <= 0.001) return;
  const s = v.ws(1);
  const bx = v.wx(SAT_B.x), by = v.wy(SAT_B.y);
  const cx = bx + LENS.dx * s, cy = by + LENS.dy * s;
  const R = LENS.r * s * L.ease.outBack(L.clamp(k * 1.15), 1.4);
  if (R < 8) return;
  const ke = L.clamp(k * 1.5);
  ctx.save();
  // leader from the bus to the lens
  const ax = bx + 0.75 * s, ay = by - 1.05 * s;
  const ang = Math.atan2(ay - cy, ax - cx);
  const ex = cx + Math.cos(ang) * R, ey = cy + Math.sin(ang) * R;
  const lk = L.ease.outCubic(L.clamp(k * 1.6));
  ctx.strokeStyle = `rgba(225,232,245,${0.6 * ke})`; ctx.lineWidth = 2;
  ctx.setLineDash([4, 5]);
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(L.lerp(ax, ex, lk), L.lerp(ay, ey, lk)); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = `rgba(255,230,170,${0.9 * ke})`;
  ctx.beginPath(); ctx.arc(ax, ay, 4, 0, Math.PI * 2); ctx.fill();
  // glass
  ctx.save();
  ctx.globalAlpha *= ke;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, R), 0, Math.PI * 2);
  const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.4, R * 0.1, cx, cy, R);
  g.addColorStop(0, '#16233c'); g.addColorStop(1, '#070b16');
  ctx.fillStyle = g; ctx.fill();
  ctx.clip();
  const u = R / 150;                         // lens design units: 150 = the radius
  // faint engineering grid
  ctx.strokeStyle = 'rgba(140,170,220,0.08)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = -6; i <= 6; i++) { ctx.moveTo(cx + i * 25 * u, cy - R); ctx.lineTo(cx + i * 25 * u, cy + R); ctx.moveTo(cx - R, cy + i * 25 * u); ctx.lineTo(cx + R, cy + i * 25 * u); }
  ctx.stroke();
  // three rubidium clocks, cells flashing together on every atomic second
  const sec = clockAt(v.gt, v.tl), frac = sec - Math.floor(sec);
  const flash = Math.exp(-frac * 7);
  for (let i = 0; i < 3; i++) {
    const ck = L.ease.outBack(L.clamp(k * 1.6 - i * 0.08), 1.6);   // in step with the glass (ke)
    if (ck <= 0) continue;
    const mx = cx + (i - 1) * 82 * u, my = cy - 34 * u + (1 - ck) * 30 * u;
    const mw = 70 * u, mh = 84 * u;
    ctx.save();
    ctx.globalAlpha *= L.clamp(ck);
    // module body
    const mg = ctx.createLinearGradient(mx - mw / 2, my - mh / 2, mx + mw / 2, my + mh / 2);
    mg.addColorStop(0, '#5b6474'); mg.addColorStop(1, '#262c38');
    ctx.fillStyle = mg;
    L.roundRect(ctx, mx - mw / 2, my - mh / 2, mw, mh, 6 * u); ctx.fill();
    ctx.strokeStyle = 'rgba(220,228,240,0.35)'; ctx.lineWidth = 1.2;
    L.roundRect(ctx, mx - mw / 2, my - mh / 2, mw, mh, 6 * u); ctx.stroke();
    // the glass cell + lamp
    const cr = 17 * u, cyy = my - 10 * u;
    L.lightBlob(ctx, mx, cyy, cr * (2.6 + 1.6 * flash), CLOCK, 0.35 + 0.5 * flash);
    const cg = ctx.createRadialGradient(mx - cr * 0.3, cyy - cr * 0.3, 1, mx, cyy, cr);
    cg.addColorStop(0, L.rgba(L.mix([255, 200, 120], [255, 250, 235], flash)));
    cg.addColorStop(1, L.rgba(L.mix([150, 80, 30], [255, 190, 110], flash)));
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(mx, cyy, Math.max(0, cr), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,210,0.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(mx, cyy, Math.max(0, cr + 4 * u), 0, Math.PI * 2); ctx.stroke();
    // tiny tag
    ctx.fillStyle = 'rgba(225,232,245,0.85)';
    ctx.font = L.font(Math.max(8, 15 * u), 700, L.FONT.din);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('Rb', mx, my + 33 * u);
    ctx.restore();
  }
  // the shared readout inside the lens
  const rk = L.clamp(k * 1.6 - 0.15);
  if (rk > 0) {
    const c = fmtClock(sec, v.gt);
    ctx.globalAlpha *= rk;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = L.font(Math.max(8, 34 * u), 700, L.FONT.din);
    ctx.fillStyle = L.rgba(CLOCK);
    ctx.fillText(`${c.hms}.${c.ms} ${c.us}`, cx, cy + 66 * u);
    ctx.font = L.font(Math.max(6, 13 * u), 600, L.FONT.body);
    ctx.fillStyle = 'rgba(200,210,225,0.8)';
    L.trackedText(ctx, 'ATOMIC TIME', cx, cy + 92 * u, 2.5 * u, 'center');
  }
  ctx.restore();
  // rim: a crisp ring with a glint
  ctx.strokeStyle = `rgba(230,236,248,${0.75 * ke})`; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, R), 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${0.5 * ke})`; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, R - 3), -2.4, -1.7); ctx.stroke();
  ctx.restore();
}

export default {
  beat: 4,
  chapter: { num: '04', title: 'Atomic clocks', sub: 'satellite B, close up' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: 0.7, name: 'shimmer', gain: 0.22, pitch: 1.15 },
      { t: 1.3, name: 'bloom', gain: 0.26, pitch: 1.0 },
      // ticks sit ON the atomic seconds the Rb cells flash on: clockAt() is anchored at beatStart(5) + wordT(5,1,3)
      // (gt 24.332 with the current timeline), so whole seconds fall at beat-4-local 1.10 / 2.10 / 3.10.
      // RE-SYNC these if the VO timing changes (cues(d) has no tl).
      { t: 1.10, name: 'tick', gain: 0.1, pitch: 1.6 },
      { t: 2.10, name: 'tick', gain: 0.16, pitch: 1.6 },
      { t: 3.10, name: 'tick', gain: 0.13, pitch: 1.6 },
    ];
  },
  drawWorld(ctx, v) {
    const k = modelK(v);
    if (k > 0) drawSatellite(ctx, v, v.wx(SAT_B.x), v.wy(SAT_B.y), v.ws(1), { alpha: k });
    // the clock lens: opens on "clocks", closes as the broadcast begins in beat 5
    const t = v.t;
    if (t > 0.8 && t < v.d + 2.0 && k > 0.5) {
      const open = L.prog(t, 1.45, 0.7);
      const close = L.ease.inCubic(L.prog(t, v.d + 0.55, 0.45));
      drawLens(ctx, v, open * (1 - close));
    }
  },
  drawOverlay(ctx, v) {
    const k = v.k * L.enter(v.t, 1.25, 0.6);          // once the model has taken over (modelK > 0.6)
    L.bigLabel(ctx, { x: 80, y: 1135, big: 'Atomic clocks', small: 'on every GPS satellite', k, accent: ACCENT, size: 104 });
  },
};
