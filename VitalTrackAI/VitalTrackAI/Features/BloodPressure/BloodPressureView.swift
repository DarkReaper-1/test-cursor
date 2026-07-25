import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem
import VitalTrackFeatures

struct BloodPressureView: View {
    @EnvironmentObject private var composition: AppComposition
    @State private var systolicText = "120"
    @State private var diastolicText = "80"
    @State private var pulseText = ""
    @State private var source: MeasurementSource = .manual
    @State private var recent: [BloodPressureReading] = []
    @State private var status = "BP is never estimated from the camera."
    @State private var errorMessage: String?

    private let allowedSources: [MeasurementSource] = [.manual, .bluetoothCuff, .healthKit, .csvImport]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("Blood pressure")
                        .font(VTTypography.display(34))
                        .foregroundStyle(VTColors.brandPrimary)

                    VTDisclaimerBanner(.bloodPressure)
                    VTDisclaimerBanner(.custom(TrustCopy.bloodPressureSource))

                    if let latest = recent.first {
                        VTMetricHero(
                            value: latest.displayValue,
                            unit: "mmHg",
                            caption: "\(latest.source.displayName) · \(latest.category.displayName)"
                        )
                    }

                    VTCard {
                        VStack(alignment: .leading, spacing: 12) {
                            VTSectionHeader("Manual entry", subtitle: "Type the numbers shown on your FDA-cleared cuff.")
                            HStack {
                                labeledField("Systolic", text: $systolicText)
                                labeledField("Diastolic", text: $diastolicText)
                                labeledField("Pulse", text: $pulseText)
                            }
                            Picker("Source", selection: $source) {
                                ForEach(allowedSources) { item in
                                    Text(item.displayName).tag(item)
                                }
                            }
                            .pickerStyle(.menu)
                            VTPrimaryButton("Save reading") {
                                Task { await save() }
                            }
                            Text(status)
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textSecondary)
                            if let errorMessage {
                                Text(errorMessage)
                                    .font(VTTypography.caption())
                                    .foregroundStyle(VTColors.danger)
                            }
                        }
                    }

                    VTCard {
                        VStack(alignment: .leading, spacing: 12) {
                            VTSectionHeader("Import from Apple Health")
                            Text("Pulls cuff/app BP already stored in Health — not camera estimates.")
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textSecondary)
                            VTPrimaryButton("Import BP") {
                                Task { await importHealth() }
                            }
                        }
                    }

                    VTSectionHeader("Recent", subtitle: "AHA-style categories are reference only.")
                    ForEach(recent.prefix(10)) { reading in
                        HStack {
                            Text(reading.displayValue + " mmHg")
                                .font(VTTypography.body().weight(.semibold))
                            Spacer()
                            Text(reading.source.displayName)
                                .font(VTTypography.caption())
                                .foregroundStyle(VTColors.textTertiary)
                        }
                        .padding(.vertical, 4)
                    }
                }
                .padding()
            }
            .background(VTColors.canvasGradient.ignoresSafeArea())
            .task { await load() }
        }
    }

    private func labeledField(_ title: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(VTTypography.caption()).foregroundStyle(VTColors.textTertiary)
            TextField(title, text: text)
                .keyboardType(.numberPad)
                .textFieldStyle(.roundedBorder)
        }
    }

    private func load() async {
        recent = (try? await composition.environment.bloodPressureRepository.fetchRecent(limit: 30)) ?? []
    }

    private func save() async {
        guard let sys = Int(systolicText), let dia = Int(diastolicText) else {
            errorMessage = "Enter systolic and diastolic whole numbers from your monitor."
            return
        }
        guard MeasurementValidation.isPlausibleBloodPressure(systolic: sys, diastolic: dia) else {
            errorMessage = "Check the values on your cuff and try again."
            return
        }
        guard source.isValidBloodPressureSource else {
            errorMessage = VitalTrackError.invalidBloodPressureSource(source).localizedDescription
            return
        }
        let reading = BloodPressureReading(
            systolic: sys,
            diastolic: dia,
            pulse: Int(pulseText),
            source: source,
            deviceName: "External monitor"
        )
        do {
            try await composition.environment.bloodPressureRepository.save(reading)
            status = "Saved \(reading.displayValue) mmHg."
            errorMessage = nil
            await load()
        } catch {
            errorMessage = error.localizedDescription
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

#Preview {
    BloodPressureView()
        .environmentObject(AppComposition())
}
