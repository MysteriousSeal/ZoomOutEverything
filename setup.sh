#!/bin/zsh
# One-time setup on a new Mac. Run from anywhere: ./setup.sh
set -e
cd "${0:A:h}"
for c in ffmpeg node python3.13 magick; do command -v $c >/dev/null || { echo "missing: $c (brew install ffmpeg node python@3.13 imagemagick)"; exit 1; }; done
[ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ] || [ -n "$CHROME" ] || echo "warning: Google Chrome not found (install it, or set CHROME=<path to the binary>)"

(cd engine && npm ci)

[ -x TheShortAnswer/.venv/bin/python ] || python3.13 -m venv TheShortAnswer/.venv
TheShortAnswer/.venv/bin/pip install -q -r requirements.txt

[ -x tools/stt-venv/bin/python ] || python3.13 -m venv tools/stt-venv
tools/stt-venv/bin/pip install -q -r tools/requirements-stt.txt

mkdir -p TheShortAnswer/models
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  [ -s TheShortAnswer/models/$f ] || curl -fL -o TheShortAnswer/models/$f https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f
done

[ -f .env ] || { echo "ELEVENLABS_API_KEY=" > .env; chmod 600 .env; echo "created .env: paste your ElevenLabs key after ELEVENLABS_API_KEY="; }
echo "setup done. Optional: copy docs/notes/* to ~/.claude/projects/<project>/memory/ (README.md -> MEMORY.md)."
