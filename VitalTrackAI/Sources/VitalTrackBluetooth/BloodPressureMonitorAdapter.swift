import Foundation
import VitalTrackCore

#if canImport(CoreBluetooth)
import CoreBluetooth
#endif

/// Adapter for the Bluetooth SIG Blood Pressure service.
public final class BloodPressureMonitorAdapter: BluetoothDeviceAdapting, @unchecked Sendable {
#if canImport(CoreBluetooth)
    /// Bluetooth SIG Blood Pressure Service
    public static let serviceUUID = CBUUID(string: "1810")
    /// Blood Pressure Measurement characteristic
    public static let measurementUUID = CBUUID(string: "2A35")
#else
    public static let serviceUUIDString = "1810"
    public static let measurementUUIDString = "2A35"
#endif

    public let supportedKind: DeviceKind = .bloodPressureMonitor
    public private(set) var lastReading: BloodPressureReading?

    public init() {}

    public func startScan() async throws {
        // Scanning is owned by BluetoothManager; adapter validates service support.
    }

    public func stopScan() async {}

    public func connect(peripheralIdentifier: String) async throws {
        _ = peripheralIdentifier
    }

    public func disconnect() async {
        lastReading = nil
    }

    /// Parses a simplified BP measurement payload (mmHg integers).
    /// Real devices use IEEE-11073 SFLOATs; production code should use a full parser.
    public func parseDemoMeasurement(systolic: Int, diastolic: Int, pulse: Int?, at date: Date = .now) throws -> BloodPressureReading {
        let reading = BloodPressureReading(
            systolic: systolic,
            diastolic: diastolic,
            pulse: pulse,
            recordedAt: date,
            source: .bluetoothCuff,
            deviceName: "BLE Blood Pressure Monitor"
        )
        try TrustPolicy.assertValidBPSource(reading.source)
        lastReading = reading
        return reading
    }
}
