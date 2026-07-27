import SwiftUI
import VitalTrackCore

/// The dashboard is a fixed set of cards for this release — heart rate,
/// blood pressure, and a weekly trend, all backed by real data. The
/// product brief's larger card list (medication, water, sleep, exercise,
/// goals, mood, stress) is intentionally not shipped as placeholder
/// widgets here; each is a real tracker in its own right and half-built
/// versions would be worse than not having them. `DashboardCard` below is
/// written so adding one later is additive — see docs/PRD.md §Roadmap.
struct DashboardView: View {
    @EnvironmentObject private var container: AppContainer
    @StateObject private var viewModel: DashboardViewModelBox = DashboardViewModelBox()
    @State private var presentedSheet: Sheet?

    private enum Sheet: Identifiable {
        case measureHeartRate
        case logBloodPressure
        var id: Int { hashValue }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: VTMetrics.sectionSpacing) {
                    if let vm = viewModel.vm {
                        HeartRateCard(reading: vm.latestHeartRate, weeklyAverage: vm.weeklyHeartRateAverage)
                        BloodPressureCard(reading: vm.latestBloodPressure)
                    }

                    VStack(spacing: 12) {
                        Button {
                            presentedSheet = .measureHeartRate
                        } label: {
                            Label("Measure heart rate", systemImage: "camera.fill")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(VTColor.accent)
                        .controlSize(.large)

                        Button {
                            presentedSheet = .logBloodPressure
                        } label: {
                            Label("Log blood pressure", systemImage: "square.and.pencil")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.large)
                    }
                }
                .padding()
            }
            .navigationTitle("VitalTrack")
            .task {
                viewModel.attach(repository: container.repository)
                await viewModel.vm?.load()
            }
            .sheet(item: $presentedSheet) { sheet in
                switch sheet {
                case .measureHeartRate:
                    HeartRateMeasureView { Task { await viewModel.vm?.load() } }
                case .logBloodPressure:
                    BloodPressureLogView { Task { await viewModel.vm?.load() } }
                }
            }
        }
    }
}

/// Small indirection so the environment-provided repository (only
/// available once the view is in the hierarchy) can flow into a
/// `@StateObject` view model, which SwiftUI otherwise wants constructed
/// before `body` runs.
@MainActor
private final class DashboardViewModelBox: ObservableObject {
    @Published var vm: DashboardViewModel?
    func attach(repository: HealthRepository) {
        if vm == nil { vm = DashboardViewModel(repository: repository) }
    }
}

private struct HeartRateCard: View {
    let reading: HeartRateReading?
    let weeklyAverage: Double?

    var body: some View {
        VTCard {
            Label("Heart rate", systemImage: "heart.fill")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(VTColor.accent)
            if let reading {
                Text("\(reading.bpm) bpm")
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                Text(reading.takenAt, style: .relative)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if let weeklyAverage {
                    Text("7-day average: \(Int(weeklyAverage.rounded())) bpm")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            } else {
                Text("No readings yet").foregroundStyle(.secondary)
            }
        }
    }
}

private struct BloodPressureCard: View {
    let reading: BloodPressureReading?

    var body: some View {
        VTCard {
            Label("Blood pressure", systemImage: "waveform.path.ecg")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.indigo)
            if let reading {
                Text("\(reading.systolic)/\(reading.diastolic) mmHg")
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                HStack {
                    Text(reading.takenAt, style: .relative)
                    Text("·")
                    Text(reading.referenceRange.rawValue)
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            } else {
                Text("No readings yet").foregroundStyle(.secondary)
            }
        }
    }
}
