import Foundation
import VitalTrackCore

public actor InMemoryMedicationRepository: MedicationRepository {
    private var medications: [Medication] = []
    private var doses: [MedicationDose] = []
    private let medStore: JSONFileStore<Medication>
    private let doseStore: JSONFileStore<MedicationDose>
    private let calendar = Calendar.current

    public init(
        medFilename: String = "medications.json",
        doseFilename: String = "medication_doses.json",
        directory: URL? = nil
    ) {
        self.medStore = JSONFileStore(filename: medFilename, directory: directory)
        self.doseStore = JSONFileStore(filename: doseFilename, directory: directory)
    }

    private func ensureLoaded() async {
        if medications.isEmpty {
            medications = (try? await medStore.load()) ?? []
        }
        if doses.isEmpty {
            doses = (try? await doseStore.load()) ?? []
        }
    }

    public func fetchAll() async throws -> [Medication] {
        await ensureLoaded()
        return medications.sorted { $0.createdAt > $1.createdAt }
    }

    public func fetchActive() async throws -> [Medication] {
        try await fetchAll().filter(\.isActive)
    }

    public func save(_ medication: Medication) async throws {
        await ensureLoaded()
        if let idx = medications.firstIndex(where: { $0.id == medication.id }) {
            medications[idx] = medication
        } else {
            medications.insert(medication, at: 0)
        }
        try await medStore.save(medications)
    }

    public func delete(id: UUID) async throws {
        await ensureLoaded()
        medications.removeAll { $0.id == id }
        try await medStore.save(medications)
    }

    public func fetchDoses(limit: Int) async throws -> [MedicationDose] {
        await ensureLoaded()
        return Array(doses.sorted { $0.takenAt > $1.takenAt }.prefix(limit))
    }

    public func fetchDoses(forDay date: Date) async throws -> [MedicationDose] {
        await ensureLoaded()
        return doses
            .filter { calendar.isDate($0.takenAt, inSameDayAs: date) }
            .sorted { $0.takenAt > $1.takenAt }
    }

    public func saveDose(_ dose: MedicationDose) async throws {
        await ensureLoaded()
        if let idx = doses.firstIndex(where: { $0.id == dose.id }) {
            doses[idx] = dose
        } else {
            doses.insert(dose, at: 0)
        }
        try await doseStore.save(doses)
    }
}

public actor InMemoryCareProfileRepository: CareProfileRepository {
    private var profiles: [CareProfile] = []
    private let store: JSONFileStore<CareProfile>

    public init(filename: String = "care_profiles.json", directory: URL? = nil) {
        self.store = JSONFileStore(filename: filename, directory: directory)
    }

    private func ensureLoaded() async {
        if profiles.isEmpty {
            profiles = (try? await store.load()) ?? []
        }
    }

    public func fetchAll() async throws -> [CareProfile] {
        await ensureLoaded()
        return profiles.sorted { $0.createdAt > $1.createdAt }
    }

    public func save(_ profile: CareProfile) async throws {
        await ensureLoaded()
        if let idx = profiles.firstIndex(where: { $0.id == profile.id }) {
            profiles[idx] = profile
        } else {
            profiles.insert(profile, at: 0)
        }
        try await store.save(profiles)
    }

    public func delete(id: UUID) async throws {
        await ensureLoaded()
        profiles.removeAll { $0.id == id }
        try await store.save(profiles)
    }
}
