import SwiftUI
import VitalTrackDesignSystem

struct PrivacyView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Privacy")
                    .font(VTTypography.display(32))
                    .foregroundStyle(VTColors.brandPrimary)
                Text("VitalTrack AI is offline-first. Readings are stored on your device. Apple Health and Bluetooth access are optional and requested with clear purpose strings.")
                    .font(VTTypography.body())
                    .foregroundStyle(VTColors.textSecondary)
                VTDisclaimerBanner(.custom(TrustCopy.medicalDisclaimer))
                Text("We do not use the camera to estimate blood pressure. Camera access, when used, is for heart rate PPG only.")
                    .font(VTTypography.body(15))
                    .foregroundStyle(VTColors.textSecondary)
                Text("See docs/legal/PRIVACY_POLICY.md in the repository for the full policy draft.")
                    .font(VTTypography.caption())
                    .foregroundStyle(VTColors.textTertiary)
            }
            .padding()
        }
        .background(VTColors.canvasGradient.ignoresSafeArea())
        .navigationTitle("Privacy")
    }
}
