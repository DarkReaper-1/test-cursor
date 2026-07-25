import Foundation

/// Composition-root protocol. App wires concrete implementations.
public protocol DependencyContainer: Sendable {
    var bloodPressureRepository: any BloodPressureRepository { get }
    var heartRateRepository: any HeartRateRepository { get }
    var hrvRepository: any HRVRepository { get }
    var deviceRepository: any DeviceRepository { get }
    var insightEngine: any InsightEngine { get }
    var healthKit: any HealthKitSyncing { get }
    var bluetooth: any BluetoothManaging { get }
    var exporter: any Exporting { get }
    var doctorReportFormatter: any DoctorReportFormatting { get }
    var pdfBuilder: any PDFReportBuilding { get }
}

/// Lightweight environment bag for SwiftUI and previews.
public struct AppEnvironment: DependencyContainer, Sendable {
    public let bloodPressureRepository: any BloodPressureRepository
    public let heartRateRepository: any HeartRateRepository
    public let hrvRepository: any HRVRepository
    public let deviceRepository: any DeviceRepository
    public let insightEngine: any InsightEngine
    public let healthKit: any HealthKitSyncing
    public let bluetooth: any BluetoothManaging
    public let exporter: any Exporting
    public let doctorReportFormatter: any DoctorReportFormatting
    public let pdfBuilder: any PDFReportBuilding

    public init(
        bloodPressureRepository: any BloodPressureRepository,
        heartRateRepository: any HeartRateRepository,
        hrvRepository: any HRVRepository,
        deviceRepository: any DeviceRepository,
        insightEngine: any InsightEngine,
        healthKit: any HealthKitSyncing,
        bluetooth: any BluetoothManaging,
        exporter: any Exporting,
        doctorReportFormatter: any DoctorReportFormatting,
        pdfBuilder: any PDFReportBuilding
    ) {
        self.bloodPressureRepository = bloodPressureRepository
        self.heartRateRepository = heartRateRepository
        self.hrvRepository = hrvRepository
        self.deviceRepository = deviceRepository
        self.insightEngine = insightEngine
        self.healthKit = healthKit
        self.bluetooth = bluetooth
        self.exporter = exporter
        self.doctorReportFormatter = doctorReportFormatter
        self.pdfBuilder = pdfBuilder
    }
}
