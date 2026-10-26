// Beat 5 — "Keep draining. At two and a half kilometers, | a hidden mountain range appears."
// The camera pulls out to the whole Atlantic face while the sea drains −120 → −2,500 m (29.80–34.16). The ridge surfaces
// by itself in the raster (a pale seam out of the navy). This scene makes that the hook picture:
//   * an accent UNDER-GLOW along the Mid-Atlantic Ridge (+ its Arctic continuation), as if lit from below the water.
//     It rises with the drain (from ≈ −900 m to −2,500 m) and a slow shimmer runs north → south along it;
//   * crest GLINTS: wherever the falling surface passes a crest (data elevation on the ridge line), a bright glint
//     blooms and settles to a small steady spark, so the emergence is visible point by point (Iceland, the Azores,
//     the shallow MAR segments break the surface first, exactly as in the data);
//   * the label "2.5 km" / "a hidden mountain range" lands on "two and a half kilometers" (no leader: the glowing seam
//     is the only thing on the face, and the preroll headline sits right above).
// This is the preroll's picture (film 33.33–34.76 at 0.25×, under p-cold's headline in y 160–380): the label block
// sits at y ≥ 430 and the glow is full by then. The under-glow hands over to s06's bright trace early in beat 6.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, RIDGE, dataSea, elevation, project, seaLevel } from '../env.js';
import { ridgeSeg, strokeSeg, labelBlock, wordAt } from './s06-ridge.js';

const ATL = RIDGE.filter((b) => b.name === 'mid-atlantic' || b.name === 'arctic-atlantic');
const CHUNK = 420;                                     // km per shimmer chunk
// crest samples (every ~110 km) with their data elevation
const CRESTS = [];
for (const b of ATL) {
  for (let s = 0; s < b.len; s += 110) {
    const p = ridgeSeg(b, s, Math.min(b.len, s + 2));
    if (!p) continue;
    const [lat, lon] = p[0];
    CRESTS.push({ lat, lon, e: elevation(lat, lon), seed: (s * 7.13 + lat * 13.7) % 6.28 });
  }
}
const LABEL = { x: 80, y: 568 };

/** Under-glow strength 0..1 at global time (rises with the drain, hands over to s06 in beat 6). */
function glowK(v) {
  const s = seaLevel(v), sc = v.tl.scenes;
  const rise = L.smoothstep(L.invLerp(-700, -2450, s));
  const handoff = 1 - L.ease.inOutCubic(L.prog(v.gt, sc[6].start + 0.6, 1.6));
  return rise * handoff;
}

export default {
  beat: 5,
  chapter: { num: '04', title: 'Keep draining' },
  layer: 5,
  cues(d) {
    // beat starts 29.35: label on "two and a half" (30.55 → +1.2), the ridge "appears" (32.55 → +3.2)
    return [
      { t: 1.2, name: 'tick', gain: 0.3, pitch: 1.0 },
      { t: 3.1, name: 'shimmer', gain: 0.34, pitch: 0.9 },
      { t: 3.3, name: 'bloom', gain: 0.26, pitch: 0.8 },
    ];
  },
  drawWorld(c, v) {
    if (v.t < -0.5 || v.gt > v.tl.scenes[6].start + 2.4) return;
    const gk = glowK(v);
    if (gk <= 0.003) return;
    // 1) the under-glow: wide, faint, additive; chunks breathe with a slow north → south shimmer
    for (const b of ATL) {
      for (let s0 = 0; s0 < b.len; s0 += CHUNK) {
        const p = ridgeSeg(b, s0 - 30, s0 + CHUNK + 30);
        if (!p) continue;
        const ph = (b.name === 'arctic-atlantic' ? -s0 : s0) / 2600 - v.gt * 0.55;
        const sh = 0.72 + 0.28 * Math.sin(ph * Math.PI * 2);
        strokeSeg(c, v, [p], [[44, 0.035, ACCENT], [20, 0.07, ACCENT], [8, 0.13, ACCENT], [2.2, 0.22, L.mix(ACCENT, [255, 255, 255], 0.5)]], gk * sh);
      }
    }
    // 2) crest glints where the falling surface passes a crest
    const ds = dataSea(seaLevel(v));
    for (const q of CRESTS) {
      const above = q.e - ds;                           // m of crest above the current surface (>0 = emerged)
      if (above < -260) continue;
      const pr = project(v, q.lat, q.lon);
      if (pr.z < 0.12) continue;
      const edge = L.smoothstep(L.clamp((pr.z - 0.12) / 0.25));
      const bloom = Math.exp(-Math.pow((above - 40) / 150, 2));   // the instant of emergence
      const steady = 0.22 * L.smoothstep(L.clamp(above / 300));
      const tw = 0.85 + 0.15 * Math.sin(v.gt * 3.1 + q.seed);
      const a = (bloom + steady) * edge * tw * L.clamp(gk * 1.6);
      if (a < 0.02) continue;
      L.lightBlob(c, pr.x, pr.y, 7 + 9 * bloom, L.mix(ACCENT, [255, 255, 255], 0.5), a * 0.6);
    }
  },
  drawOverlay(c, v) {
    if (v.preroll) return;   // no label under the cold-open headline (needs the engine flag or preroll.overlays:false)
    const two = wordAt(v.tl, 5, 'two');
    const tIn = two ? two.start - 0.05 : v.tl.scenes[5].start + 1.2;
    const k = v.k * L.prog(v.gt, tIn, 0.55);
    labelBlock(c, { x: LABEL.x, y: LABEL.y, big: '2.5 km', small: 'a hidden mountain range', k, size: 112 });
  },
};
