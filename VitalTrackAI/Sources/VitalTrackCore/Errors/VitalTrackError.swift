import Foundation

public enum VitalTrackError: LocalizedError, Equatable, Sendable {
    case invalidBloodPressureSource(MeasurementSource)
    case invalidReading(String)
    case persistenceFailed(String)
    case notFound(String)
    case healthKitUnavailable
    case healthKitDenied
    case bluetoothUnavailable
    case bluetoothDisconnected(String)
    case bluetoothConnectionFailed(String)
    case exportFailed(String)
    case importFailed(String)
    case notificationPermissionDenied
    case featureUnavailable(String)
    case unknown(String)

    public var errorDescription: String? {
        switch self {
        case .invalidBloodPressureSource(let source):
            return "\(source.displayName) cannot provide blood pressure. Use an FDA-cleared external monitor, manual entry, Apple Health, or CSV."
        case .invalidReading(let detail):
            return "Invalid reading: \(detail)"
        case .persistenceFailed(let detail):
            return "Could not save data: \(detail)"
        case .notFound(let detail):
            return "Not found: \(detail)"
        case .healthKitUnavailable:
            return "Apple Health is not available on this device."
        case .healthKitDenied:
            return "Apple Health access was denied. You can enable it in Settings."
        case .bluetoothUnavailable:
            return "Bluetooth is unavailable. Turn on Bluetooth to connect a cuff."
        case .bluetoothDisconnected(let name):
            return "Disconnected from \(name)."
        case .bluetoothConnectionFailed(let detail):
            return "Could not connect: \(detail)"
        case .exportFailed(let detail):
            return "Export failed: \(detail)"
        case .importFailed(let detail):
            return "Import failed: \(detail)"
        case .notificationPermissionDenied:
            return "Notification permission was denied."
        case .featureUnavailable(let detail):
            return detail
        case .unknown(let detail):
            return detail
        }
    }

    public var recoverySuggestion: String? {
        switch self {
        case .invalidBloodPressureSource:
            return "Enter BP from a cuff reading, sync an FDA-cleared Bluetooth monitor, import from Apple Health, or upload a CSV. The camera only measures heart rate via PPG."
        case .invalidReading:
            return "Check systolic and diastolic values (typical adult range roughly 70–250 / 40–150 mmHg) and try again."
        case .persistenceFailed:
            return "Free some storage and retry. If the problem continues, restart the app."
        case .notFound:
            return "Refresh the list or return to the previous screen."
        case .healthKitUnavailable:
            return "Continue with manual entry or Bluetooth cuff pairing."
        case .healthKitDenied:
            return "Open Settings → Health → Data Access & Devices → VitalTrack AI and allow Blood Pressure and Heart Rate."
        case .bluetoothUnavailable:
            return "Enable Bluetooth in Control Center, then retry scanning for your cuff."
        case .bluetoothDisconnected:
            return "Move closer to the monitor, ensure it is powered on, and tap Connect again."
        case .bluetoothConnectionFailed:
            return "Forget the device in iOS Bluetooth settings if needed, then pair again from Devices."
        case .exportFailed:
            return "Try exporting fewer rows, or share via CSV instead of PDF."
        case .importFailed:
            return "Confirm the CSV has systolic, diastolic, and date columns, then try again."
        case .notificationPermissionDenied:
            return "Enable notifications in Settings if you want logging reminders."
        case .featureUnavailable:
            return "This feature is unavailable right now. Other logging options still work."
        case .unknown:
            return "Try again. If it persists, contact support with the steps you took."
        }
    }
}
