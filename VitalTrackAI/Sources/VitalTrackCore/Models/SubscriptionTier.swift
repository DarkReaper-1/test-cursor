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
                "Manual blood pressure logging from your cuff",
                "Medication reminders and dose history",
                "Lifestyle check-ins (sleep, water, sodium, movement)",
                "Camera PPG heart rate (not blood pressure)",
                "Basic history, charts, and calm crisis guidance",
                "Learning center and local AI coach (informational)"
            ]
        case .premium:
            return [
                "Everything in Free",
                "Unlimited history and advanced BP analytics",
                "Doctor-ready PDF/CSV reports with meds & lifestyle",
                "Family/caregiver sharing (opt-in)",
                "Cloud backup and wearable sync extras",
                "Trend forecasting insights (informational only)"
            ]
        }
    }
}
