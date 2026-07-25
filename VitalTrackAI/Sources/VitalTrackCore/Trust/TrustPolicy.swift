import Foundation

/// Domain-level trust rules. Never allow camera/Watch as BP sources.
public enum TrustPolicy {
    public static let medicalDisclaimer =
        "VitalTrack AI provides informational insights only and is not medical advice, diagnosis, or treatment. Always consult a qualified clinician for health decisions."

    /// Canonical product statement — required on onboarding, FAQ, Help, first launch, and App Store materials.
    public static let bloodPressureSourceDisclaimer =
        "This app tracks blood pressure readings that you obtain from an FDA-cleared blood pressure monitor."

    public static let bloodPressureSourceExpanded =
        "\(bloodPressureSourceDisclaimer) Enter values manually, sync a Bluetooth cuff, import from Apple Health, or upload CSV. The camera and Apple Watch do not measure blood pressure."

    public static let heartRatePPGDisclaimer =
        "Camera and Watch measure heart rate using photoplethysmography (PPG) only. They do not measure blood pressure."

    public static func assertValidBPSource(_ source: MeasurementSource) throws {
        try BloodPressureReading.validateSource(source)
    }

    public static func isCameraAllowedForBloodPressure() -> Bool { false }
}
