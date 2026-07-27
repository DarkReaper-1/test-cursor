import SwiftUI

struct PrivacyView: View {
    var body: some View {
        List {
            Section("What VitalTrack cannot do") {
                Text("It cannot measure blood pressure using your camera, fingerprint sensor, or any "
                    + "built-in iPhone sensor. Blood pressure readings always come from a monitor you "
                    + "own, or a Bluetooth cuff, Apple Health, or CSV import you connect yourself.")
                    .font(.subheadline)
            }

            Section("Where your data lives") {
                Label("An encrypted local database on this device", systemImage: "lock.doc")
                Label("Optionally, your personal iCloud account — off by default", systemImage: "icloud")
                Label("Optionally, Apple Health — off by default", systemImage: "heart.text.square")
            }
            .font(.subheadline)

            Section("What VitalTrack never does") {
                Label("Sell or share your health data with third parties", systemImage: "xmark.circle")
                Label("Upload your readings to a VitalTrack server — there isn't one", systemImage: "xmark.circle")
                Label("Track you for advertising", systemImage: "xmark.circle")
            }
            .font(.subheadline)
            .foregroundStyle(VTColor.danger)

            Section("Compliance posture") {
                Text("Built with minimal data collection, on-device processing, and explicit opt-in "
                    + "for every optional data flow — the architecture a GDPR/HIPAA-conscious review "
                    + "would expect, though this is not a substitute for that formal review before a "
                    + "real launch. See docs/privacy-policy.md for the full policy draft.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Privacy")
    }
}
