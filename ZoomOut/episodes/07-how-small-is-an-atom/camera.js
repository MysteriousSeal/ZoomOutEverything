// Camera for "How Small Is an Atom, Really?" (60 s): a powers-of-ten zoom INTO one hair. Owned by the orchestrator.
//
// WORLD: metres, top-down/flat. Everything is nested near the origin so each zoom lands inside the previous frame.
//   HAIR: a 70 µm wide hair runs horizontally along y = 0 (|y| ≤ 35 µm)
//   CELLS: ten red blood cells (7 µm) lined up ACROSS the hair (vertically), centred at x = 0, y = (i − 4.5) × 7 µm
//   CELL: the chosen cell (i = 5) at (0, 3.5 µm)
//   BACT: a 1 µm × 2 µm rod bacterium just beside the chosen cell
//   VIRUS: a 100 nm virus just beside the bacterium
//   DNA: a 2 nm wide double-helix strand passing next to the virus
//   ATOM: one ~0.14 nm atom on the DNA strand
//   HUMAN: at the very end the camera pulls out to a 1.75 m person whose head is at the origin
import { makeCamera } from '../../../engine/runtime/kit.js';

export const P = {
  cell: { x: 0, y: 3.5e-6 },
  bact: { x: 5.2e-6, y: 3.0e-6 },
  virus: { x: 6.4e-6, y: 2.75e-6 },
  dna: { x: 6.52e-6, y: 2.75e-6 },
  atom: { x: 6.5203e-6, y: 2.7501e-6 },
};
export const SIZE = { hair: 70e-6, cell: 7e-6, bact: 1e-6, virus: 100e-9, dna: 2e-9, atom: 0.14e-9, human: 1.75 };

const cam = makeCamera([
  { x: 0, y: 0, mpp: 1.05e-7, travel: 0 },               // 0 hook: the hair across the frame
  { x: 0, y: 3.0e-6, mpp: 0.95e-7, travel: 1.0 },        // 1 70 µm (hair raised a little off the caption band)
  { x: 0, y: 4.6e-6, mpp: 1.0e-7, travel: 1.0 },         // 2 ten blood cells across it (hair ends ≈ 1215 px, above the captions)
  { ...P.cell, x: 2.4e-6, mpp: 1.25e-8, travel: 1.7 },   // 3 cell + bacterium
  { ...P.virus, x: 6.2e-6, mpp: 1.05e-9, travel: 1.7 },  // 4 bacterium + virus (virus ≈ 95 px)
  { ...P.dna, mpp: 1.5e-11, travel: 1.8 },               // 5 DNA, 2 nm (helix ≈ 130 px)
  { ...P.atom, mpp: 1.2e-12, travel: 1.8 },              // 6 one atom
  { x: 0, y: 2.0e-6, mpp: 1.0e-7, travel: 2.4 },         // 7 (hair 520–1240 px: clears the captions)
  // back out: half a million atoms across the hair
  { ...P.atom, mpp: 4e-13, travel: 1.0 },                // 8 back in to one atom (hidden behind the loupe match-cut, see DIVE)
  { ...P.atom, mpp: 3.8e-13, travel: 0.6 },              // 9–11 the stadium analogy (screen-space morph)
  { ...P.atom, mpp: 3.6e-13, travel: 0.6 },
  { ...P.atom, mpp: 3.4e-13, travel: 0.6 },
  { x: 0, y: 0.8, mpp: 0.0029, travel: 3.2 },            // 12 all the way out to you
], { anchor: 0.47 });

/** Beat 8 match-cut (beat seconds): the loupe grows over the frame (0 → grow), the camera dives behind it
 *  (grow → grow + 1.0), and the lens dissolves from `reveal` over `revealDur`. */
export const DIVE = { grow: 0.85, reveal: 1.85, revealDur: 0.6 };

export function at(gt, tl) {
  const s = tl.scenes[8];
  if (gt > s.start && gt < s.end) {
    const d = s.end - s.start, t = gt - s.start, tr = 1.0;
    // hold at the hair while the lens grows, travel (hidden) for 1 s, then the hold push stretched to the beat end
    const t2 = t < DIVE.grow ? 0 : t < DIVE.grow + tr ? t - DIVE.grow : tr + (t - DIVE.grow - tr) * (d - tr) / (d - DIVE.grow - tr);
    return cam.at(s.start + t2, tl);
  }
  return cam.at(gt, tl);
}
