// Beat 12 — "That's about as fast as your fingernails grow." Final hold.
// The Earth-Moon dressing clears (s10 systemOut) and the frame dims to near-black; a realistic fingertip (back of the
// hand, turned slightly, natural skin tones, knuckle creases) with a normal nail (pink bed, lunula, short white free
// edge) rises beside a 0-4 cm ruler whose 0 sits on the apex of the free edge. One year of untrimmed growth then
// draws out as pale translucent keratin (white free edge riding the tip, dashed outline) to the 3.8 cm mark, labelled "1 year of growth".
// A bracket "3.8 cm / MOON’S DRIFT IN ONE YEAR" (the Moon's drift, the thing being compared) lands on "grow". Then a slow push-in
// and a gloss sweep through the hold; the labels fade out over the beat's last 0.4 s.
import * as L from '../../../../engine/runtime/lib.js';
import { stars } from '../../../../engine/runtime/kit.js';

const TAU = Math.PI * 2;
/** Beat-local timing (s). "That's about as fast as your fingernails grow." 0.15-2.49. */
const T = { finger: [0.3, 0.8], ruler: [0.55, 0.9], grow: [0.95, 1.55], bracket: 2.0,   // 11c: bracket 2.35 → 2.0 (shorter beat)
  header: 0.65, gloss: 3.3 };
/** Layout (screen px). ZERO = apex of the nail's arched tip (ruler zero); cm = pixels per centimetre on the ruler. */
const G = { fx: 455, zero: 1026, cm: 90, fw: 74, nw: 46, rx: 580, rw: 42 };
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

/** The fingertip (back of the hand, turned a few degrees so its left flank shows), drawn into a local canvas
 *  (origin = apex of the nail's free edge = ruler 0), faded out below the first knuckle. Natural skin tones under a
 *  soft key light from the upper right, a short white free edge, the pink nail bed and its lunula. */
function drawFinger(c, v, x, y, k, gloss) {
  const oc = offscreen();
  if (!oc) return;
  const o = oc.getContext('2d');
  const OX = 170, OY = 30;
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.clearRect(0, 0, oc.width, oc.height);
  o.translate(OX, OY);
  const fw = G.fw, H = 380, nw = G.nw;
  // the slight turn: the finger's axis sits a few px left of the nail's, so the left flank is wider than the right
  const sh = -5;
  const body = () => {
    o.beginPath();
    o.moveTo(-fw - 6 + sh, H);
    o.bezierCurveTo(-fw - 4 + sh, 260, -fw + sh, 200, -fw + sh, 122);
    o.bezierCurveTo(-fw + sh, 44, -fw * 0.6 + sh, 6, sh * 0.5, 6);
    o.bezierCurveTo(fw * 0.6, 6, fw - 2, 44, fw - 2, 122);
    o.bezierCurveTo(fw - 2, 200, fw + 2, 260, fw + 4, H);
    o.closePath();
  };
  // skin: warm, natural tones; the flank turned away is in soft shadow, the back of the finger catches the light
  body();
  const bg = o.createLinearGradient(-fw + sh, 0, fw, 0);
  bg.addColorStop(0, '#4a2f28'); bg.addColorStop(0.16, '#7d5143'); bg.addColorStop(0.42, '#b98169');
  bg.addColorStop(0.66, '#cf9a80'); bg.addColorStop(0.86, '#b37c66'); bg.addColorStop(1, '#6a463c');
  o.fillStyle = bg; o.fill();
  o.save();
  body(); o.clip();
  // the fingertip is a touch rosier (more blood near the surface), the skin over the joint a touch duller
  const rg = o.createLinearGradient(0, 0, 0, 150);
  rg.addColorStop(0, 'rgba(205,105,95,0.22)'); rg.addColorStop(1, 'rgba(205,105,95,0)');
  o.fillStyle = rg; o.fillRect(-fw - 10, 0, 2 * fw + 20, 150);
  // soft key light on the back of the finger
  const tg = o.createRadialGradient(18, 150, 10, 18, 150, 150);
  tg.addColorStop(0, 'rgba(255,225,205,0.2)'); tg.addColorStop(1, 'rgba(255,225,205,0)');
  o.fillStyle = tg; o.fillRect(-fw - 10, 0, 2 * fw + 20, 340);
  // fine skin texture: faint, nearly straight transverse lines on the back of the finger
  o.strokeStyle = 'rgba(90,55,45,0.08)';
  o.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    const yy = 152 + i * 7.5, w = fw * (0.42 + 0.06 * Math.sin(i * 2.3));
    o.beginPath(); o.moveTo(-w, yy + 0.6); o.lineTo(w * 0.9, yy - 0.4); o.stroke();
  }
  // distal knuckle (DIP) creases on the back of the finger: faint, straight, slightly uneven horizontal wrinkles
  // with a soft lit lip under each (no curved arcs: those read as a fingerprint, which lives on the pad side)
  for (const [dy, w0, w1, a] of [[224, 0.5, 0.56, 0.3], [231, 0.62, 0.5, 0.34], [238, 0.44, 0.6, 0.3], [246, 0.36, 0.4, 0.2]]) {
    o.strokeStyle = `rgba(78,44,36,${a})`;
    o.lineWidth = 1.3;
    o.beginPath(); o.moveTo(-fw * w0 + sh, dy + 0.8); o.lineTo(sh * 0.5, dy - 0.4); o.lineTo(fw * w1, dy + 0.6); o.stroke();
    o.strokeStyle = `rgba(240,200,180,${a * 0.3})`;
    o.lineWidth = 1;
    o.beginPath(); o.moveTo(-fw * w0 + sh, dy + 2.6); o.lineTo(sh * 0.5, dy + 1.4); o.lineTo(fw * w1, dy + 2.4); o.stroke();
  }
  // a cool rim of moonlight down the right edge (the accent), kept faint so the skin stays skin
  o.strokeStyle = L.rgba(v.accent, 0.28);
  o.lineWidth = 2.5;
  o.beginPath(); o.moveTo(fw * 0.5, 9); o.bezierCurveTo(fw - 3, 44, fw - 3, 80, fw - 3, 122); o.bezierCurveTo(fw - 3, 200, fw + 1, 260, fw + 3, H); o.stroke();
  // the shadow the nail's side folds cast on the skin
  o.fillStyle = 'rgba(60,30,25,0.18)';
  o.beginPath(); o.ellipse(0, NAIL_LEN * 0.55, nw + 9, NAIL_LEN * 0.62, 0, 0, Math.PI * 2); o.fill();
  o.restore();

  // nail plate: the pink bed seen through the plate
  nailPath(o, nw);
  const ng = o.createLinearGradient(0, 0, 0, NAIL_LEN);
  ng.addColorStop(0, '#e9bcb0'); ng.addColorStop(0.5, '#e0aca1'); ng.addColorStop(1, '#d59d93');
  o.fillStyle = ng; o.fill();
  o.save();
  nailPath(o, nw); o.clip();
  // transverse curvature: the plate's sides turn down into the folds
  const cg = o.createLinearGradient(-nw, 0, nw, 0);
  cg.addColorStop(0, 'rgba(120,60,55,0.3)'); cg.addColorStop(0.22, 'rgba(120,60,55,0)'); cg.addColorStop(0.8, 'rgba(120,60,55,0)'); cg.addColorStop(1, 'rgba(120,60,55,0.22)');
  o.fillStyle = cg; o.fillRect(-nw, -4, 2 * nw, NAIL_LEN + 8);
  // the short white free edge, above a curved "smile line" (with the pale onychodermal band just under it)
  const FE = 13;
  o.beginPath();
  o.moveTo(-nw - 2, -20); o.lineTo(nw + 2, -20); o.lineTo(nw + 2, 36 + FE);
  o.bezierCurveTo(nw, 9 + FE, nw * 0.55, FE, 0, FE);
  o.bezierCurveTo(-nw * 0.55, FE, -nw, 9 + FE, -nw - 2, 36 + FE);
  o.closePath();
  o.fillStyle = 'rgba(247,243,235,0.96)';
  o.fill();
  o.strokeStyle = 'rgba(245,215,205,0.55)';
  o.lineWidth = 3;
  o.beginPath();
  o.moveTo(nw + 2, 38 + FE); o.bezierCurveTo(nw, 11 + FE, nw * 0.55, FE + 2, 0, FE + 2);
  o.bezierCurveTo(-nw * 0.55, FE + 2, -nw, 11 + FE, -nw - 2, 38 + FE);
  o.stroke();
  // lunula, the pale "little moon" at the base
  o.fillStyle = 'rgba(250,236,232,0.6)';
  o.beginPath(); o.ellipse(0, NAIL_LEN - 6, nw * 0.62, 24, 0, Math.PI, Math.PI * 2); o.fill();
  // gloss: a long soft highlight, plus a sweep later in the hold
  const hg = o.createLinearGradient(-nw * 0.6, 0, -nw * 0.15, 0);
  hg.addColorStop(0, 'rgba(255,255,255,0)'); hg.addColorStop(0.5, 'rgba(255,255,255,0.26)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
  o.fillStyle = hg; o.fillRect(-nw * 0.6, 14, nw * 0.45, NAIL_LEN - 30);
  if (gloss > 0 && gloss < 1) {
    const gy = L.lerp(-30, NAIL_LEN + 30, gloss);
    const sg = o.createLinearGradient(0, gy - 18, 0, gy + 18);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.3)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    o.fillStyle = sg; o.fillRect(-nw, gy - 18, 2 * nw, 36);
  }
  o.restore();
  // lateral nail folds + cuticle: skin softly overlapping the plate
  o.strokeStyle = 'rgba(110,62,52,0.6)';
  o.lineWidth = 2.4;
  o.beginPath(); o.moveTo(-nw - 1, 40); o.lineTo(-nw - 1, NAIL_LEN - 26); o.bezierCurveTo(-nw - 1, NAIL_LEN + 7, nw + 1, NAIL_LEN + 7, nw + 1, NAIL_LEN - 26); o.lineTo(nw + 1, 40); o.stroke();
  o.strokeStyle = 'rgba(235,190,175,0.35)';
  o.lineWidth = 1.2;
  o.beginPath(); o.moveTo(-nw + 6, NAIL_LEN - 1); o.bezierCurveTo(-nw * 0.5, NAIL_LEN + 9, nw * 0.5, NAIL_LEN + 9, nw - 6, NAIL_LEN - 1); o.stroke();
  nailPath(o, nw);
  o.strokeStyle = 'rgba(255,240,235,0.35)';
  o.lineWidth = 1;
  o.stroke();

  // fade the finger out toward the bottom
  o.globalCompositeOperation = 'destination-in';
  const fg = o.createLinearGradient(0, 170, 0, 310);   // more of the finger, past the first knuckle
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

/** Growth outline (local coords, origin = free-edge apex = ruler 0): the nail continued straight on, its width
 *  and gentle curve kept, the root following the free edge's arch. */
function ghostPath(c, g) {
  const nw = G.nw, f = g / GROW, wt = nw * (1 - 0.06 * f), lean = 8 * f * f;
  const rt = Math.min(20, g * 0.35);
  c.beginPath();
  c.moveTo(-nw, 36);
  c.bezierCurveTo(-nw, 36 - g * 0.5, -wt + lean * 0.6, -g * 0.6, -wt + lean, -g + rt);
  c.bezierCurveTo(-wt + lean, -g + rt * 0.3, -wt * 0.6 + lean, -g, lean, -g);
  c.bezierCurveTo(wt * 0.6 + lean, -g, wt + lean, -g + rt * 0.3, wt + lean, -g + rt);
  c.bezierCurveTo(wt + lean * 0.6, -g * 0.6, nw, 36 - g * 0.5, nw, 36);
  c.bezierCurveTo(nw, 9, nw * 0.55, 0, 0, 0);
  c.bezierCurveTo(-nw * 0.55, 0, -nw, 9, -nw, 36);
  c.closePath();
}

/** Clip to everything ABOVE today's free-edge arch (local coords): the ghost never draws over the real nail. */
function aboveArch(c, g) {
  const nw = G.nw;
  c.beginPath();
  c.moveTo(-nw - 12, -g - 40); c.lineTo(nw + 12, -g - 40); c.lineTo(nw + 12, 36); c.lineTo(nw, 36);
  c.bezierCurveTo(nw, 9, nw * 0.55, 0, 0, 0);
  c.bezierCurveTo(-nw * 0.55, 0, -nw, 9, -nw, 36);
  c.lineTo(-nw - 12, 36);
  c.closePath();
  c.clip();
}

/** One year of untrimmed growth: the nail's free edge carried on as pale, translucent keratin from today's free edge
 *  (apex = ruler 0) to the growth front at g px. The opaque white free edge rides the growth front (the tip of an
 *  untrimmed nail is its whitest part); a dashed outline marks the ghost, clipped at today's free edge. */
function drawGrowth(c, v, x, g, k) {
  if (g <= 0.5 || k <= 0) return;
  const nw = G.nw, f = g / GROW, wt = nw * (1 - 0.06 * f), lean = 8 * f * f, rt = Math.min(20, g * 0.35);
  c.save();
  c.translate(x, ZERO);
  c.globalAlpha *= k;
  aboveArch(c, g);
  // pale keratin: ivory, translucent near the finger, denser toward the tip
  ghostPath(c, g);
  const fg = c.createLinearGradient(0, 20, 0, -g);
  fg.addColorStop(0, 'rgba(238,229,212,0.7)'); fg.addColorStop(0.7, 'rgba(242,235,220,0.78)'); fg.addColorStop(1, 'rgba(247,242,231,0.86)');
  c.fillStyle = fg;
  c.fill();
  c.save();
  ghostPath(c, g); c.clip();
  // transverse curvature: the plate's sides turn away, a little darker; a long soft gloss down the left third
  const cg = c.createLinearGradient(-nw, 0, nw, 0);
  cg.addColorStop(0, 'rgba(120,105,90,0.28)'); cg.addColorStop(0.2, 'rgba(120,105,90,0)'); cg.addColorStop(0.82, 'rgba(120,105,90,0)'); cg.addColorStop(1, 'rgba(120,105,90,0.22)');
  c.fillStyle = cg; c.fillRect(-nw - 4, -g - 4, 2 * nw + 20, g + 44);
  const hg = c.createLinearGradient(-nw * 0.6, 0, -nw * 0.15, 0);
  hg.addColorStop(0, 'rgba(255,255,255,0)'); hg.addColorStop(0.5, 'rgba(255,255,255,0.22)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = hg; c.fillRect(-nw * 0.6, -g + 18, nw * 0.45, g - 18);
  // the white free edge at the growth front (same depth as the finger's: ~13 px), following the tip's arch
  const FE = Math.min(14, g * 0.5);
  c.beginPath();
  c.moveTo(-wt + lean - 4, -g - 6); c.lineTo(wt + lean + 4, -g - 6); c.lineTo(wt + lean + 4, -g + rt + FE);
  c.bezierCurveTo(wt + lean, -g + rt * 0.3 + FE, wt * 0.6 + lean, -g + FE, lean, -g + FE);
  c.bezierCurveTo(-wt * 0.6 + lean, -g + FE, -wt + lean, -g + rt * 0.3 + FE, -wt + lean - 4, -g + rt + FE);
  c.closePath();
  c.fillStyle = 'rgba(248,245,238,0.95)';
  c.fill();
  c.restore();
  // dashed outline (sides only below the white tip; clipped at today's free edge by aboveArch)
  c.setLineDash([7, 6]);
  c.lineDashOffset = 0;
  c.strokeStyle = 'rgba(236,232,224,0.6)';
  c.lineWidth = 1.4;
  ghostPath(c, g);
  c.stroke();
  c.setLineDash([]);
  // the growth front: a firm, bright edge
  c.strokeStyle = 'rgba(252,250,244,0.95)';
  c.lineWidth = 2.2;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-wt + lean, -g + rt);
  c.bezierCurveTo(-wt + lean, -g + rt * 0.3, -wt * 0.6 + lean, -g, lean, -g);
  c.bezierCurveTo(wt * 0.6 + lean, -g, wt + lean, -g + rt * 0.3, wt + lean, -g + rt);
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
      c.font = L.font(30, 700, L.FONT.din);
      c.fillStyle = lit ? L.rgba(v.accent) : 'rgba(220,228,245,0.85)';
      c.textBaseline = 'middle';
      c.textAlign = 'left';
      c.fillText(String(mm / 10), x + w + 8, y + 1);
      c.globalAlpha = 1;
    }
  }
  c.font = L.font(28, 600, L.FONT.body);
  c.fillStyle = 'rgba(205,215,232,0.8)';
  c.textBaseline = 'middle';
  c.globalAlpha = L.clamp(k * 2 - 1);
  L.trackedText(c, 'CM', x, ZERO - 4 * G.cm - 40, 3, 'left');
  c.restore();
}

export default {
  beat: 9,
  chapter: { num: '09', title: 'Fingernails', sub: 'about as fast as they grow' },
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

  // 11b: beat 13 (s13-question.js) picks the comparison up via drawComparison() and fades it to black before its
  // card lands; this beat's own overlay hands over exactly at its end. The labels (bracket, header) fade out over the
  // last 0.4 s here, so none of them is still on when the card arrives.
  drawOverlay(ctx, v) {
    if (v.gt >= v.tl.scenes[v.index].end) return;
    // labels out over the last 0.4 s; (audit fix) the finger, nail and ruler follow over the last 0.3 s, so the frame is
    // already clear when s13's opaque card lands (no faint finger left around it)
    drawComparison(ctx, { ...v, k: v.t < 1 ? v.k : 1, labelK: 1 - L.ease.inOutCubic(L.prog(v.t, v.d - 0.4, 0.38)),
      subjectK: 1 - L.ease.inOutCubic(L.prog(v.t, v.d - 0.3, 0.3)) });
  },
};

/** The fingertip / ruler comparison (overlay layer); `v` is beat 12's view (t, d, k; optional labelK fades the
 *  bracket label and the header; optional subjectK fades the finger, nail and ruler while the dim stays). */
export function drawComparison(ctx, v) {
  const t = v.t;
  // first, clear the stage: the world (Earth dot, starfield) dims to near-black — the orbit, rings and tags have
  // already gone (s10 systemOut) — and the starfield is laid back on top at its usual strength
  const vk = v.k * L.ease.inOutCubic(L.prog(t, -0.05, 0.45));
  if (vk > 0) {
    ctx.save(); ctx.fillStyle = `rgba(2,3,8,${0.94 * vk})`; ctx.fillRect(0, 0, L.W, L.H); ctx.restore();
    stars(ctx, v, 0.22 * vk, 170, 11);
  }
  const k = v.k * (v.subjectK ?? 1);
  const fk = L.ease.outCubic(L.prog(t, T.finger[0], T.finger[1]));
  if (fk <= 0 || k <= 0) return;
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
  // ruler zero, tied to the apex of the nail's tip
  const zk = k * L.clamp(L.prog(t, T.ruler[0], T.ruler[1]) * 2 - 1);
  if (zk > 0) {
    ctx.save();
    ctx.globalAlpha = 0.5 * zk;
    ctx.strokeStyle = 'rgba(220,228,245,0.8)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(G.fx + 6, ZERO); ctx.lineTo(G.rx - 2, ZERO); ctx.stroke();
    ctx.restore();
  }
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
  // bracket + "3.8 cm / moon’s drift in one year": the Moon's yearly drift, laid against the nail (nails: ~3-4 cm a year)
  // (audit fix) the exit is a plain fade (labelK as alpha): shrinking the bracket's k on the way out collapsed it
  // to a lone centre tick at "2"
  const bk = k * L.prog(t, T.bracket, 0.55), bla = v.labelK ?? 1;
  if (bk > 0 && bla > 0.001) {
    const bx = G.rx + G.rw + 52;
    ctx.save();
    ctx.globalAlpha *= bla;
    L.dimension(ctx, bx, ZERO - GROW, ZERO, bk, v.accent, '', 'right');
    const e = L.ease.outCubic(L.clamp(bk));
    ctx.globalAlpha = L.clamp(bk * 1.6) * bla;
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 14;
    ctx.textBaseline = 'alphabetic';
    const tx = bx + 26, maxW = 920 - tx;   // Shorts-safe right edge
    ctx.font = L.font(L.fitSize(ctx, '3.8 cm', maxW, 76, 800, L.FONT.display, 48), 800, L.FONT.display);
    ctx.fillStyle = L.rgba(v.accent);
    const ly = ZERO - GROW / 2 + 10 + (1 - e) * 20;
    ctx.fillText('3.8 cm', tx, ly);
    ctx.fillStyle = 'rgba(210,220,235,0.95)';
    const sub = ['MOON’S DRIFT', 'IN ONE YEAR'];   // tracking adds ~3 px a glyph: fit to maxW − 40
    const ss = Math.min(...sub.map((q) => L.fitSize(ctx, q, maxW - 40, 26, 700, L.FONT.body, 18)));
    ctx.font = L.font(ss, 700, L.FONT.body);
    sub.forEach((q, i) => L.trackedText(ctx, q, tx + 2, ly + 40 + i * (ss + 8), 3, 'left'));
    ctx.restore();
  }
  // what the ghost is: one year of growth, untrimmed (left of the nail, right-aligned to it)
  const gl = k * (v.labelK ?? 1) * L.enter(t, T.grow[1] - 0.05, 0.5);
  if (gl > 0) {
    ctx.save();
    ctx.globalAlpha = gl;
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 10;
    ctx.textBaseline = 'alphabetic';
    const rx = G.fx - G.nw - 26, maxW = rx - 90 - 30;   // left edge ≥ 90 px (stays ≥ 40 px after the push-in); tracking ≈ 30 px
    const lines = ['1 YEAR OF GROWTH', '(UNTRIMMED)'];
    const fs = Math.max(26, Math.min(...lines.map((q) => L.fitSize(ctx, q, maxW, 30, 700, L.FONT.body, 26))));
    ctx.font = L.font(fs, 700, L.FONT.body);
    const ly = ZERO - GROW * 0.55 + (1 - L.ease.outCubic(L.clamp(gl))) * 10;
    ctx.fillStyle = 'rgba(236,232,224,0.95)';
    L.trackedText(ctx, lines[0], rx, ly, 2, 'right');
    ctx.fillStyle = 'rgba(205,212,228,0.8)';
    L.trackedText(ctx, lines[1], rx, ly + fs + 8, 2, 'right');
    // a short dashed tick back to the ghost's edge
    ctx.strokeStyle = 'rgba(236,232,224,0.6)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(rx + 6, ly - fs * 0.35); ctx.lineTo(G.fx - G.nw - 4, ly - fs * 0.35); ctx.stroke();
    ctx.restore();
  }
  // header: the comparison, stated once
  const hk = k * (v.labelK ?? 1) * L.enter(t, T.header, 0.6);
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
}
