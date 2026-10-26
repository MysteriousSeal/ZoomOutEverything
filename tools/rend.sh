#!/bin/zsh
# usage: tools/rend.sh <episode-folder-name>  (ZoomOut/episodes/<name>): cues -> mix -> frames -> mp4 + thumbnail, then checks
cd "${0:A:h}/.."
PY=TheShortAnswer/.venv/bin/python
EP=ZoomOut/episodes/$1
rm -rf $EP/build/shots $EP/build/frames
node engine/node/cues.mjs $EP && $PY engine/py/audio.py $EP && node engine/node/render.mjs $EP --sub 8 --workers 6 2>&1 | tail -2 && node engine/node/thumb.mjs $EP | tail -1
M=$EP/out/$1.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 $M
ffmpeg -v error -i $M -f null - 2>&1 | wc -l
ffmpeg -nostats -i $M -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1
rm -rf $EP/build/frames
echo "dark/dead frames: $(node tools/darkscan.mjs $M)"
