#!/usr/bin/env bash
# Generate a video walkthrough of the actual Square POS app UI
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-/opt/cursor/artifacts/videos}"
OUTPUT="$ARTIFACTS_DIR/square-app-ui.mp4"

mkdir -p "$ARTIFACTS_DIR"

echo "[ui-video] Downloading official Play Store screenshots..."
python3 "$ROOT_DIR/scripts/generate_ui_video.py" --output "$OUTPUT"

echo ""
echo "Square POS UI video ready:"
ls -lh "$OUTPUT"
echo "Path: $OUTPUT"
