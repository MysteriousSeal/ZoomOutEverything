// Beat 4 — "Humans kill more than four hundred thousand of each other every year."
// A neutral standing pictogram (env hero, no violence). The count lands ON "thousand" (≈ 450,000, UNODC); the axis
// rescales to 500,000 and humans take #1 on the board. The figure docks into its row at the end.
import { statBlock } from '../env.js';

export default {
  beat: 4,
  chapter: null,
  captions: true,
  layer: 5,
  drawOverlay(c, v) {
    statBlock(c, v, 'human', 'HOMICIDES PER YEAR · UNODC GLOBAL STUDY ON HOMICIDE');
  },
};
