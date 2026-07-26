import Foundation

/// Privacy-first family/caregiver sharing model.
/// Sharing is opt-in; no data leaves the device until the user explicitly grants access.
public enum CareRole: String, Codable, Sendable, CaseIterable, Identifiable {
    case selfProfile
    case parent
    case spouse
    case caregiver
    case other

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .selfProfile: return "Myself"
        case .parent: return "Parent"
        case .spouse: return "Spouse / partner"
        case .caregiver: return "Caregiver"
        case .other: return "Other"
        }
    }
}

public struct CareProfile: Identifiable, Codable, Sendable, Equatable, Hashable {
    public let id: UUID
    public var displayName: String
    public var role: CareRole
    public var sharingEnabled: Bool
    public var notifyCaregiverOnMissedReading: Bool
    public var notifyCaregiverOnCrisisRange: Bool
    public var createdAt: Date

    public init(
        id: UUID = UUID(),
        displayName: String,
        role: CareRole = .selfProfile,
        sharingEnabled: Bool = false,
        notifyCaregiverOnMissedReading: Bool = false,
        notifyCaregiverOnCrisisRange: Bool = false,
        createdAt: Date = .now
    ) {
        self.id = id
        self.displayName = displayName
        self.role = role
        self.sharingEnabled = sharingEnabled
        self.notifyCaregiverOnMissedReading = notifyCaregiverOnMissedReading
        self.notifyCaregiverOnCrisisRange = notifyCaregiverOnCrisisRange
        self.createdAt = createdAt
    }
}
