import SwiftUI
import VitalTrackCore

struct SettingsView: View {
    @EnvironmentObject private var container: AppContainer
    @EnvironmentObject private var settings: SettingsStore
    @State private var reminders: [ReminderSchedule] = []
    @State private var deleteConfirming = false
    @State private var statusMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Reminders") {
                    ForEach($reminders) { $reminder in
                        ReminderRow(reminder: $reminder) {
                            Task {
                                if reminder.enabled {
                                    let granted = (try? await container.reminderScheduler.requestAuthorization()) ?? false
                                    if !granted {
                                        statusMessage = "Notifications permission was denied."
                                        reminder.enabled = false
                                        settings.reminderSchedules = reminders
                                        return
                                    }
                                }
                                await container.reminderScheduler.apply(reminder)
                                settings.reminderSchedules = reminders
                            }
                        }
                    }
                }

                Section("Apple Health") {
                    Toggle("Write readings to Health", isOn: $settings.healthKitWriteEnabled)
                        .onChange(of: settings.healthKitWriteEnabled) { _, enabled in
                            if enabled { Task { try? await container.healthKit.requestAuthorization(readAlso: settings.healthKitReadEnabled) } }
                        }
                    Toggle("Show my existing Health history", isOn: $settings.healthKitReadEnabled)
                        .onChange(of: settings.healthKitReadEnabled) { _, enabled in
                            Task { try? await container.healthKit.requestAuthorization(readAlso: enabled) }
                        }
                    Text("Off by default. Writing only ever adds to your own Health data; nothing is deleted or modified. VitalTrack has no server, so none of this is shared beyond your device and iCloud (if you use Apple's own Health sync).")
                        .font(.footnote).foregroundStyle(.secondary)
                }

                Section("iCloud sync") {
                    Toggle("Sync across your devices", isOn: $settings.iCloudSyncEnabled)
                    Text("Uses your personal iCloud account via Core Data + CloudKit — VitalTrack itself has no server and cannot see this data.")
                        .font(.footnote).foregroundStyle(.secondary)
                }

                Section("Data") {
                    NavigationLink("Devices") { DevicesView { reading in Task { try? await container.repository.addBloodPressure(reading) } } }
                    NavigationLink("Reports") { ReportsView() }
                    Button("Delete all data", role: .destructive) { deleteConfirming = true }
                }

                Section("About") {
                    NavigationLink("Subscription") { SubscriptionView() }
                    NavigationLink("Help & FAQ") { HelpView() }
                    NavigationLink("Privacy") { PrivacyView() }
                }

                if let statusMessage {
                    Section { Text(statusMessage).font(.footnote).foregroundStyle(.secondary) }
                }
            }
            .navigationTitle("Settings")
            .onAppear { if reminders.isEmpty { reminders = settings.reminderSchedules } }
            .confirmationDialog("Delete all data?", isPresented: $deleteConfirming, titleVisibility: .visible) {
                Button("Delete everything", role: .destructive) {
                    Task { try? await container.repository.deleteAll() }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This permanently deletes every reading stored on this device. It cannot be undone.")
            }
        }
    }
}

private struct ReminderRow: View {
    @Binding var reminder: ReminderSchedule
    let onChange: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Toggle(reminder.kind.title, isOn: $reminder.enabled)
                .onChange(of: reminder.enabled) { _, _ in onChange() }
            if reminder.enabled {
                DatePicker(
                    "Time",
                    selection: Binding(
                        get: {
                            Calendar.current.date(bySettingHour: reminder.hour, minute: reminder.minute, second: 0, of: Date()) ?? Date()
                        },
                        set: { newDate in
                            let components = Calendar.current.dateComponents([.hour, .minute], from: newDate)
                            reminder.hour = components.hour ?? 9
                            reminder.minute = components.minute ?? 0
                            onChange()
                        }
                    ),
                    displayedComponents: .hourAndMinute
                )
                .font(.footnote)
            }
        }
    }
}
