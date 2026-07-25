import Foundation

public enum SubscriptionTier: String, Codable, Sendable, CaseIterable, Identifiable {
    case free
    case premium

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .free: return "Free"
        case .premium: return "Premium"
        }
    }

    public var features: [String] {
        switch self {
        case .free:
            return [
                "Manual blood pressure logging",
                "Camera PPG heart rate (not blood pressure)",
                "Basic history and charts",
                "Local insights (informational only)"
            ]
        case .premium:
            return [
                "Everything in Free",
                "Doctor-ready PDF export",
                "CSV import/export without limits",
                "Advanced trend insights",
                "Priority device pairing tips"
            ]
        }
    }
}
