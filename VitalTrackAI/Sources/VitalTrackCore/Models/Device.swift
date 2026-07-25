import Foundation

public enum DeviceKind: String, Codable, Sendable, CaseIterable, Identifiable {
    case bloodPressureMonitor
    case scale
    case heartRateMonitor
    case unknown

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .bloodPressureMonitor: return "Blood pressure monitor"
        case .scale: return "Scale"
        case .heartRateMonitor: return "Heart rate monitor"
        case .unknown: return "Device"
        }
    }
}

public enum DeviceConnectionState: String, Codable, Sendable, CaseIterable {
    case disconnected
    case scanning
    case connecting
    case connected
    case failed
}

public struct Device: Identifiable, Codable, Sendable, Equatable, Hashable {
    public let id: UUID
    public var name: String
    public var kind: DeviceKind
    public var peripheralIdentifier: String?
    public var isFavorite: Bool
    public var lastConnectedAt: Date?
    public var connectionState: DeviceConnectionState
    public var manufacturer: String?

    public init(
        id: UUID = UUID(),
        name: String,
        kind: DeviceKind,
        peripheralIdentifier: String? = nil,
        isFavorite: Bool = false,
        lastConnectedAt: Date? = nil,
        connectionState: DeviceConnectionState = .disconnected,
        manufacturer: String? = nil
    ) {
        self.id = id
        self.name = name
        self.kind = kind
        self.peripheralIdentifier = peripheralIdentifier
        self.isFavorite = isFavorite
        self.lastConnectedAt = lastConnectedAt
        self.connectionState = connectionState
        self.manufacturer = manufacturer
    }
}
