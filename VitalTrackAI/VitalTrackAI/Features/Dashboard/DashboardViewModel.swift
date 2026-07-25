import Foundation
import VitalTrackCore
import VitalTrackData

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published var latestBP: BloodPressureReading?
    @Published var latestHR: HeartRateSample?
    @Published var insights: [Insight] = []
    @Published var errorMessage: String?

    private let readingStore: ReadingStore
    private let insightEngine: any InsightEngine

    init(readingStore: ReadingStore, insightEngine: any InsightEngine) {
        self.readingStore = readingStore
        self.insightEngine = insightEngine
    }

    func refresh() async {
        do {
            latestBP = try await readingStore.latestBloodPressure()
            latestHR = try await readingStore.latestHeartRate()
            let context = try await readingStore.insightContext()
            insights = await insightEngine.generateInsights(from: context)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
