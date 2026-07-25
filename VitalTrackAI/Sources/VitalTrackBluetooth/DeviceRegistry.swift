import Foundation
import VitalTrackCore

public final class DeviceRegistry: @unchecked Sendable {
    private let lock = NSLock()
    private var devices: [UUID: Device] = [:]

    public init() {}

    public func register(_ device: Device) {
        lock.lock()
        defer { lock.unlock() }
        var stored = device
        stored.lastConnectedAt = Date()
        stored.connectionState = .connected
        devices[stored.id] = stored
    }

    public func markDisconnected(id: UUID) {
        lock.lock()
        defer { lock.unlock() }
        if var device = devices[id] {
            device.connectionState = .disconnected
            devices[id] = device
        }
    }

    public func allDevices() -> [Device] {
        lock.lock()
        defer { lock.unlock() }
        return Array(devices.values).sorted { ($0.lastConnectedAt ?? .distantPast) > ($1.lastConnectedAt ?? .distantPast) }
    }

    public func clear() {
        lock.lock()
        defer { lock.unlock() }
        devices.removeAll()
    }
}
