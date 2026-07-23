# PulseCheck

A lightweight, offline, no-account fingertip-camera heart-rate and HRV
wellness app for Android and iOS, built with Flutter.

**Not a medical device. Does not measure blood pressure.** No consumer
camera or fingerprint sensor can measure blood pressure — that requires an
inflatable cuff or a clinically validated sensor. PulseCheck estimates heart
rate (and, given a steady enough signal, a rough HRV number) using
photoplethysmography (PPG): the same light-absorption principle behind
pulse oximeters, applied to your phone's camera + flash.

## Why this exists / research behind the design

Before writing any code, I looked at what people online actually complain
about with existing camera-based heart-rate apps. The recurring themes,
and how PulseCheck addresses each:

| Complaint found in reviews / studies | What PulseCheck does about it |
|---|---|
| Readings take minutes, or never arrive, with no feedback on *why* | Live waveform + a plain-language signal-quality badge ("place your finger", "weak signal — press gently") shown from the first frame, so bad finger placement is obvious immediately instead of after a long silent wait |
| Accuracy varies wildly, some apps off by 20+ bpm vs. ECG | Uses contact fingertip + flash PPG (the accurate method) rather than the far less accurate no-contact "look at your face" method; requires several consistent beats and a stability check (coefficient of variation of beat-to-beat intervals) before showing a number at all, instead of guessing from one or two beats |
| Intrusive ads, some "earsplittingly loud" right after a measurement | Zero ads. No ad SDK is in the dependency tree at all |
| Forced account creation just to take a pulse reading | No account, no sign-in, ever |
| Apps advertised as free that are actually subscriptions/paywalls | No in-app purchases, no subscription, nothing to unlock |
| Apps requesting excessive permissions | Only the camera permission is requested — no location, contacts, microphone, or storage access |
| Data privacy concerns / apps phoning home | Fully offline. No network permission is requested at all. History lives only in local on-device storage; nothing is ever uploaded |
| Cluttered UI, hard for older or less tech-savvy users | One primary screen, three-step flow (cover camera+flash → hold still → see result), large auto-scaling text that respects the system font size, high-contrast calm color palette, plain-language status messages instead of jargon, HRV shown as a secondary line rather than the headline number |

## How the measurement works

1. `CameraPpgService` opens the rear camera at low resolution (we only need
   average brightness, not a picture) with the torch on, and streams the
   mean luminance of each frame.
2. `PpgProcessor` runs that brightness stream through:
   - a slow moving-average subtraction (high-pass) to remove baseline
     drift from ambient light or finger pressure changes,
   - a fast moving average (low-pass) to smooth sensor noise,
   - adaptive peak detection with a physiological refractory period, to
     find individual heartbeats,
   - BPM from the mean of recent beat-to-beat (RR) intervals,
   - HRV (RMSSD) from successive differences between RR intervals, only
     surfaced once the signal has been consistent for a while.
3. A signal-quality estimate (based on how regular recent beats are) gates
   whether a number is shown at all, and drives the on-screen guidance.

No image or video frame is ever stored — only the derived brightness number
per frame is kept, in memory, for the duration of one measurement.

## Project layout

```
lib/
  main.dart                     # app entry, theme, text-scale handling
  theme/app_theme.dart          # high-contrast, large-touch-target theme
  services/
    camera_ppg_service.dart     # camera + torch + brightness streaming
    ppg_processor.dart          # signal processing: filtering, peak/BPM/HRV
    history_store.dart          # on-device-only local history (SharedPreferences)
  screens/
    home_screen.dart            # measurement flow (idle/measuring/result)
    history_screen.dart         # local reading history
    about_screen.dart           # how it works, privacy, disclaimer
  widgets/
    waveform_painter.dart       # live pulse waveform
    quality_badge.dart          # plain-language signal quality indicator
    disclaimer_dialog.dart      # first-launch medical disclaimer
test/
  ppg_processor_test.dart       # synthetic-signal unit tests for the DSP pipeline
```

## Status / what's been verified vs. not

Written in an environment without the Flutter SDK installed, so:

- ✅ Logic was hand-traced for correctness (filter cutoff frequencies vs.
  the ~0.7–3.3 Hz pulse band, threshold/refractory math, HRV formula).
- ❌ Not compiled, not run on a device or emulator, `flutter test` has not
  actually been executed.

See `SETUP.md` for exact steps to generate the `android/`/`ios/` folders,
add the camera permission, run, and test this on a machine with Flutter
installed — do that before relying on it. That's also where you'll find
what only you can do (store accounts, submission, a real demo recording).
