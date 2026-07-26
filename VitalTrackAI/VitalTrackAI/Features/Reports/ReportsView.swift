import SwiftUI
import VitalTrackDesignSystem

struct ReportsView: View {
    @EnvironmentObject private var composition: AppComposition
    @EnvironmentObject private var session: SessionStore
    @State private var summary = ""
    @State private var exportNote = "Exports include source labels and trust disclaimers."
    @State private var shareCSV: Data?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VTScreenHeader(
                    eyebrow: "Reports",
                    title: "Share with your doctor",
                    subtitle: "Exports include source labels and honest disclaimers."
                )
                VTDisclaimerBanner(.custom(TrustCopy.medicalDisclaimer))
                VTDisclaimerBanner(.bloodPressure)

                VTPrimaryButton("Build clinician summary") {
                    Task { await buildSummary() }
                }
                VTPrimaryButton("Export BP CSV") {
                    Task { await exportCSV() }
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
        summary = (try? await composition.environment.doctorReportFormatter.formatSummary(
            bloodPressure: bp,
            heartRate: hr,
            patientLabel: session.settings.preferredName
        )) ?? "Could not build summary."
    }

    private func exportCSV() async {
        let bp = (try? await composition.environment.bloodPressureRepository.fetchAll()) ?? []
        if let data = try? await composition.environment.exporter.exportBloodPressureCSV(bp) {
            shareCSV = data
            exportNote = "CSV ready (\(data.count) bytes). Sources are labeled; camera is never a BP source."
        }
    }

    private func buildPDF() async {
        await buildSummary()
        if let data = try? await composition.environment.pdfBuilder.buildReportPDF(
            title: "VitalTrack AI Clinician Report",
            body: summary
        ) {
            exportNote = "PDF ready (\(data.count) bytes) with embedded disclaimers."
        }
    }
}
