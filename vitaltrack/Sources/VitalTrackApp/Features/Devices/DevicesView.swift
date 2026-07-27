import CoreBluetooth
import SwiftUI
import VitalTrackCore

/// Pairs a standard BLE blood pressure cuff (Bluetooth SIG profile 0x1810)
/// and imports whatever it broadcasts directly into your history — see
/// `BluetoothBloodPressureManager` for the protocol implementation. This
/// screen is written so a future "Bluetooth scale" or other device type
/// is a sibling screen against its own manager, not a rewrite of this one.
struct DevicesView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = DevicesViewModel()
    let onReadingImported: (BloodPressureReading) -> Void

    var body: some View {
        NavigationStack {
            List {
                Section {
                    statusRow
                } header: {
                    Text("Status")
                }

                if !viewModel.discoveredPeripherals.isEmpty {
                    Section("Nearby monitors") {
                        ForEach(viewModel.discoveredPeripherals, id: \.identifier) { peripheral in
                            Button(peripheral.name ?? "Unnamed device") {
                                viewModel.connect(to: peripheral)
                            }
                        }
                    }
                }

                if let reading = viewModel.lastReceivedReading {
                    Section("Last received reading") {
                        Text("\(reading.systolic)/\(reading.diastolic) mmHg")
                            .font(.title3.weight(.bold))
                    }
                }
            }
            .navigationTitle("Devices")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } }
                ToolbarItem(placement: .primaryAction) {
                    Button("Scan") { viewModel.startScanning() }
                }
            }
            .onAppear {
                viewModel.onReadingReceived = { reading in
                    onReadingImported(reading)
                }
            }
            .onDisappear { viewModel.stopScanning() }
        }
    }

    @ViewBuilder
    private var statusRow: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(statusText).font(.body)
            if let suggestion = viewModel.state.recoverySuggestion {
                Text(suggestion).font(.footnote).foregroundStyle(.secondary)
            }
            if case .disconnected = viewModel.state {
                Button("Reconnect to last device") { viewModel.reconnect() }.font(.footnote)
            }
        }
    }

    private var statusText: String {
        switch viewModel.state {
        case .poweredOff: return "Bluetooth is off"
        case .unauthorized: return "Bluetooth access not allowed"
        case .scanning: return "Scanning for nearby monitors…"
        case .discovered(let name): return "Found: \(name)"
        case .connecting(let name): return "Connecting to \(name)…"
        case .connected(let name): return "Connected to \(name)"
        case .receivingReading(let name): return "Waiting for a reading from \(name)"
        case .disconnected: return "Not connected"
        case .failed(let message): return message
        }
    }
}
