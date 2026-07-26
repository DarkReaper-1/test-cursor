import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct HistoryView: View {
    @EnvironmentObject private var composition: AppComposition
    @State private var segment = 0
    @State private var bp: [BloodPressureReading] = []
    @State private var hr: [HeartRateSample] = []

    var body: some View {
        VStack(spacing: 12) {
            Picker("History", selection: $segment) {
                Text("Blood pressure").tag(0)
                Text("Heart rate").tag(1)
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 20)
            .padding(.top, 8)

            if segment == 0 {
                VTDisclaimerBanner(.bloodPressure)
                    .padding(.horizontal, 20)
            } else {
                VTDisclaimerBanner(.heartRate)
                    .padding(.horizontal, 20)
            }

            List {
                if segment == 0 {
                    if bp.isEmpty {
                        Text("No cuff readings yet.")
                            .font(VTTypography.body())
                            .foregroundStyle(VTColors.textSecondary)
                    }
                    ForEach(bp) { reading in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("\(reading.displayValue) mmHg")
                                    .font(VTTypography.title(20))
                                Spacer()
                                VTSourceChip(reading.source.displayName)
                            }
                            Text(reading.category.displayName)
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textSecondary)
                            Text(reading.recordedAt.formatted(date: .abbreviated, time: .shortened))
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textSecondary)
                        }
                        .padding(.vertical, 4)
                    }
                    .onDelete(perform: deleteBP)
                } else {
                    if hr.isEmpty {
                        Text("No heart-rate samples yet.")
                            .font(VTTypography.body())
                            .foregroundStyle(VTColors.textSecondary)
                    }
                    ForEach(hr) { sample in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("\(sample.displayBPM) BPM")
                                    .font(VTTypography.title(20))
                                Spacer()
                                VTSourceChip(sample.source.displayName)
                            }
                            Text(sample.recordedAt.formatted(date: .abbreviated, time: .shortened))
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textSecondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .scrollContentBackground(.hidden)
        }
        .background(VTAtmosphere())
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
