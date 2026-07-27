import CoreData

/// Wraps the on-device Core Data stack. There is no server component in
/// VitalTrack — this stack, plus the optional user-controlled iCloud
/// sync toggle, is the entire "Health Data Database" layer.
public final class PersistenceController: @unchecked Sendable {
    public static let shared = PersistenceController()

    public let container: NSPersistentContainer

    public init(inMemory: Bool = false, cloudKitSyncEnabled: Bool = false) {
        let containerType = cloudKitSyncEnabled
            ? NSPersistentCloudKitContainer.self
            : NSPersistentContainer.self
        container = containerType.init(name: "VitalTrack")

        if inMemory {
            container.persistentStoreDescriptions.first?.url = URL(fileURLWithPath: "/dev/null")
        }

        container.persistentStoreDescriptions.first?.setOption(
            true as NSNumber, forKey: NSPersistentHistoryTrackingKey
        )

        container.loadPersistentStores { description, error in
            if let error {
                // A production build should surface this as a recoverable
                // error state (see docs/error-handling in the PRD) rather
                // than crash — logged here as a placeholder for that path.
                assertionFailure("Failed to load Core Data store: \(error)")
            }
        }
        container.viewContext.automaticallyMergesChangesFromParent = true
        container.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
    }

    public func newBackgroundContext() -> NSManagedObjectContext {
        let context = container.newBackgroundContext()
        context.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
        return context
    }

    public func saveIfNeeded(_ context: NSManagedObjectContext) throws {
        if context.hasChanges {
            try context.save()
        }
    }
}
