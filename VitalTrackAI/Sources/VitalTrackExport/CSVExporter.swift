import Foundation
import VitalTrackCore

public struct CSVExporter: Exporting {
    private let iso = ISO8601DateFormatter()

    public init() {}

    public func exportBloodPressureCSV(_ readings: [BloodPressureReading]) async throws -> Data {
        var lines = [
            "id,systolic,diastolic,pulse,recordedAt,source,deviceName,notes,category,medicationTiming,timeBucket,linkedMedicationId"
        ]
        for r in readings.sorted(by: { $0.recordedAt < $1.recordedAt }) {
            let pulse = r.pulse.map(String.init) ?? ""
            let device = escape(r.deviceName ?? "")
            let notes = escape(r.notes ?? "")
            let linked = r.linkedMedicationId?.uuidString ?? ""
            lines.append([
                r.id.uuidString,
                String(r.systolic),
                String(r.diastolic),
                pulse,
                iso.string(from: r.recordedAt),
                r.source.rawValue,
                device,
                notes,
                r.category.rawValue,
                r.medicationTiming.rawValue,
                r.timeBucket.rawValue,
                linked
            ].joined(separator: ","))
        }
        guard let data = lines.joined(separator: "\n").data(using: .utf8) else {
            throw VitalTrackError.exportFailed("Could not encode BP CSV.")
        }
        return data
    }

    public func exportHeartRateCSV(_ samples: [HeartRateSample]) async throws -> Data {
        var lines = ["id,bpm,recordedAt,source,isResting,notes"]
        for s in samples.sorted(by: { $0.recordedAt < $1.recordedAt }) {
            lines.append([
                s.id.uuidString,
                String(format: "%.2f", s.bpm),
                iso.string(from: s.recordedAt),
                s.source.rawValue,
                s.isResting ? "true" : "false",
                escape(s.notes ?? "")
            ].joined(separator: ","))
        }
        guard let data = lines.joined(separator: "\n").data(using: .utf8) else {
            throw VitalTrackError.exportFailed("Could not encode HR CSV.")
        }
        return data
    }

    public func exportStressCheckCSV(_ checks: [StressCheck]) async throws -> Data {
        var lines = [
            "id,stressScore,anxietyScore,combinedScore,intensityBand,bodySignals,completedBreathing,notes,recordedAt"
        ]
        for c in checks.sorted(by: { $0.recordedAt < $1.recordedAt }) {
            let signals = escape(c.bodySignals.map(\.rawValue).joined(separator: "|"))
            lines.append([
                c.id.uuidString,
                String(c.stressScore),
                String(c.anxietyScore),
                String(format: "%.1f", c.combinedScore),
                c.intensityBand.rawValue,
                signals,
                c.completedBreathing ? "true" : "false",
                escape(c.notes ?? ""),
                iso.string(from: c.recordedAt)
            ].joined(separator: ","))
        }
        guard let data = lines.joined(separator: "\n").data(using: .utf8) else {
            throw VitalTrackError.exportFailed("Could not encode stress check CSV.")
        }
        return data
    }

    private func escape(_ value: String) -> String {
        if value.contains(",") || value.contains("\"") || value.contains("\n") {
            return "\"" + value.replacingOccurrences(of: "\"", with: "\"\"") + "\""
        }
        return value
    }
}
