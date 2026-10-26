// Beat 2 — "More mass than our Sun, | crushed into a ball twenty kilometres wide: the size of a city."
// Phrase 0: an opaque MASS card (scales in, opaque from its first frame): a balance — the tiny neutron star outweighs
//   the huge Sun (sizes not to scale) — title "≈ 1.4 × THE SUN'S MASS". The beam tips on "Sun".
// Phrase 1: the camera swings to a top-down view; a generic night city (env.drawCity) appears under the star at TRUE
//   scale (scale bar in the HUD); a dimension bar "20 KM" spans the star.
import * as L from '../../../../engine/runtime/lib.js';
import { R, ACCENT, drawCity, aboveK, phrase, wordGt } from '../env.js';

const { W, ease, clamp, prog } = L;
const CARD = { x: 80, w: 920, y: 380, h: 700 };

function sun(c, x, y, r) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  L.lightBlob(c, x, y, r * 1.9, [255, 170, 60], 0.45);
  c.restore();
  const g = c.createRadialGradient(x - r * 0.15, y - r * 0.15, 0, x, y, r);
  g.addColorStop(0, 'rgb(255,248,220)'); g.addColorStop(0.55, 'rgb(255,200,90)'); g.addColorStop(0.9, 'rgb(240,130,40)'); g.addColorStop(1, 'rgb(210,90,30)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  // granulation
  const rr = L.rng(9);
  c.save(); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.clip();
  for (let i = 0; i < 60; i++) {
    const a = rr() * 6.283, d = Math.sqrt(rr()) * r;
    c.fillStyle = `rgba(255,${200 + rr() * 50},${120 + rr() * 60},${0.12 + rr() * 0.12})`;
    c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.04 + rr() * 0.05), 0, 6.283); c.fill();
  }
  c.restore();
}
function nstar(c, x, y, r) {
  c.save(); c.globalCompositeOperation = 'lighter';
  L.lightBlob(c, x, y, r * 6, [110, 170, 255], 0.7);
  L.lightBlob(c, x, y, r * 2.5, [210, 230, 255], 0.9);
  c.restore();
  c.fillStyle = '#f4f9ff'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}

export default {
  beat: 2,
  chapter: { num: '02', title: 'Crushed', sub: 'More than a Sun of mass in a ball 20 km wide' },
  layer: 3,
  overlayIn: false,
  cues(d) {
    void d;
    return [
      { t: 0.05, name: 'blip', gain: 0.14, pitch: 0.8 },
      { t: 1.25, name: 'creak', gain: 0.1, pitch: 0.7 },
    ];
  },
  drawWorld(c, v) {
    const k = aboveK(v.gt, v.tl);
    if (k > 0) drawCity(c, v, k);
  },
  drawOverlay(c, v) {
    const t = v.t, p1 = phrase(v, 1);
    // ---------------- mass card (beat start → phrase 1)
    const kin = ease.outCubic(prog(t, 0, 0.3));
    // exit: contents fade (0.12 s), then the plate scales down a little and fades fast (0.15 s): no dark smudge
    const cOut = 1 - ease.inCubic(prog(t, p1 - 0.38, 0.12));
    const pOut = 1 - prog(t, p1 - 0.3, 0.15);
    if (kin > 0 && pOut > 0) {
      const { x, w, y, h } = CARD;
      const sc = L.lerp(0.9, 1, kin) * L.lerp(0.92, 1, ease.outCubic(pOut));
      const cx = x + w / 2, cy = y + h / 2;
      c.save();
      c.translate(cx, cy); c.scale(sc, sc); c.translate(-cx, -cy);
      c.globalAlpha = pOut;
      c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 40; c.shadowOffsetY = 12;
      c.fillStyle = 'rgb(7,12,28)';
      L.roundRect(c, x, y, w, h, 30); c.fill();
      c.shadowColor = 'transparent';
      c.strokeStyle = L.rgba(ACCENT, 0.5); c.lineWidth = 2;
      L.roundRect(c, x, y, w, h, 30); c.stroke();
      c.globalAlpha = pOut * cOut * clamp(prog(t, 0.02, 0.1));   // contents with the plate (no empty card)
      // title
      c.textBaseline = 'alphabetic'; c.textAlign = 'left';
      c.fillStyle = L.rgba(ACCENT); c.fillRect(x + 56, y + 64, 48, 6);
      c.font = L.font(26, 700, L.FONT.body); c.fillStyle = 'rgba(225,230,238,0.9)';
      L.trackedText(c, 'MASS, NOT SIZE', x + 56 + 66, y + 74, 5);
      const T1 = '≈ 1.4 × THE SUN’S MASS';
      const ts = L.fitSize(c, T1, w - 112, 84, 800, L.FONT.display, 40);
      c.font = L.font(ts, 800, L.FONT.display); c.fillStyle = L.rgba(ACCENT);
      c.fillText(T1, x + 56, y + 168);
      // balance: tips toward the neutron star on "Sun"
      const tTip = wordGt(v.tl, 2, 0, 4) - v.tl.scenes[2].start - 0.1;
      const tip = ease.outBack(prog(t, tTip, 0.7), 2.2);
      const ang = -0.2 * tip;                          // left (neutron star) side down
      const px = x + w / 2, py = y + 300, arm = 300;
      // stand
      c.fillStyle = 'rgb(70,82,104)';
      c.beginPath(); c.moveTo(px - 16, py); c.lineTo(px + 16, py); c.lineTo(px + 40, y + h - 120); c.lineTo(px - 40, y + h - 120); c.closePath(); c.fill();
      c.fillRect(px - 120, y + h - 124, 240, 12);
      // beam
      c.save(); c.translate(px, py); c.rotate(ang);
      const bgr = c.createLinearGradient(0, -8, 0, 8); bgr.addColorStop(0, 'rgb(190,200,215)'); bgr.addColorStop(1, 'rgb(90,100,120)');
      c.fillStyle = bgr; L.roundRect(c, -arm - 10, -6, 2 * arm + 20, 12, 6); c.fill();
      c.restore();
      c.fillStyle = 'rgb(210,220,235)'; c.beginPath(); c.arc(px, py, 12, 0, Math.PI * 2); c.fill();
      // pans hang from the beam ends
      const ends = [-1, 1].map((sgn) => ({ x: px + Math.cos(ang) * arm * sgn, y: py + Math.sin(ang) * arm * sgn }));
      const panY = 190;
      ends.forEach((e2, i) => {
        c.strokeStyle = 'rgba(170,180,200,0.8)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(e2.x, e2.y); c.lineTo(e2.x - 90, e2.y + panY); c.moveTo(e2.x, e2.y); c.lineTo(e2.x + 90, e2.y + panY); c.stroke();
        const pg = c.createLinearGradient(0, e2.y + panY, 0, e2.y + panY + 22); pg.addColorStop(0, 'rgb(170,180,198)'); pg.addColorStop(1, 'rgb(70,78,96)');
        c.fillStyle = pg;
        c.beginPath(); c.ellipse(e2.x, e2.y + panY + 4, 104, 18, 0, 0, Math.PI); c.fill();
        c.fillStyle = 'rgb(190,200,216)'; c.fillRect(e2.x - 104, e2.y + panY, 208, 5);
        const ox = e2.x, oy = e2.y + panY;
        if (i === 0) nstar(c, ox, oy - 12, 9);
        else sun(c, ox, oy - 72, 70);
        // labels under the pans
        c.textAlign = 'center';
        c.font = L.font(30, 800, L.FONT.display); c.fillStyle = '#fff';
        c.fillText(i === 0 ? 'NEUTRON STAR' : 'THE SUN', ox, oy + 76);
        c.font = L.font(23, 500, L.FONT.body); c.fillStyle = 'rgba(190,200,220,0.95)';
        c.fillText(i === 0 ? '20 km wide' : '1.4 million km wide', ox, oy + 108);
        c.textAlign = 'left';
      });
      c.font = L.font(20, 600, L.FONT.body); c.fillStyle = 'rgba(160,172,195,0.85)';
      L.trackedText(c, 'SIZES NOT TO SCALE', x + w / 2, y + h - 52, 3, 'center');
      c.restore();
    }
    // ---------------- city: "20 KM" dimension across the star (top-down, true scale); gone 0.3 s before the dive
    const dive = v.tl.scenes[3].start - 0.3 - v.tl.scenes[2].start;
    const kc = L.enter(t, p1 + 0.9, 0.6) * (1 - ease.inCubic(prog(t, dive - 0.6, 0.3)));
    if (kc > 0) {
      const cx = v.wx(0), cy = v.wy(0), r = v.ws(R);
      const yb = cy + r + 70;
      const e = ease.outCubic(kc);
      c.save();
      c.globalAlpha *= clamp(kc * 1.5);
      c.strokeStyle = 'rgba(240,244,250,0.95)'; c.lineWidth = 3;
      c.shadowColor = 'rgba(2,6,14,0.9)'; c.shadowBlur = 8;
      const a = L.lerp(cx, cx - r, e), b = L.lerp(cx, cx + r, e);
      c.beginPath();
      c.moveTo(a, yb - 16); c.lineTo(a, yb + 16); c.moveTo(a, yb); c.lineTo(b, yb); c.moveTo(b, yb - 16); c.lineTo(b, yb + 16);
      c.stroke();
      // thin guides from the star's edges down to the bar
      c.setLineDash([4, 6]); c.lineWidth = 1.5; c.strokeStyle = 'rgba(240,244,250,0.5)';
      c.beginPath(); c.moveTo(cx - r, cy); c.lineTo(a, yb - 16); c.moveTo(cx + r, cy); c.lineTo(b, yb - 16); c.stroke();
      c.setLineDash([]);
      c.restore();
      // a dark feathered plate behind the title + subtitle (≥ 20 px clear of the text on every side)
      const LY = 462;
      c.save();
      c.globalAlpha *= clamp(kc * 1.5);
      c.shadowColor = 'rgba(3,6,16,0.82)'; c.shadowBlur = 40; c.shadowOffsetX = 4000;
      c.fillStyle = '#000';
      L.roundRect(c, 150 - 4000, LY - 160, 780, 242, 40); c.fill();
      c.restore();
      L.bigLabel(c, { x: W / 2, y: LY, big: '20 KM', small: 'across · city shown at true scale', k: kc, accent: ACCENT, align: 'center', size: 120 });
    }
  },
};
