#!/usr/bin/env bash
# Scan decompiled Square app output for secrets, endpoints, and security controls
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DECOMPILED="${1:-}"

usage() {
  cat <<EOF
Usage: $(basename "$0") <decompiled-output-dir>

Scans jadx and apktool output for:
  - Hardcoded secrets and API keys
  - Square Connect / POS API endpoints
  - SSL pinning, root detection, obfuscation indicators
  - Exported components in AndroidManifest.xml

Example:
  $(basename "$0") output/com.squareup
EOF
}

if [[ -z "$DECOMPILED" || "$DECOMPILED" == "-h" ]]; then
  usage
  exit 0
fi

if [[ ! -d "$DECOMPILED" ]]; then
  echo "Error: directory not found: $DECOMPILED" >&2
  exit 1
fi

DECOMPILED="$(realpath "$DECOMPILED")"
REPORT="$DECOMPILED/scan-report.txt"
JADX="$DECOMPILED/jadx"
APKTOOL="$DECOMPILED/apktool"

mkdir -p "$DECOMPILED"

scan_dir() {
  local label="$1"
  local dir="$2"
  [[ -d "$dir" ]] || return 0

  echo ""
  echo "=== $label ==="
  echo "Path: $dir"

  echo ""
  echo "--- URLs & Square endpoints ---"
  rg -n --no-heading -i \
    'https?://[^\s"'\''<>]+' "$dir" 2>/dev/null \
    | rg -i 'square|squareup|connect\.square|cash\.app|firebase|googleapis' \
    | head -100 || echo "(none found)"

  echo ""
  echo "--- Potential secrets ---"
  rg -n --no-heading \
    -e 'sq0[a-z]{3}-[A-Za-z0-9_-]{20,}' \
    -e 'AIza[0-9A-Za-z_-]{35}' \
    -e '-----BEGIN (RSA |EC )?PRIVATE KEY-----' \
    -e 'api[_-]?key\s*[=:]\s*["'\''"][A-Za-z0-9_-]{16,}' \
    "$dir" 2>/dev/null | head -50 || echo "(none found)"

  echo ""
  echo "--- SSL / cert pinning ---"
  rg -n --no-heading -i \
    'CertificatePinner|TrustManager|networkSecurityConfig|sslPinning|pin-sha256' \
    "$dir" 2>/dev/null | head -30 || echo "(none found)"

  echo ""
  echo "--- Root / integrity checks ---"
  rg -n --no-heading -i \
    'isRooted|RootBeer|SafetyNet|PlayIntegrity|/system/bin/su|test-keys|Magisk' \
    "$dir" 2>/dev/null | head -30 || echo "(none found)"

  echo ""
  echo "--- Payment / card reader ---"
  rg -n --no-heading -i \
    'cardreader|magstripe|emv|nfc|tap.?to.?pay|headphone|audio.*wav|sqlcipher' \
    "$dir" 2>/dev/null | head -30 || echo "(none found)"

  echo ""
  echo "--- POS intent API references ---"
  rg -n --no-heading \
    'com\.squareup\.pos\.(action|CHARGE|REFUND|TENDER_)' \
    "$dir" 2>/dev/null | head -30 || echo "(none found)"
}

{
  echo "Square App Static Scan Report"
  echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Target: $DECOMPILED"

  if [[ -f "$DECOMPILED/AndroidManifest.xml" ]]; then
    echo ""
    echo "=== AndroidManifest.xml ==="
    echo ""
    echo "--- Exported activities ---"
    rg -n 'android:exported="true"' "$DECOMPILED/AndroidManifest.xml" 2>/dev/null || true
    echo ""
    echo "--- Permissions ---"
    rg -n 'uses-permission' "$DECOMPILED/AndroidManifest.xml" 2>/dev/null || true
    echo ""
    echo "--- Intent filters ---"
    rg -n 'intent-filter|action android:name' "$DECOMPILED/AndroidManifest.xml" 2>/dev/null | head -40 || true
  fi

  scan_dir "JADX (Java source)" "$JADX"
  scan_dir "APKTool (smali/resources)" "$APKTOOL"

  if [[ -f "$APKTOOL/res/values/strings.xml" ]]; then
    echo ""
    echo "=== strings.xml highlights ==="
    rg -n -i 'square|api|secret|key|token|firebase|endpoint|oauth' \
      "$APKTOOL/res/values/strings.xml" 2>/dev/null | head -40 || true
  fi

} | tee "$REPORT"

echo ""
echo "[scan] Report written to $REPORT"
