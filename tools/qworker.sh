#!/bin/zsh
# one render at a time: pops episode names from tools/queue.txt (append a name to enqueue); exits after 3 h idle
T=${0:A:h}
Q=$T/queue.txt; touch $Q; idle=0
while (( idle < 1080 )); do
  e=$(head -1 $Q)
  if [[ -z $e ]]; then sleep 10; idle=$((idle+1)); continue; fi
  idle=0; tail -n +2 $Q > $Q.tmp && mv $Q.tmp $Q
  echo "== $e $(date +%T)"; $T/rend.sh $e 2>&1 | grep -v "^frame [0-9]*:"; echo "-- done $e $(date +%T)"
done
