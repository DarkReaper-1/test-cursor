import CoreData
import Foundation

/// Manual NSManagedObject subclass for the `HeartRateReadingEntity` entity.
/// The Xcode Core Data model editor's Codegen must be set to "Manual/None"
/// for this entity — see docs/database-schema.md for the entity definition
/// this expects to find in `VitalTrack.xcdatamodeld`.
@objc(HeartRateReadingEntity)
public final class HeartRateReadingEntity: NSManagedObject {
    @NSManaged public var id: UUID
    @NSManaged public var takenAt: Date
    @NSManaged public var bpm: Int16
    @NSManaged public var hrvRMSSDMs: NSNumber?
    @NSManaged public var sourceRaw: String
}

extension HeartRateReadingEntity {
    @nonobjc public class func fetchRequest() -> NSFetchRequest<HeartRateReadingEntity> {
        NSFetchRequest<HeartRateReadingEntity>(entityName: "HeartRateReadingEntity")
    }

    func apply(from reading: HeartRateReading) {
        id = reading.id
        takenAt = reading.takenAt
        bpm = Int16(reading.bpm)
        hrvRMSSDMs = reading.hrvRMSSDMs.map { NSNumber(value: $0) }
        sourceRaw = reading.source.rawValue
    }

    func toModel() -> HeartRateReading {
        HeartRateReading(
            id: id,
            takenAt: takenAt,
            bpm: Int(bpm),
            hrvRMSSDMs: hrvRMSSDMs?.doubleValue,
            source: HeartRateSource(rawValue: sourceRaw) ?? .manual
        )
    }
}
