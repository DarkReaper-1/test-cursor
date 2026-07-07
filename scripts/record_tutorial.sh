#!/usr/bin/env bash
# Generate a structured tutorial video for the Square RE toolkit
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-/opt/cursor/artifacts/videos}"
VIDEO="$ARTIFACTS_DIR/square-re-tutorial.mp4"

mkdir -p "$ARTIFACTS_DIR"
# shellcheck source=/dev/null
[[ -f "$ROOT_DIR/.env.tools" ]] && source "$ROOT_DIR/.env.tools"

APK="$ROOT_DIR/apks/com.squareup.apk"

# Ensure we have real analysis data for accurate tutorial content
if [[ ! -f "$APK" ]]; then
  echo "[tutorial] Downloading Square APK..."
  "$ROOT_DIR/scripts/download_apk.sh" --apkeep
fi

if [[ ! -f "$ROOT_DIR/output/com.squareup/scan-report.txt" ]]; then
  echo "[tutorial] Running fast analysis for tutorial data..."
  "$ROOT_DIR/scripts/analyze.sh" "$APK" --fast
fi

echo "[tutorial] Rendering tutorial video..."
python3 "$ROOT_DIR/scripts/generate_tutorial_video.py" \
  --root "$ROOT_DIR" \
  --output "$VIDEO"

echo ""
echo "Tutorial video ready:"
ls -lh "$VIDEO"
echo ""
echo "Path: $VIDEO"
