import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct SubscriptionView: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var composition: AppComposition

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Subscription")
                    .font(VTTypography.display(32))
                    .foregroundStyle(VTColors.brandPrimary)
                Text("Choose Free or Premium. You can use core logging without upgrading. No countdown tricks, no fake urgency.")
                    .font(VTTypography.body(15))
                    .foregroundStyle(VTColors.textSecondary)

                ForEach(SubscriptionTier.allCases) { tier in
                    VTCard {
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                Text(tier.displayName)
                                    .font(VTTypography.title(20))
                                Spacer()
                                if session.settings.subscriptionTier == tier {
                                    Text("Current")
                                        .font(VTTypography.caption())
                                        .foregroundStyle(VTColors.brandPrimary)
                                }
                            }
                            ForEach(tier.features, id: \.self) { feature in
                                Label(feature, systemImage: "checkmark")
                                    .font(VTTypography.caption())
                                    .foregroundStyle(VTColors.textSecondary)
                            }
                            if session.settings.subscriptionTier != tier {
                                VTPrimaryButton(tier == .free ? "Stay on Free" : "Upgrade to Premium") {
                                    Task { await select(tier) }
                                }
                            }
                        }
                    }
                }

                Text("Premium is optional. Cancel anytime in your Apple ID subscriptions. VitalTrack AI still never claims camera blood pressure measurement.")
                    .font(VTTypography.caption())
                    .foregroundStyle(VTColors.textTertiary)
            }
            .padding()
        }
        .background(VTColors.canvasGradient.ignoresSafeArea())
        .navigationTitle("Subscription")
    }

    private func select(_ tier: SubscriptionTier) async {
        var s = session.settings
        s.subscriptionTier = tier
        await session.updateSettings(s, settingsStore: composition.settingsStore)
    }
}
