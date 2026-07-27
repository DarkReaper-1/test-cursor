import SwiftUI
import VitalTrackCore

struct HistoryView: View {
    @EnvironmentObject private var container: AppContainer
    @StateObject private var box = ViewModelBox()
    @State private var tab = 0

    var body: some View {
        NavigationStack {
            Group {
                if let vm = box.vm {
                    VStack(spacing: 0) {
                        Picker("", selection: $tab) {
                            Text("Heart rate").tag(0)
                            Text("Blood pressure").tag(1)
                        }
                        .pickerStyle(.segmented)
                        .padding()

                        if tab == 0 {
                            heartRateList(vm)
                        } else {
                            bloodPressureList(vm)
                        }
                    }
                } else {
                    ProgressView()
                }
            }
            .navigationTitle("History")
            .task {
                box.attach(repository: container.repository)
                await box.vm?.load()
            }
        }
    }

    private func heartRateList(_ vm: HistoryViewModel) -> some View {
        Group {
            if vm.heartRate.isEmpty {
                emptyState("No heart rate readings yet.")
            } else {
                List {
                    ForEach(vm.heartRate) { reading in
                        HStack {
                            VStack(alignment: .leading) {
                                Text("\(reading.bpm) bpm").font(.headline)
                                Text(reading.takenAt.formatted(date: .abbreviated, time: .shortened))
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            if let hrv = reading.hrvRMSSDMs {
                                Text("HRV \(Int(hrv)) ms").font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                    .onDelete { offsets in Task { await vm.deleteHeartRate(at: offsets) } }
                }
            }
        }
    }

    private func bloodPressureList(_ vm: HistoryViewModel) -> some View {
        Group {
            if vm.bloodPressure.isEmpty {
                emptyState("No blood pressure readings yet.")
            } else {
                List {
                    ForEach(vm.bloodPressure) { reading in
                        HStack {
                            VStack(alignment: .leading) {
                                Text("\(reading.systolic)/\(reading.diastolic) mmHg").font(.headline)
                                Text("\(reading.takenAt.formatted(date: .abbreviated, time: .shortened)) · \(reading.referenceRange.rawValue)")
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            if let pulse = reading.pulse {
                                Text("\(pulse) bpm").font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                    .onDelete { offsets in Task { await vm.deleteBloodPressure(at: offsets) } }
                }
            }
        }
    }

    private func emptyState(_ text: String) -> some View {
        Text(text).foregroundStyle(.secondary).frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

@MainActor
private final class ViewModelBox: ObservableObject {
    @Published var vm: HistoryViewModel?
    func attach(repository: any HealthRepository) {
        if vm == nil { vm = HistoryViewModel(repository: repository) }
    }
}
