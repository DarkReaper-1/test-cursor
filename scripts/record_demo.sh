#!/usr/bin/env bash
# Record a demo video of the Square RE analysis pipeline
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-/opt/cursor/artifacts/videos}"
VIDEO_FILE="$ARTIFACTS_DIR/square-re-demo.mp4"
DEMO_LOG="$ARTIFACTS_DIR/demo-output.txt"

mkdir -p "$ARTIFACTS_DIR"
# shellcheck source=/dev/null
source "$ROOT_DIR/.env.tools"

APK="$ROOT_DIR/apks/com.squareup.apk"
if [[ ! -f "$APK" ]]; then
  "$ROOT_DIR/scripts/download_apk.sh" --apkeep
fi

{
  echo "=============================================="
  echo " Square App Reverse Engineering — Live Demo"
  echo "=============================================="
  echo ""
  echo "[*] APK: apks/com.squareup.apk"
  sha256sum "$APK"
  echo ""
  aapt dump badging "$APK" | head -6
  echo ""
  echo "[*] Running fast analysis pipeline..."
  echo ""
  "$ROOT_DIR/scripts/analyze.sh" "$APK" --fast
  echo ""
  echo "=============================================="
  echo " Scan highlights"
  echo "=============================================="
  rg -n 'POS intent|CertificatePinner|PlayIntegrity|sq0[a-z]{3}-' \
    "$ROOT_DIR/output/com.squareup/scan-report.txt" 2>/dev/null | head -30 || true
  echo ""
  echo "=============================================="
  echo " Demo complete"
  echo "=============================================="
} 2>&1 | tee "$DEMO_LOG"

python3 "$ROOT_DIR/scripts/generate_demo_video.py" \
  --input "$DEMO_LOG" \
  --output "$VIDEO_FILE"

echo ""
echo "Video: $VIDEO_FILE"
ls -lh "$VIDEO_FILE"
