import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct AnalyticsView: View {
    @EnvironmentObject private var composition: AppComposition
    @State private var bpReadings: [BloodPressureReading] = []
    @State private var hrSamples: [HeartRateSample] = []

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Analytics")
                    .font(VTTypography.display(32))
                    .foregroundStyle(VTColors.brandPrimary)
                VTDisclaimerBanner(.insights)
                VTDisclaimerBanner(.bloodPressure)

                VTCard {
                    VStack(alignment: .leading, spacing: 8) {
                        VTSectionHeader("Blood pressure summary", subtitle: "From logged external sources only")
                        Text(bpSummary)
                            .font(VTTypography.body())
                            .foregroundStyle(VTColors.textSecondary)
                    }
                }

                VTCard {
                    VStack(alignment: .leading, spacing: 8) {
                        VTSectionHeader("Heart rate summary", subtitle: "PPG / Watch / Health / manual")
                        Text(hrSummary)
                            .font(VTTypography.body())
                            .foregroundStyle(VTColors.textSecondary)
                    }
                }

                simpleBars
            }
            .padding()
        }
        .background(VTColors.canvasGradient.ignoresSafeArea())
        .task { await load() }
    }

    private var bpSummary: String {
        guard !bpReadings.isEmpty else { return "No BP data yet." }
        let sys = bpReadings.map(\.systolic)
        let dia = bpReadings.map(\.diastolic)
        let avgSys = sys.reduce(0, +) / sys.count
        let avgDia = dia.reduce(0, +) / dia.count
        return "Average \(avgSys)/\(avgDia) mmHg across \(bpReadings.count) readings. Categories are reference ranges, not diagnoses."
    }

    private var hrSummary: String {
        guard !hrSamples.isEmpty else { return "No heart rate data yet." }
        let avg = hrSamples.map(\.bpm).reduce(0, +) / Double(hrSamples.count)
        return String(format: "Average %.0f BPM across %d samples.", avg, hrSamples.count)
    }

    private var simpleBars: some View {
        VTCard {
            VStack(alignment: .leading, spacing: 12) {
                VTSectionHeader("Recent systolic")
                ForEach(bpReadings.prefix(7)) { reading in
                    HStack {
                        Text(shortDate(reading.recordedAt))
                            .font(VTTypography.caption())
                            .frame(width: 70, alignment: .leading)
                        GeometryReader { geo in
                            RoundedRectangle(cornerRadius: 4)
                                .fill(VTColors.brandPrimary.opacity(0.85))
                                .frame(width: barWidth(systolic: reading.systolic, maxWidth: geo.size.width), height: 10)
                        }
                        .frame(height: 10)
                        Text("\(reading.systolic)")
                            .font(VTTypography.caption())
                            .monospacedDigit()
                    }
                }
            }
        }
    }

    private func barWidth(systolic: Int, maxWidth: CGFloat) -> CGFloat {
        let clamped = min(max(systolic, 80), 200)
        return maxWidth * CGFloat(clamped - 80) / 120.0
    }

    private func shortDate(_ date: Date) -> String {
        date.formatted(date: .abbreviated, time: .omitted)
    }

    private func load() async {
        bpReadings = (try? await composition.environment.bloodPressureRepository.fetchRecent(limit: 40)) ?? []
        hrSamples = (try? await composition.environment.heartRateRepository.fetchRecent(limit: 40)) ?? []
    }
}
