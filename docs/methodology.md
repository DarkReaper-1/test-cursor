# Methodology

This document describes the reverse engineering methodology for Square Android applications, aligned with OWASP Mobile Application Security Testing Guide (MASTG) practices.

## Legal and Ethical Scope

Before starting:

1. **Authorization** — Only analyze apps you own, have written permission to test, or are researching in a controlled lab environment.
2. **No fraud** — Do not use findings to steal payment data, bypass transaction security, or commit financial crimes.
3. **Responsible disclosure** — Report vulnerabilities to Square via their security program.
4. **Compliance** — PCI-DSS and local laws may restrict payment app analysis. Understand your jurisdiction.

## Phase 1: APK Acquisition

### Option A — Pull from device (recommended)

```bash
# Enable USB debugging on Android device
adb devices
./scripts/download_apk.sh com.squareup
```

Install the app from Google Play Store on the device first.

### Option B — Manual copy

```bash
./scripts/download_apk.sh --from ~/Downloads/com.squareup.apk
```

### Option C — apkeep (requires Google credentials)

```bash
cargo install apkeep
apkeep -a com.squareup -d google-play apks/
```

Always record the SHA-256 checksum for reproducibility:

```bash
sha256sum apks/com.squareup.apk
```

## Phase 2: Static Analysis

### 2.1 Decompilation

```bash
./scripts/decompile.sh apks/com.squareup.apk
```

Produces three views of the app:

| Output | Format | Best for |
|--------|--------|----------|
| `jadx/` | Java (approximate) | Understanding logic flow |
| `apktool/` | Smali + XML | Patching and repackaging |
| `raw/` | Binary ZIP contents | Native libs, assets, DEX headers |

### 2.2 Manifest Analysis

Priority checks in `AndroidManifest.xml`:

```
□ android:exported="true" on activities/services/receivers
□ Deep link intent filters (custom URL schemes)
□ Permission declarations (NFC, BLUETOOTH, RECORD_AUDIO, etc.)
□ android:networkSecurityConfig reference
□ android:allowBackup setting
□ Debuggable flag (should be false in release)
```

Square POS historically uses `RECORD_AUDIO` permission for magstripe reader communication via the headphone jack (audio WAV encoding).

### 2.3 Automated Scan

```bash
./scripts/scan_secrets.sh output/com.squareup
```

Review `scan-report.txt` for:

- Hardcoded API keys (`sq0ids-`, `sq0atp-`, etc.)
- Square Connect endpoints (`connect.squareup.com`)
- SSL pinning implementations
- Root / integrity detection
- SQLCipher database encryption
- POS intent action handlers

### 2.4 Manual Code Review Targets

Search jadx output for these high-value areas:

```
com.squareup.pos          — POS API intent handling
*CardReader*              — Hardware reader communication
*Payment*                 — Transaction processing
*CertificatePinner*        — SSL pinning config
*Root* / *Integrity*      — Environment checks
*Encrypt* / *Cipher*       — Crypto implementations
```

## Phase 3: Dynamic Analysis

### 3.1 Environment Setup

Requirements:

- Rooted device or emulator (Android 11+ with Magisk recommended)
- Frida server matching host frida-tools version
- mitmproxy for HTTPS interception

```bash
# Push frida-server to device
adb push frida-server /data/local/tmp/
adb shell chmod 755 /data/local/tmp/frida-server
adb shell /data/local/tmp/frida-server &
```

### 3.2 SSL Pinning Bypass

```bash
frida -U -f com.squareup -l frida/ssl_pinning_bypass.js --no-pause
```

Configure mitmproxy on the device and capture API traffic to `connect.squareup.com`.

### 3.3 Root Detection Bypass

Square may block transactions on rooted devices or when Developer Options are enabled:

```bash
frida -U com.squareup \
  -l frida/root_detection_bypass.js \
  -l frida/ssl_pinning_bypass.js
```

For persistent bypass without Frida, patch smali and repack:

```bash
# Find root check in jadx, locate in apktool smali, patch return value
apktool b output/com.squareup/apktool -o patched.apk
java -jar .tools/bin/uber-apk-signer.jar --apks patched.apk
adb install patched-aligned-signed.apk
```

### 3.4 POS Intent Tracing

```bash
frida -U com.squareup -l frida/trace_pos_intents.js
```

Trigger a charge from a test app using the Square POS SDK to observe internal intent handling.

## Phase 4: Network Analysis

### Square API Endpoints (public)

| Environment | Base URL |
|-------------|----------|
| Production | `https://connect.squareup.com` |
| Sandbox | `https://connect.squareupsandbox.com` |

Authentication uses OAuth 2.0 bearer tokens. The mobile app manages its own session tokens separately from third-party Connect API keys.

### Interception Workflow

1. Install mitmproxy CA cert on device
2. Bypass SSL pinning with Frida
3. Perform transactions in sandbox mode
4. Map request/response pairs for payment flows

## Phase 5: Hardware Interface (Square Reader)

Historical research (Black Hat 2015) documented:

- Magstripe data encoded as **audio WAV** through the 3.5mm headphone jack
- Reader models S4+ use on-device encryption chips
- Replay attacks possible on older unencrypted reader models (now deprecated)

Software analysis should trace:

```
Audio input → WAV decode → Encryption layer → API upload
```

Search jadx for audio recording classes and native `.so` libraries handling reader protocols.

## Phase 6: Reporting

Use the generated template at `output/<package>/ANALYSIS.md` and extend with:

1. **Executive summary** — App version, analysis date, scope
2. **Architecture overview** — Key components and data flows
3. **Findings** — Severity-rated issues with evidence
4. **POS API map** — Intent handlers, authentication checks
5. **Recommendations** — For developers and defenders

## Toolchain Reference

Install everything with:

```bash
./scripts/setup.sh
source .env.tools
```

Or install manually:

| Tool | Install |
|------|---------|
| jadx | `brew install jadx` / download from GitHub releases |
| apktool | `brew install apktool` |
| frida | `pip install frida-tools` |
| objection | `pip install objection` |
| mitmproxy | `pip install mitmproxy` |
