# PulseCheck — setup

This sandbox does not have the Flutter SDK installed, so `lib/`, `pubspec.yaml`,
and `test/` were written by hand and have **not** been compiled, run on a
device/emulator, or had `flutter test` executed against them. Do that first,
on a machine with Flutter installed, before trusting this as working code.

## 1. Generate the platform folders

The Dart source here is platform-agnostic; the `android/` and `ios/` native
project folders are intentionally not included because they need the Flutter
tool itself to scaffold correctly (Gradle wrapper, Xcode project, etc.).

```bash
cd pulsecheck
flutter create --org com.yourname --project-name pulsecheck .
flutter pub get
```

This merges in `android/` and `ios/` without touching `lib/`, `pubspec.yaml`,
or `test/`. Commit the generated folders afterwards.

## 2. Add permissions

The app now needs three permission-adjacent entries: camera (measurement),
notifications (only used if you enable reminders), and Health integration
(only used if you enable Health sync in Settings — off by default). Still
no location, contacts, microphone, or storage access.

**Android** — `android/app/src/main/AndroidManifest.xml`, inside `<manifest>`,
above `<application>`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="true" />
<uses-feature android:name="android.hardware.camera.flash" android:required="true" />

<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

<!-- Only needed if you enable Health Connect sync -->
<uses-permission android:name="android.permission.health.READ_HEART_RATE" />
<uses-permission android:name="android.permission.health.WRITE_HEART_RATE" />
<uses-permission android:name="android.permission.health.WRITE_BLOOD_PRESSURE" />
```

Also bump `minSdkVersion` to at least 26 in `android/app/build.gradle`
(required by `flutter_local_notifications` v17 and the `health` plugin's
Health Connect support; the `camera` plugin alone only needs 21).

Health Connect on Android is a separate app the user installs from Play —
follow the `health` package's Android setup docs
(https://pub.dev/packages/health) for the manifest `<queries>` block and
`AndroidManifest.xml` activity alias it requires; that step is intentionally
not duplicated here since it changes between plugin versions.

**iOS** — `ios/Runner/Info.plist`, add:

```xml
<key>NSCameraUsageDescription</key>
<string>PulseCheck uses the camera and flash to measure your pulse from your fingertip. No photos or video are saved.</string>

<key>NSHealthShareUsageDescription</key>
<string>PulseCheck can sync the heart rate and blood pressure readings you log into Apple Health, if you turn this on in Settings.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>PulseCheck writes the readings you log into Apple Health, if you turn this on in Settings.</string>
```

Also enable the **HealthKit** capability in Xcode (Runner target → Signing &
Capabilities → + Capability → HealthKit) — required for the `health` plugin
to work on iOS at all, even though sync is off until the user opts in.

## 3. Run it

```bash
flutter run
```

Cover the rear camera **and** flash with a fingertip, keep still, and the
waveform/BPM should appear within a few seconds.

## 4. Test

```bash
flutter test
```

`test/ppg_processor_test.dart` feeds a synthetic 72 bpm sine wave through the
signal-processing pipeline and checks the recovered BPM, and checks that pure
noise doesn't get reported as a "good" reading. Please run this and fix any
failures before shipping — it has only been reasoned through by hand here,
not executed. The database, analytics, insights, export, and Health-sync
code added afterwards has **no automated tests yet** — worth adding
repository/analytics tests (in-memory sqflite via `sqflite_common_ffi`) before
relying on it.

## 5. Build a release APK/IPA

```bash
flutter build apk --release --split-per-abi   # smaller per-device APKs for Android
flutter build ipa --release                    # iOS, needs Xcode + an Apple developer account
```

`--split-per-abi` avoids shipping all CPU architectures in one APK, which is
one of the easiest wins for keeping the download small — there is no other
size bloat here (no ads/analytics SDKs, no bundled ML models, no video
assets).

## What only you can do

- Create the Apple Developer ($99/yr) and Google Play Console ($25 one-time)
  accounts and submit the builds — nobody else can do this on your behalf.
- Fill in store listing text/screenshots. Given the FDA and Apple/Google have
  cracked down on apps implying clinical accuracy, keep the listing framed as
  "wellness" / "fitness", not "medical" or "diagnostic".
- Record a real demo video/screen recording on your phone — I have no way to
  produce video or drive a physical device from here.
