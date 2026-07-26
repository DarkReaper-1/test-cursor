import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct SettingsView: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var composition: AppComposition
    @State private var name: String = ""
    @State private var reminderHour = 9

    var body: some View {
        Form {
            Section("Profile") {
                TextField("Preferred name", text: $name)
                    .onAppear { name = session.settings.preferredName ?? "" }
                    .onSubmit { Task { await saveName() } }
            }

            Section("Comfort & readability") {
                Text("Designed for easy reading at age 40 and beyond.")
                    .font(VTTypography.caption())
                    .foregroundStyle(VTColors.textSecondary)
                Toggle("Larger text", isOn: comfortBinding(\.largerText))
                Toggle("Higher contrast", isOn: comfortBinding(\.higherContrast))
                Toggle("Reduce motion", isOn: comfortBinding(\.reduceMotion))
            }

            Section("Home cards") {
                ForEach(DashboardCardKind.companionDefaults) { card in
                    Toggle(card.title, isOn: binding(for: card))
                }
            }

            Section("Permissions") {
                Toggle("Apple Health enabled", isOn: healthKitBinding)
                Button("Request Health access") {
                    Task {
                        try? await composition.environment.healthKit.requestAuthorization(writeBloodPressure: true)
                    }
                }
                Button("Enable reminders") {
                    Task {
                        let ok = try? await composition.reminderScheduler.requestAuthorization()
                        var s = session.settings
                        s.notificationsEnabled = ok ?? false
                        await session.updateSettings(s, settingsStore: composition.settingsStore)
                        if ok == true {
                            try? await composition.reminderScheduler.schedule(
                                Reminder(title: "Log blood pressure", kind: .bloodPressureLog, hour: reminderHour, minute: 0)
                            )
                        }
                    }
                }
            }

            Section("Trust") {
                Text(TrustCopy.medicalDisclaimer)
                    .font(VTTypography.caption())
                Text(TrustCopy.bloodPressureSource)
                    .font(VTTypography.caption())
                Text(TrustCopy.heartRatePPG)
                    .font(VTTypography.caption())
            }
        }
        .scrollContentBackground(.hidden)
        .background(VTAtmosphere())
        .navigationTitle("Settings")
    }

    private func binding(for card: DashboardCardKind) -> Binding<Bool> {
        Binding(
            get: { session.settings.dashboardCards.contains(card) },
            set: { enabled in
                var s = session.settings
                if enabled {
                    if !s.dashboardCards.contains(card) { s.dashboardCards.append(card) }
                } else {
                    s.dashboardCards.removeAll { $0 == card }
                }
                Task { await session.updateSettings(s, settingsStore: composition.settingsStore) }
            }
        )
    }

    private var healthKitBinding: Binding<Bool> {
        Binding(
            get: { session.settings.healthKitEnabled },
            set: { value in
                var s = session.settings
                s.healthKitEnabled = value
                Task { await session.updateSettings(s, settingsStore: composition.settingsStore) }
            }
        )
    }

    private func comfortBinding(_ keyPath: WritableKeyPath<UserSettings, Bool>) -> Binding<Bool> {
        Binding(
            get: { session.settings[keyPath: keyPath] },
            set: { value in
                var s = session.settings
                s[keyPath: keyPath] = value
                Task { await session.updateSettings(s, settingsStore: composition.settingsStore) }
            }
        )
    }

    private func saveName() async {
        var s = session.settings
        s.preferredName = name
        await session.updateSettings(s, settingsStore: composition.settingsStore)
    }
}
