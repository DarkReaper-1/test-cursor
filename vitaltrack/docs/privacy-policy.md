> **Draft only.** This is a starting point for VitalTrack's privacy
> policy, written to match what the app actually does as of this build.
> It is not a substitute for review by a lawyer familiar with health-app
> privacy law (HIPAA applicability, state health-data laws, GDPR/UK GDPR
> if distributed in the EU/UK, and Apple's App Store health-data
> requirements) before publishing.

# VitalTrack Privacy Policy (draft)

_Last updated: [date of actual publication]_

## Summary

VitalTrack stores your health data on your device. It does not have a
server. It does not sell your data. Optional features (Apple Health sync,
iCloud sync, Bluetooth device connections) are off until you turn them on.

## What we collect

- **Heart rate readings** you take with the camera, or (in a future
  version) an Apple Watch.
- **Blood pressure readings** you enter manually, receive from a paired
  Bluetooth monitor, import from Apple Health, or import from a CSV file.
- **App settings** (reminder times, feature toggles) stored locally.

We do not collect your name, email, or any account identifier, because
VitalTrack has no account system.

## Where it's stored

- Primarily: an encrypted local database on your device (Core Data with
  on-device file protection).
- Optionally, if you turn on iCloud sync in Settings: your own iCloud
  account, via Apple's CloudKit. VitalTrack's developer cannot access
  data stored this way — it is encrypted in transit and at rest under
  your Apple ID, the same as your Photos or Notes.
- Optionally, if you turn on Apple Health sync in Settings: Apple Health,
  subject to Apple's own HealthKit privacy protections and your Health
  app permissions, which you can review or revoke at any time in
  Settings > Privacy & Security > Health.

## What we don't do

- We do not run a server that receives your health data.
- We do not sell, rent, or share your health data with third parties.
- We do not use your health data for advertising, and VitalTrack does not
  contain third-party advertising or tracking SDKs.
- We do not access data in your Bluetooth-connected devices beyond the
  blood pressure reading itself.

## Your controls

- **Delete all data:** Settings > Delete all data, a one-tap, on-device,
  irreversible action.
- **Revoke Health access:** Settings app > Privacy & Security > Health >
  VitalTrack.
- **Revoke Bluetooth access:** Settings app > Privacy & Security >
  Bluetooth > VitalTrack.
- **Turn off notifications:** Settings > Reminders, or Settings app >
  Notifications > VitalTrack.
- **Export or delete your iCloud-synced copy:** managed through your
  Apple ID / iCloud settings, since that data lives in your iCloud
  account, not ours.

## Children's privacy

VitalTrack is not directed at children and does not knowingly collect
data from children under 13 (or the applicable age in your region).

## Changes to this policy

If this policy changes in a way that affects how your data is handled,
we'll surface that in the app before the change takes effect, not just in
an updated document you'd have to go looking for.

## Contact

[Support email / contact method to be added before publishing.]
