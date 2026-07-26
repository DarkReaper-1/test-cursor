import SwiftUI

public struct VTMetricHero: View {
    private let value: String
    private let unit: String
    private let caption: String
    private let compact: Bool

    public init(value: String, unit: String, caption: String, compact: Bool = false) {
        self.value = value
        self.unit = unit
        self.caption = caption
        self.compact = compact
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: compact ? 4 : 8) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(value)
                    .font(VTTypography.metric(compact ? 40 : 52))
                    .foregroundStyle(VTColors.textPrimary)
                    .contentTransition(.numericText())
                    .minimumScaleFactor(0.7)
                    .lineLimit(1)
                Text(unit)
                    .font(VTTypography.title(compact ? 18 : 20).weight(.bold))
                    .foregroundStyle(VTColors.textSecondary)
            }
            Text(caption)
                .font(VTTypography.caption())
                .foregroundStyle(VTColors.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(value) \(unit). \(caption)")
    }
}
