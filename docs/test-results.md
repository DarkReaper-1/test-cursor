# Verified Test Results — Square Point of Sale v7.13.2

Tested: 2026-07-06  
Target: `com.squareup` (Square Point of Sale)  
APK SHA-256: `2ef5024d5c5b2cbf4f12f9cfa76ca768bfaa47ce1a1fb8e01d505b8cabe5450e`

## Pipeline Verification

| Step | Command | Result |
|------|---------|--------|
| Toolchain setup | `./scripts/setup.sh` | ✅ jadx 1.5.1, apktool 2.9.3, frida, adb |
| APK download | `./scripts/download_apk.sh --apkeep` | ✅ Downloaded via APKPure (XAPK → base APK) |
| Decompile (fast) | `./scripts/analyze.sh apks/com.squareup.apk --fast` | ✅ apktool: 37 DEX files |
| Decompile (full) | jadx on 150MB APK | ⚠️ Slow — use `--fast` for practical analysis |
| Static scan | `./scripts/scan_secrets.sh output/com.squareup` | ✅ 96KB scan report |
| Report | `output/com.squareup/ANALYSIS.md` | ✅ Generated with key findings |
| Demo video | `./scripts/test.sh` | ✅ MP4 at `/opt/cursor/artifacts/videos/square-re-demo.mp4` |

## Key Findings from Static Analysis

### Application Metadata

| Field | Value |
|-------|-------|
| Package | `com.squareup` |
| Version | 7.13.2 (versionCode 71320002) |
| Main Activity | `com.squareup.ui.main.MainActivity` |
| Target SDK | 35 |
| APK Size | ~150 MB |

### Permissions (security-relevant)

- `RECORD_AUDIO` — card reader audio channel (magstripe)
- `NFC` — contactless payments
- `BLUETOOTH_CONNECT` / `BLUETOOTH_SCAN` — Square Reader hardware
- `CAMERA` — barcode scanning
- `DETECT_SCREEN_RECORDING` — anti-screen-capture
- `USE_BIOMETRIC` / `USE_FINGERPRINT` — authentication

### Security Controls Detected

| Control | Evidence |
|---------|----------|
| SSL Certificate Pinning | `ReleaseCertificatePinner` in dependency graph smali |
| Play Integrity API | `com.squareup.playintegritywrapper` package |
| Screen recording detection | `DETECT_SCREEN_RECORDING` permission |
| SQLCipher | References in scan (encrypted local DB) |

### POS Intent API

Registered in `AndroidManifest.xml`:

```
com.squareup.pos.action.CHARGE
com.squareup.pos.action.CONNECT_READER
com.squareup.pos.action.STORE_CARD
```

Handler class: `com.squareup.sdk.pos.PosApi` (`INTENT_ACTION_CHARGE`)

### Embedded Keys (expected — not vulnerabilities)

Square apps embed client-side SDK keys (scoped, not secret API credentials):

| Type | Example Location |
|------|-----------------|
| Square SDK client IDs | `com.squareup.sdk.reader.Client.CLIENT_ID` |
| Google Maps API key | `com.squareup.maps.GoogleStaticMapUrlMakerKt` |
| Staging/production keys | `CardEntryWorkerKt` (bill pay module) |

> These are application identifiers scoped to specific SDK features, not full API access tokens.

## Recommendations

1. Use `--fast` mode for routine analysis (apktool is sufficient for manifest/smali scans)
2. Run jadx overnight or on a subset for Java-level code review
3. Use Frida hooks in `frida/` for dynamic SSL pinning and root detection bypass
4. Always record APK version + SHA-256 for reproducible results

## Reproduce

```bash
./scripts/setup.sh
source .env.tools
./scripts/test.sh
```
