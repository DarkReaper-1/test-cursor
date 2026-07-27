import Foundation
import VitalTrackCore

@MainActor
final class HistoryViewModel: ObservableObject {
    @Published private(set) var heartRate: [HeartRateReading] = []
    @Published private(set) var bloodPressure: [BloodPressureReading] = []

    private let repository: HealthRepository

    init(repository: HealthRepository) {
        self.repository = repository
    }

    func load() async {
        heartRate = (try? await repository.heartRateReadings(since: nil)) ?? []
        bloodPressure = (try? await repository.bloodPressureReadings(since: nil)) ?? []
    }

    func deleteHeartRate(at offsets: IndexSet) async {
        for index in offsets {
            try? await repository.deleteHeartRate(id: heartRate[index].id)
        }
        await load()
    }

    func deleteBloodPressure(at offsets: IndexSet) async {
        for index in offsets {
            try? await repository.deleteBloodPressure(id: bloodPressure[index].id)
        }
        await load()
    }
}
