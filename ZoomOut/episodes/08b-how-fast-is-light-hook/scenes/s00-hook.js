// Beat 0 — the hook. A photon streaks across black and *writes* the headline: "LIGHT?" ignites
// behind it, white-hot then cooling to gold, and its trail stays as the underline. The Earth resolves
// below in a sunrise (s01 draws the globe); at the end the underline collapses back into the photon,
// which drops onto Earth's limb, where beat 1 parks it.
import * as L from '../../../../engine/runtime/lib.js';
import { drawBeam, drawPhoton, R_PARK } from './s01-one-second.js';
import { R_EARTH } from '../camera.js';

const { W } = L;
const LINE1 = { txt: 'HOW FAST IS', y: 404, size: 134 };
const LINE2 = { txt: 'LIGHT?', y: 594, size: 214 };
const UY = 628;                         // underline / photon path (screen y)
const PASS0 = 0.72, PASS1 = 1.32;       // the photon crosses the frame
const LAUNCH = 0.14;                    // first pass: it streaks in low from the right while line 1 builds,
                                        // hairpins off the left edge and comes back along UY to write "LIGHT?"
const BZ = [[W + 200, 1380], [300, 1160], [-560, UY], [-140, UY]];

/** photon position at time t over the whole flight (launch arc, then the underline pass) */
function pos(t) {
  if (t >= PASS0) return [passX(t), UY];
  const u = L.prog(t, LAUNCH, PASS0 - LAUNCH), m = 1 - u;
  const b = [m * m * m, 3 * m * m * u, 3 * m * u * u, u * u * u];
  return [0, 1].map((j) => b.reduce((acc, w, i) => acc + w * BZ[i][j], 0));
}

/** curved light trail along pos() over the launch arc (times < PASS0), hot at the head */
function launchTrail(ctx, t) {
  const t1 = Math.min(t, PASS0), t0 = Math.max(LAUNCH, t - 0.26);
  if (t1 - t0 < 0.005) return;
  const N = 30, pts = [];
  for (let i = 0; i <= N; i++) pts.push(pos(L.lerp(t0, t1, i / N)));
  const fade = t <= PASS0 ? 1 : 1 - L.prog(t, PASS0, 0.26);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'butt';
  for (const [lw, col, al] of [[18, [255, 180, 80], 0.10], [6.5, [255, 210, 130], 0.30], [2.2, [255, 247, 228], 0.95]]) {
    ctx.lineWidth = lw;
    for (let i = 0; i < N; i++) {
      const f = (i + 1) / N;
      ctx.strokeStyle = L.rgba(col, al * f * f * fade);
      ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke();
    }
  }
  ctx.restore();
}

/** photon x during the pass: fast, nearly constant speed, slight ease at the ends */
function passX(t) {
  const p = L.prog(t, PASS0, PASS1 - PASS0);
  const e = 0.35 * p + 0.65 * L.ease.inOutCubic(p);
  return L.lerp(-140, W + 160, e);
}

function inkBox(ctx, ln) {
  ctx.font = L.font(ln.size, 800, L.FONT.display);
  ctx.letterSpacing = '-1px';
  const m = ctx.measureText(ln.txt);
  ctx.letterSpacing = '0px';
  const tw = m.width + 1, x0 = W / 2 - tw / 2;
  return { l: x0 - m.actualBoundingBoxLeft, r: x0 + m.actualBoundingBoxRight, top: ln.y - m.actualBoundingBoxAscent, bot: ln.y + m.actualBoundingBoxDescent };
}

export default {
  beat: 0,
  chapter: null,
  captions: false,
  layer: 5,
  cues(d) {
    return [
      { t: 0.12, name: 'blip', gain: 0.18, pitch: 0.9 },
      { t: LAUNCH + 0.02, name: 'whoosh', gain: 0.3, pitch: 1.55 },     // the launch streak
      { t: 0.62, name: 'riser', gain: 0.16, pitch: 1.4 },
      { t: PASS0 - 0.02, name: 'whoosh', gain: 0.42, pitch: 1.25 },
      { t: 0.92, name: 'shimmer', gain: 0.3, pitch: 1.1 },
      { t: PASS1 - 0.1, name: 'tick', gain: 0.32, pitch: 1.2 },
      { t: 1.45, name: 'bloom', gain: 0.3, pitch: 0.8 },
      { t: d - 0.52, name: 'swish', gain: 0.24, pitch: 0.9 },
      { t: d - 0.06, name: 'blip', gain: 0.26, pitch: 1.3 },
    ];
  },

  drawWorld(ctx, v) {
    // before the globe resolves (s01, from 0.8 s): a thin sunlit rim of Earth's limb, lit as the photon sweeps by
    const t = v.gt - v.tl.scenes[0].start;   // film-relative (08b: the film starts after the preroll)
    const k = L.ease.outCubic(L.prog(t, 0.2, 0.6)) * (1 - L.ease.inOutCubic(L.prog(t, 0.9, 0.7)));
    if (k <= 0) return;
    const x = v.wx(0), y = v.wy(0), r = v.ws(R_EARTH);
    const A0 = -150 * Math.PI / 180, A1 = 25 * Math.PI / 180, N = 40;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'butt';
    for (const [lw, col, al] of [[22, [60, 120, 230], 0.07], [7, [110, 170, 255], 0.16], [2, [190, 220, 255], 0.42]]) {
      ctx.lineWidth = lw;
      for (let i = 0; i < N; i++) {
        const m = (i + 0.5) / N, w = Math.sin(Math.PI * m) ** 1.6 * (0.55 + 0.45 * m);   // brightest toward the sun side
        ctx.strokeStyle = L.rgba(col, al * w * k);
        ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), L.lerp(A0, A1, i / N), L.lerp(A0, A1, (i + 1) / N)); ctx.stroke();
      }
    }
    ctx.restore();
  },

  drawOverlay(ctx, v) {
    const t = v.t, d = v.d;
    if (v.gt >= v.tl.scenes[1].start) return;       // beat 1 owns the parked photon from here
    const acc = v.accent;
    const px = passX(t);

    // ---------------- line 1: words rise into a mask, staggered
    {
      const ln = LINE1;
      const words = ln.txt.split(' ');
      ctx.save();
      ctx.font = L.font(ln.size, 800, L.FONT.display);
      ctx.letterSpacing = '-1px';
      const sp = ctx.measureText(' ').width;
      const ws = words.map((w) => ctx.measureText(w).width);
      ctx.letterSpacing = '0px';
      const total = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
      ctx.beginPath(); ctx.rect(0, ln.y - ln.size * 0.82, W, ln.size * 1.0); ctx.clip();
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgb(238,236,230)';
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20;
      let x = W / 2 - total / 2;
      words.forEach((w, i) => {
        const kin = L.enter(t, -0.1 + i * 0.09, 0.62, L.ease.outExpo);   // already rising on the film's first frame
        const kout = L.enter(t, d - 0.56 + i * 0.05, 0.3, L.ease.inCubic);
        const dy = (1 - kin) * ln.size * 1.05 - kout * ln.size * 1.05;
        if (kin > 0) L.trackedText(ctx, w, x, ln.y + dy, -1, 'left');
        x += ws[i] + sp;
      });
      ctx.restore();
    }

    // ---------------- line 2: "LIGHT?" ignited by the photon, cooling from white-hot to gold
    const box = inkBox(ctx, LINE2);
    const kout2 = L.enter(t, d - 0.48, 0.3, L.ease.inCubic);
    if (px > box.l - 30 && kout2 < 1) {
      ctx.save();
      const ln = LINE2;
      ctx.beginPath();
      ctx.rect(0, box.top - 30, Math.max(0, px - 6), box.bot - box.top + 50);
      ctx.clip();
      ctx.beginPath(); ctx.rect(0, ln.y - ln.size * 0.82, W, ln.size * 1.02); ctx.clip();
      ctx.font = L.font(ln.size, 800, L.FONT.display);
      ctx.textBaseline = 'alphabetic';
      const dy = -kout2 * ln.size * 1.05;
      // heat: white at the photon, cooling to gold over ~350 px; settles fully once it's gone
      const cool = L.prog(t, PASS1, 0.5);
      const g = ctx.createLinearGradient(px - 420, 0, px, 0);
      g.addColorStop(0, L.rgba(acc));
      g.addColorStop(0.75, L.rgba(L.mix(acc, [255, 250, 236], 0.6 * (1 - cool))));
      g.addColorStop(1, L.rgba(L.mix(acc, [255, 255, 255], 1 - cool)));
      ctx.fillStyle = g;
      ctx.shadowColor = L.rgba([255, 170, 60], 0.55 * (1 - cool) + 0.25);
      ctx.shadowBlur = 40;
      L.trackedText(ctx, ln.txt, W / 2, ln.y + dy, -1, 'center');
      ctx.restore();
    }

    // ---------------- underline: the trail that stays
    const uL = box.l - 6, uR = box.r + 6, uC = (uL + uR) / 2;
    const col = L.prog(t, d - 0.62, 0.42);                     // collapse to the centre
    const ce = L.ease.inOutCubic(col);
    if (px > uL) {
      const a = uL + (uC - uL) * ce, b = Math.min(px, uR) + (uC - uR) * ce * (px >= uR ? 1 : 0);
      if (b > a + 0.5) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(a, 0, b, 0);
        g.addColorStop(0, L.rgba(acc, 0.15));
        g.addColorStop(0.5, L.rgba(acc, 0.95));
        g.addColorStop(1, L.rgba(acc, 0.15 + 0.8 * (px >= uR ? 1 : 0)));
        ctx.fillStyle = L.rgba([255, 190, 90], 0.12);
        ctx.fillRect(a, UY - 7, b - a, 14);
        ctx.fillStyle = g;
        ctx.fillRect(a, UY - 2, b - a, 4);
        ctx.restore();
      }
    }

    // ---------------- the launch: streaks in low from the right while line 1 builds
    if (t > LAUNCH && t < PASS0 + 0.3) {
      launchTrail(ctx, t);
      if (t < PASS0) {
        const [hx, hy] = pos(t);
        drawPhoton(ctx, hx, hy, { s: 0.9, a: L.ease.outCubic(L.prog(t, LAUNCH, 0.08)), rot: 0.2 });
      }
    }

    // ---------------- the streaking photon and its trail
    if (t > PASS0 - 0.2 && t < PASS1 + 0.25) {
      const pre = L.prog(t, PASS0 - 0.2, 0.2);
      if (t < PASS0) L.lightBlob(ctx, 0, UY, 160, [255, 200, 110], 0.35 * pre);     // anticipation at the edge
      const tail = Math.max(-200, px - 720);
      drawBeam(ctx, tail, UY, px, UY, { a: 1, w: 1.15 });
      drawPhoton(ctx, px, UY, { s: 1.0, a: 1, rot: 0.2 });
    }

    // ---------------- end: the collapsed underline becomes the photon and drops onto Earth's limb
    if (col > 0.6) {
      const k = L.prog(t, d - 0.3, 0.3);
      const ke = L.ease.inOutCubic(k);
      const tx = v.wx(0), ty = v.wy(-R_PARK);
      const x = L.lerp(uC, tx, ke), y = L.lerp(UY, ty, ke);
      const grow = L.clamp((col - 0.6) / 0.4);
      drawPhoton(ctx, x, y, { s: L.lerp(0.3, 0.62, Math.max(grow * 0.6, ke)), a: grow, rot: 0.35 + v.gt * 0.15 });
    }
  },
};
