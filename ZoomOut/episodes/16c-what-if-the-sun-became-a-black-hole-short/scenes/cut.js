// 16c: the 16 scenes, played on 16 time (remap.js).
//  - drawWorld16: every kept 16 scene's world layer, in 16's layer order, each with its own 16 view (oview), exactly
//    as 16's engine drew them. 16c beat 0 (c00-hook.js) runs it for the whole film. Not drawn: s01's world (the white-
//    dwarf teaser of the cut line "the strangest part comes last"), s08 (same pull), s12 (the drive), s15 (the oceans)
//    and s18 (red giant / white dwarf): their beats are cut (their files are removed from 16c).
//  - beat(): a 16c beat that draws the overlays of the 16 scenes it plays, and their cues moved through the map.
import { mapCues, oview } from '../remap.js';
import s00 from './s00-hook.js';
import s02 from './s02-nothing-changes.js';
import s03 from './s03-sunlight.js';
import s04 from './s04-gravity-speed.js';
import s05 from './s05-dark.js';
import s06 from './s06-no-fly-off.js';
import s07 from './s07-same-orbit.js';
import s09 from './s09-mass-distance.js';
import s10 from './s10-how-small.js';
import s11 from './s11-six-km.js';
import s13 from './s13-cold.js';
import s14 from './s14-minus-eighteen.js';
import s16 from './s16-twist.js';
import s17 from './s17-too-light.js';

const WORLD = [[s00, 0], [s02, 2], [s03, 3], [s04, 4], [s05, 5], [s06, 6], [s07, 7], [s09, 9], [s10, 10], [s11, 11],
  [s13, 13], [s14, 14], [s16, 16], [s17, 17]];
const ORDER = WORLD.map((w, i) => [w[0].layer ?? 0, i]).sort((a, b) => a[0] - b[0]).map((x) => WORLD[x[1]]);

export function drawWorld16(c, v) {
  for (const [S, ob] of ORDER) {
    if (!S.drawWorld) continue;
    c.save();
    S.drawWorld(c, oview(v, ob, S));
    c.restore();
  }
}

/**
 * A 16c beat. parts: [[scene16, ob, keepCue?], ...] (the 16 scenes whose overlays it draws, and whose cues it plays
 * unless `cues` is given; keepCue(o, q) filters a cue by its 16 time o).
 */
export function beat(nb, { chapter, parts, cues, captions = true, layer = 0, extra = {} }) {
  return {
    beat: nb,
    chapter,
    captions,
    layer,
    cues: cues ?? (() => parts.flatMap(([S, ob, keep]) => (keep === false ? [] : mapCues(S, ob, nb, keep || undefined)))),
    drawOverlay(c, v) {
      for (const [S, ob] of parts) {
        if (!S.drawOverlay) continue;
        c.save();
        S.drawOverlay(c, oview(v, ob, S, nb));
        c.restore();
      }
    },
    ...extra,
  };
}
