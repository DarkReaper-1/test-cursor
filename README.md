# Square App Reverse Engineering

Educational security research toolkit for statically and dynamically analyzing Square Android applications (Point of Sale, Team, Dashboard).

> **Disclaimer:** Reverse engineering is for authorized security research, education, and interoperability analysis only. Only analyze apps you have legal permission to test. Do not use findings to commit fraud, bypass payment security, or steal cardholder data.

## Quick Start

```bash
# 1. Install toolchain (jadx, apktool, frida, adb)
chmod +x scripts/*.sh
./scripts/setup.sh
source .env.tools

# 2. Obtain the Square POS APK
./scripts/download_apk.sh                    # from USB device
./scripts/download_apk.sh --from /path/to.apk  # manual copy

# 3. Run full analysis pipeline
./scripts/analyze.sh apks/com.squareup.apk

# 4. Review results
cat output/com.squareup/ANALYSIS.md
cat output/com.squareup/scan-report.txt
```

## Project Structure

```
├── apks/                  # Place APK files here (gitignored)
├── config/targets.yaml    # Package names, intent API, scan patterns
├── docs/                  # Methodology and reference documentation
├── frida/                 # Dynamic analysis Frida scripts
├── output/                # Decompiled artifacts (gitignored)
└── scripts/               # Automation pipeline
    ├── setup.sh           # Install RE toolchain
    ├── download_apk.sh    # Pull APK from device
    ├── decompile.sh       # apktool + jadx decompilation
    ├── scan_secrets.sh    # Static security scan
    └── analyze.sh         # End-to-end pipeline
```

## Target Applications

| App | Package | Purpose |
|-----|---------|---------|
| Square Point of Sale | `com.squareup` | Primary POS / Register app |
| Square Team | `com.squareup.team` | Team management |
| Square Dashboard | `com.squareup.dashboard` | Business analytics |

## Analysis Workflow

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│  Obtain APK │ -> │  Decompile   │ -> │ Static Scan │ -> │   Dynamic    │
│  (adb/copy) │    │ jadx+apktool │    │ secrets/API │    │ Frida + mitm │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
```

### Static Analysis

1. **AndroidManifest.xml** — permissions, exported activities, deep links
2. **Java source (jadx)** — business logic, API clients, security checks
3. **Smali (apktool)** — patch root/SSL checks for repackaging
4. **strings.xml / assets** — endpoints, feature flags, embedded config

### Dynamic Analysis

```bash
# SSL pinning bypass + traffic capture
frida -U -f com.squareup \
  -l frida/ssl_pinning_bypass.js \
  -l frida/root_detection_bypass.js \
  --no-pause

# Trace POS intent API handling
frida -U com.squareup -l frida/trace_pos_intents.js
```

## Square POS API (Public Surface)

Square exposes a documented intent-based API for third-party apps to initiate transactions. Authentication uses **package name + SHA-1 fingerprint** registered in the [Square Developer Console](https://developer.squareup.com/apps).

Key intent action: `com.squareup.pos.action.CHARGE`

See [docs/intent-api.md](docs/intent-api.md) for the full contract.

## Known Research

| Source | Finding |
|--------|---------|
| [Black Hat US 2015 — Mobile Point of Scam](https://blackhat.com/docs/us-15/materials/us-15-Mellen-Mobile-Point-Of-Scam-Attacking-The-Square-Reader-wp.pdf) | Square Reader hardware encryption bypass, audio WAV card data channel |
| [Warwick mPoS paper](https://mahshidmehr.github.io/files/mPoS.pdf) | General mPoS reverse engineering methodology (SumUp case study) |
| [Square Developer Docs](https://developer.squareup.com/docs/pos-api/build-on-android) | Official POS SDK and intent API reference |

## Tools

| Tool | Purpose |
|------|---------|
| [JADX](https://github.com/skylot/jadx) | DEX → Java decompilation |
| [Apktool](https://ibotpeaches.github.io/Apktool/) | Resource decode + smali |
| [Frida](https://frida.re/) | Runtime instrumentation |
| [Objection](https://github.com/sensepost/objection) | Mobile exploration shell |
| [mitmproxy](https://mitmproxy.org/) | HTTPS traffic interception |

## References

- [OWASP MASTG](https://mobile-security.gitbook.io/mobile-security-testing-guide/) — Mobile App Security Testing Guide
- [Square POS API — Android](https://developer.squareup.com/docs/pos-api/build-on-android)
- [Square Connect API](https://developer.squareup.com/docs/build-basics)
