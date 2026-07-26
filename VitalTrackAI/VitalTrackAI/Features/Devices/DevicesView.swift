import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct DevicesView: View {
    @EnvironmentObject private var composition: AppComposition
    @State private var discovered: [Device] = []
    @State private var status = "Pair FDA-cleared Bluetooth blood pressure monitors. If a cuff disconnects, move closer, power it on, and tap Connect again."
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VTScreenHeader(
                    eyebrow: "Devices",
                    title: "Connect a cuff",
                    subtitle: "Bluetooth imports readings from real monitors."
                )
                VTDisclaimerBanner(.bloodPressure)

                Text(status)
                    .font(VTTypography.body())
                    .foregroundStyle(VTColors.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)

                if let errorMessage {
                    Text(errorMessage)
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.danger)
                }

                HStack(spacing: 12) {
                    VTPrimaryButton("Scan for cuffs") {
                        Task { await scan() }
                    }
                    VTGhostButton("Stop") {
                        Task { await composition.bluetoothManager.stopScanning() }
                    }
                }

                if discovered.isEmpty {
                    VTEmptyState(
                        title: "No monitors found yet",
                        message: "Turn on your cuff’s Bluetooth mode, stay nearby, then scan again.",
                        systemImage: "wave.3.right.circle"
                    )
                } else {
                    ForEach(discovered) { device in
                        VTCard {
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(device.name)
                                        .font(VTTypography.title(18))
                                    Text(device.kind.displayName)
                                        .font(VTTypography.caption())
                                        .foregroundStyle(VTColors.textSecondary)
                                }
                                Spacer()
                                VTPrimaryButton("Connect") {
                                    Task { await connect(device) }
                                }
                                .frame(width: 120)
                            }
                        }
                    }
                }

                VTCard {
                    VTSectionHeader(
                        "Scales",
                        subtitle: "Coming later. Blood pressure requires a cuff — not a scale or camera."
                    )
                }
            }
            .padding(20)
        }
        .background(VTAtmosphere())
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
