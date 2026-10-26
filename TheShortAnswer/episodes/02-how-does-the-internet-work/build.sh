#!/bin/sh
# Rebuild episode 02 end to end: voice -> sound design/score mix -> animation + captions -> mp4.
# Options:  VOICE=am_michael SPEED=1.0 ./build.sh   (hear the options in build/auditions/)
set -e
cd "$(dirname "$0")"
PY=../../.venv/bin/python
$PY voice.py
$PY audio.py
$PY render.py
echo "Open: $(pwd)/out/02-how-does-the-internet-work.mp4"
