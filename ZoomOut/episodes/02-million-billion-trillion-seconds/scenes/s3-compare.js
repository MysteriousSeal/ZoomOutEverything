// Beat 3 — "That's the difference between a million and a billion."
// A jeweller's loupe drops onto the sliver at NOW (where the million span now lives) and blows it up:
// inside the lens the million span reads "11.6 days". Below, the full billion span reads "31.7 years",
// and a gold "×1,000" links the two like a vertical equation. Then the loupe folds back into NOW.
// Screen-space overlay; the billion span itself is drawn by s2 (we only sweep a light pulse down it).
import * as L from '../../../../engine/runtime/lib.js';
import { SPINE_X, NOW_Y, ACCENT } from '../env.js';

const { ease, clamp, lerp, prog, rgba } = L;
const TAU = Math.PI * 2;
const DAY = 86400;
const MILLION_DAYS = 1e6 / DAY;            // 11.574
const WARM = [244, 236, 220];
const GREY = [190, 182, 168];

// layout (screen px)
const RING = { x: SPINE_X + 32, y: NOW_Y + 2, r: 24 };   // focus ring on the sliver at NOW
const LENS = { x: 716, y: 640, r: 240 };                 // the loupe
const BAR_X = SPINE_X + 32;                             // where the span bars sit beside the spine

// choreography (s from beat start)
const T = {
  ring: 0.12,       // focus ring draws on around the sliver
  open: 0.32,       // loupe grows out of the ring
  bar: 0.72,        // million span draws down inside the lens
  label: 0.86,      // "11.6 days"
  times: 1.12,      // "×1,000" + light pulse down the billion span
  billion: 1.3,     // leader ties "31.7 years" (held over from s2) to the span end
};

/** external tangent points between two circles (for the loupe "cone") */
function tangents(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
  if (d <= Math.abs(a.r - b.r) + 1) return null;
  const th = Math.atan2(dy, dx), al = Math.acos((a.r - b.r) / d);
  return [th + al, th - al].map((p) => [a.x + a.r * Math.cos(p), a.y + a.r * Math.sin(p), b.x + b.r * Math.cos(p), b.y + b.r * Math.sin(p)]);
}

/** screen y of the billion span's end */
const billionY = (v) => v.wy(1e9);

// ------------------------------------------------------------------ the magnified world inside the lens
function lensContent(ctx, v, cx, cy, r, open) {
  // warm glass interior
  const bg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r);
  bg.addColorStop(0, '#2a2114');
  bg.addColorStop(0.6, '#17130d');
  bg.addColorStop(1, '#0c0a08');
  ctx.fillStyle = bg;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  // the magnified timeline: mini spine, NOW, day ticks
  const s = r / LENS.r;                     // content scales with the lens while it opens
  const sx = cx - 128 * s;                  // mini spine x (clear of the rim so the day labels breathe)
  const ny = cy - 150 * s;                  // mini NOW y
  const len = 290 * s;                      // 11.57 days
  const dayPx = len / MILLION_DAYS;
  ctx.save();
  // faint day grid (secondary texture so the lens reads as "zoomed in")
  for (let d = 1; d <= 14; d++) {
    const y = ny + d * dayPx;
    ctx.fillStyle = `rgba(245,225,180,${d % 2 ? 0.035 : 0.07})`;
    ctx.fillRect(cx - r, y - 0.5, r * 2, 1);
  }
  const sg = ctx.createLinearGradient(0, ny, 0, cy + r);
  sg.addColorStop(0, 'rgba(245,225,180,0.85)');
  sg.addColorStop(1, 'rgba(245,225,180,0.12)');
  ctx.fillStyle = sg;
  ctx.fillRect(sx - 1.5, ny, 3, cy + r - ny);
  ctx.font = L.font(Math.round(19 * s), 600, L.FONT.body);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let d = 1; d <= 12; d++) {
    const y = ny + d * dayPx, major = d % 4 === 0;
    ctx.fillStyle = `rgba(245,225,180,${major ? 0.7 : 0.35})`;
    ctx.fillRect(sx - (major ? 12 : 7) * s, y - 1, (major ? 12 : 7) * s, 2);
    if (major && d < 12) {
      ctx.fillStyle = 'rgba(235,225,205,0.62)';
      ctx.fillText(`${d} days`, sx - 20 * s, y);
    }
  }
  // NOW dot
  ctx.fillStyle = rgba(ACCENT);
  ctx.beginPath(); ctx.arc(sx, ny, Math.max(0, 7 * s), 0, TAU); ctx.fill();
  L.lightBlob(ctx, sx, ny, 46 * s, ACCENT, 0.5);

  // the million span drawing down like a measuring tape
  const kb = ease.inOutCubic(prog(v.t, T.bar, 0.55));
  if (kb > 0) {
    const bx = sx + 14 * s, bw = 18 * s, by1 = ny + len * kb;
    const g = ctx.createLinearGradient(0, ny, 0, by1);
    g.addColorStop(0, rgba(ACCENT, 0.35));
    g.addColorStop(1, rgba(ACCENT, 0.95));
    ctx.fillStyle = g;
    L.roundRect(ctx, bx, ny, bw, Math.max(bw, by1 - ny), bw / 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,245,215,0.85)';
    ctx.fillRect(bx + bw / 2 - 1, ny + 6, 2, Math.max(0, by1 - ny - 12));
    // glowing head (calms once landed)
    const land = prog(v.t, T.bar + 0.55, 0.5);
    L.lightBlob(ctx, bx + bw / 2, by1, (70 - 25 * land) * s, ACCENT, 0.75 - 0.35 * land);
    // end cap tick across the spine
    ctx.fillStyle = rgba(ACCENT, 0.9 * kb);
    ctx.fillRect(sx - 6 * s, by1 - 1.5, bx + bw - sx + 14 * s, 3);
  }

  // value: small overline + big number, to the right of the bar
  const kl = ease.outCubic(prog(v.t, T.label, 0.5));
  if (kl > 0) {
    const lx = sx + 54 * s, ly = cy + 34 * s;
    ctx.save();
    ctx.globalAlpha *= kl;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = L.font(Math.round(21 * s), 600, L.FONT.body);
    ctx.fillStyle = rgba(GREY, 0.95);
    L.trackedText(ctx, '1 MILLION SECONDS', lx + 2, ly - 68 * s + (1 - kl) * 10, 2.5);
    ctx.font = L.font(Math.round(64 * s), 800, L.FONT.display);
    ctx.fillStyle = rgba(ACCENT);
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 16;
    L.trackedText(ctx, '11.6 days', lx, ly + (1 - kl) * 22, -1);
    ctx.restore();
  }
  ctx.restore();

  // inner vignette of the glass
  const vg = ctx.createRadialGradient(cx, cy, r * 0.62, cx, cy, r);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // light sweep across the glass as it opens
  const sw = prog(v.t, T.open + 0.25, 0.9);
  if (sw > 0 && sw < 1) {
    const x = lerp(cx - r * 1.4, cx + r * 1.4, ease.inOutCubic(sw));
    const g = ctx.createLinearGradient(x - 90, 0, x + 90, 0);
    g.addColorStop(0, 'rgba(255,240,210,0)');
    g.addColorStop(0.5, `rgba(255,240,210,${0.09 * Math.sin(sw * Math.PI)})`);
    g.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.save();
    ctx.translate(x, cy); ctx.rotate(0.35); ctx.translate(-x, -cy);
    ctx.fillStyle = g;
    ctx.fillRect(x - 90, cy - r * 1.5, 180, r * 3);
    ctx.restore();
  }
}

function drawLoupe(ctx, v) {
  const kOpen = prog(v.t, T.open, 0.62);
  const kClose = ease.inCubic(prog(v.t, v.d - 0.3, 0.38));     // folds back into NOW, faster than it opened
  const o = ease.outBack(kOpen, 1.25) * (1 - kClose);
  // ring
  const kr = ease.outCubic(prog(v.t, T.ring, 0.4)) * (1 - ease.inCubic(prog(v.t, v.d - 0.05, 0.25)));
  if (kr > 0) {
    ctx.save();
    ctx.strokeStyle = rgba(WARM, 0.9 * kr);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(RING.x, RING.y, RING.r * lerp(1.8, 1, kr), -Math.PI / 2, -Math.PI / 2 + TAU * kr);
    ctx.stroke();
    // ping ripple
    const pp = prog(v.t, T.ring, 0.9);
    if (pp > 0 && pp < 1) {
      ctx.strokeStyle = rgba(ACCENT, 0.5 * (1 - pp));
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(RING.x, RING.y, Math.max(0, RING.r + 50 * ease.outCubic(pp)), 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
  if (o <= 0.001) return;

  const cx = lerp(RING.x, LENS.x, Math.min(1, o)), cy = lerp(RING.y, LENS.y, Math.min(1, o));
  const r = Math.max(1, lerp(RING.r, LENS.r, o));
  const lens = { x: cx, y: cy, r };

  // the cone: two tangents from the ring to the loupe, with a faint fill
  const tg = tangents(RING, lens);
  if (tg) {
    ctx.save();
    const a = clamp(o * 1.5) * (1 - kClose);
    ctx.beginPath();
    ctx.moveTo(tg[0][0], tg[0][1]); ctx.lineTo(tg[0][2], tg[0][3]);
    ctx.lineTo(tg[1][2], tg[1][3]); ctx.lineTo(tg[1][0], tg[1][1]);
    ctx.closePath();
    const cg = ctx.createLinearGradient(RING.x, RING.y, cx, cy);
    cg.addColorStop(0, rgba(ACCENT, 0.16 * a));
    cg.addColorStop(1, rgba(ACCENT, 0.02 * a));
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.strokeStyle = rgba(WARM, 0.45 * a);
    ctx.lineWidth = 1.5;
    for (const [x1, y1, x2, y2] of tg) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    ctx.restore();
  }

  // drop shadow + glass body
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = '#0d0b08';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
  lensContent(ctx, v, cx, cy, r, o);
  ctx.restore();

  // rim: bezel + fine inner ring + specular arc
  ctx.save();
  const rim = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  rim.addColorStop(0, 'rgba(255,240,205,0.95)');
  rim.addColorStop(0.5, 'rgba(200,170,110,0.75)');
  rim.addColorStop(1, 'rgba(120,95,60,0.85)');
  ctx.strokeStyle = rim;
  ctx.lineWidth = 7 * clamp(r / LENS.r * 1.2, 0.4, 1);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,210,0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r - 11), 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,250,235,0.5)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r - 20), -Math.PI * 0.42, -Math.PI * 0.2); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,250,235,0.25)';
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r - 20), -Math.PI * 0.16, -Math.PI * 0.1); ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ "×1,000" and the billion label
function drawEquation(ctx, v) {
  const out = 1 - ease.inCubic(prog(v.t, v.d - 0.3, 0.3));
  const by = billionY(v);
  const top = LENS.y + LENS.r + 22, bottom = by - 124;
  const mid = (top + bottom) / 2;

  // connector: a thin gold line drawing down from the loupe to the billion value
  const kc = ease.inOutCubic(prog(v.t, T.times - 0.1, 0.6)) * out;
  if (kc > 0) {
    ctx.save();
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, rgba(ACCENT, 0.0));
    g.addColorStop(0.25, rgba(ACCENT, 0.7));
    g.addColorStop(1, rgba(ACCENT, 0.7));
    ctx.fillStyle = g;
    ctx.fillRect(LENS.x - 1, top, 2, (bottom - top) * kc);
    // arrow head at the bottom
    if (kc > 0.95) {
      const a = (kc - 0.95) * 20;
      ctx.strokeStyle = rgba(ACCENT, 0.8 * a);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(LENS.x - 9, bottom - 10); ctx.lineTo(LENS.x, bottom); ctx.lineTo(LENS.x + 9, bottom - 10);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ×1,000 on a dark pill, popping with a small overshoot
  const kx = prog(v.t, T.times, 0.55);
  if (kx > 0) {
    const s = ease.outBack(kx, 2.0);
    ctx.save();
    ctx.globalAlpha *= clamp(kx * 3) * out;
    ctx.translate(LENS.x, mid);
    ctx.scale(lerp(0.6, 1, s), lerp(0.6, 1, s));
    L.lightBlob(ctx, 0, 0, 230, ACCENT, 0.22 * (1 - prog(v.t, T.times + 0.2, 1.2) * 0.6));
    ctx.font = L.font(104, 800, L.FONT.display);
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText('×1,000').width;
    ctx.fillStyle = 'rgba(12,10,8,0.82)';
    L.roundRect(ctx, -tw / 2 - 30, -60, tw + 60, 120, 60);
    ctx.fill();
    ctx.strokeStyle = rgba(ACCENT, 0.45);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = rgba(ACCENT);
    ctx.shadowColor = rgba(ACCENT, 0.6);
    ctx.shadowBlur = 24;
    L.trackedText(ctx, '×1,000', 0, 6, -1, 'center');
    ctx.restore();
  }

  // the leader from the end of the billion span to its value (the value itself is handed over from s2)
  const kb = ease.outCubic(prog(v.t, T.billion, 0.55)) * out;
  if (kb > 0) L.leader(ctx, BAR_X + 22, by, lerp(BAR_X + 22, LENS.x - 214, kb), by, kb, ACCENT, 0.7);
}

/** s2's overlay fade-out at global time gt (mirrors the engine's overlayK exit) */
function s2Out(v) {
  const end = v.tl.scenes[2].end;
  return 1 - ease.inCubic(prog(v.gt, end - 0.1, 0.35));
}

/**
 * "31.7 years": picked up from t 0 exactly where (and how) s2 left it, cross-faded against s2's exit so the value
 * never leaves the screen, then eased to its own spot beside the leader. Drawn outside the beat's fade-in.
 */
function drawBillionValue(ctx, v) {
  const out = 1 - ease.inCubic(prog(v.t, v.d - 0.3, 0.3));
  const a = (1 - s2Out(v)) * out;
  if (a <= 0) return;
  const by = billionY(v);
  const m = ease.inOutCubic(prog(v.t, 0.3, 0.5));         // starts once s2's copy has gone
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const s2Size = L.fitSize(ctx, '31.7 years', 470, 120, 800, L.FONT.display);   // s2's drawBig size
  const size = lerp(s2Size, 104, m);
  const x = lerp(470, LENS.x - 196, m), y = lerp(by, by + 16, m);
  // s2's rule fades away as the label settles; the overline replaces it
  ctx.fillStyle = rgba(ACCENT, 0.9 * (1 - m));
  ctx.fillRect(470, by - s2Size * 0.92 - 26 * s2Size / 120, 90 * s2Size / 120, Math.max(2, 4 * s2Size / 120));
  ctx.save();
  ctx.globalAlpha *= m;
  ctx.font = L.font(23, 600, L.FONT.body);
  ctx.fillStyle = rgba(GREY, 0.95);
  L.trackedText(ctx, '1 BILLION SECONDS', x + 3, y - 100 + (1 - m) * 10, 2.5);
  ctx.restore();
  ctx.font = L.font(Math.round(size), 800, L.FONT.display);
  ctx.fillStyle = rgba(ACCENT);
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 18;
  L.trackedText(ctx, '31.7 years', x, y, -1);
  ctx.restore();
}

/** a pulse of light running down the whole billion span, from NOW to its end */
function drawSweep(ctx, v) {
  const p = prog(v.t, T.times - 0.05, 0.75);
  if (p <= 0 || p >= 1) return;
  const y0 = v.wy(0), y1 = billionY(v);
  const y = lerp(y0, y1, ease.inOutCubic(p));
  const a = Math.sin(p * Math.PI);
  ctx.save();
  const g = ctx.createLinearGradient(0, y - 220, 0, y);
  g.addColorStop(0, 'rgba(255,240,200,0)');
  g.addColorStop(1, `rgba(255,240,200,${0.55 * a})`);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(BAR_X - 6, Math.max(y0, y - 220), 12, Math.min(220, y - y0));
  ctx.restore();
  L.lightBlob(ctx, BAR_X, y, 70, ACCENT, 0.7 * a);
}

export default {
  beat: 3,
  chapter: { num: '03', title: 'Million vs billion', sub: 'Same "-illion", 1,000× longer' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: T.ring, name: 'ping', gain: 0.22, pitch: 1.4 },
      { t: T.open, name: 'swish', gain: 0.26, pitch: 1.1 },
      { t: T.bar + 0.5, name: 'tick', gain: 0.28, pitch: 1.2 },
      { t: T.times, name: 'bloom', gain: 0.4, pitch: 1 },
      { t: T.times + 0.02, name: 'impact', gain: 0.22, pitch: 1.3 },
      { t: T.billion + 0.1, name: 'tick', gain: 0.26, pitch: 0.9 },
      { t: d - 0.3, name: 'swish', gain: 0.16, pitch: 1.5 },
    ];
  },
  drawOverlay(ctx, v) {
    if (v.t < 0 || v.t > v.d + 0.5) return;
    ctx.save();
    ctx.globalAlpha *= clamp(v.k * 1.5);
    drawSweep(ctx, v);
    drawEquation(ctx, v);
    drawLoupe(ctx, v);
    ctx.restore();
    drawBillionValue(ctx, v);
  },
};
