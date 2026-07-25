import Foundation

/// Placeholder for ActivityKit Live Activities during a heart-rate PPG session.
/// Must never present Live Activity copy that implies blood-pressure measurement.
public enum MeasurementLiveActivityStub {
    public static let heartRateSessionTitle = "Measuring heart rate"
    public static let disallowedBPTitle = "Blood pressure requires an external monitor"

    public static var attributesSummary: String {
        "Live Activity shows PPG progress and BPM only — never estimated BP."
    }
}