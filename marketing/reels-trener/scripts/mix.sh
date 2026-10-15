#!/usr/bin/env bash
# Final audio: the voice on top, the music bed EQ'd out of the speech band and ducked
# (sidechain) whenever the voice speaks, then the whole mix brought to Reels loudness.
#
#   bash scripts/mix.sh   (after `npm run render:silent`)
set -euo pipefail
cd "$(dirname "$0")/.."

ffmpeg -v error -y \
  -i out/video-silent.mp4 -i public/voice.m4a -i public/music.wav \
  -filter_complex "
    [1:a]aresample=48000,pan=stereo|c0=c0|c1=c0,apad[voice];
    [voice]asplit=2[v][sc];
    [2:a]aresample=48000,
         equalizer=f=350:t=q:w=1.2:g=-3,
         equalizer=f=2500:t=q:w=1.2:g=-6,
         volume=0.42[m];
    [m][sc]sidechaincompress=threshold=0.03:ratio=3.5:attack=25:release=450:makeup=1[duck];
    [v][duck]amix=inputs=2:normalize=0:duration=longest,
         loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart \
  out/chaqqon-trener-reels.mp4

echo "→ out/chaqqon-trener-reels.mp4"
