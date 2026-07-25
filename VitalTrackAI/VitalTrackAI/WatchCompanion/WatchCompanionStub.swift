import Foundation

/// Placeholder for the watchOS companion target.
/// Heart rate may stream from Apple Watch via HealthKit on iPhone;
/// blood pressure is never estimated on Watch — cuff / Health import only.
public enum WatchCompanionStub {
    public static let capabilitySummary = """
    Apple Watch companion (planned): glanceable HR, reminder complications, \
    and open-on-iPhone actions for logging BP from an FDA-cleared monitor.
    """

    public static let bloodPressureAllowed = false
}