// Beat 1 — "Sharks kill about six people a year."
// The hook's shark rises into the hero zone; the leaderboard plate wipes open below (env), sized to its one row (no
// rank while sharks are alone). "≈" + a blank split-flap cell hold the number's place; the 6 flaps in ON "six" as
// the shark row's bar lands on its 0–10 axis. At the end the shark docks into its row icon (env).
import { statBlock } from '../env.js';

export default {
  beat: 1,
  chapter: null,
  captions: true,
  layer: 5,
  drawOverlay(c, v) {
    statBlock(c, v, 'shark', 'UNPROVOKED SHARK-BITE DEATHS PER YEAR · ISAF, 10-YR AVERAGE');
  },
};
