import SwiftUI

/// Deliberately plain: the product brief asks for "no dark patterns" and
/// "no hidden trials" — the strongest way to guarantee that in a first
/// pass is to not build a countdown timer, a pre-checked annual plan, or
/// any urgency copy at all, rather than build those and try to make them
/// "honest". Real purchases need StoreKit 2 wired to product identifiers
/// configured in App Store Connect, which doesn't exist yet — this screen
/// is the UI and copy, with the purchase button as a clearly marked stub.
struct SubscriptionView: View {
    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("VitalTrack Free").font(.headline)
                    Text("Unlimited manual blood pressure logging, heart rate measurement, 30-day history, and CSV export. No account required.")
                        .font(.subheadline).foregroundStyle(.secondary)
                }
                .padding(.vertical, 4)
            }

            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("VitalTrack Premium — $4.99/month or $39.99/year").font(.headline)
                    Text("Adds: unlimited history, PDF doctor reports, Bluetooth device sync, and iCloud sync across your devices.")
                        .font(.subheadline).foregroundStyle(.secondary)
                }
                .padding(.vertical, 4)

                Button("Subscribe") {}
                    .buttonStyle(.borderedProminent)
                    .tint(VTColor.accent)
                    .disabled(true)
            } footer: {
                Text("Purchases are not yet wired to App Store Connect in this build — see SETUP.md.")
            }

            Section("The fine print, up front") {
                Label("No free trial that silently converts to a paid plan.", systemImage: "checkmark")
                Label("Price is shown before you're asked to pay, every time.", systemImage: "checkmark")
                Label("Everything free is listed above — nothing free is hidden behind a fake paywall.", systemImage: "checkmark")
            }
            .font(.footnote)

            Section("Cancel anytime") {
                Text("Manage or cancel from your iPhone: Settings app → your name → Subscriptions → VitalTrack. "
                    + "Cancelling keeps Premium active until the end of the period you already paid for.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Subscription")
    }
}
