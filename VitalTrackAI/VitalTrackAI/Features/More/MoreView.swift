import SwiftUI
import VitalTrackDesignSystem

struct MoreView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    VTScreenHeader(
                        eyebrow: "More",
                        title: "History & help",
                        subtitle: "Tools, privacy, and comfort settings."
                    )

                    VTDisclaimerBanner(.bloodPressure)

                    moreSection(title: "Your health") {
                        MoreLinkRow(title: "Measure stress", subtitle: "Stress & anxiety self-check", systemImage: "brain.head.profile", destination: StressMeasureView())
                        MoreLinkRow(title: "Medications", subtitle: "Doses, reminders, refill notes", systemImage: "pills.fill", destination: MedicationsView())
                        MoreLinkRow(title: "Learning center", subtitle: "Plain-language heart health", systemImage: "book.fill", destination: LearningCenterView())
                        MoreLinkRow(title: "Family care", subtitle: "Opt-in caregiver sharing", systemImage: "person.3.fill", destination: FamilyCareView())
                    }

                    moreSection(title: "Your data") {
                        MoreLinkRow(title: "History", subtitle: "Past cuff and pulse readings", systemImage: "clock.arrow.circlepath", destination: HistoryView())
                        MoreLinkRow(title: "Analytics", subtitle: "Week, month, year BP trends", systemImage: "chart.xyaxis.line", destination: AnalyticsView())
                        MoreLinkRow(title: "Reports", subtitle: "CSV, PDF, doctor summary", systemImage: "doc.richtext", destination: ReportsView())
                        MoreLinkRow(title: "Devices", subtitle: "Bluetooth cuffs and scales", systemImage: "wave.3.right.circle", destination: DevicesView())
                    }

                    moreSection(title: "Account & trust") {
                        MoreLinkRow(title: "Settings", subtitle: "Comfort, Health, reminders", systemImage: "gearshape.fill", destination: SettingsView())
                        MoreLinkRow(title: "Subscription", subtitle: "Clear Free vs Premium", systemImage: "creditcard", destination: SubscriptionView())
                        MoreLinkRow(title: "Privacy", subtitle: "What we store and why", systemImage: "lock.shield.fill", destination: PrivacyView())
                        MoreLinkRow(title: "Help & FAQ", subtitle: "Honest answers about BP", systemImage: "questionmark.circle.fill", destination: HelpView())
                    }
                }
                .padding(20)
            }
            .background(VTAtmosphere())
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func moreSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(VTTypography.title(18))
                .foregroundStyle(VTColors.textPrimary)
            VTCard {
                VStack(spacing: 0) {
                    content()
                }
                .padding(.vertical, -4)
            }
        }
    }
}

private struct MoreLinkRow<Destination: View>: View {
    let title: String
    let subtitle: String
    let systemImage: String
    let destination: Destination

    var body: some View {
        NavigationLink {
            destination
        } label: {
            HStack(spacing: 14) {
                Image(systemName: systemImage)
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(VTColors.brandPrimary)
                    .frame(width: 36, height: 36)
                    .background(VTColors.subtle)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(VTTypography.body().weight(.bold))
                        .foregroundStyle(VTColors.textPrimary)
                    Text(subtitle)
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(VTColors.textTertiary)
            }
            .padding(.vertical, 12)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    MoreView()
}
