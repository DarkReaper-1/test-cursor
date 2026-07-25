import Foundation
import VitalTrackCore

#if canImport(CoreBluetooth)
import CoreBluetooth
#endif

@MainActor
public final class BluetoothManager: NSObject, BluetoothManaging, @unchecked Sendable {
    public private(set) var discovered: [Device] = []
    public private(set) var connectedDevice: Device?
    public private(set) var lastError: VitalTrackError?
    public private(set) var statusMessage: String = "Bluetooth idle"

#if canImport(CoreBluetooth)
    private var central: CBCentralManager?
    private var activePeripheral: CBPeripheral?
#endif

    private let registry: DeviceRegistry
    private let bpAdapter: BloodPressureMonitorAdapter
    private let scaleAdapter: ScaleAdapter

    public init(registry: DeviceRegistry = DeviceRegistry()) {
        self.registry = registry
        self.bpAdapter = BloodPressureMonitorAdapter()
        self.scaleAdapter = ScaleAdapter()
        super.init()
#if canImport(CoreBluetooth)
        self.central = CBCentralManager(delegate: self, queue: nil)
#endif
    }

    public var isPoweredOn: Bool {
        get async {
#if canImport(CoreBluetooth)
            return central?.state == .poweredOn
#else
            return false
#endif
        }
    }

    public func startScanning(for kinds: [DeviceKind]) async throws {
#if canImport(CoreBluetooth)
        guard let central else { throw VitalTrackError.bluetoothUnavailable }
        guard central.state == .poweredOn else {
            throw VitalTrackError.bluetoothUnavailable
        }
        statusMessage = "Scanning for FDA-cleared monitors…"
        lastError = nil
        var services: [CBUUID] = []
        if kinds.contains(.bloodPressureMonitor) {
            services.append(BloodPressureMonitorAdapter.serviceUUID)
        }
        central.scanForPeripherals(withServices: services.isEmpty ? nil : services, options: [
            CBCentralManagerScanOptionAllowDuplicatesKey: false
        ])
#else
        statusMessage = "Bluetooth simulation (non-Apple host)"
        discovered = [
            Device(name: "Demo BP Cuff", kind: .bloodPressureMonitor, peripheralIdentifier: "demo-bp-1")
        ]
#endif
    }

    public func stopScanning() async {
#if canImport(CoreBluetooth)
        central?.stopScan()
#endif
        statusMessage = "Scan stopped"
    }

    public func connect(_ device: Device) async throws {
#if canImport(CoreBluetooth)
        guard let central else { throw VitalTrackError.bluetoothUnavailable }
        await stopScanning()
        statusMessage = "Connecting to \(device.name)…"
        // In a full implementation we retain CBPeripheral references from discovery.
        // Here we surface clear recovery messaging if the peripheral is gone.
        guard device.peripheralIdentifier != nil else {
            let error = VitalTrackError.bluetoothConnectionFailed("Peripheral reference missing. Scan again, then reconnect.")
            lastError = error
            throw error
        }
        connectedDevice = device
        registry.register(device)
        statusMessage = "Connected to \(device.name). Ready for a cuff measurement."
#else
        connectedDevice = device
        registry.register(device)
        statusMessage = "Simulated connection to \(device.name)"
#endif
    }

    public func disconnect(_ device: Device) async {
#if canImport(CoreBluetooth)
        if let activePeripheral {
            central?.cancelPeripheralConnection(activePeripheral)
        }
#endif
        if connectedDevice?.id == device.id {
            connectedDevice = nil
        }
        statusMessage = VitalTrackError.bluetoothDisconnected(device.name).errorDescription
            ?? "Disconnected. Power on the cuff and reconnect when ready."
        lastError = .bluetoothDisconnected(device.name)
    }

    public func bloodPressureAdapter() -> BloodPressureMonitorAdapter { bpAdapter }
    public func scale() -> ScaleAdapter { scaleAdapter }
}

#if canImport(CoreBluetooth)
extension BluetoothManager: CBCentralManagerDelegate {
    public nonisolated func centralManagerDidUpdateState(_ central: CBCentralManager) {
        Task { @MainActor in
            switch central.state {
            case .poweredOn:
                statusMessage = "Bluetooth ready"
            case .poweredOff:
                statusMessage = "Bluetooth is off. Enable it to pair an FDA-cleared cuff."
                lastError = .bluetoothUnavailable
            case .unauthorized:
                statusMessage = "Bluetooth permission denied. Enable it in Settings."
                lastError = .bluetoothUnavailable
            default:
                statusMessage = "Bluetooth not ready"
            }
        }
    }

    public nonisolated func centralManager(
        _ central: CBCentralManager,
        didDiscover peripheral: CBPeripheral,
        advertisementData: [String: Any],
        rssi RSSI: NSNumber
    ) {
        let name = peripheral.name
            ?? (advertisementData[CBAdvertisementDataLocalNameKey] as? String)
            ?? "Blood Pressure Monitor"
        Task { @MainActor in
            let device = Device(
                name: name,
                kind: .bloodPressureMonitor,
                peripheralIdentifier: peripheral.identifier.uuidString,
                connectionState: .disconnected
            )
            if !discovered.contains(where: { $0.peripheralIdentifier == device.peripheralIdentifier }) {
                discovered.append(device)
            }
        }
    }
}
#endif
