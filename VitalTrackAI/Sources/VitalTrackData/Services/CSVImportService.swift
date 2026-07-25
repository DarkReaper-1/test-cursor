import Foundation
import VitalTrackCore

public struct CSVImportService: Sendable {
    public init() {}

    /// Expects headers including systolic, diastolic, and a date column.
    /// Optional: pulse, notes, source.
    public func importBloodPressure(from csv: String) throws -> [BloodPressureReading] {
        let lines = csv
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        guard let headerLine = lines.first else {
            throw VitalTrackError.importFailed("CSV is empty.")
        }
        let headers = splitCSVLine(headerLine).map { $0.lowercased() }
        guard let sysIdx = headers.firstIndex(where: { ["systolic", "sys", "sbp"].contains($0) }),
              let diaIdx = headers.firstIndex(where: { ["diastolic", "dia", "dbp"].contains($0) }) else {
            throw VitalTrackError.importFailed("CSV must include systolic and diastolic columns.")
        }
        let dateIdx = headers.firstIndex(where: { ["date", "recordedat", "recorded_at", "timestamp", "time"].contains($0) })
        let pulseIdx = headers.firstIndex(where: { ["pulse", "hr", "heartrate"].contains($0) })
        let notesIdx = headers.firstIndex(where: { $0 == "notes" })

        var readings: [BloodPressureReading] = []
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        for (rowIndex, line) in lines.dropFirst().enumerated() {
            let cols = splitCSVLine(line)
            guard cols.indices.contains(sysIdx), cols.indices.contains(diaIdx),
                  let sys = Int(cols[sysIdx]), let dia = Int(cols[diaIdx]) else {
                throw VitalTrackError.importFailed("Invalid numbers on row \(rowIndex + 2).")
            }
            var date = Date()
            if let dateIdx, cols.indices.contains(dateIdx) {
                let raw = cols[dateIdx]
                if let parsed = formatter.date(from: raw) ?? ISO8601DateFormatter().date(from: raw) {
                    date = parsed
                } else if let legacy = Self.fallbackDateFormatter.date(from: raw) {
                    date = legacy
                }
            }
            let pulse: Int? = {
                guard let pulseIdx, cols.indices.contains(pulseIdx) else { return nil }
                return Int(cols[pulseIdx])
            }()
            let notes: String? = {
                guard let notesIdx, cols.indices.contains(notesIdx) else { return nil }
                let n = cols[notesIdx]
                return n.isEmpty ? nil : n
            }()
            readings.append(
                BloodPressureReading(
                    systolic: sys,
                    diastolic: dia,
                    pulse: pulse,
                    recordedAt: date,
                    source: .csvImport,
                    notes: notes
                )
            )
        }
        return readings
    }

    private func splitCSVLine(_ line: String) -> [String] {
        var result: [String] = []
        var current = ""
        var inQuotes = false
        for ch in line {
            if ch == "\"" {
                inQuotes.toggle()
            } else if ch == "," && !inQuotes {
                result.append(current.trimmingCharacters(in: .whitespaces))
                current = ""
            } else {
                current.append(ch)
            }
        }
        result.append(current.trimmingCharacters(in: .whitespaces))
        return result
    }

    private static let fallbackDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd HH:mm"
        return f
    }()
}
