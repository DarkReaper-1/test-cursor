#!/usr/bin/env bash
# Decompile a Square APK using apktool (smali/resources) and jadx (Java)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=/dev/null
[[ -f "$ROOT_DIR/.env.tools" ]] && source "$ROOT_DIR/.env.tools"

usage() {
  cat <<EOF
Usage: $(basename "$0") <apk-path> [output-dir]

Decompiles an APK into:
  <output>/apktool/   — decoded resources + smali
  <output>/jadx/      — Java source (best effort)
  <output>/raw/       — unzipped APK contents

Example:
  $(basename "$0") apks/com.squareup.apk output/com.squareup
EOF
}

APK="${1:-}"
OUT="${2:-}"

if [[ -z "$APK" || "$APK" == "-h" || "$APK" == "--help" ]]; then
  usage
  exit 0
fi

if [[ ! -f "$APK" ]]; then
  echo "Error: APK not found: $APK" >&2
  exit 1
fi

APK="$(realpath "$APK")"
BASENAME="$(basename "$APK" .apk)"
OUT="${OUT:-$ROOT_DIR/output/$BASENAME}"
OUT="$(realpath -m "$OUT")"

APKTOOL_OUT="$OUT/apktool"
JADX_OUT="$OUT/jadx"
RAW_OUT="$OUT/raw"

mkdir -p "$OUT"

echo "[decompile] APK: $APK"
echo "[decompile] Output: $OUT"

# Raw extraction
echo "[decompile] Extracting raw ZIP contents..."
rm -rf "$RAW_OUT"
mkdir -p "$RAW_OUT"
unzip -q "$APK" -d "$RAW_OUT"

# apktool
echo "[decompile] Running apktool..."
rm -rf "$APKTOOL_OUT"
if command -v apktool >/dev/null 2>&1; then
  apktool d -f -o "$APKTOOL_OUT" "$APK"
else
  "$ROOT_DIR/.tools/bin/apktool" d -f -o "$APKTOOL_OUT" "$APK"
fi

# jadx
echo "[decompile] Running jadx..."
rm -rf "$JADX_OUT"
JADX_BIN="$(command -v jadx || echo "$ROOT_DIR/.tools/jadx/bin/jadx")"
"$JADX_BIN" --deobf --show-bad-code -d "$JADX_OUT" "$APK"

# Quick metadata
MANIFEST="$APKTOOL_OUT/AndroidManifest.xml"
if [[ -f "$MANIFEST" ]]; then
  cp "$MANIFEST" "$OUT/AndroidManifest.xml"
fi

if command -v aapt >/dev/null 2>&1; then
  aapt dump badging "$APK" > "$OUT/badging.txt" 2>/dev/null || true
fi

# Checksums for reproducibility
{
  echo "sha256: $(sha256sum "$APK" | awk '{print $1}')"
  echo "decompiled_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "apk_size_bytes: $(stat -c%s "$APK" 2>/dev/null || stat -f%z "$APK")"
} > "$OUT/metadata.txt"

echo "[decompile] Done."
echo "  Manifest: $OUT/AndroidManifest.xml"
echo "  Java:     $JADX_OUT"
echo "  Smali:    $APKTOOL_OUT"
