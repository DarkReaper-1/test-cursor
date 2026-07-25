import SwiftUI

public struct VTSectionHeader: View {
    private let title: String
    private let subtitle: String?

    public init(_ title: String, subtitle: String? = nil) {
        self.title = title
        self.subtitle = subtitle
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(VTTypography.title(20))
                .foregroundStyle(VTColors.textPrimary)
            if let subtitle {
                Text(subtitle)
                    .font(VTTypography.caption())
                    .foregroundStyle(VTColors.textSecondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}
