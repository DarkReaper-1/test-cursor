import SwiftUI
import VitalTrackDesignSystem

struct OnboardingFlowView: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var composition: AppComposition
    @State private var step: OnboardingStep = .welcome

    var body: some View {
        VStack(spacing: 0) {
            ProgressView(value: step.progress)
                .tint(VTColors.brandPrimary)
                .scaleEffect(x: 1, y: 1.6, anchor: .center)
                .padding(.horizontal, 20)
                .padding(.top, 12)

            TabView(selection: $step) {
                OnboardingPage(
                    title: "Welcome",
                    bodyText: "VitalTrack AI is designed to be easy to read and easy to tap.\n\n" + TrustCopy.shortBPBanner,
                    systemImage: "heart.text.square.fill"
                ).tag(OnboardingStep.welcome)

                OnboardingPage(
                    title: "What we can do",
                    bodyText: "• Save blood pressure from your home cuff\n• Check heart rate with the camera or Watch\n• See clear charts and reminders\n• Keep your data private on this phone",
                    systemImage: "checkmark.seal.fill"
                ).tag(OnboardingStep.whatWeCanDo)

                OnboardingPage(
                    title: "What we cannot do",
                    bodyText: "We cannot measure blood pressure with the camera, flash, fingerprint, or Apple Watch.\n\n" + TrustCopy.shortBPBanner,
                    systemImage: "xmark.shield.fill",
                    emphasize: true
                ).tag(OnboardingStep.whatWeCannotDo)

                OnboardingPage(
                    title: "Heart rate, simply",
                    bodyText: "Cover the camera with your fingertip. Light senses your pulse.\n\nYou get beats per minute (BPM) — not blood pressure.",
                    systemImage: "camera.metering.center.weighted"
                ).tag(OnboardingStep.howHeartRateWorks)

                OnboardingPage(
                    title: "Blood pressure needs a cuff",
                    bodyText: TrustCopy.whyExternalBP + "\n\nType the numbers, connect a Bluetooth cuff, or import from Apple Health.",
                    systemImage: "gauge.with.dots.needle.67percent"
                ).tag(OnboardingStep.whyExternalBP)

                OnboardingPage(
                    title: "Your privacy",
                    bodyText: "Your readings stay on this device unless you choose to share with Apple Health.\n\nTips are informational only — not medical advice.",
                    systemImage: "lock.shield.fill"
                ).tag(OnboardingStep.privacy)

                HealthKitPermissionPage().tag(OnboardingStep.healthKit)

                OnboardingPage(
                    title: "You’re ready",
                    bodyText: "Large text. Big buttons. Honest limits.\n\nEnter a cuff reading anytime from the BP tab.",
                    systemImage: "flag.checkered"
                ).tag(OnboardingStep.done)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            HStack(spacing: 12) {
                if step != .welcome {
                    VTGhostButton("Back") { step = step.previous }
                }
                Spacer(minLength: 8)
                if step == .done {
                    VTPrimaryButton("Enter VitalTrack AI") {
                        Task { await session.completeOnboarding(settingsStore: composition.settingsStore) }
                    }
                    .frame(maxWidth: 240)
                } else {
                    VTPrimaryButton("Continue") { step = step.next }
                        .frame(maxWidth: 180)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
    }
}

enum OnboardingStep: Int, CaseIterable, Hashable {
    case welcome
    case whatWeCanDo
    case whatWeCannotDo
    case howHeartRateWorks
    case whyExternalBP
    case privacy
    case healthKit
    case done

    var progress: Double {
        Double(rawValue + 1) / Double(Self.allCases.count)
    }

    var next: OnboardingStep {
        Self(rawValue: rawValue + 1) ?? .done
    }

    var previous: OnboardingStep {
        Self(rawValue: max(0, rawValue - 1)) ?? .welcome
    }
}

struct OnboardingPage: View {
    let title: String
    let bodyText: String
    let systemImage: String
    var emphasize: Bool = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("VitalTrack AI")
                    .font(VTTypography.body().weight(.bold))
                    .foregroundStyle(VTColors.brandPrimary)

                ZStack {
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: emphasize
                                    ? [VTColors.danger.opacity(0.9), VTColors.warning.opacity(0.85)]
                                    : [VTColors.brandPrimary, VTColors.brandSecondary],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 84, height: 84)
                        .shadow(color: VTColors.brandPrimary.opacity(0.22), radius: 14, y: 8)
                    Image(systemName: systemImage)
                        .font(.system(size: 34, weight: .semibold))
                        .foregroundStyle(.white)
                }
                .accessibilityHidden(true)

                Text(title)
                    .font(VTTypography.display(34))
                    .foregroundStyle(emphasize ? VTColors.danger : VTColors.textPrimary)

                Text(bodyText)
                    .font(VTTypography.body())
                    .foregroundStyle(VTColors.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .lineSpacing(3)

                if emphasize {
                    VTDisclaimerBanner(.bloodPressure)
                }
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

struct HealthKitPermissionPage: View {
    @EnvironmentObject private var composition: AppComposition
    @EnvironmentObject private var session: SessionStore
    @State private var message = "Apple Health can import heart rate and blood pressure already saved by other apps or devices. VitalTrack AI still never estimates BP from the camera."

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("VitalTrack AI")
                    .font(VTTypography.body().weight(.bold))
                    .foregroundStyle(VTColors.brandPrimary)
                Text("Apple Health")
                    .font(VTTypography.display(34))
                    .foregroundStyle(VTColors.textPrimary)
                Text(message)
                    .font(VTTypography.body())
                    .foregroundStyle(VTColors.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                VTDisclaimerBanner(.custom(TrustCopy.bloodPressureSource))
                VTPrimaryButton("Allow Apple Health") {
                    Task {
                        do {
                            try await composition.environment.healthKit.requestAuthorization(writeBloodPressure: true)
                            var s = session.settings
                            s.healthKitEnabled = true
                            await session.updateSettings(s, settingsStore: composition.settingsStore)
                            message = "Apple Health connected. You can change this later in Settings."
                        } catch {
                            message = error.localizedDescription + " You can continue with manual and Bluetooth logging."
                        }
                    }
                }
                VTGhostButton("Not now") {
                    message = "Skipped for now. You can enable Apple Health in Settings."
                }
            }
            .padding(24)
        }
    }
}
