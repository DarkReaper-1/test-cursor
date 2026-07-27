import CoreBluetooth
import Foundation

/// Bluetooth SIG-assigned UUIDs for the standard Blood Pressure profile.
/// A specific cuff's proprietary companion app may offer more (trends,
/// firmware update, multi-user memory slots), but every cuff that's
/// "Bluetooth Smart / BLE" certified for blood pressure exposes at least
/// this much, which is all VitalTrack needs to import a reading.
public enum BloodPressureGATT {
    public static let serviceUUID = CBUUID(string: "1810")
    public static let measurementCharacteristicUUID = CBUUID(string: "2A35")
    public static let featureCharacteristicUUID = CBUUID(string: "2A49")
}

public enum BluetoothDeviceState: Equatable {
    case poweredOff
    case unauthorized
    case scanning
    case discovered(name: String)
    case connecting(name: String)
    case connected(name: String)
    case receivingReading(name: String)
    case disconnected
    case failed(String)

    /// Plain-language recovery guidance for whatever state we're in —
    /// every Bluetooth error in VitalTrack has an actionable next step,
    /// never a bare error code.
    public var recoverySuggestion: String? {
        switch self {
        case .poweredOff:
            return "Turn on Bluetooth in Control Center or Settings, then try again."
        case .unauthorized:
            return "Allow Bluetooth access for VitalTrack in Settings > Privacy & Security > Bluetooth."
        case .failed:
            return "Move closer to the device, make sure it's powered on and not connected to another phone, then try again."
        case .disconnected:
            return "The device disconnected. Bring it back in range and tap Reconnect."
        default:
            return nil
        }
    }
}

@MainActor
public protocol BluetoothBloodPressureManagerDelegate: AnyObject {
    func bluetoothManager(_ manager: BluetoothBloodPressureManager, didChangeState state: BluetoothDeviceState)
    func bluetoothManager(_ manager: BluetoothBloodPressureManager, didDiscoverPeripherals peripherals: [CBPeripheral])
    func bluetoothManager(_ manager: BluetoothBloodPressureManager, didReceiveReading reading: BloodPressureReading)
}

/// Scans for, connects to, and reads measurements from any standard BLE
/// Blood Pressure Service (0x1810) cuff. Kept as a small, focused class so
/// adding a new *kind* of device (a Bluetooth scale, say) means writing a
/// sibling manager against that device's GATT profile, not touching this
/// one — see docs/PRD.md "Device Integrations" for the intended pattern.
@MainActor
public final class BluetoothBloodPressureManager: NSObject {
    public weak var delegate: BluetoothBloodPressureManagerDelegate?

    private var central: CBCentralManager!
    private var connectedPeripheral: CBPeripheral?
    private var reconnectPeripheralID: UUID?
    private var discoveredPeripherals: [UUID: CBPeripheral] = [:]

    public private(set) var state: BluetoothDeviceState = .disconnected {
        didSet { delegate?.bluetoothManager(self, didChangeState: state) }
    }

    public override init() {
        super.init()
        central = CBCentralManager(delegate: self, queue: nil)
    }

    public func startScanning() {
        guard central.state == .poweredOn else {
            state = central.state == .unauthorized ? .unauthorized : .poweredOff
            return
        }
        discoveredPeripherals.removeAll()
        state = .scanning
        central.scanForPeripherals(withServices: [BloodPressureGATT.serviceUUID])
    }

    public func stopScanning() {
        central.stopScan()
    }

    public func connect(to peripheral: CBPeripheral) {
        stopScanning()
        connectedPeripheral = peripheral
        peripheral.delegate = self
        state = .connecting(name: peripheral.name ?? "Blood pressure monitor")
        central.connect(peripheral)
    }

    public func disconnect() {
        guard let peripheral = connectedPeripheral else { return }
        central.cancelPeripheralConnection(peripheral)
    }

    /// Used by the "Reconnect" action after an unexpected disconnect —
    /// retrieves the same peripheral by identifier rather than re-scanning,
    /// which is faster when the device is still in range.
    public func reconnectToLastKnownDevice() {
        guard let id = reconnectPeripheralID else {
            startScanning()
            return
        }
        let known = central.retrievePeripherals(withIdentifiers: [id])
        if let peripheral = known.first {
            connect(to: peripheral)
        } else {
            startScanning()
        }
    }
}

extension BluetoothBloodPressureManager: CBCentralManagerDelegate {
    public func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            if state == .poweredOff { state = .disconnected }
        case .unauthorized:
            state = .unauthorized
        case .poweredOff:
            state = .poweredOff
        default:
            break
        }
    }

    public func centralManager(
        _ central: CBCentralManager,
        didDiscover peripheral: CBPeripheral,
        advertisementData: [String: Any],
        rssi RSSI: NSNumber
    ) {
        discoveredPeripherals[peripheral.identifier] = peripheral
        state = .discovered(name: peripheral.name ?? "Blood pressure monitor")
        delegate?.bluetoothManager(self, didDiscoverPeripherals: Array(discoveredPeripherals.values))
    }

    public func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        state = .connected(name: peripheral.name ?? "Blood pressure monitor")
        peripheral.discoverServices([BloodPressureGATT.serviceUUID])
    }

    public func centralManager(
        _ central: CBCentralManager,
        didFailToConnect peripheral: CBPeripheral,
        error: Error?
    ) {
        state = .failed(error?.localizedDescription ?? "Couldn't connect to the device.")
    }

    public func centralManager(
        _ central: CBCentralManager,
        didDisconnectPeripheral peripheral: CBPeripheral,
        error: Error?
    ) {
        reconnectPeripheralID = peripheral.identifier
        connectedPeripheral = nil
        state = .disconnected
    }
}

extension BluetoothBloodPressureManager: CBPeripheralDelegate {
    public func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard error == nil, let services = peripheral.services else {
            state = .failed(error?.localizedDescription ?? "Couldn't read services from the device.")
            return
        }
        for service in services where service.uuid == BloodPressureGATT.serviceUUID {
            peripheral.discoverCharacteristics(
                [BloodPressureGATT.measurementCharacteristicUUID],
                for: service
            )
        }
    }

    public func peripheral(
        _ peripheral: CBPeripheral,
        didDiscoverCharacteristicsFor service: CBService,
        error: Error?
    ) {
        guard error == nil, let characteristics = service.characteristics else {
            state = .failed(error?.localizedDescription ?? "Couldn't read characteristics from the device.")
            return
        }
        for characteristic in characteristics where characteristic.uuid == BloodPressureGATT.measurementCharacteristicUUID {
            peripheral.setNotifyValue(true, for: characteristic)
            state = .receivingReading(name: peripheral.name ?? "Blood pressure monitor")
        }
    }

    public func peripheral(
        _ peripheral: CBPeripheral,
        didUpdateValueFor characteristic: CBCharacteristic,
        error: Error?
    ) {
        guard characteristic.uuid == BloodPressureGATT.measurementCharacteristicUUID else { return }
        guard error == nil, let data = characteristic.value else {
            state = .failed(error?.localizedDescription ?? "The device sent an unreadable measurement.")
            return
        }

        do {
            let parsed = try BloodPressureMeasurementParser.parse(data)
            let (systolic, diastolic) = BloodPressureMeasurementParser.mmHg(from: parsed)
            let reading = BloodPressureReading(
                takenAt: parsed.timestamp ?? Date(),
                systolic: systolic,
                diastolic: diastolic,
                pulse: parsed.pulseRateBpm,
                source: .bluetoothCuff
            )
            delegate?.bluetoothManager(self, didReceiveReading: reading)
        } catch {
            state = .failed(error.localizedDescription)
        }
    }
}
