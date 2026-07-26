import SwiftUI

public struct VTEmptyState: View {
    private let title: String
    private let message: String
    private let systemImage: String

    public init(title: String, message: String, systemImage: String) {
        self.title = title
        self.message = message
        self.systemImage = systemImage
    }

    public var body: some View {
        VStack(spacing: 14) {
            Image(systemName: systemImage)
                .font(.system(size: 40, weight: .semibold))
                .foregroundStyle(VTColors.brandPrimary)
                .accessibilityHidden(true)
            Text(title)
                .font(VTTypography.title(22))
                .foregroundStyle(VTColors.textPrimary)
                .multilineTextAlignment(.center)
            Text(message)
                .font(VTTypography.body())
                .foregroundStyle(VTColors.textSecondary)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(VTColors.subtle.opacity(0.65))
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .accessibilityElement(children: .combine)
    }
}
