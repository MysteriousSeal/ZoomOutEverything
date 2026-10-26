// Beat 12 — "That's about as fast as your fingernails grow." Final hold.
// Over the slow final pull-out, a refined fingertip (dorsal view, cool documentary greys, nail with its lunula, the
// "little moon") rises beside a 0-4 cm ruler, after the orbit scene has sunk back to ~15%. The nail then grows out,
// an untrimmed ivory nail plate, to the 3.8 cm mark: one year of growth.
// A bracket and "3.8 cm in one year" land on "grow". Then a slow push-in and a gloss sweep through the final hold.
import * as L from '../../../../engine/runtime/lib.js';

const TAU = Math.PI * 2;
/** Beat-local timing (s). "That's about as fast as your fingernails grow." 0.15-2.49. */
const T = { finger: [0.3, 0.8], ruler: [0.55, 0.9], grow: [0.95, 1.55], bracket: 2.35, header: 0.65, gloss: 3.3 };
/** Layout (screen px). ZERO = the nail's free edge (ruler zero); CM = pixels per centimetre on the ruler. */
const G = { fx: 495, zero: 1026, cm: 90, fw: 74, nw: 46, rx: 620, rw: 42 };
const ZERO = G.zero;
const GROW = 3.8 * G.cm;
const NAIL_LEN = 1.25 * G.cm;

let off = null;
function offscreen() {
  if (!off && typeof OffscreenCanvas !== 'undefined') off = new OffscreenCanvas(340, 400);
  return off;
}

/** Nail outline in local coords (origin = centre of the free edge), shifted up by dy: arched tip, rounded base. */
function nailTop(o, nw, dy = 0, move = true) {
  if (move) o.moveTo(-nw, 36 - dy);
  o.bezierCurveTo(-nw, 9 - dy, -nw * 0.55, -dy, 0, -dy);
  o.bezierCurveTo(nw * 0.55, -dy, nw, 9 - dy, nw, 36 - dy);
}
function nailPath(o, nw) {
  const b = NAIL_LEN;
  o.beginPath();
  nailTop(o, nw);
  o.lineTo(nw, b - 26);
  o.bezierCurveTo(nw, b + 6, -nw, b + 6, -nw, b - 26);
  o.closePath();
}

/** The fingertip (dorsal view), drawn into a local canvas (origin = nail free edge), faded out at the bottom. */
function drawFinger(c, v, x, y, k, gloss) {
  const oc = offscreen();
  if (!oc) return;
  const o = oc.getContext('2d');
  const OX = 170, OY = 30;
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.clearRect(0, 0, oc.width, oc.height);
  o.translate(OX, OY);
  const fw = G.fw, H = 380, nw = G.nw;
  const body = () => {
    o.beginPath();
    o.moveTo(-fw - 6, H);
    o.bezierCurveTo(-fw - 4, 260, -fw, 200, -fw, 120);
    o.bezierCurveTo(-fw, 46, -fw * 0.62, 8, 0, 8);
    o.bezierCurveTo(fw * 0.62, 8, fw, 46, fw, 120);
    o.bezierCurveTo(fw, 200, fw + 4, 260, fw + 6, H);
    o.closePath();
  };
  // skin: muted warm neutral under moonlight, shadowed on the left, cool rim on the right
  body();
  const bg = o.createLinearGradient(-fw, 0, fw, 0);
  bg.addColorStop(0, '#2a2427'); bg.addColorStop(0.3, '#5d5153'); bg.addColorStop(0.62, '#7a6c6c'); bg.addColorStop(0.88, '#5f5559'); bg.addColorStop(1, '#3b3842');
  o.fillStyle = bg; o.fill();
  o.save();
  body(); o.clip();
  // pad bulge light near the tip
  const tg = o.createRadialGradient(-10, 70, 6, -10, 70, 130);
  tg.addColorStop(0, 'rgba(225,205,200,0.2)'); tg.addColorStop(1, 'rgba(225,205,200,0)');
  o.fillStyle = tg; o.fillRect(-fw - 10, 0, 2 * fw + 20, 240);
  // distal knuckle creases
  o.strokeStyle = 'rgba(20,14,16,0.5)';
  o.lineWidth = 1.6;
  for (const [dy, w] of [[214, 0.62], [226, 0.5], [236, 0.36]]) {
    o.beginPath(); o.moveTo(-fw * w, dy + 5); o.quadraticCurveTo(0, dy - 5, fw * w, dy + 5); o.stroke();
  }
  // cool rim light (the accent) down the right edge
  o.strokeStyle = L.rgba(v.accent, 0.5);
  o.lineWidth = 3;
  o.beginPath(); o.moveTo(fw * 0.55, 12); o.bezierCurveTo(fw, 46, fw - 1, 80, fw - 1, 120); o.bezierCurveTo(fw - 1, 200, fw + 3, 260, fw + 5, H); o.stroke();
  o.restore();

  // nail plate
  nailPath(o, nw);
  const ng = o.createLinearGradient(0, 0, 0, NAIL_LEN);
  ng.addColorStop(0, '#b9a7a8'); ng.addColorStop(0.5, '#a08c8f'); ng.addColorStop(1, '#8a777b');
  o.fillStyle = ng; o.fill();
  o.save();
  nailPath(o, nw); o.clip();
  // free edge: the white tip, a soft band
  const fe = o.createLinearGradient(0, 0, 0, 22);
  fe.addColorStop(0, 'rgba(238,234,230,0.95)'); fe.addColorStop(0.75, 'rgba(238,234,230,0.9)'); fe.addColorStop(1, 'rgba(238,234,230,0)');
  o.fillStyle = fe; o.fillRect(-nw, -2, 2 * nw, 24);
  // lunula, the pale "little moon" at the base
  o.fillStyle = 'rgba(226,214,214,0.5)';
  o.beginPath(); o.ellipse(0, NAIL_LEN - 6, nw * 0.62, 24, 0, Math.PI, Math.PI * 2); o.fill();
  // gloss: a long soft highlight, plus a sweep later in the hold
  const hg = o.createLinearGradient(-nw * 0.6, 0, -nw * 0.15, 0);
  hg.addColorStop(0, 'rgba(255,255,255,0)'); hg.addColorStop(0.5, 'rgba(255,255,255,0.22)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
  o.fillStyle = hg; o.fillRect(-nw * 0.6, 14, nw * 0.45, NAIL_LEN - 30);
  if (gloss > 0 && gloss < 1) {
    const gy = L.lerp(-30, NAIL_LEN + 30, gloss);
    const sg = o.createLinearGradient(0, gy - 18, 0, gy + 18);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.32)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    o.fillStyle = sg; o.fillRect(-nw, gy - 18, 2 * nw, 36);
  }
  o.restore();
  // lateral nail folds + cuticle: skin softly overlapping the plate
  o.strokeStyle = 'rgba(30,22,26,0.55)';
  o.lineWidth = 2.2;
  o.beginPath(); o.moveTo(-nw - 1, 34); o.lineTo(-nw - 1, NAIL_LEN - 26); o.bezierCurveTo(-nw - 1, NAIL_LEN + 7, nw + 1, NAIL_LEN + 7, nw + 1, NAIL_LEN - 26); o.lineTo(nw + 1, 34); o.stroke();
  nailPath(o, nw);
  o.strokeStyle = 'rgba(240,232,232,0.3)';
  o.lineWidth = 1;
  o.stroke();

  // fade the finger out toward the bottom
  o.globalCompositeOperation = 'destination-in';
  const fg = o.createLinearGradient(0, 150, 0, 225);
  fg.addColorStop(0, 'rgba(0,0,0,1)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
  o.fillStyle = fg;
  o.fillRect(-OX, -OY, oc.width, oc.height);
  o.globalCompositeOperation = 'source-over';
  o.setTransform(1, 0, 0, 1, 0, 0);

  c.save();
  c.globalAlpha *= k;
  c.drawImage(oc, x - OX, y - OY);
  c.restore();
}

/** One year of growth beyond the free edge: the nail itself, simply grown long (an untrimmed nail plate, ivory and
 *  slightly translucent, tapering a touch and curving gently, with its white free edge riding the growth front). */
function drawGrowth(c, v, x, g, k) {
  if (g <= 0.5 || k <= 0) return;
  const nw = G.nw - 1;
  const f = g / GROW, wt = nw * (1 + 0.07 * f), lean = 9 * f * f;   // long nails flare a little and drift sideways
  const rise = 14;                                                      // a flat, slightly squared free edge
  c.save();
  c.translate(x, ZERO);
  c.globalAlpha *= k;
  const path = () => {
    c.beginPath();
    c.moveTo(-nw, 22);
    c.bezierCurveTo(-nw, 22 - g * 0.5, -wt + lean * 0.5, rise - g * 0.8, -wt + lean, rise - g);
    c.bezierCurveTo(-wt + lean, -g + 2, -wt * 0.5 + lean, -g, lean, -g);
    c.bezierCurveTo(wt * 0.5 + lean, -g, wt + lean, -g + 2, wt + lean, rise - g);
    c.bezierCurveTo(wt + lean * 0.5, rise - g * 0.8, nw, 22 - g * 0.5, nw, 22);
    c.closePath();
  };
  // a soft shadow the long nail casts down-left (it stands off the fingertip)
  c.save();
  c.translate(-7, 8);
  path();
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.filter = 'blur(6px)';
  c.fill();
  c.filter = 'none';
  c.restore();
  path();
  // a thin curved shell: pale ivory, lighter along its crown, clearly darker at both curved edges
  const bg = c.createLinearGradient(-wt, 0, wt + lean, 0);
  bg.addColorStop(0, 'rgb(120,110,108)'); bg.addColorStop(0.16, 'rgb(196,186,178)'); bg.addColorStop(0.42, 'rgb(234,227,216)');
  bg.addColorStop(0.62, 'rgb(226,218,208)'); bg.addColorStop(0.86, 'rgb(186,176,170)'); bg.addColorStop(1, 'rgb(112,104,106)');
  c.fillStyle = bg;
  c.fill();
  c.save();
  path(); c.clip();
  // the pink nail bed fades out just past the fingertip; the rest is the dead, ivory plate
  const pg = c.createLinearGradient(0, 22, 0, -40);
  pg.addColorStop(0, 'rgba(176,150,152,0.55)'); pg.addColorStop(1, 'rgba(176,150,152,0)');
  c.fillStyle = pg; c.fillRect(-wt - 10, -40, 2 * wt + 20 + lean, 64);
  // faint longitudinal ridges
  c.strokeStyle = 'rgba(110,100,98,0.16)';
  c.lineWidth = 1;
  for (const q of [-0.45, -0.1, 0.3]) {
    c.beginPath(); c.moveTo(q * nw, 20); c.quadraticCurveTo(q * nw + lean * 0.4, 20 - g * 0.6, q * wt + lean, -g + 6); c.stroke();
  }
  // the brighter, more opaque free edge at the growth front
  const fe = c.createLinearGradient(0, -g, 0, -g + 22);
  fe.addColorStop(0, 'rgba(252,250,246,0.9)'); fe.addColorStop(1, 'rgba(252,250,246,0)');
  c.fillStyle = fe; c.fillRect(-wt - 10, -g - 2, 2 * wt + 20 + lean, 26);
  c.restore();
  path();
  c.strokeStyle = 'rgba(70,62,66,0.7)';
  c.lineWidth = 1.2;
  c.stroke();
  c.restore();
}

/** Vertical ruler, 0 at the nail's free edge, 0-4 cm with mm ticks; ticks draw in bottom-up by k. */
function drawRuler(c, v, k, front) {
  if (k <= 0) return;
  const x = G.rx, w = G.rw, top = ZERO - 4 * G.cm - 14, bot = ZERO + 14;
  c.save();
  c.globalAlpha *= L.clamp(k * 2);
  // body: dark glass with a hairline edge
  L.roundRect(c, x, top, w, bot - top, 5);
  c.fillStyle = 'rgba(14,18,30,0.72)'; c.fill();
  c.strokeStyle = 'rgba(205,215,240,0.35)'; c.lineWidth = 1.2; c.stroke();
  c.restore();
  c.save();
  for (let mm = 0; mm <= 40; mm++) {
    const kk = L.clamp((k * 44 - mm) / 4);
    if (kk <= 0) continue;
    const y = ZERO - (mm / 10) * G.cm;
    const isCm = mm % 10 === 0, half = mm % 5 === 0;
    const len = (isCm ? 20 : half ? 13 : 7) * L.ease.outCubic(kk);
    const lit = front != null && y >= ZERO - front - 0.5;
    c.strokeStyle = lit ? L.rgba(v.accent, 0.95) : 'rgba(220,228,245,0.7)';
    c.lineWidth = isCm ? 1.8 : 1.1;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + len, y); c.stroke();
    if (isCm) {
      c.globalAlpha = kk;
      c.font = L.font(24, 700, L.FONT.din);
      c.fillStyle = lit ? L.rgba(v.accent) : 'rgba(220,228,245,0.85)';
      c.textBaseline = 'middle';
      c.textAlign = 'left';
      c.fillText(String(mm / 10), x + w + 8, y + 1);
      c.globalAlpha = 1;
    }
  }
  c.font = L.font(17, 600, L.FONT.body);
  c.fillStyle = 'rgba(205,215,232,0.7)';
  c.textBaseline = 'middle';
  c.globalAlpha = L.clamp(k * 2 - 1);
  L.trackedText(c, 'CM', x + w + 8, ZERO - 4 * G.cm - 34, 3, 'left');
  c.restore();
}

export default {
  beat: 12,
  chapter: { num: '12', title: 'Fingernails', sub: 'about as fast as they grow' },
  captions: true,
  layer: 4,
  cues(d) {
    return [
      { t: T.finger[0] + 0.05, name: 'swish', gain: 0.22, pitch: 0.9 },
      { t: T.ruler[0] + 0.1, name: 'tick', gain: 0.16, pitch: 1.5 },
      { t: T.grow[0], name: 'riser', gain: 0.18, pitch: 1.0 },
      { t: T.grow[0] + 0.05, name: 'count', gain: 0.14, pitch: 1.2 },
      { t: T.bracket, name: 'ping', gain: 0.32, pitch: 1.0 },
      { t: T.bracket + 0.04, name: 'tick', gain: 0.24, pitch: 1.1 },
      { t: T.gloss, name: 'shimmer', gain: 0.14, pitch: 1.3 },
      { t: d - 2.3, name: 'swell', gain: 0.18, pitch: 0.7 },
    ];
  },

  drawOverlay(ctx, v) {
    const t = v.t, k = v.k;
    // first, clear the stage: the orbit scene (Earth dot, rings, Moon) sinks to ~15% so the finger has its own space
    const vk = k * L.ease.inOutCubic(L.prog(t, -0.05, 0.45));
    if (vk > 0) { ctx.save(); ctx.fillStyle = `rgba(2,3,8,${0.85 * vk})`; ctx.fillRect(0, 0, L.W, L.H); ctx.restore(); }
    const fk = L.ease.outCubic(L.prog(t, T.finger[0], T.finger[1]));
    if (fk <= 0) return;
    // a slow push-in on the comparison through the final hold (never a dead still)
    const push = 1 + 0.07 * L.ease.inOutCubic(L.prog(t, T.bracket, v.d - T.bracket));
    const pcx = G.fx + 120, pcy = ZERO - 170;
    ctx.save();
    ctx.translate(pcx, pcy); ctx.scale(push, push); ctx.translate(-pcx, -pcy);
    // soft dark backing for the whole comparison
    ctx.save();
    ctx.globalAlpha = fk * k;
    ctx.translate(G.fx + 110, ZERO - 120);
    ctx.scale(0.8, 1);
    L.lightBlob(ctx, 0, 0, 440, [2, 4, 10], 0.8);
    ctx.restore();

    const rise = (1 - fk) * 70;
    drawFinger(ctx, v, G.fx, ZERO + rise, fk * k, L.prog(t, T.gloss, 1.1));
    const gk = L.ease.inOutCubic(L.prog(t, T.grow[0], T.grow[1]));
    const g = GROW * gk;
    drawRuler(ctx, v, L.prog(t, T.ruler[0], T.ruler[1]) * k, gk > 0 ? g : null);
    drawGrowth(ctx, v, G.fx, g, k * L.clamp(gk * 8));
    // leader from the growth front to the ruler
    if (gk > 0) {
      ctx.save();
      ctx.globalAlpha = k * L.clamp(gk * 8);
      ctx.strokeStyle = L.rgba(v.accent, 0.7);
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(G.fx + G.nw + 4, ZERO - g); ctx.lineTo(G.rx - 2, ZERO - g); ctx.stroke();
      ctx.restore();
    }
    // bracket + "3.8 cm in one year"
    const bk = k * L.prog(t, T.bracket, 0.55);
    if (bk > 0) {
      const bx = G.rx + G.rw + 44;
      ctx.save();
      L.dimension(ctx, bx, ZERO - GROW, ZERO, bk, v.accent, '', 'right');
      const e = L.ease.outCubic(L.clamp(bk));
      ctx.globalAlpha = L.clamp(bk * 1.6);
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 14;
      ctx.textBaseline = 'alphabetic';
      ctx.font = L.font(76, 800, L.FONT.display);
      ctx.fillStyle = L.rgba(v.accent);
      const ly = ZERO - GROW / 2 + 10 + (1 - e) * 20;
      ctx.fillText('3.8 cm', bx + 26, ly);
      ctx.font = L.font(22, 600, L.FONT.body);
      ctx.fillStyle = 'rgba(210,220,235,0.95)';
      L.trackedText(ctx, 'IN ONE YEAR', bx + 28, ly + 38, 3, 'left');
      ctx.restore();
    }
    // header: the comparison, stated once
    const hk = k * L.enter(t, T.header, 0.6);
    if (hk > 0) {
      ctx.save();
      ctx.globalAlpha = hk;
      ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 12;
      ctx.textBaseline = 'alphabetic';
      ctx.font = L.font(26, 700, L.FONT.body);
      ctx.fillStyle = 'rgba(232,238,250,0.95)';
      L.trackedText(ctx, 'MOON DRIFT ≈ NAIL GROWTH', G.fx + 120, ZERO - 4 * G.cm - 80 + (1 - L.ease.outCubic(L.clamp(hk))) * 12, 4, 'center');
      ctx.restore();
    }
    ctx.restore();
  },
};
