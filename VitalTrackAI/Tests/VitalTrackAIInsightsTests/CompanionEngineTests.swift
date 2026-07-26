import XCTest
@testable import VitalTrackAIInsights
@testable import VitalTrackCore

final class CompanionEngineTests: XCTestCase {
    func testCoachAnswersCameraBPQuestionHonestly() async {
        let engine = CoachAnswerEngine()
        let reply = await engine.answer(
            question: "Can the camera measure blood pressure?",
            context: CompanionContext()
        )
        XCTAssertEqual(reply.role, .assistant)
        XCTAssertTrue(reply.text.lowercased().contains("cannot") || reply.text.lowercased().contains("not"))
        XCTAssertTrue(reply.text.contains("FDA-cleared") || reply.text.lowercased().contains("cuff"))
        XCTAssertTrue(reply.text.lowercased().contains("not medical advice") || reply.text.lowercased().contains("informational"))
    }

    func testScoreIncompleteWithoutData() async {
        let engine = ScoreEngine()
        let score = await engine.computeDailyScore(from: CompanionContext())
        XCTAssertEqual(score.confidence, .incomplete)
        XCTAssertNil(score.value)
    }

    func testPulseAnalysisExplainsDelta() async {
        let engine = ScoreEngine()
        let now = Date()
        var samples: [HeartRateSample] = []
        for i in 0..<7 {
            samples.append(
                HeartRateSample(
                    bpm: 70,
                    recordedAt: Calendar.current.date(byAdding: .day, value: -i, to: now) ?? now,
                    source: .cameraPPG,
                    isResting: true
                )
            )
        }
        let latest = HeartRateSample(bpm: 82, source: .cameraPPG, isResting: true)
        samples.insert(latest, at: 0)
        let analysis = await engine.analyzePulse(
            latest,
            context: CompanionContext(heartRate: samples),
            qualityHint: "Good fingertip signal"
        )
        XCTAssertEqual(analysis.bpm, 82)
        XCTAssertNotNil(analysis.vsWeekAverage)
        XCTAssertFalse(analysis.possibleCauses.isEmpty)
        XCTAssertTrue(analysis.explanation.lowercased().contains("not blood pressure") || analysis.explanation.lowercased().contains("heart rate"))
    }

    func testSuggestedPromptsCount() {
        XCTAssertGreaterThanOrEqual(CoachAnswerEngine().suggestedPrompts().count, 8)
    }
}
