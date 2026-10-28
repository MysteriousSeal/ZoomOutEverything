// Beat 3 — "When the space station passes overhead, | its astronauts, about four hundred kilometres up, | are your
// nearest neighbours."
// Shot 'orbit' (r 400, banking): the ISS's real 51.6° orbit drawn around the globe (dashed, hidden behind the planet);
// the station sweeps along it and arrives over Point Nemo by "overhead".
// Shot 'limb' (phrase 1): the camera swings side-on so the great circle Nemo → Ducie Island lies ON the limb, Nemo at the
// top. Both distances are then true to scale in the screen plane: the station sits 400 km above the point (a short
// vertical bracket, its label counting up to ≈ 400 KM UP on "kilometres"), and the nearest land is 2,700 km along the
// curve (an accent arc drawn along the horizon on "up": ≈ 2,700 KM TO LAND). A magnified inset (ISS · NOT TO SCALE)
// fills the sky while the roll is settled; phrase 2: CLOSER THAN ANY LAND / ≈ 400 KM UP VS ≈ 2,700 KM TO LAND. (The station icon itself is drawn larger than true scale so it can be seen.)
import * as L from '../../../../engine/runtime/lib.js';
import {
  ACCENT, INKW, FACTS, NEMO, DUCIE, ISS_ALT, U_NEMO, globe, geo, word, orbitPt, orbitAngle, strokeOrbit, drawISS,
  cellText, countAt, fmtCount, gq, scrim, mapLabel, plate, shotStart, gcPoints, B,
} from '../env.js';
import { project } from '../../../../engine/runtime/earth.js';

const { W } = L;

/** where the station is along its orbit (deg of argument of latitude): sweeps in, slows, parks over Nemo */
export function issU(gt, tl) {
  const a = B(3, -0.3)(tl);
  return U_NEMO - 34 * (1 - L.ease.outCubic(L.prog(gt, a, 2.5)));
}
const LIMB_TRAVEL = 2.2;   // = camera.js limb travel
const limbK = (gt, tl) => L.ease.inOutCubic(L.prog(gt, shotStart('limb', tl), LIMB_TRAVEL));
/** the roll has settled */
const settleT = (tl) => shotStart('limb', tl) + LIMB_TRAVEL - 0.15;

export default {
  beat: 3,
  chapter: null,
  captions: true,
  layer: 8,
  cues(d, tl) {
    const st = tl.scenes[3].start, w = (j, k) => tl.lines[3].phrases[j].words[k][0] - st;
    return [
      { t: w(0, 3) + 0.15, name: 'shimmer', gain: 0.12, pitch: 0.9 },     // the station sweeps in
      { t: w(1, 5) - 0.85, name: 'count', gain: 0.1, pitch: 1.15 },       // 400 km count
      { t: w(1, 6) + 0.25, name: 'swish', gain: 0.12, pitch: 1.0 },       // the long arc along the horizon
      { t: w(2, 0) - 0.3, name: 'ping', gain: 0.14, pitch: 1.0 },         // neighbours, in the gap
    ];
  },
  drawWorld(c, v) {
    const gt = v.gt, tl = v.tl;
    // visible from the orbit shot until the gyre shot has turned away
    const vin = L.smoothstep(L.prog(gt, B(3, -0.3)(tl), 0.6));
    const vout = 1 - L.smoothstep(L.prog(gt, B(4, -0.5)(tl), 0.3));
    const k = vin * vout;
    if (k <= 0.001) return;
    const g = globe(v);
    const lk = limbK(gt, tl);
    // ---- the orbit ring (fades as the camera goes side-on)
    const rk = k * (1 - lk);
    if (rk > 0.01) {
      c.save();
      c.strokeStyle = L.rgba(ACCENT, 0.5 * rk);
      c.lineWidth = 2;
      c.setLineDash([8, 9]);
      strokeOrbit(c, v, -180, 180, ISS_ALT, 1.5);
      c.restore();
    }
    // ---- the station
    const u = issU(gt, tl);
    const p = orbitPt(v, u);
    if (!p.hidden) {
      const ang = L.lerp(orbitAngle(v, u), 0, lk);
      const span = L.lerp(66, 92, lk) * (g.r < 300 ? 0.8 : 1);
      drawISS(c, p.x, p.y, span, ang, k, 0.7);
    }
  },
  drawOverlay(c, v) {
    const t = v.t, gt = v.gt, tl = v.tl;
    const lk = limbK(gt, tl);
    c.save();
    c.globalAlpha = v.k;
    const g = globe(v);
    const u = issU(gt, tl);
    const iss = orbitPt(v, u);
    // ---- phase A: a small "ISS" tag riding with the station
    const ak = L.ease.outCubic(L.prog(t, word(v, 0, 2, 0), 0.4)) * (1 - L.smoothstep(L.prog(gt, shotStart('limb', tl), 0.4)));
    if (ak > 0 && !iss.hidden) mapLabel(c, 'ISS', iss.x, iss.y - 52, { alpha: ak, size: 24, color: INKW });
    if (lk <= 0) { c.restore(); return; }
    // ---- phase B: limb geometry
    const nemo = geo(v, NEMO.lat, NEMO.lon);
    const sk = L.smoothstep(L.prog(gt, settleT(tl), 0.35));   // only once the roll has settled (no ghost mid-roll)
    if (sk > 0) {
      // Nemo marker on the horizon
      c.save();
      c.globalAlpha *= sk;
      L.lightBlob(c, nemo.x, nemo.y, 40, ACCENT, 0.5);
      c.fillStyle = L.rgba(ACCENT);
      c.beginPath(); c.arc(nemo.x, nemo.y, 7, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(nemo.x, nemo.y, 3, 0, Math.PI * 2); c.fill();
      c.restore();
      mapLabel(c, 'POINT NEMO', nemo.x + 14, nemo.y + 44, { alpha: sk * v.k, size: 22, color: [225, 235, 245] });
    }
    // ---- 400 km: vertical bracket from the surface to the station, label counts up, lands on "kilometres"
    const tKm = word(v, 1, 5, 0), tC0 = tKm - 0.85;
    const bk = L.ease.outCubic(L.prog(t, tC0 - 0.12, 0.45));
    if (bk > 0) {
      const bx = nemo.x + 70, y0 = nemo.y, y1 = L.lerp(nemo.y, iss.y, bk);
      c.save();
      c.strokeStyle = L.rgba(ACCENT, 0.95);
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(bx - 12, y0); c.lineTo(bx, y0); c.lineTo(bx, y1); c.lineTo(bx - 12, y1);
      c.stroke();
      c.setLineDash([4, 5]); c.lineWidth = 1.5; c.strokeStyle = L.rgba(ACCENT, 0.5);
      c.beginPath(); c.moveTo(nemo.x, y0); c.lineTo(nemo.x, iss.y + 30); c.stroke();
      c.restore();
      // label above the station
      const n = 10 + countAt(gq(gt) - tl.scenes[3].start, tC0, tKm, FACTS.issKm - 10);
      const str = `≈ ${fmtCount(n, FACTS.issKm)} KM UP`;
      c.save();
      c.globalAlpha *= L.clamp((t - tC0) / 0.2);   // the number fades in as the count starts (never a parked 0)
      c.textBaseline = 'alphabetic';
      c.shadowColor = 'rgba(0,0,0,0.85)'; c.shadowBlur = 14;
      cellText(c, str, nemo.x, iss.y - 66, 58, { weight: 700, fam: L.FONT.din, align: 'center', color: ACCENT });
      c.restore();
    }
    // ---- 2,700 km: the arc along the horizon from Nemo to Ducie Island, on "up"
    const tUp = word(v, 1, 6, 0);
    const arcK = L.ease.inOutCubic(L.prog(t, tUp - 0.1, 0.9));
    if (arcK > 0) {
      const pts = gcPoints(NEMO, DUCIE, arcK, 80);
      c.save();
      c.strokeStyle = L.rgba(ACCENT, 0.95);
      c.lineWidth = 5;
      c.lineCap = 'round';
      c.shadowColor = L.rgba(ACCENT, 0.8); c.shadowBlur = 12;
      c.beginPath();
      pts.forEach(([la, lo], i) => { const q = project(la, lo, g, 0.004); if (i) c.lineTo(q.x, q.y); else c.moveTo(q.x, q.y); });
      c.stroke();
      c.restore();
      // land tick + label at the end
      const endK = L.ease.outBack(L.prog(t, tUp + 0.75, 0.35));
      if (endK > 0) {
        const d0 = project(DUCIE.lat, DUCIE.lon, g, 0), d1 = project(DUCIE.lat, DUCIE.lon, g, 0.035);
        c.save();
        c.strokeStyle = L.rgba(INKW, 0.95); c.lineWidth = 3;
        c.beginPath(); c.moveTo(d0.x, d0.y); c.lineTo(L.lerp(d0.x, d1.x, endK), L.lerp(d0.y, d1.y, endK)); c.stroke();
        c.fillStyle = L.rgba(INKW);
        c.beginPath(); c.arc(d0.x, d0.y, Math.max(0, 6 * endK), 0, Math.PI * 2); c.fill();
        c.restore();
        mapLabel(c, 'DUCIE ISLAND', d1.x, d1.y - 26, { alpha: L.clamp(endK) * v.k, size: 22, color: INKW });
      }
      // label on a plate over the planet, under the middle of the arc
      const lab = L.ease.outCubic(L.prog(t, tUp + 0.35, 0.45));
      if (lab > 0) {
        const mid = gcPoints(NEMO, DUCIE, 0.5, 2)[2];
        const q = project(mid[0], mid[1], g, -0.11);
        const str = `≈ ${L.fmt(FACTS.landKmRound)} KM TO LAND`;
        c.save();
        c.font = L.font(46, 700, L.FONT.din);
        const w = cellText(c, str, 0, 0, 46, { weight: 700, fam: L.FONT.din, dry: true });
        // opaque plate with its own exit (the engine's overlay fade would make it see-through): contents, then plate
        const exC = 1 - L.ease.inCubic(L.prog(t, v.d - 0.44, 0.14)), exP = 1 - L.ease.inOutCubic(L.prog(t, v.d - 0.38, 0.12));
        const pw = (w + 56) * L.lerp(0.4, 1, lab), ph = 74 * exP;
        c.globalAlpha = 1;
        if (ph > 0.5) plate(c, q.x - pw / 2, q.y - ph / 2, pw, ph, { r: 14 });
        c.beginPath(); c.rect(q.x - pw / 2, q.y - ph / 2, pw, ph); c.clip();
        c.globalAlpha = L.clamp((lab - 0.8) / 0.2) * exC;
        c.textBaseline = 'alphabetic';
        cellText(c, str, q.x, q.y + 17, 46, { weight: 700, fam: L.FONT.din, align: 'center', color: INKW });
        c.restore();
      }
    }
    // ---- magnified inset of the station (the sprite on the limb is small; this one is labelled NOT TO SCALE),
    // from the settled roll to just before phrase 2, with an elbow leader down to the station
    const p2 = word(v, 2, 0, 0);
    const inK = L.ease.outCubic(L.prog(gt, settleT(tl) + 0.1, 0.24));
    const inC = 1 - L.ease.inCubic(L.prog(t, p2 - 0.44, 0.14)), inP = 1 - L.ease.inOutCubic(L.prog(t, p2 - 0.38, 0.12));
    if (inK > 0 && inP > 0 && !iss.hidden) {
      // on the side away from the station (it sits above Nemo; the ≈ 400 KM UP label is right over it)
      const left = iss.x > W / 2;
      const IW = 340, IH = 262, IX = left ? 110 : W - 110 - IW, IY = 372;
      const pw = IW * L.lerp(0.4, 1, inK), ph = IH * inP, px = left ? IX : IX + IW - pw, py = IY + (IH - ph) / 2;
      // leader: inset's bottom corner nearest the station → down → across to the station's near tip
      c.save();
      c.globalAlpha *= inC * L.clamp(inK * 2 - 1);
      c.strokeStyle = L.rgba(INKW, 0.75); c.lineWidth = 2;
      const lyy = iss.y - 26, lx0 = left ? IX + IW - 44 : IX + 44, lx1 = iss.x + (left ? -50 : 50);
      c.beginPath(); c.moveTo(lx0, IY + IH); c.lineTo(lx0, lyy); c.lineTo(lx1, lyy); c.stroke();
      c.fillStyle = L.rgba(INKW); c.beginPath(); c.arc(lx1, lyy, 3.5, 0, Math.PI * 2); c.fill();
      c.restore();
      plate(c, px, py, pw, ph, { r: 16, border: 0.45 });
      c.save();
      c.beginPath(); c.rect(px, py, pw, ph); c.clip();
      c.globalAlpha *= L.clamp((inK - 0.8) / 0.2) * inC;
      drawISS(c, IX + IW / 2, IY + 112, 280, 0, 1, 0.4);
      mapLabel(c, 'ISS · NOT TO SCALE', IX + IW / 2, IY + IH - 26, { size: 18, color: [200, 215, 232], track: 4 });
      c.restore();
    }
    // ---- phrase 2: information, not the caption: closer than any land (≈ 400 km up vs ≈ 2,700 km across)
    const nk = L.ease.outCubic(L.prog(t, p2 - 0.05, 0.45));
    if (nk > 0) {
      const y = 500;
      c.save();
      c.globalAlpha *= nk;
      scrim(c, W / 2, y + 4, 520, 120, 0.55);
      c.textBaseline = 'alphabetic';
      const fs = L.fitSize(c, 'CLOSER THAN ANY LAND', 900, 80, 800, L.FONT.display, 40);
      c.font = L.font(fs, 800, L.FONT.display);
      const w1 = c.measureText('CLOSER ').width, w2 = c.measureText('THAN ANY LAND').width, x0 = W / 2 - (w1 + w2) / 2;
      const yy = y + (1 - nk) * 12;
      c.shadowColor = L.rgba([60, 170, 230], 0.6); c.shadowBlur = 22;
      c.fillStyle = L.rgba(ACCENT);
      c.fillText('CLOSER ', x0, yy);
      c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 16;
      c.fillStyle = L.rgba(INKW);
      c.fillText('THAN ANY LAND', x0 + w1, yy);
      c.font = L.font(30, 700, L.FONT.din);
      c.fillStyle = L.rgba([205, 220, 238]);
      L.trackedText(c, `≈ ${FACTS.issKm} KM UP  VS  ≈ ${L.fmt(FACTS.landKmRound)} KM TO LAND`, W / 2, yy + 58, 2, 'center');
      c.restore();
    }
    c.restore();
  },
};
