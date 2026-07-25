import Foundation
import VitalTrackCore

/// Canonical user-facing trust strings. Prefer these over ad-hoc marketing copy.
public enum TrustCopy {
    public static let medicalDisclaimer = TrustPolicy.medicalDisclaimer
    public static let bloodPressureSource = TrustPolicy.bloodPressureSourceDisclaimer
    public static let heartRatePPG = TrustPolicy.heartRatePPGDisclaimer

    public static let shortBPBanner =
        "BP from FDA-cleared monitors only — never estimated from the camera."

    public static let shortHRBanner =
        "Camera & Watch: heart rate (PPG) only — not blood pressure."

    public static let insightsBanner =
        "Insights are informational only and are not medical advice."

    public static let whatWeCannotDo = """
    VitalTrack AI cannot measure blood pressure with the camera or Apple Watch. \
    Blood pressure requires an FDA-cleared external monitor (manual entry, Bluetooth cuff, Apple Health sync, or CSV import).
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
    Accurate blood pressure needs a validated cuff or equivalent FDA-cleared device. \
    Phone cameras are not a substitute for clinical BP measurement.
    """
}
