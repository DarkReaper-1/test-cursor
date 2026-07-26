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
        XCTAssertTrue(text.contains("medicationTiming"))
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

    func testRichDoctorReportIncludesMedsAndLifestyle() async throws {
        let formatter = DoctorReportFormatter()
        let med = Medication(name: "Lisinopril", dosage: "10 mg")
        let text = try await formatter.formatRichSummary(
            DoctorReportInput(
                bloodPressure: [
                    BloodPressureReading(
                        systolic: 132,
                        diastolic: 84,
                        source: .manual,
                        medicationTiming: .beforeMedication
                    )
                ],
                heartRate: [],
                medications: [med],
                doses: [MedicationDose(medicationId: med.id, medicationName: med.name, status: .taken)],
                checkIns: [CheckIn(waterGlasses: 5, sleepHours: 7, sodiumMg: 1600, exerciseMinutes: 35)],
                stressChecks: [StressCheck(stressScore: 6, anxietyScore: 5)],
                patientLabel: "Alex"
            )
        )
        XCTAssertTrue(text.contains("Lisinopril"))
        XCTAssertTrue(text.contains("MEDICATIONS"))
        XCTAssertTrue(text.contains("LIFESTYLE"))
        XCTAssertTrue(text.contains("STRESS") || text.contains("ANXIETY") || text.contains("stress"))
        XCTAssertTrue(text.contains("Before medication") || text.contains("before"))
    }

    func testStressCheckCSVFormat() async throws {
        let exporter = CSVExporter()
        let data = try await exporter.exportStressCheckCSV([
            StressCheck(stressScore: 4, anxietyScore: 5, bodySignals: [.tenseMuscles], notes: "after meeting")
        ])
        let text = String(data: data, encoding: .utf8)!
        XCTAssertTrue(text.contains("stressScore,anxietyScore"))
        XCTAssertTrue(text.contains("4,5"))
        XCTAssertTrue(text.contains("tenseMuscles"))
    }
}
