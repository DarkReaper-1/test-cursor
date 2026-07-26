import SwiftUI

public struct VTBrandMark: View {
    private let size: CGFloat
    private let animated: Bool
    @State private var pulse = false

    public init(size: CGFloat = 88, animated: Bool = true) {
        self.size = size
        self.animated = animated
    }

    public var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [VTColors.brandPrimary, VTColors.brandSecondary],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: size, height: size)
                .shadow(color: VTColors.brandPrimary.opacity(0.28), radius: 18, y: 10)
                .scaleEffect(pulse ? 1.03 : 1)

            Image(systemName: "waveform.path.ecg")
                .font(.system(size: size * 0.42, weight: .semibold))
                .foregroundStyle(Color.white.opacity(0.95))
        }
        .onAppear {
            guard animated else { return }
            withAnimation(.easeInOut(duration: 2.4).repeatForever(autoreverses: true)) {
                pulse = true
            }
        }
        .accessibilityHidden(true)
    }
}

public struct VTAtmosphere: View {
    public init() {}

    public var body: some View {
        ZStack {
            VTColors.canvasGradient
            RadialGradient(
                colors: [VTColors.brandPrimary.opacity(0.12), .clear],
                center: .topLeading,
                startRadius: 20,
                endRadius: 320
            )
            RadialGradient(
                colors: [VTColors.brandSecondary.opacity(0.10), .clear],
                center: .topTrailing,
                startRadius: 10,
                endRadius: 280
            )
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }
}
