# Known Findings and Prior Research

Summary of publicly documented security research on Square mobile payment systems. Use this as context when analyzing the app — many historical issues have been remediated.

## Hardware: Square Reader Attacks (2015)

**Source:** [Mobile Point of Scam — Black Hat US 2015](https://blackhat.com/docs/us-15/materials/us-15-Mellen-Mobile-Point-Of-Scam-Attacking-The-Square-Reader-wp.pdf)  
**Researchers:** Alexandrea Mellen, John Moore (Boston University)

### Findings

1. **Unencrypted reader models** — Early Square Readers transmitted magstripe data without encryption. Deprecated and blocked by current Square Register app.

2. **S4 encryption bypass** — Researchers bypassed the encryption chip on S4 readers by severing connections to the encryption IC on the reader's ribbon cable, converting an encrypted reader into an unencrypted skimmer in under 10 minutes.

3. **Audio WAV replay** — Card data flows from reader to app as audio through the headphone jack. A malicious app could capture the WAV signal and replay it for fraudulent transactions.

4. **Third-party app bypass** — A custom app could intercept reader data without going through the official Square Register app.

### Square's Response

- Deprecated older unencrypted reader models
- Encrypted readers refuse to work if tamper-detected
- Register app includes security checks for damaged/modified readers
- Software-side protections for swipes on unencrypted hardware

### RE Implications

When analyzing the current app, look for:
- Reader firmware version validation
- Tamper detection communication with reader hardware
- Checks that reject swipes from unencrypted reader models
- Audio signal validation / anomaly detection

## Software: mPoS Terminal Analysis (2023)

**Source:** [Security Analysis of mPoS Terminals](https://mahshidmehr.github.io/files/mPoS.pdf)  
**Researchers:** Mahshid Mehrnezhad, Elliot Laidlaw, Feng Hao (Warwick)

### Methodology (Applicable to Square)

1. Decompile APK with apktool (smali) and jadx (Java)
2. Identify certificate pinning → patch or bypass with Frida
3. MITM API traffic to analyze payment flow
4. Modify app code to bypass security controls → rebuild and sign
5. Test modified app against payment backend

Demonstrated on SumUp app; methodology directly applies to Square POS analysis.

### RE Implications

Standard mPoS analysis workflow:
```
Decompile → Find pinning → Bypass → Intercept → Modify → Repackage
```

## POS API Security Model

**Source:** [Square Developer Docs](https://developer.squareup.com/docs/pos-api/build-on-android)

### Authentication Mechanism

- Package name + SHA-1 fingerprint whitelist
- No OAuth token required for POS API intents
- Validation happens client-side in the Square app

### RE Questions to Investigate

1. How strictly is the SHA-1 check enforced?
2. Can intent extras be manipulated after authentication?
3. Are there exported activities that bypass the POS SDK flow?
4. What happens with debug/release signing certificate mismatches?

## Developer Environment Detection

Square POS is known to detect:

- **Developer Options enabled** — May block or warn during transactions
- **USB debugging active** — Security concern for payment apps
- **Rooted devices** — Common in mPoS apps

Use `frida/root_detection_bypass.js` to identify and bypass these checks during analysis.

## Current App Security Expectations (2025+)

Based on industry standards for payment apps, expect to find:

| Layer | Expected Protection |
|-------|-------------------|
| Transport | TLS 1.2+ with certificate pinning |
| Storage | SQLCipher or EncryptedSharedPreferences |
| Code | R8/ProGuard obfuscation |
| Device | Play Integrity API attestation |
| Runtime | Frida/debugger detection |
| API | OAuth 2.0 for Connect API calls |
| Hardware | Encrypted reader firmware validation |

## Analysis Checklist

When performing your own analysis, verify:

```
□ SSL pinning present and effective
□ No hardcoded production API keys in APK
□ Root/debug detection active
□ Exported components properly protected
□ Local database encrypted
□ POS intent authentication enforced
□ Certificate transparency / pinning backup pins
□ No sensitive data in logs (logcat)
□ Backup disabled (android:allowBackup="false")
□ WebView JavaScript interfaces secured
```

## Reporting Vulnerabilities

If you discover a security issue:

- **Square Bug Bounty:** Check [Square's security page](https://squareup.com/us/en/legal/general/bug-bounty) for current program status
- **Responsible disclosure:** Allow reasonable time for remediation before public disclosure
- **PCI scope:** Payment card data findings may have regulatory implications

## References

1. Mellen & Moore, "Mobile Point of Scam: Attacking the Square Reader," Black Hat US 2015
2. Mehrnezhad et al., "Security Analysis of mPoS Terminals," 2023
3. Square Developer Documentation — POS API, Connect API
4. OWASP Mobile Application Security Testing Guide (MASTG)
5. Threatpost, "Researchers Unveil Square Reader Mobile POS Hacks," 2015
