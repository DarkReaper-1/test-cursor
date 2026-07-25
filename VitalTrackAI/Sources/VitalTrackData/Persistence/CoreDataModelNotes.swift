import Foundation

/*
 CoreData-ready model sketch (production migration path):

 Entity: BloodPressureReadingMO
   - id: UUID
   - systolic: Int16
   - diastolic: Int16
   - pulse: Int16?
   - recordedAt: Date
   - sourceRaw: String
   - deviceName: String?
   - notes: String?
   - createdAt: Date

 Entity: HeartRateSampleMO
   - id: UUID
   - bpm: Double
   - recordedAt: Date
   - sourceRaw: String
   - isResting: Bool
   - notes: String?
   - createdAt: Date

 Entity: DeviceMO
   - id: UUID
   - name: String
   - kindRaw: String
   - peripheralIdentifier: String?
   - isFavorite: Bool
   - lastConnectedAt: Date?

 The InMemory* repositories below use JSONFileStore with the same fields so a
 future NSPersistentContainer swap keeps DTO shapes stable.
*/

/// Placeholder type documenting Core Data migration intent.
public enum CoreDataModelNotes {
    public static let schemaVersion = 1
}
