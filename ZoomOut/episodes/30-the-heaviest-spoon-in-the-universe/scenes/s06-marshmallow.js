// Beat 6 — "Drop a marshmallow on one, | and it hits with the energy of an atomic bomb."
// Shot 'surface': low over the star's north limb (surface top y ≈ 1250). A marshmallow (drawn enlarged, tagged
// "MARSHMALLOW · 7 g") falls from y ≈ 680, accelerating (heating white-blue, trail growing) and hits on "hits":
// ONE bloom (fast rise, smooth exponential decay: no strobe), a glowing dome and a shock ring along the surface.
// Opaque top plate: IMPACT SPEED ≈ 60% OF THE SPEED OF LIGHT (from 1.3 s before the hit), then on "energy" IMPACT
// ENERGY ≈ 20–40 KILOTONS · HIROSHIMA ≈ 15 KILOTONS. The plate hands over to the question card (beat 7 grows out of it).
import * as L from '../../../../engine/runtime/lib.js';
import { R, ACCENT, phraseGt, wordGt } from '../env.js';

const { W, H, ease, clamp, prog } = L;
export const PLATE = { x: 100, w: 880, y: 372, h: 236 };
const H0 = 8600;                        // drop height (m) above the surface: ≈ 570 px at 15 m/px
const P = PLATE;

function times(tl) {
  const tDrop = phraseGt(tl, 6, 0) + 0.35;
  const tHit = wordGt(tl, 6, 1, 2) + 0.03;                 // "hits"
  return { tDrop, tHit, tEnergy: wordGt(tl, 6, 1, 5) };     // "energy"
}
function fallP(gt, T) { return Math.pow(clamp((gt - T.tDrop) / (T.tHit - T.tDrop)), 2.6); }

function marshmallow(c, x, y, sz, heat, rot) {
  c.save();
  c.translate(x, y); c.rotate(rot);
  const w = sz, h = sz * 1.12, rr = sz * 0.22;
  // body: soft rounded cylinder, powdery white, side shading
  const g = c.createLinearGradient(-w / 2, 0, w / 2, 0);
  const base = L.mix([250, 244, 236], [225, 240, 255], heat);
  g.addColorStop(0, L.rgba(L.mix(base, [150, 140, 150], 0.45 * (1 - heat))));
  g.addColorStop(0.35, L.rgba(L.mix(base, [255, 255, 255], 0.5)));
  g.addColorStop(0.75, L.rgba(base));
  g.addColorStop(1, L.rgba(L.mix(base, [120, 112, 124], 0.5 * (1 - heat))));
  c.fillStyle = g;
  L.roundRect(c, -w / 2, -h / 2 + rr * 0.5, w, h - rr, rr); c.fill();
  // top face (ellipse)
  c.fillStyle = L.rgba(L.mix([255, 252, 248], [240, 248, 255], heat));
  c.beginPath(); c.ellipse(0, -h / 2 + rr * 0.5, w / 2, rr * 0.9, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(200,190,195,0.6)'; c.lineWidth = 1.2;
  c.beginPath(); c.ellipse(0, -h / 2 + rr * 0.5, w / 2, rr * 0.9, 0, 0, Math.PI * 2); c.stroke();
  c.restore();
}

export default {
  beat: 6,
  chapter: { num: '06', title: 'Marshmallow test', sub: 'One 7 g marshmallow, dropped' },
  layer: 11,
  overlayIn: false,
  cues(d) {
    void d;
    return [];
  },
  drawWorld(c, v) {
    const gt = v.gt, tl = v.tl, T = times(tl);
    if (gt < tl.scenes[6].start - 0.3 || gt > tl.scenes[7].start + 0.8) return;
    const sx = v.wx(0), surfY = v.wy(-R);
    const p = fallP(gt, T);
    const vis = ease.outCubic(prog(gt, T.tDrop - 0.25, 0.3));   // appears as the camera settles over the limb
    if (gt < T.tHit && vis > 0) {
      const y = v.wy(-R - H0 * (1 - p));
      const speed = 2.6 * Math.pow(clamp((gt - T.tDrop) / (T.tHit - T.tDrop)), 1.6);   // ∝ dp/dt, 0 → 2.6
      const heat = clamp((speed - 0.6) / 1.8);
      const sz = 54;
      // trail
      if (speed > 0.05) {
        const tl2 = Math.min(560, 30 + speed * 200);
        const g = c.createLinearGradient(sx, y - tl2, sx, y);
        g.addColorStop(0, 'rgba(160,205,255,0)'); g.addColorStop(1, `rgba(220,236,255,${0.25 + 0.5 * heat})`);
        c.save(); c.globalCompositeOperation = 'lighter';
        c.fillStyle = g;
        c.beginPath(); c.moveTo(sx - sz * 0.42, y); c.lineTo(sx - 3, y - tl2); c.lineTo(sx + 3, y - tl2); c.lineTo(sx + sz * 0.42, y); c.closePath(); c.fill();
        L.lightBlob(c, sx, y, sz * (1.5 + 2 * heat), [190, 220, 255], 0.25 + 0.6 * heat);
        c.restore();
      }
      c.save(); c.globalAlpha *= vis;
      marshmallow(c, sx, y, sz, heat, 0.25 + 0.6 * (gt - T.tDrop) * (1 - heat * 0.8));
      c.restore();
      // tag (until it is moving too fast to read next to)
      const tk = ease.outCubic(prog(gt, T.tDrop + 0.05, 0.25)) * (1 - ease.inCubic(prog(gt, T.tHit - 0.6, 0.25)));
      if (tk > 0) {
        c.save(); c.globalAlpha *= tk;
        c.strokeStyle = 'rgba(230,236,246,0.85)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(sx + 40, y); c.lineTo(sx + 110, y); c.stroke();
        c.fillStyle = 'rgba(230,236,246,0.9)'; c.beginPath(); c.arc(sx + 40, y, 4, 0, 6.283); c.fill();
        c.shadowColor = 'rgba(2,6,14,0.9)'; c.shadowBlur = 12;
        c.textBaseline = 'middle';
        c.font = L.font(30, 800, L.FONT.display); c.fillStyle = '#fff';
        L.trackedText(c, 'MARSHMALLOW · 7 g', sx + 122, y - 12, 2);
        c.font = L.font(21, 500, L.FONT.body); c.fillStyle = 'rgba(190,200,220,0.95)';
        L.trackedText(c, 'enlarged to be seen', sx + 122, y + 20, 0.5);
        c.restore();
      }
    }
    // impact: one bloom, a dome and a shock ring
    const ti = gt - T.tHit;
    if (ti >= -0.02) {
      const rise = clamp((ti + 0.02) / 0.07);
      const f = rise * Math.exp(-Math.max(0, ti - 0.05) / 0.5);
      c.save(); c.globalCompositeOperation = 'lighter';
      // dome
      const dk = ease.outCubic(prog(ti, 0, 0.7)), fade = Math.exp(-Math.max(0, ti - 0.4) / 1.4);
      const dr = 30 + 150 * dk;
      c.save();
      c.beginPath(); c.rect(0, 0, W, surfY + 2); c.clip();
      const dg = c.createRadialGradient(sx, surfY, 0, sx, surfY, dr);
      dg.addColorStop(0, `rgba(255,255,255,${0.95 * fade})`); dg.addColorStop(0.4, `rgba(255,220,170,${0.7 * fade})`); dg.addColorStop(1, 'rgba(255,140,60,0)');
      c.fillStyle = dg; c.fillRect(sx - dr, surfY - dr, dr * 2, dr);
      c.restore();
      // shock ring along the surface (flattened)
      const rk = prog(ti, 0, 1.6);
      if (rk < 1) {
        c.strokeStyle = `rgba(210,230,255,${0.6 * (1 - rk)})`; c.lineWidth = 4;
        c.beginPath(); c.ellipse(sx, surfY + 6, 40 + 520 * ease.outCubic(rk), 10 + 34 * ease.outCubic(rk), 0, 0, Math.PI * 2); c.stroke();
      }
      // the bloom: full strength above the horizon only; on the crust (where the captions sit) capped at 0.35
      if (f > 0.002) {
        c.save();
        c.beginPath(); c.rect(0, 0, W, surfY); c.clip();
        L.lightBlob(c, sx, surfY, 220 + 520 * f, [235, 242, 255], 0.95 * f);
        L.lightBlob(c, sx, surfY, 90, [255, 255, 255], f);
        const sky = c.createLinearGradient(0, 0, 0, surfY);
        sky.addColorStop(0, `rgba(200,220,255,${0.08 * f})`); sky.addColorStop(1, `rgba(200,220,255,${0.22 * f})`);
        c.fillStyle = sky; c.fillRect(0, 0, W, surfY);
        c.restore();
        c.save();
        c.beginPath(); c.rect(0, surfY, W, H - surfY); c.clip();
        c.save(); c.translate(sx, surfY); c.scale(1, 0.35); c.translate(-sx, -surfY);
        L.lightBlob(c, sx, surfY, 200 + 420 * f, [235, 242, 255], 0.35 * f);
        c.restore();
        c.restore();
      }
      c.restore();
    }
  },
  drawOverlay(c, v) {
    const gt = v.gt, tl = v.tl, T = times(tl), sc = tl.scenes[6];
    const tIn = T.tHit - 1.3;
    const kin = ease.outCubic(prog(gt, tIn, 0.3));
    if (kin <= 0) return;
    // hand-over: the contents fade just before the beat end; the plate stays and the question card (beat 7) grows
    // out of this exact rectangle on its first frame
    if (gt >= sc.end) return;
    const cOut = 1 - ease.inCubic(prog(gt, sc.end - 0.15, 0.12));
    const { x, w, y, h } = P;
    c.save();
    const s = L.lerp(0.92, 1, kin), cx = x + w / 2, cy = y + h / 2;
    c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy);
    c.globalAlpha = 1;
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 36; c.shadowOffsetY = 10;
    c.fillStyle = 'rgb(7,12,28)';
    L.roundRect(c, x, y, w, h, 26); c.fill();
    c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.strokeStyle = L.rgba(ACCENT, 0.5); c.lineWidth = 2;
    L.roundRect(c, x, y, w, h, 26); c.stroke();
    const base = cOut;
    const A = clamp(prog(gt, tIn + 0.03, 0.15)) * (1 - ease.inCubic(prog(gt, T.tEnergy - 0.12, 0.12)));
    const Bk = ease.outCubic(prog(gt, T.tEnergy, 0.25));
    const block = (kicker, big, small, k) => {
      if (k <= 0) return;
      c.save();
      c.globalAlpha = base * k;
      c.textBaseline = 'alphabetic'; c.textAlign = 'left';
      c.fillStyle = L.rgba(ACCENT); c.fillRect(x + 50, y + 50, 44, 6);
      c.font = L.font(25, 700, L.FONT.body); c.fillStyle = 'rgba(225,230,238,0.92)';
      L.trackedText(c, kicker, x + 50 + 60, y + 59, 4);
      const bs = L.fitSize(c, big, w - 100, 92, 800, L.FONT.display, 40);
      c.font = L.font(bs, 800, L.FONT.display); c.fillStyle = L.rgba(ACCENT);
      c.fillText(big, x + 50, y + 158 + (1 - k) * 10);
      c.font = L.font(27, 600, L.FONT.body); c.fillStyle = 'rgba(205,214,230,0.95)';
      L.trackedText(c, small, x + 50, y + 204, 2);
      c.restore();
    };
    block('IMPACT SPEED', '≈ 60% OF THE SPEED OF LIGHT', '≈ 180,000 KM EVERY SECOND', A);
    block('IMPACT ENERGY', '≈ 20–40 KILOTONS', 'HIROSHIMA ≈ 15 KILOTONS', Bk);
    c.restore();
  },
};
