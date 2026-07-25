import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct HistoryView: View {
    @EnvironmentObject private var composition: AppComposition
    @State private var segment = 0
    @State private var bp: [BloodPressureReading] = []
    @State private var hr: [HeartRateSample] = []

    var body: some View {
        VStack(spacing: 0) {
            Picker("History", selection: $segment) {
                Text("Blood pressure").tag(0)
                Text("Heart rate").tag(1)
            }
            .pickerStyle(.segmented)
            .padding()

            if segment == 0 {
                VTDisclaimerBanner(.bloodPressure)
                    .padding(.horizontal)
            } else {
                VTDisclaimerBanner(.heartRate)
                    .padding(.horizontal)
            }

            List {
                if segment == 0 {
                    ForEach(bp) { reading in
                        VStack(alignment: .leading, spacing: 4) {
                            Text("\(reading.displayValue) mmHg")
                                .font(VTTypography.body().weight(.semibold))
                            Text("\(reading.source.displayName) · \(reading.category.displayName)")
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textSecondary)
                            Text(reading.recordedAt.formatted(date: .abbreviated, time: .shortened))
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textTertiary)
                        }
                    }
                    .onDelete(perform: deleteBP)
                } else {
                    ForEach(hr) { sample in
                        VStack(alignment: .leading, spacing: 4) {
                            Text("\(sample.displayBPM) BPM")
                                .font(VTTypography.body().weight(.semibold))
                            Text(sample.source.displayName)
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textSecondary)
                            Text(sample.recordedAt.formatted(date: .abbreviated, time: .shortened))
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textTertiary)
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
        }
        .background(VTColors.canvasGradient.ignoresSafeArea())
        .navigationTitle("History")
        .task { await load() }
    }

    private func load() async {
        bp = (try? await composition.environment.bloodPressureRepository.fetchAll()) ?? []
        hr = (try? await composition.environment.heartRateRepository.fetchAll()) ?? []
    }

    private func deleteBP(at offsets: IndexSet) {
        Task {
            for index in offsets {
                try? await composition.environment.bloodPressureRepository.delete(id: bp[index].id)
            }
            await load()
        }
    }
}
