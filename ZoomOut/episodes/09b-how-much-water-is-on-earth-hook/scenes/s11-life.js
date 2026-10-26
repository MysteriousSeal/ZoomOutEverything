// Beat 11 — "That's what so much of life depends on."
// London fades away; the little ball begins to glow from within (s09 handles the inner light). On "life", three
// fine-line icons (a tap, a wheat field, a fish) land on an arc under the drop: what that water keeps alive. Slow rings of light
// breathe outward from it and a few motes drift around it like a faint biosphere. One quiet grey line puts the number
// in perspective: it is about 0.007% of all the water on Earth.
import * as L from '../../../../engine/runtime/lib.js';
import { LAKES } from '../camera.js';

const { W, H } = L;
const BEAT = 11;
const R_L = LAKES.d / 2;
const MOTES = (() => {
  const r = L.rng(1111);
  return Array.from({ length: 26 }, () => ({ a: r() * Math.PI * 2, d: 1.12 + r() * 0.55, sp: (0.08 + r() * 0.12) * (r() < 0.5 ? -1 : 1), s: 1.2 + r() * 2.2, ph: r() * 10 }));
})();

function lifeK(v) {
  const s = v.tl.scenes[BEAT];
  const kin = L.ease.inOutCubic(L.prog(v.gt, s.start + 0.2, 1.0));
  const kout = 1 - L.ease.inCubic(L.prog(v.gt, s.end + 0.2, 1.4));
  return Math.min(kin, kout);
}

// ------------------------------------------------------------------ what depends on it: three fine-line icons
// on an arc under the drop (drinking water, crops, wildlife), each on a small dark plate so the rings pass behind.
const ICONS = [
  { deg: 140, at: 1.0, label: 'DRINKING WATER', draw: tap },
  { deg: 90, at: 1.22, label: 'CROPS', draw: wheat },
  { deg: 40, at: 1.44, label: 'WILDLIFE', draw: fish },
];
function tap(c, t) {
  c.beginPath();
  c.moveTo(-26, -17); c.lineTo(-26, 3);                                     // wall flange
  c.moveTo(-26, -12); c.lineTo(6, -12); c.quadraticCurveTo(18, -12, 18, 0); c.lineTo(18, 6);
  c.moveTo(-26, -2); c.lineTo(4, -2); c.quadraticCurveTo(8, -2, 8, 2); c.lineTo(8, 6); c.lineTo(18, 6);
  c.moveTo(-7, -12); c.lineTo(-7, -21); c.moveTo(-15, -21); c.lineTo(1, -21);   // handle
  c.stroke();
  const f = (t * 0.9) % 1, y = 12 + f * 14;                                 // a drop falls, again and again
  c.save(); c.globalAlpha *= Math.sin(Math.PI * f);
  c.beginPath(); c.moveTo(13, y - 6); c.quadraticCurveTo(17.5, y, 13, y + 3.5); c.quadraticCurveTo(8.5, y, 13, y - 6); c.fill();
  c.restore();
}
function wheat(c, t) {
  const sway = Math.sin(t * 1.6) * 0.05;
  c.beginPath(); c.moveTo(-26, 26); c.lineTo(26, 26); c.stroke();
  for (const [x0, h, s] of [[-12, 0.72, 0.8], [3, 1, 1]]) {
    c.save(); c.translate(x0, 26); c.rotate(sway * s); c.scale(s, s);
    const top = -50 * h;
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(1.5, top / 2, 0, top); c.stroke();
    for (let i = 0; i < 4; i++) {
      const y = top + 6 + i * 8;
      for (const sg of [-1, 1]) { c.beginPath(); c.ellipse(sg * 4.6, y + (sg > 0 ? 3 : 0), 5.5, 2.4, sg * -0.75, 0, Math.PI * 2); c.stroke(); }
    }
    c.beginPath(); c.ellipse(0, top - 3, 2.4, 5, 0, 0, Math.PI * 2); c.stroke();
    c.restore();
  }
}
function fish(c, t) {
  c.save(); c.translate(0, -4); c.rotate(Math.sin(t * 2.2) * 0.06);
  c.beginPath();
  c.moveTo(-17, 0); c.quadraticCurveTo(-2, -15, 20, 0); c.quadraticCurveTo(-2, 15, -17, 0);
  c.moveTo(-17, 0); c.lineTo(-28, -9); c.lineTo(-27, 9); c.closePath();
  c.moveTo(4, -7); c.quadraticCurveTo(8, 0, 4, 7);
  c.stroke();
  c.beginPath(); c.arc(11, -2.5, 1.9, 0, Math.PI * 2); c.fill();
  c.restore();
  c.beginPath(); c.moveTo(-24, 22);
  for (let x = -24; x <= 24; x += 2) c.lineTo(x, 22 + Math.sin(x * 0.26 + t * 3) * 2.2);
  c.stroke();
}
function drawLife(ctx, v) {
  const cx = v.wx(LAKES.x), cy = v.wy(LAKES.y), pr = v.ws(R_L);
  if (pr < 120) return;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  for (const ic of ICONS) {
    const k = Math.min(v.k, L.prog(v.t, ic.at, 0.55));
    if (k <= 0) continue;
    const e = L.ease.outCubic(k);
    const a = (ic.deg * Math.PI) / 180, R = pr * 1.36;
    const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R + (1 - e) * 14;
    ctx.save();
    ctx.globalAlpha *= e;
    ctx.fillStyle = 'rgba(4,14,22,0.82)';
    ctx.beginPath(); ctx.arc(x, y, 46, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(150,230,195,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(170,240,205,0.95)'; ctx.fillStyle = 'rgba(170,240,205,0.95)';
    ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ic.draw(ctx, v.t);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= e;
    ctx.font = L.font(21, 600, L.FONT.body);
    ctx.fillStyle = 'rgba(190,220,210,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 8;
    L.trackedText(ctx, ic.label, x, y + 76, 2.5, 'center');
    ctx.restore();
  }
  ctx.restore();
}

export default {
  beat: BEAT,
  chapter: { num: '11', title: 'Life', sub: 'Drinking water, farms, rivers, wetlands' },
  captions: true,
  layer: 3,
  cues(d) {
    return [
      { t: 0.25, name: 'swell', gain: 0.35, pitch: 1.0 },
      { t: 0.75, name: 'shimmer', gain: 0.22, pitch: 1.25 },
      { t: 1.05, name: 'tick', gain: 0.18, pitch: 1.1 },
    ];
  },
  drawWorld(ctx, v) {
    const cx = v.wx(LAKES.x), cy = v.wy(LAKES.y), pr = v.ws(R_L);
    const k = lifeK(v) * L.clamp((pr - 40) / 80);      // the halo fades as the pull-back shrinks the ball
    if (k <= 0.002) return;
    if (pr < 4 || cx + pr * 3 < 0 || cx - pr * 3 > W || cy + pr * 3 < 0 || cy - pr * 3 > H) return;
    const t = v.gt - v.tl.scenes[BEAT].start;
    ctx.save();
    // the drop lights up from within, breathing slowly
    const br = k * (0.8 + 0.2 * Math.sin(t * 2.4));
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, pr * 0.99), 0, Math.PI * 2); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const ig = ctx.createRadialGradient(cx + pr * 0.1, cy + pr * 0.12, 0, cx, cy, pr);
    ig.addColorStop(0, `rgba(140,235,255,${0.22 * br})`);
    ig.addColorStop(0.6, `rgba(80,190,255,${0.12 * br})`);
    ig.addColorStop(1, `rgba(120,220,255,${0.14 * br})`);
    ctx.fillStyle = ig;
    ctx.fillRect(cx - pr, cy - pr, pr * 2, pr * 2);
    ctx.restore();
    // breathing rings of light, slow and evenly spaced
    for (let i = 0; i < 3; i++) {
      const p = ((t + 0.2) / 2.4 + i / 3) % 1;
      if (t + 0.2 < i * 0.8) continue;
      const rr = pr * (1.04 + p * 0.9);
      ctx.strokeStyle = `rgba(140,215,255,${0.32 * k * Math.pow(1 - p, 1.6)})`;
      ctx.lineWidth = Math.max(1, 2.5 * (1 - p) + 0.5);
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, rr), 0, Math.PI * 2); ctx.stroke();
    }
    // motes drifting around the ball (a faint biosphere)
    ctx.globalCompositeOperation = 'lighter';
    for (const m of MOTES) {
      const a = m.a + t * m.sp;
      const d = pr * (m.d + 0.05 * Math.sin(t * 0.8 + m.ph));
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.96;
      const tw = 0.5 + 0.5 * Math.sin(t * 2.2 + m.ph);
      const al = k * (0.25 + 0.5 * tw);
      ctx.fillStyle = `rgba(180,240,230,${al})`;
      const ms = m.s * Math.min(1, pr / 200);
      ctx.beginPath(); ctx.arc(x, y, Math.max(0, ms), 0, Math.PI * 2); ctx.fill();
      L.lightBlob(ctx, x, y, ms * 6, [120, 230, 210], al * 0.35);
    }
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    drawLife(ctx, v);
    // one quiet line; the glowing ball carries the beat
    const cy = v.wy(LAKES.y), pr = v.ws(R_L);
    const k = Math.min(v.k, L.ease.outCubic(L.prog(v.t, 0.7, 0.5)));
    if (k <= 0) return;
    ctx.save();
    ctx.globalAlpha *= k;
    ctx.font = L.font(30, 600, L.FONT.body);
    ctx.fillStyle = 'rgba(190,205,222,0.95)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10;
    ctx.textBaseline = 'middle';
    L.trackedText(ctx, '0.007% OF ALL WATER', W / 2, Math.min(560, cy - pr - 120) + (1 - k) * 10, 3, 'center');
    ctx.restore();
  },
};
