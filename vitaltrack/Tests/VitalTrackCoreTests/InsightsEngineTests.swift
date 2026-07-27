import XCTest
@testable import VitalTrackCore

final class InsightsEngineTests: XCTestCase {
    func testFlagsMissedBloodPressureReading() async throws {
        let repository = InMemoryHealthRepository(
            bloodPressure: [
                BloodPressureReading(takenAt: Date().addingTimeInterval(-8 * 86400), systolic: 122, diastolic: 78),
            ]
        )
        let engine = InsightsEngine(repository: repository)
        let insights = try await engine.buildInsights()

        XCTAssertTrue(insights.contains { $0.text.contains("haven't logged a blood pressure reading") })
    }

    func testReportsNormalReferenceRangeAsPositive() async throws {
        let repository = InMemoryHealthRepository(
            bloodPressure: [
                BloodPressureReading(takenAt: Date(), systolic: 115, diastolic: 75),
            ]
        )
        let engine = InsightsEngine(repository: repository)
        let insights = try await engine.buildInsights()

        let referenceInsight = insights.first { $0.text.contains("reference range") }
        XCTAssertNotNil(referenceInsight)
        XCTAssertEqual(referenceInsight?.tone, .positive)
    }

    func testFallsBackToPromptWhenNoData() async throws {
        let repository = InMemoryHealthRepository()
        let engine = InsightsEngine(repository: repository)
        let insights = try await engine.buildInsights()

        XCTAssertEqual(insights.count, 1)
        XCTAssertTrue(insights[0].text.contains("Log a few more readings"))
    }
}
