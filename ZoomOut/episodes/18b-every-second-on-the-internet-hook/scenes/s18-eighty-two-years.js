// Beat 18 — "One single day of uploads | would take about eighty-two years to watch, nonstop. | Longer than a lifetime."
// The reveal, on the same phone (0.32 mm/px, slow push).
//   * "One single day of uploads": the upload feed rushes, lifts away, and the screen settles into ONE video player
//     (an abstract picture playing, a "1 DAY OF UPLOADS" chip, its progress bar at the very start). "720,000 hours /
//     uploaded every day" (from s17) holds above.
//   * "would take about...": the 720,000 label lifts off; the player's progress bar flies out of the phone and stretches
//     into a lifetime-long timeline across the frame (82 year ticks, decades numbered).
//   * "eighty-two years": the playhead races 0 -> 82 while the headline counts with it, and slams on "eighty-two":
//     82 YEARS, the film's biggest hit (flash, a light sweep down the bar, the ticks ripple).
//   * "Longer than a lifetime.": a warm lifetime marker drops in at 73 years and the last 9 years beyond it glow warm.
//   * After the voice: "ZOOM OUT · BY THE NUMBERS" sits in the caption slot. Composed final frame (cover ~85.0 s).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, WARM } from '../env.js';
import { screenRect, wordTime, phraseAt } from './s01-one-phone.js';
import { drawFeed, uploadLabel } from './s17-back-to-phone.js';

const { W } = L;
const TAU = Math.PI * 2;
const YEARS = 82, LIFE = 73;                       // ~73 years: average life expectancy worldwide
const BAR = { x0: 96, x1: 900, y: 694, h: 10 };   // ends at 900: the head glow stays clear of the UI (x > 960)
const HEAD = { x: 96, y: 540, size: 190 };
let OUT = 1;   // 18b: the overlay's fade-out (v.k), multiplied into every alpha the overlay sets

// ------------------------------------------------------------------ timing
function times(tl) {
  const s = tl.scenes[18].start;
  const hit = wordTime(tl, 18, 'eighty') + 0.05;   // ~83.02
  return {
    s,
    rush: s + 0.15,                         // "One single day...": the feed rushes
    lift: s + 0.8,                          // ... and lifts away
    player: s + 0.95,                       // one player settles in (~80.7)
    fly: phraseAt(tl, 18, 1) - 0.3,         // the progress bar flies out of the phone (in place by ~82.4)
    fill: hit - 0.58,                       // playhead races 0 -> 82 over "about eighty-two"
    exit: hit - 1.0,                        // the 720,000 label holds over the bar's flight, hands off as the count inks in
    hit,
    life: phraseAt(tl, 18, 2) - 0.05,       // "Longer than a lifetime."
    close: tl.lines[18].end + 0.95,         // closing tag after the last caption
  };
}
const xAt = (yr) => L.lerp(BAR.x0, BAR.x1, yr / YEARS);
const fillK = (gt, tm) => L.ease.inOutCubic(L.prog(gt, tm.fill, tm.hit - tm.fill));

// ------------------------------------------------------------------ the phone: one video player
function playerGeom(R) {
  const s = R.s, top = R.y + 0.0158 * s;
  const vh = R.w * 9 / 16;
  return { s, top, vx: R.x, vw: R.w, vh, bh: Math.max(2, 0.0007 * s) };
}
function drawPlayer(c, v, tm, k) {
  if (k <= 0.003) return;
  const R = screenRect(v);
  if (R.h < 50) return;
  const gt = v.gt;
  const { s, top, vx, vw, vh, bh } = playerGeom(R);
  const pad = 0.0034 * s;
  c.save();
  L.roundRect(c, R.x, R.y, R.w, R.h, R.r); c.clip();
  c.globalAlpha = k;
  c.fillStyle = 'rgb(6,10,20)';
  c.fillRect(R.x, R.y, R.w, R.h);
  // header
  const hy = R.y + 0.0118 * s;
  c.fillStyle = 'rgba(230,238,250,0.95)';
  c.font = L.font(Math.max(4, 0.0027 * s), 700, L.FONT.body);
  c.textBaseline = 'alphabetic';
  L.trackedText(c, 'NOW PLAYING', R.x + pad, hy, 0.0003 * s, 'left');
  // the video: slides down into place
  const vin = L.ease.outCubic(L.prog(gt, tm.player, 0.6));
  const vy = top - (1 - vin) * vh * 0.4;
  c.save();
  c.beginPath(); c.rect(vx, vy, vw, vh); c.clip();
  const g = c.createLinearGradient(vx, vy, vx + vw, vy + vh);
  g.addColorStop(0, 'rgb(14,34,70)'); g.addColorStop(0.6, 'rgb(28,70,130)'); g.addColorStop(1, 'rgb(60,120,190)');
  c.fillStyle = g;
  c.fillRect(vx, vy, vw, vh);
  // abstract moving picture: drifting light bands and a slow sun
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const ph = gt * (0.12 + i * 0.05) + i * 2.1;
    const bx = vx + vw * (((ph % 1.6) + 1.6) % 1.6 - 0.3);
    const bg = c.createLinearGradient(bx - vw * 0.2, 0, bx + vw * 0.2, 0);
    bg.addColorStop(0, 'rgba(120,180,255,0)'); bg.addColorStop(0.5, `rgba(140,200,255,${0.14 * k})`); bg.addColorStop(1, 'rgba(120,180,255,0)');
    c.fillStyle = bg;
    c.fillRect(vx, vy, vw, vh);
  }
  L.lightBlob(c, vx + vw * (0.7 + 0.05 * Math.sin(gt * 0.5)), vy + vh * 0.38, vh * 0.5, [255, 210, 160], 0.35 * k);
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = 'rgba(4,10,22,0.55)';
  c.beginPath();
  c.moveTo(vx, vy + vh);
  for (let x = 0; x <= 1.0001; x += 0.05) c.lineTo(vx + vw * x, vy + vh * (0.7 + 0.08 * Math.sin(x * 7 + 1.3) + 0.04 * Math.sin(x * 17)));
  c.lineTo(vx + vw, vy + vh); c.closePath(); c.fill();
  // "1 DAY OF UPLOADS" chip
  c.fillStyle = 'rgba(4,8,16,0.7)';
  const cw = 0.0215 * s, chh = 0.0042 * s;
  L.roundRect(c, vx + pad * 0.7, vy + pad * 0.7, cw, chh, chh / 2); c.fill();
  c.fillStyle = 'rgba(235,242,252,0.95)';
  c.font = L.font(Math.max(4, 0.0022 * s), 700, L.FONT.body);
  c.textBaseline = 'middle';
  L.trackedText(c, '1 DAY OF UPLOADS', vx + pad * 0.7 + cw / 2, vy + pad * 0.7 + chh / 2 + 0.5, 0.0001 * s, 'center');
  c.restore();
  // progress bar: the whole day, its playhead barely started (it would take 82 years)
  const by = vy + vh;
  c.fillStyle = 'rgba(255,255,255,0.22)';
  c.fillRect(vx, by - bh, vw, bh);
  const pp = 0.004 + 0.0004 * Math.max(0, gt - tm.player);
  c.fillStyle = L.rgba(ACCENT);
  c.fillRect(vx, by - bh, vw * pp, bh);
  c.fillStyle = 'rgba(240,246,255,1)';
  c.beginPath(); c.arc(vx + vw * pp, by - bh / 2, Math.max(0, bh * 1.6), 0, TAU); c.fill();
  // time + title skeleton
  c.font = L.font(Math.max(4, 0.0021 * s), 600, L.FONT.body);
  c.fillStyle = 'rgba(170,186,210,0.85)';
  c.textBaseline = 'alphabetic';
  L.trackedText(c, '0:00:01', R.x + pad, by + 0.0042 * s, 0, 'left');
  L.trackedText(c, '720,000:00:00', R.x + R.w - pad, by + 0.0042 * s, 0, 'right');
  const ty = by + 0.0072 * s;
  c.fillStyle = 'rgba(225,235,248,0.7)';
  L.roundRect(c, R.x + pad, ty, R.w * 0.7, 0.0018 * s, 0.0009 * s); c.fill();
  c.fillStyle = 'rgba(170,185,210,0.35)';
  L.roundRect(c, R.x + pad, ty + 0.0034 * s, R.w * 0.45, 0.0014 * s, 0.0007 * s); c.fill();
  // up-next rows, dim
  for (let i = 0; i < 4; i++) {
    const ry = ty + 0.0085 * s + i * 0.0118 * s;
    const a = 0.5 * L.ease.outCubic(L.prog(gt, tm.player + 0.2 + i * 0.06, 0.4));
    c.fillStyle = `rgba(40,70,120,${a})`;
    L.roundRect(c, R.x + pad, ry, 0.017 * s, 0.0096 * s, 0.001 * s); c.fill();
    c.fillStyle = `rgba(200,212,232,${0.5 * a})`;
    L.roundRect(c, R.x + pad + 0.0195 * s, ry + 0.0015 * s, R.w * 0.45, 0.0014 * s, 0.0007 * s); c.fill();
    c.fillStyle = `rgba(160,175,200,${0.3 * a})`;
    L.roundRect(c, R.x + pad + 0.0195 * s, ry + 0.0045 * s, R.w * 0.3, 0.0012 * s, 0.0006 * s); c.fill();
  }
  c.restore();
  // camera pill on top
  const iw = 0.0124 * s, ih = Math.max(1.2, 0.0036 * s), iy = R.y + 0.0033 * s;
  c.fillStyle = '#010102';
  L.roundRect(c, R.cx - iw / 2, iy, iw, ih, ih / 2); c.fill();
}

// ------------------------------------------------------------------ the lifetime timeline (screen space)
function drawTimeline(c, v, tm) {
  const gt = v.gt;
  const fp = L.ease.inOutCubic(L.prog(gt, tm.fly, 0.6));
  if (fp <= 0) return;
  // the flying bar: from the phone's progress bar to the big track
  const R = screenRect(v), P = playerGeom(R);
  const sy = (P.top + P.vh) - P.bh / 2;
  const x0 = L.lerp(R.x, BAR.x0, fp), x1 = L.lerp(R.x + R.w, BAR.x1, fp), y = L.lerp(sy, BAR.y, fp);
  const h = L.lerp(P.bh, BAR.h, fp);
  const arc = Math.sin(Math.PI * fp) * -40;     // a small lift on the way out
  c.save();
  c.translate(0, arc);
  // track
  c.fillStyle = `rgba(200,215,240,${0.1 + 0.08 * fp})`;
  L.roundRect(c, x0, y - h / 2, x1 - x0, h, h / 2); c.fill();
  c.strokeStyle = `rgba(200,215,240,${0.25 * fp})`;
  c.lineWidth = 1;
  L.roundRect(c, x0, y - h / 2, x1 - x0, h, h / 2); c.stroke();
  c.restore();
  if (fp < 1) return;
  // ticks + decade numbers (appear as the playhead passes; each one ripples)
  const f = fillK(gt, tm), yr = f * YEARS;
  const hitK = Math.exp(-Math.pow((gt - tm.hit - 0.15) / 0.3, 2));
  c.save();
  c.textBaseline = 'alphabetic';
  for (let i = 0; i <= YEARS; i++) {
    const x = xAt(i);
    const dec = i % 10 === 0;
    const pass = L.clamp((yr - i) * 0.6 + 1);              // 0 before the playhead, 1 once passed
    const pre = L.ease.outCubic(L.prog(gt, tm.fly + 0.45 + i * 0.004, 0.35));
    const pop = Math.exp(-Math.pow((yr - i) / 1.6, 2)) * (gt < tm.hit + 0.1 ? 1 : 0);
    const ripple = hitK * Math.exp(-Math.pow((i / YEARS - L.prog(gt, tm.hit, 0.6)) * 8, 2));
    const len = (dec ? 16 : 7) * pre + 8 * pop + 6 * ripple;
    const life = i > LIFE ? L.ease.outCubic(L.prog(gt, tm.life + 0.3, 0.6)) : 0;
    const col = L.mix([150, 170, 200], i > LIFE ? WARM : [200, 225, 255], Math.max(pass, life));
    c.strokeStyle = L.rgba(col, (0.35 + 0.5 * Math.max(pass, life)) * pre);
    c.lineWidth = dec ? 2 : 1.3;
    c.beginPath(); c.moveTo(x, BAR.y + 12); c.lineTo(x, BAR.y + 12 + len); c.stroke();
    if (dec) {
      c.font = L.font(25, 700, L.FONT.din);
      c.fillStyle = L.rgba(col, (0.5 + 0.45 * pass) * pre);
      L.trackedText(c, String(i), x, BAR.y + 56 - 4 * pop, 1, 'center');
    }
  }
  c.font = L.font(17, 600, L.FONT.body);
  c.fillStyle = `rgba(170,185,210,${0.75 * L.ease.outCubic(L.prog(gt, tm.fly + 0.7, 0.4))})`;
  L.trackedText(c, 'YEARS', BAR.x1, BAR.y + 82, 3, 'right');
  // the fill + playhead
  if (f > 0) {
    const fx = xAt(yr);
    const g = c.createLinearGradient(BAR.x0, 0, BAR.x1, 0);
    g.addColorStop(0, L.rgba([60, 130, 230]));
    g.addColorStop(1, L.rgba([130, 200, 255]));
    c.fillStyle = g;
    L.roundRect(c, BAR.x0, BAR.y - BAR.h / 2, Math.max(BAR.h, fx - BAR.x0), BAR.h, BAR.h / 2); c.fill();
    // beyond a lifetime: the last 9 years turn warm
    const lk = L.ease.outCubic(L.prog(gt, tm.life + 0.3, 0.6));
    if (lk > 0) {
      const lx = xAt(LIFE);
      const wg = c.createLinearGradient(lx, 0, BAR.x1, 0);
      wg.addColorStop(0, L.rgba(WARM, 0.75 * lk)); wg.addColorStop(1, L.rgba([255, 220, 170], lk));
      c.fillStyle = wg;
      c.save();
      c.beginPath(); c.rect(lx, BAR.y - 20, BAR.x1 - lx + 10, 40); c.clip();
      L.roundRect(c, BAR.x0, BAR.y - BAR.h / 2, BAR.x1 - BAR.x0, BAR.h, BAR.h / 2); c.fill();
      c.restore();
      L.lightBlob(c, (lx + BAR.x1) / 2, BAR.y, 90, WARM, 0.22 * lk * (0.8 + 0.2 * Math.sin(gt * 2.4)));
    }
    c.save();
    c.globalCompositeOperation = 'lighter';
    // a slow shimmer travelling the bar during the hold
    const sh = ((gt - tm.hit) / 2.6) % 1;
    if (gt > tm.hit + 0.6) {
      const sx = L.lerp(BAR.x0, BAR.x1, sh);
      const sg = c.createLinearGradient(sx - 80, 0, sx + 80, 0);
      sg.addColorStop(0, 'rgba(200,230,255,0)'); sg.addColorStop(0.5, 'rgba(220,240,255,0.35)'); sg.addColorStop(1, 'rgba(200,230,255,0)');
      c.fillStyle = sg;
      c.fillRect(sx - 80, BAR.y - BAR.h / 2, 160, BAR.h);
    }
    // hit: a light sweep down the whole bar
    const sw = L.prog(gt, tm.hit - 0.02, 0.55);
    if (sw > 0 && sw < 1) {
      const sx = L.lerp(BAR.x0, BAR.x1 - 50, L.ease.outCubic(sw));
      L.lightBlob(c, sx, BAR.y, 90, [200, 230, 255], 0.6 * (1 - sw));
    }
    const headK = 1 - L.prog(gt, tm.hit + 0.2, 0.6);
    // head glow capped at 50 px right of the head; the hit bloom grows back along the bar (never into the UI)
    L.lightBlob(c, fx - 60 * hitK, BAR.y, 50 + 60 * hitK, ACCENT, 0.7 * Math.max(headK, hitK));
    c.restore();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(fx, BAR.y, Math.max(0, 9 + 4 * hitK), 0, TAU); c.fill();
    c.strokeStyle = L.rgba(ACCENT, 0.9);
    c.lineWidth = 2;
    c.stroke();
  }
  // the lifetime marker at 73
  const mk = L.ease.outBack(L.prog(gt, tm.life, 0.55), 1.4);
  if (mk > 0) {
    const lx = xAt(LIFE), top = BAR.y - 44 * mk;
    c.strokeStyle = L.rgba(WARM, 0.95);
    c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(lx, top); c.lineTo(lx, BAR.y + 30); c.stroke();
    c.fillStyle = L.rgba(WARM);
    c.beginPath(); c.moveTo(lx - 7, top - 10); c.lineTo(lx + 7, top - 10); c.lineTo(lx, top); c.closePath(); c.fill();
    const tk = L.ease.outCubic(L.prog(gt, tm.life + 0.15, 0.5));
    c.globalAlpha = tk * OUT;
    c.font = L.font(21, 700, L.FONT.body);
    c.fillStyle = L.rgba([255, 214, 170]);
    c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 8;
    L.trackedText(c, 'A LIFETIME  ·  73 YEARS', lx - 14 - (1 - tk) * 12, top - 2, 2.5, 'right');
    c.globalAlpha = OUT;
  }
  c.restore();
}

/** The headline: counts with the playhead, then slams to 82 YEARS on "eighty-two". */
function drawHeadline(c, v, tm) {
  const gt = v.gt;
  const ink = L.ease.outCubic(L.prog(gt, tm.fill - 0.1, 0.3));
  if (ink <= 0) return;
  const yr = Math.round(fillK(Math.round(gt * 30) / 30, tm) * YEARS);   // 18b: output-frame time (frame-stable digits)
  const landed = gt >= tm.hit;
  const sl = L.prog(gt, tm.hit, 0.5);
  const scale = landed ? 1 + 0.16 * (1 - L.ease.outBack(sl, 2.2)) : 0.94;
  const flash = landed ? Math.exp(-Math.pow((gt - tm.hit) / 0.22, 2)) : 0;
  const { x, y, size } = HEAD;
  c.save();
  c.textBaseline = 'alphabetic';
  // rule
  c.fillStyle = L.rgba(ACCENT, 0.9 * ink);
  c.fillRect(x, y - size * 0.92 - 22, 120 * L.ease.outCubic(L.prog(gt, tm.hit - 0.1, 0.5)), 5);
  // flash behind the number
  if (flash > 0) L.lightBlob(c, x + 230, y - size * 0.35, 380, ACCENT, 0.45 * flash);
  c.translate(x, y);
  c.scale(scale, scale);
  c.font = L.font(size, 800, L.FONT.display);
  c.shadowColor = 'rgba(0,0,0,0.6)';
  c.shadowBlur = 24;
  const col = landed ? L.mix([255, 255, 255], ACCENT, L.clamp(sl * 2.5)) : [215, 228, 245];
  c.fillStyle = L.rgba(col, (landed ? 1 : 0.8) * ink);
  const str = `${yr} ${yr === 1 ? "YEAR" : "YEARS"}`;
  L.trackedText(c, str, 0, 0, 0, 'left');
  c.restore();
  // the small line, after the slam
  const sk = L.ease.outCubic(L.prog(gt, tm.hit + 0.35, 0.5));
  if (sk > 0) {
    c.save();
    c.globalAlpha = sk * OUT;
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 8;
    c.font = L.font(30, 600, L.FONT.body);
    c.fillStyle = 'rgba(205,215,230,0.95)';
    L.trackedText(c, 'TO WATCH ONE DAY OF UPLOADS', x, y + 54 + (1 - sk) * 14, 3, 'left');
    c.restore();
  }
}

function drawCloser(c, v, tm) {
  const ck = L.enter(v.gt, tm.close, 0.8);
  if (ck <= 0) return;
  c.save();
  c.globalAlpha = ck * OUT;
  c.textBaseline = 'middle';
  c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 12;
  const a = 'ZOOM OUT', b = '  ·  BY THE NUMBERS';
  c.font = L.font(44, 800, L.FONT.display);
  c.letterSpacing = '6px';
  const wa = c.measureText(a).width - 6;
  c.font = L.font(44, 600, L.FONT.display);
  const wb = c.measureText(b).width - 6;
  c.letterSpacing = '0px';
  const x0 = W / 2 - (wa + wb) / 2, y = 1335 + (1 - ck) * 12;
  c.font = L.font(44, 800, L.FONT.display);
  c.fillStyle = 'rgba(240,245,252,0.96)';
  L.trackedText(c, a, x0, y, 6, 'left');
  c.font = L.font(44, 600, L.FONT.display);
  c.fillStyle = L.rgba(ACCENT);
  L.trackedText(c, b, x0 + wa + 6, y, 6, 'left');
  c.restore();
}

export default {
  beat: 18,
  chapter: { num: '18', title: 'One day of uploads', sub: 'Watched nonstop' },
  captions: true,
  layer: 5,
  chapterUntil() { return 1.9; },     // the top clears just before the reveal
  // beat starts 79.76: rush 79.91 (t 0.15) · player 80.71 (0.95) · bar flies 81.79 (2.03) · count 82.44 (2.68)
  // · HIT 83.02 (3.26) · lifetime 85.50 (5.74) · closing tag 87.90 (8.14)
  cues(d) {
    return [
      { t: 0.15, name: 'swish', gain: 0.2, pitch: 1.3 },
      { t: 0.85, name: 'whoosh', gain: 0.18, pitch: 1.1 },
      { t: 1.0, name: 'blip', gain: 0.2, pitch: 0.9 },
      { t: 2.03, name: 'swish', gain: 0.26, pitch: 0.75 },
      { t: 2.5, name: 'tick', gain: 0.16, pitch: 1.2 },
      { t: 2.6, name: 'riser', gain: 0.3, pitch: 0.9 },
      { t: 2.68, name: 'count', gain: 0.3, pitch: 1.0 },
      { t: 3.24, name: 'impact', gain: 0.7, pitch: 0.6 },
      { t: 3.26, name: 'deep', gain: 0.5, pitch: 0.7 },
      { t: 3.28, name: 'bloom', gain: 0.4, pitch: 0.8 },
      { t: 3.6, name: 'shimmer', gain: 0.2, pitch: 0.9 },
      { t: 5.74, name: 'tick', gain: 0.22, pitch: 0.8 },
      { t: 5.8, name: 'shimmer', gain: 0.22, pitch: 0.7 },
      { t: 8.14, name: 'swell', gain: 0.2, pitch: 0.7 },
    ];
  },
  drawWorld(ctx, v) {
    const tm = times(v.tl);
    if (v.gt < tm.s) return;
    // the feed rushes (its clock runs ahead), lifts away, and one player takes the screen
    const shift = 2.4 * L.ease.inCubic(L.prog(v.gt, tm.rush, 1.0));
    const lift = L.prog(v.gt, tm.lift, 0.45);
    const pk = L.ease.outCubic(L.prog(v.gt, tm.player - 0.1, 0.35));
    if (pk < 1) drawFeed(ctx, v, 1, { shift, lift });
    drawPlayer(ctx, v, tm, pk);
  },
  drawOverlay(ctx, v) {
    const tm = times(v.tl);
    if (v.gt >= tm.s + 0.05 && v.gt < tm.exit + 0.4) uploadLabel(ctx, 1, L.prog(v.gt, tm.exit, 0.28));
    // 18b: this is no longer the last beat (the question follows), so the bar, the 82 YEARS headline and the sign-off
    // fade out (0.45 s, done 0.05 s before the cut; also capped by the engine's overlay k) instead of popping off
    OUT = Math.min(v.k, 1 - L.ease.inOutCubic(L.prog(v.t, v.d - 0.5, 0.45)));
    ctx.globalAlpha = OUT;
    drawTimeline(ctx, v, tm);
    drawHeadline(ctx, v, tm);
    drawCloser(ctx, v, tm);
  },
};
