import SwiftUI
import VitalTrackCore

struct HeartRateMeasureView: View {
    @EnvironmentObject private var container: AppContainer
    @Environment(\.dismiss) private var dismiss
    @StateObject private var box = ViewModelBox()
    let onSaved: () -> Void

    var body: some View {
        NavigationStack {
            Group {
                if let vm = box.vm {
                    content(vm)
                } else {
                    ProgressView()
                }
            }
            .navigationTitle("Measure heart rate")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .task {
                box.attach(repository: container.repository, healthKit: container.healthKit, settings: container.settings)
            }
        }
    }

    @ViewBuilder
    private func content(_ vm: HeartRateMeasureViewModel) -> some View {
        switch vm.state {
        case .idle:
            idleView(vm)
        case .requestingPermission:
            ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
        case .measuring:
            measuringView(vm)
        case .error(let message):
            errorView(vm, message: message)
        case .finished(let bpm, let hrv):
            finishedView(vm, bpm: bpm, hrv: hrv)
        }
    }

    private func idleView(_ vm: HeartRateMeasureViewModel) -> some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "heart.fill").font(.system(size: 64)).foregroundStyle(VTColor.accent)
            Text("Check your pulse").font(.title2.weight(.bold))
            Text("Cover the rear camera and flash gently with your fingertip, then hold still for about 20 seconds.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal, 32)
            Button("Start") { vm.start() }
                .buttonStyle(.borderedProminent).tint(VTColor.accent).controlSize(.large)
            Spacer()
        }
        .padding()
    }

    private func measuringView(_ vm: HeartRateMeasureViewModel) -> some View {
        VStack(spacing: 16) {
            Spacer()
            qualityBadge(vm)
            Text(vm.currentReading?.bpm.map(String.init) ?? "--")
                .font(.system(size: 72, weight: .bold, design: .rounded))
                .foregroundStyle(VTColor.accent)
            Text("beats per minute").foregroundStyle(.secondary)
            WaveformShape(samples: vm.currentReading?.waveform ?? [])
                .stroke(VTColor.accent, lineWidth: 3)
                .frame(height: 90)
                .padding(.horizontal)
            Spacer()
            HStack(spacing: 16) {
                Button("Cancel") { vm.cancel() }.buttonStyle(.bordered)
                if vm.canFinishEarly {
                    Button("Done") { Task { await vm.finish() }; onSaved() }
                        .buttonStyle(.borderedProminent).tint(VTColor.accent)
                }
            }
        }
        .padding()
    }

    private func qualityBadge(_ vm: HeartRateMeasureViewModel) -> some View {
        let quality = vm.currentReading?.quality ?? .none
        let (label, tone): (String, VTPill.Tone) = {
            if !vm.fingerDetected { return ("Place your finger on the camera & flash", .neutral) }
            switch quality {
            case .none: return ("Hold still, starting…", .neutral)
            case .poor: return ("Weak signal — press gently, stay still", .caution)
            case .fair: return ("Reading steadying…", .caution)
            case .good: return ("Good signal", .good)
            }
        }()
        return VTPill(text: label, tone: tone)
    }

    private func errorView(_ vm: HeartRateMeasureViewModel, message: String) -> some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "camera.fill").font(.system(size: 48)).foregroundStyle(.secondary)
            Text(message).multilineTextAlignment(.center).padding(.horizontal, 24)
            Button("Try again") { vm.start() }.buttonStyle(.borderedProminent).tint(VTColor.accent)
            Spacer()
        }
    }

    private func finishedView(_ vm: HeartRateMeasureViewModel, bpm: Int?, hrv: Double?) -> some View {
        VStack(spacing: 16) {
            Spacer()
            if let bpm {
                Text("\(bpm)").font(.system(size: 72, weight: .bold, design: .rounded)).foregroundStyle(VTColor.accent)
                Text("beats per minute — saved").foregroundStyle(.secondary)
                if let hrv {
                    Text("HRV (RMSSD): \(Int(hrv)) ms — rough estimate, informational only")
                        .font(.caption).foregroundStyle(.secondary).multilineTextAlignment(.center).padding(.horizontal, 32)
                }
                Button("Back to dashboard") { dismiss() }
                    .buttonStyle(.borderedProminent).tint(VTColor.accent).controlSize(.large)
            } else {
                Image(systemName: "exclamationmark.triangle").font(.system(size: 48)).foregroundStyle(VTColor.caution)
                Text("Couldn't get a steady reading. Try again with gentle, even pressure and stay still.")
                    .multilineTextAlignment(.center).foregroundStyle(.secondary).padding(.horizontal, 24)
            }
            Button("Measure again") { vm.start() }.buttonStyle(.bordered)
            Spacer()
        }
        .padding()
    }
}

@MainActor
private final class ViewModelBox: ObservableObject {
    @Published var vm: HeartRateMeasureViewModel?
    func attach(repository: any HealthRepository, healthKit: HealthKitManager, settings: SettingsStore) {
        if vm == nil {
            vm = HeartRateMeasureViewModel(repository: repository, healthKit: healthKit, settings: settings)
        }
    }
}

/// Simple line chart of the recent filtered PPG samples — same purpose as
/// the waveform view in the PulseCheck (Flutter) build: instant visual
/// feedback on signal quality instead of a silent wait.
private struct WaveformShape: Shape {
    let samples: [Double]

    func path(in rect: CGRect) -> Path {
        var path = Path()
        guard samples.count > 1 else { return path }
        let minVal = samples.min() ?? 0
        let maxVal = samples.max() ?? 1
        let range = max(maxVal - minVal, 0.001)
        let stepX = rect.width / CGFloat(samples.count - 1)

        for (index, sample) in samples.enumerated() {
            let x = CGFloat(index) * stepX
            let normalized = (sample - minVal) / range
            let y = rect.height - CGFloat(normalized) * rect.height * 0.8 - rect.height * 0.1
            if index == 0 { path.move(to: CGPoint(x: x, y: y)) } else { path.addLine(to: CGPoint(x: x, y: y)) }
        }
        return path
    }
}
