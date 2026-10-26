// Beat 12 — "And the universe is still too big for it." Final hold.
// A thin ring draws itself around us at 13.8 billion light-years: as far as light has had time to come
// since the Big Bang. On "too big", galaxies beyond the ring fade in (cool grey, the universe goes on),
// light from them still on its way. Then the camera breathes on the vast field until the end.
import * as L from '../../../../engine/runtime/lib.js';
import { T12, beatStart, horizonView } from './s10-deep-field.js';

const { W, H, ease, clamp, prog, rgba } = L;
const TAU = Math.PI * 2;
const GOLD = [255, 225, 140];

/**
 * Ring geometry on screen. horizonView() caps the radius (schematic, flagged `scaled`) when the true one would
 * not fit, so the ring and its labels are always in frame. `a0`: where the draw starts (an on-screen angle).
 */
function ring(v) {
  const h = horizonView(v);
  const onAt = (a) => { const px = h.x + h.r * Math.cos(a), py = h.y + h.r * Math.sin(a); return px > 40 && px < W - 40 && py > 330 && py < H - 40; };
  let a0 = -Math.PI / 2;
  for (let i = 0; i < 64 && !onAt(a0); i++) a0 = -Math.PI / 2 + (i % 2 ? 1 : -1) * Math.ceil((i + 1) / 2) * (TAU / 64);
  return { ...h, top: h.y - h.r, a0, topOn: h.y - h.r > 330 };
}

/** 0 inside the caption band (y ≈ 1335), 1 clear of it: the ring opens a soft gap so the payoff line sits on black. */
const CAP_Y = 1335;
// GAP = how open the gap is (1 while the caption is up, eases shut once it has gone, so the final hold is a closed ring)
let GAP = 1;
const capFade = (y) => 1 - GAP * (1 - L.smoothstep(clamp((Math.abs(y - CAP_Y) - 50) / 56)));
/** Caption visibility: the engine drops the last caption group 0.9 s after the final line ends. */
function captionK(v) {
  const ln = v.tl.lines[v.tl.lines.length - 1];
  const end = ln.end + 0.9;
  return 1 - ease.inOutCubic(prog(v.gt, end - 0.05, 0.7));
}

/** An arc stroked in N segments, each faded by capFade() at its height. */
function segArc(ctx, x, y, rad, a0, a1, N, lw, col, al) {
  ctx.lineCap = 'butt';
  ctx.lineWidth = lw;
  for (let i = 0; i < N; i++) {
    const b0 = a0 + (a1 - a0) * i / N, b1 = a0 + (a1 - a0) * (i + 1) / N;
    const f = capFade(y + rad * Math.sin((b0 + b1) / 2));
    if (f <= 0.002) continue;
    ctx.strokeStyle = rgba(col, al * f);
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, rad), b0, b1 + (i < N - 1 ? 0.002 : 0)); ctx.stroke();
  }
}

function drawRing(ctx, v, t) {
  const k = prog(t, T12.ring, T12.ringDur);
  if (k <= 0) return;
  const e = ease.inOutCubic(k);
  GAP = captionK(v);
  const { x, y, r, a0 } = ring(v);
  const a1 = a0 + TAU * e;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // soft luminous band just inside the edge (the oldest light)
  if (e > 0.98) {
    const bk = ease.outCubic(prog(t, T12.ring + T12.ringDur - 0.1, 0.8));
    const g = ctx.createRadialGradient(x, y, Math.max(0, r * 0.9), x, y, r * 1.02);
    g.addColorStop(0, rgba([255, 170, 120], 0));
    g.addColorStop(0.85, rgba([255, 170, 120], 0.07 * bk));
    g.addColorStop(1, rgba([255, 170, 120], 0));
    ctx.fillStyle = g;
    // filled as pie wedges so it can fade out across the caption band too
    const NW = 120, R2 = Math.max(0, r * 1.02);
    for (let i = 0; i < NW; i++) {
      const b0 = TAU * i / NW, b1 = TAU * (i + 1) / NW;
      const f = capFade(y + r * Math.sin((b0 + b1) / 2));
      if (f <= 0.002) continue;
      ctx.globalAlpha = f;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, R2, b0, b1); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // stroked in short segments so the arc can fade out across the caption band
  const N = Math.max(1, Math.ceil(240 * e));
  for (const [w, al] of [[10, 0.07], [4, 0.14], [1.6, 0.75]]) segArc(ctx, x, y, r, a0, a1, N, w, GOLD, al);
  // once drawn: a soft glint slowly orbits the ring (keeps the final hold alive)
  if (k >= 1) {
    const gk = ease.inOutCubic(prog(t, T12.ring + T12.ringDur, 1.0));
    const ga = a0 + TAU * e + (t - T12.ring - T12.ringDur) * 0.32;
    L.lightBlob(ctx, x + r * Math.cos(ga), y + r * Math.sin(ga), 46, [255, 236, 200], 0.35 * gk * capFade(y + r * Math.sin(ga)));
  }
  // drawing head
  if (k < 1) {
    const hx = x + r * Math.cos(a1), hy = y + r * Math.sin(a1);
    L.lightBlob(ctx, hx, hy, 30, [255, 246, 222], 0.8 * Math.sin(Math.PI * Math.min(1, k * 1.05)) * (0.25 + 0.75 * capFade(hy)));
  }
  ctx.restore();
}

/** Text set along an arc (centred on angle `mid`), reading left to right over the top. */
function arcText(ctx, str, cx, cy, rad, mid, tracking) {
  ctx.letterSpacing = '0px';
  const widths = [...str].map((ch) => ctx.measureText(ch).width + tracking);
  const total = widths.reduce((a, b) => a + b, 0) - tracking;
  let a = mid - total / rad / 2;
  [...str].forEach((ch, i) => {
    const w = widths[i] - tracking;
    const ang = a + w / 2 / rad;
    ctx.save();
    ctx.translate(cx + rad * Math.cos(ang), cy + rad * Math.sin(ang));
    ctx.rotate(ang + Math.PI / 2);
    ctx.fillText(ch, -w / 2, 0);
    ctx.restore();
    a += widths[i] / rad;
  });
}

function drawWorld(ctx, v) {
  if (!v.tl.scenes[12] || v.gt < beatStart(v, 12) - 0.05) return;
  drawRing(ctx, v, v.t);
}

function drawOverlay(ctx, v) {
  const t = v.t;
  const rg = ring(v);
  // ring label, set along the inside of the ring's top (or at a fixed safe spot if the top is out of frame)
  const lk = ease.outCubic(prog(t, T12.ringLabel, 0.7)) * v.k;
  if (lk > 0) {
    ctx.save();
    ctx.globalAlpha = lk;
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 8;
    ctx.textBaseline = 'alphabetic';
    ctx.font = L.font(23, 700, L.FONT.body);
    ctx.fillStyle = rgba([255, 236, 190], 0.95);
    if (rg.topOn) {
      arcText(ctx, 'AS FAR AS LIGHT HAS COME', rg.x, rg.y, rg.r - 34 - (1 - lk) * 10, -Math.PI / 2, 4);
      if (rg.scaled) {
        ctx.font = L.font(16, 600, L.FONT.body);
        ctx.fillStyle = rgba([200, 190, 170], 0.75);
        arcText(ctx, 'RING NOT TO SCALE', rg.x, rg.y, rg.r - 64 - (1 - lk) * 10, -Math.PI / 2, 3);
      }
    } else {
      L.trackedText(ctx, 'AS FAR AS LIGHT HAS COME', W / 2, 470 + (1 - lk) * 10, 4, 'center');
    }
    ctx.restore();
  }
  // beyond the ring: light still on its way (top right, outside the ring, below the HUD block)
  const bk = ease.outCubic(prog(t, T12.beyondLabel, 0.6)) * v.k;
  if (bk > 0) {
    const x = W - 64, y = clamp(rg.top - 72, 392, 430) + (1 - bk) * 12;
    ctx.save();
    ctx.globalAlpha = bk;
    const g = ctx.createRadialGradient(x - 180, y + 10, 10, x - 180, y + 10, 300);
    g.addColorStop(0, 'rgba(2,3,8,0.55)'); g.addColorStop(1, 'rgba(2,3,8,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 500, y - 120, 600, 260);
    ctx.fillStyle = rgba([170, 190, 230], 0.9);
    ctx.fillRect(x - 52 * bk, y - 34, 52 * bk, 3);
    ctx.font = L.font(24, 700, L.FONT.body);
    ctx.fillStyle = rgba([225, 232, 245], 0.95);
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 8;
    L.trackedText(ctx, 'OUT HERE, THEIR LIGHT', x, y, 3, 'right');
    L.trackedText(ctx, 'HASN’T REACHED US YET', x, y + 36, 3, 'right');
    ctx.restore();
  }
}

export default {
  beat: 12,
  chapter: { num: '12', title: 'Still too big', sub: 'The observable universe' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: T12.ring, name: 'deep', gain: 0.35, pitch: 0.75 },          // the horizon ring draws
      { t: T12.ring + 0.1, name: 'swell', gain: 0.22, pitch: 0.6 },
      { t: T12.ghosts + 0.1, name: 'shimmer', gain: 0.28, pitch: 0.6 }, // on "too big": the universe goes on
      { t: T12.beyondLabel, name: 'tick', gain: 0.14, pitch: 0.8 },
    ];
  },
  drawWorld,
  drawOverlay,
};
