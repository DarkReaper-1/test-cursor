import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct FamilyCareView: View {
    @EnvironmentObject private var composition: AppComposition
    @State private var profiles: [CareProfile] = []
    @State private var name = ""
    @State private var role: CareRole = .parent
    @State private var status = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VTScreenHeader(
                    eyebrow: "Family",
                    title: "Care with permission",
                    subtitle: "Adult children can help only when sharing is turned on. Privacy stays clear."
                )
                VTDisclaimerBanner(.custom(
                    "Sharing is opt-in. VitalTrack AI never sends health data to family without your explicit permission."
                ))

                VTCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("How family sharing works")
                            .font(VTTypography.title(18))
                        Text("1. Create a profile for the person you care for (or yourself).\n2. Turn sharing on only when everyone agrees.\n3. Choose calm alerts for missed readings or crisis-range logs.\n4. Shared reports stay labeled with sources and disclaimers.")
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.textSecondary)
                    }
                }

                if profiles.isEmpty {
                    VTEmptyState(
                        title: "No care profiles yet",
                        message: "Add a profile when you and your loved one agree to share. You can keep everything private.",
                        systemImage: "person.3.fill"
                    )
                } else {
                    ForEach(profiles) { profile in
                        VTCard {
                            VStack(alignment: .leading, spacing: 10) {
                                Text(profile.displayName)
                                    .font(VTTypography.title(20))
                                Text(profile.role.displayName)
                                    .font(VTTypography.caption())
                                    .foregroundStyle(VTColors.textSecondary)
                                Toggle("Sharing enabled", isOn: binding(for: profile, keyPath: \.sharingEnabled))
                                    .font(VTTypography.body())
                                    .frame(minHeight: 48)
                                if profile.sharingEnabled {
                                    Toggle("Notify on missed reading", isOn: binding(for: profile, keyPath: \.notifyCaregiverOnMissedReading))
                                        .font(VTTypography.body())
                                        .frame(minHeight: 48)
                                    Toggle("Notify on crisis-range reading", isOn: binding(for: profile, keyPath: \.notifyCaregiverOnCrisisRange))
                                        .font(VTTypography.body())
                                        .frame(minHeight: 48)
                                }
                            }
                        }
                    }
                }

                VTCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Add profile")
                            .font(VTTypography.title(18))
                        TextField("Display name", text: $name)
                            .font(VTTypography.body())
                            .frame(minHeight: 52)
                        Picker("Role", selection: $role) {
                            ForEach(CareRole.allCases.filter { $0 != .selfProfile }) { item in
                                Text(item.displayName).tag(item)
                            }
                        }
                        .pickerStyle(.menu)
                        .frame(minHeight: 44)
                        VTPrimaryButton("Save profile (sharing off by default)") {
                            Task { await addProfile() }
                        }
                    }
                }

                if !status.isEmpty {
                    Text(status)
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                }
            }
            .padding(20)
        }
        .background(VTAtmosphere())
        .navigationTitle("Family care")
        .task { await load() }
    }

    private func binding(for profile: CareProfile, keyPath: WritableKeyPath<CareProfile, Bool>) -> Binding<Bool> {
        Binding(
            get: { profiles.first(where: { $0.id == profile.id })?[keyPath: keyPath] ?? false },
            set: { newValue in
                guard let idx = profiles.firstIndex(where: { $0.id == profile.id }) else { return }
                profiles[idx][keyPath: keyPath] = newValue
                Task {
                    try? await composition.careProfileRepository.save(profiles[idx])
                    status = profiles[idx].sharingEnabled
                        ? "Sharing on — caregivers only see what you allow."
                        : "Sharing off — data stays private on this device."
                }
            }
        )
    }

    private func load() async {
        profiles = (try? await composition.careProfileRepository.fetchAll()) ?? []
    }

    private func addProfile() async {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else {
            status = "Enter a name for this profile."
            return
        }
        let profile = CareProfile(displayName: trimmed, role: role, sharingEnabled: false)
        do {
            try await composition.careProfileRepository.save(profile)
            name = ""
            status = "Profile saved. Sharing stays off until you turn it on."
            await load()
        } catch {
            status = error.localizedDescription
        }
    }
}
