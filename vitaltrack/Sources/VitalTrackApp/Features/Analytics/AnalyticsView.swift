import Charts
import SwiftUI
import VitalTrackCore

struct AnalyticsView: View {
    @EnvironmentObject private var container: AppContainer
    @StateObject private var box = ViewModelBox()

    var body: some View {
        NavigationStack {
            Group {
                if let vm = box.vm {
                    ScrollView {
                        VStack(alignment: .leading, spacing: VTMetrics.sectionSpacing) {
                            Picker("Range", selection: Binding(get: { vm.range }, set: { vm.range = $0 })) {
                                ForEach(TrendRange.allCases) { range in
                                    Text(range.label).tag(range)
                                }
                            }
                            .pickerStyle(.segmented)

                            VTCard {
                                Text("Heart rate").font(.headline)
                                if vm.heartRate.count >= 2 {
                                    Chart(vm.heartRate) { reading in
                                        LineMark(x: .value("Date", reading.takenAt), y: .value("BPM", reading.bpm))
                                            .foregroundStyle(VTColor.accent)
                                            .interpolationMethod(.catmullRom)
                                        AreaMark(x: .value("Date", reading.takenAt), y: .value("BPM", reading.bpm))
                                            .foregroundStyle(VTColor.accent.opacity(0.12))
                                            .interpolationMethod(.catmullRom)
                                    }
                                    .frame(height: 180)
                                } else {
                                    emptyChartMessage("Log a few more heart rate readings to see a trend.")
                                }
                            }

                            VTCard {
                                Text("Blood pressure").font(.headline)
                                if vm.bloodPressure.count >= 2 {
                                    Chart(vm.bloodPressure) { reading in
                                        LineMark(x: .value("Date", reading.takenAt), y: .value("Systolic", reading.systolic))
                                            .foregroundStyle(by: .value("Series", "Systolic"))
                                        LineMark(x: .value("Date", reading.takenAt), y: .value("Diastolic", reading.diastolic))
                                            .foregroundStyle(by: .value("Series", "Diastolic"))
                                    }
                                    .chartForegroundStyleScale(["Systolic": Color.indigo, "Diastolic": Color.indigo.opacity(0.4)])
                                    .frame(height: 180)
                                } else {
                                    emptyChartMessage("Log a few more blood pressure readings to see a trend.")
                                }
                            }

                            VTCard {
                                Text("Systolic averages").font(.headline)
                                AverageRow(label: "This week", value: vm.weeklyAverageSystolic)
                                AverageRow(label: "This month", value: vm.monthlyAverageSystolic)
                                AverageRow(label: "This year", value: vm.yearlyAverageSystolic)
                            }
                        }
                        .padding()
                    }
                } else {
                    ProgressView()
                }
            }
            .navigationTitle("Analytics")
            .task {
                box.attach(repository: container.repository)
                await box.vm?.load()
            }
        }
    }

    private func emptyChartMessage(_ text: String) -> some View {
        Text(text).font(.footnote).foregroundStyle(.secondary).frame(maxWidth: .infinity, minHeight: 120)
    }
}

private struct AverageRow: View {
    let label: String
    let value: Double?

    var body: some View {
        HStack {
            Text(label)
            Spacer()
            Text(value.map { "\(Int($0.rounded())) mmHg" } ?? "—").foregroundStyle(.secondary)
        }
        .font(.subheadline)
    }
}

@MainActor
private final class ViewModelBox: ObservableObject {
    @Published var vm: AnalyticsViewModel?
    func attach(repository: any HealthRepository) {
        if vm == nil { vm = AnalyticsViewModel(repository: repository) }
    }
}
