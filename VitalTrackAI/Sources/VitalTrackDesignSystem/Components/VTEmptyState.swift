import SwiftUI

public struct VTEmptyState: View {
    private let title: String
    private let message: String
    private let systemImage: String

    public init(title: String, message: String, systemImage: String = "heart.text.square") {
        self.title = title
        self.message = message
        self.systemImage = systemImage
    }

    public var body: some View {
        VStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.system(size: 36, weight: .regular))
                .foregroundStyle(VTColors.brandPrimary)
            Text(title)
                .font(VTTypography.title(20))
                .foregroundStyle(VTColors.textPrimary)
            Text(message)
                .font(VTTypography.body(15))
                .foregroundStyle(VTColors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
    }
}
