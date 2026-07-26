import SwiftUI
import VitalTrackDesignSystem

struct PrivacyView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VTScreenHeader(
                    eyebrow: "Privacy",
                    title: "Your data stays yours",
                    subtitle: "Offline-first. Clear permissions. No selling health data."
                )
                Text("VitalTrack AI stores readings on your device. Apple Health and Bluetooth access are optional and requested with clear purpose strings.")
                    .font(VTTypography.body())
                    .foregroundStyle(VTColors.textSecondary)
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
}
