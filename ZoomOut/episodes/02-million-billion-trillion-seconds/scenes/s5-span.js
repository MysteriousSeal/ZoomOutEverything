// Beat 5 — the hold on the trillion span: "That's thirty-one thousand, seven hundred years."
// A light pulse re-measures the spine from NOW to 1e12 s, the big "31,700 years" label lands, then a soft gold
// wash brackets the top ~16% of the span: all of written history. The wash lives in world space, so in beat 6
// it is squeezed into the sliver near NOW together with the rest of the trillion span.
import * as L from '../../../../engine/runtime/lib.js';
import { SPINE_X, ACCENT, YEAR } from '../env.js';

const { W, ease, clamp, lerp, prog, rgba } = L;
const TAU = Math.PI * 2;

const TRILLION = 1e12;                 // seconds
const WRITING = 5200 * YEAR;           // first writing ≈ 5,200 years ago (16% of the span)
const WARM = [245, 232, 205];
const BX = 952;                        // bracket x (screen); clear of the right 120 px only matters below y 1100

// seconds from beat start (phrase: 0.15–2.75 s; "thirty-one thousand" ≈ 0.4–1.3 s)
const T = {
  pulse: 0.1, pulseDur: 1.0,           // light runs down the spine, lands on the trillion mark
  plate: 0.3, plateDur: 0.4,           // a soft (translucent) backing in the empty right column ...
  label: 0.58, labelDur: 0.6,          // ... then "31,700 years" lands on "thirty-one"
  band: 1.35, bandDur: 0.55,           // written-history wash wipes down from NOW (after the label has held 0.8 s)
  text: 1.55,                          // its label (readable to ~0.4 s into beat 6, >= 1.9 s)
};

// ------------------------------------------------------------------ the re-measuring light on the spine
function drawPulse(ctx, v) {
  const p = prog(v.t, T.pulse, T.pulseDur);
  if (p <= 0 || v.t > T.pulse + T.pulseDur + 0.9) return;
  const e = ease.inOutCubic(p);
  const y0 = v.wy(0), y1 = v.wy(TRILLION);
  const hy = lerp(y0, y1, e);
  const fade = 1 - prog(v.t, T.pulse + T.pulseDur, 0.6);
  // trail: a gold gradient behind the head
  const tail = Math.max(1, Math.min(hy - y0, 260));
  const g = ctx.createLinearGradient(0, hy - tail, 0, hy);
  g.addColorStop(0, rgba(ACCENT, 0));
  g.addColorStop(1, rgba(ACCENT, 0.95 * fade));
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(SPINE_X - 3.5, hy - tail, 7, tail);
  ctx.restore();
  if (p < 1) {
    L.lightBlob(ctx, SPINE_X, hy, 70, ACCENT, 0.9);
    ctx.fillStyle = rgba([255, 246, 220], 1);
    ctx.beginPath(); ctx.arc(SPINE_X, hy, 7, 0, TAU); ctx.fill();
  }
  // landing: a ring ripples out from the trillion mark
  const r = prog(v.t, T.pulse + T.pulseDur - 0.04, 0.8);
  if (r > 0 && r < 1) {
    const re = ease.outCubic(r);
    ctx.save();
    ctx.strokeStyle = rgba(ACCENT, 0.8 * (1 - r));
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(SPINE_X, y1, Math.max(0, 8 + re * 56), 0, TAU); ctx.stroke();
    ctx.restore();
    L.lightBlob(ctx, SPINE_X, y1, 90, ACCENT, 0.5 * (1 - r));
  }
}

// ------------------------------------------------------------------ "all written history": a wash + bracket
function drawHistoryBand(ctx, v) {
  const p = prog(v.t, T.band, T.bandDur);
  if (p <= 0) return;
  // leaves before the beat-6 pull-back (only the gold span + dots ride the zoom)
  const out = 1 - ease.inCubic(prog(v.t, v.d - 0.32, 0.28));
  if (out <= 0) return;
  const e = ease.inOutCubic(p);
  const y0 = v.wy(0), yW = v.wy(WRITING);
  const full = yW - y0;
  if (full < 0.6) return;
  const h = full * e;
  const y1 = y0 + h;
  // the label (and the bracket detail) only while the band is tall enough to read
  const room = clamp((full - 70) / 50);
  const x0 = SPINE_X + 4;

  ctx.save();
  ctx.globalAlpha *= out;
  // soft gold wash, fading to the right; brighter hairline at its bottom edge
  // once squeezed (beat 6) the wash shrinks to a short gold sliver by the spine
  const bx = lerp(SPINE_X + 70, BX, room);
  const g = ctx.createLinearGradient(x0, 0, bx, 0);
  g.addColorStop(0, rgba(ACCENT, 0.2));
  g.addColorStop(0.55, rgba(ACCENT, 0.08));
  g.addColorStop(1, rgba(ACCENT, 0.03));
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, bx - x0, h);
  // a slow light sweep across the wash (secondary motion)
  const sw = ((v.t - T.band) * 0.32) % 1.4;
  if (h > 4 && room > 0) {
    const sx = lerp(x0 - 200, BX + 200, sw / 1.4);
    const sg = ctx.createLinearGradient(sx - 160, 0, sx + 160, 0);
    sg.addColorStop(0, rgba(ACCENT, 0));
    sg.addColorStop(0.5, rgba(ACCENT, 0.07 * room));
    sg.addColorStop(1, rgba(ACCENT, 0));
    ctx.fillStyle = sg;
    ctx.fillRect(x0, y0, BX - x0, h);
  }
  // bottom edge: fine dashed hairline, drawn left to right
  const lw = (BX - x0) * ease.outCubic(prog(v.t, T.band + 0.2, 0.6));
  ctx.strokeStyle = rgba(ACCENT, 0.55 * room);
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0 + lw, y1); ctx.stroke();
  ctx.setLineDash([]);
  // glowing tick where writing begins, on the spine
  ctx.fillStyle = rgba(ACCENT, 0.95);
  ctx.fillRect(SPINE_X - 9, y1 - 1.5, 18, 3);
  L.lightBlob(ctx, SPINE_X, y1, 34, ACCENT, 0.45 * e);

  // bracket on the right: ticks point back at the band
  const bk = ease.outCubic(prog(v.t, T.band + 0.25, 0.5)) * room;
  if (bk > 0) {
    const mid = (y0 + y1) / 2;
    const a = lerp(mid, y0 + 1, bk), b = lerp(mid, y1 - 1, bk);
    ctx.strokeStyle = rgba(ACCENT, 0.9 * bk);
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(BX - 16, a); ctx.lineTo(BX, a); ctx.lineTo(BX, b); ctx.lineTo(BX - 16, b);
    ctx.stroke();
  }

  // label hangs just below the bracket's lower end (outside the band, where s4 keeps its own markers)
  const tk = ease.outCubic(prog(v.t, T.text, 0.55)) * room;
  if (tk > 0) {
    ctx.globalAlpha = tk * out;
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 10;
    const dy = (1 - tk) * 10;
    ctx.font = L.font(24, 700, L.FONT.body);
    ctx.fillStyle = rgba(WARM, 0.96);
    L.trackedText(ctx, 'WRITTEN HISTORY', BX, y1 + 30 - dy, 3, 'right');
    ctx.font = L.font(20, 600, L.FONT.body);
    ctx.fillStyle = rgba(ACCENT, 0.95);
    L.trackedText(ctx, '5,200 YEARS  ·  JUST 16%', BX, y1 + 60 - dy, 2, 'right');
  }
  ctx.restore();
}

export default {
  beat: 5,
  chapter: { num: '05', title: 'Since the cave painters', sub: 'All of recorded history fits near the top' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: T.pulse, name: 'swish', gain: 0.18, pitch: 0.8 },
      { t: T.label + 0.05, name: 'bloom', gain: 0.22, pitch: 1 },
      { t: T.pulse + T.pulseDur - 0.04, name: 'ping', gain: 0.3, pitch: 0.9 },
      { t: T.band, name: 'shimmer', gain: 0.24, pitch: 1.1 },
    ];
  },
  drawWorld(ctx, v) {
    if (v.t < 0) return;
    if (!v.visibleY(0, TRILLION)) return;
    drawHistoryBand(ctx, v);
    drawPulse(ctx, v);
  },
  drawOverlay(ctx, v) {
    // the focal number lives in the empty right column between WRITTEN HISTORY and the cave wall, so every
    // history marker on the left (FARMING BEGINS, ICE AGE PEAK) stays visible
    // leaves with the markers, before the beat-6 pull-back
    const out = 1 - ease.inCubic(prog(v.t, v.d - 0.32, 0.28));
    const kp = clamp(Math.min(v.k, out, ease.inOutCubic(prog(v.t, T.plate, T.plateDur))));
    if (kp <= 0) return;
    const kk = clamp(Math.min(v.k, out, prog(v.t, T.label, T.labelDur)));
    const x = 662, y = 790;                                   // left edge, baseline of "31,700"
    const drift = 6 * ease.inOutCubic(prog(v.t, T.label + T.labelDur, v.d));
    ctx.save();
    // soft backing: a feathered dark pool, never an opaque plate
    ctx.globalAlpha = kp;
    ctx.translate(x + 150, y - 30);
    ctx.scale(1.25, 1);
    const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, 230);
    bg.addColorStop(0, 'rgba(6,6,10,0.55)');
    bg.addColorStop(0.6, 'rgba(6,6,10,0.3)');
    bg.addColorStop(1, 'rgba(6,6,10,0)');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(0, 0, 230, 0, TAU); ctx.fill();
    ctx.restore();
    if (kk <= 0) return;
    const e = ease.outCubic(kk);
    const slide = (1 - e) * 36;
    const yy = y - drift;
    ctx.save();
    ctx.globalAlpha = clamp(kk * 1.4);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    // rule that wipes in
    ctx.fillStyle = rgba(v.accent, 0.9);
    ctx.fillRect(x + slide, yy - 112, 90 * e, 4);
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 18;
    ctx.font = L.font(112, 800, L.FONT.display);
    ctx.fillStyle = rgba(v.accent);
    L.trackedText(ctx, '31,700', x + slide, yy + (1 - e) * 30, -1);
    ctx.shadowBlur = 10;
    ctx.font = L.font(52, 700, L.FONT.display);
    ctx.fillStyle = rgba(WARM, 0.96);
    L.trackedText(ctx, 'YEARS', x + slide * 1.2 + 2, yy + 54 + (1 - e) * 22, 8);
    ctx.font = L.font(20, 600, L.FONT.body);
    ctx.fillStyle = rgba([205, 215, 230], 0.9);
    L.trackedText(ctx, '1,000,000,000,000 SECONDS', x + slide * 1.4 + 2, yy + 86 + (1 - e) * 16, 2);
    ctx.restore();
  },
};
