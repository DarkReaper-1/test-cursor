import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct PulseResultsView: View {
    let analysis: PulseAnalysis
    var onDone: () -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    VTScreenHeader(
                        eyebrow: "Pulse results",
                        title: "\(Int(analysis.bpm)) BPM",
                        subtitle: "Camera PPG estimate — heart rate only, not blood pressure."
                    )

                    VTDisclaimerBanner(.heartRate)

                    VTCard(emphasized: true) {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Current reading")
                                .font(VTTypography.title(18))
                            Text("\(Int(analysis.bpm))")
                                .font(VTTypography.metric(56))
                            HStack {
                                VTSourceChip(analysis.qualityLabel)
                                VTSourceChip(analysis.confidence.displayName)
                            }
                            if !analysis.sparkline.isEmpty {
                                Sparkline(values: analysis.sparkline)
                                    .frame(height: 56)
                            }
                        }
                    }

                    VTCard {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Compared with you")
                                .font(VTTypography.title(18))
                            compareRow("Yesterday", analysis.vsYesterday)
                            compareRow("Weekly average", analysis.vsWeekAverage)
                            compareRow("Monthly average", analysis.vsMonthAverage)
                        }
                    }

                    VTCard {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("AI explanation")
                                .font(VTTypography.title(18))
                            Text(analysis.explanation)
                                .font(VTTypography.body())
                                .foregroundStyle(VTColors.textSecondary)
                        }
                    }

                    VTCard {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Possible causes")
                                .font(VTTypography.title(18))
                            ForEach(analysis.possibleCauses, id: \.self) { cause in
                                Text("• \(cause)")
                                    .font(VTTypography.body())
                                    .foregroundStyle(VTColors.textSecondary)
                            }
                            Text("Lifestyle tips")
                                .font(VTTypography.title(18))
                                .padding(.top, 6)
                            ForEach(analysis.lifestyleTips, id: \.self) { tip in
                                Text("• \(tip)")
                                    .font(VTTypography.body())
                                    .foregroundStyle(VTColors.textSecondary)
                            }
                        }
                    }

                    VTCard {
                        VStack(alignment: .leading, spacing: 8) {
                            summaryLine("Recovery suggestion", analysis.recoverySuggestion)
                            summaryLine("Hydration", analysis.hydrationReminder)
                            summaryLine("Stress indicator", analysis.stressLabel)
                        }
                    }

                    if let flag = analysis.riskFlag {
                        VTCard(emphasized: true) {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Please note")
                                    .font(VTTypography.title(18))
                                    .foregroundStyle(VTColors.warning)
                                Text(flag)
                                    .font(VTTypography.body())
                                    .foregroundStyle(VTColors.textSecondary)
                            }
                        }
                    }

                    VTPrimaryButton("Done") { onDone() }
                }
                .padding(20)
            }
            .background(VTAtmosphere())
            .navigationTitle("Results")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func compareRow(_ title: String, _ delta: Double?) -> some View {
        HStack {
            Text(title)
                .font(VTTypography.caption())
                .foregroundStyle(VTColors.textSecondary)
            Spacer()
            if let delta {
                Text(String(format: "%@%.0f BPM", delta >= 0 ? "+" : "", delta))
                    .font(VTTypography.body().weight(.bold))
                    .foregroundStyle(delta >= 6 ? VTColors.warning : VTColors.brandDeep)
            } else {
                Text("—")
                    .font(VTTypography.body())
                    .foregroundStyle(VTColors.textTertiary)
            }
        }
    }

    private func summaryLine(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(VTTypography.caption().weight(.bold))
            Text(value)
                .font(VTTypography.body())
                .foregroundStyle(VTColors.textSecondary)
        }
    }
}

struct Sparkline: View {
    let values: [Double]

    var body: some View {
        GeometryReader { geo in
            let minV = values.min() ?? 0
            let maxV = values.max() ?? 1
            let span = max(maxV - minV, 1)
            Path { path in
                for (index, value) in values.enumerated() {
                    let x = geo.size.width * CGFloat(index) / CGFloat(max(values.count - 1, 1))
                    let y = geo.size.height * (1 - CGFloat((value - minV) / span))
                    if index == 0 { path.move(to: CGPoint(x: x, y: y)) }
                    else { path.addLine(to: CGPoint(x: x, y: y)) }
                }
            }
            .stroke(VTColors.brandPrimary, style: StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))
        }
        .accessibilityLabel("Recent heart rate trend")
    }
}
