import SwiftUI
import VitalTrackCore
import VitalTrackDesignSystem

struct ReportsView: View {
    @EnvironmentObject private var composition: AppComposition
    @EnvironmentObject private var session: SessionStore
    @State private var summary = ""
    @State private var exportNote = "Exports include source labels, medications, stress/anxiety, lifestyle, and trust disclaimers."
    @State private var shareCSV: Data?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VTScreenHeader(
                    eyebrow: "Reports",
                    title: "Share with your doctor",
                    subtitle: "Clinician summaries with BP, meds, stress checks, and lifestyle."
                )
                VTDisclaimerBanner(.custom(TrustCopy.medicalDisclaimer))
                VTDisclaimerBanner(.bloodPressure)

                VTPrimaryButton("Build clinician summary") {
                    Task { await buildSummary() }
                }
                VTPrimaryButton("Export BP CSV") {
                    Task { await exportCSV() }
                }
                VTPrimaryButton("Export stress & anxiety CSV") {
                    Task { await exportStressCSV() }
                }
                VTPrimaryButton("Build PDF report") {
                    Task { await buildPDF() }
                }

                Text(exportNote)
                    .font(VTTypography.caption())
                    .foregroundStyle(VTColors.textSecondary)

                if !summary.isEmpty {
                    VTCard {
                        Text(summary)
                            .font(VTTypography.caption())
                            .foregroundStyle(VTColors.textPrimary)
                            .textSelection(.enabled)
                    }
                }
            }
            .padding(20)
        }
        .background(VTAtmosphere())
        .navigationTitle("Reports")
    }

    private func buildSummary() async {
        let bp = (try? await composition.environment.bloodPressureRepository.fetchAll()) ?? []
        let hr = (try? await composition.environment.heartRateRepository.fetchAll()) ?? []
        let meds = (try? await composition.medicationRepository.fetchAll()) ?? []
        let doses = (try? await composition.medicationRepository.fetchDoses(limit: 40)) ?? []
        let checkIns = (try? await composition.checkInRepository.fetchAll()) ?? []
        let stress = (try? await composition.stressCheckRepository.fetchAll()) ?? []
        let input = DoctorReportInput(
            bloodPressure: bp,
            heartRate: hr,
            medications: meds,
            doses: doses,
            checkIns: checkIns,
            stressChecks: stress,
            patientLabel: session.settings.preferredName
        )
        summary = (try? await composition.environment.doctorReportFormatter.formatRichSummary(input))
            ?? "Could not build summary."
    }

    private func exportCSV() async {
        let bp = (try? await composition.environment.bloodPressureRepository.fetchAll()) ?? []
        if let data = try? await composition.environment.exporter.exportBloodPressureCSV(bp) {
            shareCSV = data
            exportNote = "CSV ready (\(data.count) bytes). Includes medication timing and time-of-day. Camera is never a BP source."
        }
    }

    private func exportStressCSV() async {
        let checks = (try? await composition.stressCheckRepository.fetchAll()) ?? []
        if let data = try? await composition.environment.exporter.exportStressCheckCSV(checks) {
            shareCSV = data
            exportNote = "Stress/anxiety CSV ready (\(data.count) bytes). Self-reports only — not a clinical assessment."
        }
    }

    private func buildPDF() async {
        await buildSummary()
        if let data = try? await composition.environment.pdfBuilder.buildReportPDF(
            title: "VitalTrack AI Clinician Report",
            body: summary
        ) {
            exportNote = "PDF ready (\(data.count) bytes) with meds, stress checks, lifestyle, and disclaimers."
        }
    }
}
