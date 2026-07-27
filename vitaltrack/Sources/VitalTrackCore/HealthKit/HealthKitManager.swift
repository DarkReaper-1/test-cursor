import Foundation
import HealthKit

public enum HealthKitError: Error, LocalizedError {
    case notAvailable
    case authorizationDenied

    public var errorDescription: String? {
        switch self {
        case .notAvailable: return "Health data isn't available on this device."
        case .authorizationDenied: return "VitalTrack doesn't have permission to access Health data. You can grant it in Settings > Privacy & Security > Health."
        }
    }
}

/// Two-way HealthKit bridge: it can write the readings you log in
/// VitalTrack into Apple Health, and — separately, and only if you allow
/// it — read your existing Health history so VitalTrack can show it
/// alongside what you've logged here. Both directions are opt-in from
/// Settings; neither is on by default.
public final class HealthKitManager: @unchecked Sendable {
    private let store = HKHealthStore()

    // Using the classic `forIdentifier:` factory (stable since iOS 8) rather
    // than the newer typed-identifier initializers, which need a higher
    // minimum deployment target than this project sets in Package.swift.
    // Force-unwrapping is safe here: these identifiers are fixed HealthKit
    // constants that always resolve to a type.
    private var heartRateType: HKQuantityType { HKQuantityType.quantityType(forIdentifier: .heartRate)! }
    private var systolicType: HKQuantityType { HKQuantityType.quantityType(forIdentifier: .bloodPressureSystolic)! }
    private var diastolicType: HKQuantityType { HKQuantityType.quantityType(forIdentifier: .bloodPressureDiastolic)! }
    private var bloodPressureCorrelationType: HKCorrelationType { HKCorrelationType.correlationType(forIdentifier: .bloodPressure)! }
    private var hrvType: HKQuantityType { HKQuantityType.quantityType(forIdentifier: .heartRateVariabilitySDNN)! }

    public init() {}

    public var isAvailable: Bool { HKHealthStore.isHealthDataAvailable() }

    public func requestAuthorization(readAlso: Bool) async throws {
        guard isAvailable else { throw HealthKitError.notAvailable }

        let writeTypes: Set<HKSampleType> = [heartRateType, systolicType, diastolicType, bloodPressureCorrelationType]
        let readTypes: Set<HKObjectType> = readAlso
            ? [heartRateType, systolicType, diastolicType, bloodPressureCorrelationType, hrvType]
            : []

        try await store.requestAuthorization(toShare: writeTypes, read: readTypes)
    }

    public func writeHeartRate(_ reading: HeartRateReading) async throws {
        let unit = HKUnit.count().unitDivided(by: .minute())
        let quantity = HKQuantity(unit: unit, doubleValue: Double(reading.bpm))
        let sample = HKQuantitySample(
            type: heartRateType,
            quantity: quantity,
            start: reading.takenAt,
            end: reading.takenAt,
            metadata: [HKMetadataKeyHeartRateMotionContext: NSNumber(value: HKHeartRateMotionContext.sedentary.rawValue)]
        )
        try await store.save(sample)
    }

    public func writeBloodPressure(_ reading: BloodPressureReading) async throws {
        let unit = HKUnit.millimeterOfMercury()
        let systolicSample = HKQuantitySample(
            type: systolicType,
            quantity: HKQuantity(unit: unit, doubleValue: Double(reading.systolic)),
            start: reading.takenAt,
            end: reading.takenAt
        )
        let diastolicSample = HKQuantitySample(
            type: diastolicType,
            quantity: HKQuantity(unit: unit, doubleValue: Double(reading.diastolic)),
            start: reading.takenAt,
            end: reading.takenAt
        )
        let correlation = HKCorrelation(
            type: bloodPressureCorrelationType,
            start: reading.takenAt,
            end: reading.takenAt,
            objects: [systolicSample, diastolicSample]
        )
        try await store.save(correlation)
    }

    /// Reads Apple Health's existing blood pressure history, if the user
    /// opted into read access. Used only to display alongside app data —
    /// VitalTrack never modifies or deletes anything it didn't write itself.
    public func readBloodPressureHistory(since: Date, limit: Int = 200) async throws -> [BloodPressureReading] {
        let predicate = HKQuery.predicateForSamples(withStart: since, end: nil)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: bloodPressureCorrelationType,
                predicate: predicate,
                limit: limit,
                sortDescriptors: [sortDescriptor]
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                let readings = (samples as? [HKCorrelation] ?? []).compactMap { correlation -> BloodPressureReading? in
                    guard
                        let systolicSample = correlation.objects(for: self.systolicType).first as? HKQuantitySample,
                        let diastolicSample = correlation.objects(for: self.diastolicType).first as? HKQuantitySample
                    else { return nil }
                    let unit = HKUnit.millimeterOfMercury()
                    return BloodPressureReading(
                        takenAt: correlation.startDate,
                        systolic: Int(systolicSample.quantity.doubleValue(for: unit)),
                        diastolic: Int(diastolicSample.quantity.doubleValue(for: unit)),
                        source: .appleHealthImport
                    )
                }
                continuation.resume(returning: readings)
            }
            store.execute(query)
        }
    }
}
