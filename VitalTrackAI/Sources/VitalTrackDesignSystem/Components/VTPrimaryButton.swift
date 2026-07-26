import SwiftUI

public struct VTPrimaryButton: View {
    private let title: String
    private let isEnabled: Bool
    private let action: () -> Void

    public init(_ title: String, isEnabled: Bool = true, action: @escaping () -> Void) {
        self.title = title
        self.isEnabled = isEnabled
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Text(title)
                .font(VTTypography.body().weight(.bold))
                .frame(maxWidth: .infinity)
                .frame(minHeight: 56)
                .padding(.horizontal, 18)
                .foregroundStyle(.white)
                .background(isEnabled ? VTColors.brandPrimary : VTColors.textTertiary)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .disabled(!isEnabled)
        .buttonStyle(.plain)
        .accessibilityAddTraits(.isButton)
    }
}
