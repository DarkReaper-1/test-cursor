import Foundation
import VitalTrackCore

public struct DoctorReportFormatter: DoctorReportFormatting {
    public init() {}

    public func formatSummary(
        bloodPressure: [BloodPressureReading],
        heartRate: [HeartRateSample],
        patientLabel: String?
    ) async throws -> String {
        let name = patientLabel?.isEmpty == false ? patientLabel! : "Patient"
        var lines: [String] = []
        lines.append("VitalTrack AI — Clinician summary")
        lines.append("Prepared for: \(name)")
        lines.append("Generated: \(ISO8601DateFormatter().string(from: Date()))")
        lines.append("")
        lines.append("TRUST DISCLAIMER")
        lines.append(TrustPolicy.medicalDisclaimer)
        lines.append(TrustPolicy.bloodPressureSourceDisclaimer)
        lines.append(TrustPolicy.heartRatePPGDisclaimer)
        lines.append("")
        lines.append("BLOOD PRESSURE (\(bloodPressure.count) readings)")
        if bloodPressure.isEmpty {
            lines.append("No blood pressure readings on file.")
        } else {
            let sys = bloodPressure.map(\.systolic)
            let dia = bloodPressure.map(\.diastolic)
            lines.append(String(
                format: "Systolic range: %d–%d mmHg (avg %.0f)",
                sys.min() ?? 0, sys.max() ?? 0,
                Double(sys.reduce(0, +)) / Double(sys.count)
            ))
            lines.append(String(
                format: "Diastolic range: %d–%d mmHg (avg %.0f)",
                dia.min() ?? 0, dia.max() ?? 0,
                Double(dia.reduce(0, +)) / Double(dia.count)
            ))
            lines.append("Sources: \(Set(bloodPressure.map { $0.source.displayName }).sorted().joined(separator: ", "))")
            lines.append("Recent entries:")
            for r in bloodPressure.prefix(10) {
                lines.append("- \(ISO8601DateFormatter().string(from: r.recordedAt)): \(r.displayValue) mmHg [\(r.source.displayName)] (\(r.category.displayName))")
            }
        }
        lines.append("")
        lines.append("HEART RATE (\(heartRate.count) samples)")
        if heartRate.isEmpty {
            lines.append("No heart rate samples on file.")
        } else {
            let bpms = heartRate.map(\.bpm)
            lines.append(String(
                format: "BPM range: %.0f–%.0f (avg %.0f)",
                bpms.min() ?? 0, bpms.max() ?? 0,
                bpms.reduce(0, +) / Double(bpms.count)
            ))
            lines.append("Sources: \(Set(heartRate.map { $0.source.displayName }).sorted().joined(separator: ", "))")
        }
        lines.append("")
        lines.append("Category labels are AHA-style reference ranges only and are not a diagnosis.")
        return lines.joined(separator: "\n")
    }
}
