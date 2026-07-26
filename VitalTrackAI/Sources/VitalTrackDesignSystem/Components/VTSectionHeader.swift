import SwiftUI

public struct VTSectionHeader: View {
    private let title: String
    private let subtitle: String?

    public init(_ title: String, subtitle: String? = nil) {
        self.title = title
        self.subtitle = subtitle
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(VTTypography.title(20))
                .foregroundStyle(VTColors.textPrimary)
                .accessibilityAddTraits(.isHeader)
            if let subtitle, !subtitle.isEmpty {
                Text(subtitle)
                    .font(VTTypography.caption())
                    .foregroundStyle(VTColors.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
