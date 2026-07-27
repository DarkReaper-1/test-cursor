import XCTest
@testable import VitalTrackCore

final class PPGProcessorTests: XCTestCase {
    func testRecoversBpmFromCleanSyntheticSignal() {
        let processor = PPGProcessor()
        let targetBpm = 72.0
        let sampleRateHz = 30.0
        let durationSeconds = 15.0
        let freqHz = targetBpm / 60.0

        var lastReading: PPGReading?
        let totalSamples = Int(durationSeconds * sampleRateHz)
        for i in 0..<totalSamples {
            let tMs = Double(i) * (1000.0 / sampleRateHz)
            let value = 150 + 8 * sin(2 * Double.pi * freqHz * (tMs / 1000))
            lastReading = processor.addSample(timestampMs: tMs, luminance: value)
        }

        XCTAssertNotNil(lastReading?.bpm)
        if let bpm = lastReading?.bpm {
            XCTAssertTrue((66...78).contains(bpm), "Expected bpm near 72, got \(bpm)")
        }
    }

    func testNoConfidentBpmForPureNoise() {
        let processor = PPGProcessor()
        var lastReading: PPGReading?
        var seed: UInt64 = 42
        func nextRandom() -> Double {
            seed = seed &* 6364136223846793005 &+ 1442695040888963407
            return Double(seed >> 33) / Double(UInt64(1) << 31)
        }
        for i in 0..<300 {
            let tMs = Double(i) * (1000.0 / 30.0)
            let noisy = 150 + nextRandom() * 4 - 2
            lastReading = processor.addSample(timestampMs: tMs, luminance: noisy)
        }
        XCTAssertNotEqual(lastReading?.quality, .good)
    }

    func testLooksLikeFingerPresent() {
        let processor = PPGProcessor()
        XCTAssertFalse(processor.looksLikeFingerPresent)
        for i in 0..<20 {
            _ = processor.addSample(timestampMs: Double(i) * 33, luminance: 140)
        }
        XCTAssertTrue(processor.looksLikeFingerPresent)
    }

    func testResetClearsPriorState() {
        let processor = PPGProcessor()
        for i in 0..<60 {
            _ = processor.addSample(timestampMs: Double(i) * 33, luminance: 140 + Double(i % 2))
        }
        processor.reset()
        XCTAssertFalse(processor.looksLikeFingerPresent)
    }
}
