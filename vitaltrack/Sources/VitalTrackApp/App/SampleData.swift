import Foundation
import VitalTrackCore

/// Sample data for SwiftUI previews only — never linked into a real build
/// target's data path.
enum SampleData {
    static let heartRate: [HeartRateReading] = {
        var readings: [HeartRateReading] = []
        var base = 78.0
        for i in stride(from: 29, through: 0, by: -1) {
            base += Double.random(in: -1.4...0.8)
            let bpm = Int(max(58, min(96, base)))
            readings.append(HeartRateReading(
                takenAt: Date().addingTimeInterval(-Double(i) * 86400),
                bpm: bpm,
                hrvRMSSDMs: Double.random(in: 28...48)
            ))
        }
        return readings
    }()

    static let bloodPressure: [BloodPressureReading] = {
        var readings: [BloodPressureReading] = []
        var sys = 128.0, dia = 82.0
        for i in stride(from: 28, through: 0, by: -2) {
            sys += Double.random(in: -1.2...1.0)
            dia += Double.random(in: -0.9...0.7)
            readings.append(BloodPressureReading(
                takenAt: Date().addingTimeInterval(-Double(i) * 86400),
                systolic: Int(max(102, min(150, sys))),
                diastolic: Int(max(66, min(96, dia))),
                pulse: Int.random(in: 64...84)
            ))
        }
        return readings
    }()
}
