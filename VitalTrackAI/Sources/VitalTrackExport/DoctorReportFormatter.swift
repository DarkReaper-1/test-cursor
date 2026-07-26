import Foundation
import VitalTrackCore

public struct DoctorReportFormatter: DoctorReportFormatting {
    private let calendar = Calendar.current

    public init() {}

    public func formatSummary(
        bloodPressure: [BloodPressureReading],
        heartRate: [HeartRateSample],
        patientLabel: String?
    ) async throws -> String {
        try await formatRichSummary(
            DoctorReportInput(
                bloodPressure: bloodPressure,
                heartRate: heartRate,
                patientLabel: patientLabel
            )
        )
    }

    public func formatRichSummary(_ input: DoctorReportInput) async throws -> String {
        let name = input.patientLabel?.isEmpty == false ? input.patientLabel! : "Patient"
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

        appendBloodPressureSection(&lines, input.bloodPressure)
        lines.append("")
        appendHeartRateSection(&lines, input.heartRate)
        lines.append("")
        appendMedicationSection(&lines, medications: input.medications, doses: input.doses)
        lines.append("")
        appendLifestyleSection(&lines, input.checkIns)
        lines.append("")
        lines.append("Category labels are AHA-style reference ranges only and are not a diagnosis.")
        lines.append("This report is generated from patient-entered and device-imported data for clinical conversation support.")
        return lines.joined(separator: "\n")
    }

    private func appendBloodPressureSection(_ lines: inout [String], _ bloodPressure: [BloodPressureReading]) {
        lines.append("BLOOD PRESSURE (\(bloodPressure.count) readings)")
        if bloodPressure.isEmpty {
            lines.append("No blood pressure readings on file.")
            return
        }
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

        let morning = bloodPressure.filter { $0.timeBucket == .morning }
        let evening = bloodPressure.filter { $0.timeBucket == .evening }
        if morning.count >= 2 {
            lines.append(String(
                format: "Morning avg: %.0f/%.0f (%d readings)",
                avg(morning.map(\.systolic)), avg(morning.map(\.diastolic)), morning.count
            ))
        }
        if evening.count >= 2 {
            lines.append(String(
                format: "Evening avg: %.0f/%.0f (%d readings)",
                avg(evening.map(\.systolic)), avg(evening.map(\.diastolic)), evening.count
            ))
        }

        let before = bloodPressure.filter { $0.medicationTiming == .beforeMedication }
        let after = bloodPressure.filter { $0.medicationTiming == .afterMedication }
        if before.count >= 1 {
            lines.append(String(format: "Before medication avg systolic: %.0f (%d)", avg(before.map(\.systolic)), before.count))
        }
        if after.count >= 1 {
            lines.append(String(format: "After medication avg systolic: %.0f (%d)", avg(after.map(\.systolic)), after.count))
        }

        lines.append("Sources: \(Set(bloodPressure.map { $0.source.displayName }).sorted().joined(separator: ", "))")
        lines.append("Weekly summary (last 7 days):")
        let week = bloodPressure.filter { $0.recordedAt >= daysAgo(7) }
        if week.isEmpty {
            lines.append("- No readings in the last 7 days.")
        } else {
            lines.append(String(
                format: "- %d readings · avg %.0f/%.0f · high %d/%d · low %d/%d",
                week.count,
                avg(week.map(\.systolic)), avg(week.map(\.diastolic)),
                week.map(\.systolic).max() ?? 0, week.map(\.diastolic).max() ?? 0,
                week.map(\.systolic).min() ?? 0, week.map(\.diastolic).min() ?? 0
            ))
        }
        lines.append("Recent entries:")
        for r in bloodPressure.sorted(by: { $0.recordedAt > $1.recordedAt }).prefix(12) {
            var extra = "[\(r.source.displayName)]"
            if r.medicationTiming != .notTracked { extra += " · \(r.medicationTiming.displayName)" }
            extra += " · \(r.timeBucket.displayName)"
            lines.append("- \(ISO8601DateFormatter().string(from: r.recordedAt)): \(r.displayValue) mmHg \(extra) (\(r.category.displayName))")
        }
    }

    private func appendHeartRateSection(_ lines: inout [String], _ heartRate: [HeartRateSample]) {
        lines.append("HEART RATE (\(heartRate.count) samples)")
        if heartRate.isEmpty {
            lines.append("No heart rate samples on file.")
            return
        }
        let bpms = heartRate.map(\.bpm)
        lines.append(String(
            format: "BPM range: %.0f–%.0f (avg %.0f)",
            bpms.min() ?? 0, bpms.max() ?? 0,
            bpms.reduce(0, +) / Double(bpms.count)
        ))
        lines.append("Sources: \(Set(heartRate.map { $0.source.displayName }).sorted().joined(separator: ", "))")
    }

    private func appendMedicationSection(
        _ lines: inout [String],
        medications: [Medication],
        doses: [MedicationDose]
    ) {
        lines.append("MEDICATIONS (\(medications.filter(\.isActive).count) active)")
        if medications.isEmpty {
            lines.append("No medications on file.")
        } else {
            for med in medications where med.isActive {
                var line = "- \(med.name) \(med.dosage)"
                if let schedule = med.scheduleNote, !schedule.isEmpty { line += " · \(schedule)" }
                if let instructions = med.doctorInstructions, !instructions.isEmpty {
                    line += " · Clinician note: \(instructions)"
                }
                if med.needsRefillSoon { line += " · Refill soon" }
                lines.append(line)
            }
        }
        let recentDoses = doses.sorted { $0.takenAt > $1.takenAt }.prefix(14)
        lines.append("Recent dose log (\(recentDoses.count) shown):")
        if recentDoses.isEmpty {
            lines.append("- No doses logged yet.")
        } else {
            for dose in recentDoses {
                var line = "- \(ISO8601DateFormatter().string(from: dose.takenAt)): \(dose.medicationName) — \(dose.status.displayName)"
                if let note = dose.sideEffectNote, !note.isEmpty { line += " · Side effect note: \(note)" }
                lines.append(line)
            }
        }
    }

    private func appendLifestyleSection(_ lines: inout [String], _ checkIns: [CheckIn]) {
        let recent = checkIns.sorted { $0.date > $1.date }.prefix(14)
        lines.append("LIFESTYLE CHECK-INS (\(recent.count) recent days)")
        if recent.isEmpty {
            lines.append("No lifestyle check-ins on file.")
            return
        }
        for checkIn in recent {
            var parts: [String] = [
                ISO8601DateFormatter().string(from: checkIn.date),
                "water \(checkIn.waterGlasses)"
            ]
            if let sleep = checkIn.sleepHours { parts.append(String(format: "sleep %.1fh", sleep)) }
            if let mood = checkIn.mood { parts.append("mood \(mood.displayName)") }
            if let weight = checkIn.weightKg { parts.append(String(format: "weight %.1f kg", weight)) }
            if let sodium = checkIn.sodiumMg { parts.append("sodium \(sodium) mg") }
            if let exercise = checkIn.exerciseMinutes { parts.append("exercise \(exercise) min") }
            if let steps = checkIn.steps { parts.append("steps \(steps)") }
            if let stress = checkIn.stressLevel { parts.append("stress \(stress.displayName)") }
            if let caffeine = checkIn.caffeineCups { parts.append("caffeine \(caffeine) cups") }
            if let alcohol = checkIn.alcoholDrinks { parts.append("alcohol \(alcohol)") }
            lines.append("- " + parts.joined(separator: " · "))
        }
    }

    private func avg(_ values: [Int]) -> Double {
        guard !values.isEmpty else { return 0 }
        return Double(values.reduce(0, +)) / Double(values.count)
    }

    private func daysAgo(_ n: Int) -> Date {
        calendar.date(byAdding: .day, value: -n, to: Date()) ?? Date()
    }
}
