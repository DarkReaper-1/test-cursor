import XCTest
@testable import VitalTrackAIInsights
@testable import VitalTrackCore

final class StressCheckTests: XCTestCase {
    func testIntensityBands() {
        XCTAssertEqual(StressCheck(stressScore: 2, anxietyScore: 2).intensityBand, .calm)
        XCTAssertEqual(StressCheck(stressScore: 4, anxietyScore: 5).intensityBand, .mild)
        XCTAssertEqual(StressCheck(stressScore: 7, anxietyScore: 6).intensityBand, .moderate)
        XCTAssertEqual(StressCheck(stressScore: 9, anxietyScore: 8).intensityBand, .high)
    }

    func testScoreEnginePrefersStressCheck() async {
        let engine = ScoreEngine()
        let check = StressCheck(stressScore: 8, anxietyScore: 8)
        let score = await engine.computeDailyScore(
            from: CompanionContext(stressChecks: [check])
        )
        XCTAssertEqual(score.stress.level, 3)
        XCTAssertTrue(score.stress.label.lowercased().contains("high") || score.stress.label.lowercased().contains("self-report"))
        XCTAssertEqual(score.stress.confidence, .high)
        XCTAssertTrue(score.stress.explanation.lowercased().contains("not a clinical"))
    }

    func testCoachExplainsAnxietyScore() async {
        let engine = CoachAnswerEngine()
        let reply = await engine.answer(
            question: "What does my anxiety score mean?",
            context: CompanionContext(stressChecks: [StressCheck(stressScore: 5, anxietyScore: 6)])
        )
        XCTAssertTrue(reply.text.contains("5") || reply.text.contains("6") || reply.text.lowercased().contains("self"))
        XCTAssertTrue(reply.text.lowercased().contains("not a diagnosis") || reply.text.lowercased().contains("not a clinical"))
    }

    func testStressLinkedInsightWhenPaired() async {
        let engine = HeuristicInsightEngine()
        let now = Date()
        var bp: [BloodPressureReading] = []
        var stress: [StressCheck] = []
        for i in 0..<6 {
            let day = Calendar.current.date(byAdding: .day, value: -i, to: now) ?? now
            let high = i % 2 == 0
            bp.append(BloodPressureReading(systolic: high ? 144 : 126, diastolic: 86, recordedAt: day, source: .manual))
            stress.append(StressCheck(stressScore: high ? 8 : 3, anxietyScore: high ? 8 : 3, recordedAt: day))
        }
        let insights = await engine.generateInsights(
            from: InsightContext(bloodPressure: bp, stressChecks: stress)
        )
        XCTAssertTrue(insights.contains { $0.relatedMetric == "stress" })
    }
}
