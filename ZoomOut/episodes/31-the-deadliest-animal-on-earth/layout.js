// Shared layout + timing for "The Deadliest Animal on Earth" (Zoom Out 31). Imported by camera.js, env.js and scenes.
// Every time is a function of build/timeline.json (beat starts, phrases, word fractions inside a phrase), never seconds.
import * as L from '../../../engine/runtime/lib.js';

// ------------------------------------------------------------------ timing
/** beat i start (+dt), global seconds */
export const B = (tl, i, dt = 0) => tl.scenes[i].start + dt;
/** beat i end */
export const BE = (tl, i, dt = 0) => tl.scenes[i].end + dt;
/** phrase j of line i, 'start' | 'end' (+dt) */
export function PH(tl, i, j = 0, edge = 'start', dt = 0) {
  const ln = tl.lines[i], ph = ln.phrases ?? [ln];
  return ph[Math.min(j, ph.length - 1)][edge] + dt;
}
/** a word inside phrase j of line i, as a fraction of that phrase (measured on the voice envelope, so it follows a re-cut) */
export function WD(tl, i, j, frac, dt = 0) {
  const a = PH(tl, i, j, 'start'), b = PH(tl, i, j, 'end');
  return a + (b - a) * frac + dt;
}
// word positions (fractions of their phrase), from the vo.wav energy envelope
export const WORDS = {
  // re-measured on the re-cut vo.wav (10 ms envelope + whisper word times), onsets of the stressed syllable
  six: [1, 0, 0.332],                 // "Sharks kill about SIX people a year"           (≈ 7.66 s)
  upTo: [2, 0, 0.205],                // "Snakes kill UP TO a hundred ..."               (≈ 10.87)
  snakeHundred: [2, 0, 0.30],         // "up to a HUNDRED and thirty-eight thousand"     (≈ 11.16)
  snakeThousand: [2, 0, 0.815],       // "... thirty-eight THOUSAND"                     (≈ 12.72)
  farmers: [2, 1, 0.235],             // "Many of them FARMERS"                          (≈ 14.56)
  far: [2, 1, 0.528],                 // "FAR from a hospital"                           (≈ 15.52)
  hospital: [2, 1, 0.69],             // "far from a HOSPITAL"                           (≈ 16.05)
  sixty: [3, 0, 0.536],               // "Dogs: about SIXTY thousand"                    (≈ 19.17)
  dogThousand: [3, 0, 0.778],         // "... sixty THOUSAND"                            (≈ 19.73)
  rabies: [3, 1, 0.53],               // "almost all from RABIES"                        (≈ 21.66)
  four: [4, 0, 0.282],                // "more than FOUR hundred thousand"               (≈ 24.56)
  humThousand: [4, 0, 0.468],         // "... four hundred THOUSAND"                     (≈ 25.38)
  tiny: [5, 0, 0.538],                // "But number one is TINY"                        (≈ 29.86)
  dengue: [5, 2, 0.262],              // "It also spreads DENGUE"                        (≈ 34.23)
  zika: [5, 2, 0.442],                // "ZIKA"                                          (≈ 34.90)
  yellow: [5, 2, 0.66],               // "and YELLOW FEVER"                              (≈ 35.72)
  malSix: [6, 0, 0.269],              // "Malaria alone killed SIX hundred and ten thousand" (≈ 39.26)
  malThousand: [6, 0, 0.5285],        // "... ten THOUSAND"                              (≈ 40.62)
  under: [6, 1, 0.42],                // "most of them children UNDER five"              (≈ 44.63)
};
export const W8 = (tl, name, dt = 0) => { const [i, j, f] = WORDS[name]; return WD(tl, i, j, f, dt); };

/** frame-quantised global time (digits never flicker between motion-blur sub-frames) */
export const gq = (gt) => Math.round(gt * 30) / 30;

// ------------------------------------------------------------------ screen layout (1080 × 1920)
export const HERO = { cx: 540, cy: 560 };          // hero visuals live in y ≈ 360–760
export const NUM_Y = 862;                          // big number baseline
export const SUB_Y = 910;                          // its source / unit line
// leaderboard panel (WORLD space = screen space at rest)
export const CH = {
  x: 70, w: 940, top: 942, h: 440,
  headY: 978,                                       // header baseline
  row0: 998, pitch: 68,                             // row tops
  rankX: 96, iconX: 162, nameX: 200, bx0: 200, bx1: 900, valX: 900,
  barDy: 37, barH: 18, nameDy: 25,
  tickY: 1366,
};
/** icon centre of rank slot r (0 = #1) */
export const iconAt = (r) => ({ x: CH.iconX, y: CH.row0 + r * CH.pitch + 30 });
/** world position of the mosquito (the #1 icon slot) */
export const MOSQ = iconAt(0);
/** where the camera puts the mosquito on screen at macro scale */
export const MACRO_SCREEN = { x: 540, y: 735 };
export const MACRO_Z = 19;

export const ANCHOR = 0.47;
export const AY = L.H * ANCHOR;
