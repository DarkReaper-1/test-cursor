import SwiftUI

/// Every page here exists because the product's core rule is "never
/// mislead users" — this is where VitalTrack tells you, before you've
/// logged a single reading, exactly what it can and can't do. The
/// capability/limitation page is not skippable.
struct OnboardingView: View {
    @EnvironmentObject private var settings: SettingsStore
    @State private var page = 0

    private let pages = 5

    var body: some View {
        VStack(spacing: 0) {
            TabView(selection: $page) {
                OnboardingWelcomePage().tag(0)
                OnboardingCapabilitiesPage().tag(1)
                OnboardingHowHeartRateWorksPage().tag(2)
                OnboardingPrivacyPage().tag(3)
                OnboardingPermissionsPage(onFinish: { settings.onboardingCompleted = true }).tag(4)
            }
            .tabViewStyle(.page(indexDisplayMode: .always))

            if page < pages - 1 {
                Button("Continue") { withAnimation { page += 1 } }
                    .buttonStyle(.borderedProminent)
                    .tint(VTColor.accent)
                    .controlSize(.large)
                    .padding()
            }
        }
    }
}

private struct OnboardingPageScaffold<Content: View>: View {
    let icon: String
    let title: String
    @ViewBuilder var content: Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Image(systemName: icon)
                    .font(.system(size: 44))
                    .foregroundStyle(VTColor.accent)
                Text(title)
                    .font(.title.weight(.bold))
                content
                    .font(.body)
                    .foregroundStyle(.secondary)
                Spacer(minLength: 40)
            }
            .padding(24)
        }
    }
}

private struct OnboardingWelcomePage: View {
    var body: some View {
        OnboardingPageScaffold(icon: "heart.text.square", title: "Welcome to VitalTrack") {
            Text("VitalTrack helps you track your heart rate and blood pressure over time, "
                + "understand your trends, and share meaningful reports with your doctor.")
        }
    }
}

private struct OnboardingCapabilitiesPage: View {
    var body: some View {
        OnboardingPageScaffold(icon: "checkmark.shield", title: "What VitalTrack can and can't do") {
            VStack(alignment: .leading, spacing: 14) {
                Label("Estimates heart rate using your camera and flash, or an Apple Watch.",
                      systemImage: "checkmark.circle.fill").foregroundStyle(VTColor.good)
                Label("Tracks blood pressure readings you obtain from an FDA-cleared blood pressure monitor.",
                      systemImage: "checkmark.circle.fill").foregroundStyle(VTColor.good)

                Divider().padding(.vertical, 4)

                Label("Cannot measure blood pressure using your camera, fingerprint sensor, or any built-in iPhone sensor.",
                      systemImage: "xmark.circle.fill").foregroundStyle(VTColor.danger)
                Label("Is not a diagnostic or medical device, and does not replace medical advice.",
                      systemImage: "xmark.circle.fill").foregroundStyle(VTColor.danger)
            }
            .font(.body)
        }
    }
}

private struct OnboardingHowHeartRateWorksPage: View {
    var body: some View {
        OnboardingPageScaffold(icon: "waveform.path.ecg", title: "How heart rate measurement works") {
            Text("Covering the camera and flash with your fingertip lets VitalTrack see tiny "
                + "brightness changes caused by blood flowing through your fingertip with every "
                + "heartbeat — a technique called photoplethysmography (PPG), the same principle "
                + "used in pulse oximeters. It takes about 20 seconds and works best when you're "
                + "still and not exercising.\n\nExpected accuracy: within a few beats per minute of "
                + "a chest-strap monitor when your finger placement is good; the app shows a "
                + "live signal-quality indicator so you know when to trust a reading.")
        }
    }
}

private struct OnboardingPrivacyPage: View {
    var body: some View {
        OnboardingPageScaffold(icon: "lock.shield", title: "Your data stays yours") {
            VStack(alignment: .leading, spacing: 10) {
                Text("Readings are stored in an encrypted local database on this device.")
                Text("Apple Health sync and iCloud sync are both off until you turn them on in Settings.")
                Text("VitalTrack never sells health data, and there is no ad tracking.")
            }
        }
    }
}

private struct OnboardingPermissionsPage: View {
    let onFinish: () -> Void

    var body: some View {
        OnboardingPageScaffold(icon: "hand.raised", title: "Permissions") {
            VStack(alignment: .leading, spacing: 14) {
                Text("VitalTrack will ask for Camera access to measure heart rate. Health, "
                    + "Bluetooth, and Notifications access are requested only if and when you "
                    + "turn those features on in Settings.")
                Button("Get started") { onFinish() }
                    .buttonStyle(.borderedProminent)
                    .tint(VTColor.accent)
                    .controlSize(.large)
                    .padding(.top, 8)
            }
        }
    }
}
