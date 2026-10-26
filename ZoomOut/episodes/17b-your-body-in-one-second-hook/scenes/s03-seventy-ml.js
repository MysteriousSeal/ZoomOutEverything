// Beat 3 — "Each beat pushes out about seventy milliliters of blood."
// The camera pushes in on the heart. A slim glass measuring vial (80 ml, graduated) stands beside it in the chest; on
// the 12.79 s heartbeat ("pushes out") a ribbon of light leaves the aortic arch and fills the vial to the 70 ml mark
// while the label counts up to ≈ 70 ml (lands on "seventy"). Then the eye is handed to the thumb: on the 14.79 s beat
// the vial dims, a ring closes in on the thumb pad and the pulse arriving down the arm lights it — the dive (beat 4)
// goes straight into it.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, BLOOD, P, SIZE, clockStart } from '../env.js';

const { W, H } = L;
const V = { x: P.heart.x - 0.092, y: P.heart.y + 0.018 };   // vial centre (world)
const VH = 0.074, VW = 0.0225;                             // inner height / width (m)
const CAP = 80;                                            // ml at the top graduation
const ML = 70;
const MOUTH = { x: V.x, y: V.y - VH / 2 - 0.003 };
const ARCH = { x: P.heart.x - 0.005 * SIZE.heart, y: P.heart.y - 0.63 * SIZE.heart };   // crest of the aortic arch (between the brachiocephalic and left carotid stubs)

// timing (global seconds, from the stopwatch rhythm: beats at clockStart + n)
const T = (tl) => {
  const cs = clockStart(tl);
  return { pump: cs + 8, fillEnd: cs + 8 + 0.8, handoff: cs + 10, arrive: cs + 10 + 0.55 };
};

function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
}

function drawVial(c, v, k, fill, gt, tm) {
  const S = (m) => v.ws(m);
  const cx = v.wx(V.x), cy = v.wy(V.y);
  const w = S(VW), h = S(VH), top = cy - h / 2, bot = cy + h / 2;
  if (w < 4) return;
  const rad = w / 2;
  const tube = () => {
    c.beginPath();
    c.moveTo(cx - w / 2, top);
    c.lineTo(cx - w / 2, bot - rad);
    c.arc(cx, bot - rad, Math.max(0, rad), Math.PI, 0, true);
    c.lineTo(cx + w / 2, top);
  };
  c.save();
  c.globalAlpha = k;
  // soft light pooling around the vial once it holds blood
  L.lightBlob(c, cx, bot - h * 0.3 * fill, w * 2.4, [255, 70, 90], 0.25 * fill);
  // back glass
  tube(); c.closePath();
  const bg = c.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
  bg.addColorStop(0, 'rgba(150,180,225,0.14)'); bg.addColorStop(0.5, 'rgba(150,180,225,0.04)'); bg.addColorStop(1, 'rgba(150,180,225,0.12)');
  c.fillStyle = bg; c.fill();
  // liquid
  if (fill > 0.001) {
    c.save();
    tube(); c.closePath(); c.clip();
    const lvl = bot - (h - 0.006 / v.cam.mpp) * (ML / CAP) * fill;
    const slosh = Math.sin((gt - tm.pump) * 13) * Math.exp(-Math.max(0, gt - tm.fillEnd + 0.3) * 3.2) * w * 0.12 * L.smoothstep(L.prog(gt, tm.pump, 0.2));
    c.beginPath();
    c.moveTo(cx - w / 2 - 2, lvl - slosh);
    c.quadraticCurveTo(cx, lvl + w * 0.07, cx + w / 2 + 2, lvl + slosh);
    c.lineTo(cx + w / 2 + 2, bot + 2); c.lineTo(cx - w / 2 - 2, bot + 2); c.closePath();
    const lg = c.createLinearGradient(0, lvl, 0, bot);
    lg.addColorStop(0, L.rgba([255, 92, 104], 0.95)); lg.addColorStop(0.25, L.rgba([206, 34, 54], 0.95)); lg.addColorStop(1, L.rgba([110, 10, 28], 0.97));
    c.fillStyle = lg; c.fill();
    // inner light (the blood glows a little, like the heart)
    const ig = c.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    ig.addColorStop(0, 'rgba(255,160,160,0.0)'); ig.addColorStop(0.3, 'rgba(255,160,160,0.22)'); ig.addColorStop(1, 'rgba(255,160,160,0)');
    c.fillStyle = ig; c.fill();
    // meniscus highlight
    c.beginPath();
    c.moveTo(cx - w / 2, lvl - slosh); c.quadraticCurveTo(cx, lvl + w * 0.07, cx + w / 2, lvl + slosh);
    c.strokeStyle = 'rgba(255,215,210,0.75)'; c.lineWidth = Math.max(1, w * 0.025); c.stroke();
    // rising glints while it fills
    const r = L.rng(33);
    for (let i = 0; i < 14; i++) {
      const x0 = r(), ph = r(), sp = 0.6 + r() * 0.8, sz = 0.6 + r();
      const life = ((gt - tm.pump) * sp + ph) % 1;
      if (gt < tm.pump) break;
      const yy = L.lerp(bot - w * 0.2, lvl + w * 0.1, life);
      if (yy < lvl + 2) continue;
      const a = 0.5 * Math.sin(Math.PI * life) * (1 - L.smoothstep(L.prog(gt, tm.fillEnd + 0.4, 0.8)));
      c.fillStyle = `rgba(255,220,215,${a})`;
      c.beginPath(); c.arc(cx + (x0 - 0.5) * w * 0.7, yy, Math.max(0, w * 0.018 * sz), 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }
  // graduations (left side): every 10 ml long, 5 ml short; the 70 mark in the accent
  c.lineCap = 'butt';
  const usable = h - 0.006 / v.cam.mpp;
  for (let ml = 5; ml <= CAP; ml += 5) {
    const y = bot - usable * (ml / CAP);
    const long = ml % 10 === 0, is70 = ml === ML;
    const glow70 = is70 ? L.smoothstep(L.prog(gt, tm.fillEnd - 0.1, 0.3)) : 0;
    c.strokeStyle = is70 ? L.rgba(L.mix([220, 230, 245], ACCENT, glow70), 0.9) : 'rgba(220,230,245,0.55)';
    c.lineWidth = Math.max(1, w * (is70 ? 0.03 : 0.018));
    c.beginPath(); c.moveTo(cx - w / 2, y); c.lineTo(cx - w / 2 + w * (is70 ? 0.55 : long ? 0.38 : 0.2), y); c.stroke();
    if (long && w > 50 && (ml % 20 === 0 || is70)) {
      c.font = L.font(Math.round(w * 0.2), 600, L.FONT.body);
      c.fillStyle = is70 ? L.rgba(L.mix([220, 230, 245], ACCENT, glow70), 0.95) : 'rgba(220,230,245,0.6)';
      c.textBaseline = 'middle'; c.textAlign = 'right';
      c.fillText(String(ml), cx - w / 2 - w * 0.12, y);
    }
  }
  // glass walls: rim light, a vertical specular stripe, and the lip
  tube();
  c.strokeStyle = 'rgba(190,210,245,0.55)'; c.lineWidth = Math.max(1, w * 0.035); c.lineJoin = 'round'; c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.22)';
  L.roundRect(c, cx + w * 0.18, top + h * 0.06, w * 0.08, h * 0.78, w * 0.04); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.1)';
  L.roundRect(c, cx - w * 0.36, top + h * 0.1, w * 0.04, h * 0.7, w * 0.02); c.fill();
  c.beginPath(); c.ellipse(cx, top, Math.max(0, w * 0.62), Math.max(0, w * 0.12), 0, 0, Math.PI * 2);
  c.strokeStyle = 'rgba(210,225,250,0.7)'; c.lineWidth = Math.max(1, w * 0.03); c.stroke();
  c.restore();
}

function drawStream(c, v, gt, tm) {
  // a ribbon of light from the aortic arch into the vial: flows during the ejection, then drains away
  const on = L.smoothstep(L.prog(gt, tm.pump - 0.02, 0.12));
  const off = L.smoothstep(L.prog(gt, tm.fillEnd - 0.15, 0.4));
  const head = L.ease.outCubic(L.prog(gt, tm.pump, 0.32));      // the front reaches the vial
  const tail = L.ease.inCubic(L.prog(gt, tm.fillEnd - 0.35, 0.55));
  if (on <= 0 || tail >= 1) return;
  // leaves the crest straight up (between the branch stubs), clears their tops, then arcs down into the vial mouth
  const p0 = [ARCH.x, ARCH.y], p1 = [ARCH.x + 0.0026, ARCH.y - 0.0495], p2 = [MOUTH.x + 0.022, MOUTH.y - 0.093], p3 = [MOUTH.x, MOUTH.y + 0.012];
  const S = (q) => [v.wx(q[0]), v.wy(q[1])];
  const N = 36;
  const a0 = Math.max(0, tail), a1 = Math.min(1, head);
  if (a1 <= a0) return;
  const pts = [];
  for (let i = 0; i <= N; i++) pts.push(S(bez(p0, p1, p2, p3, L.lerp(a0, a1, i / N))));
  const line = () => { c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); };
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round'; c.lineJoin = 'round';
  const lwpx = Math.max(1.5, v.ws(0.0028));
  const a = on * (1 - off * 0.7);
  line();
  c.strokeStyle = L.rgba([255, 60, 80], 0.18 * a); c.lineWidth = lwpx * 4; c.stroke();
  c.strokeStyle = L.rgba([255, 90, 104], 0.6 * a); c.lineWidth = lwpx; c.stroke();
  // flowing highlights (a dash pattern that travels toward the vial)
  c.setLineDash([lwpx * 2.2, lwpx * 3.4]);
  c.lineDashOffset = -(gt - tm.pump) * lwpx * 40;
  c.strokeStyle = L.rgba([255, 205, 200], 0.55 * a); c.lineWidth = lwpx * 0.55; c.stroke();
  c.setLineDash([]);
  // the leading drop
  if (head < 1) { const q = pts[pts.length - 1]; L.lightBlob(c, q[0], q[1], lwpx * 5, [255, 170, 170], 0.7 * on); }
  c.restore();
}

function drawHandoff(c, v, gt, tm) {
  // a ring closes in on the thumb pad, then the arriving pulse lights it (world space: it rides into the dive)
  const t0 = tm.handoff + 0.05;
  if (gt < t0 || gt > tm.arrive + 1.6) return;
  const mpp = v.cam.mpp;
  const zoomFade = L.smoothstep(L.clamp(L.invLerp(Math.log(3.5e-5), Math.log(9e-5), Math.log(mpp))));
  if (zoomFade <= 0) return;
  const x = v.wx(P.skin.x), y = v.wy(P.skin.y + 0.002);
  c.save();
  c.globalCompositeOperation = 'lighter';
  const close = L.ease.outCubic(L.prog(gt, t0, 0.55));
  const ringR = L.lerp(0.06, 0.012, close) / mpp;
  const ra = (0.85 * L.smoothstep(L.prog(gt, t0, 0.2))) * (1 - L.smoothstep(L.prog(gt, tm.arrive + 0.5, 0.8))) * zoomFade;
  c.beginPath(); c.arc(x, y, Math.max(0, ringR), 0, Math.PI * 2);
  c.strokeStyle = L.rgba(ACCENT, ra); c.lineWidth = Math.max(1.5, 0.0013 / mpp); c.stroke();
  // four hairline ticks on the ring (a reticle)
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    c.beginPath();
    c.moveTo(x + Math.cos(a) * ringR * 1.12, y + Math.sin(a) * ringR * 1.12);
    c.lineTo(x + Math.cos(a) * ringR * 1.38, y + Math.sin(a) * ringR * 1.38);
    c.stroke();
  }
  // glow on arrival
  const ga = Math.exp(-Math.max(0, gt - tm.arrive) * 2.2) * L.smoothstep(L.prog(gt, tm.arrive - 0.12, 0.12));
  const breathe = 0.3 * L.smoothstep(L.prog(gt, t0, 0.4));
  L.lightBlob(c, x, y, 0.014 / mpp, [255, 140, 150], (breathe + 0.7 * ga) * zoomFade);
  c.restore();
}

export default {
  beat: 3,
  chapter: { num: '03', title: 'One beat', sub: 'blood pumped by one heartbeat' },
  captions: true,
  layer: 3,
  cues(d) {
    // (cues only get d: times from build/timeline.json; beat start 11.901 s, heartbeats at 12.787, 13.787, 14.787 s)
    const out = [];
    for (const t of [0.886, 1.886, 2.886]) {
      out.push({ t, name: 'impact', gain: t === 0.886 ? 0.3 : 0.2, pitch: 1.25 });
      out.push({ t: t + 0.2, name: 'impact', gain: 0.12, pitch: 1.6 });
    }
    out.push({ t: 0.92, name: 'bubbles', gain: 0.2, pitch: 0.9 });
    out.push({ t: 1.0, name: 'count', gain: 0.14, pitch: 1.0 });
    out.push({ t: 1.68, name: 'ping', gain: 0.24, pitch: 1.2 });
    out.push({ t: 2.95, name: 'blip', gain: 0.2, pitch: 1.1 });
    out.push({ t: 3.42, name: 'shimmer', gain: 0.14, pitch: 1.4 });
    return out;
  },
  drawWorld(c, v) {
    const gt = v.gt;
    if (v.cam.mpp < 3e-6 || gt < v.tl.scenes[3].start - 0.2 || gt > v.tl.scenes[4].start + 2.5) return;
    const tm = T(v.tl);
    const s3 = v.tl.scenes[3].start;
    const kin = L.ease.outCubic(L.prog(gt, s3 + 0.4, 0.55));
    const kout = 1 - L.ease.inCubic(L.prog(gt, tm.handoff + 0.05, 0.45));
    const k = kin * kout;
    const fill = L.ease.inOutCubic(L.prog(gt, tm.pump + 0.05, tm.fillEnd - tm.pump));
    if (k > 0) {
      // the vial rises a touch as it appears
      c.save();
      c.translate(0, (1 - kin) * 24);
      drawVial(c, v, k, fill, gt, tm);
      c.restore();
      drawStream(c, v, gt, tm);
    }
    drawHandoff(c, v, gt, tm);
  },
  drawOverlay(c, v) {
    const tm = T(v.tl);
    // fades a little early so the eye is free for the hand-off to the thumb
    const k = v.k * L.prog(v.gt, tm.pump + 0.1, 0.5) * (1 - L.ease.inCubic(L.prog(v.gt, tm.handoff + 0.3, 0.35)));
    if (k <= 0) return;
    const fill = L.ease.inOutCubic(L.prog(v.gt, tm.pump + 0.05, tm.fillEnd - tm.pump));
    const n = Math.round(ML * L.ease.inOutCubic(L.prog(Math.round(v.gt * 30) / 30, tm.pump + 0.05, tm.fillEnd - tm.pump)));   // 17b: frame-stable count
    // below the vial (clear of the ribbon and the vessels); '≈' and the imperial line only once the count lands on 70
    const x = 64, y = 1010, size = 96;   // v17a: raised with the reframed key 3 (the stopwatch now sits at y ≈ 1230-1400, under it)
    const e = L.ease.outCubic(L.clamp(k));
    const landed = L.smoothstep(L.prog(fill, 0.98, 0.02)) * L.smoothstep(L.prog(v.gt, tm.fillEnd - 0.1, 0.25));
    c.save();
    c.globalAlpha *= L.clamp(k * 1.4);
    c.textBaseline = 'alphabetic';
    c.fillStyle = L.rgba(ACCENT, 0.9);
    c.fillRect(x, y - size * 0.92 - 26, 90 * e, 4);
    c.font = L.font(size, 800, L.FONT.display);
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 18;
    c.letterSpacing = '-1px';
    const pw = c.measureText('≈ ').width;
    c.letterSpacing = '0px';
    const yy = y + (1 - e) * 30;
    c.fillStyle = L.rgba(ACCENT);
    L.trackedText(c, `${n} ml`, x + pw * landed, yy, -1, 'left');
    if (landed > 0) {
      c.save(); c.globalAlpha *= landed;
      L.trackedText(c, '≈', x - (1 - landed) * 14, yy, -1, 'left');
      c.restore();
    }
    if (landed > 0) {
      c.globalAlpha *= landed;
      c.shadowBlur = 8;
      c.font = L.font(30, 600, L.FONT.body);
      c.fillStyle = L.rgba([205, 215, 230], 0.95);
      L.trackedText(c, '2.4 FL OZ \u00B7 EACH BEAT', x, y + 52 + (1 - landed) * 10, 3, 'left');
    }
    c.restore();
  },
};
