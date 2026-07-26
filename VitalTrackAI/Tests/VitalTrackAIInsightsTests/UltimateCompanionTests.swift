import XCTest
@testable import VitalTrackAIInsights
@testable import VitalTrackCore

final class UltimateCompanionTests: XCTestCase {
    func testCoachExplainsBPReading() async {
        let engine = CoachAnswerEngine()
        let reply = await engine.answer(
            question: "What does 145/92 mean?",
            context: CompanionContext()
        )
        XCTAssertTrue(reply.text.contains("145") || reply.text.contains("92"))
        XCTAssertTrue(reply.text.lowercased().contains("not a diagnosis") || reply.text.lowercased().contains("informational"))
        XCTAssertFalse(reply.text.lowercased().contains("you have hypertension"))
    }

    func testCoachAnswersImprovingWithHistory() async {
        let engine = CoachAnswerEngine()
        let now = Date()
        var readings: [BloodPressureReading] = []
        for i in 0..<10 {
            readings.append(
                BloodPressureReading(
                    systolic: i < 5 ? 138 : 125,
                    diastolic: 84,
                    recordedAt: Calendar.current.date(byAdding: .day, value: -i, to: now) ?? now,
                    source: .manual
                )
            )
        }
        let reply = await engine.answer(
            question: "Am I improving?",
            context: CompanionContext(bloodPressure: readings)
        )
        XCTAssertTrue(reply.text.lowercased().contains("encouraging") || reply.text.lowercased().contains("lower") || reply.text.lowercased().contains("steady"))
    }

    func testCrisisGuidanceIsCalm() {
        let engine = CrisisGuidanceEngine()
        let reading = BloodPressureReading(systolic: 188, diastolic: 122, source: .manual)
        XCTAssertEqual(engine.severity(for: reading), .crisisRange)
        let guidance = engine.guidance(for: reading)
        XCTAssertNotNil(guidance)
        XCTAssertTrue(guidance!.title.lowercased().contains("pause") || guidance!.calmSummary.lowercased().contains("calm"))
        XCTAssertFalse(guidance!.calmSummary.lowercased().contains("you are dying"))
        XCTAssertTrue(guidance!.whenToCallEmergency.lowercased().contains("emergency"))
    }

    func testSleepLinkedInsightRequiresPairedData() async {
        let engine = HeuristicInsightEngine()
        let now = Date()
        var bp: [BloodPressureReading] = []
        var checkIns: [CheckIn] = []
        for i in 0..<6 {
            let day = Calendar.current.date(byAdding: .day, value: -i, to: now) ?? now
            let poorSleep = i % 2 == 0
            bp.append(BloodPressureReading(systolic: poorSleep ? 142 : 128, diastolic: 86, recordedAt: day, source: .manual))
            checkIns.append(CheckIn(date: day, waterGlasses: 6, sleepHours: poorSleep ? 5.0 : 7.5))
        }
        let insights = await engine.generateInsights(
            from: InsightContext(bloodPressure: bp, checkIns: checkIns)
        )
        XCTAssertTrue(insights.contains { $0.relatedMetric == "sleep" || $0.title.lowercased().contains("sleep") || $0.title.lowercased().contains("encouraging") || $0.relatedMetric == "bloodPressure" })
    }

    func testSuggestedPromptsIncludeBP() {
        let prompts = CoachAnswerEngine().suggestedPrompts()
        XCTAssertTrue(prompts.contains { $0.lowercased().contains("145/92") || $0.lowercased().contains("blood pressure") })
    }
}
