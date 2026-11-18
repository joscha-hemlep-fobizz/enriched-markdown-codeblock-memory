#!/usr/bin/env bash
# Measures the app's memory for one scenario on an iOS simulator.
#
#   ./measure.sh <simulator-udid> lines/800       # static block: footprint + CoreAnimation once it settled
#   ./measure.sh <simulator-udid> stream/800      # streaming block: sample every 0.5 s until it is done
#
# Each run relaunches the app, so every scenario starts from the same baseline.
set -euo pipefail

udid=$1
scenario=$2
bundle=dev.repro.enrichedmarkdowncodeblock

xcrun simctl terminate "$udid" "$bundle" 2>/dev/null || true
pid=$(xcrun simctl launch "$udid" "$bundle" | awk '{print $NF}')
sleep 4

sample() {
  vmmap --summary "$pid" 2>/dev/null |
    awk -v t="$1" '/^Physical footprint:/ {fp=$3} /^CoreAnimation / {ca=$3} END {printf "%-6s footprint %-8s CoreAnimation %s\n", t, fp, (ca ? ca : "0")}'
}

sample before
xcrun simctl openurl "$udid" "repro://$scenario"

if [[ $scenario == stream/* ]]; then
  for i in $(seq 1 40); do
    sleep 0.5
    sample "$(printf '%.1fs' "$(echo "$i * 0.5" | bc)")"
  done
else
  sleep 5
  sample after
fi
