import Foundation
import VitalTrackCore

@MainActor
final class BloodPressureLogViewModel: ObservableObject {
    @Published var systolicText = ""
    @Published var diastolicText = ""
    @Published var pulseText = ""
    @Published var notes = ""
    @Published private(set) var errorMessage: String?
    @Published private(set) var isSaving = false

    private let repository: HealthRepository
    private let healthKit: HealthKitManager
    private let settings: SettingsStore

    init(repository: HealthRepository, healthKit: HealthKitManager, settings: SettingsStore) {
        self.repository = repository
        self.healthKit = healthKit
        self.settings = settings
    }

    func save() async -> Bool {
        guard let systolic = Int(systolicText), (50...260).contains(systolic) else {
            errorMessage = "Enter a systolic value between 50 and 260."
            return false
        }
        guard let diastolic = Int(diastolicText), (30...180).contains(diastolic) else {
            errorMessage = "Enter a diastolic value between 30 and 180."
            return false
        }
        errorMessage = nil
        isSaving = true
        defer { isSaving = false }

        let reading = BloodPressureReading(
            takenAt: Date(),
            systolic: systolic,
            diastolic: diastolic,
            pulse: Int(pulseText),
            source: .manual,
            notes: notes.isEmpty ? nil : notes
        )

        do {
            try await repository.addBloodPressure(reading)
            if settings.healthKitWriteEnabled {
                try? await healthKit.writeBloodPressure(reading)
            }
            return true
        } catch {
            errorMessage = "Couldn't save this reading: \(error.localizedDescription)"
            return false
        }
    }

    /// Parses a CSV export from another app / a doctor's office system.
    /// Expected columns: `date,systolic,diastolic[,pulse]`, header optional.
    func importCsv(from url: URL) async -> Result<Int, String> {
        guard let text = try? String(contentsOf: url, encoding: .utf8) else {
            return .failure("Couldn't read that file. Make sure it's a plain-text CSV.")
        }
        let lines = text.split(separator: "\n").map(String.init)
        let formatter = ISO8601DateFormatter()
        var imported = 0

        for (index, line) in lines.enumerated() {
            let columns = line.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
            guard columns.count >= 3 else { continue }
            guard let systolic = Int(columns[1]), let diastolic = Int(columns[2]) else {
                if index == 0 { continue } // likely a header row
                return .failure("Row \(index + 1) has a non-numeric systolic/diastolic value: \"\(line)\".")
            }
            let date = formatter.date(from: columns[0]) ?? Date()
            let pulse = columns.count >= 4 ? Int(columns[3]) : nil
            let reading = BloodPressureReading(takenAt: date, systolic: systolic, diastolic: diastolic, pulse: pulse, source: .csvImport)
            try? await repository.addBloodPressure(reading)
            imported += 1
        }

        return imported > 0 ? .success(imported) : .failure("No valid rows were found in that file.")
    }
}
