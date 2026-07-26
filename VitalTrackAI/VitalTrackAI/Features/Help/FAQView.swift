import SwiftUI
import VitalTrackDesignSystem

struct FAQView: View {
    private let items: [(String, String)] = [
        ("Can the camera measure blood pressure?",
         "No. \(TrustCopy.shortBPBanner) The camera only supports heart rate via PPG."),
        ("Where do blood pressure numbers come from?",
         TrustCopy.shortBPBanner + " Supported inputs: manual entry, Bluetooth cuff, Apple Health, and CSV."),
        ("Are insights medical advice?",
         "No. \(TrustCopy.insightsBanner) Talk with a clinician for decisions."),
        ("Does Apple Watch measure BP in VitalTrack AI?",
         "No. Watch data is used for heart rate / HRV pathways only — never blood pressure estimation.")
    ]

    var body: some View {
        List(items, id: \.0) { item in
            VStack(alignment: .leading, spacing: 8) {
                Text(item.0)
                    .font(VTTypography.body().weight(.semibold))
                Text(item.1)
                    .font(VTTypography.caption())
                    .foregroundStyle(VTColors.textSecondary)
            }
            .padding(.vertical, 4)
        }
        .scrollContentBackground(.hidden)
        .background(VTAtmosphere())
        .navigationTitle("FAQ")
    }
}
