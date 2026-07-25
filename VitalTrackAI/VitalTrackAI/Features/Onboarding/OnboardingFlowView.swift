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
                .padding(.horizontal)
                .padding(.top, 8)

            TabView(selection: $step) {
                OnboardingPage(
                    title: "Welcome to VitalTrack AI",
                    bodyText: TrustCopy.shortBPBanner + "\n\nA calm place to log cuff blood pressure and heart rate from PPG — with honest limits.",
                    systemImage: "heart.text.square.fill"
                ).tag(OnboardingStep.welcome)

                OnboardingPage(
                    title: "What we can do",
                    bodyText: TrustCopy.whatWeCanDo,
                    systemImage: "checkmark.seal.fill"
                ).tag(OnboardingStep.whatWeCanDo)

                OnboardingPage(
                    title: "What we cannot do",
                    bodyText: TrustCopy.whatWeCannotDo,
                    systemImage: "xmark.shield.fill",
                    emphasize: true
                ).tag(OnboardingStep.whatWeCannotDo)

                OnboardingPage(
                    title: "How heart rate works",
                    bodyText: TrustCopy.howHeartRateWorks,
                    systemImage: "camera.metering.center.weighted"
                ).tag(OnboardingStep.howHeartRateWorks)

                OnboardingPage(
                    title: "Why an external BP monitor",
                    bodyText: TrustCopy.whyExternalBP + "\n\nUse an FDA-cleared cuff for blood pressure. Manual entry, Bluetooth, Apple Health, and CSV are supported. The camera never estimates BP.",
                    systemImage: "gauge.with.dots.needle.67percent"
                ).tag(OnboardingStep.whyExternalBP)

                OnboardingPage(
                    title: "Privacy first",
                    bodyText: "Measurements stay on your device by default. You choose Apple Health access. Insights are generated locally and are informational only — not medical advice.",
                    systemImage: "lock.shield.fill"
                ).tag(OnboardingStep.privacy)

                HealthKitPermissionPage().tag(OnboardingStep.healthKit)

                OnboardingPage(
                    title: "You're ready",
                    bodyText: "Log BP from an FDA-cleared monitor, measure heart rate with PPG when you choose, and review informational insights anytime.",
                    systemImage: "flag.checkered"
                ).tag(OnboardingStep.done)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            HStack(spacing: 12) {
                if step != .welcome {
                    Button("Back") { step = step.previous }
                        .foregroundStyle(VTColors.brandSecondary)
                }
                Spacer()
                if step == .done {
                    VTPrimaryButton("Enter VitalTrack AI") {
                        Task { await session.completeOnboarding(settingsStore: composition.settingsStore) }
                    }
                    .frame(maxWidth: 220)
                } else {
                    VTPrimaryButton("Continue") { step = step.next }
                        .frame(maxWidth: 160)
                }
            }
            .padding()
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
            VStack(alignment: .leading, spacing: 20) {
                Text("VitalTrack AI")
                    .font(VTTypography.display(32))
                    .foregroundStyle(VTColors.brandPrimary)
                Image(systemName: systemImage)
                    .font(.system(size: 40))
                    .foregroundStyle(emphasize ? VTColors.warning : VTColors.brandSecondary)
                Text(title)
                    .font(VTTypography.title(26))
                    .foregroundStyle(VTColors.textPrimary)
                Text(bodyText)
                    .font(VTTypography.body())
                    .foregroundStyle(VTColors.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                if emphasize {
                    VTDisclaimerBanner(.bloodPressure)
                }
            }
            .padding(24)
        }
    }
}

struct HealthKitPermissionPage: View {
    @EnvironmentObject private var composition: AppComposition
    @EnvironmentObject private var session: SessionStore
    @State private var message = "Apple Health can import heart rate, HRV, and blood pressure recorded by other apps or devices. VitalTrack AI still never estimates BP from the camera."

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("VitalTrack AI")
                    .font(VTTypography.display(32))
                    .foregroundStyle(VTColors.brandPrimary)
                Text("Apple Health")
                    .font(VTTypography.title(26))
                Text(message)
                    .font(VTTypography.body())
                    .foregroundStyle(VTColors.textSecondary)
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
                Button("Not now") { message = "Skipped for now. You can enable Apple Health in Settings." }
                    .foregroundStyle(VTColors.brandSecondary)
            }
            .padding(24)
        }
    }
}
