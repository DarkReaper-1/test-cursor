import Foundation

public enum DashboardCardKind: String, Codable, Sendable, CaseIterable, Identifiable {
    case latestBloodPressure
    case latestHeartRate
    case weeklyBPTrend
    case restingHRTrend
    case insightsPreview
    case devicesStatus
    case reminders
    case hrvSnapshot

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .latestBloodPressure: return "Latest blood pressure"
        case .latestHeartRate: return "Latest heart rate"
        case .weeklyBPTrend: return "Weekly BP trend"
        case .restingHRTrend: return "Resting heart rate"
        case .insightsPreview: return "Insights"
        case .devicesStatus: return "Devices"
        case .reminders: return "Reminders"
        case .hrvSnapshot: return "HRV snapshot"
        }
    }
}
