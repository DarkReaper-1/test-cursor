import Foundation
import VitalTrackCore

#if canImport(HealthKit)
import HealthKit
#endif

public final class HealthKitService: HealthKitSyncing, @unchecked Sendable {
#if canImport(HealthKit)
    private let store = HKHealthStore()
#endif

    public init() {}

    public var isAvailable: Bool {
#if canImport(HealthKit)
        return HKHealthStore.isHealthDataAvailable()
#else
        return false
#endif
    }

    public func requestAuthorization(writeBloodPressure: Bool) async throws {
#if canImport(HealthKit)
        guard isAvailable else { throw VitalTrackError.healthKitUnavailable }
        var read: Set<HKObjectType> = []
        var write: Set<HKSampleType> = []
        if let hr = HKObjectType.quantityType(forIdentifier: .heartRate) { read.insert(hr) }
        if let hrv = HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN) { read.insert(hrv) }
        if let bp = HKObjectType.correlationType(forIdentifier: .bloodPressure) { read.insert(bp) }
        if let sys = HKObjectType.quantityType(forIdentifier: .bloodPressureSystolic) { read.insert(sys) }
        if let dia = HKObjectType.quantityType(forIdentifier: .bloodPressureDiastolic) { read.insert(dia) }
        if writeBloodPressure {
            if let sys = HKObjectType.quantityType(forIdentifier: .bloodPressureSystolic) { write.insert(sys) }
            if let dia = HKObjectType.quantityType(forIdentifier: .bloodPressureDiastolic) { write.insert(dia) }
        }
        try await store.requestAuthorization(toShare: write, read: read)
#else
        throw VitalTrackError.healthKitUnavailable
#endif
    }

    public func importBloodPressure(since: Date) async throws -> [BloodPressureReading] {
#if canImport(HealthKit)
        guard isAvailable else { throw VitalTrackError.healthKitUnavailable }
        guard let systolicType = HKQuantityType.quantityType(forIdentifier: .bloodPressureSystolic),
              let diastolicType = HKQuantityType.quantityType(forIdentifier: .bloodPressureDiastolic),
              let correlationType = HKCorrelationType.correlationType(forIdentifier: .bloodPressure) else {
            return []
        }
        let predicate = HKQuery.predicateForSamples(withStart: since, end: Date(), options: .strictStartDate)
        let correlations: [HKCorrelation] = try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: correlationType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                continuation.resume(returning: (samples as? [HKCorrelation]) ?? [])
            }
            store.execute(query)
        }
        return correlations.compactMap { correlation in
            let sysSample = correlation.objects(for: systolicType).compactMap { $0 as? HKQuantitySample }.first
            let diaSample = correlation.objects(for: diastolicType).compactMap { $0 as? HKQuantitySample }.first
            guard let sysSample, let diaSample else { return nil }
            let sys = Int(sysSample.quantity.doubleValue(for: HKUnit.millimeterOfMercury()))
            let dia = Int(diaSample.quantity.doubleValue(for: HKUnit.millimeterOfMercury()))
            return BloodPressureReading(
                systolic: sys,
                diastolic: dia,
                recordedAt: correlation.startDate,
                source: .healthKit,
                deviceName: "Apple Health"
            )
        }
#else
        return MockHealthKitFallback.bloodPressure(since: since)
#endif
    }

    public func importHeartRate(since: Date) async throws -> [HeartRateSample] {
#if canImport(HealthKit)
        guard isAvailable else { throw VitalTrackError.healthKitUnavailable }
        guard let hrType = HKQuantityType.quantityType(forIdentifier: .heartRate) else { return [] }
        let predicate = HKQuery.predicateForSamples(withStart: since, end: Date(), options: .strictStartDate)
        let samples: [HKQuantitySample] = try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: hrType,
                predicate: predicate,
                limit: 200,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                continuation.resume(returning: (samples as? [HKQuantitySample]) ?? [])
            }
            store.execute(query)
        }
        let unit = HKUnit.count().unitDivided(by: .minute())
        return samples.map { sample in
            HeartRateSample(
                bpm: sample.quantity.doubleValue(for: unit),
                recordedAt: sample.startDate,
                source: .healthKit
            )
        }
#else
        return MockHealthKitFallback.heartRate(since: since)
#endif
    }

    public func importHRV(since: Date) async throws -> [HRVSample] {
#if canImport(HealthKit)
        guard isAvailable else { throw VitalTrackError.healthKitUnavailable }
        guard let type = HKQuantityType.quantityType(forIdentifier: .heartRateVariabilitySDNN) else { return [] }
        let predicate = HKQuery.predicateForSamples(withStart: since, end: Date(), options: .strictStartDate)
        let samples: [HKQuantitySample] = try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: type,
                predicate: predicate,
                limit: 100,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                continuation.resume(returning: (samples as? [HKQuantitySample]) ?? [])
            }
            store.execute(query)
        }
        return samples.map { sample in
            HRVSample(
                sdnnMilliseconds: sample.quantity.doubleValue(for: HKUnit.secondUnit(with: .milli)),
                recordedAt: sample.startDate,
                source: .healthKit
            )
        }
#else
        return MockHealthKitFallback.hrv(since: since)
#endif
    }

    public func writeBloodPressure(_ reading: BloodPressureReading) async throws {
        try TrustPolicy.assertValidBPSource(reading.source)
#if canImport(HealthKit)
        guard isAvailable else { throw VitalTrackError.healthKitUnavailable }
        guard let systolicType = HKQuantityType.quantityType(forIdentifier: .bloodPressureSystolic),
              let diastolicType = HKQuantityType.quantityType(forIdentifier: .bloodPressureDiastolic),
              let correlationType = HKCorrelationType.correlationType(forIdentifier: .bloodPressure) else {
            throw VitalTrackError.featureUnavailable("Blood pressure types unavailable.")
        }
        let mmHg = HKUnit.millimeterOfMercury()
        let sys = HKQuantitySample(
            type: systolicType,
            quantity: HKQuantity(unit: mmHg, doubleValue: Double(reading.systolic)),
            start: reading.recordedAt,
            end: reading.recordedAt
        )
        let dia = HKQuantitySample(
            type: diastolicType,
            quantity: HKQuantity(unit: mmHg, doubleValue: Double(reading.diastolic)),
            start: reading.recordedAt,
            end: reading.recordedAt
        )
        let correlation = HKCorrelation(
            type: correlationType,
            start: reading.recordedAt,
            end: reading.recordedAt,
            objects: [sys, dia]
        )
        try await store.save(correlation)
#else
        // Preview / non-Apple platforms: no-op success for demos.
        _ = reading
#endif
    }
}

enum MockHealthKitFallback {
    static func bloodPressure(since: Date) -> [BloodPressureReading] {
        [
            BloodPressureReading(
                systolic: 118,
                diastolic: 76,
                pulse: 68,
                recordedAt: since.addingTimeInterval(3600),
                source: .healthKit,
                deviceName: "Mock HealthKit"
            )
        ]
    }

    static func heartRate(since: Date) -> [HeartRateSample] {
        [
            HeartRateSample(bpm: 72, recordedAt: since.addingTimeInterval(1800), source: .healthKit, isResting: true)
        ]
    }

    static func hrv(since: Date) -> [HRVSample] {
        [HRVSample(sdnnMilliseconds: 42, recordedAt: since.addingTimeInterval(2400))]
    }
}
