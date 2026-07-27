import CoreBluetooth
import Foundation
import VitalTrackCore

@MainActor
final class DevicesViewModel: NSObject, ObservableObject {
    @Published private(set) var state: BluetoothDeviceState = .disconnected
    @Published private(set) var discoveredPeripherals: [CBPeripheral] = []
    @Published private(set) var lastReceivedReading: BloodPressureReading?

    private let manager = BluetoothBloodPressureManager()
    var onReadingReceived: ((BloodPressureReading) -> Void)?

    override init() {
        super.init()
        manager.delegate = self
    }

    func startScanning() {
        discoveredPeripherals.removeAll()
        manager.startScanning()
    }

    func stopScanning() {
        manager.stopScanning()
    }

    func connect(to peripheral: CBPeripheral) {
        manager.connect(to: peripheral)
    }

    func reconnect() {
        manager.reconnectToLastKnownDevice()
    }

    func disconnect() {
        manager.disconnect()
    }
}

extension DevicesViewModel: BluetoothBloodPressureManagerDelegate {
    func bluetoothManager(_ manager: BluetoothBloodPressureManager, didChangeState newState: BluetoothDeviceState) {
        state = newState
    }

    func bluetoothManager(_ manager: BluetoothBloodPressureManager, didDiscoverPeripherals peripherals: [CBPeripheral]) {
        discoveredPeripherals = peripherals
    }

    func bluetoothManager(_ manager: BluetoothBloodPressureManager, didReceiveReading reading: BloodPressureReading) {
        lastReceivedReading = reading
        onReadingReceived?(reading)
    }
}
