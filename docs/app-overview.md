# Square App Overview

Technical overview of Square Android applications for reverse engineering context.

## Square Point of Sale (`com.squareup`)

The primary mobile register application used by merchants to accept payments.

### Public Metadata

| Property | Value |
|----------|-------|
| Package | `com.squareup` |
| Play Store | [Square Point of Sale](https://play.google.com/store/apps/details?id=com.squareup) |
| Category | Business / Finance |
| POS API version | v2.0+ |

### Architecture (High Level)

```
┌──────────────────────────────────────────────────────────────┐
│                    Square Point of Sale App                   │
├──────────────┬───────────────┬──────────────┬────────────────┤
│   UI Layer   │  POS Engine   │  Hardware    │  Network Layer │
│  (Activities │  (Transaction │  (Card       │  (Square       │
│   Fragments) │   Processing) │   Reader,    │   Connect API, │
│              │               │   NFC/TTP)   │   OAuth)       │
├──────────────┴───────────────┴──────────────┴────────────────┤
│              Local Storage (SQLite / SQLCipher)               │
└──────────────────────────────────────────────────────────────┘
         ▲                              │
         │ Intent API                   │ HTTPS
         │ (3rd party apps)             ▼
┌────────┴────────┐            ┌─────────────────┐
│ Partner Apps    │            │ Square Backend  │
│ (POS SDK)       │            │ connect.square  │
└─────────────────┘            └─────────────────┘
```

### Key Subsystems to Analyze

#### 1. POS Intent API Handler

Third-party Android apps initiate transactions by sending intents to `com.squareup`. The app validates the caller's package name and SHA-1 fingerprint against a registry in the Square Developer Console.

Search targets:
- `com.squareup.pos.action.CHARGE`
- `ChargeRequest`
- `PosClient`

#### 2. Card Reader Communication

Square Readers communicate via:
- **Audio jack** (legacy magstripe) — card data encoded as audio frequency-shift keying (FSK) in WAV format
- **Bluetooth LE** (contactless/chip readers)
- **NFC / Tap to Pay** (phone-as-terminal)

Native libraries (`.so` files) in `lib/arm64-v8a/` handle low-level reader protocols.

#### 3. Payment Processing

Transaction lifecycle:
1. Amount entry / item selection
2. Tender type selection (card, cash, other)
3. Card acquisition (swipe/tap/insert/manual)
4. Authorization request to Square backend
5. Receipt generation and settlement

#### 4. Security Controls

Expected protections in a production payment app:

| Control | Purpose |
|---------|---------|
| SSL certificate pinning | Prevent MITM on API traffic |
| Root detection | Block compromised devices |
| Play Integrity / SafetyNet | Device attestation |
| Developer options detection | Prevent debugging during transactions |
| Code obfuscation (R8/ProGuard) | Hinder static analysis |
| SQLCipher | Encrypt local transaction database |
| Android Keystore | Protect cryptographic keys |

#### 5. Offline Mode

Square POS supports offline transaction queuing. Analyze how transactions are stored locally and synced when connectivity returns.

### Permissions of Interest

Typical permissions to examine in the manifest:

```xml
<!-- Payment hardware -->
<uses-permission android:name="android.permission.NFC" />
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />

<!-- Network -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Location (tax calculation) -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

## Related Apps

### Square Team (`com.squareup.team`)

Employee scheduling, time tracking, and team communication. Lower security sensitivity but may share authentication/session mechanisms.

### Square Dashboard (`com.squareup.dashboard`)

Business analytics and reporting. Connects to the same Square backend with OAuth sessions.

## Data Flow: Card Swipe (Legacy Reader)

Based on published security research:

```
Card swipe
    │
    ▼
Square Reader (magnetic head)
    │ FSK audio encoding
    ▼
Phone mic/headphone jack (WAV signal)
    │
    ▼
Square App (audio decode → parse track data)
    │
    ▼
Encryption layer (reader firmware or app)
    │
    ▼
HTTPS → connect.squareup.com (authorization)
    │
    ▼
Payment processor → card network
```

Modern encrypted readers (S4+) perform encryption on-device before the audio signal reaches the app.

## Versioning Notes

- POS SDK 2.0 requires Square POS app v4.64+
- Square regularly updates the app; analysis results are version-specific
- Always record APK version and SHA-256 in your report
