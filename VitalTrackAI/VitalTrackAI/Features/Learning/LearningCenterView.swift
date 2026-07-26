import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct LearningCenterView: View {
    @State private var selectedTopic: LearningTopic?
    @State private var selectedArticle: LearningArticle?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VTScreenHeader(
                    eyebrow: "Learn",
                    title: "Heart health, plainly",
                    subtitle: "Short articles in everyday language. No scare tactics."
                )
                VTDisclaimerBanner(.custom(
                    "Educational content only — not a diagnosis or treatment plan. " + TrustCopy.shortBPBanner
                ))

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    ForEach(LearningTopic.allCases) { topic in
                        Button {
                            selectedTopic = topic
                        } label: {
                            VStack(alignment: .leading, spacing: 10) {
                                Image(systemName: topic.systemImage)
                                    .font(.system(size: 24, weight: .semibold))
                                    .foregroundStyle(VTColors.brandPrimary)
                                Text(topic.displayName)
                                    .font(VTTypography.body().weight(.bold))
                                    .foregroundStyle(VTColors.textPrimary)
                                    .multilineTextAlignment(.leading)
                            }
                            .frame(maxWidth: .infinity, minHeight: 110, alignment: .topLeading)
                            .padding(16)
                            .background(VTColors.elevated)
                            .overlay(
                                RoundedRectangle(cornerRadius: 18, style: .continuous)
                                    .stroke(VTColors.stroke, lineWidth: 1.5)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                        }
                        .buttonStyle(.plain)
                    }
                }

                if let selectedTopic {
                    VTSectionHeader(
                        selectedTopic.displayName,
                        subtitle: "Tap an article — most take 2–3 minutes."
                    )
                    ForEach(LearningCatalog.articles(for: selectedTopic)) { article in
                        Button {
                            selectedArticle = article
                        } label: {
                            VTCard {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(article.title)
                                        .font(VTTypography.body().weight(.bold))
                                        .foregroundStyle(VTColors.textPrimary)
                                    Text(article.summary)
                                        .font(VTTypography.caption())
                                        .foregroundStyle(VTColors.textSecondary)
                                    Text("\(article.minutesToRead) min read")
                                        .font(VTTypography.caption())
                                        .foregroundStyle(VTColors.brandDeep)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(20)
        }
        .background(VTAtmosphere())
        .navigationTitle("Learning center")
        .sheet(item: $selectedArticle) { article in
            NavigationStack {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        Text(article.title)
                            .font(VTTypography.display(28))
                        Text(article.body)
                            .font(VTTypography.body())
                            .foregroundStyle(VTColors.textSecondary)
                            .lineSpacing(4)
                        VTDisclaimerBanner(.custom(TrustCopy.medicalDisclaimer))
                    }
                    .padding(20)
                }
                .background(VTAtmosphere())
                .navigationTitle(article.topic.displayName)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") { selectedArticle = nil }
                    }
                }
            }
        }
    }
}
