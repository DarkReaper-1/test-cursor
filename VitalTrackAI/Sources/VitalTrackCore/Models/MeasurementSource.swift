import Foundation

/// Where a measurement originated. Camera is never a BP source.
public enum MeasurementSource: String, Codable, Sendable, CaseIterable, Identifiable {
    case manual
    case bluetoothCuff
    case healthKit
    case csvImport
    case cameraPPG
    case appleWatch
    case unknown

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .manual: return "Manual entry"
        case .bluetoothCuff: return "Bluetooth cuff"
        case .healthKit: return "Apple Health"
        case .csvImport: return "CSV import"
        case .cameraPPG: return "Camera PPG"
        case .appleWatch: return "Apple Watch"
        case .unknown: return "Unknown"
        }
    }

    /// Valid sources for blood pressure. Camera and Watch PPG are excluded by design.
    public var isValidBloodPressureSource: Bool {
        switch self {
        case .manual, .bluetoothCuff, .healthKit, .csvImport:
            return true
        case .cameraPPG, .appleWatch, .unknown:
            return false
        }
    }

    public var isHeartRateSource: Bool {
        switch self {
        case .cameraPPG, .appleWatch, .healthKit, .manual, .unknown:
            return true
        case .bluetoothCuff, .csvImport:
            return true
        }
    }
}
