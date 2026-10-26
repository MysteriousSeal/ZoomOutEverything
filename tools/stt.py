import sys, wave, numpy as np
from faster_whisper import WhisperModel
w = wave.open(sys.argv[1])
a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
a = a[: len(a) // 3 * 3].reshape(-1, 3).mean(axis=1)
m = WhisperModel("small.en", device="cpu", compute_type="int8")
segs, _ = m.transcribe(a, beam_size=5)
print(" ".join(s.text.strip() for s in segs))
