import SwiftUI
import VitalTrackDesignSystem

struct SplashView: View {
    @State private var appear = false

    var body: some View {
        ZStack {
            VTColors.canvasGradient.ignoresSafeArea()
            VStack(spacing: 16) {
                Text("VitalTrack AI")
                    .font(VTTypography.display(40))
                    .foregroundStyle(VTColors.brandPrimary)
                    .scaleEffect(appear ? 1 : 0.92)
                    .opacity(appear ? 1 : 0)
                Text("Track vitals with clear limits")
                    .font(VTTypography.body(16))
                    .foregroundStyle(VTColors.textSecondary)
                    .opacity(appear ? 1 : 0)
            }
            .padding()
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.55)) { appear = true }
        }
        .accessibilityElement(children: .combine)
    }
}

#Preview {
    SplashView()
}
