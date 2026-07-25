import SwiftUI

public struct VTMetricHero: View {
    private let value: String
    private let unit: String
    private let caption: String

    public init(value: String, unit: String, caption: String) {
        self.value = value
        self.unit = unit
        self.caption = caption
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(value)
                    .font(VTTypography.metric())
                    .foregroundStyle(VTColors.textPrimary)
                    .contentTransition(.numericText())
                Text(unit)
                    .font(VTTypography.title(18))
                    .foregroundStyle(VTColors.textSecondary)
            }
            Text(caption)
                .font(VTTypography.caption())
                .foregroundStyle(VTColors.textTertiary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 8)
        .accessibilityElement(children: .combine)
    }
}
