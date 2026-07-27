import Foundation
import VitalTrackCore

enum TrendRange: Int, CaseIterable, Identifiable {
    case week = 7, month = 30, quarter = 90, year = 365
    var id: Int { rawValue }
    var label: String {
        switch self {
        case .week: return "7d"
        case .month: return "30d"
        case .quarter: return "90d"
        case .year: return "1y"
        }
    }
}

@MainActor
final class AnalyticsViewModel: ObservableObject {
    @Published var range: TrendRange = .week { didSet { Task { await load() } } }
    @Published private(set) var heartRate: [HeartRateReading] = []
    @Published private(set) var bloodPressure: [BloodPressureReading] = []
    @Published private(set) var weeklyAverageSystolic: Double?
    @Published private(set) var monthlyAverageSystolic: Double?
    @Published private(set) var yearlyAverageSystolic: Double?

    private let repository: HealthRepository

    init(repository: HealthRepository) {
        self.repository = repository
    }

    func load() async {
        let since = Date().addingTimeInterval(-Double(range.rawValue) * 86400)
        heartRate = (try? await repository.heartRateReadings(since: since))?.reversed() ?? []
        bloodPressure = (try? await repository.bloodPressureReadings(since: since))?.reversed() ?? []

        async let weekly = repository.bloodPressureReadings(since: Date().addingTimeInterval(-7 * 86400))
        async let monthly = repository.bloodPressureReadings(since: Date().addingTimeInterval(-30 * 86400))
        async let yearly = repository.bloodPressureReadings(since: Date().addingTimeInterval(-365 * 86400))

        weeklyAverageSystolic = average((try? await weekly) ?? [])
        monthlyAverageSystolic = average((try? await monthly) ?? [])
        yearlyAverageSystolic = average((try? await yearly) ?? [])
    }

    private func average(_ readings: [BloodPressureReading]) -> Double? {
        guard !readings.isEmpty else { return nil }
        return readings.map { Double($0.systolic) }.reduce(0, +) / Double(readings.count)
    }
}
