import Foundation
import VitalTrackCore

/// Canonical user-facing trust strings. Prefer these over ad-hoc marketing copy.
public enum TrustCopy {
    public static let medicalDisclaimer = TrustPolicy.medicalDisclaimer
    public static let bloodPressureSource = TrustPolicy.bloodPressureSourceDisclaimer
    public static let heartRatePPG = TrustPolicy.heartRatePPGDisclaimer

    public static let shortBPBanner = TrustPolicy.bloodPressureSourceDisclaimer

    public static let shortHRBanner =
        "Camera & Watch: heart rate (PPG) only — not blood pressure."

    public static let insightsBanner =
        "Insights are informational only and are not medical advice."

    public static let firstLaunchBanner =
        "\(TrustPolicy.bloodPressureSourceDisclaimer) Camera measurements are heart rate only."

    public static let whatWeCannotDo = """
    VitalTrack AI cannot measure blood pressure with the camera, flash, fingerprint, or Apple Watch. \
    \(TrustPolicy.bloodPressureSourceDisclaimer) \
    Supported inputs: manual entry, Bluetooth cuff, Apple Health import, and CSV.
    """

    public static let whatWeCanDo = """
    Log blood pressure from external monitors, measure heart rate with camera PPG or Watch/Health, \
    review trends, connect compatible Bluetooth cuffs, and generate informational insights and clinician-ready exports.
    """

    public static let howHeartRateWorks = """
    Photoplethysmography (PPG) uses light to detect pulse-related changes in blood volume. \
    This yields heart rate (BPM), not blood pressure (mmHg).
    """

    public static let whyExternalBP = """
    \(TrustPolicy.bloodPressureSourceDisclaimer) \
    Accurate blood pressure needs a validated cuff. Phone cameras are not a substitute for clinical BP measurement.
    """
}
