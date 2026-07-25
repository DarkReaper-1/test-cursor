import Foundation

public struct InsightContext: Sendable {
    public var bloodPressure: [BloodPressureReading]
    public var heartRate: [HeartRateSample]
    public var hrv: [HRVSample]
    public var lastLogDate: Date?

    public init(
        bloodPressure: [BloodPressureReading] = [],
        heartRate: [HeartRateSample] = [],
        hrv: [HRVSample] = [],
        lastLogDate: Date? = nil
    ) {
        self.bloodPressure = bloodPressure
        self.heartRate = heartRate
        self.hrv = hrv
        self.lastLogDate = lastLogDate
    }
}

public protocol InsightEngine: Sendable {
    func generateInsights(from context: InsightContext) async -> [Insight]
}
