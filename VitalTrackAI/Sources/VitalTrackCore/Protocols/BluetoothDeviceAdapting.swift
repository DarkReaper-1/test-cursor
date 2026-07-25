import Foundation

public protocol BluetoothDeviceAdapting: Sendable {
    var supportedKind: DeviceKind { get }
    func startScan() async throws
    func stopScan() async
    func connect(peripheralIdentifier: String) async throws
    func disconnect() async
}

public protocol BluetoothManaging: Sendable {
    var isPoweredOn: Bool { get async }
    func startScanning(for kinds: [DeviceKind]) async throws
    func stopScanning() async
    func connect(_ device: Device) async throws
    func disconnect(_ device: Device) async
}
