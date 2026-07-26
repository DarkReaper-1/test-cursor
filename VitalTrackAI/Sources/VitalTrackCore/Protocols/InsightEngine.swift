import Foundation

public struct InsightContext: Sendable {
    public var bloodPressure: [BloodPressureReading]
    public var heartRate: [HeartRateSample]
    public var hrv: [HRVSample]
    public var checkIns: [CheckIn]
    public var medications: [Medication]
    public var doses: [MedicationDose]
    public var lastLogDate: Date?

    public init(
        bloodPressure: [BloodPressureReading] = [],
        heartRate: [HeartRateSample] = [],
        hrv: [HRVSample] = [],
        checkIns: [CheckIn] = [],
        medications: [Medication] = [],
        doses: [MedicationDose] = [],
        lastLogDate: Date? = nil
    ) {
        self.bloodPressure = bloodPressure
        self.heartRate = heartRate
        self.hrv = hrv
        self.checkIns = checkIns
        self.medications = medications
        self.doses = doses
        self.lastLogDate = lastLogDate
    }
}

public protocol InsightEngine: Sendable {
    func generateInsights(from context: InsightContext) async -> [Insight]
}
