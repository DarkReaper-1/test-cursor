import SwiftUI
import VitalTrackDesignSystem

struct SplashView: View {
    @State private var appear = false

    var body: some View {
        VStack(spacing: 22) {
            Spacer()
            VTBrandMark(size: 104, animated: true)
                .scaleEffect(appear ? 1 : 0.9)
                .opacity(appear ? 1 : 0)

            Text("VitalTrack AI")
                .font(VTTypography.display(42))
                .foregroundStyle(VTColors.brandPrimary)
                .opacity(appear ? 1 : 0)

            Text("Honest heart rate.\nReal cuff blood pressure.\nEasy to read.")
                .font(VTTypography.body())
                .foregroundStyle(VTColors.textSecondary)
                .multilineTextAlignment(.center)
                .opacity(appear ? 1 : 0)

            Text("Comfort mode · Large text")
                .font(VTTypography.caption().weight(.bold))
                .foregroundStyle(VTColors.brandDeep)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(VTColors.subtle)
                .clipShape(Capsule())
                .opacity(appear ? 1 : 0)

            Spacer()
        }
        .padding(28)
        .onAppear {
            withAnimation(.easeOut(duration: 0.6)) { appear = true }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("VitalTrack AI. Honest heart rate. Real cuff blood pressure. Easy to read.")
    }
}

#Preview {
    ZStack {
        VTAtmosphere()
        SplashView()
    }
}
