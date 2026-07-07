#!/usr/bin/env bash
# Helper to obtain Square APK from device, apkeep, or manual path
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APKS_DIR="$ROOT_DIR/apks"
TOOLS_DIR="${TOOLS_DIR:-$ROOT_DIR/.tools}"

usage() {
  cat <<EOF
Usage: $(basename "$0") [package-name] [options]

Obtain Square APK for analysis.

Methods (tried in order):
  1. --apkeep          Download via apkeep (APKPure mirror)
  2. USB device        Pull from adb-connected device (default)
  3. --from PATH       Copy from local file or XAPK bundle

Default package: com.squareup (Square Point of Sale)

Examples:
  $(basename "$0") --apkeep                 # download com.squareup
  $(basename "$0")                          # pull from USB device
  $(basename "$0") --from ~/Downloads/com.squareup.xapk

See docs/methodology.md for legal/ethical guidelines.
EOF
}

PACKAGE="com.squareup"
FROM=""
USE_APKEEP=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --from) FROM="$2"; shift 2 ;;
    --apkeep) USE_APKEEP=1; shift ;;
    *)
      PACKAGE="$1"
      shift
      ;;
  esac
done

mkdir -p "$APKS_DIR"
OUT="$APKS_DIR/${PACKAGE}.apk"

extract_xapk() {
  local xapk="$1"
  local dest="$2"
  if [[ ! -f "$xapk" ]]; then
    echo "Error: XAPK not found: $xapk" >&2
    exit 1
  fi
  local extract_dir="$APKS_DIR/xapk_extract"
  mkdir -p "$extract_dir"
  unzip -q -o "$xapk" "${PACKAGE}.apk" -d "$extract_dir" 2>/dev/null || \
    unzip -q -o "$xapk" "*.apk" -d "$extract_dir"
  local base_apk
  base_apk="$(find "$extract_dir" -maxdepth 1 -name "${PACKAGE}.apk" -o -name "*.apk" | head -1)"
  if [[ -z "$base_apk" ]]; then
    echo "Error: no APK found inside XAPK bundle" >&2
    exit 1
  fi
  cp "$base_apk" "$dest"
  echo "[download] Extracted base APK from XAPK"
}

install_apkeep() {
  local apkeep="$TOOLS_DIR/bin/apkeep"
  if [[ -x "$apkeep" ]]; then
    echo "$apkeep"
    return
  fi
  mkdir -p "$TOOLS_DIR/bin"
  curl -fsSL \
    "https://github.com/EFForg/apkeep/releases/download/0.18.0/apkeep-x86_64-unknown-linux-gnu" \
    -o "$apkeep"
  chmod +x "$apkeep"
  echo "$apkeep"
}

if [[ -n "$FROM" ]]; then
  if [[ ! -f "$FROM" ]]; then
    echo "Error: file not found: $FROM" >&2
    exit 1
  fi
  case "$FROM" in
    *.xapk|*.XAPK)
      extract_xapk "$FROM" "$OUT"
      ;;
    *)
      cp "$FROM" "$OUT"
      ;;
  esac
  echo "[download] Saved to $OUT"
  sha256sum "$OUT"
  exit 0
fi

if [[ "$USE_APKEEP" -eq 1 ]]; then
  APKEEP="$(install_apkeep)"
  echo "[download] Fetching $PACKAGE via apkeep (APKPure)..."
  "$APKEEP" -a "$PACKAGE" -d apk-pure "$APKS_DIR/"

  if [[ -f "$OUT" ]]; then
    echo "[download] Saved to $OUT"
  elif [[ -f "$APKS_DIR/${PACKAGE}.xapk" ]]; then
    extract_xapk "$APKS_DIR/${PACKAGE}.xapk" "$OUT"
    echo "[download] Saved to $OUT"
  else
    echo "Error: apkeep did not produce expected APK" >&2
    exit 1
  fi
  sha256sum "$OUT"
  exit 0
fi

if ! command -v adb >/dev/null 2>&1; then
  echo "Error: adb not found. Use --apkeep or --from PATH" >&2
  exit 1
fi

DEVICES="$(adb devices | rg -v 'List of devices' | rg 'device$' | wc -l)"
if [[ "$DEVICES" -eq 0 ]]; then
  echo "Error: no adb device connected. Use --apkeep or --from PATH" >&2
  exit 1
fi

echo "[download] Locating $PACKAGE on device..."
APK_PATH="$(adb shell pm path "$PACKAGE" 2>/dev/null | head -1 | sed 's/package://' | tr -d '\r')"

if [[ -z "$APK_PATH" ]]; then
  echo "Error: $PACKAGE not installed on device." >&2
  exit 1
fi

echo "[download] Pulling $APK_PATH ..."
adb pull "$APK_PATH" "$OUT"
echo "[download] Saved to $OUT"
sha256sum "$OUT"
