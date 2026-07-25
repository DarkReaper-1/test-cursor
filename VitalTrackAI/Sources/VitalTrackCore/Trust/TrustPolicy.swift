import Foundation

/// Domain-level trust rules. Never allow camera/Watch as BP sources.
public enum TrustPolicy {
    public static let medicalDisclaimer =
        "VitalTrack AI provides informational insights only and is not medical advice, diagnosis, or treatment. Always consult a qualified clinician for health decisions."

    public static let bloodPressureSourceDisclaimer =
        "Blood pressure comes only from FDA-cleared external monitors (manual entry, Bluetooth cuff, Apple Health, or CSV). The camera and Apple Watch do not measure blood pressure."

    public static let heartRatePPGDisclaimer =
        "Camera and Watch measure heart rate using photoplethysmography (PPG) only. They do not measure blood pressure."

    public static func assertValidBPSource(_ source: MeasurementSource) throws {
        try BloodPressureReading.validateSource(source)
    }

    public static func isCameraAllowedForBloodPressure() -> Bool { false }
}
