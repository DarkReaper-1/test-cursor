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
                .background(isEnabled ? VTColors.brandPrimary : VTColors.textTertiary.opacity(0.45))
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .shadow(color: isEnabled ? VTColors.brandPrimary.opacity(0.28) : .clear, radius: 10, y: 5)
        }
        .disabled(!isEnabled)
        .buttonStyle(.plain)
        .accessibilityAddTraits(.isButton)
    }
}

public struct VTGhostButton: View {
    private let title: String
    private let action: () -> Void

    public init(_ title: String, action: @escaping () -> Void) {
        self.title = title
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Text(title)
                .font(VTTypography.body().weight(.bold))
                .frame(minHeight: 48)
                .padding(.horizontal, 16)
                .foregroundStyle(VTColors.brandDeep)
                .background(VTColors.subtle)
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(VTColors.stroke, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}
