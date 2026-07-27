import CoreData
import Foundation

/// Everything the app reads/writes for heart rate and blood pressure goes
/// through this protocol — view models never touch Core Data directly,
/// which is also what makes them testable with an in-memory fake.
public protocol HealthRepository: Sendable {
    func addHeartRate(_ reading: HeartRateReading) async throws
    func addBloodPressure(_ reading: BloodPressureReading) async throws

    func deleteHeartRate(id: UUID) async throws
    func deleteBloodPressure(id: UUID) async throws

    func heartRateReadings(since: Date?) async throws -> [HeartRateReading]
    func bloodPressureReadings(since: Date?) async throws -> [BloodPressureReading]

    func latestHeartRate() async throws -> HeartRateReading?
    func latestBloodPressure() async throws -> BloodPressureReading?

    func deleteAll() async throws
}

public final class CoreDataHealthRepository: HealthRepository, @unchecked Sendable {
    private let persistence: PersistenceController

    public init(persistence: PersistenceController = .shared) {
        self.persistence = persistence
    }

    public func addHeartRate(_ reading: HeartRateReading) async throws {
        let context = persistence.newBackgroundContext()
        try await context.perform {
            let entity = HeartRateReadingEntity(context: context)
            entity.apply(from: reading)
            try self.persistence.saveIfNeeded(context)
        }
    }

    public func addBloodPressure(_ reading: BloodPressureReading) async throws {
        let context = persistence.newBackgroundContext()
        try await context.perform {
            let entity = BloodPressureReadingEntity(context: context)
            entity.apply(from: reading)
            try self.persistence.saveIfNeeded(context)
        }
    }

    public func deleteHeartRate(id: UUID) async throws {
        let context = persistence.newBackgroundContext()
        try await context.perform {
            let request = HeartRateReadingEntity.fetchRequest()
            request.predicate = NSPredicate(format: "id == %@", id as CVarArg)
            for object in try context.fetch(request) { context.delete(object) }
            try self.persistence.saveIfNeeded(context)
        }
    }

    public func deleteBloodPressure(id: UUID) async throws {
        let context = persistence.newBackgroundContext()
        try await context.perform {
            let request = BloodPressureReadingEntity.fetchRequest()
            request.predicate = NSPredicate(format: "id == %@", id as CVarArg)
            for object in try context.fetch(request) { context.delete(object) }
            try self.persistence.saveIfNeeded(context)
        }
    }

    public func heartRateReadings(since: Date? = nil) async throws -> [HeartRateReading] {
        let context = persistence.newBackgroundContext()
        return try await context.perform {
            let request = HeartRateReadingEntity.fetchRequest()
            if let since {
                request.predicate = NSPredicate(format: "takenAt >= %@", since as NSDate)
            }
            request.sortDescriptors = [NSSortDescriptor(key: "takenAt", ascending: false)]
            return try context.fetch(request).map { $0.toModel() }
        }
    }

    public func bloodPressureReadings(since: Date? = nil) async throws -> [BloodPressureReading] {
        let context = persistence.newBackgroundContext()
        return try await context.perform {
            let request = BloodPressureReadingEntity.fetchRequest()
            if let since {
                request.predicate = NSPredicate(format: "takenAt >= %@", since as NSDate)
            }
            request.sortDescriptors = [NSSortDescriptor(key: "takenAt", ascending: false)]
            return try context.fetch(request).map { $0.toModel() }
        }
    }

    public func latestHeartRate() async throws -> HeartRateReading? {
        try await heartRateReadings(since: nil).first
    }

    public func latestBloodPressure() async throws -> BloodPressureReading? {
        try await bloodPressureReadings(since: nil).first
    }

    public func deleteAll() async throws {
        let context = persistence.newBackgroundContext()
        try await context.perform {
            for entityName in ["HeartRateReadingEntity", "BloodPressureReadingEntity"] {
                let request = NSFetchRequest<NSFetchRequestResult>(entityName: entityName)
                let delete = NSBatchDeleteRequest(fetchRequest: request)
                try context.execute(delete)
            }
            try self.persistence.saveIfNeeded(context)
        }
    }
}
