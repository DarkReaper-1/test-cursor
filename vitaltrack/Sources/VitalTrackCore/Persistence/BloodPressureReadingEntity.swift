import CoreData
import Foundation

@objc(BloodPressureReadingEntity)
public final class BloodPressureReadingEntity: NSManagedObject {
    @NSManaged public var id: UUID
    @NSManaged public var takenAt: Date
    @NSManaged public var systolic: Int16
    @NSManaged public var diastolic: Int16
    @NSManaged public var pulse: NSNumber?
    @NSManaged public var sourceRaw: String
    @NSManaged public var notes: String?
}

extension BloodPressureReadingEntity {
    @nonobjc public class func fetchRequest() -> NSFetchRequest<BloodPressureReadingEntity> {
        NSFetchRequest<BloodPressureReadingEntity>(entityName: "BloodPressureReadingEntity")
    }

    func apply(from reading: BloodPressureReading) {
        id = reading.id
        takenAt = reading.takenAt
        systolic = Int16(reading.systolic)
        diastolic = Int16(reading.diastolic)
        pulse = reading.pulse.map { NSNumber(value: $0) }
        sourceRaw = reading.source.rawValue
        notes = reading.notes
    }

    func toModel() -> BloodPressureReading {
        BloodPressureReading(
            id: id,
            takenAt: takenAt,
            systolic: Int(systolic),
            diastolic: Int(diastolic),
            pulse: pulse?.intValue,
            source: BloodPressureSource(rawValue: sourceRaw) ?? .manual,
            notes: notes
        )
    }
}
