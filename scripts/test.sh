#!/usr/bin/env bash
# End-to-end verification of the Square RE toolkit
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-/opt/cursor/artifacts/videos}"
APK="$ROOT_DIR/apks/com.squareup.apk"
FAILED=0

log() { printf '[test] %s\n' "$*"; }
pass() { log "PASS: $*"; }
fail() { log "FAIL: $*"; FAILED=1; }

log "Square RE toolkit verification"
log "=============================="

# 1. Toolchain
# shellcheck source=/dev/null
[[ -f "$ROOT_DIR/.env.tools" ]] && source "$ROOT_DIR/.env.tools"

for tool in jadx apktool aapt rg python3 ffmpeg; do
  if command -v "$tool" >/dev/null 2>&1; then
    pass "$tool available"
  else
    fail "$tool missing — run ./scripts/setup.sh"
  fi
done

# 2. APK present (download if missing)
if [[ ! -f "$APK" ]]; then
  log "APK not found — downloading via apkeep..."
  "$ROOT_DIR/scripts/download_apk.sh" --apkeep
fi
if [[ -f "$APK" ]]; then
  pass "Square APK present ($(du -h "$APK" | awk '{print $1}'))"
else
  fail "Square APK not available"
fi

# 3. Fast analysis pipeline
log "Running fast analysis pipeline..."
if "$ROOT_DIR/scripts/analyze.sh" "$APK" --fast 2>&1 | tee "$ARTIFACTS_DIR/test-run.log"; then
  pass "analyze.sh --fast completed"
else
  fail "analyze.sh --fast failed"
fi

# 4. Verify outputs
for f in ANALYSIS.md scan-report.txt AndroidManifest.xml apktool/AndroidManifest.xml; do
  if [[ -f "$ROOT_DIR/output/com.squareup/$f" ]]; then
    pass "output/com.squareup/$f exists"
  else
    fail "output/com.squareup/$f missing"
  fi
done

# 5. Scan content checks
SCAN="$ROOT_DIR/output/com.squareup/scan-report.txt"
if rg -q 'com\.squareup\.pos\.action\.CHARGE' "$SCAN" 2>/dev/null; then
  pass "POS intent API found in scan"
else
  fail "POS intent API not found in scan"
fi

if rg -q 'CertificatePinner|ReleaseCertificatePinner|networkSecurityConfig|certificatepinning' "$SCAN" 2>/dev/null; then
  pass "SSL pinning references found"
else
  fail "SSL pinning references not found"
fi

# 6. Demo video generation
if [[ -f "$ARTIFACTS_DIR/test-run.log" ]]; then
  python3 "$ROOT_DIR/scripts/generate_demo_video.py" \
    --input "$ARTIFACTS_DIR/test-run.log" \
    --output "$ARTIFACTS_DIR/square-re-demo.mp4"
  if [[ -f "$ARTIFACTS_DIR/square-re-demo.mp4" ]]; then
    pass "Demo video generated ($(du -h "$ARTIFACTS_DIR/square-re-demo.mp4" | awk '{print $1}'))"
  else
    fail "Demo video not generated"
  fi
fi

echo ""
if [[ "$FAILED" -eq 0 ]]; then
  log "All tests passed"
  exit 0
else
  log "Some tests failed"
  exit 1
fi
