import Foundation
import VitalTrackCore

/// Shared feature-layer helpers used by the app target and tests.
public enum VitalTrackFeatures {
    public static let moduleName = "VitalTrackFeatures"
}

public enum MeasurementValidation {
    public static func isPlausibleBloodPressure(systolic: Int, diastolic: Int) -> Bool {
        (70...250).contains(systolic) && (40...150).contains(diastolic) && systolic > diastolic
    }

    public static func isPlausibleHeartRate(_ bpm: Double) -> Bool {
        (30...220).contains(bpm)
    }
}
