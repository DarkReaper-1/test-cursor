import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct SubscriptionView: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var composition: AppComposition

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VTScreenHeader(
                    eyebrow: "Subscription",
                    title: "Clear pricing",
                    subtitle: "Use core logging free. Upgrade only if you want extras. No hidden trials."
                )

                VTDisclaimerBanner(.custom(
                    "Premium never unlocks camera blood pressure. " + TrustCopy.shortBPBanner
                ))

                ForEach(SubscriptionTier.allCases) { tier in
                    VTCard(emphasized: session.settings.subscriptionTier == tier) {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text(tier.displayName)
                                    .font(VTTypography.title(22))
                                Spacer()
                                if session.settings.subscriptionTier == tier {
                                    VTSourceChip("Current")
                                }
                            }
                            ForEach(tier.features, id: \.self) { feature in
                                Label(feature, systemImage: "checkmark.circle.fill")
                                    .font(VTTypography.body())
                                    .foregroundStyle(VTColors.textSecondary)
                                    .labelStyle(.titleAndIcon)
                            }
                            if session.settings.subscriptionTier != tier {
                                VTPrimaryButton(tier == .free ? "Stay on Free" : "Upgrade to Premium") {
                                    Task { await select(tier) }
                                }
                            }
                        }
                    }
                }

                Text("Cancel anytime in Settings → Apple ID → Subscriptions. VitalTrack AI still never claims camera blood pressure measurement.")
                    .font(VTTypography.caption())
                    .foregroundStyle(VTColors.textSecondary)
            }
            .padding(20)
        }
        .background(VTAtmosphere())
        .navigationTitle("Subscription")
    }

    private func select(_ tier: SubscriptionTier) async {
        var s = session.settings
        s.subscriptionTier = tier
        await session.updateSettings(s, settingsStore: composition.settingsStore)
    }
}
