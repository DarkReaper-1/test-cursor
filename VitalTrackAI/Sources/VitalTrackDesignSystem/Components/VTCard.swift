import SwiftUI

/// Card used only as an interactive container (tappable dashboard modules, form groups).
public struct VTCard<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        content
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(VTColors.elevated)
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(VTColors.stroke, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}
