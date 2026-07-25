import SwiftUI
import VitalTrackDesignSystem

struct FAQView: View {
    private let items: [(String, String)] = [
        ("Can the camera measure blood pressure?",
         "No. The camera only supports heart rate via PPG. Blood pressure requires an FDA-cleared external monitor."),
        ("What counts as a BP source?",
         "Manual cuff entry, Bluetooth cuff, Apple Health imports, and CSV imports from valid monitors."),
        ("Are insights medical advice?",
         "No. Insights are informational pattern notes only. Talk with a clinician for decisions."),
        ("Does Apple Watch measure BP in VitalTrack AI?",
         "No. Watch data is used for heart rate / HRV pathways, not blood pressure estimation.")
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
        .background(VTColors.canvasGradient.ignoresSafeArea())
        .navigationTitle("FAQ")
    }
}
