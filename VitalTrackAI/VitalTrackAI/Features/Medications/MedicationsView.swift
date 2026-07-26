import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct MedicationsView: View {
    @EnvironmentObject private var composition: AppComposition
    @State private var medications: [Medication] = []
    @State private var todayDoses: [MedicationDose] = []
    @State private var showAdd = false
    @State private var status = ""
    @State private var newName = ""
    @State private var newDosage = ""
    @State private var newSchedule = ""
    @State private var newInstructions = ""
    @State private var reminderHour = 8
    @State private var sideEffectDraft = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VTScreenHeader(
                    eyebrow: "Medications",
                    title: "Stay on track",
                    subtitle: "Large buttons for doses, refills, and notes. Never change doses from the app."
                )
                VTDisclaimerBanner(.custom(
                    "Medication logs support conversations with your clinician. VitalTrack AI does not prescribe or change doses."
                ))

                todayCard

                if medications.isEmpty {
                    VTEmptyState(
                        title: "No medications yet",
                        message: "Add the names and doses your clinician prescribed. Reminders stay supportive — never guilt-based.",
                        systemImage: "pills.fill"
                    )
                } else {
                    ForEach(medications) { med in
                        medicationCard(med)
                    }
                }

                VTPrimaryButton(showAdd ? "Hide add form" : "Add medication") {
                    showAdd.toggle()
                }

                if showAdd {
                    addForm
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
        .navigationTitle("Medications")
        .task { await load() }
    }

    private var todayCard: some View {
        VTCard(emphasized: true) {
            VStack(alignment: .leading, spacing: 10) {
                Text("Today")
                    .font(VTTypography.title(18))
                let taken = todayDoses.filter { $0.status == .taken }.count
                let missed = todayDoses.filter { $0.status == .missed }.count
                Text("\(taken) taken · \(missed) missed · \(medications.filter(\.isActive).count) active")
                    .font(VTTypography.body())
                    .foregroundStyle(VTColors.textSecondary)
                Text("What to do next: mark each dose when you take it. If you miss one, follow your clinician’s instructions.")
                    .font(VTTypography.caption())
                    .foregroundStyle(VTColors.textSecondary)
            }
        }
    }

    private func medicationCard(_ med: Medication) -> some View {
        VTCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(med.name)
                            .font(VTTypography.title(22))
                        Text(med.dosage)
                            .font(VTTypography.body())
                            .foregroundStyle(VTColors.textSecondary)
                    }
                    Spacer()
                    if med.needsRefillSoon {
                        VTSourceChip("Refill soon")
                    }
                }
                if let schedule = med.scheduleNote, !schedule.isEmpty {
                    Text(schedule)
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                }
                if let instructions = med.doctorInstructions, !instructions.isEmpty {
                    Text("Clinician note: \(instructions)")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textSecondary)
                }
                if let reminder = med.reminderLabel {
                    Text("Reminder \(reminder)")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.brandDeep)
                }

                HStack(spacing: 10) {
                    Button("Taken") {
                        Task { await logDose(med, status: .taken) }
                    }
                    .buttonStyle(MedActionStyle(filled: true))

                    Button("Missed") {
                        Task { await logDose(med, status: .missed) }
                    }
                    .buttonStyle(MedActionStyle(filled: false))
                }

                if let notes = med.sideEffectNotes, !notes.isEmpty {
                    Text("Side effect notes: \(notes)")
                        .font(VTTypography.caption())
                        .foregroundStyle(VTColors.textTertiary)
                }
            }
        }
    }

    private var addForm: some View {
        VTCard {
            VStack(alignment: .leading, spacing: 14) {
                Text("New medication")
                    .font(VTTypography.title(18))
                TextField("Name (e.g. Lisinopril)", text: $newName)
                    .font(VTTypography.body())
                    .frame(minHeight: 52)
                TextField("Dosage (e.g. 10 mg)", text: $newDosage)
                    .font(VTTypography.body())
                    .frame(minHeight: 52)
                TextField("Schedule note (e.g. Morning with food)", text: $newSchedule)
                    .font(VTTypography.body())
                    .frame(minHeight: 52)
                TextField("Doctor instructions (optional)", text: $newInstructions)
                    .font(VTTypography.body())
                    .frame(minHeight: 52)
                TextField("Side effect notes (optional)", text: $sideEffectDraft)
                    .font(VTTypography.body())
                    .frame(minHeight: 52)
                Stepper("Reminder hour: \(reminderHour):00", value: $reminderHour, in: 5...22)
                    .font(VTTypography.body())
                    .frame(minHeight: 48)
                VTPrimaryButton("Save medication") {
                    Task { await saveMedication() }
                }
            }
        }
    }

    private func load() async {
        medications = (try? await composition.medicationRepository.fetchAll()) ?? []
        todayDoses = (try? await composition.medicationRepository.fetchDoses(forDay: Date())) ?? []
    }

    private func saveMedication() async {
        guard !newName.trimmingCharacters(in: .whitespaces).isEmpty,
              !newDosage.trimmingCharacters(in: .whitespaces).isEmpty else {
            status = "Please enter a name and dosage."
            return
        }
        let med = Medication(
            name: newName.trimmingCharacters(in: .whitespaces),
            dosage: newDosage.trimmingCharacters(in: .whitespaces),
            scheduleNote: newSchedule.isEmpty ? nil : newSchedule,
            doctorInstructions: newInstructions.isEmpty ? nil : newInstructions,
            reminderHour: reminderHour,
            reminderMinute: 0,
            refillDate: Calendar.current.date(byAdding: .day, value: 28, to: Date()),
            sideEffectNotes: sideEffectDraft.isEmpty ? nil : sideEffectDraft
        )
        do {
            try await composition.medicationRepository.save(med)
            if let hour = med.reminderHour {
                try? await composition.reminderScheduler.schedule(
                    Reminder(
                        title: "Time for \(med.name)",
                        kind: .medication,
                        hour: hour,
                        minute: med.reminderMinute ?? 0
                    )
                )
            }
            newName = ""; newDosage = ""; newSchedule = ""; newInstructions = ""; sideEffectDraft = ""
            showAdd = false
            status = "Saved. Supportive reminders stay gentle."
            await load()
        } catch {
            status = error.localizedDescription
        }
    }

    private func logDose(_ med: Medication, status doseStatus: MedicationDoseStatus) async {
        let dose = MedicationDose(
            medicationId: med.id,
            medicationName: med.name,
            status: doseStatus
        )
        do {
            try await composition.medicationRepository.saveDose(dose)
            status = doseStatus == .taken
                ? "Nice work — \(med.name) marked taken."
                : "Missed dose noted. Follow your clinician’s guidance for next steps."
            await load()
        } catch {
            status = error.localizedDescription
        }
    }
}

private struct MedActionStyle: ButtonStyle {
    var filled: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(VTTypography.body().weight(.bold))
            .frame(maxWidth: .infinity, minHeight: 52)
            .foregroundStyle(filled ? Color.white : VTColors.brandDeep)
            .background(filled ? VTColors.brandPrimary : VTColors.subtle)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .opacity(configuration.isPressed ? 0.9 : 1)
    }
}
