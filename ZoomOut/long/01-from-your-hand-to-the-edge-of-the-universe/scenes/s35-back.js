// Beat 35: So let's go back.
// Builder E. No overlay: every decoration fades as the rush back starts (layers/e-ui.js decoK), and the layers retrace
// the zoom (pure functions of the camera). Sound: a big whoosh into the rush.
export default {
  beat: 35,
  chapter: null,
  cues() {
    return [
      { t: 0.12, name: 'whoosh', gain: 0.6, pitch: 0.6 },
      { t: 0.25, name: 'dive', gain: 0.3, pitch: 0.7 },
      { t: 1.9, name: 'whoosh', gain: 0.3, pitch: 0.9 },
    ];
  },
};
