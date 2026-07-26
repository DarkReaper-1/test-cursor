import Foundation

public protocol MedicationRepository: Sendable {
    func fetchAll() async throws -> [Medication]
    func fetchActive() async throws -> [Medication]
    func save(_ medication: Medication) async throws
    func delete(id: UUID) async throws

    func fetchDoses(limit: Int) async throws -> [MedicationDose]
    func fetchDoses(forDay date: Date) async throws -> [MedicationDose]
    func saveDose(_ dose: MedicationDose) async throws
}

public protocol CareProfileRepository: Sendable {
    func fetchAll() async throws -> [CareProfile]
    func save(_ profile: CareProfile) async throws
    func delete(id: UUID) async throws
}
