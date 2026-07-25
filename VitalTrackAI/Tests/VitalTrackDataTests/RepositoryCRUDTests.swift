import XCTest
@testable import VitalTrackData
@testable import VitalTrackCore

final class RepositoryCRUDTests: XCTestCase {
    func testBloodPressureCRUD() async throws {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let repo = InMemoryBloodPressureRepository(filename: "bp.json", directory: dir)

        let reading = BloodPressureReading(systolic: 120, diastolic: 80, source: .manual)
        try await repo.save(reading)
        let all = try await repo.fetchAll()
        XCTAssertEqual(all.count, 1)
        XCTAssertEqual(all.first?.id, reading.id)

        var updated = reading
        updated.systolic = 118
        try await repo.save(updated)
        let fetched = try await repo.fetch(id: reading.id)
        XCTAssertEqual(fetched?.systolic, 118)

        try await repo.delete(id: reading.id)
        let empty = try await repo.fetchAll()
        XCTAssertTrue(empty.isEmpty)
    }

    func testRejectsCameraBPSource() async {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let repo = InMemoryBloodPressureRepository(filename: "bp.json", directory: dir)
        let bad = BloodPressureReading(systolic: 120, diastolic: 80, source: .cameraPPG)
        do {
            try await repo.save(bad)
            XCTFail("Expected camera BP source to fail")
        } catch let error as VitalTrackError {
            guard case .invalidBloodPressureSource = error else {
                return XCTFail("Wrong error \(error)")
            }
        } catch {
            XCTFail("Unexpected error \(error)")
        }
    }

    func testHeartRateCRUD() async throws {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let repo = InMemoryHeartRateRepository(filename: "hr.json", directory: dir)
        try await repo.save(HeartRateSample(bpm: 70, source: .cameraPPG))
        let recent = try await repo.fetchRecent(limit: 5)
        XCTAssertEqual(recent.count, 1)
    }

    func testCSVImport() throws {
        let csv = """
        date,systolic,diastolic,pulse
        2024-01-02T10:00:00Z,122,78,70
        2024-01-03T10:00:00Z,118,76,68
        """
        let service = CSVImportService()
        let readings = try service.importBloodPressure(from: csv)
        XCTAssertEqual(readings.count, 2)
        XCTAssertEqual(readings[0].source, .csvImport)
        XCTAssertEqual(readings[0].systolic, 122)
    }
}
