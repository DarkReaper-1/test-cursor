import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct DevicesView: View {
    @EnvironmentObject private var composition: AppComposition
    @State private var discovered: [Device] = []
    @State private var status = "Pair FDA-cleared Bluetooth blood pressure monitors."
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Devices")
                    .font(VTTypography.display(32))
                    .foregroundStyle(VTColors.brandPrimary)
                VTDisclaimerBanner(.bloodPressure)
                Text(status)
                    .font(VTTypography.body(15))
                    .foregroundStyle(VTColors.textSecondary)
                if let errorMessage {
                    Text(errorMessage)
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.danger)
                }

                HStack(spacing: 12) {
                    VTPrimaryButton("Scan for cuffs") {
                        Task { await scan() }
                    }
                    Button("Stop") {
                        Task { await composition.bluetoothManager.stopScanning() }
                    }
                    .foregroundStyle(VTColors.brandSecondary)
                }

                ForEach(discovered) { device in
                    VTCard {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(device.name)
                                    .font(VTTypography.body().weight(.semibold))
                                Text(device.kind.displayName)
                                    .font(VTTypography.caption())
                                    .foregroundStyle(VTColors.textSecondary)
                            }
                            Spacer()
                            Button("Connect") {
                                Task { await connect(device) }
                            }
                            .foregroundStyle(VTColors.brandPrimary)
                        }
                    }
                }

                VTCard {
                    VStack(alignment: .leading, spacing: 8) {
                        VTSectionHeader("Scales", subtitle: "Coming later")
                        Text("Scale pairing is stubbed. Blood pressure requires a cuff — not a scale or camera.")
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.textSecondary)
                    }
                }
            }
            .padding()
        }
        .background(VTColors.canvasGradient.ignoresSafeArea())
        .navigationTitle("Devices")
    }

    private func scan() async {
        do {
            try await composition.bluetoothManager.startScanning(for: [.bloodPressureMonitor])
            try? await Task.sleep(nanoseconds: 700_000_000)
            discovered = composition.bluetoothManager.discovered
            status = composition.bluetoothManager.statusMessage
            errorMessage = composition.bluetoothManager.lastError?.errorDescription
        } catch {
            errorMessage = (error as? VitalTrackError)?.recoverySuggestion ?? error.localizedDescription
        }
    }

    private func connect(_ device: Device) async {
        do {
            try await composition.bluetoothManager.connect(device)
            try await composition.environment.deviceRepository.save(device)
            status = composition.bluetoothManager.statusMessage
        } catch {
            errorMessage = (error as? VitalTrackError)?.recoverySuggestion ?? error.localizedDescription
        }
    }
}
