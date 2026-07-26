import Foundation

/// Whether a BP reading was taken before or after medication.
public enum MedicationTimingContext: String, Codable, Sendable, CaseIterable, Identifiable {
    case notTracked
    case beforeMedication
    case afterMedication

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .notTracked: return "Not tracked"
        case .beforeMedication: return "Before medication"
        case .afterMedication: return "After medication"
        }
    }
}

/// Coarse time-of-day bucket for morning vs evening analysis.
public enum ReadingTimeBucket: String, Codable, Sendable, CaseIterable, Identifiable {
    case morning
    case afternoon
    case evening
    case night
    case unspecified

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .morning: return "Morning"
        case .afternoon: return "Afternoon"
        case .evening: return "Evening"
        case .night: return "Night"
        case .unspecified: return "Unspecified"
        }
    }

    public static func from(date: Date, calendar: Calendar = .current) -> ReadingTimeBucket {
        let hour = calendar.component(.hour, from: date)
        switch hour {
        case 5..<12: return .morning
        case 12..<17: return .afternoon
        case 17..<21: return .evening
        default: return .night
        }
    }
}
