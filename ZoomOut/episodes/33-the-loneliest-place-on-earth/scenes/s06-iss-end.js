// Beat 6 — "And around 2030, | the International Space Station is planned to join them."
// Shot 'rise': up out of the water to the globe (r 640). The ISS orbit ring (dashed, faint) and the station riding it in
// from the left limb. Card at the top on "And" (carries the climb): ISS · FINAL RE-ENTRY / PLANNED ≈ 2030; a soft dark
// lower band keeps the Antarctic ice from dominating under the captions. On "International" the
// planned trajectory draws out as a dashed accent path that leaves the orbit and curves down into the cemetery zone
// (dashed fire outline, as in beat 5); the station follows it (a re-entry glow and trail growing as it drops) and
// reaches the zone on "join": one soft bloom, no strobe.
import * as L from '../../../../engine/runtime/lib.js';
import {
  ACCENT, INKW, GREYT, FIRE, FACTS, NEMO, ISS_ALT, U_NEMO, globe, word, orbitPt, orbitAngle, strokeOrbit, drawISS, geo,
  geoTrace, smallCircle, plate, B, WD, uwK,
} from '../env.js';
import { project } from '../../../../engine/runtime/earth.js';
import { orbitLL } from '../env.js';

const { W } = L;
const UA = U_NEMO - 34;           // where the station leaves its orbit (well inside the frame)
const pathAlt = (s) => ISS_ALT * (1 - s ** 2.4);
function pathPt(g, s) {
  const ll = orbitLL(L.lerp(UA, U_NEMO, s));
  return project(ll.lat, ll.lon, g, pathAlt(s));
}
const hiddenP = (g, p) => p.z < 0 && Math.hypot(p.x - g.cx, p.y - g.cy) < g.r;

export default {
  beat: 6,
  chapter: null,
  captions: true,
  layer: 9,
  cues(d, tl) {
    const st = tl.scenes[6].start, w = (j, k) => tl.lines[6].phrases[j].words[k][0] - st;
    return [
      { t: w(0, 2) - 0.15, name: 'impact', gain: 0.14, pitch: 1.0 },    // the card, just before "twenty"
      { t: w(1, 1) + 0.3, name: 'riser', gain: 0.12, pitch: 0.9 },      // the path draws
      { t: w(1, 8) + 0.2, name: 'bloom', gain: 0.13, pitch: 0.8 },     // arrival on "join" (soft, under the voice)
    ];
  },
  drawWorld(c, v) {
    const gt = v.gt, tl = v.tl;
    const k = (1 - uwK(gt, tl)) * L.smoothstep(L.prog(gt, B(6, 0.05)(tl), 0.6)) * (1 - L.smoothstep(L.prog(gt, B(7, -0.1)(tl), 0.5)));
    if (k <= 0.001) return;
    const g = globe(v);
    // a soft dark lower band: the Antarctic ice at the bottom of the globe never becomes a white mass behind the
    // captions; Nemo and the zone stay the subject
    {
      const vk = (1 - uwK(gt, tl)) * (1 - L.smoothstep(L.prog(gt, B(7, -0.1)(tl), 0.5)));
      if (vk > 0.001) {
        const vg = c.createLinearGradient(0, 1330, 0, 1760);
        vg.addColorStop(0, 'rgba(2,6,16,0)'); vg.addColorStop(0.45, `rgba(2,6,16,${0.42 * vk})`); vg.addColorStop(1, `rgba(2,6,16,${0.72 * vk})`);
        c.fillStyle = vg; c.fillRect(0, 1330, W, L.H - 1330);
      }
    }
    const tPath = WD(6, 1, 1, -0.05)(tl), tJoin = WD(6, 1, 8, 0)(tl);
    const tGo = tPath + 0.55;
    c.save();
    c.globalAlpha = k;
    // zone (as in beat 5), only once the globe is small again (never a huge sawtooth ring while climbing)
    const zk = L.smoothstep(L.invLerp(3400, 2400, g.r));   // as soon as the ring is a readable size (no huge sawtooth)
    if (zk > 0.01) {
      c.save();
      c.globalAlpha *= zk;
      c.beginPath(); geoTrace(c, v, smallCircle(NEMO.lat, NEMO.lon, 9, 120), true, 1.0);
      c.fillStyle = L.rgba(FIRE, 0.06); c.fill();
      c.strokeStyle = L.rgba(FIRE, 0.6); c.lineWidth = 2.5; c.setLineDash([12, 9]); c.stroke(); c.setLineDash([]);
      c.restore();
    }
    // orbit ring (fades once the station has left it)
    const ringK = (1 - L.smoothstep(L.prog(gt, tGo + 0.4, 0.8))) * zk;
    if (ringK > 0) {
      c.save();
      c.strokeStyle = L.rgba(ACCENT, 0.4 * ringK); c.lineWidth = 2; c.setLineDash([8, 9]);
      strokeOrbit(c, v, -180, 180, ISS_ALT, 1.5);
      c.restore();
    }
    // planned path: draws out from the departure point on "International"
    const pk = L.ease.inOutCubic(L.prog(gt, tPath, 0.85));
    if (pk > 0) {
      c.save();
      c.strokeStyle = L.rgba(ACCENT, 0.95); c.lineWidth = 3.5; c.setLineDash([14, 10]); c.lineDashOffset = -gt * 30;
      c.beginPath();
      let pen = false;
      for (let i = 0; i <= 90; i++) {
        const s = (i / 90) * pk, p = pathPt(g, s);
        if (hiddenP(g, p)) { pen = false; continue; }
        if (pen) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y);
        pen = true;
      }
      c.stroke();
      c.restore();
    }
    // the station: rides the orbit, then follows the path, arriving on "join"
    let p, ang, glowK = 0, s = 0, inK = 1;
    if (gt < tGo) {
      const u = UA - 6 * (tGo - gt);   // a slow ride along the orbit
      p = orbitPt(v, u); ang = orbitAngle(v, u);
      inK = L.smoothstep(L.invLerp(110, 170, p.x));   // appears fully inside the frame, never clipped at the edge
    } else {
      s = L.ease.inOutCubic(L.prog(gt, tGo, tJoin - tGo));
      p = pathPt(g, s);
      const q = pathPt(g, Math.min(1, s + 0.01)), q0 = pathPt(g, Math.max(0, s - 0.01));
      ang = Math.atan2(q.y - q0.y, q.x - q0.x);
      glowK = L.smoothstep(L.invLerp(0.45, 0.95, s));
    }
    const arrived = gt >= tJoin;
    if (!hiddenP(g, p) && !arrived) {
      // re-entry trail
      if (glowK > 0) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        let prev = null;
        for (let j = 0; j <= 12; j++) {
          const sj = Math.max(0, s - 0.16 * (1 - j / 12));
          const q = pathPt(g, sj);
          if (prev) {
            c.strokeStyle = L.rgba(L.mix([255, 90, 40], [255, 230, 170], j / 12), 0.8 * glowK * (j / 12) ** 1.5);
            c.lineWidth = 1 + 5 * (j / 12);
            c.beginPath(); c.moveTo(prev.x, prev.y); c.lineTo(q.x, q.y); c.stroke();
          }
          prev = q;
        }
        L.lightBlob(c, p.x, p.y, 50, [255, 180, 100], 0.6 * glowK);
        c.restore();
      }
      drawISS(c, p.x, p.y, 84 * (1 - 0.5 * glowK), ang, (1 - 0.6 * glowK) * inK, 0.6);
    }
    // arrival: one soft bloom + a ring on the water
    const bk = L.prog(gt, tJoin, 1.1);
    if (bk > 0 && bk < 1) {
      const n = geo(v, NEMO.lat, NEMO.lon);
      c.save();
      L.lightBlob(c, n.x, n.y, 30 + 90 * L.ease.outCubic(bk), [255, 200, 140], 0.75 * (1 - bk));
      c.strokeStyle = L.rgba([255, 210, 170], 0.8 * (1 - bk)); c.lineWidth = 2.5;
      c.beginPath(); c.arc(n.x, n.y, Math.max(0, 10 + 70 * L.ease.outCubic(bk)), 0, Math.PI * 2); c.stroke();
      c.restore();
    }
    c.restore();
  },
  drawOverlay(c, v) {
    const t = v.t, d = v.d;
    const t0 = word(v, 0, 0, -0.12);   // on "And": the card carries the climb out of the water (never an empty frame)
    const open = L.ease.outCubic(L.prog(t, t0, 0.3));
    const outC = L.ease.inCubic(L.prog(t, d - 0.44, 0.14));    // contents first …
    const outP = L.ease.inOutCubic(L.prog(t, d - 0.38, 0.12));   // … then the plate collapses at once (no empty plate)
    if (open <= 0 || outP >= 1) return;
    const x = 140, w = 800, y = 372, h = 176;
    const pw = w * L.lerp(0.82, 1, open), ph = h * (1 - outP);   // opens from 82 %: the text fits from frame 1
    c.save();
    plate(c, W / 2 - pw / 2, y + (h - ph) / 2, pw, ph, { r: 20 });
    c.beginPath(); c.rect(W / 2 - pw / 2, y, pw, h); c.clip();
    c.globalAlpha = L.clamp(open * 2.5) * (1 - outC);   // text arrives with the plate
    c.textBaseline = 'alphabetic';
    c.font = L.font(24, 700, L.FONT.body);
    c.fillStyle = L.rgba(GREYT);
    L.trackedText(c, 'ISS · FINAL RE-ENTRY', W / 2, y + 50, 5, 'center');
    c.font = L.font(92, 800, L.FONT.display);
    const a = 'PLANNED ', b = `≈ ${FACTS.issEnd}`;
    const wa = c.measureText(a).width, wb = c.measureText(b).width, x0 = W / 2 - (wa + wb) / 2;
    c.fillStyle = L.rgba(INKW);
    c.fillText(a, x0, y + 142 + (1 - open) * 10);
    c.fillStyle = L.rgba(ACCENT);
    c.fillText(b, x0 + wa, y + 142 + (1 - open) * 10);
    c.restore();
    void x;
  },
};
