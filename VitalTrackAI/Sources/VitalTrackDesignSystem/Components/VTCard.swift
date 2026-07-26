import SwiftUI

/// Elevated surface for interactive content groups (forms, dashboard modules).
public struct VTCard<Content: View>: View {
    private let content: Content
    private let emphasized: Bool

    public init(emphasized: Bool = false, @ViewBuilder content: () -> Content) {
        self.emphasized = emphasized
        self.content = content()
    }

    public var body: some View {
        content
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(VTColors.elevated)
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(emphasized ? VTColors.brandPrimary.opacity(0.45) : VTColors.stroke, lineWidth: emphasized ? 1.5 : 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            .shadow(color: Color.black.opacity(0.04), radius: 12, y: 6)
    }
}
