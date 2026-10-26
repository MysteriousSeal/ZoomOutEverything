// Beat 3 — "Twenty thousand years ago, | the seas really were about a hundred and twenty meters lower."
// The North Pole view (North Sea at the bottom, Beringia at the top) while the sea falls −60 → −120 m (21.92–24.62).
// Label (lower left, over the dark North Atlantic: the usual top-left slot is on Beringia in this view): on
// "Twenty thousand years ago" the big line reads 20,000 / YEARS AGO; on "the seas really were about 120 m
// lower" it rolls: 20,000 lifts away, −120 m rises into the big slot and the small line becomes 20,000 YEARS AGO.
// As the sea falls, two soft accent highlights land on the two land bridges — BERINGIA (top) and DOGGERLAND
// (bottom) — each with a small tag. No ice sheets (bathtub model; see
// the FACT-CHECK caveat). Everything fades as the camera dives to Beringia (beat 4).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, PLACES, project } from '../env.js';
import { tag } from './s01-bering.js';

const ph = (tl, i, j, edge = 'start') => tl.lines[i].phrases[j][edge];

function times(tl) {
  return {
    a: ph(tl, 3, 0) + 0.12,           // 20,000 / YEARS AGO
    b: ph(tl, 3, 1) + 1.15,           // roll to −120 m (on "a hundred and twenty")
    ber: ph(tl, 3, 1) + 1.0,          // BERINGIA highlight
    dog: ph(tl, 3, 1) + 1.55,         // DOGGERLAND highlight
  };
}
const away = (v) => 1 - L.ease.inCubic(L.prog(v.gt, v.tl.scenes[4].start - 0.15, 0.5));

/** Soft accent highlight ring around a screen point (r px), drawn in by k. */
function ring(c, x, y, r, k, alpha) {
  if (k <= 0 || alpha <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  c.globalAlpha *= alpha;
  // inner glow
  const g = c.createRadialGradient(x, y, r * 0.2, x, y, r * 1.05);
  g.addColorStop(0, L.rgba(ACCENT, 0));
  g.addColorStop(0.75, L.rgba(ACCENT, 0.18 * e));
  g.addColorStop(1, L.rgba(ACCENT, 0));
  c.fillStyle = g;
  c.globalCompositeOperation = 'lighter';
  c.fillRect(x - r * 1.1, y - r * 1.1, r * 2.2, r * 2.2);
  c.globalCompositeOperation = 'source-over';
  const rr = r * L.lerp(1.25, 1, e);
  c.strokeStyle = 'rgba(2,10,20,0.4)';
  c.lineWidth = 5;
  c.beginPath(); c.arc(x, y, Math.max(0, rr), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * e); c.stroke();
  c.strokeStyle = L.rgba(L.mix(ACCENT, [255, 255, 255], 0.25), 0.95);
  c.lineWidth = 2.2;
  c.stroke();
  c.restore();
}

/** The rolling big label (house bigLabel look). */
function rollLabel(ctx, v, tm) {
  const k = Math.min(v.k, L.prog(v.gt, tm.a, 0.6));
  if (k <= 0) return;
  const r = L.ease.inOutCubic(L.prog(v.gt, tm.b, 0.7));
  const x = 80, y = 1196, size = 110;   // lower left: the dark North Atlantic in this view (top left is Beringia)
  const e = L.ease.outCubic(L.clamp(k));
  ctx.save();
  ctx.globalAlpha *= L.clamp(k * 1.4);
  ctx.textBaseline = 'alphabetic';
  // soft borderless scrim: the slot crosses bright land while the camera is still travelling from the North Sea
  ctx.save();
  ctx.translate(x + 190, y - 40);
  ctx.scale(1, 0.55);
  const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, 330);
  sg.addColorStop(0, 'rgba(3,8,16,0.5)');
  sg.addColorStop(0.6, 'rgba(3,8,16,0.3)');
  sg.addColorStop(1, 'rgba(3,8,16,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(-330, -330, 660, 660);
  ctx.restore();
  ctx.fillStyle = L.rgba(v.accent, 0.9);
  ctx.fillRect(x, y - size * 0.92 - 26, 90 * e, 4);
  // big slot: 20,000 lifts out, −120 m rises in (clipped to the slot)
  ctx.save();
  ctx.beginPath(); ctx.rect(0, y - size * 0.92 - 16, 960, size * 0.92 + 34); ctx.clip();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = L.rgba(v.accent);
  const fit = (s) => L.fitSize(ctx, s, 820, size, 800, L.FONT.display, 40);
  if (r < 1) {
    ctx.font = L.font(fit('20,000'), 800, L.FONT.display);
    ctx.globalAlpha = L.clamp(k * 1.4) * (1 - r);
    L.trackedText(ctx, '20,000', x, y + (1 - e) * 30 - r * 70, -1, 'left');
  }
  if (r > 0) {
    ctx.font = L.font(fit('−120 m'), 800, L.FONT.display);
    ctx.globalAlpha = L.clamp(k * 1.4) * r;
    L.trackedText(ctx, '−120 m', x, y + (1 - r) * 80, -1, 'left');
  }
  ctx.restore();
  // small line: YEARS AGO → 20,000 YEARS AGO
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = 'rgba(205,215,230,0.95)';
  ctx.font = L.font(30, 600, L.FONT.body);
  const sy = y + 52 + (1 - e) * 18;
  if (r < 1) { ctx.globalAlpha = L.clamp(k * 1.4) * (1 - r); L.trackedText(ctx, 'YEARS AGO', x, sy, 3, 'left'); }
  if (r > 0) { ctx.globalAlpha = L.clamp(k * 1.4) * r; L.trackedText(ctx, '20,000 YEARS AGO', x, sy + (1 - r) * 12, 3, 'left'); }
  ctx.restore();
}

export default {
  beat: 3,
  chapter: { num: '03', title: 'The last ice age', sub: 'about 20,000 years ago' },
  layer: 3,
  // beat 19.93: 20,000 at 20.2, roll at 23.17, Beringia 23.02, Doggerland 23.57
  cues(d) {
    return [
      { t: 0.3, name: 'blip', gain: 0.18, pitch: 0.9 },
      { t: 3.22, name: 'swish', gain: 0.16, pitch: 1.0 },
      { t: 3.1, name: 'ping', gain: 0.22, pitch: 1.15 },
      { t: 3.65, name: 'ping', gain: 0.2, pitch: 0.95 },
    ];
  },
  drawWorld(ctx, v) {
    const tm = times(v.tl);
    const fo = away(v);
    if (v.gt < tm.ber - 0.1 || fo <= 0) return;
    const d = project(v, PLACES.doggerBank.lat - 0.6, PLACES.doggerBank.lon + 2);
    if (d.z > 0.05) ring(ctx, d.x, d.y, v.ws(420000), L.prog(v.gt, tm.dog, 0.9), fo * L.clamp(d.z * 5));
    const b = project(v, PLACES.beringia.lat + 1.2, PLACES.beringia.lon + 1.5);
    const rB = v.ws(520000);
    if (b.z > 0.05) ring(ctx, b.x, b.y, rB, L.prog(v.gt, tm.ber, 0.9), fo * L.clamp(b.z * 5));
  },
  drawOverlay(ctx, v) {
    const tm = times(v.tl);
    rollLabel(ctx, v, tm);
    const fo = away(v);
    const b = project(v, PLACES.beringia.lat + 1.2, PLACES.beringia.lon + 1.5);
    const rB = v.ws(520000);
    const kb = Math.min(v.k, L.prog(v.gt, tm.ber + 0.3, 0.5)) * fo * L.clamp(b.z * 5);
    tag(ctx, 'BERINGIA', Math.min(b.x + rB + 18, 940 - 190), b.y, kb, { size: 24, maxW: 220 });
    const d = project(v, PLACES.doggerBank.lat - 0.6, PLACES.doggerBank.lon + 2);
    const kd = Math.min(v.k, L.prog(v.gt, tm.dog + 0.5, 0.5)) * fo * L.clamp(d.z * 5);
    tag(ctx, 'DOGGERLAND', Math.min(d.x + v.ws(420000) + 18, 940 - 230), d.y + 6, kd, { size: 24, maxW: 240 });
  },
};
