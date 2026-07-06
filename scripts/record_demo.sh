#!/usr/bin/env bash
# Record a demo video of the Square RE analysis pipeline
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-/opt/cursor/artifacts/videos}"
CAST_FILE="$ARTIFACTS_DIR/square-re-demo.cast"
VIDEO_FILE="$ARTIFACTS_DIR/square-re-demo.mp4"
DEMO_LOG="$ARTIFACTS_DIR/demo-output.txt"

mkdir -p "$ARTIFACTS_DIR"
# shellcheck source=/dev/null
source "$ROOT_DIR/.env.tools"

export PATH="$HOME/.local/bin:$PATH"

APK="$ROOT_DIR/apks/com.squareup.apk"
if [[ ! -f "$APK" ]]; then
  XAPK="$ROOT_DIR/apks/com.squareup.xapk"
  if [[ -f "$XAPK" ]]; then
    echo "Extracting APK from XAPK bundle..."
    unzip -q -o "$XAPK" com.squareup.apk -d "$ROOT_DIR/apks/xapk_extract"
    cp "$ROOT_DIR/apks/xapk_extract/com.squareup.apk" "$APK"
  else
    echo "Square APK missing — downloading via apkeep..."
    curl -fsSL "https://github.com/EFForg/apkeep/releases/download/0.18.0/apkeep-x86_64-unknown-linux-gnu" \
      -o /tmp/apkeep
    chmod +x /tmp/apkeep
    /tmp/apkeep -a com.squareup -d apk-pure "$ROOT_DIR/apks/"
    if [[ -f "$ROOT_DIR/apks/com.squareup.xapk" ]]; then
      unzip -q -o "$ROOT_DIR/apks/com.squareup.xapk" com.squareup.apk -d "$ROOT_DIR/apks/xapk_extract"
      cp "$ROOT_DIR/apks/xapk_extract/com.squareup.apk" "$APK"
    fi
  fi
fi

# Run analysis (capture output for video if cast fails)
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
  echo "[*] Running analysis pipeline..."
  echo ""
  "$ROOT_DIR/scripts/analyze.sh" "$APK"
  echo ""
  echo "=============================================="
  echo " Scan highlights"
  echo "=============================================="
  head -60 "$ROOT_DIR/output/com.squareup/scan-report.txt"
  echo ""
  echo "... (truncated for demo) ..."
  echo ""
  echo "=============================================="
  echo " Demo complete — artifacts in output/com.squareup/"
  echo "=============================================="
} 2>&1 | tee "$DEMO_LOG"

# Try asciinema recording for nicer terminal replay
if command -v asciinema >/dev/null 2>&1; then
  asciinema rec "$CAST_FILE" -c "bash $ROOT_DIR/scripts/record_demo.sh --playback-only" 2>/dev/null || true
fi

# Generate MP4 from demo log using ffmpeg + PIL terminal frames
python3 "$ROOT_DIR/scripts/generate_demo_video.py" \
  --input "$DEMO_LOG" \
  --output "$VIDEO_FILE"

echo ""
echo "Video: $VIDEO_FILE"
echo "Cast:  $CAST_FILE (if recorded)"
ls -lh "$VIDEO_FILE" 2>/dev/null || true
