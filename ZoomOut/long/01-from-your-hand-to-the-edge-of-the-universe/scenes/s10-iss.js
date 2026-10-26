// Beat 10: The International Space Station orbits just four hundred kilometers up, | barely above the surface at this scale.
// Builder B. The ISS orbit as its true projected ellipse: a circle of radius R_EARTH + 400 km inclined 51.6° to the
// equator (ascending node at 105° E in Earth-fixed terms: one of the ISS's real ground-track families), seen from above
// New York. The far half hides behind the planet. The station moves at its real speed (one orbit every ~92 min), so at
// this scale it barely creeps; a tiny bracket at the limb shows how thin the 400 km gap is.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, INK } from '../world.js';
import { R_EARTH } from '../camera.js';
import { ll } from '../layers/b-geo.js';
import { phrase, phraseEnd, enter, text, bracket } from '../layers/b-label.js';

const B = 10;
const DEG = Math.PI / 180, INC = 51.6 * DEG, NODE = 105 * DEG, ALT = 400e3, R_ISS = R_EARTH + ALT;
const PERIOD = 92.9 * 60;
// orbit point (theta = argument of latitude) -> world {x, y, z}
const N = [Math.cos(NODE), Math.sin(NODE), 0], M = [-Math.sin(NODE) * Math.cos(INC), Math.cos(NODE) * Math.cos(INC), Math.sin(INC)];
function orbitPt(th) {
  const p = [0, 1, 2].map((k) => N[k] * Math.cos(th) + M[k] * Math.sin(th));
  return ll(Math.asin(p[2]) / DEG, Math.atan2(p[1], p[0]) / DEG, ALT);
}
// the limb crossing on the lower right (z ~ 0), where the station is shown
const TH_LIMB = (() => {
  let best = 0, bz = Infinity;
  for (let t = 0; t < 360; t += 0.05) { const q = orbitPt(t * DEG); if (q.x > 0 && Math.abs(q.z) < bz) { bz = Math.abs(q.z); best = t; } }
  return best * DEG;
})();
const PTS = Array.from({ length: 721 }, (_, i) => orbitPt((i / 720) * Math.PI * 2));

function issIcon(c, x, y, s, k) {
  c.save();
  c.globalAlpha *= k;
  c.translate(x, y); c.rotate(-20 * DEG);
  c.fillStyle = 'rgba(2,6,12,0.6)';
  c.fillRect(-13 * s, -6 * s, 26 * s, 12 * s);
  // truss, solar arrays, modules
  c.fillStyle = '#d9dde4'; c.fillRect(-11 * s, -0.8 * s, 22 * s, 1.6 * s);
  c.fillStyle = 'rgb(196,150,70)';
  for (const ax of [-10, -6.5, 6.5, 10]) { c.fillRect((ax - 1.4) * s, -5 * s, 2.8 * s, 3.6 * s); c.fillRect((ax - 1.4) * s, 1.4 * s, 2.8 * s, 3.6 * s); }
  c.fillStyle = '#f2f2f2'; c.fillRect(-1.2 * s, -3.5 * s, 2.4 * s, 7 * s);
  c.restore();
}

export default {
  beat: 10,
  chapter: null,
  cues() {
    return [
      { t: phrase(B, 0) + 0.6, name: 'ping', gain: 0.16, pitch: 1.2 },
      { t: phrase(B, 1) + 0.2, name: 'shimmer', gain: 0.12, pitch: 1.1 },
    ];
  },
  drawOverlay(c, v) {
    const k = enter(v, phrase(B, 0) + 0.2, 1.4);
    if (k <= 0) return;
    const cx = v.wx(0), cy = v.wy(0), re = v.ws(R_EARTH);
    // the orbit: draw the visible parts (front half, and the far half only where it peeks outside the disc)
    const S = (p) => ({ x: v.wx(p.x), y: v.wy(p.y), vis: p.z > 0 || Math.hypot(v.wx(p.x) - cx, v.wy(p.y) - cy) > re + 0.5 });
    const sp = PTS.map(S);
    const drawn = Math.round(sp.length * L.ease.inOutCubic(k));
    // start drawing from the station's position so the line "flies" around
    const i0 = Math.round((TH_LIMB / (Math.PI * 2)) * 720);
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [w, col] of [[4, 'rgba(2,6,12,0.45)'], [1.8, L.rgba(ACCENT, 0.95)]]) {
      c.strokeStyle = col; c.lineWidth = w;
      c.beginPath();
      let on = false;
      for (let j = 0; j < drawn; j++) {
        const q = sp[(i0 + j) % 720];
        if (!q.vis) { on = false; continue; }
        if (!on) { c.moveTo(q.x, q.y); on = true; } else c.lineTo(q.x, q.y);
      }
      c.stroke();
    }
    c.restore();
    // the station (real speed: moving from the limb crossing as the beat plays)
    const th = TH_LIMB - 9 * DEG + ((v.t - v.d / 2) / PERIOD) * Math.PI * 2;
    const q = orbitPt(th), sx = v.wx(q.x), sy = v.wy(q.y);
    const ks = enter(v, phrase(B, 0) + 0.5, 0.6);
    issIcon(c, sx, sy, 1.15, ks);
    // label
    const kl = enter(v, phrase(B, 0) + 0.9, 0.7);
    const lx = sx + 40, ly = sy + 110;
    c.save(); c.globalAlpha *= kl;
    c.strokeStyle = 'rgba(2,6,12,0.55)'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(sx + 14, sy + 12); c.lineTo(lx - 6, ly - 6); c.stroke();
    c.strokeStyle = L.rgba(INK, 0.85); c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(sx + 14, sy + 12); c.lineTo(lx - 6, ly - 6); c.stroke();
    c.restore();
    text(c, 'ISS · 400 KM UP', lx, ly + 4, { size: 20, alpha: kl });
    text(c, '51.6° ORBIT · ONE LAP EVERY 92 MIN', lx, ly + 30, { size: 16, weight: 600, alpha: kl * 0.9, color: [190, 205, 220], track: 2 });
    // the gap at the limb: radial bracket from the surface to the orbit
    const kb = enter(v, phrase(B, 1) + 0.2, 0.8);
    const ql = orbitPt(TH_LIMB), qx = v.wx(ql.x), qy = v.wy(ql.y);
    const ang = Math.atan2(qy - cy, qx - cx);
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const r1 = Math.hypot(qx - cx, qy - cy);
    bracket(c, cx + ux * re, cy + uy * re, cx + ux * r1, cy + uy * r1, kb, '', { tick: 6 });
    const tx = cx + ux * (r1 + 14), ty = cy + uy * (r1 + 14);
    text(c, '400 KM', tx, ty, { size: 16, alpha: kb, align: 'left', color: [235, 232, 225] });
    void phraseEnd;
  },
};
