// 14c beat 7 (iceAge; 14b beat 10) — "Twenty thousand years ago, in the last ice age, | the sea was about one hundred twenty meters lower."
// Phrase 1: over the Arctic view, the Last Glacial Maximum ice sheets spread out from their domes: the Laurentide +
// Cordilleran over North America (with Greenland's expanded shelf ice) and the Fennoscandian + British-Irish +
// Barents-Kara sheet over northern Europe. They are NOT drawn here: the sourced outlines live in ../lgm.js and env.js
// renders them inside the globe raster as domed ice (Nye profile hillshade, bluish thinning margin, feathered edge),
// growing from the domes (env lgmG) and retreating with the sea's return in beat 12.
// Label: "20,000 years ago" / "the last ice age".
// Phrase 2: env drops the sea 120 m and the shelves turn to sand; the label becomes "−120 m" / "390 ft lower seas".
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, BEAT, SAND, seaShown, project, platedLabel } from '../env.js';

const ph = (tl, i, j, edge = 'start') => tl.lines[i].phrases[j][edge];

// ------------------------------------------------------------------ timing
function times(tl) {
  return {
    grow0: ph(tl, BEAT.iceAge, 0) + 0.05,             // "Twenty thousand years ago…": the ice spreads (= env lgmG)
    grow: 2.4,
    lbl1: ph(tl, BEAT.iceAge, 0) + 0.55,
    lbl1Out: ph(tl, BEAT.iceAge, 1) - 0.1,
    lbl2: ph(tl, BEAT.iceAge, 1) + 1.1,               // on "one hundred twenty meters": counts down with the sea (= the HUD)
    melt0: tl.scenes[BEAT.notFixed].start + 0.15,       // "Coastlines aren't fixed": the ghost ice dissolves as the sea returns
    melt: 1.45,                              // gone by ~55.5, before s12's outlines arrive
  };
}
/** 0..1 how much of the ice sheets exist now (grow in beat 10, melt in beat 12). */
export function iceAgeK(v, delay = 0) {
  const tm = times(v.tl);
  const g = L.ease.inOutCubic(L.prog(v.gt, tm.grow0 + delay, tm.grow));
  const m = L.ease.inOutCubic(L.prog(v.gt, tm.melt0 + delay * 0.5, tm.melt));
  return g * (1 - m);
}

export default {
  beat: 7,
  chapter: { num: '07', title: 'The last ice age', sub: 'about 20,000 years ago' },
  captions: true,
  layer: 1,
  // beat starts 41.24; phrase 1 at 41.39 (ice spreads 41.64-44.0); phrase 2 at 45.57, sea falls 45.32-47.82
  cues(d) {
    return [
      { t: 0.45, name: 'creak', gain: 0.3, pitch: 0.8 },
      { t: 0.55, name: 'shimmer', gain: 0.22, pitch: 0.7 },
      { t: 0.75, name: 'tick', gain: 0.12, pitch: 1.0 },
      { t: 1.9, name: 'creak', gain: 0.18, pitch: 1.1 },
      { t: 2.75, name: 'shimmer', gain: 0.18, pitch: 1.2 },
  // 14c: phrase-2 cues moved with the shorter phrase gap (phrase 2 starts 3.36 s into the beat; 14b 4.34)
      { t: 5.03, name: 'impact', gain: 0.32, pitch: 0.75 },
      { t: 5.08, name: 'tick', gain: 0.16, pitch: 0.9 },
    ];
  },
  drawOverlay(ctx, v) {
    const tm = times(v.tl);
    const LX = 96, LY = 500;
    // 14b: the label is gone by the end of the beat (not riding the engine's overlay fade into beat 11)
    const endK = 1 - L.ease.inCubic(L.prog(v.t, v.d - 0.4, 0.4));
    // phrase 1: when
    const k1 = Math.min(v.k, endK, L.prog(v.gt, tm.lbl1, 0.6) * (1 - L.ease.inCubic(L.prog(v.gt, tm.lbl1Out, 0.35))));
    if (k1 > 0) platedLabel(ctx, { x: LX, y: LY, big: '20,000 years ago', small: 'peak of the last ice age', k: k1, accent: [236, 244, 250], size: 104 });
    // phrase 2: how much lower
    const k2 = Math.min(v.k, endK, L.prog(v.gt, tm.lbl2, 0.6));
    if (k2 > 0) {
      // the number counts with the falling sea (always the HUD's value) and lands on −120 m at 47.8
      const m = Math.max(0, Math.round(-seaShown(v)));   // output-frame time: no blended digits under motion blur
      const ft = Math.round(m * 3.28084 / 10) * 10;
      platedLabel(ctx, { x: LX, y: LY, big: `−${m} m`, small: `${L.fmt(ft)} ft lower seas`, k: k2, accent: SAND });
    }
  },
};
void ACCENT; void project;
