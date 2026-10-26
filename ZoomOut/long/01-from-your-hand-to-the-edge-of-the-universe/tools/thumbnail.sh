#!/bin/zsh
# Rebuild out/thumbnail.jpg: the hand (t = 3 s) dissolving into the observable universe (t = 226 s), "10 CM ×10²⁸ 93 BILLION LIGHT-YEARS".
#   zsh tools/thumbnail.sh   (from the episode folder; needs ImageMagick 7 + the macOS Avenir Next fonts)
set -e
cd "${0:A:h}/.."
T=build/thumb; mkdir -p $T
node ../../../engine/node/thumb.mjs . --probe 3,226 --to $T
magick -size 1920x1080 xc:'#030509' \( $T/01_world_226.00.png -resize 125% \) -geometry +200-135 -composite $T/U.png
magick -size 1920x1080 xc:'#030509' $T/01_world_3.00.png -geometry -250+0 -composite $T/H.png
magick \( -size 720x1080 xc:white \) \( -size 1080x460 gradient:white-black -rotate -90 \) \( -size 740x1080 xc:black \) +append $T/M.png
magick $T/U.png $T/H.png $T/M.png -composite \
  \( -size 1920x420 gradient:'rgba(2,4,10,0)'-'rgba(2,4,10,0.85)' \) -gravity south -compose over -composite \
  \( -size 1920x260 gradient:'rgba(2,4,10,0.7)'-'rgba(2,4,10,0)' \) -gravity north -compose over -composite \
  -gravity northwest -font Avenir-Next-Condensed-Heavy -fill white -pointsize 190 -annotate +80+800 '10 CM' \
  -fill '#5ADCEB' -pointsize 150 -gravity southeast -annotate +80+140 '93 BILLION' \
  -fill white -pointsize 66 -gravity southeast -annotate +84+70 'LIGHT-YEARS' \
  -gravity northwest -fill '#5ADCEB' -pointsize 120 -annotate +760+40 '×10' \
  -pointsize 66 -annotate +985+26 '28' \
  -font Avenir-Next-Bold -fill 'rgba(235,232,225,0.95)' -pointsize 30 -kerning 8 -annotate +84+70 'ZOOM OUT' \
  -quality 92 out/thumbnail.jpg
rm -rf $T
echo "done -> out/thumbnail.jpg"
