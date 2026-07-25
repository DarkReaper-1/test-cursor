import XCTest
@testable import VitalTrackAIInsights
@testable import VitalTrackCore

final class InsightSafetyFilterTests: XCTestCase {
    func testStripsDiagnosisLanguageAndAppendsDisclaimer() async {
        let engine = HeuristicInsightEngine()
        let filter = InsightSafetyFilter()
        let dangerous = Insight(
            title: "You have hypertension",
            body: "This diagnoses arrhythmia and suggests treatment.",
            includesMedicalDisclaimer: false
        )
        let safe = filter.sanitize(dangerous)
        let combined = (safe.title + " " + safe.body).lowercased()
        XCTAssertFalse(combined.contains("you have hypertension"))
        XCTAssertFalse(combined.contains("diagnos"))
        XCTAssertTrue(safe.body.contains("not medical advice") || safe.body.contains("informational"))
        XCTAssertTrue(safe.includesMedicalDisclaimer)

        // Engine path should also avoid diagnosis wording on empty context.
        let insights = await engine.generateInsights(from: InsightContext())
        XCTAssertFalse(insights.isEmpty)
        for insight in insights {
            let text = (insight.title + insight.body).lowercased()
            XCTAssertFalse(text.contains("you have hypertension"))
            XCTAssertTrue(insight.includesMedicalDisclaimer)
        }
    }

    func testNeverClaimsCameraBP() async {
        let engine = HeuristicInsightEngine()
        let insights = await engine.generateInsights(from: InsightContext())
        for insight in insights {
            let text = insight.body.lowercased()
            XCTAssertFalse(text.contains("camera measures blood pressure"))
            XCTAssertFalse(text.contains("estimated blood pressure from camera"))
        }
    }
}
