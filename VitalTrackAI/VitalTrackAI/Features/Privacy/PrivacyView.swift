import SwiftUI
import VitalTrackDesignSystem

struct PrivacyView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VTScreenHeader(
                    eyebrow: "Privacy & trust",
                    title: "Your data stays yours",
                    subtitle: "Encryption on device. Clear AI limits. No selling health data."
                )

                trustCard(
                    title: "Data ownership",
                    body: "You own your readings, check-ins, and medication logs. Export or delete them anytime. Cloud backup is optional and opt-in for Premium."
                )
                trustCard(
                    title: "Encryption & storage",
                    body: "VitalTrack AI is offline-first. Local files stay on your device. Apple Health and Bluetooth access are optional and requested with clear purpose strings."
                )
                trustCard(
                    title: "AI limitations",
                    body: "The AI coach explains trends in plain English. It never diagnoses disease, never claims camera blood pressure, and never replaces your clinician."
                )
                trustCard(
                    title: "Family sharing",
                    body: "Caregiver sharing is off by default. Nothing is shared until you explicitly enable it on a care profile."
                )

                VTDisclaimerBanner(.custom(TrustCopy.medicalDisclaimer))
                VTDisclaimerBanner(.bloodPressure)
                Text("We do not use the camera to estimate blood pressure. Camera access, when used, is for heart rate PPG only.")
                    .font(VTTypography.body())
                    .foregroundStyle(VTColors.textSecondary)
                Text("See docs/legal/PRIVACY_POLICY.md in the repository for the full policy draft.")
                    .font(VTTypography.caption())
                    .foregroundStyle(VTColors.textSecondary)
            }
            .padding(20)
        }
        .background(VTAtmosphere())
        .navigationTitle("Privacy")
    }

    private func trustCard(title: String, body: String) -> some View {
        VTCard {
            VStack(alignment: .leading, spacing: 8) {
                Text(title)
                    .font(VTTypography.title(18))
                Text(body)
                    .font(VTTypography.caption())
                    .foregroundStyle(VTColors.textSecondary)
            }
        }
    }
}
