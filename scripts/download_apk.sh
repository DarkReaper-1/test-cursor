#!/usr/bin/env bash
# Helper to obtain Square APK from a connected device or manual path
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APKS_DIR="$ROOT_DIR/apks"

usage() {
  cat <<EOF
Usage: $(basename "$0") [package-name] [options]

Obtain Square APK for analysis.

Methods (tried in order):
  1. Pull from USB-connected Android device via adb
  2. Copy from user-supplied path (--from PATH)

Default package: com.squareup (Square Point of Sale)

Examples:
  $(basename "$0")                          # pull com.squareup from device
  $(basename "$0") com.squareup.team        # pull Square Team app
  $(basename "$0") --from ~/Downloads/base.apk

Manual download alternatives:
  - Install from Play Store on device, then pull with adb
  - Use apkeep: apkeep -a com.squareup -d google-play apks/
  - APK mirror sites (verify SHA-256 checksum)

See docs/methodology.md for legal/ethical guidelines.
EOF
}

PACKAGE="com.squareup"
FROM=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --from) FROM="$2"; shift 2 ;;
    *)
      PACKAGE="$1"
      shift
      ;;
  esac
done

mkdir -p "$APKS_DIR"
OUT="$APKS_DIR/${PACKAGE}.apk"

if [[ -n "$FROM" ]]; then
  if [[ ! -f "$FROM" ]]; then
    echo "Error: file not found: $FROM" >&2
    exit 1
  fi
  cp "$FROM" "$OUT"
  echo "[download] Copied to $OUT"
  sha256sum "$OUT"
  exit 0
fi

if ! command -v adb >/dev/null 2>&1; then
  echo "Error: adb not found. Run ./scripts/setup.sh or use --from PATH" >&2
  exit 1
fi

DEVICES="$(adb devices | rg -v 'List of devices' | rg 'device$' | wc -l)"
if [[ "$DEVICES" -eq 0 ]]; then
  echo "Error: no adb device connected." >&2
  echo "Connect a device with USB debugging, or use --from PATH" >&2
  exit 1
fi

echo "[download] Locating $PACKAGE on device..."
APK_PATH="$(adb shell pm path "$PACKAGE" 2>/dev/null | head -1 | sed 's/package://' | tr -d '\r')"

if [[ -z "$APK_PATH" ]]; then
  echo "Error: $PACKAGE not installed on device." >&2
  echo "Install from Play Store first, then retry." >&2
  exit 1
fi

echo "[download] Pulling $APK_PATH ..."
adb pull "$APK_PATH" "$OUT"
echo "[download] Saved to $OUT"
sha256sum "$OUT"
