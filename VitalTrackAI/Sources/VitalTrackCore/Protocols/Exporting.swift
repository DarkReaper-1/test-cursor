import Foundation

public protocol Exporting: Sendable {
    func exportBloodPressureCSV(_ readings: [BloodPressureReading]) async throws -> Data
    func exportHeartRateCSV(_ samples: [HeartRateSample]) async throws -> Data
}

public protocol DoctorReportFormatting: Sendable {
    func formatSummary(
        bloodPressure: [BloodPressureReading],
        heartRate: [HeartRateSample],
        patientLabel: String?
    ) async throws -> String
}

public protocol PDFReportBuilding: Sendable {
    func buildReportPDF(
        title: String,
        body: String
    ) async throws -> Data
}
