import Foundation

public protocol Exporting: Sendable {
    func exportBloodPressureCSV(_ readings: [BloodPressureReading]) async throws -> Data
    func exportHeartRateCSV(_ samples: [HeartRateSample]) async throws -> Data
}

public struct DoctorReportInput: Sendable {
    public var bloodPressure: [BloodPressureReading]
    public var heartRate: [HeartRateSample]
    public var medications: [Medication]
    public var doses: [MedicationDose]
    public var checkIns: [CheckIn]
    public var patientLabel: String?

    public init(
        bloodPressure: [BloodPressureReading] = [],
        heartRate: [HeartRateSample] = [],
        medications: [Medication] = [],
        doses: [MedicationDose] = [],
        checkIns: [CheckIn] = [],
        patientLabel: String? = nil
    ) {
        self.bloodPressure = bloodPressure
        self.heartRate = heartRate
        self.medications = medications
        self.doses = doses
        self.checkIns = checkIns
        self.patientLabel = patientLabel
    }
}

public protocol DoctorReportFormatting: Sendable {
    func formatSummary(
        bloodPressure: [BloodPressureReading],
        heartRate: [HeartRateSample],
        patientLabel: String?
    ) async throws -> String

    func formatRichSummary(_ input: DoctorReportInput) async throws -> String
}

public protocol PDFReportBuilding: Sendable {
    func buildReportPDF(
        title: String,
        body: String
    ) async throws -> Data
}
