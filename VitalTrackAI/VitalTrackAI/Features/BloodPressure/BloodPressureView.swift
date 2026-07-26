import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem
import VitalTrackFeatures

struct BloodPressureView: View {
    @EnvironmentObject private var composition: AppComposition
    @State private var systolic = 120
    @State private var diastolic = 80
    @State private var pulse = 72
    @State private var source: MeasurementSource = .manual
    @State private var medicationTiming: MedicationTimingContext = .notTracked
    @State private var recent: [BloodPressureReading] = []
    @State private var status = "Type the numbers shown on your FDA-cleared cuff."
    @State private var errorMessage: String?
    @State private var showSavedToast = false
    @State private var crisisItem: CrisisSheetItem?

    private let allowedSources: [MeasurementSource] = [.manual, .bluetoothCuff, .healthKit, .csvImport]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    VTScreenHeader(
                        eyebrow: "Blood pressure",
                        title: "Enter cuff numbers",
                        subtitle: "Large steppers. Optional before/after medication."
                    )

                    VTDisclaimerBanner(.custom(
                        "Use your home cuff. " + TrustCopy.shortBPBanner
                    ))

                    VTMonitorPanel(
                        systolic: systolic,
                        diastolic: diastolic,
                        pulse: pulse,
                        categoryLabel: categoryLabel
                    )

                    VTCard {
                        VStack(alignment: .leading, spacing: 18) {
                            VTStepperField("Systolic (mmHg)", value: $systolic, range: 70...250)
                            VTStepperField("Diastolic (mmHg)", value: $diastolic, range: 40...150)
                            VTStepperField("Pulse (BPM)", value: $pulse, range: 30...220)

                            VStack(alignment: .leading, spacing: 8) {
                                Text("Source")
                                    .font(VTTypography.title(18))
                                Picker("Source", selection: $source) {
                                    ForEach(allowedSources) { item in
                                        Text(item.displayName).tag(item)
                                    }
                                }
                                .pickerStyle(.menu)
                                .frame(minHeight: 44)
                            }

                            VStack(alignment: .leading, spacing: 8) {
                                Text("Medication timing")
                                    .font(VTTypography.title(18))
                                Picker("Medication timing", selection: $medicationTiming) {
                                    ForEach(MedicationTimingContext.allCases) { item in
                                        Text(item.displayName).tag(item)
                                    }
                                }
                                .pickerStyle(.segmented)
                                .frame(minHeight: 44)
                            }

                            Text("Source: \(source.displayName) · FDA-cleared cuff")
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textSecondary)

                            VTPrimaryButton("Save this reading") {
                                Task { await save() }
                            }

                            if let errorMessage {
                                Text(errorMessage)
                                    .font(VTTypography.caption())
                                    .foregroundStyle(VTColors.danger)
                            } else {
                                Text(status)
                                    .font(VTTypography.caption())
                                    .foregroundStyle(VTColors.textSecondary)
                            }
                        }
                    }

                    VTCard {
                        VStack(alignment: .leading, spacing: 12) {
                            VTSectionHeader(
                                "Import from Apple Health",
                                subtitle: "Pulls cuff/app BP already stored in Health — not camera estimates."
                            )
                            VTPrimaryButton("Import BP from Health") {
                                Task { await importHealth() }
                            }
                        }
                    }

                    VTSectionHeader("Recent readings", subtitle: "Categories are reference only — not a diagnosis.")
                    if recent.isEmpty {
                        VTEmptyState(
                            title: "No cuff readings yet",
                            message: "Save numbers from your FDA-cleared monitor to build your history.",
                            systemImage: "heart.text.square"
                        )
                    } else {
                        ForEach(recent.prefix(10)) { reading in
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(reading.displayValue + " mmHg")
                                        .font(VTTypography.title(20))
                                        .foregroundStyle(VTColors.textPrimary)
                                    Text("\(reading.category.displayName) · \(reading.timeBucket.displayName)")
                                        .font(VTTypography.caption())
                                        .foregroundStyle(VTColors.textSecondary)
                                    if reading.medicationTiming != .notTracked {
                                        Text(reading.medicationTiming.displayName)
                                            .font(VTTypography.caption())
                                            .foregroundStyle(VTColors.brandDeep)
                                    }
                                }
                                Spacer()
                                VTSourceChip(reading.source.displayName)
                            }
                            .padding(.vertical, 8)
                            .accessibilityElement(children: .combine)
                        }
                    }
                }
                .padding(20)
            }
            .background(VTAtmosphere())
            .overlay(alignment: .top) {
                if showSavedToast {
                    Text("Cuff reading saved")
                        .font(VTTypography.body().weight(.bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 12)
                        .background(VTColors.brandDeep)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .padding(.top, 8)
                        .transition(.move(edge: .top).combined(with: .opacity))
                }
            }
            .sheet(item: $crisisItem) { item in
                CrisisGuidanceSheet(guidance: item.guidance, readingLabel: item.label) {
                    crisisItem = nil
                }
            }
            .task { await load() }
        }
    }

    private var categoryLabel: String {
        BPCategory.classify(systolic: systolic, diastolic: diastolic).displayName
    }

    private func load() async {
        recent = (try? await composition.environment.bloodPressureRepository.fetchRecent(limit: 30)) ?? []
    }

    private func save() async {
        guard MeasurementValidation.isPlausibleBloodPressure(systolic: systolic, diastolic: diastolic) else {
            errorMessage = "Check the values on your cuff and try again."
            return
        }
        guard source.isValidBloodPressureSource else {
            errorMessage = VitalTrackError.invalidBloodPressureSource(source).localizedDescription
            return
        }
        let reading = BloodPressureReading(
            systolic: systolic,
            diastolic: diastolic,
            pulse: pulse,
            source: source,
            deviceName: "External monitor",
            medicationTiming: medicationTiming
        )
        do {
            try await composition.environment.bloodPressureRepository.save(reading)
            status = plainLanguageStatus(for: reading)
            errorMessage = nil
            await load()
            withAnimation { showSavedToast = true }
            try? await Task.sleep(nanoseconds: 1_800_000_000)
            withAnimation { showSavedToast = false }
            if let guidance = composition.crisisEngine.guidance(for: reading) {
                crisisItem = CrisisSheetItem(guidance: guidance, label: reading.displayValue)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func plainLanguageStatus(for reading: BloodPressureReading) -> String {
        switch reading.category {
        case .normal, .elevated:
            return "Saved \(reading.displayValue) mmHg. You’re building a helpful record for your clinician."
        case .hypertensionStage1:
            return "Saved \(reading.displayValue) mmHg. Keep logging calmly and share patterns at your next visit."
        default:
            return "Saved \(reading.displayValue) mmHg. Review the calm guidance if it appears."
        }
    }

    private func importHealth() async {
        do {
            let since = Calendar.current.date(byAdding: .day, value: -30, to: Date()) ?? Date()
            let imported = try await composition.environment.healthKit.importBloodPressure(since: since)
            for reading in imported {
                try await composition.environment.bloodPressureRepository.save(reading)
            }
            status = "Imported \(imported.count) BP readings from Apple Health."
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct CrisisSheetItem: Identifiable {
    let id = UUID()
    let guidance: CrisisGuidance
    let label: String
}

#Preview {
    BloodPressureView()
        .environmentObject(AppComposition())
}
