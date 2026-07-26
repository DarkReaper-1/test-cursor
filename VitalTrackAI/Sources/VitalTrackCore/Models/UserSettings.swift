import Foundation

public struct UserSettings: Codable, Sendable, Equatable {
    public var hasCompletedOnboarding: Bool
    public var preferredName: String?
    public var usesMetricUnits: Bool
    public var dashboardCards: [DashboardCardKind]
    public var subscriptionTier: SubscriptionTier
    public var healthKitEnabled: Bool
    public var notificationsEnabled: Bool
    public var showDisclaimers: Bool
    /// Comfort defaults favor adults 40+ (larger type, higher contrast).
    public var largerText: Bool
    public var higherContrast: Bool
    public var reduceMotion: Bool

    public init(
        hasCompletedOnboarding: Bool = false,
        preferredName: String? = nil,
        usesMetricUnits: Bool = true,
        dashboardCards: [DashboardCardKind] = DashboardCardKind.companionDefaults,
        subscriptionTier: SubscriptionTier = .free,
        healthKitEnabled: Bool = false,
        notificationsEnabled: Bool = false,
        showDisclaimers: Bool = true,
        largerText: Bool = true,
        higherContrast: Bool = true,
        reduceMotion: Bool = false
    ) {
        self.hasCompletedOnboarding = hasCompletedOnboarding
        self.preferredName = preferredName
        self.usesMetricUnits = usesMetricUnits
        self.dashboardCards = dashboardCards
        self.subscriptionTier = subscriptionTier
        self.healthKitEnabled = healthKitEnabled
        self.notificationsEnabled = notificationsEnabled
        self.showDisclaimers = showDisclaimers
        self.largerText = largerText
        self.higherContrast = higherContrast
        self.reduceMotion = reduceMotion
    }

    public static let `default` = UserSettings()
}
