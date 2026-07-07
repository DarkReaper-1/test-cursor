#!/usr/bin/env bash
# Full reverse engineering pipeline for Square Android apps
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=/dev/null
[[ -f "$ROOT_DIR/.env.tools" ]] && source "$ROOT_DIR/.env.tools"

usage() {
  cat <<EOF
Square App Reverse Engineering Pipeline
========================================

Usage: $(basename "$0") <apk-path> [options]

Options:
  --skip-decompile   Run scan only (requires existing output/)
  --skip-scan        Decompile only
  --fast             Skip jadx decompilation (apktool only — recommended for com.squareup)
  --output DIR       Custom output directory
  -h, --help         Show this help

Steps:
  1. Validate APK and extract package metadata
  2. Decompile with apktool (+ jadx unless --fast)
  3. Static scan for secrets, endpoints, security controls
  4. Generate analysis report with key findings

Prerequisites:
  ./scripts/setup.sh

Obtain APK:
  ./scripts/download_apk.sh --apkeep

Example:
  $(basename "$0") apks/com.squareup.apk --fast
EOF
}

APK=""
OUT=""
SKIP_DECOMPILE=0
SKIP_SCAN=0
FAST=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --skip-decompile) SKIP_DECOMPILE=1; shift ;;
    --skip-scan) SKIP_SCAN=1; shift ;;
    --fast) FAST=1; shift ;;
    --output) OUT="$2"; shift 2 ;;
    *)
      if [[ -z "$APK" ]]; then APK="$1"
      else echo "Unknown argument: $1" >&2; exit 1
      fi
      shift
      ;;
  esac
done

if [[ -z "$APK" ]]; then usage; exit 1; fi
if [[ ! -f "$APK" ]]; then
  echo "Error: APK not found: $APK" >&2
  echo "Run: ./scripts/download_apk.sh --apkeep" >&2
  exit 1
fi

APK="$(realpath "$APK")"
BASENAME="$(basename "$APK" .apk)"
OUT="${OUT:-$ROOT_DIR/output/$BASENAME}"
OUT="$(realpath -m "$OUT")"

echo "============================================"
echo " Square App Reverse Engineering Pipeline"
echo "============================================"
echo "APK:    $APK"
echo "Output: $OUT"
echo "Mode:   $([[ "$FAST" -eq 1 ]] && echo 'fast (apktool only)' || echo 'full (apktool + jadx)')"
echo ""

echo "[1/4] Extracting APK metadata..."
mkdir -p "$OUT"
PACKAGE="unknown"
VERSION="unknown"
if command -v aapt >/dev/null 2>&1; then
  aapt dump badging "$APK" | tee "$OUT/badging.txt"
  PACKAGE="$(aapt dump badging "$APK" | rg -o "package: name='[^']+'" | cut -d"'" -f2 || true)"
  VERSION="$(aapt dump badging "$APK" | rg -o "versionName='[^']+'" | cut -d"'" -f2 || true)"
  echo "Package: ${PACKAGE:-unknown}"
  echo "Version: ${VERSION:-unknown}"
fi

if [[ "$SKIP_DECOMPILE" -eq 0 ]]; then
  echo ""
  echo "[2/4] Decompiling..."
  DECOMPILE_ARGS=("$APK" "$OUT")
  [[ "$FAST" -eq 1 ]] && DECOMPILE_ARGS+=(--skip-jadx)
  "$ROOT_DIR/scripts/decompile.sh" "${DECOMPILE_ARGS[@]}"
else
  echo ""
  echo "[2/4] Skipping decompile (--skip-decompile)"
fi

if [[ "$SKIP_SCAN" -eq 0 ]]; then
  echo ""
  echo "[3/4] Running static scan..."
  "$ROOT_DIR/scripts/scan_secrets.sh" "$OUT"
else
  echo ""
  echo "[3/4] Skipping scan (--skip-scan)"
fi

echo ""
echo "[4/4] Generating analysis report..."
REPORT="$OUT/ANALYSIS.md"
SCAN="$OUT/scan-report.txt"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
SHA256="$(sha256sum "$APK" | awk '{print $1}')"

# Extract key findings from scan report
POS_INTENTS=""
SSL_PINNING=""
ROOT_CHECKS=""
SECRETS=""
if [[ -f "$SCAN" ]]; then
  POS_INTENTS="$(rg -c 'com\.squareup\.pos\.action' "$SCAN" 2>/dev/null | awk -F: '{s+=$2} END {print s+0}')"
  SSL_PINNING="$(rg -c 'CertificatePinner|ReleaseCertificatePinner|networkSecurityConfig' "$SCAN" 2>/dev/null | awk -F: '{s+=$2} END {print s+0}')"
  ROOT_CHECKS="$(rg -c 'PlayIntegrity|RootBeer|isRooted|SafetyNet' "$SCAN" 2>/dev/null | awk -F: '{s+=$2} END {print s+0}')"
  SECRETS="$(rg -c 'sq0[a-z]{3}-|AIza[0-9A-Za-z_-]{35}' "$SCAN" 2>/dev/null | awk -F: '{s+=$2} END {print s+0}')"
fi

cat > "$REPORT" <<EOF
# Square App Analysis Report

| Field | Value |
|-------|-------|
| APK | \`$(basename "$APK")\` |
| SHA-256 | \`$SHA256\` |
| Package | ${PACKAGE:-unknown} |
| Version | ${VERSION:-unknown} |
| Analyzed | $TIMESTAMP |
| Mode | $([[ "$FAST" -eq 1 ]] && echo 'fast (apktool only)' || echo 'full') |

## Key Findings (automated scan)

| Category | Matches |
|----------|---------|
| POS intent API references | ${POS_INTENTS:-0} |
| SSL / cert pinning | ${SSL_PINNING:-0} |
| Root / integrity checks | ${ROOT_CHECKS:-0} |
| Embedded keys / tokens | ${SECRETS:-0} |

## Notable Discoveries

- **POS API**: \`com.squareup.pos.action.CHARGE\` registered in AndroidManifest intent filters
- **SSL Pinning**: \`ReleaseCertificatePinner\` dependency injection in smali
- **Integrity**: Play Integrity API wrapper (\`playintegritywrapper\` package)
- **Hardware**: \`RECORD_AUDIO\`, \`NFC\`, \`BLUETOOTH_CONNECT\` permissions (card reader support)
- **Main entry**: \`com.squareup.ui.main.MainActivity\`

## Artifacts

| Path | Description |
|------|-------------|
| \`apktool/\` | Smali + decoded resources |
| \`jadx/\` | Decompiled Java source (if not --fast) |
| \`raw/\` | Unzipped APK |
| \`AndroidManifest.xml\` | Decoded manifest |
| \`scan-report.txt\` | Full automated scan results |

## Next Steps

1. Review \`scan-report.txt\` for endpoints, secrets, and security controls
2. Inspect \`AndroidManifest.xml\` for exported components and deep links
3. Trace POS intent handling: search for \`com.squareup.pos.action.CHARGE\`
4. Run dynamic analysis with Frida hooks in \`frida/\`
5. Map network traffic with mitmproxy after SSL pinning bypass

## POS API Surface (public)

\`\`\`xml
<queries>
  <package android:name="com.squareup" />
</queries>
\`\`\`

See \`docs/intent-api.md\` for full intent contract reference.

---
*Generated by square-re analyze pipeline*
EOF

echo ""
echo "============================================"
echo " Analysis complete"
echo "============================================"
echo "Report:      $REPORT"
echo "Scan:        $OUT/scan-report.txt"
echo ""
echo "Dynamic analysis:"
echo "  frida -U -f com.squareup -l frida/ssl_pinning_bypass.js --no-pause"
