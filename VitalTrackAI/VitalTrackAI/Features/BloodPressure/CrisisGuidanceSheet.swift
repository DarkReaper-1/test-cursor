import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct CrisisGuidanceSheet: View {
    let guidance: CrisisGuidance
    let readingLabel: String
    var onDismiss: () -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text(guidance.title)
                        .font(VTTypography.display(28))
                        .foregroundStyle(VTColors.textPrimary)

                    Text("Reading: \(readingLabel) mmHg")
                        .font(VTTypography.title(18))
                        .foregroundStyle(VTColors.brandDeep)

                    Text(guidance.calmSummary)
                        .font(VTTypography.body())
                        .foregroundStyle(VTColors.textSecondary)

                    section(title: "What this may mean", body: guidance.whatThisMayMean)

                    VTCard {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Symptoms that need urgent attention")
                                .font(VTTypography.title(18))
                            ForEach(guidance.urgentSymptoms, id: \.self) { symptom in
                                Text("• \(symptom)")
                                    .font(VTTypography.body())
                                    .foregroundStyle(VTColors.textSecondary)
                            }
                        }
                    }

                    section(title: "When to contact emergency services", body: guidance.whenToCallEmergency)
                    section(title: "When to contact a doctor", body: guidance.whenToContactDoctor)

                    VTCard {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("What to do now")
                                .font(VTTypography.title(18))
                            ForEach(guidance.whatToDoNow, id: \.self) { step in
                                Text("• \(step)")
                                    .font(VTTypography.body())
                                    .foregroundStyle(VTColors.textSecondary)
                            }
                        }
                    }

                    Text(guidance.disclaimer)
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textTertiary)
                }
                .padding(20)
            }
            .background(VTAtmosphere())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("I understand") { onDismiss() }
                        .font(VTTypography.body().weight(.bold))
                }
            }
        }
        .presentationDetents([.large])
        .interactiveDismissDisabled(false)
    }

    private func section(title: String, body: String) -> some View {
        VTCard {
            VStack(alignment: .leading, spacing: 8) {
                Text(title)
                    .font(VTTypography.title(18))
                Text(body)
                    .font(VTTypography.body())
                    .foregroundStyle(VTColors.textSecondary)
            }
        }
    }
}
