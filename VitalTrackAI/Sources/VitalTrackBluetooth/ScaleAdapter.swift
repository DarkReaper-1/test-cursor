import Foundation
import VitalTrackCore

/// Stub adapter for body composition / weight scales (future).
public final class ScaleAdapter: BluetoothDeviceAdapting, @unchecked Sendable {
    public let supportedKind: DeviceKind = .scale
    public private(set) var lastWeightKg: Double?

    public init() {}

    public func startScan() async throws {
        throw VitalTrackError.featureUnavailable("Scale pairing is not available yet. Blood pressure cuffs are supported.")
    }

    public func stopScan() async {}

    public func connect(peripheralIdentifier: String) async throws {
        _ = peripheralIdentifier
        throw VitalTrackError.featureUnavailable("Scale connection is a stub. Use an FDA-cleared BP monitor for blood pressure.")
    }

    public func disconnect() async {
        lastWeightKg = nil
    }
}
