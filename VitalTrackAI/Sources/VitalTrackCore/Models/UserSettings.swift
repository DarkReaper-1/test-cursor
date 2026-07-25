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

    public init(
        hasCompletedOnboarding: Bool = false,
        preferredName: String? = nil,
        usesMetricUnits: Bool = true,
        dashboardCards: [DashboardCardKind] = DashboardCardKind.allCases,
        subscriptionTier: SubscriptionTier = .free,
        healthKitEnabled: Bool = false,
        notificationsEnabled: Bool = false,
        showDisclaimers: Bool = true
    ) {
        self.hasCompletedOnboarding = hasCompletedOnboarding
        self.preferredName = preferredName
        self.usesMetricUnits = usesMetricUnits
        self.dashboardCards = dashboardCards
        self.subscriptionTier = subscriptionTier
        self.healthKitEnabled = healthKitEnabled
        self.notificationsEnabled = notificationsEnabled
        self.showDisclaimers = showDisclaimers
    }

    public static let `default` = UserSettings()
}
