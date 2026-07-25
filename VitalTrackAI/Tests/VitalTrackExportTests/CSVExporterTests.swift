import XCTest
@testable import VitalTrackExport
@testable import VitalTrackCore

final class CSVExporterTests: XCTestCase {
    func testBloodPressureCSVFormat() async throws {
        let exporter = CSVExporter()
        let readings = [
            BloodPressureReading(
                id: UUID(uuidString: "11111111-1111-1111-1111-111111111111")!,
                systolic: 120,
                diastolic: 80,
                pulse: 70,
                recordedAt: Date(timeIntervalSince1970: 1_700_000_000),
                source: .manual,
                notes: "home"
            )
        ]
        let data = try await exporter.exportBloodPressureCSV(readings)
        let text = String(data: data, encoding: .utf8)!
        XCTAssertTrue(text.hasPrefix("id,systolic,diastolic,pulse,recordedAt,source"))
        XCTAssertTrue(text.contains("120,80,70"))
        XCTAssertTrue(text.contains("manual"))
        XCTAssertFalse(text.lowercased().contains("camera"))
    }

    func testDoctorReportIncludesDisclaimers() async throws {
        let formatter = DoctorReportFormatter()
        let text = try await formatter.formatSummary(
            bloodPressure: [BloodPressureReading(systolic: 118, diastolic: 76, source: .manual)],
            heartRate: [HeartRateSample(bpm: 72, source: .cameraPPG)],
            patientLabel: "Alex"
        )
        XCTAssertTrue(text.contains("FDA-cleared"))
        XCTAssertTrue(text.contains("not medical advice") || text.contains("informational"))
        XCTAssertTrue(text.contains("PPG"))
    }
}
