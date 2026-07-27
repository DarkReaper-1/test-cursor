import Foundation
import VitalTrackCore

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published private(set) var latestHeartRate: HeartRateReading?
    @Published private(set) var latestBloodPressure: BloodPressureReading?
    @Published private(set) var weeklyHeartRateAverage: Double?
    @Published private(set) var isLoading = true

    private let repository: HealthRepository

    init(repository: HealthRepository) {
        self.repository = repository
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }

        async let hr = repository.latestHeartRate()
        async let bp = repository.latestBloodPressure()
        async let weekly = repository.heartRateReadings(since: Date().addingTimeInterval(-7 * 86400))

        latestHeartRate = try? await hr
        latestBloodPressure = try? await bp
        if let weeklyReadings = try? await weekly, !weeklyReadings.isEmpty {
            weeklyHeartRateAverage = weeklyReadings.map { Double($0.bpm) }.reduce(0, +) / Double(weeklyReadings.count)
        } else {
            weeklyHeartRateAverage = nil
        }
    }
}
