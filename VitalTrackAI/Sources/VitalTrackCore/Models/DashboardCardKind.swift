import Foundation

public enum DashboardCardKind: String, Codable, Sendable, CaseIterable, Identifiable {
    case dailyHealthScore
    case recoveryScore
    case latestBloodPressure
    case latestHeartRate
    case aiInsightOfDay
    case dailySummary
    case weeklyTrend
    case hydration
    case todayGoal
    case healthStreak
    case recentMeasurements
    case quickScan
    case stressEstimate
    // Legacy aliases kept for settings compatibility
    case weeklyBPTrend
    case restingHRTrend
    case insightsPreview
    case devicesStatus
    case reminders
    case hrvSnapshot

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .dailyHealthScore: return "Daily health score"
        case .recoveryScore: return "Recovery"
        case .latestBloodPressure: return "Latest blood pressure"
        case .latestHeartRate: return "Heart rate"
        case .aiInsightOfDay: return "AI insight of the day"
        case .dailySummary: return "Today’s summary"
        case .weeklyTrend: return "Weekly trend"
        case .hydration: return "Hydration"
        case .todayGoal: return "Today’s goal"
        case .healthStreak: return "Health streak"
        case .recentMeasurements: return "Recent measurements"
        case .quickScan: return "Quick scan"
        case .stressEstimate: return "Stress estimate"
        case .weeklyBPTrend: return "Weekly BP trend"
        case .restingHRTrend: return "Resting heart rate"
        case .insightsPreview: return "Insights"
        case .devicesStatus: return "Devices"
        case .reminders: return "Reminders"
        case .hrvSnapshot: return "HRV snapshot"
        }
    }

    /// Default living Home layout for the companion experience.
    public static var companionDefaults: [DashboardCardKind] {
        [
            .dailyHealthScore,
            .recoveryScore,
            .aiInsightOfDay,
            .quickScan,
            .latestHeartRate,
            .latestBloodPressure,
            .hydration,
            .todayGoal,
            .healthStreak,
            .dailySummary,
            .recentMeasurements,
            .weeklyTrend
        ]
    }
}
